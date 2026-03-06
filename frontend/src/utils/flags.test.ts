import { describe, expect, it } from 'vitest';
import { isUserAdmin, isUserPrivileged, normalizeFlag } from './flags';

describe('flags utils', () => {
  it('normalizeFlag handles nullish and booleans', () => {
    expect(normalizeFlag(null)).toBe(false);
    expect(normalizeFlag(undefined)).toBe(false);
    expect(normalizeFlag(true)).toBe(true);
    expect(normalizeFlag(false)).toBe(false);
  });

  it('normalizeFlag handles numbers and strings', () => {
    expect(normalizeFlag(1)).toBe(true);
    expect(normalizeFlag(0)).toBe(false);
    expect(normalizeFlag('1')).toBe(true);
    expect(normalizeFlag('true')).toBe(true);
    expect(normalizeFlag('0')).toBe(false);
    expect(normalizeFlag('false')).toBe(false);
  });

  it('isUserAdmin checks role and is_admin flag', () => {
    expect(isUserAdmin(null)).toBe(false);
    expect(isUserAdmin({ role: 'user' })).toBe(false);
    expect(isUserAdmin({ role: 'admin' })).toBe(true);
    expect(isUserAdmin({ is_admin: 1 })).toBe(true);
    expect(isUserAdmin({ is_admin: 'true' })).toBe(true);
  });

  it('isUserPrivileged mirrors admin logic', () => {
    expect(isUserPrivileged({ role: 'user', is_admin: 0 })).toBe(false);
    expect(isUserPrivileged({ role: 'admin' })).toBe(true);
    expect(isUserPrivileged({ is_admin: '1' })).toBe(true);
  });
});

