import { openDatabase, storageEngine } from '../storage/open';
import { schema } from '../storage/schema';

const DB_FILENAME = 'commedab-storage-check.db';

export type StorageCheckResult =
  | {
      ok: true;
      engine: string;
      previousChecks: number;
      lastCheckAt: string | null;
      checkedAt: string;
    }
  | { ok: false; engine: string; error: string };

/**
 * Ouvre la base, y écrit, la ferme, la rouvre et relit l'écriture (specs techniques 6.4).
 * `previousChecks` compte les vérifications des lancements précédents : s'il augmente
 * d'un lancement à l'autre, la base survit à la fermeture de l'app.
 */
export async function runStorageCheck(now: Date): Promise<StorageCheckResult> {
  const checkedAt = now.toISOString();
  try {
    const writer = openDatabase(schema, DB_FILENAME);
    let previous: { count: number; last: string | null } | null;
    try {
      await writer.init();
      previous = await writer.getOptional<{ count: number; last: string | null }>(
        'SELECT count(*) AS count, max(checked_at) AS last FROM storage_check',
      );
      await writer.execute('INSERT INTO storage_check (id, checked_at) VALUES (uuid(), ?)', [
        checkedAt,
      ]);
    } finally {
      await writer.close();
    }

    const reader = openDatabase(schema, DB_FILENAME);
    let reread: { count: number } | null;
    try {
      await reader.init();
      reread = await reader.getOptional<{ count: number }>(
        'SELECT count(*) AS count FROM storage_check WHERE checked_at = ?',
        [checkedAt],
      );
    } finally {
      await reader.close();
    }

    if (reread?.count !== 1) {
      return { ok: false, engine: storageEngine, error: "L'écriture n'a pas été relue." };
    }
    return {
      ok: true,
      engine: storageEngine,
      previousChecks: previous?.count ?? 0,
      lastCheckAt: previous?.last ?? null,
      checkedAt,
    };
  } catch (error) {
    return {
      ok: false,
      engine: storageEngine,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
