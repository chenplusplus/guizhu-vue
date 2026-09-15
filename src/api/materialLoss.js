// src/api/materialLoss.js
import api from './index';

// 获取供应商损耗配置列表
export const getMaterialLossList = (counterpartyId) => {
  return api.get('/materialloss/list', { params: { counterpartyId } });
};

// 保存供应商损耗配置（新增或更新）
export const saveMaterialLoss = (data) => {
  return api.post('/materialloss/save', data);
};

// 删除配置
export const deleteMaterialLoss = (id) => {
  return api.delete(`/materialloss/${id}`);
};

// 根据供应商 + 材质获取配置（含全局默认回退）
export const getMaterialLoss = (counterpartyId, materialType) => {
  return api.get('/materialloss/get', { params: { counterpartyId, materialType } });
};
