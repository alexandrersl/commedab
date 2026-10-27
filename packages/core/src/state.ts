import { liveEvents } from './events';
import { checkDateTime, checkEvents, checkHousehold, checkProduct } from './guard';
import type { Household, LocalDateTime, Product, StockEvent } from './model';
import { rateOf, type Rate } from './rate';
import { stockOf, type StockEstimate } from './stock';

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
  checkProduct(product);
  checkEvents(events, product.id);
  checkHousehold(household);
  checkDateTime('now', now);
  const live = liveEvents(events);
  const rate = rateOf(product, live, household);
  return { productId: product.id, rate, ...stockOf(product, live, rate, now) };
}
