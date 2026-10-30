import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'phosphor-react-native';
import { Platform, View } from 'react-native';
import { opacity, size } from '../theme';
import { Button } from './button';
import { Glyph } from './icons';
import { Pressable } from './pressable';
import { Text } from './text';

function tick() {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * `− N +`. Variante liste : fond `action-soft`, « sur la liste », le `−` à `min` passe en
 * `alert` parce qu'il retire. Variante champ (`field`) : un réglage, jamais en vert.
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
        disabled={disabled || (field && value <= min)}
        onPress={() => step(value - 1)}
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
        disabled={disabled || value >= max}
        onPress={() => step(value + 1)}
        accessibilityLabel="Plus"
        className="min-h-control-sm min-w-control-sm items-center justify-center"
      >
        <Glyph icon={Plus} size={size['icon-sm']} color={tone} />
      </Pressable>
    </View>
  );
}

/**
 * Le composant d'ajout commun (components.md, AddControl ; EF-2.9) : un bouton tant que le
 * produit ou la recette n'est pas sur la liste, un stepper ensuite, dont le `−` à 1 retire.
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
  return (
    <View style={pending ? { opacity: opacity.busy } : undefined}>
      {quantity === null ? (
        <Button
          variant="outline"
          label={addLabel}
          disabled={disabled}
          onPress={() => {
            tick();
            onChange(suggested);
          }}
        />
      ) : (
        <Stepper
          value={quantity}
          onChange={onChange}
          label={quantityLabel?.(quantity)}
          disabled={disabled}
        />
      )}
    </View>
  );
}

export { tick as stepHaptic };
