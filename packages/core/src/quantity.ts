import { checkProduct, checkQuantity } from './guard';
import type { Product } from './model';

/** Tolérance des comparaisons : les quantités sont des fractions décimales (RG-1). */
export const EPSILON = 1e-9;

/** Packs entiers couvrant `units` unités, arrondis au pack supérieur (RG-2). */
export function packsFor(units: number, packSize: number): number {
  return Math.max(0, Math.ceil(units / packSize - EPSILON));
}

/** Quantité de l'achat créé en cochant une ligne de `packs` packs (5.3 FS). */
export function packUnits(product: Product, packs: number): number {
  checkProduct(product);
  checkQuantity('packs', packs);
  return Math.round(packs * product.packSize * 1000) / 1000;
}
