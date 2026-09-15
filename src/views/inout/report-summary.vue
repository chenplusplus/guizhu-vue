<template>
  <div class="report-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">📊 总入总出汇总</span>
          <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD"
            style="width:240px;" @change="loadAll" />
        </div>
      </template>

      <!-- 按折算类别汇总 -->
      <div class="section-title">按折算类别汇总</div>
      <el-table :data="summaryData" border stripe v-loading="loading">
        <el-table-column prop="foldLabel" label="折算类别" width="100" />
        <el-table-column prop="openingFold" label="期初折算重" width="120" align="right">
          <template #default="{ row }">{{ fmt(row.openingFold, 4) }}</template>
        </el-table-column>
        <el-table-column prop="inFold" label="本期入" width="120" align="right">
          <template #default="{ row }">
            <span style="color:#67C23A;">+{{ fmt(row.inFold, 4) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="outFold" label="本期出" width="120" align="right">
          <template #default="{ row }">
            <span style="color:#F56C6C;">-{{ fmt(row.outFold, 4) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="closingFold" label="期末折算重" width="120" align="right">
          <template #default="{ row }">
            <span style="font-weight:600;color:#409EFF;">{{ fmt(row.closingFold, 4) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="openingAmount" label="期初金额" width="130" align="right">
          <template #default="{ row }">¥{{ fmt(row.openingAmount, 2) }}</template>
        </el-table-column>
        <el-table-column prop="inAmount" label="本期入金额" width="130" align="right">
          <template #default="{ row }">¥{{ fmt(row.inAmount, 2) }}</template>
        </el-table-column>
        <el-table-column prop="outAmount" label="本期出金额" width="130" align="right">
          <template #default="{ row }">¥{{ fmt(row.outAmount, 2) }}</template>
        </el-table-column>
        <el-table-column prop="closingAmount" label="期末金额" width="130" align="right">
          <template #default="{ row }">
            <span style="font-weight:600;color:#409EFF;">¥{{ fmt(row.closingAmount, 2) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 对账报表 -->
      <div class="section-title" style="margin-top:24px;">对账报表</div>
      <el-table :data="reconciliationData" border stripe>
        <el-table-column prop="label" label="类别" width="120" />
        <el-table-column prop="totalAmount" label="交易金额" width="150" align="right">
          <template #default="{ row }">¥{{ fmt(row.totalAmount, 2) }}</template>
        </el-table-column>
        <el-table-column prop="totalPayment" label="付款金额" width="150" align="right">
          <template #default="{ row }">¥{{ fmt(row.totalPayment, 2) }}</template>
        </el-table-column>
        <el-table-column prop="balance" label="未付款余额" width="150" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.balance > 0 ? '#F56C6C' : '#67C23A', fontWeight: 600 }">
              ¥{{ fmt(row.balance, 2) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getSummaryByMaterial, getInventory, getEntryReconciliation, getSummaryByCounterparty } from '@/api/inoutReport'

const loading = ref(false)
const dateRange = ref([])
const summaryData = ref([])
const reconciliationData = ref([])

const fmt = (v, d) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(d) : (0).toFixed(d)
}

const loadAll = async () => {
  loading.value = true
  const params = {}
  if (dateRange.value && dateRange.value.length === 2) {
    params.startDate = dateRange.value[0]
    params.endDate = dateRange.value[1]
  }
  try {
    // 库存核算（按折算类别）
    const invRes = await getInventory(params)
    if (invRes.success) summaryData.value = invRes.data || []

    // 对账
    const recRes = await getEntryReconciliation(params)
    if (recRes.success) {
      reconciliationData.value = [
        { label: '金录入', totalAmount: recRes.gold?.totalAmount || 0, totalPayment: recRes.gold?.totalPayment || 0, balance: recRes.gold?.balance || 0 },
        { label: '钻石', totalAmount: recRes.diamond?.totalAmount || 0, totalPayment: recRes.diamond?.totalPayment || 0, balance: recRes.diamond?.balance || 0 },
        { label: '费用', totalAmount: recRes.expense?.totalAmount || 0, totalPayment: recRes.expense?.totalPayment || 0, balance: recRes.expense?.balance || 0 }
      ]
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => loadAll())
</script>

<style scoped>
.report-page { padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; font-size: 16px; }
.section-title { font-weight: 600; font-size: 15px; color: #303133; margin-bottom: 12px; }
</style>