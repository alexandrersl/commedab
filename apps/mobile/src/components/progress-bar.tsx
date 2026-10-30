import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { usePulse } from './states';

/**
 * Barre « 2 sur 12 » (components.md, ProgressBar) : rail `surface-2`, remplissage `action`.
 * `indeterminate` pendant la première synchronisation : le rail pulse comme un squelette.
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
  const pulse = usePulse();

  useEffect(() => {
    progress.value = withTiming(value, { duration: duration.base });
  }, [value, duration.base, progress]);

  const fill = useAnimatedStyle(() => ({
    width: `${Math.min(1, Math.max(0, progress.value)) * 100}%`,
  }));

  if (indeterminate) {
    return (
      <Animated.View
        className="h-progress rounded-pill bg-skeleton"
        style={pulse}
        accessibilityRole="progressbar"
      />
    );
  }
  return (
    <View
      className="h-progress overflow-hidden rounded-pill bg-surface-2"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <Animated.View
        className="absolute bottom-0 left-0 top-0 rounded-pill bg-action"
        style={fill}
      />
    </View>
  );
}
