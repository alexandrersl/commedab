import { openAppDatabase, type AppDatabase, type Data, type SyncState } from '@commedab/data';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from '../auth/session';
import { supabase } from '../auth/supabase';
import { config } from '../config';

let appDatabase: AppDatabase | null = null;

function getAppDatabase(): AppDatabase {
  appDatabase ??= openAppDatabase({
    supabase,
    powersyncUrl: config.powersyncUrl,
    onRejected: (rejected) => console.warn('Écriture refusée par le serveur', rejected),
  });
  return appDatabase;
}

const DataContext = createContext<AppDatabase | null>(null);

/**
 * Base de l'appareil, synchronisée avec le compte connecté. Une déconnexion ou un changement
 * de compte la vide avant toute nouvelle synchro (EF-5.2).
 */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session === undefined ? undefined : (session?.user.id ?? null);
  const previous = useRef<string | null>(null);
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    if (userId === undefined) return;
    const before = previous.current;
    previous.current = userId;
    const db = getAppDatabase();
    queue.current = queue.current
      .then(async () => {
        if (before !== null && before !== userId) await db.clear();
        if (userId !== null) await db.connect();
      })
      .catch((error: unknown) => console.error('Synchronisation impossible', error));
  }, [userId]);

  return (
    <DataContext.Provider value={typeof userId === 'string' ? getAppDatabase() : null}>
      {children}
    </DataContext.Provider>
  );
}

function useAppDatabase(): AppDatabase {
  const db = useContext(DataContext);
  if (db === null) throw new Error('Données demandées hors session');
  return db;
}

export function useData(): Data {
  return useAppDatabase().data;
}

export function useSyncState(): SyncState {
  const db = useAppDatabase();
  const [state, setState] = useState<SyncState>('pending');
  useEffect(() => db.onSyncState(setState), [db]);
  return state;
}
