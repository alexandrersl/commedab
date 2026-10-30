import { CaretRight } from 'phosphor-react-native';
import { View } from 'react-native';
import { Stepper } from './add-control';
import { Glyph } from './icons';
import { Pressable } from './pressable';
import { Sheet } from './sheet';
import { Text } from './text';

/**
 * Mini-feuille de l'appui long sur une ligne (components.md, LineSheet ; EF-1.4) : quantité,
 * « Voir la fiche », « Retirer de la liste », dans cet ordre, sans titre.
 */
export function LineSheet({
  visible,
  name,
  subtitle,
  quantity,
  quantityLabel,
  onQuantity,
  onOpenProduct,
  onRemove,
  onClose,
}: {
  visible: boolean;
  name: string;
  subtitle?: string | null | undefined;
  quantity: number;
  quantityLabel?: string | undefined;
  onQuantity: (next: number) => void;
  onOpenProduct: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <View className="min-h-row flex-row items-center justify-between gap-3">
        <Text variant="body-strong" className="flex-1">
          {name}
          {subtitle ? <Text variant="body" tone="muted">{` · ${subtitle}`}</Text> : null}
        </Text>
        <Stepper value={quantity} onChange={onQuantity} label={quantityLabel} />
      </View>
      <Pressable
        onPress={onOpenProduct}
        className="min-h-control flex-row items-center justify-between"
      >
        <Text variant="body">Voir la fiche</Text>
        <Glyph icon={CaretRight} color="ink-muted" />
      </Pressable>
      <Pressable onPress={onRemove} className="min-h-control justify-center">
        <Text variant="body" tone="alert">
          Retirer de la liste
        </Text>
      </Pressable>
    </Sheet>
  );
}
