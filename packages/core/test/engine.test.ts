import { describe, expect, it } from 'vitest';
import {
  applyRecipes,
  InvalidInputError,
  listView,
  observedIntervals,
  resolvePeriod,
  unitStep,
  suggestForPeriod,
  type Product,
  type Recipe,
} from '../src/index';
import { eventsOf, quantity, scenario, statesOf } from './fixture';
import { fixtures } from './fixtures/index';

const all = fixtures.map(scenario);
const suggestible = all.filter((s) => s.fixture.expected.invalidInput === undefined);
const PRECISION = 6;

/** Jours couverts par une suggestion « à rythme » (RG-10). */
function horizonOf(product: Product, periodDays: number): number {
  const shelfLife = product.shelfLifeDays;
  return shelfLife !== null && shelfLife > 0 ? Math.min(periodDays, shelfLife) : periodDays;
}

function suggestionsOf(s: (typeof all)[number]) {
  const periodDays = s.fixture.periodDays;
  if (periodDays === undefined) return null;
  return suggestForPeriod({
    products: s.products,
    states: statesOf(s, s.fixture.now),
    periodDays,
    list: listView(s.listLines, s.fixture.now),
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
      const actual = suggestionsOf(s)?.map(({ productId, quantity, justification }) => ({
        productId,
        quantity,
        marked: justification.marked,
      }));
      expect(actual).toEqual(suggestions);
    });
  }

  if (expected.sessions !== undefined || expected.ongoing !== undefined) {
    const { sessions, ongoing } = expected;
    it('sessions de courses', () => {
      const view = listView(s.listLines, now);
      if (sessions !== undefined) expect(view.sessions).toMatchObject(sessions);
      if (ongoing !== undefined) expect(view.ongoing?.startedAt ?? null).toBe(ongoing);
    });
  }

  if (expected.lineStates !== undefined) {
    const lineStates = expected.lineStates;
    it('état des lignes', () => {
      const actual = Object.fromEntries(
        listView(s.listLines, now).lines.map(({ line, state }) => [line.id, state]),
      );
      expect(actual).toMatchObject(lineStates);
    });
  }

  if (expected.period !== undefined) {
    const period = expected.period;
    it('période de la liste', () => {
      expect(resolvePeriod(s.household, listView(s.listLines, now).sessions)).toMatchObject(period);
    });
  }

  if (expected.invalidInput !== undefined) {
    const field = expected.invalidInput;
    it('entrée refusée', () => {
      expect(() => suggestionsOf(s)).toThrow(InvalidInputError);
      expect(() => suggestionsOf(s)).toThrow(expect.objectContaining({ field }));
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
  it.each(suggestible)('$fixture.id : deux appels identiques donnent le même résultat', (s) => {
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

  it.each(suggestible)(
    '$fixture.id : rien n’est suggéré quand le stock couvre la période (rythme connu)',
    (s) => {
      const periodDays = s.fixture.periodDays;
      if (periodDays === undefined) return;
      const states = statesOf(s, s.fixture.now);
      const suggested = new Set(suggestionsOf(s)?.map((suggestion) => suggestion.productId));
      for (const product of s.products.filter((p) => p.family === 'rhythm')) {
        const state = states.get(product.id);
        if (state === undefined || state.rate.perDay === 0) continue;
        if (state.stock >= state.rate.perDay * horizonOf(product, periodDays))
          expect(suggested.has(product.id)).toBe(false);
      }
    },
  );

  it.each(suggestible)(
    '$fixture.id : une suggestion « à rythme » dépasse le besoin de moins d’un pas (RG-2, RG-10)',
    (s) => {
      const periodDays = s.fixture.periodDays;
      if (periodDays === undefined) return;
      const states = statesOf(s, s.fixture.now);
      const products = new Map(s.products.map((p) => [p.id, p]));
      for (const suggestion of suggestionsOf(s) ?? []) {
        const product = products.get(suggestion.productId);
        const state = states.get(suggestion.productId);
        if (product?.family !== 'rhythm' || state === undefined || state.rate.perDay === 0) {
          continue;
        }
        const need = state.rate.perDay * horizonOf(product, periodDays) - state.stock;
        expect(suggestion.quantity).toBeGreaterThanOrEqual(need - 1e-9);
        expect(suggestion.quantity).toBeLessThan(need + unitStep(product.unitKind));
      }
    },
  );
});
