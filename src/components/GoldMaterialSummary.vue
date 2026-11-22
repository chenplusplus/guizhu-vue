<template>
  <el-card class="material-summary-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span class="title">{{ title }}</span>
        <el-button link type="primary" size="small" @click="reload">刷新</el-button>
      </div>
    </template>

    <!-- ⭐ 入库口径（2026-11-22）：入库多少、累计出库多少、还剩多少 -->
    <el-table v-if="rows.length && isSimple" :data="rows" border size="small" class="simple-table"
      :header-cell-style="headerStyle">
      <el-table-column prop="materialType" label="成色" width="170" fixed />
      <el-table-column prop="inWeight" label="入库金重 (g)" width="170" align="right">
        <template #default="{ row }">{{ fmt(row.inWeight, 2) }}</template>
      </el-table-column>
      <el-table-column prop="outWeight" label="累计出库金重 (g)" width="190" align="right">
        <template #default="{ row }">{{ fmt(row.outWeight, 2) }}</template>
      </el-table-column>
      <el-table-column prop="stock" label="库存 (g)" width="160" align="right">
        <template #default="{ row }">
          <b :class="Number(row.stock) < 0 ? 'stock-neg' : 'stock-pos'">{{ fmt(row.stock, 2) }}</b>
        </template>
      </el-table-column>
      <!-- 付足料（2026-11-15）：买配件付给供应商的足金；没有数据时不占位 -->
      <el-table-column v-if="totalRow.paidFold > 0" prop="paidFold" label="付足料 (g)" width="150" align="right">
        <template #default="{ row }">
          <span v-if="Number(row.paidFold) > 0" class="paid-fold-cell">{{ fmt(row.paidFold, 2) }}</span>
          <span v-else class="zero-cell">—</span>
        </template>
      </el-table-column>
    </el-table>
    <el-table v-else-if="rows.length" :data="rows" border size="small"
      :header-cell-style="headerStyle">
      <el-table-column prop="materialType" label="成色" min-width="130" fixed />
      <el-table-column prop="netWeight" label="出库金重 (g)" min-width="105" align="right">
        <template #default="{ row }">{{ fmt(row.netWeight, 2) }}</template>
      </el-table-column>
      <el-table-column prop="addLossWeight" label="加耗总重 (g)" min-width="115" align="right">
        <template #default="{ row }">{{ fmt(row.addLossWeight, 2) }}</template>
      </el-table-column>
      <el-table-column prop="rate" label="折算率" min-width="90" align="right">
        <template #default="{ row }">{{ row.rate == null ? '—' : rateText(row.rate) }}</template>
      </el-table-column>
      <el-table-column prop="foldWeight" label="折足金 (g)" min-width="115" align="right">
        <template #default="{ row }">
          <b class="fold-val">{{ fmt(row.foldWeight, 2) }}</b>
        </template>
      </el-table-column>
      <!-- ⭐ 付足料（2026-11-15）：买配件付给供应商的足金；没有数据时不占位 -->
      <el-table-column v-if="totalRow.paidFold > 0" prop="paidFold" label="付足料 (g)" min-width="110" align="right">
        <template #default="{ row }">
          <span v-if="Number(row.paidFold) > 0" class="paid-fold-cell">{{ fmt(row.paidFold, 2) }}</span>
          <span v-else class="zero-cell">—</span>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-else description="暂无金料数据" :image-size="48" />

    <!-- 合计行 -->
    <div v-if="rows.length" class="total-row" :class="{ 'simple-total': isSimple }">
      <span>合计</span>
      <template v-if="isSimple">
        <span>入库金重 {{ fmt(totalRow.inWeight, 2) }} g</span>
        <span>累计出库金重 {{ fmt(totalRow.outWeight, 2) }} g</span>
        <span :class="totalRow.stock < 0 ? 'stock-neg' : ''">库存 {{ fmt(totalRow.stock, 2) }} g</span>
      </template>
      <template v-else>
        <span>{{ totalLabel }} {{ fmt(totalRow.netWeight, 2) }} g</span>
        <span>加耗总重 {{ fmt(totalRow.addLossWeight, 2) }} g</span>
        <span>折算率 {{ totalRow.rate == null ? '—' : rateText(totalRow.rate) }}</span>
        <span>折足金 {{ fmt(totalRow.foldWeight, 2) }} g</span>
      </template>
      <span v-if="totalRow.paidFold > 0" class="paid-total">付足料 {{ fmt(totalRow.paidFold, 2) }} g</span>
    </div>
    <div v-if="isSimple" class="simple-note">
      入库＝金入库累计实收重量（不加耗、不折算）；累计出库＝全部金出库重量之和；库存＝入库 − 累计出库。库存为负说明这个成色出得比入得多，通常是换料或调拨没录入库单。
    </div>
    <div v-else-if="totalRow.paidFold > 0" class="paid-note">
      折足金为进货毛额；付足料（付给供应商的足金）已从库存结余中扣除。
    </div>

    <!-- ⭐ 父组件可注入「累计」等其它信息，与汇总同卡展示 -->
    <slot name="footer" />
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getGoldSummaryByMaterial } from '@/api/inout'
import { dictApi } from '@/api/dict'

const emit = defineEmits(['loaded'])

const props = defineProps({
  title: { type: String, default: '🧮 金料按成色汇总（折足金）' },
  // ⭐ mode: 'in' 入库（只列成色与实收金重，不加耗不折算）
  //         'out' 出库（加耗/折算/折足照旧）
  //         'all' 收+支合并（列表页等旧用法）
  mode: { type: String, default: 'all' }
})

const headerStyle = { background: '#fdf6ec', color: '#8c5a18', fontWeight: 600 }
const isSimple = computed(() => props.mode === 'in')
// 合计行的重量标签跟着方向走，避免被误读成库存结存
const totalLabel = computed(() => (props.mode === 'in' ? '入库金重' : props.mode === 'out' ? '出库金重' : '金重'))

const summaryData = ref([])   // 后端按材质聚合：{materialType, inWeight, outWeight, inTotalWeight, outTotalWeight}
const dictLabels = ref([])    // 成色字典 itemLabel 顺序

const fmt = (v, d) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(d) : (0).toFixed(d)
}
// 折算率按百分比两位显示（1.0000 → 100.00%、0.9250 → 92.50%）
const rateText = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? (n * 100).toFixed(2) + '%' : '—'
}

// 行 = 数据中出现过的成色；按成色字典顺序排，字典外的（旧数据如「足金」）排后面
// 口径随 mode 走：
//   in  → 金重 = 入库金重（实收毛重，不加耗、不折算）
//   out → 金重 / 加耗总重 / 折足金 均取出库方向
//   all → 收 + 支 重量合计（旧口径）
const num = (v) => Number(v) || 0
const rows = computed(() => {
  return summaryData.value.map(x => {
    let netWeight, addLossWeight, foldWeight, paidFold
    if (props.mode === 'in') {
      netWeight = num(x.inWeight)
      addLossWeight = num(x.inTotalWeight)
      foldWeight = num(x.inFoldWeight)
      paidFold = num(x.inPaidFoldWeight)
    } else if (props.mode === 'out') {
      netWeight = num(x.outWeight)
      addLossWeight = num(x.outTotalWeight)
      foldWeight = num(x.outFoldWeight)
      paidFold = 0
    } else {
      netWeight = num(x.inWeight) + num(x.outWeight)
      addLossWeight = num(x.inTotalWeight) + num(x.outTotalWeight)
      foldWeight = num(x.inFoldWeight) + num(x.outFoldWeight)
      paidFold = num(x.inPaidFoldWeight)
    }
    // 折算率 = 折足金 ÷ 加耗总重（该成色的实际折算比例）
    const rate = addLossWeight ? foldWeight / addLossWeight : 0
    // 入库口径要同时看「入了多少、出了多少、还剩多少」
    const inWeight = num(x.inWeight)
    const outWeight = num(x.outWeight)
    return {
      materialType: x.materialType, netWeight, addLossWeight, foldWeight, paidFold, rate,
      inWeight, outWeight, stock: inWeight - outWeight,
      _order: dictLabels.value.indexOf(x.materialType)
    }
  })
  // 该成色在入库/出库任一方向有重量才占行（只剩一边有数时也要显示，库存会出现负数并标红）
  .filter(r => props.mode === 'all' || r.inWeight !== 0 || r.outWeight !== 0 || r.paidFold > 0)
  .sort((a, b) => {
    const oa = a._order === -1 ? 999 : a._order
    const ob = b._order === -1 ? 999 : b._order
    return oa - ob
  })
})

const totalRow = computed(() => {
  let netWeight = 0, addLossWeight = 0, foldWeight = 0, paidFold = 0, inWeight = 0, outWeight = 0
  rows.value.forEach(r => {
    netWeight += r.netWeight; addLossWeight += r.addLossWeight; foldWeight += r.foldWeight
    paidFold += r.paidFold; inWeight += r.inWeight; outWeight += r.outWeight
  })
  return {
    netWeight, addLossWeight, foldWeight, paidFold, inWeight, outWeight, stock: inWeight - outWeight,
    rate: addLossWeight ? foldWeight / addLossWeight : 0
  }
})

const reload = async () => {
  try {
    const res = await getGoldSummaryByMaterial()
    if (res.success) summaryData.value = res.data || []
    emit('loaded', summaryData.value)
  } catch {}
}

onMounted(async () => {
  try {
    const res = await dictApi.getItemsByKey('purity')
    dictLabels.value = (res?.data || []).map(x => x.itemLabel || x.itemValue)
  } catch {}
  reload()
})

defineExpose({ reload })
</script>

<style scoped>
.material-summary-card { margin-bottom: 14px; }
/* 入库列多（入/出/库存/付足料），限宽避免每列被拉得过散 */
.simple-table { max-width: 880px; }
/* 合计条跟表格同宽，避免一长一短 */
.simple-total { max-width: 880px; }
.stock-pos { color: #303133; }
.stock-neg { color: #F56C6C; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; font-size: 15px; }
.fold-val { color: #409EFF; }
.paid-fold-cell { font-weight: 600; color: #F56C6C; }
.zero-cell { color: #c0c4cc; }
.paid-total { color: #F56C6C; }
.simple-note {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}
.paid-note {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}
.total-row {
  display: flex;
  gap: 24px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #fdf6ec;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #8c5a18;
}
</style>
