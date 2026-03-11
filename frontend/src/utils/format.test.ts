import { describe, expect, it } from 'vitest';
import { formatFixedNumber, formatLocaleDateTime } from './format';

describe('format utils', () => {
  it('formats locale date time with fallback for empty values', () => {
    expect(formatLocaleDateTime(null, 'en-US')).toBe('-');
    expect(formatLocaleDateTime(undefined, 'en-US', 'n/a')).toBe('n/a');
  });

  it('formats locale date time for valid values', () => {
    const formatted = formatLocaleDateTime('2026-03-11T10:20:30.000Z', 'en-US');
    expect(formatted).toContain('2026');
  });

  it('formats fixed numbers with fallback for invalid values', () => {
    expect(formatFixedNumber('12.345', 1)).toBe('12.3');
    expect(formatFixedNumber('', 1)).toBe('0.0');
    expect(formatFixedNumber('nope', 1)).toBe('--');
    expect(formatFixedNumber(undefined, 2, 'n/a')).toBe('n/a');
  });
});
