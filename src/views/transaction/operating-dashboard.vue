<!-- src/views/transaction/operating-dashboard.vue -->
<template>
  <div class="dashboard-page">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <h2>经营看板</h2>
      </div>
      <div class="toolbar-right">
        <el-radio-group v-model="rangeType" @change="onRangeChange">
          <el-radio-button value="month">本月</el-radio-button>
          <el-radio-button value="all">全部</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="rangeType === 'month'"
          v-model="month"
          type="month"
          format="YYYY-MM"
          value-format="YYYY-MM"
          placeholder="选择月份"
          style="width:140px"
          @change="onMonthChange"
        />
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 范围标签 -->
    <div class="range-tip">统计范围：<strong>{{ rangeLabel }}</strong></div>

    <!-- ⭐ 口径提示：本页是资金口径，不是经营净利 -->
    <div class="caliber-tip">
      <b>本页为「资金口径」</b>：收入 = 已确认账单对应的订单额 + 进销存费用收入；支出 = 进销存金料/钻石出库 + 费用支出。
      <br>
      <span class="caliber-warn">它不等于经营净利</span>：经营净利 = 销售额 − 进销存费用，请看「月度经营报表」。
    </div>

    <!-- 盈亏核心卡片 -->
    <div class="core-cards" v-loading="loading">
      <div class="core-card income-card">
        <div class="card-label">总收入</div>
        <div class="card-value">¥{{ fmtMoney(data.income) }}</div>
        <div class="card-sub">订单收入 ¥{{ fmtMoney(data.incomeDetail?.orderIncome) }} · 其他收入 ¥{{ fmtMoney(data.incomeDetail?.otherIncome) }}</div>
      </div>
      <div class="core-card expense-card">
        <div class="card-label">总支出</div>
        <div class="card-value">¥{{ fmtMoney(data.expense) }}</div>
        <div class="card-sub">金料 ¥{{ fmtMoney(data.expenseDetail?.goldOut) }} · 钻石 ¥{{ fmtMoney(data.expenseDetail?.diamondOut) }} · 费用 ¥{{ fmtMoney(data.expenseDetail?.expenseOut) }}</div>
      </div>
      <div class="core-card profit-card" :class="data.profit >= 0 ? 'profit-pos' : 'profit-neg'">
        <div class="card-label">{{ data.profit >= 0 ? '盈利' : '亏损' }}</div>
        <div class="card-value">{{ data.profit >= 0 ? '¥' : '-¥' }}{{ fmtMoney(Math.abs(data.profit)) }}</div>
        <div class="card-sub">利润率 {{ profitRate }}</div>
      </div>
    </div>

    <!-- 收入/支出明细 + 分类 -->
    <div class="detail-row">
      <!-- 收入构成 -->
      <div class="panel">
        <div class="panel-title">收入构成</div>
        <div class="breakdown">
          <div class="bd-item">
            <span class="bd-label">订单销售收入</span>
            <span class="bd-val income">¥{{ fmtMoney(data.incomeDetail?.orderIncome) }}</span>
          </div>
          <div class="bd-item">
            <span class="bd-label">其他收入（费用入）</span>
            <span class="bd-val income">¥{{ fmtMoney(data.incomeDetail?.otherIncome) }}</span>
          </div>
          <div class="bd-item muted-row">
            <span class="bd-label">金料入库（采购·不计收入）</span>
            <span class="bd-val muted">¥{{ fmtMoney(data.incomeDetail?.goldIn) }}</span>
          </div>
          <div class="bd-item muted-row">
            <span class="bd-label">钻石入库（采购·不计收入）</span>
            <span class="bd-val muted">¥{{ fmtMoney(data.incomeDetail?.diamondIn) }}</span>
          </div>
          <div class="bd-item total-row">
            <span class="bd-label">收入合计</span>
            <span class="bd-val income">¥{{ fmtMoney(data.income) }}</span>
          </div>
        </div>
      </div>

      <!-- 支出构成 -->
      <div class="panel">
        <div class="panel-title">支出构成</div>
        <div class="breakdown">
          <div class="bd-item">
            <span class="bd-label">金料成本（金出库）</span>
            <span class="bd-val expense">¥{{ fmtMoney(data.expenseDetail?.goldOut) }}</span>
          </div>
          <div class="bd-item">
            <span class="bd-label">钻石成本（钻石出库）</span>
            <span class="bd-val expense">¥{{ fmtMoney(data.expenseDetail?.diamondOut) }}</span>
          </div>
          <div class="bd-item">
            <span class="bd-label">费用支出</span>
            <span class="bd-val expense">¥{{ fmtMoney(data.expenseDetail?.expenseOut) }}</span>
          </div>
          <div class="bd-item total-row">
            <span class="bd-label">支出合计</span>
            <span class="bd-val expense">¥{{ fmtMoney(data.expense) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 费用支出分类 -->
    <div class="panel" v-if="data.expenseByCategory && data.expenseByCategory.length">
      <div class="panel-title">费用支出分类明细</div>
      <el-table :data="data.expenseByCategory" stripe border size="small">
        <el-table-column prop="category" label="费用类别" min-width="160" />
        <el-table-column label="金额" align="right" width="200">
          <template #default="{ row }">
            <span class="expense">¥{{ fmtMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="占比" width="240">
          <template #default="{ row }">
            <el-progress
              :percentage="pct(row.amount, data.expenseDetail?.expenseOut)"
              :color="'#f56c6c'"
              :stroke-width="14"
            />
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 月度趋势 -->
    <div class="panel">
      <div class="panel-title">近12个月经营趋势</div>
      <div class="trend-chart" v-loading="loading">
        <div class="trend-bars">
          <div class="trend-bar-group" v-for="t in data.trend" :key="t.month">
            <div class="bar-stack">
              <div class="bar income-bar" :style="{ height: barHeight(t.income) }" :title="'收入 ¥' + fmtMoney(t.income)"></div>
              <div class="bar expense-bar" :style="{ height: barHeight(t.expense) }" :title="'支出 ¥' + fmtMoney(t.expense)"></div>
            </div>
            <div class="bar-label">{{ shortMonth(t.month) }}</div>
            <div class="bar-profit" :class="t.profit >= 0 ? 'income' : 'expense'">{{ t.profit >= 0 ? '+' : '' }}{{ fmtMoneyShort(t.profit) }}</div>
          </div>
        </div>
        <div class="trend-legend">
          <span class="lg-item"><i class="dot income-dot"></i>收入</span>
          <span class="lg-item"><i class="dot expense-dot"></i>支出</span>
          <span class="lg-item"><i class="dot profit-dot"></i>盈亏</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { getOperatingDashboardSummary } from '@/api/operating-dashboard';

const route = useRoute();
const router = useRouter();

const month = ref(route.query.month || new Date().toISOString().slice(0, 7));
const rangeType = ref(route.query.rangeType === 'all' ? 'all' : 'month');
const loading = ref(false);

const data = reactive({
  income: 0,
  expense: 0,
  profit: 0,
  incomeDetail: { orderIncome: 0, otherIncome: 0, goldIn: 0, diamondIn: 0 },
  expenseDetail: { goldOut: 0, diamondOut: 0, expenseOut: 0 },
  expenseByCategory: [],
  trend: []
});

const rangeLabel = computed(() => rangeType.value === 'all' ? '全部' : (month.value || ''));

const profitRate = computed(() => {
  if (!data.income) return '—';
  const r = (data.profit / data.income) * 100;
  return r.toFixed(1) + '%';
});

const fmtMoney = (v) => {
  const n = Number(v || 0);
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtMoneyShort = (v) => {
  const n = Number(v || 0);
  const a = Math.abs(n);
  if (a >= 10000) return (n / 10000).toFixed(1) + 'w';
  return n.toFixed(0);
};

const pct = (val, total) => {
  const t = Number(total || 0);
  const v = Number(val || 0);
  if (!t) return 0;
  return Math.round((v / t) * 100);
};

const shortMonth = (m) => {
  if (!m) return '';
  return m.slice(5) + '月';
};

// 柱状图高度归一化
const barHeight = (v) => {
  const n = Number(v || 0);
  const max = Math.max(1, ...(data.trend || []).map(t => Math.max(Number(t.income || 0), Number(t.expense || 0))));
  const h = (n / max) * 120;
  return Math.max(2, Math.round(h)) + 'px';
};

const loadData = async () => {
  loading.value = true;
  try {
    const ym = rangeType.value === 'all' ? 'all' : month.value;
    const res = await getOperatingDashboardSummary(ym);
    // 响应拦截器已解包一层（return response.data），故业务数据在 res.data
    const d = res?.data || {};
    data.income = d.income || 0;
    data.expense = d.expense || 0;
    data.profit = d.profit || 0;
    data.incomeDetail = d.incomeDetail || data.incomeDetail;
    data.expenseDetail = d.expenseDetail || data.expenseDetail;
    data.expenseByCategory = d.expenseByCategory || [];
    data.trend = d.trend || [];
  } catch (e) {
    ElMessage.error('加载失败：' + (e.message || ''));
  } finally {
    loading.value = false;
  }
};

const syncUrl = () => {
  router.replace({
    path: route.path,
    query: { ...route.query, month: month.value, rangeType: rangeType.value }
  });
};

const onMonthChange = () => {
  syncUrl();
  loadData();
};

const onRangeChange = () => {
  syncUrl();
  loadData();
};

onMounted(loadData);
</script>

<style scoped>
.dashboard-page { padding: 16px; min-height: 100vh; background: #f0f4f9; }

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 12px 12px 0 0;
  flex-wrap: wrap;
  gap: 12px;
}
.toolbar h2 { margin: 0; font-size: 18px; font-weight: 600; }
.toolbar-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.caliber-tip {
  background: #fff8e6; border: 1px solid #f5dfa8; border-left: 3px solid #e6a23c;
  border-radius: 6px; padding: 10px 14px; margin-bottom: 12px;
  font-size: 13px; color: #6b5b33; line-height: 1.75;
}
.caliber-tip b { color: #a1671a; }
.caliber-warn { color: #c0392b; font-weight: 600; }

.range-tip {
  padding: 10px 24px;
  background: #fff;
  border-bottom: 1px solid #e8ecf1;
  font-size: 13px;
  color: #666;
}
.range-tip strong { color: #409eff; }

/* 核心卡片 */
.core-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  background: #fff;
  padding: 20px 24px;
}
.core-card {
  border-radius: 12px;
  padding: 20px 22px;
  color: #fff;
  min-height: 120px;
}
.income-card { background: linear-gradient(135deg, #409eff, #66b1ff); }
.expense-card { background: linear-gradient(135deg, #f56c6c, #f78989); }
.profit-card { background: linear-gradient(135deg, #67c23a, #85ce61); }
.profit-card.profit-neg { background: linear-gradient(135deg, #909399, #a8abb2); }
.card-label { font-size: 14px; opacity: 0.9; }
.card-value { font-size: 30px; font-weight: 700; margin: 10px 0 6px; }
.card-sub { font-size: 12px; opacity: 0.85; }

/* 明细面板 */
.detail-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  background: #fff;
  padding: 0 24px 20px;
}
.panel {
  background: #fff;
  padding: 16px 24px;
  border-radius: 0;
}
.detail-row .panel { border: 1px solid #eef1f6; border-radius: 10px; }
.panel-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; color: #303133; }

.breakdown { display: flex; flex-direction: column; gap: 10px; }
.bd-item { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.bd-label { color: #606266; }
.bd-val { font-weight: 600; }
.bd-val.income { color: #409eff; }
.bd-val.expense { color: #f56c6c; }
.bd-val.muted { color: #c0c4cc; }
.bd-item.muted-row .bd-label { color: #c0c4cc; }
.bd-item.total-row {
  border-top: 1px dashed #e4e8ee;
  padding-top: 10px;
  font-weight: 600;
}
.bd-item.total-row .bd-label { color: #303133; }

/* 趋势图 */
.trend-chart { padding: 10px 0; }
.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 200px;
  padding: 10px 8px 0;
  overflow-x: auto;
}
.trend-bar-group {
  flex: 1;
  min-width: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}
.bar-stack {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 140px;
}
.bar { width: 16px; border-radius: 4px 4px 0 0; transition: height 0.3s; }
.income-bar { background: #409eff; }
.expense-bar { background: #f56c6c; }
.bar-label { font-size: 11px; color: #909399; margin-top: 6px; }
.bar-profit { font-size: 11px; margin-top: 2px; }
.bar-profit.income { color: #67c23a; }
.bar-profit.expense { color: #f56c6c; }

.trend-legend {
  display: flex;
  gap: 20px;
  padding: 10px 8px;
  font-size: 12px;
  color: #606266;
}
.lg-item { display: inline-flex; align-items: center; gap: 6px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
.income-dot { background: #409eff; }
.expense-dot { background: #f56c6c; }
.profit-dot { background: #67c23a; }

@media (max-width: 768px) {
  .core-cards { grid-template-columns: 1fr; }
  .detail-row { grid-template-columns: 1fr; }
}
</style>
