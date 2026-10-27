// @commedab/core — moteur d'estimation, modèle, catalogue, recherche.
// TypeScript pur, aucune dépendance. Toute fonction reçoit la date courante en paramètre.
// Voir docs/specs-techniques.md, sections 3, 4 et 7.

export * from './model';
export { addDays, dayOf, daysBetween } from './date';
export { roundUpToStep } from './quantity';
export { observedIntervals, resolveRate, type Interval, type Rate } from './rate';
export { estimateStock, type StockEstimate } from './stock';
export { resolveFinishedAt, type FinishedAt } from './finished';
export { productState, type ProductState } from './state';
export { suggestForPeriod, type Justification, type Suggestion } from './suggest';
export { applyRecipes, type RecipeLine } from './recipes';
