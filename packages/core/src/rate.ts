import { dayNumber, dayOf } from './date';
import { checkProduct, checkPurchases } from './guard';
import { median } from './median';
import type { LocalDate, Product, Purchase, RateSource } from './model';
import { sortPurchases, type SortedPurchases } from './purchases';

const MIN_PURCHASES = 3;
const MIN_INTERVALS = 2;
const MEDIAN_WINDOW = 5;
const LOWER_BOUND = 0.5;
const UPPER_BOUND = 2;

export interface Rate {
  /** Unités consommées par jour ; 0 sans rythme. */
  perDay: number;
  source: RateSource;
  /** Intervalles entrés dans la médiane, pour un rythme appris. */
  intervalCount: number;
}

/** Intervalle de consommation observé entre un achat et l'achat suivant. */
export interface Interval {
  purchasedOn: LocalDate;
  quantity: number;
  days: number;
  perDay: number;
}

const NO_RATE: Rate = { perDay: 0, source: 'none', intervalCount: 0 };

/** Rythme retenu : déclaré, sinon appris, sinon catalogue (specs techniques 4.3). */
export function resolveRate(product: Product, purchases: readonly Purchase[]): Rate {
  checkProduct(product);
  checkPurchases(purchases, product.id);
  return rateOf(product, sortPurchases(purchases));
}

export function rateOf(product: Product, purchases: SortedPurchases): Rate {
  const declared = ratio(product.declaredQty, product.declaredPerDays);
  if (declared !== null) return { perDay: declared, source: 'declared', intervalCount: 0 };

  const catalog = ratio(product.catalogQty, product.catalogPerDays);
  const learned = learnedRate(purchases, catalog);
  if (learned !== null) return learned;
  if (catalog !== null) return { perDay: catalog, source: 'catalog', intervalCount: 0 };
  return NO_RATE;
}

/**
 * Intervalles entre achats éligibles consécutifs (hors recette, RG-4), deux achats du même
 * jour comptant pour un seul ; le dernier achat n'en a pas.
 */
export function observedIntervals(purchases: readonly Purchase[]): Interval[] {
  checkPurchases(purchases);
  return intervalsOf(purchaseDays(sortPurchases(purchases)));
}

function intervalsOf(purchases: readonly PurchaseDay[]): Interval[] {
  return purchases.slice(0, -1).map((purchase, k) => {
    const days = dayNumber((purchases[k + 1] as PurchaseDay).day) - dayNumber(purchase.day);
    return {
      purchasedOn: purchase.day,
      quantity: purchase.quantity,
      days,
      perDay: purchase.quantity / days,
    };
  });
}

/**
 * `qty` unités par `perDays` jours. Une valeur nulle ou négative vaut absence : au catalogue,
 * elle annulerait la borne du rythme appris.
 */
function ratio(qty: number | null, perDays: number | null): number | null {
  if (qty === null || perDays === null || qty <= 0 || perDays <= 0) return null;
  return qty / perDays;
}

/** Médiane des cinq derniers taux, bornée par le catalogue sous cinq intervalles. */
function learnedRate(purchases: SortedPurchases, catalog: number | null): Rate | null {
  const days = purchaseDays(purchases);
  if (days.length < MIN_PURCHASES) return null;
  const intervals = intervalsOf(days).slice(-MEDIAN_WINDOW);
  if (intervals.length < MIN_INTERVALS) return null;

  let perDay = median(intervals.map((interval) => interval.perDay));
  if (intervals.length < MEDIAN_WINDOW && catalog !== null) {
    perDay = Math.min(Math.max(perDay, LOWER_BOUND * catalog), UPPER_BOUND * catalog);
  }
  return { perDay, source: 'learned', intervalCount: intervals.length };
}

interface PurchaseDay {
  day: LocalDate;
  quantity: number;
}

function purchaseDays(purchases: SortedPurchases): PurchaseDay[] {
  const days: PurchaseDay[] = [];
  for (const purchase of purchases) {
    if (purchase.fromRecipe) continue;
    const day = dayOf(purchase.occurredAt);
    const last = days.at(-1);
    if (last?.day === day) last.quantity += purchase.quantity;
    else days.push({ day, quantity: purchase.quantity });
  }
  return days;
}
