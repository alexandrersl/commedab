import { checkDateTime, checkListLines, checkProduct, checkPurchases } from './guard';
import type { ListLine, LocalDateTime, Product, Purchase } from './model';
import { sortPurchases } from './purchases';
import { rateOf, type Rate } from './rate';
import { stockOf, type StockEstimate } from './stock';

/** État d'un produit, affiché par les écrans (fiche, onglet Produits, justification EF-2.5). */
export interface ProductState extends StockEstimate {
  productId: string;
  rate: Rate;
}

/** `purchases` et `lines` : achats et lignes de la liste du produit, toutes dates confondues. */
export function productState(
  product: Product,
  purchases: readonly Purchase[],
  lines: readonly ListLine[],
  now: LocalDateTime,
): ProductState {
  checkProduct(product);
  checkPurchases(purchases, product.id);
  checkListLines(lines, product.id);
  checkDateTime('now', now);
  const sorted = sortPurchases(purchases);
  const rate = rateOf(product, sorted);
  return { productId: product.id, rate, ...stockOf(sorted, lines, rate, now) };
}
