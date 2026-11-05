import { View } from 'react-native';
import { Pressable } from './pressable';
import { Text } from './text';

/**
 * Pastille d'ingrédient ou de choix (components.md, Pill) : `missing` manquant, `owned`
 * probablement là (barré), `choice` une option à choisir, `selected` quand elle est retenue.
 */
export function Pill({
  label,
  kind,
  selected = false,
  onPress,
}: {
  label: string;
  kind: 'missing' | 'owned' | 'choice';
  selected?: boolean;
  onPress?: () => void;
}) {
  if (kind === 'choice') {
    return (
      <Pressable
        feedback="scale"
        onPress={onPress}
        small
        accessibilityState={{ selected }}
        className={`min-h-control-sm justify-center rounded-pill border-thin px-3 ${
          selected ? 'border-action bg-action-soft' : 'border-line-strong bg-surface'
        }`}
      >
        <Text variant="label" tone={selected ? 'action' : 'ink'}>
          {label}
        </Text>
      </Pressable>
    );
  }
  return (
    <View
      className={`justify-center rounded-pill px-3 py-1 ${kind === 'missing' ? 'bg-alert-soft' : 'bg-surface-2'}`}
    >
      <Text
        variant="label"
        tone={kind === 'missing' ? 'alert' : 'muted'}
        className={kind === 'owned' ? 'line-through' : ''}
      >
        {label}
      </Text>
    </View>
  );
}

/** Chiffre ou mot court (components.md, Pill) : suggestions de la barre « Ajouter », « NEW ». */
export function Badge({ value, tone }: { value: string; tone: 'inverse' | 'alert' }) {
  return (
    <View
      className={`min-w-control-sm items-center justify-center rounded-pill px-2 ${
        tone === 'inverse' ? 'bg-on-action' : 'bg-alert-soft'
      }`}
    >
      <Text variant="caption" tone={tone === 'inverse' ? 'action' : 'alert'}>
        {value}
      </Text>
    </View>
  );
}
