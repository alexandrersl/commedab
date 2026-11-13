import { normalizeName } from '@commedab/core';
import type { ProductRecord } from '@commedab/data';
import { router } from 'expo-router';
import { Archive, Basket, CaretDown, CaretRight, CaretUp } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Button } from '../../components/button';
import { CardList, type CardEntry } from '../../components/card-list';
import { Glyph } from '../../components/icons';
import { ListRow, SectionHeader } from '../../components/list-row';
import { Pressable } from '../../components/pressable';
import { Screen } from '../../components/screen';
import { ScreenHeader } from '../../components/screen-header';
import { SearchField } from '../../components/search-field';
import { EmptyState, OfflineBanner, SkeletonRows } from '../../components/states';
import { Text } from '../../components/text';
import { since } from '../../copy/dates';
import { shortEstimate } from '../../copy/estimate';
import { useEngine } from '../../data/engine';
import { useData, usePendingIds, useSyncStatus } from '../../data/provider';
import { useProductRemoval } from '../../screens/products/removal';
import { useWrite } from '../../data/use-write';
import { size } from '../../theme';

interface Group {
  key: string;
  name: string;
  categoryKey: string | null;
  products: ProductRecord[];
}

type Entry =
  | { kind: 'section'; group: Group }
  | { kind: 'product'; product: ProductRecord }
  | { kind: 'archived-title'; count: number }
  | { kind: 'archived'; product: ProductRecord };

/**
 * L'annuaire (EF-3.1) : les produits non archivés groupés par rayon, dans l'ordre du magasin,
 * avec ce qu'il en reste ; en pied, la carte « Tu n'achètes plus » (EF-3.8), repliée tant
 * qu'on ne la tape pas ou qu'on ne cherche pas, avec « Reprendre » pour chaque produit.
 * Glisser une ligne à gauche archive un produit déjà acheté, supprime les autres (EF-3.10).
 */
export default function Products() {
  const engine = useEngine();
  const { online } = useSyncStatus();
  const pending = usePendingIds();
  const data = useData();
  const write = useWrite();
  const [query, setQuery] = useState('');
  const [archivedOpen, setArchivedOpen] = useState(false);
  const removal = useProductRemoval();

  const active = useMemo(
    () => engine.products.filter((product) => product.archivedAt === null),
    [engine.products],
  );
  const archivedCount = engine.products.length - active.length;
  const searching = normalizeName(query) !== '';
  const archived = useMemo(() => {
    const q = normalizeName(query);
    return engine.products.filter(
      (product) => product.archivedAt !== null && normalizeName(product.name).includes(q),
    );
  }, [engine.products, query]);

  const groups = useMemo<Group[]>(() => {
    const q = normalizeName(query);
    const shown = q === '' ? active : active.filter((p) => normalizeName(p.name).includes(q));
    const byCategory = new Map<string | null, ProductRecord[]>();
    for (const product of shown) {
      const key =
        product.categoryId !== null && engine.categoryById.has(product.categoryId)
          ? product.categoryId
          : null;
      byCategory.set(key, [...(byCategory.get(key) ?? []), product]);
    }
    const ordered: Group[] = [];
    const unsorted = byCategory.get(null);
    if (unsorted !== undefined) {
      ordered.push({ key: 'none', name: 'À classer', categoryKey: null, products: unsorted });
    }
    for (const category of engine.categories) {
      const products = byCategory.get(category.id);
      if (products !== undefined) {
        ordered.push({
          key: category.id,
          name: category.name,
          categoryKey: category.key,
          products,
        });
      }
    }
    return ordered;
  }, [active, query, engine.categories, engine.categoryById]);

  const entries = useMemo(
    () => [
      ...groups.flatMap((group, index): CardEntry<Entry>[] => [
        {
          key: `section-${group.key}`,
          type: 'section',
          card: true,
          opens: index > 0,
          item: { kind: 'section', group },
        },
        ...group.products.map((product, i): CardEntry<Entry> => ({
          key: product.id,
          type: 'product',
          card: true,
          item: { kind: 'product', product },
        })),
      ]),
      ...(archived.length === 0
        ? []
        : [
            {
              key: 'archived-title',
              type: 'archived-title',
              card: true,
              opens: groups.length > 0,
              item: { kind: 'archived-title', count: archived.length },
            } satisfies CardEntry<Entry>,
            ...(archivedOpen || searching ? archived : []).map((product): CardEntry<Entry> => ({
              key: product.id,
              type: 'archived',
              card: true,
              item: { kind: 'archived', product },
            })),
          ]),
    ],
    [groups, archived, archivedOpen, searching],
  );

  let state;
  if (engine.error !== null) {
    state = (
      <EmptyState
        title="Impossible de charger tes produits"
        body="Ça ne devrait pas arriver. Réessaie, et si ça continue, dis-le nous depuis les Réglages."
        action={{ label: 'Réessayer', onPress: engine.retry }}
      />
    );
  } else if (engine.loading) {
    state = <SkeletonRows count={5} />;
  } else if (active.length === 0 && archivedCount === 0) {
    state = (
      <EmptyState
        icon={Basket}
        title="Pas encore de produit"
        body="Ils apparaîtront ici au fur et à mesure que tu les ajoutes à ta liste. Je retiendrai tes habitudes."
        action={{ label: 'Ajouter à la liste', onPress: () => router.navigate('/') }}
      />
    );
  }
  const shown = state === undefined;

  const renderEntry = (entry: Entry) => {
    if (entry.kind === 'section') {
      return <SectionHeader name={entry.group.name} categoryKey={entry.group.categoryKey} />;
    }
    if (entry.kind === 'archived-title') {
      return (
        <Pressable
          feedback="highlight"
          onPress={() => {
            if (!searching) setArchivedOpen((open) => !open);
          }}
          accessibilityState={{ expanded: archivedOpen || searching }}
          className={archivedOpen || searching ? '' : 'pb-2'}
        >
          <SectionHeader
            name="Tu n'achètes plus"
            categoryKey={null}
            icon={Archive}
            clear
            trailing={
              <>
                <Text variant="label" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
                  {entry.count}
                </Text>
                <Glyph
                  icon={archivedOpen || searching ? CaretUp : CaretDown}
                  color="ink-muted"
                  size={size['icon-sm']}
                />
              </>
            }
          />
        </Pressable>
      );
    }
    const { product } = entry;
    if (entry.kind === 'archived') {
      const last = engine.states.get(product.id)?.lastPurchaseAt ?? null;
      return (
        <ListRow
          checkbox={false}
          dim
          name={product.name}
          subtitle={last === null ? 'Jamais acheté' : `Dernier achat ${since(last, engine.now)}`}
          pending={pending.has(product.id)}
          onPress={() => router.push(`/product/${product.id}`)}
          onRemove={() => removal.remove(product)}
          removeLabel="Supprimer"
          removeStays={removal.confirms(product)}
          accessory={
            <View className="flex-row items-center gap-3">
              <Button
                variant="outline"
                label="Reprendre"
                onPress={() => void write(() => data.products.resumeBuying(product.id))}
              />
              <Glyph icon={CaretRight} color="ink-muted" size={size['icon-sm']} />
            </View>
          }
        />
      );
    }
    const line = engine.pendingLineOf(product.id);
    const bought = engine.purchaseCount(product.id) > 0;
    const estimate = shortEstimate(product, engine.states.get(product.id), engine.now);
    return (
      <>
        <ListRow
          checkbox={false}
          name={product.name}
          subtitle={line === undefined ? estimate.text : 'Sur la liste'}
          subtitleTone={line === undefined ? estimate.tone : 'muted'}
          pending={pending.has(product.id)}
          onPress={() => router.push(`/product/${product.id}`)}
          onRemove={
            bought
              ? () => void write(() => data.products.stopBuying(product.id))
              : () => removal.remove(product)
          }
          removeLabel={bought ? "Je n'en achète plus" : 'Supprimer'}
          removeStays={!bought && removal.confirms(product)}
          accessory={<Glyph icon={CaretRight} color="ink-muted" size={size['icon-sm']} />}
        />
      </>
    );
  };

  return (
    <Screen list>
      <CardList
        entries={shown ? entries : []}
        render={renderEntry}
        header={
          <>
            <ScreenHeader
              title="Produits"
              meta={engine.loading || active.length === 0 ? undefined : String(active.length)}
            />
            {!online && (
              <OfflineBanner text="Hors ligne · tes modifications seront envoyées plus tard" />
            )}
            {(engine.loading || active.length + archivedCount > 0) && engine.error === null && (
              <View>
                <SearchField value={query} onChange={setQuery} placeholder="Chercher un produit…" />
              </View>
            )}
          </>
        }
        footer={shown ? null : state}
      />
      {removal.sheet}
    </Screen>
  );
}
