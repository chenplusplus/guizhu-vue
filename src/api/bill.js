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

// ===== 自动生成账单（制作完成审核通过后触发）=====
export const autoCreateBill = (orderId, remark) => {
  return api.post('/bill/auto-create', null, { params: { orderId, remark } });
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

export const getCustomerList = (params) => {
  return api.get('/customer/list', { params });
};
// ===== 确认账单 =====
export const confirmBill = (id) => {
  return api.post(`/bill/${id}/confirm`);
};

export const saveBillData = (data) => {
  return api.put('/bill/update-details', data);
};
export const submitBillAudit = (id) => {
  return api.post(`/bill/${id}/submit-audit`);
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


// ===== 导出账单Excel =====
export const exportBill = (id) => {
  return request({
    url: `/api/bill/export/${id}`,
    method: 'get',
    responseType: 'blob',
    timeout: 60000,
  });
};

// ⭐ 审批退回（工厂审核员）
export const auditReturn = (id, data) => {
  return api.post(`/bill/${id}/return-audit`, data);
};

// ⭐ 出货明细（按客户汇总）
export const getBillExportData = (params) => {
  return api.get('/bill/export-data', { params });
};

// ⭐ 树形账单汇总（客户 → 销售 → 明细）
// params: { dateType: 'today' | 'month' | 'custom', startDate?, endDate?, customerId?, salesman?, productName?, color? }
export const getBillTree = (params) => {
  return api.get('/bill/tree', { params });
};

// ⭐ 树形账单汇总筛选项（客户 / 销售 / 品名 / 成色）
export const getBillTreeOptions = (params) => {
  return api.get('/bill/tree/options', { params });
};

// ===== ⭐ 账单收款 =====
// 保存实际收款（行级 + 已收款勾选），后端自动汇总
export const saveBillReceipt = (id, data) => {
  return api.post(`/bill/${id}/receipt/save`, data);
};
// 提交收款审核
export const submitBillReceipt = (id) => {
  return api.post(`/bill/${id}/receipt/submit`);
};
// 收款审核（approved: true 通过 / false 驳回）
export const auditBillReceipt = (id, data) => {
  return api.post(`/bill/${id}/receipt/audit`, data);
};
// 收款列表（status: none|pending|approved|rejected|all）
export const getBillReceiptList = (params) => {
  return api.get('/bill/receipt/list', { params });
};