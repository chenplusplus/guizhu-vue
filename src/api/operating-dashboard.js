// src/api/operating-dashboard.js
import api from './index';

// 经营看板汇总（month: 'YYYY-MM' 或 'all'）
export const getOperatingDashboardSummary = (month) => {
  return api.get('/operating-dashboard/summary', { params: { month } });
};
