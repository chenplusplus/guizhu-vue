// src/api/bill.js
import api from './index';
import request from '@/utils/request'; 
// ===== 获取可生成账单的订单 =====
export const getAvailableOrders = () => {
  return api.get('/bill/available-orders');
};

// ===== 生成账单 =====
export const createBill = (data) => {
  return api.post('/bill/create', data);
};

// ===== 获取账单列表 =====
export const getBillList = (params) => {
  return api.get('/bill/list', { params });
};

// ===== 获取账单详情 =====
export const getBillDetail = (id) => {
  return api.get(`/bill/${id}`);
};

// ===== 更新账单明细 =====
export const updateBillDetails = (data) => {
  return api.put('/bill/update-details', data);
};

// ===== 更新来料/来款 =====
export const updatePayment = (id, data) => {
  return api.put(`/bill/${id}/payment`, data);
};

// ===== 审核账单 =====
export const auditBill = (id, data) => {
  return api.post(`/bill/${id}/audit`, data);
};

// ===== 确认账单 =====
export const confirmBill = (id) => {
  return api.post(`/bill/${id}/confirm`);
};

export const saveBillData = (data) => {
  return request.put('/bill/update-details', data);
};
export const submitBillAudit = (id) => {
  return request.post(`/bill/${id}/submit-audit`);
};
// ===== 退回账单 =====
export const returnBill = (id, data) => {
  return api.post(`/bill/${id}/return`, data);
};

// ===== 获取退货记录 =====
export const getReturns = (params) => {
  return api.get('/bill/returns', { params });
};

export const generateLr = (id) => {
  return api.post(`/bill/${id}/generate-lr`);
};


// ⭐ 退回单个明细（编辑页用）
export const returnBillItem = (data) => {
  return api.post('/bill/return-item', data);
};

// 导出账单Excel
export const exportBill = (id) => {
  return api.get(`/bill/export/${id}`, { responseType: 'blob' });
};

// src/api/bill.js
export function getBillStats(params) {
  return request({
    url: '/api/bill/stats',
    method: 'get',
    params
  });
}