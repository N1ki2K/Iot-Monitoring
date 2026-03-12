import type { Reading } from '../../types';
import Chart from '../Chart';

interface ChartLineConfig {
  dataKey: string;
  color: string;
  name: string;
  yAxisId: 'left' | 'right';
}

interface DashboardChartsSectionProps {
  selectedDevice: string;
  history: Reading[];
  isRefreshing: boolean;
  isHistoryLoading: boolean;
  temperatureHumidityTitle: string;
  lightSoundAirTitle: string;
  temperatureHumidityLines: ChartLineConfig[];
  lightSoundAirLines: ChartLineConfig[];
}

export function DashboardChartsSection({
  selectedDevice,
  history,
  isRefreshing,
  isHistoryLoading,
  temperatureHumidityTitle,
  lightSoundAirTitle,
  temperatureHumidityLines,
  lightSoundAirLines,
}: DashboardChartsSectionProps) {
  if (!selectedDevice) {
    return null;
  }

  return (
    <section className="grid lg:grid-cols-2 gap-6">
      <Chart
        title={temperatureHumidityTitle}
        data={history}
        lines={temperatureHumidityLines}
        isLoading={!history.length && (isRefreshing || isHistoryLoading)}
      />
      <Chart
        title={lightSoundAirTitle}
        data={history}
        lines={lightSoundAirLines}
        isLoading={!history.length && (isRefreshing || isHistoryLoading)}
      />
    </section>
  );
}
