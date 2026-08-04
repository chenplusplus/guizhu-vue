<!-- src/views/order/bill-create.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📄 生成账单</h2>
        <el-tag type="info" size="large">我的已完成订单</el-tag>
      </div>
      <div class="header-right">
        <el-button
          type="primary"
          @click="handleCreateBill"
          :loading="creating"
          :disabled="selectedOrders.length === 0"
        >
          生成账单 ({{ selectedOrders.length }})
        </el-button>
      </div>
    </div>

    <!-- 统计 -->
    <el-row :gutter="12" style="margin-bottom:16px;">
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #409EFF;">
          <div class="stat-number">{{ orderList.length }}</div>
          <div class="stat-label">可生成订单</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #E6A23C;">
          <div class="stat-number">{{ selectedOrders.length }}</div>
          <div class="stat-label">已选</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #67C23A;">
          <div class="stat-number">¥{{ selectedTotal.toFixed(2) }}</div>
          <div class="stat-label">选中金额</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #909399;">
          <div class="stat-number">{{ selectedOrders.length }} 件</div>
          <div class="stat-label">选中件数</div>
        </div>
      </el-col>
    </el-row>

    <!-- 订单列表 -->
    <el-table
      :data="orderList"
      border
      stripe
      @selection-change="handleSelectionChange"
      v-loading="loading"
    >
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column prop="orderNo" label="订单号" width="150" />
      <el-table-column prop="productName" label="品名" min-width="120" />
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="quantity" label="件数" width="70" align="center" />
      <el-table-column prop="color" label="成色" width="80" align="center" />
      <el-table-column prop="totalAmount" label="金额" width="110" align="right">
        <template #default="{ row }">
          ¥{{ (row.totalAmount || 0).toFixed(2) }}
        </template>
      </el-table-column>
      <el-table-column prop="orderDate" label="订单日期" width="110" align="center">
        <template #default="{ row }">
          {{ formatDate(row.orderDate) }}
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="完成时间" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && orderList.length === 0" description="暂无已完成订单" />

    <!-- 分页 -->
    <div style="margin-top:16px;display:flex;justify-content:flex-end;">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="loadData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { getAvailableOrders, createBill } from '@/api/bill';

const router = useRouter();

const loading = ref(false);
const creating = ref(false);
const orderList = ref([]);
const selectedOrders = ref([]);

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

// ===== 计算选中合计 =====
const selectedTotal = computed(() => {
  return selectedOrders.value.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
});

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const res = await getAvailableOrders();
    orderList.value = res?.data || [];
    pagination.total = orderList.value.length;
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

// ===== 多选 =====
const handleSelectionChange = (selection) => {
  selectedOrders.value = selection;
};

// ===== 生成账单 =====
const handleCreateBill = async () => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请至少选择一个订单');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定为 ${selectedOrders.value.length} 个订单生成账单吗？`,
      '生成账单',
      { type: 'info' }
    );
  } catch {
    return;
  }

  creating.value = true;
  try {
    const orderIds = selectedOrders.value.map(o => o.orderId);
    const res = await createBill({ orderIds });
    if (res.success) {
      ElMessage.success(`账单 ${res.billNo} 生成成功`);
      router.push(`/order/bill/detail/${res.billId}`);
    }
  } catch {
    ElMessage.error('生成账单失败');
  } finally {
    creating.value = false;
  }
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN', { hour12: false });
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.header-left { display: flex; align-items: center; gap: 12px; }

.stat-card { background: #fafafa; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #ddd; }
.stat-card .stat-number { font-size: 22px; font-weight: bold; color: #303133; }
.stat-card .stat-label { font-size: 13px; color: #909399; margin-top: 4px; }

:deep(.el-table .cell) { padding: 6px 8px; }
</style>