// src/api/inout.js
import api from './index';

export const getInoutList = (params) => {
  return api.get('/inout/list', { params });
};

export const getInoutDetail = (id) => {
  return api.get(`/inout/${id}`);
};

export const createInout = (data) => {
  return api.post('/inout', data);
};

export const updateInout = (data) => {
  return api.put('/inout', data);
};

export const deleteInout = (id) => {
  return api.delete(`/inout/${id}`);
};

export const auditInout = (id, data) => {
  return api.post(`/inout/${id}/audit`, data);
};

export const getInoutStats = (params) => {
  return api.get('/inout/stats', { params });
};