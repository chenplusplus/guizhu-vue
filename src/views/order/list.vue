<!-- src/views/order/list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📋 订单列表</h2>
      <div style="display: flex; gap: 8px;">
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button v-if="userStore.isAdmin" type="success" @click="exportData">
          <el-icon><Download /></el-icon> 导出
        </el-button>
      </div>
    </div>

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

    <!-- ===== 表格 ===== -->
    <el-table 
      :data="tableData" 
      v-loading="loading"
      border 
      stripe 
      style="width: 100%"
      @sort-change="handleSortChange"
      @row-click="handleRowClick"
    >
      <el-table-column prop="orderNo" label="订单号" width="150" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.orderId)">
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
          <el-button type="primary" size="small" link @click.stop="viewDetail(row.orderId)">
            查看
          </el-button>

          <el-button 
            v-if="canEdit(row)"
            type="warning" 
            size="small" 
            link 
            @click.stop="viewDetail(row.orderId)"
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

          <el-button 
            v-if="canSubmit(row)"
            type="primary" 
            size="small" 
            link 
            @click.stop="handleSubmitToFactory(row)"
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

    <!-- ===== 流程抽屉 ===== -->
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
import { Refresh, Download, Search, RefreshRight } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderList, deleteOrder, auditOrder, submitToFactory } from '@/api/order';
import FlowDrawer from '@/components/FlowDrawer.vue';

const router = useRouter();
const userStore = useUserStore();

// ===== 流程抽屉 =====
const flowDrawerVisible = ref(false);
const currentFlowOrderId = ref(0);
const currentFlowOrderNo = ref('');
const currentFlowStatus = ref('');

// ===== 状态映射（中文） =====
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

    if (query.dateRange && query.dateRange.length === 2) {
      params.startDate = query.dateRange[0];
      params.endDate = query.dateRange[1];
    }

    const res = await getOrderList(params);
    const data = res?.data || res || {};
    tableData.value = data.items || data || [];
    pagination.total = data.total || tableData.value.length;
  } catch (error) {
    ElMessage.error(error.message || '加载数据失败');
    tableData.value = [];
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

const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除订单 ${row.orderNo} 吗？`, '提示', { type: 'warning' })
    .then(async () => {
      await deleteOrder(row.orderId);
      ElMessage.success('删除成功');
      loadData();
    })
    .catch(() => {});
};

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

const handleSubmitToFactory = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要将订单 ${row.orderNo} 提交到工厂审核吗？`, '提示', { type: 'info' });
    await submitToFactory(row.orderId);
    ElMessage.success('已提交到工厂');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败');
    }
  }
};

const exportData = () => {
  ElMessage.info('导出功能开发中...');
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', { hour12: false });
};

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
</style>