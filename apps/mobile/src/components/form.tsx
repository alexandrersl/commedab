import { Pressable, StyleSheet, Text, TextInput, type TextInputProps } from 'react-native';

export function Field(props: TextInputProps & { label: string }) {
  const { label, style, ...input } = props;
  return (
    <TextInput
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor="#868e96"
      style={[styles.field, style]}
      {...input}
    />
  );
}

export function Button({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'link';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text style={[styles.label, variant === 'primary' && styles.primaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#212529',
    backgroundColor: '#fff',
  },
  button: { minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#212529' },
  secondary: { borderWidth: 1, borderColor: '#ced4da', backgroundColor: '#fff' },
  link: { minHeight: 44 },
  dimmed: { opacity: 0.6 },
  label: { fontSize: 16, fontWeight: '600', color: '#212529' },
  primaryLabel: { color: '#fff' },
});
