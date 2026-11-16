<template>
  <div class="inout-list-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">💰 费用录入列表</span>
          <div v-if="!auditOnly">
            <el-select v-model="filterStatus" placeholder="状态" clearable style="width:120px;margin-right:8px;" @change="loadList">
              <el-option label="草稿" value="draft" />
              <el-option label="待审核" value="pending" />
              <el-option label="已生效" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
            <el-button type="primary" @click="loadList">刷新</el-button>
            <el-button type="success" @click="goCreate">+ 新增录入</el-button>
          </div>
          <div v-else class="audit-badge">
            <el-tag type="danger" effect="dark" size="small">待审核</el-tag>
            <span>{{ directionLabel }}</span>
            <el-button size="small" @click="loadList">刷新</el-button>
          </div>
        </div>
      </template>

      <!-- ⭐ 日期快捷 + 方向 + 关键字筛选 -->
      <div class="search-bar">
        <div class="sb-filter-row">
          <el-radio-group v-model="dateShortcut" size="small" @change="onShortcutChange">
            <el-radio-button value="today">今天</el-radio-button>
            <el-radio-button value="month">本月</el-radio-button>
            <el-radio-button value="all">全部</el-radio-button>
          </el-radio-group>
          <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD"
            size="small" range-separator="~" start-placeholder="开始" end-placeholder="结束"
            style="width:240px" @change="onDateChange" />
          <el-select v-model="filterDirection" placeholder="全部方向" clearable size="small"
            class="sb-direction" @change="handleSearch">
            <el-option label="收入" :value="1" />
            <el-option label="支出" :value="0" />
          </el-select>
        </div>
        <el-input v-model="keyword" placeholder="单号 / 供应商 / 收款项目 / 内容 / 资金分类" clearable
          class="sb-keyword" @keyup.enter="handleSearch" @clear="handleSearch">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filterProductName" placeholder="收款项目" filterable clearable
          class="sb-select" @change="handleSearch">
          <el-option v-for="n in productNameOptions" :key="n" :label="n" :value="n" />
        </el-select>
        <el-select v-model="filterContent" placeholder="内容" filterable clearable
          class="sb-select" @change="handleSearch">
          <el-option v-for="c in contentOptions" :key="c" :label="c" :value="c" />
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <el-table :data="tableData" :empty-text="emptyHint" border stripe v-loading="loading">
        <el-table-column prop="recordNo" label="单号" width="150">
          <template #default="{ row }">
            <el-button link type="primary" class="no-link" @click="goDetail(row)">{{ row.recordNo }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="recordDate" label="日期" width="110">
          <template #default="{ row }">{{ fmtDate(row.recordDate) }}</template>
        </el-table-column>
        <el-table-column label="方向" width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.direction === 1" type="success" size="small">收入</el-tag>
            <el-tag v-else type="danger" size="small">支出</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="counterpartyName" label="供应商" width="140" show-overflow-tooltip />
        <el-table-column prop="productName" label="收款项目" width="110" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" width="130" show-overflow-tooltip />
        <el-table-column prop="expenseCategory" label="资金分类" width="120" />
        <el-table-column prop="amount" label="金额" width="120" align="right">
          <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="paymentAmount" label="付款金额" width="120" align="right">
          <template #default="{ row }">¥{{ (row.paymentAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="paymentMethod" label="支付方式" width="100" align="center">
          <template #default="{ row }">{{ row.paymentMethod || '—' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'draft'" type="info" size="small">草稿</el-tag>
            <el-tag v-else-if="row.status === 'pending'" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="row.status === 'approved'" type="success" size="small">已生效</el-tag>
            <el-tag v-else-if="row.status === 'rejected'" type="danger" size="small">已驳回</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdByName" label="经办人" width="90" />
        <el-table-column prop="auditedByName" label="审核人" width="80" />
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="250" fixed="right" align="center">
          <template #default="{ row }">
            <!-- ⭐ 编辑：草稿 / 已驳回，且是自己创建的 -->
            <el-button
              v-if="(row.status === 'draft' || row.status === 'rejected') && row.createdByName === currentUserName && !auditOnly"
              type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button
              v-if="(row.status === 'draft' || row.status === 'rejected') && row.createdByName === currentUserName && !auditOnly"
              type="primary" size="small" @click="handleSubmit(row)">提交</el-button>
            <!-- ⭐ 审核改为跳详情页：列表能看到的信息太少，详情里核对完整单据再通过/驳回 -->
            <el-button v-if="(isAudit || isAdmin) && row.status === 'pending'"
              type="success" size="small" @click="goAudit(row)">审核</el-button>
            <el-button v-if="isAdmin && !auditOnly" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top:12px;"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="p => { page = p; loadList() }"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getExpenseList, submitExpense, deleteExpense, getInoutFormOptions } from '@/api/inout'
import { shortcutRange, sameRange } from '@/utils/date'

const route = useRoute()
const router = useRouter()
// ⭐ 审核只读模式：隐藏新增/提交/删除，仅保留通过/驳回
const auditOnly = computed(() => route.query.mode === 'audit' || isAudit.value)
const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
// ⭐ 日期默认本月（不再默认全部），提供 今天 / 本月 / 全部 快捷
//    审核入口（workbench 带 mode=audit）默认「全部」，否则往期待审核会被本月区间藏掉
const defaultShortcut = route.query.mode === 'audit' ? 'all' : 'month'
const dateShortcut = ref(defaultShortcut)
const dateRange = ref(shortcutRange(defaultShortcut))
const filterStatus = ref(route.query.status || '')
// ⭐ 方向查询：入口带了 direction 就按入口预选，页面里可改/可清空
const filterDirection = ref(
  (route.query.direction === undefined || route.query.direction === '' || route.query.direction === null)
    ? '' : Number(route.query.direction)
)
// ⭐ 列表搜索：关键字（单号/供应商/产品/内容/资金分类）+ 产品名称 + 内容
const keyword = ref('')
const filterProductName = ref('')
const filterContent = ref('')
const productNameOptions = ref([])
const contentOptions = ref([])

const loadSearchOptions = async () => {
  try {
    const res = await getInoutFormOptions('expense')
    const d = res?.data || {}
    productNameOptions.value = d.productNames || []
    contentOptions.value = d.contents || []
  } catch {}
}

const handleSearch = () => {
  page.value = 1
  loadList()
}

// ⭐ 快捷区间：今天 / 本月 / 全部
const onShortcutChange = (key) => {
  dateRange.value = shortcutRange(key)
  page.value = 1
  loadList()
}
// 手动改日期后，若不再等于快捷区间就取消快捷高亮
const onDateChange = () => {
  if (!sameRange(dateRange.value, shortcutRange(dateShortcut.value))) dateShortcut.value = ''
  page.value = 1
  loadList()
}

// ⭐ 新增录入：按当前方向进对应录入口（之前写死 /inout/expense-input 不存在 → 被兜底到工作台）
const goCreate = () => {
  router.push(filterDirection.value === 0 ? '/inout/expense/out' : '/inout/expense/in')
}

const resetSearch = () => {
  keyword.value = ''
  filterProductName.value = ''
  filterContent.value = ''
  filterDirection.value = ''
  dateShortcut.value = defaultShortcut
  dateRange.value = shortcutRange(defaultShortcut)
  page.value = 1
  loadList()
}
// ⭐ 方向由入口带死（1=进，0=出）
const qDirection = computed(() => {
  const d = route.query.direction
  return (d === undefined || d === '' || d === null) ? undefined : Number(d)
})
const directionLabel = computed(() =>
  qDirection.value === 1 ? '金额 · 进（收入）' : qDirection.value === 0 ? '金额 · 出（支出）' : '全部方向')
const currentUserName = ref('')
const isAudit = ref(false)
const isAdmin = ref(false)
const fmtDate = (v) => v ? String(v).slice(0, 10) : ''

// 本月为空时提示去「全部」看历史（默认本月后最容易踩的误会）
const emptyHint = computed(() =>
  dateShortcut.value === 'month' ? '本月暂无记录，点右上「全部」查看历史' : '暂无数据')

const loadList = async () => {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value, status: filterStatus.value || undefined }
    if (filterDirection.value !== '' && filterDirection.value !== null && filterDirection.value !== undefined) {
      params.direction = filterDirection.value
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    if (keyword.value) params.keyword = keyword.value
    if (filterProductName.value) params.productName = filterProductName.value
    if (filterContent.value) params.content = filterContent.value
    const res = await getExpenseList(params)
    if (res.success) {
      tableData.value = res.data || []
      total.value = res.total || 0
    }
  } catch {}
  finally { loading.value = false }
}

const handleSubmit = async (row) => {
  await ElMessageBox.confirm('确定提交审核吗？', '提示', { type: 'info' })
  const res = await submitExpense(row.id)
  if (res.success) { ElMessage.success('提交成功'); loadList() }
}

// ⭐ 审核 / 查看：统一跳详情页
const goDetail = (row) => router.push({ path: `/inout/audit-detail/expense/${row.id}`, query: { back: route.fullPath } })
const goAudit = (row) => router.push({ path: `/inout/audit-detail/expense/${row.id}`, query: { back: route.fullPath, mode: 'audit' } })
// ⭐ 编辑：回到录入页带 id 回填，保存走 PUT 更新（方向由入口决定）
const handleEdit = (row) => {
  const path = row.direction === 1 ? '/inout/expense/in' : '/inout/expense/out'
  router.push(`${path}?id=${row.id}`)
}

const handleDelete = async (row) => {
  await ElMessageBox.confirm('确定删除吗？', '提示', { type: 'warning' })
  const res = await deleteExpense(row.id)
  if (res.success) { ElMessage.success('删除成功'); loadList() }
}

onMounted(() => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
  currentUserName.value = userInfo.realName || userInfo.name || ''
  const userType = (userInfo.userType || '').toLowerCase()
  isAudit.value = userType === 'factoryaudit'
  isAdmin.value = userType === 'admin'
  loadSearchOptions()
  loadList()
})
</script>

<style scoped>
.inout-list-page { padding: 16px; }
.no-link { font-variant-numeric: tabular-nums; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.search-bar .sb-keyword { width: 260px; }
/* 日期快捷 + 方向：单独占一整行 */
.search-bar .sb-filter-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}
.search-bar .sb-direction { width: 140px; }
.search-bar .sb-select { width: 160px; }
.search-bar .el-button + .el-button { margin-left: 0; }
.title { font-weight: 600; font-size: 16px; }
/* 审核模式：入口带死的筛选条件展示 */
.audit-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #909399;
}
</style>