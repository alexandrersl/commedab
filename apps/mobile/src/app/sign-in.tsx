import { router } from 'expo-router';
import { useState } from 'react';
import { signIn, type AuthFailure } from '../auth/actions';
import { Button } from '../components/button';
import { TextInput } from '../components/text-input';
import { AuthLayout, FooterLink, ProviderButtons } from '../screens/auth/layout';

/** Connexion (EF-5.8) : e-mail et mot de passe, puis Google et Apple. Session sans « se souvenir de moi ». */
export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [providerBusy, setProviderBusy] = useState(false);
  const [error, setError] = useState<AuthFailure>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const { failure, unconfirmed } = await signIn(email, password);
    setSubmitting(false);
    if (unconfirmed) {
      router.push({ pathname: '/check-email', params: { email: email.trim() } });
      return;
    }
    setError(failure);
  };

  return (
    <AuthLayout
      hero
      title="Commedab"
      lead="La liste qui sait déjà ce que tu vas oublier."
      footer={
        <FooterLink question="Pas encore de compte ?" label="Créer un compte" href="/sign-up" />
      }
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
        disabled={submitting || providerBusy}
      />
      <TextInput
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={() => void submit()}
        error={error}
        disabled={submitting || providerBusy}
        help={{
          label: 'Mot de passe oublié ?',
          onPress: () =>
            router.push({ pathname: '/forgot-password', params: { email: email.trim() } }),
        }}
      />
      <Button
        label="Se connecter"
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
