import { localDateTime } from '@commedab/data';
import type { LocalDateTime } from '@commedab/core';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Ouverture de l'application : démarrage, puis chaque retour au premier plan (specs
 * techniques 4.7). Les lignes cochées d'une session fermée ne quittent la liste qu'à ce moment.
 */
export function useOpenedAt(): LocalDateTime {
  const [openedAt, setOpenedAt] = useState(() => localDateTime(new Date()));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setOpenedAt(localDateTime(new Date()));
    });
    return () => subscription.remove();
  }, []);
  return openedAt;
}

/** Maintenant, en heure locale, relu chaque minute : les estimations suivent le temps qui passe. */
export function useNow(): LocalDateTime {
  const [now, setNow] = useState(() => localDateTime(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setNow(localDateTime(new Date())), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
