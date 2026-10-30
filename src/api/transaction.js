// src/api/transaction.js — 总进总出业务 API
import request from '@/utils/request'

export function transactionCreate(data) {
  return request({ url: '/transaction', method: 'post', data })
}

export function transactionUpdate(data) {
  return request({ url: '/transaction', method: 'put', data })
}

export function transactionList(params) {
  return request({ url: '/transaction/list', method: 'get', params })
}

export function transactionSubmit(id) {
  return request({ url: `/transaction/${id}/submit`, method: 'post' })
}

export function transactionAudit(data) {
  return request({ url: 'i/transaction/audit', method: 'post', data })
}

export function factorySummary(params) {
  return request({ url: '/transaction/summary/factory', method: 'get', params })
}

export function counterpartSummary(params) {
  return request({ url: '/transaction/summary/counterpart', method: 'get', params })
}

// 往来单位 × 材质明细矩阵（金料/钻石/费用/其他材料 分组）
export function counterpartMaterialSummary(params) {
  return request({ url: '/transaction/summary/counterpart-material', method: 'get', params })
}

