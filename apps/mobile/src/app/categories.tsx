import type { CategoryRecord } from '@commedab/data';
import { router } from 'expo-router';
import { DotsSixVertical } from 'phosphor-react-native';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { CategoryIcon, Glyph } from '../components/icons';
import { Divider, RowGroup } from '../components/list-row';
import { Screen } from '../components/screen';
import { ScreenHeader } from '../components/screen-header';
import { SkeletonRows } from '../components/states';
import { Text } from '../components/text';
import { useEngine } from '../data/engine';
import { useData } from '../data/provider';
import { useWrite } from '../data/use-write';
import { size, useTheme } from '../theme';

/** Un rayon qu'on glisse par sa poignée, d'autant de rangs que le doigt parcourt de lignes. */
function DraggableRow({
  category,
  index,
  count,
  onMove,
}: {
  category: CategoryRecord;
  index: number;
  count: number;
  onMove: (toIndex: number) => void;
}) {
  const { duration } = useTheme();
  const offset = useSharedValue(0);
  const active = useSharedValue(0);
  const pan = Gesture.Pan()
    .onBegin(() => {
      active.value = 1;
    })
    .onUpdate((event) => {
      offset.value = event.translationY;
    })
    .onEnd((event) => {
      const to = Math.max(
        0,
        Math.min(count - 1, index + Math.round(event.translationY / size.row)),
      );
      if (to !== index) scheduleOnRN(onMove, to);
    })
    .onFinalize(() => {
      offset.value = withTiming(0, { duration: duration.slow });
      active.value = 0;
    });
  const moving = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    zIndex: active.value === 1 ? 1 : 0,
  }));

  return (
    <Animated.View style={moving} className="bg-surface">
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

  const group = (categories: CategoryRecord[]) =>
    categories.map((category, index) => (
      <View key={category.id}>
        {index > 0 && <Divider />}
        <DraggableRow
          category={category}
          index={index}
          count={categories.length}
          onMove={(to) => write(() => data.categories.moveCategory(category.id, to))}
        />
      </View>
    ));

  return (
    <Screen>
      <ScreenHeader form="centered" title="Ordre des rayons" onBack={() => router.back()} />
      <Text variant="body-sm" tone="muted">
        Glisse les rayons dans l&apos;ordre de ton magasin. « À classer » reste en tête, les
        surgelés en dernier.
      </Text>
      {engine.loading ? (
        <SkeletonRows count={6} header={false} />
      ) : (
        <>
          <RowGroup>{group(ordinary)}</RowGroup>
          <RowGroup>{group(system)}</RowGroup>
        </>
      )}
    </Screen>
  );
}
