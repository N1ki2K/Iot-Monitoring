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
