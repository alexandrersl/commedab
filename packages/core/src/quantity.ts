import type { UnitKind } from './model';

/** Tolérance des comparaisons : les quantités sont des fractions décimales (RG-1). */
export const EPSILON = 1e-9;

/** Pas d'arrondi des quantités suggérées (RG-2) : pièce, 100 g, 0,5 L. */
const STEP: Record<UnitKind, number> = { piece: 1, weight: 0.1, volume: 0.5 };

export function unitStep(unitKind: UnitKind): number {
  return STEP[unitKind];
}

export function roundUpToStep(quantity: number, unitKind: UnitKind): number {
  const step = STEP[unitKind];
  const rounded = Math.ceil(quantity / step - EPSILON) * step;
  return Math.round(rounded * 1000) / 1000;
}
