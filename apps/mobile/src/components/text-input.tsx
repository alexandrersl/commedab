import { useState } from 'react';
import { TextInput as RNTextInput, View, type TextInputProps } from 'react-native';
import { STATE, useTheme } from '../theme';
import { Pressable } from './pressable';
import { Text } from './text';

/**
 * Champ de texte libre des écrans de compte et de recette (components.md, TextInput) : libellé
 * au-dessus, erreur dessous, valeur conservée ; `multiline` pour les notes.
 */
export function TextInput({
  label,
  error,
  help,
  multiline = false,
  disabled = false,
  ...input
}: Omit<TextInputProps, 'editable'> & {
  label: string;
  error?: string | null | undefined;
  /** Lien d'aide aligné à droite sous la boîte (« Mot de passe oublié ? »). */
  help?: { label: string; onPress: () => void } | undefined;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const border = error
    ? 'border-thin border-alert'
    : focused
      ? 'border-strong border-action'
      : 'border-thin border-line-strong';
  return (
    <View className="gap-1" style={disabled ? { opacity: STATE.disabled } : undefined}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <RNTextInput
        accessibilityLabel={label}
        editable={!disabled}
        multiline={multiline}
        placeholderTextColor={colors['ink-muted']}
        selectionColor={colors.action}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`type-body rounded-field bg-surface px-3 py-2 text-ink ${border} ${
          multiline ? 'min-h-control-lg' : 'min-h-control'
        }`}
        {...input}
      />
      {error ? (
        <Text variant="caption" tone="alert">
          {error}
        </Text>
      ) : null}
      {help !== undefined && (
        <Pressable
          small
          onPress={help.onPress}
          className="min-h-control-sm items-end justify-center"
        >
          <Text variant="button-sm" tone="action">
            {help.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
