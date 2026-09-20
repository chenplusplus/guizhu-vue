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
// 标记紧急（加急，与预警 warnFlag 分离）
export const markUrgent = (id, isUrgent) => {
  return api.post(`/order/${id}/urgent`, null, { params: { isUrgent } });
};

// ===== 申请修改 / 同意修改 =====
// 客户审核通过后申请修改（进入生产/账单阶段均可）
export const applyModify = (id, reason) => {
  return api.post(`/order/${id}/apply-modify`, { reason });
};
// 客户审核员同意修改（订单退回草稿）
export const approveModify = (id) => {
  return api.post(`/order/${id}/approve-modify`);
};
// 订单操作日志（字段级改动记录）
export const getOrderLogs = (id) => {
  return api.get(`/order/${id}/logs`);
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

// ===== 撤回待审核订单 =====
export const withdrawSubmit = (id) => {
  return api.post(`/order/${id}/withdraw`);
};

export const getOrderFlowWithBill = (id) => {
  return api.get(`/order/${id}/flow-with-bill`);
};
// ===== 订单修改审批（新链路） =====

// 客户下单员：整单提交修改申请
export const applyOrderModify = (orderId, data) => {
  return api.post(`/order/${orderId}/modify/apply`, data);
};

// 客户审核员：同意/驳回（requestId 是申请ID，不是订单ID）
export const auditOrderModify = (requestId, data) => {
  return api.post(`/order/${requestId}/modify/audit`, data);
};

// 工厂操作员：确认修改生效 / 驳回
export const confirmOrderModify = (requestId, data) => {
  return api.post(`/order/${requestId}/modify/confirm`, data);
};

// 撤回修改申请
export const withdrawOrderModify = (requestId) => {
  return api.post(`/order/${requestId}/modify/withdraw`);
};

// 待我处理的修改申请列表
export const getPendingModifyList = () => {
  return api.get('/order/modify/pending');
};

// 查看某次申请改了什么
export const getOrderModifyDiff = (requestId) => {
  return api.get(`/order/${requestId}/modify/diff`);
};

// src/api/order.js
export function getBillPendingOrders(params) {
  return request({
    url: '/api/order/pending-bills',
    method: 'get',
    params
  });


}
