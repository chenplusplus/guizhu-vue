// src/api/customer.js
import api from './index';

// 获取客户列表
export const getCustomerList = (params) => {
  return api.get('/customer/list', { params });
};

// 获取客户详情
export const getCustomerDetail = (id) => {
  return api.get(`/customer/${id}`);
};

// 创建客户
export const createCustomer = (data) => {
  return api.post('/customer', data);
};

// 更新客户
export const updateCustomer = (data) => {
  return api.put('/customer', data);
};

// 删除客户
export const deleteCustomer = (id) => {
  return api.delete(`/customer/${id}`);
};

// 切换客户状态
export const toggleCustomerActive = (id, isActive) => {
  return api.patch(`/customer/${id}/toggle`, null, { params: { isActive } });
};