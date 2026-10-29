// @commedab/core — moteur d'estimation, modèle, catalogue, recherche.
// TypeScript pur, aucune dépendance. Toute fonction reçoit la date courante en paramètre.
// Voir docs/specs-techniques.md, sections 3, 4 et 7.

export * from './model';
export { InvalidInputError } from './errors';
export { addDays, addHours, dayOf, daysBetween } from './date';
export { packsFor, packUnits } from './quantity';
export { observedIntervals, resolveRate, type Interval, type Rate } from './rate';
export { estimateStock, type StockEstimate } from './stock';
export { productState, type ProductState } from './state';
export { suggestForPeriod, type Justification, type Suggestion } from './suggest';
export {
  applyRecipe,
  missingIngredients,
  type MissingIngredient,
  type RecipeLine,
} from './recipes';
export {
  listView,
  SESSION_GAP_HOURS,
  shoppingSessions,
  type LineState,
  type ListView,
  type RecipeBadge,
  type ShoppingSession,
} from './session';
export { DEFAULT_PERIOD_DAYS, resolvePeriod, type Period } from './period';
