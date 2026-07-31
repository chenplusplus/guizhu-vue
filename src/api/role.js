import request from '@/utils/request'

export const roleApi = {
  // 角色 CRUD
  list: (params) => request.get('/api/role/list', { params }),
  get: (id) => request.get(`/api/role/${id}`),
  create: (data) => request.post('/api/role', data),
  update: (data) => request.put('/api/role', data),
  delete: (id) => request.delete(`/api/role/${id}`),

  // 角色-菜单
  getRoleMenus: (roleId) => request.get(`/api/role/${roleId}/menus`),
  saveRoleMenus: (data) => request.post('/api/role/menus', data),

  // 用户-角色
  getUserRoles: (userId) => request.get(`/api/role/user/${userId}`),
  saveUserRoles: (data) => request.post('/api/role/user', data)
}