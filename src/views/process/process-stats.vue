<!-- src/views/process/process-stats.vue 全局统计 -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left"><h2>📊 全局统计</h2><el-tag type="info">{{ currentYear }}年</el-tag></div>
      <div class="header-right">
        <el-select v-model="currentYear" style="width:110px;" @change="loadGlobal">
          <el-option v-for="y in years" :key="y" :label="`${y}年`" :value="y" />
        </el-select>
        <el-button @click="loadGlobal"><el-icon><Refresh /></el-icon> 刷新</el-button>
      </div>
    </div>

    <div class="content-body">
      <!-- 全局汇总卡片 -->
      <div class="summary-cards">
        <el-card class="card" shadow="hover">
          <div class="card-label">总单据数</div>
          <div class="card-value primary">{{ stats.totalCount }}</div>
          <div class="card-sub">三大工序合计</div>
        </el-card>
        <el-card class="card" shadow="hover">
          <div class="card-label">总发出重量</div>
          <div class="card-value">{{ stats.totalSendWeight?.toFixed(2) }} <span class="unit">g</span></div>
          <div class="card-sub">含三大工序</div>
        </el-card>
        <el-card class="card" shadow="hover">
          <div class="card-label">总损耗重量</div>
          <div class="card-value warning">{{ stats.totalActualLoss?.toFixed(2) }} <span class="unit">g</span></div>
          <div class="card-sub">实损耗合计</div>
        </el-card>
        <el-card class="card" shadow="hover">
          <div class="card-label">整体损耗率</div>
          <div class="card-value" :class="overallLossRate > 5 ? 'danger' : 'success'">{{ overallLossRate }}%</div>
          <div class="card-sub">损耗/发出</div>
        </el-card>
        <el-card class="card" shadow="hover">
          <div class="card-label">待审核</div>
          <div class="card-value danger">{{ pendingCount }}</div>
          <div class="card-sub">三大工序</div>
        </el-card>
      </div>

      <!-- 三大工序对比 -->
      <el-divider content-position="left">🔄 三大工序对比</el-divider>
      <el-row :gutter="16" class="process-compare">
        <el-col :xs="24" :sm="8" v-for="item in processCompare" :key="item.key">
          <el-card class="process-card" shadow="hover" :style="{ borderLeft: `4px solid ${item.color}` }">
            <div class="process-title">{{ item.name }}</div>
            <div class="process-stats">
              <div class="stat-row"><span class="stat-label">单据数</span><span class="stat-val">{{ item.count }}</span></div>
              <div class="stat-row"><span class="stat-label">发出</span><span class="stat-val">{{ item.sendWeight?.toFixed(2) }}g</span></div>
              <div class="stat-row"><span class="stat-label">回收</span><span class="stat-val">{{ item.recycleWeight?.toFixed(2) }}g</span></div>
              <div class="stat-row"><span class="stat-label">损耗</span><span class="stat-val warning">{{ item.actualLoss?.toFixed(2) }}g</span></div>
              <div class="stat-row"><span class="stat-label">损耗率</span><span class="stat-val" :class="item.lossRate > 5 ? 'danger' : 'success'">{{ item.lossRate }}%</span></div>
              <div class="stat-row"><span class="stat-label">待审</span><span class="stat-val danger">{{ item.pendingCount }}</span></div>
            </div>
            <el-button size="small" class="goto-btn" @click="$router.push(item.listPath)">查看列表 →</el-button>
          </el-card>
        </el-col>
      </el-row>

      <!-- 月度趋势 -->
      <el-divider content-position="left">📈 月度趋势（发出 vs 损耗）</el-divider>
      <div ref="chartRef" class="chart-container"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { getGlobalStats, getProcessStats } from '@/api/process';

const loading = ref(false);
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
const chartRef = ref(null);
let chart = null;

const stats = ref({ totalCount: 0, totalSendWeight: 0, totalRecycleWeight: 0, totalActualLoss: 0, zhimo: {}, xiangshi: {}, polishing: {} });

const pendingCount = computed(() => (stats.value.zhimo?.pendingCount || 0) + (stats.value.xiangshi?.pendingCount || 0) + (stats.value.polishing?.pendingCount || 0));

const overallLossRate = computed(() => {
  if (!stats.value.totalSendWeight) return '0.00';
  return ((stats.value.totalActualLoss / stats.value.totalSendWeight) * 100).toFixed(2);
});

const processCompare = computed(() => [
  { key: 'zhimo', name: '🔧 执模', color: '#409EFF', count: stats.value.zhimo?.totalCount || 0, sendWeight: stats.value.zhimo?.totalSendWeight || 0, recycleWeight: stats.value.zhimo?.totalRecycleWeight || 0, actualLoss: stats.value.zhimo?.totalActualLoss || 0, lossRate: stats.value.zhimo?.avgLossRate || 0, pendingCount: stats.value.zhimo?.pendingCount || 0, listPath: '/process/zm-list' },
  { key: 'xiangshi', name: '💎 镶石', color: '#E6A23C', count: stats.value.xiangshi?.totalCount || 0, sendWeight: stats.value.xiangshi?.totalSendWeight || 0, recycleWeight: stats.value.xiangshi?.totalRecycleWeight || 0, actualLoss: stats.value.xiangshi?.totalActualLoss || 0, lossRate: stats.value.xiangshi?.avgLossRate || 0, pendingCount: stats.value.xiangshi?.pendingCount || 0, listPath: '/process/xs-list' },
  { key: 'polishing', name: '✨ 抛光', color: '#67C23A', count: stats.value.polishing?.totalCount || 0, sendWeight: stats.value.polishing?.totalSendWeight || 0, recycleWeight: stats.value.polishing?.totalRecycleWeight || 0, actualLoss: stats.value.polishing?.totalActualLoss || 0, lossRate: stats.value.polishing?.avgLossRate || 0, pendingCount: stats.value.polishing?.pendingCount || 0, listPath: '/process/pg-list' },
]);

const loadChart = (monthlyData) => {
  nextTick(() => {
    if (!chartRef.value) return;
    if (chart) chart.dispose();
    chart = echarts.init(chartRef.value);
    const months = monthlyData.map(d => `${d.month}月`);
    const sendData = monthlyData.map(d => d.totalSendWeight || 0);
    const lossData = monthlyData.map(d => d.totalActualLoss || 0);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['发出重量(g)', '损耗重量(g)'] },
      xAxis: { type: 'category', data: months },
      yAxis: { type: 'value', name: '重量(g)' },
      series: [
        { name: '发出重量(g)', type: 'bar', data: sendData, itemStyle: { color: '#409EFF' } },
        { name: '损耗重量(g)', type: 'bar', data: lossData, itemStyle: { color: '#F56C6C' } }
      ]
    });
  });
};

const loadGlobal = async () => {
  loading.value = true;
  try {
    const params = { startDate: `${currentYear}-01-01`, endDate: `${currentYear}-12-31` };
    const res = await getGlobalStats(params);
    stats.value = res.data || {};
    const allMonthly = [...(stats.value.zhimo?.byMonth || []), ...(stats.value.xiangshi?.byMonth || []), ...(stats.value.polishing?.byMonth || [])];
    const monthlyMap = {};
    allMonthly.forEach(m => { monthlyMap[m.month] = (monthlyMap[m.month] || { month: m.month, totalSendWeight: 0, totalActualLoss: 0 }); monthlyMap[m.month].totalSendWeight += m.totalSendWeight || 0; monthlyMap[m.month].totalActualLoss += m.totalActualLoss || 0; });
    const merged = Object.values(monthlyMap).sort((a, b) => a.month - b.month);
    for (let i = 1; i <= 12; i++) { if (!merged.find(m => m.month === i)) merged.push({ month: i, totalSendWeight: 0, totalActualLoss: 0 }); }
    merged.sort((a, b) => a.month - b.month);
    loadChart(merged);
  } catch (e) { ElMessage.error(e.message || '加载失败'); }
  finally { loading.value = false; }
};

onMounted(loadGlobal);
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0; flex-wrap: wrap; gap: 10px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; align-items: center; }
.content-body { background: #fff; padding: 20px; border-radius: 0 0 8px 8px; }
.summary-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
.card { text-align: center; }
.card-label { font-size: 13px; color: #909399; margin-bottom: 8px; }
.card-value { font-size: 28px; font-weight: bold; color: #303133; }
.card-value.primary { color: #409EFF; }
.card-value.warning { color: #E6A23C; }
.card-value.success { color: #67C23A; }
.card-value.danger { color: #F56C6C; }
.card .unit { font-size: 14px; }
.card-sub { font-size: 12px; color: #909399; margin-top: 4px; }
.process-compare { margin-bottom: 24px; }
.process-card { min-height: 240px; }
.process-title { font-size: 16px; font-weight: bold; margin-bottom: 16px; color: #303133; }
.process-stats .stat-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
.stat-label { color: #909399; }
.stat-val { font-weight: 600; }
.stat-val.warning { color: #E6A23C; }
.stat-val.danger { color: #F56C6C; }
.stat-val.success { color: #67C23A; }
.goto-btn { width: 100%; margin-top: 12px; }
.chart-container { width: 100%; height: 320px; }
</style>
