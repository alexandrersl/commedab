import { describe, expect, it } from 'vitest';
import { addDays, daysBetween } from '../src/index';

describe('jours civils (specs techniques 4.1)', () => {
  it('traverse 1970 sans décalage', () => {
    expect(daysBetween('1969-12-31', '1970-01-01')).toBe(1);
    expect(addDays('1969-12-31T23:59:59', 1)).toBe('1970-01-01');
  });

  it('suit le calendrier grégorien en 2100, année non bissextile', () => {
    expect(addDays('2100-02-28', 1)).toBe('2100-03-01');
    expect(daysBetween('2100-01-01', '2101-01-01')).toBe(365);
    expect(daysBetween('2000-01-01', '2001-01-01')).toBe(366);
  });

  it('lit les années 0 à 99 telles quelles', () => {
    expect(addDays('0050-01-01', 1)).toBe('0050-01-02');
    expect(daysBetween('0050-01-01', '1950-01-01')).toBe(693_960);
  });

  it('refuse une date hors des années 0000 à 9999', () => {
    expect(addDays('9999-12-30', 1)).toBe('9999-12-31');
    expect(() => addDays('9999-12-31', 1)).toThrow(RangeError);
    expect(() => addDays('0000-01-01', -1)).toThrow(RangeError);
  });
});
