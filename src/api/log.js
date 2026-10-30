// src/api/log.js
import api from './index';

export const getOperationLogs = (params) => {
  return api.get('/log/list', { params });
};
// 筛选下拉（表单 / 操作）
export const getOperationLogOptions = () => api.get('/log/options');
