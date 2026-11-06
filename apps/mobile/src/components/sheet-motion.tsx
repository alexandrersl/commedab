import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type WithTimingConfig,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { EASE_OUT_POINTS, space, useTheme } from '../theme';

/** Glissement vertical qui fait d'un appui une traction de la feuille, comme pour un tap. */
const DRAG_SLOP = space['2'];

/** La poignée en haut d'une feuille : on la tire vers le bas pour fermer. */
export function SheetHandle() {
  return (
    <View className="items-center pb-1 pt-2">
      <View className="h-1 w-8 rounded-pill bg-line-strong" />
    </View>
  );
}

/**
 * Le mouvement commun des feuilles qui montent du bas (feuilles, panneau Ajouter) : le voile
 * apparaît en fondu pendant que la feuille monte, en `duration-base` sur la courbe `ease-out`,
 * et l'inverse à la fermeture. La feuille ne part qu'une fois mesurée, pour que son premier
 * rendu ne saccade pas la montée. Tirée vers le bas au-delà du quart de sa hauteur, elle se
 * ferme ; en deçà, elle revient. `visible` passé à faux la fait redescendre avant de la
 * démonter (`mounted`) ; `dismiss` la fait redescendre puis appelle `onClose`.
 */
export function useSheetMotion({
  visible = true,
  onClose,
}: {
  visible?: boolean;
  onClose: () => void;
}) {
  const { duration } = useTheme();
  const timing: WithTimingConfig = {
    duration: duration.base,
    easing: Easing.bezier(...EASE_OUT_POINTS),
  };
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const progress = useSharedValue(0);
  const height = useSharedValue(0);
  const drag = useSharedValue(0);
  const measured = useSharedValue(false);

  const hide = (then: () => void) => {
    const full = height.get();
    if (full > 0 && drag.get() > 0) progress.set(Math.max(0, 1 - drag.get() / full));
    drag.set(0);
    progress.set(
      withTiming(0, timing, (done) => {
        if (done === true) scheduleOnRN(then);
      }),
    );
  };
  const unmount = () => {
    measured.set(false);
    setMounted(false);
  };
  const dismiss = () =>
    hide(() => {
      unmount();
      onClose();
    });

  useEffect(() => {
    if (visible && measured.get()) progress.set(withTiming(1, timing));
    if (!visible && mounted) hide(unmount);
    // Seule l'ouverture ou la fermeture demandée relance le mouvement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const onLayout = (event: LayoutChangeEvent) => {
    height.set(event.nativeEvent.layout.height);
    if (!measured.get()) {
      measured.set(true);
      progress.set(withTiming(1, timing));
    }
  };

  const pull = Gesture.Pan()
    .activeOffsetY(DRAG_SLOP)
    .failOffsetX([-DRAG_SLOP, DRAG_SLOP])
    .onUpdate((event) => {
      drag.set(Math.max(0, event.translationY));
    })
    .onEnd(() => {
      if (drag.get() > height.get() / 4) scheduleOnRN(dismiss);
      else drag.set(withTiming(0, timing));
    });

  const panel = useAnimatedStyle(() => ({
    opacity: measured.get() ? 1 : 0,
    transform: [{ translateY: (1 - progress.get()) * height.get() + drag.get() }],
  }));
  const scrim = useAnimatedStyle(() => {
    const full = height.get();
    const pulled = full > 0 ? Math.min(1, drag.get() / full) : 0;
    return { opacity: progress.get() * (1 - pulled) };
  });

  return { mounted, dismiss, onLayout, pull, panel, scrim };
}
