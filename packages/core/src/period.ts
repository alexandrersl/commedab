import { dayNumber } from './date';
import { checkDateTime, checkHousehold } from './guard';
import { median } from './median';
import type { Household } from './model';
import type { ShoppingSession } from './session';

export const DEFAULT_PERIOD_DAYS = 7;
const MIN_SHOPPING_DAYS = 3;
const MEDIAN_WINDOW = 5;
const MIN_PERIOD_DAYS = 2;
const MAX_PERIOD_DAYS = 31;

export interface Period {
  days: number;
  source: 'declared' | 'learned' | 'default';
  /** Intervalles entre jours de courses entrés dans la médiane, pour une période apprise. */
  intervalCount: number;
}

/**
 * Période de la liste (specs techniques 4.9) : fixée par l'utilisateur, sinon médiane des
 * cinq derniers intervalles entre jours de courses, sinon 7 jours. Deux sessions du même jour
 * comptent pour un seul jour de courses.
 */
export function resolvePeriod(household: Household, sessions: readonly ShoppingSession[]): Period {
  checkHousehold(household);
  sessions.forEach((session, i) => checkDateTime(`sessions[${i}].startedAt`, session.startedAt));
  if (household.periodDays !== null) {
    return { days: household.periodDays, source: 'declared', intervalCount: 0 };
  }

  const days = [...new Set(sessions.map((session) => dayNumber(session.startedAt)))].sort(
    (a, b) => a - b,
  );
  if (days.length < MIN_SHOPPING_DAYS) {
    return { days: DEFAULT_PERIOD_DAYS, source: 'default', intervalCount: 0 };
  }
  const intervals = days
    .slice(1)
    .map((day, i) => day - (days[i] as number))
    .slice(-MEDIAN_WINDOW);
  const learned = Math.round(median(intervals));
  return {
    days: Math.min(Math.max(learned, MIN_PERIOD_DAYS), MAX_PERIOD_DAYS),
    source: 'learned',
    intervalCount: intervals.length,
  };
}
