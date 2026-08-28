// src/api/inventory.js
import request from '@/utils/request'

// ==================== 盘点事件 ====================

// 获取待盘点事件列表
export function getPendingEvents(params) {
  return request({
    url: '/inventory/events/pending',
    method: 'get',
    params
  })
}

// 创建盘点事件（Bill确认后调用 - 内部接口）
export function createEventFromBill(billId) {
  return request({
    url: `/inventory/events/from-bill/${billId}`,
    method: 'post'
  })
}

// 创建盘点事件（Inout审核后调用 - 内部接口）
export function createEventFromInout(recordId) {
  return request({
    url: `/inventory/events/from-inout/${recordId}`,
    method: 'post'
  })
}

// ==================== 盘点批次 ====================

// 预览盘点批次
export function previewBatch(data) {
  return request({
    url: '/inventory/batch/preview',
    method: 'post',
    data
  })
}

// 创建盘点批次
export function createBatch(data) {
  return request({
    url: '/inventory/batch',
    method: 'post',
    data
  })
}

// 获取盘点批次列表
export function getBatchList(params) {
  return request({
    url: '/inventory/batch',
    method: 'get',
    params
  })
}

// 获取盘点批次详情
export function getBatchDetail(batchId) {
  return request({
    url: `/inventory/batch/${batchId}`,
    method: 'get'
  })
}

// 更新实际盘点数据
export function updateActualSummary(batchId, data) {
  return request({
    url: `/inventory/batch/${batchId}/actual`,
    method: 'put',
    data
  })
}

// 编辑期初数据
export function editOpeningSummary(batchId, data) {
  return request({
    url: `/inventory/batch/${batchId}/opening`,
    method: 'put',
    data
  })
}

// 确认盘点
export function confirmBatch(batchId) {
  return request({
    url: `/inventory/batch/${batchId}/confirm`,
    method: 'post'
  })
}

// 反确认
export function unconfirmBatch(batchId, reason) {
  return request({
    url: `/inventory/batch/${batchId}/unconfirm`,
    method: 'post',
    data: { reason }
  })
}

// 取消盘点
export function cancelBatch(batchId, reason) {
  return request({
    url: `/inventory/batch/${batchId}/cancel`,
    method: 'post',
    data: { reason }
  })
}

// ==================== 上单 ====================

// 获取上单数据
export function getShangdan() {
  return request({
    url: '/inventory/shangdan',
    method: 'get'
  })
}
