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
            @change="loadData"
          />
          <el-select v-model="filterCounterpartyId" placeholder="往来单位筛选" clearable filterable style="width:180px" @change="loadData">
            <el-option v-for="cp in counterparties" :key="cp.id" :label="cp.name" :value="cp.id" />
          </el-select>
          <el-button type="primary" @click="loadData">刷新</el-button>
          <el-button type="success" @click="handleExport">导出Excel</el-button>
        </el-space>
      </template>

      <!-- 汇总总计行 -->
      <el-alert v-if="grandTotal" type="info" :closable="false" style="margin-bottom:12px">
        当月汇总：货款合计 <strong>¥{{ grandTotal.grandTotalTransaction.toFixed(2) }}</strong>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        付款合计 <strong>¥{{ grandTotal.grandTotalPayment.toFixed(2) }}</strong>
      </el-alert>

      <!-- 主表：每个往来单位一行 -->
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
        <el-table-column label="本月货款合计(元)" width="160" align="right">
          <template #default="{ row }">
            <span class="amount-in">{{ formatMoney(row.monthTotalTransaction) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="本月付款合计(元)" width="160" align="right">
          <template #default="{ row }">
            <span class="amount-out">{{ formatMoney(row.monthTotalPayment) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="本月合计重量(ct)" width="140" align="right">
          <template #default="{ row }">
            {{ row.monthTotalWeight > 0 ? row.monthTotalWeight.toFixed(4) : '-' }}
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
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { counterpartSummary } from '@/api/transaction'
import { getCounterpartyAll } from '@/api/counterparty'
import * as XLSX from 'xlsx'

const yearMonth = ref(`${new Date().getFullYear()}-${new Date().getMonth() + 1}`)
const filterCounterpartyId = ref(null)
const tableData = ref([])
const counterparties = ref([])
const grandTotal = ref(null)

function formatMoney(val) {
  if (!val && val !== 0) return '-'
  const abs = Math.abs(val)
  const str = abs.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return val < 0 ? `-¥${str}` : `¥${str}`
}

function loadData() {
  const parts = (yearMonth.value || '').split('-')
  const year = parseInt(parts[0])
  const month = parseInt(parts[1])

  counterpartSummary({ year, month, counterpartyId: filterCounterpartyId.value || null })
    .then(res => {
      tableData.value = res.rows || []
      grandTotal.value = {
        grandTotalTransaction: res.grandTotalTransaction || 0,
        grandTotalPayment: res.grandTotalPayment || 0
      }
    })
    .catch(() => {})
}

function loadCounterparties() {
  getCounterpartyAll().then(res => {
    if (res.data) counterparties.value = res.data
  }).catch(() => {})
}

function handleExport() {
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

onMounted(() => {
  loadCounterparties()
  loadData()
})
</script>

<style scoped>
.counterpart-summary { padding: 16px; }
.amount-in { color: #67c23a; }
.amount-out { color: #f56c6c; }
</style>
