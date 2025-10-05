import apiClient from './client';
import { Event, PaginatedResponse } from '@/types';

export interface EventFilters {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  status?: string;
  search?: string;
}

export const eventsApi = {
  getEvents: async (filters?: EventFilters): Promise<PaginatedResponse<Event>> => {
    const response = await apiClient.get('/events', { params: filters });
    return response.data;
  },

  getEventBySlug: async (slug: string): Promise<Event> => {
    const response = await apiClient.get(`/events/${slug}`);
    return response.data;
  },

  createEvent: async (data: Partial<Event>): Promise<Event> => {
    const response = await apiClient.post('/events', data);
    return response.data;
  },

  updateEvent: async (slug: string, data: Partial<Event>): Promise<Event> => {
    const response = await apiClient.put(`/events/${slug}`, data);
    return response.data;
  },

  deleteEvent: async (slug: string): Promise<void> => {
    await apiClient.delete(`/events/${slug}`);
  },

  changeEventStatus: async (slug: string, status: string): Promise<Event> => {
    const response = await apiClient.patch(`/events/${slug}/status`, { status });
    return response.data;
  },

  addInterested: async (slug: string): Promise<any> => {
    const response = await apiClient.post(`/events/${slug}/interested`);
    return response.data;
  },

  removeInterested: async (slug: string): Promise<any> => {
    const response = await apiClient.delete(`/events/${slug}/interested`);
    return response.data;
  },

  getSeats: async (slug: string): Promise<any> => {
    const response = await apiClient.get(`/events/${slug}/seats`);
    return response.data;
  },
};
