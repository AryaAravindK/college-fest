import apiClient from './client';
import { User, PaginatedResponse } from '@/types';

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  getUser: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  updateUserProfile: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  getUsers: async (params?: any): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  revokeUserTokens: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/users/${id}/revoke-tokens`);
    return response.data;
  },
};
