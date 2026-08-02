// src/api/role.js
import api from './index';

export const roleApi = {
  // 获取角色列表
  list: (params) => {
    return api.get('/role/list', { params });
  },

  // 获取角色详情
  get: (id) => {
    return api.get(`/role/${id}`);
  },

  // 创建角色
  create: (data) => {
    return api.post('/role', data);
  },

  // 更新角色
  update: (data) => {
    return api.put('/role', data);
  },

  // 删除角色
  delete: (id) => {
    return api.delete(`/role/${id}`);
  },

  // 获取角色的菜单权限
  getRoleMenus: (roleId) => {
    return api.get(`/role/${roleId}/menus`);
  },

  // 保存角色菜单权限
  saveRoleMenus: (data) => {
    return api.post('/role/menus', data);
  }
};