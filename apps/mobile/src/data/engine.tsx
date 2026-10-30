import {
  listView,
  missingIngredients,
  productState,
  resolvePeriod,
  suggestForPeriod,
  type ListRecipe,
  type ListView,
  type LocalDateTime,
  type MissingIngredient,
  type Period,
  type ProductState,
  type Suggestion,
} from '@commedab/core';
import type { CategoryRecord, ProductRecord, PurchaseRecord, RecipeRecord } from '@commedab/data';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useOpenedAt, useNow } from './opened-at';
import { useData } from './provider';
import { useWatched } from './use-watch';

export interface Engine {
  /** Vrai tant qu'une des lectures n'a pas rendu sa première valeur. */
  loading: boolean;
  error: unknown;
  retry: () => void;
  now: LocalDateTime;
  products: ProductRecord[];
  productById: ReadonlyMap<string, ProductRecord>;
  purchasesOf: (productId: string) => PurchaseRecord[];
  purchaseCount: (productId: string) => number;
  states: ReadonlyMap<string, ProductState>;
  categories: CategoryRecord[];
  categoryById: ReadonlyMap<string, CategoryRecord>;
  recipes: RecipeRecord[];
  recipeById: ReadonlyMap<string, RecipeRecord>;
  view: ListView;
  /** Lignes affichées (non cochées et cochées encore visibles). */
  shownLines: ListView['lines'];
  /** Ligne non cochée du produit, s'il en a une. */
  pendingLineOf: (productId: string) => ListView['lines'][number]['line'] | undefined;
  /** Recette de la liste affichée en pastille, s'il y en a une. */
  listRecipeOf: (recipeId: string) => ListRecipe | undefined;
  period: Period;
  suggestions: Suggestion[];
  missingOf: (recipeId: string, times?: number) => MissingIngredient[];
}

const EngineContext = createContext<Engine | null>(null);

export function useEngine(): Engine {
  const engine = useContext(EngineContext);
  if (engine === null) throw new Error('useEngine hors de EngineProvider');
  return engine;
}

const EMPTY_VIEW: ListView = { sessions: [], lines: [], recipes: [] };

/**
 * Le moteur de `core` appliqué aux données de l'appareil, une fois pour tous les écrans
 * (specs techniques 6.2) : états des produits, vue de la liste, période et suggestions.
 */
export function EngineProvider({ children }: { children: ReactNode }) {
  const data = useData();
  const products = useWatched(data.products.watch);
  const purchases = useWatched(data.purchases.watch);
  const list = useWatched(data.list.watch);
  const recipes = useWatched(data.recipes.watch);
  const categories = useWatched(data.categories.watch);
  const openedAt = useOpenedAt();
  const now = useNow();
  const watched = [products, purchases, list, recipes, categories];
  const loading = watched.some((w) => w.value === undefined);
  const error = watched.find((w) => w.error !== null)?.error ?? null;

  const engine = useMemo<Engine>(() => {
    const allProducts = products.value ?? [];
    const allPurchases = purchases.value ?? [];
    const lines = list.value?.lines ?? [];
    const listRecipes = list.value?.recipes ?? [];
    const allRecipes = recipes.value ?? [];
    const purchasesBy = new Map<string, PurchaseRecord[]>();
    for (const purchase of allPurchases) {
      const own = purchasesBy.get(purchase.productId) ?? [];
      own.push(purchase);
      purchasesBy.set(purchase.productId, own);
    }
    const linesBy = new Map<string, typeof lines>();
    for (const line of lines) {
      const own = linesBy.get(line.productId) ?? [];
      own.push(line);
      linesBy.set(line.productId, own);
    }
    const states = new Map<string, ProductState>();
    for (const product of allProducts) {
      states.set(
        product.id,
        productState(
          product,
          purchasesBy.get(product.id) ?? [],
          linesBy.get(product.id) ?? [],
          now,
        ),
      );
    }
    const view = loading
      ? EMPTY_VIEW
      : listView({ lines, listRecipes, recipes: allRecipes, purchases: allPurchases, openedAt });
    const period = resolvePeriod(view.sessions);
    const shownLines = view.lines.filter(({ state }) => state !== 'past');
    const productById = new Map(allProducts.map((p) => [p.id, p]));
    const recipeById = new Map(allRecipes.map((r) => [r.id, r]));
    return {
      loading,
      error,
      retry: () => watched.forEach((w) => w.retry()),
      now,
      products: allProducts,
      productById,
      purchasesOf: (id) => purchasesBy.get(id) ?? [],
      purchaseCount: (id) => purchasesBy.get(id)?.length ?? 0,
      states,
      categories: categories.value ?? [],
      categoryById: new Map((categories.value ?? []).map((c) => [c.id, c])),
      recipes: allRecipes,
      recipeById,
      view,
      shownLines,
      pendingLineOf: (id) =>
        shownLines.find(({ line, state }) => line.productId === id && state === 'pending')?.line,
      listRecipeOf: (id) =>
        view.recipes.find(({ listRecipe }) => listRecipe.recipeId === id)?.listRecipe,
      period,
      suggestions: loading
        ? []
        : suggestForPeriod({ products: allProducts, states, periodDays: period.days, list: view }),
      missingOf: (recipeId, times) => {
        const recipe = recipeById.get(recipeId);
        if (recipe === undefined) return [];
        const onList = view.recipes.find(({ listRecipe }) => listRecipe.recipeId === recipeId);
        return missingIngredients({
          recipe,
          times: times ?? onList?.listRecipe.times ?? 1,
          products: productById,
          states,
        });
      },
    };
    // `watched` change à chaque rendu ; ses valeurs suffisent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    products.value,
    purchases.value,
    list.value,
    recipes.value,
    categories.value,
    openedAt,
    now,
    loading,
    error,
  ]);

  return <EngineContext.Provider value={engine}>{children}</EngineContext.Provider>;
}
