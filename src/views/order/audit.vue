<!-- src/views/order/audit.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>{{ pageTitle }}</h2>
    </div>

    <el-table :data="tableData" v-loading="loading" border stripe>
      <el-table-column prop="orderNo" label="订单号" width="150" />
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="productName" label="品名" min-width="120" />
      <el-table-column prop="quantity" label="件数" width="70" align="center" />
      <el-table-column prop="amount" label="金额" width="110" align="right">
        <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="flowStatus" label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.flowStatus)">{{ getStatusText(row.flowStatus) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center">
        <template #default="{ row }">
          <el-button type="success" size="small" @click="handleAudit(row, true)">通过</el-button>
          <el-button type="danger" size="small" @click="handleAudit(row, false)">驳回</el-button>
          <el-button type="primary" size="small" link @click="viewDetail(row.orderId)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无待审核订单" />

    <!-- 驳回弹窗 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回原因" width="450px">
      <el-input v-model="rejectReason" type="textarea" :rows="4" placeholder="请填写驳回原因（必填）" />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="rejectLoading">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { ElMessage } from 'element-plus';
import { getPendingOrders, auditOrder } from '@/api/order';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const tableData = ref([]);
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const rejectLoading = ref(false);
const currentOrder = ref(null);

const pageTitle = computed(() => {
  if (userStore.isCustomerAudit) return '客户审核';
  if (userStore.isFactoryAudit) return '工厂审核';
  return '订单审核';
});

const statusMap = {
  pending: { text: '待客户审核', type: 'warning' },
  customerAudited: { text: '客户已审核', type: 'primary' },
  factoryPending: { text: '待工厂审核', type: 'warning' },
  audited: { text: '工厂已审核', type: 'primary' },
  producing: { text: '制作中', type: 'warning' },
  completed: { text: '已完成', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' },
};

const getStatusText = (status) => statusMap[status]?.text || status || '-';
const getStatusType = (status) => statusMap[status]?.type || 'info';

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getPendingOrders();
    tableData.value = res?.data || [];
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const handleAudit = (row, approved) => {
  currentOrder.value = row;
  if (!approved) {
    rejectReason.value = '';
    rejectDialogVisible.value = true;
  } else {
    doAudit(row.orderId, true, '');
  }
};

const confirmReject = () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  doAudit(currentOrder.value.orderId, false, rejectReason.value);
  rejectDialogVisible.value = false;
};

const doAudit = async (orderId, approved, remark) => {
  try {
    await auditOrder(orderId, { approved, remark });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '操作失败');
  }
};

const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

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
</style>