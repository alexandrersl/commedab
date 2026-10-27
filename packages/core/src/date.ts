import type { LocalDate, LocalDateTime } from './model';

const DAY_MS = 86_400_000;
const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

/** Numéro du jour civil, sans fuseau : seule la partie date compte (specs techniques 4.1). */
export function dayNumber(at: LocalDate | LocalDateTime): number {
  const match = DATE_PREFIX.exec(at);
  if (match === null) throw new Error(`Date locale invalide : ${at}`);
  const [, year, month, day] = match;
  const date = new Date(0);
  // Date.UTC lirait les années 0 à 99 comme 1900 à 1999.
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  return date.getTime() / DAY_MS;
}

const FIRST_DAY = dayNumber('0000-01-01');
const LAST_DAY = dayNumber('9999-12-31');

export function daysBetween(
  from: LocalDate | LocalDateTime,
  to: LocalDate | LocalDateTime,
): number {
  return dayNumber(to) - dayNumber(from);
}

/** Vrai si `at + days` reste dans les années 0000 à 9999, seules écrites `AAAA-MM-JJ`. */
export function withinCalendar(at: LocalDate | LocalDateTime, days: number): boolean {
  const target = dayNumber(at) + days;
  return Number.isInteger(target) && target >= FIRST_DAY && target <= LAST_DAY;
}

export function addDays(at: LocalDate | LocalDateTime, days: number): LocalDate {
  if (!withinCalendar(at, days)) throw new RangeError(`Hors calendrier : ${at} + ${days} jours`);
  return new Date((dayNumber(at) + days) * DAY_MS).toISOString().slice(0, 10);
}

/** `at + hours`, sur l'heure locale : un changement d'heure n'est pas vu (4.9). */
export function addHours(at: LocalDateTime, hours: number): LocalDateTime {
  const [hour, minute, second] = at.slice(11).split(':').map(Number);
  const time = ((hour ?? 0) + hours) * 3_600_000 + (minute ?? 0) * 60_000 + (second ?? 0) * 1000;
  return new Date(dayNumber(at) * DAY_MS + time).toISOString().slice(0, 19);
}

export function dayOf(at: LocalDateTime): LocalDate {
  return addDays(at, 0);
}
