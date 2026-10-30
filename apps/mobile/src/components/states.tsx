import { WifiSlash, type Icon } from 'phosphor-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ICON, useTheme } from '../theme';
import { Button } from './button';
import { Glyph } from './icons';
import { Text } from './text';

const WIDTHS = { full: '100%', half: '50%', third: '33%' } as const;

/** Bloc de squelette qui pulse (components.md, States) ; jamais de spinner plein écran. */
export function Skeleton({
  width = 'full',
  tall = false,
  round = false,
}: {
  width?: keyof typeof WIDTHS;
  tall?: boolean;
  round?: boolean;
}) {
  const { duration } = useTheme();
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value =
      duration.slow === 0
        ? 1
        : withRepeat(withTiming(0.5, { duration: duration.slow * 4 }), -1, true);
  }, [duration.slow, opacity]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      className={`rounded-pill bg-skeleton ${tall ? 'h-control-sm' : 'h-3'} ${round ? 'w-checkbox h-checkbox' : ''}`}
      style={[round ? undefined : { width: WIDTHS[width] }, pulse]}
    />
  );
}

/** Squelette de `count` lignes de liste : case, nom, sous-titre, quantité. */
export function SkeletonRows({ count = 3, header = true }: { count?: number; header?: boolean }) {
  return (
    <View className="overflow-hidden rounded-card border-thin border-line bg-surface">
      {header && (
        <View className="px-4 pt-3">
          <Skeleton width="third" />
        </View>
      )}
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          className="min-h-row flex-row items-center gap-3 border-b-thin border-line px-4"
        >
          <Skeleton round />
          <View className="flex-1 gap-2">
            <Skeleton width="half" />
            <Skeleton width="third" />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * État vide (components.md, States ; EF-6.2) : un titre, une phrase qui dit quoi faire, au
 * besoin une action. Sert aussi à l'erreur d'écran, avec « Réessayer ».
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: Icon | undefined;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void } | undefined;
}) {
  return (
    <View className="items-center gap-2 rounded-card border-thin border-line bg-surface px-6 py-8">
      {icon !== undefined && <Glyph icon={icon} color="ink-muted" size={ICON.empty} />}
      <Text variant="sentence" className="text-center">
        {title}
      </Text>
      <Text variant="body-sm" tone="muted" className="text-center">
        {body}
      </Text>
      {action !== undefined && (
        <View className="pt-2">
          <Button variant="outline" label={action.label} onPress={action.onPress} />
        </View>
      )}
    </View>
  );
}

/** Bandeau hors ligne sous l'en-tête (EF-6.3) : discret, rien n'est bloqué. */
export function OfflineBanner({ text }: { text: string }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-3 rounded-card bg-surface-2 px-3 py-2"
    >
      <Glyph icon={WifiSlash} color="ink-muted" size={ICON.pill} />
      <Text variant="caption" tone="muted" className="flex-1">
        {text}
      </Text>
    </View>
  );
}
