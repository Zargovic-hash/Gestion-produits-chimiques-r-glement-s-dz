import api from './axios';

export const getUtilisations = (params) => api.get('/utilisations', { params }).then((r) => r.data);
export const createUtilisation = (payload) => api.post('/utilisations', payload).then((r) => r.data);
export const updateUtilisation = (id, payload) => api.put(`/utilisations/${id}`, payload).then((r) => r.data);
export const deleteUtilisation = (id) => api.delete(`/utilisations/${id}`).then((r) => r.data);
