// src/api/revenue.js —— 收入结构统计（工费 / 镶石 / 钻石）
import api from './index';

// 区间汇总：加工收入（工费+版费+杂费）、镶石收入、钻石卖出 + 三项对比
export const getRevenueSummary = (params) => api.get('/revenue/summary', { params });

// 月度趋势（默认最近 12 个月）
export const getRevenueMonthly = (months = 12) => api.get('/revenue/monthly', { params: { months } });

// 明细 / 分组：groupBy = detail | customer | salesman | month
export const getRevenueDetail = (params) => api.get('/revenue/detail', { params });
