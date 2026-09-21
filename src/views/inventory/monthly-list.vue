<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📦 月度盘点</h2>
      <div>
        <el-date-picker
          v-model="newMonth"
          type="month"
          value-format="YYYY-MM"
          placeholder="选择月份"
          style="width:150px;margin-right:8px;"
        />
        <el-button type="primary" @click="handleInit">新建盘点</el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="yearMonth" label="月份" width="120" />
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ row.statusText }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="确认时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.confirmedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" align="center">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="viewDetail(row.yearMonth)">查看</el-button>
          <el-button v-if="row.status !== 'confirmed'" type="success" size="small" @click="viewDetail(row.yearMonth)">核算</el-button>
          <el-button v-else type="warning" size="small" @click="handleUnconfirm(row)">反确认</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { getMonthlyList, initMonthly, unconfirmMonthly } from '@/api/inventoryMonthly';

const router = useRouter();
const loading = ref(false);
const tableData = ref([]);
const newMonth = ref(new Date().toISOString().slice(0, 7));

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getMonthlyList();
    tableData.value = res?.data || [];
  } finally {
    loading.value = false;
  }
};

const handleInit = async () => {
  if (!newMonth.value) return;
  try {
    await ElMessageBox.confirm(`确定新建 ${newMonth.value} 的盘点吗？`, '提示', { type: 'warning' });
    await initMonthly(newMonth.value);
    ElMessage.success('盘点创建成功');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '创建失败');
  }
};

const viewDetail = (yearMonth) => {
  router.push(`/inventory/monthly/${yearMonth}`);
};

const handleUnconfirm = async (row) => {
  try {
    await ElMessageBox.confirm('确定反确认吗？', '提示', { type: 'warning' });
    await unconfirmMonthly(row.yearMonth);
    ElMessage.success('已反确认');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const statusType = (s) => ({ draft: 'info', confirming: 'warning', confirmed: 'success' }[s] || 'info');
const formatDateTime = (d) => d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-';

onMounted(loadData);
</script>

<style scoped>
.page-container { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
