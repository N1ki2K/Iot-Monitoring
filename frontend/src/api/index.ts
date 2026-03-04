import axios from 'axios';
import type {
  Reading,
  PaginatedResponse,
  AuthUser,
  UserListItem,
  UserControllerAssignment,
  Controller,
  AuditLogEntry,
  AuditLogQueryParams,
  UserInviteRequest,
  UserInviteResponse,
  UpdateUserRequest,
  HealthStats,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

const getStoredUserId = () => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('authUser');
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as AuthUser;
    return parsed.id ?? null;
  } catch {
    return null;
  }
};

client.interceptors.request.use((config) => {
  const userId = getStoredUserId();
  if (userId) {
    config.headers = config.headers ?? {};
    if (!config.headers['x-user-id']) {
      config.headers['x-user-id'] = userId;
    }
  }
  config.headers = config.headers ?? {};
  if (!config.headers['x-client']) {
    config.headers['x-client'] = 'web';
  }
  return config;
});

export const api = {
  // Get all devices
  getDevices: async (): Promise<string[]> => {
    const { data } = await client.get<string[]>('/devices');
    return data;
  },

  // Get latest reading for a device
  getLatest: async (deviceId: string): Promise<Reading | null> => {
    const { data } = await client.get<Reading>(`/latest/${deviceId}`);
    return data;
  },

  // Get historical readings
  getHistory: async (deviceId: string, hours: number = 24): Promise<Reading[]> => {
    const { data } = await client.get<Reading[]>(`/history/${deviceId}`, {
      params: { hours },
    });
    return data;
  },

  // Get paginated readings with search and sort
  getReadings: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    device?: string;
  }): Promise<PaginatedResponse<Reading>> => {
    const { data } = await client.get<PaginatedResponse<Reading>>('/readings', {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        search: params.search || '',
        sortBy: params.sortBy || 'ts',
        sortOrder: params.sortOrder || 'DESC',
        device: params.device || '',
      },
    });
    return data;
  },

  register: async (payload: {
    username: string;
    email: string;
    password: string;
  }): Promise<AuthUser> => {
    const { data } = await client.post<AuthUser>('/auth/register', payload);
    return data;
  },

  login: async (payload: { email: string; password: string }): Promise<AuthUser> => {
    const { data } = await client.post<AuthUser>('/auth/login', payload);
    return data;
  },

  getUsers: async (): Promise<UserListItem[]> => {
    const { data } = await client.get<UserListItem[]>('/users');
    return data;
  },

  inviteUser: async (payload: UserInviteRequest): Promise<UserInviteResponse> => {
    const { data } = await client.post<UserInviteResponse>('/admin/users/invite', payload);
    return data;
  },

  getUser: async (userId: number): Promise<AuthUser> => {
    const { data } = await client.get<AuthUser>(`/users/${userId}`);
    return data;
  },

  updateUser: async (userId: number, payload: UpdateUserRequest): Promise<AuthUser> => {
    const { data } = await client.patch<AuthUser>(`/users/${userId}`, payload);
    return data;
  },

  deleteUser: async (userId: number) => {
    await client.delete(`/users/${userId}`);
  },

  getUserControllers: async (userId: number): Promise<UserControllerAssignment[]> => {
    const { data } = await client.get<UserControllerAssignment[]>(`/users/${userId}/controllers`, {
      headers: {
        'x-user-id': userId,
      },
    });
    return data;
  },

  assignUserController: async (userId: number, controllerId: number) => {
    const { data } = await client.post<UserControllerAssignment | null>(
      `/users/${userId}/controllers`,
      { controllerId }
    );
    return data;
  },

  removeUserController: async (userId: number, controllerId: number) => {
    await client.delete(`/users/${userId}/controllers`, {
      data: { controllerId },
    });
  },

  updateUserControllerLabel: async (userId: number, controllerId: number, label?: string) => {
    const { data } = await client.patch(`/users/${userId}/controllers/${controllerId}`, {
      label,
    });
    return data;
  },

  getControllers: async (): Promise<Controller[]> => {
    const { data } = await client.get<Controller[]>('/controllers');
    return data;
  },

  getAvailableDevices: async (): Promise<string[]> => {
    const { data } = await client.get<string[]>('/controllers/available-devices');
    return data;
  },

  getAuditLogs: async (
    params: AuditLogQueryParams
  ): Promise<PaginatedResponse<AuditLogEntry>> => {
    const { data } = await client.get<PaginatedResponse<AuditLogEntry>>('/audit', {
      params: {
        page: params.page || 1,
        limit: params.limit || 20,
        actorId: params.actorId || undefined,
        action: params.action || undefined,
        entityType: params.entityType || undefined,
        entityId: params.entityId || undefined,
      },
    });
    return data;
  },

  purgeAuditLogs: async (params: { all?: boolean; before?: string }) => {
    await client.delete('/audit', {
      params: {
        all: params.all ? 'true' : undefined,
        before: params.before,
      },
    });
  },

  getHealth: async (): Promise<HealthStats> => {
    const { data } = await client.get<HealthStats>('/admin/health');
    return data;
  },

  createController: async (payload: { deviceId: string; label?: string }) => {
    const { data } = await client.post<Controller>('/controllers', payload);
    return data;
  },

  deleteController: async (controllerId: number) => {
    await client.delete(`/controllers/${controllerId}`);
  },

  claimController: async (code: string, label?: string): Promise<Controller> => {
    const { data } = await client.post<{ controller: Controller }>('/controllers/claim', {
      code,
      label,
    });
    return data.controller;
  },

  getMe: async (): Promise<AuthUser> => {
    const { data } = await client.get<AuthUser>('/me');
    return data;
  },

  updateMe: async (payload: { username: string; email: string }): Promise<AuthUser> => {
    const { data } = await client.patch<AuthUser>('/me', payload);
    return data;
  },

  updatePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    await client.patch('/me/password', payload);
  },

  deleteMe: async () => {
    await client.delete('/me');
  },
};

export default api;
