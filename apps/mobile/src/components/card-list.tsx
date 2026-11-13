import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useMemo, type ReactNode, type Ref } from 'react';
import { View } from 'react-native';
import { tokens } from '../theme';
import { closeSwipedRow } from './swipe-row';

/**
 * Une entrée de la liste : `card` la range dans la carte qui la précède ; sinon elle la ferme.
 * `opens` commence une nouvelle carte, séparée de la précédente par `space-3`.
 */
export interface CardEntry<T> {
  key: string;
  /** Même type, même gabarit : FlashList recycle les vues entre entrées du même type. */
  type: string;
  card: boolean;
  opens?: boolean;
  item: T;
}

interface Placed<T> extends CardEntry<T> {
  first: boolean;
  last: boolean;
}

export type CardListRef<T> = FlashListRef<Placed<T>>;

/**
 * FlashList tolère un pixel d'écart entre la hauteur qu'il a retenue pour une ligne et sa
 * hauteur réelle (une ligne avec sous-titre et une ligne sans n'ont pas la même), ce qui peut
 * laisser un filet du fond entre deux tranches d'une carte. Chaque tranche recouvre donc d'un
 * pixel celle du dessus.
 */
const THIN = Number.parseFloat(tokens.border['border-thin'] ?? '1');
const OVERLAP = { marginTop: -THIN, paddingTop: THIN };

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
        first: entry.card && (entries[i - 1]?.card !== true || entry.opens === true),
        last: entry.card && (entries[i + 1]?.card !== true || entries[i + 1]?.opens === true),
      })),
    [entries],
  );
  return (
    <FlashList
      ref={listRef ?? null}
      data={placed}
      keyExtractor={(entry) => entry.key}
      // Une bordure change la hauteur d'une tranche d'un pixel : FlashList ne corrige pas un si
      // petit écart entre entrées d'un même type. Chaque forme de tranche a donc son type.
      getItemType={(entry) =>
        `${entry.type}${entry.first ? '-first' : ''}${entry.last ? '-last' : ''}${
          entry.opens === true ? '-opens' : ''
        }`
      }
      keyboardShouldPersistTaps="handled"
      // Comme sur iOS, faire défiler la liste referme la ligne ouverte par un glissement.
      onScrollBeginDrag={closeSwipedRow}
      // Une ligne qui monte en tête (produit ajouté, ligne décochée) ne fait pas défiler la liste.
      maintainVisibleContentPosition={{ disabled: true }}
      ListHeaderComponent={
        header === undefined ? undefined : <View className={`gap-3 pb-3 ${side}`}>{header}</View>
      }
      ListFooterComponent={<View className={`gap-3 pb-8 pt-3 ${side}`}>{footer}</View>}
      renderItem={({ item: entry }) =>
        entry.card ? (
          <View className={`${side} ${entry.opens === true ? 'pt-3' : ''}`}>
            <View
              className={`overflow-hidden border-x-thin border-line bg-surface ${
                entry.first ? 'rounded-t-card border-t-thin' : ''
              } ${entry.last ? 'rounded-b-card border-b-thin' : ''}`}
              style={entry.first ? undefined : OVERLAP}
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
