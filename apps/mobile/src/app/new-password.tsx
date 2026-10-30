import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PASSWORD_MIN_LENGTH, setPassword, type AuthFailure } from '../auth/actions';
import { useSession } from '../auth/session';
import { Button, Field } from '../components/form';

/** Ouvert par le lien « mot de passe oublié » (specs techniques 8.3). */
export default function NewPassword() {
  const { endRecovery } = useSession();
  const [password, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthFailure>(null);

  const submit = async () => {
    setBusy(true);
    const failure = await setPassword(password);
    setBusy(false);
    setError(failure);
    if (failure === null) endRecovery();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.form}>
        <Text style={styles.title}>Nouveau mot de passe</Text>
        <Field
          label={`Mot de passe (${PASSWORD_MIN_LENGTH} caractères minimum)`}
          value={password}
          onChangeText={setValue}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={submit}
        />
        {error !== null && <Text style={styles.error}>{error}</Text>}
        <Button label="Enregistrer" onPress={submit} disabled={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', padding: 24 },
  form: { width: '100%', maxWidth: 400, alignSelf: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#212529' },
  error: { color: '#c92a2a' },
});
