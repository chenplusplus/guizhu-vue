<!-- src/views/order/lr-customer-profit.vue -->
<template>
  <div class="page-container">
    <!-- ===== 搜索栏 ===== -->
    <div class="search-bar">
      <el-form :inline="true" :model="search" size="default">
        <el-form-item label="月份">
          <el-date-picker
            v-model="search.month"
            type="month"
            value-format="YYYY-MM"
            format="YYYY-MM"
            placeholder="全部月份"
            clearable
            style="width: 160px;"
          />
        </el-form-item>
        <el-form-item label="客户">
          <el-select
            v-model="search.customerId"
            placeholder="全部客户"
            clearable
            filterable
            style="width: 180px;"
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
        <el-form-item>
          <el-tag type="info" style="margin-left:8px;">
            按月汇总：{{ search.month || '全部月份' }}
          </el-tag>
        </el-form-item>
      </el-form>
    </div>

    <!-- ===== 表格 ===== -->
    <el-table
      :data="tableData"
      v-loading="loading"
      border
      stripe
      show-summary
      :summary-method="getSummary"
      style="width:100%;"
    >
      <el-table-column prop="customerName" label="客户" min-width="140" fixed />
      <el-table-column prop="lrCount" label="LR单数" width="90" align="center" />
      <el-table-column prop="totalSale" label="销售额" width="130" align="right">
        <template #default="{ row }">¥{{ fmt(row.totalSale) }}</template>
      </el-table-column>
      <el-table-column prop="totalCost" label="成本" width="130" align="right">
        <template #default="{ row }">¥{{ fmt(row.totalCost) }}</template>
      </el-table-column>
      <el-table-column prop="profit" label="利润" width="130" align="right">
        <template #default="{ row }">
          <span :style="{ color: (row.profit || 0) >= 0 ? '#F56C6C' : '#909399', fontWeight: 'bold' }">
            ¥{{ fmt(row.profit) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="diamondProfit" label="钻石利润" width="120" align="right">
        <template #default="{ row }">¥{{ fmt(row.diamondProfit) }}</template>
      </el-table-column>
      <el-table-column prop="settingProfit" label="镶石利润" width="120" align="right">
        <template #default="{ row }">¥{{ fmt(row.settingProfit) }}</template>
      </el-table-column>
      <el-table-column prop="laborProfit" label="工费利润" width="120" align="right">
        <template #default="{ row }">¥{{ fmt(row.laborProfit) }}</template>
      </el-table-column>
      <el-table-column prop="netWeight" label="净重" width="110" align="right">
        <template #default="{ row }">{{ fmt(row.netWeight, 3) }}g</template>
      </el-table-column>
      <el-table-column prop="addLossWeight" label="加耗重" width="110" align="right">
        <template #default="{ row }">{{ fmt(row.addLossWeight, 3) }}g</template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无利润分析数据" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, RefreshRight } from '@element-plus/icons-vue';
import { getCustomerProfitSummary, getLrCustomers } from '@/api/lr';

const loading = ref(false);
const tableData = ref([]);
const customerList = ref([]);

const search = reactive({
  month: '',
  customerId: '',
});

const fmt = (val, digits = 2) => {
  const n = Number(val || 0);
  return n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

// ===== 合计行 =====
const getSummary = ({ columns, data }) => {
  const sums = [];
  columns.forEach((col, index) => {
    if (index === 0) {
      sums[index] = '合计';
      return;
    }
    if (col.property === 'lrCount') {
      sums[index] = data.reduce((s, r) => s + (Number(r.lrCount) || 0), 0);
      return;
    }
    if (['totalSale', 'totalCost', 'profit', 'diamondProfit', 'settingProfit', 'laborProfit', 'netWeight', 'addLossWeight'].includes(col.property)) {
      const total = data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0);
      const digits = col.property === 'netWeight' || col.property === 'addLossWeight' ? 3 : 2;
      const prefix = col.property === 'netWeight' || col.property === 'addLossWeight' ? '' : '¥';
      const suffix = col.property === 'netWeight' || col.property === 'addLossWeight' ? 'g' : '';
      sums[index] = prefix + fmt(total, digits) + suffix;
      return;
    }
    sums[index] = '';
  });
  return sums;
};

const loadCustomers = async () => {
  try {
    const res = await getLrCustomers();
    customerList.value = res?.data || [];
  } catch {
    customerList.value = [];
  }
};

const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      month: search.month || undefined,
      customerId: search.customerId || undefined,
    };
    const res = await getCustomerProfitSummary(params);
    tableData.value = res?.data || [];
  } catch {
    ElMessage.error('加载利润分析失败');
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  search.month = '';
  search.customerId = '';
  loadData();
};

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
.search-bar {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 12px;
}
.search-bar :deep(.el-form-item) {
  margin-bottom: 0;
}
</style>
