import type { ProductRecord, PurchaseRecord } from '@commedab/data';
import { useState } from 'react';
import { View } from 'react-native';
import { Stepper } from '../../components/add-control';
import { Pressable } from '../../components/pressable';
import { Sheet } from '../../components/sheet';
import { Text } from '../../components/text';
import { historyDate } from '../../copy/dates';
import { count } from '../../copy/words';

/** Corriger un achat de l'historique (EF-3.4) : sa quantité, en unités, ou le supprimer. */
export function PurchaseSheet({
  product,
  purchase,
  onQuantity,
  onDelete,
  onClose,
}: {
  product: ProductRecord;
  purchase: PurchaseRecord | null;
  onQuantity: (purchase: PurchaseRecord, units: number) => void;
  onDelete: (purchase: PurchaseRecord) => void;
  onClose: () => void;
}) {
  const [units, setUnits] = useState(purchase?.quantity ?? 1);
  const [shownId, setShownId] = useState(purchase?.id ?? null);
  if ((purchase?.id ?? null) !== shownId) {
    setShownId(purchase?.id ?? null);
    setUnits(purchase?.quantity ?? 1);
  }
  return (
    <Sheet
      visible={purchase !== null}
      onClose={onClose}
      title={purchase === null ? undefined : historyDate(purchase.occurredAt)}
    >
      <View className="min-h-control flex-row items-center justify-between">
        <Text variant="body">{count(units, product.unitLabel)}</Text>
        <Stepper
          field
          min={1}
          value={units}
          onChange={(next) => {
            setUnits(next);
            if (purchase !== null) onQuantity(purchase, next);
          }}
        />
      </View>
      <Pressable
        onPress={() => {
          if (purchase !== null) onDelete(purchase);
          onClose();
        }}
        className="min-h-control justify-center"
      >
        <Text variant="body" tone="alert">
          Supprimer l&apos;achat
        </Text>
      </Pressable>
    </Sheet>
  );
}
