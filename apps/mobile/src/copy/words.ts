import type { Product } from '@commedab/core';

// Les mots de la cuisine (design-system.md, Voix) : des bouteilles, des packs, jamais de stock.

const INVARIABLE = new Set(['g', 'kg', 'cl', 'l', 'ml']);

/** « bouteille » → « 2 bouteilles » ; les mesures ne s'accordent pas. */
export function count(n: number, unit: string): string {
  const rounded = Math.round(n * 10) / 10;
  const label = displayUnit(unit);
  if (INVARIABLE.has(unit.toLowerCase())) return `${format(rounded)} ${label}`;
  return `${format(rounded)} ${rounded >= 2 ? plural(label) : label}`;
}

function plural(word: string): string {
  if (/[sxz]$/.test(word)) return word;
  if (word.endsWith('eau')) return `${word}x`;
  return `${word}s`;
}

export function format(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

/** Unité affichée : « L » pour le litre, le reste tel quel. */
export function displayUnit(unit: string): string {
  return unit.toLowerCase() === 'l' ? 'L' : unit;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Quantité d'une ligne, en packs : « 1 pack », « 2 packs », ou le nombre seul pour un pack de 1. */
export function packsLabel(product: Pick<Product, 'packSize'>, packs: number): string {
  if (product.packSize === 1) return format(packs);
  return `${format(packs)} pack${packs >= 2 ? 's' : ''}`;
}

/** Le bouton de la fiche produit (EF-2.9) : « Ajouter 1 pack (6) » ou « Ajouter 1 bouteille ». */
export function addOneLabel(product: Pick<Product, 'packSize' | 'unitLabel'>): string {
  return product.packSize > 1
    ? `Ajouter 1 pack (${format(product.packSize)})`
    : `Ajouter ${count(1, product.unitLabel)}`;
}

/** « bouteille de 1 L » : l'unité et sa contenance. */
export function unitWithContents(
  product: Pick<Product, 'unitLabel' | 'contentsQty' | 'contentsUnit'>,
): string {
  if (product.contentsQty === null || product.contentsUnit === null) return product.unitLabel;
  return `${product.unitLabel} de ${format(product.contentsQty)} ${displayUnit(product.contentsUnit)}`;
}

/** Unités proposées pour un produit (fiche, création à la volée). */
export const UNITS = ['pièce', 'bouteille', 'paquet', 'pot', 'g', 'kg', 'cl', 'l'] as const;
/** Unités d'une contenance (SettingField, EF-3.3). */
export const CONTENTS_UNITS = ['cl', 'l', 'g', 'kg'] as const;
/** Unités d'un ingrédient ; nulle : celle du produit. */
export const INGREDIENT_UNITS = ['g', 'kg', 'cl', 'l', 'pièce'] as const;

/** Mesure qui passe à l'unité au-dessus quand elle s'y écrit juste : 1 000 g → 1 kg. */
const LARGER: Record<string, { unit: string; factor: number }> = {
  g: { unit: 'kg', factor: 1000 },
  cl: { unit: 'l', factor: 100 },
};

function readable(quantity: number, unit: string): { quantity: number; unit: string } {
  const larger = LARGER[unit.toLowerCase()];
  if (larger === undefined || quantity < larger.factor) return { quantity, unit };
  const converted = quantity / larger.factor;
  return Number.isInteger(converted * 10)
    ? { quantity: converted, unit: larger.unit }
    : { quantity, unit };
}

/** Quantité d'un ingrédient : « 200 g », « 4 », « 1,5 kg » plutôt que « 1 500 g ». */
export function ingredientQuantity(quantity: number | null, unit: string | null): string | null {
  if (quantity === null) return null;
  if (unit === null || unit === 'pièce') return format(quantity);
  const shown = readable(quantity, unit);
  return `${format(shown.quantity)} ${displayUnit(shown.unit)}`;
}

/** « Lardons et crème », « Lardons, crème et parmesan ». */
export function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} et ${names.at(-1)}`;
}
