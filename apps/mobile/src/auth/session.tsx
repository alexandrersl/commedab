import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

interface SessionState {
  /** `undefined` tant que la session enregistrée n'est pas relue. */
  session: Session | null | undefined;
  /** Ouvert depuis le lien « mot de passe oublié » : le nouveau mot de passe reste à choisir. */
  recovering: boolean;
  endRecovery(): void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>();
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider
      value={{ session, recovering, endRecovery: () => setRecovering(false) }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const state = useContext(SessionContext);
  if (state === null) throw new Error('useSession hors de SessionProvider');
  return state;
}
