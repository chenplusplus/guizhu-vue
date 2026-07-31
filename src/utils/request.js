import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  baseURL: import.meta.env.VITE_APP_API_BASE_URL || 'https://localhost:7046',
  timeout: 30000,
  withCredentials: true
})

request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

request.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.removeItem('token')
      window.location.href = '/#/login'
    } else {
      ElMessage.error(error.response?.data?.message || error.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

export default request