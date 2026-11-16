<!-- src/views/inout/statement.vue —— 供应商对账单（欠料 / 欠款） -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <h2>供应商对账单</h2>
        <span class="sub-tip">
          欠料 = 上期欠料 + 本期来料折足重 − 付足料 − 结价料重；欠款 = 期初欠款 + 本期应付 − 结价金额 − 本期付款
        </span>
      </div>
      <div class="header-right">
        <el-button :icon="Refresh" @click="reload">刷新</el-button>
        <el-button :icon="Download" :disabled="!detail.rows.length" @click="exportCsv">导出</el-button>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="search-bar">
      <div class="row1">
        <el-select
          v-model="query.partyId"
          placeholder="全部供应商"
          clearable filterable
          style="width:220px"
          @change="onPartyPick"
        >
          <el-option v-for="p in partyOptions" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>

        <el-input
          v-model="query.keyword"
          placeholder="供应商 / 单号 / 品名"
          clearable style="width:200px"
          @clear="loadSummary"
          @keyup.enter="loadSummary"
        />

        <el-button type="primary" :icon="Search" @click="loadSummary">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>

        <span class="period-tip">
          本期：<b>{{ periodText }}</b>
          <template v-if="openUntil">｜期初截止 <b>{{ openUntil }}</b></template>
        </span>
      </div>

      <div class="row2">
        <el-radio-group v-model="query.dateType" size="small" @change="onDateTypeChange">
          <el-radio-button value="today">今天</el-radio-button>
          <el-radio-button value="month">本月</el-radio-button>
          <el-radio-button value="lastMonth">上月</el-radio-button>
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="custom">自定义</el-radio-button>
        </el-radio-group>

        <el-date-picker
          v-if="query.dateType === 'custom'"
          v-model="customRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="~"
          start-placeholder="开始"
          end-placeholder="结束"
          size="small"
          style="width:240px"
          @change="loadSummary"
        />
      </div>
    </div>

    <!-- 一、供应商一览 -->
    <div class="block">
      <div class="block-head">
        <span class="block-title">一、供应商一览</span>
        <span class="block-note">点某一行，下面出这家的对账单（按成色 → 明细）</span>
      </div>
      <el-table
        :data="summaryRows"
        border size="small"
        v-loading="loadingSummary"
        :scrollbar-always-on="true"
        :row-class-name="({ row }) => row.partyId === query.partyId ? 'row-active' : ''"
        highlight-current-row
        @row-click="onRowClick"
        style="width:100%"
      >
        <el-table-column prop="partyName" label="供应商" min-width="180" fixed>
          <template #default="{ row }">
            <span class="party-name">{{ row.partyName || '(未填名称)' }}</span>
            <el-tag v-if="row.partyId === query.partyId" type="primary" size="small" effect="plain" style="margin-left:6px">当前</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="openDebtWeight" label="上期欠料(g)" width="118" align="right">
          <template #default="{ row }"><span :class="numClass(row.openDebtWeight)">{{ weight(row.openDebtWeight) }}</span></template>
        </el-table-column>
        <el-table-column prop="curAddLossWeight" label="本期来料总重(g)" width="136" align="right">
          <template #default="{ row }">
            <el-tooltip content="来料实物重量（加耗总重），不含折算" placement="top" :show-after="300">
              <b :class="row.curAddLossWeight ? 'fold' : 'zero'">{{ weight(row.curAddLossWeight) }}</b>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="curFoldWeight" label="折足重(g)" width="112" align="right">
          <template #default="{ row }">
            <el-tooltip content="折足金 = 加耗总重 × 折算率；欠料按这个算" placement="top" :show-after="300">
              <span :class="row.curFoldWeight ? 'fold' : 'zero'">{{ weight(row.curFoldWeight) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="curPaidFoldWeight" label="付足料(g)" width="112" align="right">
          <template #default="{ row }">
            <el-tooltip content="买配件（非足金成色）付给供应商的足金，直接冲减欠料" placement="top" :show-after="300">
              <span :class="row.curPaidFoldWeight ? 'paid' : 'zero'">{{ row.curPaidFoldWeight ? weight(row.curPaidFoldWeight) : '—' }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="curSellFoldWeight" label="结价料重(g)" width="118" align="right">
          <template #default="{ row }">{{ weight(row.curSellFoldWeight) }}</template>
        </el-table-column>
        <el-table-column prop="endDebtWeight" label="本期欠料(g)" width="118" align="right">
          <template #default="{ row }"><b :class="numClass(row.endDebtWeight)">{{ weight(row.endDebtWeight) }}</b></template>
        </el-table-column>
        <el-table-column prop="openDebtAmount" label="期初欠款(元)" width="120" align="right">
          <template #default="{ row }">{{ money(row.openDebtAmount) }}</template>
        </el-table-column>
        <el-table-column prop="curAmount" label="本期应付(元)" width="120" align="right">
          <template #default="{ row }"><b>{{ money(row.curAmount) }}</b></template>
        </el-table-column>
        <el-table-column prop="curSettleAmount" label="结价金额(元)" width="120" align="right">
          <template #default="{ row }"><span class="sell">{{ money(row.curSettleAmount) }}</span></template>
        </el-table-column>
        <el-table-column prop="curPaid" label="本期付款(元)" width="120" align="right">
          <template #default="{ row }"><span class="paid">{{ money(row.curPaid) }}</span></template>
        </el-table-column>
        <el-table-column prop="endDebtAmount" label="期末欠款(元)" width="126" align="right" fixed="right">
          <template #default="{ row }"><b :class="numClass(row.endDebtAmount)">{{ money(row.endDebtAmount) }}</b></template>
        </el-table-column>
      </el-table>

      <div class="sum-bar">
        <span class="sum-item">合计 <b>{{ sum.partyCount || 0 }}</b> 家</span>
        <span class="sum-item">上期欠料 <b>{{ weight(sum.openDebtWeight) }}</b> g</span>
        <span class="sum-item">本期来料总重 <b class="fold">{{ weight(sum.curAddLossWeight) }}</b> g</span>
        <span class="sum-item">来料折足重 <b class="fold">{{ weight(sum.curFoldWeight) }}</b> g</span>
        <span class="sum-item">付足料 <b class="paid">{{ weight(sum.curPaidFoldWeight) }}</b> g</span>
        <span class="sum-item">结价料重 <b>{{ weight(sum.curSellFoldWeight) }}</b> g</span>
        <span class="sum-item">结价金额 <b class="sell">{{ money(sum.curSettleAmount) }}</b> 元</span>
        <span class="sum-item">本期欠料 <b :class="numClass(sum.endDebtWeight)">{{ weight(sum.endDebtWeight) }}</b> g</span>
        <span class="sum-item">本期应付 <b>{{ money(sum.curAmount) }}</b> 元</span>
        <span class="sum-item">本期付款 <b class="paid">{{ money(sum.curPaid) }}</b> 元</span>
        <span class="sum-item">期末欠款 <b :class="numClass(sum.endDebtAmount)">{{ money(sum.endDebtAmount) }}</b> 元</span>
      </div>
    </div>

    <template v-if="query.partyId">
      <!-- 二、按成色汇总 -->
      <div class="block">
        <div class="block-head">
          <span class="block-title">二、按成色汇总 · {{ detail.partyName || '' }}</span>
          <span class="block-note">只列金料成色（钻石按卡数，不折足重）；结价出库按金价折钱，冲减欠料</span>
        </div>
        <el-table
          :data="detail.colors"
          border size="small"
          :show-summary="!!detail.colors.length"
          :summary-method="colorSummary"
          style="width:100%"
        >
          <el-table-column prop="color" label="成色" min-width="120">
            <template #default="{ row }"><span class="color-chip">{{ row.color }}</span></template>
          </el-table-column>
          <el-table-column prop="inWeight" label="本期来料总重(g)" width="146" align="right">
            <template #default="{ row }">
              <el-tooltip content="来料实物重量（加耗总重）" placement="top" :show-after="300">
                <b :class="row.inWeight ? 'fold' : 'zero'">{{ weight(row.inWeight) }}</b>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="foldWeight" label="折足重(g)" width="118" align="right">
            <template #default="{ row }">
              <el-tooltip content="折足重 = 加耗总重 × 折算率；本期欠料按折足重算" placement="top" :show-after="300">
                <span :class="row.foldWeight ? 'fold' : 'zero'">{{ weight(row.foldWeight) }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="paidFoldWeight" label="付足料(g)" width="112" align="right">
            <template #default="{ row }">
              <el-tooltip content="买配件（非足金成色）付给供应商的足金，直接冲减本期欠料" placement="top" :show-after="300">
                <span :class="row.paidFoldWeight ? 'paid' : 'zero'">{{ row.paidFoldWeight ? weight(row.paidFoldWeight) : '—' }}</span>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="openDebtWeight" label="上期欠料重(g)" width="136" align="right">
            <template #default="{ row }"><span :class="numClass(row.openDebtWeight)">{{ weight(row.openDebtWeight) }}</span></template>
          </el-table-column>
          <el-table-column prop="debtWeight" label="本期欠料重(g)" width="136" align="right">
            <template #default="{ row }"><b :class="numClass(row.debtWeight)">{{ weight(row.debtWeight) }}</b></template>
          </el-table-column>
          <el-table-column prop="settleWeight" label="结价料重(g)" width="128" align="right">
            <template #default="{ row }"><span :class="row.settleWeight ? '' : 'zero'">{{ weight(row.settleWeight) }}</span></template>
          </el-table-column>
          <el-table-column prop="settleAmount" label="结价金额(元)" width="132" align="right">
            <template #default="{ row }"><span :class="row.settleAmount ? 'sell' : 'zero'">{{ money(row.settleAmount) }}</span></template>
          </el-table-column>
          <el-table-column label="备注" min-width="140">
            <template #default="{ row }"><span class="muted">{{ colorNote(row) }}</span></template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 三、明细 -->
      <div class="block">
        <div class="block-head">
          <span class="block-title">三、明细</span>
          <span class="block-note">
            金料行带「损耗 / 总重 / 补口 / 补钯金费 / 工费」，可左右拖动看全；结价出库金额为负、冲减欠款；交易/付款/累计欠料/累计欠款固定在右边
          </span>
        </div>

        <el-table
          :data="detail.rows"
          border size="small"
          v-loading="loadingDetail"
          :row-class-name="rowClass"
          :scrollbar-always-on="true"
          show-summary
          :summary-method="detailSummary"
          style="width:100%"
        >
          <el-table-column prop="date" label="日期" width="100" fixed>
            <template #default="{ row }">{{ (row.date || '').slice(0, 10) }}</template>
          </el-table-column>
          <el-table-column prop="bizLabel" label="类型" width="108" align="center">
            <template #default="{ row }">
              <el-tag :type="bizTagType(row.bizType)" size="small" effect="plain">{{ row.bizLabel }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="docNo" label="单号" width="130">
            <template #default="{ row }"><span class="doc-no">{{ row.docNo }}</span></template>
          </el-table-column>
          <el-table-column prop="productName" label="品名" min-width="110" show-overflow-tooltip />
          <el-table-column prop="color" label="成色" width="82" align="center">
            <template #default="{ row }">
              <span v-if="row.color" class="color-chip">{{ row.color }}</span>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>

          <el-table-column label="净重(g)" width="88" align="right">
            <template #default="{ row }">{{ row.weight ? weight(row.weight) : '' }}</template>
          </el-table-column>
          <el-table-column label="损耗" width="72" align="right">
            <template #default="{ row }">
              <span v-if="row.lossRate" class="mult-cell">{{ mult(row.lossRate) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="总重(g)" width="88" align="right">
            <template #default="{ row }">{{ row.addLossWeight ? weight(row.addLossWeight) : '' }}</template>
          </el-table-column>
          <el-table-column label="折算率" width="78" align="right">
            <template #default="{ row }">
              <span v-if="row.foldRate" class="mult-cell">{{ mult(row.foldRate) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="折足重(g)" width="94" align="right">
            <template #default="{ row }">
              <b v-if="row.foldWeight" class="fold">{{ weight(row.foldWeight) }}</b>
            </template>
          </el-table-column>
          <el-table-column label="付足料(g)" width="94" align="right">
            <template #default="{ row }">
              <span v-if="row.paidFoldWeight" class="paid">{{ weight(row.paidFoldWeight) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="补口重(g)" width="88" align="right">
            <template #default="{ row }">{{ row.mouthWeight ? weight(row.mouthWeight) : '' }}</template>
          </el-table-column>
          <el-table-column label="补口金额" width="88" align="right">
            <template #default="{ row }">{{ row.mouthAmount ? money(row.mouthAmount) : '' }}</template>
          </el-table-column>
          <el-table-column label="补钯金费" width="88" align="right">
            <template #default="{ row }">{{ row.patchFee ? money(row.patchFee) : '' }}</template>
          </el-table-column>
          <el-table-column label="工费" width="80" align="right">
            <template #default="{ row }">{{ row.laborFee ? money(row.laborFee) : '' }}</template>
          </el-table-column>
          <el-table-column label="钻石级别" width="90" align="center">
            <template #default="{ row }"><span class="muted">{{ row.diamondLevel || '—' }}</span></template>
          </el-table-column>
          <el-table-column label="石重(ct)" width="86" align="right">
            <template #default="{ row }">{{ row.carat ? weight(row.carat) : '' }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip>
            <template #default="{ row }"><span class="muted">{{ row.remark || '' }}</span></template>
          </el-table-column>

          <!-- 钱和欠账固定在右边：宽表横向滚动时也一直看得到 -->
          <el-table-column label="交易金额(元)" width="112" align="right" fixed="right">
            <template #default="{ row }">
              <b v-if="tradeAmount(row)" :class="tradeAmount(row) < 0 ? 'cut' : ''">{{ signedMoney(tradeAmount(row)) }}</b>
            </template>
          </el-table-column>
          <el-table-column label="付款金额(元)" width="112" align="right" fixed="right">
            <template #default="{ row }"><span v-if="payAmount(row)" class="paid">{{ money(payAmount(row)) }}</span></template>
          </el-table-column>
          <el-table-column label="累计欠料(g)" width="104" align="right" fixed="right">
            <template #default="{ row }"><b :class="numClass(row.accDebtWeight)">{{ weight(row.accDebtWeight) }}</b></template>
          </el-table-column>
          <el-table-column label="累计欠款(元)" width="112" align="right" fixed="right">
            <template #default="{ row }"><b :class="numClass(row.accDebtAmount)">{{ money(row.accDebtAmount) }}</b></template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <div class="empty-detail" v-else-if="summaryRows.length">
      ↑ 点上面任意一行，下面出这家的对账单
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Search, Download } from '@element-plus/icons-vue';
import { getStatementSummary, getStatementDetail, getStatementParties } from '@/api/statement';
import { todayStr } from '@/utils/date';

const loadingSummary = ref(false);
const loadingDetail = ref(false);
const summaryRows = ref([]);
const partyOptions = ref([]);
const sum = ref(emptyParty());
const detail = ref(emptyDetail());
const openUntil = ref('');

function emptyParty() {
  return {
    partyId: 0, partyName: '', openDebtWeight: 0, openDebtAmount: 0,
    curWeight: 0, curAddLossWeight: 0, curFoldWeight: 0, curCarat: 0,
    curAmount: 0, curPaid: 0, curCount: 0,
    curSellWeight: 0, curSellAddLossWeight: 0, curSellFoldWeight: 0, curSellCarat: 0,
    curSellAmount: 0, curSellReceived: 0, curSellCount: 0,
    curSettleAmount: 0, curDiamondSaleAmount: 0,
    endDebtWeight: 0, endDebtAmount: 0
  };
}
function emptyDetail() {
  return { partyName: '', open: emptyParty(), period: emptyParty(), rows: [], colors: [] };
}

const query = reactive({
  partyId: null,
  keyword: '',
  dateType: 'month',
  startDate: '',
  endDate: ''
});
const customRange = ref(null);

// 有卖钻才显示「卖钻金额」这一列，避免常态多一列 0
const periodText = computed(() => {
  if (query.dateType === 'all') return '全部历史';
  if (!query.startDate) return '—';
  return query.endDate && query.endDate !== query.startDate
    ? `${query.startDate} ~ ${query.endDate}`
    : query.startDate;
});

// ---------- 日期 ----------
function monthRange(offset = 0) {
  const t = new Date();
  const y = t.getFullYear();
  const m = t.getMonth() + offset;
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const pad = (n) => String(n).padStart(2, '0');
  const s = `${first.getFullYear()}-${pad(first.getMonth() + 1)}-01`;
  let e = `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`;
  const today = todayStr();
  if (e > today) e = today;
  return [s, e];
}

function applyDateType() {
  const t = todayStr();
  if (query.dateType === 'today') {
    query.startDate = t; query.endDate = t;
  } else if (query.dateType === 'month') {
    [query.startDate, query.endDate] = monthRange(0);
  } else if (query.dateType === 'lastMonth') {
    const t2 = new Date();
    const prev = new Date(t2.getFullYear(), t2.getMonth() - 1, 1);
    const lastDay = new Date(prev.getFullYear(), prev.getMonth() + 1, 0);
    const pad = (n) => String(n).padStart(2, '0');
    query.startDate = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-01`;
    query.endDate = `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`;
  } else if (query.dateType === 'custom') {
    query.startDate = customRange.value?.[0] || '';
    query.endDate = customRange.value?.[1] || '';
  } else {
    query.startDate = ''; query.endDate = '';
  }
}

const onDateTypeChange = () => {
  if (query.dateType === 'custom' && !customRange.value) {
    const [s, e] = monthRange(0);
    customRange.value = [s, e];
  }
  applyDateType();
  loadSummary();
};

// ---------- 加载 ----------
const params = () => {
  const p = { partyType: 'supplier' };
  if (query.startDate) p.startDate = query.startDate;
  if (query.endDate) p.endDate = query.endDate;
  if (query.keyword) p.keyword = query.keyword;
  return p;
};

async function loadSummary() {
  loadingSummary.value = true;
  try {
    const res = await getStatementSummary({ ...params(), page: 1, pageSize: 500 });
    const d = res.data || {};
    summaryRows.value = d.list || [];
    sum.value = d.sum || emptyParty();
    openUntil.value = d.openUntil ? String(d.openUntil).slice(0, 10) : '';

    const exists = summaryRows.value.some((r) => r.partyId === query.partyId);
    if (!exists) query.partyId = summaryRows.value[0]?.partyId || null;
    if (query.partyId) await loadDetail();
    else detail.value = emptyDetail();
  } catch (e) {
    ElMessage.error('加载汇总失败');
  } finally {
    loadingSummary.value = false;
  }
}

async function loadDetail() {
  if (!query.partyId) { detail.value = emptyDetail(); return; }
  loadingDetail.value = true;
  try {
    const res = await getStatementDetail({ ...params(), partyId: query.partyId, mergeDay: false });
    detail.value = res.data || emptyDetail();
  } catch (e) {
    ElMessage.error('加载明细失败');
  } finally {
    loadingDetail.value = false;
  }
}

async function loadParties() {
  try {
    const res = await getStatementParties('supplier');
    partyOptions.value = res.data || [];
  } catch { partyOptions.value = []; }
}

const reload = () => { loadParties(); loadSummary(); };
const onPartyPick = () => { loadDetail(); };
const onRowClick = (row) => { query.partyId = row.partyId; loadDetail(); };

const resetQuery = () => {
  query.keyword = '';
  query.partyId = null;
  query.dateType = 'month';
  customRange.value = null;
  applyDateType();
  loadSummary();
};

// ---------- 展示格式化 ----------
const money = (v) => Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedMoney = (v) => (Number(v || 0) < 0 ? '−¥' : '¥') + money(Math.abs(Number(v || 0)));
const weight = (v) => Number(v || 0).toFixed(2);
// 损耗率 / 折算率按纸面结算单口径显示倍数（1.01 = 加耗 1%，0.75 = 折足 75%）
const mult = (v) => Number(v || 0).toFixed(4).replace(/\.?0+$/, '');
const numClass = (v) => (Number(v || 0) > 0 ? 'neg' : (Number(v || 0) < 0 ? 'pos' : 'zero'));

const bizTagType = (t) => {
  if (t === 'purchase') return 'primary';
  if (t === 'goldSale' || t === 'diamondSale') return 'warning';
  if (t === 'payment') return 'success';
  return 'info';
};

// 交易金额：结价出库是冲减，用负数表示
const isSettle = (row) => row.bizType === 'goldSale' || row.bizType === 'diamondSale';
const tradeAmount = (row) => (isSettle(row) ? -(Number(row.sellAmount || 0)) : Number(row.amount || 0));
const payAmount = (row) => (isSettle(row) ? Number(row.sellReceived || 0) : Number(row.paid || 0));

const rowClass = ({ row }) => {
  if (isSettle(row)) return 'row-settle';
  if (row.bizType === 'expense') return 'row-expense';
  return '';
};

// 成色备注：把「来料 / 结价 / 结转」讲清楚，避免看着 0 不知道是啥
function colorNote(row) {
  const parts = [];
  if (row.inWeight) parts.push(`来料 ${weight(row.inWeight)} g`);
  if (row.foldWeight && row.foldWeight !== row.inWeight) parts.push(`折足 ${weight(row.foldWeight)} g`);
  if (row.paidFoldWeight) parts.push(`付足料 ${weight(row.paidFoldWeight)} g`);
  if (row.settleWeight) parts.push(`结价 ${weight(row.settleWeight)} g`);
  if (!parts.length && row.openDebtWeight) parts.push('本期无业务，上期结转');
  return parts.join('，');
}

const colorSummary = ({ columns }) => {
  const list = detail.value.colors || [];
  const sumIn = list.reduce((a, x) => a + Number(x.inWeight || 0), 0);
  const sumInFold = list.reduce((a, x) => a + Number(x.foldWeight || 0), 0);
  const sumPaidFold = list.reduce((a, x) => a + Number(x.paidFoldWeight || 0), 0);
  const sumOpen = list.reduce((a, x) => a + Number(x.openDebtWeight || 0), 0);
  const sumDebt = list.reduce((a, x) => a + Number(x.debtWeight || 0), 0);
  const sumSettleW = list.reduce((a, x) => a + Number(x.settleWeight || 0), 0);
  const sumSettleA = list.reduce((a, x) => a + Number(x.settleAmount || 0), 0);
  return columns.map((c, i) => {
    if (i === 0) return `合计 ${list.length} 个成色`;
    const lbl = c.label || '';
    if (lbl.includes('付足料')) return weight(sumPaidFold);
    if (lbl.includes('折足重')) return weight(sumInFold);
    if (lbl.includes('来料')) return weight(sumIn);
    if (lbl.includes('上期欠料')) return weight(sumOpen);
    if (lbl.includes('本期欠料')) return weight(sumDebt);
    if (lbl.includes('结价料重')) return weight(sumSettleW);
    if (lbl.includes('结价金额')) return money(sumSettleA);
    return '';
  });
};

// 明细合计：累计列显示期末，不求和
const detailSummary = ({ columns }) => {
  const p = detail.value.period || emptyParty();
  const accWIdx = columns.findIndex((c) => (c.label || '').includes('累计欠料'));
  const accAIdx = columns.findIndex((c) => (c.label || '').includes('累计欠款'));
  const sumField = (pred) => (detail.value.rows || []).reduce((a, r) => a + Number(pred(r) || 0), 0);

  return columns.map((c, i) => {
    if (i === 0) return `合计 ${p.curCount} 笔`;
    if (i === accWIdx) return weight(p.endDebtWeight);
    if (i === accAIdx) return '¥' + money(p.endDebtAmount);
    const lbl = c.label || '';
    if (lbl.includes('净重')) return weight(sumField((r) => r.weight));
    if (lbl.includes('总重')) return weight(sumField((r) => r.addLossWeight));
    if (lbl.includes('付足料')) return weight(sumField((r) => r.paidFoldWeight));
    if (lbl.includes('折足重')) return weight(sumField((r) => r.foldWeight));
    if (lbl.includes('补口重')) return weight(sumField((r) => r.mouthWeight));
    if (lbl.includes('补口金额')) return sumField((r) => r.mouthAmount) ? '¥' + money(sumField((r) => r.mouthAmount)) : '';
    if (lbl.includes('补钯金费')) return sumField((r) => r.patchFee) ? '¥' + money(sumField((r) => r.patchFee)) : '';
    if (lbl.includes('工费')) return sumField((r) => r.laborFee) ? '¥' + money(sumField((r) => r.laborFee)) : '';
    if (lbl.includes('石重')) return weight(sumField((r) => r.carat));
    if (lbl.includes('交易金额')) return signedMoney(sumField((r) => tradeAmount(r)));
    if (lbl.includes('付款金额')) return sumField((r) => payAmount(r)) ? '¥' + money(sumField((r) => payAmount(r))) : '';
    return '';
  });
};

// ---------- 导出 ----------
function exportCsv() {
  const lines = [];
  const p = detail.value.period || emptyParty();
  const o = detail.value.open || emptyParty();

  lines.push(`供应商对账单,${detail.value.partyName || ''}`);
  lines.push(`本期,${periodText.value},期初截止,${openUntil.value || ''}`);
  lines.push('');

  // 汇总
  lines.push('【汇总】');
  lines.push('料重(g),上期欠料重,本期来料总重,来料折足重,付足料,结价料重,本期欠料重');
  lines.push([`"重量"`, weight(o.openDebtWeight), weight(p.curAddLossWeight), weight(p.curFoldWeight),
    weight(p.curPaidFoldWeight), weight(p.curSellFoldWeight), weight(p.endDebtWeight)].join(','));
  lines.push('款项(元),期初欠款,本期应付,结价金额,卖钻金额,本期付款,期末欠款');
  lines.push([`"金额"`, money(o.openDebtAmount), money(p.curAmount), money(p.curSettleAmount),
    money(p.curDiamondSaleAmount), money(p.curPaid), money(p.endDebtAmount)].join(','));
  lines.push('');

  // 按成色
  lines.push('【按成色汇总】');
  lines.push('成色,本期来料总重(g),折足重(g),付足料(g),上期欠料重(g),本期欠料重(g),结价料重(g),结价金额(元),备注');
  (detail.value.colors || []).forEach((c) => {
    lines.push([c.color, weight(c.inWeight), weight(c.foldWeight), weight(c.paidFoldWeight), weight(c.openDebtWeight), weight(c.debtWeight),
      weight(c.settleWeight), money(c.settleAmount), colorNote(c)].map((x) => `"${x ?? ''}"`).join(','));
  });
  lines.push('');

  // 明细
  lines.push('【明细】');
  lines.push('日期,类型,单号,品名,成色,净重(g),损耗,总重(g),折算率,折足重(g),付足料(g),补口重(g),补口金额,补钯金费,工费,钻石级别,石重(ct),交易金额(元),付款金额(元),累计欠料(g),累计欠款(元),备注');
  (detail.value.rows || []).forEach((r) => {
    lines.push([
      String(r.date || '').slice(0, 10), r.bizLabel, r.docNo, r.productName, r.color,
      weight(r.weight), r.lossRate ? mult(r.lossRate) : '', weight(r.addLossWeight),
      r.foldRate ? mult(r.foldRate) : '', weight(r.foldWeight), r.paidFoldWeight ? weight(r.paidFoldWeight) : '',
      r.mouthWeight ? weight(r.mouthWeight) : '', r.mouthAmount ? money(r.mouthAmount) : '',
      r.patchFee ? money(r.patchFee) : '', r.laborFee ? money(r.laborFee) : '',
      r.diamondLevel, r.carat ? weight(r.carat) : '',
      money(tradeAmount(r)), payAmount(r) ? money(payAmount(r)) : '',
      weight(r.accDebtWeight), money(r.accDebtAmount), r.remark
    ].map((x) => `"${x ?? ''}"`).join(','));
  });

  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `供应商对账单_${detail.value.partyName || ''}_${query.startDate || '全部'}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  ElMessage.success('已导出 CSV');
}

onMounted(() => {
  applyDateType();
  loadParties();
  loadSummary();
});
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0; flex-wrap: wrap; gap: 10px; }
.header-left { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.sub-tip { font-size: 12px; color: #909399; }
.header-right { display: flex; gap: 8px; }

.search-bar { background: #fff; padding: 12px 20px 10px; border-top: 1px solid #f0f0f0; }
.search-bar .row1 { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.search-bar .row2 { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px; }
.period-tip { font-size: 12px; color: #606266; margin-left: auto; }
.period-tip b { color: #303133; }

.block { background: #fff; margin-top: 10px; border-radius: 8px; padding: 14px 20px 16px; }
.block-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
.block-title { font-size: 15px; font-weight: 600; color: #303133; }
.block-note { font-size: 12px; color: #909399; }

.party-name { font-weight: 600; }
.fold { color: #b45309; font-weight: 700; }
.paid { color: #2fa96b; font-weight: 600; }
.sell { color: #d9822b; font-weight: 600; }
.cut { color: #2fa96b; font-weight: 700; }
.neg { color: #d64545; font-weight: 600; }
.pos { color: #2fa96b; font-weight: 600; }
.zero { color: #c0c4cc; }
.muted { color: #c0c4cc; }
.doc-no { font-size: 12px; color: #606266; font-family: Consolas, Monaco, monospace; }
.color-chip { display: inline-block; padding: 0 6px; border-radius: 3px; background: #fff7e6; color: #b45309; font-size: 12px; }

.sum-bar { display: flex; gap: 18px; flex-wrap: wrap; padding: 10px 12px; margin-top: 8px; background: #fafafa; border: 1px solid #ebeef5; border-radius: 6px; font-size: 12px; color: #606266; }
.sum-bar b { color: #303133; font-size: 13px; }

.empty-detail { margin-top: 10px; padding: 22px; text-align: center; color: #909399; background: #fff; border-radius: 8px; font-size: 13px; }

:deep(.el-table .row-settle td) { background: #fff8f0 !important; }
:deep(.el-table .row-expense td) { background: #fafafa !important; }
:deep(.el-table .row-active td) { background: #eef5ff !important; }
:deep(.el-table .el-table__footer-wrapper td) { background: #fafafa; font-weight: 600; }
</style>
