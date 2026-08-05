<!-- src/views/order/list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📋 订单列表</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <el-button type="primary" @click="goCreate">
          <el-icon><Plus /></el-icon> 新增
        </el-button>
        <el-button type="success" @click="goImport">
          <el-icon><Upload /></el-icon> 导入Excel
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button v-if="userStore.isAdmin" type="info" @click="exportData">
          <el-icon><Download /></el-icon> 导出
        </el-button>
        <!-- 列显示控制 -->
        <el-button @click="columnVisibleDialog = true">
          <el-icon><Setting /></el-icon> 列设置
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" :model="query" size="default">
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="订单号/品名/客户"
            clearable
            style="width: 200px;"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 140px;">
            <el-option label="草稿" value="draft" />
            <el-option label="待客户审核" value="pending" />
            <el-option label="客户已审核" value="customerAudited" />
            <el-option label="已接单" value="accepted" />
            <el-option label="数据确认" value="dataConfirm" />
            <el-option label="出蜡" value="waxing" />
            <el-option label="倒模" value="molded" />
            <el-option label="CNC" value="cnc" />
            <el-option label="配件缺失" value="partsMissing" />
            <el-option label="配石完成" value="stoneReady" />
            <el-option label="执模" value="setting" />
            <el-option label="滴胶/磨石" value="glue" />
            <el-option label="镶嵌" value="inlay" />
            <el-option label="组装" value="assembly" />
            <el-option label="抛光" value="polishing" />
            <el-option label="账单待审核" value="billPending" />
            <el-option label="客户已确认" value="billConfirmed" />
            <el-option label="已完成" value="completed" />
            <el-option label="已驳回" value="rejected" />
            <el-option label="已取消" value="cancelled" />
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
            style="width: 260px;"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadData">
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
      :data="tableData"
      v-loading="loading"
      border
      stripe
      style="width: 100%"
      @sort-change="handleSortChange"
      @row-click="handleRowClick"
    >
      <!-- 订单号 - 固定 -->
      <el-table-column prop="orderNo" label="订单号" width="150" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.orderId)">
            {{ row.orderNo }}
          </el-link>
        </template>
      </el-table-column>

      <!-- 动态列 -->
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
          <!-- 日期 -->
          <template v-if="col.prop === 'orderDate'">
            {{ formatDate(row.orderDate) }}
          </template>

          <!-- 图片列 -->
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

          <!-- 金价 -->
          <template v-else-if="col.prop === 'goldPrice'">
            {{ row.goldPrice || '-' }}
          </template>

          <!-- 网址 -->
          <template v-else-if="col.prop === 'url'">
            <a v-if="row.url" :href="row.url" target="_blank" style="color:#409EFF;text-decoration:none;">
              查看链接
            </a>
            <span v-else style="color:#ccc;">-</span>
          </template>

          <!-- 备注 -->
          <template v-else-if="col.prop === 'remark'">
            <span v-if="row.remark">{{ row.remark }}</span>
            <span v-else style="color:#ccc;">-</span>
          </template>

          <!-- 状态 -->
          <template v-else-if="col.prop === 'flowStatus'">
            <el-tag :type="getStatusType(row.flowStatus)" size="small">
              {{ getStatusText(row.flowStatus) }}
            </el-tag>
          </template>

          <!-- 紧急标记 -->
          <template v-else-if="col.prop === 'warnFlag'">
            <el-tag v-if="row.warnFlag" type="danger" size="small">⚠️</el-tag>
            <span v-else style="color:#ccc;">-</span>
          </template>

          <!-- 创建时间 -->
          <template v-else-if="col.prop === 'createdAt'">
            {{ formatDateTime(row.createdAt) }}
          </template>

          <!-- 默认 -->
          <template v-else>
            {{ row[col.prop] ?? '-' }}
          </template>
        </template>
      </el-table-column>

      <!-- 操作列 - 固定 -->
      <el-table-column label="操作" width="250" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" size="small" link @click.stop="viewDetail(row.orderId)">
            查看
          </el-button>

          <el-button
            size="small"
            type="success"
            link
            @click.stop="handleReOrder(row)"
          >
            再次下单
          </el-button>

          <el-button
            v-if="canEdit(row)"
            type="warning"
            size="small"
            link
            @click.stop="goEdit(row.orderId)"
          >
            编辑
          </el-button>

          <el-button
            v-if="canDelete(row)"
            type="danger"
            size="small"
            link
            @click.stop="handleDelete(row)"
          >
            删除
          </el-button>

          <el-button
            v-if="canAudit(row)"
            type="success"
            size="small"
            link
            @click.stop="handleQuickAudit(row)"
          >
            审核
          </el-button>
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
import { Plus, Upload, Refresh, Download, Search, RefreshRight, Setting } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderList, deleteOrder, auditOrder } from '@/api/order';
import FlowDrawer from '@/components/FlowDrawer.vue';

const router = useRouter();
const userStore = useUserStore();

// ===== 列定义 =====
const allColumns = ref([
  { prop: 'orderDate', label: '订单日期', width: 110, align: 'center', visible: true, sortable: true },
  { prop: 'productName', label: '品名', minWidth: 120, visible: true },
  { prop: 'customerName', label: '客户', width: 120, visible: true },
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

// 固定列（不可隐藏）
const fixedColumns = ['orderNo'];

const columnVisibleDialog = ref(false);

// 计算可见列
const visibleColumns = computed(() => {
  return allColumns.value.filter(col => col.visible);
});

// 全选状态
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

// 应用列设置
const applyColumnSettings = () => {
  // 保存到 localStorage
  const settings = {};
  allColumns.value.forEach(col => {
    settings[col.prop] = col.visible;
  });
  localStorage.setItem('orderListColumns', JSON.stringify(settings));
  columnVisibleDialog.value = false;
  ElMessage.success('列设置已保存');
};

// 加载列设置
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
  } catch (e) {
    // ignore
  }
  // 固定列
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

// ===== 状态映射 =====
const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待客户审核', type: 'warning' },
  customerAudited: { text: '客户已审核', type: 'success' },
  accepted: { text: '已接单', type: 'primary' },
  dataConfirm: { text: '数据确认', type: 'primary' },
  waxing: { text: '出蜡', type: 'primary' },
  molded: { text: '倒模', type: 'primary' },
  cnc: { text: 'CNC', type: 'primary' },
  partsMissing: { text: '配件缺失', type: 'warning' },
  stoneReady: { text: '配石完成', type: 'primary' },
  setting: { text: '执模', type: 'primary' },
  glue: { text: '滴胶/磨石', type: 'primary' },
  inlay: { text: '镶嵌', type: 'primary' },
  assembly: { text: '组装', type: 'primary' },
  polishing: { text: '抛光', type: 'primary' },
  billPending: { text: '账单待审核', type: 'warning' },
  billConfirmed: { text: '客户已确认', type: 'success' },
  completed: { text: '已完成', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' },
};

const getStatusText = (status) => statusMap[status]?.text || status || '-';
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ===== 查询参数 =====
const query = reactive({
  keyword: '',
  status: '',
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
  const userType = userStore.userType;
  const status = row.flowStatus;
  if (userType === 'admin') return true;
  if (userType === 'customer' && (status === 'draft' || status === 'rejected')) return true;
  return false;
};

const canDelete = (row) => {
  const userType = userStore.userType;
  const status = row.flowStatus;
  if (userType === 'admin') return true;
  if (userType === 'customer' && (status === 'draft' || status === 'rejected')) return true;
  return false;
};

const canAudit = (row) => {
  const userType = userStore.userType;
  const status = row.flowStatus;
  if (userType === 'customerAudit' && status === 'pending') return true;
  if (userType === 'factoryAudit' && status === 'billPending') return true;
  return false;
};

// ===== 分页切换 =====
const onPageChange = () => {
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
    // 兼容多种返回格式
    const data = res?.data || res || {};
    // 判断数据结构：可能是 { items, total } 或直接是数组
    if (Array.isArray(data)) {
      tableData.value = data;
      pagination.total = data.length;
    } else if (data.items && Array.isArray(data.items)) {
      tableData.value = data.items;
      pagination.total = data.total || data.items.length;
    } else if (data.list && Array.isArray(data.list)) {
      tableData.value = data.list;
      pagination.total = data.total || data.list.length;
    } else if (data.rows && Array.isArray(data.rows)) {
      tableData.value = data.rows;
      pagination.total = data.count || data.rows.length;
    } else {
      // 尝试直接赋值
      tableData.value = Array.isArray(data) ? data : [];
      pagination.total = tableData.value.length;
    }
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
  query.status = '';
  query.dateRange = [];
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

// ===== 跳转 =====
const goCreate = () => {
  router.push('/order/create');
};

const goImport = () => {
  router.push('/order/import');
};

const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

// ===== 删除 =====
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除订单 ${row.orderNo} 吗？`, '提示', { type: 'warning' })
    .then(async () => {
      await deleteOrder(row.orderId);
      ElMessage.success('删除成功');
      loadData();
    })
    .catch(() => {});
};

// ===== 审核 =====
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

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', { hour12: false });
};

// ===== 初始化 =====
onMounted(() => {
  loadColumnSettings();
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

/* 图片预览 - 使用 Element Plus 自带的预览功能，不会在表格内放大 */
:deep(.el-image) {
  display: inline-block;
}
</style>