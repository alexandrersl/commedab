import { addDays, daysBetween, withinCalendar } from './date';
import { anchorValue, isAnchor, lastIndex, liveEvents } from './events';
import { EPSILON } from './quantity';
import type { Rate } from './rate';
import type { LocalDate, LocalDateTime, Product, StockEvent } from './model';

export interface StockEstimate {
  stock: number;
  anchorAt: LocalDateTime | null;
  /** Premier jour où le stock estimé est nul ; null sans rythme ou au-delà de l'an 9999. */
  depletionDate: LocalDate | null;
  /** Dernière réserve entamée ou produit fini, sans achat depuis (EF-3.2). */
  toRebuy: boolean;
  lastPurchaseAt: LocalDateTime | null;
  lastPurchaseQuantity: number | null;
}

/**
 * Stock reconstruit depuis le dernier ancrage (specs techniques 4.4) :
 * `max(0, A + Σ achats après l'ancre − r × jours(ancre → t))`. Sans ancrage, l'ancre est le
 * premier achat, de valeur 0, et cet achat entre dans la somme.
 */
export function estimateStock(
  product: Product,
  events: readonly StockEvent[],
  rate: Rate,
  now: LocalDateTime,
): StockEstimate {
  const live = liveEvents(events);
  const lastPurchase = live[lastIndex(live, (event) => event.type === 'purchased')];
  const lastPurchaseAt = lastPurchase?.occurredAt ?? null;
  const lastPurchaseQuantity = lastPurchase?.quantity ?? null;

  const anchorIndex = lastIndex(live, isAnchor);
  const anchor = live[anchorIndex];
  const firstPurchaseIndex = live.findIndex((event) => event.type === 'purchased');
  const start = anchor ?? live[firstPurchaseIndex];
  if (start === undefined) {
    return {
      stock: 0,
      anchorAt: null,
      depletionDate: null,
      toRebuy: false,
      lastPurchaseAt,
      lastPurchaseQuantity,
    };
  }

  const purchasesFrom = anchor !== undefined ? anchorIndex + 1 : firstPurchaseIndex;
  const purchases = live.slice(purchasesFrom).filter((event) => event.type === 'purchased');
  const purchased = purchases.reduce((sum, event) => sum + (event.quantity ?? 0), 0);
  const total = (anchor !== undefined ? anchorValue(anchor) : 0) + purchased;
  const elapsed = Math.max(0, daysBetween(start.occurredAt, now));
  const depletionDays = Math.max(0, Math.ceil(total / rate.perDay - EPSILON));

  return {
    stock: Math.max(0, total - rate.perDay * elapsed),
    anchorAt: start.occurredAt,
    depletionDate:
      rate.perDay > 0 && withinCalendar(start.occurredAt, depletionDays)
        ? addDays(start.occurredAt, depletionDays)
        : null,
    toRebuy:
      product.family !== 'occasional' &&
      anchor !== undefined &&
      (anchor.type === 'opened_last' || anchor.type === 'finished') &&
      purchases.length === 0,
    lastPurchaseAt,
    lastPurchaseQuantity,
  };
}
