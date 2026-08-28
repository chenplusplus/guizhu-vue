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
