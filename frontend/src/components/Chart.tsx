import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { Reading } from '../types';

interface ChartProps {
  data: Reading[];
  title: string;
  lines: Array<{
    dataKey: string;
    color: string;
    name: string;
  }>;
  isLoading?: boolean;
}

interface ChartDataPoint {
  time: string;
  fullTime: string;
  [key: string]: string | number;
}

interface TooltipEntry {
  color?: string;
  name?: string;
  value?: number | string | null;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2 font-mono">{label}</p>
      {payload.map((entry, index) => {
        const color = entry.color ?? '#94a3b8';
        const value = entry.value;
        const displayValue =
          typeof value === 'number' ? value.toFixed(1) : value ?? '--';

        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-gray-300">{entry.name}:</span>
            <span className="font-mono font-medium" style={{ color }}>
              {displayValue}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export function Chart({ data, title, lines, isLoading }: ChartProps) {
  const chartData: ChartDataPoint[] = data.map((reading) => {
    const date = new Date(reading.ts);
    return {
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      fullTime: date.toLocaleString(),
      temp: parseFloat(reading.temperature_c) || 0,
      humidity: parseFloat(reading.humidity_pct) || 0,
      lux: parseFloat(reading.lux) || 0,
      sound: reading.sound || 0,
      air: reading.co2_ppm || 0,
    };
  });

  if (isLoading) {
    return (
      <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-6">
        <div className="h-6 w-48 bg-slate-700 rounded mb-6 animate-pulse" />
        <div className="h-64 bg-slate-700/50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-slate-800/40 rounded-xl border border-slate-700/40 p-6">
      <h3 className="text-lg font-semibold text-gray-200 mb-6">{title}</h3>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => <span className="text-gray-400 text-sm">{value}</span>}
            />
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                name={line.name}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default Chart;
