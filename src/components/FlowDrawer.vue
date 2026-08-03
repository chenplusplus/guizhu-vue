<!-- src/components/FlowDrawer.vue -->
<template>
  <el-drawer
    v-model="visible"
    :title="`流程节点 - ${orderNo}`"
    direction="rtl"
    size="480px"
    destroy-on-close
  >
    <div class="flow-drawer" v-loading="loading">
      <!-- 当前状态 -->
      <div class="flow-header">
        <span class="status-label">当前状态：</span>
        <el-tag :type="statusTagType" size="large">{{ currentStepName }}</el-tag>
      </div>

      <!-- 纵向步骤 -->
      <div class="flow-timeline">
        <div
          v-for="(step, index) in stepStatusList"
          :key="step.key"
          class="timeline-item"
          :class="{
            'is-completed': step.status === 'completed',
            'is-current': step.status === 'current',
            'is-pending': step.status === 'pending'
          }"
        >
          <!-- 连接线 -->
          <div v-if="index > 0" class="timeline-line" :class="{ 'line-active': step.status !== 'pending' }" />

          <!-- 节点 -->
          <div class="timeline-node">
            <el-icon v-if="step.status === 'completed'" class="node-icon"><Check /></el-icon>
            <span v-else-if="step.status === 'current'" class="node-number current">{{ index + 1 }}</span>
            <span v-else class="node-number pending">{{ index + 1 }}</span>
          </div>

          <!-- 内容 -->
          <div class="timeline-content">
            <div class="content-header">
              <span class="step-name">{{ step.label }}</span>
              <span class="step-badge">
                <span v-if="step.status === 'completed'" class="badge-completed">✅ 已完成</span>
                <span v-else-if="step.status === 'current'" class="badge-current">● 进行中</span>
                <span v-else class="badge-pending">○ 待处理</span>
              </span>
            </div>
            <!-- ⭐ 节点时间 -->
            <div v-if="step.time" class="step-time">🕐 {{ step.time }}</div>
            <div v-if="step.operator" class="step-operator">👤 {{ step.operator }}</div>
          </div>
        </div>
      </div>

      <!-- 无数据 -->
      <el-empty v-if="stepStatusList.length === 0" description="暂无流程数据" :image-size="80" />
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Check } from '@element-plus/icons-vue';
import { getOrderDetail } from '@/api/order';

const props = defineProps({
  orderId: { type: Number, required: true },
  orderNo: { type: String, default: '' },
  currentStatus: { type: String, default: '' },
  modelValue: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'refresh']);

const loading = ref(false);
const visible = ref(false);
const orderData = ref(null);

// ===== 状态映射（第一个改成"下单"） =====
const statusMap = {
  pending: { label: '下单', color: 'info', step: 0 },
  customerAudited: { label: '客户已审核', color: 'success', step: 1 },
  accepted: { label: '已接单', color: 'primary', step: 2 },
  dataConfirm: { label: '数据确认', color: 'primary', step: 3 },
  waxing: { label: '出蜡', color: 'primary', step: 4 },
  molded: { label: '倒模', color: 'primary', step: 5 },
  cnc: { label: 'CNC', color: 'primary', step: 6 },
  partsMissing: { label: '配件缺失', color: 'warning', step: 7 },
  stoneReady: { label: '配石完成', color: 'primary', step: 8 },
  setting: { label: '执模', color: 'primary', step: 9 },
  glue: { label: '滴胶/磨石', color: 'primary', step: 10 },
  inlay: { label: '镶嵌', color: 'primary', step: 11 },
  assembly: { label: '组装', color: 'primary', step: 12 },
  polishing: { label: '抛光', color: 'primary', step: 13 },
  billPending: { label: '账单待审核', color: 'warning', step: 14 },
  billConfirmed: { label: '客户已确认', color: 'success', step: 15 },
  completed: { label: '已完成', color: 'success', step: 16 },
  scrapped: { label: '已报废', color: 'danger', step: -1 },
  rejected: { label: '已驳回', color: 'danger', step: -1 },
  cancelled: { label: '已取消', color: 'info', step: -1 },
};

// 工厂流转顺序
const factoryFlow = [
  'accepted', 'dataConfirm', 'waxing', 'molded', 'cnc',
  'partsMissing', 'stoneReady', 'setting', 'glue',
  'inlay', 'assembly', 'polishing'
];

// ===== 步骤列表（带时间和操作人） =====
const stepStatusList = computed(() => {
  const status = orderData.value?.flowStatus || props.currentStatus || 'pending';
  
  const steps = [
    { key: 'pending', label: '下单' },
    { key: 'customerAudited', label: '客户已审核' },
    ...factoryFlow.map(key => ({ key, label: statusMap[key]?.label || key })),
    { key: 'billPending', label: '账单待审核' },
    { key: 'billConfirmed', label: '客户已确认' },
    { key: 'completed', label: '已完成' },
  ];

  const currentIdx = steps.findIndex(s => s.key === status);
  const isAbnormal = ['scrapped', 'rejected', 'cancelled'].includes(status);

  // ⭐ 模拟时间数据（实际应从后端获取）
  const now = new Date();
  const mockTimes = {
    'pending': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    'customerAudited': new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    'accepted': new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    'dataConfirm': new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
  };
  const mockOperators = {
    'pending': '张飞',
    'customerAudited': '李四',
    'accepted': '王五',
  };

  return steps.map((step, index) => {
    let stepStatus = 'pending';
    if (isAbnormal) {
      stepStatus = index <= currentIdx ? 'completed' : 'pending';
    } else if (index < currentIdx) {
      stepStatus = 'completed';
    } else if (index === currentIdx) {
      stepStatus = 'current';
    } else {
      stepStatus = 'pending';
    }

    // ⭐ 根据状态生成时间
    let time = null;
    let operator = null;
    
    // 如果已完成或当前，显示时间
    if (stepStatus === 'completed' || stepStatus === 'current') {
      // 从 orderData 中获取实际时间（如果有）
      const statusKey = step.key;
      if (orderData.value) {
        // 根据状态获取对应的时间字段
        const timeMap = {
          'pending': orderData.value.createdAt,
          'customerAudited': orderData.value.customerAuditedAt,
          'accepted': orderData.value.acceptedAt,
        };
        const rawTime = timeMap[statusKey];
        if (rawTime) {
          time = formatTime(rawTime);
        } else {
          // 模拟时间
          const mockTime = mockTimes[statusKey];
          if (mockTime) {
            time = formatTime(mockTime);
          }
        }
      }
      
      // 操作人（从 orderData 获取或模拟）
      if (orderData.value) {
        const operatorMap = {
          'pending': orderData.value.submittedByName || '张飞',
          'customerAudited': orderData.value.customerAuditedByName || '李四',
          'accepted': orderData.value.acceptedByName || '王五',
        };
        operator = operatorMap[step.key] || mockOperators[step.key] || '系统';
      }
    }

    return { ...step, status: stepStatus, time, operator };
  });
});

const currentStepName = computed(() => {
  const status = orderData.value?.flowStatus || props.currentStatus || 'pending';
  return statusMap[status]?.label || status;
});

const statusTagType = computed(() => {
  const status = orderData.value?.flowStatus || props.currentStatus || 'pending';
  return statusMap[status]?.color || 'info';
});

// ===== 格式化时间 =====
const formatTime = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toLocaleString('zh-CN', { hour12: false });
};

// ===== 加载数据 =====
const loadFlowData = async () => {
  if (!props.orderId) return;
  loading.value = true;
  try {
    const res = await getOrderDetail(props.orderId);
    if (res?.data) {
      orderData.value = res.data;
    }
  } catch {
    ElMessage.error('加载流程数据失败');
  } finally {
    loading.value = false;
  }
};

// ===== 监听 =====
watch(() => props.modelValue, (val) => {
  visible.value = val;
  if (val) loadFlowData();
});

watch(visible, (val) => emit('update:modelValue', val));

watch(() => props.currentStatus, (val) => {
  if (val && orderData.value) {
    orderData.value.flowStatus = val;
  }
});
</script>

<style scoped>
.flow-drawer {
  padding: 8px 4px;
  max-height: 70vh;
  overflow-y: auto;
}

.flow-header {
  display: flex;
  align-items: center;
  padding: 12px 0 20px 0;
  gap: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.status-label {
  font-weight: 500;
  color: #606266;
}

/* ===== 纵向时间线 ===== */
.flow-timeline {
  padding: 16px 0 8px 0;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 20px;
  position: relative;
  padding-left: 4px;
}

/* 连接线 */
.timeline-line {
  position: absolute;
  left: 15px;
  top: 32px;
  width: 2px;
  height: calc(100% - 12px);
  background: #e8ecf1;
  z-index: 0;
}

.timeline-line.line-active {
  background: #67C23A;
}

/* 节点圆圈 */
.timeline-node {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  border: 2px solid #dcdfe6;
  background: #f5f7fa;
  transition: all 0.3s;
}

.timeline-item.is-completed .timeline-node {
  background: #67C23A;
  border-color: #67C23A;
}

.timeline-item.is-current .timeline-node {
  background: #409EFF;
  border-color: #409EFF;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2);
  transform: scale(1.05);
}

.timeline-item.is-pending .timeline-node {
  background: #f5f7fa;
  border-color: #dcdfe6;
}

.node-icon {
  color: #fff;
  font-size: 16px;
}

.node-number {
  font-size: 14px;
  font-weight: 600;
}

.node-number.current {
  color: #fff;
}

.node-number.pending {
  color: #c0c4cc;
}

/* 内容区域 */
.timeline-content {
  flex: 1;
  padding-top: 2px;
  min-width: 0;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
}

.step-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.step-badge {
  font-size: 12px;
}

.badge-completed {
  color: #67C23A;
}

.badge-current {
  color: #409EFF;
  font-weight: 600;
}

.badge-pending {
  color: #c0c4cc;
}

.step-time {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.step-operator {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* 已完成项的样式 */
.timeline-item.is-completed .step-name {
  color: #67C23A;
}

/* 当前项的样式 */
.timeline-item.is-current .step-name {
  color: #409EFF;
  font-weight: 600;
}

/* 待处理项的样式 */
.timeline-item.is-pending .step-name {
  color: #999;
}

/* 滚动条 */
.flow-drawer::-webkit-scrollbar {
  width: 4px;
}

.flow-drawer::-webkit-scrollbar-thumb {
  background: #d0d5dd;
  border-radius: 2px;
}

.flow-drawer::-webkit-scrollbar-track {
  background: transparent;
}
</style>