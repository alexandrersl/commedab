import { toPerPeriod, type LocalDateTime, type Product, type ProductState } from '@commedab/core';
import type { EstimatePart } from '../components/estimate';
import { age, daysSince, since, until } from './dates';
import { count, format } from './words';

// La voix du moteur (components.md, Estimate ; EF-2.5, EF-3.2). Jamais « stock » ni « rythme »
// hors de la section Réglages de la fiche (ENF-8).

/** Ce qu'il reste, arrondi à l'unité ; en dessous d'une demie, c'est probablement fini. */
function left(state: ProductState): number {
  return Math.round(state.stock);
}

type Kind = 'archived' | 'unknown' | 'left' | 'finished';

function kindOf(product: Product, state: ProductState | undefined): Kind {
  if (product.archivedAt !== null) return 'archived';
  if (state === undefined || state.rate.source === 'none') return 'unknown';
  return left(state) >= 1 ? 'left' : 'finished';
}

/** Ce que le dernier achat dit : « le dernier pack », « la dernière bouteille ». */
function lastBought(product: Product): string {
  return product.packSize > 1 ? 'le dernier pack' : 'le dernier achat';
}

/** Phrase de tête de fiche produit. */
export function estimateParts(
  product: Product,
  state: ProductState | undefined,
  now: LocalDateTime,
): { parts: EstimatePart[]; muted: boolean } {
  switch (kindOf(product, state)) {
    case 'archived':
      return { parts: [{ text: "Tu n'en achètes plus." }], muted: true };
    case 'unknown':
      return {
        parts: [{ text: "Je ne sais pas encore : dis-moi quand tu en reprends, j'apprendrai." }],
        muted: true,
      };
    case 'left': {
      const s = state as ProductState;
      const end =
        s.depletionDate === null ? '' : `, de quoi tenir jusqu'à ${until(s.depletionDate, now)}`;
      return {
        parts: [
          { text: "Il t'en reste environ " },
          { text: count(left(s), product.unitLabel), emphasis: 'action' },
          { text: `${end}.` },
        ],
        muted: false,
      };
    }
    case 'finished': {
      const last = state?.lastPurchaseAt;
      return {
        parts: [
          { text: 'Probablement fini', emphasis: 'alert' },
          { text: last ? ` : ${lastBought(product)} date de ${age(last, now)}.` : '.' },
        ],
        muted: false,
      };
    }
  }
}

/** Sous-titre court de l'annuaire et des résultats : « Il t'en reste environ 2 bouteilles · samedi ». */
export function shortEstimate(
  product: Product,
  state: ProductState | undefined,
  now: LocalDateTime,
): { text: string; tone: 'muted' | 'alert' } {
  const last = state?.lastPurchaseAt ?? null;
  switch (kindOf(product, state)) {
    case 'archived':
      return {
        text: last ? `Dernier achat ${since(last, now)}` : "Tu n'en achètes plus",
        tone: 'muted',
      };
    case 'unknown':
      return { text: last ? `Acheté ${since(last, now)}` : 'Je ne sais pas encore', tone: 'muted' };
    case 'left': {
      const s = state as ProductState;
      const end = s.depletionDate === null ? '' : ` · ${until(s.depletionDate, now)}`;
      return {
        text: `Il t'en reste environ ${count(left(s), product.unitLabel)}${end}`,
        tone: 'muted',
      };
    }
    case 'finished':
      return {
        text: last ? `Probablement fini · ${since(last, now)}` : 'Probablement fini',
        tone: 'alert',
      };
  }
}

/** Ingrédient d'une recette (EF-4.3) : manquant en `alert`, sinon ce qu'il en reste. */
export function ingredientEstimate(
  product: Product,
  state: ProductState | undefined,
  now: LocalDateTime,
  missing: boolean,
): { text: string; tone: 'muted' | 'alert' } {
  const last = state?.lastPurchaseAt ?? null;
  if (missing) {
    if (last === null) return { text: 'Pas encore acheté', tone: 'alert' };
    return daysSince(last, now) >= 14
      ? { text: `Plus rien depuis ${age(last, now)}`, tone: 'alert' }
      : { text: 'Probablement fini', tone: 'alert' };
  }
  if (state !== undefined && state.rate.source !== 'none' && left(state) >= 1) {
    return {
      text: `Il t'en reste environ ${count(left(state), product.unitLabel)}`,
      tone: 'muted',
    };
  }
  return { text: last ? `Acheté ${since(last, now)}` : 'Je ne sais pas encore', tone: 'muted' };
}

/**
 * Justification d'une suggestion (EF-2.5) : ce qu'il reste et jusqu'à quand, ou depuis quand
 * c'est fini et à quelle fréquence on en reprend.
 */
export function suggestionReason(
  product: Product,
  state: ProductState,
  now: LocalDateTime,
): string {
  const remaining = left(state);
  if (remaining >= 1 && state.depletionDate !== null) {
    return `Il doit t'en rester ${format(remaining)}, de quoi tenir jusqu'à ${until(state.depletionDate, now)}`;
  }
  const last = state.lastPurchaseAt;
  if (last !== null && state.rate.source === 'learned' && state.rate.perDay > 0) {
    const every = Math.round(product.packSize / state.rate.perDay);
    return `D'habitude tu en reprends tous les ${every} jours, ça fait ${daysSince(last, now)}`;
  }
  if (last !== null) {
    return `${product.packSize > 1 ? 'Le dernier pack' : 'Le dernier achat'} date de ${age(last, now)}, il doit être fini`;
  }
  return "Tu n'en as plus, d'après ce que tu ajoutes";
}

const PERIOD_LABELS = { day: 'jour', week: 'semaine', month: 'mois' } as const;

/** « 5 / semaine », pour le champ « Tu en prends » ; « – » sans rythme. */
export function rateLabel(perDay: number): string {
  if (perDay <= 0) return '–';
  const { quantity, period } = toPerPeriod(perDay);
  return `${format(quantity)} / ${PERIOD_LABELS[period]}`;
}

export { PERIOD_LABELS };
