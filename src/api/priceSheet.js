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
// 人工补反写：该金价单日期的「金价为空」订单补上当天价（已有价的不动）
export const backfillPriceSheet = (id) => api.post(`/price-sheet/${id}/backfill`);
// 历史金价库（只读，四个角色都能看）：已生效金价 + 逐日走势 + 区间统计
export const getPriceHistory = (params) => api.get('/price-sheet/history', { params });
