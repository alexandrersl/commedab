import { checkPeriod, checkProduct } from './guard';
import type { LocalDate, Product, RateSource } from './model';
import { EPSILON, packsFor } from './quantity';
import type { ListView } from './session';
import type { ProductState } from './state';

/** Éléments de la justification d'une suggestion (EF-2.5), mis en mots par l'écran. */
export interface Justification {
  stock: number;
  depletionDate: LocalDate | null;
  source: RateSource;
  intervalCount: number;
}

export interface Suggestion {
  productId: string;
  /** Packs. */
  quantity: number;
  justification: Justification;
}

/**
 * Suggestions couvrant `periodDays` jours (specs techniques 4.5), un nombre entier d'au moins
 * 1 : le besoin `r × P − stock`, s'il est positif, arrondi au pack supérieur. Un produit
 * archivé, sans rythme ou dont une ligne est affichée (4.7) n'est pas suggéré.
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
  const suggestions: Suggestion[] = [];

  for (const product of input.products) {
    const state = input.states.get(product.id);
    if (state === undefined || listed.has(product.id) || product.archivedAt !== null) continue;
    const need = state.rate.perDay * input.periodDays - state.stock;
    if (state.rate.perDay <= 0 || need <= EPSILON) continue;
    suggestions.push({
      productId: product.id,
      quantity: packsFor(need, product.packSize),
      justification: {
        stock: state.stock,
        depletionDate: state.depletionDate,
        source: state.rate.source,
        intervalCount: state.rate.intervalCount,
      },
    });
  }
  return suggestions;
}
