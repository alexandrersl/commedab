import { describe, expect, it } from 'vitest';
import { parseFixture } from './fixtures/schema';

const minimal = {
  id: 'T00',
  scenario: 's',
  products: [],
  purchases: [],
  now: '2026-10-01T10:00:00',
};

describe('schéma des fixtures', () => {
  it('accepte une fixture minimale', () => {
    expect(parseFixture({ ...minimal, expected: {} }).id).toBe('T00');
  });

  it('refuse une clé inconnue', () => {
    expect(() => parseFixture({ ...minimal, expected: { suggestion: [] } })).toThrow(
      'T00.expected.suggestion',
    );
  });

  it('refuse une suggestion attendue sans quantité', () => {
    expect(() =>
      parseFixture({ ...minimal, expected: { suggestions: [{ productId: 'a' }] } }),
    ).toThrow('T00.expected.suggestions[0].quantity');
  });

  it('refuse une origine de ligne inconnue', () => {
    const listLines = [{ productId: 'a', origin: 'import' }];
    expect(() => parseFixture({ ...minimal, listLines, expected: {} })).toThrow(
      'T00.listLines[0].origin',
    );
  });
});
