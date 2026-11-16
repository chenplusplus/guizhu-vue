import axios from 'axios'
import { ElMessage } from 'element-plus'
import { normalizeError } from './errorMessage'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true
})

// 登录过期只跳转一次，避免并发 401 造成页面反复刷新
let sessionExpiredHandled = false

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
      // ⭐ 401 只处理一次：并发请求同时过期时会连续触发多次跳转，导致页面反复刷新（闪屏）
      if (!sessionExpiredHandled) {
        sessionExpiredHandled = true
        ElMessage.error('登录已过期，请重新登录')
        // ⭐ 必须同时清掉 userInfo：main.js 启动时会用它恢复登录态，
        //    只清 token 的话刷新后仍判定为已登录 → 又请求 → 又 401 → 无限刷新
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        // ⭐ 路由是 history 模式，跳转路径不能带 #（原来写成 /#/login 会先落到 / 再被重定向）
        window.location.replace('/login')
      }
    } else {
      // ⭐ 统一走 errorMessage.js：业务错误 / 模型校验 400 / axios 英文兜底都转中文，
      //    并就地改写 error.message + 挂 error.friendlyMessage，
      //    页面 catch 里写 e.message 或 e.friendlyMessage 都是人话
      const friendly = normalizeError(error) || '请求失败'
      // 开发期定位用：控制台能看到具体哪个接口出的错（生产可保留，不影响用户）
      if (import.meta.env.DEV) {
        console.warn(
          `[API ${error.response?.status || 'ERR'}] ${error.config?.method?.toUpperCase() || ''} ${error.config?.url || ''} → ${friendly}`
        )
      }
      ElMessage.error(friendly)
      // 标记已提示，main.js 的 unhandledrejection 兜底不再重复弹一次
      try { error.__msgShown = true } catch { /* ignore */ }
    }
    return Promise.reject(error)
  }
)

export default request
