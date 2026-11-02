import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AddControl, Stepper } from '../../components/add-control';
import { Button } from '../../components/button';
import { ConfirmSheet } from '../../components/confirm-sheet';
import { Divider, ListRow, RowGroup } from '../../components/list-row';
import { Screen } from '../../components/screen';
import { ScreenHeader } from '../../components/screen-header';
import { EmptyState, SkeletonRows } from '../../components/states';
import { Text } from '../../components/text';
import { useToast } from '../../components/toast';
import { ingredientEstimate } from '../../copy/estimate';
import { useEngine } from '../../data/engine';
import { useData } from '../../data/provider';
import { ingredientsOf, missingCount, namesSentence } from '../../screens/recipes/model';
import { useWrite } from '../../data/use-write';

/** Fiche recette (EF-4.3 à EF-4.6) : ce qui manque, l'ajout à la liste, les notes. */
export default function RecipeSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const engine = useEngine();
  const data = useData();
  const write = useWrite();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const recipe = engine.recipeById.get(id);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/recipes'));

  if (recipe === undefined) {
    return (
      <Screen>
        <ScreenHeader form="sheet" title="" onBack={back} />
        {engine.loading ? (
          <SkeletonRows header={false} />
        ) : (
          <EmptyState
            title="Cette recette n'existe plus"
            body="Elle a peut-être été supprimée depuis un autre appareil."
            action={{ label: 'Retour aux recettes', onPress: back }}
          />
        )}
      </Screen>
    );
  }

  const listRecipe = engine.listRecipeOf(recipe.id);
  const missing = engine.missingOf(recipe.id);
  const ingredients = ingredientsOf(engine, recipe, missing);
  const missingNames = ingredients.filter((i) => i.missing !== null).map((i) => i.name);
  const onListNames = ingredients
    .filter((i) => engine.pendingLineOf(i.productId)?.recipeId === recipe.id)
    .map((i) => i.name);

  const status =
    listRecipe !== undefined
      ? { text: `Sur la liste · ${missingCount(missing.length)}`, tone: 'muted' as const }
      : missing.length === 0
        ? { text: "Tu as tout ce qu'il faut", tone: 'action' as const }
        : {
            text: `Il te manque ${missing.length} ingrédient${missing.length > 1 ? 's' : ''}`,
            tone: 'alert' as const,
          };

  const setTimes = (times: number) =>
    write(() =>
      data.list.setRecipeTimes({
        recipeId: recipe.id,
        listRecipeId: listRecipe?.id ?? null,
        times,
      }),
    );

  const addToList = async () => {
    const added = missing.length;
    if ((await setTimes(1)) && added > 0) {
      toast.show({
        message: `${added} produit${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} à la liste`,
      });
    }
  };

  return (
    <Screen>
      <ScreenHeader
        form="sheet"
        title={recipe.name}
        onBack={back}
        actions={[
          { label: 'Supprimer', tone: 'alert', onPress: () => setConfirming(true) },
          {
            label: 'Modifier',
            onPress: () => router.push({ pathname: '/recipe-edit', params: { id: recipe.id } }),
          },
        ]}
        meta={status.text}
        metaTone={status.tone}
      />

      {ingredients.length > 0 && (
        <RowGroup>
          {ingredients.map((ingredient, index) => {
            const product = engine.productById.get(ingredient.productId);
            const line = engine.pendingLineOf(ingredient.productId);
            const estimate =
              product === undefined
                ? { text: '', tone: 'muted' as const }
                : line !== undefined
                  ? { text: 'Sur la liste', tone: 'muted' as const }
                  : ingredientEstimate(
                      product,
                      engine.states.get(ingredient.productId),
                      engine.now,
                      ingredient.missing !== null,
                    );
            const missingPacks = ingredient.missing;
            return (
              <View key={ingredient.productId}>
                {index > 0 && <Divider />}
                <ListRow
                  checkbox={false}
                  name={
                    ingredient.quantity === null
                      ? ingredient.name
                      : `${ingredient.name} ${ingredient.quantity}`
                  }
                  subtitle={estimate.text}
                  subtitleTone={estimate.tone}
                  accessory={
                    // Planche Fiche recette : une ligne déjà sur la liste le dit, sans stepper.
                    missingPacks === null || line !== undefined ? undefined : (
                      <AddControl
                        quantity={null}
                        suggested={missingPacks}
                        onChange={(packs) =>
                          void write(() => data.list.addProduct(ingredient.productId, packs))
                        }
                      />
                    )
                  }
                />
              </View>
            );
          })}
        </RowGroup>
      )}

      {listRecipe === undefined ? (
        <View className="gap-2 pt-1">
          <Button label="Ajouter à la liste" onPress={() => void addToList()} />
          <Text variant="body-sm" tone="muted" className="text-center">
            {missingNames.length === 0
              ? 'Rien ne manque : la recette sera juste comptée sur ta liste.'
              : `${namesSentence(missingNames)} ${missingNames.length > 1 ? 'partiront' : 'partira'} sur la liste, le reste tu l'as déjà.`}
          </Text>
        </View>
      ) : (
        <View className="gap-2 pt-1">
          <View className="min-h-row flex-row items-center justify-between">
            <Text variant="body-strong">Comptée sur ta liste</Text>
            <Stepper value={listRecipe.times} onChange={(times) => void setTimes(times)} />
          </View>
          <Text variant="body-sm" tone="muted">
            {onListNames.length === 0
              ? 'Le − à 1 retire la recette de ta liste.'
              : `Le − à 1 retire ${namesSentence(onListNames).toLowerCase()} de la liste.`}
          </Text>
        </View>
      )}

      {recipe.notes !== null && recipe.notes.trim() !== '' && (
        <View className="gap-1 pt-3">
          <Text variant="title-section">Notes</Text>
          <Text variant="body-sm" tone="muted">
            {recipe.notes}
          </Text>
        </View>
      )}

      <ConfirmSheet
        visible={confirming}
        question={`Supprimer ${recipe.name} ?`}
        consequence="Les lignes déjà sur ta liste y restent, sans le nom de la recette."
        confirmLabel="Supprimer la recette"
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          if (await write(() => data.recipes.deleteRecipe(recipe.id))) back();
        }}
      />
    </Screen>
  );
}
