import { addDays, daysBetween, type LocalDateTime } from '@commedab/core';
import type { ProductRecord, PurchaseRecord } from '@commedab/data';
import { useState } from 'react';
import { View } from 'react-native';
import { Stepper } from '../../components/add-control';
import { Pressable } from '../../components/pressable';
import { Sheet } from '../../components/sheet';
import { Text } from '../../components/text';
import { historyDate } from '../../copy/dates';
import { count } from '../../copy/words';

export interface PurchaseChanges {
  quantity?: number;
  occurredAt?: Date;
}

/** Même heure, `days` jours plus tard ; en `Date` locale pour `editPurchase`. */
function shifted(at: LocalDateTime, days: number): { local: LocalDateTime; date: Date } {
  const local = `${addDays(at, days)}${at.slice(10)}`;
  const [y, m, d, h, min, s] = local.split(/[-T:]/).map(Number);
  return { local, date: new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0, s ?? 0) };
}

/**
 * Corriger un achat de l'historique (EF-3.4) : sa date, jamais après aujourd'hui, et sa
 * quantité en unités, enregistrées à la fermeture de la feuille, sans bouton Valider ; ou le
 * supprimer.
 */
export function PurchaseSheet({
  product,
  purchase,
  now,
  onSave,
  onDelete,
  onClose,
}: {
  product: ProductRecord;
  purchase: PurchaseRecord | null;
  now: LocalDateTime;
  onSave: (purchase: PurchaseRecord, changes: PurchaseChanges) => void;
  onDelete: (purchase: PurchaseRecord) => void;
  onClose: () => void;
}) {
  const [units, setUnits] = useState(purchase?.quantity ?? 1);
  const [days, setDays] = useState(0);
  const [shownId, setShownId] = useState(purchase?.id ?? null);
  if ((purchase?.id ?? null) !== shownId) {
    setShownId(purchase?.id ?? null);
    setUnits(purchase?.quantity ?? 1);
    setDays(0);
  }
  const close = () => {
    if (purchase !== null && (units !== purchase.quantity || days !== 0)) {
      onSave(purchase, {
        ...(units !== purchase.quantity && { quantity: units }),
        ...(days !== 0 && { occurredAt: shifted(purchase.occurredAt, days).date }),
      });
    }
    onClose();
  };
  return (
    <Sheet visible={purchase !== null} onClose={close} title="Corriger l'achat">
      {purchase !== null && (
        <>
          <View className="min-h-control flex-row items-center justify-between">
            <Text variant="body">Date</Text>
            <Stepper
              field
              min={Number.NEGATIVE_INFINITY}
              max={daysBetween(purchase.occurredAt, now)}
              value={days}
              label={historyDate(shifted(purchase.occurredAt, days).local)}
              onChange={setDays}
            />
          </View>
          <View className="min-h-control flex-row items-center justify-between">
            <Text variant="body">{count(units, product.unitLabel)}</Text>
            <Stepper field min={1} value={units} onChange={setUnits} />
          </View>
        </>
      )}
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
