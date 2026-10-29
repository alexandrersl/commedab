// @commedab/data — couche d'accès aux données.
// Dépôts par entité (requêtes réactives + commandes), schéma PowerSync, connecteur Supabase.
// Les écrans n'importent jamais PowerSync et n'écrivent jamais de SQL : tout passe par ici.
// Voir docs/specs-techniques.md, sections 2.9, 5 et 6.2.

export { openAppDatabase, type AppDatabase, type SyncState } from './app-database';
export {
  createData,
  type Data,
  type DeletedPurchase,
  type ProductChanges,
  type RecipeInput,
} from './data';
export type { Database, SqlContext } from './database';
export type { RejectedWrite } from './connector';
export type {
  CategoryRecord,
  IngredientRecord,
  ProductRecord,
  PurchaseRecord,
  RecipeRecord,
  SettingsRecord,
} from './records';
export type { Subscription } from './reads';
export { runStorageCheck, type StorageCheckResult } from './diagnostic/storage-check';
