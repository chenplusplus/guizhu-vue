<!-- src/views/order/factory-history.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📦 历史订单</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button @click="columnVisibleDialog = true">
          <el-icon><Setting /></el-icon> 列设置
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="search" size="default">
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

        <el-form-item label="关键词">
          <el-input
            v-model="search.keyword"
            placeholder="订单号/品名/客户"
            clearable
            style="width: 180px;"
            @keyup.enter="loadData"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="search.status" placeholder="全部状态" clearable style="width: 140px;">
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
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

    <!-- 汇总 -->
    <div class="summary-bar" v-if="pagination.total > 0">
      <span>共 <b>{{ pagination.total }}</b> 个订单</span>
      <span style="color:#67C23A;">已完成：<b>{{ completedCount }}</b></span>
      <span style="color:#909399;">已取消：<b>{{ cancelledCount }}</b></span>
    </div>

    <!-- 表格 -->
    <el-table
      :data="tableData"
      border
      stripe
      v-loading="loading"
      @row-click="handleRowClick"
      row-key="orderId"
    >
      <el-table-column prop="orderNo" label="订单号" width="150" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.orderId)">
            {{ row.orderNo }}
          </el-link>
        </template>
      </el-table-column>

      <el-table-column prop="flowStatus" label="状态" width="110" align="center" fixed>
        <template #default="{ row }">
          <el-tag :type="row.flowStatus === 'completed' ? 'success' : 'info'" size="default" effect="light">
            {{ row.flowStatus === 'completed' ? '已完成' : '已取消' }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="customerName" label="客户" width="120" />

      <el-table-column prop="orderDate" label="订单日期" width="110" align="center">
        <template #default="{ row }">
          {{ formatDate(row.orderDate) }}
        </template>
      </el-table-column>

      <el-table-column prop="productName" label="品名" min-width="120" />

      <el-table-column label="图片" width="70" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row.imageUrl"
            :src="row.imageUrl"
            fit="cover"
            style="width:40px;height:40px;border-radius:4px;cursor:pointer;"
            :preview-src-list="[row.imageUrl]"
            preview-teleported
            @click.stop
          />
          <span v-else style="color:#ccc;font-size:12px;">无图</span>
        </template>
      </el-table-column>

      <el-table-column prop="size" label="手寸" width="80" align="center" />
      <el-table-column prop="quantity" label="数量" width="70" align="center" />
      <el-table-column prop="color" label="成色" width="80" align="center" />
      <el-table-column prop="totalAmount" label="金额" width="110" align="right">
        <template #default="{ row }">
          <span style="color:#E6A23C;font-weight:bold;">
            ¥{{ (row.totalAmount || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column prop="completedAt" label="完成时间" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.completedAt || row.updatedAt) }}
        </template>
      </el-table-column>

      <!-- ⭐ 操作列：根据角色显示不同按钮 -->
      <el-table-column label="操作" width="180" fixed="right" align="center">
        <template #default="{ row }">
          <!-- 查看：所有人都可以 -->
          <el-button size="small" type="primary" link @click.stop="viewDetail(row.orderId)">
            查看
          </el-button>

          <!-- ⭐ 再次下单：客户下单员 或 客户审核员 显示 -->
          <el-button
            v-if="userStore.isCustomerType"
            size="small"
            type="success"
            link
            @click.stop="handleReOrder(row)"
          >
            再次下单
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无历史订单" />

    <!-- 分页 -->
    <div style="margin-top:16px;display:flex;justify-content:flex-end;">
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

    <!-- 流程抽屉 -->
    <FlowDrawer
      v-model="flowDrawerVisible"
      :order-id="currentFlowOrderId"
      :order-no="currentFlowOrderNo"
      :current-status="currentFlowStatus"
    />

    <!-- 列设置弹窗 -->
    <el-dialog v-model="columnVisibleDialog" title="📋 列显示设置" width="500px">
      <div style="display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 0;">
        <el-checkbox
          v-for="col in allColumns"
          :key="col.prop"
          v-model="col.visible"
          :disabled="col.fixed"
          style="width: 120px;"
        >
          {{ col.label }}
        </el-checkbox>
      </div>
      <div style="margin-top: 12px; color: #909399; font-size: 13px;">
        <el-checkbox :model-value="isAllSelected" @change="toggleAllColumns">
          全选
        </el-checkbox>
        <span style="margin-left: 16px;">（灰色列不可隐藏）</span>
      </div>
      <template #footer>
        <el-button @click="columnVisibleDialog = false">取消</el-button>
        <el-button type="primary" @click="applyColumnSettings">应用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh, Search, RefreshRight, Setting } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderList } from '@/api/order';
import FlowDrawer from '@/components/FlowDrawer.vue';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const tableData = ref([]);
const flowDrawerVisible = ref(false);
const currentFlowOrderId = ref(0);
const currentFlowOrderNo = ref('');
const currentFlowStatus = ref('');
const columnVisibleDialog = ref(false);

// ===== 列定义 =====
const allColumns = ref([
  { prop: 'customerName', label: '客户', width: 120, visible: true },
  { prop: 'orderDate', label: '订单日期', width: 110, align: 'center', visible: true, sortable: true },
  { prop: 'productName', label: '品名', minWidth: 120, visible: true },
  { prop: 'imageUrl', label: '图片', width: 70, align: 'center', visible: true },
  { prop: 'size', label: '手寸', width: 80, align: 'center', visible: true },
  { prop: 'quantity', label: '数量', width: 70, align: 'center', visible: true },
  { prop: 'color', label: '成色', width: 80, align: 'center', visible: true },
  { prop: 'totalAmount', label: '金额', width: 110, align: 'right', visible: true },
  { prop: 'completedAt', label: '完成时间', width: 160, visible: true, sortable: true },
]);

const fixedColumns = ['orderNo'];

const visibleColumns = computed(() => {
  return allColumns.value.filter(col => col.visible);
});

const isAllSelected = computed(() => {
  const selectable = allColumns.value.filter(col => !col.fixed);
  return selectable.every(col => col.visible);
});

const toggleAllColumns = (val) => {
  allColumns.value.forEach(col => {
    if (!col.fixed) col.visible = val;
  });
};

const applyColumnSettings = () => {
  const settings = {};
  allColumns.value.forEach(col => {
    settings[col.prop] = col.visible;
  });
  localStorage.setItem('factoryHistoryColumns', JSON.stringify(settings));
  columnVisibleDialog.value = false;
  ElMessage.success('列设置已保存');
};

const loadColumnSettings = () => {
  try {
    const saved = localStorage.getItem('factoryHistoryColumns');
    if (saved) {
      const settings = JSON.parse(saved);
      allColumns.value.forEach(col => {
        if (settings[col.prop] !== undefined) {
          col.visible = settings[col.prop];
        }
      });
    }
  } catch {}
  allColumns.value.forEach(col => {
    if (fixedColumns.includes(col.prop)) {
      col.fixed = true;
      col.visible = true;
    }
  });
};

// ===== 搜索参数 =====
const search = reactive({
  dateRange: [],
  keyword: '',
  status: '',
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

// ===== 统计 =====
const completedCount = computed(() => {
  return tableData.value.filter(o => o.flowStatus === 'completed').length;
});

const cancelledCount = computed(() => {
  return tableData.value.filter(o => o.flowStatus === 'cancelled').length;
});

// ===== 获取默认日期范围（30天前 ~ 今天） =====
const getDefaultDateRange = () => {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const format = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return [format(thirtyDaysAgo), format(today)];
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      keyword: search.keyword || undefined,
      status: search.status || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    };

    // 只查已完成和已取消
    if (!search.status) {
      params.statuses = ['completed', 'cancelled'];
    }

    if (search.dateRange && search.dateRange.length === 2) {
      params.startDate = search.dateRange[0];
      params.endDate = search.dateRange[1];
    }

    const res = await getOrderList(params);
    const responseData = res?.data || res || {};
    
    let data = [];
    let total = 0;
    
    if (Array.isArray(responseData)) {
      data = responseData;
      total = responseData.length;
    } else if (responseData.items && Array.isArray(responseData.items)) {
      data = responseData.items;
      total = responseData.total || data.length;
    } else {
      data = Array.isArray(responseData) ? responseData : [];
      total = data.length;
    }

    // 只显示 completed 和 cancelled
    tableData.value = data.filter(item => 
      item.flowStatus === 'completed' || item.flowStatus === 'cancelled'
    );
    pagination.total = total;
    
  } catch (error) {
    ElMessage.error(error.message || '加载失败');
    tableData.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  search.keyword = '';
  search.status = '';
  search.dateRange = getDefaultDateRange();
  pagination.current = 1;
  loadData();
};

// ===== 行点击 - 打开流程抽屉 =====
const handleRowClick = (row) => {
  currentFlowOrderId.value = row.orderId;
  currentFlowOrderNo.value = row.orderNo;
  currentFlowStatus.value = row.flowStatus;
  flowDrawerVisible.value = true;
};

// ===== 查看详情 =====
const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

// ===== ⭐ 再次下单 =====
const handleReOrder = (row) => {
  router.push(`/order/create?copy=${row.orderId}`);
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${formatDate(date)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

// ===== 初始化 =====
onMounted(() => {
  loadColumnSettings();
  search.dateRange = getDefaultDateRange();
  loadData();
});
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }

.search-bar {
  background: #f5f7fa;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.search-bar :deep(.el-form-item) { margin-bottom: 0; }

.summary-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 16px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #e8ecf1;
  font-size: 14px;
  color: #606266;
}
.summary-bar b { color: #303133; }

:deep(.el-table .cell) { padding: 6px 8px; }
:deep(.el-table .el-table__row) { cursor: pointer; }
:deep(.el-button.is-link) { padding: 0 4px; }
</style>