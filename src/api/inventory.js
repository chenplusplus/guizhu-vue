// src/api/inventory.js 盘点管理 API
import api from './index';

// ==================== 盘点事件 ====================

// 获取待盘点事件列表
export const getPendingEvents = (params) => api.get('/inventory/events/pending', { params });

// 创建盘点事件（Bill确认后调用 - 内部接口）
export const createEventFromBill = (billId) => api.post(`/inventory/events/from-bill/${billId}`);

// 创建盘点事件（Inout审核后调用 - 内部接口）
export const createEventFromInout = (recordId) => api.post(`/inventory/events/from-inout/${recordId}`);

// 创建盘点事件（LR确认后调用 - 内部接口）
export const createEventFromLr = (lrId) => api.post(`/inventory/events/from-lr/${lrId}`);


// ==================== 盘点批次 ====================

// 预览盘点批次
export const previewBatch = (data) => api.post('/inventory/batch/preview', data);

// 创建盘点批次
export const createBatch = (data) => api.post('/inventory/batch', data);

// 获取盘点批次列表
export const getBatchList = (params) => api.get('/inventory/batch/list', { params });

// 获取盘点批次详情
export const getBatchDetail = (batchId) => api.get(`/inventory/batch/${batchId}`);

// 录入实际盘点数据
export const updateActualSummary = (batchId, data) => api.put(`/inventory/batch/${batchId}/actual`, data);

// 编辑期初数据
export const editOpeningSummary = (batchId, data) => api.put(`/inventory/batch/${batchId}/opening`, data);

// 确认盘点
export const confirmBatch = (batchId) => api.post(`/inventory/batch/${batchId}/confirm`);

// 反确认（回退）
export const unconfirmBatch = (batchId, data) => api.post(`/inventory/batch/${batchId}/unconfirm`, data);

// 取消盘点
export const cancelBatch = (batchId, data) => api.post(`/inventory/batch/${batchId}/cancel`, data);

// 导出盘点报告
export const exportBatchReport = (batchId) => api.get(`/inventory/batch/${batchId}/report`, { responseType: 'blob' });

// 获取操作日志
export const getBatchLogs = (batchId) => api.get(`/inventory/batch/${batchId}/logs`);


// ==================== 上单 ====================

// 获取当前上单数据
export const getShangdan = () => api.get('/inventory/cumulative/current');

// 获取上单历史变化
export const getShangdanHistory = (params) => api.get('/inventory/cumulative/history', { params });