import api from './axios';

export const getAchats = (params) => api.get('/achats', { params }).then((r) => r.data);
export const createAchat = (payload) => api.post('/achats', payload).then((r) => r.data);
export const deleteAchat = (id) => api.delete(`/achats/${id}`).then((r) => r.data);
