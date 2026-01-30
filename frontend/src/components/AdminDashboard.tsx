import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type {
  AuthUser,
  UserListItem,
  UserControllerAssignment,
  Controller,
  AuditLogEntry,
  AuditLogQueryParams,
  PaginatedResponse,
} from '../types';
import { ProfileMenu } from './ProfileMenu';

interface AdminDashboardProps {
  user?: AuthUser | null;
  onLogout: () => void;
}

const normalizeFlag = (value: unknown) =>
  value === true || value === 1 || value === '1' || value === 'true';

const isAdminUser = (user?: AuthUser | null) => {
  if (!user) return false;
  const isAdminFlag = normalizeFlag(user.is_admin);
  const isDevFlag = normalizeFlag(user.is_dev);
  return isAdminFlag || isDevFlag || user.role === 'admin' || user.role === 'dev';
};

const isDevUser = (user?: AuthUser | null) => {
  if (!user) return false;
  return normalizeFlag(user.is_dev) || user.role === 'dev';
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const typed = error as { response?: { data?: { error?: string } } };
    return typed.response?.data?.error ?? fallback;
  }
  return fallback;
};

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const navigate = useNavigate();
  const isAdmin = isAdminUser(user);
  const isDev = isDevUser(user);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [availableDevices, setAvailableDevices] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [controllerId, setControllerId] = useState<number | ''>('');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [assignments, setAssignments] = useState<UserControllerAssignment[]>([]);
  const [auditData, setAuditData] = useState<PaginatedResponse<AuditLogEntry> | null>(null);
  const [auditError, setAuditError] = useState('');
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(20);
  const [auditFilters, setAuditFilters] = useState({
    actorId: '',
    action: '',
    entityType: '',
    entityId: '',
  });
  const [auditQuery, setAuditQuery] = useState<AuditLogQueryParams>({});
  const [auditPurgeBefore, setAuditPurgeBefore] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [assignError, setAssignError] = useState('');
  const [controllerError, setControllerError] = useState('');

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
        const message = getErrorMessage(error, 'Failed to load users.');
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
        const message = getErrorMessage(error, 'Failed to load controllers.');
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
        const message = getErrorMessage(error, 'Failed to load controllers.');
        setAssignError(message);
      }
    };
    loadAssignments();
  }, [selectedUserId]);

  useEffect(() => {
    const loadAuditLogs = async () => {
      if (!isAdmin) return;
      setAuditLoading(true);
      setAuditError('');
      try {
        const data = await api.getAuditLogs({
          ...auditQuery,
          page: auditPage,
          limit: auditLimit,
        });
        setAuditData(data);
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to load audit logs.');
        setAuditError(message);
        setAuditData(null);
      } finally {
        setAuditLoading(false);
      }
    };
    loadAuditLogs();
  }, [isAdmin, auditQuery, auditPage, auditLimit]);

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAssignError('');
    if (!selectedUserId || !controllerId) {
      setAssignError('Select a user and controller.');
      return;
    }
    try {
      await api.assignUserController(selectedUserId, controllerId);
      const data = await api.getUserControllers(selectedUserId);
      setAssignments(data);
      setControllerId('');
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to assign controller.');
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
      const message = getErrorMessage(error, 'Failed to remove controller.');
      setAssignError(message);
    }
  };

  const handleCreateController = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setControllerError('');
    if (!newDeviceId.trim()) {
      setControllerError('Device ID is required.');
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
      const message = getErrorMessage(error, 'Failed to create controller.');
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
      const message = getErrorMessage(error, 'Failed to delete controller.');
      setControllerError(message);
    }
  };

  const handleAuditApply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuditError('');
    const nextQuery: AuditLogQueryParams = {};
    const actorIdRaw = auditFilters.actorId.trim();
    if (actorIdRaw) {
      const actorId = Number(actorIdRaw);
      if (Number.isNaN(actorId)) {
        setAuditError('Actor ID must be a number.');
        return;
      }
      nextQuery.actorId = actorId;
    }
    if (auditFilters.action.trim()) {
      nextQuery.action = auditFilters.action.trim();
    }
    if (auditFilters.entityType.trim()) {
      nextQuery.entityType = auditFilters.entityType.trim();
    }
    if (auditFilters.entityId.trim()) {
      nextQuery.entityId = auditFilters.entityId.trim();
    }
    setAuditQuery(nextQuery);
    setAuditPage(1);
  };

  const handleAuditClear = () => {
    setAuditFilters({
      actorId: '',
      action: '',
      entityType: '',
      entityId: '',
    });
    setAuditQuery({});
    setAuditPage(1);
  };

  const formatAuditMetadata = (metadata: AuditLogEntry['metadata']) => {
    if (!metadata) return '-';
    if (typeof metadata === 'string') return metadata;
    try {
      return JSON.stringify(metadata);
    } catch {
      return '[metadata]';
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
                IoT Monitoring
              </h1>
            </NavLink>
            <p className="text-gray-400 text-sm">
              Admin dashboard
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
                Dashboard
              </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                Admin Dashboard
              </NavLink>
              <NavLink
                to="/audit"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    isActive ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                Audit Logs
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
          <div className="p-4 border-b border-slate-700/40">
            <h3 className="text-lg font-semibold text-gray-200">Users</h3>
            <p className="text-sm text-gray-400 mt-1">Admin view of registered users.</p>
          </div>
          {usersError ? (
            <div className="p-4 text-sm text-red-300">{usersError}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Admin</th>
                    <th>Dev</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((row) => (
                      <tr key={row.id}>
                        <td>{row.username}</td>
                        <td>{row.email}</td>
                        <td>
                          {normalizeFlag(row.is_admin) || row.role === 'admin' ? 'Yes' : 'No'}
                        </td>
                        <td>{normalizeFlag(row.is_dev) || row.role === 'dev' ? 'Yes' : 'No'}</td>
                        <td>{new Date(row.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-slate-800/40 rounded-xl border border-slate-700/40 overflow-hidden">
          <div className="p-4 border-b border-slate-700/40">
            <h3 className="text-lg font-semibold text-gray-200">Controller Assignments</h3>
            <p className="text-sm text-gray-400 mt-1">Assign controllers (device ids) to users.</p>
          </div>
          <div className="p-4 space-y-4">
            <form className="grid gap-4 md:grid-cols-3" onSubmit={handleAssign}>
              <div>
                <label className="text-sm text-gray-300">User</label>
                <select
                  className="select w-full mt-2"
                  value={selectedUserId}
                  onChange={(event) =>
                    setSelectedUserId(event.target.value ? Number(event.target.value) : '')
                  }
                >
                  <option value="">Select user</option>
                  {users.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.username} ({row.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300">Controller</label>
                <select
                  className="select w-full mt-2"
                  value={controllerId}
                  onChange={(event) =>
                    setControllerId(event.target.value ? Number(event.target.value) : '')
                  }
                >
                  <option value="">Select controller</option>
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
                  Assign
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
                    <th>Controller ID</th>
                    <th>Assigned</th>
                    <th>Code</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedUserId === '' ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        Select a user to view assignments
                      </td>
                    </tr>
                  ) : assignments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        No controllers assigned
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
                        <td>{new Date(assignment.created_at).toLocaleString()}</td>
                        <td>{assignment.pairing_code || '-'}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-ghost text-red-300"
                            onClick={() => handleRemove(assignment.controller_id)}
                          >
                            Remove
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
            <h3 className="text-lg font-semibold text-gray-200">Controllers</h3>
            <p className="text-sm text-gray-400 mt-1">Create and manage controllers.</p>
          </div>
          <div className="p-4 space-y-4">
            <form className="grid gap-4 md:grid-cols-3" onSubmit={handleCreateController}>
              <div>
                <label className="text-sm text-gray-300">Device ID</label>
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
                <label className="text-sm text-gray-300">Label (optional)</label>
                <input
                  className="input mt-2"
                  placeholder="Lab Sensor 01"
                  value={newLabel}
                  onChange={(event) => setNewLabel(event.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button className="btn btn-secondary w-full" type="submit">
                  Add Controller
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
                    <th>Device ID</th>
                    <th>Label</th>
                    <th>Code</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {controllers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        No controllers created
                      </td>
                    </tr>
                  ) : (
                    controllers.map((controller) => (
                      <tr key={controller.id}>
                        <td>{controller.device_id}</td>
                        <td>{controller.label || '-'}</td>
                        <td>{controller.pairing_code || '-'}</td>
                        <td>{new Date(controller.created_at).toLocaleString()}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn btn-ghost text-red-300"
                            onClick={() => handleDeleteController(controller.id)}
                          >
                            Delete
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
            <h3 className="text-lg font-semibold text-gray-200">Audit Log</h3>
            <p className="text-sm text-gray-400 mt-1">Track user actions and system changes.</p>
          </div>
          <div className="p-4 space-y-4">
            <form className="grid gap-4 lg:grid-cols-6" onSubmit={handleAuditApply}>
              <div className="lg:col-span-1">
                <label className="text-sm text-gray-300">Actor ID</label>
                <input
                  className="input mt-2"
                  placeholder="123"
                  value={auditFilters.actorId}
                  onChange={(event) =>
                    setAuditFilters((prev) => ({ ...prev, actorId: event.target.value }))
                  }
                />
              </div>
              <div className="lg:col-span-2">
                <label className="text-sm text-gray-300">Action</label>
                <input
                  className="input mt-2"
                  placeholder="user.login"
                  value={auditFilters.action}
                  onChange={(event) =>
                    setAuditFilters((prev) => ({ ...prev, action: event.target.value }))
                  }
                />
              </div>
              <div className="lg:col-span-2">
                <label className="text-sm text-gray-300">Entity Type</label>
                <input
                  className="input mt-2"
                  placeholder="controller"
                  value={auditFilters.entityType}
                  onChange={(event) =>
                    setAuditFilters((prev) => ({ ...prev, entityType: event.target.value }))
                  }
                />
              </div>
              <div className="lg:col-span-1">
                <label className="text-sm text-gray-300">Entity ID</label>
                <input
                  className="input mt-2"
                  placeholder="42"
                  value={auditFilters.entityId}
                  onChange={(event) =>
                    setAuditFilters((prev) => ({ ...prev, entityId: event.target.value }))
                  }
                />
              </div>
              <div className="lg:col-span-1">
                <label className="text-sm text-gray-300">Rows</label>
                <select
                  className="select w-full mt-2"
                  value={auditLimit}
                  onChange={(event) => {
                    setAuditLimit(Number(event.target.value));
                    setAuditPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="lg:col-span-1 flex items-end gap-2">
                <button className="btn btn-primary w-full" type="submit">
                  Apply
                </button>
                <button className="btn btn-ghost w-full" type="button" onClick={handleAuditClear}>
                  Clear
                </button>
              </div>
            </form>

            {auditError && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {auditError}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="!cursor-default">Time</th>
                    <th className="!cursor-default">Actor</th>
                    <th className="!cursor-default">Action</th>
                    <th className="!cursor-default">Entity</th>
                    <th className="!cursor-default">Source</th>
                    <th className="!cursor-default">IP</th>
                    <th className="!cursor-default">Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <tr key={`audit-skeleton-${index}`}>
                        {Array.from({ length: 7 }).map((__, cell) => (
                          <td key={`audit-skeleton-cell-${cell}`}>
                            <div className="h-4 bg-slate-700/50 rounded animate-pulse w-24" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : auditData?.data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        No audit entries found
                      </td>
                    </tr>
                  ) : (
                    auditData?.data.map((entry) => {
                      const actorLabel = entry.actor_email
                        ? entry.actor_email
                        : entry.actor_id
                          ? `User ${entry.actor_id}`
                          : 'System';
                      const entityLabel = entry.entity_id
                        ? `${entry.entity_type} • ${entry.entity_id}`
                        : entry.entity_type;
                      const sourceLabel =
                        entry.metadata && typeof entry.metadata === 'object' && 'client' in entry.metadata
                          ? String(entry.metadata.client)
                          : '-';
                      const metadataText = formatAuditMetadata(entry.metadata);
                      return (
                        <tr key={entry.id}>
                          <td>{new Date(entry.created_at).toLocaleString()}</td>
                          <td title={actorLabel}>{actorLabel}</td>
                          <td>
                            <span className="badge bg-slate-700/60 text-slate-200 border border-slate-600/60">
                              {entry.action}
                            </span>
                          </td>
                          <td>{entityLabel}</td>
                          <td>{sourceLabel}</td>
                          <td>{entry.ip_address || '-'}</td>
                          <td className="max-w-[16rem] truncate" title={metadataText}>
                            {metadataText}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {isDev && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-700/40 pt-4">
                <div className="text-sm text-gray-400">Dev tools: purge audit log entries.</div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <input
                    className="input sm:w-60"
                    type="datetime-local"
                    value={auditPurgeBefore}
                    onChange={(event) => setAuditPurgeBefore(event.target.value)}
                  />
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={async () => {
                      if (!auditPurgeBefore) {
                        setAuditError('Select a date/time to purge before.');
                        return;
                      }
                      try {
                        const beforeDate = new Date(auditPurgeBefore);
                        if (Number.isNaN(beforeDate.getTime())) {
                          setAuditError('Invalid date/time for purge.');
                          return;
                        }
                        const beforeIso = beforeDate.toISOString();
                        await api.purgeAuditLogs({ before: beforeIso });
                        const data = await api.getAuditLogs({
                          ...auditQuery,
                          page: 1,
                          limit: auditLimit,
                        });
                        setAuditData(data);
                        setAuditPage(1);
                      } catch (error) {
                        const message = getErrorMessage(error, 'Failed to purge audit logs.');
                        setAuditError(message);
                      }
                    }}
                  >
                    Purge Before
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={async () => {
                      if (!confirm('Purge all audit logs? This cannot be undone.')) return;
                      try {
                        await api.purgeAuditLogs({ all: true });
                        const data = await api.getAuditLogs({
                          ...auditQuery,
                          page: 1,
                          limit: auditLimit,
                        });
                        setAuditData(data);
                        setAuditPage(1);
                      } catch (error) {
                        const message = getErrorMessage(error, 'Failed to purge audit logs.');
                        setAuditError(message);
                      }
                    }}
                  >
                    Purge All
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-700/40 pt-4">
              <p className="text-sm text-gray-500">
                {auditData ? (
                  <>
                    Showing {((auditPage - 1) * auditLimit) + 1} to{' '}
                    {Math.min(auditPage * auditLimit, auditData.pagination.total)} of{' '}
                    <span className="text-gray-300">{auditData.pagination.total}</span> events
                  </>
                ) : (
                  'Loading...'
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage === 1 || auditLoading}
                  className="btn btn-ghost"
                >
                  Prev
                </button>
                <span className="text-sm text-gray-400">
                  Page {auditPage} of {auditData?.pagination.totalPages || 1}
                </span>
                <button
                  onClick={() =>
                    setAuditPage((p) =>
                      auditData ? Math.min(auditData.pagination.totalPages, p + 1) : p + 1
                    )
                  }
                  disabled={auditLoading || (auditData ? auditPage >= auditData.pagination.totalPages : false)}
                  className="btn btn-ghost"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>

        <footer className="text-center text-gray-600 text-sm py-4">
          <p>ESP32 IoT Monitoring System • Admin view</p>
        </footer>
      </div>
    </div>
  );
}

export default AdminDashboard;
