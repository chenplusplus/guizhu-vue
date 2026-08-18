<!-- src/views/order/list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📋 订单列表</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <el-button type="primary" @click="goCreate">
          <el-icon><Plus /></el-icon> 新增
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button @click="columnVisibleDialog = true">
          <el-icon><Setting /></el-icon> 列设置
        </el-button>
      </div>
    </div>

    <!-- ⭐ 顶部统计卡片 -->
    <div class="stats-wrapper">
      <div
        v-for="item in statusStats"
        :key="item.key"
        class="stat-item"
        :style="{ borderLeftColor: item.color }"
        @click="filterByStatus(item.key)"
      >
        <span class="stat-num" :style="{ color: item.color }">{{ item.count }}</span>
        <span class="stat-label">{{ item.label }}</span>
        <span class="stat-mine" v-if="item.mineCount > 0">(我的: {{ item.mineCount }})</span>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="query" size="default">
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="订单号/品名"
            clearable
            style="width: 200px;"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px;" @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option label="进行中" value="running" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>

        <el-form-item label="日期">
          <el-date-picker
            v-model="query.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px;"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetQuery">
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
      style="width: 100%"
      @sort-change="handleSortChange"
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
      row-key="orderId"
      :row-class-name="getRowClassName"
    >
      <!-- 多选列 -->
      <el-table-column type="selection" width="40" align="center" />

      <el-table-column prop="orderNo" label="订单号" width="150" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.orderId)">
            {{ row.orderNo }}
          </el-link>
        </template>
      </el-table-column>

      <!-- ⭐ 状态列 -->
      <el-table-column prop="flowStatus" label="状态" width="110" fixed align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.flowStatus)" size="default" effect="light">
            {{ getStatusText(row.flowStatus) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column
        v-for="col in visibleColumns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
        :align="col.align || 'center'"
        :sortable="col.sortable"
      >
        <template #default="{ row }">
          <template v-if="col.prop === 'orderDate'">
            {{ formatDate(row.orderDate) }}
          </template>

          <template v-else-if="col.prop === 'customerName'">
            {{ row.salesman || row.customerName || '-' }}
          </template>

          <template v-else-if="col.prop === 'imageUrl'">
            <el-image
              v-if="row.imageUrl"
              :src="row.imageUrl"
              fit="cover"
              style="width:50px;height:50px;border-radius:4px;cursor:pointer;"
              :preview-src-list="[row.imageUrl]"
              preview-teleported
              @click.stop
            />
            <span v-else style="color:#ccc;font-size:12px;">无图</span>
          </template>

          <template v-else-if="col.prop === 'dataImageUrl'">
            <el-image
              v-if="row.dataImageUrl"
              :src="row.dataImageUrl"
              fit="cover"
              style="width:50px;height:50px;border-radius:4px;cursor:pointer;"
              :preview-src-list="[row.dataImageUrl]"
              preview-teleported
              @click.stop
            />
            <span v-else style="color:#ccc;font-size:12px;">无图</span>
          </template>

          <template v-else-if="col.prop === 'goldPrice'">
            {{ row.goldPrice || '-' }}
          </template>

          <template v-else-if="col.prop === 'url'">
            <a v-if="row.url" :href="row.url" target="_blank" style="color:#409EFF;text-decoration:none;">
              查看链接
            </a>
            <span v-else style="color:#ccc;">-</span>
          </template>

          <template v-else-if="col.prop === 'remark'">
            <span v-if="row.remark">{{ row.remark }}</span>
            <span v-else style="color:#ccc;">-</span>
          </template>

          <template v-else-if="col.prop === 'warnFlag'">
            <el-tag v-if="row.warnFlag" type="danger" size="small">⚠️</el-tag>
            <span v-else style="color:#ccc;">-</span>
          </template>

          <template v-else-if="col.prop === 'createdAt'">
            {{ formatDateTime(row.createdAt) }}
          </template>

          <template v-else>
            {{ row[col.prop] ?? '-' }}
          </template>
        </template>
      </el-table-column>

      <!-- ⭐ 操作列 -->
      <el-table-column label="操作" width="280" fixed="right" align="center">
        <template #default="{ row }">
          <!-- 查看：所有人都可以 -->
          <el-button size="small" type="primary" link @click.stop="viewDetail(row.orderId)">
            查看
          </el-button>

          <!-- 再次下单：所有人都可以 -->
          <el-button
            size="small"
            type="success"
            link
            @click.stop="handleReOrder(row)"
          >
            再次下单
          </el-button>

          <!-- ⭐ 只有自己的订单才显示操作按钮 -->
          <template v-if="isMine(row)">
            <el-button
              v-if="row.flowStatus === 'draft'"
              size="small"
              type="primary"
              @click.stop="handleSingleSubmit(row)"
            >
              提交
            </el-button>
            <el-button
              v-if="canEdit(row)"
              size="small"
              type="warning"
              link
              @click.stop="goEdit(row.orderId)"
            >
              编辑
            </el-button>
            <el-button
              v-if="canDelete(row)"
              size="small"
              type="danger"
              link
              @click.stop="handleDelete(row)"
            >
              删除
            </el-button>
          </template>

          <!-- ⭐ 别人的订单显示只读 -->
          <el-tag v-else size="small" type="info" effect="plain">只读</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="onPageChange"
        @current-change="onPageChange"
      />
    </div>

    <!-- 审核弹窗 -->
    <el-dialog v-model="auditDialogVisible" title="订单审核" width="450px">
      <div style="margin-bottom: 16px;">
        <p><strong>订单号：</strong>{{ currentOrder?.orderNo }}</p>
        <p><strong>客户：</strong>{{ currentOrder?.customerName }}</p>
        <p><strong>品名：</strong>{{ currentOrder?.productName }}</p>
        <p><strong>金额：</strong>¥{{ (currentOrder?.amount || 0).toFixed(2) }}</p>
      </div>
      <el-input
        v-model="auditRemark"
        type="textarea"
        :rows="3"
        placeholder="请输入审核备注（驳回时必填）"
      />
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmAudit(false)" :loading="auditLoading">
          驳回
        </el-button>
        <el-button type="success" @click="confirmAudit(true)" :loading="auditLoading">
          通过
        </el-button>
      </template>
    </el-dialog>

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
import { Plus, Refresh, Download, Search, RefreshRight, Setting } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderList, deleteOrder, auditOrder, submitOrder } from '@/api/order';
import FlowDrawer from '@/components/FlowDrawer.vue';

const router = useRouter();
const userStore = useUserStore();
const tableRef = ref();

// ===== 列定义 =====
const allColumns = ref([
  { prop: 'orderDate', label: '订单日期', width: 110, align: 'center', visible: true, sortable: true },
  { prop: 'productName', label: '品名', minWidth: 120, visible: true },
  { prop: 'customerName', label: '销售名称', width: 120, visible: true },
  { prop: 'imageUrl', label: '产品图片', width: 80, align: 'center', visible: true },
  { prop: 'dataImageUrl', label: '数据图', width: 80, align: 'center', visible: true },
  { prop: 'size', label: '手寸/长度', width: 100, visible: true },
  { prop: 'widthThick', label: '宽/厚度', width: 100, visible: true },
  { prop: 'quantity', label: '数量', width: 70, visible: true },
  { prop: 'color', label: '成色', width: 80, visible: true },
  { prop: 'goldPrice', label: '金价', width: 90, align: 'right', visible: true },
  { prop: 'logoText', label: 'LOGO', width: 100, visible: true },
  { prop: 'diamondLevel', label: '钻石级别', width: 100, visible: true },
  { prop: 'weightRequirement', label: '克重要求', width: 110, visible: true },
  { prop: 'deliveryDays', label: '工期', width: 70, visible: true },
  { prop: 'url', label: '网址', minWidth: 120, visible: true },
  { prop: 'remark', label: '备注', minWidth: 100, visible: true },
  { prop: 'flowStatus', label: '状态', width: 110, visible: true },
  { prop: 'warnFlag', label: '紧急', width: 70, visible: true },
  { prop: 'createdAt', label: '创建时间', width: 160, visible: true, sortable: true },
]);

const fixedColumns = ['orderNo'];
const columnVisibleDialog = ref(false);

const visibleColumns = computed(() => {
  return allColumns.value.filter(col => col.visible);
});

const isAllSelected = computed(() => {
  const selectable = allColumns.value.filter(col => !col.fixed);
  return selectable.every(col => col.visible);
});

const toggleAllColumns = (val) => {
  allColumns.value.forEach(col => {
    if (!col.fixed) {
      col.visible = val;
    }
  });
};

const applyColumnSettings = () => {
  const settings = {};
  allColumns.value.forEach(col => {
    settings[col.prop] = col.visible;
  });
  localStorage.setItem('orderListColumns', JSON.stringify(settings));
  columnVisibleDialog.value = false;
  ElMessage.success('列设置已保存');
};

const loadColumnSettings = () => {
  try {
    const saved = localStorage.getItem('orderListColumns');
    if (saved) {
      const settings = JSON.parse(saved);
      allColumns.value.forEach(col => {
        if (settings[col.prop] !== undefined) {
          col.visible = settings[col.prop];
        }
      });
    }
  } catch (e) {}
  allColumns.value.forEach(col => {
    if (fixedColumns.includes(col.prop)) {
      col.fixed = true;
      col.visible = true;
    }
  });
};

// ===== 流程抽屉 =====
const flowDrawerVisible = ref(false);
const currentFlowOrderId = ref(0);
const currentFlowOrderNo = ref('');
const currentFlowStatus = ref('');

// ===== 多选 =====
const selectedOrders = ref([]);
const handleSelectionChange = (selection) => {
  selectedOrders.value = selection;
};

// ===== ⭐ 判断是否为自己的订单 =====
const isMine = (row) => {
  return Number(row.submittedBy) === Number(userStore.userId);
};

// ===== 状态映射 =====
const statusMap = {
  draft: { text: '草稿', type: 'info', color: '#909399' },
  pending: { text: '待客户审核', type: 'warning', color: '#E6A23C' },
  customeraudited: { text: '待工厂接单', type: 'success', color: '#67C23A' },
  factory_edit: { text: '工厂编辑中', type: 'primary', color: '#409EFF' },
  polishing: { text: '制作完成', type: 'primary', color: '#409EFF' },
  billPending: { text: '账单待审核', type: 'warning', color: '#E6A23C' },
  billConfirmed: { text: '客户已确认', type: 'success', color: '#67C23A' },
  completed: { text: '已完成', type: 'success', color: '#67C23A' },
  rejected: { text: '已驳回', type: 'danger', color: '#F56C6C' },
  cancelled: { text: '已取消', type: 'info', color: '#909399' },
};

const getStatusText = (status) => statusMap[status]?.text || status || '-';
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ===== ⭐ 行样式 =====
const getRowClassName = ({ row }) => {
  return isMine(row) ? 'row-mine' : 'row-other';
};

// ===== ⭐ 统计卡片（含"我的"数量） =====
const statusStats = computed(() => {
  const counts = {};
  const mineCounts = {};
  const userId = Number(userStore.userId);

  tableData.value.forEach(item => {
    const key = item.flowStatus || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    if (Number(item.submittedBy) === userId) {
      mineCounts[key] = (mineCounts[key] || 0) + 1;
    }
  });

  return Object.keys(statusMap)
    .filter(key => counts[key] > 0)
    .map(key => ({
      key,
      label: statusMap[key].text,
      color: statusMap[key].color,
      count: counts[key] || 0,
      mineCount: mineCounts[key] || 0,
    }));
});

// ===== 查询参数 =====
const query = reactive({
  keyword: '',
  status: 'running',
  dateRange: [],
  orderBy: 'createdAt',
  descending: true,
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const tableData = ref([]);
const loading = ref(false);

const auditDialogVisible = ref(false);
const auditLoading = ref(false);
const currentOrder = ref(null);
const auditRemark = ref('');

// ===== 获取默认日期范围（7天前 ~ 今天） =====
const getDefaultDateRange = () => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const format = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return [format(sevenDaysAgo), format(today)];
};

// ===== 快捷筛选 =====
const filterByStatus = (status) => {
  query.status = status;
  handleSearch();
};

// ===== 点击行查看流程 =====
const handleRowClick = (row) => {
  currentFlowOrderId.value = row.orderId;
  currentFlowOrderNo.value = row.orderNo;
  currentFlowStatus.value = row.flowStatus;
  flowDrawerVisible.value = true;
};

// ===== 再次下单 =====
const handleReOrder = (row) => {
  router.push(`/order/create?copy=${row.orderId}`);
};

// ===== 编辑 =====
const goEdit = (id) => {
  router.push(`/order/create/${id}`);
};

// ===== 权限判断 =====
const canEdit = (row) => {
  const status = row.flowStatus;
  return status === 'draft' || status === 'rejected';
};

const canDelete = (row) => {
  const status = row.flowStatus;
  return status === 'draft' || status === 'rejected';
};

// ===== 分页切换 =====
const onPageChange = () => {
  loadData();
};

// ===== 搜索 =====
const handleSearch = () => {
  pagination.current = 1;
  loadData();
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      keyword: query.keyword || undefined,
      status: query.status || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
      orderBy: query.orderBy,
      descending: query.descending,
    };

    if (query.dateRange && query.dateRange.length === 2) {
      params.startDate = query.dateRange[0];
      params.endDate = query.dateRange[1];
    }

    const res = await getOrderList(params);

    let data = res?.data || res || {};
    let list = [];
    let total = 0;

    if (Array.isArray(data)) {
      list = data;
      total = data.length;
    } else if (data.items && Array.isArray(data.items)) {
      list = data.items;
      total = data.total || data.items.length;
    } else if (data.list && Array.isArray(data.list)) {
      list = data.list;
      total = data.total || data.list.length;
    } else if (data.rows && Array.isArray(data.rows)) {
      list = data.rows;
      total = data.count || data.rows.length;
    } else if (data.data && Array.isArray(data.data)) {
      list = data.data;
      total = data.total || data.data.length;
    } else {
      list = Array.isArray(data) ? data : [];
      total = list.length;
    }

    tableData.value = list;
    pagination.total = total;
  } catch (error) {
    ElMessage.error(error.message || '加载数据失败');
    tableData.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

const resetQuery = () => {
  query.keyword = '';
  query.status = 'running';
  query.dateRange = getDefaultDateRange();
  query.orderBy = 'createdAt';
  query.descending = true;
  pagination.current = 1;
  loadData();
};

const handleSortChange = ({ prop, order }) => {
  query.orderBy = prop || 'createdAt';
  query.descending = order !== 'ascending';
  loadData();
};

// ============================================================
// 提交审核（单个）
// ============================================================
const handleSingleSubmit = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要提交订单 ${row.orderNo} 审核吗？`,
      '提交审核',
      { type: 'info' }
    );
    await submitOrder(row.orderId);
    ElMessage.success('提交审核成功');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '提交失败');
    }
  }
};

// ============================================================
// 删除
// ============================================================
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除订单 ${row.orderNo} 吗？`, '提示', { type: 'warning' })
    .then(async () => {
      await deleteOrder(row.orderId);
      ElMessage.success('删除成功');
      loadData();
    })
    .catch(() => {});
};

// ============================================================
// 审核
// ============================================================
const handleQuickAudit = (row) => {
  currentOrder.value = row;
  auditRemark.value = '';
  auditDialogVisible.value = true;
};

const confirmAudit = async (approved) => {
  if (!approved && !auditRemark.value.trim()) {
    ElMessage.warning('驳回必须填写原因');
    return;
  }

  auditLoading.value = true;
  try {
    await auditOrder(currentOrder.value.orderId, {
      approved,
      remark: auditRemark.value || '',
    });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    auditDialogVisible.value = false;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '操作失败');
  } finally {
    auditLoading.value = false;
  }
};

const exportData = () => {
  ElMessage.info('导出功能开发中...');
};

// ============================================================
// 跳转
// ============================================================
const goCreate = () => {
  router.push('/order/create');
};

const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

// ============================================================
// 时间格式化
// ============================================================
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', { hour12: false });
};

// ============================================================
// 初始化
// ============================================================
onMounted(() => {
  loadColumnSettings();
  query.dateRange = getDefaultDateRange();
  query.status = 'running';
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
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.page-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

/* ===== 统计卡片 ===== */
.stats-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  background: #fafbfc;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #e8ecf1;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px 4px 10px;
  border-left: 3px solid #ddd;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 4px;
}
.stat-item:hover {
  background: #f0f4f9;
}
.stat-item .stat-num {
  font-size: 18px;
  font-weight: 600;
}
.stat-item .stat-label {
  font-size: 13px;
  color: #606266;
}
.stat-item .stat-mine {
  font-size: 12px;
  color: #909399;
  margin-left: 2px;
}

.search-bar {
  background: #f5f7fa;
  padding: 12px 16px;
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
:deep(.el-image) {
  display: inline-block;
}

/* ===== 行样式 ===== */
:deep(.el-table .row-mine) {
  background-color: #ffffff !important;
}
:deep(.el-table .row-other) {
  background-color: #f5f7fa !important;
}
:deep(.el-table .row-other:hover) {
  background-color: #eef1f5 !important;
}
</style>