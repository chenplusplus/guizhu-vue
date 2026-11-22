// src/api/customerReceipt.js
// 账单收款 —— 客户来款台账
import api from './index';

// 列表（status: all/pending/approved/rejected；direction: all/in/out）
export const getReceiptInList = (params) => api.get('/customer-receipt/list', { params });
// 客户台账（来款 / 已抵扣 / 余额 / 账单应收 / 未收）
export const getReceiptInLedger = (params) => api.get('/customer-receipt/ledger', { params });
// 单客户可用余额
export const getReceiptInBalance = (customerId) =>
  api.get('/customer-receipt/balance', { params: { customerId } });
// 全部客户可用余额（账单收款页一次性取）
export const getReceiptInBalances = () => api.get('/customer-receipt/balances');
// 下拉选项：客户 + 收款账号
export const getReceiptInOptions = () => api.get('/customer-receipt/options');
// 详情
export const getReceiptInDetail = (id) => api.get(`/customer-receipt/${id}`);
// 新增（提交审核）
export const createReceiptIn = (data) => api.post('/customer-receipt', data);
// 修改（驳回后改完重新提交）
export const updateReceiptIn = (id, data) => api.put(`/customer-receipt/${id}`, data);
// 审核
export const auditReceiptIn = (id, data) => api.post(`/customer-receipt/${id}/audit`, data);
// 删除
export const deleteReceiptIn = (id) => api.delete(`/customer-receipt/${id}`);
// 某账单的抵扣明细
export const getReceiptInOffsetsByBill = (billId) =>
  api.get('/customer-receipt/offsets/by-bill', { params: { billId } });
// 某客户被账单抵扣的明细（客户台账穿透）
export const getReceiptInOffsetsByCustomer = (customerId) =>
  api.get('/customer-receipt/offsets/by-customer', { params: { customerId } });
