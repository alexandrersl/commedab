import {
  productState,
  resolveFinishedAt,
  resolveRate,
  type FinishedAt,
  type Household,
  type ListLine,
  type LocalDateTime,
  type Product,
  type ProductState,
  type StockEvent,
} from '../src/index';
import type { Fixture, Quantity } from './fixtures/schema';

export type { Fixture, Quantity };

export interface Scenario {
  fixture: Fixture;
  household: Household;
  products: Product[];
  events: StockEvent[];
  listLines: ListLine[];
  finishedAt: FinishedAt | null;
}

export function quantity(value: Quantity): number {
  if (typeof value === 'number') return value;
  const [numerator, denominator] = value.split('/').map(Number);
  if (numerator === undefined || denominator === undefined) throw new Error(`Fraction : ${value}`);
  return numerator / denominator;
}

/** Complète la fixture avec les valeurs par défaut du modèle (specs techniques 3.3). */
export function scenario(fixture: Fixture): Scenario {
  const household: Household = { size: 1, periodDays: null, ...fixture.household };
  const products: Product[] = fixture.products.map((product) => ({
    unitKind: 'piece',
    family: 'rhythm',
    declaredQty: null,
    declaredPerDays: null,
    safetyStock: 1,
    shelfLifeDays: null,
    catalogRateQty: null,
    catalogLifetimeDays: null,
    catalogScaling: null,
    archivedAt: null,
    ...product,
  }));
  const events: StockEvent[] = fixture.events.map((event, i) => ({
    id: `e${i + 1}`,
    quantity: null,
    fromRecipe: false,
    deletedAt: null,
    ...event,
  }));
  const listLines: ListLine[] = (fixture.listLines ?? []).map((line, i) => ({
    id: `l${i + 1}`,
    quantity: 1,
    decision: null,
    createdAt: fixture.now,
    checkedAt: null,
    deletedAt: null,
    ...line,
  }));

  let finishedAt: FinishedAt | null = null;
  const report = fixture.finishedReport;
  if (report !== undefined) {
    const product = products.find((p) => p.id === report.productId);
    if (product === undefined) throw new Error(`Produit inconnu : ${report.productId}`);
    const own = events.filter((event) => event.productId === product.id);
    finishedAt = resolveFinishedAt(own, resolveRate(product, own, household), report.at);
    events.push({
      id: `e${events.length + 1}`,
      productId: product.id,
      type: 'finished',
      quantity: null,
      occurredAt: finishedAt.at,
      fromRecipe: false,
      deletedAt: null,
    });
  }
  return { fixture, household, products, events, listLines, finishedAt };
}

export function eventsOf(events: readonly StockEvent[], productId: string): StockEvent[] {
  return events.filter((event) => event.productId === productId);
}

export function statesOf(
  s: Pick<Scenario, 'products' | 'events' | 'household'>,
  now: LocalDateTime,
): Map<string, ProductState> {
  return new Map(
    s.products.map((p) => [p.id, productState(p, eventsOf(s.events, p.id), s.household, now)]),
  );
}
