// export async function getResults(slug: string) {
//   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${slug}/results`);
//   if (!res.ok) throw new Error('Failed to fetch results');
//   return res.json();
// }

// export async function addResult(slug: string, result: any) {
//   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${slug}/results`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(result),
//     credentials: 'include',
//   });
//   if (!res.ok) throw new Error('Failed to add result');
//   return res.json();
// }

// export async function deleteResult(slug: string, resultId: string) {
//   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${slug}/results/${resultId}`, {
//     method: 'DELETE',
//     credentials: 'include',
//   });
//   if (!res.ok) throw new Error('Failed to delete result');
// }
import apiClient from './client';
export interface Result {
  _id?: string;
  event: string;
  student: {
    _id?: string;
    firstName: string;
    lastName: string;
  };
  rank: number;
  score: number;
  award?: string;
}

export const resultsApi = {
  // Create result
  create: async (data: Result): Promise<Result> => {
    const response = await apiClient.post('/results', data);
    return response.data;
  },

  // Get results by event
  getByEvent: async (eventId: string): Promise<Result[]> => {
    const response = await apiClient.get(`/results?event=${eventId}`);
    return response.data;
  },

  // Get result by ID
  getById: async (id: string): Promise<Result> => {
    const response = await apiClient.get(`/results/${id}`);
    return response.data;
  },

  // Update result
  update: async (id: string, data: Partial<Result>): Promise<Result> => {
    const response = await apiClient.put(`/results/${id}`, data);
    return response.data;
  },

  // Delete result
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/results/${id}`);
  },

  // Get leaderboard
  getLeaderboard: async (eventId: string, limit: number = 10): Promise<Result[]> => {
    const response = await apiClient.get(`/results/leaderboard?event=${eventId}&limit=${limit}`);
    return response.data;
  },
};