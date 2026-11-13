import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { opacity, size, tokens } from '../theme';
import { Button } from './button';
import { Glyph } from './icons';
import { Pressable } from './pressable';
import { Text } from './text';

function tick() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Cadence des pas répétés sous un appui maintenu : celle du changement de chiffre
 * (`duration-fast`), gardée quand le système réduit les animations.
 */
const REPEAT_MS = Number.parseFloat(tokens.duration.fast);

/** Pas répétés tant que le doigt reste sur `−` ou `+` : un mois d'écart sans trente taps. */
function useRepeat() {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  return {
    start(step: () => boolean) {
      stop();
      timer.current = setInterval(() => {
        if (!step()) stop();
      }, REPEAT_MS);
    },
    stop,
  };
}

/**
 * `− N +`. Variante liste : fond `action-soft`, « sur la liste », le `−` à `min` passe en
 * `alert` parce qu'il retire. Variante champ (`field`) : un réglage, jamais en vert. Un appui
 * maintenu répète le pas, sans jamais retirer : il s'arrête à 1 sur la liste.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  label,
  field = false,
  disabled = false,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Texte du chiffre (« 1 pack ») ; le chiffre seul sinon. */
  label?: string | undefined;
  field?: boolean;
  disabled?: boolean;
}) {
  const removes = !field && value <= 1 && min === 0;
  const step = (next: number) => {
    tick();
    onChange(next);
  };
  const current = useRef(value);
  useEffect(() => {
    current.current = value;
  }, [value]);
  const repeat = useRepeat();
  const floor = field ? min : Math.max(min, 1);
  const hold = (delta: 1 | -1) => () =>
    repeat.start(() => {
      const next = current.current + delta;
      if (next < floor || next > max) return false;
      current.current = next;
      step(next);
      return true;
    });
  const tone = field ? 'ink-muted' : 'action';
  return (
    <View
      className={`min-h-control-sm flex-row items-center gap-1 px-1 ${
        field
          ? 'rounded-field border-thin border-line-strong bg-surface'
          : 'rounded-pill border-thin border-action bg-action-soft'
      }`}
      style={disabled ? { opacity: opacity.disabled } : undefined}
    >
      <Pressable
        small
        feedback="scale"
        disabled={disabled || (field && value <= min)}
        onPress={() => step(value - 1)}
        onLongPress={hold(-1)}
        onPressOut={repeat.stop}
        accessibilityLabel={removes ? 'Retirer' : 'Moins'}
        className="min-h-control-sm min-w-control-sm items-center justify-center"
      >
        <Glyph icon={Minus} size={size['icon-sm']} color={removes ? 'alert' : tone} />
      </Pressable>
      <Text
        variant="button-sm"
        tone={field ? 'ink' : 'action'}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {label ?? String(value)}
      </Text>
      <Pressable
        small
        feedback="scale"
        disabled={disabled || value >= max}
        onPress={() => step(value + 1)}
        onLongPress={hold(1)}
        onPressOut={repeat.stop}
        accessibilityLabel="Plus"
        className="min-h-control-sm min-w-control-sm items-center justify-center"
      >
        <Glyph icon={Plus} size={size['icon-sm']} color={tone} />
      </Pressable>
    </View>
  );
}

/** Sans retour de la base après ce délai (écriture refusée), l'affichage revient à sa valeur. */
const SETTLE_MS = Number.parseFloat(tokens.duration.slow) * 8;

/**
 * Quantité affichée sans attendre l'écriture : le tap change l'affichage aussitôt. `onChange`
 * n'est rappelé qu'une fois la valeur précédente revenue de la base, avec la dernière valeur
 * tapée : une écriture part toujours d'un état à jour, et des taps rapprochés n'en font qu'une.
 * 0 : pas sur la liste.
 */
function useOptimisticQuantity(
  quantity: number,
  onChange: (next: number) => void,
): [number, (next: number) => void] {
  const [shown, setShown] = useState<number | null>(null);
  const [sent, setSent] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const send = useRef(onChange);
  useEffect(() => {
    send.current = onChange;
  });
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  const landed = sent === null || sent === quantity;
  if (shown !== null && shown === quantity && landed) {
    setShown(null);
    setSent(null);
  }
  useEffect(() => {
    if (shown === null || shown === quantity || sent !== quantity) return undefined;
    const next = setTimeout(() => {
      setSent(shown);
      send.current(shown);
    }, 0);
    return () => clearTimeout(next);
  }, [quantity, shown, sent]);

  const change = (next: number) => {
    setShown(next);
    if (sent === null) {
      setSent(next);
      onChange(next);
    }
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSent(null);
      setShown(null);
    }, SETTLE_MS);
  };
  return [shown ?? quantity, change];
}

/**
 * Le composant d'ajout commun (components.md, AddControl ; EF-2.9) : un bouton tant que le
 * produit ou la recette n'est pas sur la liste, un stepper ensuite, dont le `−` à 1 retire.
 * Il répond au tap sans attendre l'écriture (useOptimisticQuantity) ; dans une liste recyclée,
 * lui donner une `key` par produit pour que cet état ne passe pas d'une ligne à l'autre.
 */
export function AddControl({
  quantity,
  onChange,
  addLabel = 'Ajouter',
  suggested = 1,
  quantityLabel,
  pending = false,
  disabled = false,
}: {
  /** Packs sur la liste, ou fois de la recette ; nul : pas sur la liste. */
  quantity: number | null;
  /** Nouvelle quantité ; 0 retire. */
  onChange: (next: number) => void;
  addLabel?: string;
  /** Quantité ajoutée par le bouton. */
  suggested?: number;
  quantityLabel?: ((quantity: number) => string) | undefined;
  pending?: boolean;
  disabled?: boolean;
}) {
  const [shown, change] = useOptimisticQuantity(quantity ?? 0, onChange);
  return (
    <View style={pending ? { opacity: opacity.busy } : undefined}>
      {shown === 0 ? (
        <Button
          variant="outline"
          label={addLabel}
          disabled={disabled}
          onPress={() => {
            tick();
            change(suggested);
          }}
        />
      ) : (
        <Stepper
          value={shown}
          onChange={change}
          label={quantityLabel?.(shown)}
          disabled={disabled}
        />
      )}
    </View>
  );
}

export { tick as stepHaptic };
