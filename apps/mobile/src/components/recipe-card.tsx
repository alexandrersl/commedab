import { View } from 'react-native';
import { Pill } from './pill';
import { Pressable } from './pressable';
import { Skeleton } from './states';
import { Text } from './text';
import type { ReactNode } from 'react';

/**
 * Une recette sur l'onglet Recettes (components.md, RecipeCard ; EF-4.1) : nom, sous-titre,
 * composant d'ajout en haut à droite, pastilles manquantes d'abord.
 */
export function RecipeCard({
  name,
  subtitle,
  complete = false,
  ingredients,
  control,
  onPress,
}: {
  name: string;
  subtitle: string;
  /** Rien ne manque : sous-titre en `action`, pas de pastilles. */
  complete?: boolean;
  ingredients: readonly { label: string; missing: boolean }[];
  control: ReactNode;
  onPress: () => void;
}) {
  return (
    <View className="gap-3 rounded-card border-thin border-line bg-surface p-4">
      <View className="flex-row items-start gap-3">
        <Pressable onPress={onPress} className="flex-1 gap-1" accessibilityLabel={name}>
          <Text variant="title-section">{name}</Text>
          <Text variant="body-sm" tone={complete ? 'action' : 'muted'}>
            {subtitle}
          </Text>
        </Pressable>
        {control}
      </View>
      {!complete && ingredients.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {[...ingredients]
            .sort((a, b) => Number(b.missing) - Number(a.missing))
            .map((ingredient) => (
              <Pill
                key={ingredient.label}
                label={ingredient.label}
                kind={ingredient.missing ? 'missing' : 'owned'}
              />
            ))}
        </View>
      )}
    </View>
  );
}

export function RecipeCardSkeleton() {
  return (
    <View className="gap-3 rounded-card border-thin border-line bg-surface p-4">
      <Skeleton width="half" />
      <Skeleton width="full" />
    </View>
  );
}
