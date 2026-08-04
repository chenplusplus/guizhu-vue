<!-- src/views/order/bill-audit.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>🔍 账单审核</h2>
      <el-tag type="warning">待审核</el-tag>
    </div>

    <div class="stat-card" style="border-left:4px solid #E6A23C;margin-bottom:16px;padding:12px 16px;background:#fafafa;border-radius:6px;">
      <span style="font-size:22px;font-weight:bold;color:#303133;">{{ tableData.length }}</span>
      <span style="font-size:13px;color:#909399;margin-left:8px;">个待审核账单</span>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading" @row-click="viewDetail">
      <el-table-column prop="billNo" label="账单编号" width="160">
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.billId)">{{ row.billNo }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="operatorName" label="业务员" width="100" />
      <el-table-column prop="totalAmount" label="总金额" width="120" align="right">
        <template #default="{ row }">¥{{ (row.totalAmount || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="totalQuantity" label="总件数" width="70" align="center" />
      <el-table-column prop="orderCount" label="订单数" width="70" align="center" />
      <el-table-column prop="createdAt" label="提交时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click.stop="viewDetail(row.billId)">查看</el-button>
          <el-button size="small" type="success" @click.stop="handleAudit(row, true)">通过</el-button>
          <el-button size="small" type="danger" @click.stop="handleAudit(row, false)">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无待审核账单" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getBillList, auditBill } from '@/api/bill';

const router = useRouter();
const loading = ref(false);
const tableData = ref([]);

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getBillList({ status: 'pending' });
    tableData.value = res?.data || [];
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const handleAudit = async (row, approved) => {
  try {
    await ElMessageBox.confirm(approved ? '审核通过该账单？' : '驳回该账单？', '确认', { type: approved ? 'info' : 'warning' });
    await auditBill(row.billId, { approved });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    loadData();
  } catch {}
};

const viewDetail = (id) => {
  router.push(`/order/bill/detail/${id}`);
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN', { hour12: false });
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
:deep(.el-table .el-table__row) { cursor: pointer; }
</style>