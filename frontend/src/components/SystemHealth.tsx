import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { AuthUser, HealthStats } from '../types';
import { AdminPageHeader } from './AdminPageHeader';
import { HealthStatCard } from './HealthStatCard';
import { useI18n } from '../useI18n';
import { formatLocaleDateTime } from '../utils/format';
import { isUserAdmin } from '../utils/flags';

interface SystemHealthProps {
  user?: AuthUser | null;
  onLogout: () => void;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(1)} ${units[i]}`;
};

export function SystemHealth({ user, onLogout }: SystemHealthProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState<HealthStats | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = isUserAdmin(user);

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
        setError(message || t('health.failed'));
      } finally {
        setIsLoading(false);
      }
    };
    loadHealth();
  }, [t, user]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const requestsTotal = data?.requests.total ?? 0;
  const uptime = data ? `${Math.floor(data.uptimeSeconds / 3600)}h` : '-';
  const requestStatusEntries: Array<[string, number]> = data
    ? Object.entries(data.requests.byStatus)
    : [];

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <AdminPageHeader
          title={t('common.systemHealth')}
          subtitle={t('health.subtitle')}
          dashboardLabel={t('common.dashboard')}
          adminLabel={t('common.adminDashboard')}
          auditLabel={t('common.auditLogs')}
          healthLabel={t('common.systemHealth')}
          user={user}
          onLogout={onLogout}
          onSettings={() => navigate('/settings')}
        />

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
                <HealthStatCard label={t('health.uptime')} value={uptime} subLabel={t('health.serverTime', { time: formatLocaleDateTime(data.serverTime, locale) })} />
                <HealthStatCard label={t('health.totalRequests')} value={requestsTotal} subLabel={t('health.trackingSince', { time: new Date(data.requests.since).toLocaleTimeString(locale) })} />
                <HealthStatCard label={t('health.databaseSize')} value={formatBytes(data.database.sizeBytes)} />
                <HealthStatCard label={t('health.totalReadings')} value={data.devices.totalReadings} subLabel={data.devices.latestReadingAt ? t('health.lastReading', { time: formatLocaleDateTime(data.devices.latestReadingAt, locale) }) : t('health.noReadingsYet')} />
              </section>

              <section className="grid gap-4 lg:grid-cols-3">
                <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-6">
                  <h3 className="text-lg font-semibold text-gray-200">{t('health.users')}</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <HealthStatCard label={t('health.total')} value={data.users.total} />
                    <HealthStatCard label={t('health.admins')} value={data.users.admins} />
                    <HealthStatCard label={t('health.invited')} value={data.users.invited} />
                    <HealthStatCard label={t('health.mustChange')} value={data.users.mustChangePassword} />
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-6">
                  <h3 className="text-lg font-semibold text-gray-200">{t('health.devices')}</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <HealthStatCard label={t('health.controllers')} value={data.devices.totalControllers} />
                    <HealthStatCard label={t('health.distinctDevices')} value={data.devices.distinctDevices} />
                    <HealthStatCard label={t('health.active24h')} value={data.devices.activeDevicesLast24h} />
                  </div>
                </div>

                <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-6">
                  <h3 className="text-lg font-semibold text-gray-200">{t('health.requests')}</h3>
                  <div className="mt-4 space-y-2">
                    {requestStatusEntries.length === 0 ? (
                      <p className="text-sm text-gray-500">{t('health.noRequestData')}</p>
                    ) : (
                      requestStatusEntries
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between text-sm text-gray-300">
                            <span>{t('health.status', { status })}</span>
                            <span className="text-white font-semibold">{count}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </section>

              <section className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-6">
                <h3 className="text-lg font-semibold text-gray-200">{t('health.databaseTables')}</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('common.table')}</th>
                        <th>{t('common.rows')}</th>
                        <th>{t('common.size')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.database.tableSizes.map((table: HealthStats['database']['tableSizes'][number]) => (
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
