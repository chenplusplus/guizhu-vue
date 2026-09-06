<template>
  <div class="factory-summary">
    <el-card>
      <template #header>
        <el-space>
          <span>全工厂汇总</span>
          <el-date-picker
            v-model="yearMonth"
            type="month"
            value-format="YYYY-M"
            placeholder="选择月份"
            style="width:130px"
            @change="loadData"
          />
          <el-select v-model="filterCategory" placeholder="内容分类筛选" clearable style="width:160px" @change="loadData">
            <el-option v-for="c in categories" :key="c.key" :label="c.label" :value="c.key" />
          </el-select>
          <el-button type="primary" @click="loadData">刷新</el-button>
        </el-space>
      </template>

      <!-- 26分类 × 5维度 矩阵表 -->
      <div class="table-wrapper">
        <table class="matrix-table" border="1">
          <thead>
            <tr>
              <th class="dim-col">维度</th>
              <th v-for="cat in displayCategories" :key="cat" class="cat-col">{{ cat }}</th>
              <th class="total-col">合计</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summaryRows" :key="row.dimension">
              <td class="dim-col">{{ row.dimension }}</td>
              <td v-for="cat in displayCategories" :key="cat" class="num-col">
                <span v-if="filterCategory && filterCategory !== cat && row.dimension !== '期末数'">-</span>
                <span v-else>{{ formatNum(row.categories?.[cat] ?? 0, row.dimension) }}</span>
              </td>
              <td class="total-col num-col">{{ formatNum(row.total, row.dimension) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <el-divider content-position="left">月度明细</el-divider>

      <el-table :data="details" stripe border size="small" max-height="400">
        <el-table-column prop="recordDate" label="日期" width="100" />
        <el-table-column prop="recordNo" label="单号" width="150" />
        <el-table-column prop="bizType" label="业务类型" width="80" />
        <el-table-column prop="counterpartyName" label="往来对象" width="140" />
        <el-table-column prop="contentCategory" label="内容分类" width="100" />
        <el-table-column prop="kGoldCountPlus" label="件数+" width="70" align="right" />
        <el-table-column prop="kGoldCountMinus" label="件数-" width="70" align="right" />
        <el-table-column prop="weight" label="重量(ct)" width="80" align="right" />
        <el-table-column prop="transactionAmount" label="交易金额" width="100" align="right">
          <template #default="{ row }">{{ row.transactionAmount > 0 ? '¥' + row.transactionAmount.toFixed(2) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="paymentAmount" label="付款金额" width="100" align="right">
          <template #default="{ row }">{{ row.paymentAmount > 0 ? '¥' + row.paymentAmount.toFixed(2) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.status==='approved'||row.status==='running'" type="success" size="small">已生效</el-tag>
            <el-tag v-else type="info" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { factorySummary } from '@/api/transaction'

const yearMonth = ref(`${new Date().getFullYear()}-${new Date().getMonth() + 1}`)
const filterCategory = ref('')
const summaryRows = ref([])
const details = ref([])

const categories = [
  { key: '18k', label: '18K' },
  { key: '14k', label: '14K' },
  { key: '9k', label: '9K' },
  { key: 'PT', label: 'PT' },
  { key: '银', label: '银' },
  { key: '铜', label: '铜' },
  { key: '倒模费用', label: '倒模费用' },
  { key: '配件费用', label: '配件费用' },
  { key: '天然钻石费用', label: '天然钻石费用' },
  { key: '培育钻石费用', label: '培育钻石费用' },
  { key: '房租/水电', label: '房租/水电' },
  { key: '工资', label: '工资' },
  { key: '工具费用', label: '工具费用' },
  { key: '滴胶/电金', label: '滴胶/电金' },
  { key: '彩宝费用', label: '彩宝费用' },
  { key: '伙食费', label: '伙食费' },
  { key: '其他开支', label: '其他开支' },
  { key: '蜡费', label: '蜡费' },
  { key: '黄金', label: '黄金' },
  { key: '钢片', label: '钢片' },
  { key: '贝母', label: '贝母' },
  { key: '工费', label: '工费' },
  { key: '磨石费', label: '磨石费' },
  { key: '维修', label: '维修' },
  { key: '回收', label: '回收' },
  { key: '货款', label: '货款' }
]

const displayCategories = computed(() => {
  if (filterCategory.value) return [filterCategory.value]
  return categories.map(c => c.key)
})

function formatNum(val, dimension) {
  if (dimension === '期末数' || dimension === '期初数') return '¥' + (val || 0).toFixed(2)
  if (dimension === '本月合计重量(ct)') return (val || 0).toFixed(2)
  return '¥' + (val || 0).toFixed(2)
}

function loadData() {
  const parts = (yearMonth.value || '').split('-')
  const year = parseInt(parts[0])
  const month = parseInt(parts[1])
  factorySummary({ year, month }).then(res => {
    summaryRows.value = res.summary || []
    details.value = res.details || []
  }).catch(() => {})
}

onMounted(loadData)
</script>

<style scoped>
.factory-summary { padding: 16px; }
.table-wrapper { overflow-x: auto; }
.matrix-table { border-collapse: collapse; width: 100%; font-size: 13px; min-width: 1200px; }
.matrix-table th, .matrix-table td { padding: 6px 8px; border: 1px solid #d0d0d0; }
.dim-col { background: #f0f0f0; font-weight: bold; width: 120px; }
.total-col { background: #fffbe6; font-weight: bold; }
.num-col { text-align: right; }
.matrix-table tbody tr:nth-child(5) td { background: #fffbe6; font-weight: bold; }
</style>
