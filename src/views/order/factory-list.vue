<!-- src/views/order/factory-list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>🏭 工厂订单</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <el-button
          v-if="selectedOrders.length > 0"
          type="success"
          @click="handleBatchAccept"
        >
          批量接单 ({{ selectedOrders.length }})
        </el-button>
        <el-button
          v-if="selectedOrders.length > 0"
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

    <!-- ⭐ 筛选栏：状态 + 关键词 + 客户 -->
    <div class="filter-bar">
      <el-radio-group v-model="filterStatus" @change="loadData">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="customerAudited">待接单</el-radio-button>
        <el-radio-button value="producing">制作中</el-radio-button>
        <el-radio-button value="polishing">可出账单</el-radio-button>
      </el-radio-group>

      <el-input
        v-model="keyword"
        placeholder="搜索订单号/品名"
        style="width: 180px; margin-left: 12px;"
        clearable
        @clear="loadData"
        @keyup.enter="loadData"
      />

      <!-- ⭐ 客户筛选 -->
      <el-select
        v-model="filterCustomerId"
        placeholder="全部客户"
        clearable
        filterable
        style="width: 180px; margin-left: 8px;"
        @change="loadData"
      >
        <el-option
          v-for="item in customerList"
          :key="item.customerId"
          :label="item.customerName"
          :value="item.customerId"
        />
      </el-select>

      <el-button type="primary" @click="loadData" style="margin-left: 8px;">
        <el-icon><Search /></el-icon> 搜索
      </el-button>
      <el-button @click="resetSearch">
        <el-icon><RefreshRight /></el-icon> 重置
      </el-button>
    </div>

    <!-- ⭐ 去掉统计卡片，改为简洁的一行汇总 -->
    <div class="summary-bar" v-if="tableData.length > 0">
      <span>共 <b>{{ tableData.length }}</b> 个订单</span>
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
      @row-click="viewDetail"
      row-key="orderId"
    >
      <el-table-column type="selection" width="55" align="center" />

      <el-table-column prop="orderNo" label="订单号" width="150" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.orderId)">
            {{ row.orderNo }}
          </el-link>
        </template>
      </el-table-column>

      <el-table-column prop="customerName" label="客户" width="120" />

      <el-table-column prop="orderDate" label="订单日期" width="110" align="center">
        <template #default="{ row }">
          {{ formatDate(row.orderDate) }}
        </template>
      </el-table-column>

      <el-table-column prop="productName" label="品名" min-width="120" />

      <!-- 产品图片 -->
      <el-table-column label="图片" width="70" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row.imageUrl"
            :src="row.imageUrl"
            fit="cover"
            style="width: 45px; height: 45px; border-radius: 4px; cursor: pointer;"
            :preview-src-list="[row.imageUrl]"
            preview-teleported
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

      <el-table-column prop="amount" label="金额" width="110" align="right">
        <template #default="{ row }">
          <span style="color: #E6A23C; font-weight: bold;">
            ¥{{ (row.amount || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column prop="flowStatus" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.flowStatus)" size="small">
            {{ getStatusText(row.flowStatus) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="260" fixed="right" align="center">
        <template #default="{ row }">
          <!-- ⭐ 待接单 → 接单 -->
          <el-button
            v-if="row.flowStatus === 'customerAudited'"
            size="small"
            type="success"
            @click.stop="handleAccept(row)"
          >
            接单
          </el-button>

          <!-- ⭐ 所有工厂状态都可以更新状态（跳着选） -->
          <el-button
            v-if="isInProduction(row.flowStatus)"
            size="small"
            type="primary"
            @click.stop="openStatusDialog(row)"
          >
            更新状态
          </el-button>

          <!-- 可生成账单 -->
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
            v-if="canEdit(row)"
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
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="loadData"
      />
    </div>

    <!-- ===== 快捷更新状态弹窗（跳着选） ===== -->
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
        <el-form-item label="更新为">
          <!-- ⭐ 下拉显示所有可跳转的状态，不做顺序限制 -->
          <el-select v-model="selectedStatus" placeholder="请选择目标状态" style="width: 100%;">
            <el-option
              v-for="item in allAvailableStatuses"
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
        <el-button type="primary" @click="confirmStatusUpdate" :loading="statusLoading">
          确认更新
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue';
import { getOrderList, acceptOrder, updateProduction, generateBill } from '@/api/order';
import { getCustomerList } from '@/api/customer';
import { createBill } from '@/api/bill';

const router = useRouter();
const tableRef = ref();

const loading = ref(false);
const tableData = ref([]);
const keyword = ref('');
const filterStatus = ref('');
const filterCustomerId = ref('');  // ⭐ 客户筛选
const selectedOrders = ref([]);
const customerList = ref([]);      // ⭐ 客户列表

const statusDialogVisible = ref(false);
const statusLoading = ref(false);
const currentOrder = ref(null);
const selectedStatus = ref('');
const statusRemark = ref('');

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

// ===== 选中合计 =====
const selectedTotal = computed(() => {
  return selectedOrders.value.reduce((sum, o) => sum + (o.amount || 0), 0);
});

// ===== 状态映射 =====
const statusMap = {
  customerAudited: { text: '待接单', type: 'success' },
  accepted: { text: '已接单', type: 'primary' },
  waxing: { text: '出蜡', type: 'primary' },
  molded: { text: '倒模', type: 'primary' },
  setting: { text: '执模', type: 'primary' },
  cnc: { text: 'CNC', type: 'primary' },
  sweeping: { text: '扫镶口', type: 'primary' },
  stoneCutting: { text: '车石', type: 'primary' },
  microInlay: { text: '微镶', type: 'primary' },
  handInlay: { text: '手镶', type: 'primary' },
  polishing: { text: '可出账单', type: 'warning' },
  completed: { text: '已完成', type: 'success' },
};

const getStatusText = (status) => statusMap[status]?.text || status;
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ===== 制作中状态（可更新状态） =====
const productionStatuses = [
  'accepted', 'waxing', 'molded', 'setting', 'cnc',
  'sweeping', 'stoneCutting', 'microInlay', 'handInlay', 'polishing'
];

const isInProduction = (status) => productionStatuses.includes(status);

// ===== ⭐ 所有可跳转的状态（不做顺序限制，可以跳着选） =====
const allAvailableStatuses = computed(() => {
  const current = currentOrder.value?.flowStatus;
  
  // 所有工厂状态列表（排除当前状态和终态）
  const allStatuses = [
    { value: 'accepted', label: '已接单' },
    { value: 'waxing', label: '出蜡' },
    { value: 'molded', label: '倒模' },
    { value: 'setting', label: '执模' },
    { value: 'cnc', label: 'CNC' },
    { value: 'sweeping', label: '扫镶口' },
    { value: 'stoneCutting', label: '车石' },
    { value: 'microInlay', label: '微镶' },
    { value: 'handInlay', label: '手镶' },
    { value: 'polishing', label: '可出账单' },
    { value: 'completed', label: '已完成' },
  ];
  
  // ⭐ 如果是待接单，只能转到已接单
  if (current === 'customerAudited') {
    return allStatuses.filter(s => s.value === 'accepted');
  }
  
  // ⭐ 如果是制作中状态，可以跳转到任何其他制作状态（包括已完成）
  // 但排除当前状态
  return allStatuses.filter(s => s.value !== current);
});

// ===== 权限 =====
const canEdit = (row) => {
  return isInProduction(row.flowStatus) || row.flowStatus === 'customerAudited';
};

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
      keyword: keyword.value || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    };

    const res = await getOrderList(params);
    let data = res?.data || res || [];
    
    if (data.items) {
      data = data.items;
    }
    
    // ⭐ 前端过滤：只显示工厂相关状态
    const factoryStatuses = [
      'customerAudited', 'accepted', 'waxing', 'molded', 'setting',
      'cnc', 'sweeping', 'stoneCutting', 'microInlay', 'handInlay',
      'polishing'
    ];
    
    let filteredData = data.filter(item => factoryStatuses.includes(item.flowStatus));
    
    // ⭐ 客户筛选
    if (filterCustomerId.value) {
      filteredData = filteredData.filter(item => item.customerId === filterCustomerId.value);
    }
    
    // ⭐ 状态筛选
    if (filterStatus.value === 'producing') {
      const producingStatuses = [
        'accepted', 'waxing', 'molded', 'setting',
        'cnc', 'sweeping', 'stoneCutting', 'microInlay', 'handInlay'
      ];
      filteredData = filteredData.filter(item => producingStatuses.includes(item.flowStatus));
    } else if (filterStatus.value === 'polishing') {
      filteredData = filteredData.filter(item => item.flowStatus === 'polishing');
    } else if (filterStatus.value === 'customerAudited') {
      filteredData = filteredData.filter(item => item.flowStatus === 'customerAudited');
    }
    // filterStatus.value === '' 显示全部
    
    tableData.value = filteredData;
    pagination.total = filteredData.length;
    
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error('加载数据失败');
    tableData.value = [];
  } finally {
    loading.value = false;
  }
};

// ===== 重置搜索 =====
const resetSearch = () => {
  keyword.value = '';
  filterStatus.value = '';
  filterCustomerId.value = '';
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
// 批量接单
// ============================================================
const handleBatchAccept = async () => {
  const acceptList = selectedOrders.value.filter(row => row.flowStatus === 'customerAudited');
  if (acceptList.length === 0) {
    ElMessage.warning('请选择待接单的订单');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要接单 ${acceptList.length} 个订单吗？`,
      '批量接单',
      { type: 'info' }
    );
    let successCount = 0;
    let failCount = 0;

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
    } else if (successCount > 0 && failCount > 0) {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
    } else {
      ElMessage.error('全部失败');
    }
    loadData();
  } catch {}
};

// ============================================================
// 单个接单
// ============================================================
const handleAccept = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要接单 ${row.orderNo} 吗？`, '接单确认', { type: 'info' });
    await acceptOrder(row.orderId);
    ElMessage.success('接单成功');
    loadData();
  } catch {}
};

// ============================================================
// ⭐ 快捷更新状态（跳着选）
// ============================================================
const openStatusDialog = (row) => {
  currentOrder.value = row;
  selectedStatus.value = '';
  statusRemark.value = '';
  statusDialogVisible.value = true;
};

const confirmStatusUpdate = async () => {
  if (!selectedStatus.value) {
    ElMessage.warning('请选择目标状态');
    return;
  }

  statusLoading.value = true;
  try {
    const label = statusMap[selectedStatus.value]?.text || selectedStatus.value;
    await updateProduction(currentOrder.value.orderId, {
      status: selectedStatus.value,
      step: 0,
      remark: statusRemark.value || '',
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
// 生成账单（跳转到 bill-create）
// ============================================================
const handleGenerateBill = (row) => {
  router.push(`/order/bill/create?orderIds=${row.orderId}`);
};

// ============================================================
// 批量生成账单（跳转到 bill-create）
// ============================================================
const handleBatchGenerateBill = async () => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请先选择订单');
    return;
  }
  
  // 只允许选择 polishing 状态的订单
  const validOrders = selectedOrders.value.filter(o => o.flowStatus === 'polishing');
  if (validOrders.length === 0) {
    ElMessage.warning('请选择状态为"可出账单"的订单');
    return;
  }
  
  // 检查是否有金额为空的订单
  const emptyAmount = validOrders.filter(o => !o.totalAmount || o.totalAmount <= 0);
  if (emptyAmount.length > 0) {
    ElMessage.warning(`以下订单没有金额：${emptyAmount.map(o => o.orderNo).join(', ')}，请先编辑完善`);
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定为 ${validOrders.length} 个订单生成账单吗？\n` +
      `合计金额：¥${validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2)}`,
      '生成账单',
      { type: 'info' }
    );
  } catch {
    return;
  }

  batchCreating.value = true;
  try {
    const orderIds = validOrders.map(o => o.orderId);
    const res = await createBill({ orderIds });
    if (res.success) {
      ElMessage.success(`账单 ${res.billNo} 创建成功`);
      // ⭐ 直接跳转到编辑页
      router.push(`/order/bill/edit/${res.billId}`);
    }
  } catch (error) {
    ElMessage.error(error.message || '生成账单失败');
  } finally {
    batchCreating.value = false;
  }
};

// ============================================================
// 跳转工厂编辑
// ============================================================
const goFactoryEdit = (orderId) => {
  router.push(`/order/factory-edit/${orderId}`);
};

// ============================================================
// 查看详情
// ============================================================
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

/* ⭐ 汇总栏 */
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

/* 图片悬停放大 - 使用预览 */
:deep(.el-image) { transition: transform 0.3s; }
:deep(.el-image:hover) { transform: scale(2.5); z-index: 10; position: relative; }
</style>