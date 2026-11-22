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
          <el-radio-button value="today">今天</el-radio-button>
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

    <!-- 收入分项占比已移除（2026-11-20）：占比信息在「收入构成」里已有金额，单独占一块太占地方 -->

    <!-- 月度趋势（已移到底部与支出饼图并排） -->

    <!-- ⭐ LR 汇总（2026-11-15 从「LR 表管理」页迁过来）
         左：进销存（本范围内）／右：累计 KPI + 按成色（上单 / 本单 / 累计） -->
    <div class="lr-wrap" v-loading="lrLoading">
      <div class="lr-wrap-h">
        <span class="t">LR 汇总</span>
        <span class="s">
          数据源：LR 表（账单最终确认时生成）+ 进销存单据 ·
          「本单」= {{ rangeLabel }} · 「累计」= 全公司历史，不受范围影响
        </span>
      </div>
      <LrSummaryPanels :sheet="lrSheet" :range-label="rangeLabel" :day-book="dayBook" />
    </div>

    <!-- ⭐ 页面最底部一排：左 支出分类饼图（紧凑，不再用表格占地方）／右 近12个月经营趋势 -->
    <div class="bottom-row">
      <div class="panel chart-panel">
        <div class="panel-title">
          支出分类
          <span class="panel-sub" v-if="expensePieTotal > 0">合计 ¥{{ fmtMoney(expensePieTotal) }}</span>
        </div>
        <div class="pie-box" v-loading="loading">
          <div ref="pieRef" class="pie-canvas"></div>
          <div v-if="!expensePieTotal && !loading" class="pie-empty">本期没有支出</div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          近12个月经营趋势
          <span class="panel-sub">柱：收入 / 支出 · 柱下数字：当月盈亏</span>
        </div>
        <div class="trend-chart" v-loading="loading">
          <div class="trend-bars">
            <div class="trend-bar-group" v-for="t in data.trend" :key="t.month">
              <div class="bar-stack">
                <div class="bar income-bar" :style="{ height: barHeight(t.income) }" :title="incomeTip(t)"></div>
                <div class="bar expense-bar" :style="{ height: barHeight(t.expense) }" :title="expenseTip(t)"></div>
              </div>
              <div class="bar-label">{{ shortMonth(t.month) }}</div>
              <div class="bar-profit" :class="t.profit >= 0 ? 'income' : 'expense'">
                <template v-if="Math.abs(Number(t.profit || 0)) >= 1">{{ t.profit >= 0 ? '+' : '' }}{{ fmtMoneyShort(t.profit) }}</template>
              </div>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { getOperatingDashboardSummary } from '@/api/operating-dashboard';
import { getLrSheet } from '@/api/lr';
import LrSummaryPanels from '@/components/LrSummaryPanels.vue';

const route = useRoute();
const router = useRouter();

const month = ref(route.query.month || new Date().toISOString().slice(0, 7));
const rangeType = ref(['today', 'all'].includes(route.query.rangeType) ? route.query.rangeType : 'month');
const loading = ref(false);
// LR 汇总（进销存 + 累计 / 按成色）
const lrSheet = ref(null);
const lrLoading = ref(false);
// ⭐ 2026-11-20 日结：上单（本月1号~昨天）/ 本单（今天）/ 累计（本月至今）
const dayBook = ref(null);

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

const rangeLabel = computed(() => {
  if (rangeType.value === 'all') return '全部';
  if (rangeType.value === 'today') return '今天';
  return month.value || '';
});

const expenseRatio = computed(() => {
  if (!data.income) return '—';
  return (data.expense / data.income).toFixed(2) + ' 倍';
});

// ⭐ 支出分类饼图（2026-11-20）：原来是一张「费用支出分类明细」表格，占地方
//    口径 = 金入库 + 钻石入库 + 各费用类别，合计与顶部「总支出」一致
const PIE_COLORS = ['#c9a227', '#7a5af8', '#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#36cfc9', '#909399'];
const pieRef = ref(null);
let pieChart = null;

const expensePieData = computed(() => {
  const list = [];
  const goldIn = Number(data.expenseDetail?.goldIn || 0);
  const diaIn = Number(data.expenseDetail?.diamondIn || 0);
  if (goldIn > 0) list.push({ name: '金入库', value: goldIn });
  if (diaIn > 0) list.push({ name: '钻石入库', value: diaIn });

  const cats = (data.expenseByCategory || [])
    .map(c => ({ name: (c.category || '未分类').trim(), value: Number(c.amount || 0) }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);

  // 费用类别过多时，尾部合并成「其他费用」，避免饼图碎片化
  if (cats.length > 6) {
    const tail = cats.slice(5);
    list.push(...cats.slice(0, 5));
    list.push({ name: `其他费用（${tail.length} 类）`, value: tail.reduce((s, x) => s + x.value, 0) });
  } else {
    list.push(...cats);
  }
  return list;
});
const expensePieTotal = computed(() => expensePieData.value.reduce((s, x) => s + x.value, 0));

const renderPie = () => {
  if (!pieRef.value) return;
  const items = expensePieData.value;
  if (!items.length) {
    if (pieChart) { pieChart.clear(); }
    return;
  }
  if (!pieChart) pieChart = echarts.init(pieRef.value);
  pieChart.setOption({
    color: PIE_COLORS,
    tooltip: {
      trigger: 'item',
      formatter: (p) => `${p.name}<br/>¥${fmtMoney(p.value)}　${p.percent}%`
    },
    legend: {
      // 图例竖排在右，带金额，一眼看清每类多少钱
      type: 'scroll',
      orient: 'vertical',
      right: 4,
      top: 'middle',
      itemWidth: 9,
      itemHeight: 9,
      itemGap: 8,
      textStyle: { fontSize: 11, color: '#606266' },
      formatter: (name) => {
        const it = items.find(x => x.name === name);
        if (!it) return name;
        const p = expensePieTotal.value > 0 ? (it.value / expensePieTotal.value) * 100 : 0;
        return `${name} ${p >= 10 ? p.toFixed(0) : p.toFixed(1)}%`;
      }
    },
    series: [{
      type: 'pie',
      radius: ['44%', '76%'],
      center: ['30%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      labelLine: { show: false },
      emphasis: { scale: true, scaleSize: 4, label: { show: false } },
      data: items
    }]
  }, true);
  pieChart.resize();
};

const onPieResize = () => pieChart && pieChart.resize();

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
    const ym = rangeType.value === 'all' ? 'all' : (rangeType.value === 'today' ? 'today' : month.value);
    const res = await getOperatingDashboardSummary(ym);
    // 响应拦截器已解包一层（return response.data），故业务数据在 res.data
    const d = res?.data || {};
    dayBook.value = res?.dayBook || null;
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
  // ⭐ 底部饼图依赖 data.expenseByCategory / expenseDetail，等 DOM 更新后再画
  await nextTick();
  renderPie();
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
    } else if (rangeType.value === 'today') {
      // 「今天」= 当天单日，按成色的「本单」就只统计今天
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const d = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      params = { ...params, dateType: 'custom', startDate: d, endDate: d };
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

onMounted(() => {
  loadData();
  window.addEventListener('resize', onPieResize);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', onPieResize);
  if (pieChart) { pieChart.dispose(); pieChart = null; }
});
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

/* ⭐ 底部一排：左 支出饼图（固定窄栏，不占地方）／右 12 个月趋势 */
.bottom-row {
  display: grid;
  grid-template-columns: minmax(300px, 0.72fr) 1.28fr;
  gap: 16px;
  background: #fff;
  padding: 16px 24px 20px;
  border-top: 1px solid #eef1f6;
}
.bottom-row .panel { border: 1px solid #eef1f6; border-radius: 10px; padding: 14px 18px; }
.panel-title { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.panel-sub { font-size: 11px; font-weight: 400; color: #909399; }

/* 支出分类饼图 */
.pie-box { position: relative; height: 190px; }
.pie-canvas { width: 100%; height: 100%; }
.pie-empty {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; color: #c0c4cc;
}

/* 趋势图 */
.trend-chart { padding: 4px 0 0; }
.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  height: 158px;
  padding: 6px 4px 0;
  overflow-x: auto;
}
.trend-bar-group {
  flex: 1;
  min-width: 44px;
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
  height: 104px;
}
.bar { width: 14px; border-radius: 4px 4px 0 0; transition: height 0.3s; }
.income-bar { background: #409eff; }
.expense-bar { background: #f56c6c; }
.bar-label { font-size: 11px; color: #909399; margin-top: 6px; }
.bar-profit { font-size: 10px; line-height: 14px; min-height: 14px; margin-top: 2px; white-space: nowrap; }
.bar-profit.income { color: #67c23a; }
.bar-profit.expense { color: #f56c6c; }

.trend-legend {
  display: flex;
  gap: 20px;
  padding: 6px 4px 0;
  font-size: 12px;
  color: #606266;
}
.lg-item { display: inline-flex; align-items: center; gap: 6px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
.income-dot { background: #409eff; }
.expense-dot { background: #f56c6c; }
.profit-dot { background: #67c23a; }

@media (max-width: 1100px) {
  .bottom-row { grid-template-columns: 1fr; }
  .pie-box { height: 210px; }
}
@media (max-width: 768px) {
  .core-cards { grid-template-columns: 1fr; }
  .detail-row { grid-template-columns: 1fr; }
}
</style>
