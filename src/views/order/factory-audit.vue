<!-- src/views/order/factory-audit.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>🏭 工厂审核</h2>
      <el-tag type="warning">账单待审核</el-tag>
    </div>

    <!-- 统计 -->
    <el-row :gutter="12" style="margin-bottom: 16px;">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-number">{{ tableData.length }}</div>
          <div class="stat-label">待审核账单</div>
        </div>
      </el-col>
    </el-row>

    <!-- 表格 -->
    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="orderNo" label="订单号" width="150" />
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="productName" label="品名" min-width="120" />
      <el-table-column prop="quantity" label="件数" width="70" align="center" />
      <el-table-column prop="amount" label="金额" width="110" align="right">
        <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="申请时间" width="160">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" align="center">
        <template #default="{ row }">
          <el-button type="success" size="small" @click="handleAudit(row, true)">
            通过
          </el-button>
          <el-button type="danger" size="small" @click="handleAudit(row, false)">
            驳回
          </el-button>
          <el-button type="primary" size="small" link @click="viewDetail(row.orderId)">
            查看
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无待审核账单" />

    <!-- 驳回弹窗 -->
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getBillPendingOrders, auditBill } from '@/api/order';

const router = useRouter();

const loading = ref(false);
const tableData = ref([]);
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const rejectLoading = ref(false);
const currentOrder = ref(null);

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const res = await getBillPendingOrders();
    tableData.value = res?.data || [];
    if (!Array.isArray(tableData.value)) {
      tableData.value = [];
    }
  } catch (error) {
    ElMessage.error(error.message || '加载数据失败');
    tableData.value = [];
  } finally {
    loading.value = false;
  }
};

// ===== 审核 =====
const handleAudit = (row, approved) => {
  currentOrder.value = row;
  if (!approved) {
    rejectReason.value = '';
    rejectDialogVisible.value = true;
  } else {
    doAudit(row.orderId, true, '');
  }
};

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  rejectLoading.value = true;
  try {
    await doAudit(currentOrder.value.orderId, false, rejectReason.value);
    rejectDialogVisible.value = false;
    rejectReason.value = '';
  } finally {
    rejectLoading.value = false;
  }
};

const doAudit = async (orderId, approved, remark) => {
  try {
    await auditBill(orderId, { approved, remark });
    ElMessage.success(approved ? '账单审核通过' : '已驳回');
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '操作失败');
    throw error;
  }
};

// ===== 查看详情 =====
const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', { hour12: false });
};

// ===== 初始化 =====
onMounted(() => {
  loadData();
});
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

.stat-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px 20px;
  text-align: center;
}
.stat-card .stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}
.stat-card .stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
</style>