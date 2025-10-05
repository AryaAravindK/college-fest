import apiClient from './client';
import { Registration, PaginatedResponse } from '@/types';

export interface CreateRegistrationData {
  event: string;
  team?: string;
}

export const registrationsApi = {
  createRegistration: async (data: CreateRegistrationData): Promise<Registration> => {
    const response = await apiClient.post('/registrations', data);
    return response.data;
  },

  getRegistration: async (id: string): Promise<Registration> => {
    const response = await apiClient.get(`/registrations/${id}`);
    return response.data;
  },

  updateRegistration: async (id: string, data: Partial<Registration>): Promise<Registration> => {
    const response = await apiClient.put(`/registrations/${id}`, data);
    return response.data;
  },

  deleteRegistration: async (id: string): Promise<void> => {
    await apiClient.delete(`/registrations/${id}`);
  },

  cancelRegistration: async (id: string): Promise<Registration> => {
    const response = await apiClient.post(`/registrations/${id}/cancel`);
    return response.data;
  },

  confirmPayment: async (id: string): Promise<Registration> => {
    const response = await apiClient.post(`/registrations/${id}/payment/confirm`);
    return response.data;
  },

  failPayment: async (id: string): Promise<Registration> => {
    const response = await apiClient.post(`/registrations/${id}/payment/fail`);
    return response.data;
  },

  refundPayment: async (id: string): Promise<Registration> => {
    const response = await apiClient.post(`/registrations/${id}/payment/refund`);
    return response.data;
  },

  listRegistrationsForEvent: async (eventId: string, params?: any): Promise<PaginatedResponse<Registration>> => {
    const response = await apiClient.get(`/registrations/event/${eventId}`, { params });
    return response.data;
  },

  listRegistrationsForStudent: async (studentId: string, params?: any): Promise<PaginatedResponse<Registration>> => {
    const response = await apiClient.get(`/registrations/student/${studentId}`, { params });
    return response.data;
  },
};
