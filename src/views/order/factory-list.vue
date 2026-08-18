<!-- src/views/order/factory-list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>🏭 工厂订单</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <el-button
          v-if="selectedOrders.length > 0 && filterStatus === 'customerAudited'"
          type="success"
          @click="handleBatchAccept"
        >
          批量接单 ({{ selectedOrders.length }})
        </el-button>
        <el-button
          v-if="selectedOrders.length > 0 && filterStatus === 'polishing'"
          type="warning"
          @click="handleBatchGenerateBill"
        >
          批量生成账单 ({{ selectedOrders.length }})
        </el-button>
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-radio-group v-model="filterStatus" @change="handleSearch">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="customerAudited">待接单</el-radio-button>
        <el-radio-button value="producing">制作中</el-radio-button>
        <el-radio-button value="polishing">制作完成</el-radio-button>
        <el-radio-button value="billPending">账单待审核</el-radio-button>
        <el-radio-button value="completed">已完成</el-radio-button>
      </el-radio-group>

      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width: 240px; margin-left: 12px;"
        @change="handleSearch"
      />

      <el-input
        v-model="keyword"
        placeholder="搜索订单号/品名"
        style="width: 180px; margin-left: 8px;"
        clearable
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      />

      <el-select
        v-model="filterCustomerId"
        placeholder="全部客户"
        clearable
        filterable
        style="width: 180px; margin-left: 8px;"
        @change="handleSearch"
      >
        <el-option
          v-for="item in customerList"
          :key="item.customerId"
          :label="item.customerName"
          :value="item.customerId"
        />
      </el-select>

      <el-button type="primary" @click="handleSearch" style="margin-left: 8px;">
        <el-icon><Search /></el-icon> 搜索
      </el-button>
      <el-button @click="resetSearch">
        <el-icon><RefreshRight /></el-icon> 重置
      </el-button>
    </div>

    <!-- 汇总 -->
    <div class="summary-bar" v-if="pagination.total > 0">
      <span>共 <b>{{ pagination.total }}</b> 个订单</span>
      <span v-if="selectedOrders.length > 0" style="color:#409EFF;">
        已选 <b>{{ selectedOrders.length }}</b> 个
      </span>
      <span v-if="selectedOrders.length > 0" style="color:#E6A23C;">
        金额 ¥{{ selectedTotal.toFixed(2) }}
      </span>
    </div>

    <!-- 表格 -->
    <el-table
      ref="tableRef"
      :data="tableData"
      border
      stripe
      v-loading="loading"
      @selection-change="handleSelectionChange"
      @row-click="handleRowClick"
      row-key="orderId"
    >
      <el-table-column type="selection" width="45" align="center" />

      <el-table-column prop="orderNo" label="订单号" width="150" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.orderId)">
            {{ row.orderNo }}
          </el-link>
        </template>
      </el-table-column>

      <!-- ⭐ 状态列移到前面 -->
      <el-table-column prop="flowStatus" label="状态" width="110" align="center" fixed>
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.flowStatus)" size="default" effect="light">
            {{ getStatusText(row.flowStatus) }}
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
            style="width: 45px; height: 45px; border-radius: 4px; cursor: pointer;"
            :preview-src-list="[row.imageUrl]"
            preview-teleported
            @click.stop
          />
          <span v-else style="color: #ccc; font-size: 12px;">无图</span>
        </template>
      </el-table-column>

      <el-table-column prop="size" label="手寸" width="80" align="center" />
      <el-table-column prop="quantity" label="数量" width="70" align="center" />
      <el-table-column prop="color" label="成色" width="80" align="center" />
      <el-table-column prop="goldPrice" label="金价" width="90" align="right">
        <template #default="{ row }">{{ row.goldPrice || '-' }}</template>
      </el-table-column>
      <el-table-column prop="diamondLevel" label="钻石级别" width="100" align="center" />
      <el-table-column prop="deliveryDays" label="工期" width="70" align="center" />
      <el-table-column prop="totalWeight" label="总重" width="85" align="right">
        <template #default="{ row }">{{ row.totalWeight || '-' }}</template>
      </el-table-column>
      <el-table-column prop="netWeight" label="净重" width="85" align="right">
        <template #default="{ row }">{{ row.netWeight || '-' }}</template>
      </el-table-column>
      <el-table-column prop="lossRate" label="损耗" width="70" align="center">
        <template #default="{ row }">{{ row.lossRate || '-' }}</template>
      </el-table-column>
      <el-table-column prop="laborFee" label="工费" width="85" align="right">
        <template #default="{ row }">{{ row.laborFee || '-' }}</template>
      </el-table-column>

      <el-table-column prop="totalAmount" label="金额" width="110" align="right">
        <template #default="{ row }">
          <span style="color: #E6A23C; font-weight: bold;">
            ¥{{ (row.totalAmount || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>

      <!-- ⭐ 操作列 -->
      <el-table-column label="操作" width="320" fixed="right" align="center">
        <template #default="{ row }">
          <!-- 待接单 → 接单 -->
          <el-button
            v-if="row.flowStatus === 'customerAudited'"
            size="small"
            type="success"
            @click.stop="handleAccept(row)"
          >
            接单
          </el-button>

          <!-- ⭐ 更新状态：制作中状态显示 -->
          <el-button
            v-if="isInProduction(row.flowStatus)|| row.flowStatus === 'factory_edit'"
            size="small"
            type="primary"
            @click.stop="openStatusDialog(row)"
          >
            更新状态
          </el-button>

          <!-- 制作完成 → 生成账单 -->
          <el-button
            v-if="row.flowStatus === 'polishing'"
            size="small"
            type="warning"
            @click.stop="handleGenerateBill(row)"
          >
            生成账单
          </el-button>

          <!-- 编辑 -->
          <el-button
            v-if="row.flowStatus === 'factory_edit'"
            size="small"
            type="primary"
            link
            @click.stop="goFactoryEdit(row.orderId)"
          >
            编辑
          </el-button>

          <!-- 查看 -->
          <el-button
            size="small"
            type="primary"
            link
            @click.stop="viewDetail(row.orderId)"
          >
            查看
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无工厂订单" />

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

    <!-- ⭐ 更新制作状态弹窗 -->
    <el-dialog v-model="statusDialogVisible" title="更新制作状态" width="450px" destroy-on-close>
      <div style="margin-bottom: 16px;">
        <p><strong>订单号：</strong>{{ currentOrder?.orderNo }}</p>
        <p><strong>品名：</strong>{{ currentOrder?.productName }}</p>
        <p><strong>当前状态：</strong>
          <el-tag :type="getStatusType(currentOrder?.flowStatus)" size="small">
            {{ getStatusText(currentOrder?.flowStatus) }}
          </el-tag>
        </p>
      </div>

      <el-form label-width="80px">
        <el-form-item label="更新为" required>
          <el-select v-model="selectedStatus" placeholder="请选择目标状态" style="width: 100%;">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="statusRemark"
            type="textarea"
            :rows="2"
            placeholder="可选备注"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="confirmStatusUpdate"
          :loading="statusLoading"
          :disabled="!selectedStatus"
        >
          确认更新
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
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderList, acceptOrder, updateProduction } from '@/api/order';
import { getCustomerList } from '@/api/customer';
import { createBill } from '@/api/bill';
import FlowDrawer from '@/components/FlowDrawer.vue';

const router = useRouter();
const userStore = useUserStore();
const tableRef = ref();

const loading = ref(false);
const tableData = ref([]);
const batchCreating = ref(false);
const keyword = ref('');
const filterStatus = ref('');
const filterCustomerId = ref('');
const selectedOrders = ref([]);
const customerList = ref([]);

const dateRange = ref([]);

// 状态更新弹窗
const statusDialogVisible = ref(false);
const statusLoading = ref(false);
const currentOrder = ref(null);
const selectedStatus = ref('');
const statusRemark = ref('');

// 流程抽屉
const flowDrawerVisible = ref(false);
const currentFlowOrderId = ref(0);
const currentFlowOrderNo = ref('');
const currentFlowStatus = ref('');

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const selectedTotal = computed(() => {
  return selectedOrders.value.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
});

// ============================================================
// 状态映射
// ============================================================
const statusMap = {
  customerAudited: { text: '待接单', type: 'success' },
  accepted: { text: '已接单', type: 'primary' },
  factory_edit: { text: '编辑中', type: 'primary' },
  waxing: { text: '出蜡', type: 'primary' },
  molded: { text: '倒模', type: 'primary' },
  setting: { text: '执模', type: 'primary' },
  cnc: { text: 'CNC', type: 'primary' },
  sweeping: { text: '扫镶口', type: 'primary' },
  stoneCutting: { text: '车石', type: 'primary' },
  microInlay: { text: '微镶', type: 'primary' },
  handInlay: { text: '手镶', type: 'primary' },
  polishing: { text: '制作完成', type: 'success' },
  billPending: { text: '账单待审核', type: 'warning' },
  billConfirmed: { text: '客户已确认', type: 'success' },
  completed: { text: '已完成', type: 'success' },
};

// 制作中状态（显示"更新状态"按钮）
const productionStatuses = [
  'accepted', 'waxing', 'molded', 'setting', 'cnc',
  'sweeping', 'stoneCutting', 'microInlay', 'handInlay'
];

const getStatusText = (status) => statusMap[status]?.text || status || '-';
const getStatusType = (status) => statusMap[status]?.type || 'info';

const isInProduction = (status) => {
  return productionStatuses.includes(status);
};

// ============================================================
// ⭐ 状态选项
// ============================================================
const statusOptions = computed(() => {
  const current = currentOrder.value?.flowStatus;
  const allOptions = [
    { value: 'waxing', label: '出蜡' },
    { value: 'molded', label: '倒模' },
    { value: 'setting', label: '执模' },
    { value: 'cnc', label: 'CNC' },
    { value: 'sweeping', label: '扫镶口' },
    { value: 'stoneCutting', label: '车石' },
    { value: 'microInlay', label: '微镶' },
    { value: 'handInlay', label: '手镶' },
    { value: 'polishing', label: '制作完成' },
  ];
  
  const currentIndex = allOptions.findIndex(s => s.value === current);
  if (currentIndex >= 0) {
    return allOptions.slice(currentIndex + 1);
  }
  // 如果当前状态不在列表中（如 factory_edit），显示全部
  return allOptions;
});

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
// 获取今天日期字符串
// ============================================================
const getTodayStr = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ============================================================
// 加载数据（后端筛选）
// ============================================================
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      keyword: keyword.value || undefined,
      customerId: filterCustomerId.value || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    };

   if (filterStatus.value) {
      params.status = filterStatus.value;
    }

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
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

    // 只显示工厂相关状态
    const factoryStatuses = [
      'customerAudited', 'accepted', 'factory_edit', 'waxing', 'molded', 
      'setting', 'cnc', 'sweeping', 'stoneCutting', 'microInlay', 
      'handInlay', 'polishing', 'billPending', 'billConfirmed', 'completed'
    ];
    
    tableData.value = data.filter(item => factoryStatuses.includes(item.flowStatus));
    pagination.total = total;
    
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error('加载数据失败');
    tableData.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.current = 1;
  loadData();
};

const resetSearch = () => {
  keyword.value = '';
  filterStatus.value = '';
  filterCustomerId.value = '';
  dateRange.value = [getTodayStr(), getTodayStr()];
  pagination.current = 1;
  loadData();
};

// ============================================================
// 多选
// ============================================================
const handleSelectionChange = (selection) => {
  selectedOrders.value = selection;
};

// ============================================================
// 行点击
// ============================================================
const handleRowClick = (row) => {
  currentFlowOrderId.value = row.orderId;
  currentFlowOrderNo.value = row.orderNo;
  currentFlowStatus.value = row.flowStatus;
  flowDrawerVisible.value = true;
};

// ============================================================
// 打开状态更新弹窗
// ============================================================
const openStatusDialog = (row) => {
  currentOrder.value = row;
  selectedStatus.value = '';
  statusRemark.value = '';
  statusDialogVisible.value = true;
};

// ============================================================
// 确认状态更新
// ============================================================
const confirmStatusUpdate = async () => {
  if (!selectedStatus.value) {
    ElMessage.warning('请选择目标状态');
    return;
  }

  statusLoading.value = true;
  try {
    const label = statusOptions.value.find(s => s.value === selectedStatus.value)?.label || selectedStatus.value;
    
    await updateProduction(currentOrder.value.orderId, {
      status: selectedStatus.value,
      step: 0,
      remark: statusRemark.value || `制作状态更新为：${label}`,
    });
    
    ElMessage.success(`状态已更新为：${label}`);
    statusDialogVisible.value = false;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '更新失败');
  } finally {
    statusLoading.value = false;
  }
};

// ============================================================
// 接单
// ============================================================
const handleBatchAccept = async () => {
  const acceptList = selectedOrders.value.filter(row => row.flowStatus === 'customerAudited');
  if (acceptList.length === 0) {
    ElMessage.warning('请选择待接单的订单');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要接单 ${acceptList.length} 个订单吗？`, '批量接单', { type: 'info' });
    let successCount = 0, failCount = 0;

    for (const order of acceptList) {
      try {
        await acceptOrder(order.orderId);
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0 && failCount === 0) {
      ElMessage.success(`${successCount} 个订单接单成功`);
    } else {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
    }
    loadData();
  } catch {}
};

const handleAccept = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要接单 ${row.orderNo} 吗？`, '接单确认', { type: 'info' });
    await acceptOrder(row.orderId);
    ElMessage.success('接单成功');
    loadData();
  } catch {}
};

// ============================================================
// 生成账单
// ============================================================
const handleGenerateBill = (row) => {
  router.push(`/order/bill/create?orderIds=${row.orderId}`);
};

const handleBatchGenerateBill = async () => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请先选择订单');
    return;
  }
  
  const validOrders = selectedOrders.value.filter(o => o.flowStatus === 'polishing');
  if (validOrders.length === 0) {
    ElMessage.warning('请选择状态为"制作完成"的订单');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定为 ${validOrders.length} 个订单生成账单吗？`, '生成账单', { type: 'info' });
  } catch {
    return;
  }

  batchCreating.value = true;
  try {
    const orderIds = validOrders.map(o => o.orderId);
    const res = await createBill({ orderIds });
    if (res.success) {
      ElMessage.success(`账单 ${res.billNo} 创建成功`);
      router.push(`/order/bill/edit/${res.billId}`);
    }
  } catch (error) {
    ElMessage.error(error.message || '生成账单失败');
  } finally {
    batchCreating.value = false;
  }
};

// ============================================================
// 跳转
// ============================================================
const goFactoryEdit = (orderId) => {
  router.push(`/order/factory-edit/${orderId}`);
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

// ============================================================
// 初始化
// ============================================================
onMounted(() => {
  dateRange.value = [getTodayStr(), getTodayStr()];
  loadCustomers();
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

.filter-bar {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
  background: #f5f7fa;
  padding: 10px 16px;
  border-radius: 6px;
}

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

:deep(.el-image) { transition: transform 0.3s; }
:deep(.el-image:hover) { transform: scale(2.5); z-index: 10; position: relative; }
</style>