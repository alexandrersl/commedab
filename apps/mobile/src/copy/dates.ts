import { daysBetween, type LocalDate, type LocalDateTime } from '@commedab/core';

// Le temps en langage parlé (design-system.md, Voix) : « mardi », « avant-hier », « il y a
// 3 semaines ». Une date numérique n'apparaît que dans l'historique.

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

function dateOf(day: LocalDate | LocalDateTime): Date {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

/** Jour à venir : « aujourd'hui », « demain », « mardi » dans la semaine, « le 12 nov. » ensuite. */
export function until(day: LocalDate, now: LocalDateTime): string {
  const days = daysBetween(now, day);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'demain';
  const date = dateOf(day);
  if (days < 7) return WEEKDAYS[date.getDay()] ?? '';
  return `le ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** Jour passé : « aujourd'hui », « hier », « avant-hier », « il y a 5 jours », « il y a 3 semaines ». */
export function since(at: LocalDate | LocalDateTime, now: LocalDateTime): string {
  const days = daysBetween(at, now);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days === 2) return 'avant-hier';
  if (days < 14) return `il y a ${days} jours`;
  if (days < 60) return `il y a ${Math.round(days / 7)} semaines`;
  if (days < 365) return `il y a ${Math.round(days / 30)} mois`;
  const years = Math.round(days / 365);
  return `il y a ${years} an${years > 1 ? 's' : ''}`;
}

/** Durée sans « il y a » : « 3 semaines », pour « le dernier pack date de 3 semaines ». */
export function age(at: LocalDate | LocalDateTime, now: LocalDateTime): string {
  return since(at, now).replace(/^il y a /, '');
}

/** Date de l'historique : « Sam. 25 oct. ». */
export function historyDate(at: LocalDateTime): string {
  const date = dateOf(at);
  const weekday = WEEKDAYS[date.getDay()] ?? '';
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1, 3)}. ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function daysSince(at: LocalDate | LocalDateTime, now: LocalDateTime): number {
  return daysBetween(at, now);
}
