import api from './axios';

export const getAutorisations = (params) =>
  api.get('/autorisations', { params }).then((r) => r.data);
export const getAutorisationById = (id) =>
  api.get(`/autorisations/${id}`).then((r) => r.data);
export const createAutorisation = (payload) =>
  api.post('/autorisations', payload).then((r) => r.data);
export const updateAutorisation = (id, payload) =>
  api.put(`/autorisations/${id}`, payload).then((r) => r.data);
export const deleteAutorisation = (id) =>
  api.delete(`/autorisations/${id}`).then((r) => r.data);
