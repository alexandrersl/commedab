import { describe, expect, it } from 'vitest';
import { ownedByAnotherAccount } from '../src/owner';

describe('propriétaire de la base de l’appareil (EF-5.2)', () => {
  it('vide une base dont aucun membre du foyer n’est le compte connecté', () => {
    expect(ownedByAnotherAccount(['u1'], 'u2')).toBe(true);
  });
  it('garde la base du compte connecté, seul ou dans un foyer partagé', () => {
    expect(ownedByAnotherAccount(['u2'], 'u2')).toBe(false);
    expect(ownedByAnotherAccount(['u1', 'u2'], 'u2')).toBe(false);
  });
  it('laisse une base vide, qui n’appartient à personne', () => {
    expect(ownedByAnotherAccount([], 'u2')).toBe(false);
  });
});
