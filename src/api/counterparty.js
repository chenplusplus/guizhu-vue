// src/api/counterparty.js
import api from './index';

export const getCounterpartyList = (params) => {
  return api.get('/counterparty/list', { params });
};

export const getCounterpartyAll = (params) => {
  return api.get('/counterparty/all', { params });
};

export const getCounterpartyById = (id) => {
  return api.get(`/counterparty/${id}`);
};

export const createCounterparty = (data) => {
  return api.post('/counterparty', data);
};

export const updateCounterparty = (data) => {
  return api.put('/counterparty', data);
};

export const deleteCounterparty = (id) => {
  return api.delete(`/counterparty/${id}`);
};
