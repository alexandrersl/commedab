import { UpdateType, type CrudEntry, type CrudTransaction } from '@powersync/common';
import { describe, expect, it } from 'vitest';
import {
  isRejection,
  uploadNextTransaction,
  type Backend,
  type RejectedWrite,
  type WriteResult,
} from '../src/connector';

function entry(op: UpdateType, table: string, id: string, opData?: Record<string, unknown>) {
  return { op, table, id, opData } as CrudEntry;
}

/** File d'écritures et serveur simulés : `responses` donne la réponse de chaque écriture. */
function setup(crud: CrudEntry[], responses: WriteResult[] = []) {
  const calls: string[] = [];
  let completed = 0;
  let served = false;
  const db = {
    getNextCrudTransaction: async () =>
      served
        ? null
        : ((served = true),
          {
            crud,
            complete: async () => {
              completed += 1;
            },
          } as unknown as CrudTransaction),
  };
  const respond = (call: string) => {
    calls.push(call);
    return Promise.resolve(responses.shift() ?? { status: 201, error: null });
  };
  const backend: Backend = {
    upsert: (table, row) => respond(`upsert ${table} ${JSON.stringify(row)}`),
    update: (table, id, changes) => respond(`update ${table} ${id} ${JSON.stringify(changes)}`),
    delete: (table, id) => respond(`delete ${table} ${id}`),
  };
  const rejected: RejectedWrite[] = [];
  return {
    run: () => uploadNextTransaction(db, backend, (r) => rejected.push(r)),
    calls,
    rejected,
    completed: () => completed,
  };
}

describe('connecteur d’envoi (specs techniques 5.4)', () => {
  it('rejoue upsert, update et delete dans l’ordre, puis vide la file', async () => {
    const t = setup([
      entry(UpdateType.PUT, 'list_line', 'l1', { quantity: 1 }),
      entry(UpdateType.PATCH, 'list_line', 'l1', { checked_at: 'x' }),
      entry(UpdateType.DELETE, 'stock_event', 'e1'),
    ]);
    expect(await t.run()).toBe(true);
    expect(t.calls).toEqual([
      'upsert list_line {"quantity":1,"id":"l1"}',
      'update list_line l1 {"checked_at":"x"}',
      'delete stock_event e1',
    ]);
    expect(t.completed()).toBe(1);
    expect(await t.run()).toBe(false);
  });

  it('abandonne une transaction refusée par le serveur, sans ses données', async () => {
    const t = setup(
      [entry(UpdateType.DELETE, 'product', 'p1'), entry(UpdateType.PUT, 'product', 'p2', {})],
      [{ status: 403, error: { code: '42501', message: 'permission denied' } }],
    );
    await t.run();
    expect(t.rejected).toEqual([
      { table: 'product', op: UpdateType.DELETE, status: 403, code: '42501' },
    ]);
    expect(t.calls).toHaveLength(1);
    expect(t.completed()).toBe(1);
  });

  it('garde en file une transaction qui échoue sur le réseau ou le serveur', async () => {
    const t = setup(
      [entry(UpdateType.PUT, 'product', 'p1', {})],
      [{ status: 0, error: { message: 'Failed to fetch' } }],
    );
    await expect(t.run()).rejects.toThrow('Envoi interrompu');
    expect(t.completed()).toBe(0);
  });

  it.each([
    [400, true],
    [403, true],
    [409, true],
    [401, false],
    [408, false],
    [429, false],
    [500, false],
    [0, false],
  ])('statut %i : abandon %s', (status, rejected) => {
    expect(isRejection(status)).toBe(rejected);
  });
});
