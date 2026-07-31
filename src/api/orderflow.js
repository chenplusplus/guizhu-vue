import request from '@/utils/request'

export const orderflowApi = {
  get: (orderId) => request.get(`/api/orderflow/${orderId}`),
  execute: (orderId, action, data = {}) => {
    const actionMap = {
      submit: '/submit',
      approve: '/approve',
      reject: '/reject',
      return: '/return',
      complete: '/complete',
      cancel: '/cancel',
      generate_bill: '/generate-bill'
    }
    return request.post(`/api/orderflow/${orderId}${actionMap[action] || ''}`, data)
  }
}