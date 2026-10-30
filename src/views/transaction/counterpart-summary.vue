<template>
  <div class="counterpart-summary">
    <el-card>
      <template #header>
        <el-space wrap>
          <span>往来单位汇总</span>
          <el-date-picker
            v-model="yearMonth"
            type="month"
            value-format="YYYY-M"
            placeholder="选择月份"
            style="width:130px"
            @change="refresh"
          />
          <el-select v-model="filterParty" placeholder="往来单位筛选" clearable filterable style="width:220px" @change="refresh">
            <el-option-group label="客户">
              <el-option v-for="cp in partyOptions.customer" :key="cp.value" :label="cp.label" :value="cp.value" />
            </el-option-group>
            <el-option-group label="供应商">
              <el-option v-for="cp in partyOptions.supplier" :key="cp.value" :label="cp.label" :value="cp.value" />
            </el-option-group>
          </el-select>

          <el-radio-group v-model="view" size="default" @change="onViewChange">
            <el-radio-button label="summary">汇总视图</el-radio-button>
            <el-radio-button label="material">材质明细</el-radio-button>
          </el-radio-group>

          <el-button type="primary" @click="refresh">刷新</el-button>
          <el-button type="success" @click="handleExport">导出Excel</el-button>
        </el-space>

        <!-- 材质明细：口径 / 方向 / 显示控制 -->
        <div v-if="view === 'material'" class="sub-bar">
          <el-radio-group v-model="caliber" size="small" @change="loadMaterial">
            <el-radio-button label="weight">重量 g/ct</el-radio-button>
            <el-radio-button label="amount">金额 ¥</el-radio-button>
          </el-radio-group>

          <el-radio-group v-model="direction" size="small" @change="loadMaterial">
            <el-radio-button label="both">收支双列</el-radio-button>
            <el-radio-button label="net">净额</el-radio-button>
            <el-radio-button label="in">收入侧</el-radio-button>
            <el-radio-button label="out">支出侧</el-radio-button>
          </el-radio-group>

          <el-checkbox v-model="hideEmpty" size="small">仅显示有数据的列</el-checkbox>
          <el-button size="small" @click="transposed = !transposed">{{ transposed ? '往来单位 × 材质' : '材质 × 往来单位' }}</el-button>

          <span class="legend">
            <span class="lg"><i class="dot-gold"></i>金料</span>
            <span class="lg"><i class="dot-diamond"></i>钻石</span>
            <span class="lg"><i class="dot-expense"></i>费用</span>
            <span class="lg"><i class="dot-other"></i>其他材料</span>
          </span>
        </div>
      </template>

      <!-- ===================== 汇总视图 ===================== -->
      <template v-if="view === 'summary'">
        <el-alert v-if="summaryGrand" type="info" :closable="false" style="margin-bottom:12px">
          当月汇总：货款合计 <strong>¥{{ summaryGrand.grandTotalTransaction.toFixed(2) }}</strong>
          &nbsp;&nbsp;|&nbsp;&nbsp;
          付款合计 <strong>¥{{ summaryGrand.grandTotalPayment.toFixed(2) }}</strong>
        </el-alert>

        <el-table :data="tableData" stripe border size="small" show-summary>
          <el-table-column prop="counterpartyName" label="往来单位" width="180" fixed />
          <el-table-column prop="counterpartyType" label="类型" width="100" />
          <el-table-column label="期初数(元)" width="150" align="right">
            <template #default="{ row }">
              <span :class="row.openingBalance >= 0 ? 'amount-in' : 'amount-out'">
                {{ formatMoney(row.openingBalance) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="本月货款合计(元)" width="180" align="right">
            <template #default="{ row }">
              <div>
                <span class="amount-in">{{ formatMoney(row.monthTotalTransaction) }}</span>
                <div v-if="row.orderTransaction > 0" class="order-sub">
                  其中订单 <span class="order-amt">¥{{ row.orderTransaction.toFixed(2) }}</span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="本月付款合计(元)" width="160" align="right">
            <template #default="{ row }">
              <span class="amount-out">{{ formatMoney(row.monthTotalPayment) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="本月合计重量(ct)" width="140" align="right">
            <template #default="{ row }">
              <div>
                <span>{{ row.monthTotalWeight > 0 ? row.monthTotalWeight.toFixed(4) : '-' }}</span>
                <div v-if="row.orderWeight > 0" class="order-sub">其中订单 {{ row.orderWeight.toFixed(4) }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="期末数(元)" width="150" align="right">
            <template #default="{ row }">
              <span :class="row.closingBalance >= 0 ? 'amount-in' : 'amount-out'" style="font-weight:bold;">
                {{ formatMoney(row.closingBalance) }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- ===================== 材质明细视图 ===================== -->
      <template v-else>
        <div v-loading="materialLoading">
          <el-empty v-if="!rows.length">
            <template #description>
              <div class="empty-tip">
                <p>该月份没有可汇总的往来单位数据</p>
                <p class="sub">
                  金 / 钻石 / 费用录入时需选择「供应商」档案；客户侧取已确认账单的订单。<br />
                  只填了名称、没选档案的历史记录不会计入本表。
                </p>
              </div>
            </template>
          </el-empty>
          <div v-else class="matrix-wrapper">
            <table class="matrix">
              <thead>
                <!-- ========== 收支双列 · 往来单位 × 材质：3 行表头 ========== -->
                <template v-if="isBoth && !transposed">
                  <tr>
                    <th class="idx-col" rowspan="3">往来单位</th>
                    <th v-for="g in visibleGroups" :key="g.key" :colspan="g.categories.length * 2" :class="['grp', 'bg-' + g.key]">{{ g.label }}</th>
                    <th class="total-col" rowspan="3">总计<br /><span class="hint-mini">收−支</span></th>
                  </tr>
                  <tr>
                    <th
                      v-for="(c, i) in visibleCategories"
                      :key="c.key"
                      colspan="2"
                      :class="['cat', 'bg-' + c.group, { 'grp-start': isGroupStart(i) }]"
                    >{{ c.label }}</th>
                  </tr>
                  <tr>
                    <template v-for="(c, i) in visibleCategories" :key="'s-' + c.key">
                      <th :class="['sub', 'in-th', 'bg-' + c.group, { 'grp-start': isGroupStart(i) }]">收</th>
                      <th :class="['sub', 'out-th', 'bg-' + c.group]">支</th>
                    </template>
                  </tr>
                </template>

                <!-- ========== 收支双列 · 材质 × 往来单位：2 行表头 ========== -->
                <template v-else-if="isBoth && transposed">
                  <tr>
                    <th class="idx-col" rowspan="2">材质</th>
                    <th v-for="row in rows" :key="row.counterpartyId" colspan="2" class="cat">{{ row.counterpartyName || '（未指定）' }}</th>
                    <th class="total-col" rowspan="2">总计<br /><span class="hint-mini">收−支</span></th>
                  </tr>
                  <tr>
                    <template v-for="row in rows" :key="'s-' + row.counterpartyId">
                      <th class="sub in-th">收</th>
                      <th class="sub out-th">支</th>
                    </template>
                  </tr>
                </template>

                <!-- ========== 单列模式（净额 / 收入侧 / 支出侧）：2 行表头 ========== -->
                <template v-else>
                  <tr>
                    <th class="idx-col" :rowspan="transposed ? 1 : 2">{{ transposed ? '材质' : '往来单位' }}</th>
                    <template v-if="!transposed">
                      <th
                        v-for="g in visibleGroups"
                        :key="g.key"
                        :colspan="g.categories.length"
                        :class="['grp', 'bg-' + g.key]"
                      >{{ g.label }}</th>
                    </template>
                    <template v-else>
                      <!-- 转置后列 = 往来单位 -->
                      <th v-for="row in rows" :key="row.counterpartyId" class="cat">{{ row.counterpartyName || '（未指定）' }}</th>
                    </template>
                    <th class="total-col" :rowspan="transposed ? 1 : 2">总计</th>
                  </tr>
                  <tr v-if="!transposed">
                    <th
                      v-for="(c, i) in visibleCategories"
                      :key="c.key"
                      :class="['cat', 'bg-' + c.group, { 'grp-start': isGroupStart(i) }]"
                    >{{ c.label }}</th>
                  </tr>
                </template>
              </thead>

              <!-- 行 = 往来单位，列 = 材质 -->
              <tbody v-if="!transposed">
                <tr v-for="row in rows" :key="row.counterpartyId">
                  <td class="idx-col">
                    <span class="cp-name">{{ row.counterpartyName || '（未指定）' }}</span>
                    <span class="cp-type" :class="row.counterpartyType === '客户' ? 'is-cust' : 'is-sup'">{{ row.counterpartyType }}</span>
                  </td>
                  <template v-if="isBoth">
                    <template v-for="(c, i) in visibleCategories" :key="'b-' + c.key">
                      <td :class="['num', 'cell-' + c.group, 'in-cell', { 'grp-start': isGroupStart(i) }]">{{ fmtCell(cellOf(row, c.key, 'in')) }}</td>
                      <td :class="['num', 'cell-' + c.group, 'out-cell']">{{ fmtCell(cellOf(row, c.key, 'out')) }}</td>
                    </template>
                  </template>
                  <template v-else>
                    <td
                      v-for="(c, i) in visibleCategories"
                      :key="c.key"
                      :class="['num', 'cell-' + c.group, { 'grp-start': isGroupStart(i) }]"
                    >{{ fmtCell(row.cells[c.key]) }}</td>
                  </template>
                  <td class="num total-col" :class="{ neg: row.total < 0 }">{{ fmtCell(row.total) }}</td>
                </tr>
                <tr class="sum-row">
                  <td class="idx-col">总计</td>
                  <template v-if="isBoth">
                    <template v-for="(c, i) in visibleCategories" :key="'sb-' + c.key">
                      <td :class="['num', 'sum-cell', 'cell-' + c.group, 'in-cell', { 'grp-start': isGroupStart(i) }]">{{ fmtCell(sideTotals(c.key, 'in')) }}</td>
                      <td :class="['num', 'sum-cell', 'cell-' + c.group, 'out-cell']">{{ fmtCell(sideTotals(c.key, 'out')) }}</td>
                    </template>
                  </template>
                  <template v-else>
                    <td
                      v-for="(c, i) in visibleCategories"
                      :key="c.key"
                      :class="['num', 'sum-cell', 'cell-' + c.group, { 'grp-start': isGroupStart(i) }]"
                    >{{ fmtCell(totals[c.key]) }}</td>
                  </template>
                  <td class="num total-col" :class="{ neg: grandTotal < 0 }">{{ fmtCell(grandTotal) }}</td>
                </tr>
              </tbody>

              <!-- 行 = 材质，列 = 往来单位 -->
              <tbody v-else>
                <tr v-for="c in visibleCategories" :key="c.key">
                  <td class="idx-col">
                    <i class="row-dot" :class="'dot-' + c.group"></i>
                    <span class="cp-name">{{ c.label }}</span>
                  </td>
                  <template v-if="isBoth">
                    <template v-for="row in rows" :key="'tb-' + row.counterpartyId">
                      <td :class="['num', 'cell-' + c.group, 'in-cell']">{{ fmtCell(cellOf(row, c.key, 'in')) }}</td>
                      <td :class="['num', 'cell-' + c.group, 'out-cell']">{{ fmtCell(cellOf(row, c.key, 'out')) }}</td>
                    </template>
                  </template>
                  <template v-else>
                    <td v-for="row in rows" :key="row.counterpartyId" class="num" :class="'cell-' + c.group">
                      {{ fmtCell(row.cells[c.key]) }}
                    </td>
                  </template>
                  <td class="num total-col" :class="{ neg: (totals[c.key] || 0) < 0 }">{{ fmtCell(totals[c.key]) }}</td>
                </tr>
                <tr class="sum-row">
                  <td class="idx-col">总计</td>
                  <template v-if="isBoth">
                    <template v-for="row in rows" :key="'ts-' + row.counterpartyId">
                      <td class="num sum-cell in-cell">{{ fmtCell(row.totalIn) }}</td>
                      <td class="num sum-cell out-cell">{{ fmtCell(row.totalOut) }}</td>
                    </template>
                  </template>
                  <template v-else>
                    <td v-for="row in rows" :key="row.counterpartyId" class="num sum-cell" :class="{ neg: row.total < 0 }">
                      {{ fmtCell(row.total) }}
                    </td>
                  </template>
                  <td class="num total-col" :class="{ neg: grandTotal < 0 }">{{ fmtCell(grandTotal) }}</td>
                </tr>
              </tbody>
            </table>

            <div class="matrix-foot">
              口径：{{ caliber === 'amount' ? '金额（元）' : '重量（金 g / 钻石 ct）' }} ·
              方向：{{ directionLabel }} ·
              共 {{ rows.length }} 家单位 / {{ visibleCategories.length }} 个材质列
              <template v-if="isBoth"> · 每材质拆「收 / 支」两列，总计列为 收−支 净额</template>
            </div>
          </div>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { counterpartSummary, counterpartMaterialSummary } from '@/api/transaction'
import { getCounterpartyAll } from '@/api/counterparty'
import { getCustomerList } from '@/api/customer'
import * as XLSX from 'xlsx'

const yearMonth = ref(`${new Date().getFullYear()}-${new Date().getMonth() + 1}`)
// 往来单位筛选：值带来源前缀（c:客户 / s:供应商），避免 customers 与 counterparties 的 id 撞车
const filterParty = ref(null)
const partyOptions = reactive({ customer: [], supplier: [] })
const tableData = ref([])
const summaryGrand = ref(null)

// 视图：summary 汇总 / material 材质明细
const view = ref('summary')
const caliber = ref('weight')
// both 收支双列（默认，一屏同时看收和支）| net 净额 | in 收入侧 | out 支出侧
const direction = ref('both')
const hideEmpty = ref(true)
const transposed = ref(false)
const materialLoading = ref(false)

// 材质明细数据
const groups = ref([])
const categories = ref([])
const rows = ref([])
const totals = ref({})
const totalsIn = ref({})
const totalsOut = ref({})
const grandTotalMaterial = ref(0)
const grandIn = ref(0)
const grandOut = ref(0)
const grandTotal = computed(() => grandTotalMaterial.value)

const isBoth = computed(() => direction.value === 'both')

const directionLabel = computed(() => ({ both: '收支双列', net: '净额', in: '收入侧', out: '支出侧' }[direction.value] || '净额'))

// 收支双列：取某行某材质的收入侧 / 支出侧数值
function cellOf(row, key, side) {
  const src = side === 'in' ? row.cellsIn : row.cellsOut
  return src ? src[key] : 0
}

// 收支双列：某材质列的收入 / 支出合计
function sideTotals(key, side) {
  const src = side === 'in' ? totalsIn.value : totalsOut.value
  return src ? src[key] : 0
}

function formatMoney(val) {
  if (!val && val !== 0) return '-'
  const abs = Math.abs(val)
  const str = abs.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return val < 0 ? `-¥${str}` : `¥${str}`
}

function periodParams() {
  const parts = (yearMonth.value || '').split('-')
  return {
    year: parseInt(parts[0]),
    month: parseInt(parts[1])
  }
}

// ============ 汇总视图 ============
function loadSummary() {
  const p = periodParams()
  const party = filterParty.value || ''
  if (party) p.counterpartyId = parseInt(party.split(':')[1])

  counterpartSummary(p)
    .then(res => {
      let rows = res.rows || []
      if (party) {
        const wantType = party.startsWith('c:') ? '客户' : '供应商'
        rows = rows.filter(r => (r.counterpartyType || '') === wantType)
      }
      tableData.value = rows
      // 有筛选时按筛选结果重算合计，否则用后端全量合计
      summaryGrand.value = party
        ? {
            grandTotalTransaction: rows.reduce((s, r) => s + (r.monthTotalTransaction || 0), 0),
            grandTotalPayment: rows.reduce((s, r) => s + (r.monthTotalPayment || 0), 0)
          }
        : {
            grandTotalTransaction: res.grandTotalTransaction || 0,
            grandTotalPayment: res.grandTotalPayment || 0
          }
    })
    .catch(() => {})
}

// ============ 材质明细 ============
const hasDataInColumn = computed(() => {
  const used = {}
  for (const r of rows.value) {
    for (const k in r.cells) {
      if (Number(r.cells[k]) !== 0) used[k] = true
    }
    // 收支双列：收=支（净额为 0）时也要显示该列
    for (const k in (r.cellsIn || {})) {
      if (Number(r.cellsIn[k]) !== 0) used[k] = true
    }
    for (const k in (r.cellsOut || {})) {
      if (Number(r.cellsOut[k]) !== 0) used[k] = true
    }
  }
  return used
})

const visibleCategories = computed(() => {
  if (!hideEmpty.value) return categories.value
  return categories.value.filter(c => hasDataInColumn.value[c.key])
})

const visibleGroups = computed(() => {
  const kept = new Set(visibleCategories.value.map(c => c.key))
  return groups.value
    .map(g => ({ ...g, categories: g.categories.filter(k => kept.has(k)) }))
    .filter(g => g.categories.length > 0)
})

function isGroupStart(i) {
  if (i === 0) return true
  return visibleCategories.value[i - 1].group !== visibleCategories.value[i].group
}

function fmtCell(v) {
  const n = Number(v || 0)
  if (!n) return '-'
  if (caliber.value === 'amount') return n.toFixed(2)
  const s = n.toFixed(3)
  return s.replace(/\.?0+$/, '')
}

function loadMaterial() {
  materialLoading.value = true
  counterpartMaterialSummary({
    ...periodParams(),
    caliber: caliber.value,
    direction: direction.value,
    party: filterParty.value || undefined
  })
    .then(res => {
      groups.value = res.groups || []
      categories.value = res.categories || []
      rows.value = res.rows || []
      totals.value = res.totals || {}
      totalsIn.value = res.totalsIn || {}
      totalsOut.value = res.totalsOut || {}
      grandTotalMaterial.value = res.grandTotal || 0
      grandIn.value = res.grandIn || 0
      grandOut.value = res.grandOut || 0
    })
    .catch(() => {})
    .finally(() => { materialLoading.value = false })
}

function refresh() {
  if (view.value === 'summary') loadSummary()
  else loadMaterial()
}

function onViewChange(v) {
  if (v === 'material' && !categories.value.length) loadMaterial()
}

// ============ 导出 ============
function handleExport() {
  if (view.value === 'summary') return exportSummary()
  return exportMaterial()
}

function exportSummary() {
  if (!tableData.value.length) return
  const data = tableData.value.map(r => ({
    '往来单位': r.counterpartyName,
    '类型': r.counterpartyType || '',
    '期初数': r.openingBalance,
    '本月货款合计': r.monthTotalTransaction,
    '本月付款合计': r.monthTotalPayment,
    '本月合计重量': r.monthTotalWeight,
    '期末数': r.closingBalance
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '往来单位汇总')
  XLSX.writeFile(wb, `往来单位汇总_${yearMonth.value}.xlsx`)
}

const GROUP_LABEL = { gold: '金料', diamond: '钻石', expense: '费用', other: '其他材料' }

function exportMaterial() {
  if (!rows.value.length) return
  const cats = visibleCategories.value
  const wb = XLSX.utils.book_new()

  // 收支双列 / 单列 两种形态，× 是否转置，共 4 套表头
  const merges = []
  let aoa = []
  let cols = []

  if (isBoth.value && !transposed.value) {
    // 表头三行：分组名 → 材质名（跨 收入/支出） → 收/支
    const head1 = ['往来单位']
    const head2 = ['']
    const head3 = ['']
    let colIdx = 1
    for (const g of visibleGroups.value) {
      head1.push(g.label)
      for (let k = 1; k < g.categories.length * 2; k++) head1.push('')
      merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + g.categories.length * 2 - 1 } })
      for (const key of g.categories) {
        const c = cats.find(x => x.key === key)
        head2.push(c ? c.label : key, '')
        merges.push({ s: { r: 1, c: colIdx }, e: { r: 1, c: colIdx + 1 } })
        head3.push('收', '支')
        colIdx += 2
      }
    }
    head1.push('总计(收−支)')
    head2.push('')
    head3.push('')
    merges.push({ s: { r: 0, c: 0 }, e: { r: 2, c: 0 } })          // 往来单位 竖跨 3 行
    const lastCol = cats.length * 2 + 1
    merges.push({ s: { r: 0, c: lastCol }, e: { r: 2, c: lastCol } }) // 总计 竖跨 3 行
    aoa = [head1, head2, head3]
    for (const r of rows.value) {
      const line = [r.counterpartyName]
      for (const c of cats) { line.push(Number(cellOf(r, c.key, 'in') || 0), Number(cellOf(r, c.key, 'out') || 0)) }
      line.push(Number(r.total || 0))
      aoa.push(line)
    }
    const sumLine = ['总计']
    for (const c of cats) { sumLine.push(Number(sideTotals(c.key, 'in') || 0), Number(sideTotals(c.key, 'out') || 0)) }
    sumLine.push(Number(grandTotalMaterial.value || 0))
    aoa.push(sumLine)
    cols = [{ wch: 18 }, ...cats.flatMap(() => [{ wch: 10 }, { wch: 10 }]), { wch: 13 }]
  } else if (isBoth.value && transposed.value) {
    // 转置 + 收支双列：表头两行（往来单位跨 收/支）
    const head1 = ['材质']
    const head2 = ['']
    let colIdx = 1
    for (const r of rows.value) {
      head1.push(r.counterpartyName || '（未指定）', '')
      merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + 1 } })
      head2.push('收', '支')
      colIdx += 2
    }
    head1.push('总计(收−支)')
    head2.push('')
    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } })
    const lastCol = rows.value.length * 2 + 1
    merges.push({ s: { r: 0, c: lastCol }, e: { r: 1, c: lastCol } })
    aoa = [head1, head2]
    for (const c of cats) {
      const line = [`${c.label}（${GROUP_LABEL[c.group] || ''}）`]
      for (const r of rows.value) { line.push(Number(cellOf(r, c.key, 'in') || 0), Number(cellOf(r, c.key, 'out') || 0)) }
      line.push(Number(totals.value[c.key] || 0))
      aoa.push(line)
    }
    const sumLine = ['总计']
    for (const r of rows.value) { sumLine.push(Number(r.totalIn || 0), Number(r.totalOut || 0)) }
    sumLine.push(Number(grandTotalMaterial.value || 0))
    aoa.push(sumLine)
    cols = [{ wch: 18 }, ...rows.value.flatMap(() => [{ wch: 12 }, { wch: 12 }]), { wch: 13 }]
  } else if (!transposed.value) {
    const head1 = ['往来单位']
    const head2 = ['']
    let colIdx = 1
    for (const g of visibleGroups.value) {
      head1.push(g.label)
      for (let k = 1; k < g.categories.length; k++) head1.push('')
      // 只有多列时才需要合并（单列合并是无效的 1x1 区域）
      if (g.categories.length > 1) {
        merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + g.categories.length - 1 } })
      }
      colIdx += g.categories.length
      for (const key of g.categories) {
        const c = cats.find(x => x.key === key)
        head2.push(c ? c.label : key)
      }
    }
    head1.push('总计')
    head2.push('')
    aoa = [head1, head2]
    for (const r of rows.value) {
      aoa.push([r.counterpartyName, ...cats.map(c => Number(r.cells[c.key] || 0)), Number(r.total || 0)])
    }
    aoa.push(['总计', ...cats.map(c => Number(totals.value[c.key] || 0)), Number(grandTotalMaterial.value || 0)])
    cols = [{ wch: 18 }, ...cats.map(() => ({ wch: 11 })), { wch: 12 }]
  } else {
    // 转置：分组已写在材质名里，只出一行表头
    aoa = [['材质', ...rows.value.map(r => r.counterpartyName || '（未指定）'), '总计']]
    for (const c of cats) {
      aoa.push([
        `${c.label}（${GROUP_LABEL[c.group] || ''}）`,
        ...rows.value.map(r => Number(r.cells[c.key] || 0)),
        Number(totals.value[c.key] || 0)
      ])
    }
    aoa.push(['总计', ...rows.value.map(r => Number(r.total || 0)), Number(grandTotalMaterial.value || 0)])
    cols = [{ wch: 18 }, ...rows.value.map(() => ({ wch: 13 })), { wch: 12 }]
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!merges'] = merges
  ws['!cols'] = cols
  XLSX.utils.book_append_sheet(wb, ws, '往来单位材质明细')

  const tag = transposed.value ? '材质x往来单位' : '往来单位x材质'
  const cal = caliber.value === 'amount' ? '金额' : '重量'
  const dirTag = isBoth.value ? '收支双列' : directionLabel.value
  XLSX.writeFile(wb, `往来单位材质明细_${yearMonth.value}_${tag}_${cal}_${dirTag}.xlsx`)
}

// 客户 + 供应商都放进筛选下拉（矩阵同时含两类主体）
function loadParties() {
  getCounterpartyAll().then(res => {
    partyOptions.supplier = (res.data || []).map(c => ({ value: `s:${c.id}`, label: c.name }))
  }).catch(() => {})
  getCustomerList({}).then(res => {
    const list = Array.isArray(res) ? res : (res.data || [])
    partyOptions.customer = list.map(c => ({ value: `c:${c.customerId || c.id}`, label: c.customerName || c.name }))
  }).catch(() => {})
}

onMounted(() => {
  loadParties()
  loadSummary()
})
</script>

<style scoped>
.counterpart-summary { padding: 16px; }
.amount-in { color: #67c23a; }
.amount-out { color: #f56c6c; }
.order-sub { font-size: 12px; color: #909399; margin-top: 2px; }
.order-amt { color: #e6a23c; font-weight: bold; }

.sub-bar {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e4e7ed;
}
.sub-bar .legend { font-size: 12px; color: #909399; display: inline-flex; gap: 12px; }
.sub-bar .lg { display: inline-flex; align-items: center; gap: 4px; }
.sub-bar .lg i { width: 12px; height: 12px; border-radius: 2px; display: inline-block; }
.dot-gold { background: #FAEEDA; border: 1px solid #EF9F27; }
.dot-diamond { background: #E6F1FB; border: 1px solid #378ADD; }
.dot-expense { background: #E1F5EE; border: 1px solid #1D9E75; }
.dot-other { background: #F1EFE8; border: 1px solid #B4B2A9; }

.matrix-wrapper { overflow-x: auto; padding-bottom: 4px; }
.matrix { border-collapse: separate; border-spacing: 0; font-size: 13px; min-width: 100%; }
.matrix th, .matrix td { border: 1px solid #dcdfe6; padding: 6px 10px; white-space: nowrap; }
.matrix thead th { font-weight: 600; text-align: center; position: sticky; top: 0; z-index: 2; }
.matrix .idx-col {
  position: sticky; left: 0; z-index: 3; background: #fff; text-align: left;
  min-width: 150px; font-weight: 500;
}
.matrix thead .idx-col { z-index: 4; background: #f5f7fa; }
.matrix .num { text-align: right; font-variant-numeric: tabular-nums; }
.matrix .total-col { background: #f5f7fa; font-weight: 600; min-width: 90px; }

/* 分组表头配色 */
.bg-gold { background: #FAEEDA; color: #633806; border-color: #EF9F27 !important; }
.bg-diamond { background: #E6F1FB; color: #0C447C; border-color: #378ADD !important; }
.bg-expense { background: #E1F5EE; color: #085041; border-color: #1D9E75 !important; }
.bg-other { background: #F1EFE8; color: #444441; border-color: #B4B2A9 !important; }

/* 数据单元格配色 */
.cell-gold { background: #FDF7EC; color: #854F0B; }
.cell-diamond { background: #F3F8FD; color: #185FA5; }
.cell-expense { background: #F1FAF6; color: #0F6E56; }
.cell-other { background: #F8F7F3; color: #5F5E5A; }

.grp-start { border-left: 2px solid #c0c4cc !important; }
.sum-row td { background: #fafafa; font-weight: 600; }
.sum-row .sum-cell { background: #f5f7fa; }
.matrix .neg { color: #f56c6c; }

/* 收支双列：收 / 支 子列与配色 */
.matrix .sub { font-size: 12px; font-weight: 600; padding: 4px 8px; }
.matrix .in-th, .matrix .in-cell { color: #1f9254; }
.matrix .out-th, .matrix .out-cell { color: #d64545; }
.matrix .in-cell { font-weight: 500; }
.hint-mini { font-size: 10px; color: #909399; font-weight: 400; }

.cp-name { font-weight: 500; }
.cp-type { font-size: 11px; margin-left: 6px; padding: 1px 5px; border-radius: 3px; }
.is-cust { background: #f0f9eb; color: #67c23a; }
.is-sup { background: #fdf6ec; color: #e6a23c; }
.row-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.matrix-foot { margin-top: 10px; font-size: 12px; color: #909399; }
.empty-tip p { margin: 0; }
.empty-tip .sub { margin-top: 6px; font-size: 12px; color: #a8abb2; line-height: 1.7; }
</style>
