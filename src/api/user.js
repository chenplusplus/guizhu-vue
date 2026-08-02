// src/api/user.js
import api from './index';

// 获取用户列表
export const getUserList = (params) => {
  return api.get('/user/list', { params });
};

// 获取用户详情
export const getUserDetail = (id) => {
  return api.get(`/user/${id}`);
};

// 创建用户
export const createUser = (data) => {
  return api.post('/user', data);
};

// 更新用户
export const updateUser = (data) => {
  return api.put('/user', data);
};

// 删除用户
export const deleteUser = (id) => {
  return api.delete(`/user/${id}`);
};

// 重置密码
export const resetUserPassword = (id, newPassword) => {
  return api.post(`/user/${id}/reset-password`, { newPassword });
};

// 切换用户状态
export const toggleUserActive = (id, isActive) => {
  return api.patch(`/user/${id}/toggle`, null, { params: { isActive } });
};