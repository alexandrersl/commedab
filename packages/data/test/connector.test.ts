import { UpdateType, type CrudEntry, type CrudTransaction } from '@powersync/common';
import { describe, expect, it } from 'vitest';
import {
  isRejection,
  retryHeld,
  uploadNextTransaction,
  type Backend,
  type HeldStore,
  type HeldWrite,
  type RejectedWrite,
  type WriteResult,
} from '../src/connector';
import { heldStore } from '../src/held';
import { memoryDatabase } from './memory-database';

let clientId = 0;
function entry(op: UpdateType, table: string, id: string, opData?: Record<string, unknown>) {
  clientId += 1;
  return { clientId, op, table, id, opData } as CrudEntry;
}

const REFUSED: WriteResult = {
  status: 403,
  error: { code: '42501', message: 'permission denied' },
};
const OFFLINE: WriteResult = { status: 0, error: { message: 'Failed to fetch' } };

/**
 * File d'écritures, réserve et serveur simulés : chaque transaction de `transactions` est servie
 * une fois complétée la précédente ; `responses` donne la réponse de chaque écriture.
 */
function setup(transactions: CrudEntry[][], responses: WriteResult[] = []) {
  const calls: string[] = [];
  let completed = 0;
  const db = {
    getNextCrudTransaction: async () => {
      const crud = transactions[completed];
      if (crud === undefined) return null;
      return {
        crud,
        complete: async () => {
          completed += 1;
        },
      } as unknown as CrudTransaction;
    },
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
  let kept: HeldWrite[] = [];
  const held: HeldStore = {
    list: async () => [...kept].sort((a, b) => a.seq - b.seq),
    add: async (writes) => {
      kept.push(...writes.filter((w) => !kept.some((k) => k.seq === w.seq)));
    },
    remove: async (seq) => {
      kept = kept.filter((k) => k.seq !== seq);
    },
  };
  const rejected: RejectedWrite[] = [];
  const onRejected = (r: RejectedWrite) => rejected.push(r);
  return {
    run: () => uploadNextTransaction(db, backend, held, onRejected),
    async drain() {
      while (await uploadNextTransaction(db, backend, held, onRejected));
    },
    retry: () => retryHeld(backend, held, onRejected),
    respond: (...next: WriteResult[]) => responses.push(...next),
    calls,
    rejected,
    held: () => kept.map((k) => `${k.op} ${k.table} ${k.id}`),
    completed: () => completed,
  };
}

describe('connecteur d’envoi (specs techniques 5.4)', () => {
  it('rejoue upsert, update et delete dans l’ordre, puis vide la file', async () => {
    const t = setup([
      [
        entry(UpdateType.PUT, 'list_line', 'l1', { quantity: 1 }),
        entry(UpdateType.PATCH, 'list_line', 'l1', { checked_at: 'x' }),
        entry(UpdateType.DELETE, 'stock_event', 'e1'),
      ],
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

  it('met de côté une écriture refusée et la signale sans ses données ; les autres lignes partent', async () => {
    const t = setup(
      [
        [entry(UpdateType.PATCH, 'list_line', 'l1', { quantity: 2 })],
        [entry(UpdateType.PATCH, 'list_line', 'l2', { checked_at: 'x' })],
      ],
      [REFUSED],
    );
    await t.drain();
    expect(t.rejected).toEqual([
      { table: 'list_line', op: UpdateType.PATCH, status: 403, code: '42501' },
    ]);
    expect(t.held()).toEqual(['PATCH list_line l1']);
    expect(t.calls).toEqual([
      'update list_line l1 {"quantity":2}',
      'update list_line l2 {"checked_at":"x"}',
    ]);
    expect(t.completed()).toBe(2);
  });

  it('retient derrière un refus les écritures suivantes sur la même ligne, sans les envoyer', async () => {
    const t = setup(
      [
        [entry(UpdateType.PUT, 'product', 'p1', { name: 'Lait' })],
        [
          entry(UpdateType.PATCH, 'product', 'p1', { name: 'Lait demi-écrémé' }),
          entry(UpdateType.PUT, 'list_line', 'l2', { product_id: 'p2' }),
        ],
      ],
      [REFUSED],
    );
    await t.drain();
    expect(t.calls).toEqual([
      'upsert product {"name":"Lait","id":"p1"}',
      'upsert list_line {"product_id":"p2","id":"l2"}',
    ]);
    expect(t.held()).toEqual(['PUT product p1', 'PATCH product p1']);
  });

  it('retient une ligne qui désigne une ligne refusée, et ce qui la suit', async () => {
    const t = setup(
      [
        [entry(UpdateType.PUT, 'product', 'p1', { name: 'Lait' })],
        [entry(UpdateType.PUT, 'list_line', 'l1', { product_id: 'p1', quantity: 1 })],
        [entry(UpdateType.PATCH, 'list_line', 'l1', { quantity: 2 })],
      ],
      [REFUSED],
    );
    await t.drain();
    expect(t.calls).toEqual(['upsert product {"name":"Lait","id":"p1"}']);
    expect(t.rejected).toHaveLength(1);
    expect(t.held()).toEqual(['PUT product p1', 'PUT list_line l1', 'PATCH list_line l1']);
    t.calls.length = 0;
    t.respond(REFUSED);
    await t.retry();
    expect(t.calls).toEqual(['upsert product {"name":"Lait","id":"p1"}']);
    expect(t.held()).toHaveLength(3);
    t.calls.length = 0;
    await t.retry();
    expect(t.calls).toEqual([
      'upsert product {"name":"Lait","id":"p1"}',
      'upsert list_line {"product_id":"p1","quantity":1,"id":"l1"}',
      'update list_line l1 {"quantity":2}',
    ]);
    expect(t.held()).toEqual([]);
  });

  it('ne retient pas les lignes qui désignent une modification refusée', async () => {
    const t = setup(
      [
        [entry(UpdateType.PATCH, 'household', 'h1', { catalog_contribution: false })],
        [entry(UpdateType.PUT, 'list_line', 'l1', { household_id: 'h1' })],
      ],
      [REFUSED],
    );
    await t.drain();
    expect(t.calls).toHaveLength(2);
    expect(t.held()).toEqual(['PATCH household h1']);
  });

  it('renvoie la réserve dans l’ordre ; une ligne refusée de nouveau y reste avec ce qui la suit', async () => {
    const t = setup(
      [
        [entry(UpdateType.PATCH, 'list_line', 'l1', { quantity: 2 })],
        [entry(UpdateType.PATCH, 'list_line', 'l2', { quantity: 3 })],
        [entry(UpdateType.PATCH, 'list_line', 'l1', { quantity: 4 })],
      ],
      [REFUSED, REFUSED],
    );
    await t.drain();
    expect(t.held()).toEqual(['PATCH list_line l1', 'PATCH list_line l2', 'PATCH list_line l1']);
    t.calls.length = 0;
    t.respond(REFUSED);
    await t.retry();
    expect(t.calls).toEqual([
      'update list_line l1 {"quantity":2}',
      'update list_line l2 {"quantity":3}',
    ]);
    expect(t.held()).toEqual(['PATCH list_line l1', 'PATCH list_line l1']);
    expect(t.rejected).toHaveLength(3);
    t.calls.length = 0;
    await t.retry();
    expect(t.calls).toEqual([
      'update list_line l1 {"quantity":2}',
      'update list_line l1 {"quantity":4}',
    ]);
    expect(t.held()).toEqual([]);
  });

  it('garde en file une transaction qui échoue sur le réseau, sans rien mettre de côté', async () => {
    const t = setup(
      [[entry(UpdateType.PUT, 'product', 'p1', {}), entry(UpdateType.PUT, 'product', 'p2', {})]],
      [REFUSED, OFFLINE],
    );
    await expect(t.run()).rejects.toThrow('Envoi interrompu');
    expect(t.completed()).toBe(0);
    expect(t.held()).toEqual([]);
  });

  it('arrête le nouvel essai sur une coupure, la réserve intacte', async () => {
    const t = setup([[entry(UpdateType.PUT, 'product', 'p1', {})]], [REFUSED]);
    await t.drain();
    t.respond(OFFLINE);
    await expect(t.retry()).rejects.toThrow('Envoi interrompu');
    expect(t.held()).toEqual(['PUT product p1']);
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
  ])('statut %i : refus %s', (status, rejected) => {
    expect(isRejection(status)).toBe(rejected);
  });
});

describe('réserve des écritures refusées (held_write)', () => {
  it('garde l’ordre et les données, ignore une écriture déjà gardée', async () => {
    const held = heldStore(memoryDatabase());
    const later = {
      seq: 7,
      table: 'list_line',
      id: 'l1',
      op: UpdateType.PATCH,
      opData: { quantity: 2 },
    };
    const first = { seq: 3, table: 'stock_event', id: 'e1', op: UpdateType.DELETE };
    await held.add([later, first]);
    await held.add([later]);
    expect(await held.list()).toEqual([{ ...first, opData: undefined }, later]);
    await held.remove(3);
    expect(await held.list()).toEqual([later]);
  });
});
