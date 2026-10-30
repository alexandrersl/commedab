import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';

/**
 * Barre « 2 sur 12 » (components.md, ProgressBar) : rail `surface-2`, remplissage `action`.
 * `indeterminate` pendant la première synchronisation.
 */
export function ProgressBar({
  value,
  indeterminate = false,
}: {
  /** De 0 à 1. */
  value: number;
  indeterminate?: boolean;
}) {
  const { duration } = useTheme();
  const progress = useSharedValue(value);
  const sweep = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(value, { duration: duration.base });
  }, [value, duration.base, progress]);
  useEffect(() => {
    sweep.value = indeterminate
      ? withRepeat(withTiming(1, { duration: duration.slow * 4 }), -1)
      : 0;
  }, [indeterminate, duration.slow, sweep]);

  const fill = useAnimatedStyle(() =>
    indeterminate
      ? { width: '30%', left: `${sweep.value * 70}%` }
      : { width: `${Math.min(1, Math.max(0, progress.value)) * 100}%`, left: 0 },
  );

  return (
    <View
      className="h-2 overflow-hidden rounded-pill bg-surface-2"
      accessibilityRole="progressbar"
      accessibilityValue={
        indeterminate ? undefined : { min: 0, max: 100, now: Math.round(value * 100) }
      }
    >
      <Animated.View className="absolute bottom-0 top-0 rounded-pill bg-action" style={fill} />
    </View>
  );
}
