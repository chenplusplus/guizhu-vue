<!-- src/views/dashboard/index.vue -->
<template>
  <div class="dashboard">
    <h2>欢迎回来，{{ userStore.realName || userStore.userName }}！</h2>
    <p style="color: #999; margin-bottom: 24px">角色：{{ userStore.userTypeName }}</p>

    <el-row :gutter="16">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover" style="border-left: 4px solid #409EFF">
          <div class="stat-number">{{ pendingCount }}</div>
          <div class="stat-label">待审核订单</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card" shadow="hover" style="border-left: 4px solid #E6A23C">
          <div class="stat-number">{{ productionCount }}</div>
          <div class="stat-label">制作中订单</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card" shadow="hover" style="border-left: 4px solid #67C23A">
          <div class="stat-number">{{ completedCount }}</div>
          <div class="stat-label">已完成订单</div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card class="stat-card" shadow="hover" style="border-left: 4px solid #F56C6C">
          <div class="stat-number">{{ urgentCount }}</div>
          <div class="stat-label">紧急订单</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷入口 -->
    <el-card style="margin-top: 16px">
      <template #header>
        <span>快捷入口</span>
      </template>
      <el-row :gutter="16">
        <el-col :span="4" v-for="item in quickActions" :key="item.path">
          <el-button plain style="width: 100%; height: 80px" @click="goTo(item.path)">
            <div style="font-size: 28px">{{ item.icon }}</div>
            <div>{{ item.title }}</div>
          </el-button>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { getStatusCount } from '@/api/order';

const router = useRouter();
const userStore = useUserStore();

const pendingCount = ref(0);
const productionCount = ref(0);
const completedCount = ref(0);
const urgentCount = ref(0);

const quickActions = computed(() => {
  const actions = [];
  const userType = userStore.userType;

  if (userType === 'customer' || userType === 'admin') {
    actions.push({ title: '下单', icon: '📝', path: '/order/create' });
    actions.push({ title: '我的订单', icon: '📋', path: '/order/my-list' });
  }

  if (userType === 'customerAudit' || userType === 'admin') {
    actions.push({ title: '客户审核', icon: '✅', path: '/order/audit' });
  }

  if (userType === 'factoryOrder' || userType === 'admin') {
    actions.push({ title: '制作管理', icon: '🔧', path: '/order/production' });
  }

  if (userType === 'factoryAudit' || userType === 'admin') {
    actions.push({ title: '工厂审核', icon: '🔍', path: '/order/factory-audit' });
  }

  if (userType === 'admin') {
    actions.push({ title: '订单管理', icon: '📋', path: '/order/list' });
    actions.push({ title: '客户管理', icon: '👥', path: '/customer/list' });
    actions.push({ title: '用户管理', icon: '👤', path: '/system/user' });
  }

  return actions;
});

const goTo = (path) => {
  router.push(path);
};

const loadStats = async () => {
  try {
    const res = await getStatusCount();
    const data = res?.data || {};
    pendingCount.value = data.pending || 0;
    productionCount.value = data.producing || 0;
    completedCount.value = data.completed || 0;
    urgentCount.value = data.urgent || 0;
  } catch {
    // 使用模拟数据
    pendingCount.value = 5;
    productionCount.value = 3;
    completedCount.value = 12;
    urgentCount.value = 1;
  }
};

onMounted(() => {
  loadStats();
});
</script>

<style scoped>
.dashboard {
  padding: 4px;
}
.stat-card {
  text-align: center;
  padding: 8px 0;
}
.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}
.stat-label {
  color: #999;
  font-size: 14px;
  margin-top: 8px;
}
</style>