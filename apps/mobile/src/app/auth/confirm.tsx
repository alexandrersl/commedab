import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { verifyEmailLink } from '../../auth/actions';
import { useSession } from '../../auth/session';
import { AuthLayout, MailIcon, param } from '../../screens/auth/layout';

/**
 * Arrivée d'un lien d'e-mail du compte (specs techniques 5.2) : confirmation de l'adresse ou
 * réinitialisation du mot de passe. Un lien expiré ou déjà servi mène à « Lien expiré ».
 */
export default function ConfirmLink() {
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const tokenHash = param(params.token_hash);
  const type = param(params.type);
  const { session, beginRecovery } = useSession();
  const [outcome, setOutcome] = useState<'pending' | 'verified' | 'failed'>('pending');
  const started = useRef(false);
  const incomplete = tokenHash === '' || type === '';
  const result = incomplete ? 'failed' : outcome;

  useEffect(() => {
    if (started.current || incomplete) return;
    started.current = true;
    void verifyEmailLink(tokenHash, type).then((ok) => {
      if (ok && type === 'recovery') beginRecovery('link');
      setOutcome(ok ? 'verified' : 'failed');
    });
  }, [tokenHash, type, incomplete, beginRecovery]);

  useEffect(() => {
    if (result === 'failed') router.replace(session ? '/' : '/link-expired');
    if (result === 'verified' && session)
      router.replace(type === 'recovery' ? '/new-password' : '/');
  }, [result, session, type]);

  return (
    <AuthLayout title="Ton lien" lead="J'ouvre ton compte, une seconde.">
      <MailIcon />
    </AuthLayout>
  );
}
