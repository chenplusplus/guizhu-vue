// src/api/statement.js —— 往来单位对账单
import api from './index';

// 汇总列表：一行一个往来单位
export const getStatementSummary = (params) => api.get('/statement/summary', { params });

// 某单位的对账流水（含期初、本期合计、滚动累计）
export const getStatementDetail = (params) => api.get('/statement/detail', { params });

// 往来单位下拉（客户取 customers，供应商取 counterparties）
export const getStatementParties = (partyType, keyword) =>
  api.get('/statement/parties', { params: { partyType, keyword } });

// 按成色下钻
export const getStatementColors = (params) => api.get('/statement/colors', { params });
