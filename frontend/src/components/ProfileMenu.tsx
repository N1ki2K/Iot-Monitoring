import type { AuthUser } from '../types';
import { isUserAdmin } from '../utils/flags';
import { useI18n } from '../useI18n';
import { useTheme } from '../useTheme';

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

export function ProfileMenu({ user, onLogout, onSettings }: ProfileMenuProps) {
  const { language, setLanguage, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const label = user.username || user.email;
  const initials = getInitials(label);
  const isAdmin = isUserAdmin(user);
  const roleLabel = isAdmin ? t('common.admin') : t('common.user');

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer">
        <div className="flex items-center gap-2 rounded-full bg-slate-800/70 px-3 py-1.5 border border-slate-700/40">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-200 flex items-center justify-center text-xs font-semibold">
            {initials || 'U'}
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm text-gray-200 font-semibold">{label}</span>
            <span className="text-xs text-gray-500">{roleLabel}</span>
          </div>
        </div>
      </summary>
      <div className="absolute right-0 mt-2 w-44 rounded-xl bg-slate-900 border border-slate-700/60 shadow-xl p-1 z-20">
        {onSettings && (
          <button
            type="button"
            onClick={onSettings}
            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-slate-800/60 rounded-lg"
          >
            {t('common.settings')}
          </button>
        )}
        <div className="px-3 py-2">
          <label className="mb-1 block text-xs text-gray-500">{t('profile.languageLabel')}</label>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as 'en' | 'bg')}
            className="select w-full text-sm"
          >
            <option value="en">{t('language.english')}</option>
            <option value="bg">{t('language.bulgarian')}</option>
          </select>
        </div>
        <div className="px-3 py-2">
          <label className="mb-1 block text-xs text-gray-500">{t('common.theme')}</label>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value as 'dark' | 'light')}
            className="select w-full text-sm"
          >
            <option value="dark">{t('theme.dark')}</option>
            <option value="light">{t('theme.light')}</option>
          </select>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 rounded-lg"
        >
          {t('common.logout')}
        </button>
      </div>
    </details>
  );
}

export default ProfileMenu;
