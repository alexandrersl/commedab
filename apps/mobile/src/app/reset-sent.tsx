import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { sendPasswordReset } from '../auth/actions';
import { Button } from '../components/button';
import { useToast } from '../components/toast';
import { AuthLayout, CapsuleButton, MailIcon, Strong, param } from '../screens/auth/layout';

/** « C'est envoyé » (EF-5.10), formulé sans dire si l'adresse a un compte. */
export default function ResetSent() {
  const email = param(useLocalSearchParams<{ email?: string }>().email);
  const toast = useToast();
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setSending(true);
    const failure = await sendPasswordReset(email);
    setSending(false);
    if (failure !== null) {
      toast.show({
        message: failure,
        error: true,
        action: { label: 'Réessayer', onPress: () => void resend() },
      });
      return;
    }
    toast.show({ message: 'E-mail renvoyé' });
  };

  return (
    <AuthLayout
      title="C'est envoyé"
      lead={
        <>
          Si un compte existe pour <Strong>{email}</Strong>, tu vas recevoir un lien. Il est valable
          une heure.
        </>
      }
    >
      <MailIcon />
      <CapsuleButton
        tone="action"
        label="Retour à la connexion"
        onPress={() => router.replace('/sign-in')}
      />
      <Button
        variant="text"
        label="Renvoyer l'e-mail"
        loading={sending}
        onPress={() => void resend()}
      />
    </AuthLayout>
  );
}
