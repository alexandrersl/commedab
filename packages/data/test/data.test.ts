import { CATALOG, DEFAULT_CATEGORIES } from '@commedab/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { createData, type Data } from '../src/data';
import type { Database } from '../src/database';
import { purchaseIdOf } from '../src/ids';
import { readListLines, readPurchases } from '../src/reads';
import { localOfStored } from '../src/time';
import { memoryDatabase } from './memory-database';

process.env.TZ = 'Europe/Paris';

const HOUSEHOLD = 'h1';
let db: Database;
let data: Data;
let clock: Date;

function at(iso: string): void {
  clock = new Date(iso);
}

function entry(id: string) {
  const found = CATALOG.find((e) => e.id === id);
  if (found === undefined) throw new Error(id);
  return found;
}

/** Ce que crée le trigger d'inscription (specs techniques 5.6). */
async function signUp(): Promise<void> {
  await db.execute('INSERT INTO household (id, catalog_contribution) VALUES (?, 1)', [HOUSEHOLD]);
  for (const [index, c] of DEFAULT_CATEGORIES.entries()) {
    await db.execute(
      'INSERT INTO category (id, household_id, key, name, position, system_key) VALUES (?, ?, ?, ?, ?, ?)',
      [`c-${c.key}`, HOUSEHOLD, c.key, c.name, index + 1, c.systemKey],
    );
  }
}

async function lines() {
  return readListLines(db);
}

async function purchases() {
  return readPurchases(db);
}

beforeEach(async () => {
  db = memoryDatabase();
  at('2026-10-29T09:00:00Z');
  data = createData(db, { now: () => clock });
  await signUp();
});

describe('produits (EF-2.8, EF-3.7)', () => {
  it('crée un produit depuis le catalogue, dans son rayon, et l’ajoute à la liste', async () => {
    const id = await data.products.createProduct({
      name: 'Lait demi-écrémé',
      entry: entry('lait-demi-ecreme'),
      addToList: true,
    });
    const product = await db.getOptional<Record<string, unknown>>(
      'SELECT * FROM product WHERE id = ?',
      [id],
    );
    expect(product).toMatchObject({
      household_id: HOUSEHOLD,
      name_normalized: 'lait demi ecreme',
      category_id: 'c-cremerie',
      unit_label: 'bouteille',
      pack_size: 6,
      catalog_entry_id: 'lait-demi-ecreme',
      catalog_qty: 1,
      catalog_per_days: 7,
    });
    expect(await lines()).toMatchObject([{ productId: id, quantity: 1, origin: 'manual' }]);
  });

  it('crée un produit inconnu à classer, à la pièce, sans l’ajouter', async () => {
    const id = await data.products.createProduct({ name: ' Chia ', entry: null, addToList: false });
    expect(
      await db.getOptional(
        'SELECT name, category_id, unit_label, pack_size FROM product WHERE id = ?',
        [id],
      ),
    ).toEqual({ name: 'Chia', category_id: null, unit_label: 'pièce', pack_size: 1 });
    expect(await lines()).toEqual([]);
  });

  it('modifie la fiche et recalcule le nom normalisé', async () => {
    const id = await data.products.createProduct({ name: 'Chia', entry: null, addToList: false });
    await data.products.updateProduct(id, {
      name: 'Graines de chia',
      declaredQty: 1,
      declaredPerDays: 30,
    });
    expect(
      await db.getOptional('SELECT name_normalized, declared_qty, declared_per_days FROM product'),
    ).toEqual({ name_normalized: 'graines de chia', declared_qty: 1, declared_per_days: 30 });
    expect(() => data.products.updateProduct(id, { name: '  ' })).toThrow();
  });
});

describe('liste (EF-1.3 à EF-1.5, EF-2.9 à EF-2.11)', () => {
  let milk: string;

  beforeEach(async () => {
    milk = await data.products.createProduct({
      name: 'Lait',
      entry: entry('lait-demi-ecreme'),
      addToList: false,
    });
  });

  it('incrémente la ligne non cochée au lieu d’en créer une seconde', async () => {
    await data.list.addProduct(milk);
    await data.list.acceptSuggestion(milk, 2);
    expect(await lines()).toMatchObject([{ quantity: 3, origin: 'manual' }]);
  });

  it('réactive un produit archivé ajouté à la liste (EF-3.5)', async () => {
    await data.products.stopBuying(milk);
    await data.list.addProduct(milk);
    expect(await db.getOptional('SELECT archived_at FROM product')).toEqual({ archived_at: null });
  });

  it('crée l’achat de la coche, le corrige, le supprime au décochage et le recrée', async () => {
    const line = await data.list.acceptSuggestion(milk, 2);
    at('2026-10-29T17:30:00Z');
    await data.list.checkLine(line);
    expect(await purchases()).toEqual([
      {
        id: purchaseIdOf(line),
        productId: milk,
        quantity: 12,
        occurredAt: '2026-10-29T18:30:00',
        fromRecipe: false,
        listLineId: line,
      },
    ]);

    await data.list.setLineQuantity(line, 1);
    expect(await purchases()).toMatchObject([{ quantity: 6 }]);

    await data.list.uncheckLine(line);
    expect(await purchases()).toEqual([]);
    expect(await lines()).toMatchObject([{ id: line, checkedAt: null, quantity: 1 }]);

    await data.list.checkLine(line);
    expect((await purchases()).map((p) => p.id)).toEqual([purchaseIdOf(line)]);
  });

  it('retire une ligne cochée avec son achat', async () => {
    const line = await data.list.addProduct(milk);
    await data.list.checkLine(line);
    await data.list.removeLine(line);
    expect(await purchases()).toEqual([]);
    expect(await lines()).toEqual([]);
  });

  it('fond une ligne décochée dans la ligne ajoutée entre-temps', async () => {
    const first = await data.list.addProduct(milk);
    await data.list.checkLine(first);
    const second = await data.list.addProduct(milk, 2);
    await data.list.uncheckLine(first);
    expect(await lines()).toMatchObject([{ id: second, quantity: 3, checkedAt: null }]);
    expect(await purchases()).toEqual([]);
  });

  it('refuse une quantité de ligne non entière', async () => {
    await expect(data.list.addProduct(milk, 1.5)).rejects.toThrow();
  });
});

describe('recettes sur la liste (EF-4.5, specs techniques 4.6)', () => {
  it('ajoute les manquants, cumule une ligne existante, compte ×2 puis retire', async () => {
    const butter = await data.products.createProduct({
      name: 'Beurre',
      entry: entry('beurre'),
      addToList: false,
    });
    const flour = await data.products.createProduct({
      name: 'Farine',
      entry: entry('farine'),
      addToList: true,
    });
    const recipe = await data.recipes.saveRecipe({
      name: 'Sablés',
      notes: null,
      ingredients: [
        { productId: butter, quantity: 125, unit: 'g' },
        { productId: flour, quantity: 250, unit: 'g' },
      ],
    });

    const listRecipe = await data.list.setRecipeTimes({
      recipeId: recipe,
      listRecipeId: null,
      times: 1,
    });
    expect(await lines()).toMatchObject([
      { productId: flour, quantity: 2, origin: 'manual', recipeId: recipe },
      { productId: butter, quantity: 1, origin: 'recipe', recipeId: recipe },
    ]);

    await data.list.setRecipeTimes({ recipeId: recipe, listRecipeId: listRecipe, times: 3 });
    expect((await lines()).map((l) => l.quantity)).toEqual([2, 2]);

    await data.list.setRecipeTimes({ recipeId: recipe, listRecipeId: listRecipe, times: 0 });
    expect(await lines()).toMatchObject([{ productId: flour, quantity: 1 }]);
    expect(await db.getAll('SELECT * FROM list_recipe WHERE deleted_at IS NULL')).toEqual([]);
  });

  it('modifie les ingrédients sans doublon et garde les retirés en suppression logique', async () => {
    const a = await data.products.createProduct({ name: 'A', entry: null, addToList: false });
    const b = await data.products.createProduct({ name: 'B', entry: null, addToList: false });
    const id = await data.recipes.saveRecipe({
      name: 'R',
      notes: null,
      ingredients: [{ productId: a, quantity: null, unit: null }],
    });
    await data.recipes.saveRecipe({
      id,
      name: 'R',
      notes: 'au four',
      ingredients: [{ productId: b, quantity: 2, unit: null }],
    });
    expect(
      await db.getAll(
        'SELECT product_id, quantity, deleted_at IS NOT NULL AS deleted FROM recipe_ingredient ORDER BY product_id',
      ),
    ).toEqual([
      { product_id: a, quantity: null, deleted: 1 },
      { product_id: b, quantity: 2, deleted: 0 },
    ]);
    expect(() =>
      data.recipes.saveRecipe({
        name: 'R',
        notes: null,
        ingredients: [
          { productId: a, quantity: null, unit: null },
          { productId: a, quantity: 1, unit: null },
        ],
      }),
    ).toThrow();
  });
});

describe('historique des achats (EF-3.4)', () => {
  it('supprime un achat pour de bon et le restaure à l’identique', async () => {
    const milk = await data.products.createProduct({ name: 'Lait', entry: null, addToList: true });
    const [line] = await lines();
    await data.list.checkLine(line?.id ?? '');
    const before = await purchases();
    const deleted = await data.purchases.deletePurchase(before[0]?.id ?? '');
    expect(await purchases()).toEqual([]);
    if (deleted !== null) await data.purchases.restorePurchase(deleted);
    expect(await purchases()).toEqual(before);
    await data.purchases.editPurchase(before[0]?.id ?? '', {
      quantity: 3,
      occurredAt: new Date('2026-10-20T08:00:00Z'),
    });
    expect(await purchases()).toMatchObject([
      { productId: milk, quantity: 3, occurredAt: '2026-10-20T10:00:00' },
    ]);
  });
});

describe('rayons (EF-5.1, RG-9)', () => {
  it('déplace un rayon dans son groupe, les rayons système restant en fin de parcours', async () => {
    const keys = async () =>
      (await db.getAll<{ key: string }>('SELECT key FROM category ORDER BY position')).map(
        (c) => c.key,
      );
    await data.categories.moveCategory('c-boissons', 0);
    await data.categories.moveCategory('c-hygiene-beaute', 99);
    await data.categories.moveCategory('c-surgeles', 0);
    expect(await keys()).toEqual([
      'boissons',
      'bebe-animaux',
      'entretien-maison',
      'fruits-legumes',
      'boulangerie',
      'epicerie-salee',
      'epicerie-sucree',
      'hygiene-beaute',
      'surgeles',
      'cremerie',
      'viande-poisson-traiteur',
    ]);
  });
});

describe('compte (EF-5.4, EF-5.5)', () => {
  it('règle la contribution au catalogue et exporte sans identifiant de household', async () => {
    await data.account.setCatalogContribution(false);
    const settings: unknown[] = [];
    const stop = data.account.watch({ onResult: (s) => settings.push(s) });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await data.account.setCatalogContribution(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    stop();
    expect(settings).toEqual([
      { householdId: HOUSEHOLD, catalogContribution: false },
      { householdId: HOUSEHOLD, catalogContribution: true },
    ]);

    await data.products.createProduct({ name: 'Lait', entry: null, addToList: true });
    const exported = await data.account.exportData();
    expect(Object.keys(exported)).toEqual([
      'exported_at',
      'categories',
      'products',
      'purchases',
      'recipes',
      'recipe_ingredients',
      'list_lines',
      'list_recipes',
    ]);
    expect(JSON.stringify(exported)).not.toContain('household_id');
  });
});

describe('dates', () => {
  it('lit les instants écrits par la synchro comme par l’appareil, en heure locale', () => {
    expect(localOfStored('2026-10-29 14:00:00Z')).toBe('2026-10-29T15:00:00');
    expect(localOfStored('2026-10-24T22:30:00.000Z')).toBe('2026-10-25T00:30:00');
  });
});
