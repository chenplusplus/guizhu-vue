<!-- src/components/Header.vue -->
<template>
  <div class="header">
    <div class="header-left">
      <span class="menu-trigger" @click="$emit('toggle-collapse')">
        ☰
      </span>
      <span class="page-title">{{ route.meta.title || '工作台' }}</span>
    </div>

    <div class="header-right">
      <a-badge :count="pendingCount" :number-style="{ backgroundColor: '#faad14' }">
        <span class="header-icon">🔔</span>
      </a-badge>

      <a-badge :count="urgentCount" :number-style="{ backgroundColor: '#ff4d4f' }">
        <span class="header-icon">⚠️</span>
      </a-badge>

      <a-dropdown>
        <div class="user-info">
          <a-avatar size="small">
            {{ userStore.user?.realName?.[0] || userStore.user?.username?.[0] || 'U' }}
          </a-avatar>
          <span class="username">{{ userStore.user?.realName || userStore.user?.username || '用户' }}</span>
          <span class="dropdown-arrow">▼</span>
        </div>
        <template #overlay>
          <a-menu>
            <a-menu-item disabled>
              👤 {{ userStore.userTypeName || '未知角色' }}
            </a-menu-item>
            <a-menu-divider />
            <a-menu-item @click="handleLogout">
              🚪 退出登录
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { getPendingCount } from '@/api/order';
import { message } from 'ant-design-vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const pendingCount = ref(0);
const urgentCount = ref(0);

defineEmits(['toggle-collapse']);

const handleLogout = async () => {
  try {
    await userStore.logout();
    message.success('已退出登录');
    router.push('/login');
  } catch {
    message.error('退出失败');
  }
};

onMounted(async () => {
  try {
    const res = await getPendingCount();
    pendingCount.value = res?.count || 0;
  } catch {
    // 忽略错误
  }
});
</script>

<style scoped>
.header {
  height: 64px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-trigger {
  font-size: 20px;
  cursor: pointer;
  color: #666;
  transition: color 0.3s;
}

.menu-trigger:hover {
  color: #1890ff;
}

.page-title {
  font-size: 16px;
  color: #666;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  font-size: 18px;
  color: #666;
  cursor: pointer;
  transition: color 0.3s;
}

.header-icon:hover {
  color: #1890ff;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.3s;
}

.user-info:hover {
  background: #f5f5f5;
}

.username {
  font-size: 14px;
  color: #333;
}

.dropdown-arrow {
  font-size: 12px;
  color: #999;
}
</style>