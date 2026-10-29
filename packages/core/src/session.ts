import { addHours } from './date';
import {
  checkDateTime,
  checkListLines,
  checkListRecipes,
  checkPurchases,
  checkRecipe,
} from './guard';
import type { ListLine, ListRecipe, LocalDateTime, Purchase, Recipe } from './model';

/** Deux achats espacés de moins de 3 h appartiennent à la même session (EF-1.7). */
export const SESSION_GAP_HOURS = 3;

export interface ShoppingSession {
  startedAt: LocalDateTime;
  /** Dernier achat. */
  endedAt: LocalDateTime;
  /** Fermeture de la session, 3 h après le dernier achat. */
  closesAt: LocalDateTime;
}

/** États d'une ligne (specs techniques 4.7). */
export type LineState = 'pending' | 'checked' | 'past';

/** Pastille d'une recette de la liste (EF-1.9). */
export interface RecipeBadge {
  listRecipe: ListRecipe;
  /** Lignes affichées dont le produit est un ingrédient de la recette, et cochées parmi elles. */
  total: number;
  checked: number;
  /** Toutes les lignes cochées, ou aucune ligne. */
  full: boolean;
}

export interface ListView {
  sessions: ShoppingSession[];
  lines: { line: ListLine; state: LineState }[];
  recipes: RecipeBadge[];
}

/** Sessions de courses formées par les dates d'achat, de la plus ancienne à la plus récente. */
export function shoppingSessions(purchasedAt: readonly LocalDateTime[]): ShoppingSession[] {
  purchasedAt.forEach((at, i) => checkDateTime(`purchasedAt[${i}]`, at));
  const sessions: ShoppingSession[] = [];
  for (const at of [...purchasedAt].sort()) {
    const last = sessions.at(-1);
    if (last !== undefined && at < last.closesAt) {
      last.endedAt = at;
      last.closesAt = addHours(at, SESSION_GAP_HOURS);
    } else {
      sessions.push({ startedAt: at, endedAt: at, closesAt: addHours(at, SESSION_GAP_HOURS) });
    }
  }
  return sessions;
}

/**
 * Ce que la Liste affiche à l'ouverture de l'application `openedAt` (specs techniques 4.7).
 * Une ligne cochée reste affichée tant que sa session n'était pas fermée à l'ouverture ; une
 * pastille, tant qu'une de ses lignes l'est ou qu'aucune session ne s'est fermée entre son
 * ajout et l'ouverture. `recipes` : recettes non supprimées.
 */
export function listView(input: {
  lines: readonly ListLine[];
  listRecipes?: readonly ListRecipe[];
  recipes?: readonly Recipe[];
  purchases: readonly Purchase[];
  openedAt: LocalDateTime;
}): ListView {
  const { lines, listRecipes = [], recipes = [], purchases, openedAt } = input;
  checkListLines(lines);
  checkListRecipes(listRecipes);
  recipes.forEach(checkRecipe);
  checkPurchases(purchases);
  checkDateTime('openedAt', openedAt);

  const sessions = shoppingSessions(purchases.map((purchase) => purchase.occurredAt));
  const stateOf = (line: ListLine): LineState => {
    if (line.deletedAt !== null) return 'past';
    const checkedAt = line.checkedAt;
    if (checkedAt === null) return 'pending';
    const session = sessions.find((s) => s.startedAt <= checkedAt && checkedAt <= s.endedAt);
    return session !== undefined && openedAt < session.closesAt ? 'checked' : 'past';
  };
  const states = lines.map((line) => ({ line, state: stateOf(line) }));
  const shown = states.filter(({ state }) => state !== 'past');

  const badges: RecipeBadge[] = [];
  for (const listRecipe of listRecipes) {
    const recipe = recipes.find((r) => r.id === listRecipe.recipeId);
    if (listRecipe.deletedAt !== null || recipe === undefined) continue;
    const ingredients = new Set(recipe.ingredients.map((ingredient) => ingredient.productId));
    const own = shown.filter(({ line }) => ingredients.has(line.productId));
    const cleared = sessions.some(
      (s) => s.closesAt > listRecipe.createdAt && s.closesAt <= openedAt,
    );
    if (own.length === 0 && cleared) continue;
    const checked = own.filter(({ state }) => state === 'checked').length;
    badges.push({ listRecipe, total: own.length, checked, full: checked === own.length });
  }
  return { sessions, lines: states, recipes: badges };
}
