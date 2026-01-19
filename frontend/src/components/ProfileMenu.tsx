import type { AuthUser } from '../types';

interface ProfileMenuProps {
  user: AuthUser;
  onLogout: () => void;
  onSettings?: () => void;
}

const getInitials = (value: string) =>
  value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export function ProfileMenu({
  user,
  onLogout,
  onSettings = () => {},
}: ProfileMenuProps) {
  const label = user.username || user.email;
  const initials = getInitials(label);

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer">
        <div className="flex items-center gap-2 rounded-full bg-slate-800/70 px-3 py-1.5 border border-slate-700/40">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-200 flex items-center justify-center text-xs font-semibold">
            {initials || 'U'}
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm text-gray-200 font-semibold">{label}</span>
            <span className="text-xs text-gray-500">{user.is_admin === 1 ? 'Admin' : 'User'}</span>
          </div>
        </div>
      </summary>
      <div className="absolute right-0 mt-2 w-44 rounded-xl bg-slate-900 border border-slate-700/60 shadow-xl p-1 z-20">
        <button
          type="button"
          onClick={onSettings}
          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-slate-800/60 rounded-lg"
        >
          Settings
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 rounded-lg"
        >
          Logout
        </button>
      </div>
    </details>
  );
}

export default ProfileMenu;
