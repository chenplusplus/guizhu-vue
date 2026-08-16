// src/api/product.js
import request from '@/utils/request';

// 搜索产品
export const searchProducts = (params) => {
  return request.get('/api/product/search', { params });
};

// 获取产品列表
export const getProductList = (params) => {
  return request.get('/api/product/list', { params });
};

// 创建产品
export const createProduct = (data) => {
  return request.post('/api/product', data);
};

// 获取产品详情
export const getProductDetail = (id) => {
  return request.get(`/api/product/${id}`);
};

// 更新产品
export const updateProduct = (data) => {
  return request.put('/api/product', data);
};

// 删除产品
export const deleteProduct = (id) => {
  return request.delete(`/api/product/${id}`);
};