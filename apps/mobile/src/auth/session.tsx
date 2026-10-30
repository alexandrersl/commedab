import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

/** Pourquoi l'écran « Nouveau mot de passe » est ouvert : le lien d'un e-mail, ou les Réglages. */
export type Recovery = 'link' | 'settings';

interface SessionState {
  /** `undefined` tant que la session enregistrée n'est pas relue. */
  session: Session | null | undefined;
  /** Un nouveau mot de passe reste à choisir (EF-5.2, EF-5.10). */
  recovery: Recovery | null;
  beginRecovery(reason: Recovery): void;
  endRecovery(): void;
}

const SessionContext = createContext<SessionState | null>(null);

/** Session Supabase, persistante sur l'appareil jusqu'à la déconnexion (specs techniques 5.2). */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>();
  const [recovery, setRecovery] = useState<Recovery | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovery('link');
      if (event === 'SIGNED_OUT') setRecovery(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const state = useMemo(
    () => ({
      session,
      recovery,
      beginRecovery: setRecovery,
      endRecovery: () => setRecovery(null),
    }),
    [session, recovery],
  );
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const state = useContext(SessionContext);
  if (state === null) throw new Error('useSession hors de SessionProvider');
  return state;
}
