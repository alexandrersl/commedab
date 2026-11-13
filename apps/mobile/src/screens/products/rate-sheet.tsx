import { toDaysPerUnit, toPerPeriod, type ProductState, type RatePeriod } from '@commedab/core';
import { useState } from 'react';
import { View } from 'react-native';
import { Stepper } from '../../components/add-control';
import { Button } from '../../components/button';
import { Segmented } from '../../components/setting-field';
import { Sheet } from '../../components/sheet';
import { Text } from '../../components/text';
import { PERIOD_LABELS } from '../../copy/estimate';
import { format } from '../../copy/words';

const PERIODS = [
  { value: 'day', label: 'par jour' },
  { value: 'week', label: 'par semaine' },
  { value: 'month', label: 'par mois' },
] as const;

/** Ce que le moteur dit de ce qu'il sait, en tête de la feuille (EF-3.3). */
function Intro({ state }: { state: ProductState | undefined }) {
  const rate = state?.rate;
  if (rate === undefined || rate.source === 'none') {
    return (
      <Text variant="body-sm" tone="muted">
        Je ne sais pas encore combien tu en prends. Dis-le moi, je m&apos;en servirai tout de suite.
      </Text>
    );
  }
  const { quantity, period } = toPerPeriod(rate.perDay);
  const value = `${format(quantity)} par ${PERIOD_LABELS[period]}`;
  if (rate.source === 'learned') {
    return (
      <Text variant="body-sm" tone="muted">
        J&apos;ai appris{' '}
        <Text variant="body-sm" className="font-Manrope_700Bold">
          {value}
        </Text>{' '}
        sur tes {rate.intervalCount + 1} derniers achats. Corrige si je me trompe.
      </Text>
    );
  }
  if (rate.source === 'declared') {
    return (
      <Text variant="body-sm" tone="muted">
        Tu m&apos;as dit{' '}
        <Text variant="body-sm" className="font-Manrope_700Bold">
          {value}
        </Text>
        . Change-le, ou laisse-moi apprendre de tes achats.
      </Text>
    );
  }
  return (
    <Text variant="body-sm" tone="muted">
      D&apos;habitude, on en prend{' '}
      <Text variant="body-sm" className="font-Manrope_700Bold">
        {value}
      </Text>
      . Corrige si ce n&apos;est pas ton cas.
    </Text>
  );
}

function initial(state: ProductState | undefined): { quantity: number; period: RatePeriod } {
  const perDay = state?.rate.perDay ?? 0;
  return perDay > 0 ? toPerPeriod(perDay) : { quantity: 1, period: 'week' };
}

/**
 * Feuille « Tu en prends » (components.md, SettingField) : quantité, période, « Enregistrer »,
 * actif dès que la valeur diffère de celle affichée à l'ouverture (ou tant qu'aucun rythme
 * n'est connu), et « Revenir à ce que j'ai appris » quand le rythme est déclaré. Seule la durée par unité
 * est enregistrée (specs techniques 4.3).
 */
export function RateSheet({
  visible,
  state,
  onSave,
  onClose,
}: {
  visible: boolean;
  state: ProductState | undefined;
  onSave: (declaredDaysPerUnit: number | null) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(() => initial(state));
  const [shown, setShown] = useState(visible);
  if (visible !== shown) {
    setShown(visible);
    if (visible) setValue(initial(state));
  }
  const start = initial(state);
  const unchanged =
    (state?.rate.perDay ?? 0) > 0 &&
    value.quantity === start.quantity &&
    value.period === start.period;
  return (
    <Sheet visible={visible} onClose={onClose} title="Tu en prends">
      <Intro state={state} />
      <View className="min-h-control flex-row items-center justify-between">
        <Text variant="body">Quantité</Text>
        <Stepper
          field
          min={1}
          value={value.quantity}
          onChange={(quantity) => setValue({ ...value, quantity })}
        />
      </View>
      <Segmented
        options={PERIODS}
        value={value.period}
        onChange={(period) => setValue({ ...value, period })}
      />
      <Button
        label="Enregistrer"
        disabled={unchanged}
        onPress={() => {
          onSave(toDaysPerUnit(value));
          onClose();
        }}
      />
      {state?.rate.source === 'declared' && (
        <Button
          variant="text"
          label="Revenir à ce que j'ai appris"
          onPress={() => {
            onSave(null);
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}
