import type { ListLine, LocalDate, Offer, Product, RateSource } from './model';
import { EPSILON, roundUpToStep } from './quantity';
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
 * Suggestions d'une liste couvrant `periodDays` jours (specs techniques 4.5). Un produit
 * ayant une ligne sur la liste active, même retirée ou refusée, n'est pas suggéré. Une
 * suggestion due au seul marqueur « à racheter » n'est faite qu'une fois : déjà proposée sur
 * une liste depuis le marqueur (`previousOffers`), elle ne l'est plus.
 */
export function suggestForPeriod(input: {
  products: readonly Product[];
  states: ReadonlyMap<string, ProductState>;
  periodDays: number;
  listLines: readonly ListLine[];
  previousOffers: readonly Offer[];
}): Suggestion[] {
  const listed = new Set(input.listLines.map((line) => line.productId));
  const suggestions: Suggestion[] = [];

  for (const product of input.products) {
    const state = input.states.get(product.id);
    if (state === undefined || listed.has(product.id) || product.archivedAt !== null) continue;
    const anchorAt = state.anchorAt;
    const offeredSinceMarker =
      anchorAt !== null &&
      input.previousOffers.some(
        (offer) => offer.productId === product.id && offer.offeredAt > anchorAt,
      );
    const suggested = suggestedQuantity(product, state, input.periodDays, offeredSinceMarker);
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
  offeredSinceMarker: boolean,
): { quantity: number; marked: boolean } | null {
  const perDay = state.rate.perDay;
  const marked = state.toRebuy && !offeredSinceMarker;
  switch (product.family) {
    case 'rhythm': {
      if (perDay > 0) {
        const horizon = Math.min(periodDays, product.shelfLifeDays ?? periodDays);
        const need = perDay * horizon - state.stock;
        return need > EPSILON
          ? { quantity: roundUpToStep(need, product.unitKind), marked: false }
          : null;
      }
      const quantity = roundUpToStep(state.lastPurchaseQuantity ?? 1, product.unitKind);
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
