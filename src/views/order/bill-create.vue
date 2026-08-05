<!-- src/views/order/bill-create.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📄 生成账单</h2>
        <el-tag type="info" size="large">选择订单生成账单</el-tag>
        <span v-if="selectedOrders.length > 0" style="color:#409EFF;font-size:14px;">
          已选 {{ selectedOrders.length }} 个订单
        </span>
      </div>
      <div class="header-right">
        <el-button
          type="primary"
          @click="handleCreateBill"
          :loading="creating"
          :disabled="selectedOrders.length === 0"
        >
          生成账单 ({{ selectedOrders.length }})
        </el-button>
      </div>
    </div>

    <!-- ⭐ 搜索栏 - 增加客户搜索 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="关键词">
          <el-input
            v-model="searchKeyword"
            placeholder="订单号/品名"
            clearable
            style="width:180px;"
            @clear="loadData"
            @keyup.enter="loadData"
          />
        </el-form-item>
        <el-form-item label="客户">
          <el-select
            v-model="searchCustomerId"
            placeholder="全部客户"
            clearable
            filterable
            style="width:180px;"
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

    <!-- ⭐ 汇总信息 - 改为一行简洁显示 -->
    <div class="summary-bar" v-if="orderList.length > 0">
      <div class="summary-item">
        <span class="summary-label">可生成订单：</span>
        <span class="summary-value">{{ orderList.length }}</span>
      </div>
      <div class="summary-item" v-if="selectedOrders.length > 0">
        <span class="summary-label">已选：</span>
        <span class="summary-value" style="color:#409EFF;">{{ selectedOrders.length }}</span>
      </div>
      <div class="summary-item" v-if="selectedOrders.length > 0">
        <span class="summary-label">合计金额：</span>
        <span class="summary-value" style="color:#E6A23C;font-weight:bold;">
          ¥{{ selectedTotal.toFixed(2) }}
        </span>
      </div>
      <div class="summary-item" v-if="selectedOrders.length > 0">
        <span class="summary-label">合计件数：</span>
        <span class="summary-value">{{ selectedQuantity }}</span>
      </div>
      <div class="summary-item" v-if="selectedOrders.length > 0">
        <span class="summary-label">金料费合计：</span>
        <span class="summary-value">¥{{ selectedGoldFee.toFixed(2) }}</span>
      </div>
      <div class="summary-item" v-if="selectedOrders.length > 0">
        <span class="summary-label">工费合计：</span>
        <span class="summary-value">¥{{ selectedLaborFee.toFixed(2) }}</span>
      </div>
    </div>

    <!-- 订单列表 -->
    <el-table
      ref="tableRef"
      :data="filteredOrderList"
      border
      stripe
      @selection-change="handleSelectionChange"
      v-loading="loading"
      row-key="orderId"
    >
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column prop="orderNo" label="订单号" width="150" />
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="productName" label="品名" min-width="120" />
      <el-table-column prop="quantity" label="件数" width="70" align="center" />
      <el-table-column prop="color" label="成色" width="80" align="center" />
      <el-table-column prop="size" label="手寸" width="80" align="center" />
      <el-table-column prop="totalWeight" label="总重(g)" width="85" align="right">
        <template #default="{ row }">{{ row.totalWeight || '-' }}</template>
      </el-table-column>
      <el-table-column prop="netWeight" label="净重(g)" width="85" align="right">
        <template #default="{ row }">{{ row.netWeight || '-' }}</template>
      </el-table-column>
      <el-table-column prop="goldMaterialFee" label="金料费" width="100" align="right">
        <template #default="{ row }">¥{{ (row.goldMaterialFee || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="laborFee" label="工费" width="100" align="right">
        <template #default="{ row }">¥{{ (row.laborFee || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="totalAmount" label="总金额" width="110" align="right">
        <template #default="{ row }">
          <span style="color:#E6A23C;font-weight:bold;">
            ¥{{ (row.totalAmount || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="orderDate" label="订单日期" width="110" align="center">
        <template #default="{ row }">{{ formatDate(row.orderDate) }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="完成时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && orderList.length === 0" description="暂无可生成账单的订单" />

    <!-- 分页 -->
    <div style="margin-top:16px;display:flex;justify-content:flex-end;">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="loadData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Search, RefreshRight } from '@element-plus/icons-vue';
import { getAvailableOrders, createBill } from '@/api/bill';
import { getCustomerList } from '@/api/customer';

const route = useRoute();
const router = useRouter();
const tableRef = ref();

const loading = ref(false);
const creating = ref(false);
const orderList = ref([]);
const selectedOrders = ref([]);
const searchKeyword = ref('');
const searchCustomerId = ref('');
const customerList = ref([]);

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

// ===== 计算汇总 =====
const selectedTotal = computed(() => {
  return selectedOrders.value.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
});

const selectedQuantity = computed(() => {
  return selectedOrders.value.reduce((sum, o) => sum + (o.quantity || 1), 0);
});

const selectedGoldFee = computed(() => {
  return selectedOrders.value.reduce((sum, o) => sum + (o.goldMaterialFee || 0), 0);
});

const selectedLaborFee = computed(() => {
  return selectedOrders.value.reduce((sum, o) => sum + (o.laborFee || 0), 0);
});

// ===== 过滤后的列表 =====
const filteredOrderList = computed(() => {
  let list = orderList.value;
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    list = list.filter(o => 
      o.orderNo?.toLowerCase().includes(keyword) ||
      o.productName?.toLowerCase().includes(keyword)
    );
  }
  
  // 客户筛选
  if (searchCustomerId.value) {
    list = list.filter(o => o.customerId === searchCustomerId.value);
  }
  
  pagination.total = list.length;
  return list;
});

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
    const res = await getAvailableOrders();
    let data = res?.data || [];
    orderList.value = data;
    pagination.total = data.length;
    
    // ⭐ 如果 URL 有 orderIds 参数，自动选中
    const orderIdsParam = route.query.orderIds;
    if (orderIdsParam) {
      const orderIds = orderIdsParam.split(',').map(Number);
      selectedOrders.value = data.filter(o => orderIds.includes(o.orderId));
      
      await nextTick();
      if (tableRef.value && selectedOrders.value.length > 0) {
        selectedOrders.value.forEach(row => {
          tableRef.value.toggleRowSelection(row, true);
        });
      }
      
      if (selectedOrders.value.length > 0) {
        ElMessage.success(`已自动选中 ${selectedOrders.value.length} 个订单`);
      }
    }
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  searchKeyword.value = '';
  searchCustomerId.value = '';
  loadData();
};

// ===== 多选 =====
const handleSelectionChange = (selection) => {
  selectedOrders.value = selection;
};

// ===== 生成账单 =====
const handleCreateBill = async () => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请至少选择一个订单');
    return;
  }

  // 校验所有选中的订单是否都有 totalAmount
  const invalidOrders = selectedOrders.value.filter(o => !o.totalAmount || o.totalAmount <= 0);
  if (invalidOrders.length > 0) {
    const orderNos = invalidOrders.map(o => o.orderNo).join(', ');
    try {
      await ElMessageBox.confirm(
        `以下订单没有金额：${orderNos}，确定要继续生成账单吗？`,
        '提示',
        { type: 'warning' }
      );
    } catch {
      return;
    }
  }

  try {
    await ElMessageBox.confirm(
      `确定为 ${selectedOrders.value.length} 个订单生成账单吗？\n` +
      `合计金额：¥${selectedTotal.value.toFixed(2)}，合计件数：${selectedQuantity.value}`,
      '生成账单',
      { type: 'info' }
    );
  } catch {
    return;
  }

  creating.value = true;
  try {
    const orderIds = selectedOrders.value.map(o => o.orderId);
    const res = await createBill({ orderIds });
    if (res.success) {
      ElMessage.success(`账单 ${res.billNo} 生成成功`);
      router.push(`/order/bill/detail/${res.billId}`);
    }
  } catch (error) {
    ElMessage.error(error.message || '生成账单失败');
  } finally {
    creating.value = false;
  }
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN', { hour12: false });
};

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
.header-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.search-bar {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 12px;
}
.search-bar :deep(.el-form-item) {
  margin-bottom: 0;
}

/* ⭐ 汇总栏 */
.summary-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 10px 16px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #e8ecf1;
  flex-wrap: wrap;
}
.summary-item {
  font-size: 14px;
  color: #606266;
}
.summary-label {
  color: #909399;
}
.summary-value {
  font-weight: 600;
  color: #303133;
}

:deep(.el-table .cell) { padding: 6px 8px; }
</style>