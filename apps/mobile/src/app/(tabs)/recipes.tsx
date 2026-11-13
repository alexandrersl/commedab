import { router } from 'expo-router';
import { ChefHat } from 'phosphor-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { AddControl } from '../../components/add-control';
import { ConfirmSheet } from '../../components/confirm-sheet';
import { RecipeCard, RecipeCardSkeleton } from '../../components/recipe-card';
import { Screen } from '../../components/screen';
import { ScreenHeader } from '../../components/screen-header';
import { EmptyState } from '../../components/states';
import { SwipeRow } from '../../components/swipe-row';
import { useEngine } from '../../data/engine';
import { useData } from '../../data/provider';
import { ingredientsOf, missingCount, pillLabel } from '../../screens/recipes/model';
import { NewRecipeButton } from '../../screens/recipes/new-button';
import { useWrite } from '../../data/use-write';

const NEW = () => router.push('/recipe-edit');

/**
 * Une carte par recette, ce qui manque d'abord (EF-4.1) ; glisser une carte à gauche découvre
 * « Supprimer », qui passe par la confirmation de la fiche (EF-4.6).
 */
export default function Recipes() {
  const engine = useEngine();
  const data = useData();
  const write = useWrite();
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  let content;
  if (engine.error !== null) {
    content = (
      <EmptyState
        title="Impossible de charger tes recettes"
        body="Ça ne devrait pas arriver. Réessaie, et si ça continue, dis-le nous depuis les Réglages."
        action={{ label: 'Réessayer', onPress: engine.retry }}
      />
    );
  } else if (engine.loading) {
    content = (
      <>
        <RecipeCardSkeleton />
        <RecipeCardSkeleton />
      </>
    );
  } else if (engine.recipes.length === 0) {
    content = (
      <EmptyState
        icon={ChefHat}
        title="Pas encore de recette"
        body="Une recette, c'est une liste de courses toute prête : tu l'ajoutes et je mets sur la liste ce qui te manque."
        action={{ label: '+ Nouvelle', onPress: NEW }}
      />
    );
  } else {
    content = engine.recipes.map((recipe) => {
      const listRecipe = engine.listRecipeOf(recipe.id);
      const missing = engine.missingOf(recipe.id);
      const ingredients = ingredientsOf(engine, recipe, missing);
      const count = recipe.ingredients.length;
      const complete = missing.length === 0;
      const onList = listRecipe === undefined ? '' : ' · sur la liste';
      const subtitle = complete
        ? `Tu as tout ce qu'il faut${onList}`
        : `${count} ingrédient${count > 1 ? 's' : ''} · ${missingCount(missing.length)}${onList}`;
      return (
        <View key={recipe.id} className="overflow-hidden rounded-card">
          <SwipeRow
            label={`Supprimer ${recipe.name}`}
            action="Supprimer"
            stays
            onRemove={() => setDeleting({ id: recipe.id, name: recipe.name })}
            resetKey={recipe.id}
          >
            <RecipeCard
              name={recipe.name}
              subtitle={subtitle}
              complete={complete}
              ingredients={ingredients.map((i) => ({
                label: pillLabel(i, listRecipe?.times ?? 1),
                missing: i.missing !== null,
              }))}
              onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
              control={
                <AddControl
                  quantity={listRecipe?.times ?? null}
                  onChange={(times) =>
                    void write(() =>
                      data.list.setRecipeTimes({
                        recipeId: recipe.id,
                        listRecipeId: listRecipe?.id ?? null,
                        times,
                      }),
                    )
                  }
                />
              }
            />
          </SwipeRow>
        </View>
      );
    });
  }

  return (
    <Screen>
      <ScreenHeader title="Recettes" right={<NewRecipeButton onPress={NEW} />} />
      <View className="gap-3">{content}</View>
      <ConfirmSheet
        visible={deleting !== null}
        question={`Supprimer ${deleting?.name ?? ''} ?`}
        consequence="Les lignes déjà sur ta liste y restent, sans le nom de la recette."
        confirmLabel="Supprimer la recette"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const recipe = deleting;
          setDeleting(null);
          if (recipe !== null) void write(() => data.recipes.deleteRecipe(recipe.id));
        }}
      />
    </Screen>
  );
}
