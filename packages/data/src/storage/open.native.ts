import type * as web from './open';

export const storageEngine = 'op-sqlite (phase B)';

export const openDatabase: typeof web.openDatabase = () => {
  throw new Error('Stockage natif non disponible avant la phase B (specs techniques 1.5).');
};
