// src/api/valueChangeLog.js
import api from './index'

// 获取单据的变更日志
export const getValueChangeLogs = (sourceType, sourceId) => {
    return api.get('/valuechangelog/source', {
        params: { sourceType, sourceId }
    })
}

// 根据单号获取变更日志
export const getValueChangeLogsByNo = (sourceNo) => {
    return api.get(`/valuechangelog/no/${sourceNo}`)
}

// 批量获取
export const batchGetValueChangeLogs = (sourceType, sourceIds) => {
    return api.post('/valuechangelog/batch', { sourceType, sourceIds })
}
