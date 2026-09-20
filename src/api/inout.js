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

// ⭐ 提交审核
export const submitInout = (id) => {
  return api.post(`/inout/${id}/submit`);
};

// ⭐ 重新提交
export const resubmitInout = (id) => {
  return api.post(`/inout/${id}/resubmit`);
};

// ⭐ 获取页面所需的数据字典选项
export const getInoutOptions = () => {
  return api.get('/inout/options');
};


// ===================== 进销存录入（金/钻石/费用） =====================
// 黄金
export const getGoldLastTotal = (recordDate, counterpartyId) => {
  return api.get('/inout/gold/last-total', { params: { recordDate, counterpartyId } });
};
export const createGold = (data) => {
  return api.post('/inout/gold', data);
};
export const getGoldList = (params) => {
  return api.get('/inout/gold/list', { params });
};
// 钻石
export const getDiamondLastTotal = (recordDate, counterpartyId) => {
  return api.get('/inout/diamond/last-total', { params: { recordDate, counterpartyId } });
};
export const createDiamond = (data) => {
  return api.post('/inout/diamond', data);
};
export const getDiamondList = (params) => {
  return api.get('/inout/diamond/list', { params });
};
// 费用
export const getExpenseLastTotal = (recordDate, counterpartyId) => {
  return api.get('/inout/expense/last-total', { params: { recordDate, counterpartyId } });
};
export const createExpense = (data) => {
  return api.post('/inout/expense', data);
};
export const getExpenseList = (params) => {
  return api.get('/inout/expense/list', { params });
};

// 获取单条
export const getGoldById = (id) => request.get(`/inout/gold/${id}`)

// 更新
export const updateGold = (id, data) => request.put(`/inout/gold/${id}`, data)

// 钻石
export const getDiamondById = (id) => api.get(`/inout/diamond/${id}`)
export const updateDiamond = (id, data) => api.put(`/inout/diamond/${id}`, data)

// 资金
export const getExpenseById = (id) => api.get(`/inout/expense/${id}`)
export const updateExpense = (id, data) => api.put(`/inout/expense/${id}`, data)

// ===================== 审批（金/钻石/费用） =====================
export const submitGold = (id) => api.post(`/inout/gold/${id}/submit`);
export const auditGold = (id, approved, remark) => api.post(`/inout/gold/${id}/audit`, { approved, remark });
export const deleteGold = (id) => api.delete(`/inout/gold/${id}`);
export const deleteDiamond = (id) => api.delete(`/inout/diamond/${id}`);
export const deleteExpense = (id) => api.delete(`/inout/expense/${id}`);

export const submitDiamond = (id) => api.post(`/inout/diamond/${id}/submit`);
export const auditDiamond = (id, approved, remark) => api.post(`/inout/diamond/${id}/audit`, { approved, remark });

export const submitExpense = (id) => api.post(`/inout/expense/${id}/submit`);
export const auditExpense = (id, approved, remark) => api.post(`/inout/expense/${id}/audit`, { approved, remark });

// ===================== 盘点总表 =====================
export const getBatchReport = (batchId) => api.get(`/inventory/batch/${batchId}/report`);
export const previewMonthBatch = (data) => api.post('/inventory/batch/preview-month', data);
