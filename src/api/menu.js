import request from '@/utils/request'

export const menuApi = {
  // 获取菜单树
  tree: () => request.get('/api/menu/tree'),

  // 菜单 CRUD
  list: () => request.get('/api/menu/list'),
  get: (id) => request.get(`/api/menu/${id}`),
  create: (data) => request.post('/api/menu', data),
  update: (data) => request.put('/api/menu', data),
  delete: (id) => request.delete(`/api/menu/${id}`),

  // 获取当前用户的菜单（动态菜单用）
  userMenus: () => request.get('/api/menu/user-menus'),

  // 权限校验
  hasPermission: (code) => request.get('/api/menu/has-permission', { params: { code } })
}