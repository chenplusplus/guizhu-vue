<!-- src/views/system/gold-price-history.vue
     历史金价库：每日金价走势（四个角色都能看，只读）
     数据口径：只统计「已审核生效」的金价单；同一天多次改价取最新版本；
              没有金价单的日期按上一个生效价沿用，图上不画点（hover 会说明沿用自哪天）
-->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📈 历史金价库</h2>
      <div class="header-actions">
        <el-button size="small" :loading="loading" @click="load">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button size="small" :disabled="!items.length" @click="exportCsv">导出 CSV</el-button>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <el-radio-group v-model="quick" size="small" @change="onQuick">
        <el-radio-button value="7">近 7 天</el-radio-button>
        <el-radio-button value="30">近 30 天</el-radio-button>
        <el-radio-button value="90">近 90 天</el-radio-button>
        <el-radio-button value="year">今年</el-radio-button>
        <el-radio-button value="all">全部</el-radio-button>
      </el-radio-group>
      <el-date-picker
        v-model="range"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        size="small"
        style="width: 240px"
        @change="onRangeChange"
      />
      <span class="range-hint">
        <template v-if="quick === 'all'">
          <template v-if="firstDate">全部历史（最早 {{ firstDate }}）</template>
          <template v-else>全部历史</template>
        </template>
        <template v-else-if="start && end">{{ start }} ~ {{ end }} · 共 {{ spanDays }} 天</template>
      </span>
    </div>

    <!-- 统计卡 -->
    <el-row :gutter="12" class="stat-row" v-loading="loading">
      <el-col :span="5">
        <div class="stat-card" style="border-left: 4px solid #E6A23C">
          <div class="stat-label">最新金价</div>
          <div class="stat-value gold">{{ fmt(gold.latest) }}<span class="unit">元/克</span></div>
          <div class="stat-sub">{{ gold.latestDate || '—' }}</div>
        </div>
      </el-col>
      <el-col :span="5">
        <div class="stat-card" :style="`border-left: 4px solid ${changeColor(gold.change)}`">
          <div class="stat-label">较上一个报价日</div>
          <div class="stat-value" :style="`color:${changeColor(gold.change)}`">
            {{ signed(gold.change) }}<span class="unit">{{ gold.changePct == null ? '' : `（${signed(gold.changePct)}%）` }}</span>
          </div>
          <div class="stat-sub">上一报价 {{ fmt(gold.previous) }} 元/克</div>
        </div>
      </el-col>
      <el-col :span="5">
        <div class="stat-card" style="border-left: 4px solid #F56C6C">
          <div class="stat-label">区间最高</div>
          <div class="stat-value">{{ fmt(gold.high) }}<span class="unit">元/克</span></div>
          <div class="stat-sub">{{ gold.highDate || '—' }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card" style="border-left: 4px solid #67C23A">
          <div class="stat-label">区间最低</div>
          <div class="stat-value">{{ fmt(gold.low) }}<span class="unit">元/克</span></div>
          <div class="stat-sub">{{ gold.lowDate || '—' }}</div>
        </div>
      </el-col>
      <el-col :span="5">
        <div class="stat-card" style="border-left: 4px solid #409EFF">
          <div class="stat-label">区间均价</div>
          <div class="stat-value">{{ fmt(gold.average) }}<span class="unit">元/克</span></div>
          <div class="stat-sub">有报价 {{ gold.days }} 天 · 银 {{ fmt(silver.average) }} / PT {{ fmt(pt.average) }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 走势图 -->
    <el-card shadow="never" class="chart-card">
      <template #header>
        <div class="card-head">
          <span class="card-title">每日金价走势</span>
          <span class="card-meta">左轴：金价 / PT（元/克）· 右轴：银价（元/克）· 实心点 = 当天有生效金价，空白日沿用上一个生效价</span>
        </div>
      </template>
      <div v-show="items.length" ref="chartRef" class="chart"></div>
      <el-empty v-if="!loading && !items.length" description="所选区间还没有已生效的金价" :image-size="90" />
    </el-card>

    <!-- 明细 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-head">
          <span class="card-title">每日金价明细</span>
          <span class="card-meta">共 {{ items.length }} 天有生效金价（按日期倒序）</span>
        </div>
      </template>
      <el-table :data="tableRows" size="small" border stripe max-height="460" v-loading="loading" empty-text="暂无数据">
        <el-table-column prop="priceDate" label="日期" width="112" align="center" />
        <el-table-column label="金价" width="110" align="right">
          <template #default="{ row }"><b class="gold-text">{{ fmt(row.goldPrice) }}</b></template>
        </el-table-column>
        <el-table-column label="银价" width="100" align="right">
          <template #default="{ row }">{{ fmt(row.silverPrice) }}</template>
        </el-table-column>
        <el-table-column label="PT 价" width="100" align="right">
          <template #default="{ row }">{{ fmt(row.ptPrice) }}</template>
        </el-table-column>
        <el-table-column label="金价日涨跌" width="130" align="right">
          <template #default="{ row }">
            <span v-if="row.change == null" class="muted">—</span>
            <span v-else :style="`color:${changeColor(row.change)}`">{{ signed(row.change) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="版本" width="80" align="center">
          <template #default="{ row }">v{{ row.version }}</template>
        </el-table-column>
        <el-table-column prop="approvedAtText" label="生效时间" min-width="150" align="center" />
        <el-table-column label="备注" min-width="120">
          <template #default="{ row }">
            <span v-if="row.version > 1" class="muted">当日改价，取最新第 {{ row.version }} 版</span>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <div class="foot-note">
      口径：只统计<b>已审核生效</b>的金价单；同一天多次改价取最新版本；没有金价单的日期不产生数据点，走势按上一个生效价沿用。
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { getPriceHistory } from '@/api/priceSheet';

const loading = ref(false);
const quick = ref('30');
const range = ref(null);
const start = ref('');
const end = ref('');
const firstDate = ref('');

const items = ref([]);
const series = ref([]);
const gold = reactive({ latest: null, latestDate: '', previous: null, change: null, changePct: null, high: null, highDate: '', low: null, lowDate: '', average: null, days: 0 });
const silver = reactive({ average: null });
const pt = reactive({ average: null });

const chartRef = ref(null);
let chart = null;

const fmt = (v) => (v == null || v === '' ? '—' : Number(v).toFixed(2));
const signed = (v) => {
  if (v == null) return '—';
  const n = Number(v);
  if (n > 0) return '+' + n.toFixed(2);
  if (n < 0) return n.toFixed(2);
  return '0.00';
};
// 涨红跌绿（国内习惯）
const changeColor = (v) => {
  if (v == null) return '#909399';
  const n = Number(v);
  if (n > 0) return '#e5484d';
  if (n < 0) return '#18a058';
  return '#909399';
};

const spanDays = computed(() => {
  if (!start.value || !end.value) return 0;
  const a = new Date(start.value + 'T00:00:00');
  const b = new Date(end.value + 'T00:00:00');
  return Math.round((b - a) / 86400000) + 1;
});

// 明细按日期倒序（最新在上），并算出与「上一有效日」的涨跌
const tableRows = computed(() => {
  const asc = [...items.value].sort((a, b) => String(a.priceDate).localeCompare(String(b.priceDate)));
  const rows = asc.map((it, i) => {
    const prev = i > 0 ? Number(asc[i - 1].goldPrice) : null;
    const cur = Number(it.goldPrice);
    return {
      ...it,
      change: prev == null ? null : +(cur - prev).toFixed(2),
      approvedAtText: fmtDateTime(it.approvedAt),
    };
  });
  return rows.reverse();
});

const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const fmtLocal = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const onQuick = (v) => {
  if (v === 'all') {
    range.value = null;
    load();
    return;
  }
  const today = new Date();
  let s;
  if (v === 'year') {
    s = `${today.getFullYear()}-01-01`;
  } else {
    const d = new Date(today);
    d.setDate(d.getDate() - (Number(v) - 1));
    s = fmtLocal(d);
  }
  range.value = [s, fmtLocal(today)];
  load();
};

const onRangeChange = (v) => {
  if (!v || v.length !== 2) {
    quick.value = 'all';
  } else {
    quick.value = '';
  }
  load();
};

const load = async () => {
  loading.value = true;
  try {
    const params = {};
    if (range.value && range.value.length === 2) {
      params.start = range.value[0];
      params.end = range.value[1];
    }
    const res = await getPriceHistory(params);
    const d = res?.data || {};
    // ⭐ 后端 DateTime 会带 T00:00:00，统一裁成 YYYY-MM-DD 再展示
    const d10 = (v) => (v ? String(v).slice(0, 10) : '');
    items.value = (d.items || []).map((x) => ({ ...x, priceDate: d10(x.priceDate) }));
    series.value = (d.series || []).map((x) => ({
      ...x,
      date: d10(x.date),
      sourceDate: d10(x.sourceDate),
    }));
    firstDate.value = d10(d.firstDate);
    start.value = d10(d.start);
    end.value = d10(d.end);
    Object.assign(gold, d.gold || {});
    gold.latestDate = d10(gold.latestDate);
    gold.highDate = d10(gold.highDate);
    gold.lowDate = d10(gold.lowDate);
    Object.assign(silver, d.silver || {});
    Object.assign(pt, d.pt || {});
    renderChart();
  } catch (e) {
    ElMessage.error(e?.message || '加载历史金价失败');
  } finally {
    loading.value = false;
  }
};

const renderChart = () => {
  nextTick(() => {
    if (!chartRef.value || !items.value.length) {
      if (chart) { chart.dispose(); chart = null; }
      return;
    }
    if (!chart) chart = echarts.init(chartRef.value);
    const labels = series.value.map((p) => String(p.date).slice(5));
    const mkSeries = (key, name, color, axisIndex = 0) => ({
      name,
      type: 'line',
      yAxisIndex: axisIndex,
      connectNulls: false,
      symbol: 'circle',
      lineStyle: { width: 2, color },
      itemStyle: { color },
      emphasis: { focus: 'series' },
      data: series.value.map((p) => ({
        value: p[key] == null ? null : Number(p[key]),
        symbolSize: p.carried ? 0 : 5,
        carried: p.carried,
        sourceDate: p.sourceDate,
      })),
    });

    chart.setOption({
      color: ['#E6A23C', '#909399', '#409EFF'],
      tooltip: {
        trigger: 'axis',
        formatter: (ps) => {
          const day = series.value[ps[0]?.dataIndex ?? 0] || {};
          const head = `${day.date || ''}${(day.carried && day.sourceDate) ? `（沿用 ${String(day.sourceDate).slice(0, 10)} 的价）` : ''}`;
          const rows = ps.map((p) => `${p.marker}${p.seriesName}：<b>${p.value == null ? '—' : Number(p.value).toFixed(2)}</b>`);
          return `<div style="font-size:12px">${head}<br/>${rows.join('<br/>')}</div>`;
        },
      },
      legend: { top: 0, right: 8, itemWidth: 14, textStyle: { fontSize: 12 } },
      grid: { left: 10, right: 46, top: 36, bottom: 10, containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisLabel: { fontSize: 11, color: '#909399', hideOverlap: true },
        axisLine: { lineStyle: { color: '#dcdfe6' } },
      },
      // ⭐ 金价/PT 与银价不是一个量级，用双 Y 轴，否则银价把金价压成一条平线
      yAxis: [
        {
          type: 'value',
          scale: true,
          axisLabel: { fontSize: 11, color: '#909399' },
          splitLine: { lineStyle: { color: '#f0f2f5' } },
        },
        {
          type: 'value',
          scale: true,
          position: 'right',
          axisLabel: { fontSize: 11, color: '#909399' },
          splitLine: { show: false },
        },
      ],
      dataZoom: series.value.length > 60
        ? [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 6 }]
        : [],
      series: [
        mkSeries('gold', '金价', '#E6A23C', 0),
        mkSeries('silver', '银价', '#909399', 1),
        mkSeries('pt', 'PT 价', '#409EFF', 0),
      ],
    }, true);
  });
};

const exportCsv = () => {
  const head = ['日期', '金价(元/克)', '银价(元/克)', 'PT价(元/克)', '金价涨跌', '版本', '生效时间'];
  const lines = tableRows.value.map((r) => [
    r.priceDate,
    Number(r.goldPrice).toFixed(2),
    Number(r.silverPrice).toFixed(2),
    Number(r.ptPrice).toFixed(2),
    r.change == null ? '' : r.change.toFixed(2),
    'v' + r.version,
    r.approvedAtText,
  ].join(','));
  const csv = '\uFEFF' + [head.join(','), ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `历史金价_${start.value || '全部'}_${end.value || ''}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const onResize = () => chart && chart.resize();

onMounted(() => {
  onQuick('30');
  window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
  if (chart) { chart.dispose(); chart = null; }
});
</script>

<style scoped>
/* 全局样式里没有 page-header / page-container，按本页需要补齐（与其它页面一致） */
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.page-header h2 { margin: 0; font-size: 16px; }
.header-actions { display: flex; gap: 8px; align-items: center; }

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
/* Element Plus 的 el-input__wrapper 默认 flex-grow:1，会把日期控件撑满整行 */
.filter-bar :deep(.el-date-editor.el-range-editor) { flex: 0 0 240px; width: 240px; }
.range-hint { font-size: 12px; color: #909399; }
.stat-row { margin-bottom: 14px; }
.stat-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px 14px;
  height: 100%;
}
.stat-label { font-size: 12px; color: #909399; }
.stat-value { font-size: 22px; font-weight: 700; color: #303133; margin-top: 4px; line-height: 1.2; }
.stat-value.gold { color: #d48806; }
.stat-value .unit { font-size: 12px; font-weight: 400; color: #909399; margin-left: 2px; }
.stat-sub { font-size: 12px; color: #a8abb2; margin-top: 6px; }
.chart-card { margin-bottom: 14px; }
.chart { width: 100%; height: 340px; }
.card-head { display: flex; align-items: baseline; gap: 10px; }
.card-title { font-size: 14px; font-weight: 600; color: #303133; }
.card-meta { font-size: 12px; color: #909399; }
.gold-text { color: #d48806; }
.muted { color: #a8abb2; }
.foot-note { margin-top: 10px; font-size: 12px; color: #909399; }
</style>
