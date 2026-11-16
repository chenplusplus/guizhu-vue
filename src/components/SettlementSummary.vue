<!-- src/components/SettlementSummary.vue
     ⭐ 进销存「结算单」式汇总（金料 / 钻石 / 费用共用）
     版式对齐纸质客户结算单：抬头三段（上单 / 本单 / 累计）→ 按项目分行 → 本单按对象拆开 + 合计
     口径：上单 = 起始日之前的已生效结存；本单 = 区间发生额；累计 = 上单 + 本单
-->
<template>
  <div class="settle-card" v-loading="loading">
    <div class="st-head">
      <div class="st-title">
        <span class="st-name">{{ cfg.title }}</span>
        <span class="st-note">上单 = 本期之前　本单 = 本期发生　累计 = 上单 ± 本单　只统计已生效单据（草稿 / 待审不计）</span>
      </div>
      <div class="st-period">{{ periodText }}</div>
    </div>

    <!-- 抬头三段 -->
    <div class="st-cards">
      <div class="st-card" v-for="c in cards" :key="c.key">
        <div class="sc-label">{{ c.label }}<span class="sc-tag">{{ c.tag }}</span></div>
        <div class="sc-value" :class="c.valueClass">
          {{ c.value }}<span class="sc-unit" v-if="c.unit">{{ c.unit }}</span>
        </div>
        <div class="sc-sub">{{ c.sub }}</div>
      </div>
    </div>

    <!-- 表一：按项目看 -->
    <div class="st-sec">一、按项目看（上单 / 本单 / 累计）</div>
    <table class="st-table t-metrics">
      <thead>
        <tr>
          <th class="col-name">项目</th>
          <th>上单</th>
          <th>本单</th>
          <th>累计</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(m, i) in cfg.metrics" :key="m.key + i">
          <tr v-if="m.group && (i === 0 || cfg.metrics[i - 1].group !== m.group)" class="group-row">
            <td :colspan="4">{{ m.group }}</td>
          </tr>
          <tr>
            <td class="col-name">{{ m.label }}</td>
            <td class="num muted">{{ cell(m, 'last') }}</td>
            <td class="num" :class="signedClass(val('current', m.key))">{{ cell(m, 'current', true) }}</td>
            <td class="num strong">{{ cell(m, 'total') }}</td>
          </tr>
        </template>
      </tbody>
    </table>

    <!-- 表二：按对象拆开（金料按成色看折足金的上单/本单/累计） -->
    <div class="st-sec">{{ cfg.detailTitle || `二、本单按${cfg.dimLabel}拆开` }}</div>
    <table class="st-table t-detail" v-if="rows.length && hasCurrent">
      <thead>
        <tr>
          <th class="col-name">{{ cfg.dimLabel }}</th>
          <th v-for="c in cfg.detail" :key="c.key">{{ c.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.name">
          <td class="col-name">{{ r.name }}</td>
          <td v-for="c in cfg.detail" :key="c.key" class="num"
              :class="[c.net ? signedClass(valOf(r, c.seg || 'current', c.key)) : '', c.strong ? 'strong' : '']">
            {{ cellSeg(c, valOf(r, c.seg || 'current', c.key)) }}
          </td>
        </tr>
        <tr class="sum-row">
          <td class="col-name">合计</td>
          <td v-for="c in cfg.detail" :key="c.key" class="num" :class="c.strong ? 'strong' : ''">
            {{ cellSeg(c, val(c.seg || 'current', c.key)) }}
          </td>
        </tr>
      </tbody>
    </table>
    <div class="st-empty" v-else>本单区间内没有已生效的发生额（草稿 / 待审不计入）</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { getInoutSettlement } from '@/api/inout'

const props = defineProps({
  type: { type: String, default: 'gold' },
  // 与列表完全同源：{ startDate, endDate, status, keyword, productName, content }
  filters: { type: Object, default: () => ({}) }
})

const CFG = {
  gold: {
    title: '金料结算汇总',
    dimLabel: '成色',
    cards: [
      { key: 'last', label: '上单结存（折足金）', tag: '本期之前', main: 'foldWeight', unit: 'g',
        sub: d => `金重 ${num(d.weight)} g　金额 ${money(d.amount)}` },
      { key: 'current', label: '本单发生（折足金）', tag: '本期内', main: 'foldWeight', unit: 'g', signed: true,
        sub: d => `收进 ${num(d.inFold)} / 发出 ${num(d.outFold)} g　${money(d.amount)}` },
      { key: 'total', label: '累计结存（折足金）', tag: '截至期末', main: 'foldWeight', unit: 'g',
        sub: d => `金重 ${num(d.weight)} g　金额 ${money(d.amount)}` }
    ],
    metrics: [
      { group: '重量：按成色折算率折成足金（折足金 = 加耗总重 × 折算率）', label: '金重 (g)', key: 'weight', dec: 2 },
      { label: '加耗总重 (g)', key: 'totalWeight', dec: 2 },
      { label: '折足金 (g)', key: 'foldWeight', dec: 3, strong: true },
      { group: '金额与费用', label: '金额 (元)', key: 'amount', dec: 2, money: true },
      { label: '补口重 (g)', key: 'mouthWeight', dec: 2 },
      { label: '补口金额 (元)', key: 'mouthAmount', dec: 2, money: true },
      { label: '补钯金费 (元)', key: 'patchFee', dec: 2, money: true },
      { label: '工费 (元)', key: 'laborFee', dec: 2, money: true }
    ],
    detailTitle: '二、按成色看折足金（上单 / 本单 / 累计）',
    detail: [
      { label: '折算率', key: 'foldRate', dec: 4, seg: 'total' },
      { label: '上单折足金 (g)', key: 'foldWeight', dec: 3, seg: 'last' },
      { label: '本单折足金 (g)', key: 'foldWeight', dec: 3, seg: 'current', net: true, strong: true },
      { label: '累计折足金 (g)', key: 'foldWeight', dec: 3, seg: 'total', strong: true },
      { label: '本单金重收进', key: 'inWeight', dec: 2, seg: 'current' },
      { label: '本单金重发出', key: 'outWeight', dec: 2, seg: 'current' },
      { label: '本单金额 (元)', key: 'amount', dec: 2, seg: 'current', money: true, net: true }
    ]
  },
  diamond: {
    title: '钻石结算汇总',
    dimLabel: '供应商',
    cards: [
      { key: 'last', label: '上单结存', tag: '本期之前', main: 'stockCarat', unit: 'ct', sub: d => '未付 ' + money(d.unpaidAmount) },
      { key: 'current', label: '本单发生', tag: '本期内', main: 'stockCarat', unit: 'ct', signed: true,
        sub: d => `入库 ${num(d.inCarat)} / 出库 ${num(d.outCarat)} ct　采购 ${money(d.purchaseAmount)}` },
      { key: 'total', label: '累计结存', tag: '截至期末', main: 'stockCarat', unit: 'ct', sub: d => '未付 ' + money(d.unpaidAmount) }
    ],
    metrics: [
      { group: '石重（买进 − 出去，出库含订单出库）', label: '库存 (ct)', key: 'stockCarat', dec: 2 },
      { group: '钱（只算采购入库，出库卖货不进供应商应付）', label: '采购金额 (元)', key: 'purchaseAmount', dec: 2, money: true },
      { label: '已付 (元)', key: 'paidAmount', dec: 2, money: true },
      { label: '未付 (元)', key: 'unpaidAmount', dec: 2, money: true }
    ],
    detail: [
      { label: '入库 (ct)', key: 'inCarat', dec: 2 },
      { label: '出库 (ct)', key: 'outCarat', dec: 2 },
      { label: '订单出库 (ct)', key: 'orderOutCarat', dec: 2 },
      { label: '净增 (ct)', key: 'stockCarat', dec: 2, net: true },
      { label: '采购 (元)', key: 'purchaseAmount', dec: 2, money: true },
      { label: '付款 (元)', key: 'paidAmount', dec: 2, money: true },
      { label: '本单未付 (元)', key: 'unpaidAmount', dec: 2, money: true, net: true }
    ]
  },
  expense: {
    title: '费用结算汇总',
    dimLabel: '往来单位',
    cards: [
      { key: 'last', label: '上单结存', tag: '本期之前', main: 'netAmount', unit: '', money: true,
        sub: d => `收入 ${money(d.inAmount)} / 支出 ${money(d.outAmount)}` },
      { key: 'current', label: '本单发生', tag: '本期内', main: 'netAmount', unit: '', money: true, signed: true,
        sub: d => `收入 ${money(d.inAmount)} / 支出 ${money(d.outAmount)}` },
      { key: 'total', label: '累计结存', tag: '截至期末', main: 'netAmount', unit: '', money: true,
        sub: d => `收入 ${money(d.inAmount)} / 支出 ${money(d.outAmount)}` }
    ],
    metrics: [
      { label: '收入 (元)', key: 'inAmount', dec: 2, money: true },
      { label: '支出 (元)', key: 'outAmount', dec: 2, money: true },
      { label: '净额 (元)', key: 'netAmount', dec: 2, money: true }
    ],
    detail: [
      { label: '收入 (元)', key: 'inAmount', dec: 2, money: true },
      { label: '支出 (元)', key: 'outAmount', dec: 2, money: true },
      { label: '净额 (元)', key: 'netAmount', dec: 2, money: true, net: true }
    ]
  }
}

const cfg = computed(() => CFG[props.type] || CFG.gold)
const loading = ref(false)
const data = ref({ sum: { last: {}, current: {}, total: {} }, rows: [], period: {} })

const rows = computed(() => data.value.rows || [])
const period = computed(() => data.value.period || {})

const periodText = computed(() => {
  const s = period.value.startDate ? String(period.value.startDate).slice(0, 10) : ''
  const e = period.value.endDate ? String(period.value.endDate).slice(0, 10) : ''
  if (!s && !e) return '全部日期　（未选起始日，没有"上单"，本单即全部）'
  if (s && e) return `${s} ~ ${e}`
  return s ? `${s} 起` : `截至 ${e}`
})

const round = (v, d = 2) => Math.round(Number(v || 0) * Math.pow(10, d)) / Math.pow(10, d)
const num = (v, d = 2) => round(v, d).toFixed(d)
const money = (v) => {
  const n = round(v)
  return (n < 0 ? '-¥' : '¥') + Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const signed = (v, d = 2, isMoney = false) => {
  const n = round(v, d)
  if (n === 0) return isMoney ? money(0) : (0).toFixed(d)
  const body = isMoney ? money(Math.abs(n)).replace('-¥', '¥') : Math.abs(n).toFixed(d)
  return (n > 0 ? '+' : '-') + body
}

const val = (seg, key) => Number(data.value.sum?.[seg]?.[key] || 0)
const valOf = (row, seg, key) => Number(row?.[seg]?.[key] || 0)

// 没选起始日就没有"上单"，直接显示破折号，避免让人以为结存是 0
const hasStart = computed(() => !!period.value.startDate)
// 本单完全没有发生额时，表二不展示一排 0
const hasCurrent = computed(() => {
  const keys = cfg.value.detail.filter(d => (d.seg || 'current') === 'current').map(d => d.key)
  return rows.value.some(r => keys.some(k => Math.abs(Number(r?.current?.[k] || 0)) > 0.0001))
})

const signedClass = (v) => {
  const n = round(v)
  return n > 0 ? 'pos' : n < 0 ? 'neg' : ''
}

const fmtCell = (m, v, forceSigned) => {
  if (m.money) return forceSigned ? signed(v, m.dec, true) : money(v)
  return forceSigned ? signed(v, m.dec) : num(v, m.dec)
}

const cell = (m, seg, forceSigned) => fmtCell(m, val(seg, m.key), forceSigned)

// 上单段：没选起始日期时不成立，显示破折号
const cellSeg = (m, v) => (m.seg === 'last' && !hasStart.value) ? '—' : fmtCell(m, v, m.net)

const cards = computed(() => cfg.value.cards.map(c => {
  const seg = data.value.sum?.[c.key] || {}
  // 上单：列表没选起始日期时不成立，显示破折号
  if (c.key === 'last' && !hasStart.value) {
    return {
      key: c.key, label: c.label, tag: c.tag, unit: '',
      value: '—', sub: '未选起始日期，不计上单', valueClass: 'is-empty'
    }
  }
  const main = Number(seg[c.main] || 0)
  const isMoney = !!c.money
  let value
  if (isMoney) value = c.signed ? signed(main, 2, true) : money(main)
  else value = c.signed ? signed(main, 2) : num(main, 2)
  return {
    key: c.key,
    label: c.label,
    tag: c.tag,
    unit: isMoney ? '' : c.unit,
    value,
    sub: c.sub(seg),
    valueClass: c.signed ? signedClass(main) : ''
  }
}))

const load = async () => {
  loading.value = true
  try {
    const res = await getInoutSettlement({ type: props.type, ...props.filters })
    if (res?.success) data.value = res.data || data.value
  } catch { /* 汇总失败不影响列表 */ }
  finally { loading.value = false }
}

watch(() => props.filters, load, { deep: true })
onMounted(load)
</script>

<style scoped>
.settle-card {
  background: #fff;
  border: 1px solid #e8eef6;
  border-radius: 8px;
  padding: 14px 16px 16px;
  margin-bottom: 12px;
}
.st-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.st-title { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.st-name { font-size: 15px; font-weight: 600; color: #303133; }
.st-note { font-size: 12px; color: #a8abb2; }
.st-period { font-size: 12px; color: #909399; font-variant-numeric: tabular-nums; }

.st-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
.st-card { background: #f7f9fc; border: 1px solid #e9eff7; border-radius: 6px; padding: 10px 14px; }
.st-card:nth-child(2) { background: #f5f9ff; border-color: #d9e7fa; }
.sc-label { font-size: 12px; color: #606266; margin-bottom: 5px; display: flex; align-items: center; gap: 6px; }
.sc-tag { font-size: 11px; color: #a8abb2; background: #fff; border: 1px solid #e4eaf2; border-radius: 8px; padding: 0 6px; line-height: 16px; }
.sc-value { font-size: 22px; font-weight: 600; color: #303133; line-height: 1.25; font-variant-numeric: tabular-nums; }
.sc-value.pos { color: #2f9e5f; }
.sc-value.neg { color: #d94a4a; }
.sc-value.is-empty { color: #c0c4cc; font-size: 20px; }
.sc-unit { font-size: 12px; font-weight: 400; color: #909399; margin-left: 3px; }
.sc-sub { font-size: 12px; color: #909399; margin-top: 5px; font-variant-numeric: tabular-nums; }

.st-sec { font-size: 13px; font-weight: 600; color: #303133; margin: 4px 0 8px; }
.st-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; font-variant-numeric: tabular-nums; }
.st-table th, .st-table td { border: 1px solid #ebeef5; padding: 7px 10px; }
.st-table th { background: #f7f9fc; color: #606266; font-weight: 500; text-align: right; white-space: nowrap; }
.st-table th.col-name, .st-table td.col-name { text-align: left; }
.st-table th:first-child { text-align: left; }
.st-table td { color: #303133; }
.st-table td.num { text-align: right; }
.st-table td.muted { color: #909399; }
.st-table td.strong { font-weight: 600; color: #303133; }
.st-table td.pos { color: #2f9e5f; }
.st-table td.neg { color: #d94a4a; }
.st-table .group-row td { background: #fafcff; color: #606266; font-size: 12px; font-weight: 500; }
.st-table .sum-row td { background: #f7f9fc; font-weight: 600; }
.st-empty { font-size: 13px; color: #a8abb2; padding: 18px 0; text-align: center; }

/* 列宽：项目列占大头，数值列均分剩余，避免 4 列铺满整屏显得空 */
.st-table.t-metrics { table-layout: fixed; }
.st-table.t-metrics th.col-name { width: 40%; }
.st-table.t-detail { table-layout: fixed; font-size: 12.5px; }
.st-table.t-detail th, .st-table.t-detail td { padding: 6px 6px; white-space: nowrap; }
.st-table.t-detail th.col-name { width: 14%; }

@media (max-width: 900px) {
  .st-cards { grid-template-columns: 1fr; }
}
</style>
