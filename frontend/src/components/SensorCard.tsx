import { Thermometer, Droplets, Sun, Volume2, Wind } from 'lucide-react';
import type { SensorType } from '../types';

interface SensorCardProps {
  type: SensorType;
  value: number;
  unit: string;
  label: string;
  trend?: 'up' | 'down' | 'stable';
  isLoading?: boolean;
}

const sensorConfig: Record<SensorType, {
  icon: typeof Thermometer;
  color: string;
  glowClass: string;
  bgGradient: string;
}> = {
  temperature: {
    icon: Thermometer,
    color: 'text-sensor-temp',
    glowClass: 'glow-temp',
    bgGradient: 'from-orange-500/10 to-transparent',
  },
  humidity: {
    icon: Droplets,
    color: 'text-sensor-humidity',
    glowClass: 'glow-humidity',
    bgGradient: 'from-cyan-500/10 to-transparent',
  },
  light: {
    icon: Sun,
    color: 'text-sensor-light',
    glowClass: 'glow-light',
    bgGradient: 'from-yellow-500/10 to-transparent',
  },
  sound: {
    icon: Volume2,
    color: 'text-sensor-sound',
    glowClass: 'glow-sound',
    bgGradient: 'from-purple-500/10 to-transparent',
  },
  air: {
    icon: Wind,
    color: 'text-sensor-air',
    glowClass: 'glow-air',
    bgGradient: 'from-green-500/10 to-transparent',
  },
};

export function SensorCard({ type, value, unit, label, isLoading }: SensorCardProps) {
  const config = sensorConfig[type];
  const Icon = config.icon;

  if (isLoading) {
    return (
      <div className={`sensor-card ${config.glowClass} p-5`}>
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-slate-700 rounded-lg mb-4" />
          <div className="h-4 w-20 bg-slate-700 rounded mb-2" />
          <div className="h-8 w-24 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`sensor-card ${config.glowClass} p-5 group`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-700/50 ${config.color} mb-4`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Label */}
        <p className="text-gray-400 text-sm font-medium mb-1">{label}</p>

        {/* Value */}
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold font-mono ${config.color} tracking-tight`}>
            {typeof value === 'number' ? value.toFixed(1) : '--'}
          </span>
          <span className="text-gray-500 text-sm font-medium">{unit}</span>
        </div>

        {/* Decorative line */}
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${config.bgGradient.replace('/10', '/30')} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      </div>
    </div>
  );
}

export default SensorCard;
