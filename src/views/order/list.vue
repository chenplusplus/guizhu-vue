<!-- src/views/order/list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📋 订单列表</h2>
      <div style="display: flex; gap: 8px;">
        <el-button type="primary" @click="handleRefresh">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button v-if="userStore.isAdmin" type="success" @click="exportData">
          <el-icon><Download /></el-icon> 导出
        </el-button>
      </div>
    </div>

    <!-- ===== 统计卡片 ===== -->
    <el-row :gutter="12" style="margin-bottom: 16px;">
      <el-col :span="4" v-for="item in statusStats" :key="item.key">
        <div 
          class="stat-card" 
          :class="{ active: query.status === item.key }"
          @click="query.status = item.key; loadData()"
        >
          <div class="stat-number">{{ item.count }}</div>
          <div class="stat-label">{{ item.label }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- ===== 搜索栏 ===== -->
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
            <el-option label="待客户审核" value="pending" />
            <el-option label="客户已审核" value="customerAudited" />
            <el-option label="待工厂审核" value="factoryPending" />
            <el-option label="工厂已审核" value="audited" />
            <el-option label="制作中" value="producing" />
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

    <!-- ===== 表格 ===== -->
    <el-table 
      :data="tableData" 
      v-loading="loading"
      border 
      stripe 
      style="width: 100%"
      @sort-change="handleSortChange"
    >
      <el-table-column prop="orderNo" label="订单号" width="150" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click="viewDetail(row.orderId)">
            {{ row.orderNo }}
          </el-link>
        </template>
      </el-table-column>

      <el-table-column prop="customerName" label="客户" width="120" />
      
      <el-table-column prop="productName" label="品名" min-width="120" />
      
      <el-table-column prop="quantity" label="件数" width="70" align="center" />
      
      <el-table-column prop="amount" label="金额(元)" width="120" align="right">
        <template #default="{ row }">
          <span style="color: #E6A23C; font-weight: bold;">
            ¥{{ (row.amount || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column prop="flowStatus" label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.flowStatus)" size="small">
            {{ getStatusText(row.flowStatus) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="warnFlag" label="紧急" width="70" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.warnFlag" type="danger" size="small">⚠️</el-tag>
          <span v-else style="color: #ccc;">-</span>
        </template>
      </el-table-column>

      <el-table-column prop="createdAt" label="创建时间" width="160" sortable="custom">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>

      <el-table-column label="操作" width="180" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" size="small" link @click="viewDetail(row.orderId)">
            查看
          </el-button>

          <el-button 
            v-if="canEdit(row)"
            type="warning" 
            size="small" 
            link 
            @click="viewDetail(row.orderId)"
          >
            编辑
          </el-button>

          <el-button 
            v-if="canDelete(row)"
            type="danger" 
            size="small" 
            link 
            @click="handleDelete(row)"
          >
            删除
          </el-button>

          <el-button 
            v-if="canAudit(row)"
            type="success" 
            size="small" 
            link 
            @click="handleQuickAudit(row)"
          >
            审核
          </el-button>

          <el-button 
            v-if="canSubmit(row)"
            type="primary" 
            size="small" 
            link 
            @click="handleSubmitToFactory(row)"
          >
            提交工厂
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ===== 分页 ===== -->
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

    <!-- ===== 审核弹窗 ===== -->
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Download, Search, RefreshRight } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderList, deleteOrder, auditOrder, submitToFactory } from '@/api/order';

const router = useRouter();
const userStore = useUserStore();

// ===== 状态映射 =====
const statusMap = {
  draft: { text: '草稿', type: 'info' },
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

// ===== 状态统计 =====
const statusStats = ref([
  { key: '', label: '全部', count: 0 },
  { key: 'pending', label: '待客户审核', count: 0 },
  { key: 'customerAudited', label: '客户已审核', count: 0 },
  { key: 'factoryPending', label: '待工厂审核', count: 0 },
  { key: 'audited', label: '工厂已审核', count: 0 },
  { key: 'producing', label: '制作中', count: 0 },
  { key: 'completed', label: '已完成', count: 0 },
  { key: 'rejected', label: '已驳回', count: 0 },
  { key: 'cancelled', label: '已取消', count: 0 },
]);

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
  if (userType === 'factoryAudit' && status === 'factoryPending') return true;
  return false;
};

const canSubmit = (row) => {
  const userType = userStore.userType;
  const status = row.flowStatus;
  return userType === 'factoryOrder' && status === 'customerAudited';
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

    // 日期范围
    if (query.dateRange && query.dateRange.length === 2) {
      params.startDate = query.dateRange[0];
      params.endDate = query.dateRange[1];
    }

    const res = await getOrderList(params);
    const data = res?.data || res || {};
    tableData.value = data.items || data || [];
    pagination.total = data.total || tableData.value.length;

    // 更新统计
    updateStats();
  } catch (error) {
    ElMessage.error(error.message || '加载数据失败');
    tableData.value = [];
  } finally {
    loading.value = false;
  }
};

// ===== 更新统计 =====
const updateStats = () => {
  const stats = { '': 0 };
  tableData.value.forEach(row => {
    const key = row.flowStatus || '';
    stats[key] = (stats[key] || 0) + 1;
    stats[''] = (stats[''] || 0) + 1;
  });
  statusStats.value.forEach(item => {
    item.count = stats[item.key] || 0;
  });
};

// ===== 重置查询 =====
const resetQuery = () => {
  query.keyword = '';
  query.status = '';
  query.dateRange = [];
  query.orderBy = 'createdAt';
  query.descending = true;
  pagination.current = 1;
  loadData();
};

// ===== 排序 =====
const handleSortChange = ({ prop, order }) => {
  query.orderBy = prop || 'createdAt';
  query.descending = order !== 'ascending';
  loadData();
};

// ===== 刷新 =====
const handleRefresh = () => {
  loadData();
};

// ===== 查看详情 =====
const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

// ===== 删除 =====
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除订单 ${row.orderNo} 吗？`,
    '提示',
    { type: 'warning' }
  ).then(async () => {
    try {
      await deleteOrder(row.orderId);
      ElMessage.success('删除成功');
      loadData();
    } catch (error) {
      ElMessage.error(error.message || '删除失败');
    }
  }).catch(() => {});
};

// ===== 快速审核弹窗 =====
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

// ===== 提交到工厂 =====
const handleSubmitToFactory = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要将订单 ${row.orderNo} 提交到工厂审核吗？`,
      '提示',
      { type: 'info' }
    );
    await submitToFactory(row.orderId);
    ElMessage.success('已提交到工厂');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  }
};

// ===== 导出 =====
const exportData = () => {
  ElMessage.info('导出功能开发中...');
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', { hour12: false });
};

// ===== 初始化 =====
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

/* ===== 统计卡片 ===== */
.stat-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}
.stat-card:hover {
  background: #e6f0ff;
  transform: translateY(-2px);
}
.stat-card.active {
  border-color: #409EFF;
  background: #ecf5ff;
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

/* ===== 搜索栏 ===== */
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

/* ===== 表格 ===== */
:deep(.el-table .cell) {
  padding: 6px 8px;
}

/* ===== 操作按钮 ===== */
:deep(.el-button.is-link) {
  padding: 0 4px;
}
</style>