import { productsByPurchases, search, type CatalogEntry, type SearchResult } from '@commedab/core';
import { Plus } from 'phosphor-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Button } from '../../components/button';
import { Glyph } from '../../components/icons';
import { Divider, ListRow, RowGroup } from '../../components/list-row';
import { Pressable } from '../../components/pressable';
import { Text } from '../../components/text';
import { shortEstimate } from '../../copy/estimate';
import type { Engine } from '../../data/engine';

/** Ce que l'utilisateur choisit : un produit à lui, une entrée du catalogue, ou un nom à créer. */
export type IngredientPick =
  | { kind: 'product'; productId: string }
  | { kind: 'catalog'; entry: CatalogEntry }
  | { kind: 'create'; name: string; entry: CatalogEntry | null };

/** Résultats à la frappe : la recherche du panneau Ajouter, sans les recettes. */
export function ingredientResults(engine: Engine, query: string): SearchResult[] {
  return search({
    query,
    products: engine.products.map((p) => ({
      id: p.id,
      name: p.name,
      catalogEntryId: p.catalogEntryId,
      archivedAt: p.archivedAt,
      purchaseCount: engine.purchaseCount(p.id),
    })),
  });
}

/**
 * Produits proposés comme ingrédients (EF-4.2) : avant saisie, « Tous tes produits » du plus
 * acheté au moins acheté ; à la frappe, la même recherche que le panneau Ajouter, sans les
 * recettes, « Créer « … » » en dernier. Un produit déjà dans la recette reste affiché, marqué
 * « Ajouté ».
 */
export function IngredientSearch({
  engine,
  query,
  added,
  onPick,
}: {
  engine: Engine;
  query: string;
  /** Produits déjà dans la recette. */
  added: ReadonlySet<string>;
  onPick: (pick: IngredientPick) => void;
}) {
  const browsing = query.trim() === '';
  const results = useMemo((): SearchResult[] => {
    if (!browsing) return ingredientResults(engine, query);
    return productsByPurchases(
      engine.products.map((p) => ({
        id: p.id,
        name: p.name,
        catalogEntryId: p.catalogEntryId,
        archivedAt: p.archivedAt,
        purchaseCount: engine.purchaseCount(p.id),
      })),
    ).map((product) => ({ kind: 'product', product }));
  }, [engine, query, browsing]);
  if (results.length === 0) {
    return (
      <Text variant="body-sm" tone="muted" className="pt-4">
        Cherche un produit pour le mettre dans ta recette.
      </Text>
    );
  }
  const accessory = (productId: string) =>
    added.has(productId) ? (
      <Text variant="label" tone="action">
        Ajouté
      </Text>
    ) : (
      <Button
        variant="outline"
        label="Ajouter"
        onPress={() => onPick({ kind: 'product', productId })}
      />
    );

  return (
    <>
      {browsing && (
        <View className="flex-row items-baseline justify-between pt-2">
          <Text variant="title-section">Tous tes produits</Text>
          <Text variant="caption" tone="muted">
            {`${results.length} · du plus acheté`}
          </Text>
        </View>
      )}
      <RowGroup>
        {results.map((result, index) => {
          const divider = index > 0 && <Divider />;
          switch (result.kind) {
            case 'recipe':
            case 'createRecipe':
              return null;
            case 'product': {
              const product = engine.productById.get(result.product.id);
              const estimate =
                product === undefined
                  ? null
                  : shortEstimate(product, engine.states.get(product.id), engine.now);
              return (
                <View key={`p-${result.product.id}`}>
                  {divider}
                  <ListRow
                    checkbox={false}
                    highlight={result.exact === true}
                    name={result.product.name}
                    subtitle={estimate?.text}
                    subtitleTone={estimate?.tone ?? 'muted'}
                    accessory={accessory(result.product.id)}
                  />
                </View>
              );
            }
            case 'catalog':
              return (
                <View key={`c-${result.entry.id}`}>
                  {divider}
                  <ListRow
                    checkbox={false}
                    highlight={result.exact === true}
                    name={result.entry.name}
                    subtitle="Catalogue"
                    accessory={
                      <Button
                        variant="outline"
                        label="Ajouter"
                        onPress={() => onPick({ kind: 'catalog', entry: result.entry })}
                      />
                    }
                  />
                </View>
              );
            case 'create':
              return (
                <View key="create">
                  {divider}
                  <Pressable
                    feedback="highlight"
                    onPress={() =>
                      onPick({ kind: 'create', name: result.name, entry: result.entry })
                    }
                    className="min-h-row flex-row items-center justify-between gap-3 px-4 py-2"
                  >
                    <Text variant="body-strong" tone="action" className="flex-1">
                      {`Créer « ${result.name} »`}
                    </Text>
                    <Glyph icon={Plus} color="ink-muted" />
                  </Pressable>
                </View>
              );
          }
        })}
      </RowGroup>
    </>
  );
}
