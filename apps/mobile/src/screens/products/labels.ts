import type { CategoryRecord, ProductRecord } from '@commedab/data';
import { count, format, unitWithContents } from '../../copy/words';

/** Nom du rayon du produit ; « À classer » sans rayon (EF-1.2). */
export function categoryName(
  product: Pick<ProductRecord, 'categoryId'>,
  categoryById: ReadonlyMap<string, CategoryRecord>,
): string {
  return product.categoryId === null
    ? 'À classer'
    : (categoryById.get(product.categoryId)?.name ?? 'À classer');
}

/** Méta de la fiche : « Crémerie · bouteille de 1 L ». */
export function productMeta(
  product: ProductRecord,
  categoryById: ReadonlyMap<string, CategoryRecord>,
): string {
  return `${categoryName(product, categoryById)} · ${unitWithContents(product)}`;
}

/** Quantité d'un achat de l'historique : « 1 pack · 6 bouteilles », « 2 bouteilles ». */
export function purchaseLabel(product: ProductRecord, units: number): string {
  const packs = units / product.packSize;
  if (product.packSize > 1 && Number.isInteger(packs)) {
    return `${format(packs)} pack${packs >= 2 ? 's' : ''} · ${count(units, product.unitLabel)}`;
  }
  return count(units, product.unitLabel);
}
