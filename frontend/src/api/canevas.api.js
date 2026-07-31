import api from './axios';

export const getCanevas = () => api.get('/canevas').then((r) => r.data);
export const getCanevasById = (id) => api.get(`/canevas/${id}`).then((r) => r.data);
export const createCanevas = (payload) => api.post('/canevas', payload).then((r) => r.data);
export const duplicateCanevas = (id, nom) =>
  api.post(`/canevas/${id}/duplicate`, { nom }).then((r) => r.data);
export const deleteCanevas = (id) => api.delete(`/canevas/${id}`).then((r) => r.data);
