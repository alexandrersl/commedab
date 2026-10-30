import type { IngredientRecord } from '@commedab/data';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Divider, RowGroup } from '../components/list-row';
import { Screen } from '../components/screen';
import { ScreenHeader } from '../components/screen-header';
import { SearchField } from '../components/search-field';
import { OptionSheet } from '../components/setting-field';
import { Text } from '../components/text';
import { TextInput } from '../components/text-input';
import { displayUnit, format, INGREDIENT_UNITS } from '../copy/words';
import { useEngine } from '../data/engine';
import { useData } from '../data/provider';
import { IngredientRow } from '../screens/recipes/ingredient-row';
import { IngredientSearch, type IngredientPick } from '../screens/recipes/ingredient-search';
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
 * préchargé. Seul le nom est obligatoire ; « Annuler » ne garde rien.
 */
export default function RecipeEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const engine = useEngine();
  const data = useData();
  const write = useWrite();
  const existing = id === undefined ? undefined : engine.recipeById.get(id);
  const [name, setName] = useState(existing?.name ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [ingredients, setIngredients] = useState<Draft[]>(
    () => existing?.ingredients.map(draftOf) ?? [],
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [unitFor, setUnitFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const exclude = useMemo(() => new Set(ingredients.map((i) => i.productId)), [ingredients]);
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

  const pick = async (choice: IngredientPick) => {
    if (choice.kind === 'product') {
      append(choice.productId);
      return;
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
    if (ok && created !== null) {
      append(created);
      if (choice.kind === 'create') setQuery('');
    }
  };

  const save = async () => {
    if (name.trim() === '') {
      setNameError('Donne un nom à ta recette');
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
    const ok = await write(() => data.recipes.saveRecipe(input));
    setSaving(false);
    if (ok) back();
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
    <Screen
      footer={
        <SearchField value={query} onChange={setQuery} placeholder="Ajouter un ingrédient…" />
      }
    >
      <ScreenHeader
        form="centered"
        title={existing === undefined ? 'Nouvelle recette' : 'Modifier la recette'}
        leftAction={{ label: 'Annuler', onPress: back }}
        actions={[{ label: 'Enregistrer', onPress: () => void save(), disabled: saving }]}
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

      <Text variant="title-section" className="pt-2">
        {query.trim() === '' || ingredients.length === 0
          ? 'Ingrédients'
          : `Ingrédients · ${ingredients.length}`}
      </Text>
      {query.trim() !== '' ? (
        <IngredientSearch
          engine={engine}
          query={query}
          exclude={exclude}
          onPick={(choice) => void pick(choice)}
        />
      ) : (
        <>
          {ingredients.length > 0 && (
            <RowGroup>
              {ingredients.map((ingredient, index) => {
                const product = engine.productById.get(ingredient.productId);
                return (
                  <View key={ingredient.productId}>
                    {index > 0 && <Divider />}
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
                  </View>
                );
              })}
            </RowGroup>
          )}
          <Text variant="title-section" className="pt-2">
            Notes
          </Text>
          <TextInput
            label="Notes"
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="Un tour de main, une variante, ce que tu veux…"
          />
        </>
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
  );
}
