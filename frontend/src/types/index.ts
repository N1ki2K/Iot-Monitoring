/**
 * Re-export shared types from @iot-monitoring/shared-types
 */
export {
  // User types
  type AuthUser,
  type UserListItem,
  type LoginRequest,
  type RegisterRequest,
  type UpdateProfileRequest,
  type ChangePasswordRequest,
  UserRole,
  UserStatus,

  // Reading types
  type Reading,
  type LatestReading,
  type SensorType,
  type ReadingsQueryParams,

  // Controller types
  type Controller,
  type UserControllerAssignment,
  type ClaimControllerRequest,
  type CreateControllerRequest,
  type AssignControllerRequest,
  type UpdateControllerLabelRequest,

  // API types
  type PaginatedResponse,
  type ApiError,
  type ApiSuccess,
  type SortOrder,
  type PaginationParams,

  // Audit types
  type AuditLogEntry,
  type AuditLogQueryParams,
} from '@iot-monitoring/shared-types';

/**
 * Frontend-specific types (not shared with backend)
 */

/**
 * Sensor configuration for UI display
 * This includes React-specific properties like getValue function
 */
export interface SensorConfig {
  type: 'temperature' | 'humidity' | 'light' | 'sound' | 'air';
  label: string;
  unit: string;
  color: string;
  glowClass: string;
  icon: string;
  getValue: (reading: import('@iot-monitoring/shared-types').Reading) => number;
  format: (value: number) => string;
}
