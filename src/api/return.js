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
