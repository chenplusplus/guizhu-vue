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
      <b>本页为「资金口径」</b>：收入 = 账单应收（已减抵扣）＋ 金出库 ＋ 钻石出库 ＋ 费用收入；支出 = 金入库 ＋ 钻石入库 ＋ 费用支出。
      <br>
      进销存方向：<b>入库＝付钱（支出）</b>，<b>出库＝收钱（收入）</b>。抵扣款已在「金出／钻出」计过收入，账单侧不再重复计，所以账单收入是「应收 − 抵扣」。
      <br>
      <span class="caliber-warn">它不等于经营净利</span>：经营净利 = 销售额 − 进销存费用，请看「月度经营报表」。
    </div>

    <!-- 盈亏核心卡片 -->
    <div class="core-cards" v-loading="loading">
      <div class="core-card income-card">
        <div class="card-label">总收入</div>
        <div class="card-value">¥{{ fmtMoney(data.income) }}</div>
        <div class="card-sub">账单 {{ fmtMoney(data.incomeDetail?.billAmount) }} · 金 {{ fmtMoney(data.incomeDetail?.goldOut) }} · 钻 {{ fmtMoney(data.incomeDetail?.diamondOut) }} · 费用 {{ fmtMoney(data.incomeDetail?.feeIn) }}</div>
      </div>
      <div class="core-card expense-card">
        <div class="card-label">总支出</div>
        <div class="card-value">¥{{ fmtMoney(data.expense) }}</div>
        <div class="card-sub">金 {{ fmtMoney(data.expenseDetail?.goldIn) }} · 钻 {{ fmtMoney(data.expenseDetail?.diamondIn) }} · 费用 {{ fmtMoney(data.expenseDetail?.expenseOut) }}</div>
      </div>
      <div class="core-card profit-card" :class="data.profit >= 0 ? 'profit-pos' : 'profit-neg'">
        <div class="card-label">资金净额（{{ data.profit >= 0 ? '净流入' : '净流出' }}）</div>
        <div class="card-value">{{ data.profit >= 0 ? '¥' : '-¥' }}{{ fmtMoney(Math.abs(data.profit)) }}</div>
        <div class="card-sub">收入 − 支出 · 支出/收入 = {{ expenseRatio }}</div>
      </div>
    </div>

    <!-- 收入/支出明细 + 分类 -->
    <div class="detail-row">
      <!-- 收入构成 -->
      <div class="panel">
        <div class="panel-title">收入构成（4 项）</div>
        <div class="breakdown">
          <div class="bd-item">
            <span class="bd-label">
              ① 账单收入
              <em class="bd-hint">应收 ¥{{ fmtMoney(data.incomeDetail?.billGross) }} − 抵扣 ¥{{ fmtMoney(data.incomeDetail?.billOffset) }}</em>
            </span>
            <span class="bd-val income">¥{{ fmtMoney(data.incomeDetail?.billAmount) }}</span>
          </div>
          <div class="bd-item">
            <span class="bd-label">② 金出库（金料录出）</span>
            <span class="bd-val income">¥{{ fmtMoney(data.incomeDetail?.goldOut) }}</span>
          </div>
          <div class="bd-item">
            <span class="bd-label">③ 钻石出库（钻石录出）</span>
            <span class="bd-val income">¥{{ fmtMoney(data.incomeDetail?.diamondOut) }}</span>
          </div>
          <div class="bd-item">
            <span class="bd-label">④ 费用收入（费用入）</span>
            <span class="bd-val income">¥{{ fmtMoney(data.incomeDetail?.feeIn) }}</span>
          </div>
          <div class="bd-item total-row">
            <span class="bd-label">收入合计</span>
            <span class="bd-val income">¥{{ fmtMoney(data.income) }}</span>
          </div>
        </div>
      </div>

      <!-- 支出构成 -->
      <div class="panel">
        <div class="panel-title">支出构成（3 项）</div>
        <div class="breakdown">
          <div class="bd-item">
            <span class="bd-label">① 金入库（采购付钱）</span>
            <span class="bd-val expense">¥{{ fmtMoney(data.expenseDetail?.goldIn) }}</span>
          </div>
          <div class="bd-item">
            <span class="bd-label">② 钻石入库（采购付钱）</span>
            <span class="bd-val expense">¥{{ fmtMoney(data.expenseDetail?.diamondIn) }}</span>
          </div>
          <div class="bd-item">
            <span class="bd-label">③ 费用支出（费用出）</span>
            <span class="bd-val expense">¥{{ fmtMoney(data.expenseDetail?.expenseOut) }}</span>
          </div>
          <div class="bd-item total-row">
            <span class="bd-label">支出合计</span>
            <span class="bd-val expense">¥{{ fmtMoney(data.expense) }}</span>
          </div>
          <div class="bd-item total-row net-row">
            <span class="bd-label">净额（收入 − 支出）</span>
            <span class="bd-val" :class="data.profit >= 0 ? 'income' : 'expense'">
              {{ data.profit >= 0 ? '' : '-' }}¥{{ fmtMoney(Math.abs(data.profit || 0)) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 收入分项占比（按 4 项） -->
    <div class="panel" v-if="data.income">
      <div class="panel-title">收入分项占比</div>
      <div class="share-bars">
        <div class="share-item" v-for="it in incomeShare" :key="it.label">
          <div class="share-head">
            <span class="share-label">{{ it.label }}</span>
            <span class="share-val">¥{{ fmtMoney(it.value) }}<em>（{{ it.pct }}%）</em></span>
          </div>
          <el-progress :percentage="it.pct" :color="it.color" :stroke-width="12" :show-text="false" />
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
              <div class="bar income-bar" :style="{ height: barHeight(t.income) }" :title="incomeTip(t)"></div>
              <div class="bar expense-bar" :style="{ height: barHeight(t.expense) }" :title="expenseTip(t)"></div>
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

    <!-- ⭐ LR 汇总（2026-11-15 从「LR 表管理」页迁过来）
         左：进销存（本范围内）／右：累计 KPI + 按成色（上单 / 本单 / 累计） -->
    <div class="lr-wrap" v-loading="lrLoading">
      <div class="lr-wrap-h">
        <span class="t">LR 汇总</span>
        <span class="s">
          来自 LR 表（订单制作审核通过时生成）与进销存单据 ·
          「本单」= {{ rangeLabel }} · 「累计」为全公司历史，不受范围影响
        </span>
      </div>
      <LrSummaryPanels :sheet="lrSheet" :range-label="rangeLabel" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { getOperatingDashboardSummary } from '@/api/operating-dashboard';
import { getLrSheet } from '@/api/lr';
import LrSummaryPanels from '@/components/LrSummaryPanels.vue';

const route = useRoute();
const router = useRouter();

const month = ref(route.query.month || new Date().toISOString().slice(0, 7));
const rangeType = ref(route.query.rangeType === 'all' ? 'all' : 'month');
const loading = ref(false);
// LR 汇总（进销存 + 累计 / 按成色）
const lrSheet = ref(null);
const lrLoading = ref(false);

const data = reactive({
  income: 0,
  expense: 0,
  profit: 0,
  incomeDetail: { billAmount: 0, billGross: 0, billOffset: 0, billCount: 0, goldOut: 0, diamondOut: 0, feeIn: 0 },
  expenseDetail: { goldIn: 0, diamondIn: 0, expenseOut: 0 },
  expenseByCategory: [],
  incomeByCategory: [],
  trend: []
});

const rangeLabel = computed(() => rangeType.value === 'all' ? '全部' : (month.value || ''));

const expenseRatio = computed(() => {
  if (!data.income) return '—';
  return (data.expense / data.income).toFixed(2) + ' 倍';
});

// 收入分项占比：账单 / 金 / 钻 / 费用（最大余数法，保证合计 100%）
const incomeShare = computed(() => {
  const total = Number(data.income || 0);
  const items = [
    { label: '账单收入', value: Number(data.incomeDetail?.billAmount || 0), color: '#409eff' },
    { label: '金出库', value: Number(data.incomeDetail?.goldOut || 0), color: '#e6a23c' },
    { label: '钻石出库', value: Number(data.incomeDetail?.diamondOut || 0), color: '#7a5af8' },
    { label: '费用收入', value: Number(data.incomeDetail?.feeIn || 0), color: '#67c23a' }
  ];
  if (!total) return items.map(it => ({ ...it, pct: 0 }));

  const raw = items.map(it => (it.value / total) * 100);
  const floor = raw.map(v => Math.floor(v));
  let rest = 100 - floor.reduce((a, b) => a + b, 0);
  // 余数大的先补
  raw.map((v, i) => ({ i, r: v - Math.floor(v) }))
     .sort((a, b) => b.r - a.r)
     .forEach(o => { if (rest > 0) { floor[o.i] += 1; rest -= 1; } });

  // 有金额但不足 1% 的项显示 1%，从占比最大的项匀回来，保证合计仍为 100%
  for (let i = 0; i < items.length; i++) {
    if (items[i].value > 0 && floor[i] === 0) {
      const maxIdx = floor.indexOf(Math.max(...floor));
      if (maxIdx !== i && floor[maxIdx] > 1) { floor[maxIdx] -= 1; floor[i] = 1; }
    }
  }

  return items.map((it, i) => ({ ...it, pct: floor[i] }));
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

const incomeTip = (t) =>
  `收入 ¥${fmtMoney(t.income)}\n账单 ¥${fmtMoney(t.billAmount)} / 金出 ¥${fmtMoney(t.goldOut)} / 钻出 ¥${fmtMoney(t.diamondOut)} / 费用入 ¥${fmtMoney(t.feeIn)}`;

const expenseTip = (t) =>
  `支出 ¥${fmtMoney(t.expense)}\n金入 ¥${fmtMoney(t.goldIn)} / 钻入 ¥${fmtMoney(t.diamondIn)} / 费用出 ¥${fmtMoney(t.feeOut)}`;

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
    data.incomeByCategory = d.incomeByCategory || [];
    data.trend = d.trend || [];
  } catch (e) {
    ElMessage.error('加载失败：' + (e.message || ''));
  } finally {
    loading.value = false;
  }
  loadLrSummary();
};

// ⭐ LR 汇总（进销存 + 累计 / 按成色）：复用 /lr/sheet 汇总段，summaryOnly=1 不取明细
//    ⚠️ 后端 dateType=month 指「系统当前月」，这里要看**选中月**，所以用 custom + 首末日
const monthRange = (ym) => {
  const [y, m] = String(ym || '').split('-').map(Number);
  if (!y || !m) return null;
  const last = new Date(y, m, 0).getDate();          // m 月最后一天（自动进位）
  const pad = (n) => String(n).padStart(2, '0');
  return { startDate: `${y}-${pad(m)}-01`, endDate: `${y}-${pad(m)}-${pad(last)}` };
};

const loadLrSummary = async () => {
  lrLoading.value = true;
  try {
    let params = { summaryOnly: 1 };
    if (rangeType.value === 'all') {
      params.dateType = 'all';
    } else {
      const r = monthRange(month.value);
      if (!r) { lrSheet.value = null; return; }
      params = { ...params, dateType: 'custom', ...r };
    }
    const res = await getLrSheet(params);
    lrSheet.value = res?.data || null;
  } catch (e) {
    lrSheet.value = null;
  } finally {
    lrLoading.value = false;
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

/* ⭐ LR 汇总（从 LR 表管理页迁来）：外框 + 标题条，里面是 LrSummaryPanels 的两块 */
.lr-wrap {
  background: #fff;
  padding: 16px 24px 20px;
  border-top: 1px solid #eef1f6;
}
.lr-wrap-h {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.lr-wrap-h .t { font-size: 15px; font-weight: 600; color: #303133; }
.lr-wrap-h .s { font-size: 12px; color: #909399; }

.breakdown { display: flex; flex-direction: column; gap: 10px; }
.bd-item { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.bd-label { color: #606266; }
.bd-val { font-weight: 600; }
.bd-val.income { color: #409eff; }
.bd-val.expense { color: #f56c6c; }
.bd-val.muted { color: #c0c4cc; }
.bd-item.muted-row .bd-label { color: #c0c4cc; }
.bd-hint {
  display: inline-block; margin-left: 6px; font-style: normal;
  font-size: 11px; color: #a8abb2;
}
.bd-item.total-row {
  border-top: 1px dashed #e4e8ee;
  padding-top: 10px;
  font-weight: 600;
}
.bd-item.total-row .bd-label { color: #303133; }
.bd-item.net-row { margin-top: 2px; border-top: 1px solid #eef1f6; }

/* 收入分项占比 */
.share-bars { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 28px; }
.share-head { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
.share-label { color: #606266; }
.share-val { font-weight: 600; color: #303133; }
.share-val em { font-style: normal; font-weight: 400; color: #909399; margin-left: 4px; }

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
