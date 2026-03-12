import type { AuthUser, UserListItem } from '../../types';
import { formatLocaleDateTime } from '../../utils/format';
import { normalizeFlag } from '../../utils/flags';

interface AdminUsersSectionProps {
  currentUser?: AuthUser | null;
  users: UserListItem[];
  isLoading: boolean;
  error: string;
  locale: string;
  usersTitle: string;
  usersHelp: string;
  inviteLabel: string;
  usernameLabel: string;
  emailLabel: string;
  roleLabel: string;
  invitedLabel: string;
  mustChangeLabel: string;
  createdLabel: string;
  loadingLabel: string;
  noUsersLabel: string;
  yesLabel: string;
  noLabel: string;
  userLabel: string;
  adminLabel: string;
  youLabel: string;
  deleteLabel: string;
  deletingLabel: string;
  onInvite: () => void;
  onDelete: (userId: number) => void;
  deletingUserId: number | null;
}

export function AdminUsersSection({
  currentUser,
  users,
  isLoading,
  error,
  locale,
  usersTitle,
  usersHelp,
  inviteLabel,
  usernameLabel,
  emailLabel,
  roleLabel,
  invitedLabel,
  mustChangeLabel,
  createdLabel,
  loadingLabel,
  noUsersLabel,
  yesLabel,
  noLabel,
  userLabel,
  adminLabel,
  youLabel,
  deleteLabel,
  deletingLabel,
  onInvite,
  onDelete,
  deletingUserId,
}: AdminUsersSectionProps) {
  return (
    <section className="bg-slate-800/40 rounded-xl border border-slate-700/40 overflow-hidden">
      <div className="p-4 border-b border-slate-700/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-200">{usersTitle}</h3>
          <p className="text-sm text-gray-400 mt-1">{usersHelp}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onInvite}>
          {inviteLabel}
        </button>
      </div>
      {error ? (
        <div className="p-4 text-sm text-red-300">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{usernameLabel}</th>
                <th>{emailLabel}</th>
                <th>{roleLabel}</th>
                <th>{invitedLabel}</th>
                <th>{mustChangeLabel}</th>
                <th>{createdLabel}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    {loadingLabel}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    {noUsersLabel}
                  </td>
                </tr>
              ) : (
                users.map((row) => {
                  const isAdminFlag = normalizeFlag(row.is_admin) || row.role === 'admin';
                  const resolvedRoleLabel = isAdminFlag ? adminLabel : userLabel;

                  return (
                    <tr key={row.id}>
                      <td>{row.username}</td>
                      <td>{row.email}</td>
                      <td>{resolvedRoleLabel}</td>
                      <td>{formatLocaleDateTime(row.invited_at, locale)}</td>
                      <td>{normalizeFlag(row.must_change_password) ? yesLabel : noLabel}</td>
                      <td>{formatLocaleDateTime(row.created_at, locale)}</td>
                      <td className="text-right">
                        {row.id === currentUser?.id ? (
                          <span className="text-xs text-gray-500">{youLabel}</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost text-red-300"
                            onClick={() => onDelete(row.id)}
                            disabled={deletingUserId === row.id}
                          >
                            {deletingUserId === row.id ? deletingLabel : deleteLabel}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
