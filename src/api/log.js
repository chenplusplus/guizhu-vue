// src/api/log.js
import api from './index';

export const getOperationLogs = (params) => {
  return api.get('/log/list', { params });
};