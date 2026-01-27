import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { AuthUser, UserControllerAssignment } from '../types';
import { ProfileMenu } from './ProfileMenu';

interface SettingsProps {
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

export function Settings({ user, onUserUpdated, onLogout }: SettingsProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [profileStatus, setProfileStatus] = useState('');
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [assignments, setAssignments] = useState<UserControllerAssignment[]>([]);
  const [assignmentsError, setAssignmentsError] = useState('');
  const [labelEdits, setLabelEdits] = useState<Record<number, string>>({});
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  const [deleteError, setDeleteError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setUsername(user.username);
    setEmail(user.email);
  }, [user]);

  useEffect(() => {
    const loadAssignments = async () => {
      setIsLoadingAssignments(true);
      try {
        const data = await api.getUserControllers(user.id);
        setAssignments(data);
        const initialLabels: Record<number, string> = {};
        data.forEach((assignment) => {
          initialLabels[assignment.controller_id] =
            assignment.assignment_label || assignment.controller_label || '';
        });
        setLabelEdits(initialLabels);
      } catch (error) {
        const message = getErrorMessage(error, 'Failed to load devices.');
        setAssignmentsError(message);
      } finally {
        setIsLoadingAssignments(false);
      }
    };
    loadAssignments();
  }, [user.id]);

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError('');
    setProfileStatus('');
    try {
      const updated = await api.updateMe({ username, email });
      onUserUpdated(updated);
      setProfileStatus('Profile updated.');
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update profile.');
      setProfileError(message);
    }
  };

  const handlePasswordSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordStatus('');
    if (!currentPassword || !newPassword) {
      setPasswordError('Enter your current and new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    try {
      await api.updatePassword({ currentPassword, newPassword });
      setPasswordStatus('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update password.');
      setPasswordError(message);
    }
  };

  const handleLabelSave = async (controllerId: number) => {
    setAssignmentsError('');
    try {
      await api.updateUserControllerLabel(user.id, controllerId, labelEdits[controllerId]);
      const data = await api.getUserControllers(user.id);
      setAssignments(data);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update label.');
      setAssignmentsError(message);
    }
  };

  const handleRemove = async (controllerId: number) => {
    setAssignmentsError('');
    try {
      await api.removeUserController(user.id, controllerId);
      const data = await api.getUserControllers(user.id);
      setAssignments(data);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to remove device.');
      setAssignmentsError(message);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    try {
      await api.deleteMe();
      onLogout();
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete account.');
      setDeleteError(message);
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-lg shadow-cyan-500/10">
                <img src="/IotMonitoring.png" alt="IoT Monitoring" className="w-12 h-12 object-contain" />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">Settings</h1>
            </div>
            <p className="text-gray-400 text-sm">Manage your profile, devices, and security.</p>
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
              {user.is_admin === 1 && (
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
              )}
            </nav>
            <ProfileMenu
              user={user}
              onLogout={onLogout}
              onSettings={() => navigate('/settings')}
            />
          </div>
        </header>

        <section className="bg-slate-800/40 rounded-xl border border-slate-700/40 overflow-hidden">
          <div className="p-4 border-b border-slate-700/40">
            <h3 className="text-lg font-semibold text-gray-200">Profile</h3>
            <p className="text-sm text-gray-400 mt-1">Update your account details.</p>
          </div>
          <form className="p-4 space-y-4" onSubmit={handleProfileSave}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm text-gray-300">Username</label>
                <input
                  className="input mt-2"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Email</label>
                <input
                  className="input mt-2"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn btn-primary" type="submit">
                Save changes
              </button>
              {profileStatus && <span className="text-sm text-emerald-300">{profileStatus}</span>}
              {profileError && <span className="text-sm text-red-300">{profileError}</span>}
            </div>
          </form>
        </section>

        <section className="bg-slate-800/40 rounded-xl border border-slate-700/40 overflow-hidden">
          <div className="p-4 border-b border-slate-700/40">
            <h3 className="text-lg font-semibold text-gray-200">Devices</h3>
            <p className="text-sm text-gray-400 mt-1">Manage your assigned controllers.</p>
          </div>
          <div className="p-4">
            {assignmentsError && (
              <div className="text-sm text-red-300 mb-4">{assignmentsError}</div>
            )}
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Label</th>
                    <th>Assigned</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingAssignments ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : assignments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        No devices assigned
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assignment) => (
                      <tr key={assignment.controller_id}>
                        <td>{assignment.device_id}</td>
                        <td>
                          <input
                            className="input"
                            value={labelEdits[assignment.controller_id] ?? ''}
                            onChange={(event) =>
                              setLabelEdits((prev) => ({
                                ...prev,
                                [assignment.controller_id]: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td>{new Date(assignment.created_at).toLocaleString()}</td>
                        <td className="text-right space-x-2">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleLabelSave(assignment.controller_id)}
                          >
                            Save
                          </button>
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
            <h3 className="text-lg font-semibold text-gray-200">Security</h3>
            <p className="text-sm text-gray-400 mt-1">Change your password or delete your account.</p>
          </div>
          <div className="p-4 space-y-8">
            <form className="space-y-4" onSubmit={handlePasswordSave}>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm text-gray-300">Current password</label>
                  <input
                    type="password"
                    className="input mt-2"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">New password</label>
                  <input
                    type="password"
                    className="input mt-2"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Confirm new password</label>
                  <input
                    type="password"
                    className="input mt-2"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="btn btn-primary" type="submit">
                  Update password
                </button>
                {passwordStatus && <span className="text-sm text-emerald-300">{passwordStatus}</span>}
                {passwordError && <span className="text-sm text-red-300">{passwordError}</span>}
              </div>
            </form>

            <div className="border-t border-slate-700/40 pt-6">
              <h4 className="text-sm font-semibold text-gray-200">Delete account</h4>
              <p className="text-sm text-gray-400 mt-1">
                This removes your account and assigned devices.
              </p>
              <div className="mt-4 flex flex-col md:flex-row gap-3">
                <button
                  type="button"
                  className="btn btn-ghost text-red-300"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete account
                </button>
              </div>
              {deleteError && <div className="text-sm text-red-300 mt-3">{deleteError}</div>}
            </div>
          </div>
        </section>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6">
            <h3 className="text-lg font-semibold text-white">Delete account?</h3>
            <p className="text-sm text-gray-400 mt-2">
              This will remove your account and all assigned devices. This action cannot be undone.
            </p>
            {deleteError && <div className="text-sm text-red-300 mt-3">{deleteError}</div>}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError('');
                }}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-ghost text-red-300" onClick={handleDeleteAccount}>
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
