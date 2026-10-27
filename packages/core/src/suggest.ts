import { checkPeriod, checkProduct } from './guard';
import type { LocalDate, Product, RateSource } from './model';
import { EPSILON, roundUpToStep } from './quantity';
import type { ListView } from './session';
import type { ProductState } from './state';

/** Éléments de la justification d'une suggestion (EF-4.8), mis en mots par l'écran. */
export interface Justification {
  stock: number;
  depletionDate: LocalDate | null;
  source: RateSource;
  intervalCount: number;
  /** Proposé parce que le produit est marqué « à racheter », pas par le calcul du besoin. */
  marked: boolean;
}

export interface Suggestion {
  productId: string;
  quantity: number;
  justification: Justification;
}

/**
 * Suggestions couvrant `periodDays` jours (specs techniques 4.5), un nombre entier d'au moins
 * 1. Un produit dont une ligne n'est pas passée (4.9) n'est pas suggéré. Une suggestion due au
 * seul marqueur « à racheter » ne vaut que jusqu'aux courses suivantes : une session commencée
 * au marqueur ou après, et terminée, l'éteint.
 */
export function suggestForPeriod(input: {
  products: readonly Product[];
  states: ReadonlyMap<string, ProductState>;
  periodDays: number;
  list: ListView;
}): Suggestion[] {
  checkPeriod(input.periodDays);
  input.products.forEach(checkProduct);
  const listed = new Set(
    input.list.lines.flatMap(({ line, state }) => (state === 'past' ? [] : [line.productId])),
  );
  const finished = input.list.sessions.filter((session) => session !== input.list.ongoing);
  const suggestions: Suggestion[] = [];

  for (const product of input.products) {
    const state = input.states.get(product.id);
    if (state === undefined || listed.has(product.id) || product.archivedAt !== null) continue;
    const anchorAt = state.anchorAt;
    const shoppedSinceMarker =
      anchorAt !== null && finished.some((session) => session.startedAt >= anchorAt);
    const suggested = suggestedQuantity(product, state, input.periodDays, shoppedSinceMarker);
    if (suggested === null) continue;
    suggestions.push({
      productId: product.id,
      quantity: suggested.quantity,
      justification: {
        stock: state.stock,
        depletionDate: state.depletionDate,
        source: state.rate.source,
        intervalCount: state.rate.intervalCount,
        marked: suggested.marked,
      },
    });
  }
  return suggestions;
}

function suggestedQuantity(
  product: Product,
  state: ProductState,
  periodDays: number,
  shoppedSinceMarker: boolean,
): { quantity: number; marked: boolean } | null {
  const perDay = state.rate.perDay;
  const marked = state.toRebuy && !shoppedSinceMarker;
  switch (product.family) {
    case 'rhythm': {
      if (perDay > 0) {
        const shelfLife = product.shelfLifeDays;
        const horizon =
          shelfLife !== null && shelfLife > 0 ? Math.min(periodDays, shelfLife) : periodDays;
        const need = perDay * horizon - state.stock;
        return need > EPSILON
          ? { quantity: roundUpToStep(need, product.unitKind), marked: false }
          : null;
      }
      const quantity = roundUpToStep(state.lastEligiblePurchaseQuantity ?? 1, product.unitKind);
      return marked ? { quantity, marked: true } : null;
    }
    case 'reserve': {
      if (perDay > 0 && state.stock < perDay * periodDays - EPSILON) {
        return { quantity: product.safetyStock, marked: false };
      }
      return marked ? { quantity: product.safetyStock, marked: true } : null;
    }
    case 'occasional':
      return null;
  }
}
