// src/api/monthlyProfit.js
import request from '@/utils/request';

export const getMonthlyProfit = (yearMonth) =>
  request.get(`/api/monthly-profit/${yearMonth}`);

export const initMonthlyProfit = (yearMonth) =>
  request.post(`/api/monthly-profit/${yearMonth}/init`);

export const recalcMonthlyProfit = (yearMonth) =>
  request.post(`/api/monthly-profit/${yearMonth}/recalc`);

export const saveMonthlyManual = (yearMonth, data) =>
  request.put(`/api/monthly-profit/${yearMonth}/manual`, data);

export const confirmMonthlyProfit = (yearMonth, data) =>
  request.post(`/api/monthly-profit/${yearMonth}/confirm`, data);

export const unconfirmMonthlyProfit = (yearMonth) =>
  request.post(`/api/monthly-profit/${yearMonth}/unconfirm`);

export const getMonthlyProfitList = (page = 1, pageSize = 20) =>
  request.get('/api/monthly-profit/list', { params: { page, pageSize } });