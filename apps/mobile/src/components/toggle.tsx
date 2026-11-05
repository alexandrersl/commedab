import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { size, useTheme } from '../theme';
import { Pressable } from './pressable';
import { Text } from './text';

/** Course du pouce, centré dans la capsule à chaque bout. */
const INSET = (size['toggle-h'] - size['toggle-thumb']) / 2;
const TRAVEL = size['toggle-w'] - size['toggle-thumb'] - 2 * INSET;

/**
 * Interrupteur des Réglages (components.md, Toggle) : libellé à gauche, explication dessous,
 * capsule `action` quand il est activé, `line-strong` sinon ; toute la ligne le bascule.
 */
export function Toggle({
  label,
  caption,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  caption?: string | undefined;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { duration } = useTheme();
  const position = useSharedValue(value ? TRAVEL : 0);
  useEffect(() => {
    position.set(withTiming(value ? TRAVEL : 0, { duration: duration.fast }));
  }, [value, position, duration.fast]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      disabled={disabled}
      onPress={() => onChange(!value)}
      className="min-h-row flex-row items-center gap-3 px-4 py-2"
    >
      <View className="flex-1">
        <Text variant="body">{label}</Text>
        {caption !== undefined && (
          <Text variant="caption" tone="muted">
            {caption}
          </Text>
        )}
      </View>
      <View
        className={`h-toggle-h w-toggle-w justify-center rounded-pill ${
          value ? 'bg-action' : 'bg-line-strong'
        }`}
        style={{ paddingHorizontal: INSET }}
      >
        <Animated.View
          className="h-toggle-thumb w-toggle-thumb rounded-pill bg-surface"
          style={thumb}
        />
      </View>
    </Pressable>
  );
}
