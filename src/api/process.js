// src/api/process.js 师傅表（工序管理）API
import api from './index';

// ===== 下拉选项 =====
export const getProcessOptions = () => api.get('/process/options');
export const getMaterials = () => api.get('/process/materials');
export const getProcesses = () => api.get('/process/processes');

// ===== CRUD =====
export const createProcessReceipt = (data) => api.post('/process/create', data);
export const updateProcessReceipt = (data) => api.put('/process/update', data);
export const deleteProcessReceipt = (id) => api.delete(`/process/delete/${id}`);
export const getProcessDetail = (id) => api.get(`/process/detail/${id}`);
export const getProcessList = (params) => api.get('/process/list', { params });

// ===== 流程 =====
export const submitProcessReceipt = (id) => api.post(`/process/submit/${id}`);
export const auditProcessReceipt = (data) => api.post('/process/audit', data);

// ===== 统计 =====
export const getProcessStats = (params) => api.get('/process/stats', { params });
export const getGlobalStats = (params) => api.get('/process/stats/global', { params });
