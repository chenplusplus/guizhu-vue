<!-- src/components/FlowDrawer.vue -->
<template>
  <el-drawer
    v-model="visible"
    :title="`🕐 流程节点 - ${orderNo}`"
    direction="rtl"
    size="520px"
    destroy-on-close
  >
    <div class="flow-drawer" v-loading="loading">
      <!-- ===== 当前状态 ===== -->
      <div class="flow-header">
        <span class="status-label">当前状态：</span>
        <el-tag :type="statusTagType" size="large">
          {{ currentStepName }}
        </el-tag>
        <span v-if="billNo" class="bill-link" @click="goToBill">
          📄 查看账单
        </span>
      </div>

      <!-- ===== 操作记录 ===== -->
      <div class="timeline-section">
        <div class="section-title">
          <span class="title-icon">📋</span>
          操作记录
          <span class="title-count">{{ historyList.length }} 条</span>
        </div>

        <div v-if="historyList.length === 0" class="empty-tip">
          <el-empty description="暂无操作记录" :image-size="60" />
        </div>

        <!-- ⭐ 按时间从旧到新（上到下） -->
        <div
          v-for="(item, index) in sortedHistoryList"
          :key="item.id"
          class="timeline-item"
          :class="{ 'is-last': index === sortedHistoryList.length - 1 }"
        >
          <!-- 连接线 -->
          <div v-if="index < sortedHistoryList.length - 1" class="timeline-line" />

          <!-- 节点图标 -->
          <div class="timeline-node" :class="getNodeClass(index, sortedHistoryList.length)">
            <el-icon v-if="index === 0" class="node-icon"><Check /></el-icon>
            <span v-else class="node-dot" />
          </div>

          <!-- 内容 -->
          <div class="timeline-content">
            <div class="content-header">
              <span class="step-name">{{ item.actionName || item.actionKey }}</span>
              <span class="step-time">{{ formatTime(item.createdAt) }}</span>
            </div>
            <div class="step-operator">
              <span class="operator-icon">👤</span>
              {{ item.operatorName || '系统' }}
              <span v-if="item.operatorRole" class="operator-role">
                · {{ getRoleLabel(item.operatorRole) }}
              </span>
            </div>
            <div v-if="item.remark" class="step-remark">
              💬 {{ item.remark }}
            </div>
            <!-- ⭐ 去掉状态变化显示 -->
          </div>
        </div>
      </div>

      <!-- ===== 账单明细 ===== -->
      <div v-if="billItems.length > 0" class="bill-section">
        <div class="section-title">
          <span class="title-icon">💰</span>
          账单明细
          <span v-if="billNo" class="bill-no">#{{ billNo }}</span>
          <el-tag v-if="billStatus" :type="getBillStatusType(billStatus)" size="small">
            {{ getBillStatusLabel(billStatus) }}
          </el-tag>
        </div>

        <div class="bill-table">
          <!-- 表头 -->
          <div class="bill-header">
            <span style="width:30px;">#</span>
            <span style="flex:1;">品名</span>
            <span style="width:50px;">数量</span>
            <span style="width:80px;">金料费</span>
            <span style="width:80px;">石费</span>
            <span style="width:80px;">合计</span>
          </div>

          <!-- 明细行 -->
          <div
            v-for="item in billItems"
            :key="item.id"
            class="bill-row"
            :class="{ 'is-returned': item.isReturned }"
          >
            <span style="width:30px;color:#8a9aaa;">{{ item.seqNo }}</span>
            <span style="flex:1;" :title="item.productName">
              {{ item.productName || '-' }}
            </span>
            <span style="width:50px;">{{ item.quantity || 1 }}</span>
            <span style="width:80px;">¥{{ formatMoney(item.goldMaterialFee) }}</span>
            <span style="width:80px;">¥{{ formatMoney((item.mainStoneAmount || 0) + (item.subStoneAmount || 0)) }}</span>
            <span style="width:80px;font-weight:600;color:#409EFF;">
              ¥{{ formatMoney(item.totalAmount) }}
            </span>
          </div>

          <!-- 合计行 -->
          <div class="bill-footer">
            <span>合计</span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span class="bill-total">¥{{ formatMoney(billTotalAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- 无数据 -->
      <el-empty
        v-if="historyList.length === 0 && billItems.length === 0"
        description="暂无流程数据"
        :image-size="80"
      />
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Check } from '@element-plus/icons-vue';
import { getOrderFlowWithBill } from '@/api/order';

const router = useRouter();

const props = defineProps({
  orderId: { type: Number, required: true },
  orderNo: { type: String, default: '' },
  currentStatus: { type: String, default: '' },
  modelValue: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'refresh']);

// ===== 状态 =====
const loading = ref(false);
const visible = ref(false);
const historyList = ref([]);
const billItems = ref([]);
const billNo = ref('');
const billTotalAmount = ref(0);
const billStatus = ref('');
const currentStatus = ref('');

// ===== 状态映射 =====
const statusMap = {
  draft: { label: '草稿', color: 'info' },
  pending: { label: '待客户审核', color: 'warning' },
  customerAudited: { label: '客户已审核', color: 'success' },
  accepted: { label: '已接单', color: 'primary' },
  dataConfirm: { label: '数据确认', color: 'primary' },
  waxing: { label: '出蜡', color: 'primary' },
  molded: { label: '倒模', color: 'primary' },
  cnc: { label: 'CNC', color: 'primary' },
  partsMissing: { label: '配件缺失', color: 'warning' },
  stoneReady: { label: '配石完成', color: 'primary' },
  setting: { label: '执模', color: 'primary' },
  glue: { label: '滴胶/磨石', color: 'primary' },
  inlay: { label: '镶嵌', color: 'primary' },
  assembly: { label: '组装', color: 'primary' },
  polishing: { label: '抛光', color: 'primary' },
  billPending: { label: '账单待审核', color: 'warning' },
  billConfirmed: { label: '客户待确认', color: 'success' },
  completed: { label: '已完成', color: 'success' },
  rejected: { label: '已驳回', color: 'danger' },
  cancelled: { label: '已取消', color: 'info' },
  scrapped: { label: '已报废', color: 'danger' }
};

const billStatusMap = {
  pending: { label: '草稿', type: 'info' },
  billPending: { label: '待审核', type: 'warning' },
  billConfirmed: { label: '待确认', type: 'success' },
  confirmed: { label: '已确认', type: 'success' },
  returned: { label: '已退回', type: 'danger' }
};

// ===== 计算属性 =====
const currentStepName = computed(() => {
  const status = currentStatus.value || props.currentStatus || 'draft';
  return statusMap[status]?.label || status;
});

const statusTagType = computed(() => {
  const status = currentStatus.value || props.currentStatus || 'draft';
  return statusMap[status]?.color || 'info';
});

// ⭐ 按时间从旧到新排序（正序）
const sortedHistoryList = computed(() => {
  return [...historyList.value].sort((a, b) => {
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
});

// ===== 方法 =====
const getNodeClass = (index, total) => {
  if (index === 0) return 'completed';
  if (index === total - 1) return 'latest';
  return 'normal';
};

const getRoleLabel = (role) => {
  const map = {
    customer: '客户',
    customerAudit: '客户审核员',
    factoryOrder: '工厂业务员',
    factoryAudit: '工厂审核员',
    admin: '管理员'
  };
  return map[role] || role;
};

const getBillStatusLabel = (status) => {
  return billStatusMap[status]?.label || status;
};

const getBillStatusType = (status) => {
  return billStatusMap[status]?.type || 'info';
};

const formatTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', { hour12: false });
};

const formatMoney = (val) => {
  if (val === null || val === undefined) return '0.00';
  return val.toFixed(2);
};

const goToBill = () => {
  ElMessage.info('跳转到账单详情');
};

// ===== 加载数据 =====
const loadFlowData = async () => {
  if (!props.orderId) return;
  loading.value = true;
  try {
    const res = await getOrderFlowWithBill(props.orderId);
    if (res?.data) {
      const data = res.data;
      historyList.value = data.history || [];
      billItems.value = data.billItems || [];
      billNo.value = data.billNo || '';
      billTotalAmount.value = data.billTotalAmount || 0;
      billStatus.value = data.billStatus || '';
      currentStatus.value = data.currentStatus || props.currentStatus || 'draft';
    }
  } catch (error) {
    ElMessage.error(error.message || '加载流程数据失败');
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
  if (val) currentStatus.value = val;
});
</script>

<style scoped>
/* ===== 整体 ===== */
.flow-drawer {
  padding: 4px 0;
  max-height: 75vh;
  overflow-y: auto;
}

/* ===== 头部 ===== */
.flow-header {
  display: flex;
  align-items: center;
  padding: 8px 0 16px 0;
  gap: 12px;
  border-bottom: 1px solid #e8f0fe;
}

.status-label {
  font-weight: 500;
  color: #5a6b8a;
  font-size: 14px;
}

.bill-link {
  margin-left: auto;
  color: #409EFF;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 12px;
  border-radius: 4px;
  background: #ecf5ff;
  transition: background 0.2s;
}
.bill-link:hover {
  background: #d9ecff;
}

/* ===== 区块标题 ===== */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #2a3a5a;
  padding: 16px 0 10px 0;
  border-bottom: 1px solid #e8f0fe;
  margin-top: 4px;
}

.title-icon {
  font-size: 16px;
}

.title-count {
  font-size: 12px;
  font-weight: 400;
  color: #8a9aaa;
  margin-left: auto;
}

.bill-no {
  font-size: 12px;
  font-weight: 400;
  color: #6a8aaa;
  background: #f0f6ff;
  padding: 0 10px;
  border-radius: 4px;
}

/* ===== 时间线 ===== */
.timeline-section {
  padding-bottom: 4px;
}

.timeline-item {
  display: flex;
  gap: 14px;
  padding: 10px 0 12px 0;
  position: relative;
  padding-left: 2px;
}

.timeline-line {
  position: absolute;
  left: 10px;
  top: 28px;
  width: 2px;
  height: calc(100% + 4px);
  background: #e0e8f0;
}

.timeline-item.is-last .timeline-line {
  display: none;
}

/* 节点 */
.timeline-node {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  margin-top: 2px;
}

.timeline-node.completed {
  background: #409EFF;
}

.timeline-node.normal {
  background: #d4e2f0;
}

.timeline-node.latest {
  background: #409EFF;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
}

.node-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
}

.node-icon {
  color: #fff;
  font-size: 13px;
}

/* 内容 */
.timeline-content {
  flex: 1;
  min-width: 0;
  padding-top: 1px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.step-name {
  font-size: 14px;
  font-weight: 500;
  color: #2a3a5a;
}

.step-time {
  font-size: 12px;
  color: #8a9aaa;
  white-space: nowrap;
}

.step-operator {
  font-size: 12px;
  color: #6a8aaa;
  margin-top: 2px;
}

.operator-role {
  color: #8a9aaa;
}

.step-remark {
  font-size: 12px;
  color: #5a7a9a;
  background: #f5f9ff;
  padding: 4px 12px;
  border-radius: 4px;
  margin-top: 4px;
  display: inline-block;
  max-width: 100%;
  word-break: break-all;
}

.empty-tip {
  padding: 16px 0;
}

/* ===== 账单 ===== */
.bill-section {
  margin-top: 4px;
  border-top: 1px solid #e8f0fe;
}

.bill-table {
  background: #f8faff;
  border-radius: 8px;
  padding: 6px 12px;
  margin-top: 6px;
}

.bill-header {
  display: flex;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #6a7a8a;
  padding: 6px 0;
  border-bottom: 1px solid #e8f0fe;
}

.bill-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: #2a3a5a;
  padding: 6px 0;
  border-bottom: 1px solid #f0f6ff;
  align-items: center;
}

.bill-row:last-child {
  border-bottom: none;
}

.bill-row.is-returned {
  opacity: 0.6;
  text-decoration: line-through;
  color: #8a9aaa;
}

.bill-footer {
  display: flex;
  gap: 8px;
  padding: 8px 0 4px 0;
  border-top: 2px solid #e0e8f0;
  font-weight: 600;
  font-size: 14px;
  color: #2a3a5a;
  align-items: center;
}

.bill-footer > span {
  flex: 0 0 auto;
}
.bill-footer > span:first-child {
  width: 30px;
}
.bill-footer > span:nth-child(2) {
  flex: 1;
}
.bill-footer > span:nth-child(3) {
  width: 50px;
}
.bill-footer > span:nth-child(4) {
  width: 80px;
}
.bill-footer > span:nth-child(5) {
  width: 80px;
}

.bill-total {
  width: 80px !important;
  color: #409EFF;
  font-size: 16px;
}

/* ===== 滚动条 ===== */
.flow-drawer::-webkit-scrollbar {
  width: 4px;
}
.flow-drawer::-webkit-scrollbar-thumb {
  background: #d4e2f0;
  border-radius: 2px;
}
.flow-drawer::-webkit-scrollbar-track {
  background: transparent;
}
</style>