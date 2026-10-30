import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { emailFailure, passwordFailure, signUp, type AuthFailure } from '../auth/actions';
import { Button } from '../components/button';
import { TextInput } from '../components/text-input';
import { AuthLayout, FooterLink, ProviderButtons, param } from '../screens/auth/layout';

/**
 * Inscription (EF-5.9) : une adresse et un mot de passe de 8 caractères, rien d'autre. Par
 * e-mail, la session n'ouvre qu'après le lien de confirmation.
 */
export default function SignUp() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(() => param(params.email));
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [providerBusy, setProviderBusy] = useState(false);
  const [emailError, setEmailError] = useState<AuthFailure>(null);
  const [error, setError] = useState<AuthFailure>(null);

  const submit = async () => {
    const invalidEmail = emailFailure(email);
    const invalidPassword = passwordFailure(password);
    setEmailError(invalidEmail);
    setError(invalidPassword);
    if (invalidEmail !== null || invalidPassword !== null) return;
    setSubmitting(true);
    const { failure, confirm } = await signUp(email, password);
    setSubmitting(false);
    if (failure !== null && failure.includes('e-mail')) setEmailError(failure);
    else setError(failure);
    if (confirm) router.replace({ pathname: '/check-email', params: { email: email.trim() } });
  };

  return (
    <AuthLayout
      hero
      title="Commedab"
      lead="La liste qui sait déjà ce que tu vas oublier."
      footer={<FooterLink question="Déjà un compte ?" label="Se connecter" href="/sign-in" />}
    >
      <TextInput
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        placeholder="ton@adresse.fr"
        autoCapitalize="none"
        autoComplete="email"
        inputMode="email"
        textContentType="emailAddress"
        error={emailError}
        disabled={submitting || providerBusy}
      />
      <TextInput
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        placeholder="8 caractères minimum"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={() => void submit()}
        error={error}
        disabled={submitting || providerBusy}
      />
      <Button
        label="Créer mon compte"
        loading={submitting}
        disabled={providerBusy}
        onPress={() => void submit()}
      />
      <ProviderButtons
        disabled={submitting || providerBusy}
        onBusy={setProviderBusy}
        onFailure={setError}
      />
    </AuthLayout>
  );
}
