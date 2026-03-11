import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type {
  AuthUser,
  UserListItem,
  UserControllerAssignment,
  Controller,
  UserInviteRequest,
  UserInviteResponse,
} from '../types';
import { ProfileMenu } from './ProfileMenu';
import { UserInviteModal } from './UserInviteModal';
import { useI18n } from '../i18n';

interface AdminDashboardProps {
  user?: AuthUser | null;
  onLogout: () => void;
}

const normalizeFlag = (value: unknown) =>
  value === true || value === 1 || value === '1' || value === 'true';

const isAdminUser = (user?: AuthUser | null) => {
  if (!user) return false;
  const isAdminFlag = normalizeFlag(user.is_admin);
  return isAdminFlag || user.role === 'admin';
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const typed = error as { response?: { data?: { error?: string } } };
    return typed.response?.data?.error ?? fallback;
  }
  return fallback;
};

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const isAdmin = isAdminUser(user);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [availableDevices, setAvailableDevices] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [controllerId, setControllerId] = useState<number | ''>('');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [assignments, setAssignments] = useState<UserControllerAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [assignError, setAssignError] = useState('');
  const [controllerError, setControllerError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState<UserInviteRequest>({
    username: '',
    email: '',
    role: 'user',
  });
  const [inviteError, setInviteError] = useState('');
  const [inviteResponse, setInviteResponse] = useState<UserInviteResponse | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [isDeletingUserId, setIsDeletingUserId] = useState<number | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      if (!isAdmin) return;
      setIsLoading(true);
      try {
        const data = await api.getUsers();
        setUsers(data);
        if (data.length > 0) {
          setSelectedUserId((current) => current || data[0].id);
        }
      } catch (error) {
        const message = getErrorMessage(error, t('admin.loadUsersFailed'));
        setUsersError(message);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, [isAdmin]);

  useEffect(() => {
    const loadControllers = async () => {
      if (!isAdmin) return;
      try {
        const data = await api.getControllers();
        setControllers(data);
        const available = await api.getAvailableDevices();
        setAvailableDevices(available);
      } catch (error) {
        const message = getErrorMessage(error, t('admin.loadControllersFailed'));
        setControllerError(message);
        setControllers([]);
        setAvailableDevices([]);
      }
    };
    loadControllers();
  }, [isAdmin]);

  useEffect(() => {
    const loadAssignments = async () => {
      if (!selectedUserId) {
        setAssignments([]);
        return;
      }
      try {
        const data = await api.getUserControllers(selectedUserId);
        setAssignments(data);
      } catch (error) {
        const message = getErrorMessage(error, t('admin.loadAssignmentsFailed'));
        setAssignError(message);
      }
    };
    loadAssignments();
  }, [selectedUserId]);

  const resetInviteState = () => {
    setInviteForm({ username: '', email: '', role: 'user' });
    setInviteError('');
    setInviteResponse(null);
    setIsInviting(false);
  };

  const handleInviteSubmit = async () => {
    setInviteError('');
    if (!inviteForm.username.trim() || !inviteForm.email.trim()) {
      setInviteError(t('settings.referralRequired'));
      return;
    }
    setIsInviting(true);
    try {
      const response = await api.inviteUser({
        username: inviteForm.username.trim(),
        email: inviteForm.email.trim(),
        role: inviteForm.role || 'user',
      });
      setInviteResponse(response);
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      const message = getErrorMessage(error, t('admin.inviteFailed'));
      setInviteError(message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm(t('admin.deleteUserConfirm'))) return;
    setUsersError('');
    setIsDeletingUserId(userId);
    try {
      await api.deleteUser(userId);
      setUsers((prev) => prev.filter((row) => row.id !== userId));
    } catch (error) {
      const message = getErrorMessage(error, t('admin.deleteUserFailed'));
      setUsersError(message);
    } finally {
      setIsDeletingUserId(null);
    }
  };

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAssignError('');
    if (!selectedUserId || !controllerId) {
      setAssignError(t('admin.selectUserAndController'));
      return;
    }
    try {
      await api.assignUserController(selectedUserId, controllerId);
      const data = await api.getUserControllers(selectedUserId);
      setAssignments(data);
      setControllerId('');
    } catch (error) {
      const message = getErrorMessage(error, t('admin.assignFailed'));
      setAssignError(message);
    }
  };

  const handleRemove = async (controller: number) => {
    if (!selectedUserId) return;
    setAssignError('');
    try {
      await api.removeUserController(selectedUserId, controller);
      const data = await api.getUserControllers(selectedUserId);
      setAssignments(data);
    } catch (error) {
      const message = getErrorMessage(error, t('settings.removeDeviceFailed'));
      setAssignError(message);
    }
  };

  const handleCreateController = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setControllerError('');
    if (!newDeviceId.trim()) {
      setControllerError(t('admin.deviceIdRequired'));
      return;
    }
    try {
      await api.createController({
        deviceId: newDeviceId.trim(),
        label: newLabel.trim() || undefined,
      });
      const data = await api.getControllers();
      setControllers(data);
      setNewDeviceId('');
      setNewLabel('');
    } catch (error) {
      const message = getErrorMessage(error, t('admin.createControllerFailed'));
      setControllerError(message);
    }
  };

  const handleDeleteController = async (id: number) => {
    setControllerError('');
    try {
      await api.deleteController(id);
      const data = await api.getControllers();
      setControllers(data);
      if (controllerId === id) {
        setControllerId('');
      }
    } catch (error) {
      const message = getErrorMessage(error, t('admin.deleteControllerFailed'));
      setControllerError(message);
    }
  };

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <NavLink to="/" className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-lg shadow-cyan-500/10">
                <img src="/IotMonitoring.png" alt="IoT Monitoring" className="w-12 h-12 object-contain" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                {t('common.appName')}
              </h1>
            </NavLink>
            <p className="text-gray-400 text-sm">
              {t('admin.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-4">
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
                {t('common.dashboard')}
              </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                {t('common.adminDashboard')}
              </NavLink>
              <NavLink
                to="/audit"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                {t('common.auditLogs')}
              </NavLink>
              <NavLink
                to="/health"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                {t('common.systemHealth')}
              </NavLink>
            </nav>
            {user && (
              <ProfileMenu
                user={user}
                onLogout={onLogout}
                onSettings={() => navigate('/settings')}
              />
            )}
          </div>
        </header>

        <section className="bg-slate-800/40 rounded-xl border border-slate-700/40 overflow-hidden">
          <div className="p-4 border-b border-slate-700/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-200">{t('admin.users')}</h3>
              <p className="text-sm text-gray-400 mt-1">{t('admin.usersHelp')}</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                resetInviteState();
                setShowInviteModal(true);
              }}
            >
              {t('admin.inviteUser')}
            </button>
          </div>
          {usersError ? (
            <div className="p-4 text-sm text-red-300">{usersError}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('common.username')}</th>
                    <th>{t('common.email')}</th>
                    <th>{t('common.role')}</th>
                    <th>{t('admin.invited')}</th>
                    <th>{t('admin.mustChange')}</th>
                    <th>{t('common.created')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        {t('admin.noUsers')}
                      </td>
                    </tr>
                  ) : (
                    users.map((row) => {
                      const isAdminFlag = normalizeFlag(row.is_admin) || row.role === 'admin';
                      const roleLabel = isAdminFlag ? t('common.admin') : t('common.user');
                      return (
                        <tr key={row.id}>
                          <td>{row.username}</td>
                          <td>{row.email}</td>
                          <td>{roleLabel}</td>
                          <td>{row.invited_at ? new Date(row.invited_at).toLocaleString(locale) : '-'}</td>
                          <td>{normalizeFlag(row.must_change_password) ? t('common.yes') : t('common.no')}</td>
                          <td>{new Date(row.created_at).toLocaleString(locale)}</td>
                          <td className="text-right">
                            {row.id === user?.id ? (
                              <span className="text-xs text-gray-500">{t('admin.you')}</span>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-ghost text-red-300"
                                onClick={() => handleDeleteUser(row.id)}
                                disabled={isDeletingUserId === row.id}
                              >
                                {isDeletingUserId === row.id ? t('admin.deleting') : t('common.delete')}
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

        <section className="bg-slate-800/40 rounded-xl border border-slate-700/40 overflow-hidden">
          <div className="p-4 border-b border-slate-700/40">
            <h3 className="text-lg font-semibold text-gray-200">{t('admin.controllerAssignments')}</h3>
            <p className="text-sm text-gray-400 mt-1">{t('admin.controllerAssignmentsHelp')}</p>
          </div>
          <div className="p-4 space-y-4">
            <form className="grid gap-4 md:grid-cols-3" onSubmit={handleAssign}>
              <div>
                <label className="text-sm text-gray-300">{t('common.user')}</label>
                <select
                  className="select w-full mt-2"
                  value={selectedUserId}
                  onChange={(event) =>
                    setSelectedUserId(event.target.value ? Number(event.target.value) : '')
                  }
                >
                  <option value="">{t('admin.selectUser')}</option>
                  {users.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.username} ({row.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">{t('admin.controllers')}</label>
                <select
                  className="select w-full mt-2"
                  value={controllerId}
                  onChange={(event) =>
                    setControllerId(event.target.value ? Number(event.target.value) : '')
                  }
                >
                  <option value="">{t('admin.selectController')}</option>
                  {controllers.map((controller) => (
                    <option key={controller.id} value={controller.id}>
                      {controller.label ? `${controller.label} • ` : ''}
                      {controller.device_id}
                      {controller.pairing_code ? ` • ${controller.pairing_code}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button className="btn btn-primary w-full" type="submit">
                  {t('admin.assign')}
                </button>
              </div>
            </form>

            {assignError && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {assignError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('admin.controllerId')}</th>
                    <th>{t('settings.assigned')}</th>
                    <th>{t('admin.code')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUserId === '' ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        {t('admin.selectUserForAssignments')}
                      </td>
                    </tr>
                  ) : assignments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        {t('admin.noAssignments')}
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assignment) => (
                      <tr key={`${assignment.user_id}-${assignment.controller_id}`}>
                        <td>
                          {assignment.assignment_label
                            ? `${assignment.assignment_label} • `
                            : assignment.controller_label
                              ? `${assignment.controller_label} • `
                              : ''}
                          {assignment.device_id}
                        </td>
                        <td>{new Date(assignment.created_at).toLocaleString(locale)}</td>
                        <td>{assignment.pairing_code || '-'}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-ghost text-red-300"
                            onClick={() => handleRemove(assignment.controller_id)}
                          >
                            {t('common.remove')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-slate-800/40 rounded-xl border border-slate-700/40 overflow-hidden">
          <div className="p-4 border-b border-slate-700/40">
            <h3 className="text-lg font-semibold text-gray-200">{t('admin.controllers')}</h3>
            <p className="text-sm text-gray-400 mt-1">{t('admin.controllersHelp')}</p>
          </div>
          <div className="p-4 space-y-4">
            <form className="grid gap-4 md:grid-cols-3" onSubmit={handleCreateController}>
              <div>
                <label className="text-sm text-gray-300">{t('admin.deviceId')}</label>
                <input
                  className="input mt-2"
                  list="available-devices"
                  placeholder="device_id"
                  value={newDeviceId}
                  onChange={(event) => setNewDeviceId(event.target.value)}
                />
                <datalist id="available-devices">
                  {availableDevices.map((device) => (
                    <option key={device} value={device} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-sm text-gray-300">{t('admin.labelOptional')}</label>
                <input
                  className="input mt-2"
                  placeholder="Lab Sensor 01"
                  value={newLabel}
                  onChange={(event) => setNewLabel(event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button className="btn btn-secondary w-full" type="submit">
                  {t('admin.addController')}
                </button>
              </div>
            </form>

            {controllerError && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {controllerError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('admin.deviceId')}</th>
                    <th>{t('common.label')}</th>
                    <th>{t('admin.code')}</th>
                    <th>{t('common.created')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {controllers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        {t('admin.noControllersCreated')}
                      </td>
                    </tr>
                  ) : (
                    controllers.map((controller) => (
                      <tr key={controller.id}>
                        <td>{controller.device_id}</td>
                        <td>{controller.label || '-'}</td>
                        <td>{controller.pairing_code || '-'}</td>
                        <td>{new Date(controller.created_at).toLocaleString(locale)}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-ghost text-red-300"
                            onClick={() => handleDeleteController(controller.id)}
                          >
                            {t('common.delete')}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <UserInviteModal
          isOpen={showInviteModal}
          isSubmitting={isInviting}
          error={inviteError}
          response={inviteResponse}
          values={inviteForm}
          onChange={(next) => setInviteForm((prev) => ({ ...prev, ...next }))}
          onSubmit={handleInviteSubmit}
          onClose={() => {
            setShowInviteModal(false);
            resetInviteState();
          }}
        />

        <footer className="text-center text-gray-600 text-sm py-4">
          <p>{t('admin.footer')}</p>
        </footer>
      </div>
    </div>
  );
}

export default AdminDashboard;
