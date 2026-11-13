import type { DeletedProduct, ProductRecord } from '@commedab/data';
import { useState } from 'react';
import { ConfirmSheet } from '../../components/confirm-sheet';
import { useToast } from '../../components/toast';
import { listOf } from '../../copy/words';
import { useEngine } from '../../data/engine';
import { useData } from '../../data/provider';
import { useWrite } from '../../data/use-write';

/**
 * Suppression d'un produit jamais acheté ou qu'on n'achète plus (EF-3.9), depuis sa fiche ou
 * d'un glissement dans l'annuaire : sans confirmation, le message éphémère l'annule ; seul un
 * produit pris dans des recettes ouvre d'abord la feuille `sheet`, qui les cite.
 */
export function useProductRemoval(onRemoved?: () => void) {
  const engine = useEngine();
  const data = useData();
  const write = useWrite();
  const toast = useToast();
  const [asking, setAsking] = useState<ProductRecord | null>(null);

  const recipesOf = (productId: string) =>
    engine.recipes
      .filter((recipe) => recipe.ingredients.some((i) => i.productId === productId))
      .map((recipe) => `« ${recipe.name} »`);

  const run = async (product: ProductRecord) => {
    let deleted: DeletedProduct | null = null;
    const ok = await write(async () => {
      deleted = await data.products.deleteProduct(product.id);
    });
    const removed = deleted as DeletedProduct | null;
    if (!ok || removed === null) return;
    onRemoved?.();
    toast.show({
      message: `${product.name} supprimé`,
      action: {
        label: 'Annuler',
        onPress: () => void write(() => data.products.restoreProduct(removed)),
      },
    });
  };

  return {
    /** Vrai : `remove` demandera une confirmation au lieu de supprimer. */
    confirms: (product: ProductRecord) => recipesOf(product.id).length > 0,
    remove: (product: ProductRecord) =>
      recipesOf(product.id).length > 0 ? setAsking(product) : void run(product),
    sheet: (
      <ConfirmSheet
        visible={asking !== null}
        question={`Supprimer ${asking?.name ?? ''} ?`}
        consequence={`Il sera retiré de ${listOf(asking === null ? [] : recipesOf(asking.id))}.`}
        confirmLabel="Supprimer le produit"
        onCancel={() => setAsking(null)}
        onConfirm={() => {
          const product = asking;
          setAsking(null);
          if (product !== null) void run(product);
        }}
      />
    ),
  };
}
