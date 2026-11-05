import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../theme';
import { Pressable } from './pressable';
import { Badge } from './pill';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'outline' | 'text' | 'alert';

/**
 * Les quatre boutons de l'app (components.md, Button) : plein pour l'action principale,
 * contour pour l'action répétable, texte pour la navigation, alerte pour confirmer
 * l'irréversible dans une feuille.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  tone = 'action',
  loading = false,
  disabled = false,
  badge,
  align = 'center',
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Bouton texte : `alert` pour « Supprimer », « Je n'en achète plus ». */
  tone?: 'action' | 'alert' | 'muted';
  loading?: boolean;
  disabled?: boolean;
  /** Nombre affiché à droite (barre « Ajouter » de la liste). */
  badge?: number | undefined;
  align?: 'center' | 'start';
}) {
  const { colors } = useTheme();
  const locked = disabled || loading;
  const spinner =
    variant === 'primary' ? colors['on-action'] : colors[tone === 'muted' ? 'ink-muted' : tone];

  const container = {
    primary: 'min-h-control-lg rounded-card bg-action px-4',
    outline: 'min-h-control-sm rounded-pill border-strong border-action bg-surface px-3',
    text: 'min-h-control-sm',
    alert: 'min-h-control-lg rounded-card bg-alert-soft px-4',
  }[variant];
  const text = {
    primary: { variant: 'button', tone: 'on-action' },
    outline: { variant: 'button-sm', tone: 'action' },
    text: { variant: 'button', tone },
    alert: { variant: 'button', tone: 'alert' },
  } as const;

  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      small={variant === 'outline' || variant === 'text'}
      feedback={variant === 'text' ? 'fade' : 'scale'}
      accessibilityLabel={label}
      accessibilityState={{ disabled: locked, busy: loading }}
      className={`flex-row items-center gap-2 ${align === 'center' ? 'justify-center' : 'justify-between'} ${container}`}
    >
      {loading && <ActivityIndicator size="small" color={spinner} />}
      <Text variant={text[variant].variant} tone={text[variant].tone}>
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <View className="ml-auto">
          <Badge value={String(badge)} tone="inverse" />
        </View>
      )}
    </Pressable>
  );
}
