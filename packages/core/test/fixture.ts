import {
  listView,
  productState,
  type ListLine,
  type ListRecipe,
  type ListView,
  type LocalDateTime,
  type Product,
  type ProductState,
  type Purchase,
  type Recipe,
} from '../src/index';
import type { Fixture, Quantity } from './fixtures/schema';

export type { Fixture, Quantity };

export interface Scenario {
  fixture: Fixture;
  products: Product[];
  purchases: Purchase[];
  listLines: ListLine[];
  listRecipes: ListRecipe[];
  recipes: Recipe[];
}

export function quantity(value: Quantity): number {
  if (typeof value === 'number') return value;
  const [numerator, denominator] = value.split('/').map(Number);
  if (numerator === undefined || denominator === undefined) throw new Error(`Fraction : ${value}`);
  return numerator / denominator;
}

/** Complète la fixture avec les valeurs par défaut du modèle (specs techniques 3.3). */
export function scenario(fixture: Fixture): Scenario {
  const products: Product[] = fixture.products.map((product) => ({
    unitLabel: 'pièce',
    packSize: 1,
    declaredQty: null,
    declaredPerDays: null,
    contentsQty: null,
    contentsUnit: null,
    catalogQty: null,
    catalogPerDays: null,
    archivedAt: null,
    ...product,
  }));
  const purchases: Purchase[] = fixture.purchases.map((purchase, i) => ({
    id: `p${i + 1}`,
    fromRecipe: false,
    ...purchase,
  }));
  const listLines: ListLine[] = (fixture.listLines ?? []).map((line, i) => ({
    id: `l${i + 1}`,
    quantity: 1,
    origin: 'suggestion',
    recipeId: null,
    createdAt: fixture.now,
    checkedAt: null,
    deletedAt: null,
    ...line,
  }));
  const listRecipes: ListRecipe[] = (fixture.listRecipes ?? []).map((listRecipe, i) => ({
    id: `r${i + 1}`,
    times: 1,
    createdAt: fixture.now,
    deletedAt: null,
    ...listRecipe,
  }));
  const recipes: Recipe[] = (fixture.recipes ?? []).map((recipe) => ({
    id: recipe.id,
    ingredients: recipe.ingredients.map((ingredient) => ({
      quantity: null,
      unit: null,
      ...ingredient,
    })),
  }));
  return { fixture, products, purchases, listLines, listRecipes, recipes };
}

export function ofProduct<T extends { productId: string }>(
  items: readonly T[],
  productId: string,
): T[] {
  return items.filter((item) => item.productId === productId);
}

export function statesOf(
  s: Pick<Scenario, 'products' | 'purchases' | 'listLines'>,
  now: LocalDateTime,
): Map<string, ProductState> {
  return new Map(
    s.products.map((p) => [
      p.id,
      productState(p, ofProduct(s.purchases, p.id), ofProduct(s.listLines, p.id), now),
    ]),
  );
}

export function viewOf(s: Scenario): ListView {
  return listView({
    lines: s.listLines,
    listRecipes: s.listRecipes,
    recipes: s.recipes,
    purchases: s.purchases,
    openedAt: s.fixture.openedAt ?? s.fixture.now,
  });
}

export function recipeOf(s: Scenario, recipeId: string): Recipe {
  const recipe = s.recipes.find((r) => r.id === recipeId);
  if (recipe === undefined) throw new Error(`Recette inconnue : ${recipeId}`);
  return recipe;
}
