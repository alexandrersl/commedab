import type { Schema } from '@powersync/common';
import { PowerSyncDatabase, WASQLiteVFS } from '@powersync/web';
import type { LocalDatabase } from './database';

// Copié dans apps/mobile/public par `powersync-web copy-assets` : Metro ne sait pas
// empaqueter les workers du SDK web.
const WORKER = '/@powersync/worker.js';

export const storageEngine = 'wa-sqlite, OPFSCoopSyncVFS';

/** Implémentation web (specs techniques 2.6) ; `open.native.ts` sert iOS et Android. */
export function openDatabase(schema: Schema, dbFilename: string): LocalDatabase {
  return new PowerSyncDatabase({
    schema,
    database: { dbFilename, vfs: WASQLiteVFS.OPFSCoopSyncVFS, worker: WORKER },
    sync: { worker: WORKER },
  });
}
