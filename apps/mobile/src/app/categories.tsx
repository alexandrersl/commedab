import type { CategoryRecord } from '@commedab/data';
import { router } from 'expo-router';
import { DotsSixVertical } from 'phosphor-react-native';
import { useLayoutEffect } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { CategoryIcon, Glyph } from '../components/icons';
import { RowGroup } from '../components/list-row';
import { Screen } from '../components/screen';
import { ScreenHeader } from '../components/screen-header';
import { SkeletonRows } from '../components/states';
import { Text } from '../components/text';
import { useEngine } from '../data/engine';
import { useData } from '../data/provider';
import { useWrite } from '../data/use-write';
import { size, useTheme } from '../theme';

/**
 * Un rayon qu'on glisse par sa poignée. `order` est l'ordre affiché du groupe pendant le geste :
 * les autres rayons glissent vers leur nouvelle place en `duration-slow`, celui qu'on tient suit
 * le doigt puis se pose dans la sienne ; l'ordre enregistré remplace ensuite l'ordre affiché
 * sans mouvement.
 */
function SortableRow({
  category,
  index,
  order,
  slot,
  onMove,
}: {
  category: CategoryRecord;
  index: number;
  order: SharedValue<string[]>;
  slot: SharedValue<number>;
  onMove: (toIndex: number) => void;
}) {
  const { duration } = useTheme();
  const id = category.id;
  const offset = useSharedValue(0);
  const dragging = useSharedValue(false);
  const home = useSharedValue(index);

  useLayoutEffect(() => {
    home.set(index);
    offset.set(0);
  }, [index, home, offset]);

  useAnimatedReaction(
    () => order.get().indexOf(id),
    (place, previous) => {
      if (previous === null || place === previous || dragging.get()) return;
      offset.set(withTiming((place - home.get()) * slot.get(), { duration: duration.slow }));
    },
  );

  const pan = Gesture.Pan()
    .onBegin(() => {
      dragging.set(true);
    })
    .onUpdate((event) => {
      offset.set(event.translationY);
      const count = order.get().length;
      const to = Math.max(
        0,
        Math.min(count - 1, Math.round(home.get() + event.translationY / slot.get())),
      );
      if (to !== order.get().indexOf(id)) {
        const next = order.get().filter((other) => other !== id);
        next.splice(to, 0, id);
        order.set(next);
      }
    })
    .onEnd(() => {
      const to = order.get().indexOf(id);
      if (to !== home.get()) scheduleOnRN(onMove, to);
    })
    .onFinalize(() => {
      dragging.set(false);
      offset.set(
        withTiming((order.get().indexOf(id) - home.get()) * slot.get(), {
          duration: duration.slow,
        }),
      );
    });

  const moving = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.get() }],
    zIndex: dragging.get() ? 1 : 0,
  }));
  const divider = useAnimatedStyle(() => ({
    opacity: order.get().indexOf(id) > 0 ? 1 : 0,
  }));

  return (
    <Animated.View
      style={moving}
      className="bg-surface"
      onLayout={(event) => {
        slot.set(event.nativeEvent.layout.height);
      }}
    >
      <Animated.View
        style={divider}
        className="absolute left-0 right-0 top-0 mx-4 border-b-thin border-line"
      />
      <View className="min-h-row flex-row items-center gap-3 px-4">
        <GestureDetector gesture={pan}>
          <View
            accessibilityLabel={`Déplacer ${category.name}`}
            className="min-h-control min-w-control items-center justify-center"
          >
            <Glyph icon={DotsSixVertical} color="ink-muted" size={size['icon-sm']} />
          </View>
        </GestureDetector>
        <CategoryIcon categoryKey={category.key} color="ink" size={size['icon-sm']} />
        <Text variant="body" className="flex-1">
          {category.name}
        </Text>
      </View>
    </Animated.View>
  );
}

/** Un groupe de rayons qui se réordonnent entre eux. */
function SortableGroup({
  categories,
  onMove,
}: {
  categories: readonly CategoryRecord[];
  onMove: (category: CategoryRecord, toIndex: number) => void;
}) {
  const ids = categories.map((category) => category.id);
  const order = useSharedValue(ids);
  const slot = useSharedValue(size.row);
  const key = ids.join();
  useLayoutEffect(() => {
    order.set(key.split(','));
  }, [key, order]);

  return (
    <RowGroup>
      {categories.map((category, index) => (
        <SortableRow
          key={category.id}
          category={category}
          index={index}
          order={order}
          slot={slot}
          onMove={(to) => onMove(category, to)}
        />
      ))}
    </RowGroup>
  );
}

/**
 * Ordre des rayons (EF-5.1, RG-9) : on glisse les rayons dans l'ordre du magasin ; « À classer »
 * reste en tête, les rayons frais puis les surgelés en dernier, ordonnés entre eux.
 */
export default function Categories() {
  const engine = useEngine();
  const data = useData();
  const write = useWrite();
  const ordinary = engine.categories.filter((c) => c.systemKey === null);
  const system = engine.categories.filter((c) => c.systemKey !== null);

  const move = (category: CategoryRecord, to: number) =>
    void write(() => data.categories.moveCategory(category.id, to));

  return (
    <Screen>
      <ScreenHeader form="modal" title="Ordre des rayons" onBack={() => router.back()} />
      <Text variant="body-sm" tone="muted">
        Glisse les rayons dans l&apos;ordre de ton magasin. « À classer » reste en tête, les
        surgelés en dernier.
      </Text>
      {engine.loading ? (
        <SkeletonRows count={6} header={false} />
      ) : (
        <>
          <SortableGroup categories={ordinary} onMove={move} />
          <SortableGroup categories={system} onMove={move} />
        </>
      )}
    </Screen>
  );
}
