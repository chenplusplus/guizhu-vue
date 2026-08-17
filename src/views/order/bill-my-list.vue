<!-- src/views/order/bill-my-list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📄 我的账单</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <!-- ⭐ 批量审核按钮（工厂审核员可见） -->
        <template v-if="userStore.userType === 'factoryAudit' || userStore.userType === 'admin'">
          <el-button
            v-if="selectedRows.length > 0"
            type="success"
            @click="handleBatchAudit(true)"
          >
            批量通过 ({{ selectedRows.length }})
          </el-button>
          <el-button
            v-if="selectedRows.length > 0"
            type="danger"
            @click="handleBatchAudit(false)"
          >
            批量驳回 ({{ selectedRows.length }})
          </el-button>
        </template>

        <!-- 批量确认（客户可见） -->
        <template v-if="userStore.userType === 'customer' || userStore.userType === 'admin'">
          <el-button
            v-if="selectedRows.length > 0"
            type="success"
            @click="handleBatchConfirm"
          >
            批量确认 ({{ selectedRows.length }})
          </el-button>
        </template>

        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="状态">
          <el-select
            v-model="filterStatus"
            placeholder="全部状态"
            clearable
            style="width: 140px;"
            @change="loadData"
          >
            <!-- 工厂审核员看到待审核 -->
            <template v-if="userStore.userType === 'factoryAudit' || userStore.userType === 'admin'">
              <el-option label="待审核" value="billPending" />
            </template>
            <!-- 客户看到已通过/已确认/已退回 -->
            <template v-if="userStore.userType === 'customer'">
              <el-option label="已通过" value="approved" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="已退回" value="returned" />
            </template>
            <!-- 工厂业务员看到全部 -->
            <template v-if="userStore.userType === 'factoryOrder'">
              <el-option label="待审核" value="billPending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已确认" value="confirmed" />
              <el-option label="已退回" value="returned" />
              <el-option label="已驳回" value="rejected" />
            </template>
          </el-select>
        </el-form-item>
        <el-form-item label="客户">
          <el-select
            v-model="filterCustomerId"
            placeholder="全部客户"
            clearable
            filterable
            style="width: 180px;"
            @change="loadData"
          >
            <el-option
              v-for="item in customerList"
              :key="item.customerId"
              :label="item.customerName"
              :value="item.customerId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="keyword"
            placeholder="账单号/客户"
            clearable
            style="width: 180px;"
            @clear="loadData"
            @keyup.enter="loadData"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="12" style="margin-bottom: 16px;">
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #E6A23C;">
          <div class="stat-number">{{ statusCount.billPending || 0 }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #409EFF;">
          <div class="stat-number">{{ statusCount.approved || 0 }}</div>
          <div class="stat-label">已通过</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #67C23A;">
          <div class="stat-number">{{ statusCount.confirmed || 0 }}</div>
          <div class="stat-label">已确认</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left: 4px solid #F56C6C;">
          <div class="stat-number">{{ statusCount.returned || 0 }}</div>
          <div class="stat-label">已退回</div>
        </div>
      </el-col>
    </el-row>

    <!-- 表格 -->
    <el-table
      ref="tableRef"
      :data="tableData"
      border
      stripe
      v-loading="loading"
      @row-click="viewDetail"
      @selection-change="handleSelectionChange"
      row-key="billId"
    >
      <!-- 多选 -->
      <el-table-column type="selection" width="55" align="center" />

      <el-table-column prop="billNo" label="账单编号" width="150">
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.billId)">
            {{ row.billNo }}
          </el-link>
        </template>
      </el-table-column>

      <el-table-column prop="customerName" label="客户" width="120" />

      <el-table-column prop="company" label="公司" width="120" />

      <el-table-column prop="color" label="成色" width="80" align="center" />

      <el-table-column prop="orderCount" label="订单数" width="70" align="center" />

      <el-table-column prop="totalQuantity" label="总件数" width="70" align="center" />

      <el-table-column prop="totalAmount" label="总金额" width="120" align="right">
        <template #default="{ row }">
          <span style="color: #E6A23C; font-weight: bold;">
            ¥{{ (row.totalAmount || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column prop="currentMaterial" label="应收足料" width="100" align="right">
        <template #default="{ row }">
          {{ (row.currentMaterial || 0).toFixed(3) }}g
        </template>
      </el-table-column>

      <el-table-column prop="currentMoney" label="应收款" width="110" align="right">
        <template #default="{ row }">
          ¥{{ (row.currentMoney || 0).toFixed(2) }}
        </template>
      </el-table-column>

      <el-table-column prop="receivedMoney" label="来款" width="110" align="right">
        <template #default="{ row }">
          ¥{{ (row.receivedMoney || 0).toFixed(2) }}
        </template>
      </el-table-column>

      <el-table-column prop="totalDebtMoney" label="累计欠款" width="110" align="right">
        <template #default="{ row }">
          <span
            :style="{
              color: (row.totalDebtMoney || 0) > 0 ? '#F56C6C' : '#67C23A',
              fontWeight: 'bold'
            }"
          >
            ¥{{ (row.totalDebtMoney || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column prop="totalDebtMaterial" label="累欠足料" width="100" align="right">
        <template #default="{ row }">
          <span
            :style="{
              color: (row.totalDebtMaterial || 0) > 0 ? '#F56C6C' : '#67C23A'
            }"
          >
            {{ (row.totalDebtMaterial || 0).toFixed(3) }}g
          </span>
        </template>
      </el-table-column>

      <el-table-column prop="billDate" label="账单日期" width="110" align="center">
        <template #default="{ row }">
          {{ formatDate(row.billDate) }}
        </template>
      </el-table-column>

      <el-table-column prop="status" label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="300" align="center" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click.stop="viewDetail(row.billId)">
            查看
          </el-button>

          <!-- ⭐ 工厂业务员：提交审核（状态为 pending 时） -->
          <template v-if="userStore.userType === 'factoryOrder' || userStore.userType === 'admin'">
            <el-button
              v-if="row.status === 'pending'"
              size="small"
              type="warning"
              @click.stop="handleSubmitAudit(row)"
            >
              提交审核
            </el-button>
          </template>

          <!-- ⭐ 工厂审核员：审核通过/驳回 -->
          <template v-if="userStore.userType === 'factoryAudit' || userStore.userType === 'admin'">
            <el-button
              v-if="row.status === 'billPending'"
              size="small"
              type="success"
              @click.stop="handleAudit(row, true)"
            >
              通过
            </el-button>
            <el-button
              v-if="row.status === 'billPending'"
              size="small"
              type="danger"
              @click.stop="handleAudit(row, false)"
            >
              驳回
            </el-button>
          </template>

          <!-- ⭐ 客户：确认/退回 -->
          <template v-if="userStore.userType === 'customer'">
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
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无账单" />

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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getBillList, confirmBill, auditBill, getCustomerList, submitBillAudit } from '@/api/bill';


const router = useRouter();
const userStore = useUserStore();
const tableRef = ref();

const loading = ref(false);
const tableData = ref([]);
const filterStatus = ref('');
const filterCustomerId = ref('');
const keyword = ref('');
const selectedRows = ref([]);

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const statusCount = reactive({
  billPending: 0,
  approved: 0,
  confirmed: 0,
  returned: 0,
  rejected: 0,
});

const customerList = ref([]);

// ===== 状态映射 =====
const statusMap = {
  pending: { text: '待审核', type: 'warning' },
  billPending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  returned: { text: '已退回', type: 'danger' },
  confirmed: { text: '已确认', type: 'success' },
};

const getStatusText = (s) => statusMap[s]?.text || s;
const getStatusType = (s) => statusMap[s]?.type || 'info';

// ============================================================
// 加载客户列表
// ============================================================
const loadCustomers = async () => {
  try {
    const res = await getCustomerList({ includeInactive: false });
    customerList.value = res?.data || [];
  } catch {
    customerList.value = [];
  }
};

// ============================================================
// 加载数据
// ============================================================
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      status: filterStatus.value || undefined,
      customerId: filterCustomerId.value || undefined,
      keyword: keyword.value || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    };

    const res = await getBillList(params);
    const data = res?.data || [];
    const total = res?.total || data.length;

    tableData.value = data;
    pagination.total = total;

    // 统计
    Object.keys(statusCount).forEach((k) => (statusCount[k] = 0));
    data.forEach((item) => {
      if (statusCount[item.status] !== undefined) {
        statusCount[item.status]++;
      }
    });
  } catch (error) {
    console.error('加载账单失败:', error);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// ============================================================
// 重置搜索
// ============================================================
const resetSearch = () => {
  filterStatus.value = '';
  filterCustomerId.value = '';
  keyword.value = '';
  pagination.current = 1;
  loadData();
};

// ============================================================
// 多选
// ============================================================
const handleSelectionChange = (selection) => {
  selectedRows.value = selection;
};

// 提交审核
const handleSubmitAudit = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要提交账单 ${row.billNo} 审核吗？提交后不可再编辑。`,
      '提交审核',
      { type: 'info' }
    );
    await submitBillAudit(row.billId);
    ElMessage.success('提交审核成功');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '提交失败');
    }
  }
};
// ============================================================
// ⭐ 批量审核（工厂审核员）
// ============================================================
const handleBatchAudit = async (approved) => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请至少选择一个账单');
    return;
  }

  const auditList = selectedRows.value.filter(row => row.status === 'billPending');
  if (auditList.length === 0) {
    ElMessage.warning('请选择状态为"待审核"的账单');
    return;
  }

  const action = approved ? '通过' : '驳回';
  try {
    await ElMessageBox.confirm(
      `确定要${action} ${auditList.length} 个账单吗？`,
      `批量${action}`,
      { type: approved ? 'info' : 'warning' }
    );
    
    let successCount = 0;
    let failCount = 0;

    for (const row of auditList) {
      try {
        await auditBill(row.billId, { approved });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0 && failCount === 0) {
      ElMessage.success(`${successCount} 个账单${action}成功`);
    } else if (successCount > 0 && failCount > 0) {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
    } else {
      ElMessage.error('全部失败');
    }
    loadData();
  } catch {}
};

// ============================================================
// ⭐ 批量确认（客户）
// ============================================================
const handleBatchConfirm = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请至少选择一个账单');
    return;
  }

  const confirmList = selectedRows.value.filter(row => row.status === 'approved');
  if (confirmList.length === 0) {
    ElMessage.warning('请选择状态为"已通过"的账单');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要确认 ${confirmList.length} 个账单吗？确认后订单将完成。`,
      '批量确认',
      { type: 'info' }
    );
    
    let successCount = 0;
    let failCount = 0;

    for (const row of confirmList) {
      try {
        await confirmBill(row.billId);
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0 && failCount === 0) {
      ElMessage.success(`${successCount} 个账单确认成功`);
    } else if (successCount > 0 && failCount > 0) {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
    } else {
      ElMessage.error('全部失败');
    }
    loadData();
  } catch {}
};

// ============================================================
// 单个审核（工厂审核员）
// ============================================================
const handleAudit = async (row, approved) => {
  try {
    const action = approved ? '通过' : '驳回';
    await ElMessageBox.confirm(`确认${action}该账单？`, '审核确认', {
      type: approved ? 'info' : 'warning'
    });
    await auditBill(row.billId, { approved });
    ElMessage.success(`审核${action}`);
    loadData();
  } catch {}
};

// ============================================================
// 确认账单（客户）
// ============================================================
const handleConfirm = async (row) => {
  try {
    await ElMessageBox.confirm('确认账单无误吗？确认后订单将完成。', '确认账单', { type: 'info' });
    await confirmBill(row.billId);
    ElMessage.success('账单已确认');
    loadData();
  } catch {}
};

// ============================================================
// 退回（客户）
// ============================================================
const handleReturn = (row) => {
  router.push(`/order/bill/detail/${row.billId}`);
};

// ============================================================
// 查看详情
// ============================================================
const viewDetail = (id) => {
  if (!id) {
    ElMessage.error('账单ID无效');
    return;
  }
  router.push(`/order/bill/detail/${id}`);
};

// ============================================================
// 时间格式化
// ============================================================
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ============================================================
// 初始化
// ============================================================
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
  border-radius: 6px;
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

:deep(.el-table .el-table__row) {
  cursor: pointer;
}
:deep(.el-table .cell) {
  padding: 6px 8px;
}
</style>