<!-- src/components/LrSummaryPanels.vue
     经营看板底部「LR 汇总」——2026-11-19 改版为上下三段（原来是左右并排，右侧 13 列挤不下）：
       ① 累计总览：全公司资金 5 项 + 产量 5 项，全宽 KPI 卡
       ② 按成色出货：14 列明细表，全宽展示
       ③ 进销存（查询范围内）：仅进销存单据
     数据全部来自 GET /lr/sheet 的 inout / ledger / colorSummary 三段，本组件只负责展示。
-->
<template>
  <div class="lr-stack">
    <!-- ① 累计总览 -->
    <section class="panel">
      <div class="panel-h">
        <span class="step">①</span>
        <span class="t">累计总览</span>
        <span class="hint">{{ ledgerHint }}</span>
      </div>
      <div class="panel-body">
        <div class="kpi-block">
          <div class="kpi-row-label">资金（全公司累计）</div>
          <div class="kpi-grid">
            <div class="kpi kpi-income">
              <div class="k">累计收入</div>
              <div class="v in">¥{{ money(ledger.income) }}</div>
              <div class="u">账应收 − 抵扣 + 金/钻出 + 费用入</div>
            </div>
            <div class="kpi kpi-expense">
              <div class="k">累计开支</div>
              <div class="v out">¥{{ money(ledger.expense) }}</div>
              <div class="u">金入 + 钻入 + 费用出</div>
            </div>
            <div class="kpi kpi-net">
              <div class="k">收支净额</div>
              <div class="v" :class="ledger.net >= 0 ? 'pos' : 'neg'">
                {{ ledger.net >= 0 ? '+' : '−' }}¥{{ money(Math.abs(ledger.net)) }}
              </div>
              <div class="u">收入 − 开支</div>
            </div>
            <div class="kpi">
              <div class="k">累计已收</div>
              <div class="v">¥{{ money(ledger.received) }}</div>
              <div class="u">账单已收 + 散收</div>
            </div>
            <div class="kpi kpi-due">
              <div class="k">应收尚欠</div>
              <div class="v">¥{{ money(ledger.totalReceivable) }}</div>
              <div class="u">应收 − 已收 − 抵扣</div>
            </div>
          </div>
        </div>

        <div class="kpi-block">
          <div class="kpi-row-label">产量与其他</div>
          <div class="kpi-grid">
            <div class="kpi">
              <div class="k">累计利润</div>
              <div class="v" :class="ledger.totalProfit >= 0 ? 'pos' : 'neg'">
                {{ ledger.totalProfit >= 0 ? '+' : '−' }}¥{{ money(Math.abs(ledger.totalProfit)) }}
              </div>
              <div class="u">LR 销售 − LR 成本</div>
            </div>
            <div class="kpi">
              <div class="k">累计 LR 份数</div>
              <div class="v">{{ ledger.lrCount }} <em>份</em></div>
              <div class="u">审核通过生成</div>
            </div>
            <div class="kpi">
              <div class="k">出货净重</div>
              <div class="v">{{ w3(colorSum.total.netWeight) }} <em>g</em></div>
              <div class="u">不含加耗</div>
            </div>
            <div class="kpi">
              <div class="k">出货加耗重</div>
              <div class="v">{{ w3(colorSum.total.addLossWeight) }} <em>g</em></div>
              <div class="u">净重 × 损耗率</div>
            </div>
            <div class="kpi">
              <div class="k">钻石出货</div>
              <div class="v">{{ w2(colorSum.total.stoneWeight) }} <em>ct</em></div>
              <div class="u">主石 + 副石</div>
            </div>
          </div>
        </div>

        <!-- ⭐ 2026-11-20 日结：上单（1号~昨天）/ 本单（今天）/ 累计（本月至今） -->
        <div class="kpi-block">
          <div class="kpi-row-label">
            本月日结
            <span class="db-basis">上单 + 本单 = 累计 · {{ bookBasis }}</span>
          </div>
          <table class="db-table">
            <tbody>
              <tr>
                <td><span class="db-k">上单钻石利润</span><b class="db-v">{{ ymoney(book.last.diamondProfit) }}</b></td>
                <td><span class="db-k">上单镶石利润</span><b class="db-v">{{ ymoney(book.last.settingProfit) }}</b></td>
                <td><span class="db-k">上单工费利润</span><b class="db-v">{{ ymoney(book.last.laborProfit) }}</b></td>
                <td class="hl"><span class="db-k">上单应收金额总利润</span><b class="db-v">{{ ymoney(book.last.totalProfit) }}</b></td>
              </tr>
              <tr>
                <td><span class="db-k">本单钻石利润</span><b class="db-v">{{ ymoney(book.current.diamondProfit) }}</b></td>
                <td><span class="db-k">本单镶石利润</span><b class="db-v">{{ ymoney(book.current.settingProfit) }}</b></td>
                <td><span class="db-k">本单工费利润</span><b class="db-v">{{ ymoney(book.current.laborProfit) }}</b></td>
                <td class="hl"><span class="db-k">本单应收金额总利润</span><b class="db-v">{{ ymoney(book.current.totalProfit) }}</b></td>
              </tr>
              <tr>
                <td><span class="db-k">累计钻石利润</span><b class="db-v">{{ ymoney(book.total.diamondProfit) }}</b></td>
                <td><span class="db-k">累计镶石利润</span><b class="db-v">{{ ymoney(book.total.settingProfit) }}</b></td>
                <td><span class="db-k">累计工费利润</span><b class="db-v">{{ ymoney(book.total.laborProfit) }}</b></td>
                <td class="hl"><span class="db-k">累计应收金额利润</span><b class="db-v">{{ ymoney(book.total.totalProfit) }}</b></td>
              </tr>
              <tr>
                <td><span class="db-k">上单每日收入</span><b class="db-v">{{ ymoney(book.last.income) }}</b></td>
                <td><span class="db-k">上单每日开支</span><b class="db-v">{{ ymoney(book.last.expense) }}</b></td>
                <td><span class="db-k">上单出货件数</span><b class="db-v">{{ book.last.qty }} <em>件</em></b></td>
                <td class="hl hl-due" rowspan="2">
                  <span class="db-k">应收总金额</span>
                  <b class="db-v">{{ ymoney(ledger.totalReceivable) }}</b>
                  <i class="db-u">未盘点客户应收汇总（全公司）</i>
                </td>
              </tr>
              <tr>
                <td><span class="db-k">本单每日收入</span><b class="db-v">{{ ymoney(book.current.income) }}</b></td>
                <td><span class="db-k">本单每日开支</span><b class="db-v">{{ ymoney(book.current.expense) }}</b></td>
                <td><span class="db-k">本单出货件数</span><b class="db-v">{{ book.current.qty }} <em>件</em></b></td>
              </tr>
              <tr>
                <td><span class="db-k">累计收入</span><b class="db-v">{{ ymoney(book.total.income) }}</b></td>
                <td><span class="db-k">累计开支</span><b class="db-v">{{ ymoney(book.total.expense) }}</b></td>
                <td><span class="db-k">累计出货件数</span><b class="db-v">{{ book.total.qty }} <em>件</em></b></td>
                <td class="hl hl-balance">
                  <span class="db-k">支出平衡总金额</span>
                  <b class="db-v">{{ ymoney(balanceAmount) }}</b>
                  <i class="db-u">应收总金额 + 总进总出收入 − 总进总出开支</i>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ② 按成色出货 -->
    <section class="panel">
      <div class="panel-h">
        <span class="step">②</span>
        <span class="t">按成色出货</span>
        <span class="hint">上单 = 起始日之前 · 本单 = 查询范围 · 累计 = 上单 + 本单（全部 LR）</span>
      </div>
      <div class="panel-body">
        <div class="color-scroll">
          <table class="color-table">
            <thead>
              <tr>
                <th rowspan="2" class="c-name">成色</th>
                <th colspan="3">件数</th>
                <th colspan="3">净重 (g)</th>
                <th colspan="3">加耗重 (g)</th>
                <th colspan="3">应收金额 (¥)</th>
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
                <td class="num cur strong">{{ c.total.qty }}</td>
                <td class="num">{{ n3(c.last.netWeight) }}</td>
                <td class="num">{{ n3(c.current.netWeight) }}</td>
                <td class="num cur strong">{{ n3(c.total.netWeight) }}</td>
                <td class="num">{{ n3(c.last.addLossWeight) }}</td>
                <td class="num">{{ n3(c.current.addLossWeight) }}</td>
                <td class="num cur strong">{{ n3(c.total.addLossWeight) }}</td>
                <td class="num">{{ money(c.last.amount) }}</td>
                <td class="num">{{ money(c.current.amount) }}</td>
                <td class="num cur strong red-text">{{ money(c.total.amount) }}</td>
              </tr>
              <tr class="sum" v-if="colorRows.length">
                <td class="c-name">合计</td>
                <td class="num">{{ colorSum.last.qty }}</td>
                <td class="num">{{ colorSum.current.qty }}</td>
                <td class="num cur strong">{{ colorSum.total.qty }}</td>
                <td class="num">{{ n3(colorSum.last.netWeight) }}</td>
                <td class="num">{{ n3(colorSum.current.netWeight) }}</td>
                <td class="num cur strong">{{ n3(colorSum.total.netWeight) }}</td>
                <td class="num">{{ n3(colorSum.last.addLossWeight) }}</td>
                <td class="num">{{ n3(colorSum.current.addLossWeight) }}</td>
                <td class="num cur strong">{{ n3(colorSum.total.addLossWeight) }}</td>
                <td class="num">{{ money(colorSum.last.amount) }}</td>
                <td class="num">{{ money(colorSum.current.amount) }}</td>
                <td class="num cur strong red-text">{{ money(colorSum.total.amount) }}</td>
              </tr>
              <tr v-else>
                <td colspan="13" class="empty">该范围内没有出货数据</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="split-note">
          只统计<b>出货（销售行）</b>：上单 = 查询起始日之前的全部历史，本单 = 查询范围，累计 = 上单 + 本单。
          上面的净重 / 加耗 / 钻石与这里「累计」列同源（全部 LR）；收入 / 开支 / 应收 / 利润来自账单累计，均不受查询时间影响。
        </div>
        <div class="check-line" :class="amtDiff.abs < 1 ? 'ok' : 'warn'">
          <span class="ck-tag">{{ amtDiff.abs < 1 ? '✓ 对得上' : '! 有差额' }}</span>
          按成色累计应收 <b>¥{{ money(colorSum.total.amount) }}</b>
          <i>vs</i> 账单应收累计 <b>¥{{ money(ledger.saleAmount) }}</b>
          <template v-if="amtDiff.abs >= 1">
            ，差 <b>¥{{ money(amtDiff.abs) }}</b>
            <template v-if="amtDiff.diff < 0">
              （账单多）—— 这部分账单还没生成 LR（明细未全部审核通过），所以不在这里统计
            </template>
            <template v-else>
              （LR 多）—— 多为已退回的明细还留在旧 LR 里，退回后会重建 LR
            </template>
          </template>
        </div>
      </div>
    </section>

    <!-- ③ 进销存（查询范围内） -->
    <section class="panel">
      <div class="panel-h">
        <span class="step">③</span>
        <span class="t">进销存</span>
        <span class="hint">{{ rangeLabel ? rangeLabel + ' · ' : '' }}仅进销存单据，不含成品账单</span>
      </div>
      <div class="panel-body">
        <div class="inout-row">
          <table class="cmp-table">
            <thead>
              <tr>
                <th class="idx" rowspan="2">类别</th>
                <th colspan="2" class="grp expense-grp">入库（付钱 · 支出）</th>
                <th colspan="2" class="grp income-grp">出库（收钱 · 收入）</th>
                <th rowspan="2" class="grp">净额（出 − 入）</th>
              </tr>
              <tr>
                <th class="sub">重量</th>
                <th class="sub">金额</th>
                <th class="sub">重量</th>
                <th class="sub">金额</th>
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

          <div class="inout-side">
            <div class="side-item">
              <span class="s-k">出库收钱（收入）</span>
              <span class="s-v in">¥{{ money(inout.total.outAmount) }}</span>
            </div>
            <div class="side-item">
              <span class="s-k">入库付钱（支出）</span>
              <span class="s-v out">¥{{ money(inout.total.inAmount) }}</span>
            </div>
            <div class="side-item net">
              <span class="s-k">本范围净额</span>
              <span class="s-v" :class="inout.total.outAmount - inout.total.inAmount >= 0 ? 'in' : 'out'">
                {{ inout.total.outAmount - inout.total.inAmount >= 0 ? '+' : '−' }}¥{{
                  money(Math.abs(inout.total.outAmount - inout.total.inAmount)) }}
              </span>
            </div>
            <div class="side-note">
              金 / 钻：入库 = 买料付钱、出库 = 卖料收钱；费用方向相反。成品账单出货不在这里，见上方「账单收入」与②的应收。
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // GET /lr/sheet 返回的 data（用 inout / ledger / colorSummary 三段）
  sheet: { type: Object, default: null },
  // 进销存块标题里显示的“查询范围”，如「2026-11」「今天」「全部」
  rangeLabel: { type: String, default: '' },
  // ⭐ 2026-11-20 日结：上单（本月1号~昨天）/ 本单（今天）/ 累计（本月至今）
  dayBook: { type: Object, default: null },
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
  return `全公司 · 截至最新一张 LR${l.latestBillNo ? '（' + l.latestBillNo + (day ? ' · ' + day : '') + '）' : ''} · 不受查询时间控制`;
});

// ② 与账单应收的差额：按成色（LR 销售行）累计应收 vs 账单累计应收
const amtDiff = computed(() => {
  const lrAmt = Number(colorSum.value.total?.amount || 0);
  const billAmt = Number(ledger.value.saleAmount || 0);
  const diff = Math.round((lrAmt - billAmt) * 100) / 100;
  return { diff, abs: Math.abs(diff) };
});

// ⭐ 日结（上单 / 本单 / 累计）：数据来自 /operating-dashboard/summary 的 dayBook
const emptyBook = () => ({
  income: 0, expense: 0, net: 0, qty: 0,
  diamondProfit: 0, settingProfit: 0, laborProfit: 0, totalProfit: 0,
});
const book = computed(() => {
  const b = props.dayBook || {};
  return {
    last: { ...emptyBook(), ...(b.last || {}) },
    current: { ...emptyBook(), ...(b.current || {}) },
    total: { ...emptyBook(), ...(b.total || {}) },
  };
});

const bookBasis = computed(() => {
  const b = props.dayBook || {};
  if (!b.monthStart || !b.today) return '上单 = 1号至昨天 · 本单 = 今天 · 累计 = 本月至今';
  const md = (s) => {
    const [, m, d] = String(s).slice(0, 10).split('-');
    return `${Number(m)}月${Number(d)}日`;
  };
  const t = new Date(String(b.today).slice(0, 10) + 'T00:00:00');
  t.setDate(t.getDate() - 1);
  const pad = (n) => String(n).padStart(2, '0');
  const yday = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  return `上单 ${md(b.monthStart)}~${md(yday)} · 本单 ${md(b.today)} · 累计 ${md(b.monthStart)}~${md(b.today)}`;
});

// 支出平衡 = 应收总金额 + 总进总出收入 − 总进总出开支（全公司累计）
const balanceAmount = computed(() => {
  const l = ledger.value;
  return Math.round((Number(l.totalReceivable || 0) + Number(l.income || 0) - Number(l.expense || 0)) * 100) / 100;
});

const money = (v) => (Number(v) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ymoney = (v) => '¥' + money(v);
const n3 = (v) => (v === null || v === undefined || v === '' ? '' : Number(v).toFixed(3));
const w2 = (v) => (Number(v) || 0).toFixed(2);
const w3 = (v) => (Number(v) || 0).toFixed(3);
const signClass = (v) => (Number(v) >= 0 ? 'red' : 'blue');
</script>

<style scoped>
/* ===== 上下三段：① 累计总览 / ② 按成色 / ③ 进销存 ===== */
.lr-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel {
  border: 1px solid #e2e7ef;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.panel-h {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(180deg, #f8fafd, #f4f7fc);
  border-bottom: 1px solid #e2e7ef;
  font-size: 14px;
  color: #1d2129;
}
.panel-h .step {
  width: 20px; height: 20px; border-radius: 50%;
  background: #e8effa; color: #2f6fd0;
  font-size: 12px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
}
.panel-h .t { font-weight: 650; }
.panel-h .hint { font-weight: 400; color: #8a94a3; font-size: 12px; }
.panel-body { padding: 12px 14px 14px; }

/* ===== ① KPI ===== */
.kpi-block + .kpi-block { margin-top: 14px; }
.kpi-row-label {
  font-size: 12px;
  color: #8a94a3;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.kpi-row-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #eef1f6;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}
.kpi {
  border: 1px solid #e6eaf1;
  border-left: 3px solid #dfe5ee;
  border-radius: 6px;
  padding: 10px 12px 9px;
  background: #fcfdff;
  min-width: 0;
}
.kpi-income { border-left-color: #4b8bdd; background: #f8fbff; }
.kpi-expense { border-left-color: #d64545; background: #fefafa; }
.kpi-net { border-left-color: #4b8bdd; background: #f8fbff; }
.kpi-due { border-left-color: #c0392b; background: #fef9f8; }
.kpi .k { font-size: 12px; color: #6b7785; white-space: nowrap; }
.kpi .v {
  font-size: 19px;
  font-weight: 700;
  margin: 4px 0 3px;
  font-family: Consolas, Menlo, monospace;
  color: #1d2129;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.kpi .v em { font-style: normal; font-size: 12px; font-weight: 500; color: #8a94a3; }
.kpi .v.pos { color: #c0392b; }
.kpi .v.neg { color: #2b6cb0; }
.kpi .v.in { color: #2b6cb0; }
.kpi .v.out { color: #c0392b; }
.kpi .u {
  font-size: 11px;
  color: #a3adba;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== ① 本月日结表（上单 / 本单 / 累计） ===== */
.db-basis { font-weight: 400; color: #8a94a3; font-size: 11.5px; }
.db-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.db-table td {
  border: 1px solid #e6eaf1;
  padding: 7px 10px;
  font-size: 12.5px;
  vertical-align: middle;
  background: #fcfdff;
}
.db-table td.hl { background: #fef9f8; }
.db-k { display: block; font-size: 11.5px; color: #2f6fd0; white-space: nowrap; }
.db-table td.hl .db-k { color: #c0392b; font-weight: 650; }
.db-v {
  display: block;
  margin-top: 2px;
  font-family: Consolas, Menlo, monospace;
  font-size: 15px;
  font-weight: 700;
  color: #1d2129;
  white-space: nowrap;
}
.db-v em { font-style: normal; font-size: 11px; color: #8a94a3; font-weight: 500; }
.db-u { display: block; margin-top: 2px; font-style: normal; font-size: 10.5px; color: #a3adba; line-height: 1.4; }
.db-table td.hl-due .db-v { color: #c0392b; }
.db-table td.hl-balance .db-v { color: #c0392b; }

/* ===== ② 按成色表 ===== */
.color-scroll { overflow-x: auto; }
.color-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  min-width: 1120px;
}
.color-table th,
.color-table td {
  border: 1px solid #e6eaf1;
  padding: 7px 8px;
  font-size: 12.5px;
  white-space: nowrap;
  font-weight: 400;
}
.color-table thead th {
  background: #f7f9fd;
  color: #475569;
  font-weight: 650;
  text-align: center;
}
.color-table thead th.c-name,
.color-table thead th.sub { font-weight: 600; }
.color-table thead th.sub { background: #fcfdff; color: #6b7785; font-size: 12px; }
.color-table thead th.cur { color: #c0392b; }
.color-table th.c-name { width: 96px; }
.color-table td.c-name { text-align: center; font-weight: 650; color: #475569; background: #fcfdff; }
.color-table td.num { text-align: right; font-family: Consolas, Menlo, monospace; color: #1d2129; }
.color-table td.strong { font-weight: 700; }
.color-table td.cur { background: #fdfbfb; }
.color-table tr.sum td { background: #f4f7fc; font-weight: 700; }
.color-table tr.sum td.c-name { background: #eaf0fa; }
.color-table td.empty { text-align: center; color: #8a94a3; padding: 20px 0; }
.color-table .red-text { color: #c0392b; }

/* ===== ③ 进销存表 ===== */
.cmp-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.cmp-table th,
.cmp-table td {
  border: 1px solid #e6eaf1;
  padding: 8px 10px;
  font-size: 12.5px;
  white-space: nowrap;
  font-weight: 400;
}
.cmp-table th { background: #f7f9fd; color: #475569; font-weight: 650; text-align: center; }
.cmp-table th.expense-grp { background: #fdf1ee; color: #b4553a; }
.cmp-table th.income-grp { background: #edf4fe; color: #2f6fd0; }
.cmp-table th.sub { font-weight: 500; background: #fcfdff; color: #6b7785; font-size: 12px; }
.cmp-table th.idx,
.cmp-table td.idx {
  text-align: center;
  color: #475569;
  width: 130px;
  background: #fcfdff;
  font-weight: 650;
}
.cmp-table td.num { text-align: center; font-family: Consolas, Menlo, monospace; color: #1d2129; }
.cmp-table td.muted { color: #c3cad4; }
.cmp-table tr.sum td { background: #f4f7fc; font-weight: 700; }
.cmp-table td.strong { font-weight: 700; }
.cmp-table .red { color: #c0392b; }
.cmp-table .blue { color: #2b6cb0; }

.split-note {
  margin-top: 10px;
  font-size: 11.5px;
  color: #7b8593;
  line-height: 1.75;
}
.split-note b { color: #1d2129; font-weight: 600; }

/* ③ 进销存：表 + 右侧小结 */
.inout-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  gap: 14px;
  align-items: start;
}
.inout-side {
  border: 1px solid #e6eaf1;
  border-radius: 8px;
  background: #fbfcfe;
  padding: 10px 12px;
}
.side-item {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  padding: 5px 0;
  font-size: 12.5px;
}
.side-item + .side-item { border-top: 1px dashed #e9edf4; }
.side-item.net { margin-top: 2px; border-top: 1px solid #dfe6f1; padding-top: 8px; }
.side-item .s-k { color: #6b7785; }
.side-item .s-v {
  font-family: Consolas, Menlo, monospace;
  font-weight: 700;
  font-size: 14px;
  color: #1d2129;
  white-space: nowrap;
}
.side-item .s-v.in { color: #2b6cb0; }
.side-item .s-v.out { color: #c0392b; }
.side-note {
  margin-top: 8px;
  font-size: 11.5px;
  color: #8a94a3;
  line-height: 1.7;
}

@media (max-width: 1280px) {
  .inout-row { grid-template-columns: minmax(0, 1fr); }
}

/* 核对行：按成色应收 vs 账单应收 */
.check-line {
  margin-top: 8px;
  padding: 7px 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.7;
  color: #4b5563;
  background: #f6f9f7;
  border: 1px solid #dfeee4;
}
.check-line.warn { background: #fdf8f3; border-color: #f3ddc6; color: #7a5936; }
.check-line .ck-tag {
  display: inline-block;
  margin-right: 8px;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11.5px;
  font-weight: 700;
  background: #e5f4ea;
  color: #2f8a52;
}
.check-line.warn .ck-tag { background: #fbe9d6; color: #b06a1f; }
.check-line b { color: #1d2129; font-family: Consolas, Menlo, monospace; }
.check-line i { font-style: normal; color: #9aa4b1; margin: 0 6px; }

@media (max-width: 1500px) {
  .kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
