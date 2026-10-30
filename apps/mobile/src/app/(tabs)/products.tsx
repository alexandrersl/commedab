import { normalizeName } from '@commedab/core';
import type { ProductRecord } from '@commedab/data';
import { router } from 'expo-router';
import { Basket, CaretRight } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { CardList, type CardEntry } from '../../components/card-list';
import { Glyph } from '../../components/icons';
import { Divider, ListRow, SectionHeader } from '../../components/list-row';
import { Pressable } from '../../components/pressable';
import { Screen } from '../../components/screen';
import { ScreenHeader } from '../../components/screen-header';
import { SearchField } from '../../components/search-field';
import { EmptyState, OfflineBanner, SkeletonRows } from '../../components/states';
import { Text } from '../../components/text';
import { shortEstimate } from '../../copy/estimate';
import { useEngine } from '../../data/engine';
import { usePendingIds, useSyncStatus } from '../../data/provider';
import { size } from '../../theme';

interface Group {
  key: string;
  name: string;
  categoryKey: string | null;
  products: ProductRecord[];
}

type Entry =
  { kind: 'section'; group: Group } | { kind: 'product'; product: ProductRecord; divider: boolean };

/**
 * L'annuaire (EF-3.1) : les produits non archivés groupés par rayon, dans l'ordre du magasin,
 * avec ce qu'il en reste ; un lien en pied vers ceux qu'on n'achète plus.
 */
export default function Products() {
  const engine = useEngine();
  const { online } = useSyncStatus();
  const pending = usePendingIds();
  const [query, setQuery] = useState('');

  const active = useMemo(
    () => engine.products.filter((product) => product.archivedAt === null),
    [engine.products],
  );
  const archivedCount = engine.products.length - active.length;

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
    () =>
      groups.flatMap((group): CardEntry<Entry>[] => [
        {
          key: `section-${group.key}`,
          type: 'section',
          card: true,
          item: { kind: 'section', group },
        },
        ...group.products.map((product, i): CardEntry<Entry> => ({
          key: product.id,
          type: 'product',
          card: true,
          item: { kind: 'product', product, divider: i > 0 },
        })),
      ]),
    [groups],
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
    const { product } = entry;
    const line = engine.pendingLineOf(product.id);
    const estimate = shortEstimate(product, engine.states.get(product.id), engine.now);
    return (
      <>
        {entry.divider && <Divider />}
        <ListRow
          checkbox={false}
          name={product.name}
          subtitle={line === undefined ? estimate.text : 'Sur la liste'}
          subtitleTone={line === undefined ? estimate.tone : 'muted'}
          pending={pending.has(product.id)}
          onPress={() => router.push(`/product/${product.id}`)}
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
            {(engine.loading || active.length > 0) && engine.error === null && (
              <View>
                <SearchField value={query} onChange={setQuery} placeholder="Chercher un produit…" />
              </View>
            )}
          </>
        }
        footer={
          shown
            ? archivedCount > 0 && (
                <Pressable
                  onPress={() => router.push('/products-archived')}
                  className="min-h-control flex-row items-center justify-center gap-1"
                >
                  <Text variant="body-sm" tone="muted">
                    {`Tu n'achètes plus ${archivedCount} produit${archivedCount > 1 ? 's' : ''}`}
                  </Text>
                  <Glyph icon={CaretRight} color="ink-muted" size={size['icon-sm']} />
                </Pressable>
              )
            : state
        }
      />
    </Screen>
  );
}
