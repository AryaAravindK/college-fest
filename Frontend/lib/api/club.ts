import apiClient from './client';

export const get_clubs = {
  getData: async () => {
    const response = await apiClient.get('/club/clubs');
    return response.data;
  }
};


export const create_club = {
  postData: async (club: { name: string; description: string }) => {
    const response = await apiClient.post('/club/create-club', club);
    return response.data;
  },
};