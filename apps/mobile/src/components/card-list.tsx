import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useMemo, type ReactNode, type Ref } from 'react';
import { View } from 'react-native';

/** Une entrée de la liste : `card` la range dans la carte qui la précède ; sinon elle la ferme. */
export interface CardEntry<T> {
  key: string;
  /** Même type, même gabarit : FlashList recycle les vues entre entrées du même type. */
  type: string;
  card: boolean;
  item: T;
}

interface Placed<T> extends CardEntry<T> {
  first: boolean;
  last: boolean;
}

export type CardListRef<T> = FlashListRef<Placed<T>>;

/**
 * Longue liste en cartes (components.md, RowGroup) rendue par FlashList : une carte ne peut pas
 * envelopper des lignes recyclées, alors chaque entrée en dessine sa tranche (bords, haut
 * arrondi pour la première, bas arrondi pour la dernière). Gouttière `space-4` comme `Screen`,
 * sauf `gutter={false}` : l'entrée pose la sienne.
 */
export function CardList<T>({
  entries,
  render,
  header,
  footer,
  listRef,
  gutter = true,
}: {
  entries: readonly CardEntry<T>[];
  render: (item: T) => ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  listRef?: Ref<CardListRef<T>>;
  gutter?: boolean;
}) {
  const side = gutter ? 'px-4' : '';
  const placed = useMemo(
    () =>
      entries.map((entry, i): Placed<T> => ({
        ...entry,
        first: entry.card && entries[i - 1]?.card !== true,
        last: entry.card && entries[i + 1]?.card !== true,
      })),
    [entries],
  );
  return (
    <FlashList
      ref={listRef ?? null}
      data={placed}
      keyExtractor={(entry) => entry.key}
      getItemType={(entry) => entry.type}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        header === undefined ? undefined : <View className={`gap-3 pb-3 ${side}`}>{header}</View>
      }
      ListFooterComponent={<View className={`gap-3 pb-8 pt-3 ${side}`}>{footer}</View>}
      renderItem={({ item: entry }) =>
        entry.card ? (
          <View className={side}>
            <View
              className={`overflow-hidden border-x-thin border-line bg-surface ${
                entry.first ? 'rounded-t-card border-t-thin' : ''
              } ${entry.last ? 'rounded-b-card border-b-thin' : ''}`}
            >
              {render(entry.item)}
            </View>
          </View>
        ) : (
          <View className={side}>{render(entry.item)}</View>
        )
      }
    />
  );
}
