import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import {
  PASSWORD_MIN_LENGTH,
  sendPasswordReset,
  signIn,
  signInWithGoogle,
  signUp,
  type AuthFailure,
} from '../auth/actions';
import { Button, Field } from '../components/form';

type Mode = 'sign-up' | 'sign-in' | 'reset';

const SUBMIT: Record<Mode, string> = {
  'sign-up': 'Créer mon compte',
  'sign-in': 'Me connecter',
  reset: 'Recevoir le lien',
};

/** Création du compte au premier lancement, puis connexion (EF-5.3, specs techniques 8.3). */
export default function SignIn() {
  const [mode, setMode] = useState<Mode>('sign-up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthFailure>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchTo = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const run = async (action: () => Promise<AuthFailure>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    setError(await action());
    setBusy(false);
  };

  const submit = () =>
    run(async () => {
      if (mode === 'sign-in') return signIn(email, password);
      if (mode === 'reset') {
        const failure = await sendPasswordReset(email);
        if (failure === null)
          setInfo(`Un lien pour choisir un nouveau mot de passe a été envoyé à ${email.trim()}.`);
        return failure;
      }
      const { failure, confirm } = await signUp(email, password);
      if (confirm)
        setInfo(
          `Un e-mail de confirmation a été envoyé à ${email.trim()}. Ouvre son lien pour accéder à ta liste.`,
        );
      return failure;
    });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Commedab</Text>
        <Text style={styles.subtitle}>
          {mode === 'reset'
            ? 'Indique ton e-mail : tu recevras un lien pour choisir un nouveau mot de passe.'
            : 'Ta liste de courses, qui retient ce que tu achètes.'}
        </Text>

        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          textContentType="emailAddress"
        />
        {mode !== 'reset' && (
          <Field
            label={
              mode === 'sign-up'
                ? `Mot de passe (${PASSWORD_MIN_LENGTH} caractères minimum)`
                : 'Mot de passe'
            }
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
            onSubmitEditing={submit}
          />
        )}

        {error !== null && <Text style={styles.error}>{error}</Text>}
        {info !== null && <Text style={styles.info}>{info}</Text>}

        <Button label={SUBMIT[mode]} onPress={submit} disabled={busy} />
        {mode !== 'reset' && (
          <Button
            label="Continuer avec Google"
            variant="secondary"
            onPress={() => run(signInWithGoogle)}
            disabled={busy}
          />
        )}

        {mode === 'sign-up' && (
          <Button label="J’ai déjà un compte" variant="link" onPress={() => switchTo('sign-in')} />
        )}
        {mode === 'sign-in' && (
          <>
            <Button
              label="Mot de passe oublié ?"
              variant="link"
              onPress={() => switchTo('reset')}
            />
            <Button label="Créer un compte" variant="link" onPress={() => switchTo('sign-up')} />
          </>
        )}
        {mode === 'reset' && (
          <Button
            label="Retour à la connexion"
            variant="link"
            onPress={() => switchTo('sign-in')}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', padding: 24 },
  form: { width: '100%', maxWidth: 400, alignSelf: 'center', gap: 12 },
  title: { fontSize: 32, fontWeight: '700', color: '#212529' },
  subtitle: { fontSize: 16, color: '#495057', marginBottom: 12 },
  error: { color: '#c92a2a' },
  info: { color: '#2b8a3e' },
});
