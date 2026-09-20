<template>
  <div class="page-container">
    <div class="page-header">
      <h2>✏️ 修改订单</h2>
      <el-button @click="loadData">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column label="订单号" width="170">
        <template #default="{ row }">
          <span class="blink-modify">{{ row.orderNo }}</span>
          <span class="modify-badge">✏️</span>
        </template>
      </el-table-column>
      <el-table-column prop="applyName" label="申请人" width="110" />
      <el-table-column label="申请时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.applyAt) }}</template>
      </el-table-column>
      <el-table-column prop="applyReason" label="申请原因" min-width="160" show-overflow-tooltip />
      <el-table-column label="当前状态" width="130" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'pendingAudit' ? 'warning' : 'primary'" size="small">
            {{ row.status === 'pendingAudit' ? '待客户审核' : '待工厂确认' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="修改明细" min-width="320">
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
      <el-table-column label="操作" width="220" fixed="right" align="center">
        <template #default="{ row }">
          <!-- 客户审核员 -->
          <template v-if="isCustomerAudit && row.status === 'pendingAudit'">
            <el-button size="small" type="success" @click="handleAudit(row, true)">同意</el-button>
            <el-button size="small" type="danger" @click="handleAudit(row, false)">驳回</el-button>
          </template>
          <!-- 工厂操作员 -->
          <template v-if="isFactoryOrder && row.status === 'pendingFactory'">
            <el-button size="small" type="success" @click="handleConfirm(row, true)">确认生效</el-button>
            <el-button size="small" type="danger" @click="handleConfirm(row, false)">驳回</el-button>
          </template>
          <!-- 撤回（客户下单员 / 客户审核员 / 管理员） -->
          <el-button
            v-if="canWithdraw(row)"
            size="small"
            type="warning"
            plain
            @click="handleWithdraw(row)"
          >
            撤回
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无待处理的修改申请" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Right } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import {
  getPendingModifyList,
  auditOrderModify,
  confirmOrderModify,
  withdrawOrderModify
} from '@/api/order';

const userStore = useUserStore();
const loading = ref(false);
const tableData = ref([]);

const isCustomerAudit = computed(() => userStore.userType === 'customerAudit');
const isFactoryOrder = computed(() => userStore.userType === 'factoryOrder');

const canWithdraw = (row) => {
  if (userStore.userType === 'admin') return true;
  if (userStore.userType === 'customer' && row.applyBy === userStore.userId) return true;
  if (userStore.userType === 'customerAudit' && row.status === 'pendingAudit') return true;
  return false;
};

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getPendingModifyList();
    tableData.value = res?.data || [];
  } catch {
    tableData.value = [];
  } finally {
    loading.value = false;
  }
};

const handleAudit = async (row, approved) => {
  try {
    const { value } = await ElMessageBox.prompt(
      approved ? '确认同意该修改申请？' : '请填写驳回原因',
      approved ? '同意修改' : '驳回修改',
      {
        inputType: approved ? 'text' : 'textarea',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: approved ? '（可选）备注' : '请输入驳回原因',
      }
    );
    await auditOrderModify(row.requestId, { approved, remark: value || '' });
    ElMessage.success(approved ? '已同意' : '已驳回');
    loadData();
  } catch (e) {
    if (e !== 'cancel' && e?.name !== 'cancel') {
      ElMessage.error(e.message || '操作失败');
    }
  }
};

const handleConfirm = async (row, approved) => {
  try {
    const { value } = await ElMessageBox.prompt(
      approved ? '确认修改生效？确认后订单数据将被覆盖。' : '请填写驳回原因',
      approved ? '确认生效' : '驳回修改',
      {
        inputType: approved ? 'text' : 'textarea',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: approved ? '（可选）备注' : '请输入驳回原因',
      }
    );
    await confirmOrderModify(row.requestId, { approved, remark: value || '' });
    ElMessage.success(approved ? '修改已生效' : '已驳回');
    loadData();
  } catch (e) {
    if (e !== 'cancel' && e?.name !== 'cancel') {
      ElMessage.error(e.message || '操作失败');
    }
  }
};

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
