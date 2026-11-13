import type { IngredientRecord } from '@commedab/data';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Glyph } from '../components/icons';
import { Divider, RowGroup } from '../components/list-row';
import { Screen } from '../components/screen';
import { ScreenHeader } from '../components/screen-header';
import { Pressable } from '../components/pressable';
import { Button } from '../components/button';
import { OptionSheet } from '../components/setting-field';
import { Text } from '../components/text';
import { TextInput } from '../components/text-input';
import { useToast } from '../components/toast';
import { displayUnit, format, INGREDIENT_UNITS } from '../copy/words';
import { useEngine } from '../data/engine';
import { useData } from '../data/provider';
import { IngredientRow } from '../screens/recipes/ingredient-row';
import { IngredientPanel } from '../screens/recipes/ingredient-panel';
import type { IngredientPick } from '../screens/recipes/ingredient-search';
import { useWrite } from '../data/use-write';

interface Draft {
  productId: string;
  quantity: string;
  /** Nulle : l'unité du produit. */
  unit: string | null;
}

/** Valeur d'option qui désigne l'unité du produit (`unit` nulle). */
const PRODUCT_UNIT = '';

function draftOf(ingredient: IngredientRecord): Draft {
  return {
    productId: ingredient.productId,
    quantity: ingredient.quantity === null ? '' : format(ingredient.quantity),
    unit: ingredient.unit,
  };
}

/** Quantité saisie (« 0,5 », « 200 ») ; nulle si vide ou illisible : elle est facultative. */
function parseQuantity(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() === '' || !Number.isFinite(value) || value <= 0 ? null : value;
}

/**
 * Création et modification d'une recette (EF-4.2) : « Modifier » ouvre ce même écran
 * préchargé. Le nom et un ingrédient au moins sont obligatoires ; « Annuler » ne garde rien,
 * « Enregistrer » attend une modification. Les ingrédients s'ajoutent par le panneau qui monte
 * par-dessus l'écran. Ouvert depuis le panneau Ajouter (`name`, `toList`), l'écran reprend le
 * nom tapé, ouvre le panneau des ingrédients, et la recette enregistrée part sur la liste.
 */
export default function RecipeEdit() {
  const params = useLocalSearchParams<{ id?: string; name?: string; toList?: string }>();
  const { id } = params;
  const toList = params.toList !== undefined;
  const toast = useToast();
  const engine = useEngine();
  const data = useData();
  const write = useWrite();
  const existing = id === undefined ? undefined : engine.recipeById.get(id);
  const [name, setName] = useState(existing?.name ?? params.name ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [ingredients, setIngredients] = useState<Draft[]>(
    () => existing?.ingredients.map(draftOf) ?? [],
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [ingredientsError, setIngredientsError] = useState(false);
  const [adding, setAdding] = useState(params.name !== undefined);
  const [noting, setNoting] = useState(notes !== '');
  const [initial] = useState(() => JSON.stringify([name, notes, ingredients]));
  const changed = JSON.stringify([name, notes, ingredients]) !== initial;
  const [unitFor, setUnitFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const added = useMemo(() => new Set(ingredients.map((i) => i.productId)), [ingredients]);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/recipes'));

  const update = (productId: string, change: Partial<Draft>) =>
    setIngredients((list) =>
      list.map((i) => (i.productId === productId ? { ...i, ...change } : i)),
    );
  const append = (productId: string) =>
    setIngredients((list) =>
      list.some((i) => i.productId === productId)
        ? list
        : [...list, { productId, quantity: '', unit: null }],
    );

  const pick = async (choice: IngredientPick): Promise<boolean> => {
    if (choice.kind === 'product') {
      append(choice.productId);
      return true;
    }
    const productName = choice.kind === 'catalog' ? choice.entry.name : choice.name;
    let created: string | null = null;
    const ok = await write(async () => {
      created = await data.products.createProduct({
        name: productName,
        entry: choice.entry,
        addToList: false,
      });
    });
    if (!ok || created === null) return false;
    append(created);
    return true;
  };

  const save = async () => {
    if (name.trim() === '') {
      setNameError('Donne un nom à ta recette');
      return;
    }
    if (ingredients.length === 0) {
      setIngredientsError(true);
      return;
    }
    setSaving(true);
    const input = {
      ...(existing === undefined ? {} : { id: existing.id }),
      name,
      notes: notes.trim() === '' ? null : notes.trim(),
      ingredients: ingredients.map((i) => ({
        productId: i.productId,
        quantity: parseQuantity(i.quantity),
        unit: i.unit,
      })),
    };
    const ok = await write(async () => {
      const recipeId = await data.recipes.saveRecipe(input);
      if (toList) await data.list.setRecipeTimes({ recipeId, listRecipeId: null, times: 1 });
    });
    setSaving(false);
    if (!ok) return;
    if (toList) toast.show({ message: `${name.trim()} est sur ta liste` });
    back();
  };

  const unitProduct = unitFor === null ? undefined : engine.productById.get(unitFor);
  const unitDraft = ingredients.find((i) => i.productId === unitFor);
  const unitOptions =
    unitProduct === undefined
      ? []
      : [
          ...(INGREDIENT_UNITS.includes(unitProduct.unitLabel as (typeof INGREDIENT_UNITS)[number])
            ? []
            : [{ value: PRODUCT_UNIT, label: displayUnit(unitProduct.unitLabel) }]),
          ...INGREDIENT_UNITS.map((u) => ({ value: u as string, label: displayUnit(u) })),
        ];
  const selectedUnit =
    unitDraft === undefined
      ? null
      : (unitDraft.unit ??
        (unitOptions.some((o) => o.value === unitProduct?.unitLabel)
          ? (unitProduct?.unitLabel ?? null)
          : PRODUCT_UNIT));

  return (
    <View className="flex-1">
      <Screen>
        <ScreenHeader
          form="modal"
          title={existing === undefined ? 'Nouvelle recette' : 'Modifier la recette'}
          leftAction={{ label: 'Annuler', onPress: back }}
          actions={[
            { label: 'Enregistrer', onPress: () => void save(), disabled: saving || !changed },
          ]}
        />
        <TextInput
          label="Nom"
          value={name}
          placeholder="Ex. Carbonara"
          error={nameError}
          onChangeText={(text) => {
            setName(text);
            if (text.trim() !== '') setNameError(null);
          }}
        />

        <View className="gap-1 pt-2">
          <Text variant="title-section">Ingrédients</Text>
          {ingredientsError && ingredients.length === 0 && (
            <Text variant="caption" tone="alert">
              Ajoute au moins un ingrédient
            </Text>
          )}
        </View>
        <RowGroup>
          {ingredients.map((ingredient) => {
            const product = engine.productById.get(ingredient.productId);
            return (
              <View key={ingredient.productId}>
                <IngredientRow
                  name={product?.name ?? '…'}
                  quantity={ingredient.quantity}
                  unit={ingredient.unit ?? product?.unitLabel ?? ''}
                  onQuantity={(text) => update(ingredient.productId, { quantity: text })}
                  onUnit={() => setUnitFor(ingredient.productId)}
                  onRemove={() =>
                    setIngredients((list) =>
                      list.filter((i) => i.productId !== ingredient.productId),
                    )
                  }
                />
                <Divider />
              </View>
            );
          })}
          <Pressable
            feedback="highlight"
            onPress={() => setAdding(true)}
            className="min-h-row flex-row items-center justify-between gap-3 px-4 py-2"
          >
            <Text variant="body-strong" tone="action" className="flex-1">
              Ajouter un ingrédient
            </Text>
            <Glyph icon={Plus} color="action" />
          </Pressable>
        </RowGroup>
        {noting ? (
          <TextInput
            label="Note"
            labelHidden
            multiline
            autoFocus={notes === ''}
            value={notes}
            onChangeText={setNotes}
            onBlur={() => setNoting(notes.trim() !== '')}
            placeholder="Un tour de main, une variante, ce que tu veux…"
          />
        ) : (
          <Button
            variant="text"
            tone="muted"
            label="Ajouter une note"
            onPress={() => setNoting(true)}
          />
        )}

        <OptionSheet
          visible={unitFor !== null}
          title="Unité"
          options={unitOptions}
          selected={selectedUnit}
          onSelect={(value) => {
            if (unitFor === null) return;
            update(unitFor, {
              unit: value === PRODUCT_UNIT || value === unitProduct?.unitLabel ? null : value,
            });
          }}
          onClose={() => setUnitFor(null)}
        />
      </Screen>
      {adding && (
        <IngredientPanel
          engine={engine}
          added={added}
          onPick={pick}
          onClose={() => setAdding(false)}
        />
      )}
    </View>
  );
}
