import request from './index'

// 获取维修单列表
export const getRepairList = (params) => {
    return request.get('/repair/list', { params })
}

// 根据订单ID获取维修单（预填订单数据）
export const getRepairByOrderId = (orderId) => {
    return request.get(`/repair/by-order/${orderId}`)
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