import api from './index';

// 获取退回记录列表
export const getReturns = (params) => {
  return api.get('/bill/returns', { params });
};

// 获取退回记录详情
export const getReturnDetail = (id) => {
  return api.get(`/bill/returns/${id}`);
};

// 审核退回（单条）
export const auditReturn = (id, data) => {
  return api.post(`/bill/returns/${id}/audit`, data);
};

// 按账单审核退回（工厂审核员，账单详情页用）
export const auditBillReturn = (billId, data) => {
  return api.post(`/bill/${billId}/return-audit`, data);
};

// ⭐ 逐行确认到货（工厂操作员/管理员）：货到厂后勾一下，然后去处理 → 提交审核
export const confirmReturnArrival = (id, data) => {
  return api.post(`/bill/returns/${id}/confirm-arrival`, data || {});
};

// ⭐ 退货处理：待处理退货（按账单聚合，工厂操作员）
export const getReturnTodo = (params) => {
  return api.get('/bill/returns/todo', { params });
};

// ⭐ 退货处理：只取待处理计数（工作台卡片 / 顶栏铃铛轮询）
export const getReturnTodoCount = () => {
  return api.get('/bill/returns/todo', { params: { countOnly: true } });
};

// ⭐ 工厂操作员定退回方式 + 保留损耗 + 处理备注
export const handleBillReturn = (billId, data) => {
  return api.post(`/bill/${billId}/return-handle`, data);
};

// ⭐ 退货审核：待审核退货（按账单聚合，工厂审核员）
export const getReturnAuditTodo = (params) => {
  return api.get('/bill/returns/audit-todo', { params });
};

// ⭐ 退货审核：只取待审核计数（审核工作台卡片 / 顶栏铃铛轮询）
export const getReturnAuditTodoCount = () => {
  return api.get('/bill/returns/audit-todo', { params: { countOnly: true } });
};
