// src/api/inoutReport.js
import api from './index';

export const getCounterpartySummary = (params) => {
  return api.get('/inout/report/counterparty-summary', { params });
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
// 按成色（materialType）汇总金料重量
export const getSummaryByMaterialType = (params) => {
  return api.get('/inout-report/summary-by-material-type', { params });
};
