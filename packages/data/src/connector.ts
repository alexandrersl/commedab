import {
  UpdateType,
  type CommonPowerSyncDatabase,
  type CrudEntry,
  type PowerSyncBackendConnector,
  type PowerSyncCredentials,
} from '@powersync/common';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Réponse d'une écriture Supabase : `status` 0 pour une erreur réseau. */
export interface WriteResult {
  status: number;
  error: { code?: string; message: string } | null;
}

/** Les trois écritures du connecteur, par identifiant (specs techniques 5.4). */
export interface Backend {
  upsert(table: string, row: Record<string, unknown>): PromiseLike<WriteResult>;
  update(table: string, id: string, changes: Record<string, unknown>): PromiseLike<WriteResult>;
  delete(table: string, id: string): PromiseLike<WriteResult>;
}

/** Écriture abandonnée : la ligne locale sera écrasée par l'état serveur à la synchro suivante. */
export interface RejectedWrite {
  table: string;
  op: UpdateType;
  status: number;
  code: string | undefined;
}

export function supabaseBackend(client: SupabaseClient): Backend {
  return {
    upsert: (table, row) => client.from(table).upsert(row),
    update: (table, id, changes) => client.from(table).update(changes).eq('id', id),
    delete: (table, id) => client.from(table).delete().eq('id', id),
  };
}

/**
 * Un refus du serveur (contrainte, RLS, privilège) ne passera jamais : la transaction est
 * abandonnée. Une erreur réseau, une session expirée, une limite de débit ou une 5xx est
 * rejouée plus tard.
 */
export function isRejection(status: number): boolean {
  return status >= 400 && status < 500 && ![401, 408, 429].includes(status);
}

function write(backend: Backend, entry: CrudEntry): PromiseLike<WriteResult> {
  switch (entry.op) {
    case UpdateType.PUT:
      return backend.upsert(entry.table, { ...entry.opData, id: entry.id });
    case UpdateType.PATCH:
      return backend.update(entry.table, entry.id, entry.opData ?? {});
    case UpdateType.DELETE:
      return backend.delete(entry.table, entry.id);
  }
}

/** Rejoue la plus ancienne transaction en file ; rend faux quand la file est vide. */
export async function uploadNextTransaction(
  db: Pick<CommonPowerSyncDatabase, 'getNextCrudTransaction'>,
  backend: Backend,
  onRejected: (rejected: RejectedWrite) => void,
): Promise<boolean> {
  const transaction = await db.getNextCrudTransaction();
  if (transaction === null) return false;
  for (const entry of transaction.crud) {
    const { status, error } = await write(backend, entry);
    if (error === null) continue;
    if (!isRejection(status)) {
      throw new Error(`Envoi interrompu (${status}) : ${error.message}`);
    }
    onRejected({ table: entry.table, op: entry.op, status, code: error.code });
    break;
  }
  await transaction.complete();
  return true;
}

/**
 * Connecteur PowerSync ↔ Supabase (specs techniques 5.2, 5.4) : jeton de la session Supabase,
 * écritures rejouées dans l'ordre sous RLS. Aucune logique métier.
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  constructor(
    private readonly client: SupabaseClient,
    private readonly powersyncUrl: string,
    private readonly onRejected: (rejected: RejectedWrite) => void,
  ) {}

  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error !== null) throw error;
    if (data.session === null) return null;
    return {
      endpoint: this.powersyncUrl,
      token: data.session.access_token,
      expiresAt:
        data.session.expires_at === undefined
          ? undefined
          : new Date(data.session.expires_at * 1000),
    };
  }

  async uploadData(db: CommonPowerSyncDatabase): Promise<void> {
    const backend = supabaseBackend(this.client);
    while (await uploadNextTransaction(db, backend, this.onRejected));
  }
}
