import { useRef, useState } from 'react';
import {
  Platform,
  Pressable as RNPressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { EASE_OUT, HIT_SLOP, opacity, scale, space, useTheme } from '../theme';

/**
 * Retour visuel sous le doigt (design-system.md, États) :
 * - `scale` : un bouton (plein, contour, stepper, pastille) rétrécit et s'atténue ;
 * - `highlight` : une ligne prend le fond `surface-2`, opaque, sans changer de taille ;
 * - `fade` : un lien ou un titre s'atténue seulement.
 */
export type PressFeedback = 'scale' | 'highlight' | 'fade';

/** Au-delà de ce déplacement entre l'appui et le relâché, le geste n'est plus un tap. */
const TAP_SLOP = space['2'];

function pointOf(event: GestureResponderEvent): { x: number; y: number } | null {
  const { pageX, pageY, touches } = event.nativeEvent;
  const touch = touches?.[0];
  if (touch !== undefined) return { x: touch.pageX, y: touch.pageY };
  return typeof pageX === 'number' && typeof pageY === 'number' ? { x: pageX, y: pageY } : null;
}

/**
 * Surface tapable aux états communs : pressé (selon `feedback`), désactivé ; `small` étend la
 * zone de tap d'un contrôle de 36 à 44 (ENF-1). Un doigt qui glisse au-delà de `space-2` avant
 * de se relever ne valide pas : sur le web, Safari envoie le `click` même après un glissement
 * quand le défilement natif est coupé (lignes glissables).
 */
export function Pressable({
  style,
  small = false,
  feedback = 'fade',
  disabled,
  onPress,
  onPressIn,
  onPressMove,
  onPressOut,
  ...props
}: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  feedback?: PressFeedback;
  className?: string;
}) {
  const { colors, duration } = useTheme();
  const [pressed, setPressed] = useState(false);
  // Un geste : son point de départ, et s'il s'en est éloigné. Les mouvements peuvent arriver
  // avant `onPressIn` (activation différée au toucher), et le `click` qui appelle `onPress`
  // après `onPressOut` : l'état ne s'efface qu'une fois le geste fini.
  const gesture = useRef<{ start: { x: number; y: number } | null; far: boolean }>({
    start: null,
    far: false,
  });

  const see = (event: GestureResponderEvent) => {
    const point = pointOf(event);
    const current = gesture.current;
    if (point === null) return;
    if (current.start === null) {
      current.start = point;
      return;
    }
    if (Math.hypot(point.x - current.start.x, point.y - current.start.y) > TAP_SLOP) {
      current.far = true;
      setPressed(false);
    }
  };

  return (
    <RNPressable
      accessibilityRole="button"
      hitSlop={small ? HIT_SLOP : undefined}
      disabled={disabled}
      onPressIn={(event: GestureResponderEvent) => {
        gesture.current.start = pointOf(event) ?? gesture.current.start;
        if (!gesture.current.far) setPressed(true);
        onPressIn?.(event);
      }}
      onPressMove={(event: GestureResponderEvent) => {
        see(event);
        onPressMove?.(event);
      }}
      onPressOut={(event: GestureResponderEvent) => {
        setPressed(false);
        setTimeout(() => {
          gesture.current = { start: null, far: false };
        }, 0);
        onPressOut?.(event);
      }}
      onPress={(event: GestureResponderEvent) => {
        see(event);
        if (!gesture.current.far) onPress?.(event);
      }}
      style={[
        style,
        Platform.OS === 'web' && {
          transitionProperty: 'transform, opacity, background-color',
          transitionDuration: `${duration.fast}ms`,
          transitionTimingFunction: EASE_OUT,
        },
        pressed &&
          feedback === 'scale' && {
            transform: [{ scale: scale.pressed }],
            opacity: opacity.pressed,
          },
        pressed && feedback === 'fade' && { opacity: opacity.pressed },
        pressed && feedback === 'highlight' && { backgroundColor: colors['surface-2'] },
        disabled === true && { opacity: opacity.disabled },
      ]}
      {...props}
    />
  );
}
