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
    // ⭐ 只写 port 时 Vite 默认绑定 localhost，Node 17+ 解析成 ::1（仅 IPv6）
    //    → 浏览器访问 http://127.0.0.1:8086 直接 ERR_CONNECTION_REFUSED（页面"没反应"）
    //    改成 0.0.0.0，IPv4/IPv6/局域网 IP 都能进
    host: '0.0.0.0',
    headers: {
      'Cache-Control': 'no-store',
    },
    proxy: {
      '/api': {
        target: 'https://localhost:7046',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'https://localhost:7046',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});