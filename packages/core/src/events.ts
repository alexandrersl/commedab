import type { StockEvent } from './model';

/** Événements non supprimés, du plus ancien au plus récent (EF-2.4, EF-3.4). */
export function liveEvents(events: readonly StockEvent[]): StockEvent[] {
  return events
    .filter((event) => event.deletedAt === null)
    .sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0));
}

export function isAnchor(event: StockEvent): boolean {
  return event.type !== 'purchased';
}

/** Valeur d'un événement d'ancrage (specs techniques 4.4). */
export function anchorValue(event: StockEvent): number {
  switch (event.type) {
    case 'counted':
      return event.quantity ?? 0;
    case 'opened_last':
      return 1;
    default:
      return 0;
  }
}

export function lastIndex<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i] as T)) return i;
  }
  return -1;
}
