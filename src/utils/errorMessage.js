// src/utils/errorMessage.js
// ============================================================
// 全局错误提示归一化：把后端 / axios 的各种错误体转成人能看懂的中文
//   request.js（主实例）与 api/index.js（备用实例）共用本文件，
//   避免两套拦截器提示不一致（api/index.js 以前直接弹 error.message，
//   模型校验 400 时就是英文 "Request failed with status code 400"）
// ============================================================

export const FIELD_LABELS = {
  status: '状态', remark: '备注', step: '步骤',
  orderId: '订单ID', orderIds: '订单列表',
  customerId: '客户', customerIds: '客户列表',
  customerName: '客户名称', salesman: '业务员',
  quantity: '数量', productName: '品名',
  deliveryDays: '交货天数', totalQuantity: '总数量',
  orderDate: '订单日期', deliveryDate: '出货日期',
  goldPrice: '金价', netWeight: '净重', totalWeight: '总重',
  lossRate: '损耗率', addLossWeight: '加耗重',
  amount: '金额', totalAmount: '总金额', billId: '账单ID',
  reason: '原因', userName: '用户名', password: '密码',
  size: '手寸', color: '成色', purityId: '成色',
  imageType: '图片类型', imageUrl: '图片地址', images: '图片',
  keyword: '关键词', page: '页码', pageSize: '每页条数',
  startDate: '开始日期', endDate: '结束日期'
}

export function labelOf(field) {
  const key = String(field || '').split('.').pop().trim()
  if (!key || key === '$') return '请求内容'
  return FIELD_LABELS[key] || key
}

export function translateFieldError(field, msg) {
  const text = String(msg || '')
  if (/is required/i.test(text)) return `${labelOf(field)} 为必填项`
  if (/could not be converted|is not valid/i.test(text)) return `${labelOf(field)} 格式不正确`
  return `${labelOf(field)}：${text}`
}

// axios 自带的英文兜底，出现即视为"没有拿到后端消息"
const AXIOS_RAW = /^Request failed with status code/i

const BY_STATUS = {
  400: '提交的数据不完整或格式有误，请检查必填项',
  401: '登录已过期，请重新登录',
  403: '没有权限执行该操作',
  404: '请求的数据不存在',
  405: '该操作方式不被支持',
  409: '数据状态已变化，请刷新后重试',
  413: '上传的文件太大了',
  415: '提交的数据格式不支持',
  429: '操作太频繁，请稍后再试',
  500: '服务器处理出错，请稍后重试',
  502: '服务暂时不可用，请稍后重试',
  503: '服务暂时不可用，请稍后重试',
  504: '服务响应超时，请稍后重试'
}

/**
 * 从任意 axios 错误里提取中文提示
 * @param {any} error axios error 或普通 Error
 * @returns {string} 一定有内容的中文提示
 */
export function extractErrorMessage(error) {
  const data = error?.response?.data

  // 后端直接返回纯文本
  if (typeof data === 'string' && data.trim()) {
    const t = data.trim()
    return AXIOS_RAW.test(t) ? '请求失败，请检查填写内容' : t.slice(0, 300)
  }

  if (data && typeof data === 'object') {
    // ① 业务错误：{ success:false, message:"…" }
    if (data.message) {
      const m = String(data.message)
      return AXIOS_RAW.test(m) ? '请求失败，请检查填写内容' : m
    }
    // ② 模型校验：{ errors:{ Status:["The Status field is required."] } }
    if (data.errors && typeof data.errors === 'object') {
      const parts = []
      Object.keys(data.errors).forEach(key => {
        const v = data.errors[key]
        const arr = Array.isArray(v) ? v : [v]
        arr.forEach(m => { if (m) parts.push(translateFieldError(key, m)) })
      })
      if (parts.length) return '提交失败：' + parts.join('；')
    }
    // ③ ValidationProblemDetails 的 title / 兜底 error
    if (data.title && !/validation errors/i.test(data.title)) return String(data.title)
    if (data.error) return String(data.error)
  }

  const status = error?.response?.status
  if (status && BY_STATUS[status]) return BY_STATUS[status]

  const msg = String(error?.message || '')
  if (!msg || AXIOS_RAW.test(msg)) {
    return status ? `请求失败（${status}），请稍后重试` : '网络异常，请检查网络后重试'
  }
  return msg
}

/**
 * 把 axios 的英文 error.message 就地改写成中文（同步挂 friendlyMessage）
 * 这样页面里所有 `catch (e) { ElMessage.error(e.message) }` 自动变中文
 */
export function normalizeError(error) {
  if (!error || typeof error !== 'object') return null
  const friendly = extractErrorMessage(error)
  if (!error.message || AXIOS_RAW.test(error.message)) {
    try { error.message = friendly } catch { /* message 只读时忽略 */ }
  }
  try { error.friendlyMessage = friendly } catch { /* ignore */ }
  return friendly
}
