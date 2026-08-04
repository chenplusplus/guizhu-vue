<!-- src/views/dashboard/index.vue -->
<template>
  <div class="dashboard">
    <!-- ===== 顶部欢迎区域 ===== -->
    <div class="welcome-section">
      <div class="welcome-left">
        <h1>👋 欢迎回来，{{ userStore.realName || userStore.username || '用户' }}</h1>
        <p class="welcome-sub">{{ greeting }}，今天是个好日子</p>
      </div>
      <div class="welcome-right">
        <span class="date-display">{{ currentDate }}</span>
        <span class="weekday">{{ currentWeekday }}</span>
      </div>
    </div>

    <!-- ===== 统计卡片 ===== -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <div class="stat-card stat-card-warning" @click="goTo('/order/audit')">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.pendingOrders || 0 }}</div>
            <div class="stat-label">待审核订单</div>
          </div>
          <div class="stat-trend" v-if="stats.pendingOrders > 0">需处理</div>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="stat-card stat-card-primary" @click="goTo('/order/factory-list')">
          <div class="stat-icon">🔧</div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.producingOrders || 0 }}</div>
            <div class="stat-label">制作中订单</div>
          </div>
          <div class="stat-trend" v-if="stats.producingOrders > 0">进行中</div>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="stat-card stat-card-warning" @click="goTo('/order/bill/my-list')">
          <div class="stat-icon">📄</div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.pendingBills || 0 }}</div>
            <div class="stat-label">待确认账单</div>
          </div>
          <div class="stat-trend" v-if="stats.pendingBills > 0">需确认</div>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="stat-card stat-card-danger" @click="goTo('/order/alert')">
          <div class="stat-icon">⚠️</div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.alertCount || 0 }}</div>
            <div class="stat-label">预警信息</div>
          </div>
          <div class="stat-trend" v-if="stats.alertCount > 0" style="background:#F56C6C;">
            需关注
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- ===== 待办 + 预警 ===== -->
    <el-row :gutter="16" class="todo-row">
      <!-- 待办事项 -->
      <el-col :span="12">
        <el-card class="todo-card" shadow="hover" body-style="padding: 0;">
          <template #header>
            <div class="card-header">
              <span>📋 待办事项</span>
              <el-button size="small" type="primary" link @click="goTo('/order/audit')">
                查看全部 →
              </el-button>
            </div>
          </template>
          <div class="todo-list">
            <div v-if="todoList.length === 0" class="empty-state">
              <el-icon :size="40"><Check /></el-icon>
              <span>暂无待办，继续保持！</span>
            </div>
            <div
              v-for="item in todoList.slice(0, 5)"
              :key="item.id"
              class="todo-item"
              @click="goTo(item.path)"
            >
              <div class="todo-dot" :class="item.type"></div>
              <div class="todo-content">
                <span class="todo-title">{{ item.title }}</span>
                <span class="todo-desc">{{ item.desc }}</span>
              </div>
              <el-tag :type="item.tagType" size="small">{{ item.tagText }}</el-tag>
            </div>
            <div v-if="todoList.length > 5" class="todo-more">
              <el-button text @click="goTo('/order/audit')">还有 {{ todoList.length - 5 }} 项待办...</el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 预警信息 -->
      <el-col :span="12">
        <el-card class="alert-card" shadow="hover" body-style="padding: 0;">
          <template #header>
            <div class="card-header">
              <span>⚠️ 预警信息</span>
              <el-button size="small" type="danger" link @click="goTo('/order/alert')">
                查看全部 →
              </el-button>
            </div>
          </template>
          <div class="alert-list">
            <div v-if="alertList.length === 0" class="empty-state">
              <el-icon :size="40"><SuccessFilled /></el-icon>
              <span style="color:#67C23A;">暂无预警，一切正常</span>
            </div>
            <div
              v-for="item in alertList.slice(0, 5)"
              :key="item.id"
              class="alert-item"
              @click="goTo(`/order/detail/${item.orderId}`)"
            >
              <div class="alert-icon" :class="item.alertType">
                {{ item.alertType === 'pending' ? '🟡' : item.alertType === 'production' ? '🔴' : item.alertType === 'bill' ? '🟡' : '🔴' }}
              </div>
              <div class="alert-content">
                <span class="alert-title">{{ item.orderNo }}</span>
                <span class="alert-desc">{{ item.alertReason }}</span>
              </div>
              <span class="alert-time">{{ formatTime(item.createdAt) }}</span>
            </div>
            <div v-if="alertList.length > 5" class="alert-more">
              <el-button text @click="goTo('/order/alert')">还有 {{ alertList.length - 5 }} 条预警...</el-button>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ===== 快捷入口 ===== -->
    <el-card class="quick-card" shadow="hover">
      <template #header>
        <span>🚀 快捷入口</span>
      </template>
      <div class="quick-grid">
        <div
          v-for="item in quickActions"
          :key="item.path"
          class="quick-item"
          @click="goTo(item.path)"
        >
          <div class="quick-icon" :style="{ background: item.bgColor }">
            <span style="font-size:28px;">{{ item.icon }}</span>
          </div>
          <span class="quick-label">{{ item.label }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { getStatusCount, getPendingCount } from '@/api/order';
import { getAlertList, getAlertCount } from '@/api/alert';
import { getBillList } from '@/api/bill';
import { Check, SuccessFilled } from '@element-plus/icons-vue';

const router = useRouter();
const userStore = useUserStore();

// ===== 统计数据 =====
const stats = ref({
  pendingOrders: 0,
  producingOrders: 0,
  pendingBills: 0,
  alertCount: 0,
});

// ===== 待办列表 =====
const todoList = ref([]);
const alertList = ref([]);

// ===== 日期 =====
const now = new Date();
const currentDate = computed(() => {
  return now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
});
const currentWeekday = computed(() => {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return weekdays[now.getDay()];
});

const greeting = computed(() => {
  const hour = now.getHours();
  if (hour < 6) return '夜深了，注意休息';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了，注意休息';
});

// ===== 快捷入口 =====
const quickActions = computed(() => {
  const userType = userStore.userType;
  const actions = [];

  if (userType === 'customer' || userType === 'admin') {
    actions.push({ icon: '📝', label: '下单', path: '/order/create', bgColor: '#E6F7FF' });
    actions.push({ icon: '📋', label: '我的订单', path: '/order/my-list', bgColor: '#F6FFED' });
  }

  if (userType === 'customerAudit' || userType === 'admin') {
    actions.push({ icon: '✅', label: '订单审核', path: '/order/audit', bgColor: '#FFF7E6' });
  }

  if (userType === 'factoryOrder' || userType === 'admin') {
    actions.push({ icon: '🏭', label: '工厂订单', path: '/order/factory-list', bgColor: '#E6F7FF' });
    actions.push({ icon: '📄', label: '生成账单', path: '/order/bill/create', bgColor: '#F6FFED' });
  }

  if (userType === 'factoryAudit' || userType === 'admin') {
    actions.push({ icon: '🔍', label: '账单审核', path: '/order/bill/audit', bgColor: '#FFF7E6' });
  }

  if (userType === 'customer' || userType === 'customerAudit' || userType === 'admin') {
    actions.push({ icon: '📄', label: '我的账单', path: '/order/bill/my-list', bgColor: '#F0F5FF' });
  }

  if (userType === 'admin') {
    actions.push({ icon: '👤', label: '用户管理', path: '/system/user', bgColor: '#F9F0FF' });
    actions.push({ icon: '📊', label: '账单统计', path: '/bill/stats', bgColor: '#E6FFFA' });
  }

  return actions;
});

// ============================================================
// 加载数据
// ============================================================
const loadStats = async () => {
  try {
    // 获取待审核订单数
    const pendingRes = await getPendingCount('customer');
    stats.value.pendingOrders = pendingRes?.count || 0;

    // 获取制作中订单数
    const statusRes = await getStatusCount();
    const statusData = statusRes?.data || {};
    stats.value.producingOrders = (statusData.producing || 0) + (statusData.accepted || 0);

    // 获取待确认账单数
    const billRes = await getBillList({ status: 'approved' });
    stats.value.pendingBills = billRes?.data?.length || 0;

    // 获取预警数
    const alertRes = await getAlertCount();
    stats.value.alertCount = alertRes?.count || 0;
  } catch {
    // 静默失败
  }
};

const loadTodoList = async () => {
  const items = [];

  try {
    // 待审核订单
    const pendingRes = await getPendingCount('customer');
    const pendingCount = pendingRes?.count || 0;
    if (pendingCount > 0) {
      items.push({
        id: 'todo-pending',
        title: `订单审核`,
        desc: `${pendingCount} 个订单待审核`,
        type: 'warning',
        tagType: 'warning',
        tagText: `${pendingCount}项`,
        path: '/order/audit',
      });
    }
  } catch {}

  try {
    // 待确认账单
    const billRes = await getBillList({ status: 'approved' });
    const billCount = billRes?.data?.length || 0;
    if (billCount > 0) {
      items.push({
        id: 'todo-bill',
        title: `账单确认`,
        desc: `${billCount} 个账单待确认`,
        type: 'primary',
        tagType: 'primary',
        tagText: `${billCount}项`,
        path: '/order/bill/my-list',
      });
    }
  } catch {}

  // 如果没有待办，加一条鼓励信息
  if (items.length === 0) {
    items.push({
      id: 'todo-empty',
      title: '🎉 暂无待办',
      desc: '所有工作都已处理完毕，继续保持！',
      type: 'success',
      tagType: 'success',
      tagText: '已完成',
      path: '/dashboard',
    });
  }

  todoList.value = items;
};

const loadAlertList = async () => {
  try {
    const res = await getAlertList({ isResolved: false });
    alertList.value = res?.data || [];
  } catch {
    alertList.value = [];
  }
};

// ============================================================
// 跳转
// ============================================================
const goTo = (path) => {
  if (path) router.push(path);
};

// ============================================================
// 时间格式化
// ============================================================
const formatTime = (time) => {
  if (!time) return '-';
  const d = new Date(time);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000 / 60);
  if (diff < 1) return '刚刚';
  if (diff < 60) return `${diff}分钟前`;
  if (diff < 1440) return `${Math.floor(diff / 60)}小时前`;
  return `${Math.floor(diff / 1440)}天前`;
};

// ============================================================
// 初始化
// ============================================================
onMounted(() => {
  loadStats();
  loadTodoList();
  loadAlertList();
});
</script>

<style scoped>
.dashboard {
  background: #f0f2f5;
  min-height: 100%;
  padding: 16px 20px;
}

/* ===== 欢迎区域 ===== */
.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 20px 24px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.welcome-left h1 {
  font-size: 22px;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 4px 0;
}

.welcome-sub {
  color: #86909c;
  font-size: 14px;
  margin: 0;
}

.welcome-right {
  text-align: right;
}

.date-display {
  font-size: 16px;
  font-weight: 500;
  color: #1d2129;
  display: block;
}

.weekday {
  font-size: 13px;
  color: #86909c;
}

/* ===== 统计卡片 ===== */
.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.stat-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.stat-card-warning::before { background: #E6A23C; }
.stat-card-primary::before { background: #409EFF; }
.stat-card-success::before { background: #67C23A; }
.stat-card-danger::before { background: #F56C6C; }

.stat-icon {
  font-size: 32px;
  line-height: 1;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #1d2129;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #86909c;
}

.stat-trend {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px;
  background: #f0f2f5;
  color: #86909c;
}

/* ===== 待办 + 预警 ===== */
.todo-row {
  margin-bottom: 16px;
}

.todo-card,
.alert-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 48px;
  font-weight: 600;
  font-size: 15px;
}

.todo-list,
.alert-list {
  padding: 8px 0;
  max-height: 340px;
  overflow-y: auto;
}

.todo-item,
.alert-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f5f7fa;
}

.todo-item:hover,
.alert-item:hover {
  background: #f7f9fc;
}

.todo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.todo-dot.warning { background: #E6A23C; }
.todo-dot.primary { background: #409EFF; }
.todo-dot.success { background: #67C23A; }
.todo-dot.danger { background: #F56C6C; }

.todo-content,
.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.todo-title {
  font-size: 14px;
  font-weight: 500;
  color: #1d2129;
}

.todo-desc {
  font-size: 13px;
  color: #86909c;
}

.alert-title {
  font-size: 14px;
  font-weight: 500;
  color: #1d2129;
}

.alert-desc {
  font-size: 13px;
  color: #86909c;
}

.alert-time {
  font-size: 12px;
  color: #c0c4cc;
  flex-shrink: 0;
}

.alert-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.todo-more,
.alert-more {
  padding: 8px 20px;
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: #c0c4cc;
  gap: 8px;
}
.empty-state .el-icon {
  color: #d0d5dd;
}
.empty-state span {
  font-size: 14px;
  color: #86909c;
}

/* ===== 快捷入口 ===== */
.quick-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.quick-card :deep(.el-card__header) {
  padding: 12px 20px;
  font-weight: 600;
  font-size: 15px;
  border-bottom: 1px solid #f0f2f5;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
  padding: 4px 0;
}

.quick-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 12px 8px;
  border-radius: 8px;
  transition: all 0.3s;
}

.quick-item:hover {
  background: #f5f7fa;
  transform: translateY(-2px);
}

.quick-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.quick-label {
  font-size: 13px;
  color: #4e5969;
  text-align: center;
}

/* 滚动条美化 */
.todo-list::-webkit-scrollbar,
.alert-list::-webkit-scrollbar {
  width: 4px;
}

.todo-list::-webkit-scrollbar-thumb,
.alert-list::-webkit-scrollbar-thumb {
  background: #d0d5dd;
  border-radius: 2px;
}
</style>