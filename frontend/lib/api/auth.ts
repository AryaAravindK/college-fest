import apiClient from './client';
import { LoginResponse, RegisterData, User } from '@/types';

export const authApi = {
  register: async (data: RegisterData): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  verifyEmail: async (token: string): Promise<any> => {
    const response = await apiClient.get(`/auth/verify-email?token=${token}`);
    return response.data;
  },

  requestPasswordReset: async (email: string): Promise<any> => {
    const response = await apiClient.post('/auth/password-reset-request', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<any> => {
    const response = await apiClient.post('/auth/password-reset', { token, password });
    return response.data;
  },

  sendOtp: async (phone: string): Promise<any> => {
    const response = await apiClient.post('/auth/phone-otp', { phone });
    return response.data;
  },

  verifyOtp: async (phone: string, otp: string): Promise<any> => {
    const response = await apiClient.post('/auth/verify-otp', { phone, otp });
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },
};
