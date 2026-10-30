import { useState } from 'react';
import { passwordFailure, setPassword, type AuthFailure } from '../auth/actions';
import { useSession } from '../auth/session';
import { Button } from '../components/button';
import { TextInput } from '../components/text-input';
import { AuthLayout } from '../screens/auth/layout';

/**
 * Nouveau mot de passe (EF-5.10, EF-5.2) : ouvert par le lien de réinitialisation, ou depuis
 * les Réglages, d'où l'on peut revenir sans rien changer.
 */
export default function NewPassword() {
  const { recovery, endRecovery } = useSession();
  const [password, setValue] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<AuthFailure>(null);
  const [mismatch, setMismatch] = useState<AuthFailure>(null);

  const submit = async () => {
    const invalid = passwordFailure(password);
    const different = confirmation === password ? null : "Ce n'est pas le même mot de passe";
    setError(invalid);
    setMismatch(invalid === null ? different : null);
    if (invalid !== null || different !== null) return;
    setSaving(true);
    const failure = await setPassword(password);
    setSaving(false);
    setError(failure);
    if (failure === null) endRecovery();
  };

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      lead="Choisis-en un que tu n'utilises nulle part ailleurs."
      onBack={recovery === 'settings' ? endRecovery : undefined}
    >
      <TextInput
        label="Nouveau mot de passe"
        value={password}
        onChangeText={setValue}
        placeholder="8 caractères minimum"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={error}
        disabled={saving}
      />
      <TextInput
        label="Confirme-le"
        value={confirmation}
        onChangeText={setConfirmation}
        placeholder="Le même, pour être sûr"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={() => void submit()}
        error={mismatch}
        disabled={saving}
      />
      <Button label="Enregistrer et me connecter" loading={saving} onPress={() => void submit()} />
    </AuthLayout>
  );
}
