import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'  // ← 确认这行存在
import './styles/global.css'

const app = createApp(App)

// 注册所有图标np
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)  // ← 确认这行存在，注册 Vue Router
app.use(ElementPlus)

app.mount('#app')