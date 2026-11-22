import request from './index'

// 获取维修单列表
export const getRepairList = (params) => {
    return request.get('/repair/list', { params })
}

// 根据订单ID获取维修单（预填订单数据）
// bringRepair：复制单是否带出源订单维修单数据（1=带出 / 0=不带出），不传则用订单上存的值
export const getRepairByOrderId = (orderId, bringRepair) => {
    return request.get(`/repair/by-order/${orderId}`, {
        params: bringRepair === undefined || bringRepair === null ? {} : { bringRepair }
    })
}

// ⭐ 从历史维修单带入费用（同客户 + 同品名优先，其次同客户最近一单）
// 范围：工费 → CNC 费之间的每个字段，不含订单固定信息与备注
export const getRepairHistoryBring = (params) => {
    return request.get('/repair/history-bring', { params })
}

// 获取维修单详情
export const getRepairDetail = (id) => {
    return request.get(`/repair/${id}`)
}

// 创建维修单
export const createRepair = (data) => {
    return request.post('/repair', data)
}

// 更新维修单
export const updateRepair = (data) => {
    return request.put('/repair', data)
}

// 更新维修单状态
export const updateRepairStatus = (id, status) => {
    return request.put(`/repair/${id}/status`, status)
}

// 删除维修单
export const deleteRepair = (id) => {
    return request.delete(`/repair/${id}`)
}