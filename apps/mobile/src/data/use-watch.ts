import type { Subscription } from '@commedab/data';
import { useEffect, useState } from 'react';

/** Valeur courante d'une requête réactive de `data` ; `undefined` avant la première lecture. */
export function useWatch<T>(watch: (subscription: Subscription<T>) => () => void): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(
    () =>
      watch({
        onResult: (result) => setValue(() => result),
        onError: (error) => console.error('Lecture impossible', error),
      }),
    [watch],
  );
  return value;
}
