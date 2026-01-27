/**
 * User-related type definitions
 */

/**
 * Authenticated user returned from login/register
 */
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_admin: number;
  created_at: string;
}

/**
 * User list item (same as AuthUser for now)
 */
export type UserListItem = AuthUser;

/**
 * User role enum
 */
export enum UserRole {
  USER = 0,
  ADMIN = 1,
}

/**
 * User status enum (for future user management features)
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Registration request payload
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

/**
 * Update profile request payload
 */
export interface UpdateProfileRequest {
  username: string;
  email: string;
}

/**
 * Change password request payload
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
