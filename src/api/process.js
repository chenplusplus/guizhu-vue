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

// ===== 师傅收发统计（全局统计页）=====
export const getMasterStats = (params) => api.get('/process/stats/masters', { params });
export const getMasterRecords = (params) => api.get('/process/stats/records', { params });
export const getMasterStatsOptions = () => api.get('/process/stats/filter-options');

// ===== 师傅累计（录入页上单/本单/累计联动）=====
export const getMasterLastTotal = (params) => api.get('/process/master/last-total', { params });
