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

interface DashboardProps {
  user?: AuthUser | null;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [latestReading, setLatestReading] = useState<Reading | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claimLabel, setClaimLabel] = useState('');
  const [claimError, setClaimError] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [deviceOptions, setDeviceOptions] = useState<Array<{ id: string; label?: string | null }>>(
    []
  );

  // Load devices on mount
  const loadDevices = useCallback(async () => {
    try {
      if (user && user.is_admin !== 1) {
        const assignments = await api.getUserControllers(user.id);
        const options = assignments.map((assignment) => ({
          id: assignment.device_id,
          label: assignment.assignment_label || assignment.controller_label,
        }));
        setDeviceOptions(options);
        setDevices(options.map((option) => option.id));
        if (options.length > 0 && !selectedDevice) {
          setSelectedDevice(options[0].id);
        }
        return;
      }

      const deviceList = await api.getDevices();
      setDevices(deviceList);
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

  // Fetch data for selected device
  const fetchDeviceData = useCallback(async () => {
    if (!selectedDevice) return;

    setIsRefreshing(true);
    try {
      const [latest, historyData] = await Promise.all([
        api.getLatest(selectedDevice),
        api.getHistory(selectedDevice, 1),
      ]);
      setLatestReading(latest);
      setHistory(historyData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch device data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedDevice]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!selectedDevice) return;

    fetchDeviceData();
    const interval = setInterval(fetchDeviceData, 5000);
    return () => clearInterval(interval);
  }, [selectedDevice, fetchDeviceData]);

  const handleRefresh = () => {
    fetchDeviceData();
  };

  const handleClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClaimError('');
    const normalizedCode = claimCode.trim();
    if (!/^\d{5}$/.test(normalizedCode)) {
      setClaimError('Enter your 5-digit code.');
      return;
    }
    setIsClaiming(true);
    try {
      await api.claimController(normalizedCode, claimLabel.trim() || undefined);
      setClaimCode('');
      setClaimLabel('');
      setShowClaimModal(false);
      await loadDevices();
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Failed to claim controller.';
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
                IoT Monitoring
              </h1>
            </div>
            <p className="text-gray-400 text-sm">
              Real-time sensor data visualization
            </p>
          </div>

          <div className="flex items-center gap-4">
            {user?.is_admin === 1 && (
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
              </nav>
            )}
            {user?.is_admin !== 1 && deviceOptions.length === 0 ? (
              <button
                onClick={() => setShowClaimModal(true)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Device</span>
              </button>
            ) : (
              <DeviceSelector
                devices={deviceOptions}
                selectedDevice={selectedDevice}
                onSelect={setSelectedDevice}
                isLoading={isLoading}
              />
            )}

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
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
              <span className="text-green-400">Live</span>
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-500">Auto-refresh: 5s</span>
          </div>
        )}

        {/* Sensor Cards */}
        {selectedDevice && (
          <section>
            <h2 className="text-lg font-semibold text-gray-300 mb-4">Current Readings</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <SensorCard
                type="temperature"
                label="Temperature"
                value={latestReading ? parseFloat(latestReading.temperature_c) : 0}
                unit="°C"
                isLoading={!latestReading && isRefreshing}
              />
              <SensorCard
                type="humidity"
                label="Humidity"
                value={latestReading ? parseFloat(latestReading.humidity_pct) : 0}
                unit="%"
                isLoading={!latestReading && isRefreshing}
              />
              <SensorCard
                type="light"
                label="Light Level"
                value={latestReading ? parseFloat(latestReading.lux) : 0}
                unit="lux"
                isLoading={!latestReading && isRefreshing}
              />
              <SensorCard
                type="sound"
                label="Sound Level"
                value={latestReading?.sound || 0}
                unit=""
                isLoading={!latestReading && isRefreshing}
              />
              <SensorCard
                type="air"
                label="Air Quality"
                value={latestReading?.co2_ppm || 0}
                unit=""
                isLoading={!latestReading && isRefreshing}
              />
            </div>
          </section>
        )}

        {/* Charts */}
        {selectedDevice && (
          <section className="grid lg:grid-cols-2 gap-6">
            <Chart
              title="Temperature & Humidity"
              data={history}
              lines={[
                { dataKey: 'temp', color: '#f97316', name: 'Temperature (°C)' },
                { dataKey: 'humidity', color: '#06b6d4', name: 'Humidity (%)' },
              ]}
              isLoading={!history.length && isRefreshing}
            />
            <Chart
              title="Light & Sound Levels"
              data={history}
              lines={[
                { dataKey: 'lux', color: '#fbbf24', name: 'Light (lux)' },
                { dataKey: 'sound', color: '#a855f7', name: 'Sound' },
              ]}
              isLoading={!history.length && isRefreshing}
            />
          </section>
        )}

        {/* Data Table */}
        <section>
          <DataTable selectedDevice={selectedDevice} />
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-600 text-sm py-4">
          <p>ESP32 IoT Monitoring System • Real-time sensor data</p>
        </footer>
      </div>

      {showClaimModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Claim controller</h3>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setShowClaimModal(false);
                  setClaimError('');
                  setClaimCode('');
                  setClaimLabel('');
                }}
              >
                Close
              </button>
            </div>
            <form className="mt-6 space-y-4" onSubmit={handleClaim}>
              <div>
                <label className="text-sm text-gray-300">Pairing code</label>
                <input
                  className="input mt-2"
                  placeholder="5-digit code"
                  value={claimCode}
                  onChange={(event) => setClaimCode(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Device label (optional)</label>
                <input
                  className="input mt-2"
                  placeholder="My office sensor"
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
                    setClaimError('');
                    setClaimCode('');
                    setClaimLabel('');
                  }}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={isClaiming}>
                  {isClaiming ? 'Claiming...' : 'Claim device'}
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
