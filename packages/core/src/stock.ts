import { addDays, daysBetween, withinCalendar } from './date';
import { checkDateTime, checkListLines, checkProduct, checkPurchases, checkRate } from './guard';
import type { ListLine, LocalDate, LocalDateTime, Product, Purchase } from './model';
import { sortPurchases, type SortedPurchases } from './purchases';
import { EPSILON } from './quantity';
import type { Rate } from './rate';

export interface StockEstimate {
  stock: number;
  anchorAt: LocalDateTime | null;
  /** Premier jour où le stock estimé est nul ; null sans rythme ou au-delà de l'an 9999. */
  depletionDate: LocalDate | null;
  lastPurchaseAt: LocalDateTime | null;
}

/**
 * Stock reconstruit depuis l'ancre (specs techniques 4.4) :
 * `max(0, Σ achats datés de l'ancre ou après − r × jours(ancre → t))`. L'ancre est le dernier
 * ajout manuel du produit à la liste, non retiré, de valeur 0 ; sans lui, le premier achat.
 */
export function estimateStock(
  product: Product,
  purchases: readonly Purchase[],
  lines: readonly ListLine[],
  rate: Rate,
  now: LocalDateTime,
): StockEstimate {
  checkProduct(product);
  checkPurchases(purchases, product.id);
  checkListLines(lines, product.id);
  checkRate(rate);
  checkDateTime('now', now);
  return stockOf(sortPurchases(purchases), lines, rate, now);
}

export function stockOf(
  purchases: SortedPurchases,
  lines: readonly ListLine[],
  rate: Rate,
  now: LocalDateTime,
): StockEstimate {
  const lastPurchaseAt = purchases.at(-1)?.occurredAt ?? null;
  const anchorAt = manualAnchor(lines) ?? purchases[0]?.occurredAt;
  if (anchorAt === undefined) {
    return { stock: 0, anchorAt: null, depletionDate: null, lastPurchaseAt };
  }

  const total = purchases
    .filter((purchase) => purchase.occurredAt >= anchorAt)
    .reduce((sum, purchase) => sum + purchase.quantity, 0);
  const elapsed = Math.max(0, daysBetween(anchorAt, now));
  const depletionDays = Math.max(0, Math.ceil(total / rate.perDay - EPSILON));

  return {
    stock: Math.max(0, total - rate.perDay * elapsed),
    anchorAt,
    depletionDate:
      rate.perDay > 0 && withinCalendar(anchorAt, depletionDays)
        ? addDays(anchorAt, depletionDays)
        : null,
    lastPurchaseAt,
  };
}

/** Date du dernier ajout manuel non retiré : l'utilisateur a signalé qu'il en manque (EF-2.10). */
function manualAnchor(lines: readonly ListLine[]): LocalDateTime | undefined {
  let anchor: LocalDateTime | undefined;
  for (const line of lines) {
    if (line.origin !== 'manual' || line.deletedAt !== null) continue;
    if (anchor === undefined || line.createdAt > anchor) anchor = line.createdAt;
  }
  return anchor;
}
