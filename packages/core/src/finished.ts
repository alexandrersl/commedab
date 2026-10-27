import { addDays, dayOf, daysBetween } from './date';
import { anchorValue, isAnchor, lastIndex, liveEvents } from './events';
import type { LocalDate, LocalDateTime, StockEvent } from './model';
import type { Rate } from './rate';

export type FinishedAt =
  | { at: LocalDateTime; advanced: false }
  | { at: LocalDateTime; advanced: true; beforePurchaseOn: LocalDate };

/**
 * Date à enregistrer pour un « fini » signalé à `reportedAt` (specs techniques 4.4, RG-5).
 * Si le dernier achat date de moins de `L / 2` jours (`L = 1 / r`) et qu'il restait du stock
 * avant lui, le « fini » désigne l'ancienne unité : il est daté de la veille de cet achat.
 */
export function resolveFinishedAt(
  events: readonly StockEvent[],
  rate: Rate,
  reportedAt: LocalDateTime,
): FinishedAt {
  const asReported: FinishedAt = { at: reportedAt, advanced: false };
  if (rate.perDay <= 0) return asReported;

  const live = liveEvents(events).filter((event) => event.occurredAt <= reportedAt);
  const purchaseIndex = lastIndex(live, (event) => event.type === 'purchased');
  const purchase = live[purchaseIndex];
  if (purchase === undefined) return asReported;

  const lifetime = 1 / rate.perDay;
  if (daysBetween(purchase.occurredAt, reportedAt) >= lifetime / 2) return asReported;

  const before = live.slice(0, purchaseIndex);
  const anchorIndex = lastIndex(before, isAnchor);
  const anchor = before[anchorIndex];
  const olderStock =
    (anchor !== undefined && anchorValue(anchor) > 0) ||
    before.slice(anchorIndex + 1).some((event) => event.type === 'purchased');
  if (!olderStock) return asReported;

  return {
    at: `${addDays(purchase.occurredAt, -1)}T23:59:59`,
    advanced: true,
    beforePurchaseOn: dayOf(purchase.occurredAt),
  };
}
