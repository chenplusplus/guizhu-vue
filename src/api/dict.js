import request from '@/utils/request'

// =============================================
// 字典分类
// =============================================
export const dictApi = {
  // 分类
  getCategories: () => request.get('/dict/categories'),
  getCategory: (id) => request.get(`/dict/categories/${id}`),
  createCategory: (data) => request.post('/dict/categories', data),
  updateCategory: (data) => request.put('/dict/categories', data),
  deleteCategory: (id) => request.delete(`/dict/categories/${id}`),

  // 条目
  getItems: (categoryId) => request.get(`/dict/items/${categoryId}`),
  // key: categoryKey，如 'color', 'goldprice', 'lossrate'
  getItemsByKey: (key) => request.get('/dict/items', { params: { key } }),
  getAllItems: () => request.get('/dict/items'),
  createItem: (data) => request.post('/dict/items', data),
  updateItem: (data) => request.put('/dict/items', data),
  deleteItem: (id) => request.delete(`/dict/items/${id}`),

  // 初始化
  initData: () => request.post('/dict/init'),

  // ===== 兼容旧接口（供现有页面使用） =====
  goldPrice: () => request.get('/dict/gold-price'),
  products: () => request.get('/dict/product'),
  colors: () => request.get('/dict/color'),
  lossRates: () => request.get('/dict/loss-rate'),
}
