import { describe, expect, it } from 'vitest';
import {
  applyRecipe,
  estimateStock,
  InvalidInputError,
  listView,
  missingIngredients,
  observedIntervals,
  packUnits,
  productState,
  shoppingSessions,
  suggestForPeriod,
  type ListLine,
  type Product,
  type Purchase,
  type Rate,
  type Recipe,
} from '../src/index';

const product: Product = {
  id: 'lait',
  unitLabel: 'bouteille',
  packSize: 6,
  declaredQty: null,
  declaredPerDays: null,
  contentsQty: 1,
  contentsUnit: 'l',
  catalogQty: null,
  catalogPerDays: null,
  archivedAt: null,
};
const purchase: Purchase = {
  id: 'p1',
  productId: 'lait',
  quantity: 6,
  occurredAt: '2026-10-01T10:00:00',
  fromRecipe: false,
};
const line: ListLine = {
  id: 'l1',
  productId: 'lait',
  quantity: 1,
  origin: 'manual',
  recipeId: null,
  createdAt: '2026-10-01T09:00:00',
  checkedAt: null,
  deletedAt: null,
};
const rate: Rate = { perDay: 1 / 7, source: 'learned', intervalCount: 2 };
const now = '2026-10-05T10:00:00';
const products = new Map([[product.id, product]]);

function rejects(run: () => unknown, field: string): void {
  expect(run).toThrow(InvalidInputError);
  expect(run).toThrow(expect.objectContaining({ field }));
}

describe('gardes des fonctions publiques', () => {
  it('accepte une entrée valide', () => {
    expect(() => productState(product, [purchase], [line], now)).not.toThrow();
  });

  it.each([
    ['2026-10-05', 'sans heure'],
    ['2026-10-05 10:00:00', 'séparateur espace'],
    ['2026-10-05T10:00:00.000', 'millisecondes'],
    ['2026-10-05T10:00:00Z', 'fuseau'],
    ['2026-02-30T10:00:00', 'jour inexistant'],
    ['2026-13-01T10:00:00', 'mois inexistant'],
    ['2026-10-05T24:00:00', 'heure 24'],
  ])('refuse la date %s (%s)', (at) => {
    rejects(() => productState(product, [purchase], [], at), 'now');
    rejects(() => observedIntervals([{ ...purchase, occurredAt: at }]), 'purchase[p1].occurredAt');
    rejects(
      () => productState(product, [], [{ ...line, createdAt: at }], now),
      'listLine[l1].createdAt',
    );
    rejects(() => listView({ lines: [], purchases: [], openedAt: at }), 'openedAt');
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('refuse la quantité achetée %s', (q) => {
    rejects(
      () => productState(product, [{ ...purchase, quantity: q }], [], now),
      'purchase[p1].quantity',
    );
  });

  it('refuse un achat ou une ligne d’un autre produit', () => {
    rejects(
      () => estimateStock(product, [{ ...purchase, productId: 'pain' }], [], rate, now),
      'purchase[p1].productId',
    );
    rejects(
      () => estimateStock(product, [], [{ ...line, productId: 'pain' }], rate, now),
      'listLine[l1].productId',
    );
  });

  it.each([0, -6, Number.NaN])('refuse une taille de pack de %s', (packSize) => {
    rejects(() => productState({ ...product, packSize }, [], [], now), 'product[lait].packSize');
    rejects(() => packUnits({ ...product, packSize }, 1), 'product[lait].packSize');
  });

  it('refuse un produit aux valeurs non finies et un rythme négatif', () => {
    rejects(
      () => productState({ ...product, catalogQty: Number.NaN }, [], [], now),
      'product[lait].catalogQty',
    );
    rejects(
      () => productState({ ...product, contentsQty: Number.POSITIVE_INFINITY }, [], [], now),
      'product[lait].contentsQty',
    );
    rejects(() => estimateStock(product, [], [], { ...rate, perDay: -1 }, now), 'rate.perDay');
  });

  it('refuse une période non entière, une ligne négative ou mal datée', () => {
    const list = listView({ lines: [], purchases: [], openedAt: now });
    rejects(
      () => suggestForPeriod({ products: [], states: new Map(), periodDays: 1.5, list }),
      'periodDays',
    );
    rejects(
      () => listView({ lines: [{ ...line, quantity: -1 }], purchases: [], openedAt: now }),
      'listLine[l1].quantity',
    );
    rejects(
      () =>
        listView({ lines: [{ ...line, checkedAt: '2026-10-05' }], purchases: [], openedAt: now }),
      'listLine[l1].checkedAt',
    );
    rejects(() => shoppingSessions(['2026-10-05T25:00:00']), 'purchasedAt[0]');
    rejects(() => packUnits(product, -1), 'packs');
  });

  it('refuse une recette comptée un nombre de fois non entier ou nul, ou un ingrédient en double', () => {
    const recipe: Recipe = {
      id: 'flan',
      ingredients: [{ productId: 'lait', quantity: 50, unit: 'cl' }],
    };
    const input = { recipe, products, states: new Map() };
    rejects(() => missingIngredients({ ...input, times: 0 }), 'times');
    rejects(() => missingIngredients({ ...input, times: 1.5 }), 'times');
    rejects(() => applyRecipe({ ...input, from: -1, to: 1, listLines: [] }), 'from');
    rejects(
      () =>
        listView({
          lines: [],
          listRecipes: [{ id: 'r1', recipeId: 'flan', times: 0, createdAt: now, deletedAt: null }],
          purchases: [],
          openedAt: now,
        }),
      'listRecipe[r1].times',
    );
    const twice = { ...recipe, ingredients: [...recipe.ingredients, ...recipe.ingredients] };
    rejects(
      () => missingIngredients({ ...input, recipe: twice, times: 1 }),
      'recipe[flan].ingredient[lait]',
    );
    rejects(
      () =>
        missingIngredients({
          ...input,
          recipe: { ...recipe, ingredients: [{ productId: 'lait', quantity: -1, unit: null }] },
          times: 1,
        }),
      'recipe[flan].ingredient[lait].quantity',
    );
  });
});

describe('quantité de l’achat créé à la coche (5.3 FS)', () => {
  it('vaut les packs de la ligne × la taille du pack', () => {
    expect(packUnits(product, 2)).toBe(12);
    expect(packUnits({ ...product, packSize: 0.25 }, 3)).toBe(0.75);
  });
});
