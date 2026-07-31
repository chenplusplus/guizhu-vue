import request from '@/utils/request'

export const orderApi = {
  // ===== 订单 CRUD =====
  create: (data) => request.post('/api/order', data),
  list: (params) => request.get('/api/order/list', { params }),
  pending: () => request.get('/api/order/pending'),
  get: (id) => request.get(`/api/order/${id}`),
  update: (data) => request.put('/api/order', data),
  delete: (id) => request.delete(`/api/order/${id}`),

  // ===== 审核 =====
  audit: (id, data) => request.post(`/api/order/${id}/audit`, data),

  // ===== 制作管理 =====
  productionList: (params) => request.get('/api/order/production/list', { params }),
  updateProduction: (id, data) => request.post(`/api/order/${id}/production`, data),

  // ===== 其他 =====
  cancel: (id, data) => request.post(`/api/order/${id}/cancel`, data),
  urgent: (id, isUrgent) => request.post(`/api/order/${id}/urgent`, null, { params: { isUrgent } }),

  // ===== 统计 =====
  pendingCount: () => request.get('/api/order/stats/pending-count'),
  statusCount: (customerId) => request.get('/api/order/stats/status-count', { params: { customerId } })
}