import bebeAnimaux from '../catalog/bebe-animaux.json';
import boissons from '../catalog/boissons.json';
import boulangerie from '../catalog/boulangerie.json';
import cremerie from '../catalog/cremerie.json';
import entretienMaison from '../catalog/entretien-maison.json';
import epicerieSalee from '../catalog/epicerie-salee.json';
import epicerieSucree from '../catalog/epicerie-sucree.json';
import fruitsLegumes from '../catalog/fruits-legumes.json';
import hygieneBeaute from '../catalog/hygiene-beaute.json';
import surgeles from '../catalog/surgeles.json';
import viandePoissonTraiteur from '../catalog/viande-poisson-traiteur.json';
import { DEFAULT_CATEGORIES } from './categories';
import { InvalidInputError } from './errors';
import { normalizeName } from './normalize';
import { isMeasure } from './units';

/** Version du catalogue livré, copiée dans `product.catalog_version` (RG-8). */
export const CATALOG_VERSION = 1;

/** Entrée du catalogue par défaut (specs techniques 7.2). */
export interface CatalogEntry {
  id: string;
  name: string;
  aliases: readonly string[];
  categoryKey: string;
  unitLabel: string;
  packSize: number;
  contentsQty: number | null;
  contentsUnit: string | null;
  /** Rythme indicatif pour une personne : `rateQty` unités par `ratePerDays` jours. */
  rateQty: number | null;
  ratePerDays: number | null;
  /** Gardée pour les produits qui en viennent, plus proposée (7.6). */
  deprecated: boolean;
}

/** Plage plausible d'un rythme du catalogue, en unités par jour (7.3). */
const RATE_RANGE = { min: 0.003, max: 5 };
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FIELDS = new Set([
  'id',
  'name',
  'aliases',
  'category_key',
  'unit_label',
  'pack_size',
  'contents_qty',
  'contents_unit',
  'rate_qty',
  'rate_per_days',
  'deprecated',
]);

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/**
 * Entrées du catalogue au format JSON de 7.2, vérifiées contre les règles de 7.3 ; la première
 * entrée fautive lève une `InvalidInputError`. Les champs facultatifs peuvent être absents.
 */
export function parseCatalog(
  raw: readonly unknown[],
  categoryKeys: ReadonlySet<string> = new Set(DEFAULT_CATEGORIES.map((c) => c.key)),
): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  const ids = new Set<string>();
  /** Nom ou alias normalisé → entrée qui le porte : un mot tapé désigne au plus une entrée. */
  const names = new Map<string, string>();

  raw.forEach((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new InvalidInputError(`catalog[${index}]`, item, 'doit être un objet');
    }
    const record = item as Record<string, unknown>;
    const id = record['id'];
    if (typeof id !== 'string' || !SLUG.test(id)) {
      throw new InvalidInputError(`catalog[${index}].id`, id, 'doit être un slug');
    }
    const field = (name: string) => `catalog[${id}].${name}`;
    if (ids.has(id)) throw new InvalidInputError(field('id'), id, 'apparaît deux fois');
    ids.add(id);
    for (const key of Object.keys(record)) {
      if (!FIELDS.has(key)) throw new InvalidInputError(field(key), key, 'champ inconnu');
    }

    const { name, category_key, unit_label, deprecated } = record;
    const aliases = record['aliases'] ?? [];
    const packSize = record['pack_size'] ?? 1;
    const contentsQty = record['contents_qty'] ?? null;
    const contentsUnit = record['contents_unit'] ?? null;
    const rateQty = record['rate_qty'] ?? null;
    const ratePerDays = record['rate_per_days'] ?? null;

    if (!isText(name)) throw new InvalidInputError(field('name'), name, 'doit être un texte');
    if (!Array.isArray(aliases) || !aliases.every(isText)) {
      throw new InvalidInputError(field('aliases'), aliases, 'doit être une liste de textes');
    }
    if (typeof category_key !== 'string' || !categoryKeys.has(category_key)) {
      throw new InvalidInputError(field('category_key'), category_key, 'doit être un rayon (7.4)');
    }
    if (!isText(unit_label)) {
      throw new InvalidInputError(field('unit_label'), unit_label, 'doit être un texte');
    }
    if (!isPositive(packSize)) {
      throw new InvalidInputError(field('pack_size'), packSize, 'doit être un nombre > 0');
    }
    if ((contentsQty === null) !== (contentsUnit === null)) {
      throw new InvalidInputError(field('contents_qty'), contentsQty, 'va avec contents_unit');
    }
    if (contentsQty !== null && !isPositive(contentsQty)) {
      throw new InvalidInputError(field('contents_qty'), contentsQty, 'doit être un nombre > 0');
    }
    if (contentsUnit !== null && (typeof contentsUnit !== 'string' || !isMeasure(contentsUnit))) {
      throw new InvalidInputError(
        field('contents_unit'),
        contentsUnit,
        'doit être g, kg, ml, cl ou l',
      );
    }
    if ((rateQty === null) !== (ratePerDays === null)) {
      throw new InvalidInputError(field('rate_qty'), rateQty, 'va avec rate_per_days');
    }
    if (rateQty !== null && !isPositive(rateQty)) {
      throw new InvalidInputError(field('rate_qty'), rateQty, 'doit être un nombre > 0');
    }
    if (ratePerDays !== null && !(Number.isInteger(ratePerDays) && isPositive(ratePerDays))) {
      throw new InvalidInputError(field('rate_per_days'), ratePerDays, 'doit être un entier ≥ 1');
    }
    if (isPositive(rateQty) && isPositive(ratePerDays)) {
      const perDay = rateQty / ratePerDays;
      if (perDay < RATE_RANGE.min || perDay > RATE_RANGE.max) {
        throw new InvalidInputError(
          field('rate_qty'),
          perDay,
          'donne un rythme hors de 0,003 à 5 par jour',
        );
      }
    }
    if (deprecated !== undefined && typeof deprecated !== 'boolean') {
      throw new InvalidInputError(field('deprecated'), deprecated, 'doit être un booléen');
    }

    for (const text of [name, ...aliases]) {
      const normalized = normalizeName(text);
      const owner = names.get(normalized);
      if (owner !== undefined && owner !== id) {
        throw new InvalidInputError(field('name'), text, `désigne déjà ${owner}`);
      }
      names.set(normalized, id);
    }

    entries.push({
      id,
      name,
      aliases,
      categoryKey: category_key,
      unitLabel: unit_label,
      packSize,
      contentsQty,
      contentsUnit,
      rateQty,
      ratePerDays,
      deprecated: deprecated === true,
    } as CatalogEntry);
  });
  return entries;
}

/** Catalogue livré, un fichier par rayon dans `catalog/` (7.2). */
export const CATALOG: readonly CatalogEntry[] = parseCatalog([
  ...hygieneBeaute,
  ...bebeAnimaux,
  ...entretienMaison,
  ...fruitsLegumes,
  ...boulangerie,
  ...epicerieSalee,
  ...epicerieSucree,
  ...boissons,
  ...cremerie,
  ...viandePoissonTraiteur,
  ...surgeles,
]);

/** Unité d'un produit créé sans entrée du catalogue (EF-2.8). */
export const DEFAULT_UNIT_LABEL = 'pièce';

/** Colonnes d'un nouveau produit, hors identifiants et dates (specs techniques 3.3). */
export interface ProductDraft {
  name: string;
  nameNormalized: string;
  /** Rayon par sa clé (7.4) ; nul : « À classer ». */
  categoryKey: string | null;
  unitLabel: string;
  packSize: number;
  contentsQty: number | null;
  contentsUnit: string | null;
  catalogEntryId: string | null;
  catalogVersion: number | null;
  catalogQty: number | null;
  catalogPerDays: number | null;
}

/** Produit nommé `name`, repris de `entry` s'il y en a une (EF-2.8, EF-3.7, RG-8). */
export function productDraft(name: string, entry: CatalogEntry | null): ProductDraft {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed === '') throw new InvalidInputError('name', name, 'ne doit pas être vide');
  return {
    name: trimmed,
    nameNormalized: normalizeName(trimmed),
    categoryKey: entry?.categoryKey ?? null,
    unitLabel: entry?.unitLabel ?? DEFAULT_UNIT_LABEL,
    packSize: entry?.packSize ?? 1,
    contentsQty: entry?.contentsQty ?? null,
    contentsUnit: entry?.contentsUnit ?? null,
    catalogEntryId: entry?.id ?? null,
    catalogVersion: entry === null ? null : CATALOG_VERSION,
    catalogQty: entry?.rateQty ?? null,
    catalogPerDays: entry?.ratePerDays ?? null,
  };
}
