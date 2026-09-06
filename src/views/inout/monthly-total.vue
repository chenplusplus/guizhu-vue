<!-- src/views/inout/monthly-total.vue 月度总汇总 -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left"><h2>📊 月度总汇总</h2></div>
      <div class="header-right">
        <el-select v-model="selectedYear" style="width:110px;" @change="loadData">
          <el-option v-for="y in yearOptions" :key="y" :label="y + '年'" :value="y" />
        </el-select>
        <el-button @click="handleRegenerate" :loading="regenLoading"><el-icon><Refresh /></el-icon> 重新生成</el-button>
        <el-button @click="loadData"><el-icon><Refresh /></el-icon> 刷新</el-button>
      </div>
    </div>

    <!-- 汇总卡片 -->
    <div class="summary-cards">
      <div class="summary-card green">
        <div class="card-label">总收入</div>
        <div class="card-value">¥{{ summary.totalIn.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</div>
      </div>
      <div class="summary-card red">
        <div class="card-label">总支出</div>
        <div class="card-value">¥{{ summary.totalOut.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</div>
      </div>
      <div class="summary-card blue">
        <div class="card-label">结余</div>
        <div class="card-value" :class="{ negative: summary.balance < 0 }">
          ¥{{ summary.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}
        </div>
      </div>
      <div class="summary-card gray">
        <div class="card-label">总笔数</div>
        <div class="card-value">{{ summary.totalCount }} 笔</div>
      </div>
    </div>

    <!-- 月度明细表 -->
    <div class="content-table">
      <el-table :data="tableData" border stripe v-loading="loading" show-summary>
        <el-table-column prop="month" label="月份" width="100" align="center">
          <template #default="{ row }">{{ row.year }}年{{ row.month }}月</template>
        </el-table-column>
        <el-table-column prop="totalIn" label="收入(元)" width="150" align="right">
          <template #default="{ row }"><span class="amount-in">¥{{ (row.totalIn || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</span></template>
        </el-table-column>
        <el-table-column prop="totalOut" label="支出(元)" width="150" align="right">
          <template #default="{ row }"><span class="amount-out">¥{{ (row.totalOut || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</span></template>
        </el-table-column>
        <el-table-column prop="balance" label="结余(元)" width="150" align="right">
          <template #default="{ row }">
            <span :class="(row.balance || 0) >= 0 ? 'amount-in' : 'amount-out'" style="font-weight:bold;">
              ¥{{ (row.balance || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="收入笔数" width="110" align="center">
          <template #default="{ row }"><el-tag type="success" size="small">{{ row.inCount || 0 }} 笔</el-tag></template>
        </el-table-column>
        <el-table-column label="支出笔数" width="110" align="center">
          <template #default="{ row }"><el-tag type="danger" size="small">{{ row.outCount || 0 }} 笔</el-tag></template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { getMonthlyTotal } from '@/api/inoutReport';
import { regenerateReport } from '@/api/inoutReport';

const currentYear = new Date().getFullYear();
const selectedYear = ref(currentYear);
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
const loading = ref(false);
const regenLoading = ref(false);
const tableData = ref([]);
const summary = reactive({ totalIn: 0, totalOut: 0, balance: 0, totalCount: 0 });

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getMonthlyTotal({ year: selectedYear.value });
    tableData.value = res.data || [];
    summary.totalIn = tableData.value.reduce((s, r) => s + (r.totalIn || 0), 0);
    summary.totalOut = tableData.value.reduce((s, r) => s + (r.totalOut || 0), 0);
    summary.balance = summary.totalIn - summary.totalOut;
    summary.totalCount = tableData.value.reduce((s, r) => s + (r.inCount || 0) + (r.outCount || 0), 0);
  } catch { ElMessage.error('加载失败'); }
  finally { loading.value = false; }
};

const handleRegenerate = async () => {
  await ElMessageBox.confirm(`确定重新生成 ${selectedYear.value} 年全部月份的汇总数据吗？`, '提示', { type: 'info' });
  regenLoading.value = true;
  try {
    for (let m = 1; m <= 12; m++) {
      await regenerateReport({ year: selectedYear.value, month: m });
    }
    ElMessage.success('汇总数据已重新生成');
    loadData();
  } catch (e) { ElMessage.error(e.message || '生成失败'); }
  finally { regenLoading.value = false; }
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0; flex-wrap: wrap; gap: 10px; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; align-items: center; }
.summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 16px 20px; background: #fff; }
.summary-card { border-radius: 8px; padding: 16px 20px; color: #fff; }
.summary-card.green { background: linear-gradient(135deg, #67C23A, #85ce61); }
.summary-card.red { background: linear-gradient(135deg, #F56C6C, #f78989); }
.summary-card.blue { background: linear-gradient(135deg, #409EFF, #66b1ff); }
.summary-card.gray { background: linear-gradient(135deg, #909399, #a6a9ad); }
.card-label { font-size: 13px; opacity: 0.9; margin-bottom: 8px; }
.card-value { font-size: 22px; font-weight: bold; }
.card-value.negative { color: #ffd3d3; }
.content-table { background: #fff; padding: 16px 20px; border-radius: 0 0 8px 8px; margin-top: 2px; }
.amount-in { color: #67C23A; }
.amount-out { color: #F56C6C; }
</style>
