import {
  productsByPurchases,
  search,
  type CatalogEntry,
  type SearchableProduct,
  type SearchResult,
  type Suggestion,
} from '@commedab/core';
import { Plus } from 'phosphor-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable as RNPressable, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddControl } from '../../components/add-control';
import { CardList, type CardEntry } from '../../components/card-list';
import { Glyph } from '../../components/icons';
import { Divider, ListRow } from '../../components/list-row';
import { Badge, Pill } from '../../components/pill';
import { Pressable } from '../../components/pressable';
import { SearchField } from '../../components/search-field';
import { OptionSheet } from '../../components/setting-field';
import { SkeletonRows } from '../../components/states';
import { SuggestionRow } from '../../components/suggestion-row';
import { Text } from '../../components/text';
import { shortEstimate, suggestionReason } from '../../copy/estimate';
import { displayUnit, packsLabel } from '../../copy/words';
import { useEngine } from '../../data/engine';
import { useData, usePendingIds } from '../../data/provider';
import { useWrite } from '../../data/use-write';
import { size, space, useTheme } from '../../theme';

/** Rayons proposés sous un produit créé à la volée, avant « Autre… » (EF-2.8). */
const PROPOSED_CATEGORIES = 3;
/** Unités proposées sous un produit créé à la volée ; les autres restent sur la fiche. */
const PROPOSED_UNITS = ['pièce', 'g', 'kg', 'cl', 'l'] as const;

function Title({ children, meta }: { children: string; meta?: string }) {
  return (
    <View className="flex-row items-baseline justify-between pb-1 pt-4">
      <Text variant="title-section">{children}</Text>
      {meta !== undefined && (
        <Text variant="caption" tone="muted">
          {meta}
        </Text>
      )}
    </View>
  );
}

function resultKey(result: SearchResult): string {
  switch (result.kind) {
    case 'recipe':
      return `recipe-${result.recipe.id}`;
    case 'product':
      return `product-${result.product.id}`;
    case 'catalog':
      return `catalog-${result.entry.id}`;
    case 'create':
      return 'create';
  }
}

/** Une entrée du panneau : un titre, ou une ligne et le séparateur qui la précède. */
type Entry =
  { kind: 'title'; node: ReactNode } | { kind: 'row'; node: ReactNode; divider: boolean };

function rowsOf(prefix: string, rows: { key: string; node: ReactNode }[]) {
  return rows.map(({ key, node }, i): CardEntry<Entry> => ({
    key: `${prefix}-${key}`,
    type: 'row',
    card: false,
    item: { kind: 'row', node, divider: i > 0 },
  }));
}

/**
 * Le panneau Ajouter (EF-2.1 à EF-2.11) : avant saisie, les suggestions en entier puis
 * « Tous tes produits » ; à la frappe, recettes, produits, catalogue et « Créer « … » ».
 */
export function AddPanel({ onClose }: { onClose: () => void }) {
  const engine = useEngine();
  const data = useData();
  const write = useWrite();
  const pending = usePendingIds();
  const { duration } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [created, setCreated] = useState<string | null>(null);
  const [choosingCategory, setChoosingCategory] = useState(false);
  // Les suggestions restent à leur place jusqu'à la fermeture, même ajoutées (SuggestionRow).
  const [suggestions] = useState<Suggestion[]>(() => engine.suggestions);

  const searchable: SearchableProduct[] = useMemo(
    () =>
      engine.products.map((p) => ({
        id: p.id,
        name: p.name,
        catalogEntryId: p.catalogEntryId,
        archivedAt: p.archivedAt,
        purchaseCount: engine.purchaseCount(p.id),
      })),
    [engine],
  );
  const results = useMemo(
    () => search({ query, recipes: engine.recipes, products: searchable }),
    [query, engine.recipes, searchable],
  );
  const everything = useMemo(() => productsByPurchases(searchable), [searchable]);

  const lineOf = (productId: string) => engine.pendingLineOf(productId);
  const quantityOf = (productId: string) => lineOf(productId)?.quantity ?? null;
  const labelOf = (productId: string) => {
    const product = engine.productById.get(productId);
    return product === undefined ? undefined : (n: number) => packsLabel(product, n);
  };
  const change = (productId: string, next: number, add: () => Promise<unknown>) => {
    const line = lineOf(productId);
    write(() => (line === undefined ? add() : data.list.setLineQuantity(line.id, next)));
  };
  const productControl = (productId: string) => (
    <AddControl
      quantity={quantityOf(productId)}
      quantityLabel={labelOf(productId)}
      pending={pending.has(lineOf(productId)?.id ?? '')}
      onChange={(next) => change(productId, next, () => data.list.addProduct(productId, next))}
    />
  );
  const productSubtitle = (productId: string) => {
    const product = engine.productById.get(productId);
    if (product === undefined) return null;
    const line = lineOf(productId);
    if (line !== undefined) {
      const recipe = line.recipeId === null ? undefined : engine.recipeById.get(line.recipeId);
      return recipe === undefined ? 'Sur la liste' : `Sur la liste · ${recipe.name}`;
    }
    return shortEstimate(product, engine.states.get(productId), engine.now).text;
  };

  const create = (name: string, entry: CatalogEntry | null, fromCreate: boolean) =>
    write(async () => {
      const id = await data.products.createProduct({ name, entry, addToList: true });
      if (fromCreate) {
        setCreated(id);
        setQuery('');
      }
    });

  const renderResult = (result: SearchResult) => {
    switch (result.kind) {
      case 'recipe': {
        const missing = engine.missingOf(result.recipe.id).length;
        const listRecipe = engine.listRecipeOf(result.recipe.id);
        return (
          <ListRow
            card={false}
            checkbox={false}
            name={result.recipe.name}
            subtitle={
              missing === 0
                ? "Recette · tu as tout ce qu'il faut"
                : `Recette · il te manque ${missing} ingrédient${missing > 1 ? 's' : ''}`
            }
            accessory={
              <View>
                <AddControl
                  quantity={listRecipe?.times ?? null}
                  onChange={(times) =>
                    write(() =>
                      data.list.setRecipeTimes({
                        recipeId: result.recipe.id,
                        listRecipeId: listRecipe?.id ?? null,
                        times,
                      }),
                    )
                  }
                />
              </View>
            }
          />
        );
      }
      case 'product':
        return (
          <ListRow
            card={false}
            checkbox={false}
            name={result.product.name}
            subtitle={productSubtitle(result.product.id)}
            accessory={productControl(result.product.id)}
          />
        );
      case 'catalog':
        return (
          <ListRow
            card={false}
            checkbox={false}
            name={result.entry.name}
            subtitle="Catalogue"
            accessory={
              <AddControl
                quantity={null}
                onChange={() => create(result.entry.name, result.entry, false)}
              />
            }
          />
        );
      case 'create':
        return (
          <Pressable
            onPress={() => create(result.name, result.entry, true)}
            accessibilityLabel={`Créer « ${result.name} »`}
            className="min-h-row flex-row items-center gap-3 px-4 py-2"
          >
            <View className="flex-1">
              <Text variant="body-strong" tone="action">
                {`Créer « ${result.name} »`}
              </Text>
              <Text variant="caption" tone="muted">
                Dans « À classer », tu pourras ranger plus tard
              </Text>
            </View>
            <Glyph icon={Plus} color="ink-muted" />
          </Pressable>
        );
    }
  };

  const createdProduct = created === null ? undefined : engine.productById.get(created);
  const proposedCategories = useMemo(() => {
    const used = new Map<string, number>();
    for (const p of engine.products) {
      if (p.categoryId !== null) used.set(p.categoryId, (used.get(p.categoryId) ?? 0) + 1);
    }
    return [...engine.categories]
      .sort((a, b) => (used.get(b.id) ?? 0) - (used.get(a.id) ?? 0) || a.position - b.position)
      .slice(0, PROPOSED_CATEGORIES);
  }, [engine.products, engine.categories]);

  let header: ReactNode = null;
  let entries: CardEntry<Entry>[] = [];
  if (createdProduct !== undefined && query === '') {
    header = (
      <View className="gap-3 px-4 pt-4">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text variant="body-strong">{createdProduct.name}</Text>
              <Badge value="NEW" tone="alert" />
            </View>
            <Text variant="caption" tone="muted">
              Créé et ajouté à la liste
            </Text>
          </View>
          {productControl(createdProduct.id)}
        </View>
        <Text variant="body-sm" tone="muted">
          Dans quel rayon ? (facultatif)
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {proposedCategories.map((category) => (
            <Pill
              key={category.id}
              kind="choice"
              label={category.name}
              selected={createdProduct.categoryId === category.id}
              onPress={() =>
                write(() =>
                  data.products.updateProduct(createdProduct.id, { categoryId: category.id }),
                )
              }
            />
          ))}
          <Pill kind="choice" label="Autre…" onPress={() => setChoosingCategory(true)} />
        </View>
        <Text variant="body-sm" tone="muted">
          Unité
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {PROPOSED_UNITS.map((unit) => (
            <Pill
              key={unit}
              kind="choice"
              label={unit === 'pièce' ? 'Pièce' : displayUnit(unit)}
              selected={createdProduct.unitLabel === unit}
              onPress={() =>
                write(() => data.products.updateProduct(createdProduct.id, { unitLabel: unit }))
              }
            />
          ))}
        </View>
        <OptionSheet
          visible={choosingCategory}
          title="Rayon"
          options={engine.categories.map((c) => ({ value: c.id, label: c.name }))}
          selected={createdProduct.categoryId}
          onSelect={(categoryId) =>
            write(() => data.products.updateProduct(createdProduct.id, { categoryId }))
          }
          onClose={() => setChoosingCategory(false)}
        />
      </View>
    );
  } else if (query.trim() !== '') {
    entries = rowsOf(
      'result',
      results.map((result) => ({ key: resultKey(result), node: renderResult(result) })),
    );
  } else if (engine.loading) {
    header = (
      <View className="px-4 pt-4">
        <Title>{"Comme d'hab chef ?"}</Title>
        <SkeletonRows count={2} header={false} />
      </View>
    );
  } else {
    const title = (key: string, node: ReactNode): CardEntry<Entry> => ({
      key,
      type: key,
      card: false,
      item: { kind: 'title', node },
    });
    entries = [
      ...(suggestions.length > 0
        ? [
            title(
              'suggestions',
              <View className="pb-1 pt-4">
                <Text variant="sentence-lg">{"Comme d'hab chef ?"}</Text>
              </View>,
            ),
            ...rowsOf(
              'suggestion',
              suggestions.flatMap((suggestion) => {
                const product = engine.productById.get(suggestion.productId);
                const state = engine.states.get(suggestion.productId);
                if (product === undefined || state === undefined) return [];
                return [
                  {
                    key: product.id,
                    node: (
                      <SuggestionRow
                        name={product.name}
                        reason={suggestionReason(product, state, engine.now)}
                        suggested={suggestion.quantity}
                        quantity={quantityOf(product.id)}
                        quantityLabel={labelOf(product.id)}
                        pending={pending.has(lineOf(product.id)?.id ?? '')}
                        onChange={(next) =>
                          change(product.id, next, () =>
                            data.list.acceptSuggestion(product.id, next),
                          )
                        }
                      />
                    ),
                  },
                ];
              }),
            ),
          ]
        : []),
      ...(everything.length > 0
        ? [
            title(
              'everything',
              <Title meta={`${everything.length} · du plus acheté`}>Tous tes produits</Title>,
            ),
            ...rowsOf(
              'product',
              everything.map((product) => ({
                key: product.id,
                node: (
                  <ListRow
                    card={false}
                    checkbox={false}
                    name={product.name}
                    subtitle={productSubtitle(product.id)}
                    accessory={productControl(product.id)}
                  />
                ),
              })),
            ),
          ]
        : []),
    ];
  }

  return (
    <View className="absolute bottom-0 left-0 right-0 top-0">
      <RNPressable
        accessibilityRole="button"
        accessibilityLabel="Fermer"
        onPress={onClose}
        className="bg-scrim"
        style={{ height: insets.top + size.row * 2 }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          entering={SlideInDown.duration(duration.base)}
          className="flex-1 overflow-hidden rounded-t-sheet bg-ground"
        >
          <CardList
            // Une requête, une liste : FlashList 2.3 perd ses mesures quand des résultats sans
            // rapport remplacent les précédents à la frappe (« index out of bounds »).
            key={query.trim()}
            gutter={false}
            entries={entries}
            header={header}
            render={(entry) =>
              entry.kind === 'title' ? (
                <View className="px-4">{entry.node}</View>
              ) : (
                <>
                  {entry.divider && <Divider />}
                  {entry.node}
                </>
              )
            }
          />
          <View
            className="border-t-thin border-line bg-surface px-4 py-2"
            style={{ paddingBottom: Math.max(insets.bottom, space['2']) }}
          >
            <SearchField value={query} onChange={setQuery} onClose={onClose} autoFocus />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
