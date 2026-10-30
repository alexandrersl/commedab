import type { CommonPowerSyncDatabase } from '@powersync/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConnector, type RejectedWrite } from './connector';
import { createData, type AccountServer, type Data } from './data';
import { fromPowerSync } from './database';
import { appSchema } from './schema';
import { openDatabase } from './storage/open';

const DB_FILENAME = 'commedab.db';
/** Plus que n'en accumule un appareil hors ligne pendant des courses. */
const PENDING_SCAN = 10_000;

/** Ce que les écrans montrent de la synchro (specs techniques 6.5). */
export interface SyncStatus {
  /** Relié au service de synchro ; faux : bandeau hors ligne (EF-6.3). */
  online: boolean;
  /** La première synchro de l'appareil est faite (EF-6.1). */
  synced: boolean;
  /** Le serveur a refusé une écriture, gardée en attente jusqu'à `retryUpload` (EF-6.4). */
  rejected: boolean;
}

export interface AppDatabase {
  data: Data;
  /** Synchronise avec le compte de la session Supabase en cours. */
  connect(): Promise<void>;
  /** Déconnexion ou suppression du compte : vide la base de l'appareil (EF-5.2, EF-5.6). */
  clear(): Promise<void>;
  onStatus(listener: (status: SyncStatus) => void): () => void;
  /** Identifiants des lignes dont une écriture attend l'envoi (`pending`). */
  onPending(listener: (ids: ReadonlySet<string>) => void): () => void;
  /** « Réessayer » après un refus : renvoie la même écriture. */
  retryUpload(): void;
}

/**
 * Base locale de l'application et sa synchro. `onRejected` reçoit les écritures refusées par
 * le serveur, sans leurs données, pour le journal de l'appareil et Sentry (9.5).
 */
export function openAppDatabase(options: {
  supabase: SupabaseClient;
  powersyncUrl: string;
  onRejected?: (rejected: RejectedWrite) => void;
}): AppDatabase {
  const db: CommonPowerSyncDatabase = openDatabase(appSchema, DB_FILENAME);
  const statusListeners = new Set<(status: SyncStatus) => void>();
  const pendingListeners = new Set<(ids: ReadonlySet<string>) => void>();
  const connector = new SupabaseConnector(options.supabase, options.powersyncUrl, (write) => {
    options.onRejected?.(write);
    publishStatus();
  });
  let online = db.currentStatus.connected;

  const statusOf = (): SyncStatus => ({
    online: db.currentStatus.connected,
    synced: db.currentStatus.hasSynced === true,
    rejected: connector.suspended,
  });
  function publishStatus() {
    const status = statusOf();
    for (const listener of statusListeners) listener(status);
  }

  async function pendingIds(): Promise<Set<string>> {
    const batch = await db.getCrudBatch(PENDING_SCAN);
    return new Set(batch?.crud.map((entry) => entry.id) ?? []);
  }
  function publishPending() {
    if (pendingListeners.size === 0) return;
    void pendingIds().then((ids) => {
      for (const listener of pendingListeners) listener(ids);
    });
  }

  db.registerListener({
    statusChanged: (status) => {
      // Le retour du réseau relance l'envoi d'une écriture refusée (specs techniques 5.4).
      if (status.connected && !online) connector.release();
      online = status.connected;
      publishStatus();
      publishPending();
    },
  });
  db.onChange(
    { onChange: publishPending },
    { tables: appSchema.tables.map((table) => table.name), throttleMs: 100 },
  );

  const server: AccountServer = {
    async requestExport() {
      const { error } = await options.supabase.functions.invoke('export-data', { method: 'POST' });
      if (error !== null) throw error;
    },
    async deleteAccount() {
      const { error } = await options.supabase.rpc('delete_account');
      if (error !== null) throw error;
      await db.disconnectAndClear();
    },
  };

  return {
    data: createData(fromPowerSync(db), { server }),
    connect: () => db.connect(connector),
    clear: () => db.disconnectAndClear(),
    onStatus(listener) {
      statusListeners.add(listener);
      listener(statusOf());
      return () => statusListeners.delete(listener);
    },
    onPending(listener) {
      pendingListeners.add(listener);
      void pendingIds().then(listener);
      return () => pendingListeners.delete(listener);
    },
    retryUpload() {
      connector.release();
      publishStatus();
    },
  };
}
