import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { exchangeEmailCode, verifyEmailLink } from '../../auth/actions';
import { useSession } from '../../auth/session';
import { AuthLayout, MailIcon, param } from '../../screens/auth/layout';

/**
 * Arrivée d'un lien d'e-mail du compte (specs techniques 5.2) : confirmation de l'adresse ou
 * réinitialisation du mot de passe. Un lien expiré ou déjà servi mène à « Lien expiré ».
 */
export default function ConfirmLink() {
  const params = useLocalSearchParams<{ token_hash?: string; type?: string; code?: string }>();
  const tokenHash = param(params.token_hash);
  const type = param(params.type);
  const code = param(params.code);
  const { session, recovery, beginRecovery } = useSession();
  const [outcome, setOutcome] = useState<'pending' | 'verified' | 'failed'>('pending');
  const started = useRef(false);
  const incomplete = (tokenHash === '' || type === '') && code === '';
  const result = incomplete ? 'failed' : outcome;

  useEffect(() => {
    if (started.current || incomplete) return;
    started.current = true;
    const verified = tokenHash !== '' ? verifyEmailLink(tokenHash, type) : exchangeEmailCode(code);
    void verified.then((ok) => {
      if (ok && type === 'recovery') beginRecovery('link');
      setOutcome(ok ? 'verified' : 'failed');
    });
  }, [tokenHash, type, code, incomplete, beginRecovery]);

  useEffect(() => {
    if (result === 'failed') router.replace(session ? '/' : '/link-expired');
    if (result === 'verified' && session)
      router.replace(type === 'recovery' || recovery === 'link' ? '/new-password' : '/');
  }, [result, session, type, recovery]);

  return (
    <AuthLayout title="Ton lien" lead="J'ouvre ton compte, une seconde.">
      <MailIcon />
    </AuthLayout>
  );
}
