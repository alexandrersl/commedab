import { describe, expect, it } from 'vitest';
import {
  parseCatalog,
  productsByPurchases,
  search,
  type SearchableProduct,
  type SearchResult,
} from '../src/index';

const catalog = parseCatalog([
  {
    id: 'lait-demi-ecreme',
    name: 'Lait demi-écrémé',
    aliases: ['lait'],
    category_key: 'cremerie',
    unit_label: 'bouteille',
  },
  { id: 'lait-de-coco', name: 'Lait de coco', category_key: 'epicerie-salee', unit_label: 'boîte' },
  {
    id: 'chocolat-au-lait',
    name: 'Chocolat au lait',
    category_key: 'epicerie-sucree',
    unit_label: 'tablette',
  },
  {
    id: 'papier-toilette',
    name: 'Papier toilette',
    aliases: ['PQ'],
    category_key: 'hygiene-beaute',
    unit_label: 'rouleau',
  },
  {
    id: 'soda-cola',
    name: 'Soda au cola',
    aliases: ['coca'],
    category_key: 'boissons',
    unit_label: 'bouteille',
  },
  {
    id: 'ancien',
    name: 'Laitage ancien',
    category_key: 'cremerie',
    unit_label: 'pot',
    deprecated: true,
  },
]);

function product(
  id: string,
  name: string,
  more: Partial<SearchableProduct> = {},
): SearchableProduct {
  return { id, name, catalogEntryId: null, archivedAt: null, purchaseCount: 0, ...more };
}

function labels(results: SearchResult[]): string[] {
  return results.map((r) => {
    switch (r.kind) {
      case 'recipe':
        return `recette:${r.recipe.name}`;
      case 'product':
        return `produit:${r.product.name}`;
      case 'catalog':
        return `catalogue:${r.entry.name}`;
      case 'create':
        return `créer:${r.name}${r.entry === null ? '' : `<${r.entry.id}`}`;
    }
  });
}

describe('recherche du panneau Ajouter (specs techniques 7.5)', () => {
  it('ordonne recettes, produits, catalogue, puis « Créer »', () => {
    const results = search({
      query: 'lait',
      recipes: [{ id: 'r', name: 'Riz au lait' }],
      products: [product('p', 'Lait d’amande')],
      catalog,
    });
    expect(labels(results)).toEqual([
      'recette:Riz au lait',
      'produit:Lait d’amande',
      'catalogue:Chocolat au lait',
      'catalogue:Lait de coco',
      'catalogue:Lait demi-écrémé',
      'créer:Lait demi-écrémé<lait-demi-ecreme',
    ]);
  });

  it('place un début de mot devant un nom qui contient la requête, puis les plus achetés', () => {
    const products = [
      product('a', 'Volaille', { purchaseCount: 9 }),
      product('b', 'Ail', { purchaseCount: 2 }),
      product('c', 'Gousses d’ail', { purchaseCount: 5 }),
    ];
    expect(labels(search({ query: 'ail', products, catalog: [] }))).toEqual([
      'produit:Gousses d’ail',
      'produit:Ail',
      'produit:Volaille',
    ]);
  });

  it('ignore casse, accents et ponctuation, et cherche dans les alias', () => {
    expect(labels(search({ query: 'ÉCRÉMÉ', products: [], catalog }))).toEqual([
      'catalogue:Lait demi-écrémé',
      'créer:ÉCRÉMÉ',
    ]);
    expect(labels(search({ query: 'coca', products: [], catalog }))).toEqual([
      'catalogue:Soda au cola',
      'créer:Soda au cola<soda-cola',
    ]);
  });

  it('ne propose plus une entrée dont un produit est tiré, ni une entrée retirée', () => {
    const products = [
      product('p1', 'Lait', { catalogEntryId: 'lait-demi-ecreme' }),
      product('p2', 'lait de coco'),
    ];
    expect(labels(search({ query: 'lait', products, catalog }))).toEqual([
      'produit:Lait',
      'produit:lait de coco',
      'catalogue:Chocolat au lait',
    ]);
  });

  it('crée sans entrée quand l’alias tapé désigne une entrée déjà utilisée', () => {
    const products = [product('p', 'PQ recyclé', { catalogEntryId: 'papier-toilette' })];
    expect(labels(search({ query: 'pq', products, catalog }))).toEqual([
      'produit:PQ recyclé',
      'créer:pq',
    ]);
  });

  it('ne propose pas « Créer » pour le nom exact d’un produit, archivé compris', () => {
    const products = [product('p', 'Graines de chia', { archivedAt: '2026-10-01T10:00:00' })];
    expect(labels(search({ query: ' graines  DE chia', products, catalog }))).toEqual([
      'produit:Graines de chia',
    ]);
  });

  it('nettoie le nom à créer et ne renvoie rien pour une requête vide', () => {
    expect(labels(search({ query: '  pain   de seigle ', products: [], catalog }))).toEqual([
      'créer:pain de seigle',
    ]);
    expect(search({ query: ' - ', products: [], catalog })).toEqual([]);
  });
});

describe('« Tous tes produits » (EF-2.2)', () => {
  it('liste les produits non archivés, du plus acheté au moins acheté', () => {
    const products = [
      product('a', 'Beurre', { purchaseCount: 2 }),
      product('b', 'Œufs', { purchaseCount: 5 }),
      product('c', 'Ancien', { purchaseCount: 9, archivedAt: '2026-10-01T10:00:00' }),
      product('d', 'Ail', { purchaseCount: 2 }),
    ];
    expect(productsByPurchases(products).map((p) => p.id)).toEqual(['b', 'd', 'a']);
  });
});
