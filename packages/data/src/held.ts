import type { UpdateType } from '@powersync/common';
import type { HeldStore, HeldWrite } from './connector';
import type { SqlContext } from './database';

interface HeldRow {
  seq: number;
  entity_table: string;
  entity_id: string;
  op: string;
  data: string | null;
}

/** Réserve des écritures refusées, dans la table locale `held_write` (specs techniques 5.4). */
export function heldStore(db: SqlContext): HeldStore {
  return {
    async list() {
      const rows = await db.getAll<HeldRow>('SELECT * FROM held_write ORDER BY seq');
      return rows.map((row): HeldWrite => ({
        seq: row.seq,
        table: row.entity_table,
        id: row.entity_id,
        op: row.op as UpdateType,
        opData: row.data === null ? undefined : (JSON.parse(row.data) as Record<string, unknown>),
      }));
    },
    async add(writes) {
      for (const write of writes) {
        await db.execute(
          `INSERT INTO held_write (id, seq, entity_table, entity_id, op, data)
           SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM held_write WHERE seq = ?)`,
          [
            String(write.seq),
            write.seq,
            write.table,
            write.id,
            write.op,
            write.opData === undefined ? null : JSON.stringify(write.opData),
            write.seq,
          ],
        );
      }
    },
    async remove(seq) {
      await db.execute('DELETE FROM held_write WHERE seq = ?', [seq]);
    },
  };
}
