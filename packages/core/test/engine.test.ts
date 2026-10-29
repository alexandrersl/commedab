import { describe, expect, it } from 'vitest';
import {
  applyRecipe,
  InvalidInputError,
  missingIngredients,
  observedIntervals,
  resolvePeriod,
  suggestForPeriod,
} from '../src/index';
import { ofProduct, quantity, recipeOf, scenario, statesOf, viewOf } from './fixture';
import { fixtures } from './fixtures/index';

const all = fixtures.map(scenario);
const suggestible = all.filter((s) => s.fixture.expected.invalidInput === undefined);
const PRECISION = 6;

function suggestionsOf(s: (typeof all)[number]) {
  const periodDays = s.fixture.periodDays;
  if (periodDays === undefined) return null;
  return suggestForPeriod({
    products: s.products,
    states: statesOf(s, s.fixture.now),
    periodDays,
    list: viewOf(s),
  });
}

describe.each(all)('$fixture.id — $fixture.scenario', (s) => {
  const { expected, now } = s.fixture;
  const states = statesOf(s, now);
  const products = new Map(s.products.map((p) => [p.id, p]));

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
        const actual = observedIntervals(ofProduct(s.purchases, productId));
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

  if (expected.sessions !== undefined) {
    const sessions = expected.sessions;
    it('sessions de courses', () => {
      expect(viewOf(s).sessions).toMatchObject(sessions);
    });
  }

  if (expected.lineStates !== undefined) {
    const lineStates = expected.lineStates;
    it('état des lignes', () => {
      const actual = Object.fromEntries(viewOf(s).lines.map(({ line, state }) => [line.id, state]));
      expect(actual).toMatchObject(lineStates);
    });
  }

  for (const opening of expected.openings ?? []) {
    it(`liste à l'ouverture de ${opening.openedAt}`, () => {
      const view = viewOf({ ...s, fixture: { ...s.fixture, openedAt: opening.openedAt } });
      if (opening.lineStates !== undefined) {
        const actual = Object.fromEntries(view.lines.map(({ line, state }) => [line.id, state]));
        expect(actual).toMatchObject(opening.lineStates);
      }
      if (opening.recipeBadges !== undefined) {
        const actual = view.recipes.map(({ listRecipe, checked, total, full }) => ({
          recipeId: listRecipe.recipeId,
          checked,
          total,
          full,
        }));
        expect(actual).toEqual(opening.recipeBadges);
      }
    });
  }

  if (expected.period !== undefined) {
    const period = expected.period;
    it('période de la liste', () => {
      expect(resolvePeriod(viewOf(s).sessions)).toMatchObject(period);
    });
  }

  if (expected.invalidInput !== undefined) {
    const field = expected.invalidInput;
    it('entrée refusée', () => {
      expect(() => suggestionsOf(s)).toThrow(InvalidInputError);
      expect(() => suggestionsOf(s)).toThrow(expect.objectContaining({ field }));
    });
  }

  if (expected.missing !== undefined) {
    const missing = expected.missing;
    it('ingrédients manquants', () => {
      const actual = (s.fixture.recipeRequests ?? []).map(({ recipeId, times }) =>
        missingIngredients({ recipe: recipeOf(s, recipeId), times, products, states }),
      );
      expect(actual).toEqual(missing);
    });
  }

  if (expected.recipeChanges !== undefined) {
    const changes = expected.recipeChanges;
    it('recettes sur la liste', () => {
      const pending = viewOf(s)
        .lines.filter(({ state }) => state === 'pending')
        .map(({ line }) => line);
      const actual = (s.fixture.recipeChanges ?? []).map(({ recipeId, from, to }) =>
        applyRecipe({
          recipe: recipeOf(s, recipeId),
          from,
          to,
          products,
          states,
          listLines: pending,
        }),
      );
      expect(actual).toEqual(changes);
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

  it.each(all)('$fixture.id : une ligne retirée n’est pas une ancre', (s) => {
    const kept = { ...s, listLines: s.listLines.filter((line) => line.deletedAt === null) };
    expect(statesOf(s, s.fixture.now)).toEqual(statesOf(kept, s.fixture.now));
  });

  it.each(suggestible)('$fixture.id : rien n’est suggéré quand le stock couvre la période', (s) => {
    const periodDays = s.fixture.periodDays;
    if (periodDays === undefined) return;
    const states = statesOf(s, s.fixture.now);
    const suggested = new Set(suggestionsOf(s)?.map((suggestion) => suggestion.productId));
    for (const product of s.products) {
      const state = states.get(product.id);
      if (state !== undefined && state.stock >= state.rate.perDay * periodDays)
        expect(suggested.has(product.id)).toBe(false);
    }
  });

  it.each(suggestible)(
    '$fixture.id : une suggestion dépasse le besoin de moins d’un pack (RG-2)',
    (s) => {
      const periodDays = s.fixture.periodDays;
      if (periodDays === undefined) return;
      const states = statesOf(s, s.fixture.now);
      const products = new Map(s.products.map((p) => [p.id, p]));
      for (const suggestion of suggestionsOf(s) ?? []) {
        const product = products.get(suggestion.productId);
        const state = states.get(suggestion.productId);
        if (product === undefined || state === undefined) continue;
        const need = state.rate.perDay * periodDays - state.stock;
        const units = suggestion.quantity * product.packSize;
        expect(units).toBeGreaterThanOrEqual(need - 1e-9);
        expect(units).toBeLessThan(need + product.packSize);
      }
    },
  );
});
