// src/api/bill.js
import api from './index';
import request from '@/utils/request'; 
// ===== 获取可生成账单的订单 =====
export const getAvailableOrders = () => {
  return api.get('/bill/available-orders');
};

// ===== 生成账单 =====
export const createBill = (data) => {
  return api.post('/bill/create', data);
};

// ===== 自动生成账单（制作完成审核通过后触发）=====
export const autoCreateBill = (orderId, remark) => {
  return api.post('/bill/auto-create', null, { params: { orderId, remark } });
};

// ===== 补齐未出账订单（兜底：已完成但没挂账单的订单，按客户各出一张）=====
export const generateMissingBills = (params) => {
  return api.post('/bill/generate-missing', null, { params });
};

// ===== 获取账单列表 =====
export const getBillList = (params) => {
  return api.get('/bill/list', { params });
};

// ===== 获取账单详情 =====
export const getBillDetail = (id) => {
  return api.get(`/bill/${id}`);
};

// ===== 更新账单明细 =====
export const updateBillDetails = (data) => {
  return api.put('/bill/update-details', data);
};

// ===== 更新来料/来款 =====
export const updatePayment = (id, data) => {
  return api.put(`/bill/${id}/payment`, data);
};

// ===== 账单明细修改记录（工厂侧可见：审核员看「改了什么」）=====
export const getBillModifyTrail = (id) => {
  return api.get(`/bill/${id}/modify-trail`);
};

// ===== 批量取账单修改次数（审核列表行内红字提示）=====
export const getBillModifyCounts = (ids) => {
  return api.get('/bill/modify-trail/counts', { params: { ids: (ids || []).join(',') } });
};

// ===== 审核账单 =====
export const auditBill = (id, data) => {
  return api.post(`/bill/${id}/audit`, data);
};

export const getCustomerList = (params) => {
  return api.get('/customer/list', { params });
};
// ===== 客户审核员审核账单（billConfirmed → customerApproved，待业务员确认）=====
export const customerAuditBill = (id) => {
  return api.post(`/bill/${id}/customer-audit`);
};

// ===== 确认账单（业务员最终确认 customerApproved → confirmed）=====
export const confirmBill = (id) => {
  return api.post(`/bill/${id}/confirm`);
};

export const saveBillData = (data) => {
  return api.put('/bill/update-details', data);
};
export const submitBillAudit = (id) => {
  return api.post(`/bill/${id}/submit-audit`);
};
// ===== 退回账单（旧流程，已停用，改用下面的客户申请 → 工厂处理 → 审核） =====
export const returnBill = (id, data) => {
  return api.post(`/bill/${id}/return`, data);
};

// ⭐ 客户申请退回（只勾明细 + 逐行说明，不动金额）
export const requestBillReturn = (id, data) => {
  return api.post(`/bill/${id}/return-request`, data);
};

// ⭐ 工厂操作员处理退回（定退回方式 + 保留损耗，提交审核）
export const handleBillReturn = (id, data) => {
  return api.post(`/bill/${id}/return-handle`, data);
};

// ===== 客户申请修改账单（下单员/客户审核员） =====
export const applyBillModify = (id, reason) => {
  return api.post(`/bill/${id}/apply-modify`, { reason });
};

// ===== 工厂编辑员重新提交修改后的账单 =====
export const resubmitBillModify = (id) => {
  return api.post(`/bill/${id}/resubmit-modify`);
};

// ===== 获取退货记录 =====
export const getReturns = (params) => {
  return api.get('/bill/returns', { params });
};

export const generateLr = (id) => {
  return api.post(`/bill/${id}/generate-lr`);
};


// ⭐ 退回单个明细（编辑页用）
export const returnBillItem = (data) => {
  return api.post('/bill/return-item', data);
};


// ===== 导出账单Excel =====
export const exportBill = (id) => {
  return request({
    url: `/api/bill/export/${id}`,
    method: 'get',
    responseType: 'blob',
    timeout: 60000,
  });
};

// ⭐ 审批退回（工厂审核员）
export const auditReturn = (id, data) => {
  return api.post(`/bill/${id}/return-audit`, data);
};

// ⭐ 出货明细（按客户汇总）
export const getBillExportData = (params) => {
  return api.get('/bill/export-data', { params });
};

// ⭐ 树形账单汇总（客户 → 销售 → 明细）
// params: { dateType: 'today' | 'month' | 'custom', startDate?, endDate?, customerId?, salesman?, productName?, color? }
export const getBillTree = (params) => {
  return api.get('/bill/tree', { params });
};

// ⭐ 树形账单汇总筛选项（客户 / 销售 / 品名 / 成色）
export const getBillTreeOptions = (params) => {
  return api.get('/bill/tree/options', { params });
};

// ===== ⭐ 账单收款 =====
// 保存实际收款（行级 + 已收款勾选），后端自动汇总
export const saveBillReceipt = (id, data) => {
  return api.post(`/bill/${id}/receipt/save`, data);
};
// 提交收款审核
export const submitBillReceipt = (id) => {
  return api.post(`/bill/${id}/receipt/submit`);
};
// 收款审核（approved: true 通过 / false 驳回）
export const auditBillReceipt = (id, data) => {
  return api.post(`/bill/${id}/receipt/audit`, data);
};
// 收款列表（status: none|pending|approved|rejected|all）
export const getBillReceiptList = (params) => {
  return api.get('/bill/receipt/list', { params });
};
// ===== ⭐ 收款记录（客户侧：工厂收款审核通过后的到账流水）=====
export const getReceiptRecords = (params) => {
  return api.get('/bill/receipt-record/list', { params });
};
// 未读条数 + 本月汇总（工作台卡片 / 顶栏铃铛）
export const getReceiptUnread = () => {
  return api.get('/bill/receipt-record/unread');
};
// 标记已读（进页面自动调用）
export const markReceiptRead = () => {
  return api.post('/bill/receipt-record/read');
};
