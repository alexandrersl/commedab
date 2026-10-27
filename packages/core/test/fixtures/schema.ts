import type {
  FinishedAt,
  Household,
  ListLine,
  LocalDateTime,
  Offer,
  Product,
  Recipe,
  StockEvent,
} from '../../src/index';

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
    suggestions?: { productId: string; quantity: number; marked: boolean }[];
    /** `suggestForPeriod` refuse l'entrée par une `InvalidInputError` sur ce champ. */
    invalidInput?: string;
    recipeLines?: { productId: string; quantity: number; existing: boolean }[];
  };
}

// Vérification à la main du JSON contre `Fixture` : une clé inconnue ou mal typée (faute de
// frappe dans `expected`, par exemple) échoue au lieu d'être ignorée en silence.

type Check = (value: unknown, path: string) => void;

function fail(path: string, expected: string, value: unknown): never {
  throw new Error(`Fixture ${path} : ${expected} attendu, reçu ${JSON.stringify(value)}`);
}

const string: Check = (v, p) => {
  if (typeof v !== 'string') fail(p, 'texte', v);
};
const number: Check = (v, p) => {
  if (typeof v !== 'number') fail(p, 'nombre', v);
};
const boolean: Check = (v, p) => {
  if (typeof v !== 'boolean') fail(p, 'booléen', v);
};
const quantity: Check = (v, p) => {
  if (typeof v !== 'number' && !(typeof v === 'string' && /^\d+\/\d+$/.test(v))) {
    fail(p, 'nombre ou fraction', v);
  }
};
const nullable =
  (check: Check): Check =>
  (v, p) => {
    if (v !== null) check(v, p);
  };
const oneOf =
  (...values: string[]): Check =>
  (v, p) => {
    if (typeof v !== 'string' || !values.includes(v)) fail(p, values.join(' | '), v);
  };
const array =
  (check: Check): Check =>
  (v, p) => {
    if (!Array.isArray(v)) fail(p, 'tableau', v);
    v.forEach((item, i) => check(item, `${p}[${i}]`));
  };
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
const record =
  (check: Check): Check =>
  (v, p) => {
    if (!isObject(v)) fail(p, 'objet', v);
    for (const [key, item] of Object.entries(v)) check(item, `${p}.${key}`);
  };
/** Objet aux seules clés `fields` ; celles de `required` sont obligatoires. */
const object =
  (fields: Record<string, Check>, required: readonly string[] = []): Check =>
  (v, p) => {
    if (!isObject(v)) fail(p, 'objet', v);
    for (const key of required)
      if (!(key in v)) fail(`${p}.${key}`, 'champ obligatoire', undefined);
    for (const [key, item] of Object.entries(v)) {
      const check = fields[key];
      if (check === undefined) fail(`${p}.${key}`, 'aucun champ de ce nom', item);
      check(item, `${p}.${key}`);
    }
  };

const product = object(
  {
    id: string,
    unitKind: oneOf('piece', 'weight', 'volume'),
    family: oneOf('rhythm', 'reserve', 'occasional'),
    declaredQty: nullable(number),
    declaredPerDays: nullable(number),
    safetyStock: number,
    shelfLifeDays: nullable(number),
    catalogRateQty: nullable(number),
    catalogLifetimeDays: nullable(number),
    catalogScaling: nullable(oneOf('per_person', 'per_household')),
    archivedAt: nullable(string),
  },
  ['id'],
);
const event = object(
  {
    id: string,
    productId: string,
    type: oneOf('purchased', 'opened_last', 'finished', 'counted'),
    quantity: nullable(number),
    occurredAt: string,
    fromRecipe: boolean,
    deletedAt: nullable(string),
  },
  ['productId', 'type', 'occurredAt'],
);
const listLine = object(
  {
    productId: string,
    quantity: number,
    decision: nullable(oneOf('accepted', 'modified', 'refused_have', 'refused_stop')),
  },
  ['productId'],
);
const recipe = object(
  {
    id: string,
    servings: number,
    ingredients: array(
      object({ productId: string, quantity: number, kind: oneOf('base', 'specific') }, [
        'productId',
        'quantity',
        'kind',
      ]),
    ),
  },
  ['id', 'servings', 'ingredients'],
);
const expected = object({
  rates: record(object({ perDay: quantity, source: string, intervalCount: number })),
  intervals: record(array(number)),
  states: record(
    object({
      stock: quantity,
      anchorAt: nullable(string),
      depletionDate: nullable(string),
      toRebuy: boolean,
    }),
  ),
  finishedAt: object({ at: string, advanced: boolean, beforePurchaseOn: string }, [
    'at',
    'advanced',
  ]),
  suggestions: array(
    object({ productId: string, quantity: number, marked: boolean }, [
      'productId',
      'quantity',
      'marked',
    ]),
  ),
  invalidInput: string,
  recipeLines: array(
    object({ productId: string, quantity: number, existing: boolean }, [
      'productId',
      'quantity',
      'existing',
    ]),
  ),
});
const fixture = object(
  {
    id: string,
    scenario: string,
    household: object({ size: number }, ['size']),
    products: array(product),
    events: array(event),
    listLines: array(listLine),
    previousOffers: array(
      object({ productId: string, offeredAt: string }, ['productId', 'offeredAt']),
    ),
    recipes: array(recipe),
    recipeRequests: array(object({ recipeId: string, servings: number }, ['recipeId', 'servings'])),
    finishedReport: object({ productId: string, at: string }, ['productId', 'at']),
    now: string,
    periodDays: number,
    expected,
  },
  ['id', 'scenario', 'products', 'events', 'now', 'expected'],
);

export function parseFixture(raw: unknown): Fixture {
  fixture(raw, isObject(raw) && typeof raw.id === 'string' ? raw.id : 'sans id');
  return raw as Fixture;
}
