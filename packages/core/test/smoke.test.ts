import { describe, expect, it } from 'vitest';
import { CORE_VERSION } from '../src/index';

describe('core', () => {
  it('se charge', () => {
    expect(CORE_VERSION).toBe('0.0.0');
  });
});
