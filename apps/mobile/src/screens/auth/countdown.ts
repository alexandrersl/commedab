import { useCallback, useEffect, useState } from 'react';

/** Supabase n'envoie qu'un e-mail par minute à une même adresse (specs techniques 5.2). */
export const RESEND_DELAY_S = 60;

/** Secondes avant le prochain renvoi possible ; `restart` après chaque envoi. */
export function useCountdown(): { left: number; restart: () => void } {
  const [until, setUntil] = useState(() => Date.now() + RESEND_DELAY_S * 1000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const restart = useCallback(() => {
    const at = Date.now();
    setNow(at);
    setUntil(at + RESEND_DELAY_S * 1000);
  }, []);
  return { left: Math.max(0, Math.ceil((until - now) / 1000)), restart };
}
