// src/api/basedata.js
import api from './index';

// 金价管理
export const getGoldPrices = (params) => api.get('/basedata/gold-prices', { params });
export const createGoldPrice = (data) => api.post('/basedata/gold-price', data);
export const updateGoldPrice = (data) => api.put('/basedata/gold-price', data);
export const deleteGoldPrice = (id) => api.delete(`/basedata/gold-price/${id}`);
export const getCurrentGoldPrice = (color) => api.get('/basedata/gold-price/current', { params: { color } });

// 钻石价格
export const getDiamondPrices = () => api.get('/basedata/diamond-prices');
export const updateDiamondPrice = (data) => api.put('/basedata/diamond-price', data);

// 工费模板
export const getLaborTemplates = () => api.get('/basedata/labor-templates');
export const createLaborTemplate = (data) => api.post('/basedata/labor-template', data);
export const deleteLaborTemplate = (id) => api.delete(`/basedata/labor-template/${id}`);