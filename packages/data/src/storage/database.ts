/**
 * Base SQLite locale, quelle que soit la plateforme (specs techniques 1.7, 2.9).
 * Seul `data` la manipule ; le SQL reste standard.
 */
export interface LocalDatabase {
  init(): Promise<void>;
  execute(sql: string, parameters?: unknown[]): Promise<unknown>;
  getOptional<T>(sql: string, parameters?: unknown[]): Promise<T | null>;
  getAll<T>(sql: string, parameters?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}
