import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; role: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  deleteUser: (id: number) => api.delete(`/auth/users/${id}`),
};

// Venue
export const venueApi = {
  list: () => api.get('/venues'),
  get: (id: number) => api.get(`/venues/${id}`),
  create: (data: any) => api.post('/venues', data),
  update: (id: number, data: any) => api.put(`/venues/${id}`, data),
  delete: (id: number) => api.delete(`/venues/${id}`),
  addFloor: (venueId: number, data: any) => api.post(`/venues/${venueId}/floors`, data),
  addSection: (venueId: number, floorId: number, data: any) =>
    api.post(`/venues/${venueId}/floors/${floorId}/sections`, data),
  addSeats: (venueId: number, sectionId: number, data: any) =>
    api.post(`/venues/${venueId}/sections/${sectionId}/seats`, data),
};

// Show
export const showApi = {
  list: () => api.get('/shows'),
  get: (id: number) => api.get(`/shows/${id}`),
  create: (data: any) => api.post('/shows', data),
  update: (id: number, data: any) => api.put(`/shows/${id}`, data),
  delete: (id: number) => api.delete(`/shows/${id}`),
  addCategory: (showId: number, data: any) => api.post(`/shows/${showId}/categories`, data),
  updateCategory: (showId: number, catId: number, data: any) =>
    api.put(`/shows/${showId}/categories/${catId}`, data),
  deleteCategory: (showId: number, catId: number) =>
    api.delete(`/shows/${showId}/categories/${catId}`),
  initializeTickets: (showId: number, seatCategories?: Record<number, number>) =>
    api.post(`/shows/${showId}/initialize-tickets`, { seatCategories }),
};

// Ticket
export const ticketApi = {
  getByShow: (showId: number) => api.get(`/tickets/show/${showId}`),
  barcodeImage: (id: number) => api.get(`/tickets/${id}/barcode`, { responseType: 'blob' }),
  reserve: (id: number, data: any) => api.put(`/tickets/${id}/reserve`, data),
  sell: (id: number, data: any) => api.put(`/tickets/${id}/sell`, data),
  release: (id: number) => api.put(`/tickets/${id}/release`),
  cancel: (id: number) => api.put(`/tickets/${id}/cancel`),
  reset: (id: number) => api.put(`/tickets/${id}/reset`),
  bulkReserve: (data: any) => api.put('/tickets/bulk-reserve', data),
  bulkSell: (data: any) => api.put('/tickets/bulk-sell', data),
  checkin: (barcode: string) => api.post('/tickets/checkin', { barcode }),
  changeCategory: (id: number, categoryId: number) =>
    api.put(`/tickets/${id}/category`, { categoryId }),
};

// Report
export const reportApi = {
  summary: (showId: number) => api.get(`/reports/shows/${showId}/summary`),
  audience: (showId: number) => api.get(`/reports/shows/${showId}/audience`),
  attendance: (showId: number) => api.get(`/reports/shows/${showId}/attendance`),
};

export default api;
