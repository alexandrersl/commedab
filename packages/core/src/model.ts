/** Date et heure locales de l'appareil, sans fuseau : `2026-10-26T18:30:00` (specs techniques 4.1). */
export type LocalDateTime = string;
/** Jour civil local : `2026-10-26`. */
export type LocalDate = string;

export type UnitKind = 'piece' | 'weight' | 'volume';
export type Family = 'rhythm' | 'reserve' | 'occasional';
export type CatalogScaling = 'per_person' | 'per_household';
export type StockEventType = 'purchased' | 'opened_last' | 'finished' | 'counted';
export type RateSource = 'declared' | 'learned' | 'catalog' | 'none';
export type LineDecision = 'accepted' | 'modified' | 'refused_have' | 'refused_stop';
export type IngredientKind = 'base' | 'specific';

export interface Household {
  size: number;
  /** Période de la liste fixée par l'utilisateur, de 1 à 31 jours ; null = apprise (4.9). */
  periodDays: number | null;
}

/** Produit tel que le moteur le lit ; toutes les quantités sont en unités d'achat (RG-1). */
export interface Product {
  id: string;
  unitKind: UnitKind;
  family: Family;
  declaredQty: number | null;
  declaredPerDays: number | null;
  safetyStock: number;
  shelfLifeDays: number | null;
  catalogRateQty: number | null;
  catalogLifetimeDays: number | null;
  catalogScaling: CatalogScaling | null;
  archivedAt: LocalDateTime | null;
}

export interface StockEvent {
  id: string;
  productId: string;
  type: StockEventType;
  /** Obligatoire pour `purchased` et `counted`. */
  quantity: number | null;
  occurredAt: LocalDateTime;
  /** Achat issu d'une ligne d'origine recette, exclu de l'apprentissage (RG-4). */
  fromRecipe: boolean;
  deletedAt: LocalDateTime | null;
}

/** Ligne de la liste du foyer, y compris cochée, retirée ou refusée (4.9). */
export interface ListLine {
  id: string;
  productId: string;
  quantity: number;
  decision: LineDecision | null;
  /** Date du refus pour une suggestion refusée. */
  createdAt: LocalDateTime;
  checkedAt: LocalDateTime | null;
  /** Date du retrait. */
  deletedAt: LocalDateTime | null;
}

export interface Recipe {
  id: string;
  servings: number;
  ingredients: readonly { productId: string; quantity: number; kind: IngredientKind }[];
}
