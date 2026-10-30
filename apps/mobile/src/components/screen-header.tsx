import { CaretLeft } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Glyph } from './icons';
import { Pressable } from './pressable';
import { Text } from './text';

export interface HeaderAction {
  label: string;
  onPress: () => void;
  tone?: 'action' | 'alert';
  disabled?: boolean;
}

function ActionButton({ action }: { action: HeaderAction }) {
  return (
    <Pressable
      small
      onPress={action.onPress}
      disabled={action.disabled}
      className="min-h-control-sm justify-center"
    >
      <Text variant="button" tone={action.tone ?? 'action'}>
        {action.label}
      </Text>
    </Pressable>
  );
}

/**
 * En-tête d'un écran (components.md, ScreenHeader). Racine : titre et méta ou action à droite.
 * Fiche : retour, au plus deux actions, puis le nom et sa méta. `centered` : écran secondaire
 * à titre court (« Tu n'achètes plus », « Nouvelle recette »), comme sur les planches.
 */
export function ScreenHeader({
  title,
  meta,
  right,
  onBack,
  actions = [],
  leftAction,
  metaTone = 'muted',
  form = 'root',
}: {
  title: string;
  meta?: string | undefined;
  /** Méta d'une fiche recette : `alert` quand il manque des ingrédients, `action` quand rien. */
  metaTone?: 'muted' | 'alert' | 'action';
  right?: ReactNode;
  onBack?: (() => void) | undefined;
  actions?: readonly HeaderAction[];
  leftAction?: HeaderAction | undefined;
  form?: 'root' | 'sheet' | 'centered';
}) {
  if (form === 'root') {
    return (
      <View className="flex-row items-center justify-between gap-3 pb-3 pt-6">
        <Text variant="title-screen" accessibilityRole="header">
          {title}
        </Text>
        {right ??
          (meta !== undefined && (
            <Text variant="label" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
              {meta}
            </Text>
          ))}
      </View>
    );
  }
  const back = onBack !== undefined && (
    <Pressable
      small
      onPress={onBack}
      accessibilityLabel="Retour"
      className="min-h-control-sm justify-center"
    >
      <Glyph icon={CaretLeft} />
    </Pressable>
  );
  if (form === 'centered') {
    return (
      <View className="min-h-control flex-row items-center justify-between gap-3 pt-6">
        <View className="flex-1 items-start">
          {leftAction ? <ActionButton action={leftAction} /> : back}
        </View>
        <Text variant="title-section" accessibilityRole="header">
          {title}
        </Text>
        <View className="flex-1 items-end">
          {actions[0] !== undefined && <ActionButton action={actions[0]} />}
        </View>
      </View>
    );
  }
  return (
    <View className="gap-1 pb-3 pt-6">
      <View className="min-h-control flex-row items-center justify-between">
        {back}
        <View className="flex-row gap-6">
          {actions.slice(0, 2).map((action) => (
            <ActionButton key={action.label} action={action} />
          ))}
        </View>
      </View>
      <Text variant="title-hero" accessibilityRole="header">
        {title}
      </Text>
      {meta !== undefined && (
        <Text variant="label" tone={metaTone}>
          {meta}
        </Text>
      )}
    </View>
  );
}
