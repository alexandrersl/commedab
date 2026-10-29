import {
  applyRecipe,
  normalizeName,
  packUnits,
  productDraft,
  productState,
  type CatalogEntry,
  type LineOrigin,
  type ListLine,
  type ListRecipe,
  type ProductState,
} from '@commedab/core';
import type { Database, SqlContext } from './database';
import { newId, purchaseIdOf } from './ids';
import { toProduct } from './records';
import {
  readCategories,
  readListLines,
  readListRecipes,
  readProducts,
  readPurchases,
  readRecipes,
  readSettings,
  watch,
  type Subscription,
} from './reads';
import type { AppTables } from './schema';
import { local, stored } from './time';

export interface ProductChanges {
  name?: string;
  categoryId?: string | null;
  unitLabel?: string;
  packSize?: number;
  contentsQty?: number | null;
  contentsUnit?: string | null;
  /** Rythme déclaré, à effacer ensemble pour rendre la main au rythme appris (EF-3.3). */
  declaredQty?: number | null;
  declaredPerDays?: number | null;
}

export interface RecipeInput {
  /** Absent : nouvelle recette. */
  id?: string;
  name: string;
  notes: string | null;
  ingredients: readonly { productId: string; quantity: number | null; unit: string | null }[];
}

/** Achat supprimé, gardé par l'écran le temps du message éphémère qui l'annule (ENF-8). */
export type DeletedPurchase = AppTables['stock_event'];

const PRODUCT_COLUMNS: Record<keyof ProductChanges, string> = {
  name: 'name',
  categoryId: 'category_id',
  unitLabel: 'unit_label',
  packSize: 'pack_size',
  contentsQty: 'contents_qty',
  contentsUnit: 'contents_unit',
  declaredQty: 'declared_qty',
  declaredPerDays: 'declared_per_days',
};

function checkPacks(packs: number): void {
  if (!Number.isInteger(packs) || packs < 1) {
    throw new Error(`Quantité de ligne invalide : ${packs} (entier ≥ 1 attendu)`);
  }
}

function cleanName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed === '') throw new Error('Le nom est obligatoire.');
  return trimmed;
}

async function householdId(tx: SqlContext): Promise<string> {
  const row = await tx.getOptional<{ id: string }>('SELECT id FROM household LIMIT 1');
  if (row === null) throw new Error("Le compte n'est pas encore synchronisé.");
  return row.id;
}

async function lineOf(tx: SqlContext, lineId: string): Promise<AppTables['list_line']> {
  const line = await tx.getOptional<AppTables['list_line']>(
    'SELECT * FROM list_line WHERE id = ?',
    [lineId],
  );
  if (line === null) throw new Error(`Ligne inconnue : ${lineId}`);
  return line;
}

function pendingLineOf(tx: SqlContext, productId: string) {
  return tx.getOptional<AppTables['list_line']>(
    `SELECT * FROM list_line
     WHERE product_id = ? AND checked_at IS NULL AND deleted_at IS NULL`,
    [productId],
  );
}

async function productOf(tx: SqlContext, productId: string) {
  const row = await tx.getOptional<AppTables['product']>('SELECT * FROM product WHERE id = ?', [
    productId,
  ]);
  if (row === null) throw new Error(`Produit inconnu : ${productId}`);
  return toProduct(row);
}

/**
 * Couche d'accès aux données (specs techniques 6.2) : un dépôt par entité, chacun avec ses
 * requêtes réactives et ses commandes. Chaque commande s'exécute dans une transaction et tire
 * tout calcul de `core`.
 */
export function createData(db: Database, { now = () => new Date() }: { now?: () => Date } = {}) {
  /** Met le produit sur la liste : incrémente sa ligne non cochée ou en crée une (EF-2.9, EF-2.10). */
  async function addToList(
    tx: SqlContext,
    productId: string,
    packs: number,
    origin: LineOrigin,
    at: string,
  ): Promise<string> {
    checkPacks(packs);
    await tx.execute(
      'UPDATE product SET archived_at = NULL, updated_at = ? WHERE id = ? AND archived_at IS NOT NULL',
      [at, productId],
    );
    const pending = await pendingLineOf(tx, productId);
    if (pending !== null) {
      await tx.execute('UPDATE list_line SET quantity = ?, updated_at = ? WHERE id = ?', [
        (pending.quantity ?? 0) + packs,
        at,
        pending.id,
      ]);
      return pending.id;
    }
    const id = newId();
    await tx.execute(
      `INSERT INTO list_line (id, household_id, product_id, quantity, origin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, await householdId(tx), productId, packs, origin, at, at],
    );
    return id;
  }

  async function setPurchaseOfLine(tx: SqlContext, line: AppTables['list_line'], at: string) {
    const product = await productOf(tx, line.product_id ?? '');
    const quantity = packUnits(product, line.quantity ?? 0);
    const id = purchaseIdOf(line.id);
    const existing = await tx.getOptional('SELECT id FROM stock_event WHERE id = ?', [id]);
    if (existing === null) {
      await tx.execute(
        `INSERT INTO stock_event
           (id, household_id, product_id, type, quantity, occurred_at, list_line_id, created_at, updated_at)
         VALUES (?, ?, ?, 'purchased', ?, ?, ?, ?, ?)`,
        [id, line.household_id, line.product_id, quantity, line.checked_at, line.id, at, at],
      );
    } else {
      await tx.execute('UPDATE stock_event SET quantity = ?, updated_at = ? WHERE id = ?', [
        quantity,
        at,
        id,
      ]);
    }
  }

  async function removeLineIn(tx: SqlContext, line: AppTables['list_line'], at: string) {
    await tx.execute('UPDATE list_line SET deleted_at = ?, updated_at = ? WHERE id = ?', [
      at,
      at,
      line.id,
    ]);
    if (line.checked_at !== null) {
      await tx.execute('DELETE FROM stock_event WHERE id = ?', [purchaseIdOf(line.id)]);
    }
  }

  const list = {
    /** Lignes non retirées et recettes de la liste, que `listView` met en forme (4.7). */
    watch(subscription: Subscription<{ lines: ListLine[]; recipes: ListRecipe[] }>) {
      return watch(
        db,
        ['list_line', 'list_recipe'],
        async (tx) => ({ lines: await readListLines(tx), recipes: await readListRecipes(tx) }),
        subscription,
      );
    },

    /** Ajout autre qu'une suggestion ou une recette : ancre le stock à zéro (4.4). */
    addProduct(productId: string, packs = 1): Promise<string> {
      return db.writeTransaction((tx) => addToList(tx, productId, packs, 'manual', stored(now())));
    },

    acceptSuggestion(productId: string, packs: number): Promise<string> {
      return db.writeTransaction((tx) =>
        addToList(tx, productId, packs, 'suggestion', stored(now())),
      );
    },

    /** Coche la ligne et crée son achat, daté de la coche (EF-1.3, 5.5). */
    checkLine(lineId: string): Promise<void> {
      return db.writeTransaction(async (tx) => {
        const line = await lineOf(tx, lineId);
        if (line.checked_at !== null || line.deleted_at !== null) return;
        const at = stored(now());
        await tx.execute('UPDATE list_line SET checked_at = ?, updated_at = ? WHERE id = ?', [
          at,
          at,
          lineId,
        ]);
        await setPurchaseOfLine(tx, { ...line, checked_at: at }, at);
      });
    },

    /**
     * Décoche la ligne et supprime son achat (EF-1.3). Si le produit a été remis sur la liste
     * entre-temps, la ligne décochée se fond dans la nouvelle : un produit n'a jamais deux lignes
     * non cochées (EF-2.9).
     */
    uncheckLine(lineId: string): Promise<void> {
      return db.writeTransaction(async (tx) => {
        const line = await lineOf(tx, lineId);
        if (line.checked_at === null || line.deleted_at !== null) return;
        const at = stored(now());
        await tx.execute('DELETE FROM stock_event WHERE id = ?', [purchaseIdOf(lineId)]);
        const pending = await pendingLineOf(tx, line.product_id ?? '');
        if (pending === null) {
          await tx.execute('UPDATE list_line SET checked_at = NULL, updated_at = ? WHERE id = ?', [
            at,
            lineId,
          ]);
          return;
        }
        await tx.execute('UPDATE list_line SET quantity = ?, updated_at = ? WHERE id = ?', [
          (pending.quantity ?? 0) + (line.quantity ?? 0),
          at,
          pending.id,
        ]);
        await tx.execute(
          'UPDATE list_line SET checked_at = NULL, deleted_at = ?, updated_at = ? WHERE id = ?',
          [at, at, lineId],
        );
      });
    },

    /** Change la quantité ; sur une ligne cochée, celle de son achat (EF-1.4). 0 retire la ligne. */
    setLineQuantity(lineId: string, packs: number): Promise<void> {
      return db.writeTransaction(async (tx) => {
        const line = await lineOf(tx, lineId);
        const at = stored(now());
        if (packs === 0) return removeLineIn(tx, line, at);
        checkPacks(packs);
        await tx.execute('UPDATE list_line SET quantity = ?, updated_at = ? WHERE id = ?', [
          packs,
          at,
          lineId,
        ]);
        if (line.checked_at !== null) await setPurchaseOfLine(tx, { ...line, quantity: packs }, at);
      });
    },

    /** Retire la ligne ; cochée, son achat est supprimé (EF-1.5). */
    removeLine(lineId: string): Promise<void> {
      return db.writeTransaction(async (tx) =>
        removeLineIn(tx, await lineOf(tx, lineId), stored(now())),
      );
    },

    /**
     * Compte la recette `times` fois sur la liste (EF-4.5, 4.6). `listRecipeId` : la recette de
     * la liste affichée en pastille, nulle si elle n'y est pas. 0 la retire. Rend l'identifiant
     * de la recette de la liste, nul une fois retirée.
     */
    setRecipeTimes(input: {
      recipeId: string;
      listRecipeId: string | null;
      times: number;
    }): Promise<string | null> {
      return db.writeTransaction(async (tx) => {
        const at = now();
        const atStored = stored(at);
        const recipe = (await readRecipes(tx)).find((r) => r.id === input.recipeId);
        if (recipe === undefined) throw new Error(`Recette inconnue : ${input.recipeId}`);
        const listRecipe =
          input.listRecipeId === null
            ? undefined
            : (await readListRecipes(tx)).find((r) => r.id === input.listRecipeId);
        const from = listRecipe?.times ?? 0;

        const products = new Map((await readProducts(tx)).map((p) => [p.id, p]));
        const purchases = await readPurchases(tx);
        const lines = await readListLines(tx);
        const states = new Map<string, ProductState>();
        for (const { productId } of recipe.ingredients) {
          const product = products.get(productId);
          if (product === undefined) continue;
          states.set(
            productId,
            productState(
              product,
              purchases.filter((p) => p.productId === productId),
              lines.filter((l) => l.productId === productId),
              local(at),
            ),
          );
        }
        const pending = lines.filter((line) => line.checkedAt === null);
        const changes = applyRecipe({
          recipe,
          from,
          to: input.times,
          products,
          states,
          listLines: pending,
        });

        for (const change of changes) {
          const line = pending.find((l) => l.productId === change.productId);
          if (line === undefined) {
            const id = newId();
            await tx.execute(
              `INSERT INTO list_line
                 (id, household_id, product_id, quantity, origin, recipe_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, 'recipe', ?, ?, ?)`,
              [
                id,
                await householdId(tx),
                change.productId,
                change.quantity,
                recipe.id,
                atStored,
                atStored,
              ],
            );
          } else if (change.quantity === 0) {
            await tx.execute('UPDATE list_line SET deleted_at = ?, updated_at = ? WHERE id = ?', [
              atStored,
              atStored,
              line.id,
            ]);
          } else {
            await tx.execute(
              `UPDATE list_line SET quantity = ?, recipe_id = coalesce(recipe_id, ?), updated_at = ?
               WHERE id = ?`,
              [
                change.quantity,
                change.quantity > line.quantity ? recipe.id : null,
                atStored,
                line.id,
              ],
            );
          }
        }

        if (listRecipe === undefined) {
          if (input.times === 0) return null;
          const id = newId();
          await tx.execute(
            `INSERT INTO list_recipe (id, household_id, recipe_id, times, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, await householdId(tx), recipe.id, input.times, atStored, atStored],
          );
          return id;
        }
        if (input.times === 0) {
          await tx.execute('UPDATE list_recipe SET deleted_at = ?, updated_at = ? WHERE id = ?', [
            atStored,
            atStored,
            listRecipe.id,
          ]);
          return null;
        }
        await tx.execute('UPDATE list_recipe SET times = ?, updated_at = ? WHERE id = ?', [
          input.times,
          atStored,
          listRecipe.id,
        ]);
        return listRecipe.id;
      });
    },
  };

  const products = {
    watch(subscription: Subscription<Awaited<ReturnType<typeof readProducts>>>) {
      return watch(db, ['product'], readProducts, subscription);
    },

    /**
     * Crée le produit, repris de `entry` s'il y en a une (EF-2.8, EF-3.7), et l'ajoute à la
     * liste si `addToList` ; rend son identifiant.
     */
    createProduct(input: {
      name: string;
      entry: CatalogEntry | null;
      addToList: boolean;
    }): Promise<string> {
      return db.writeTransaction(async (tx) => {
        const draft = productDraft(input.name, input.entry);
        const at = stored(now());
        const category =
          draft.categoryKey === null
            ? null
            : await tx.getOptional<{ id: string }>('SELECT id FROM category WHERE key = ?', [
                draft.categoryKey,
              ]);
        const id = newId();
        await tx.execute(
          `INSERT INTO product
             (id, household_id, name, name_normalized, category_id, unit_label, pack_size,
              contents_qty, contents_unit, catalog_entry_id, catalog_version, catalog_qty,
              catalog_per_days, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            await householdId(tx),
            draft.name,
            draft.nameNormalized,
            category?.id ?? null,
            draft.unitLabel,
            draft.packSize,
            draft.contentsQty,
            draft.contentsUnit,
            draft.catalogEntryId,
            draft.catalogVersion,
            draft.catalogQty,
            draft.catalogPerDays,
            at,
            at,
          ],
        );
        if (input.addToList) await addToList(tx, id, 1, 'manual', at);
        return id;
      });
    },

    /** Modifie la fiche (EF-3.3, EF-3.6) ; seul le nom est obligatoire. */
    updateProduct(productId: string, changes: ProductChanges): Promise<void> {
      const clean: ProductChanges = { ...changes };
      if (clean.name !== undefined) clean.name = cleanName(clean.name);
      if (clean.packSize !== undefined && !(clean.packSize > 0)) {
        throw new Error(`Taille de pack invalide : ${clean.packSize}`);
      }
      const keys = Object.keys(clean) as (keyof ProductChanges)[];
      if (keys.length === 0) return Promise.resolve();
      const columns = keys.map((key) => `${PRODUCT_COLUMNS[key]} = ?`);
      const values = keys.map((key) => clean[key]);
      if (clean.name !== undefined) {
        columns.push('name_normalized = ?');
        values.push(normalizeName(clean.name));
      }
      return db.writeTransaction(async (tx) => {
        await tx.execute(`UPDATE product SET ${columns.join(', ')}, updated_at = ? WHERE id = ?`, [
          ...values,
          stored(now()),
          productId,
        ]);
      });
    },

    /** « Je n'en achète plus » : archive le produit (EF-3.5). */
    stopBuying(productId: string): Promise<void> {
      const at = stored(now());
      return db.writeTransaction(async (tx) => {
        await tx.execute('UPDATE product SET archived_at = ?, updated_at = ? WHERE id = ?', [
          at,
          at,
          productId,
        ]);
      });
    },
  };

  const purchases = {
    watch(subscription: Subscription<Awaited<ReturnType<typeof readPurchases>>>) {
      return watch(db, ['stock_event', 'list_line'], (tx) => readPurchases(tx), subscription);
    },

    /** Corrige un achat depuis l'historique (EF-3.4). */
    editPurchase(
      purchaseId: string,
      changes: { quantity?: number; occurredAt?: Date },
    ): Promise<void> {
      if (changes.quantity !== undefined && !(changes.quantity >= 0)) {
        throw new Error(`Quantité d'achat invalide : ${changes.quantity}`);
      }
      return db.writeTransaction(async (tx) => {
        const at = stored(now());
        if (changes.quantity !== undefined) {
          await tx.execute('UPDATE stock_event SET quantity = ?, updated_at = ? WHERE id = ?', [
            changes.quantity,
            at,
            purchaseId,
          ]);
        }
        if (changes.occurredAt !== undefined) {
          await tx.execute('UPDATE stock_event SET occurred_at = ?, updated_at = ? WHERE id = ?', [
            stored(changes.occurredAt),
            at,
            purchaseId,
          ]);
        }
      });
    },

    /** Supprime l'achat pour de bon (3.2) ; rend de quoi l'annuler par `restorePurchase`. */
    deletePurchase(purchaseId: string): Promise<DeletedPurchase | null> {
      return db.writeTransaction(async (tx) => {
        const row = await tx.getOptional<DeletedPurchase>(
          'SELECT * FROM stock_event WHERE id = ?',
          [purchaseId],
        );
        await tx.execute('DELETE FROM stock_event WHERE id = ?', [purchaseId]);
        return row;
      });
    },

    restorePurchase(row: DeletedPurchase): Promise<void> {
      return db.writeTransaction(async (tx) => {
        await tx.execute(
          `INSERT INTO stock_event
             (id, household_id, product_id, type, quantity, occurred_at, list_line_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.id,
            row.household_id,
            row.product_id,
            row.type,
            row.quantity,
            row.occurred_at,
            row.list_line_id,
            row.created_at,
            stored(now()),
          ],
        );
      });
    },
  };

  async function setRecipeDeleted(recipeId: string, deletedAt: string | null): Promise<void> {
    await db.writeTransaction(async (tx) => {
      await tx.execute('UPDATE recipe SET deleted_at = ?, updated_at = ? WHERE id = ?', [
        deletedAt,
        stored(now()),
        recipeId,
      ]);
    });
  }

  const recipes = {
    watch(subscription: Subscription<Awaited<ReturnType<typeof readRecipes>>>) {
      return watch(db, ['recipe', 'recipe_ingredient'], readRecipes, subscription);
    },

    /** Crée ou modifie une recette et ses ingrédients (EF-4.2) ; rend son identifiant. */
    saveRecipe(input: RecipeInput): Promise<string> {
      const name = cleanName(input.name);
      const seen = new Set<string>();
      for (const { productId } of input.ingredients) {
        if (seen.has(productId)) throw new Error(`Ingrédient en double : ${productId}`);
        seen.add(productId);
      }
      return db.writeTransaction(async (tx) => {
        const at = stored(now());
        const household = await householdId(tx);
        const id = input.id ?? newId();
        if (input.id === undefined) {
          await tx.execute(
            `INSERT INTO recipe (id, household_id, name, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, household, name, input.notes, at, at],
          );
        } else {
          await tx.execute('UPDATE recipe SET name = ?, notes = ?, updated_at = ? WHERE id = ?', [
            name,
            input.notes,
            at,
            id,
          ]);
        }
        const current = await tx.getAll<AppTables['recipe_ingredient']>(
          'SELECT * FROM recipe_ingredient WHERE recipe_id = ? AND deleted_at IS NULL',
          [id],
        );
        for (const row of current) {
          if (!seen.has(row.product_id ?? '')) {
            await tx.execute(
              'UPDATE recipe_ingredient SET deleted_at = ?, updated_at = ? WHERE id = ?',
              [at, at, row.id],
            );
          }
        }
        for (const ingredient of input.ingredients) {
          const row = current.find((r) => r.product_id === ingredient.productId);
          if (row === undefined) {
            await tx.execute(
              `INSERT INTO recipe_ingredient
                 (id, household_id, recipe_id, product_id, quantity, unit, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                newId(),
                household,
                id,
                ingredient.productId,
                ingredient.quantity,
                ingredient.unit,
                at,
                at,
              ],
            );
          } else if (row.quantity !== ingredient.quantity || row.unit !== ingredient.unit) {
            await tx.execute(
              'UPDATE recipe_ingredient SET quantity = ?, unit = ?, updated_at = ? WHERE id = ?',
              [ingredient.quantity, ingredient.unit, at, row.id],
            );
          }
        }
        return id;
      });
    },

    /** Supprime la recette ; ses lignes restent sur la liste (EF-4.6). */
    deleteRecipe(recipeId: string): Promise<void> {
      return setRecipeDeleted(recipeId, stored(now()));
    },

    restoreRecipe(recipeId: string): Promise<void> {
      return setRecipeDeleted(recipeId, null);
    },
  };

  const categories = {
    watch(subscription: Subscription<Awaited<ReturnType<typeof readCategories>>>) {
      return watch(db, ['category'], readCategories, subscription);
    },

    /**
     * Déplace le rayon au rang `toIndex` de son groupe : rayons ordinaires, ou rayons système
     * toujours en fin de parcours (EF-5.1, RG-9).
     */
    moveCategory(categoryId: string, toIndex: number): Promise<void> {
      return db.writeTransaction(async (tx) => {
        const all = await readCategories(tx);
        const moved = all.find((c) => c.id === categoryId);
        if (moved === undefined) throw new Error(`Rayon inconnu : ${categoryId}`);
        const isSystem = (c: (typeof all)[number]) => c.systemKey !== null;
        const group = all.filter((c) => isSystem(c) === isSystem(moved) && c.id !== categoryId);
        group.splice(Math.max(0, Math.min(toIndex, group.length)), 0, moved);
        const ordered = isSystem(moved)
          ? [...all.filter((c) => !isSystem(c)), ...group]
          : [...group, ...all.filter(isSystem)];
        const at = stored(now());
        for (const [index, category] of ordered.entries()) {
          if (category.position !== index + 1) {
            await tx.execute('UPDATE category SET position = ?, updated_at = ? WHERE id = ?', [
              index + 1,
              at,
              category.id,
            ]);
          }
        }
      });
    },
  };

  const account = {
    watch(subscription: Subscription<Awaited<ReturnType<typeof readSettings>>>) {
      return watch(db, ['household'], readSettings, subscription);
    },

    /** « Aider à améliorer le catalogue » (EF-5.4). */
    setCatalogContribution(enabled: boolean): Promise<void> {
      return db.writeTransaction(async (tx) => {
        await tx.execute(
          'UPDATE household SET catalog_contribution = ?, updated_at = ? WHERE id = ?',
          [enabled ? 1 : 0, stored(now()), await householdId(tx)],
        );
      });
    },

    /**
     * Contenu de « Exporter mes données » (EF-5.5, 5.6) : rayons dans leur ordre, produits,
     * achats, recettes et ingrédients, liste entière, lignes passées comprises.
     */
    async exportData(): Promise<Record<string, unknown>> {
      const rows = (table: string, order: string) =>
        db.getAll<Record<string, unknown>>(`SELECT * FROM ${table} ORDER BY ${order}`);
      const strip = (list: Record<string, unknown>[]) =>
        list.map((row) =>
          Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'household_id')),
        );
      return {
        exported_at: stored(now()),
        categories: strip(await rows('category', 'position')),
        products: strip(await rows('product', 'name_normalized')),
        purchases: strip(await rows('stock_event', 'occurred_at')),
        recipes: strip(await rows('recipe', 'name')),
        recipe_ingredients: strip(await rows('recipe_ingredient', 'created_at')),
        list_lines: strip(await rows('list_line', 'created_at')),
        list_recipes: strip(await rows('list_recipe', 'created_at')),
      };
    },
  };

  return { list, products, purchases, recipes, categories, account };
}

export type Data = ReturnType<typeof createData>;
