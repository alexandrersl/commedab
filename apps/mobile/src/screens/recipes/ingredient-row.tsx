import { CaretDown, X } from 'phosphor-react-native';
import { TextInput, View } from 'react-native';
import { Glyph } from '../../components/icons';
import { Pressable } from '../../components/pressable';
import { Text } from '../../components/text';
import { displayUnit } from '../../copy/words';
import { useTheme, size } from '../../theme';

/**
 * Un ingrédient en cours d'édition (planche Nouvelle recette) : nom, quantité facultative en
 * saisie numérique, unité accolée, croix pour le retirer (EF-4.2).
 */
export function IngredientRow({
  name,
  quantity,
  unit,
  onQuantity,
  onUnit,
  onRemove,
}: {
  name: string;
  quantity: string;
  /** Unité affichée : celle de l'ingrédient, ou du produit. */
  unit: string;
  onQuantity: (text: string) => void;
  onUnit: () => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View className="min-h-row flex-row items-center gap-2 px-4 py-2">
      <Text variant="body" className="flex-1">
        {name}
      </Text>
      <View className="min-h-control-sm justify-center rounded-field border-thin border-line-strong bg-surface px-3">
        <TextInput
          value={quantity}
          onChangeText={onQuantity}
          inputMode="decimal"
          placeholder="–"
          placeholderTextColor={colors['ink-muted']}
          selectionColor={colors.action}
          accessibilityLabel={`Quantité de ${name}`}
          className="type-button-sm w-control-lg text-right text-ink"
          style={{ fontVariant: ['tabular-nums'] }}
        />
      </View>
      <Pressable
        small
        onPress={onUnit}
        accessibilityLabel={`Unité de ${name}`}
        className="min-h-control-sm flex-row items-center gap-1 rounded-field border-thin border-line-strong bg-surface px-2"
      >
        <Text variant="button-sm">{displayUnit(unit)}</Text>
        <Glyph icon={CaretDown} size={size['icon-sm']} color="ink-muted" />
      </Pressable>
      <Pressable
        small
        onPress={onRemove}
        accessibilityLabel={`Retirer ${name}`}
        className="min-h-control-sm min-w-control-sm items-center justify-center"
      >
        <Glyph icon={X} color="ink-muted" size={size['icon-sm']} />
      </Pressable>
    </View>
  );
}
