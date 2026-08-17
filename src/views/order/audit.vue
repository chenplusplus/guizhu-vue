<!-- src/views/order/audit.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>✅ 客户订单审核</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <el-button
          v-if="selectedOrders.length > 0"
          type="success"
          @click="handleBatchAudit(true)"
          :loading="batchLoading"
        >
          批量通过 ({{ selectedOrders.length }})
        </el-button>
        <el-button
          v-if="selectedOrders.length > 0"
          type="danger"
          @click="handleBatchAudit(false)"
          :loading="batchLoading"
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
            placeholder="订单号/品名"
            clearable
            style="width: 180px;"
            @keyup.enter="loadData"
          />
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

        <el-form-item label="状态">
          <el-select v-model="search.status" placeholder="全部状态" clearable style="width: 140px;">
            <el-option label="待审核" value="pending" />
            <el-option label="已审核" value="customerAudited" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
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

    <!-- 表格 -->
    <el-table
      ref="tableRef"
      :data="tableData"
      v-loading="loading"
      border
      stripe
      @selection-change="handleSelectionChange"
      @row-click="handleRowClick"
      row-key="orderId"
    >
      <el-table-column type="selection" width="50" align="center" :selectable="checkSelectable" />

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
            @click.stop
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
          <a v-if="row.url" :href="row.url" target="_blank" style="color: #409EFF; text-decoration: none;" @click.stop>
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

      <el-table-column prop="flowStatus" label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.flowStatus)" size="small">
            {{ getStatusText(row.flowStatus) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="createdAt" label="提交时间" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="220" fixed="right" align="center">
        <template #default="{ row }">
          <!-- 只有待审核状态才显示审核按钮 -->
          <template v-if="row.flowStatus === 'pending'">
            <el-button size="small" type="success" @click.stop="handleAudit(row, true)">
              通过
            </el-button>
            <el-button size="small" type="danger" @click.stop="handleAudit(row, false)">
              驳回
            </el-button>
          </template>
          <el-button size="small" type="primary" link @click.stop="viewDetail(row.orderId)">
            查看
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无审核数据" />

    <!-- 分页 -->
    <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadData"
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
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderList, auditOrder } from '@/api/order';
import FlowDrawer from '@/components/FlowDrawer.vue';

const router = useRouter();
const userStore = useUserStore();
const tableRef = ref();

const loading = ref(false);
const rejectLoading = ref(false);
const batchLoading = ref(false);
const tableData = ref([]);
const selectedOrders = ref([]);
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const currentOrder = ref(null);
const isBatchReject = ref(false);

// 流程抽屉
const flowDrawerVisible = ref(false);
const currentFlowOrderId = ref(0);
const currentFlowOrderNo = ref('');
const currentFlowStatus = ref('');

// 当前用户绑定的客户ID
const currentCustomerId = computed(() => {
  return userStore.userInfo?.customerId || null;
});

const search = reactive({
  keyword: '',
  status: '', // 空 = 全部，pending = 待审核，customerAudited = 已审核，rejected = 已驳回
  dateRange: [],
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

// ===== 状态映射 =====
const statusMap = {
  pending: { text: '待审核', type: 'warning' },
  customerAudited: { text: '已审核', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' },
  draft: { text: '草稿', type: 'info' },
};

const getStatusText = (status) => statusMap[status]?.text || status;
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ===== 行点击 - 打开流程抽屉 =====
const handleRowClick = (row) => {
  currentFlowOrderId.value = row.orderId;
  currentFlowOrderNo.value = row.orderNo;
  currentFlowStatus.value = row.flowStatus;
  flowDrawerVisible.value = true;
};

// ===== 是否可勾选（只有待审核的才能选中） =====
const checkSelectable = (row) => {
  return row.flowStatus === 'pending';
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      keyword: search.keyword || undefined,
      status: search.status || undefined,
      customerId: currentCustomerId.value || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    };

    if (search.dateRange && search.dateRange.length === 2) {
      params.startDate = search.dateRange[0];
      params.endDate = search.dateRange[1];
    }

    const res = await getOrderList(params);
    const data = res?.data || res || {};

    // 兼容多种返回格式
    if (Array.isArray(data)) {
      tableData.value = data;
      pagination.total = data.length;
    } else if (data.items && Array.isArray(data.items)) {
      tableData.value = data.items;
      pagination.total = data.total || data.items.length;
    } else if (data.list && Array.isArray(data.list)) {
      tableData.value = data.list;
      pagination.total = data.total || data.list.length;
    } else if (data.data && Array.isArray(data.data)) {
      tableData.value = data.data;
      pagination.total = data.total || data.data.length;
    } else {
      tableData.value = [];
      pagination.total = 0;
    }
  } catch (error) {
    ElMessage.error(error.message || '加载数据失败');
    tableData.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  search.keyword = '';
  search.status = '';
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
    isBatchReject.value = false;
    rejectReason.value = '';
    rejectDialogVisible.value = true;
  } else {
    doAudit(row.orderId, true, '');
  }
};

// ===== 批量审核 =====
const handleBatchAudit = async (approved) => {
  const pendingOrders = selectedOrders.value.filter(row => row.flowStatus === 'pending');
  
  if (pendingOrders.length === 0) {
    ElMessage.warning('请至少选择一个待审核的订单');
    return;
  }

  if (!approved) {
    isBatchReject.value = true;
    currentOrder.value = { orders: pendingOrders };
    rejectReason.value = '';
    rejectDialogVisible.value = true;
    return;
  }

  // 批量通过
  try {
    await ElMessageBox.confirm(
      `确定要通过 ${pendingOrders.length} 个订单吗？`,
      '批量通过',
      { type: 'info' }
    );
    
    batchLoading.value = true;
    let successCount = 0;
    let failCount = 0;
    const failList = [];

    for (const order of pendingOrders) {
      try {
        await auditOrder(order.orderId, { approved: true, remark: '' });
        successCount++;
      } catch (error) {
        failCount++;
        failList.push(order.orderNo);
      }
    }

    if (successCount > 0) {
      ElMessage.success(`成功通过 ${successCount} 个订单${failCount > 0 ? `，失败 ${failCount} 个` : ''}`);
      if (failList.length > 0) {
        ElMessage.warning(`失败订单: ${failList.join(', ')}`);
      }
    } else {
      ElMessage.error('全部失败');
    }
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '批量操作失败');
    }
  } finally {
    batchLoading.value = false;
  }
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
    if (isBatchReject.value && currentOrder.value?.orders) {
      const orders = currentOrder.value.orders;
      let successCount = 0;
      let failCount = 0;
      const failList = [];

      for (const order of orders) {
        try {
          await auditOrder(order.orderId, {
            approved: false,
            remark: rejectReason.value,
          });
          successCount++;
        } catch (error) {
          failCount++;
          failList.push(order.orderNo);
        }
      }

      if (successCount > 0) {
        ElMessage.success(`成功驳回 ${successCount} 个订单${failCount > 0 ? `，失败 ${failCount} 个` : ''}`);
        if (failList.length > 0) {
          ElMessage.warning(`失败订单: ${failList.join(', ')}`);
        }
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
    isBatchReject.value = false;
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
  // 默认日期：今天
  const today = new Date();
  const todayStr = formatDate(today);
  search.dateRange = [todayStr, todayStr];
  
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
  flex-wrap: wrap;
  gap: 8px;
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
.search-bar :deep(.el-form-item:last-child) {
  margin-left: 8px;
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