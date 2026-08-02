<!-- src/components/ProductionStatusSelector.vue -->
<template>
  <div class="status-selector">
    <el-select
      v-model="selectedStatus"
      placeholder="选择下一个状态"
      style="width: 200px"
      @change="handleStatusChange"
    >
      <el-option
        v-for="status in availableStatuses"
        :key="status.value"
        :label="status.label"
        :value="status.value"
        :disabled="status.disabled"
      >
        <span>
          <span v-if="status.icon" style="margin-right: 8px;">{{ status.icon }}</span>
          {{ status.label }}
        </span>
      </el-option>
    </el-select>
    <el-button type="primary" @click="confirmUpdate" :loading="loading">
      更新状态
    </el-button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const props = defineProps({
  currentStatus: { type: String, required: true },
  orderId: { type: Number, required: true },
});

const emit = defineEmits(['updated']);

const loading = ref(false);
const selectedStatus = ref('');

// 所有状态列表
const allStatuses = [
  { value: 'accepted', label: '已接单', icon: '📋' },
  { value: 'dataConfirm', label: '数据确认', icon: '✅' },
  { value: 'waxing', label: '出蜡', icon: '🕯️' },
  { value: 'molded', label: '已倒模', icon: '🏺' },
  { value: 'cnc', label: 'CNC', icon: '⚙️' },
  { value: 'partsMissing', label: '配件缺失', icon: '🔧' },
  { value: 'stoneReady', label: '配石完成', icon: '💎' },
  { value: 'setting', label: '执模', icon: '🔨' },
  { value: 'glue', label: '滴胶/磨石', icon: '💧' },
  { value: 'inlay', label: '镶嵌', icon: '💍' },
  { value: 'assembly', label: '组装', icon: '🔩' },
  { value: 'polishing', label: '抛光', icon: '✨' },
  { value: 'scrapped', label: '报废', icon: '💀' },
  { value: 'unqualifiedReturn', label: '不合格退回', icon: '↩️' },
];

// 可用状态（当前状态之后的状态）
const availableStatuses = computed(() => {
  const flowOrder = [
    'accepted', 'dataConfirm', 'waxing', 'molded', 'cnc',
    'partsMissing', 'stoneReady', 'setting', 'glue',
    'inlay', 'assembly', 'polishing'
  ];

  const currentIndex = flowOrder.indexOf(props.currentStatus);
  const result = [];

  // 始终允许跳转到后续状态
  allStatuses.forEach(status => {
    const statusIndex = flowOrder.indexOf(status.value);
    if (statusIndex > currentIndex || status.value === 'scrapped' || status.value === 'unqualifiedReturn') {
      result.push({
        ...status,
        disabled: false,
      });
    } else if (status.value === props.currentStatus) {
      result.push({
        ...status,
        disabled: true,
        label: `${status.label} (当前)`,
      });
    }
  });

  return result;
});

const handleStatusChange = () => {
  // 选择后自动触发更新
};

const confirmUpdate = async () => {
  if (!selectedStatus.value) {
    ElMessage.warning('请选择状态');
    return;
  }

  const statusLabel = allStatuses.find(s => s.value === selectedStatus.value)?.label || selectedStatus.value;

  // 如果是报废或不合格退回，需要二次确认
  if (selectedStatus.value === 'scrapped' || selectedStatus.value === 'unqualifiedReturn') {
    try {
      await ElMessageBox.confirm(
        `确定要将订单标记为 ${statusLabel} 吗？此操作不可逆！`,
        '警告',
        { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' }
      );
    } catch {
      return;
    }
  }

  loading.value = true;
  try {
    await updateProduction(props.orderId, { status: selectedStatus.value, step: 0 });
    ElMessage.success(`状态已更新为：${statusLabel}`);
    selectedStatus.value = '';
    emit('updated');
  } catch (error) {
    ElMessage.error(error.message || '更新失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.status-selector {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>