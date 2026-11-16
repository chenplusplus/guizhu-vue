<!-- src/components/Layout.vue -->
<template>
  <el-container class="layout-container">
    <!-- ===== 顶部导航 ===== -->
    <el-header class="layout-header">
      <div class="header-left">
        <div class="logo">
          <span style="font-size:24px;">💎</span>
          <span style="font-weight:600;font-size:18px;color:#1d2129;">珠宝订单系统</span>
        </div>
      </div>
      <div class="header-right">
        <!-- ⭐ 退货处理提醒（工厂操作员 / 管理员）：有客户申请退回就亮角标 -->
        <el-tooltip
          v-if="showReturnBell"
          :content="returnTodo ? `退货处理：${returnTodo} 行待处理` : '退货处理'"
          placement="bottom"
        >
          <el-badge :value="returnTodo" :hidden="!returnTodo" :max="99" class="bell-wrap">
            <el-icon class="bell-icon bell-return" @click="goReturnProcess"><RefreshLeft /></el-icon>
          </el-badge>
        </el-tooltip>
        <!-- ⭐ 退货审核提醒（工厂审核员 / 管理员）：工厂提交退回方式后亮角标 -->
        <el-tooltip
          v-if="showReturnAuditBell"
          :content="returnAudit ? `退货审核：${returnAudit} 行待审核` : '退货审核'"
          placement="bottom"
        >
          <el-badge :value="returnAudit" :hidden="!returnAudit" :max="99" class="bell-wrap">
            <el-icon class="bell-icon bell-audit" @click="goReturnAudit"><Select /></el-icon>
          </el-badge>
        </el-tooltip>
        <span class="user-name">{{ userStore.realName || '管理员' }}</span>
        <el-dropdown @command="handleCommand">
          <el-avatar :size="32" style="background:#409EFF;cursor:pointer;color:#fff;display:flex;align-items:center;justify-content:center;">
            {{ userStore.realName?.charAt(0) || 'A' }}
          </el-avatar>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人中心</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <el-container class="main-container">
      <!-- ===== 左侧菜单 ===== -->
      <el-aside :width="isCollapse ? '64px' : '200px'" class="layout-aside">
        <div class="menu-toggle" @click="toggleCollapse">
          <el-icon><Fold v-if="!isCollapse" /><Expand v-else /></el-icon>
        </div>
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :collapse-transition="false"
          background-color="#ffffff"
          text-color="#5a7a8a"
          active-text-color="#409EFF"
          @select="handleMenuSelect"
        >
          <template v-for="item in menuList" :key="item.menuId">
            <el-sub-menu v-if="item.children && item.children.length > 0" :index="item.menuPath || item.menuId.toString()">
              <template #title>
                <span>{{ item.menuName }}</span>
              </template>
              <el-menu-item
                v-for="child in item.children"
                :key="child.menuId"
                :index="child.menuPath"
                @click="handleMenuSelect(child.menuPath)"
              >
                <span>{{ child.menuName }}</span>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="item.menuPath">
              <template #title>{{ item.menuName }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </el-aside>

      <div class="right-container">
        <div class="tabs-bar">
          <div class="tabs-container">
            <div
              v-for="tab in tabs"
              :key="tab.path"
              class="tab-item"
              :class="{ active: currentPath === tab.path }"
              @click="switchTab(tab)"
            >
              <span>{{ tab.title }}</span>
              <el-icon v-if="tab.closable" class="tab-close" @click.stop="closeTab(tab)">
                <Close />
              </el-icon>
            </div>
          </div>
          <div class="tabs-actions">
            <el-dropdown @command="handleTabCommand">
              <el-icon><More /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="close-current">关闭当前</el-dropdown-item>
                  <el-dropdown-item command="close-others">关闭其他</el-dropdown-item>
                  <el-dropdown-item command="close-all">关闭全部</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        <div class="layout-main" :class="{ 'bill-page': isBillPage }">
          <router-view v-slot="{ Component }">
            <keep-alive :include="cachedViews">
              <component :is="Component" :key="$route.fullPath" />
            </keep-alive>
          </router-view>
        </div>
      </div>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElNotification } from 'element-plus'
import { Fold, Expand, Close, More, RefreshLeft, Select } from '@element-plus/icons-vue'
import { menuApi } from '@/api/menu'
import { getReturnTodoCount, getReturnAuditTodoCount } from '@/api/return'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)
const tabs = ref([])
const cachedViews = ref([])
const menuList = ref([])
const loading = ref(false)

const currentPath = computed(() => route.path)
const activeMenu = computed(() => route.path)

// ⭐ 账单页标记（保留：账单相关页面的其它统一处理可能按此判断）
const isBillPage = computed(() =>
  /^\/order\/(bill|customer-bill|customer-monthly-bill)/.test(route.path || '')
)

// ===== 全站表格横向滚动条：标记真正横向溢出的表格 =====
// Element 的滚动条只有 hover 才出现，CSS 里靠 .has-hscroll 常显并留出占位。
// 表格数据是异步加载的，所以用防抖 + MutationObserver 兜底。
let hScrollTimer = null
let hScrollObserver = null
const markHScrollTables = () => {
  document.querySelectorAll('.el-table').forEach(tb => {
    const wrap = tb.querySelector('.el-table__body-wrapper .el-scrollbar__wrap')
    if (!wrap) return
    tb.classList.toggle('has-hscroll', wrap.scrollWidth - wrap.clientWidth > 2)
  })
}
const scheduleMarkHScroll = () => {
  if (hScrollTimer) clearTimeout(hScrollTimer)
  hScrollTimer = setTimeout(markHScrollTables, 300)
}

// ===== 退货处理提醒（工厂操作员 / 管理员） =====
const returnTodo = ref(0)
const showReturnBell = computed(() => {
  const t = String(userStore.userType || '').toLowerCase()
  return t === 'factoryorder' || t === 'admin'
})
let returnTimer = null
let returnReminded = false   // 每个会话只弹一次通知，避免轮询重复打扰
const loadReturnTodo = async () => {
  if (!showReturnBell.value) return
  try {
    const res = await getReturnTodoCount()
    const d = res?.data || {}
    returnTodo.value = d.count || 0

    // ⭐ 有新退货 → 弹一条提醒（点通知直达退货处理页）
    if (!returnReminded && d.count) {
      const key = `returnNotifiedMaxId:${userStore.userId || 0}`
      const seen = Number(localStorage.getItem(key) || 0)
      if (Number(d.maxId || 0) > seen) {
        localStorage.setItem(key, String(d.maxId))
        returnReminded = true
        const notify = ElNotification({
          title: '有新的退货待处理',
          message: `${d.count} 行退货（${d.billCount} 张账单）需要工厂确认退回方式，点击去处理`,
          type: 'warning',
          duration: 0,
          onClick: () => {
            notify.close()
            router.push('/order/return-process')
          },
        })
      }
    }
  } catch { /* 未登录/无权限时静默 */ }
}
const goReturnProcess = () => router.push('/order/return-process')

// ===== 退货审核提醒（工厂审核员 / 管理员） =====
const returnAudit = ref(0)
const showReturnAuditBell = computed(() => {
  const t = String(userStore.userType || '').toLowerCase()
  return t === 'factoryaudit' || t === 'admin'
})
let returnAuditTimer = null
let returnAuditReminded = false
const loadReturnAudit = async () => {
  if (!showReturnAuditBell.value) return
  try {
    const res = await getReturnAuditTodoCount()
    const d = res?.data || {}
    returnAudit.value = d.count || 0

    // ⭐ 工厂刚提交退回方式 → 弹一条提醒（点通知直达退货审核页）
    if (!returnAuditReminded && d.count) {
      const key = `returnAuditNotifiedMaxId:${userStore.userId || 0}`
      const seen = Number(localStorage.getItem(key) || 0)
      if (Number(d.maxId || 0) > seen) {
        localStorage.setItem(key, String(d.maxId))
        returnAuditReminded = true
        const notify = ElNotification({
          title: '有新的退货待审核',
          message: `${d.count} 行退货（${d.billCount} 张账单）工厂已提交退回方式，点击去审核`,
          type: 'warning',
          duration: 0,
          onClick: () => {
            notify.close()
            router.push('/order/return-audit')
          },
        })
      }
    }
  } catch { /* 未登录/无权限时静默 */ }
}
const goReturnAudit = () => router.push('/order/return-audit')

const handleMenuSelect = (index) => {
  if (!index) return
  // ⭐ 菜单路径统一成绝对路径：数据库里若存成 "order/xxx"（没有前导斜杠），
  //    router.push 会按「当前路由」做相对解析，拼成 /order/bill/order/xxx 这种错乱地址
  const target = /^https?:\/\//i.test(index)
    ? index
    : (index.startsWith('/') ? index : '/' + index)

  // ⭐ 兜底：菜单指向的页面不存在时给出提示，避免点进去白屏
  const matched = router.resolve(target).matched
  if (matched.length === 0) {
    ElMessage.warning('该菜单未配置对应页面：' + target)
    return
  }

  if (target !== currentPath.value) {
    router.push(target)
  }
}

const loadUserMenus = async () => {
  loading.value = true
  try {
    const res = await menuApi.getUserMenus()
    let data = res?.data || res || []
    if (!Array.isArray(data)) {
      data = []
    }
    const removeCompletedOrderMenu = (items) => items
      .filter(item => String(item.menuPath || '').replace(/^\/+/, '').split('?')[0] !== 'order/factory-completed')
      .map(item => Array.isArray(item.children)
        ? { ...item, children: removeCompletedOrderMenu(item.children) }
        : item)
    menuList.value = removeCompletedOrderMenu(data)
  } catch (error) {
    console.error('加载菜单失败:', error)
    menuList.value = []
  } finally {
    loading.value = false
  }
}

const addTab = (to) => {
  const title = to.meta?.title || to.name || '页面'
  const path = to.path
  // 工作台（角色首页）常驻，不可关闭
  const closable = !userStore.homePath || path !== userStore.homePath
  if (tabs.value.find(t => t.path === path)) return
  tabs.value.push({ title, path, closable, name: to.name })
  if (to.name) {
    const cachedName = Array.isArray(to.name) ? to.name[0] : to.name
    if (!cachedViews.value.includes(cachedName)) {
      cachedViews.value.push(cachedName)
    }
  }
}

const switchTab = (tab) => {
  if (tab.path !== currentPath.value) {
    router.push(tab.path)
  }
}

const closeTab = (tab) => {
  const index = tabs.value.findIndex(t => t.path === tab.path)
  if (index === -1) return
  if (tabs.value.length <= 1) {
    ElMessage.warning('至少保留一个标签页')
    return
  }
  tabs.value.splice(index, 1)
  const idx = cachedViews.value.indexOf(tab.name)
  if (idx > -1) cachedViews.value.splice(idx, 1)
  if (tab.path === currentPath.value) {
    const prev = tabs.value[index - 1] || tabs.value[0]
    if (prev) router.push(prev.path)
  }
}

const closeAll = () => {
  // 只保留角色首页标签（工作台），其余全部关闭
  const home = userStore.homePath
  cachedViews.value = []
  tabs.value = home ? tabs.value.filter(t => t.path === home) : []
  if (home && currentPath.value !== home) router.push(home)
}

const closeOthers = () => {
  const current = tabs.value.find(t => t.path === currentPath.value)
  tabs.value = current ? [current] : []
  cachedViews.value = []
}

const handleTabCommand = (cmd) => {
  if (cmd === 'close-current') {
    const current = tabs.value.find(t => t.path === currentPath.value)
    if (current) closeTab(current)
  } else if (cmd === 'close-others') {
    closeOthers()
  } else if (cmd === 'close-all') {
    closeAll()
  }
}

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const handleCommand = (cmd) => {
  if (cmd === 'logout') {
    userStore.logout()
    ElMessage.success('已退出')
    router.push('/login')
  } else if (cmd === 'profile') {
    ElMessage.info('个人中心开发中')
  }
}

watch(route, (to) => {
  addTab(to)
  scheduleMarkHScroll()
}, { immediate: true })

onMounted(async () => {
  await loadUserMenus()
  if (tabs.value.length === 0 && route.path && route.path !== '/login') {
    addTab(route)
  }
  // 退货待处理：进系统拉一次，之后每 60 秒刷新；处理完会主动通知
  loadReturnTodo()
  returnTimer = setInterval(loadReturnTodo, 60000)
  window.addEventListener('return-todo-refresh', loadReturnTodo)

  // 退货待审核：同一套机制，审核完也会主动通知
  loadReturnAudit()
  returnAuditTimer = setInterval(loadReturnAudit, 60000)
  window.addEventListener('return-audit-refresh', loadReturnAudit)

  // 表格横向滚动条：进入时标记一次，之后窗口缩放 / 内容变化自动重算
  scheduleMarkHScroll()
  window.addEventListener('resize', scheduleMarkHScroll)
  const main = document.querySelector('.layout-main')
  if (main && typeof MutationObserver !== 'undefined') {
    hScrollObserver = new MutationObserver(scheduleMarkHScroll)
    hScrollObserver.observe(main, { childList: true, subtree: true })
  }
})

onUnmounted(() => {
  if (returnTimer) clearInterval(returnTimer)
  if (returnAuditTimer) clearInterval(returnAuditTimer)
  window.removeEventListener('return-todo-refresh', loadReturnTodo)
  window.removeEventListener('return-audit-refresh', loadReturnAudit)
  if (hScrollTimer) clearTimeout(hScrollTimer)
  if (hScrollObserver) { hScrollObserver.disconnect(); hScrollObserver = null }
  window.removeEventListener('resize', scheduleMarkHScroll)
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

.layout-header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  flex-shrink: 0;
  border-bottom: 1px solid #e8ecf1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* 提醒铃铛 */
.bell-wrap { cursor: pointer; display: inline-flex; }
.bell-icon { font-size: 19px; color: #5a6b7a; cursor: pointer; transition: color .2s; }
.bell-icon:hover { color: #409eff; }
/* 退货提醒：暖色调 */
.bell-icon.bell-return { color: #d48806; margin-left: 2px; }
.bell-icon.bell-return:hover { color: #e6a23c; }
.bell-icon.bell-audit { color: #c0392b; margin-left: 2px; }
.bell-icon.bell-audit:hover { color: #e04f4f; }

.user-name {
  color: #4e5969;
  font-size: 14px;
}

.main-container {
  flex: 1;
  min-height: 0;
}

/* ===== 左侧菜单 - 白色背景 ===== */
.layout-aside {
  overflow: hidden;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid #e8ecf1;
  background: #ffffff;
}

.menu-toggle {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5a7a8a;
  cursor: pointer;
  font-size: 18px;
  border-bottom: 1px solid #e8ecf1;
  flex-shrink: 0;
  transition: color 0.3s;
}
.menu-toggle:hover {
  color: #409EFF;
}

.el-menu {
  border-right: none;
  flex: 1;
  overflow-y: auto;
  background: #ffffff !important;
}

/* ⭐ 菜单项样式 - 无间距、无圆角 */
.el-menu-item {
  height: 44px;
  line-height: 44px;
  display: flex;
  align-items: center;
  color: #5a7a8a;
  border-radius: 0 !important;
  margin: 0 !important;
  padding: 0 20px;
}

.el-menu-item:hover {
  background: #f0f2f5 !important;
  color: #409EFF;
}

.el-menu-item.is-active {
  background: #ecf5ff !important;
  color: #409EFF;
  font-weight: 600;
}

/* ⭐ 子菜单样式 - 无间距、无圆角 */
.el-sub-menu {
  margin: 0 !important;
  border-radius: 0 !important;
}

.el-sub-menu .el-sub-menu__title {
  height: 44px;
  line-height: 44px;
  color: #5a7a8a;
  border-radius: 0 !important;
  padding: 0 20px;
}

.el-sub-menu .el-sub-menu__title:hover {
  background: #f0f2f5 !important;
  color: #409EFF;
}

.el-sub-menu .el-menu-item {
  padding-left: 44px !important;
}

/* 菜单选中状态背景 */
.el-menu-item.is-active {
  background: #ecf5ff !important;
  color: #409EFF;
  font-weight: 600;
}

.right-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #f0f2f5;
}

.tabs-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e8ecf1;
  padding: 0 16px;
  height: 40px;
  flex-shrink: 0;
}

.tabs-container {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  overflow-x: auto;
  height: 100%;
}

.tabs-container::-webkit-scrollbar {
  height: 2px;
}
.tabs-container::-webkit-scrollbar-thumb {
  background: #d0d5dd;
  border-radius: 2px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  height: 32px;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  font-size: 13px;
  color: #4e5969;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  flex-shrink: 0;
}

.tab-item:hover {
  background: #f5f7fa;
  color: #1d2129;
}

.tab-item.active {
  color: #409EFF;
  border-bottom-color: #409EFF;
  background: #f0f7ff;
}

.tab-close {
  font-size: 12px;
  color: #c0c4cc;
  border-radius: 50%;
  padding: 2px;
  transition: all 0.2s;
  cursor: pointer;
}
.tab-close:hover {
  background: #d0d5dd;
  color: #1d2129;
}

.tabs-actions {
  padding-left: 12px;
  color: #86909c;
  cursor: pointer;
  font-size: 18px;
  flex-shrink: 0;
}
.tabs-actions:hover {
  color: #1d2129;
}

.layout-main {
  flex: 1;
  
  overflow-y: auto;
  min-height: 0;
}
</style>
<!-- ⭐ 表格横向滚动条统一成「我的账单」同款蓝条（全站生效）
     - Element 默认鼠标悬停才显示滚动条，这里强制常显
     - 只有真正横向溢出的表格才加底槽和底部占位（Layout 脚本打 .has-hscroll 标）-->
<style>
.el-table .el-scrollbar__bar.is-horizontal {
  display: block !important;
  height: 14px;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 0;
  background: transparent;
  z-index: 5;
}
/* 真会横向滚动的表格：淡蓝底槽，和「我的账单」一模一样 */
.el-table.has-hscroll .el-scrollbar__bar.is-horizontal {
  background: #e8f1ff;
  border-top: 1px solid #c6dcff;
}
.el-table .el-scrollbar__bar.is-horizontal > div {
  height: 100%;
  background: #2f6fd0;
  opacity: 1;
}
/* 视觉细节只给真会滚动的表格：宽度 0 时不留边框或最小宽度，避免窄表冒出小蓝点 */
.el-table.has-hscroll .el-scrollbar__bar.is-horizontal > div {
  min-width: 60px;
  border-radius: 7px;
  border: 2px solid #e8f1ff;
}
.el-table.has-hscroll .el-scrollbar__bar.is-horizontal > div:hover {
  background: #1f5bb8;
  opacity: 1;
}
/* 滚动条加高后留出占位，避免压住最后一行 */
.el-table.has-hscroll .el-table__body-wrapper .el-scrollbar__view {
  padding-bottom: 12px;
}
</style>
