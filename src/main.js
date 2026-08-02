// src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import router from './router';
import { useUserStore } from './stores/user';

// 引入全局样式
import './styles/global.css';

const app = createApp(App);

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

const userStore = useUserStore();
const savedUser = localStorage.getItem('userInfo');
if (savedUser) {
  try {
    userStore.setUser(JSON.parse(savedUser));
  } catch {
    // ignore
  }
}

app.mount('#app');