import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { resendConfirmation } from '../auth/actions';
import { Button } from '../components/button';
import { Text } from '../components/text';
import { useToast } from '../components/toast';
import { useCountdown } from '../screens/auth/countdown';
import { AuthLayout, CapsuleButton, MailIcon, Strong, param } from '../screens/auth/layout';

/**
 * « Vérifie ta boîte mail » (EF-5.9) : l'adresse, le renvoi, une minute après chaque envoi,
 * et le changement d'adresse.
 */
export default function CheckEmail() {
  const email = param(useLocalSearchParams<{ email?: string }>().email);
  const toast = useToast();
  const { left, restart } = useCountdown();
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setSending(true);
    const failure = await resendConfirmation(email);
    setSending(false);
    if (failure !== null) {
      toast.show({
        message: failure,
        error: true,
        action: { label: 'Réessayer', onPress: () => void resend() },
      });
      return;
    }
    restart();
    toast.show({ message: 'E-mail renvoyé' });
  };

  return (
    <AuthLayout
      title="Vérifie ta boîte mail"
      lead={
        <>
          {"On t'a envoyé un lien à "}
          <Strong>{email}</Strong>. Ouvre-le pour activer ton compte.
        </>
      }
      footer={
        <Text variant="caption" tone="muted" className="text-center">
          Rien reçu ? Regarde dans les indésirables, le lien est valable une heure.
        </Text>
      }
    >
      <MailIcon />
      <CapsuleButton
        tone="action"
        label={left > 0 ? `Renvoyer dans ${left} s` : "Renvoyer l'e-mail"}
        disabled={left > 0}
        loading={sending}
        onPress={() => void resend()}
      />
      <Button
        variant="text"
        label="Changer d'adresse"
        onPress={() => router.replace({ pathname: '/sign-up', params: { email } })}
      />
    </AuthLayout>
  );
}
