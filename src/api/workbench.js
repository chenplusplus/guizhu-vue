// src/api/workbench.js
// 工作台接口（按角色区分）
import request from '@/utils/request'

// 录入工作台（工厂操作员 / 管理员）
export const getEntrySummary = () => request.get('/workbench/entry-summary')

// 客户工作台（客户下单员 / 客户审核员；管理员可预览）
export const getCustomerSummary = () => request.get('/workbench/customer-summary')
