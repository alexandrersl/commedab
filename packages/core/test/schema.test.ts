import { describe, expect, it } from 'vitest';
import { parseFixture } from './fixtures/schema';

const minimal = { id: 'T00', scenario: 's', products: [], events: [], now: '2026-10-01T10:00:00' };

describe('schéma des fixtures', () => {
  it('accepte une fixture minimale', () => {
    expect(parseFixture({ ...minimal, expected: {} }).id).toBe('T00');
  });

  it('refuse une clé inconnue', () => {
    expect(() => parseFixture({ ...minimal, expected: { suggestion: [] } })).toThrow(
      'T00.expected.suggestion',
    );
  });

  it('refuse une suggestion attendue sans `marked`', () => {
    expect(() =>
      parseFixture({ ...minimal, expected: { suggestions: [{ productId: 'a', quantity: 1 }] } }),
    ).toThrow('T00.expected.suggestions[0].marked');
  });

  it('refuse un type d’événement inconnu', () => {
    const events = [{ productId: 'a', type: 'bought', occurredAt: '2026-10-01T10:00:00' }];
    expect(() => parseFixture({ ...minimal, events, expected: {} })).toThrow('T00.events[0].type');
  });
});
