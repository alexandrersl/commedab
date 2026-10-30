import { Check, ChefHat } from 'phosphor-react-native';
import { ICON } from '../theme';
import { Glyph } from './icons';
import { Pressable } from './pressable';
import { Text } from './text';

/**
 * Pastille d'une recette sous la barre de progression (components.md, RecipeChip ; EF-1.9) :
 * nom, « ×N », lignes cochées sur total ; pleine quand tout est dans le panier.
 */
export function RecipeChip({
  name,
  times,
  checked,
  total,
  complete,
  onPress,
}: {
  name: string;
  times: number;
  checked: number;
  total: number;
  complete: boolean;
  onPress: () => void;
}) {
  const tone = complete ? 'on-action' : 'ink';
  const label = `${name}${times > 1 ? ` ×${times}` : ''}${complete ? '' : ` · ${checked} sur ${total}`}`;
  return (
    <Pressable
      small
      onPress={onPress}
      accessibilityLabel={label}
      className={`min-h-control-sm flex-row items-center gap-2 rounded-pill px-3 ${
        complete ? 'bg-action' : 'border-thin border-line bg-surface'
      }`}
    >
      <Glyph icon={ChefHat} size={ICON.pill} color={tone} />
      <Text variant="label" tone={tone}>
        {label}
      </Text>
      {complete && <Glyph icon={Check} size={ICON.pill} color={tone} weight="bold" />}
    </Pressable>
  );
}
