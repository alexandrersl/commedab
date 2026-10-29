import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { Database, SqlContext } from '../src/database';
import { appSchema } from '../src/schema';

/**
 * Base SQLite en mémoire aux tables du schéma client, pour les tests de `data` (specs
 * techniques 9.1). Comme les vues de PowerSync, ses tables n'ont aucune contrainte.
 */
export function memoryDatabase(): Database {
  const sqlite = new DatabaseSync(':memory:');
  for (const table of appSchema.tables) {
    const columns = table.columns.map((c) => `${c.name} ${c.type ?? 'TEXT'}`);
    sqlite.exec(`CREATE TABLE ${table.name} (id TEXT PRIMARY KEY, ${columns.join(', ')})`);
  }

  const listeners = new Set<{ tables: readonly string[]; onChange: () => void }>();
  let touched = new Set<string>();
  let depth = 0;

  const notify = () => {
    const tables = touched;
    touched = new Set();
    for (const listener of listeners) {
      if (listener.tables.some((t) => tables.has(t))) listener.onChange();
    }
  };

  const context: SqlContext = {
    async execute(sql, parameters = []) {
      const table = /^\s*(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(\w+)/i.exec(sql)?.[1];
      const result = sqlite.prepare(sql).run(...(parameters as SQLInputValue[]));
      if (table !== undefined) touched.add(table);
      if (depth === 0) notify();
      return result;
    },
    async getAll<T>(sql: string, parameters: unknown[] = []) {
      return sqlite.prepare(sql).all(...(parameters as SQLInputValue[])) as T[];
    },
    async getOptional<T>(sql: string, parameters: unknown[] = []) {
      return (sqlite.prepare(sql).get(...(parameters as SQLInputValue[])) as T | undefined) ?? null;
    },
  };

  return {
    ...context,
    async writeTransaction(run) {
      depth += 1;
      sqlite.exec('BEGIN');
      try {
        const result = await run(context);
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        touched = new Set();
        throw error;
      } finally {
        depth -= 1;
        if (depth === 0) notify();
      }
    },
    onChange(tables, onChange) {
      const listener = { tables, onChange };
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
