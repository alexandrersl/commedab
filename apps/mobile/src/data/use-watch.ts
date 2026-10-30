import type { Subscription } from '@commedab/data';
import { useCallback, useEffect, useState } from 'react';

export interface Watched<T> {
  /** `undefined` avant la première lecture. */
  value: T | undefined;
  error: unknown;
  retry: () => void;
}

/** Valeur courante d'une requête réactive de `data`, son erreur de lecture et de quoi la relancer. */
export function useWatched<T>(watch: (subscription: Subscription<T>) => () => void): Watched<T> {
  const [value, setValue] = useState<T>();
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    return watch({
      onResult: (result) => {
        setError(null);
        setValue(() => result);
      },
      onError: (failure) => {
        console.error('Lecture impossible', failure);
        setError(failure);
      },
    });
  }, [watch, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { value, error, retry };
}

export function useWatch<T>(watch: (subscription: Subscription<T>) => () => void): T | undefined {
  return useWatched(watch).value;
}
