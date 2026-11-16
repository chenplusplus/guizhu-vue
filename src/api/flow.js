// src/api/flow.js
import request from '@/utils/request';

// ============================================================
// 业务接口（订单/账单/LR表详情页使用）
// ============================================================

// 获取节点配置（字段权限）
export const getNodeConfig = (flowCode, nodeKey) => {
  return request.get('/flow/node-config', { params: { flowCode, nodeKey } });
};

// 获取节点可执行操作
export const getNodeActions = (flowCode, nodeKey) => {
  return request.get('/flow/node-actions', { params: { flowCode, nodeKey } });
};

// 获取当前节点
export const getCurrentNode = (businessId) => {
  return request.get('/flow/current-node', { params: { businessId } });
};

// 执行流程操作
export const executeAction = (data) => {
  return request.post('/flow/execute', data);
};

// 获取流程历史
export const getFlowHistory = (flowCode, businessId) => {
  return request.get('/flow/history', { params: { flowCode, businessId } });
};

// ============================================================
// 管理接口（流程配置页面使用）
// ============================================================

// 获取流程定义列表
export const getFlowDefinitions = () => {
  return request.get('/flow/definitions');
};

// 获取流程节点列表
export const getFlowNodes = (flowCode) => {
  return request.get('/flow/nodes', { params: { flowCode } });
};

// 获取节点字段配置
export const getNodeFields = (flowCode, nodeKey) => {
  return request.get('/flow/node-fields', { params: { flowCode, nodeKey } });
};

// 更新节点字段权限
export const updateNodeFields = (data) => {
  return request.post('/flow/node-fields/update', data);
};

// 获取流转规则
export const getTransitions = (flowCode, nodeKey) => {
  return request.get('/flow/transitions', { params: { flowCode, nodeKey } });
};

// 保存节点
export const saveNode = (data) => {
  return request.post('/flow/node', data);
};

// 删除节点
export const deleteNode = (id) => {
  return request.delete(`/flow/node/${id}`);
};

// 获取节点角色权限
export const getNodeRoles = (flowCode, nodeKey) => {
  return request.get('/flow/node-roles', { params: { flowCode, nodeKey } });
};

// 更新节点角色权限
export const updateNodeRoles = (data) => {
  return request.post('/flow/node-roles/update', data);
};