import { DEFAULT_CATEGORIES } from '@commedab/core';
import type { CategoryRecord } from '@commedab/data';
import { router } from 'expo-router';
import { DotsSixVertical } from 'phosphor-react-native';
import { useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { stepHaptic } from '../components/add-control';
import { Button } from '../components/button';
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
 * Un rayon qu'on glisse : par sa poignée aussitôt, par le reste de la ligne après un appui
 * maintenu, pour que l'écran défile encore sous le doigt. Tenu, il prend le fond `surface-2`.
 * `order` est l'ordre affiché du groupe pendant le geste :
 * les autres rayons glissent vers leur nouvelle place en `duration-slow`, celui qu'on tient suit
 * le doigt puis se pose dans la sienne ; l'ordre du brouillon remplace ensuite l'ordre affiché
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
  const { colors, duration } = useTheme();
  const id = category.id;
  const row = useRef<ComponentRef<typeof View>>(null);
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

  // Sur le web, la ligne laisse le navigateur défiler (`pan-y`) ; une fois le rayon tenu, le
  // défilement de ce toucher est annulé, sans quoi le navigateur reprendrait le geste.
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const node = row.current as unknown as HTMLElement | null;
    const hold = (event: TouchEvent) => {
      if (dragging.get() && event.cancelable) event.preventDefault();
    };
    node?.addEventListener('touchmove', hold, { passive: false });
    return () => node?.removeEventListener('touchmove', hold);
  }, [dragging]);

  const pan = () =>
    Gesture.Pan()
      .onStart(() => {
        dragging.set(true);
        scheduleOnRN(stepHaptic);
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
  const byHandle = pan();
  const byRow = pan().activateAfterLongPress(duration.slow);

  const moving = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.get() }],
    zIndex: dragging.get() ? 1 : 0,
    backgroundColor: dragging.get() ? colors['surface-2'] : colors.surface,
  }));
  const divider = useAnimatedStyle(() => ({
    opacity: order.get().indexOf(id) > 0 ? 1 : 0,
  }));

  return (
    <Animated.View
      ref={row}
      style={moving}
      onLayout={(event) => {
        slot.set(event.nativeEvent.layout.height);
      }}
    >
      <Animated.View
        style={divider}
        className="absolute left-0 right-0 top-0 mx-4 border-b-thin border-line"
      />
      <View className="flex-row items-center gap-3 pl-4">
        <GestureDetector gesture={byHandle}>
          <View
            accessibilityLabel={`Déplacer ${category.name}`}
            className="min-h-control min-w-control items-center justify-center"
          >
            <Glyph icon={DotsSixVertical} color="ink-muted" size={size['icon-sm']} />
          </View>
        </GestureDetector>
        <GestureDetector gesture={byRow} touchAction="pan-y">
          <View className="min-h-row flex-1 flex-row items-center gap-3 pr-4">
            <CategoryIcon categoryKey={category.key} color="ink" size={size['icon-sm']} />
            <Text variant="body" className="flex-1">
              {category.name}
            </Text>
          </View>
        </GestureDetector>
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

/** Les rayons dans l'ordre livré avec l'application (specs techniques 7.4). */
function defaultOrder(categories: readonly CategoryRecord[]): string[] {
  const rank = (category: CategoryRecord) => {
    const index = DEFAULT_CATEGORIES.findIndex((entry) => entry.key === category.key);
    return index === -1 ? DEFAULT_CATEGORIES.length : index;
  };
  return [...categories].sort((a, b) => rank(a) - rank(b)).map((category) => category.id);
}

/**
 * Ordre des rayons (EF-5.1, RG-9) : on glisse les rayons dans l'ordre du magasin ; « À classer »
 * reste en tête, les rayons frais puis les surgelés en dernier, ordonnés entre eux. Rien n'est
 * écrit avant « Enregistrer » : `draft` est l'ordre à l'écran, nul tant qu'on n'a rien touché.
 */
export default function Categories() {
  const engine = useEngine();
  const data = useData();
  const write = useWrite();
  const [draft, setDraft] = useState<string[] | null>(null);

  const saved = engine.categories.map((category) => category.id);
  const order = draft ?? saved;
  const shown = order.flatMap((id) => engine.categoryById.get(id) ?? []);
  const ordinary = shown.filter((c) => c.systemKey === null);
  const system = shown.filter((c) => c.systemKey !== null);
  const original = defaultOrder(shown);

  const move = (category: CategoryRecord, to: number) => {
    const group = (category.systemKey === null ? ordinary : system).filter(
      (other) => other.id !== category.id,
    );
    group.splice(to, 0, category);
    const [first, last] = category.systemKey === null ? [group, system] : [ordinary, group];
    setDraft([...first, ...last].map((c) => c.id));
  };
  const save = () => {
    void write(() => data.categories.setCategoryOrder(order));
    router.back();
  };

  return (
    <Screen>
      <ScreenHeader
        form="modal"
        title="Ordre des rayons"
        leftAction={{ label: 'Annuler', onPress: () => router.back() }}
        actions={[{ label: 'Enregistrer', onPress: save, disabled: order.join() === saved.join() }]}
      />
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
          <Button
            variant="text"
            label="Remettre l'ordre d'origine"
            disabled={order.join() === original.join()}
            onPress={() => setDraft(original)}
          />
        </>
      )}
    </Screen>
  );
}
