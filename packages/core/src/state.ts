import type { Household, LocalDateTime, Product, StockEvent } from './model';
import { resolveRate, type Rate } from './rate';
import { estimateStock, type StockEstimate } from './stock';

/** État d'un produit, affiché par les écrans (fiche, accueil, justification EF-4.8). */
export interface ProductState extends StockEstimate {
  productId: string;
  rate: Rate;
}

export function productState(
  product: Product,
  events: readonly StockEvent[],
  household: Household,
  now: LocalDateTime,
): ProductState {
  const rate = resolveRate(product, events, household);
  return { productId: product.id, rate, ...estimateStock(product, events, rate, now) };
}
