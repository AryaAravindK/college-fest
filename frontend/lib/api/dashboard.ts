import apiClient from './client';
import { DashboardStats } from '@/types';

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/dashboards/stats');
    return response.data;
  },

  getAdminStats: async (): Promise<any> => {
    const response = await apiClient.get('/dashboards/admin');
    return response.data;
  },

  getOrganizerStats: async (): Promise<any> => {
    const response = await apiClient.get('/dashboards/organizer');
    return response.data;
  },

  getStudentStats: async (): Promise<any> => {
    const response = await apiClient.get('/dashboards/student');
    return response.data;
  },
};
