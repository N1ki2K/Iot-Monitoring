import { Plus, RefreshCw } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { AuthUser } from '../../types';
import DeviceSelector from '../DeviceSelector';
import { ProfileMenu } from '../ProfileMenu';

interface DashboardHeaderProps {
  user?: AuthUser | null;
  isAdmin: boolean;
  appName: string;
  subtitle: string;
  dashboardLabel: string;
  adminLabel: string;
  auditLabel: string;
  healthLabel: string;
  addDeviceLabel: string;
  refreshLabel: string;
  deviceOptions: Array<{ id: string; label?: string | null }>;
  selectedDevice: string;
  isLoading: boolean;
  isRefreshing: boolean;
  onSelectDevice: (deviceId: string) => void;
  onRefresh: () => void;
  onOpenClaim: () => void;
  onLogout: () => void;
  onSettings: () => void;
}

export function DashboardHeader({
  user,
  isAdmin,
  appName,
  subtitle,
  dashboardLabel,
  adminLabel,
  auditLabel,
  healthLabel,
  addDeviceLabel,
  refreshLabel,
  deviceOptions,
  selectedDevice,
  isLoading,
  isRefreshing,
  onSelectDevice,
  onRefresh,
  onOpenClaim,
  onLogout,
  onSettings,
}: DashboardHeaderProps) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-lg shadow-cyan-500/10">
            <img src="/IotMonitoring.png" alt="IoT Monitoring" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">{appName}</h1>
        </div>
        <p className="text-gray-400 text-sm">{subtitle}</p>
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
              {dashboardLabel}
            </NavLink>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              {adminLabel}
            </NavLink>
            <NavLink
              to="/audit"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              {auditLabel}
            </NavLink>
            <NavLink
              to="/health"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                }`
              }
            >
              {healthLabel}
            </NavLink>
          </nav>
        )}
        {!isAdmin && (
          <button onClick={onOpenClaim} className="btn btn-secondary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>{addDeviceLabel}</span>
          </button>
        )}
        <DeviceSelector
          devices={deviceOptions}
          selectedDevice={selectedDevice}
          onSelect={onSelectDevice}
          isLoading={isLoading}
        />

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{refreshLabel}</span>
        </button>
        {user && <ProfileMenu user={user} onLogout={onLogout} onSettings={onSettings} />}
      </div>
    </header>
  );
}
