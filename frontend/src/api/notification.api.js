import api from './axios';

export const getNotifications = () => api.get('/notifications').then((r) => r.data);
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`).then((r) => r.data);
export const markAllNotificationsRead = () => api.put('/notifications/read-all').then((r) => r.data);
