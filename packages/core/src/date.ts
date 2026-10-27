import type { LocalDate, LocalDateTime } from './model';

const DAY_MS = 86_400_000;
const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/** Numéro du jour civil, sans fuseau : seule la partie date compte (specs techniques 4.1). */
export function dayNumber(at: LocalDate | LocalDateTime): number {
  const match = DATE_PREFIX.exec(at);
  if (match === null) throw new Error(`Date locale invalide : ${at}`);
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / DAY_MS;
}

export function daysBetween(
  from: LocalDate | LocalDateTime,
  to: LocalDate | LocalDateTime,
): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(at: LocalDate | LocalDateTime, days: number): LocalDate {
  return new Date((dayNumber(at) + days) * DAY_MS).toISOString().slice(0, 10);
}

export function dayOf(at: LocalDateTime): LocalDate {
  return addDays(at, 0);
}
