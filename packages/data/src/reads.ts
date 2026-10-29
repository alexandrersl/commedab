import type { ListLine, ListRecipe } from '@commedab/core';
import type { Database, SqlContext } from './database';
import {
  toCategory,
  toListLine,
  toListRecipe,
  toProduct,
  toPurchase,
  toRecipes,
  type CategoryRecord,
  type ProductRecord,
  type PurchaseRecord,
  type RecipeRecord,
  type SettingsRecord,
} from './records';
import type { AppTables } from './schema';

export function readCategories(db: SqlContext): Promise<CategoryRecord[]> {
  return db
    .getAll<AppTables['category']>('SELECT * FROM category ORDER BY position, name')
    .then((rows) => rows.map(toCategory));
}

/** Tous les produits, archivés compris. */
export function readProducts(db: SqlContext): Promise<ProductRecord[]> {
  return db
    .getAll<AppTables['product']>('SELECT * FROM product ORDER BY name_normalized')
    .then((rows) => rows.map(toProduct));
}

export function readPurchases(db: SqlContext, productId?: string): Promise<PurchaseRecord[]> {
  const where = productId === undefined ? '' : 'WHERE e.product_id = ?';
  return db
    .getAll<AppTables['stock_event'] & { origin: string | null }>(
      `SELECT e.*, l.origin FROM stock_event e LEFT JOIN list_line l ON l.id = e.list_line_id
       ${where} ORDER BY e.occurred_at`,
      productId === undefined ? [] : [productId],
    )
    .then((rows) => rows.map(toPurchase));
}

/**
 * Lignes non retirées, cochées comprises : `core` en tire l'état de la liste et les ancres
 * d'ajout manuel (specs techniques 4.4, 4.7).
 */
export function readListLines(db: SqlContext): Promise<ListLine[]> {
  return db
    .getAll<AppTables['list_line']>(
      'SELECT * FROM list_line WHERE deleted_at IS NULL ORDER BY created_at',
    )
    .then((rows) => rows.map(toListLine));
}

export function readListRecipes(db: SqlContext): Promise<ListRecipe[]> {
  return db
    .getAll<AppTables['list_recipe']>(
      'SELECT * FROM list_recipe WHERE deleted_at IS NULL ORDER BY created_at',
    )
    .then((rows) => rows.map(toListRecipe));
}

/** Recettes non supprimées et leurs ingrédients. */
export async function readRecipes(db: SqlContext): Promise<RecipeRecord[]> {
  const recipes = await db.getAll<AppTables['recipe']>(
    'SELECT * FROM recipe WHERE deleted_at IS NULL ORDER BY name',
  );
  const ingredients = await db.getAll<AppTables['recipe_ingredient']>(
    'SELECT * FROM recipe_ingredient WHERE deleted_at IS NULL ORDER BY created_at',
  );
  return toRecipes(recipes, ingredients);
}

/** Réglages du compte ; nul avant la première synchro, qui apporte le household. */
export async function readSettings(db: SqlContext): Promise<SettingsRecord | null> {
  const row = await db.getOptional<AppTables['household']>('SELECT * FROM household LIMIT 1');
  return row === null
    ? null
    : { householdId: row.id, catalogContribution: row.catalog_contribution !== 0 };
}

export interface Subscription<T> {
  onResult: (result: T) => void;
  onError?: (error: unknown) => void;
}

/** Lit `read` maintenant puis après chaque écriture sur `tables` ; rend le désabonnement. */
export function watch<T>(
  db: Database,
  tables: readonly string[],
  read: (db: SqlContext) => Promise<T>,
  { onResult, onError }: Subscription<T>,
): () => void {
  let active = true;
  let pending = Promise.resolve();
  const run = () => {
    pending = pending
      .then(() => read(db))
      .then((result) => {
        if (active) onResult(result);
      })
      .catch((error: unknown) => {
        if (active) onError?.(error);
      });
  };
  const unsubscribe = db.onChange(tables, run);
  run();
  return () => {
    active = false;
    unsubscribe();
  };
}
