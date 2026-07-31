import request from '@/utils/request'

export const dictApi = {
  // 金价
  goldPrice: () => request.get('/api/dict/gold-price'),
  updateGoldPrice: (id, price) => request.put(`/api/dict/gold-price/${id}`, price),
  // 产品
  products: () => request.get('/api/dict/product'),
  // 颜色
  colors: () => request.get('/api/dict/color'),
  // 损耗率
  lossRates: () => request.get('/api/dict/loss-rate')
}