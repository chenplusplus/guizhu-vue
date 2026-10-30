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
      <el-table-column prop="materialType" label="材质（成色）" min-width="140" fixed />
      <el-table-column prop="netWeight" label="净重" min-width="110" align="right">
        <template #default="{ row }">{{ fmt(row.netWeight, 3) }}</template>
      </el-table-column>
      <el-table-column prop="addLossWeight" label="加耗重" min-width="110" align="right">
        <template #default="{ row }">{{ fmt(row.addLossWeight, 3) }}</template>
      </el-table-column>
      <el-table-column prop="foldWeight" label="折足金重" min-width="110" align="right">
        <template #default="{ row }">
          <b class="fold-val">{{ fmt(row.foldWeight, 3) }}</b>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-else description="暂无金料数据" :image-size="48" />

    <!-- 合计行 -->
    <div v-if="rows.length" class="total-row">
      <span>合计</span>
      <span>净重 {{ fmt(totalRow.netWeight, 3) }}</span>
      <span>加耗重 {{ fmt(totalRow.addLossWeight, 3) }}</span>
      <span>折足金重 {{ fmt(totalRow.foldWeight, 3) }}</span>
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
  title: { type: String, default: '🧮 金料按材质汇总' }
})

const summaryData = ref([])   // 后端按材质聚合：{materialType, inWeight, outWeight, inTotalWeight, outTotalWeight}
const dictLabels = ref([])    // 成色字典 itemLabel 顺序

const fmt = (v, d) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(d) : (0).toFixed(d)
}

// 行 = 数据中出现过的材质；按成色字典顺序排，字典外的（旧数据如「足金」）排后面
// 列口径：净重 = 收+支 重量合计；加耗重 = 含损耗后重量；折足金重 = 折算成足金的重量（银/铜行即折银/折铜）
const rows = computed(() => {
  return summaryData.value.map(x => {
    const netWeight = (Number(x.inWeight) || 0) + (Number(x.outWeight) || 0)
    const addLossWeight = (Number(x.inTotalWeight) || 0) + (Number(x.outTotalWeight) || 0)
    const foldWeight = (Number(x.inFoldWeight) || 0) + (Number(x.outFoldWeight) || 0)
    return { materialType: x.materialType, netWeight, addLossWeight, foldWeight, _order: dictLabels.value.indexOf(x.materialType) }
  }).sort((a, b) => {
    const oa = a._order === -1 ? 999 : a._order
    const ob = b._order === -1 ? 999 : b._order
    return oa - ob
  })
})

const totalRow = computed(() => {
  let netWeight = 0, addLossWeight = 0, foldWeight = 0
  rows.value.forEach(r => { netWeight += r.netWeight; addLossWeight += r.addLossWeight; foldWeight += r.foldWeight })
  return { netWeight, addLossWeight, foldWeight }
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
