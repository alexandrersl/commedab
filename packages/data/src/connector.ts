import {
  UpdateType,
  type CommonPowerSyncDatabase,
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

/** Écriture refusée par le serveur, sans ses données, pour le journal et Sentry (9.5). */
export interface RejectedWrite {
  table: string;
  op: UpdateType;
  status: number;
  code: string | undefined;
}

/**
 * Écriture mise de côté : refusée, derrière un refus sur la même ligne, ou sur une ligne qui
 * désigne une ligne refusée (specs techniques 5.4).
 */
export interface HeldWrite {
  /** Ordre d'écriture sur l'appareil (`CrudEntry.clientId`). */
  seq: number;
  table: string;
  id: string;
  op: UpdateType;
  opData?: Record<string, unknown> | undefined;
}

/** Écritures mises de côté, gardées sur l'appareil jusqu'à leur acceptation. */
export interface HeldStore {
  /** Dans l'ordre d'écriture. */
  list(): Promise<HeldWrite[]>;
  /** Ignore une écriture déjà gardée (transaction rejouée après une coupure). */
  add(writes: HeldWrite[]): Promise<void>;
  remove(seq: number): Promise<void>;
}

const entityOf = (write: { table: string; id: string }) => `${write.table}/${write.id}`;

/**
 * Lignes retenues derrière un refus. Une écriture sur l'une d'elles est retenue, comme celle
 * dont une colonne `*_id` désigne une ligne dont la création est retenue : une ligne de liste
 * ne part pas avant son produit, elle serait refusée à son tour. Une modification retenue (le
 * foyer, un rayon) ne retient pas les lignes qui la désignent. Les identifiants sont des UUID :
 * uniques entre tables.
 */
class Blocked {
  private readonly entities = new Set<string>();
  private readonly created = new Set<string>();

  constructor(writes: readonly Omit<HeldWrite, 'seq'>[] = []) {
    for (const write of writes) this.add(write);
  }

  add(write: Omit<HeldWrite, 'seq'>): void {
    this.entities.add(entityOf(write));
    if (write.op === UpdateType.PUT) this.created.add(write.id);
  }

  holds(write: Omit<HeldWrite, 'seq'>): boolean {
    return (
      this.entities.has(entityOf(write)) ||
      Object.entries(write.opData ?? {}).some(
        ([column, value]) =>
          column.endsWith('_id') && typeof value === 'string' && this.created.has(value),
      )
    );
  }
}

export function supabaseBackend(client: SupabaseClient): Backend {
  return {
    upsert: (table, row) => client.from(table).upsert(row),
    update: (table, id, changes) => client.from(table).update(changes).eq('id', id),
    delete: (table, id) => client.from(table).delete().eq('id', id),
  };
}

/**
 * Un refus du serveur (contrainte, RLS, privilège) ne passera pas de lui-même : l'écriture est
 * mise de côté jusqu'à un nouvel essai. Une erreur réseau, une session expirée, une limite de
 * débit ou une 5xx est rejouée plus tard, avec la file.
 */
export function isRejection(status: number): boolean {
  return status >= 400 && status < 500 && ![401, 408, 429].includes(status);
}

function write(backend: Backend, entry: Omit<HeldWrite, 'seq'>): PromiseLike<WriteResult> {
  switch (entry.op) {
    case UpdateType.PUT:
      return backend.upsert(entry.table, { ...entry.opData, id: entry.id });
    case UpdateType.PATCH:
      return backend.update(entry.table, entry.id, entry.opData ?? {});
    case UpdateType.DELETE:
      return backend.delete(entry.table, entry.id);
  }
}

function interrupted(status: number, message: string): Error {
  return new Error(`Envoi interrompu (${status}) : ${message}`);
}

/**
 * Rejoue la plus ancienne transaction en file ; rend faux quand la file est vide. Une écriture
 * refusée, et toute écriture qu'elle retient (`Blocked`), est mise de côté au lieu d'être
 * envoyée : jamais abandonnée (EF-6.4), elle ne retient pas les autres lignes.
 */
export async function uploadNextTransaction(
  db: Pick<CommonPowerSyncDatabase, 'getNextCrudTransaction'>,
  backend: Backend,
  held: HeldStore,
  onRejected: (rejected: RejectedWrite) => void,
): Promise<boolean> {
  const transaction = await db.getNextCrudTransaction();
  if (transaction === null) return false;
  const blocked = new Blocked(await held.list());
  const setAside: HeldWrite[] = [];
  for (const entry of transaction.crud) {
    if (!blocked.holds(entry)) {
      const { status, error } = await write(backend, entry);
      if (error === null) continue;
      if (!isRejection(status)) throw interrupted(status, error.message);
      onRejected({ table: entry.table, op: entry.op, status, code: error.code });
    }
    blocked.add(entry);
    const { clientId: seq, table, id, op, opData } = entry;
    setAside.push({ seq, table, id, op, opData });
  }
  await held.add(setAside);
  await transaction.complete();
  return true;
}

/**
 * Renvoie les écritures mises de côté, dans l'ordre : une acceptée quitte la réserve, une
 * refusée de nouveau y reste avec celles qu'elle retient.
 */
export async function retryHeld(
  backend: Backend,
  held: HeldStore,
  onRejected: (rejected: RejectedWrite) => void,
): Promise<void> {
  const blocked = new Blocked();
  for (const entry of await held.list()) {
    if (blocked.holds(entry)) {
      blocked.add(entry);
      continue;
    }
    const { status, error } = await write(backend, entry);
    if (error === null) {
      await held.remove(entry.seq);
      continue;
    }
    if (!isRejection(status)) throw interrupted(status, error.message);
    onRejected({ table: entry.table, op: entry.op, status, code: error.code });
    blocked.add(entry);
  }
}

/**
 * Connecteur PowerSync ↔ Supabase (specs techniques 5.2, 5.4) : jeton de la session Supabase,
 * écritures rejouées dans l'ordre sous RLS, refus mis de côté et renvoyés par `retry`
 * (« Réessayer », retour du réseau). L'envoi de la file et le nouvel essai ne se croisent
 * jamais, pour que la réserve garde l'ordre de chaque ligne. Aucune logique métier.
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly client: SupabaseClient,
    private readonly powersyncUrl: string,
    private readonly held: HeldStore,
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

  private serially(run: () => Promise<void>): Promise<void> {
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  uploadData(db: CommonPowerSyncDatabase): Promise<void> {
    const backend = supabaseBackend(this.client);
    return this.serially(async () => {
      while (await uploadNextTransaction(db, backend, this.held, this.onRejected));
    });
  }

  retry(): Promise<void> {
    return this.serially(() => retryHeld(supabaseBackend(this.client), this.held, this.onRejected));
  }
}
