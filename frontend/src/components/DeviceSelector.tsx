import { Cpu } from 'lucide-react';

interface DeviceSelectorProps {
  devices: string[];
  selectedDevice: string;
  onSelect: (device: string) => void;
  isLoading?: boolean;
}

export function DeviceSelector({ devices, selectedDevice, onSelect, isLoading }: DeviceSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-700 rounded-lg animate-pulse" />
        <div className="w-40 h-10 bg-slate-700 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800/60 border border-slate-700/40 text-cyan-400">
        <Cpu className="w-5 h-5" />
      </div>
      <select
        value={selectedDevice}
        onChange={(e) => onSelect(e.target.value)}
        className="select min-w-[200px]"
      >
        <option value="">All Devices</option>
        {devices.map((device) => (
          <option key={device} value={device}>
            {device}
          </option>
        ))}
      </select>
    </div>
  );
}

export default DeviceSelector;
