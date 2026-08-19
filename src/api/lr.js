// src/api/lr.js
import api from './index';
import request from '@/utils/request';  
// 获取LR表列表
export const getLrList = (params) => {
  return api.get('/lr/list', { params });
};

// 获取可生成LR表的账单列表
export const getAvailableBillsForLr = () => {
  return api.get('/lr/available-bills');
};

// 获取LR表数据
export const getLrTable = (billId) => {
  return api.get(`/lr/${billId}`);
};

// 生成LR表
export const generateLr = (data) => {
  return api.post('/lr/generate', data);
};

// 保存LR表
export const saveLr = (data) => {
  return api.post('/lr/save', data);
};

// 删除LR表
export const deleteLr = (id) => {
  return api.delete(`/lr/${id}`);
};



// ===== 导出LR表Excel（原生fetch） =====
export const exportLr = async (lrId) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`/api/lr/export/${lrId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      throw new Error(json.message || `导出失败：${response.status}`);
    } catch {
      throw new Error(`导出失败：${response.status}`);
    }
  }

  return response;
};
export const confirmLr = (id) => {
  return request({
    url: `/api/lr/${id}/confirm`,
    method: 'post'
  });
};

// LR表流程动作：制作完成、审核通过/驳回统一走流程引擎
export const getLrCurrentNode = (lrId) => {
  return request.get('/api/flow/current-node', { params: { businessId: lrId } });
};

export const getLrNodeActions = (nodeKey) => {
  return request.get('/api/flow/node-actions', { params: { flowCode: 'lr_flow', nodeKey } });
};

export const executeLrAction = (data) => {
  return request.post('/api/flow/execute', {
    flowCode: 'lr_flow',
    ...data,
    businessId: String(data.businessId)
  });
};

export const getLrCustomers = () => {
  return request({
    url: '/api/lr/customers',
    method: 'get'
  });
};
// 获取客户累计数据
export const getCustomerLrSummary = (customerId) => {
  return request({
    url: `/api/lr/customer-summary/${customerId}`,
    method: 'get'
  })
}

// 获取客户累计数据（上单）
export const getCustomerSummary = (customerId) => {
  return request({
    url: `/api/lr/customer-summary/${customerId}`,
    method: 'get'
  });
};