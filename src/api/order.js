// src/api/order.js
import api from './index';

// ===== 创建订单 =====
export const createOrder = (data) => {
  return api.post('/order', data);
};

// ===== 获取订单列表 =====
export const getOrderList = (params) => {
  return api.get('/order/list', { params });
};

// ===== 获取待审核列表 =====
export const getPendingOrders = () => {
  return api.get('/order/pending');
};

// ===== 获取制作列表 =====
export const getProductionList = (status) => {
  return api.get('/order/production/list', { params: { status } });
};

// ===== 获取订单详情 =====
export const getOrderDetail = (id) => {
  return api.get(`/order/${id}`);
};

// ===== 更新订单 =====
export const updateOrder = (data) => {
  return api.put('/order', data);
};

// ===== 删除订单 =====
export const deleteOrder = (id) => {
  return api.delete(`/order/${id}`);
};

// ===== 审核订单 =====
export const auditOrder = (id, data) => {
  return api.post(`/order/${id}/audit`, data);
};

// ===== ⭐ 工厂接单（新增） =====
export const acceptOrder = (id) => {
  return api.post(`/order/${id}/accept`);
};

// ===== 提交到工厂（兼容旧接口，调用 acceptOrder） =====
export const submitToFactory = (id) => {
  return api.post(`/order/${id}/submit-factory`);
};

// ===== 更新制作状态 =====
export const updateProduction = (id, data) => {
  return api.post(`/order/${id}/production`, data);
};

// ===== 生成账单 =====
export const generateBill = (id) => {
  return api.post(`/order/${id}/generate-bill`);
};

// ===== 审核账单 =====
export const auditBill = (id, data) => {
  return api.post(`/order/${id}/audit-bill`, data);
};

// ===== 客户确认账单 =====
export const confirmBill = (id) => {
  return api.post(`/order/${id}/confirm-bill`);
};

// ===== 客户退回账单 =====
export const rejectBill = (id, data) => {
  return api.post(`/order/${id}/reject`, data);
};

// ===== 取消订单 =====
export const cancelOrder = (id, remark) => {
  return api.post(`/order/${id}/cancel`, { remark });
};

// ===== 标记紧急 =====
export const markUrgent = (id, isUrgent) => {
  return api.post(`/order/${id}/urgent`, null, { params: { isUrgent } });
};

// ===== 统计 =====
export const getPendingCount = (auditType) => {
  return api.get('/order/stats/pending-count', { params: { auditType } });
};

export const getStatusCount = (customerId) => {
  return api.get('/order/stats/status-count', { params: { customerId } });
};

export const submitOrder = (id) => {
  return  api.post(`/order/${id}/submit`);
}; 

export const getOrderFlowWithBill = (id) => {
  return api.get(`/order/${id}/flow-with-bill`);
};
// src/api/order.js
export function getBillPendingOrders(params) {
  return request({
    url: '/api/order/pending-bills',
    method: 'get',
    params
  });


}
