import type {
  Ingredient,
  LineOrigin,
  ListLine,
  ListRecipe,
  LocalDateTime,
  Product,
  Purchase,
  Recipe,
  SystemKey,
} from '@commedab/core';
import type { AppTables } from './schema';
import { localOfStored } from './time';

// Lignes de la base traduites dans le modèle de `core`, avec ce que les écrans affichent en plus.

type Row<T extends keyof AppTables> = AppTables[T];

export interface CategoryRecord {
  id: string;
  key: string;
  name: string;
  position: number;
  systemKey: SystemKey | null;
}

export interface ProductRecord extends Product {
  name: string;
  /** Nul : « À classer ». */
  categoryId: string | null;
  catalogEntryId: string | null;
  createdAt: LocalDateTime;
}

export interface PurchaseRecord extends Purchase {
  listLineId: string | null;
}

export interface IngredientRecord extends Ingredient {
  id: string;
}

export interface RecipeRecord extends Recipe {
  name: string;
  notes: string | null;
  ingredients: IngredientRecord[];
}

export interface SettingsRecord {
  householdId: string;
  catalogContribution: boolean;
}

function text(value: string | null, field: string): string {
  if (value === null) throw new Error(`Colonne vide en base : ${field}`);
  return value;
}

export function toCategory(row: Row<'category'>): CategoryRecord {
  return {
    id: row.id,
    key: text(row.key, 'category.key'),
    name: text(row.name, 'category.name'),
    position: row.position ?? 0,
    systemKey: (row.system_key as SystemKey | null) ?? null,
  };
}

export function toProduct(row: Row<'product'>): ProductRecord {
  return {
    id: row.id,
    name: text(row.name, 'product.name'),
    categoryId: row.category_id,
    unitLabel: text(row.unit_label, 'product.unit_label'),
    packSize: row.pack_size ?? 1,
    declaredQty: row.declared_qty,
    declaredPerDays: row.declared_per_days,
    contentsQty: row.contents_qty,
    contentsUnit: row.contents_unit,
    catalogEntryId: row.catalog_entry_id,
    catalogQty: row.catalog_qty,
    catalogPerDays: row.catalog_per_days,
    archivedAt: localOfStored(row.archived_at),
    createdAt: localOfStored(text(row.created_at, 'product.created_at')),
  };
}

/** `origin` : celle de la ligne cochée qui a créé l'achat, s'il y en a une (RG-4). */
export function toPurchase(row: Row<'stock_event'> & { origin: string | null }): PurchaseRecord {
  return {
    id: row.id,
    productId: text(row.product_id, 'stock_event.product_id'),
    quantity: row.quantity ?? 0,
    occurredAt: localOfStored(text(row.occurred_at, 'stock_event.occurred_at')),
    fromRecipe: row.origin === 'recipe',
    listLineId: row.list_line_id,
  };
}

export function toListLine(row: Row<'list_line'>): ListLine {
  return {
    id: row.id,
    productId: text(row.product_id, 'list_line.product_id'),
    quantity: row.quantity ?? 0,
    origin: text(row.origin, 'list_line.origin') as LineOrigin,
    recipeId: row.recipe_id,
    createdAt: localOfStored(text(row.created_at, 'list_line.created_at')),
    checkedAt: localOfStored(row.checked_at),
    deletedAt: localOfStored(row.deleted_at),
  };
}

export function toListRecipe(row: Row<'list_recipe'>): ListRecipe {
  return {
    id: row.id,
    recipeId: text(row.recipe_id, 'list_recipe.recipe_id'),
    times: row.times ?? 1,
    createdAt: localOfStored(text(row.created_at, 'list_recipe.created_at')),
    deletedAt: localOfStored(row.deleted_at),
  };
}

export function toRecipes(
  recipes: readonly Row<'recipe'>[],
  ingredients: readonly Row<'recipe_ingredient'>[],
): RecipeRecord[] {
  const byRecipe = new Map<string, IngredientRecord[]>();
  for (const row of ingredients) {
    const recipeId = text(row.recipe_id, 'recipe_ingredient.recipe_id');
    const list = byRecipe.get(recipeId) ?? [];
    list.push({
      id: row.id,
      productId: text(row.product_id, 'recipe_ingredient.product_id'),
      quantity: row.quantity,
      unit: row.unit,
    });
    byRecipe.set(recipeId, list);
  }
  return recipes.map((row) => ({
    id: row.id,
    name: text(row.name, 'recipe.name'),
    notes: row.notes,
    ingredients: byRecipe.get(row.id) ?? [],
  }));
}
