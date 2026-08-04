<!-- src/views/order/bill-my-list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📄 我的账单</h2>
      <el-button @click="loadData">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <!-- 搜索 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="状态">
          <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width:140px;" @change="loadData">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已确认" value="confirmed" />
            <el-option label="已退回" value="returned" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input v-model="keyword" placeholder="搜索账单号" clearable style="width:180px;" @clear="loadData" @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计 -->
    <el-row :gutter="12" style="margin-bottom:16px;">
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #E6A23C;">
          <div class="stat-number">{{ statusCount.pending || 0 }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #409EFF;">
          <div class="stat-number">{{ statusCount.approved || 0 }}</div>
          <div class="stat-label">待确认</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #67C23A;">
          <div class="stat-number">{{ statusCount.confirmed || 0 }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #F56C6C;">
          <div class="stat-number">{{ statusCount.returned || 0 }}</div>
          <div class="stat-label">已退回</div>
        </div>
      </el-col>
    </el-row>

    <!-- 表格 -->
    <el-table :data="tableData" border stripe v-loading="loading" @row-click="viewDetail">
      <el-table-column prop="billNo" label="账单编号" width="160">
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.billId)">
            {{ row.billNo }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="operatorName" label="业务员" width="100" />
      <el-table-column prop="orderCount" label="订单数" width="70" align="center" />
      <el-table-column prop="totalQuantity" label="总件数" width="70" align="center" />
      <el-table-column prop="totalAmount" label="总金额" width="120" align="right">
        <template #default="{ row }">
          <span style="color:#E6A23C;font-weight:bold;">¥{{ (row.totalAmount || 0).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="billDate" label="账单日期" width="110" align="center">
        <template #default="{ row }">{{ formatDate(row.billDate) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click.stop="viewDetail(row.billId)">查看</el-button>
          <el-button
            v-if="row.status === 'approved'"
            size="small"
            type="success"
            @click.stop="handleConfirm(row)"
          >
            确认
          </el-button>
          <el-button
            v-if="row.status === 'approved'"
            size="small"
            type="danger"
            @click.stop="handleReturn(row)"
          >
            退回
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无账单" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getBillList, confirmBill } from '@/api/bill';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const tableData = ref([]);
const filterStatus = ref('');
const keyword = ref('');
const statusCount = reactive({ pending: 0, approved: 0, confirmed: 0, returned: 0, rejected: 0 });

// ===== 状态映射 =====
const statusMap = {
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  returned: { text: '已退回', type: 'danger' },
  confirmed: { text: '已确认', type: 'success' },
};
const getStatusText = (s) => statusMap[s]?.text || s;
const getStatusType = (s) => statusMap[s]?.type || 'info';

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const res = await getBillList({ status: filterStatus.value || undefined });
    const data = res?.data || [];
    tableData.value = data;

    // 统计
    Object.keys(statusCount).forEach(k => statusCount[k] = 0);
    data.forEach(item => {
      if (statusCount[item.status] !== undefined) statusCount[item.status]++;
    });
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// ===== 查看详情 =====
const viewDetail = (id) => {
  router.push(`/order/bill/detail/${id}`);
};

// ===== 确认账单 =====
const handleConfirm = async (row) => {
  try {
    await ElMessageBox.confirm('确认账单无误吗？', '确认账单', { type: 'info' });
    await confirmBill(row.billId);
    ElMessage.success('账单已确认');
    loadData();
  } catch {}
};

// ===== 退回（跳转到详情页操作） =====
const handleReturn = (row) => {
  router.push(`/order/bill/detail/${row.billId}`);
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.search-bar { background: #f5f7fa; padding: 16px 20px; border-radius: 6px; margin-bottom: 16px; }
.search-bar :deep(.el-form-item) { margin-bottom: 0; }
.stat-card { background: #fafafa; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #ddd; }
.stat-card .stat-number { font-size: 22px; font-weight: bold; color: #303133; }
.stat-card .stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
:deep(.el-table .el-table__row) { cursor: pointer; }
</style>