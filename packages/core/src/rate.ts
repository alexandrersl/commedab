import { dayNumber, dayOf } from './date';
import { InvalidInputError } from './errors';
import { checkPositive, checkProduct, checkPurchases } from './guard';
import { median } from './median';
import type { LocalDate, Product, Purchase, RateSource } from './model';
import { sortPurchases, type SortedPurchases } from './purchases';
import { EPSILON } from './quantity';

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

export type RatePeriod = 'day' | 'week' | 'month';

/** Durée des périodes de saisie du rythme, de la plus courte à la plus longue (4.3). */
export const PERIOD_DAYS: Readonly<Record<RatePeriod, number>> = { day: 1, week: 7, month: 30 };
const PERIODS: readonly RatePeriod[] = ['day', 'week', 'month'];

/** Rythme tel que la fiche produit le montre et le fait saisir : `quantity` unités par `period`. */
export interface PerPeriod {
  quantity: number;
  period: RatePeriod;
}

/** Rythme saisi, en jours par unité, seule forme enregistrée : 5 par semaine → 1,4 (4.3). */
export function toDaysPerUnit({ quantity, period }: PerPeriod): number {
  checkPositive('quantity', quantity);
  if (!PERIODS.includes(period)) {
    throw new InvalidInputError('period', period, `doit être ${PERIODS.join(', ')}`);
  }
  return PERIOD_DAYS[period] / quantity;
}

/**
 * Rythme de `perDay` unités par jour dans la période où son arrondi à l'entier s'écarte le moins
 * de la valeur exacte ; à égalité, la plus courte. Un rythme qui n'atteint une unité arrondie dans
 * aucune période s'affiche « 1 / mois », le plus lent que la feuille permette de saisir (4.3).
 */
export function toPerPeriod(perDay: number): PerPeriod {
  checkPositive('perDay', perDay);
  let best: { per: PerPeriod; error: number } | null = null;
  for (const period of PERIODS) {
    const exact = perDay * PERIOD_DAYS[period];
    const quantity = Math.round(exact);
    if (quantity < 1) continue;
    const error = Math.abs(quantity - exact) / exact;
    if (best === null || error < best.error - EPSILON) best = { per: { quantity, period }, error };
  }
  return best?.per ?? { quantity: 1, period: 'month' };
}

/** Rythme retenu : déclaré, sinon appris, sinon catalogue (specs techniques 4.3). */
export function resolveRate(product: Product, purchases: readonly Purchase[]): Rate {
  checkProduct(product);
  checkPurchases(purchases, product.id);
  return rateOf(product, sortPurchases(purchases));
}

export function rateOf(product: Product, purchases: SortedPurchases): Rate {
  const declared = ratio(1, product.declaredDaysPerUnit);
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
