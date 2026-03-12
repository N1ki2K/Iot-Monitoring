import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type {
  AuthUser,
  UserListItem,
  UserControllerAssignment,
  Controller,
  UserInviteRequest,
  UserInviteResponse,
} from '../types';
import { UserInviteModal } from './UserInviteModal';
import { AdminPageHeader } from './AdminPageHeader';
import { AdminAssignmentsSection } from './admin/AdminAssignmentsSection';
import { AdminControllersSection } from './admin/AdminControllersSection';
import { AdminUsersSection } from './admin/AdminUsersSection';
import { useI18n } from '../useI18n';
import { getApiErrorMessage } from '../utils/apiErrors';
import { isUserAdmin } from '../utils/flags';

interface AdminDashboardProps {
  user?: AuthUser | null;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const isAdmin = isUserAdmin(user);
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
        const message = getApiErrorMessage(error, t('admin.loadUsersFailed'));
        setUsersError(message);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, [isAdmin, t]);

  useEffect(() => {
    const loadControllers = async () => {
      if (!isAdmin) return;
      try {
        const data = await api.getControllers();
        setControllers(data);
        const available = await api.getAvailableDevices();
        setAvailableDevices(available);
      } catch (error) {
        const message = getApiErrorMessage(error, t('admin.loadControllersFailed'));
        setControllerError(message);
        setControllers([]);
        setAvailableDevices([]);
      }
    };
    loadControllers();
  }, [isAdmin, t]);

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
        const message = getApiErrorMessage(error, t('admin.loadAssignmentsFailed'));
        setAssignError(message);
      }
    };
    loadAssignments();
  }, [selectedUserId, t]);

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
      const message = getApiErrorMessage(error, t('admin.inviteFailed'));
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
      const message = getApiErrorMessage(error, t('admin.deleteUserFailed'));
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
      const message = getApiErrorMessage(error, t('admin.assignFailed'));
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
      const message = getApiErrorMessage(error, t('settings.removeDeviceFailed'));
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
      const message = getApiErrorMessage(error, t('admin.createControllerFailed'));
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
      const message = getApiErrorMessage(error, t('admin.deleteControllerFailed'));
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
        <AdminPageHeader
          title={t('common.appName')}
          subtitle={t('admin.subtitle')}
          dashboardLabel={t('common.dashboard')}
          adminLabel={t('common.adminDashboard')}
          auditLabel={t('common.auditLogs')}
          healthLabel={t('common.systemHealth')}
          user={user}
          onLogout={onLogout}
          onSettings={() => navigate('/settings')}
        />

        <AdminUsersSection
          currentUser={user}
          users={users}
          isLoading={isLoading}
          error={usersError}
          locale={locale}
          usersTitle={t('admin.users')}
          usersHelp={t('admin.usersHelp')}
          inviteLabel={t('admin.inviteUser')}
          usernameLabel={t('common.username')}
          emailLabel={t('common.email')}
          roleLabel={t('common.role')}
          invitedLabel={t('admin.invited')}
          mustChangeLabel={t('admin.mustChange')}
          createdLabel={t('common.created')}
          loadingLabel={t('common.loading')}
          noUsersLabel={t('admin.noUsers')}
          yesLabel={t('common.yes')}
          noLabel={t('common.no')}
          userLabel={t('common.user')}
          adminLabel={t('common.admin')}
          youLabel={t('admin.you')}
          deleteLabel={t('common.delete')}
          deletingLabel={t('admin.deleting')}
          onInvite={() => {
            resetInviteState();
            setShowInviteModal(true);
          }}
          onDelete={handleDeleteUser}
          deletingUserId={isDeletingUserId}
        />

        <AdminAssignmentsSection
          users={users}
          controllers={controllers}
          assignments={assignments}
          selectedUserId={selectedUserId}
          controllerId={controllerId}
          locale={locale}
          error={assignError}
          title={t('admin.controllerAssignments')}
          help={t('admin.controllerAssignmentsHelp')}
          userLabel={t('common.user')}
          controllerLabel={t('admin.controllers')}
          assignLabel={t('admin.assign')}
          selectUserLabel={t('admin.selectUser')}
          selectControllerLabel={t('admin.selectController')}
          controllerIdLabel={t('admin.controllerId')}
          assignedLabel={t('settings.assigned')}
          codeLabel={t('admin.code')}
          selectUserForAssignmentsLabel={t('admin.selectUserForAssignments')}
          noAssignmentsLabel={t('admin.noAssignments')}
          removeLabel={t('common.remove')}
          onSelectUser={setSelectedUserId}
          onSelectController={setControllerId}
          onAssign={handleAssign}
          onRemove={handleRemove}
        />

        <AdminControllersSection
          controllers={controllers}
          availableDevices={availableDevices}
          deviceId={newDeviceId}
          label={newLabel}
          locale={locale}
          error={controllerError}
          title={t('admin.controllers')}
          help={t('admin.controllersHelp')}
          deviceIdLabel={t('admin.deviceId')}
          labelOptionalLabel={t('admin.labelOptional')}
          codeLabel={t('admin.code')}
          createdLabel={t('common.created')}
          addControllerLabel={t('admin.addController')}
          noControllersLabel={t('admin.noControllersCreated')}
          deleteLabel={t('common.delete')}
          commonLabel={t('common.label')}
          onDeviceIdChange={setNewDeviceId}
          onLabelChange={setNewLabel}
          onSubmit={handleCreateController}
          onDelete={handleDeleteController}
        />

        <UserInviteModal
          isOpen={showInviteModal}
          isSubmitting={isInviting}
          error={inviteError}
          response={inviteResponse}
          values={inviteForm}
          onChange={(next) =>
            setInviteForm((prev: UserInviteRequest) => ({ ...prev, ...next }))
          }
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
