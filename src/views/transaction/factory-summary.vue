<template>
  <div class="factory-summary">
    <el-card>
      <template #header>
        <el-space wrap>
          <span>全工厂汇总</span>
          <el-tag size="small" type="info" effect="plain">仅进销存 · 不含订单</el-tag>
          <el-date-picker
            v-model="yearMonth"
            type="month"
            value-format="YYYY-M"
            placeholder="选择月份"
            style="width:130px"
            @change="loadMonthData"
          />
          <el-button :type="isToday ? 'success' : 'default'" @click="loadToday">今天</el-button>
          <el-select v-model="filterCategory" placeholder="内容分类筛选" clearable style="width:160px" @change="loadData">
            <el-option v-for="c in categories" :key="c.key" :label="c.label" :value="c.key" />
          </el-select>
          <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
          <el-button type="success" :disabled="!summaryRows.length" @click="exportExcel">下载 Excel</el-button>
        </el-space>
      </template>

      <!-- 26 分类 × 进/出/差额（仅进销存三表，不含订单）-->
      <div class="table-wrapper">
        <table class="matrix-table" border="1">
          <thead>
            <tr>
              <th class="dim-col">维度</th>
              <th v-for="cat in displayCategories" :key="cat" class="cat-col" :class="categoryColorClass(cat)">{{ categoryLabel(cat) }}</th>
              <th class="total-col">合计</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summaryRows" :key="row.dimension">
              <td class="dim-col">{{ row.dimension }}</td>
              <td
                v-for="cat in displayCategories"
                :key="cat"
                class="num-col material-cell"
                :class="categoryColorClass(cat)"
              >
                <span v-if="filterCategory && filterCategory !== cat">-</span>
                <span v-else :class="{ neg: Number(row.categories?.[cat] ?? 0) < 0 }">{{ formatNum(row.categories?.[cat] ?? 0, row.dimension) }}</span>
              </td>
              <td class="total-col num-col">{{ formatNum(row.total, row.dimension) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="legend">
          <span class="legend-item"><span class="legend-dot"></span> 数据来源：进销存「金 / 钻石 / 费用」三张表（不含订单）</span>
          <span class="legend-item"><span class="legend-dot material-dot"></span> 材料类别以底色区分</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { factorySummary } from '@/api/transaction'

const yearMonth = ref(`${new Date().getFullYear()}-${new Date().getMonth() + 1}`)
const filterCategory = ref('')
const summaryRows = ref([])
const selectedDate = ref('')
const loading = ref(false)
const isToday = computed(() => selectedDate.value === formatDate(new Date()))

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

const categoryLabel = (key) => categories.find(c => c.key === key)?.label || key

const categoryColorClass = (key) => ({
  '18k': 'material-18k',
  '14k': 'material-14k',
  '9k': 'material-9k',
  PT: 'material-pt',
  银: 'material-silver',
  铜: 'material-copper',
  '天然钻石费用': 'material-diamond',
  '培育钻石费用': 'material-lab-diamond',
  '黄金': 'material-gold',
  '钢片': 'material-steel',
  '贝母': 'material-shell',
  '彩宝费用': 'material-gem',
}[key] || '')

function formatNum(val, dimension) {
  if (dimension === '期末数' || dimension === '期初数') return '¥' + (val || 0).toFixed(2)
  if (dimension.endsWith('合计重量(ct)')) return (val || 0).toFixed(2)
  return '¥' + (val || 0).toFixed(2)
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function loadMonthData() {
  selectedDate.value = ''
  loadData()
}

function loadToday() {
  selectedDate.value = formatDate(new Date())
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    const parts = (yearMonth.value || '').split('-')
    const params = selectedDate.value
      ? { date: selectedDate.value }
      : { year: parseInt(parts[0]), month: parseInt(parts[1]) }
    const res = await factorySummary(params)
    summaryRows.value = res.summary || []
  } catch (error) {
    console.error('加载全工厂汇总失败:', error)
    ElMessage.error('加载全工厂汇总失败')
  } finally {
    loading.value = false
  }
}

function exportExcel() {
  const headers = ['维度', ...displayCategories.value.map(categoryLabel), '合计']
  const rows = summaryRows.value.map(row => [
    row.dimension,
    ...displayCategories.value.map(category => Number(row.categories?.[category]) || 0),
    Number(row.total) || 0
  ])
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '全工厂汇总')
  const period = selectedDate.value || yearMonth.value
  XLSX.writeFile(workbook, `全工厂汇总_${period}.xlsx`)
}

onMounted(loadData)
</script>

<style scoped>
.factory-summary { padding: 16px; }
.table-wrapper { overflow-x: auto; }
.matrix-table { border-collapse: collapse; width: 100%; font-size: 13px; min-width: 2160px; }
.matrix-table th, .matrix-table td { padding: 6px 8px; border: 1px solid #d0d0d0; }
.dim-col { background: #f0f0f0; font-weight: bold; width: 132px; min-width: 132px; white-space: nowrap; }
.total-col { background: #fffbe6; font-weight: bold; }
.num-col { text-align: right; white-space: nowrap; }
.num-col .neg { color: #d64545; font-weight: 600; }
.matrix-table tbody tr:last-child td:not(.material-cell) { background: #fffbe6; font-weight: bold; }
.matrix-table tbody tr:last-child td.material-cell { font-weight: bold; }
.cat-col { min-width: 72px; }
.material-18k { background: #fff1bd; }
.material-14k { background: #fff6d8; }
.material-9k { background: #fffbea; }
.material-pt { background: #eee7f8; }
.material-silver { background: #e9eef2; }
.material-copper { background: #f7e7dc; }
.material-diamond { background: #e6f0ff; }
.material-lab-diamond { background: #e6f7f7; }
.material-gold { background: #ffe69a; }
.material-steel { background: #e5e9ed; }
.material-shell { background: #f5e8f2; }
.material-gem { background: #fbe4ee; }

.legend { margin-top: 8px; font-size: 12px; color: #606266; }
.legend-item { margin-right: 16px; display: inline-flex; align-items: center; }
.legend-dot { display: inline-block; width: 12px; height: 12px; border: 1px solid #d0d0d0; background: #fff; margin-right: 4px; }
.material-dot { background: linear-gradient(90deg, #fff1bd, #eee7f8, #e6f0ff, #f5e8f2); }
</style>
