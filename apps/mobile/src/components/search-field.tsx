import { MagnifyingGlass } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { ICON, useTheme } from '../theme';
import { Glyph } from './icons';
import { Pressable } from './pressable';
import { Text } from './text';

/**
 * Le champ unique du panneau Ajouter et de la création de recette (components.md,
 * SearchField) : capsule, loupe, recherche à la frappe, « Fermer » quand `onClose`.
 */
export function SearchField({
  value,
  onChange,
  placeholder = 'Un produit, une recette…',
  loading = false,
  onClose,
  autoFocus = false,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  loading?: boolean;
  onClose?: (() => void) | undefined;
  autoFocus?: boolean;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View className="flex-row items-center gap-3">
      <View
        className={`min-h-control flex-1 flex-row items-center gap-2 rounded-pill bg-surface px-3 ${
          focused ? 'border-strong border-action' : 'border-thin border-line-strong'
        }`}
      >
        <Glyph icon={MagnifyingGlass} color="ink-muted" size={ICON.pill} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors['ink-muted']}
          selectionColor={colors.action}
          autoFocus={autoFocus}
          autoCorrect={false}
          returnKeyType="search"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={placeholder}
          className="type-body flex-1 py-2 text-ink"
        />
        {loading && <ActivityIndicator size="small" color={colors.action} />}
      </View>
      {onClose !== undefined && (
        <Pressable small onPress={onClose} className="min-h-control-sm justify-center">
          <Text variant="button" tone="action">
            Fermer
          </Text>
        </Pressable>
      )}
    </View>
  );
}
