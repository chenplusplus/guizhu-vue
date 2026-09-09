// src/api/valueChangeLog.js
import request from './client'

// 获取单据的变更日志
export const getValueChangeLogs = (sourceType, sourceId) => {
    return request.get('/valuechangelog/source', {
        params: { sourceType, sourceId }
    })
}

// 根据单号获取变更日志
export const getValueChangeLogsByNo = (sourceNo) => {
    return request.get(`/valuechangelog/no/${sourceNo}`)
}

// 批量获取
export const batchGetValueChangeLogs = (sourceType, sourceIds) => {
    return request.post('/valuechangelog/batch', { sourceType, sourceIds })
}
