// src/api/product.js
import api from './index';

// 搜索产品（当前客户）
export const searchProducts = (params) => {
  return api.get('/product/search', { params });
};

// 保存产品
export const saveProduct = (data) => {
  return api.post('/product/save', data);
};

// 获取产品详情
export const getProduct = (id) => {
  return api.get(`/product/${id}`);
};

// 获取历史订单（用于复制）
export const getHistoryOrders = (params) => {
  return api.get('/order/history', { params });
};