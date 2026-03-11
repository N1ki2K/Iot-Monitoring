import { useState, type FormEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import { api } from '../api';
import type { AuthUser } from '../types';
import { useI18n } from '../useI18n';

interface PasswordChangeRequiredProps {
  user: AuthUser;
  onUserUpdated: (user: AuthUser) => void;
  onLogout: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const typed = error as { response?: { data?: { error?: string } } };
    return typed.response?.data?.error ?? fallback;
  }
  return fallback;
};

export function PasswordChangeRequired({ user, onUserUpdated, onLogout }: PasswordChangeRequiredProps) {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setStatus('');

    if (!currentPassword || !newPassword) {
      setError(t('settings.enterCurrentAndNewPassword'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsNoMatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updatePassword({ currentPassword, newPassword });
      const refreshed = await api.getMe();
      onUserUpdated(refreshed);
      setStatus(t('passwordChange.updatedRedirecting'));
    } catch (error) {
      const message = getErrorMessage(error, t('settings.passwordUpdateFailed'));
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-slate-950">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800/80 bg-slate-900/70 p-8 shadow-2xl">
        <div className="flex items-center gap-3 text-cyan-300">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <LockKeyhole className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">{t('passwordChange.title')}</h1>
            <p className="text-sm text-gray-400 mt-1">{t('passwordChange.subtitle', { username: user.username })}</p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm text-gray-300">{t('settings.currentPassword')}</label>
            <input
              type="password"
              className="input mt-2"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">{t('settings.newPassword')}</label>
            <input
              type="password"
              className="input mt-2"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">{t('auth.confirmPassword')}</label>
            <input
              type="password"
              className="input mt-2"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {status && (
            <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
              {status}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button type="button" className="btn btn-ghost" onClick={onLogout}>
              {t('passwordChange.logout')}
            </button>
            <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('passwordChange.updating') : t('settings.updatePassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PasswordChangeRequired;
