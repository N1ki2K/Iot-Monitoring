/**
 * Normalize a flag value that could be number, boolean, or string
 * Returns true if the value represents a truthy flag
 */
export function normalizeFlag(
  value: number | boolean | string | null | undefined
): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return value === '1' || value === 'true';
  }
  return false;
}

/**
 * Check if user has admin privileges
 */
export function isUserAdmin(user: {
  role?: string;
  is_admin?: number | boolean | string;
} | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === 'admin' ||
    normalizeFlag(user.is_admin)
  );
}

/**
 * Check if user has dev privileges
 */
export function isUserDev(user: {
  role?: string;
  is_dev?: number | boolean | string;
} | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === 'dev' ||
    normalizeFlag(user.is_dev)
  );
}

/**
 * Check if user has admin or dev privileges
 */
export function isUserPrivileged(user: {
  role?: string;
  is_admin?: number | boolean | string;
  is_dev?: number | boolean | string;
} | null | undefined): boolean {
  return isUserAdmin(user) || isUserDev(user);
}
