import type { ListLine } from '@commedab/core';
import type { CategoryRecord, ProductRecord, RecipeRecord } from '@commedab/data';
import type { Engine } from '../../data/engine';
import { ingredientQuantity } from '../../copy/words';

export interface ShownLine {
  line: ListLine;
  checked: boolean;
  product: ProductRecord;
  /** « Carbonara · 200 g » : la recette qui l'a demandée et la quantité qu'elle requiert. */
  subtitle: string | null;
}

export interface LineGroup {
  /** Nul : « À classer ». */
  category: CategoryRecord | null;
  lines: ShownLine[];
}

function subtitleOf(line: ListLine, recipe: RecipeRecord | undefined): string | null {
  if (recipe === undefined) return null;
  const ingredient = recipe.ingredients.find((i) => i.productId === line.productId);
  const quantity =
    ingredient === undefined ? null : ingredientQuantity(ingredient.quantity, ingredient.unit);
  return quantity === null ? recipe.name : `${recipe.name} · ${quantity}`;
}

/**
 * Lignes affichées groupées par rayon dans l'ordre de parcours, « À classer » en tête ; dans
 * chaque groupe, les lignes cochées en fin de groupe (EF-1.2).
 */
export function groupLines(engine: Engine): LineGroup[] {
  const byCategory = new Map<string | null, ShownLine[]>();
  for (const { line, state } of engine.shownLines) {
    const product = engine.productById.get(line.productId);
    if (product === undefined) continue;
    const recipe = line.recipeId === null ? undefined : engine.recipeById.get(line.recipeId);
    const key =
      product.categoryId !== null && engine.categoryById.has(product.categoryId)
        ? product.categoryId
        : null;
    const group = byCategory.get(key) ?? [];
    group.push({ line, checked: state === 'checked', product, subtitle: subtitleOf(line, recipe) });
    byCategory.set(key, group);
  }
  const order: (CategoryRecord | null)[] = [null, ...engine.categories];
  return order.flatMap((category) => {
    const lines = byCategory.get(category?.id ?? null);
    if (lines === undefined) return [];
    const sorted = [...lines].sort(
      (a, b) =>
        Number(a.checked) - Number(b.checked) ||
        (a.checked ? (a.line.checkedAt ?? '').localeCompare(b.line.checkedAt ?? '') : 0),
    );
    return [{ category, lines: sorted }];
  });
}
