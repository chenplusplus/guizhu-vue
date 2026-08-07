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
          background-color="#e8f4f8"
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
import { menuApi } from '@/api/menu'

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

const handleMenuSelect = (index) => {
  if (index && index !== currentPath.value) {
    router.push(index)
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
    menuList.value = data
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

onMounted(async () => {
  await loadUserMenus()
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

.main-container {
  flex: 1;
  min-height: 0;
}

/* ===== 左侧菜单 - 淡蓝色风格 ===== */
.layout-aside {
  overflow: hidden;
  transition: width 0.3s;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid #d4e8f0;
}

.menu-toggle {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #5a7a8a;
  cursor: pointer;
  font-size: 18px;
  border-bottom: 1px solid #d4e8f0;
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
}

/* 菜单项样式 */
.el-menu-item {
  height: 44px;
  line-height: 44px;
  display: flex;
  align-items: center;
  color: #5a7a8a;
  border-radius: 6px;
  margin: 2px 8px;
}

.el-menu-item:hover {
  background: #d4e8f0 !important;
  color: #409EFF;
}

.el-menu-item.is-active {
  background: #b5d9e8 !important;
  color: #409EFF;
  font-weight: 600;
}

/* 子菜单样式 */
.el-sub-menu {
  margin: 2px 8px;
  border-radius: 6px;
}

.el-sub-menu .el-sub-menu__title {
  height: 44px;
  line-height: 44px;
  color: #5a7a8a;
  border-radius: 6px;
}

.el-sub-menu .el-sub-menu__title:hover {
  background: #d4e8f0 !important;
  color: #409EFF;
}

.el-sub-menu .el-menu-item {
  padding-left: 40px !important;
}

/* 菜单选中状态背景 */
.el-menu-item.is-active {
  background: #b5d9e8 !important;
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
  padding: 16px 20px;
  overflow-y: auto;
  min-height: 0;
}
</style>