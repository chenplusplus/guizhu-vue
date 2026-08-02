// src/api/menu.js
import api from './index';

export const menuApi = {
  // 获取当前用户菜单
  getUserMenus: () => {
    return api.get('/menu/user-menus');
  },

  // 获取所有菜单树（管理员）
  tree: () => {
    return api.get('/menu/tree');
  },

  // 获取单个菜单
  get: (id) => {
    return api.get(`/menu/${id}`);
  },

  // 创建菜单
  create: (data) => {
    return api.post('/menu', data);
  },

  // 更新菜单
  update: (data) => {
    return api.put('/menu', data);
  },

  // 删除菜单
  delete: (id) => {
    return api.delete(`/menu/${id}`);
  },

  // 检查权限
  hasPermission: (code) => {
    return api.get('/menu/has-permission', { params: { code } });
  }
};