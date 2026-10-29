import type { CommonPowerSyncDatabase, SyncStatus } from '@powersync/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConnector, type RejectedWrite } from './connector';
import { createData, type Data } from './data';
import { fromPowerSync } from './database';
import { appSchema } from './schema';
import { openDatabase } from './storage/open';

const DB_FILENAME = 'commedab.db';

/** Point de l'en-tête (specs techniques 6.5). */
export type SyncState = 'synced' | 'pending' | 'error';

export interface AppDatabase {
  data: Data;
  /** Synchronise avec le compte de la session Supabase en cours. */
  connect(): Promise<void>;
  /** Déconnexion ou suppression du compte : vide la base de l'appareil (EF-5.2, EF-5.6). */
  clear(): Promise<void>;
  onSyncState(listener: (state: SyncState) => void): () => void;
}

function syncStateOf(status: SyncStatus, rejected: boolean): SyncState {
  if (rejected || status.dataFlowStatus.uploadError || status.dataFlowStatus.downloadError) {
    return 'error';
  }
  return status.connected && !status.dataFlowStatus.uploading ? 'synced' : 'pending';
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
  const listeners = new Set<(state: SyncState) => void>();
  let rejected = false;
  const publish = () => {
    const state = syncStateOf(db.currentStatus, rejected);
    for (const listener of listeners) listener(state);
  };
  db.registerListener({
    statusChanged: (status) => {
      if (status.dataFlowStatus.uploading) rejected = false;
      publish();
    },
  });
  const connector = new SupabaseConnector(options.supabase, options.powersyncUrl, (write) => {
    rejected = true;
    options.onRejected?.(write);
    publish();
  });

  return {
    data: createData(fromPowerSync(db)),
    connect: () => db.connect(connector),
    clear: () => db.disconnectAndClear(),
    onSyncState(listener) {
      listeners.add(listener);
      listener(syncStateOf(db.currentStatus, rejected));
      return () => listeners.delete(listener);
    },
  };
}
