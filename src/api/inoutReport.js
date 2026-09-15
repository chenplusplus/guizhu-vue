// src/api/inoutReport.js
import api from './index';

export const getMonthlyTotal = (params) => {
  return api.get('/inout/report/monthly-total', { params });
};

export const getYearlyTrend = (params) => {
  return api.get('/inout/report/trend', { params });
};

export const getCounterpartySummary = (params) => {
  return api.get('/inout/report/counterparty-summary', { params });
};

export const getReconciliation = (params) => {
  return api.get('/inout/report/reconciliation', { params });
};

export const regenerateReport = (params) => {
  return api.post('/inout/report/regenerate', null, { params });
};

export const regenerateYearReport = (params) => {
  return api.post('/inout/report/regenerate-year', null, { params });
};


// ===================== 进销存报表（新模块） =====================
// 总入总出汇总（按物料）
export const getSummaryByMaterial = (params) => {
  return api.get('/inout-report/summary-by-material', { params });
};
// 库存核算（期初 + 本期入 - 本期出 = 期末）
export const getInventory = (params) => {
  return api.get('/inout-report/inventory', { params });
};
// 对账报表（金额 - 付款 = 余额）
export const getEntryReconciliation = (params) => {
  return api.get('/inout-report/reconciliation', { params });
};
// 往来单位汇总
export const getSummaryByCounterparty = (params) => {
  return api.get('/inout-report/summary-by-counterparty', { params });
};
