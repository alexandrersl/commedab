import { useRef, useState, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable as RNPressable,
  ScrollView,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NO_PAN, useKeyboardInset } from '../../components/keyboard-inset';
import { SearchField } from '../../components/search-field';
import { SheetHandle, SheetPullZone, useSheetMotion } from '../../components/sheet-motion';
import type { Engine } from '../../data/engine';
import { submitResult } from '@commedab/core';
import { size, space } from '../../theme';
import { IngredientSearch, ingredientResults, type IngredientPick } from './ingredient-search';

/**
 * Le panneau « Ajouter un ingrédient » (EF-4.2), sur le modèle du panneau Ajouter de la Liste :
 * il monte par-dessus la recette, dont le haut reste visible sous le voile, et reste ouvert
 * d'un ingrédient à l'autre. `onPick` rend vrai quand l'ingrédient est entré dans la recette.
 */
export function IngredientPanel({
  engine,
  added,
  onPick,
  onClose,
}: {
  engine: Engine;
  /** Produits déjà dans la recette. */
  added: ReadonlySet<string>;
  onPick: (pick: IngredientPick) => Promise<boolean>;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const motion = useSheetMotion({ onClose });
  const frame = useRef<ComponentRef<typeof View>>(null);
  const keyboard = useKeyboardInset(frame, true);
  const [query, setQuery] = useState('');
  const pick = (choice: IngredientPick) => {
    void onPick(choice).then((ok) => {
      if (ok) setQuery('');
    });
  };
  /** Touche Entrée : met dans la recette le produit que la saisie nomme ; sinon quitte le champ. */
  const submit = (): boolean => {
    const target = submitResult(ingredientResults(engine, query));
    if (target?.kind === 'catalog') pick({ kind: 'catalog', entry: target.entry });
    else if (target?.kind !== 'product') return false;
    else if (added.has(target.product.id)) setQuery('');
    else pick({ kind: 'product', productId: target.product.id });
    return true;
  };

  return (
    <View ref={frame} className="absolute bottom-0 left-0 right-0 top-0">
      <Animated.View
        className="absolute bottom-0 left-0 right-0 top-0 bg-scrim"
        style={motion.scrim}
      />
      <RNPressable
        accessibilityRole="button"
        accessibilityLabel="Fermer"
        onPress={motion.dismiss}
        style={{ ...NO_PAN, height: insets.top + size.row * 2 }}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          className="flex-1 overflow-hidden rounded-t-sheet bg-ground"
          style={motion.panel}
          onLayout={motion.onLayout}
        >
          <SheetHandle />
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-3 px-4 pb-4 pt-2"
          >
            <IngredientSearch engine={engine} query={query} added={added} onPick={pick} />
          </ScrollView>
          <View
            className="border-t-thin border-line bg-surface px-4 py-2"
            // Le fond du champ descend sous le clavier : translucide sur iOS, il laisserait voir
            // l'écran de derrière. Sur le web, un doigt qui glisse sur le champ ne fait pas
            // défiler la page (`touchAction`).
            style={{
              ...NO_PAN,
              paddingBottom:
                keyboard > 0 ? keyboard + space['2'] : Math.max(insets.bottom, space['2']),
            }}
          >
            <SearchField
              value={query}
              onChange={setQuery}
              onClose={motion.dismiss}
              onSubmit={submit}
              placeholder="Un produit…"
              autoFocus
            />
          </View>
          <SheetPullZone pull={motion.pull} />
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
