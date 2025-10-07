// export async function getAnnouncements(slug: string) {
//   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${slug}/announcements`);
//   if (!res.ok) throw new Error('Failed to fetch announcements');
//   return res.json();
// }

// export async function addAnnouncement(slug: string, announcement: any) {
//   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${slug}/announcements`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(announcement),
//     credentials: 'include',
//   });
//   if (!res.ok) throw new Error('Failed to add announcement');
//   return res.json();
// }

// export async function deleteAnnouncement(slug: string, announcementId: string) {
//   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${slug}/announcements/${announcementId}`, {
//     method: 'DELETE',
//     credentials: 'include',
//   });
//   if (!res.ok) throw new Error('Failed to delete announcement');
// }

import apiClient from './client';

export interface Announcement {
  _id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  event?: string;
  createdAt?: Date;
}

export const announcementsApi = {
  // Create announcement
  create: async (data: Announcement): Promise<Announcement> => {
    const response = await apiClient.post('/announcements', data);
    return response.data;
  },

  // Get announcements by event
  getByEvent: async (eventId: string): Promise<Announcement[]> => {
    const response = await apiClient.get(`/announcements?event=${eventId}`);
    return response.data;
  },

  // Get all announcements
  getAll: async (): Promise<Announcement[]> => {
    const response = await apiClient.get('/announcements');
    return response.data;
  },

  // Update announcement
  update: async (id: string, data: Partial<Announcement>): Promise<Announcement> => {
    const response = await apiClient.put(`/announcements/${id}`, data);
    return response.data;
  },

  // Delete announcement
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/announcements/${id}`);
  },
};