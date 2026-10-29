import type { CommonPowerSyncDatabase } from '@powersync/common';

/** Lectures et écritures SQL, dans une transaction ou hors transaction. */
export interface SqlContext {
  execute(sql: string, parameters?: unknown[]): Promise<unknown>;
  getAll<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
  getOptional<T>(sql: string, parameters?: unknown[]): Promise<T | null>;
}

/**
 * Ce que `data` attend de la base locale (specs techniques 2.9) : PowerSync en production,
 * SQLite en mémoire dans les tests.
 */
export interface Database extends SqlContext {
  writeTransaction<T>(run: (tx: SqlContext) => Promise<T>): Promise<T>;
  /** Appelle `onChange` après chaque écriture sur l'une des `tables` ; rend le désabonnement. */
  onChange(tables: readonly string[], onChange: () => void): () => void;
}

export function fromPowerSync(db: CommonPowerSyncDatabase): Database {
  return {
    execute: (sql, parameters) => db.execute(sql, parameters),
    getAll: (sql, parameters) => db.getAll(sql, parameters),
    getOptional: (sql, parameters) => db.getOptional(sql, parameters),
    writeTransaction: (run) => db.writeTransaction((tx) => run(tx)),
    onChange: (tables, onChange) =>
      db.onChange({ onChange }, { tables: [...tables], throttleMs: 30 }),
  };
}
