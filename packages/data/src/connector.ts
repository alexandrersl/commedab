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

/** Écriture refusée par le serveur : elle reste en file, l'envoi est suspendu (specs techniques 5.4). */
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
 * Un refus du serveur (contrainte, RLS, privilège) ne passera pas de lui-même : l'envoi est
 * suspendu jusqu'à un nouvel essai demandé. Une erreur réseau, une session expirée, une limite
 * de débit ou une 5xx est rejouée plus tard, sans suspension.
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

/** Levée quand le serveur refuse une écriture : la transaction reste en file. */
export class RejectedTransactionError extends Error {
  constructor(readonly rejected: RejectedWrite) {
    super(`Écriture refusée (${rejected.status}) sur ${rejected.table}`);
  }
}

/**
 * Rejoue la plus ancienne transaction en file ; rend faux quand la file est vide. Une
 * transaction refusée n'est jamais abandonnée : aucune perte silencieuse (EF-6.4).
 */
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
    const rejected = { table: entry.table, op: entry.op, status, code: error.code };
    onRejected(rejected);
    throw new RejectedTransactionError(rejected);
  }
  await transaction.complete();
  return true;
}

/**
 * Connecteur PowerSync ↔ Supabase (specs techniques 5.2, 5.4) : jeton de la session Supabase,
 * écritures rejouées dans l'ordre sous RLS. Après un refus, l'envoi reste suspendu jusqu'à
 * `release` (« Réessayer », retour du réseau). Aucune logique métier.
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  private held = false;

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

  get suspended(): boolean {
    return this.held;
  }

  release(): void {
    this.held = false;
  }

  async uploadData(db: CommonPowerSyncDatabase): Promise<void> {
    if (this.held) throw new Error('Envoi suspendu après un refus du serveur');
    const backend = supabaseBackend(this.client);
    try {
      while (await uploadNextTransaction(db, backend, this.onRejected));
    } catch (error) {
      if (error instanceof RejectedTransactionError) this.held = true;
      throw error;
    }
  }
}
