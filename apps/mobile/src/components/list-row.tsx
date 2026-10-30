import { Check } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ICON, STATE } from '../theme';
import { CategoryIcon, Glyph } from './icons';
import { Pressable } from './pressable';
import { Text } from './text';

/**
 * Une ligne de la liste (components.md, ListRow ; EF-1.3 à EF-1.5), et la même ligne pour les
 * résultats de recherche et les ingrédients (`accessory` à la place de la quantité, sans case).
 */
export function ListRow({
  name,
  subtitle,
  subtitleTone = 'muted',
  quantityLabel,
  checked = false,
  highlight = false,
  pending = false,
  onPress,
  onLongPress,
  onRemove,
  accessory,
  checkbox = true,
}: {
  name: string;
  subtitle?: string | null | undefined;
  subtitleTone?: 'muted' | 'alert' | 'action';
  quantityLabel?: string | undefined;
  checked?: boolean;
  highlight?: boolean;
  /** Écrite sur l'appareil, pas encore envoyée : utilisable. */
  pending?: boolean;
  onPress?: (() => void) | undefined;
  onLongPress?: (() => void) | undefined;
  /** Glisser à gauche découvre « Retirer ». */
  onRemove?: (() => void) | undefined;
  accessory?: ReactNode;
  checkbox?: boolean;
}) {
  const row = (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={checkbox ? 'checkbox' : 'button'}
      accessibilityState={{ checked }}
      className={`min-h-row flex-row items-center gap-3 px-4 py-2 ${
        highlight ? 'border-l-focus border-action bg-surface-2' : 'bg-surface'
      }`}
      style={pending ? { opacity: STATE.pending } : undefined}
    >
      {checkbox && (
        <View
          className={`h-checkbox w-checkbox items-center justify-center rounded-pill ${
            checked ? 'bg-action' : 'border-strong border-line-strong'
          }`}
        >
          {checked && <Glyph icon={Check} color="on-action" size={ICON.section} weight="bold" />}
        </View>
      )}
      <View className="flex-1">
        <Text
          variant="body-strong"
          tone={checked ? 'muted' : 'ink'}
          className={checked ? 'line-through' : ''}
        >
          {name}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone={subtitleTone}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {accessory ??
        (quantityLabel !== undefined && (
          <Text variant="label" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
            {quantityLabel}
          </Text>
        ))}
    </Pressable>
  );
  if (onRemove === undefined) return row;
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={48}
      renderRightActions={() => (
        <Pressable
          onPress={onRemove}
          accessibilityLabel={`Retirer ${name}`}
          className="flex-1 items-center justify-center bg-alert px-6"
        >
          <Text variant="button-sm" tone="on-action">
            Retirer
          </Text>
        </Pressable>
      )}
    >
      {row}
    </ReanimatedSwipeable>
  );
}

/** En-tête d'un rayon : son icône, son nom en petites capitales (components.md, ListRow). */
export function SectionHeader({ name, categoryKey }: { name: string; categoryKey: string | null }) {
  return (
    <View className="flex-row items-center gap-2 bg-surface px-4 pb-1 pt-3">
      <CategoryIcon categoryKey={categoryKey} />
      <Text variant="tab" tone="muted" className="uppercase">
        {name}
      </Text>
    </View>
  );
}

/** Carte qui regroupe des lignes, séparées d'un filet. */
export function RowGroup({ children }: { children: ReactNode }) {
  return (
    <View className="overflow-hidden rounded-card border-thin border-line bg-surface">
      {children}
    </View>
  );
}

export function Divider() {
  return <View className="mx-4 border-b-thin border-line" />;
}
