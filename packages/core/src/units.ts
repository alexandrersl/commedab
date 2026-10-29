import type { Product } from './model';
import { normalizeName as normalize } from './normalize';

type Dimension = 'mass' | 'volume';

/** Unités de mesure reconnues, ramenées au gramme ou au millilitre. */
const MEASURES: Readonly<Record<string, { dimension: Dimension; factor: number }>> = {
  g: { dimension: 'mass', factor: 1 },
  kg: { dimension: 'mass', factor: 1000 },
  ml: { dimension: 'volume', factor: 1 },
  cl: { dimension: 'volume', factor: 10 },
  l: { dimension: 'volume', factor: 1000 },
};

/** Unité de masse ou de volume reconnue par les conversions. */
export function isMeasure(unit: string): boolean {
  return MEASURES[normalize(unit)] !== undefined;
}

/** Mesure d'une unité du produit : sa contenance, ou son unité quand c'est une masse ou un volume. */
function measureOf(product: Product): { dimension: Dimension; amount: number } | null {
  const { contentsQty, contentsUnit } = product;
  const contents = contentsUnit === null ? undefined : MEASURES[normalize(contentsUnit)];
  if (contents !== undefined && contentsQty !== null && contentsQty > 0) {
    return { dimension: contents.dimension, amount: contentsQty * contents.factor };
  }
  const own = MEASURES[normalize(product.unitLabel)];
  return own === undefined ? null : { dimension: own.dimension, amount: own.factor };
}

/**
 * `quantity` exprimé en `unit` (nul : unité du produit), en unités du produit (specs
 * techniques 4.6) ; null si aucune conversion n'est possible.
 */
export function toProductUnits(
  quantity: number,
  unit: string | null,
  product: Product,
): number | null {
  if (unit === null || normalize(unit) === normalize(product.unitLabel)) return quantity;
  const from = MEASURES[normalize(unit)];
  const measure = measureOf(product);
  if (from === undefined || measure === null || from.dimension !== measure.dimension) return null;
  return (quantity * from.factor) / measure.amount;
}
