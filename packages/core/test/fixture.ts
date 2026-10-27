import {
  productState,
  resolveFinishedAt,
  resolveRate,
  type FinishedAt,
  type Offer,
  type Household,
  type ListLine,
  type LocalDateTime,
  type Product,
  type ProductState,
  type Recipe,
  type StockEvent,
} from '../src/index';

/** Nombre, ou fraction écrite `"1/7"` pour rester lisible dans le JSON. */
export type Quantity = number | string;

export interface Fixture {
  id: string;
  scenario: string;
  household?: Household;
  products: (Partial<Product> & { id: string })[];
  events: (Partial<StockEvent> & Pick<StockEvent, 'productId' | 'type' | 'occurredAt'>)[];
  listLines?: (Partial<ListLine> & { productId: string })[];
  previousOffers?: Offer[];
  recipes?: Recipe[];
  recipeRequests?: { recipeId: string; servings: number }[];
  /** « Fini » signalé à `at`, daté par `resolveFinishedAt` puis ajouté aux événements. */
  finishedReport?: { productId: string; at: LocalDateTime };
  now: LocalDateTime;
  periodDays?: number;
  expected: {
    rates?: Record<string, { perDay?: Quantity; source?: string; intervalCount?: number }>;
    intervals?: Record<string, number[]>;
    states?: Record<
      string,
      {
        stock?: Quantity;
        anchorAt?: string | null;
        depletionDate?: string | null;
        toRebuy?: boolean;
      }
    >;
    finishedAt?: FinishedAt;
    suggestions?: { productId: string; quantity: number }[];
    /** `suggestForPeriod` refuse l'entrée par une `InvalidInputError` sur ce champ. */
    invalidInput?: string;
    recipeLines?: { productId: string; quantity: number; existing: boolean }[];
  };
}

export interface Scenario {
  fixture: Fixture;
  household: Household;
  products: Product[];
  events: StockEvent[];
  listLines: ListLine[];
  previousOffers: Offer[];
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
  const household = fixture.household ?? { size: 1 };
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
  const listLines: ListLine[] = (fixture.listLines ?? []).map((line) => ({
    quantity: 1,
    decision: null,
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
  const previousOffers = fixture.previousOffers ?? [];
  return { fixture, household, products, events, listLines, previousOffers, finishedAt };
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
