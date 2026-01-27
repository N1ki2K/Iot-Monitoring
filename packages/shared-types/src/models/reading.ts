/**
 * Sensor reading type definitions
 */

/**
 * A single sensor reading from a device
 * Note: Values come as strings from PostgreSQL but may be null
 */
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

/**
 * Latest reading response (may have slightly different types)
 */
export interface LatestReading {
  id: number;
  device_id: string;
  ts: string;
  temperature_c: number | null;
  humidity_pct: number | null;
  lux: number | null;
  sound: number | null;
  co2_ppm: number | null;
}

/**
 * Sensor types available in the system
 */
export type SensorType = 'temperature' | 'humidity' | 'light' | 'sound' | 'air';

/**
 * Configuration for displaying a sensor
 */
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

/**
 * Reading query parameters
 */
export interface ReadingsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  device?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}
