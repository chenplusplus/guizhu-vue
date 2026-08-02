// src/api/index.js
import axios from 'axios';
import { ElMessage } from 'element-plus';

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
    } else if (error.response?.status === 500) {
      ElMessage.error('服务器错误，请稍后重试');
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请检查网络');
    } else if (error.message) {
      ElMessage.error(error.message);
    }
    return Promise.reject(error);
  }
);

export default api;