import apiClient from './client';

export interface Sponsor {
  _id?: string;
  name: string;
  logo: string;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  website?: string;
  event?: string;
}

export const sponsorsApi = {
  // Create a new sponsor
  create: async (data: Sponsor): Promise<Sponsor> => {
    const response = await apiClient.post('/sponsors', data);
    return response.data;
  },

  // Get sponsors by event
  getByEvent: async (eventId: string): Promise<Sponsor[]> => {
    const response = await apiClient.get(`/sponsors?event=${eventId}`);
    return response.data;
  },

  // Get all sponsors
  getAll: async (): Promise<Sponsor[]> => {
    const response = await apiClient.get('/sponsors');
    return response.data;
  },

  // Get sponsor by ID
  getById: async (id: string): Promise<Sponsor> => {
    const response = await apiClient.get(`/sponsors/${id}`);
    return response.data;
  },

  // Update sponsor
  update: async (id: string, data: Partial<Sponsor>): Promise<Sponsor> => {
    const response = await apiClient.put(`/sponsors/${id}`, data);
    return response.data;
  },

  // Delete sponsor
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/sponsors/${id}`);
  },
};

export async function getSponsors(slug: string) {
  const res = await fetch(`/api/events/${slug}/sponsors`);
  return res.json();
}