import { dayNumber, dayOf } from './date';
import { liveEvents } from './events';
import type { Household, LocalDate, LocalDateTime, Product, RateSource, StockEvent } from './model';

const MIN_PURCHASES = 3;
const MIN_INTERVALS = 2;
const MEDIAN_WINDOW = 5;
const LOWER_BOUND = 0.5;
const UPPER_BOUND = 2;

export interface Rate {
  /** Unités d'achat consommées par jour ; 0 sans rythme. */
  perDay: number;
  source: RateSource;
  /** Intervalles entrés dans la médiane, pour un rythme appris. */
  intervalCount: number;
}

/** Intervalle de consommation observé entre un achat et l'achat ou le « fini » suivant. */
export interface Interval {
  purchasedOn: LocalDate;
  quantity: number;
  days: number;
  perDay: number;
}

const NO_RATE: Rate = { perDay: 0, source: 'none', intervalCount: 0 };

/** Rythme retenu : déclaré, sinon appris, sinon catalogue (specs techniques 4.3). */
export function resolveRate(
  product: Product,
  events: readonly StockEvent[],
  household: Household,
): Rate {
  if (product.family === 'occasional') return NO_RATE;

  const declared = declaredRate(product);
  if (declared !== null) return { perDay: declared, source: 'declared', intervalCount: 0 };

  const catalog = catalogRate(product, household);
  const learned = learnedRate(events, catalog);
  if (learned !== null) return learned;
  if (catalog !== null) return { perDay: catalog, source: 'catalog', intervalCount: 0 };
  return NO_RATE;
}

/**
 * Intervalles des achats éligibles (hors recette, RG-4), deux achats du même jour comptant
 * pour un seul. Un intervalle se clôt au premier des deux : achat suivant ou « fini »
 * postérieur ; le dernier achat n'en a un que si un « fini » le suit.
 */
export function observedIntervals(events: readonly StockEvent[]): Interval[] {
  const live = liveEvents(events);
  const purchases = purchaseDays(live);
  const finished = live.filter((event) => event.type === 'finished');
  const intervals: Interval[] = [];

  purchases.forEach((purchase, k) => {
    const ends: number[] = [];
    const next = purchases[k + 1];
    if (next !== undefined) ends.push(dayNumber(next.day));
    const end = finished.find((event) => event.occurredAt > purchase.lastAt);
    if (end !== undefined) ends.push(dayNumber(end.occurredAt));
    if (ends.length === 0) return;

    const days = Math.min(...ends) - dayNumber(purchase.day);
    if (days < 1) return;
    intervals.push({
      purchasedOn: purchase.day,
      quantity: purchase.quantity,
      days,
      perDay: purchase.quantity / days,
    });
  });
  return intervals;
}

function declaredRate(product: Product): number | null {
  const { declaredQty, declaredPerDays } = product;
  if (declaredQty === null || declaredPerDays === null || declaredPerDays <= 0) return null;
  return declaredQty / declaredPerDays;
}

/** Valeurs copiées du catalogue à la création, ajustées à la taille actuelle du foyer. */
function catalogRate(product: Product, household: Household): number | null {
  if (product.catalogRateQty !== null) {
    return product.catalogScaling === 'per_household'
      ? product.catalogRateQty
      : product.catalogRateQty * household.size;
  }
  if (product.catalogLifetimeDays !== null && product.catalogLifetimeDays > 0) {
    return 1 / product.catalogLifetimeDays;
  }
  return null;
}

/** Médiane des cinq derniers taux, bornée par la référence sous cinq intervalles. */
function learnedRate(events: readonly StockEvent[], reference: number | null): Rate | null {
  if (purchaseDays(liveEvents(events)).length < MIN_PURCHASES) return null;
  const intervals = observedIntervals(events).slice(-MEDIAN_WINDOW);
  if (intervals.length < MIN_INTERVALS) return null;

  let perDay = median(intervals.map((interval) => interval.perDay));
  if (intervals.length < MEDIAN_WINDOW && reference !== null) {
    perDay = Math.min(Math.max(perDay, LOWER_BOUND * reference), UPPER_BOUND * reference);
  }
  return { perDay, source: 'learned', intervalCount: intervals.length };
}

function purchaseDays(
  live: readonly StockEvent[],
): { day: LocalDate; quantity: number; lastAt: LocalDateTime }[] {
  const days: { day: LocalDate; quantity: number; lastAt: LocalDateTime }[] = [];
  for (const event of live) {
    if (event.type !== 'purchased' || event.fromRecipe) continue;
    const day = dayOf(event.occurredAt);
    const last = days.at(-1);
    if (last?.day === day) {
      last.quantity += event.quantity ?? 0;
      last.lastAt = event.occurredAt;
    } else {
      days.push({ day, quantity: event.quantity ?? 0, lastAt: event.occurredAt });
    }
  }
  return days;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}
