<!-- src/components/layout/Sidebar.vue -->
<template>
  <div class="sidebar">
    <div class="logo">
      <span>💎 珠宝系统</span>
    </div>
    <div class="menu">
      <div
        v-for="item in menuList"
        :key="item.menuId || item.path"
        class="menu-item"
        :class="{ active: isActive(item.menuPath || item.path) }"
        @click="goTo(item.menuPath || item.path)"
      >
        <span class="menu-icon">{{ item.menuIcon || '📄' }}</span>
        <span>{{ item.menuName || item.title || '未命名' }}</span>
      </div>
      <div v-if="!loading && menuList.length === 0" style="color:#666;padding:20px;text-align:center;font-size:13px;">
        暂无菜单权限
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { menuApi } from '@/api/menu';
import { ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();
const menuList = ref([]);
const loading = ref(false);

const isActive = (path) => {
  if (!path) return false;
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
};

const goTo = (path) => {
  if (path) {
    router.push(path);
  }
};

const loadUserMenus = async () => {
  loading.value = true;
  try {
    const res = await menuApi.getUserMenus();
    // 安全处理：确保返回的是数组
    let data = res?.data || res || [];
    if (!Array.isArray(data)) {
      data = [];
    }
    // 扁平化树形菜单
    menuList.value = flattenMenus(data);
  } catch (error) {
    console.error('加载菜单失败:', error);
    // 使用默认菜单
    menuList.value = [
      { menuId: 1, menuName: '工作台', menuPath: '/dashboard', menuIcon: '📊' },
    ];
  } finally {
    loading.value = false;
  }
};

// 扁平化树形菜单
const flattenMenus = (menus) => {
  const result = [];
  const walk = (items) => {
    if (!items || !Array.isArray(items)) return;
    for (const item of items) {
      result.push(item);
      if (item.children && Array.isArray(item.children)) {
        walk(item.children);
      }
    }
  };
  walk(menus);
  return result;
};

onMounted(() => {
  loadUserMenus();
});
</script>

<style scoped>
.sidebar {
  height: 100vh;
  background: #001529;
  color: #fff;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.menu {
  flex: 1;
  padding: 16px 8px;
  overflow-y: auto;
}

.menu-item {
  padding: 12px 16px;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: background 0.3s;
  color: rgba(255, 255, 255, 0.65);
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.menu-item.active {
  background: #1890ff;
  color: #fff;
}

.menu-icon {
  font-size: 16px;
}
</style>