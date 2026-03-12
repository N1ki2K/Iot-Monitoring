import type { Reading } from '../../types';
import SensorCard from '../SensorCard';
import { getDisplayedAir } from '../../utils/air';
import { getDisplayedSound } from '../../utils/readings';

interface DashboardSensorGridProps {
  selectedDevice: string;
  latestReading: Reading | null;
  isRefreshing: boolean;
  sectionTitle: string;
  temperatureLabel: string;
  humidityLabel: string;
  lightLabel: string;
  soundLabel: string;
  airLabel: string;
}

export function DashboardSensorGrid({
  selectedDevice,
  latestReading,
  isRefreshing,
  sectionTitle,
  temperatureLabel,
  humidityLabel,
  lightLabel,
  soundLabel,
  airLabel,
}: DashboardSensorGridProps) {
  if (!selectedDevice) {
    return null;
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-300 mb-4">{sectionTitle}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <SensorCard
          type="temperature"
          label={temperatureLabel}
          value={latestReading ? parseFloat(latestReading.temperature_c) : 0}
          unit="°C"
          isLoading={!latestReading && isRefreshing}
        />
        <SensorCard
          type="humidity"
          label={humidityLabel}
          value={latestReading ? parseFloat(latestReading.humidity_pct) : 0}
          unit="%"
          isLoading={!latestReading && isRefreshing}
        />
        <SensorCard
          type="light"
          label={lightLabel}
          value={latestReading ? parseFloat(latestReading.lux) : 0}
          unit="lux"
          isLoading={!latestReading && isRefreshing}
        />
        <SensorCard
          type="sound"
          label={soundLabel}
          value={getDisplayedSound(latestReading)}
          unit="dB"
          isLoading={!latestReading && isRefreshing}
        />
        <SensorCard
          type="air"
          label={airLabel}
          value={getDisplayedAir(latestReading)}
          unit="%"
          isLoading={!latestReading && isRefreshing}
        />
      </div>
    </section>
  );
}
