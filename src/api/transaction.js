// src/api/transaction.js — 总进总出业务 API
import request from '@/utils/request'

export function transactionCreate(data) {
  return request({ url: '/api/transaction', method: 'post', data })
}

export function transactionUpdate(data) {
  return request({ url: '/api/transaction', method: 'put', data })
}

export function transactionList(params) {
  return request({ url: '/api/transaction/list', method: 'get', params })
}

export function transactionSubmit(id) {
  return request({ url: `/api/transaction/${id}/submit`, method: 'post' })
}

export function transactionAudit(data) {
  return request({ url: '/api/transaction/audit', method: 'post', data })
}

export function factorySummary(params) {
  return request({ url: '/api/transaction/summary/factory', method: 'get', params })
}

export function counterpartSummary(params) {
  return request({ url: '/api/transaction/summary/counterpart', method: 'get', params })
}
