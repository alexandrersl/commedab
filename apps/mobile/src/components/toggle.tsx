import { Switch, View } from 'react-native';
import { useTheme, opacity } from '../theme';
import { Text } from './text';

/**
 * Interrupteur des Réglages (components.md, Toggle) : libellé à gauche, explication dessous,
 * `action` quand il est activé.
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
  const { colors } = useTheme();
  return (
    <View
      className="min-h-row flex-row items-center gap-3 px-4 py-2"
      style={disabled ? { opacity: opacity.disabled } : undefined}
    >
      <View className="flex-1">
        <Text variant="body">{label}</Text>
        {caption !== undefined && (
          <Text variant="caption" tone="muted">
            {caption}
          </Text>
        )}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.action, false: colors['line-strong'] }}
        thumbColor={colors.surface}
        {...{ activeThumbColor: colors.surface }}
      />
    </View>
  );
}
