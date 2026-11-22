// src/api/priceSheet.js
// 每日金价库
import api from './index';

export const getPriceSheetToday = (date) => api.get('/price-sheet/today', { params: { date } });
export const getEffectivePrice = (date) => api.get('/price-sheet/effective', { params: { date } });
export const getPriceSheetList = (params) => api.get('/price-sheet/list', { params });
export const getPriceSheetDetail = (id) => api.get(`/price-sheet/${id}`);
export const savePriceSheet = (data) => api.post('/price-sheet/save', data);
export const submitPriceSheet = (id) => api.post(`/price-sheet/${id}/submit`);
export const auditPriceSheet = (id, data) => api.post(`/price-sheet/${id}/audit`, data);
// ⭐ 待审金价（一天一行）：工厂审核员拿 pendingFactory，客户审核员拿 pendingCustomer
export const getPendingPriceAudit = () => api.get('/price-sheet/pending-audit');
// ⭐ 批量审核：ids 是金价单 id（一天一行时就是该天最新版）
export const auditPriceSheetBatch = (data) => api.post('/price-sheet/audit-batch', data);
// 人工补反写：该金价单日期的「金价为空」订单补上当天价（已有价的不动）
export const backfillPriceSheet = (id) => api.post(`/price-sheet/${id}/backfill`);
// 历史金价库（只读，四个角色都能看）：已生效金价 + 逐日走势 + 区间统计
export const getPriceHistory = (params) => api.get('/price-sheet/history', { params });
