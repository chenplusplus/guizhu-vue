<!-- src/views/order/modify-list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>✏️ 修改记录</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <el-radio-group v-model="filterStatus" size="small" @change="loadData">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="pendingAudit">待客户审核</el-radio-button>
          <el-radio-button label="pendingFactory">待工厂确认</el-radio-button>
        </el-radio-group>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column label="订单号" width="180">
        <template #default="{ row }">
          <el-link type="primary" @click="viewDetail(row.orderId)">
            <span :class="{ 'blink-modify': row.modifyTracking }">
              {{ row.orderNo }}
            </span>
            <span v-if="row.modifyTracking" class="modify-badge">✏️</span>
          </el-link>
        </template>
      </el-table-column>

      <el-table-column label="发起时阶段" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="getOriginStageType(row.modifyOriginStage)" size="small">
            {{ getOriginStageText(row.modifyOriginStage) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="当前状态" width="140" align="center">
        <template #default="{ row }">
          <el-tag :type="getCurrentStatusType(row)" size="small">
            {{ getCurrentStatusText(row) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="applyName" label="申请人" width="110" />
      <el-table-column label="申请时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.applyAt) }}</template>
      </el-table-column>
      <el-table-column prop="applyReason" label="申请原因" min-width="140" show-overflow-tooltip />

      <el-table-column label="修改明细" min-width="300">
        <template #default="{ row }">
          <div v-for="(d, i) in row.diffs" :key="i" class="diff-row">
            <span class="diff-label">{{ d.fieldLabel }}</span>
            <span class="diff-old">{{ d.oldValue || '空' }}</span>
            <el-icon><Right /></el-icon>
            <span class="diff-new">{{ d.newValue || '空' }}</span>
          </div>
          <div v-if="!row.diffs || row.diffs.length === 0" class="diff-empty">无字段变更</div>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200" fixed="right" align="center">
        <template #default="{ row }">
          <!-- 客户审核员：待客户审核 → 同意 / 驳回 -->
          <template v-if="isCustomerAudit && row.modifyStatus === 'pendingAudit'">
            <el-button size="small" type="success" @click="handleAudit(row, true)">同意</el-button>
            <el-button size="small" type="danger" @click="handleAudit(row, false)">驳回</el-button>
          </template>

          <!-- 工厂操作员：追踪中 + 工厂阶段 → 确认生效 -->
          <template v-else-if="isFactoryOrder 
                     && row.modifyTracking 
                     && row.modifyStatus !== 'pendingAudit'
                     && (row.modifyOriginStage === 'factory' || row.modifyOriginStage === 'bill')">
            <el-button size="small" type="success" @click="handleConfirm(row)">确认生效</el-button>
          </template>

          <!-- 客户下单员 / 客户审核员 / 管理员：撤回 -->
          <el-button
            v-if="canWithdraw(row)"
            size="small"
            type="warning"
            plain
            @click="handleWithdraw(row)"
          >
            撤回
          </el-button>

          <!-- 其他：只看 -->
          <el-tag v-if="!canOperate(row) && !canWithdraw(row)" size="small" type="info" effect="plain">
            只看
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无修改记录" />

    <!-- 分页 -->
    <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Right } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import {
  getPendingModifyList,
  auditOrderModify,
  confirmOrderModify,
  withdrawOrderModify
} from '@/api/order';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const tableData = ref([]);
const filterStatus = ref('all');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const isCustomerAudit = computed(() => userStore.userType === 'customerAudit');
const isCustomer = computed(() => userStore.userType === 'customer');
const isFactoryOrder = computed(() => userStore.userType === 'factoryOrder');

// ===== 阶段显示 =====
const getOriginStageText = (stage) => {
  return { customer: '客户阶段', factory: '工厂阶段', bill: '账单阶段' }[stage] || '—';
};
const getOriginStageType = (stage) => {
  return { customer: 'info', factory: 'primary', bill: 'warning' }[stage] || 'info';
};

// ===== 当前状态 =====
const getCurrentStatusText = (row) => {
  if (row.modifyStatus === 'pendingAudit') return '待客户审核';
  if (row.modifyTracking) {
    if (row.modifyOriginStage === 'customer') return '等待客户重新提交';
    if (row.modifyOriginStage === 'factory' || row.modifyOriginStage === 'bill') return '待工厂确认';
    return '追踪中';
  }
  return '已结束';
};
const getCurrentStatusType = (row) => {
  if (row.modifyStatus === 'pendingAudit') return 'warning';
  if (row.modifyTracking) return 'primary';
  return 'success';
};

// ===== 权限 =====
const canOperate = (row) => {
  if (isCustomerAudit.value && row.modifyStatus === 'pendingAudit') return true;
  if (isFactoryOrder.value 
      && row.modifyTracking 
      && row.modifyStatus !== 'pendingAudit'
      && (row.modifyOriginStage === 'factory' || row.modifyOriginStage === 'bill')) return true;
  return false;
};

const canWithdraw = (row) => {
  if (!row.modifyTracking) return false;
  if (row.modifyStatus !== 'pendingAudit') return false;   // 只有申请阶段能撤回
  if (userStore.userType === 'admin') return true;
  if (isCustomer.value && row.applyBy === userStore.userId) return true;
  if (isCustomerAudit.value) return true;
  return false;
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const res = await getPendingModifyList({
      status: filterStatus.value === 'all' ? undefined : filterStatus.value,
      page: page.value,
      pageSize: pageSize.value
    });
    const data = res?.data || {};
    // 新接口返回 { items: [...], total: N }，旧接口直接返回数组（兼容）
    if (Array.isArray(data)) {
      tableData.value = data;
      total.value = data.length;
    } else {
      tableData.value = data.items || data.list || [];
      total.value = typeof data.total === 'number' ? data.total : (tableData.value.length || 0);
    }
  } catch {
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

// ===== 客户审核员：同意 / 驳回 =====
const handleAudit = async (row, approved) => {
  try {
    if (approved) {
      await ElMessageBox.confirm(
        '同意后订单将退回草稿，客户可重新编辑并提交。确认同意？',
        '同意修改',
        { type: 'warning', confirmButtonText: '确认同意', cancelButtonText: '取消' }
      );
      await auditOrderModify(row.requestId, { approved: true, remark: '同意修改' });
      ElMessage.success('已同意，订单已退回草稿');
    } else {
      const { value } = await ElMessageBox.prompt(
        '请填写驳回原因',
        '驳回修改',
        {
          inputType: 'textarea',
          confirmButtonText: '确认驳回',
          cancelButtonText: '取消',
          inputPlaceholder: '请输入驳回原因',
          inputValidator: v => v?.trim() ? true : '请输入驳回原因'
        }
      );
      await auditOrderModify(row.requestId, { approved: false, remark: value.trim() });
      ElMessage.success('已驳回');
    }
    loadData();
  } catch (e) {
    if (e !== 'cancel' && e?.name !== 'cancel') {
      ElMessage.error(e.message || '操作失败');
    }
  }
};

// ===== 工厂操作员：确认生效 =====
const handleConfirm = async (row) => {
  try {
    await ElMessageBox.confirm(
      '确认后该修改将生效，订单号不再标记。',
      '确认修改生效',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    );
    await confirmOrderModify(row.orderId);
    ElMessage.success('已确认');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

// ===== 撤回 =====
const handleWithdraw = async (row) => {
  try {
    await ElMessageBox.confirm('确定撤回该修改申请吗？', '撤回', { type: 'warning' });
    await withdrawOrderModify(row.requestId);
    ElMessage.success('已撤回');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '撤回失败');
  }
};

// ===== 查看详情 =====
const viewDetail = (orderId) => {
  router.push(`/order/detail/${orderId}`);
};

const formatDateTime = (d) => (d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-');

onMounted(loadData);
</script>

<style scoped>
.page-container {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  min-height: 100%;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.page-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.blink-modify {
  animation: blink 1s infinite;
  color: #f56c6c;
  font-weight: 700;
}
.modify-badge {
  margin-left: 4px;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.diff-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  margin-bottom: 3px;
}
.diff-label {
  color: #409eff;
  min-width: 80px;
}
.diff-old {
  color: #303133;
  text-decoration: line-through;
}
.diff-new {
  color: #f56c6c;
  font-weight: 600;
}
.diff-empty {
  color: #909399;
  font-size: 12px;
}
</style>