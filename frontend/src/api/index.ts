import axios from 'axios';
import type { Reading, PaginatedResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
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
};

export default api;
