// src/api/audit.js
// 审核工作台接口（仅工厂审核员 / 管理员可用）
import request from '@/utils/request'

export const getAuditPendingSummary = () => request.get('/audit/pending-summary')

export const getAuditPendingList = (params = {}) => request.get('/audit/pending-list', { params })
