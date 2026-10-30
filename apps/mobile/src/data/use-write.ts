import { useCallback } from 'react';
import { useToast } from '../components/toast';

/**
 * Lance une écriture ; si elle échoue, le dit par « Pas enregistré — Réessayer », dont l'action
 * relance la même écriture (EF-6.4). Rend vrai si elle a réussi.
 */
export function useWrite(): (write: () => Promise<unknown>) => Promise<boolean> {
  const toast = useToast();
  return useCallback(
    (write: () => Promise<unknown>) => {
      const run = (): Promise<boolean> =>
        write().then(
          () => true,
          (error: unknown) => {
            console.error('Écriture impossible', error);
            toast.show({
              message: 'Pas enregistré',
              error: true,
              action: { label: 'Réessayer', onPress: () => void run() },
            });
            return false;
          },
        );
      return run();
    },
    [toast],
  );
}
