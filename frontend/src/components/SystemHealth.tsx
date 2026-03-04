import { useEffect, useState } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { AuthUser, HealthStats } from '../types';
import { ProfileMenu } from './ProfileMenu';
import { HealthStatCard } from './HealthStatCard';

interface SystemHealthProps {
  user?: AuthUser | null;
  onLogout: () => void;
}

const normalizeFlag = (value: unknown) =>
  value === true || value === 1 || value === '1' || value === 'true';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(1)} ${units[i]}`;
};

export function SystemHealth({ user, onLogout }: SystemHealthProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<HealthStats | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const isDev = Boolean(user && (normalizeFlag(user.is_dev) || user.role === 'dev'));

  useEffect(() => {
    const loadHealth = async () => {
      if (!user) return;
      setIsLoading(true);
      setError('');
      try {
        const response = await api.getHealth();
        setData(response);
      } catch (error) {
        const message =
          error && typeof error === 'object' && 'response' in error
            ? (error as { response?: { data?: { error?: string } } }).response?.data?.error
            : null;
        setError(message || 'Failed to load health stats.');
      } finally {
        setIsLoading(false);
      }
    };
    loadHealth();
  }, [user]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isDev) {
    return <Navigate to="/" replace />;
  }

  const requestsTotal = data?.requests.total ?? 0;
  const uptime = data ? `${Math.floor(data.uptimeSeconds / 3600)}h` : '-';

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <NavLink to="/" className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-lg shadow-cyan-500/10">
                <img src="/IotMonitoring.png" alt="IoT Monitoring" className="w-12 h-12 object-contain" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">System Health</h1>
            </NavLink>
            <p className="text-gray-400 text-sm">Live metrics across users, devices, and database.</p>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 rounded-full bg-slate-800/70 p-1">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`
                }
                end
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                Admin Dashboard
              </NavLink>
              {isDev && (
                <NavLink
                  to="/audit"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                      isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`
                  }
                >
                  Audit Logs
                </NavLink>
              )}
              {isDev && (
                <NavLink
                  to="/health"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                      isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                    }`
                  }
                >
                  System Health
                </NavLink>
              )}
            </nav>
            {user && (
              <ProfileMenu user={user} onLogout={onLogout} onSettings={() => navigate('/settings')} />
            )}
          </div>
        </header>

        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-24 rounded-xl bg-slate-800/40 animate-pulse" />
            ))}
          </div>
        ) : (
          data && (
            <>
              <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <HealthStatCard label="Uptime" value={uptime} subLabel={`Server time ${new Date(data.serverTime).toLocaleString()}`} />
                <HealthStatCard label="Total Requests" value={requestsTotal} subLabel={`Tracking since ${new Date(data.requests.since).toLocaleTimeString()}`} />
                <HealthStatCard label="Database Size" value={formatBytes(data.database.sizeBytes)} />
                <HealthStatCard label="Total Readings" value={data.devices.totalReadings} subLabel={data.devices.latestReadingAt ? `Last reading ${new Date(data.devices.latestReadingAt).toLocaleString()}` : 'No readings yet'} />
              </section>

              <section className="grid gap-4 lg:grid-cols-3">
                <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-6">
                  <h3 className="text-lg font-semibold text-gray-200">Users</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <HealthStatCard label="Total" value={data.users.total} />
                    <HealthStatCard label="Admins" value={data.users.admins} />
                    <HealthStatCard label="Devs" value={data.users.devs} />
                    <HealthStatCard label="Invited" value={data.users.invited} />
                    <HealthStatCard label="Must Change" value={data.users.mustChangePassword} />
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-6">
                  <h3 className="text-lg font-semibold text-gray-200">Devices</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <HealthStatCard label="Controllers" value={data.devices.totalControllers} />
                    <HealthStatCard label="Distinct Devices" value={data.devices.distinctDevices} />
                    <HealthStatCard label="Active 24h" value={data.devices.activeDevicesLast24h} />
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-6">
                  <h3 className="text-lg font-semibold text-gray-200">Requests</h3>
                  <div className="mt-4 space-y-2">
                    {Object.entries(data.requests.byStatus).length === 0 ? (
                      <p className="text-sm text-gray-500">No request data yet.</p>
                    ) : (
                      Object.entries(data.requests.byStatus)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between text-sm text-gray-300">
                            <span>Status {status}</span>
                            <span className="text-white font-semibold">{count}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </section>

              <section className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-6">
                <h3 className="text-lg font-semibold text-gray-200">Database Tables</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Table</th>
                        <th>Rows</th>
                        <th>Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.database.tableSizes.map((table) => (
                        <tr key={table.table}>
                          <td>{table.table}</td>
                          <td>{table.rows}</td>
                          <td>{formatBytes(table.bytes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )
        )}
      </div>
    </div>
  );
}

export default SystemHealth;
