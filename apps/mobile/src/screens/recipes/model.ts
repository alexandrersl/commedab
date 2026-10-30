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
  /** Quantité et unité saisies dans la recette, pour une fois. */
  amount: { quantity: number | null; unit: string | null };
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
    amount: { quantity: ingredient.quantity, unit: ingredient.unit },
    missing: missing.find((m) => m.productId === ingredient.productId)?.quantity ?? null,
  }));
  return [...views.filter((v) => v.missing !== null), ...views.filter((v) => v.missing === null)];
}

/**
 * Libellé d'une pastille de carte recette (planche Recettes) : le nom seul quand on l'a ; ce
 * qui manque porte la quantité de la recette comptée `times` fois (« Lardons 400 g »), ou à
 * défaut « ×N » quand il manque plus d'un pack (« Haricots rouges ×2 »).
 */
export function pillLabel(view: IngredientView, times: number): string {
  if (view.missing === null) return view.name;
  const { quantity, unit } = view.amount;
  if (quantity !== null) return `${view.name} ${ingredientQuantity(quantity * times, unit)}`;
  return view.missing > 1 ? `${view.name} ×${view.missing}` : view.name;
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
