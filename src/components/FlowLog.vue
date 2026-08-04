<!-- src/components/FlowLog.vue -->
<template>
  <div class="flow-log" v-loading="loading">
    <div v-if="logs.length === 0" style="text-align:center;color:#999;padding:20px;">
      暂无操作记录
    </div>

    <div class="log-timeline">
      <div
        v-for="(log, index) in logs"
        :key="log.id"
        class="log-item"
      >
        <!-- 连接线 -->
        <div v-if="index > 0" class="log-line" />

        <!-- 节点 -->
        <div class="log-node" :class="getNodeClass(log)">
          <el-icon v-if="getNodeIcon(log)" :size="16">
            <component :is="getNodeIcon(log)" />
          </el-icon>
          <span v-else class="node-dot" />
        </div>

        <!-- 内容 -->
        <div class="log-content">
          <div class="log-header">
            <span class="log-time">{{ formatTime(log.createdAt) }}</span>
            <el-tag :type="getStatusType(log)" size="small">
              {{ log.nodeName || log.newStatus }}
            </el-tag>
          </div>
          <div class="log-body">
            <span class="log-operator">{{ log.operatorName }}</span>
            <span class="log-action">{{ getActionText(log) }}</span>
            <span v-if="log.remark" class="log-remark">（{{ log.remark }}）</span>
          </div>
          <div v-if="log.oldStatus && log.newStatus && log.oldStatus !== log.newStatus" class="log-status">
            <span class="status-old">{{ getStatusLabel(log.oldStatus) }}</span>
            <el-icon><ArrowRight /></el-icon>
            <span class="status-new">{{ getStatusLabel(log.newStatus) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowRight } from '@element-plus/icons-vue';
import { getOrderLogs, getBillLogs } from '@/api/flowlog';

const props = defineProps({
  orderId: { type: Number, default: 0 },
  billId: { type: Number, default: 0 },
});

const loading = ref(false);
const logs = ref([]);

// ===== 状态映射 =====
const statusMap = {
  draft: { label: '草稿', type: 'info' },
  pending: { label: '待客户审核', type: 'warning' },
  customerAudited: { label: '客户已审核', type: 'success' },
  accepted: { label: '已接单', type: 'primary' },
  waxing: { label: '出蜡', type: 'primary' },
  molded: { label: '倒模', type: 'primary' },
  setting: { label: '执模', type: 'primary' },
  cnc: { label: 'CNC', type: 'primary' },
  sweeping: { label: '扫镶口', type: 'primary' },
  stoneCutting: { label: '车石', type: 'primary' },
  microInlay: { label: '微镶', type: 'primary' },
  handInlay: { label: '手镶', type: 'primary' },
  polishing: { label: '抛光', type: 'primary' },
  billPending: { label: '账单待审核', type: 'warning' },
  billApproved: { label: '账单已通过', type: 'success' },
  billReturned: { label: '账单已退回', type: 'danger' },
  billConfirmed: { label: '账单已确认', type: 'success' },
  completed: { label: '已完成', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' },
  cancelled: { label: '已取消', type: 'info' },
};

const getStatusLabel = (status) => statusMap[status]?.label || status;

// ===== 获取节点样式 =====
const getNodeClass = (log) => {
  const type = log.operationType;
  if (type === 'create') return 'node-create';
  if (type === 'submit') return 'node-submit';
  if (type === 'audit') return 'node-audit';
  if (type === 'accept') return 'node-accept';
  if (type === 'production') return 'node-production';
  if (type === 'bill') return 'node-bill';
  if (type === 'confirm') return 'node-confirm';
  if (type === 'return') return 'node-return';
  if (type === 'complete') return 'node-complete';
  return 'node-default';
};

// ===== 获取节点图标 =====
const getNodeIcon = (log) => {
  const type = log.operationType;
  if (type === 'create') return 'DocumentAdd';
  if (type === 'submit') return 'Upload';
  if (type === 'audit') return 'Check';
  if (type === 'accept') return 'Select';
  if (type === 'production') return 'Tools';
  if (type === 'bill') return 'Document';
  if (type === 'confirm') return 'Select';
  if (type === 'return') return 'Close';
  if (type === 'complete') return 'Finished';
  return null;
};

// ===== 获取操作文本 =====
const getActionText = (log) => {
  const type = log.operationType;
  const map = {
    'create': '创建了订单',
    'submit': '提交审核',
    'audit': log.newStatus === 'rejected' ? '审核驳回' : '审核通过',
    'accept': '接单',
    'production': `更新状态为「${log.nodeName}」`,
    'bill': '生成账单',
    'confirm': '确认账单',
    'return': '退回账单',
    'complete': '订单完成',
  };
  return map[type] || log.nodeName || '操作';
};

// ===== 获取状态类型 =====
const getStatusType = (log) => {
  const type = log.operationType;
  if (type === 'create' || type === 'submit') return 'info';
  if (type === 'audit' || type === 'confirm' || type === 'complete') return 'success';
  if (type === 'return') return 'danger';
  if (type === 'accept' || type === 'production') return 'primary';
  if (type === 'bill') return 'warning';
  return 'info';
};

// ===== 加载数据 =====
const loadData = async () => {
  if (props.orderId <= 0 && props.billId <= 0) return;

  loading.value = true;
  try {
    let res;
    if (props.billId > 0) {
      res = await getBillLogs(props.billId);
    } else if (props.orderId > 0) {
      res = await getOrderLogs(props.orderId);
    }
    logs.value = res?.data || [];
  } catch {
    ElMessage.error('加载流程日志失败');
  } finally {
    loading.value = false;
  }
};

// ===== 时间格式化 =====
const formatTime = (time) => {
  if (!time) return '-';
  const d = new Date(time);
  return d.toLocaleString('zh-CN', { hour12: false });
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.flow-log {
  padding: 8px 4px;
}

.log-timeline {
  position: relative;
  padding: 4px 0;
}

.log-item {
  display: flex;
  gap: 16px;
  position: relative;
  padding-bottom: 20px;
}

.log-line {
  position: absolute;
  left: 14px;
  top: 28px;
  width: 2px;
  height: calc(100% - 4px);
  background: #e8ecf1;
}

.log-node {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  border: 2px solid #e8ecf1;
  background: #fff;
}

.log-node .node-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #909399;
}

/* 不同节点颜色 */
.node-create { border-color: #409EFF; background: #ecf5ff; }
.node-create .node-dot { background: #409EFF; }
.node-submit { border-color: #E6A23C; background: #fdf6ec; }
.node-submit .node-dot { background: #E6A23C; }
.node-audit { border-color: #67C23A; background: #f0f9eb; }
.node-audit .node-dot { background: #67C23A; }
.node-accept { border-color: #409EFF; background: #ecf5ff; }
.node-accept .node-dot { background: #409EFF; }
.node-production { border-color: #909399; background: #f4f4f5; }
.node-production .node-dot { background: #909399; }
.node-bill { border-color: #E6A23C; background: #fdf6ec; }
.node-bill .node-dot { background: #E6A23C; }
.node-confirm { border-color: #67C23A; background: #f0f9eb; }
.node-confirm .node-dot { background: #67C23A; }
.node-return { border-color: #F56C6C; background: #fef0f0; }
.node-return .node-dot { background: #F56C6C; }
.node-complete { border-color: #67C23A; background: #f0f9eb; }
.node-complete .node-dot { background: #67C23A; }

.log-content {
  flex: 1;
  min-width: 0;
  padding-top: 2px;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.log-time {
  font-size: 12px;
  color: #909399;
}

.log-body {
  font-size: 14px;
  margin-top: 2px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.log-operator {
  font-weight: 600;
  color: #303133;
}

.log-action {
  color: #606266;
}

.log-remark {
  color: #909399;
  font-size: 13px;
}

.log-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 13px;
  padding: 2px 10px;
  background: #f5f7fa;
  border-radius: 4px;
  width: fit-content;
}

.status-old {
  color: #909399;
  text-decoration: line-through;
}

.status-new {
  color: #409EFF;
  font-weight: 500;
}
</style>