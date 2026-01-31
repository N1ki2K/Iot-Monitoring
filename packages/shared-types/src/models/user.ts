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
  role?: UserRole;
  is_admin?: number | boolean | string;
  is_dev?: number | boolean | string;
  invited_by?: number | null;
  invited_at?: string | null;
  must_change_password?: boolean | number | string;
  created_at: string;
}

/**
 * User list item (same as AuthUser for now)
 */
export type UserListItem = AuthUser;

/**
 * User role enum
 */
export type UserRole = 'user' | 'admin' | 'dev';

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

/**
 * Admin invite payload
 */
export interface UserInviteRequest {
  username: string;
  email: string;
  role?: UserRole;
}

/**
 * Admin invite response
 */
export interface UserInviteResponse {
  user: AuthUser;
  tempPassword: string;
}

/**
 * Admin user update payload
 */
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: UserRole;
  is_admin?: boolean;
  is_dev?: boolean;
  must_change_password?: boolean;
}
