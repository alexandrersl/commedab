/** Date et heure locales de l'appareil, sans fuseau : `2026-10-26T18:30:00` (specs techniques 4.1). */
export type LocalDateTime = string;
/** Jour civil local : `2026-10-26`. */
export type LocalDate = string;

export type RateSource = 'declared' | 'learned' | 'catalog' | 'none';
export type LineOrigin = 'suggestion' | 'manual' | 'recipe';

/**
 * Produit tel que le moteur le lit. Rythmes, stocks et achats sont en unités du produit, les
 * lignes de liste et les suggestions en packs de `packSize` unités (RG-1).
 */
export interface Product {
  id: string;
  /** Unité comptée : « pièce », « bouteille », « kg »… */
  unitLabel: string;
  packSize: number;
  declaredQty: number | null;
  declaredPerDays: number | null;
  /** Contenance d'une unité, pour convertir les ingrédients des recettes (4.6). */
  contentsQty: number | null;
  contentsUnit: string | null;
  /** Rythme du catalogue pour une personne : `catalogQty` unités par `catalogPerDays` jours. */
  catalogQty: number | null;
  catalogPerDays: number | null;
  archivedAt: LocalDateTime | null;
}

/** Achat : seul événement de stock (`stock_event` de type `purchased`). */
export interface Purchase {
  id: string;
  productId: string;
  /** Unités achetées. */
  quantity: number;
  occurredAt: LocalDateTime;
  /** Achat issu d'une ligne d'origine recette, exclu de l'apprentissage (RG-4). */
  fromRecipe: boolean;
}

/** Ligne de la liste, y compris cochée puis sortie de la liste, ou retirée (4.7). */
export interface ListLine {
  id: string;
  productId: string;
  /** Packs. */
  quantity: number;
  origin: LineOrigin;
  recipeId: string | null;
  /** Date de l'ancre d'un ajout manuel (4.4). */
  createdAt: LocalDateTime;
  checkedAt: LocalDateTime | null;
  /** Date du retrait. */
  deletedAt: LocalDateTime | null;
}

export interface Ingredient {
  productId: string;
  /** Nulle pour un ingrédient sans quantité (sel, huile). */
  quantity: number | null;
  /** Nulle : unité du produit. */
  unit: string | null;
}

export interface Recipe {
  id: string;
  ingredients: readonly Ingredient[];
}

/** Recette ajoutée à la liste, affichée en pastille (4.7). */
export interface ListRecipe {
  id: string;
  recipeId: string;
  times: number;
  createdAt: LocalDateTime;
  deletedAt: LocalDateTime | null;
}
