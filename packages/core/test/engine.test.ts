import { describe, expect, it } from 'vitest';
import { applyRecipes, observedIntervals, suggestForPeriod, type Recipe } from '../src/index';
import { eventsOf, quantity, scenario, statesOf, type Fixture } from './fixture';
import { fixtures } from './fixtures/index';

const all = (fixtures as Fixture[]).map(scenario);
const PRECISION = 6;

function suggestionsOf(s: (typeof all)[number]) {
  const periodDays = s.fixture.periodDays;
  if (periodDays === undefined) return null;
  return suggestForPeriod({
    products: s.products,
    states: statesOf(s, s.fixture.now),
    periodDays,
    listLines: s.listLines,
    previousOffers: s.previousOffers,
  });
}

describe.each(all)('$fixture.id — $fixture.scenario', (s) => {
  const { expected, now } = s.fixture;
  const states = statesOf(s, now);

  if (expected.finishedAt !== undefined) {
    const finishedAt = expected.finishedAt;
    it('date du « fini »', () => {
      expect(s.finishedAt).toEqual(finishedAt);
    });
  }

  if (expected.rates !== undefined) {
    const rates = expected.rates;
    it('rythme', () => {
      for (const [productId, rate] of Object.entries(rates)) {
        const actual = states.get(productId)?.rate;
        if (rate.perDay !== undefined) {
          expect(actual?.perDay).toBeCloseTo(quantity(rate.perDay), PRECISION);
        }
        if (rate.source !== undefined) expect(actual?.source).toBe(rate.source);
        if (rate.intervalCount !== undefined) {
          expect(actual?.intervalCount).toBe(rate.intervalCount);
        }
      }
    });
  }

  if (expected.intervals !== undefined) {
    const intervals = expected.intervals;
    it('intervalles', () => {
      for (const [productId, days] of Object.entries(intervals)) {
        const actual = observedIntervals(eventsOf(s.events, productId));
        expect(actual.map((interval) => interval.days)).toEqual(days);
      }
    });
  }

  if (expected.states !== undefined) {
    const expectedStates = expected.states;
    it('stock estimé', () => {
      for (const [productId, state] of Object.entries(expectedStates)) {
        const actual = states.get(productId);
        if (state.stock !== undefined) {
          expect(actual?.stock).toBeCloseTo(quantity(state.stock), PRECISION);
        }
        if (state.anchorAt !== undefined) expect(actual?.anchorAt).toBe(state.anchorAt);
        if (state.depletionDate !== undefined) {
          expect(actual?.depletionDate).toBe(state.depletionDate);
        }
        if (state.toRebuy !== undefined) expect(actual?.toRebuy).toBe(state.toRebuy);
      }
    });
  }

  if (expected.suggestions !== undefined) {
    const suggestions = expected.suggestions;
    it('suggestions', () => {
      const actual = suggestionsOf(s)?.map(({ productId, quantity }) => ({ productId, quantity }));
      expect(actual).toEqual(suggestions);
    });
  }

  if (expected.recipeLines !== undefined) {
    const recipeLines = expected.recipeLines;
    it('recettes', () => {
      const recipes = new Map<string, Recipe>((s.fixture.recipes ?? []).map((r) => [r.id, r]));
      const lines = applyRecipes({
        requests: (s.fixture.recipeRequests ?? []).map(({ recipeId, servings }) => {
          const recipe = recipes.get(recipeId);
          if (recipe === undefined) throw new Error(`Recette inconnue : ${recipeId}`);
          return { recipe, servings };
        }),
        products: new Map(s.products.map((p) => [p.id, p])),
        states,
        listLines: s.listLines,
      });
      expect(lines).toEqual(recipeLines);
    });
  }
});

describe('propriétés (specs techniques 4.8)', () => {
  it.each(all)('$fixture.id : deux appels identiques donnent le même résultat', (s) => {
    expect(statesOf(s, s.fixture.now)).toEqual(statesOf(s, s.fixture.now));
    expect(suggestionsOf(s)).toEqual(suggestionsOf(s));
  });

  it.each(all)('$fixture.id : le stock n’est jamais négatif', (s) => {
    for (const state of statesOf(s, s.fixture.now).values()) {
      expect(state.stock).toBeGreaterThanOrEqual(0);
    }
  });

  it.each(all)('$fixture.id : un événement supprimé ne compte pas', (s) => {
    const kept = { ...s, events: s.events.filter((event) => event.deletedAt === null) };
    expect(statesOf(s, s.fixture.now)).toEqual(statesOf(kept, s.fixture.now));
  });

  it.each(all)(
    '$fixture.id : rien n’est suggéré quand le stock couvre la période (rythme connu)',
    (s) => {
      const periodDays = s.fixture.periodDays;
      if (periodDays === undefined) return;
      const states = statesOf(s, s.fixture.now);
      const suggested = new Set(suggestionsOf(s)?.map((suggestion) => suggestion.productId));
      for (const product of s.products.filter((p) => p.family === 'rhythm')) {
        const state = states.get(product.id);
        if (state === undefined || state.rate.perDay === 0) continue;
        const horizon = Math.min(periodDays, product.shelfLifeDays ?? periodDays);
        if (state.stock >= state.rate.perDay * horizon)
          expect(suggested.has(product.id)).toBe(false);
      }
    },
  );
});
