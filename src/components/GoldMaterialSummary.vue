<template>
  <el-card class="material-summary-card" shadow="never">
    <template #header>
      <div class="card-header">
        <span class="title">{{ title }}</span>
        <el-button link type="primary" size="small" @click="reload">刷新</el-button>
      </div>
    </template>

    <el-table v-if="rows.length" :data="rows" border size="small"
      :header-cell-style="{ background: '#fdf6ec', color: '#8c5a18', fontWeight: 600 }">
      <el-table-column prop="materialType" label="成色" min-width="130" fixed />
      <el-table-column prop="netWeight" label="金重 (g)" min-width="105" align="right">
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
    <div v-if="rows.length" class="total-row">
      <span>合计</span>
      <span>金重 {{ fmt(totalRow.netWeight, 2) }} g</span>
      <span>加耗总重 {{ fmt(totalRow.addLossWeight, 2) }} g</span>
      <span>折算率 {{ totalRow.rate == null ? '—' : rateText(totalRow.rate) }}</span>
      <span>折足金 {{ fmt(totalRow.foldWeight, 2) }} g</span>
      <span v-if="totalRow.paidFold > 0" class="paid-total">付足料 {{ fmt(totalRow.paidFold, 2) }} g</span>
    </div>
    <div v-if="totalRow.paidFold > 0" class="paid-note">
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
  title: { type: String, default: '🧮 金料按成色汇总（折足金）' }
})

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
// 列口径：金重 = 收+支 重量合计；加耗总重 = 含损耗后重量；折足金 = 加耗总重 × 折算率（银/铜行即折银/折铜）
const rows = computed(() => {
  return summaryData.value.map(x => {
    const netWeight = (Number(x.inWeight) || 0) + (Number(x.outWeight) || 0)
    const addLossWeight = (Number(x.inTotalWeight) || 0) + (Number(x.outTotalWeight) || 0)
    const foldWeight = (Number(x.inFoldWeight) || 0) + (Number(x.outFoldWeight) || 0)
    // 付足料：只入库方向有值（买配件付出去的足金），单列展示，不冲减本卡的折足金 —
    // 一旦冲减，折算率（折足 ÷ 加耗）就不再是该成色的真实折算比例
    const paidFold = Number(x.inPaidFoldWeight) || 0
    // 折算率 = 折足金 ÷ 加耗总重（该成色的实际折算比例）
    const rate = addLossWeight ? foldWeight / addLossWeight : 0
    return { materialType: x.materialType, netWeight, addLossWeight, foldWeight, paidFold, rate, _order: dictLabels.value.indexOf(x.materialType) }
  }).sort((a, b) => {
    const oa = a._order === -1 ? 999 : a._order
    const ob = b._order === -1 ? 999 : b._order
    return oa - ob
  })
})

const totalRow = computed(() => {
  let netWeight = 0, addLossWeight = 0, foldWeight = 0, paidFold = 0
  rows.value.forEach(r => { netWeight += r.netWeight; addLossWeight += r.addLossWeight; foldWeight += r.foldWeight; paidFold += r.paidFold })
  return { netWeight, addLossWeight, foldWeight, paidFold, rate: addLossWeight ? foldWeight / addLossWeight : 0 }
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
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; font-size: 15px; }
.fold-val { color: #409EFF; }
.paid-fold-cell { font-weight: 600; color: #F56C6C; }
.zero-cell { color: #c0c4cc; }
.paid-total { color: #F56C6C; }
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
