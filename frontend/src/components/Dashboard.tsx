import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Reading, AuthUser } from '../types';
import { ProfileMenu } from './ProfileMenu';
import SensorCard from './SensorCard';
import Chart from './Chart';
import DataTable from './DataTable';
import DeviceSelector from './DeviceSelector';
import { isUserPrivileged } from '../utils/flags';
import { getDisplayedSound } from '../utils/readings';
import { getDisplayedAir } from '../utils/air';
import { useI18n } from '../i18n';

interface DashboardProps {
  user?: AuthUser | null;
  onLogout: () => void;
}

const HISTORY_REFRESH_INTERVAL_MS = 30000;
const LIVE_REFRESH_INTERVAL_MS = 5000;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const typed = error as { response?: { data?: { error?: string } } };
    return typed.response?.data?.error ?? fallback;
  }
  return fallback;
};

export function Dashboard({ user, onLogout }: DashboardProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const isAdmin = isUserPrivileged(user);
  const temperatureHumidityLines = [
    { dataKey: 'temp', color: '#f97316', name: t('dataTable.temp'), yAxisId: 'left' as const },
    { dataKey: 'humidity', color: '#06b6d4', name: t('dataTable.humidity'), yAxisId: 'right' as const },
  ];
  const lightSoundAirLines = [
    { dataKey: 'lux', color: '#fbbf24', name: t('dataTable.light'), yAxisId: 'left' as const },
    { dataKey: 'sound', color: '#a855f7', name: t('dataTable.sound'), yAxisId: 'right' as const },
    { dataKey: 'air', color: '#22c55e', name: t('dataTable.air'), yAxisId: 'right' as const },
  ];
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [latestReading, setLatestReading] = useState<Reading | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimMethod, setClaimMethod] = useState<'code' | 'qr'>('code');
  const [claimCode, setClaimCode] = useState('');
  const [claimQrData, setClaimQrData] = useState('');
  const [claimLabel, setClaimLabel] = useState('');
  const [claimError, setClaimError] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [deviceOptions, setDeviceOptions] = useState<Array<{ id: string; label?: string | null }>>(
    []
  );

  // Load devices on mount
  const loadDevices = useCallback(async () => {
    try {
      if (user && !isAdmin) {
        const assignments = await api.getUserControllers(user.id);
        const options = assignments.map((assignment) => ({
          id: assignment.device_id,
          label: assignment.assignment_label || assignment.controller_label,
        }));
        setDeviceOptions(options);
        if (options.length > 0 && !selectedDevice) {
          setSelectedDevice(options[0].id);
        }
        return;
      }

      const deviceList = await api.getDevices();
      setDeviceOptions(deviceList.map((device) => ({ id: device })));
      if (deviceList.length > 0 && !selectedDevice) {
        setSelectedDevice(deviceList[0]);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDevice, user]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (deviceOptions.length === 0) {
      setSelectedDevice('');
      return;
    }
    const hasSelected = deviceOptions.some((option) => option.id === selectedDevice);
    if (!hasSelected) {
      setSelectedDevice(deviceOptions[0].id);
    }
  }, [deviceOptions, selectedDevice]);

  const fetchLatestReading = useCallback(async () => {
    if (!selectedDevice) return;

    try {
      const latest = await api.getLatest(selectedDevice);
      setLatestReading(latest);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch latest reading:', error);
    }
  }, [selectedDevice]);

  const fetchHistory = useCallback(async () => {
    if (!selectedDevice) return;

    setIsHistoryLoading(true);
    try {
      const historyData = await api.getHistory(selectedDevice, 1);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [selectedDevice]);

  const fetchDeviceData = useCallback(async () => {
    if (!selectedDevice) return;

    setIsRefreshing(true);
    try {
      await Promise.all([fetchLatestReading(), fetchHistory()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchHistory, fetchLatestReading, selectedDevice]);

  useEffect(() => {
    if (!selectedDevice) return;

    fetchDeviceData();
  }, [selectedDevice, fetchDeviceData]);

  useEffect(() => {
    if (!selectedDevice) return;

    const interval = setInterval(fetchLatestReading, LIVE_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedDevice, fetchLatestReading]);

  useEffect(() => {
    if (!selectedDevice) return;

    const interval = setInterval(fetchHistory, HISTORY_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedDevice, fetchHistory]);

  const handleRefresh = () => {
    fetchDeviceData();
  };

  const handleClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClaimError('');
    const normalizedCode = claimCode.trim();
    const normalizedQrData = claimQrData.trim();

    if (claimMethod === 'code') {
      if (!/^\d{5}$/.test(normalizedCode)) {
        setClaimError(t('dashboard.enterCode'));
        return;
      }
    } else if (!normalizedQrData) {
      setClaimError(t('dashboard.pasteQr'));
      return;
    }

    setIsClaiming(true);
    try {
      if (claimMethod === 'code') {
        await api.claimController(normalizedCode, claimLabel.trim() || undefined);
      } else {
        await api.claimController({
          qrData: normalizedQrData,
          label: claimLabel.trim() || undefined,
        });
      }
      setClaimCode('');
      setClaimQrData('');
      setClaimLabel('');
      setShowClaimModal(false);
      await loadDevices();
    } catch (error) {
      const message = getErrorMessage(error, t('dashboard.claimFailed'));
      setClaimError(message);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-lg shadow-cyan-500/10">
                <img src="/IotMonitoring.png" alt="IoT Monitoring" className="w-12 h-12 object-contain" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                {t('common.appName')}
              </h1>
            </div>
            <p className="text-gray-400 text-sm">
              {t('dashboard.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
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
                  {t('common.dashboard')}
                </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                {t('common.adminDashboard')}
              </NavLink>
              <NavLink
                to="/audit"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                {t('common.auditLogs')}
              </NavLink>
              <NavLink
                to="/health"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                {t('common.systemHealth')}
              </NavLink>
            </nav>
          )}
            {!isAdmin && (
              <button
                onClick={() => setShowClaimModal(true)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t('dashboard.addDevice')}</span>
              </button>
            )}
            <DeviceSelector
              devices={deviceOptions}
              selectedDevice={selectedDevice}
              onSelect={setSelectedDevice}
              isLoading={isLoading}
            />

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </button>
            {user && (
              <ProfileMenu
                user={user}
                onLogout={onLogout}
                onSettings={() => navigate('/settings')}
              />
            )}
          </div>
        </header>

        {/* Status bar */}
        {lastUpdate && (
          <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400">{t('dashboard.live')}</span>
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-500">
              {t('dashboard.lastUpdated', { time: lastUpdate.toLocaleTimeString(locale) })}
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-500">{t('dashboard.autoRefresh')}</span>
          </div>
        )}

        {/* Sensor Cards */}
        {selectedDevice && (
          <section>
            <h2 className="text-lg font-semibold text-gray-300 mb-4">{t('dashboard.currentReadings')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <SensorCard
                type="temperature"
                label={t('dashboard.temperature')}
                value={latestReading ? parseFloat(latestReading.temperature_c) : 0}
                unit="°C"
                isLoading={!latestReading && isRefreshing}
              />
              <SensorCard
                type="humidity"
                label={t('dashboard.humidity')}
                value={latestReading ? parseFloat(latestReading.humidity_pct) : 0}
                unit="%"
                isLoading={!latestReading && isRefreshing}
              />
              <SensorCard
                type="light"
                label={t('dashboard.lightLevel')}
                value={latestReading ? parseFloat(latestReading.lux) : 0}
                unit="lux"
                isLoading={!latestReading && isRefreshing}
              />
              <SensorCard
                type="sound"
                label={t('dashboard.soundLevel')}
                value={getDisplayedSound(latestReading)}
                unit="dB"
                isLoading={!latestReading && isRefreshing}
              />
              <SensorCard
                type="air"
                label={t('dashboard.airVsBaseline')}
                value={getDisplayedAir(latestReading)}
                unit="%"
                isLoading={!latestReading && isRefreshing}
              />
            </div>
          </section>
        )}

        {/* Charts */}
        {selectedDevice && (
          <section className="grid lg:grid-cols-2 gap-6">
            <Chart
              title={t('dashboard.tempHumidityChart')}
              data={history}
              lines={temperatureHumidityLines}
              isLoading={!history.length && (isRefreshing || isHistoryLoading)}
            />
            <Chart
              title={t('dashboard.lightSoundAirChart')}
              data={history}
              lines={lightSoundAirLines}
              isLoading={!history.length && (isRefreshing || isHistoryLoading)}
            />
          </section>
        )}

        {/* Data Table */}
        <section>
          <DataTable selectedDevice={selectedDevice} />
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-600 text-sm py-4">
          <p>{t('dashboard.footer')}</p>
        </footer>
      </div>

      {showClaimModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{t('dashboard.claimController')}</h3>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowClaimModal(false);
                  setClaimMethod('code');
                  setClaimError('');
                  setClaimCode('');
                  setClaimQrData('');
                  setClaimLabel('');
                }}
              >
                {t('common.close')}
              </button>
            </div>
            <form className="mt-6 space-y-4" onSubmit={handleClaim}>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-800/60 p-1">
                <button
                  type="button"
                  className={`btn ${claimMethod === 'code' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setClaimMethod('code')}
                >
                  {t('dashboard.pairingCode')}
                </button>
                <button
                  type="button"
                  className={`btn ${claimMethod === 'qr' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setClaimMethod('qr')}
                >
                  {t('dashboard.qrCode')}
                </button>
              </div>
              {claimMethod === 'code' ? (
                <div>
                  <label className="text-sm text-gray-300">{t('dashboard.pairingCodeLabel')}</label>
                  <input
                    className="input mt-2"
                    placeholder={t('dashboard.pairingCodePlaceholder')}
                    value={claimCode}
                    onChange={(event) => setClaimCode(event.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm text-gray-300">{t('dashboard.qrContent')}</label>
                  <textarea
                    className="input mt-2 min-h-24"
                    placeholder={t('dashboard.qrContentPlaceholder')}
                    value={claimQrData}
                    onChange={(event) => setClaimQrData(event.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="text-sm text-gray-300">{t('dashboard.deviceLabelOptional')}</label>
                <input
                  className="input mt-2"
                  placeholder={t('dashboard.deviceLabelPlaceholder')}
                  value={claimLabel}
                  onChange={(event) => setClaimLabel(event.target.value)}
                />
              </div>
              {claimError && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {claimError}
                </div>
              )}
              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowClaimModal(false);
                    setClaimMethod('code');
                    setClaimError('');
                    setClaimCode('');
                    setClaimQrData('');
                    setClaimLabel('');
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button className="btn btn-primary" type="submit" disabled={isClaiming}>
                  {isClaiming ? t('dashboard.claiming') : t('dashboard.claimDevice')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
