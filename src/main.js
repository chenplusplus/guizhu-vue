// src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import App from './App.vue';
import router from './router';
import { useUserStore } from './stores/user';
import { ElMessage } from 'element-plus';
import { normalizeError } from './utils/errorMessage';


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
app.use(ElementPlus, { locale: zhCn });

// ============================================================
// ⭐ 全局兜底：任何漏网的请求错误都要弹中文，绝不允许页面上再出现
//    "Request failed with status code 400" 或"点了没反应"
//    拦截器已经弹过的会带 __msgShown 标记，这里不重复弹
// ============================================================
window.addEventListener('unhandledrejection', (ev) => {
  const err = ev.reason;
  if (!err || err.__msgShown) return;
  if (err.isAxiosError || err.response) {
    err.__msgShown = true;
    ElMessage.error(normalizeError(err));
    ev.preventDefault();
  }
});

app.config.errorHandler = (err) => {
  console.error('[Vue Error]', err);
  if (err?.isAxiosError || err?.response) {
    ElMessage.error(normalizeError(err));
  }
};

// ============================================================
// ⭐ 发版后「点了没反应」的兜底
//    新版 dist 会换掉带 hash 的 chunk 文件名。如果用户页面还停在旧版
//    （标签页开着没刷新 / 浏览器拿着旧 index.html），点击懒加载路由就会
//    请求已经不存在的旧 chunk → 404 → 路由静默失败，界面完全不动。
//    这里捕获到「模块加载失败」就自动整页刷新一次，用户无感恢复。
// ============================================================
const isChunkLoadError = (err) => {
  const msg = String((err && (err.message || err)) || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk \d+ failed/i.test(msg);
};

let chunkReloading = false;
const reloadForNewVersion = () => {
  // 防死循环：10 秒内只自动刷一次；再失败就提示用户手动刷新
  const last = Number(sessionStorage.getItem('chunkReloadAt') || 0);
  if (chunkReloading || Date.now() - last < 10000) {
    ElMessage.error('页面版本已更新，请按 Ctrl+F5 强制刷新（或用 Ctrl+Shift+R）');
    return;
  }
  chunkReloading = true;
  sessionStorage.setItem('chunkReloadAt', String(Date.now()));
  ElMessage.warning('检测到系统已更新，正在刷新页面…');
  setTimeout(() => window.location.reload(), 300);
};

// Vite 原生事件：预加载 chunk 失败
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  reloadForNewVersion();
});

// 路由懒加载失败（vue-router 会走到这里，默认是静默的）
router.onError((err) => {
  if (isChunkLoadError(err)) {
    reloadForNewVersion();
    return;
  }
  console.error('[Router Error]', err);
});

// ============================================================
// ⭐ 图片「加载失败」兜底：失败一次自动换缓存键重试
//    nginx 给 /uploads/ 设了 7 天缓存。一旦某张图在弱网/发版重启的瞬间
//    失败过，浏览器就会把「失败」这个结果也按 max-age 缓存住，
//    之后 <img> 连请求都不发，直接显示「加载失败」——用户怎么点都不恢复，
//    只能猜着按 Ctrl+F5。
//    这里在捕获阶段接住所有 <img> 的 error（error 不冒泡，必须 capture），
//    给同一个 URL 加 ?_r=时间戳 再试一次：绕过坏缓存，图片自己就好了。
//    加过 _r= 的不再重试，避免死循环。
// ============================================================
const retriedImgs = new Set();
document.addEventListener('error', (ev) => {
  const el = ev.target;
  if (!el || el.tagName !== 'IMG') return;
  const src = el.getAttribute('src') || '';
  if (!src || /^data:|^blob:/i.test(src)) return;
  if (/[?&]_r=/.test(src)) return;            // 已经带过重试参数
  if (retriedImgs.has(src)) return;           // 这张图已经重试过了，别死循环
  if (retriedImgs.size > 300) retriedImgs.clear();
  retriedImgs.add(src);
  el.setAttribute('src', src + (src.includes('?') ? '&' : '?') + '_r=' + Date.now());
}, true);

app.mount('#app');