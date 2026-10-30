import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { emailFailure, sendPasswordReset, type AuthFailure } from '../auth/actions';
import { Button } from '../components/button';
import { TextInput } from '../components/text-input';
import { AuthLayout, param } from '../screens/auth/layout';

/** Mot de passe oublié (EF-5.10) : la même suite que l'adresse ait un compte ou non. */
export default function ForgotPassword() {
  const [email, setEmail] = useState(param(useLocalSearchParams<{ email?: string }>().email));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<AuthFailure>(null);

  const submit = async () => {
    const invalid = emailFailure(email);
    setError(invalid);
    if (invalid !== null) return;
    setSending(true);
    const failure = await sendPasswordReset(email);
    setSending(false);
    setError(failure);
    if (failure === null)
      router.replace({ pathname: '/reset-sent', params: { email: email.trim() } });
  };

  return (
    <AuthLayout
      title="Mot de passe oublié"
      lead="Donne-moi ton adresse, je t'envoie un lien pour en choisir un nouveau."
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/sign-in'))}
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
        onSubmitEditing={() => void submit()}
        error={error}
        disabled={sending}
      />
      <Button label="Envoyer le lien" loading={sending} onPress={() => void submit()} />
    </AuthLayout>
  );
}
