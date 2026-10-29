import type {
  Ingredient,
  LineState,
  ListLine,
  ListRecipe,
  LocalDateTime,
  Period,
  Product,
  Purchase,
} from '../../src/index';

/** Nombre, ou fraction écrite `"1/7"` pour rester lisible dans le JSON. */
export type Quantity = number | string;

export interface Fixture {
  id: string;
  scenario: string;
  products: (Partial<Product> & { id: string })[];
  purchases: (Partial<Purchase> & Pick<Purchase, 'productId' | 'quantity' | 'occurredAt'>)[];
  listLines?: (Partial<ListLine> & { productId: string })[];
  listRecipes?: (Partial<ListRecipe> & { recipeId: string })[];
  recipes?: { id: string; ingredients: (Partial<Ingredient> & { productId: string })[] }[];
  /** Recettes demandées à `missingIngredients`, attendues dans `expected.missing`. */
  recipeRequests?: { recipeId: string; times: number }[];
  /** Passages de `from` à `to` fois par `applyRecipe`, attendus dans `expected.recipeChanges`. */
  recipeChanges?: { recipeId: string; from: number; to: number }[];
  now: LocalDateTime;
  /** Ouverture de l'application, pour `listView` ; `now` par défaut. */
  openedAt?: LocalDateTime;
  periodDays?: number;
  expected: {
    rates?: Record<string, { perDay?: Quantity; source?: string; intervalCount?: number }>;
    intervals?: Record<string, number[]>;
    states?: Record<
      string,
      { stock?: Quantity; anchorAt?: string | null; depletionDate?: string | null }
    >;
    suggestions?: { productId: string; quantity: number }[];
    sessions?: { startedAt: string; endedAt: string; closesAt?: string }[];
    /** États des lignes à l'ouverture `openedAt` de la fixture. */
    lineStates?: Record<string, LineState>;
    /** Ce que la Liste affiche à plusieurs ouvertures de l'application. */
    openings?: {
      openedAt: LocalDateTime;
      lineStates?: Record<string, LineState>;
      recipeBadges?: { recipeId: string; checked: number; total: number; full: boolean }[];
    }[];
    period?: Partial<Period>;
    /** `suggestForPeriod` refuse l'entrée par une `InvalidInputError` sur ce champ. */
    invalidInput?: string;
    missing?: { productId: string; quantity: number }[][];
    recipeChanges?: { productId: string; quantity: number; existing: boolean }[][];
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
    unitLabel: string,
    packSize: number,
    declaredQty: nullable(number),
    declaredPerDays: nullable(number),
    contentsQty: nullable(number),
    contentsUnit: nullable(string),
    catalogQty: nullable(number),
    catalogPerDays: nullable(number),
    archivedAt: nullable(string),
  },
  ['id'],
);
const purchase = object(
  { id: string, productId: string, quantity: number, occurredAt: string, fromRecipe: boolean },
  ['productId', 'quantity', 'occurredAt'],
);
const listLine = object(
  {
    id: string,
    productId: string,
    quantity: number,
    origin: oneOf('suggestion', 'manual', 'recipe'),
    recipeId: nullable(string),
    createdAt: string,
    checkedAt: nullable(string),
    deletedAt: nullable(string),
  },
  ['productId'],
);
const listRecipe = object(
  { id: string, recipeId: string, times: number, createdAt: string, deletedAt: nullable(string) },
  ['recipeId'],
);
const recipe = object(
  {
    id: string,
    ingredients: array(
      object({ productId: string, quantity: nullable(number), unit: nullable(string) }, [
        'productId',
      ]),
    ),
  },
  ['id', 'ingredients'],
);
const lineStates = record(oneOf('pending', 'checked', 'past'));
const packs = object({ productId: string, quantity: number }, ['productId', 'quantity']);
const expected = object({
  rates: record(object({ perDay: quantity, source: string, intervalCount: number })),
  intervals: record(array(number)),
  states: record(
    object({ stock: quantity, anchorAt: nullable(string), depletionDate: nullable(string) }),
  ),
  suggestions: array(packs),
  sessions: array(
    object({ startedAt: string, endedAt: string, closesAt: string }, ['startedAt', 'endedAt']),
  ),
  lineStates,
  openings: array(
    object(
      {
        openedAt: string,
        lineStates,
        recipeBadges: array(
          object({ recipeId: string, checked: number, total: number, full: boolean }, [
            'recipeId',
            'checked',
            'total',
            'full',
          ]),
        ),
      },
      ['openedAt'],
    ),
  ),
  period: object({ days: number, source: oneOf('learned', 'default'), intervalCount: number }),
  invalidInput: string,
  missing: array(array(packs)),
  recipeChanges: array(
    array(
      object({ productId: string, quantity: number, existing: boolean }, [
        'productId',
        'quantity',
        'existing',
      ]),
    ),
  ),
});
const fixture = object(
  {
    id: string,
    scenario: string,
    products: array(product),
    purchases: array(purchase),
    listLines: array(listLine),
    listRecipes: array(listRecipe),
    recipes: array(recipe),
    recipeRequests: array(object({ recipeId: string, times: number }, ['recipeId', 'times'])),
    recipeChanges: array(
      object({ recipeId: string, from: number, to: number }, ['recipeId', 'from', 'to']),
    ),
    now: string,
    openedAt: string,
    periodDays: number,
    expected,
  },
  ['id', 'scenario', 'products', 'purchases', 'now', 'expected'],
);

export function parseFixture(raw: unknown): Fixture {
  fixture(raw, isObject(raw) && typeof raw.id === 'string' ? raw.id : 'sans id');
  return raw as Fixture;
}
