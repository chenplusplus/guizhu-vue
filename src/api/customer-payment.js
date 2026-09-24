// src/api/customer-payment.js
import api from './index';

// 客户月度账单明细（含账单+收款两条线）
export const getCustomerMonthlyDetail = (customerId, yearMonth) => {
  return api.get('/customer-payment/monthly-detail', { params: { customerId, yearMonth } });
};

// 收款记录列表
export const getCustomerPaymentList = (params) => {
  return api.get('/customer-payment/list', { params });
};

// 新增收款/收料
export const createCustomerPayment = (data) => {
  return api.post('/customer-payment', data);
};

// 修改收款/收料
export const updateCustomerPayment = (id, data) => {
  return api.put(`/customer-payment/${id}`, data);
};

// 删除收款/收料（软删）
export const deleteCustomerPayment = (id) => {
  return api.delete(`/customer-payment/${id}`);
};

// 客户月度账单汇总
export const getCustomerMonthlySummary = (yearMonth) => {
  return api.get('/customer-payment/monthly', { params: { yearMonth } });
};
