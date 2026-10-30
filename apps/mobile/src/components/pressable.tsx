import { useState } from 'react';
import {
  Pressable as RNPressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { HIT_SLOP, opacity, scale } from '../theme';

/**
 * Surface tapable aux états communs : pressé (échelle et fond assombri), désactivé ; `small`
 * étend la zone de tap d'un contrôle de 36 à 44 (ENF-1).
 */
export function Pressable({
  style,
  small = false,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  className?: string;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <RNPressable
      accessibilityRole="button"
      hitSlop={small ? HIT_SLOP : undefined}
      disabled={disabled}
      onPressIn={(event: GestureResponderEvent) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={[
        style,
        pressed && { transform: [{ scale: scale.pressed }] },
        disabled === true && { opacity: opacity.disabled },
      ]}
      {...props}
    />
  );
}
