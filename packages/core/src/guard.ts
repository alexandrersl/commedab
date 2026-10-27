import { dayOf } from './date';
import { InvalidInputError } from './errors';
import type { Household, ListLine, LocalDateTime, Product, Recipe, StockEvent } from './model';
import type { Rate } from './rate';

// Gardes des fonctions publiques : elles refusent ce que `data` ne doit jamais transmettre.
// Une valeur de rythme ou de durée nulle ou négative n'est pas une erreur : elle vaut
// absence (specs techniques 4.3, 4.5).

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

function checkQuantity(field: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidInputError(field, value, 'doit être un nombre fini ≥ 0');
  }
}

function checkPositive(field: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InvalidInputError(field, value, 'doit être un nombre fini > 0');
  }
}

export function checkProduct(product: Product): void {
  const field = `product[${product.id}]`;
  checkFinite(`${field}.declaredQty`, product.declaredQty);
  checkFinite(`${field}.declaredPerDays`, product.declaredPerDays);
  checkFinite(`${field}.shelfLifeDays`, product.shelfLifeDays);
  checkFinite(`${field}.catalogRateQty`, product.catalogRateQty);
  checkFinite(`${field}.catalogLifetimeDays`, product.catalogLifetimeDays);
  checkQuantity(`${field}.safetyStock`, product.safetyStock);
  if (product.archivedAt !== null) checkDateTime(`${field}.archivedAt`, product.archivedAt);
}

/** Événements valides ; tous du produit `productId` s'il est donné. */
export function checkEvents(events: readonly StockEvent[], productId?: string): void {
  for (const event of events) {
    const field = `event[${event.id}]`;
    if (productId !== undefined && event.productId !== productId) {
      throw new InvalidInputError(`${field}.productId`, event.productId, `doit être ${productId}`);
    }
    checkDateTime(`${field}.occurredAt`, event.occurredAt);
    if (event.deletedAt !== null) checkDateTime(`${field}.deletedAt`, event.deletedAt);
    if (event.quantity !== null) checkQuantity(`${field}.quantity`, event.quantity);
    else if (event.type === 'purchased' || event.type === 'counted') {
      throw new InvalidInputError(`${field}.quantity`, null, `est obligatoire pour ${event.type}`);
    }
  }
}

export function checkHousehold(household: Household): void {
  if (!Number.isInteger(household.size) || household.size < 1) {
    throw new InvalidInputError('household.size', household.size, 'doit être un entier ≥ 1');
  }
  const period = household.periodDays;
  if (period !== null && (!Number.isInteger(period) || period < 1 || period > 31)) {
    throw new InvalidInputError('household.periodDays', period, 'doit être un entier de 1 à 31');
  }
}

export function checkRate(rate: Rate): void {
  checkQuantity('rate.perDay', rate.perDay);
}

export function checkListLines(lines: readonly ListLine[]): void {
  for (const line of lines) {
    const field = `listLine[${line.id}]`;
    checkQuantity(`${field}.quantity`, line.quantity);
    checkDateTime(`${field}.createdAt`, line.createdAt);
    if (line.checkedAt !== null) checkDateTime(`${field}.checkedAt`, line.checkedAt);
    if (line.deletedAt !== null) checkDateTime(`${field}.deletedAt`, line.deletedAt);
    if (line.postponedAt !== null) checkDateTime(`${field}.postponedAt`, line.postponedAt);
    else if (line.decision === 'postponed') {
      throw new InvalidInputError(`${field}.postponedAt`, null, 'est obligatoire pour postponed');
    }
  }
}

export function checkRecipe(recipe: Recipe, servings: number): void {
  const field = `recipe[${recipe.id}]`;
  checkPositive(`${field}.servings`, recipe.servings);
  checkPositive(`${field}.requestedServings`, servings);
  for (const ingredient of recipe.ingredients) {
    checkQuantity(`${field}.ingredient[${ingredient.productId}].quantity`, ingredient.quantity);
  }
}

export function checkPeriod(periodDays: number): void {
  if (!Number.isInteger(periodDays) || periodDays < 1) {
    throw new InvalidInputError('periodDays', periodDays, 'doit être un entier ≥ 1');
  }
}
