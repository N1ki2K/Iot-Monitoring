import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosRequestConfig } from 'axios';

const { getMock, postMock, patchMock, deleteMock, createMock, getInterceptor } = vi.hoisted(() => {
  const getMock = vi.fn();
  const postMock = vi.fn();
  const patchMock = vi.fn();
  const deleteMock = vi.fn();
  let requestInterceptor: ((config: AxiosRequestConfig) => AxiosRequestConfig) | undefined;

  const createMock = vi.fn(() => ({
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: deleteMock,
    interceptors: {
      request: {
        use: (fn: (config: AxiosRequestConfig) => AxiosRequestConfig) => {
          requestInterceptor = fn;
          return 0;
        },
      },
    },
  }));

  return {
    getMock,
    postMock,
    patchMock,
    deleteMock,
    createMock,
    getInterceptor: () => requestInterceptor,
  };
});

vi.mock('axios', () => ({
  default: {
    create: createMock,
  },
}));

import { api } from './index';

const mockLocalStorage = (value: string | null) => {
  vi.spyOn(window.localStorage, 'getItem').mockReturnValue(value);
};

describe('api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('injects x-user-id header from localStorage', () => {
    mockLocalStorage(JSON.stringify({ id: 42 }));
    const config = getInterceptor()?.({ headers: {} } as AxiosRequestConfig);
    expect(config?.headers?.['x-user-id']).toBe(42);
  });

  it('injects x-client header by default', () => {
    mockLocalStorage(JSON.stringify({ id: 42 }));
    const config = getInterceptor()?.({ headers: {} } as AxiosRequestConfig);
    expect(config?.headers?.['x-client']).toBe('web');
  });

  it('does not override existing x-user-id header', () => {
    mockLocalStorage(JSON.stringify({ id: 42 }));
    const config = getInterceptor()?.({ headers: { 'x-user-id': 7 } } as AxiosRequestConfig);
    expect(config?.headers?.['x-user-id']).toBe(7);
  });

  it('handles invalid authUser JSON in localStorage', () => {
    mockLocalStorage('{bad json');
    const config = getInterceptor()?.({ headers: {} } as AxiosRequestConfig);
    expect(config?.headers?.['x-user-id']).toBeUndefined();
  });

  it('handles missing authUser in localStorage', () => {
    mockLocalStorage(null);
    const config = getInterceptor()?.({ headers: {} } as AxiosRequestConfig);
    expect(config?.headers?.['x-user-id']).toBeUndefined();
  });

  it('getDevices returns device list', async () => {
    getMock.mockResolvedValueOnce({ data: ['dev1'] });
    const data = await api.getDevices();
    expect(getMock).toHaveBeenCalledWith('/devices');
    expect(data).toEqual(['dev1']);
  });

  it('getLatest calls correct endpoint', async () => {
    getMock.mockResolvedValueOnce({ data: { id: 1 } });
    await api.getLatest('dev1');
    expect(getMock).toHaveBeenCalledWith('/latest/dev1');
  });

  it('getHistory uses default hours', async () => {
    getMock.mockResolvedValueOnce({ data: [] });
    await api.getHistory('dev1');
    expect(getMock).toHaveBeenCalledWith('/history/dev1', { params: { hours: 24 } });
  });

  it('getReadings applies defaults', async () => {
    getMock.mockResolvedValueOnce({ data: { data: [], pagination: {} } });
    await api.getReadings({});
    expect(getMock).toHaveBeenCalledWith('/readings', {
      params: {
        page: 1,
        limit: 20,
        search: '',
        sortBy: 'ts',
        sortOrder: 'DESC',
        device: '',
      },
    });
  });

  it('register sends payload', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 1 } });
    await api.register({ username: 'u', email: 'e', password: 'p' });
    expect(postMock).toHaveBeenCalledWith('/auth/register', {
      username: 'u',
      email: 'e',
      password: 'p',
    });
  });

  it('login sends payload', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 1 } });
    await api.login({ email: 'e', password: 'p' });
    expect(postMock).toHaveBeenCalledWith('/auth/login', { email: 'e', password: 'p' });
  });

  it('getUserControllers sends header', async () => {
    getMock.mockResolvedValueOnce({ data: [] });
    await api.getUserControllers(5);
    expect(getMock).toHaveBeenCalledWith('/users/5/controllers', {
      headers: { 'x-user-id': 5 },
    });
  });

  it('assignUserController posts controllerId', async () => {
    postMock.mockResolvedValueOnce({ data: { user_id: 1 } });
    await api.assignUserController(2, 3);
    expect(postMock).toHaveBeenCalledWith('/users/2/controllers', { controllerId: 3 });
  });

  it('removeUserController sends body', async () => {
    deleteMock.mockResolvedValueOnce({});
    await api.removeUserController(2, 3);
    expect(deleteMock).toHaveBeenCalledWith('/users/2/controllers', {
      data: { controllerId: 3 },
    });
  });

  it('updateUserControllerLabel patches label', async () => {
    patchMock.mockResolvedValueOnce({ data: { label: 'Kitchen' } });
    await api.updateUserControllerLabel(2, 3, 'Kitchen');
    expect(patchMock).toHaveBeenCalledWith('/users/2/controllers/3', { label: 'Kitchen' });
  });

  it('getUsers returns list', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const users = await api.getUsers();
    expect(getMock).toHaveBeenCalledWith('/users');
    expect(users).toHaveLength(1);
  });

  it('inviteUser sends payload', async () => {
    postMock.mockResolvedValueOnce({ data: { user: { id: 1 }, tempPassword: 'temp' } });
    await api.inviteUser({ username: 'new', email: 'new@example.com', role: 'user' });
    expect(postMock).toHaveBeenCalledWith('/admin/users/invite', {
      username: 'new',
      email: 'new@example.com',
      role: 'user',
    });
  });

  it('referFriend sends payload', async () => {
    postMock.mockResolvedValueOnce({ data: { user: { id: 1 }, tempPassword: 'temp' } });
    await api.referFriend({ username: 'friend', email: 'friend@example.com' });
    expect(postMock).toHaveBeenCalledWith('/users/refer', {
      username: 'friend',
      email: 'friend@example.com',
    });
  });

  it('getUser returns user', async () => {
    getMock.mockResolvedValueOnce({ data: { id: 7 } });
    const user = await api.getUser(7);
    expect(getMock).toHaveBeenCalledWith('/users/7');
    expect(user.id).toBe(7);
  });

  it('updateUser patches payload', async () => {
    patchMock.mockResolvedValueOnce({ data: { id: 7 } });
    await api.updateUser(7, { role: 'admin' });
    expect(patchMock).toHaveBeenCalledWith('/users/7', { role: 'admin' });
  });

  it('deleteUser calls delete endpoint', async () => {
    deleteMock.mockResolvedValueOnce({});
    await api.deleteUser(8);
    expect(deleteMock).toHaveBeenCalledWith('/users/8');
  });

  it('getControllers returns list', async () => {
    getMock.mockResolvedValueOnce({ data: [{ id: 1 }] });
    const controllers = await api.getControllers();
    expect(getMock).toHaveBeenCalledWith('/controllers');
    expect(controllers).toHaveLength(1);
  });

  it('getAvailableDevices returns list', async () => {
    getMock.mockResolvedValueOnce({ data: ['dev1'] });
    const devices = await api.getAvailableDevices();
    expect(getMock).toHaveBeenCalledWith('/controllers/available-devices');
    expect(devices).toEqual(['dev1']);
  });

  it('getAuditLogs sends query params', async () => {
    getMock.mockResolvedValueOnce({ data: { data: [], pagination: {} } });
    await api.getAuditLogs({ actorId: 3, action: 'user.login', entityType: 'user', entityId: '7' });
    expect(getMock).toHaveBeenCalledWith('/audit', {
      params: {
        page: 1,
        limit: 20,
        actorId: 3,
        action: 'user.login',
        entityType: 'user',
        entityId: '7',
      },
    });
  });

  it('purgeAuditLogs supports all=true', async () => {
    deleteMock.mockResolvedValueOnce({});
    await api.purgeAuditLogs({ all: true });
    expect(deleteMock).toHaveBeenCalledWith('/audit', {
      params: { all: 'true', before: undefined },
    });
  });

  it('getHealth returns stats', async () => {
    getMock.mockResolvedValueOnce({ data: { serverTime: 'now' } });
    const stats = await api.getHealth();
    expect(getMock).toHaveBeenCalledWith('/admin/health');
    expect(stats.serverTime).toBe('now');
  });

  it('createController posts payload', async () => {
    postMock.mockResolvedValueOnce({ data: { id: 1 } });
    await api.createController({ deviceId: 'dev1', label: 'Lab' });
    expect(postMock).toHaveBeenCalledWith('/controllers', { deviceId: 'dev1', label: 'Lab' });
  });

  it('deleteController calls delete endpoint', async () => {
    deleteMock.mockResolvedValueOnce({});
    await api.deleteController(9);
    expect(deleteMock).toHaveBeenCalledWith('/controllers/9');
  });

  it('claimController returns controller payload', async () => {
    postMock.mockResolvedValueOnce({ data: { controller: { id: 1 } } });
    const controller = await api.claimController('12345', 'Lab');
    expect(postMock).toHaveBeenCalledWith('/controllers/claim', { code: '12345', label: 'Lab' });
    expect(controller).toEqual({ id: 1 });
  });

  it('claimController supports QR payload', async () => {
    postMock.mockResolvedValueOnce({ data: { controller: { id: 1 } } });
    await api.claimController({ qrData: 'https://example.com/?pairingCode=12345', label: 'Lab' });
    expect(postMock).toHaveBeenCalledWith('/controllers/claim', {
      qrData: 'https://example.com/?pairingCode=12345',
      label: 'Lab',
    });
  });

  it('getMe returns current user', async () => {
    getMock.mockResolvedValueOnce({ data: { id: 1 } });
    const me = await api.getMe();
    expect(getMock).toHaveBeenCalledWith('/me');
    expect(me.id).toBe(1);
  });

  it('updateMe sends payload', async () => {
    patchMock.mockResolvedValueOnce({ data: { id: 1 } });
    await api.updateMe({ username: 'u', email: 'e' });
    expect(patchMock).toHaveBeenCalledWith('/me', { username: 'u', email: 'e' });
  });

  it('updatePassword calls password endpoint', async () => {
    patchMock.mockResolvedValueOnce({});
    await api.updatePassword({ currentPassword: 'old', newPassword: 'new' });
    expect(patchMock).toHaveBeenCalledWith('/me/password', {
      currentPassword: 'old',
      newPassword: 'new',
    });
  });

  it('deleteMe calls delete endpoint', async () => {
    deleteMock.mockResolvedValueOnce({});
    await api.deleteMe();
    expect(deleteMock).toHaveBeenCalledWith('/me');
  });
});
