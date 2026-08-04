<!-- src/components/AlertBadge.vue -->
<template>
  <el-popover
    placement="bottom"
    trigger="click"
    :width="400"
    popper-class="alert-popover"
  >
    <template #reference>
      <el-badge :value="unresolvedCount" :hidden="unresolvedCount === 0" :max="99">
        <el-icon :size="20" style="cursor:pointer;color:#666;">
          <Bell />
        </el-icon>
      </el-badge>
    </template>

    <div class="alert-list">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-weight:600;">预警信息</span>
        <el-button size="small" type="primary" link @click="loadData">刷新</el-button>
      </div>

      <div v-if="loading" style="text-align:center;padding:20px;">
        <el-icon class="is-loading"><Loading /></el-icon>
      </div>

      <div v-else-if="alerts.length === 0" style="text-align:center;padding:20px;color:#999;">
        暂无预警
      </div>

      <div v-else class="alert-items">
        <div
          v-for="item in alerts"
          :key="item.id"
          class="alert-item"
          :class="getAlertClass(item)"
          @click="viewOrder(item.orderId)"
        >
          <div class="alert-header">
            <span class="alert-type">{{ getAlertTypeName(item.alertType) }}</span>
            <span class="alert-time">{{ formatTime(item.createdAt) }}</span>
          </div>
          <div class="alert-content">
            <span class="alert-order">订单: {{ item.orderNo }}</span>
            <span class="alert-reason">{{ item.alertReason }}</span>
          </div>
          <div v-if="!item.isResolved" class="alert-actions">
            <el-button size="small" type="primary" @click.stop="handleResolve(item.id)">
              标记已处理
            </el-button>
          </div>
          <div v-else class="alert-resolved">
            <el-tag size="small" type="success">已处理</el-tag>
          </div>
        </div>
      </div>
    </div>
  </el-popover>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Bell, Loading } from '@element-plus/icons-vue';
import { getAlertList, getAlertCount, resolveAlert } from '@/api/alert';

const router = useRouter();
const loading = ref(false);
const alerts = ref([]);
const unresolvedCount = ref(0);

const alertTypeMap = {
  pending: { label: '下单超时', type: 'warning' },
  production: { label: '制作超时', type: 'danger' },
  bill: { label: '账单超时', type: 'warning' },
  manual: { label: '手工预警', type: 'danger' },
};

const getAlertTypeName = (type) => alertTypeMap[type]?.label || type;
const getAlertClass = (item) => {
  if (item.isResolved) return 'alert-resolved-item';
  return 'alert-unresolved-item';
};

const loadData = async () => {
  loading.value = true;
  try {
    const [listRes, countRes] = await Promise.all([
      getAlertList({ isResolved: false }),
      getAlertCount(),
    ]);
    alerts.value = listRes?.data || [];
    unresolvedCount.value = countRes?.count || 0;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
};

const handleResolve = async (id) => {
  try {
    await resolveAlert(id);
    ElMessage.success('预警已处理');
    loadData();
  } catch {
    ElMessage.error('操作失败');
  }
};

const viewOrder = (orderId) => {
  if (orderId) {
    router.push(`/order/detail/${orderId}`);
  }
};

const formatTime = (time) => {
  if (!time) return '-';
  const d = new Date(time);
  return d.toLocaleString('zh-CN', { hour12: false });
};

onMounted(loadData);
</script>

<style scoped>
.alert-list { max-height: 400px; overflow-y: auto; }
.alert-items { display: flex; flex-direction: column; gap: 8px; }

.alert-item {
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #e8ecf1;
  cursor: pointer;
  transition: all 0.2s;
}
.alert-item:hover { background: #f5f7fa; }

.alert-unresolved-item { border-left: 3px solid #F56C6C; }
.alert-resolved-item { border-left: 3px solid #67C23A; opacity: 0.7; }

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.alert-type {
  font-size: 12px;
  font-weight: 600;
  color: #F56C6C;
}
.alert-resolved-item .alert-type { color: #67C23A; }

.alert-time { font-size: 11px; color: #999; }

.alert-content { display: flex; gap: 12px; font-size: 13px; }
.alert-order { color: #303133; font-weight: 500; }
.alert-reason { color: #606266; }

.alert-actions { margin-top: 6px; text-align: right; }
.alert-resolved { margin-top: 4px; text-align: right; }
</style>