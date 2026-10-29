import type { LocalDateTime } from '@commedab/core';

// La base garde des instants UTC (specs techniques 3.2) ; `core` lit des dates locales sans
// fuseau (4.1). La conversion se fait ici, dans le fuseau de l'appareil.

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Instant tel que la base le stocke. */
export function stored(at: Date): string {
  return at.toISOString();
}

/** Date locale de l'appareil, au format de `core`. */
export function local(at: Date): LocalDateTime {
  return (
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` +
    `T${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`
  );
}

/**
 * Instant lu en base : écrit par l'appareil (`2026-10-29T14:00:00.000Z`) ou par la synchro
 * (`2026-10-29 14:00:00Z`), que Safari ne lit pas sans le `T`.
 */
export function parseStored(value: string): Date {
  const at = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(at.getTime())) throw new Error(`Date illisible en base : ${value}`);
  return at;
}

export function localOfStored(value: string): LocalDateTime;
export function localOfStored(value: string | null): LocalDateTime | null;
export function localOfStored(value: string | null): LocalDateTime | null {
  return value === null ? null : local(parseStored(value));
}
