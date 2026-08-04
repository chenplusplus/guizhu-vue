// src/api/bill.js
import api from './index';

// 获取可生成账单的订单
export const getAvailableOrders = () => {
  return api.get('/bill/available-orders');
};

// 生成账单
export const createBill = (data) => {
  return api.post('/bill/create', data);
};

// 获取账单列表
export const getBillList = (params) => {
  return api.get('/bill/list', { params });
};

// 获取账单详情
export const getBillDetail = (id) => {
  return api.get(`/bill/${id}`);
};

// 更新账单明细
export const updateBillDetails = (data) => {
  return api.put('/bill/update-details', data);
};

// 审核账单
export const auditBill = (id, data) => {
  return api.post(`/bill/${id}/audit`, data);
};

// 确认账单
export const confirmBill = (id) => {
  return api.post(`/bill/${id}/confirm`);
};

// 退回账单
export const returnBill = (id, data) => {
  return api.post(`/bill/${id}/return`, data);
};

// 获取退货记录
export const getReturns = (params) => {
  return api.get('/bill/returns', { params });
};