import { NavLink } from 'react-router-dom';
import type { AuthUser } from '../types';
import { ProfileMenu } from './ProfileMenu';

interface AdminPageHeaderProps {
  title: string;
  subtitle: string;
  dashboardLabel: string;
  adminLabel: string;
  auditLabel: string;
  healthLabel: string;
  user: AuthUser;
  onLogout: () => void;
  onSettings: () => void;
}

const navLinkClassName = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
    isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
  }`;

export function AdminPageHeader({
  title,
  subtitle,
  dashboardLabel,
  adminLabel,
  auditLabel,
  healthLabel,
  user,
  onLogout,
  onSettings,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <NavLink to="/" className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-lg shadow-cyan-500/10">
            <img src="/IotMonitoring.png" alt="IoT Monitoring" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">{title}</h1>
        </NavLink>
        <p className="text-gray-400 text-sm">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-1 rounded-full bg-slate-800/70 p-1">
          <NavLink to="/" className={navLinkClassName} end>
            {dashboardLabel}
          </NavLink>
          <NavLink to="/admin" className={navLinkClassName}>
            {adminLabel}
          </NavLink>
          <NavLink to="/audit" className={navLinkClassName}>
            {auditLabel}
          </NavLink>
          <NavLink to="/health" className={navLinkClassName}>
            {healthLabel}
          </NavLink>
        </nav>
        <ProfileMenu user={user} onLogout={onLogout} onSettings={onSettings} />
      </div>
    </header>
  );
}

export default AdminPageHeader;
