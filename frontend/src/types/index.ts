export interface Reading {
  id: string;
  device_id: string;
  ts: string;
  temperature_c: string;
  humidity_pct: string;
  lux: string;
  sound: number;
  co2_ppm: number | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_admin: number;
  created_at: string;
}

export type UserListItem = AuthUser;

export interface UserControllerAssignment {
  user_id: number;
  controller_id: number;
  device_id: string;
  controller_label?: string | null;
  assignment_label?: string | null;
  pairing_code?: string | null;
  created_at: string;
}

export interface Controller {
  id: number;
  device_id: string;
  label?: string | null;
  pairing_code: string | null;
  created_at: string;
}

export type SensorType = 'temperature' | 'humidity' | 'light' | 'sound' | 'air';

export interface SensorConfig {
  type: SensorType;
  label: string;
  unit: string;
  color: string;
  glowClass: string;
  icon: string;
  getValue: (reading: Reading) => number;
  format: (value: number) => string;
}
