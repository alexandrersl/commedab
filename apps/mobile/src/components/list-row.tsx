import { Check, type Icon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { opacity, size } from '../theme';
import { CategoryIcon, Glyph } from './icons';
import { Pressable } from './pressable';
import { SwipeRow } from './swipe-row';
import { Text } from './text';

/**
 * Une ligne de la liste (components.md, ListRow ; EF-1.3 à EF-1.5), et la même ligne pour les
 * résultats de recherche et les ingrédients (`accessory` à la place de la quantité, sans case).
 */
export function ListRow({
  name,
  nameDetail,
  subtitle,
  subtitleTone = 'muted',
  quantityLabel,
  checked = false,
  dim = false,
  highlight = false,
  pending = false,
  onPress,
  onLongPress,
  onRemove,
  removeLabel = 'Retirer',
  removeStays = false,
  accessory,
  checkbox = true,
  card = true,
}: {
  name: string;
  /** Après le nom, en graisse normale : la quantité d'un ingrédient (« Lardons 200 g »). */
  nameDetail?: string | null | undefined;
  subtitle?: string | null | undefined;
  subtitleTone?: 'muted' | 'alert' | 'action';
  quantityLabel?: string | undefined;
  checked?: boolean;
  /** Nom en `ink-muted`, sans rien désactiver : un produit qu'on n'achète plus. */
  dim?: boolean;
  highlight?: boolean;
  /** Écrite sur l'appareil, pas encore envoyée : utilisable. */
  pending?: boolean;
  onPress?: (() => void) | undefined;
  onLongPress?: (() => void) | undefined;
  /** Glisser à gauche découvre « Retirer » ; glisser loin retire (SwipeRow). */
  onRemove?: (() => void) | undefined;
  /** Le mot du bouton découvert : « Supprimer », « Je n'en achète plus ». */
  removeLabel?: string;
  /** L'action demande encore une confirmation : la ligne reste en place. */
  removeStays?: boolean;
  accessory?: ReactNode;
  checkbox?: boolean;
  /** Faux : posée à même le fond du panneau Ajouter, comme sur sa planche. */
  card?: boolean;
}) {
  const className = `min-h-row flex-row items-center px-4 py-2 ${
    highlight ? 'border-l-focus border-action bg-surface-2' : card ? 'bg-surface' : 'bg-transparent'
  }`;
  // L'attente atténue le contenu, pas le fond : opaque, la ligne cache l'action « Retirer »
  // dessinée dessous pour le glissement.
  const content = (
    <View
      className="flex-1 flex-row items-center gap-3"
      style={pending ? { opacity: opacity.pending } : undefined}
    >
      {checkbox && (
        <View
          className={`h-checkbox w-checkbox items-center justify-center rounded-pill ${
            checked ? 'bg-action' : 'border-strong border-line-strong'
          }`}
        >
          {checked && <Glyph icon={Check} color="on-action" size={size['icon-xs']} weight="bold" />}
        </View>
      )}
      <View className="flex-1">
        <Text
          variant="body-strong"
          tone={checked || dim ? 'muted' : 'ink'}
          className={checked ? 'line-through' : ''}
        >
          {name}
          {nameDetail ? <Text variant="body"> {nameDetail}</Text> : null}
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
    </View>
  );
  // Sans geste, la ligne n'est pas un bouton : son `accessory` (AddControl) en est un.
  const row =
    onPress === undefined && onLongPress === undefined ? (
      <View className={className}>{content}</View>
    ) : (
      <Pressable
        feedback="highlight"
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole={checkbox ? 'checkbox' : 'button'}
        aria-checked={checkbox ? checked : undefined}
        className={className}
      >
        {content}
      </Pressable>
    );
  if (onRemove === undefined) return row;
  return (
    <SwipeRow
      label={`${removeLabel} ${name}`}
      action={removeLabel}
      stays={removeStays}
      onRemove={onRemove}
      resetKey={name}
    >
      {row}
    </SwipeRow>
  );
}

/**
 * En-tête d'une carte de l'annuaire ou de la liste : l'icône du rayon (ou `icon`), le nom en
 * petites capitales, puis `trailing` à droite (components.md, ListRow).
 */
export function SectionHeader({
  name,
  categoryKey,
  icon,
  trailing,
  clear = false,
}: {
  name: string;
  categoryKey: string | null;
  icon?: Icon;
  trailing?: ReactNode;
  /** Sans fond : l'en-tête est dans une surface tapable, dont l'état pressé doit se voir. */
  clear?: boolean;
}) {
  return (
    <View className={`flex-row items-center gap-2 px-4 pb-1 pt-3 ${clear ? '' : 'bg-surface'}`}>
      {icon === undefined ? (
        <CategoryIcon categoryKey={categoryKey} />
      ) : (
        <Glyph icon={icon} color="ink-muted" size={size['icon-xs']} />
      )}
      <Text variant="tab" tone="muted" className="flex-1 uppercase">
        {name}
      </Text>
      {trailing}
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
