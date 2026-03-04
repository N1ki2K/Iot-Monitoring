export interface HealthStats {
  serverTime: string;
  uptimeSeconds: number;
  requests: {
    total: number;
    byStatus: Record<string, number>;
    byRoute: Record<string, number>;
    since: string;
  };
  database: {
    sizeBytes: number;
    tableSizes: Array<{
      table: string;
      bytes: number;
      rows: number;
    }>;
  };
  devices: {
    totalControllers: number;
    distinctDevices: number;
    activeDevicesLast24h: number;
    totalReadings: number;
    latestReadingAt: string | null;
  };
  users: {
    total: number;
    admins: number;
    devs: number;
    invited: number;
    mustChangePassword: number;
  };
}
