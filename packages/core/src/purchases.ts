import type { Purchase } from './model';

declare const sorted: unique symbol;

/**
 * Achats du plus ancien au plus récent : la forme que lisent les calculs internes. Seul
 * `sortPurchases` la produit, une fois par appel public.
 */
export type SortedPurchases = readonly Purchase[] & { readonly [sorted]: true };

export function sortPurchases(purchases: readonly Purchase[]): SortedPurchases {
  return [...purchases].sort((a, b) =>
    a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : 0,
  ) as readonly Purchase[] as SortedPurchases;
}
