import api from './index';

export const getMonthlyList = () => api.get('/inventory/monthly/list');
export const getMonthlyDetail = (yearMonth) => api.get(`/inventory/monthly/${yearMonth}`);
export const initMonthly = (yearMonth) => api.post(`/inventory/monthly/${yearMonth}/init`);
export const recalcMonthly = (yearMonth) => api.post(`/inventory/monthly/${yearMonth}/recalc`);
export const saveMonthlyManual = (yearMonth, data) => api.put(`/inventory/monthly/${yearMonth}/manual`, data);
export const confirmMonthly = (yearMonth, data) => api.post(`/inventory/monthly/${yearMonth}/confirm`, data);
export const unconfirmMonthly = (yearMonth) => api.post(`/inventory/monthly/${yearMonth}/unconfirm`);
export const getCustomerShangdan = (customerId, recordDate) =>
  api.get(`/inventory/monthly/customer-shangdan/${customerId}`, { params: { recordDate } });
