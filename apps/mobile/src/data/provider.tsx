import { openAppDatabase, type AppDatabase, type Data, type SyncStatus } from '@commedab/data';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from '../auth/session';
import { supabase } from '../auth/supabase';
import { config } from '../config';
import { captureError, reportIncident } from '../monitoring';
import { tokens } from '../theme';

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

/** En ligne, une écriture est acceptée bien avant ce délai : elle n'est jamais montrée en attente. */
const PENDING_AFTER_MS = Number.parseFloat(tokens.duration.slow) * 4;

/**
 * Lignes écrites sur l'appareil, pas encore acceptées par le serveur (EF-6.3), une fois
 * qu'elles attendent depuis `PENDING_AFTER_MS` : sans ce délai, chaque geste atténuerait sa
 * ligne le temps de l'envoi.
 */
export function usePendingIds(): ReadonlySet<string> {
  const db = useAppDatabase();
  const [ids, setIds] = useState(NONE);
  useEffect(() => {
    const since = new Map<string, number>();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const publish = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      const now = Date.now();
      const ripe = [...since].filter(([, at]) => now - at >= PENDING_AFTER_MS);
      setIds((previous) =>
        previous.size === ripe.length && ripe.every(([id]) => previous.has(id))
          ? previous
          : new Set(ripe.map(([id]) => id)),
      );
      const next = Math.min(...[...since.values()].filter((at) => now - at < PENDING_AFTER_MS));
      if (Number.isFinite(next)) timer = setTimeout(publish, next + PENDING_AFTER_MS - now);
    };
    const stop = db.onPending((pending) => {
      for (const id of since.keys()) if (!pending.has(id)) since.delete(id);
      for (const id of pending) if (!since.has(id)) since.set(id, Date.now());
      publish();
    });
    return () => {
      stop();
      if (timer !== null) clearTimeout(timer);
    };
  }, [db]);
  return ids;
}

export function useRetryUpload(): () => void {
  return useAppDatabase().retryUpload;
}
