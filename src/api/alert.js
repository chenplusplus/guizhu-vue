// src/api/alert.js
import api from './index';

// 获取预警列表
export const getAlertList = (params) => {
  return api.get('/alert/list', { params });
};

// 获取预警数量
export const getAlertCount = () => {
  return api.get('/alert/count');
};

// 手工预警
export const createManualAlert = (data) => {
  return api.post('/alert/manual', data);
};

// 处理预警
export const resolveAlert = (id) => {
  return api.post(`/alert/${id}/resolve`);
};