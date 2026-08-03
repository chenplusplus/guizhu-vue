// src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import router from './router';
import { useUserStore } from './stores/user';

// ⭐ 引入 jQuery
import $ from 'jquery';
window.$ = window.jQuery = $;

// ⭐ 引入 jQuery Mousewheel 插件（必须在 jQuery 之后）
import 'jquery-mousewheel';

// ⭐ 引入 Luckysheet 样式
import 'luckysheet/dist/css/luckysheet.css';

const app = createApp(App);

// 注册所有 Element Plus 图标
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