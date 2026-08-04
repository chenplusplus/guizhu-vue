<!-- src/views/order/audit.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>✅ 客户订单审核</h2>
      <div style="display: flex; gap: 8px;">
        <el-button
          v-if="selectedOrders.length > 0"
          type="success"
          @click="handleBatchAudit(true)"
        >
          批量通过 ({{ selectedOrders.length }})
        </el-button>
        <el-button
          v-if="selectedOrders.length > 0"
          type="danger"
          @click="handleBatchAudit(false)"
        >
          批量驳回 ({{ selectedOrders.length }})
        </el-button>
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="search" size="default">
        <el-form-item label="关键词">
          <el-input
            v-model="search.keyword"
            placeholder="订单号/品名/客户"
            clearable
            style="width: 180px;"
          />
        </el-form-item>

        <el-form-item label="客户">
          <el-select
            v-model="search.customerId"
            placeholder="全部客户"
            clearable
            filterable
            style="width: 150px;"
          >
            <el-option
              v-for="item in customerList"
              :key="item.customerId"
              :label="item.customerName"
              :value="item.customerId"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="日期">
          <el-date-picker
            v-model="search.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px;"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadData">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><RefreshRight /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计 -->
    <el-row :gutter="12" style="margin-bottom: 16px;">
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #E6A23C;">
          <div class="stat-number">{{ tableData.length }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #409EFF;">
          <div class="stat-number">{{ selectedOrders.length }}</div>
          <div class="stat-label">已选</div>
        </div>
      </el-col>
    </el-row>

    <!-- 表格 -->
    <el-table
      ref="tableRef"
      :data="tableData"
      v-loading="loading"
      border
      stripe
      @selection-change="handleSelectionChange"
      @row-click="viewDetail"
      row-key="orderId"
    >
      <el-table-column type="selection" width="50" align="center" />

      <el-table-column prop="orderNo" label="订单号" width="150" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.orderId)">
            {{ row.orderNo }}
          </el-link>
        </template>
      </el-table-column>

      <el-table-column prop="orderDate" label="订单日期" width="100" align="center">
        <template #default="{ row }">
          {{ formatDate(row.orderDate) }}
        </template>
      </el-table-column>

      <el-table-column prop="customerName" label="客户" width="120" />

      <el-table-column prop="productName" label="品名" min-width="120" />

      <!-- 产品图片 -->
      <el-table-column label="图片" width="70" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row.imageUrl"
            :src="row.imageUrl"
            fit="cover"
            style="width: 50px; height: 50px; border-radius: 4px; cursor: pointer;"
            :preview-src-list="[row.imageUrl]"
            preview-teleported
          />
          <span v-else style="color: #ccc; font-size: 12px;">无图</span>
        </template>
      </el-table-column>

      <el-table-column prop="size" label="手寸" width="80" align="center" />

      <el-table-column prop="widthThick" label="宽/厚度" width="90" align="center" />

      <el-table-column prop="quantity" label="数量" width="65" align="center" />

      <el-table-column prop="color" label="成色" width="80" align="center" />

      <el-table-column prop="goldPrice" label="金价" width="85" align="right">
        <template #default="{ row }">{{ row.goldPrice || '-' }}</template>
      </el-table-column>

      <el-table-column prop="diamondLevel" label="钻石级别" width="100" align="center" />

      <el-table-column prop="weightRequirement" label="克重要求" width="105" align="center" />

      <el-table-column prop="logoText" label="LOGO" width="100" align="center" />

      <el-table-column prop="deliveryDays" label="工期" width="65" align="center" />

      <el-table-column prop="url" label="网址" min-width="120">
        <template #default="{ row }">
          <a v-if="row.url" :href="row.url" target="_blank" style="color: #409EFF; text-decoration: none;">
            查看链接
          </a>
          <span v-else style="color: #ccc;">-</span>
        </template>
      </el-table-column>

      <el-table-column prop="remark" label="备注" min-width="100">
        <template #default="{ row }">
          <span v-if="row.remark">{{ row.remark }}</span>
          <span v-else style="color: #ccc;">-</span>
        </template>
      </el-table-column>

      <el-table-column prop="createdAt" label="提交时间" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="170" fixed="right" align="center">
        <template #default="{ row }">
          <el-button size="small" type="success" @click.stop="handleAudit(row, true)">
            通过
          </el-button>
          <el-button size="small" type="danger" @click.stop="handleAudit(row, false)">
            驳回
          </el-button>
          <el-button size="small" type="primary" link @click.stop="viewDetail(row.orderId)">
            查看
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无待审核订单" />

    <!-- 分页 -->
    <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="loadData"
      />
    </div>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回原因" width="450px" destroy-on-close>
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

    <!-- 流程抽屉 -->
    <FlowDrawer
      v-model="flowDrawerVisible"
      :order-id="currentFlowOrderId"
      :order-no="currentFlowOrderNo"
      :current-status="currentFlowStatus"
      @refresh="loadData"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderList, auditOrder } from '@/api/order';
import { getCustomerList } from '@/api/customer';
import FlowDrawer from '@/components/FlowDrawer.vue';

const router = useRouter();
const userStore = useUserStore();
const tableRef = ref();

const loading = ref(false);
const rejectLoading = ref(false);
const tableData = ref([]);
const selectedOrders = ref([]);
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const currentOrder = ref(null);
const customerList = ref([]);

// 流程抽屉
const flowDrawerVisible = ref(false);
const currentFlowOrderId = ref(0);
const currentFlowOrderNo = ref('');
const currentFlowStatus = ref('');

const search = reactive({
  keyword: '',
  customerId: '',
  dateRange: [],
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

// ===== 状态映射 =====
const statusMap = {
  pending: { text: '待客户审核', type: 'warning' },
  customerAudited: { text: '客户已审核', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' },
};

const getStatusText = (status) => statusMap[status]?.text || status;
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ===== 加载客户列表 =====
const loadCustomers = async () => {
  try {
    const res = await getCustomerList({ includeInactive: false });
    customerList.value = res?.data || [];
  } catch {
    customerList.value = [];
  }
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      status: 'pending',
      keyword: search.keyword || undefined,
      customerId: search.customerId || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    };

    if (search.dateRange && search.dateRange.length === 2) {
      params.startDate = search.dateRange[0];
      params.endDate = search.dateRange[1];
    }

    const res = await getOrderList(params);
    const data = res?.data || res || {};
    tableData.value = data.items || data || [];
    pagination.total = data.total || tableData.value.length;
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  search.keyword = '';
  search.customerId = '';
  search.dateRange = [];
  pagination.current = 1;
  loadData();
};

// ===== 多选 =====
const handleSelectionChange = (selection) => {
  selectedOrders.value = selection;
};

// ===== 查看详情 =====
const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

// ===== 单个审核 =====
const handleAudit = (row, approved) => {
  currentOrder.value = row;
  if (!approved) {
    rejectReason.value = '';
    rejectDialogVisible.value = true;
  } else {
    doAudit(row.orderId, true, '');
  }
};

// ===== 批量审核 =====
const handleBatchAudit = async (approved) => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请至少选择一个订单');
    return;
  }

  if (!approved) {
    rejectReason.value = '';
    rejectDialogVisible.value = true;
    // 暂存批量驳回的订单列表
    currentOrder.value = { batch: true, orders: selectedOrders.value };
    return;
  }

  // 批量通过
  try {
    await ElMessageBox.confirm(
      `确定要通过 ${selectedOrders.value.length} 个订单吗？`,
      '批量通过',
      { type: 'info' }
    );
    let successCount = 0;
    let failCount = 0;

    for (const order of selectedOrders.value) {
      try {
        await auditOrder(order.orderId, { approved: true, remark: '' });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0 && failCount === 0) {
      ElMessage.success(`${successCount} 个订单审核通过`);
    } else if (successCount > 0 && failCount > 0) {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
    } else {
      ElMessage.error('全部失败');
    }
    loadData();
  } catch {}
};

// ============================================================
// 确认驳回
// ============================================================
const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }

  rejectLoading.value = true;
  try {
    // 批量驳回
    if (currentOrder.value?.batch) {
      const orders = currentOrder.value.orders;
      let successCount = 0;
      let failCount = 0;

      for (const order of orders) {
        try {
          await auditOrder(order.orderId, {
            approved: false,
            remark: rejectReason.value,
          });
          successCount++;
        } catch {
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        ElMessage.success(`${successCount} 个订单已驳回`);
      } else if (successCount > 0 && failCount > 0) {
        ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
      } else {
        ElMessage.error('全部失败');
      }
    } else {
      // 单个驳回
      await doAudit(currentOrder.value.orderId, false, rejectReason.value);
    }

    rejectDialogVisible.value = false;
    rejectReason.value = '';
    currentOrder.value = null;
    loadData();
  } finally {
    rejectLoading.value = false;
  }
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

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN', { hour12: false });
};

// ===== 初始化 =====
onMounted(() => {
  loadCustomers();
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

.search-bar {
  background: #f5f7fa;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.search-bar :deep(.el-form-item) {
  margin-bottom: 0;
}

.stat-card {
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 6px;
  border-left: 4px solid #ddd;
}
.stat-card .stat-number {
  font-size: 22px;
  font-weight: bold;
  color: #303133;
}
.stat-card .stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

:deep(.el-table .cell) {
  padding: 6px 8px;
}
:deep(.el-table .el-table__row) {
  cursor: pointer;
}
:deep(.el-button.is-link) {
  padding: 0 4px;
}

/* 图片悬停放大 */
:deep(.el-image) {
  transition: transform 0.3s;
}
:deep(.el-image:hover) {
  transform: scale(2.5);
  z-index: 10;
  position: relative;
}
</style>