import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { AuthUser, UserListItem, UserControllerAssignment, Controller } from '../types';
import { ProfileMenu } from './ProfileMenu';

interface AdminDashboardProps {
  user?: AuthUser | null;
  onLogout: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const typed = error as { response?: { data?: { error?: string } } };
    return typed.response?.data?.error ?? fallback;
  }
  return fallback;
};

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const navigate = useNavigate();
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

  useEffect(() => {
    const loadUsers = async () => {
      if (!user || user.is_admin !== 1) return;
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
  }, [user]);

  useEffect(() => {
    const loadControllers = async () => {
      if (!user || user.is_admin !== 1) return;
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
  }, [user]);

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

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.is_admin !== 1) {
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
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((row) => (
                      <tr key={row.id}>
                        <td>{row.username}</td>
                        <td>{row.email}</td>
                        <td>{row.is_admin === 1 ? 'Yes' : 'No'}</td>
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

        <footer className="text-center text-gray-600 text-sm py-4">
          <p>ESP32 IoT Monitoring System • Admin view</p>
        </footer>
      </div>
    </div>
  );
}

export default AdminDashboard;
