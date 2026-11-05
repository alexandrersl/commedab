import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable as RNPressable, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { space, useTheme } from '../theme';
import { Text } from './text';

/** Glissement vertical qui fait d'un appui une traction de la feuille, comme pour un tap. */
const DRAG_SLOP = space['2'];

/**
 * Feuille montant du bas sur un `scrim` (components.md : ConfirmSheet, LineSheet, sélecteurs
 * de SettingField) : poignée, contenu. Un tap hors de la feuille la ferme, comme la tirer vers
 * le bas au-delà du quart de sa hauteur ; en deçà, elle revient en place.
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string | undefined;
  children: ReactNode;
}) {
  const { duration, vars } = useTheme();
  const insets = useSafeAreaInsets();
  const offset = useSharedValue(0);
  const height = useSharedValue(0);

  useEffect(() => {
    if (visible) offset.set(0);
  }, [visible, offset]);

  const drag = Gesture.Pan()
    .activeOffsetY(DRAG_SLOP)
    .failOffsetX([-DRAG_SLOP, DRAG_SLOP])
    .onUpdate((event) => {
      offset.set(Math.max(0, event.translationY));
    })
    .onEnd((event) => {
      if (event.translationY > height.get() / 4) {
        offset.set(
          withTiming(height.get(), { duration: duration.base }, (finished) => {
            if (finished === true) scheduleOnRN(onClose);
          }),
        );
      } else {
        offset.set(withTiming(0, { duration: duration.base }));
      }
    });
  const dragged = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <GestureHandlerRootView style={[{ flex: 1 }, vars]}>
        <Animated.View
          entering={FadeIn.duration(duration.base)}
          className="flex-1 justify-end bg-scrim"
        >
          <RNPressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            className="absolute bottom-0 left-0 right-0 top-0"
            onPress={onClose}
          />
          <Animated.View entering={SlideInDown.duration(duration.base)}>
            <GestureDetector gesture={drag}>
              <Animated.View
                className="gap-3 rounded-t-sheet bg-surface px-4 pt-2"
                style={[{ paddingBottom: insets.bottom + space['6'] }, dragged]}
                onLayout={(event) => {
                  height.set(event.nativeEvent.layout.height);
                }}
              >
                <View className="items-center pb-1">
                  <View className="h-1 w-8 rounded-pill bg-line-strong" />
                </View>
                {title !== undefined && <Text variant="title-section">{title}</Text>}
                {children}
              </Animated.View>
            </GestureDetector>
          </Animated.View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
