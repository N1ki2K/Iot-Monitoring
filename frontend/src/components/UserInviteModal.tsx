import { useState } from 'react';
import type { UserInviteRequest, UserInviteResponse, UserRole } from '../types';
import { useI18n } from '../useI18n';

interface UserInviteModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  error: string;
  response: UserInviteResponse | null;
  values: UserInviteRequest;
  onChange: (next: Partial<UserInviteRequest>) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function UserInviteModal({
  isOpen,
  isSubmitting,
  error,
  response,
  values,
  onChange,
  onSubmit,
  onClose,
}: UserInviteModalProps) {
  const { t } = useI18n();
  const [copyStatus, setCopyStatus] = useState('');
  const roleOptions: Array<{ value: UserRole; label: string }> = [
    { value: 'user', label: t('common.user') },
    { value: 'admin', label: t('common.admin') },
  ];

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!response?.tempPassword) return;
    try {
      await navigator.clipboard.writeText(response.tempPassword);
      setCopyStatus(t('invite.copied'));
      setTimeout(() => setCopyStatus(''), 2000);
    } catch {
      setCopyStatus(t('invite.copyFailed'));
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{t('invite.title')}</h3>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>

        {response ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-200">{t('invite.created', { email: response.user.email })}</p>
              <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 rounded-lg border border-emerald-500/30 bg-slate-950/40 px-3 py-2">
                  <p className="text-xs text-emerald-300">{t('invite.tempPassword')}</p>
                  <p className="text-sm font-mono text-white mt-1">{response.tempPassword}</p>
                </div>
                <button type="button" className="btn btn-secondary" onClick={handleCopy}>
                  {copyStatus || t('invite.copy')}
                </button>
              </div>
              <p className="text-xs text-emerald-200/80 mt-3">
                {t('invite.shareSecurely')}
              </p>
            </div>
            <div className="flex justify-end">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                {t('common.done')}
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <div>
              <label className="text-sm text-gray-300">{t('common.username')}</label>
              <input
                className="input mt-2"
                placeholder="new-user"
                value={values.username}
                onChange={(event) => onChange({ username: event.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300">{t('common.email')}</label>
              <input
                className="input mt-2"
                placeholder="name@domain.com"
                value={values.email}
                onChange={(event) => onChange({ email: event.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300">{t('common.role')}</label>
              <select
                className="select mt-2 w-full"
                value={values.role || 'user'}
                onChange={(event) => onChange({ role: event.target.value as UserRole })}
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('invite.inviting') : t('invite.send')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default UserInviteModal;
