import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  CATALOG_VERSION,
  DEFAULT_CATEGORIES,
  InvalidInputError,
  normalizeName,
  parseCatalog,
  productDraft,
} from '../src/index';

const entry = {
  id: 'lait-demi-ecreme',
  name: 'Lait demi-écrémé',
  aliases: ['lait'],
  category_key: 'cremerie',
  unit_label: 'bouteille',
  pack_size: 6,
  contents_qty: 1,
  contents_unit: 'l',
  rate_qty: 1,
  rate_per_days: 7,
};

function rejects(raw: unknown[], field: string): void {
  expect(() => parseCatalog(raw)).toThrow(InvalidInputError);
  expect(() => parseCatalog(raw)).toThrow(expect.objectContaining({ field }));
}

describe('catalogue livré (specs techniques 7.3)', () => {
  it('compte 250 à 300 entrées, toutes valides au chargement', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(250);
    expect(CATALOG.length).toBeLessThanOrEqual(300);
  });

  it('couvre chaque rayon par défaut', () => {
    const used = new Set(CATALOG.map((e) => e.categoryKey));
    for (const category of DEFAULT_CATEGORIES) expect(used.has(category.key)).toBe(true);
  });
});

describe('validation du catalogue', () => {
  it('lit une entrée complète et complète une entrée minimale', () => {
    const minimal = {
      id: 'sel',
      name: 'Sel',
      category_key: 'epicerie-salee',
      unit_label: 'paquet',
    };
    expect(parseCatalog([entry, minimal])).toEqual([
      {
        id: 'lait-demi-ecreme',
        name: 'Lait demi-écrémé',
        aliases: ['lait'],
        categoryKey: 'cremerie',
        unitLabel: 'bouteille',
        packSize: 6,
        contentsQty: 1,
        contentsUnit: 'l',
        rateQty: 1,
        ratePerDays: 7,
        deprecated: false,
      },
      {
        id: 'sel',
        name: 'Sel',
        aliases: [],
        categoryKey: 'epicerie-salee',
        unitLabel: 'paquet',
        packSize: 1,
        contentsQty: null,
        contentsUnit: null,
        rateQty: null,
        ratePerDays: null,
        deprecated: false,
      },
    ]);
  });

  it.each([
    [{ ...entry, id: 'Lait' }, 'catalog[0].id'],
    [{ ...entry, marque: 'x' }, 'catalog[lait-demi-ecreme].marque'],
    [{ ...entry, category_key: 'rayon' }, 'catalog[lait-demi-ecreme].category_key'],
    [{ ...entry, pack_size: 0 }, 'catalog[lait-demi-ecreme].pack_size'],
    [{ ...entry, contents_unit: undefined }, 'catalog[lait-demi-ecreme].contents_qty'],
    [{ ...entry, contents_unit: 'pièce' }, 'catalog[lait-demi-ecreme].contents_unit'],
    [{ ...entry, rate_per_days: undefined }, 'catalog[lait-demi-ecreme].rate_qty'],
    [{ ...entry, rate_per_days: 1.5 }, 'catalog[lait-demi-ecreme].rate_per_days'],
    [{ ...entry, rate_qty: 6, rate_per_days: 1 }, 'catalog[lait-demi-ecreme].rate_qty'],
    [{ ...entry, rate_qty: 1, rate_per_days: 400 }, 'catalog[lait-demi-ecreme].rate_qty'],
  ])('refuse une entrée fautive (%#)', (raw, field) => {
    rejects([raw], field);
  });

  it('refuse un identifiant, un nom ou un alias en double', () => {
    rejects([entry, entry], 'catalog[lait-demi-ecreme].id');
    rejects([entry, { ...entry, id: 'lait-2', aliases: [] }], 'catalog[lait-2].name');
    rejects(
      [entry, { ...entry, id: 'lait-entier', name: 'Lait entier', aliases: ['Lait'] }],
      'catalog[lait-entier].name',
    );
  });
});

describe('noms normalisés', () => {
  it('ignore casse, accents, ligatures et ponctuation', () => {
    expect(normalizeName('  Œufs  frais ')).toBe('oeufs frais');
    expect(normalizeName("Huile d'olive")).toBe('huile d olive');
    expect(normalizeName('Lait demi-écrémé')).toBe('lait demi ecreme');
  });
});

describe('nouveau produit (EF-2.8, EF-3.7)', () => {
  it('sans entrée : à classer, à la pièce, par pack de 1, sans rythme', () => {
    expect(productDraft('  Graines  de chia ', null)).toEqual({
      name: 'Graines de chia',
      nameNormalized: 'graines de chia',
      categoryKey: null,
      unitLabel: 'pièce',
      packSize: 1,
      contentsQty: null,
      contentsUnit: null,
      catalogEntryId: null,
      catalogVersion: null,
      catalogQty: null,
      catalogPerDays: null,
    });
  });

  it('depuis une entrée : en reprend rayon, unité, pack, contenance et rythme', () => {
    const [lait] = parseCatalog([entry]);
    expect(productDraft('Lait demi-écrémé', lait ?? null)).toMatchObject({
      categoryKey: 'cremerie',
      unitLabel: 'bouteille',
      packSize: 6,
      contentsQty: 1,
      contentsUnit: 'l',
      catalogEntryId: 'lait-demi-ecreme',
      catalogVersion: CATALOG_VERSION,
      catalogQty: 1,
      catalogPerDays: 7,
    });
  });

  it('refuse un nom vide', () => {
    expect(() => productDraft('   ', null)).toThrow(InvalidInputError);
  });
});
