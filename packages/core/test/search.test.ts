import { describe, expect, it } from 'vitest';
import {
  parseCatalog,
  productsByPurchases,
  search,
  submitResult,
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
      case 'createRecipe':
        return `créer la recette:${r.name}`;
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
      'catalogue:Lait demi-écrémé',
      'recette:Riz au lait',
      'produit:Lait d’amande',
      'catalogue:Chocolat au lait',
      'catalogue:Lait de coco',
      'créer:Lait demi-écrémé<lait-demi-ecreme',
      'créer la recette:lait',
    ]);
  });

  it('place un début de mot devant un nom qui contient la requête, puis les plus achetés', () => {
    const products = [
      product('a', 'Volaille', { purchaseCount: 9 }),
      product('b', 'Ail', { purchaseCount: 2 }),
      product('c', 'Gousses d’ail', { purchaseCount: 5 }),
    ];
    expect(labels(search({ query: 'ai', products, catalog: [] }))).toEqual([
      'produit:Gousses d’ail',
      'produit:Ail',
      'produit:Volaille',
      'créer:ai',
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

  it('place en tête le produit que la requête nomme, au pluriel près, devant les recettes', () => {
    const products = [
      product('a', 'Pommes dauphines', { purchaseCount: 9 }),
      product('b', 'Pommes', { purchaseCount: 1 }),
    ];
    const results = search({
      query: 'pomme',
      recipes: [{ id: 'r', name: 'Tarte aux pommes' }],
      products,
      catalog: [],
    });
    expect(labels(results)).toEqual([
      'produit:Pommes',
      'recette:Tarte aux pommes',
      'produit:Pommes dauphines',
      'créer:pomme',
      'créer la recette:pomme',
    ]);
    expect(submitResult(results)).toMatchObject({ kind: 'product', product: { id: 'b' } });
  });

  it('n’ajoute rien à la touche Entrée sans nom exact, même quand « Créer » est seul', () => {
    const products = [product('a', 'Pommes'), product('b', 'Pommes dauphines')];
    expect(submitResult(search({ query: 'pom', products, catalog: [] }))).toBeNull();
    expect(submitResult(search({ query: 'kakis', products, catalog: [] }))).toBeNull();
    expect(submitResult(search({ query: 'coca', products, catalog }))).toMatchObject({
      kind: 'catalog',
      entry: { id: 'soda-cola' },
    });
  });

  it('propose de créer la recette quand on cherche des recettes et qu’aucune ne porte ce nom', () => {
    const recipes = [{ id: 'r', name: 'Tarte aux pommes' }];
    expect(labels(search({ query: 'tarte', recipes, products: [], catalog: [] }))).toEqual([
      'recette:Tarte aux pommes',
      'créer:tarte',
      'créer la recette:tarte',
    ]);
    expect(
      labels(search({ query: 'Tarte aux  pommes', recipes, products: [], catalog: [] })),
    ).toEqual(['recette:Tarte aux pommes', 'créer:Tarte aux pommes']);
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
