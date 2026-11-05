import { openAppDatabase, type AppDatabase, type Data, type SyncStatus } from '@commedab/data';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from '../auth/session';
import { supabase } from '../auth/supabase';
import { config } from '../config';
import { captureError, reportIncident } from '../monitoring';

function openForSession(): AppDatabase {
  return openAppDatabase({
    supabase,
    powersyncUrl: config.powersyncUrl,
    onRejected: (rejected) => {
      console.warn('Écriture refusée par le serveur', rejected);
      reportIncident('Écriture refusée par le serveur', { ...rejected });
    },
  });
}

const DataContext = createContext<AppDatabase | null>(null);

/**
 * Base de l'appareil, synchronisée avec le compte connecté. Elle n'est ouverte que pendant une
 * session : une déconnexion ou un changement de compte la vide puis la ferme (EF-5.2). Une page
 * sans session ne tient donc aucun verrou sur son fichier ; sinon, Safari garde la page quittée
 * pour la connexion Google en mémoire, figée avec son verrou, et la page de retour attend
 * indéfiniment d'ouvrir la base.
 */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session === undefined ? undefined : (session?.user.id ?? null);
  const [db, setDb] = useState<AppDatabase | null>(null);
  const opened = useRef<{ userId: string; db: AppDatabase } | null>(null);
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    if (userId === undefined) return;
    queue.current = queue.current
      .then(async () => {
        const current = opened.current;
        if (current !== null && current.userId !== userId) {
          opened.current = null;
          setDb(null);
          await current.db.clear();
          await current.db.close();
        }
        if (userId !== null && opened.current === null) {
          const next = openForSession();
          opened.current = { userId, db: next };
          setDb(next);
          await next.connect(userId);
        }
      })
      .catch((error: unknown) => {
        console.error('Synchronisation impossible', error);
        captureError(error);
      });
  }, [userId]);

  return (
    <DataContext.Provider value={typeof userId === 'string' ? db : null}>
      {children}
    </DataContext.Provider>
  );
}

/** Vrai dès que la base de la session est ouverte : les écrans de données attendent ce moment. */
export function useDataReady(): boolean {
  return useContext(DataContext) !== null;
}

function useAppDatabase(): AppDatabase {
  const db = useContext(DataContext);
  if (db === null) throw new Error('Données demandées hors session');
  return db;
}

export function useData(): Data {
  return useAppDatabase().data;
}

const INITIAL: SyncStatus = {
  online: true,
  synced: false,
  rejected: false,
  rejections: 0,
  failure: null,
};

export function useSyncStatus(): SyncStatus {
  const db = useAppDatabase();
  const [status, setStatus] = useState<SyncStatus>(INITIAL);
  useEffect(() => db.onStatus(setStatus), [db]);
  return status;
}

const NONE: ReadonlySet<string> = new Set();

/** Lignes écrites sur l'appareil, pas encore acceptées par le serveur (EF-6.3). */
export function usePendingIds(): ReadonlySet<string> {
  const db = useAppDatabase();
  const [ids, setIds] = useState(NONE);
  useEffect(() => db.onPending(setIds), [db]);
  return ids;
}

export function useRetryUpload(): () => void {
  return useAppDatabase().retryUpload;
}
