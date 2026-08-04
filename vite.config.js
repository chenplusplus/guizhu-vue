// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8086,
    proxy: {
      '/api': {
        target: 'https://localhost:7046',  // 后端地址
        changeOrigin: true,
        secure: false,  // 如果是 HTTPS 自签名证书，需要关闭验证
        rewrite: (path) => path,  // 保持路径不变
      },
      // ⭐ 添加静态文件代理
      '/uploads': {
        target: 'https://localhost:7046',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});