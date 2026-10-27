import { addHours } from './date';
import { checkDateTime, checkListLines } from './guard';
import type { ListLine, LocalDateTime } from './model';

/** Deux coches espacées de moins de 3 h appartiennent à la même session (EF-4.11). */
export const SESSION_GAP_HOURS = 3;

export interface ShoppingSession {
  startedAt: LocalDateTime;
  /** Dernière coche. */
  endedAt: LocalDateTime;
  /** Fin de la session, 3 h après la dernière coche. */
  closesAt: LocalDateTime;
}

/** États d'une ligne (specs techniques 4.9). */
export type LineState = 'pending' | 'checked' | 'withdrawn' | 'past';

export interface ListView {
  sessions: ShoppingSession[];
  /** Dernière session, tant que sa fin n'est pas atteinte. */
  ongoing: ShoppingSession | null;
  lines: { line: ListLine; state: LineState }[];
}

/** Sessions de courses formées par les coches du foyer, de la plus ancienne à la plus récente. */
export function shoppingSessions(checks: readonly LocalDateTime[]): ShoppingSession[] {
  checks.forEach((at, i) => checkDateTime(`checks[${i}]`, at));
  const sessions: ShoppingSession[] = [];
  for (const at of [...checks].sort()) {
    const last = sessions.at(-1);
    if (last !== undefined && at < last.closesAt) {
      last.endedAt = at;
      last.closesAt = addHours(at, SESSION_GAP_HOURS);
    } else {
      sessions.push({ startedAt: at, endedAt: at, closesAt: addHours(at, SESSION_GAP_HOURS) });
    }
  }
  return sessions;
}

/**
 * Sessions et état de chaque ligne à la date `now`. Une ligne cochée quitte la liste à la fin
 * de sa session ; retirée ou refusée, elle compte jusqu'à la fin de la première session
 * terminée après son retrait ou son refus.
 */
export function listView(lines: readonly ListLine[], now: LocalDateTime): ListView {
  checkListLines(lines);
  checkDateTime('now', now);
  const sessions = shoppingSessions(
    lines.flatMap((line) =>
      line.deletedAt === null && line.checkedAt !== null ? [line.checkedAt] : [],
    ),
  );
  const last = sessions.at(-1);
  const ongoing = last !== undefined && now < last.closesAt ? last : null;
  const lastClose = (ongoing === null ? sessions : sessions.slice(0, -1)).at(-1)?.closesAt ?? null;
  const closedSince = (at: LocalDateTime) => lastClose !== null && lastClose > at;

  const stateOf = (line: ListLine): LineState => {
    if (line.deletedAt !== null) return closedSince(line.deletedAt) ? 'past' : 'withdrawn';
    if (line.checkedAt !== null) {
      return ongoing !== null && line.checkedAt >= ongoing.startedAt ? 'checked' : 'past';
    }
    if (line.decision === 'refused_have' || line.decision === 'refused_stop') {
      return closedSince(line.createdAt) ? 'past' : 'withdrawn';
    }
    return 'pending';
  };
  return { sessions, ongoing, lines: lines.map((line) => ({ line, state: stateOf(line) })) };
}
