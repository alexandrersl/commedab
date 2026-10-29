import { checkInteger, checkListLines, checkProduct, checkRecipe } from './guard';
import type { Ingredient, ListLine, Product, Recipe } from './model';
import { EPSILON, packsFor } from './quantity';
import type { ProductState } from './state';
import { toProductUnits } from './units';

export interface MissingIngredient {
  productId: string;
  /** Packs. */
  quantity: number;
}

export interface RecipeLine {
  productId: string;
  /** Packs de la ligne après l'ajout ; 0 : la ligne est retirée. */
  quantity: number;
  /** Une ligne non cochée du produit existe : elle est mise à jour, pas dupliquée. */
  existing: boolean;
}

interface RecipeInput {
  recipe: Recipe;
  products: ReadonlyMap<string, Product>;
  states: ReadonlyMap<string, ProductState>;
}

/** Ingrédients qui manquent pour faire `times` fois la recette, dans l'ordre de la recette (4.6). */
export function missingIngredients(input: RecipeInput & { times: number }): MissingIngredient[] {
  checkRecipe(input.recipe);
  checkInteger('times', input.times, 1);
  return input.recipe.ingredients.flatMap((ingredient) => {
    const quantity = missingPacks(ingredient, input.times, input);
    return quantity > 0 ? [{ productId: ingredient.productId, quantity }] : [];
  });
}

/**
 * Passage d'une recette de `from` à `to` fois sur la liste (4.6) : l'écart des manques, au
 * stock du moment, s'ajoute aux lignes non cochées ou s'en retire. `listLines` : lignes non
 * cochées de la liste (état `pending`).
 */
export function applyRecipe(
  input: RecipeInput & { from: number; to: number; listLines: readonly ListLine[] },
): RecipeLine[] {
  checkRecipe(input.recipe);
  checkInteger('from', input.from, 0);
  checkInteger('to', input.to, 0);
  checkListLines(input.listLines);
  const lines: RecipeLine[] = [];
  for (const ingredient of input.recipe.ingredients) {
    const delta =
      missingPacks(ingredient, input.to, input) - missingPacks(ingredient, input.from, input);
    const current = input.listLines.find((line) => line.productId === ingredient.productId);
    if (delta === 0 || (delta < 0 && current === undefined)) continue;
    lines.push({
      productId: ingredient.productId,
      quantity: Math.max(0, (current?.quantity ?? 0) + delta),
      existing: current !== undefined,
    });
  }
  return lines;
}

/**
 * Manque d'un ingrédient en packs : la quantité requise, convertie en unités du produit (un
 * pack sans conversion possible), moins le stock estimé ; sans quantité, un pack si le stock
 * est nul.
 */
function missingPacks(ingredient: Ingredient, times: number, input: RecipeInput): number {
  const product = input.products.get(ingredient.productId);
  if (product === undefined) throw new Error(`Produit inconnu : ${ingredient.productId}`);
  checkProduct(product);
  if (times === 0) return 0;
  const stock = input.states.get(product.id)?.stock ?? 0;
  if (ingredient.quantity === null) return stock <= EPSILON ? 1 : 0;

  const units = toProductUnits(ingredient.quantity, ingredient.unit, product) ?? product.packSize;
  const missing = times * units - stock;
  return missing > EPSILON ? packsFor(missing, product.packSize) : 0;
}
