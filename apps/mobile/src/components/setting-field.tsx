import { CaretDown } from 'phosphor-react-native';
import { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { ICON, STATE, useTheme } from '../theme';
import { Stepper } from './add-control';
import { Glyph } from './icons';
import { Pressable } from './pressable';
import { Sheet } from './sheet';
import { Text } from './text';

type Field =
  | {
      kind: 'select';
      value: string;
      /** Origine de la valeur, devant elle : `appris`, `déclaré`, `à définir`. */
      hint?: string | undefined;
      onPress: () => void;
      loading?: boolean;
    }
  | {
      kind: 'number' | 'text';
      value: string;
      onChangeText: (text: string) => void;
      /** En quittant le champ : c'est là qu'il s'enregistre. */
      onCommit: () => void;
      /** Sélecteur accolé de l'unité de la valeur (contenance). */
      unit?: { value: string; onPress: () => void } | undefined;
    }
  | { kind: 'stepper'; value: number; onChange: (next: number) => void; min?: number };

const BOX = 'min-h-control-sm flex-row items-center gap-2 rounded-field bg-surface px-3';

function SelectBox({
  value,
  hint,
  loading = false,
  onPress,
  disabled,
}: {
  value: string;
  hint?: string | undefined;
  loading?: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      small
      onPress={onPress}
      disabled={disabled}
      className={`${BOX} border-thin border-line-strong`}
    >
      {hint !== undefined && (
        <Text variant="body-sm" tone="muted">
          {hint}
        </Text>
      )}
      <Text variant="button-sm">{value}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.action} />
      ) : (
        !disabled && <Glyph icon={CaretDown} size={ICON.pill} color="ink-muted" />
      )}
    </Pressable>
  );
}

/**
 * Un champ de réglage (components.md, SettingField) : libellé à gauche, valeur dans un
 * rectangle blanc à droite. Sélecteur (feuille d'options), saisie numérique ou texte
 * (enregistrée en quittant le champ), stepper de valeur. Jamais de bouton « Valider ».
 */
export function SettingField({
  label,
  error,
  disabled = false,
  field,
}: {
  label: string;
  error?: string | null | undefined;
  disabled?: boolean;
  field: Field;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  let control;
  switch (field.kind) {
    case 'select':
      control = (
        <SelectBox
          value={field.value}
          hint={field.hint}
          loading={field.loading ?? false}
          onPress={field.onPress}
          disabled={disabled}
        />
      );
      break;
    case 'stepper':
      control = (
        <Stepper
          field
          value={field.value}
          onChange={field.onChange}
          min={field.min ?? 1}
          disabled={disabled}
        />
      );
      break;
    default: {
      const border = error
        ? 'border-strong border-alert'
        : focused
          ? 'border-strong border-action'
          : 'border-thin border-line-strong';
      control = (
        <View className="flex-row gap-2">
          <View className={`${BOX} ${border}`}>
            <TextInput
              value={field.value}
              onChangeText={field.onChangeText}
              editable={!disabled}
              inputMode={field.kind === 'number' ? 'decimal' : 'text'}
              selectionColor={colors.action}
              placeholder="–"
              placeholderTextColor={colors['ink-muted']}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                field.onCommit();
              }}
              onSubmitEditing={field.onCommit}
              accessibilityLabel={label}
              className={`type-button-sm min-w-control text-ink ${field.kind === 'number' ? 'text-right' : ''}`}
              style={field.kind === 'number' ? { fontVariant: ['tabular-nums'] } : undefined}
            />
          </View>
          {field.unit !== undefined && (
            <SelectBox value={field.unit.value} onPress={field.unit.onPress} disabled={disabled} />
          )}
        </View>
      );
    }
  }
  const open = field.kind === 'select' && !disabled ? field.onPress : undefined;
  return (
    <Pressable
      onPress={open}
      disabled={open === undefined}
      accessibilityRole={open === undefined ? 'none' : 'button'}
      className="min-h-row flex-row items-center justify-between gap-3 px-4 py-2"
      style={disabled ? { opacity: STATE.disabled } : undefined}
    >
      <View className="flex-1">
        <Text variant="body">{label}</Text>
        {error ? (
          <Text variant="caption" tone="alert">
            {error}
          </Text>
        ) : null}
      </View>
      {control}
    </Pressable>
  );
}

/** Feuille d'options d'un sélecteur : boutons radio, l'option courante en `action`. */
export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: readonly { value: T; label: string }[];
  selected: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <View>
        {options.map((option, i) => {
          const active = option.value === selected;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => {
                onSelect(option.value);
                onClose();
              }}
              className={`min-h-control flex-row items-center justify-between ${
                i > 0 ? 'border-t-thin border-line' : ''
              }`}
            >
              <Text variant="body" tone={active ? 'action' : 'ink'}>
                {option.label}
              </Text>
              <View
                className={`h-checkbox w-checkbox items-center justify-center rounded-pill ${
                  active ? 'border-focus border-action' : 'border-strong border-line-strong'
                }`}
              >
                {active && <View className="h-2 w-2 rounded-pill bg-action" />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/** Segment « par jour / par semaine / par mois » : capsule `surface-2`, option active en `surface`. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="min-h-control flex-row rounded-pill bg-surface-2 p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => onChange(option.value)}
            className={`flex-1 items-center justify-center rounded-pill ${active ? 'bg-surface' : ''}`}
          >
            <Text variant="label" tone={active ? 'ink' : 'muted'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
