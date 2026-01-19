import { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { api } from '../api';
import type { Reading } from '../types';
import SensorCard from './SensorCard';
import Chart from './Chart';
import DataTable from './DataTable';
import DeviceSelector from './DeviceSelector';

export function Dashboard() {
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [latestReading, setLatestReading] = useState<Reading | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load devices on mount
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const deviceList = await api.getDevices();
        setDevices(deviceList);
        if (deviceList.length > 0 && !selectedDevice) {
          setSelectedDevice(deviceList[0]);
        }
      } catch (error) {
        console.error('Failed to load devices:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDevices();
  }, []);

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

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                <Activity className="w-5 h-5 text-white" />
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
            <DeviceSelector
              devices={devices}
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
              <span className="hidden sm:inline">Refresh</span>
            </button>
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
    </div>
  );
}

export default Dashboard;
