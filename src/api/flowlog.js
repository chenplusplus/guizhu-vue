// src/api/flowlog.js
import api from './index';

// 获取订单的流程日志
export const getOrderLogs = (orderId) => {
  return api.get(`/flowlog/order/${orderId}`);
};

// 获取账单的流程日志
export const getBillLogs = (billId) => {
  return api.get(`/flowlog/bill/${billId}`);
};