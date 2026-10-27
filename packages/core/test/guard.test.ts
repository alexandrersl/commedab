import { describe, expect, it } from 'vitest';
import {
  applyRecipes,
  estimateStock,
  InvalidInputError,
  listView,
  observedIntervals,
  productState,
  resolveFinishedAt,
  resolvePeriod,
  shoppingSessions,
  suggestForPeriod,
  type ListLine,
  type Product,
  type Rate,
  type StockEvent,
} from '../src/index';

const product: Product = {
  id: 'lait',
  unitKind: 'volume',
  family: 'rhythm',
  declaredQty: null,
  declaredPerDays: null,
  safetyStock: 1,
  shelfLifeDays: null,
  catalogRateQty: null,
  catalogLifetimeDays: null,
  catalogScaling: null,
  archivedAt: null,
};
const purchase: StockEvent = {
  id: 'e1',
  productId: 'lait',
  type: 'purchased',
  quantity: 1,
  occurredAt: '2026-10-01T10:00:00',
  fromRecipe: false,
  deletedAt: null,
};
const rate: Rate = { perDay: 1 / 7, source: 'learned', intervalCount: 2 };
const household = { size: 1, periodDays: null };
const now = '2026-10-05T10:00:00';

function rejects(run: () => unknown, field: string): void {
  expect(run).toThrow(InvalidInputError);
  expect(run).toThrow(expect.objectContaining({ field }));
}

describe('gardes des fonctions publiques', () => {
  it('accepte une entrée valide', () => {
    expect(() => productState(product, [purchase], household, now)).not.toThrow();
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
    rejects(() => productState(product, [purchase], household, at), 'now');
    rejects(() => observedIntervals([{ ...purchase, occurredAt: at }]), 'event[e1].occurredAt');
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('refuse la quantité achetée %s', (q) => {
    rejects(
      () => productState(product, [{ ...purchase, quantity: q }], household, now),
      'event[e1].quantity',
    );
  });

  it('exige une quantité pour un achat et un relevé', () => {
    rejects(() => observedIntervals([{ ...purchase, quantity: null }]), 'event[e1].quantity');
    rejects(
      () => observedIntervals([{ ...purchase, type: 'counted', quantity: null }]),
      'event[e1].quantity',
    );
    expect(() =>
      observedIntervals([{ ...purchase, type: 'finished', quantity: null }]),
    ).not.toThrow();
  });

  it('refuse un événement d’un autre produit', () => {
    rejects(
      () => estimateStock(product, [{ ...purchase, productId: 'pain' }], rate, now),
      'event[e1].productId',
    );
  });

  it('refuse un produit aux valeurs non finies ou un stock de sécurité négatif', () => {
    rejects(
      () => productState({ ...product, shelfLifeDays: Number.NaN }, [], household, now),
      'product[lait].shelfLifeDays',
    );
    rejects(
      () => productState({ ...product, safetyStock: -1 }, [], household, now),
      'product[lait].safetyStock',
    );
  });

  it('refuse un foyer vide, une période fixée hors de 1 à 31 jours et un rythme négatif', () => {
    rejects(() => productState(product, [], { size: 0, periodDays: null }, now), 'household.size');
    rejects(() => resolvePeriod({ size: 2, periodDays: 0 }, []), 'household.periodDays');
    rejects(() => resolvePeriod({ size: 2, periodDays: 32 }, []), 'household.periodDays');
    rejects(() => resolveFinishedAt([purchase], { ...rate, perDay: -1 }, now), 'rate.perDay');
  });

  it('refuse une période non entière, une ligne négative ou mal datée', () => {
    const line: ListLine = {
      id: 'l1',
      productId: 'lait',
      quantity: 1,
      decision: null,
      createdAt: now,
      checkedAt: null,
      deletedAt: null,
    };
    const list = listView([], now);
    rejects(
      () => suggestForPeriod({ products: [], states: new Map(), periodDays: 1.5, list }),
      'periodDays',
    );
    rejects(() => listView([{ ...line, quantity: -1 }], now), 'listLine[l1].quantity');
    rejects(() => listView([{ ...line, checkedAt: '2026-10-05' }], now), 'listLine[l1].checkedAt');
    rejects(() => shoppingSessions(['2026-10-05T25:00:00']), 'checks[0]');
  });

  it('refuse une recette sans portion', () => {
    const recipe = { id: 'curry', servings: 0, ingredients: [] };
    rejects(
      () =>
        applyRecipes({
          requests: [{ recipe, servings: 2 }],
          products: new Map(),
          states: new Map(),
          listLines: [],
        }),
      'recipe[curry].servings',
    );
  });
});
