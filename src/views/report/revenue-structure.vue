<!-- src/views/report/revenue-structure.vue
     收入结构统计（2026-11-11 改口径）
     —— 回答三个问题：「工费 VS 日常开销」「镶石工费 VS 师傅开销」「钻石赚了多少」

     口径（详见 docs/收入结构统计.md）：
       加工收入（= 老板说的"工费"）= 工费 + 版费 + 杂费（包装/证书/邮费）
       镶石工费 = Σ 粒数 × 镶石工费单价（已含在主副石金额里，单独拆出来看）
       纯钻石   = 主副石金额 − 镶石工费
       退货按行扣减：全退全扣；留工费/留工费+损耗 只扣金料+钻石料（工费继续算收入）
       日常开支 = 费用表全部支出 − 生产外包（倒模/工费/磨石/滴胶电金）
-->
<template>
  <div class="page-container revenue-page">
    <div class="page-header">
      <h2>💰 收入结构</h2>
      <div class="header-actions">
        <el-button size="small" :loading="loading" @click="loadAll">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button size="small" :disabled="!rows.length" @click="exportCsv">导出 CSV</el-button>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <el-radio-group v-model="quick" size="small" @change="onQuick">
        <el-radio-button value="month">本月</el-radio-button>
        <el-radio-button value="last">上月</el-radio-button>
        <el-radio-button value="quarter">近三个月</el-radio-button>
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
        style="width: 250px"
        @change="onRangeChange"
      />
      <span class="range-hint">统计区间：<b>{{ summary.rangeLabel || '—' }}</b></span>
    </div>

    <!-- 口径提示 -->
    <div class="caliber-tip">
      只统计<b>已确认账单</b>（业务员确认后），按<b>账单日期</b>归月。加工收入 = 工费 + 版费 + 包装/证书/邮费。
      镶石工费按<b>粒数 × 单价</b>算，它本来就含在主副石金额里，这里单独拆出来，所以「纯钻石」= 石金额 − 镶石工费。
      退货按明细行扣减：<b>全退</b>整行不算；<b>留工费 / 留工费+损耗</b> 只扣金料和钻石料，工费、版费、杂费、镶石工费照样算收入。
    </div>

    <!-- 主卡：主数字都是「扣完退货的净额」，灰色小字写总数和扣减 -->
    <div class="kpi-row" v-loading="loading">
      <div class="kpi-card c-process">
        <div class="k-label">加工收入 <em>工费 + 版费 + 杂费</em></div>
        <div class="k-value">¥{{ fmt(summary.processIncome) }}</div>
        <div class="k-sub">
          工费 {{ fmt(summary.laborFee) }} · 版费 {{ fmt(summary.moldFee) }} · 杂费 {{ fmt(summary.miscFee) }}
        </div>
        <div class="k-sub gray">
          总数 {{ fmt(summary.processIncomeGross) }} ·
          <template v-if="summary.processReturned > 0">
            退货扣减 <b class="ded">−{{ fmt(summary.processReturned) }}</b> · 净 {{ fmt(summary.processIncome) }}
          </template>
          <template v-else>无退货扣减</template>
        </div>
      </div>

      <div class="kpi-card c-setting">
        <div class="k-label">镶石工费 <em>向客户收的，粒数 × 单价</em></div>
        <div class="k-value">¥{{ fmt(summary.settingFee) }}</div>
        <div class="k-sub">
          主石 {{ fmt(summary.mainSettingFee) }} · 副石 {{ fmt(summary.subSettingFee) }}（粒数 × 单价）
        </div>
        <div class="k-sub gray">
          总数 {{ fmt(summary.settingFeeGross) }} ·
          <template v-if="summary.settingReturned > 0">
            退货扣减 <b class="ded">−{{ fmt(summary.settingReturned) }}</b> · 净 {{ fmt(summary.settingFee) }}
          </template>
          <template v-else>无退货扣减</template>
        </div>
      </div>

      <div class="kpi-card c-diamond">
        <div class="k-label">纯钻石 <em>石金额 − 镶石工费</em></div>
        <div class="k-value">¥{{ fmt(summary.diamondMaterial) }}</div>
        <div class="k-sub">
          含镶石工费 {{ fmt(summary.settingFee) }}（已单列在左卡）· {{ summary.diamondQty || 0 }} 粒 / {{ fmtNum(summary.diamondCarat) }} ct
        </div>
        <div class="k-sub gray">
          总数 {{ fmt(summary.diamondMaterialGross) }} ·
          <template v-if="summary.diamondReturned > 0">
            退货扣减 <b class="ded">−{{ fmt(summary.diamondReturned) }}</b> · 净 {{ fmt(summary.diamondMaterial) }}
          </template>
          <template v-else>无退货扣减</template>
        </div>
      </div>

      <div class="kpi-card c-gold">
        <div class="k-label">足金料 <em>参考，不计入加工收入</em></div>
        <div class="k-value">¥{{ fmt(summary.goldMaterialFee) }}</div>
        <div class="k-sub">
          {{ summary.billCount || 0 }} 张账单 · {{ summary.lineCount || 0 }} 行 · 应收 {{ fmt(summary.billTotal) }}
        </div>
        <div class="k-sub gray">
          总数 {{ fmt(summary.goldMaterialGross) }} ·
          <template v-if="summary.goldMaterialReturned > 0">
            退货扣减 <b class="ded">−{{ fmt(summary.goldMaterialReturned) }}</b> · 净 {{ fmt(summary.goldMaterialFee) }}
          </template>
          <template v-else>无退货扣减</template>
        </div>
      </div>
    </div>

    <!-- 三项对比 -->
    <div class="compare-panel" v-loading="loading">
      <div class="panel-title">够不够花 / 够不够付师傅 / 钻石赚多少</div>
      <div class="cmp-head">
        <span class="c1">项目</span>
        <span class="c2">收入（扣完退货）</span>
        <span class="c3">对应支出</span>
        <span class="c4">差额</span>
      </div>
      <template v-for="c in compares" :key="c.key">
        <div class="cmp-row">
          <div class="c1">
            <b>{{ c.label }}</b>
            <em>{{ c.hint }}</em>
          </div>
          <div class="c2 in">¥{{ fmt(c.income) }}</div>
          <div class="c3 out">¥{{ fmt(c.cost) }}</div>
          <div class="c4" :class="c.diff >= 0 ? 'pos' : 'neg'">
            {{ c.diff >= 0 ? '+' : '−' }}¥{{ fmt(Math.abs(c.diff)) }}
            <span class="tag" :class="c.diff >= 0 ? 'tag-ok' : 'tag-bad'">
              {{ c.diff >= 0 ? c.okText : c.badText }}
            </span>
          </div>
        </div>
        <div class="cmp-note">{{ c.note }}</div>
      </template>

      <!-- 费用构成：哪些是生产外包，哪些是日常开销 -->
      <div class="exp-note" v-if="summary.expenseCategories && summary.expenseCategories.length">
        <span class="exp-label">费用构成（总支出 {{ fmt(summary.expenseTotal) }}）：</span>
        <span
          v-for="c in summary.expenseCategories"
          :key="c.category"
          class="exp-item"
          :class="{ out: c.isOutsource }"
        >
          {{ c.category }} {{ fmt(c.amount) }}<template v-if="c.isOutsource">（外包）</template>
        </span>
      </div>

      <!-- 退货明细提示 -->
      <div v-if="summary.returnedLines > 0" class="return-tip">
        ⚠️ 区间内 {{ summary.returnedLines }} 行退货已按行扣减：
        全退 {{ summary.fullReturnLines }} 行 · 留工费 {{ summary.laborReturnLines }} 行 ·
        留工费+损耗 {{ summary.laborLossReturnLines }} 行。
        退回给客户 ¥{{ fmt(summary.returnedAmount) }}<template v-if="summary.lossAmount > 0">，
        其中客户承担损耗 ¥{{ fmt(summary.lossAmount) }}（损耗不计入收入，只抵材料）</template>。
      </div>
    </div>

    <!-- 趋势 -->
    <el-card shadow="never" class="block">
      <template #header>
        <div class="block-head">
          <span>近 12 个月趋势</span>
          <span class="block-hint">柱：三类收入（扣完退货）· 线：日常开支 / 师傅镶石工费</span>
        </div>
      </template>
      <div ref="chartRef" class="chart"></div>
    </el-card>

    <!-- 明细 -->
    <el-card shadow="never" class="block">
      <template #header>
        <div class="block-head">
          <span>明细 <em class="block-hint">（金额已扣退货；鼠标停在「退货扣减」上看拆分）</em></span>
          <el-radio-group v-model="groupBy" size="small" @change="onGroupChange">
            <el-radio-button value="detail">按账单</el-radio-button>
            <el-radio-button value="customer">按客户</el-radio-button>
            <el-radio-button value="salesman">按业务员</el-radio-button>
            <el-radio-button value="month">按月</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table :data="rows" border stripe size="small" style="width:100%" v-loading="detailLoading">
        <el-table-column v-if="groupBy === 'detail'" prop="billNo" label="账单号" width="150" fixed>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="openBill(row)">{{ row.billNo }}</el-link>
          </template>
        </el-table-column>
        <el-table-column v-if="groupBy === 'detail'" label="账单日期" width="110" align="center">
          <template #default="{ row }">{{ (row.billDate || '').slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column v-if="groupBy !== 'month'" label="客户" width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.customerName || '—' }}</template>
        </el-table-column>
        <el-table-column v-if="groupBy === 'salesman'" prop="groupName" label="业务员" width="120" />
        <el-table-column v-if="groupBy === 'month'" prop="groupName" label="月份" width="100" />
        <el-table-column v-if="groupBy === 'customer'" prop="groupName" label="客户" width="160" show-overflow-tooltip />
        <el-table-column v-if="groupBy !== 'detail'" label="账单数" width="80" align="center">
          <template #default="{ row }">{{ row.billCount }}</template>
        </el-table-column>
        <el-table-column label="行数" width="70" align="center">
          <template #default="{ row }">{{ row.lineCount }}</template>
        </el-table-column>
        <el-table-column prop="laborFee" label="工费" width="100" align="right">
          <template #default="{ row }">{{ fmt(row.laborFee) }}</template>
        </el-table-column>
        <el-table-column prop="moldFee" label="版费" width="90" align="right">
          <template #default="{ row }">{{ fmt(row.moldFee) }}</template>
        </el-table-column>
        <el-table-column prop="miscFee" label="杂费" width="90" align="right">
          <template #default="{ row }">{{ fmt(row.miscFee) }}</template>
        </el-table-column>
        <el-table-column label="加工小计" width="110" align="right">
          <template #default="{ row }"><b class="c-proc">{{ fmt(row.processIncome) }}</b></template>
        </el-table-column>
        <el-table-column prop="settingFee" label="镶石工费" width="100" align="right">
          <template #default="{ row }">{{ fmt(row.settingFee) }}</template>
        </el-table-column>
        <el-table-column prop="diamondMaterial" label="纯钻石" width="110" align="right">
          <template #default="{ row }">{{ fmt(row.diamondMaterial) }}</template>
        </el-table-column>
        <el-table-column v-if="groupBy !== 'detail'" label="粒/ct" width="90" align="center">
          <template #default="{ row }">{{ row.diamondQty }} / {{ fmtNum(row.diamondCarat) }}</template>
        </el-table-column>
        <el-table-column prop="billTotal" label="账单应收" width="110" align="right">
          <template #default="{ row }">{{ fmt(row.billTotal) }}</template>
        </el-table-column>
        <el-table-column label="退货扣减" width="118" align="right">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.returnedLines > 0"
              placement="left"
              :content="dedTip(row)"
            >
              <span class="ded">
                −{{ fmt(row.returnedDeduction) }}
                <i class="ded-n">{{ row.returnedLines }} 行</i>
              </span>
            </el-tooltip>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 合计条（不受分页影响，来自后端 summary） -->
      <div class="total-bar">
        <span>合计（全部 {{ detailTotal }} {{ groupBy === 'detail' ? '张账单' : '组' }}）</span>
        <span>工费 <b>{{ fmt(detailSummary.laborFee) }}</b></span>
        <span>版费 <b>{{ fmt(detailSummary.moldFee) }}</b></span>
        <span>杂费 <b>{{ fmt(detailSummary.miscFee) }}</b></span>
        <span>加工 <b class="c-proc">{{ fmt(detailSummary.processIncome) }}</b></span>
        <span>镶石工费 <b>{{ fmt(detailSummary.settingFee) }}</b></span>
        <span>纯钻石 <b>{{ fmt(detailSummary.diamondMaterial) }}</b></span>
        <span>账单应收 <b>{{ fmt(detailSummary.billTotal) }}</b></span>
      </div>
      <div class="total-bar sub-gray">
        <span>总数（未扣退货）</span>
        <span>加工 <b>{{ fmt(detailSummary.processIncomeGross) }}</b></span>
        <span>镶石工费 <b>{{ fmt(detailSummary.settingFeeGross) }}</b></span>
        <span>纯钻石 <b>{{ fmt(detailSummary.diamondMaterialGross) }}</b></span>
        <span>退货扣减 <b class="ded">−{{ fmt(detailSummary.returnedDeduction) }}</b>（{{ detailSummary.returnedLines || 0 }} 行）</span>
        <span v-if="(detailSummary.lossAmount || 0) > 0">客户承担损耗 <b>{{ fmt(detailSummary.lossAmount) }}</b>（不计收入）</span>
      </div>

      <div class="pager" v-if="detailTotal > pageSize">
        <el-pagination
          background
          layout="total, prev, pager, next, sizes"
          :total="detailTotal"
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          @current-change="loadDetail"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { getRevenueSummary, getRevenueMonthly, getRevenueDetail } from '@/api/revenue';

const router = useRouter();

const loading = ref(false);
const detailLoading = ref(false);
const quick = ref('month');
const range = ref([]);
const groupBy = ref('detail');
const page = ref(1);
const pageSize = ref(20);

const summary = ref({});
const monthly = ref([]);
const rows = ref([]);
const detailTotal = ref(0);
const detailSummary = ref({});

const chartRef = ref(null);
let chart = null;

// ===== 格式化 =====
const fmt = (v) => Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (v) => Number(v || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 });

// 退货扣减 tooltip：拆到加工 / 镶石 / 钻石料
const dedTip = (row) => {
  const parts = [];
  if (Number(row.processReturned || 0) > 0) parts.push(`加工 ${fmt(row.processReturned)}`);
  if (Number(row.settingReturned || 0) > 0) parts.push(`镶石工费 ${fmt(row.settingReturned)}`);
  if (Number(row.diamondReturned || 0) > 0) parts.push(`钻石料 ${fmt(row.diamondReturned)}`);
  const head = `${row.returnedLines} 行退货（全退 ${row.fullReturnLines} / 留工费 ${row.laborReturnLines} / 留工费+损耗 ${row.laborLossReturnLines}）`;
  const body = parts.length ? `扣 ${parts.join(' + ')} = ${fmt(row.returnedDeduction)}` : '无金额扣减';
  return `${head}｜${body}`;
};

// ===== 三项对比（收入侧一律用扣完退货的净额）=====
const compares = computed(() => {
  const s = summary.value || {};
  const expNote =
    Number(s.expenseOutsource || 0) > 0
      ? `支出：全部费用 ${fmt(s.expenseTotal)} − 生产外包 ${fmt(s.expenseOutsource)} = 日常开销 ${fmt(s.dailyExpense)}`
      : `支出：费用表全部支出 ${fmt(s.expenseTotal)}（无生产外包类）`;
  const procNote = Number(s.processReturned || 0) > 0
    ? `收入：总数 ${fmt(s.processIncomeGross)} − 退货 ${fmt(s.processReturned)} = 净 ${fmt(s.processIncome)}`
    : `收入：加工收入 ${fmt(s.processIncome)}（无退货扣减）`;
  const setNote = Number(s.settingReturned || 0) > 0
    ? `收入：总数 ${fmt(s.settingFeeGross)} − 退货 ${fmt(s.settingReturned)} = 净 ${fmt(s.settingFee)}`
    : `收入：镶石工费 ${fmt(s.settingFee)}（粒数×单价，无退货扣减）`;
  const diaNote = Number(s.diamondReturned || 0) > 0
    ? `收入：钻石料总数 ${fmt(s.diamondMaterialGross)} − 退货 ${fmt(s.diamondReturned)} = 净 ${fmt(s.diamondMaterial)}；支出：钻石入库 ${fmt(s.diamondPurchase)}`
    : `收入：纯钻石料 ${fmt(s.diamondMaterial)}（已剔除镶石工费）；支出：钻石入库 ${fmt(s.diamondPurchase)}`;

  return [
    {
      key: 'process',
      label: '工费 VS 日常开销',
      hint: expNote,
      income: s.processIncome || 0,
      cost: s.dailyExpense || 0,
      diff: s.processVsExpense || 0,
      okText: '够',
      badText: '不够',
      note: procNote
    },
    {
      key: 'setting',
      label: '镶石工费 VS 师傅开销',
      hint: '账单镶石工费 vs 镶石工序单据里的师傅工费',
      income: s.settingFee || 0,
      cost: s.masterSettingFee || 0,
      diff: s.settingVsMaster || 0,
      okText: '够',
      badText: '差',
      note: setNote
    },
    {
      key: 'diamond',
      label: '钻石赚了多少',
      hint: '纯钻石料 vs 钻石入库采购',
      income: s.diamondMaterial || 0,
      cost: s.diamondPurchase || 0,
      diff: s.diamondGrossProfit || 0,
      okText: '有毛利',
      badText: '倒挂',
      note: diaNote
    }
  ];
});

// ===== 区间 =====
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const applyQuick = (q) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (q === 'month') {
    range.value = [ymd(new Date(y, m, 1)), ymd(new Date(y, m + 1, 0))];
  } else if (q === 'last') {
    range.value = [ymd(new Date(y, m - 1, 1)), ymd(new Date(y, m, 0))];
  } else if (q === 'quarter') {
    range.value = [ymd(new Date(y, m - 2, 1)), ymd(new Date(y, m + 1, 0))];
  } else if (q === 'year') {
    range.value = [ymd(new Date(y, 0, 1)), ymd(new Date(y, 11, 31))];
  } else {
    range.value = ['2000-01-01', '2099-12-31'];
  }
};

const onQuick = (q) => {
  applyQuick(q);
  page.value = 1;
  loadAll();
};

const onRangeChange = () => {
  quick.value = 'custom';
  page.value = 1;
  loadAll();
};

const params = () => {
  const [s, e] = range.value || [];
  return { startDate: s, endDate: e };
};

// ===== 加载 =====
const loadSummary = async () => {
  const res = await getRevenueSummary(params());
  summary.value = res?.data || {};
};

const loadMonthly = async () => {
  const res = await getRevenueMonthly(12);
  monthly.value = res?.data || [];
  await nextTick();
  renderChart();
};

const loadDetail = async () => {
  detailLoading.value = true;
  try {
    const res = await getRevenueDetail({ ...params(), groupBy: groupBy.value, page: page.value, pageSize: pageSize.value });
    const d = res?.data || {};
    rows.value = d.rows || [];
    detailTotal.value = d.total || 0;
    detailSummary.value = d.summary || {};
  } finally {
    detailLoading.value = false;
  }
};

const loadAll = async () => {
  loading.value = true;
  try {
    await loadSummary();
    await Promise.all([loadMonthly(), loadDetail()]);
  } catch (e) {
    ElMessage.error(e.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const onGroupChange = () => {
  page.value = 1;
  loadDetail();
};

const onSizeChange = () => {
  page.value = 1;
  loadDetail();
};

const openBill = (row) => {
  if (!row?.billId) return;
  router.push(`/order/bill/detail/${row.billId}`);
};

// ===== 图表 =====
const renderChart = () => {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value);
  const months = monthly.value.map((x) => x.month.slice(2).replace('-', '/'));
  chart.setOption(
    {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v) => '¥' + fmt(v)
      },
      legend: { data: ['加工收入', '镶石工费', '纯钻石', '日常开支', '师傅镶石工费'], top: 0 },
      grid: { left: 60, right: 20, top: 44, bottom: 30 },
      xAxis: { type: 'category', data: months, axisTick: { alignWithLabel: true } },
      yAxis: { type: 'value', axisLabel: { formatter: (v) => (v >= 10000 ? v / 10000 + '万' : v) } },
      series: [
        { name: '加工收入', type: 'bar', barMaxWidth: 22, itemStyle: { color: '#409EFF' }, data: monthly.value.map((x) => x.processIncome) },
        { name: '镶石工费', type: 'bar', barMaxWidth: 22, itemStyle: { color: '#E6A23C' }, data: monthly.value.map((x) => x.settingFee) },
        { name: '纯钻石', type: 'bar', barMaxWidth: 22, itemStyle: { color: '#67C23A' }, data: monthly.value.map((x) => x.diamondMaterial) },
        {
          name: '日常开支', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
          lineStyle: { width: 2, color: '#F56C6C' }, itemStyle: { color: '#F56C6C' },
          data: monthly.value.map((x) => x.dailyExpense)
        },
        {
          name: '师傅镶石工费', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5,
          lineStyle: { width: 2, type: 'dashed', color: '#909399' }, itemStyle: { color: '#909399' },
          data: monthly.value.map((x) => x.masterSettingFee)
        }
      ]
    },
    true
  );
  chart.resize();
};

const onResize = () => chart && chart.resize();

// ===== CSV =====
const exportCsv = () => {
  const head = groupBy.value === 'detail'
    ? ['账单号', '账单日期', '客户', '业务员', '行数', '工费', '版费', '杂费', '加工小计(净)', '镶石工费(净)', '纯钻石(净)',
       '账单应收', '退货行数', '退货扣减', '加工总数', '镶石总数', '钻石总数', '客户承担损耗']
    : ['分组', '账单数', '行数', '工费', '版费', '杂费', '加工小计(净)', '镶石工费(净)', '纯钻石(净)',
       '账单应收', '退货行数', '退货扣减', '加工总数', '镶石总数', '钻石总数', '客户承担损耗'];
  const lines = rows.value.map((r) => {
    const base = groupBy.value === 'detail'
      ? [r.billNo, (r.billDate || '').slice(0, 10), r.customerName, r.salesman]
      : [r.groupName, r.billCount];
    return [
      ...base, r.lineCount, r.laborFee, r.moldFee, r.miscFee, r.processIncome, r.settingFee, r.diamondMaterial,
      r.billTotal, r.returnedLines, r.returnedDeduction, r.processIncomeGross, r.settingFeeGross,
      r.diamondMaterialGross, r.lossAmount
    ];
  });
  const csv = [head, ...lines].map((x) => x.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `收入结构_${range.value?.[0] || ''}_${range.value?.[1] || ''}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

onMounted(() => {
  applyQuick('month');
  loadAll();
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  if (chart) {
    chart.dispose();
    chart = null;
  }
});
</script>

<style scoped>
.page-container { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.page-header h2 { margin: 0; font-size: 20px; }

.filter-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.range-hint { font-size: 12px; color: #606266; }
.range-hint b { color: #303133; }

.caliber-tip {
  background: #f4f8ff; border-left: 3px solid #409eff; color: #5a6b82;
  font-size: 12px; line-height: 1.7; padding: 8px 12px; border-radius: 4px; margin-bottom: 14px;
}
.caliber-tip b { color: #2f6fd0; }

.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
.kpi-card {
  background: #fff; border-radius: 8px; padding: 14px 16px;
  border: 1px solid #ebeef5; border-top: 3px solid #409eff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.kpi-card.c-process { border-top-color: #409eff; }
.kpi-card.c-setting { border-top-color: #e6a23c; }
.kpi-card.c-diamond { border-top-color: #67c23a; }
.kpi-card.c-gold { border-top-color: #909399; }
.k-label { font-size: 13px; color: #303133; font-weight: 600; }
.k-label em { font-style: normal; font-weight: 400; font-size: 11px; color: #909399; margin-left: 6px; }
.k-value { font-size: 26px; font-weight: 700; color: #303133; margin: 6px 0 4px; letter-spacing: -0.5px; }
.k-sub { font-size: 12px; color: #909399; }
.k-sub + .k-sub { margin-top: 3px; }
.k-sub.gray { color: #a8abb2; border-top: 1px dashed #f0f2f5; padding-top: 4px; margin-top: 6px; }
.ded { color: #c86a3c; font-weight: 600; }
.ded-n { font-style: normal; color: #a8abb2; font-weight: 400; margin-left: 2px; }
.muted { color: #c0c4cc; }

.compare-panel { background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; }
.panel-title { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 10px; }
.cmp-head, .cmp-row { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1.2fr; gap: 10px; align-items: center; }
.cmp-head { font-size: 12px; color: #909399; padding: 6px 0; border-bottom: 1px solid #f0f2f5; }
.cmp-row { padding: 10px 0 2px; }
.cmp-row:last-of-type { }
.cmp-row .c1 b { font-size: 13px; color: #303133; }
.cmp-row .c1 em { display: block; font-style: normal; font-size: 11px; color: #a8abb2; margin-top: 2px; }
.cmp-note {
  font-size: 12px; color: #a8abb2; padding: 0 0 8px 0; border-bottom: 1px dashed #f0f2f5;
}
.c2, .c3 { font-size: 14px; font-variant-numeric: tabular-nums; }
.c2.in { color: #2f6fd0; }
.c3.out { color: #b88230; }
.c4 { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.c4.pos { color: #c0392b; }
.c4.neg { color: #2e7d32; }
.tag { font-size: 11px; font-weight: 400; padding: 1px 5px; border-radius: 3px; margin-left: 6px; }
.tag-ok { background: #fdf0ee; color: #c0392b; }
.tag-bad { background: #eef7ee; color: #2e7d32; }

.exp-note {
  margin-top: 10px; font-size: 12px; color: #a8abb2; line-height: 1.9;
  background: #fafbfc; border-radius: 4px; padding: 6px 10px;
}
.exp-label { color: #909399; }
.exp-item { margin-right: 10px; white-space: nowrap; }
.exp-item.out { color: #b88230; }

.return-tip { margin-top: 8px; font-size: 12px; color: #b88230; background: #fdf6ec; padding: 6px 10px; border-radius: 4px; }

.block { margin-bottom: 14px; }
.block-head { display: flex; justify-content: space-between; align-items: center; }
.block-head em { font-style: normal; }
.block-hint { font-size: 12px; color: #909399; }
.chart { height: 300px; width: 100%; }

.total-bar {
  display: flex; flex-wrap: wrap; gap: 16px; align-items: center;
  margin-top: 10px; padding: 8px 12px; background: #f7f9fc; border-radius: 4px;
  font-size: 12px; color: #606266;
}
.total-bar b { color: #303133; font-size: 13px; }
.total-bar.sub-gray { margin-top: 6px; background: transparent; color: #a8abb2; padding: 4px 12px; }
.total-bar.sub-gray b { color: #909399; font-size: 12px; }
.total-bar.sub-gray b.ded { color: #c86a3c; }
.c-proc { color: #2f6fd0; }
.pager { display: flex; justify-content: flex-end; margin-top: 10px; }
</style>
