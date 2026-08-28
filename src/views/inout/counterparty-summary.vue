<!-- src/views/inout/counterparty-summary.vue 往来单位月度汇总 -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left"><h2>👥 往来单位汇总</h2></div>
      <div class="header-right">
        <el-button @click="loadData"><el-icon><Refresh /></el-icon> 刷新</el-button>
      </div>
    </div>

    <!-- 筛选区 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="年份">
          <el-select v-model="searchForm.year" style="width:100px;" @change="loadData">
            <el-option v-for="y in yearOptions" :key="y" :label="y+'年'" :value="y" />
          </el-select>
        </el-form-item>
        <el-form-item label="月份">
          <el-select v-model="searchForm.month" style="width:90px;" @change="loadData">
            <el-option label="全部" :value="0" />
            <el-option v-for="m in 12" :key="m" :label="m+'月'" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width:110px;" @change="loadData">
            <el-option label="客户" value="customer" />
            <el-option label="供应商" value="supplier" />
          </el-select>
        </el-form-item>
        <el-form-item label="搜索"><el-input v-model="searchForm.keyword" placeholder="单位名称" clearable style="width:140px;" @clear="loadData" @keyup.enter="loadData" /></el-form-item>
        <el-form-item><el-button type="primary" @click="loadData">查询</el-button><el-button @click="resetSearch">重置</el-button></el-form-item>
      </el-form>
    </div>

    <!-- 统计卡片 -->
    <div class="summary-cards">
      <div class="summary-card green"><div class="card-label">客户总数</div><div class="card-value">{{ stats.customerCount }} 家</div></div>
      <div class="summary-card orange"><div class="card-label">供应商总数</div><div class="card-value">{{ stats.supplierCount }} 家</div></div>
      <div class="summary-card blue"><div class="card-label">当月总收入</div><div class="card-value">¥{{ stats.totalIn.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</div></div>
      <div class="summary-card red"><div class="card-label">当月总支出</div><div class="card-value">¥{{ stats.totalOut.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</div></div>
    </div>

    <!-- 表格 -->
    <div class="content-table">
      <el-table :data="tableData" border stripe v-loading="loading" show-summary>
        <el-table-column prop="counterpartyName" label="单位名称" min-width="150">
          <template #default="{ row }">
            <el-link type="primary" @click="goReconciliation(row)">{{ row.counterpartyName }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="typeLabel" label="类型" width="90" align="center">
          <template #default="{ row }"><el-tag :type="row.counterpartyType === 'customer' ? 'success' : 'warning'" size="small">{{ row.typeLabel }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="totalIn" label="收入(元)" width="140" align="right">
          <template #default="{ row }"><span class="amount-in">¥{{ (row.totalIn || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</span></template>
        </el-table-column>
        <el-table-column prop="totalOut" label="支出(元)" width="140" align="right">
          <template #default="{ row }"><span class="amount-out">¥{{ (row.totalOut || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</span></template>
        </el-table-column>
        <el-table-column prop="balance" label="结余(元)" width="140" align="right">
          <template #default="{ row }">
            <span :class="(row.balance || 0) >= 0 ? 'amount-in' : 'amount-out'" style="font-weight:bold;">
              ¥{{ (row.balance || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="inCount" label="收入笔数" width="100" align="center">
          <template #default="{ row }"><el-tag type="success" size="small">{{ row.inCount || 0 }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="outCount" label="支出笔数" width="100" align="center">
          <template #default="{ row }"><el-tag type="danger" size="small">{{ row.outCount || 0 }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }"><el-button size="small" type="primary" link @click="goReconciliation(row)">对账</el-button></template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination v-model:current-page="pagination.current" v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next"
          @size-change="loadData" @current-change="loadData" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { getCounterpartySummary } from '@/api/inoutReport';

const router = useRouter();
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

const loading = ref(false);
const tableData = ref([]);
const total = ref(0);
const stats = reactive({ customerCount: 0, supplierCount: 0, totalIn: 0, totalOut: 0 });
const searchForm = reactive({ year: currentYear, month: currentMonth, type: '', keyword: '' });
const pagination = reactive({ current: 1, pageSize: 20 });

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getCounterpartySummary({
      year: searchForm.year, month: searchForm.month,
      type: searchForm.type || undefined,
      keyword: searchForm.keyword || undefined,
      page: pagination.current, pageSize: pagination.pageSize
    });
    tableData.value = res.data || [];
    total.value = res.total || 0;
    // 简单统计
    stats.customerCount = tableData.value.filter(r => r.counterpartyType === 'customer').length;
    stats.supplierCount = tableData.value.filter(r => r.counterpartyType === 'supplier').length;
    stats.totalIn = tableData.value.reduce((s, r) => s + (r.totalIn || 0), 0);
    stats.totalOut = tableData.value.reduce((s, r) => s + (r.totalOut || 0), 0);
  } catch { ElMessage.error('加载失败'); }
  finally { loading.value = false; }
};

const resetSearch = () => { searchForm.type = ''; searchForm.keyword = ''; pagination.current = 1; loadData(); };

const goReconciliation = (row) => {
  router.push(`/inout/reconciliation?counterpartyId=${row.counterpartyId}&year=${searchForm.year}&month=${searchForm.month}`);
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0; flex-wrap: wrap; gap: 10px; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; }
.search-bar { background: #fff; padding: 16px 20px 0; }
.search-bar :deep(.el-form-item) { margin-bottom: 12px; }
.summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 16px 20px; background: #fff; margin-top: 2px; }
.summary-card { border-radius: 8px; padding: 14px 18px; color: #fff; }
.summary-card.green { background: linear-gradient(135deg, #67C23A, #85ce61); }
.summary-card.orange { background: linear-gradient(135deg, #E6A23C, #ebb563); }
.summary-card.blue { background: linear-gradient(135deg, #409EFF, #66b1ff); }
.summary-card.red { background: linear-gradient(135deg, #F56C6C, #f78989); }
.card-label { font-size: 13px; opacity: 0.9; margin-bottom: 6px; }
.card-value { font-size: 20px; font-weight: bold; }
.content-table { background: #fff; padding: 16px 20px; border-radius: 0 0 8px 8px; margin-top: 2px; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
.amount-in { color: #67C23A; }
.amount-out { color: #F56C6C; }
</style>
