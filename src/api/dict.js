import request from '@/utils/request'

// =============================================
// 字典分类
// =============================================
export const dictApi = {
  // 分类
  getCategories: () => request.get('/api/dict/categories'),
  getCategory: (id) => request.get(`/api/dict/categories/${id}`),
  createCategory: (data) => request.post('/api/dict/categories', data),
  updateCategory: (data) => request.put('/api/dict/categories', data),
  deleteCategory: (id) => request.delete(`/api/dict/categories/${id}`),

  // 条目
  getItems: (categoryId) => request.get(`/api/dict/items/${categoryId}`),
  // key: categoryKey，如 'color', 'goldprice', 'lossrate'
  getItemsByKey: (key) => request.get('/api/dict/items', { params: { key } }),
  getAllItems: () => request.get('/api/dict/items'),
  createItem: (data) => request.post('/api/dict/items', data),
  updateItem: (data) => request.put('/api/dict/items', data),
  deleteItem: (id) => request.delete(`/api/dict/items/${id}`),

  // 初始化
  initData: () => request.post('/api/dict/init'),

  // ===== 兼容旧接口（供现有页面使用） =====
  goldPrice: () => request.get('/api/dict/gold-price'),
  products: () => request.get('/api/dict/product'),
  colors: () => request.get('/api/dict/color'),
  lossRates: () => request.get('/api/dict/loss-rate'),
}
