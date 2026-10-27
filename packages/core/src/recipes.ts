import { checkListLines, checkRecipe } from './guard';
import type { ListLine, Product, Recipe } from './model';
import { EPSILON, roundUpToStep } from './quantity';
import type { ProductState } from './state';

export interface RecipeLine {
  productId: string;
  /** Quantité totale de la ligne après cumul, arrondie au pas de l'unité. */
  quantity: number;
  /** Une ligne du produit existe déjà sur la liste : elle est mise à jour, pas dupliquée. */
  existing: boolean;
}

/**
 * Ajout de recettes à la liste (specs techniques 4.6). Les quantités sont mises à l'échelle
 * des portions demandées ; un ingrédient de base n'est ajouté qu'à hauteur du manque, calculé
 * sur le total des recettes.
 */
export function applyRecipes(input: {
  requests: readonly { recipe: Recipe; servings: number }[];
  products: ReadonlyMap<string, Product>;
  states: ReadonlyMap<string, ProductState>;
  /** Lignes non cochées de la liste : état `pending` (4.9). */
  listLines: readonly ListLine[];
}): RecipeLine[] {
  checkListLines(input.listLines);
  const required = new Map<string, { specific: number; base: number }>();
  for (const { recipe, servings } of input.requests) {
    checkRecipe(recipe, servings);
    const scale = servings / recipe.servings;
    for (const ingredient of recipe.ingredients) {
      const total = required.get(ingredient.productId) ?? { specific: 0, base: 0 };
      total[ingredient.kind] += ingredient.quantity * scale;
      required.set(ingredient.productId, total);
    }
  }

  const lines: RecipeLine[] = [];
  for (const [productId, { specific, base }] of required) {
    const product = input.products.get(productId);
    if (product === undefined) throw new Error(`Produit inconnu : ${productId}`);
    const stock = input.states.get(productId)?.stock ?? 0;
    const added = specific + Math.max(0, base - stock);
    if (added <= EPSILON) continue;

    const current = input.listLines.filter((line) => line.productId === productId);
    const listed = current.reduce((sum, line) => sum + line.quantity, 0);
    lines.push({
      productId,
      quantity: roundUpToStep(listed + added, product.unitKind),
      existing: current.length > 0,
    });
  }
  return lines;
}
