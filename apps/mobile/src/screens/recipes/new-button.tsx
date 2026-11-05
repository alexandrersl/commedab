import { Pressable } from '../../components/pressable';
import { Text } from '../../components/text';

/** « + Nouvelle » : capsule pleine de l'en-tête des Recettes (planche Recettes). */
export function NewRecipeButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      feedback="scale"
      small
      onPress={onPress}
      accessibilityLabel="Nouvelle recette"
      className="min-h-control-sm justify-center rounded-pill bg-action px-4"
    >
      <Text variant="button" tone="on-action">
        + Nouvelle
      </Text>
    </Pressable>
  );
}
