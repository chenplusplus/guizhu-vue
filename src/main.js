// src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import router from './router';
import { useUserStore } from './stores/user';


const app = createApp(App);

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(createPinia());

// ⚠️ 必须在 app.use(router) 之前恢复登录态：
//    路由首次导航（含 `/` 与未知路径的 redirect）依赖 userStore.homePath 判断落地页
const userStore = useUserStore();
const savedUser = localStorage.getItem('userInfo');
if (savedUser) {
  try {
    userStore.setUser(JSON.parse(savedUser));
  } catch {
    // ignore
  }
}

app.use(router);
app.use(ElementPlus);

app.mount('#app');