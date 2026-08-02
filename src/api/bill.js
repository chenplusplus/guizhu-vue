// src/api/bill.js
import api from './index';

export const getAvailableOrders = () => {
  return api.get('/bill/available-orders');
};

export const createBill = (data) => {
  return api.post('/bill/create', data);
};

export const getBillDetail = (id) => {
  return api.get(`/bill/${id}`);
};

export const getBillList = (params) => {
  return api.get('/bill/list', { params });
};

export const saveBillData = (data) => {
  return api.put('/bill/save-data', data);
};

export const submitBillAudit = (id) => {
  return api.post(`/bill/${id}/submit`);
};

export const auditBill = (id, data) => {
  return api.post(`/bill/${id}/audit`, data);
};

export const confirmBill = (id) => {
  return api.post(`/bill/${id}/confirm`);
};

export const rejectBill = (id, data) => {
  return api.post(`/bill/${id}/reject`, data);
};

export const generateLr = (id) => {
  return api.post(`/bill/${id}/generate-lr`);
};

export const getLrData = (id) => {
  return api.get(`/bill/${id}/lr`);
};