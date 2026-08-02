<!-- src/components/FlowDrawer.vue -->
<template>
  <el-drawer
    v-model="visible"
    :title="`流程节点 - ${orderNo}`"
    direction="rtl"
    size="580px"
    destroy-on-close
  >
    <div class="flow-drawer" v-loading="loading">
      <!-- ===== 当前状态 ===== -->
      <div class="flow-header">
        <span class="status-label">当前状态：</span>
        <el-tag :type="statusTagType" size="large">
          {{ currentStatusText }}
        </el-tag>
        <el-tag v-if="isUrgent" type="danger" size="small" style="margin-left:8px;">⚠️ 紧急</el-tag>
      </div>

      <!-- ===== 进度条 ===== -->
      <div class="flow-progress">
        <el-progress 
          :percentage="progressPercent" 
          :color="progressColor"
          :stroke-width="8"
          striped
          striped-flow
        />
      </div>

      <!-- ===== 步骤条 ===== -->
      <div class="flow-steps-wrapper">
        <div class="flow-steps">
          <div
            v-for="(step, index) in stepStatusList"
            :key="step.key"
            class="step-item"
            :class="{
              'is-completed': step.status === 'completed',
              'is-current': step.status === 'current',
              'is-pending': step.status === 'pending',
              'is-warning': step.status === 'warning'
            }"
          >
            <!-- 连线 -->
            <div v-if="index > 0" class="step-line" :class="{ 
              'line-active': step.status === 'completed' || step.status === 'current',
              'line-warning': step.status === 'warning'
            }" />

            <!-- 节点 -->
            <div class="step-node">
              <el-icon v-if="step.status === 'completed'" class="step-icon"><Check /></el-icon>
              <span v-else-if="step.status === 'current'" class="step-number current">{{ index + 1 }}</span>
              <span v-else-if="step.status === 'warning'" class="step-number warning">!</span>
              <span v-else class="step-number pending">{{ index + 1 }}</span>
            </div>

            <!-- 标签 -->
            <div class="step-label">
              <div class="step-name">{{ step.label }}</div>
              <div class="step-status-text">
                <span v-if="step.status === 'completed'" class="text-completed">✅ 已完成</span>
                <span v-else-if="step.status === 'current'" class="text-current">● 处理中</span>
                <span v-else-if="step.status === 'warning'" class="text-warning">⚠️ 异常</span>
                <span v-else class="text-pending">○ 待处理</span>
              </div>
              <div v-if="step.operator" class="step-operator">
                👤 {{ step.operator }}
              </div>
              <div v-if="step.time" class="step-time">
                🕐 {{ formatTime(step.time) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 操作按钮（根据角色显示） ===== -->
      <div class="flow-actions" v-if="canOperate">
        <el-divider content-position="left">
          <span style="font-weight:600;">⚙️ 操作</span>
          <span style="font-size:12px;color:#909399;margin-left:8px;">
            （{{ currentRoleName }}）
          </span>
        </el-divider>

        <!-- 客户审核员操作 -->
        <template v-if="userStore.isCustomerAudit && currentStatus === 'pending'">
          <div class="action-group">
            <el-button type="success" @click="handleAudit(true)">
              <el-icon><Select /></el-icon> 审核通过
            </el-button>
            <el-button type="danger" @click="handleAudit(false)">
              <el-icon><Close /></el-icon> 驳回
            </el-button>
          </div>
        </template>

        <!-- 工厂业务员操作 -->
        <template v-if="userStore.isFactoryOrder || userStore.isAdmin">
          <!-- 接单 -->
          <div v-if="currentStatus === 'customerAudited'" class="action-group">
            <el-button type="primary" @click="handleAccept">
              <el-icon><Check /></el-icon> 接单
            </el-button>
          </div>

          <!-- 制作状态流转 -->
          <div v-if="isInProduction" class="action-group">
            <span style="color:#666;font-size:13px;margin-right:8px;">更新到：</span>
            <el-select 
              v-model="selectedStatus" 
              placeholder="选择下一个状态" 
              style="width:180px;"
              size="default"
            >
              <el-option
                v-for="item in availableStatuses"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              >
                <span style="display:flex;align-items:center;gap:6px;">
                  <span :style="{color: item.color}">●</span>
                  {{ item.label }}
                </span>
              </el-option>
            </el-select>
            <el-button 
              type="primary" 
              @click="handleUpdateStatus"
              :disabled="!selectedStatus"
              :loading="statusLoading"
            >
              更新状态
            </el-button>
          </div>

          <!-- 生成账单 -->
          <div v-if="canGenerateBill" class="action-group">
            <el-button type="warning" @click="handleGenerateBill" :loading="statusLoading">
              <el-icon><Document /></el-icon> 生成账单
            </el-button>
          </div>

          <!-- 报废/不合格退回 -->
          <div class="action-group" style="margin-top:8px;">
            <el-button size="small" type="danger" plain @click="handleScrap">
              💀 报废
            </el-button>
            <el-button size="small" type="warning" plain @click="handleUnqualifiedReturn">
              ↩️ 不合格退回
            </el-button>
          </div>
        </template>

        <!-- 工厂审核员操作 -->
        <template v-if="userStore.isFactoryAudit || userStore.isAdmin">
          <div v-if="currentStatus === 'billPending'" class="action-group">
            <el-button type="success" @click="handleBillAudit(true)">
              <el-icon><Select /></el-icon> 审核通过
            </el-button>
            <el-button type="danger" @click="handleBillAudit(false)">
              <el-icon><Close /></el-icon> 驳回
            </el-button>
          </div>
        </template>

        <!-- 客户确认账单 -->
        <template v-if="userStore.isCustomer && currentStatus === 'billConfirmed'">
          <div class="action-group">
            <el-button type="success" @click="handleConfirmBill">
              <el-icon><Select /></el-icon> 确认账单
            </el-button>
          </div>
        </template>

        <!-- 取消订单 -->
        <div v-if="canCancel" class="action-group" style="margin-top:8px;">
          <el-button size="small" type="danger" plain @click="handleCancelOrder">
            取消订单
          </el-button>
        </div>
      </div>

      <!-- ===== 操作日志 ===== -->
      <div class="flow-history" v-if="historyLogs.length > 0">
        <el-divider content-position="left">📜 操作记录</el-divider>
        <el-timeline>
          <el-timeline-item
            v-for="log in historyLogs"
            :key="log.id"
            :timestamp="formatTime(log.createdAt)"
            placement="top"
            size="small"
          >
            <div class="log-item">
              <span class="log-operator">{{ log.operatorName || '系统' }}</span>
              <span class="log-action">{{ log.actionText || log.remark }}</span>
              <span v-if="log.remark && log.remark !== log.actionText" class="log-remark">（{{ log.remark }}）</span>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>

    <!-- ===== 驳回原因弹窗 ===== -->
    <el-dialog v-model="rejectDialogVisible" title="驳回原因" width="450px">
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="4"
        placeholder="请填写驳回原因（必填）"
      />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="rejectLoading">
          确认驳回
        </el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Select, Close, Document } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { 
  auditOrder, acceptOrder, updateProduction, generateBill,
  auditBill, confirmBill, cancelOrder, markUrgent
} from '@/api/order';

const props = defineProps({
  orderId: { type: Number, required: true },
  orderNo: { type: String, default: '' },
  modelValue: { type: Boolean, default: false },
  currentStatus: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'refresh', 'status-updated']);

const userStore = useUserStore();

// ============================================================
// 状态定义
// ============================================================
const statusMap = {
  pending: { label: '待客户审核', color: 'warning', step: 0 },
  customerAudited: { label: '客户已审核', color: 'success', step: 1 },
  accepted: { label: '已接单', color: 'primary', step: 2 },
  dataConfirm: { label: '数据确认', color: 'primary', step: 3 },
  waxing: { label: '出蜡', color: 'primary', step: 4 },
  molded: { label: '已倒模', color: 'primary', step: 5 },
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
  unqualifiedReturn: { label: '不合格退回', color: 'danger', step: -1 },
  rejected: { label: '已驳回', color: 'danger', step: -1 },
  cancelled: { label: '已取消', color: 'info', step: -1 },
};

// 工厂流转顺序
const factoryFlow = [
  'accepted', 'dataConfirm', 'waxing', 'molded', 'cnc',
  'partsMissing', 'stoneReady', 'setting', 'glue',
  'inlay', 'assembly', 'polishing'
];

// 状态转换规则
const transitions = {
  'accepted': ['dataConfirm', 'partsMissing'],
  'dataConfirm': ['waxing', 'partsMissing'],
  'waxing': ['molded', 'partsMissing'],
  'molded': ['cnc', 'partsMissing'],
  'cnc': ['partsMissing', 'stoneReady'],
  'partsMissing': ['cnc', 'stoneReady'],
  'stoneReady': ['setting', 'partsMissing'],
  'setting': ['glue', 'partsMissing'],
  'glue': ['inlay', 'partsMissing'],
  'inlay': ['assembly', 'partsMissing'],
  'assembly': ['polishing', 'partsMissing'],
  'polishing': [],
};

// ============================================================
// 状态
// ============================================================
const loading = ref(false);
const visible = ref(false);
const statusLoading = ref(false);
const rejectLoading = ref(false);
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const rejectAction = ref(null);
const selectedStatus = ref('');

const orderData = ref({
  flowStatus: props.currentStatus || 'pending',
  warnFlag: false,
});

const historyLogs = ref([]);
const isUrgent = ref(false);

// ============================================================
// 计算属性
// ============================================================
const currentStatus = computed(() => orderData.value?.flowStatus || 'pending');
const currentStatusText = computed(() => statusMap[currentStatus.value]?.label || currentStatus.value);
const statusTagType = computed(() => statusMap[currentStatus.value]?.color || 'info');

const currentRoleName = computed(() => {
  const map = {
    customer: '客户下单员',
    customerAudit: '客户审核员',
    factoryOrder: '工厂业务员',
    factoryAudit: '工厂审核员',
    admin: '管理员',
  };
  return map[userStore.userType] || userStore.userType;
});

// 步骤列表
const stepStatusList = computed(() => {
  const steps = [
    { key: 'pending', label: '待客户审核' },
    { key: 'customerAudited', label: '客户已审核' },
    ...factoryFlow.map(key => ({ key, label: statusMap[key]?.label || key })),
    { key: 'billPending', label: '账单待审核' },
    { key: 'billConfirmed', label: '客户已确认' },
    { key: 'completed', label: '已完成' },
  ];

  const currentIdx = steps.findIndex(s => s.key === currentStatus.value);
  const isAbnormal = ['scrapped', 'unqualifiedReturn', 'rejected', 'cancelled'].includes(currentStatus.value);

  return steps.map((step, index) => {
    let status = 'pending';
    if (isAbnormal) {
      status = index <= currentIdx ? 'completed' : 'pending';
    } else if (index < currentIdx) {
      status = 'completed';
    } else if (index === currentIdx) {
      status = 'current';
    }
    return { ...step, status };
  });
});

// 进度
const progressPercent = computed(() => {
  const total = stepStatusList.value.length - 1;
  const current = stepStatusList.value.findIndex(s => s.status === 'current');
  if (current === -1) return 100;
  return Math.round((current / total) * 100);
});

const progressColor = computed(() => {
  if (progressPercent.value < 30) return '#409EFF';
  if (progressPercent.value < 70) return '#E6A23C';
  return '#67C23A';
});

// 操作权限
const canOperate = computed(() => {
  return userStore.isLoggedIn && !['scrapped', 'unqualifiedReturn', 'rejected', 'cancelled', 'completed'].includes(currentStatus.value);
});

const isInProduction = computed(() => {
  return factoryFlow.includes(currentStatus.value) || currentStatus.value === 'customerAudited';
});

const canGenerateBill = computed(() => {
  return currentStatus.value === 'polishing' || currentStatus.value === 'completed';
});

const canCancel = computed(() => {
  return !['completed', 'cancelled', 'scrapped'].includes(currentStatus.value) && 
         (userStore.isAdmin || userStore.isCustomerAudit);
});

// 可用状态列表
const availableStatuses = computed(() => {
  const targets = transitions[currentStatus.value] || [];
  const result = [];
  
  // 添加正常流转状态
  for (const key of targets) {
    if (statusMap[key]) {
      result.push({
        value: key,
        label: statusMap[key].label,
        color: statusMap[key].color,
      });
    }
  }
  
  return result;
});

// ============================================================
// 方法
// ============================================================
const loadFlowData = async () => {
  loading.value = true;
  try {
    // 获取订单详情
    const res = await getOrderDetail(props.orderId);
    if (res?.data) {
      orderData.value = res.data;
      isUrgent.value = res.data.warnFlag || false;
    }
    // 模拟历史记录
    historyLogs.value = [
      { id: 1, operatorName: '系统', actionText: '订单创建', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 2, operatorName: '张飞', actionText: '提交审核', createdAt: new Date(Date.now() - 3600000).toISOString() },
    ];
  } catch (error) {
    ElMessage.error('加载流程数据失败');
  } finally {
    loading.value = false;
  }
};

// ===== 客户审核 =====
const handleAudit = (approved) => {
  if (!approved) {
    rejectAction.value = { type: 'audit', approved: false };
    rejectDialogVisible.value = true;
    return;
  }
  doAudit(true, '');
};

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  rejectLoading.value = true;
  try {
    if (rejectAction.value?.type === 'audit') {
      await doAudit(false, rejectReason.value);
    } else if (rejectAction.value?.type === 'billAudit') {
      await doBillAudit(false, rejectReason.value);
    }
    rejectDialogVisible.value = false;
    rejectReason.value = '';
  } finally {
    rejectLoading.value = false;
  }
};

const doAudit = async (approved, remark) => {
  try {
    await auditOrder(props.orderId, { approved, remark });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    loadFlowData();
    emit('status-updated');
  } catch (error) {
    ElMessage.error(error.message || '操作失败');
    throw error;
  }
};

// ===== 接单 =====
const handleAccept = async () => {
  try {
    await ElMessageBox.confirm('确定要接单吗？', '接单确认', { type: 'info' });
    statusLoading.value = true;
    await acceptOrder(props.orderId);
    ElMessage.success('接单成功');
    loadFlowData();
    emit('status-updated');
  } catch {}
  finally {
    statusLoading.value = false;
  }
};

// ===== 更新制作状态 =====
const handleUpdateStatus = async () => {
  if (!selectedStatus.value) {
    ElMessage.warning('请选择状态');
    return;
  }

  const label = statusMap[selectedStatus.value]?.label || selectedStatus.value;
  const isDanger = selectedStatus.value === 'scrapped' || selectedStatus.value === 'unqualifiedReturn';

  try {
    if (isDanger) {
      await ElMessageBox.confirm(
        `确定要将订单标记为 ${label} 吗？此操作不可逆！`,
        '警告',
        { type: 'warning' }
      );
    }
    statusLoading.value = true;
    await updateProduction(props.orderId, { status: selectedStatus.value, step: 0 });
    ElMessage.success(`状态已更新为：${label}`);
    selectedStatus.value = '';
    loadFlowData();
    emit('status-updated');
  } catch {}
  finally {
    statusLoading.value = false;
  }
};

// ===== 生成账单 =====
const handleGenerateBill = async () => {
  try {
    await ElMessageBox.confirm('确定要生成账单吗？', '生成账单', { type: 'info' });
    statusLoading.value = true;
    await generateBill(props.orderId);
    ElMessage.success('账单已生成，等待工厂审核员审核');
    loadFlowData();
    emit('status-updated');
  } catch {}
  finally {
    statusLoading.value = false;
  }
};

// ===== 工厂审核员审核账单 =====
const handleBillAudit = (approved) => {
  if (!approved) {
    rejectAction.value = { type: 'billAudit', approved: false };
    rejectDialogVisible.value = true;
    return;
  }
  doBillAudit(true, '');
};

const doBillAudit = async (approved, remark) => {
  try {
    await auditBill(props.orderId, { approved, remark });
    ElMessage.success(approved ? '账单审核通过' : '账单驳回');
    loadFlowData();
    emit('status-updated');
  } catch (error) {
    ElMessage.error(error.message || '操作失败');
    throw error;
  }
};

// ===== 客户确认账单 =====
const handleConfirmBill = async () => {
  try {
    await ElMessageBox.confirm('确认账单无误吗？确认后订单将完成。', '确认账单', { type: 'info' });
    await confirmBill(props.orderId);
    ElMessage.success('账单已确认，订单完成');
    loadFlowData();
    emit('status-updated');
  } catch {}
};

// ===== 报废 =====
const handleScrap = async () => {
  try {
    await ElMessageBox.confirm('确定要报废此订单吗？此操作不可逆！', '报废确认', { type: 'warning' });
    await updateProduction(props.orderId, { status: 'scrapped', step: 0 });
    ElMessage.success('订单已报废');
    loadFlowData();
    emit('status-updated');
  } catch {}
};

// ===== 不合格退回 =====
const handleUnqualifiedReturn = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入退回原因', '不合格退回', {
      inputType: 'textarea',
      inputPlaceholder: '请说明退回原因',
    });
    if (value) {
      await updateProduction(props.orderId, { status: 'unqualifiedReturn', step: 0 });
      ElMessage.success('已退回');
      loadFlowData();
      emit('status-updated');
    }
  } catch {}
};

// ===== 取消订单 =====
const handleCancelOrder = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入取消原因（选填）', '取消订单', {
      inputType: 'textarea',
      inputPlaceholder: '请输入取消原因',
    });
    await cancelOrder(props.orderId, value || '');
    ElMessage.success('订单已取消');
    loadFlowData();
    emit('status-updated');
  } catch {}
};

// ============================================================
// 工具方法
// ============================================================
const formatTime = (time) => {
  if (!time) return '-';
  return new Date(time).toLocaleString('zh-CN', { hour12: false });
};

// ============================================================
// 监听
// ============================================================
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
.flow-drawer { padding: 0 4px; }

.flow-header { 
  display: flex; 
  align-items: center; 
  padding: 12px 0; 
  gap: 12px; 
}
.status-label { 
  font-weight: 500; 
  color: #606266; 
}

.flow-progress {
  padding: 8px 0 16px 0;
}

.flow-steps-wrapper { 
  padding: 16px 8px; 
  background: #f5f7fa; 
  border-radius: 8px; 
  margin: 4px 0; 
  overflow-x: auto;
}
.flow-steps { 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start; 
  padding: 8px 4px; 
  position: relative; 
  min-width: 500px; 
}

.step-item { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  flex: 1; 
  position: relative; 
  min-width: 56px; 
}
.step-item.is-completed .step-node { 
  background: #67C23A; 
  border-color: #67C23A; 
}
.step-item.is-current .step-node { 
  background: #409EFF; 
  border-color: #409EFF; 
  box-shadow: 0 0 0 4px rgba(64,158,255,0.25); 
  transform: scale(1.12); 
}
.step-item.is-pending .step-node { 
  background: #f5f7fa; 
  border-color: #dcdfe6; 
}
.step-item.is-warning .step-node { 
  background: #E6A23C; 
  border-color: #E6A23C; 
}

.step-line { 
  position: absolute; 
  top: 16px; 
  left: -50%; 
  width: 100%; 
  height: 2px; 
  background: #dcdfe6; 
  z-index: 0; 
}
.step-line.line-active { 
  background: #67C23A; 
}
.step-line.line-warning { 
  background: #E6A23C; 
}

.step-node { 
  width: 32px; 
  height: 32px; 
  border-radius: 50%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  z-index: 1; 
  background: #f5f7fa; 
  border: 2px solid #dcdfe6; 
  transition: all 0.3s; 
  flex-shrink: 0; 
}
.step-node .step-icon { 
  color: #fff; 
  font-size: 16px; 
}
.step-node .step-number { 
  font-size: 14px; 
  font-weight: 600; 
}
.step-node .step-number.current { 
  color: #fff; 
}
.step-node .step-number.pending { 
  color: #c0c4cc; 
}
.step-node .step-number.warning { 
  color: #fff; 
  font-weight: bold;
}

.step-label { 
  margin-top: 8px; 
  text-align: center; 
  min-width: 50px; 
}
.step-name { 
  font-size: 12px; 
  font-weight: 500; 
  color: #303133; 
  white-space: nowrap; 
}
.step-status-text { 
  font-size: 11px; 
  margin-top: 2px; 
}
.text-completed { color: #67C23A; }
.text-current { color: #409EFF; font-weight: 600; }
.text-pending { color: #c0c4cc; }
.text-warning { color: #E6A23C; }

.step-operator { 
  font-size: 11px; 
  color: #909399; 
  margin-top: 2px; 
}
.step-time { 
  font-size: 10px; 
  color: #c0c4cc; 
  margin-top: 1px; 
}

.flow-actions { 
  padding: 8px 0; 
}
.action-group { 
  display: flex; 
  gap: 8px; 
  align-items: center; 
  flex-wrap: wrap; 
  padding: 4px 0; 
}

.flow-history { 
  padding: 4px 0; 
}
.log-item { 
  font-size: 13px; 
}
.log-operator { 
  font-weight: 500; 
  color: #303133; 
}
.log-action { 
  margin: 0 4px; 
  color: #409EFF; 
}
.log-remark { 
  color: #909399; 
  font-size: 12px; 
}
</style>