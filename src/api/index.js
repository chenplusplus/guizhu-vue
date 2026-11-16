// src/api/index.js
// ⚠️ 这是**第二个** axios 实例（预警列表等页面在用），提示逻辑要与 utils/request.js 一致，
//    否则同一个 400 在主实例是中文、在这里还是英文 "Request failed with status code 400"
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { normalizeError } from '@/utils/errorMessage';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code === 401 || res.success === false) {
      if (res.message?.includes('登录') || res.message?.includes('未登录')) {
        ElMessage.error('登录已过期，请重新登录');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    return res;
  },
  (error) => {
    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } else {
      // ⭐ 与主实例统一：中文归一化后再弹，并把英文 message 改写掉
      const friendly = normalizeError(error) || '请求失败';
      ElMessage.error(friendly);
      try { error.__msgShown = true } catch { /* ignore */ }
    }
    return Promise.reject(error);
  }
);

export default api;
