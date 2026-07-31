import request from '@/utils/request'

export const userApi = {
  list: (params) => request.get('/api/user/list', { params }),
  get: (id) => request.get(`/api/user/${id}`),
  create: (data) => request.post('/api/user', data),
  update: (data) => request.put('/api/user', data),
  delete: (id) => request.delete(`/api/user/${id}`),
  resetPassword: (id, newPassword) => request.post(`/api/user/${id}/reset-password`, newPassword),
  types: () => request.get('/api/user/types')
}