import type { MissingIngredient } from '@commedab/core';
import type { RecipeRecord } from '@commedab/data';
import { ingredientQuantity, listOf } from '../../copy/words';
import type { Engine } from '../../data/engine';

/** Ingrédient d'une recette tel que les écrans l'affichent. */
export interface IngredientView {
  productId: string;
  name: string;
  /** « 200 g », « 4 » ; nul sans quantité. */
  quantity: string | null;
  /** Packs qui manquent, nul s'il ne manque pas. */
  missing: number | null;
}

/** Ingrédients de la recette, les manquants d'abord (EF-4.1, EF-4.3). */
export function ingredientsOf(
  engine: Engine,
  recipe: RecipeRecord,
  missing: readonly MissingIngredient[],
): IngredientView[] {
  const views = recipe.ingredients.map((ingredient) => ({
    productId: ingredient.productId,
    name: engine.productById.get(ingredient.productId)?.name ?? '…',
    quantity: ingredientQuantity(ingredient.quantity, ingredient.unit),
    missing: missing.find((m) => m.productId === ingredient.productId)?.quantity ?? null,
  }));
  return [...views.filter((v) => v.missing !== null), ...views.filter((v) => v.missing === null)];
}

/** Libellé d'une pastille : « Lardons 200 g ». */
export function pillLabel(view: IngredientView): string {
  return view.quantity === null ? view.name : `${view.name} ${view.quantity}`;
}

/** « Lardons et crème » : noms en phrase, la majuscule au premier seulement. */
export function namesSentence(names: readonly string[]): string {
  const text = listOf(names.map((name, i) => (i === 0 ? name : name.toLowerCase())));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** « il te manque 2 ingrédients », « il te manque 1 ingrédient ». */
export function missingCount(n: number): string {
  return `il te manque ${n} ingrédient${n > 1 ? 's' : ''}`;
}
