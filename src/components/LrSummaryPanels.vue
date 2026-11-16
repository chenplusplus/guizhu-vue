<!-- src/components/LrSummaryPanels.vue
     原来挂在「LR 表管理（order/lr/list）」下面的两块汇总，2026-11-15 迁到「经营看板」：
       左：进销存（查询范围内，仅进销存单据）
       右：汇总（累计 KPI + 按成色 上单 / 本单 / 累计）
     数据全部来自 GET /lr/sheet 的 inout / ledger / colorSummary 三段，本组件只负责展示。
-->
<template>
  <div class="stat-row">
    <!-- 左：进销存（时间范围内） -->
    <div class="panel">
      <div class="panel-h">
        <span>进销存</span>
        <span class="hint">{{ rangeLabel ? rangeLabel + ' · ' : '' }}仅进销存单据</span>
      </div>
      <div class="panel-body">
        <table class="cmp-table inout-table">
          <thead>
            <tr>
              <th class="idx">类别</th>
              <th colspan="2">入库（付钱 · 支出）</th>
              <th colspan="2">出库（收钱 · 收入）</th>
              <th>净额</th>
            </tr>
            <tr>
              <th class="sub"></th>
              <th class="sub">重量</th>
              <th class="sub">金额</th>
              <th class="sub">重量</th>
              <th class="sub">金额</th>
              <th class="sub">出库 − 入库</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="idx">金（g）</td>
              <td class="num">{{ w3(inout.gold.inWeight) }}</td>
              <td class="num">{{ money(inout.gold.inAmount) }}</td>
              <td class="num">{{ w3(inout.gold.outWeight) }}</td>
              <td class="num">{{ money(inout.gold.outAmount) }}</td>
              <td class="num" :class="signClass(inout.gold.outAmount - inout.gold.inAmount)">
                {{ money(inout.gold.outAmount - inout.gold.inAmount) }}
              </td>
            </tr>
            <tr>
              <td class="idx">钻石（ct）</td>
              <td class="num">{{ w2(inout.diamond.inCarat) }}</td>
              <td class="num">{{ money(inout.diamond.inAmount) }}</td>
              <td class="num">{{ w2(inout.diamond.outCarat) }}</td>
              <td class="num">{{ money(inout.diamond.outAmount) }}</td>
              <td class="num" :class="signClass(inout.diamond.outAmount - inout.diamond.inAmount)">
                {{ money(inout.diamond.outAmount - inout.diamond.inAmount) }}
              </td>
            </tr>
            <tr>
              <td class="idx">费用</td>
              <td class="num muted">—</td>
              <td class="num">{{ money(inout.expense.inAmount) }}</td>
              <td class="num muted">—</td>
              <td class="num">{{ money(inout.expense.outAmount) }}</td>
              <td class="num" :class="signClass(inout.expense.outAmount - inout.expense.inAmount)">
                {{ money(inout.expense.outAmount - inout.expense.inAmount) }}
              </td>
            </tr>
            <tr class="sum">
              <td class="idx">合计</td>
              <td class="num muted">—</td>
              <td class="num">{{ money(inout.total.inAmount) }}</td>
              <td class="num muted">—</td>
              <td class="num">{{ money(inout.total.outAmount) }}</td>
              <td class="num strong" :class="signClass(inout.total.outAmount - inout.total.inAmount)">
                {{ money(inout.total.outAmount - inout.total.inAmount) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div class="split-note">
          金/钻：入库 = 买料付钱（支出）、出库 = 卖料收钱（收入）；费用方向相反。成品账单出货不在这里，见右侧按成色的应收。
        </div>
      </div>
    </div>

    <!-- 右：汇总（累计 KPI + 按成色三段） -->
    <div class="panel">
      <div class="panel-h">
        <span>汇总</span>
        <span class="hint">上单 = 起始日之前 · 本单 = 查询范围 · 累计 = 上单 + 本单</span>
      </div>
      <div class="panel-body">
        <div class="sub-title">
          <span class="st-name">累计（全公司）</span>
          <span class="st-hint">{{ ledgerHint }}</span>
        </div>
        <div class="kpi-grid">
          <div class="kpi"><div class="k">累计收入</div><div class="v red">{{ money(ledger.income) }}</div></div>
          <div class="kpi"><div class="k">累计开支</div><div class="v">{{ money(ledger.expense) }}</div></div>
          <div class="kpi"><div class="k">支出平衡</div><div class="v" :class="signClass(ledger.net)">{{ money(ledger.net) }}</div></div>
          <div class="kpi"><div class="k">应收总金额（尚欠）</div><div class="v red">{{ money(ledger.totalReceivable) }}</div></div>
          <div class="kpi"><div class="k">累计利润</div><div class="v" :class="signClass(ledger.totalProfit)">{{ money(ledger.totalProfit) }}</div></div>
          <div class="kpi"><div class="k">累计 LR 份数</div><div class="v">{{ ledger.lrCount }} 份</div></div>
          <div class="kpi"><div class="k">累计出货净重</div><div class="v">{{ w3(colorSum.total.netWeight) }} g</div></div>
          <div class="kpi"><div class="k">累计出货加耗重</div><div class="v">{{ w3(colorSum.total.addLossWeight) }} g</div></div>
          <div class="kpi"><div class="k">累计钻石出货</div><div class="v">{{ w2(colorSum.total.stoneWeight) }} ct</div></div>
        </div>

        <div class="sub-title">
          <span class="st-name">按成色</span>
          <span class="st-hint">销售行口径（出货）· 件数 / 净重 / 加耗重 / 应收</span>
        </div>
        <div class="color-scroll">
          <table class="color-table">
            <thead>
              <tr>
                <th rowspan="2" class="c-name">成色</th>
                <th colspan="3">件数</th>
                <th colspan="3">净重 (g)</th>
                <th colspan="3">加耗重 (g)</th>
                <th colspan="3">应收金额</th>
              </tr>
              <tr>
                <th class="sub">上单</th>
                <th class="sub">本单</th>
                <th class="sub cur">累计</th>
                <th class="sub">上单</th>
                <th class="sub">本单</th>
                <th class="sub cur">累计</th>
                <th class="sub">上单</th>
                <th class="sub">本单</th>
                <th class="sub cur">累计</th>
                <th class="sub">上单</th>
                <th class="sub">本单</th>
                <th class="sub cur">累计</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in colorRows" :key="c.name">
                <td class="c-name">{{ c.name }}</td>
                <td class="num">{{ c.last.qty }}</td>
                <td class="num">{{ c.current.qty }}</td>
                <td class="num strong">{{ c.total.qty }}</td>
                <td class="num">{{ n3(c.last.netWeight) }}</td>
                <td class="num">{{ n3(c.current.netWeight) }}</td>
                <td class="num strong">{{ n3(c.total.netWeight) }}</td>
                <td class="num">{{ n3(c.last.addLossWeight) }}</td>
                <td class="num">{{ n3(c.current.addLossWeight) }}</td>
                <td class="num strong">{{ n3(c.total.addLossWeight) }}</td>
                <td class="num">{{ money(c.last.amount) }}</td>
                <td class="num">{{ money(c.current.amount) }}</td>
                <td class="num strong red-text">{{ money(c.total.amount) }}</td>
              </tr>
              <tr class="sum" v-if="colorRows.length">
                <td class="c-name">合计</td>
                <td class="num">{{ colorSum.last.qty }}</td>
                <td class="num">{{ colorSum.current.qty }}</td>
                <td class="num strong">{{ colorSum.total.qty }}</td>
                <td class="num">{{ n3(colorSum.last.netWeight) }}</td>
                <td class="num">{{ n3(colorSum.current.netWeight) }}</td>
                <td class="num strong">{{ n3(colorSum.total.netWeight) }}</td>
                <td class="num">{{ n3(colorSum.last.addLossWeight) }}</td>
                <td class="num">{{ n3(colorSum.current.addLossWeight) }}</td>
                <td class="num strong">{{ n3(colorSum.total.addLossWeight) }}</td>
                <td class="num">{{ money(colorSum.last.amount) }}</td>
                <td class="num">{{ money(colorSum.current.amount) }}</td>
                <td class="num strong red-text">{{ money(colorSum.total.amount) }}</td>
              </tr>
              <tr v-else>
                <td colspan="13" class="empty">该范围内没有出货数据</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="split-note">
          按成色只算出货（销售行）：上单 = 查询起始日之前的全部历史，本单 = 查询范围，累计 = 上单 + 本单。上面的净重 / 加耗 / 钻石与按成色的「累计」列同源（全部 LR）；收入 / 开支 / 应收 / 利润来自账单累计，都不受查询时间影响。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // GET /lr/sheet 返回的 data（用 inout / ledger / colorSummary 三段）
  sheet: { type: Object, default: null },
  // 进销存块标题里显示的“查询范围”，如「2026-11」「今天」「全部」
  rangeLabel: { type: String, default: '' },
});

const emptySide = () => ({ qty: 0, netWeight: 0, addLossWeight: 0, stoneWeight: 0, amount: 0 });

const emptyData = {
  colorSummary: {
    sum: { last: emptySide(), current: emptySide(), total: emptySide() },
    rows: [],
  },
  inout: {
    gold: { inAmount: 0, outAmount: 0, inWeight: 0, outWeight: 0 },
    diamond: { inAmount: 0, outAmount: 0, inCarat: 0, outCarat: 0 },
    expense: { inAmount: 0, outAmount: 0 },
    total: { inAmount: 0, outAmount: 0, net: 0 },
  },
  ledger: {
    lrCount: 0, income: 0, expense: 0, net: 0, totalReceivable: 0, totalProfit: 0,
    received: 0, debt: 0, latestLrId: null, latestBillNo: '', latestBillDate: null,
  },
};

const data = computed(() => props.sheet || emptyData);
const inout = computed(() => data.value.inout || emptyData.inout);
const ledger = computed(() => data.value.ledger || emptyData.ledger);
const colorSummary = computed(() => data.value.colorSummary || emptyData.colorSummary);
const colorRows = computed(() => colorSummary.value.rows || []);
const colorSum = computed(() => colorSummary.value.sum || emptyData.colorSummary.sum);

const ledgerHint = computed(() => {
  const l = ledger.value;
  if (!l.latestLrId) return '全公司 · 不受查询时间控制';
  const day = l.latestBillDate ? String(l.latestBillDate).slice(0, 10) : '';
  return `全公司 · 截至最新一张 LR${l.latestBillNo ? '（' + l.latestBillNo + (day ? ' · ' + day : '') + '）' : ''}`;
});

const money = (v) => (Number(v) || 0).toFixed(2);
const n3 = (v) => (v === null || v === undefined || v === '' ? '' : Number(v).toFixed(3));
const w2 = (v) => (Number(v) || 0).toFixed(2);
const w3 = (v) => (Number(v) || 0).toFixed(3);
const signClass = (v) => (Number(v) >= 0 ? 'red' : 'blue');
</script>

<style scoped>
/* ===== 两块并排：左 进销存 / 右 汇总 ===== */
.stat-row {
  display: grid;
  /* 进销存 6 列，窄一些；汇总要塞 KPI + 13 列按成色表，给宽 */
  grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
  gap: 10px;
  align-items: stretch;
}
@media (max-width: 1500px) {
  .stat-row { grid-template-columns: minmax(0, 1fr); }
}

.panel {
  border: 1px solid #e2e7ef;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.panel-h {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f7f9fc;
  border-bottom: 1px solid #e2e7ef;
  font-weight: 650;
  font-size: 13px;
  color: #1d2129;
}
.panel-h .hint { font-weight: 400; color: #8a94a3; font-size: 11.5px; }
.panel-body { padding: 8px 12px 10px; }

/* 汇总块内的小标题（累计 / 按成色） */
.sub-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 2px 0 6px;
  font-size: 12.5px;
  font-weight: 650;
  color: #1d2129;
}
.sub-title + .sub-title { margin-top: 12px; }
.sub-title .st-hint { font-weight: 400; color: #8a94a3; font-size: 11.5px; }

/* 表格通用（进销存块） */
.cmp-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.cmp-table th,
.cmp-table td {
  border: 1px solid #e6eaf1;
  padding: 4px 8px;
  font-size: 12px;
  white-space: nowrap;
  font-weight: 400;
}
.cmp-table th { background: #fafbfd; color: #475569; font-weight: 600; text-align: center; }
.cmp-table th.idx,
.cmp-table td.idx {
  text-align: left;
  color: #475569;
  width: 150px;
  background: #fcfdff;
  font-weight: 600;
}
.cmp-table td.num { text-align: right; font-family: Consolas, monospace; color: #1d2129; }
.cmp-table td.muted { color: #c3cad4; }
.cmp-table tr.sum td { background: #f7f9fc; font-weight: 650; }
.cmp-table td.strong { font-weight: 700; }
.cmp-table .red { color: #d64545; }
.cmp-table .blue { color: #2b6cb0; }

/* 进销存表：6 列 */
.inout-table th.idx, .inout-table td.idx { width: 90px; }
.inout-table th.sub { font-weight: 500; background: #fcfdff; color: #6b7785; font-size: 11.5px; }

/* 按成色三段表：成色 + 4 组（件数 / 净重 / 加耗 / 应收）× 上单 · 本单 · 累计 */
.color-scroll { overflow-x: auto; padding-bottom: 2px; }
.color-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}
.color-table th,
.color-table td {
  border: 1px solid #e6eaf1;
  padding: 4px 6px;
  font-size: 12px;
  white-space: nowrap;
  font-weight: 400;
}
.color-table thead th { background: #fafbfd; color: #475569; font-weight: 600; text-align: center; }
.color-table thead th.sub { font-weight: 500; background: #fcfdff; color: #6b7785; font-size: 11.5px; }
.color-table thead th.cur { color: #c0392b; }
.color-table td.c-name { text-align: left; font-weight: 600; color: #475569; background: #fcfdff; }
.color-table th.c-name { width: 78px; }
.color-table td.num { text-align: right; font-family: Consolas, monospace; color: #1d2129; }
.color-table td.strong { font-weight: 700; }
.color-table tr.sum td { background: #f7f9fc; font-weight: 650; }
.color-table tr.sum td.c-name { background: #f2f5fa; }
.color-table td.empty { text-align: center; color: #8a94a3; padding: 14px 0; }
.color-table .red-text { color: #d64545; }

.split-note {
  margin-top: 8px;
  font-size: 11.5px;
  color: #6b7785;
  line-height: 1.7;
}
.split-note b { color: #1d2129; font-family: Consolas, monospace; }

/* 累计 KPI */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.kpi {
  border: 1px solid #e2e7ef;
  border-radius: 5px;
  padding: 8px 10px;
  background: #fbfcfe;
  min-width: 0;
}
.kpi .k { font-size: 11.5px; color: #6b7785; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kpi .v {
  font-size: 14.5px;
  font-weight: 650;
  margin-top: 3px;
  font-family: Consolas, monospace;
  color: #1d2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kpi .v.red { color: #d64545; }
.kpi .v.blue { color: #2b6cb0; }
</style>
