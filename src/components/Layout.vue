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
          background-color="#001529"
          text-color="#a7b1c2"
          active-text-color="#ffffff"
          @select="handleMenuSelect"
        >
          <el-menu-item v-for="item in menuData" :key="item.path" :index="item.path">
            <span style="font-size:18px;margin-right:8px;">{{ item.icon }}</span>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- ===== 右侧内容 ===== -->
      <div class="right-container">
        <!-- Tabs 栏 -->
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

        <!-- 页面内容 -->
        <div class="layout-main">
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
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { Fold, Expand, Close, More } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)
const tabs = ref([])
const cachedViews = ref([])

// ===== 菜单数据 =====
const menuData = computed(() => {
  const userType = userStore.userType || 'admin'
  const menus = []

  // ===== 工作台 - 所有人可见 =====
  menus.push({ path: '/dashboard', title: '工作台', icon: '📊' })

  // ===== 客户下单员 =====
  if (userType === 'customer' || userType === 'admin') {
    menus.push({ path: '/order/create', title: '下单', icon: '📝' })
    menus.push({ path: '/order/my-list', title: '我的订单', icon: '📋' })
    menus.push({ path: '/order/bill/my-list', title: '我的账单', icon: '📄' })
  }

  // ===== 客户审核员 =====
  if (userType === 'customerAudit' || userType === 'admin') {
    menus.push({ path: '/order/audit', title: '客户审核', icon: '✅' })
    menus.push({ path: '/order/my-list', title: '订单列表', icon: '📋' })
    menus.push({ path: '/order/bill/my-list', title: '我的账单', icon: '📄' })
  }

  // ===== 工厂业务员 =====
  if (userType === 'factoryOrder' || userType === 'admin') {
    menus.push({ path: '/order/factory-list', title: '工厂订单', icon: '🏭' })
    menus.push({ path: '/order/production', title: '制作管理', icon: '🔧' })
    menus.push({ path: '/order/my-list', title: '订单列表', icon: '📋' })
    menus.push({ path: '/order/bill/create', title: '生成账单', icon: '📄' })
  }

  // ===== 工厂审核员 =====
  if (userType === 'factoryAudit' || userType === 'admin') {
    menus.push({ path: '/order/factory-audit', title: '工厂审核', icon: '🔍' })
    menus.push({ path: '/order/my-list', title: '订单列表', icon: '📋' })
    menus.push({ path: '/order/bill/audit', title: '账单审核', icon: '📄' })
  }

  // ===== 管理员专属 =====
  if (userType === 'admin') {
    menus.push({ path: '/order/list', title: '订单管理', icon: '📋' })
    menus.push({ path: '/customer/list', title: '客户管理', icon: '👥' })
    menus.push({ path: '/system/user', title: '用户管理', icon: '👤' })
    menus.push({ path: '/system/menu', title: '菜单管理', icon: '📂' })
    menus.push({ path: '/system/role', title: '角色管理', icon: '🔑' })
  }

  return menus
})

const currentPath = computed(() => route.path)
const activeMenu = computed(() => route.path)

const handleMenuSelect = (index) => {
  if (index && index !== currentPath.value) {
    router.push(index)
  }
}

// ===== Tabs 管理 =====
const addTab = (to) => {
  const title = to.meta?.title || to.name || '页面'
  const path = to.path
  const closable = path !== '/dashboard'
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
  const dashboard = tabs.value.find(t => t.path === '/dashboard')
  tabs.value = dashboard ? [dashboard] : []
  cachedViews.value = []
  if (dashboard) router.push('/dashboard')
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
}, { immediate: true })

onMounted(() => {
  if (tabs.value.length === 0 && route.path && route.path !== '/login') {
    addTab(route)
  }
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

/* ===== 顶部导航 ===== */
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

.user-name {
  color: #4e5969;
  font-size: 14px;
}

/* ===== 主体区域 ===== */
.main-container {
  flex: 1;
  min-height: 0;
}

/* ===== 左侧菜单 ===== */
.layout-aside {
  background: #001529;
  overflow: hidden;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.menu-toggle {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a7b1c2;
  cursor: pointer;
  font-size: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
  transition: color 0.3s;
}
.menu-toggle:hover {
  color: #fff;
}

.el-menu {
  border-right: none;
  flex: 1;
  overflow-y: auto;
}
.el-menu-item {
  height: 44px;
  line-height: 44px;
  display: flex;
  align-items: center;
}
.el-menu-item.is-active {
  background-color: rgba(64, 158, 255, 0.2) !important;
}

/* ===== 右侧容器 ===== */
.right-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #f0f2f5;
}

/* ===== Tabs 栏 ===== */
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

/* ===== 主内容 ===== */
.layout-main {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
  min-height: 0;
}
</style>