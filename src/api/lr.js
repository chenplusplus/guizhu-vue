// src/api/lr.js
import api from './index';

// 获取LR表列表
export const getLrList = (params) => {
  return api.get('/lr/list', { params });
};

// 获取可生成LR表的账单列表
export const getAvailableBillsForLr = () => {
  return api.get('/lr/available-bills');
};

// 获取LR表数据
export const getLrTable = (billId) => {
  return api.get(`/lr/${billId}`);
};

// 生成LR表
export const generateLr = (data) => {
  return api.post('/lr/generate', data);
};

// 保存LR表
export const saveLr = (data) => {
  return api.post('/lr/save', data);
};

// 删除LR表
export const deleteLr = (id) => {
  return api.delete(`/lr/${id}`);
};

// 导出LR表
export const exportLr = (lrId) => {
  return api.get(`/lr/export/${lrId}`);
};