import { CATALOG, type CatalogEntry } from './catalog';
import type { LocalDateTime } from './model';
import { normalizeName } from './normalize';

export interface SearchableRecipe {
  id: string;
  name: string;
}

export interface SearchableProduct {
  id: string;
  name: string;
  catalogEntryId: string | null;
  archivedAt: LocalDateTime | null;
  /** Nombre d'achats, qui classe les produits à égalité. */
  purchaseCount: number;
}

export type SearchResult =
  | { kind: 'recipe'; recipe: SearchableRecipe }
  | { kind: 'product'; product: SearchableProduct }
  | { kind: 'catalog'; entry: CatalogEntry }
  /** « Créer « … » » : `name` est le nom de l'entrée quand la requête la désigne (EF-2.8). */
  | { kind: 'create'; name: string; entry: CatalogEntry | null };

/** 0 : un mot du nom commence par la requête ; 1 : le nom la contient ; null : aucun rapport. */
function rank(normalized: string, query: string): 0 | 1 | null {
  if (normalized.startsWith(query) || normalized.includes(` ${query}`)) return 0;
  return normalized.includes(query) ? 1 : null;
}

function bestRank(names: readonly string[], query: string): 0 | 1 | null {
  let best: 0 | 1 | null = null;
  for (const name of names) {
    const r = rank(name, query);
    if (r === 0) return 0;
    if (r !== null) best = r;
  }
  return best;
}

function byText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const catalogNames = new WeakMap<readonly CatalogEntry[], Map<CatalogEntry, string[]>>();

/** Noms et alias normalisés des entrées proposables, calculés une fois par catalogue. */
function namesOf(catalog: readonly CatalogEntry[]): Map<CatalogEntry, string[]> {
  let names = catalogNames.get(catalog);
  if (names === undefined) {
    names = new Map(
      catalog
        .filter((entry) => !entry.deprecated)
        .map((entry) => [entry, [entry.name, ...entry.aliases].map(normalizeName)]),
    );
    catalogNames.set(catalog, names);
  }
  return names;
}

/**
 * Résultats de la recherche du panneau Ajouter (specs techniques 7.5, EF-2.7) : recettes,
 * produits (archivés compris), entrées du catalogue, puis « Créer ». Dans chaque groupe, les
 * noms dont un mot commence par la requête passent devant ceux qui la contiennent. Les
 * ingrédients d'une recette se cherchent sans `recipes` (EF-4.2).
 */
export function search({
  query,
  recipes = [],
  products,
  catalog = CATALOG,
}: {
  query: string;
  recipes?: readonly SearchableRecipe[];
  products: readonly SearchableProduct[];
  catalog?: readonly CatalogEntry[];
}): SearchResult[] {
  const q = normalizeName(query);
  if (q === '') return [];

  const foundRecipes = recipes
    .map((recipe) => ({ recipe, name: normalizeName(recipe.name) }))
    .map((r) => ({ ...r, rank: rank(r.name, q) }))
    .filter((r) => r.rank !== null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0) || byText(a.name, b.name));

  const productNames = products.map((product) => ({ product, name: normalizeName(product.name) }));
  const foundProducts = productNames
    .map((p) => ({ ...p, rank: rank(p.name, q) }))
    .filter((p) => p.rank !== null)
    .sort(
      (a, b) =>
        (a.rank ?? 0) - (b.rank ?? 0) ||
        b.product.purchaseCount - a.product.purchaseCount ||
        byText(a.name, b.name),
    );

  const usedEntries = new Set(products.map((p) => p.catalogEntryId));
  const usedNames = new Set(productNames.map((p) => p.name));
  const available = [...namesOf(catalog)].filter(
    ([entry, names]) => !usedEntries.has(entry.id) && !usedNames.has(names[0] ?? ''),
  );
  const foundEntries = available
    .map(([entry, names]) => ({ entry, name: names[0] ?? '', rank: bestRank(names, q) }))
    .filter((e) => e.rank !== null)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0) || byText(a.name, b.name));

  const results: SearchResult[] = [
    ...foundRecipes.map(({ recipe }) => ({ kind: 'recipe' as const, recipe })),
    ...foundProducts.map(({ product }) => ({ kind: 'product' as const, product })),
    ...foundEntries.map(({ entry }) => ({ kind: 'catalog' as const, entry })),
  ];
  if (!usedNames.has(q)) {
    const entry = available.find(([, names]) => names.includes(q))?.[0] ?? null;
    const name = entry?.name ?? query.trim().replace(/\s+/g, ' ');
    results.push({ kind: 'create', name, entry });
  }
  return results;
}

/** « Tous tes produits », avant toute saisie : les non archivés, du plus acheté au moins acheté (EF-2.2). */
export function productsByPurchases(products: readonly SearchableProduct[]): SearchableProduct[] {
  return products
    .filter((product) => product.archivedAt === null)
    .map((product) => ({ product, name: normalizeName(product.name) }))
    .sort((a, b) => b.product.purchaseCount - a.product.purchaseCount || byText(a.name, b.name))
    .map(({ product }) => product);
}
