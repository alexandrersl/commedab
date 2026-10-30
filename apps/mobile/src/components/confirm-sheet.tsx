import { Button } from './button';
import { Sheet } from './sheet';
import { Text } from './text';

/**
 * La seule confirmation de l'app, pour l'irréversible (components.md, ConfirmSheet ; ENF-8) :
 * la question, ce qui se passe vraiment, un bouton qui répète l'action, « Annuler ».
 */
export function ConfirmSheet({
  visible,
  question,
  consequence,
  confirmLabel,
  onConfirm,
  onCancel,
  loading = false,
}: {
  visible: boolean;
  question: string;
  consequence: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <Sheet visible={visible} onClose={onCancel}>
      <Text variant="sentence">{question}</Text>
      <Text variant="body-sm" tone="muted">
        {consequence}
      </Text>
      <Button variant="alert" label={confirmLabel} onPress={onConfirm} loading={loading} />
      <Button variant="text" label="Annuler" onPress={onCancel} />
    </Sheet>
  );
}
