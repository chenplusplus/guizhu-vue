import request from '@/utils/request'

export const customerApi = {
  list: (params) => request.get('/api/customer/list', { params }),
  get: (id) => request.get(`/api/customer/${id}`),
  create: (data) => request.post('/api/customer', data),
  update: (data) => request.put('/api/customer', data),
  delete: (id) => request.delete(`/api/customer/${id}`),
  toggle: (id, isActive) => request.patch(`/api/customer/${id}/toggle`, null, { params: { isActive } })
}