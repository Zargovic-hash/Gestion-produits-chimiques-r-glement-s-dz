import api from './axios';

export const getStock = (params) => api.get('/stock', { params }).then((r) => r.data);
export const getSeuils = () => api.get('/stock/seuils').then((r) => r.data);
export const upsertSeuil = (payload) => api.post('/stock/seuils', payload).then((r) => r.data);
