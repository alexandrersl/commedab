import { dayOf } from './date';
import { InvalidInputError } from './errors';
import type { ListLine, ListRecipe, LocalDateTime, Product, Purchase, Recipe } from './model';
import type { Rate } from './rate';

// Gardes des fonctions publiques : elles refusent ce que `data` ne doit jamais transmettre.
// Une valeur de rythme ou de contenance nulle ou négative n'est pas une erreur : elle vaut
// absence (specs techniques 4.3, 4.6).

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

/** Les dates sont comparées comme des textes : leur format doit être unique (4.1). */
export function checkDateTime(field: string, at: LocalDateTime): void {
  if (typeof at !== 'string' || !DATE_TIME.test(at) || dayOf(at) !== at.slice(0, 10)) {
    throw new InvalidInputError(field, at, 'doit être une date locale AAAA-MM-JJTHH:MM:SS');
  }
}

function checkFinite(field: string, value: number | null): void {
  if (value !== null && !Number.isFinite(value)) {
    throw new InvalidInputError(field, value, 'doit être un nombre fini');
  }
}

export function checkQuantity(field: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidInputError(field, value, 'doit être un nombre fini ≥ 0');
  }
}

export function checkInteger(field: string, value: number, min: number): void {
  if (!Number.isInteger(value) || value < min) {
    throw new InvalidInputError(field, value, `doit être un entier ≥ ${min}`);
  }
}

export function checkProduct(product: Product): void {
  const field = `product[${product.id}]`;
  if (!Number.isFinite(product.packSize) || product.packSize <= 0) {
    throw new InvalidInputError(
      `${field}.packSize`,
      product.packSize,
      'doit être un nombre fini > 0',
    );
  }
  checkFinite(`${field}.declaredQty`, product.declaredQty);
  checkFinite(`${field}.declaredPerDays`, product.declaredPerDays);
  checkFinite(`${field}.contentsQty`, product.contentsQty);
  checkFinite(`${field}.catalogQty`, product.catalogQty);
  checkFinite(`${field}.catalogPerDays`, product.catalogPerDays);
  if (product.archivedAt !== null) checkDateTime(`${field}.archivedAt`, product.archivedAt);
}

/** Achats valides ; tous du produit `productId` s'il est donné. */
export function checkPurchases(purchases: readonly Purchase[], productId?: string): void {
  for (const purchase of purchases) {
    const field = `purchase[${purchase.id}]`;
    if (productId !== undefined && purchase.productId !== productId) {
      throw new InvalidInputError(
        `${field}.productId`,
        purchase.productId,
        `doit être ${productId}`,
      );
    }
    checkDateTime(`${field}.occurredAt`, purchase.occurredAt);
    checkQuantity(`${field}.quantity`, purchase.quantity);
  }
}

export function checkRate(rate: Rate): void {
  checkQuantity('rate.perDay', rate.perDay);
}

/** Lignes valides ; toutes du produit `productId` s'il est donné. */
export function checkListLines(lines: readonly ListLine[], productId?: string): void {
  for (const line of lines) {
    const field = `listLine[${line.id}]`;
    if (productId !== undefined && line.productId !== productId) {
      throw new InvalidInputError(`${field}.productId`, line.productId, `doit être ${productId}`);
    }
    checkQuantity(`${field}.quantity`, line.quantity);
    checkDateTime(`${field}.createdAt`, line.createdAt);
    if (line.checkedAt !== null) checkDateTime(`${field}.checkedAt`, line.checkedAt);
    if (line.deletedAt !== null) checkDateTime(`${field}.deletedAt`, line.deletedAt);
  }
}

export function checkListRecipes(listRecipes: readonly ListRecipe[]): void {
  for (const listRecipe of listRecipes) {
    const field = `listRecipe[${listRecipe.id}]`;
    checkInteger(`${field}.times`, listRecipe.times, 1);
    checkDateTime(`${field}.createdAt`, listRecipe.createdAt);
    if (listRecipe.deletedAt !== null) checkDateTime(`${field}.deletedAt`, listRecipe.deletedAt);
  }
}

export function checkRecipe(recipe: Recipe): void {
  const seen = new Set<string>();
  for (const ingredient of recipe.ingredients) {
    const field = `recipe[${recipe.id}].ingredient[${ingredient.productId}]`;
    if (seen.has(ingredient.productId)) {
      throw new InvalidInputError(field, ingredient.productId, 'apparaît deux fois');
    }
    seen.add(ingredient.productId);
    if (ingredient.quantity !== null) checkQuantity(`${field}.quantity`, ingredient.quantity);
  }
}

export function checkPeriod(periodDays: number): void {
  checkInteger('periodDays', periodDays, 1);
}
