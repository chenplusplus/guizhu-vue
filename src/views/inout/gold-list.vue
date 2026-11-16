<template>
  <div class="inout-list-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">🥇 金录入列表</span>
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
            <el-option label="入库（收）" :value="1" />
            <el-option label="出库（支）" :value="0" />
          </el-select>
        </div>
        <el-input v-model="keyword" placeholder="单号 / 供应商 / 产品名称 / 内容 / 成色" clearable
          class="sb-keyword" @keyup.enter="handleSearch" @clear="handleSearch">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="filterProductName" placeholder="产品名称" filterable clearable
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

      <!-- ⭐ 批量操作栏 -->
      <div class="batch-bar" v-if="selectedRows.length > 0 && !auditOnly">
        <span>已选 {{ selectedRows.length }} 条</span>
        <el-button type="primary" size="small" @click="handleBatchSubmit">批量提交</el-button>
        <el-button type="danger" size="small" v-if="isAdmin && !auditOnly" @click="handleBatchDelete">批量删除</el-button>
      </div>

      <el-table :data="tableData" :empty-text="emptyHint" border stripe v-loading="loading" size="small"
        @selection-change="handleSelectionChange" ref="tableRef">
        <!-- ⭐ 多选列 -->
        <el-table-column type="selection" width="45" align="center" :selectable="canSelect" />

        <el-table-column prop="recordNo" label="单号" width="140" fixed>
          <template #default="{ row }">
            <el-button link type="primary" class="no-link" @click="goDetail(row)">{{ row.recordNo }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="recordDate" label="日期" width="110">
          <template #default="{ row }">{{ fmtDate(row.recordDate) }}</template>
        </el-table-column>
        <el-table-column label="方向" width="60" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.direction === 1" type="success" size="small">收</el-tag>
            <el-tag v-else type="danger" size="small">支</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="counterpartyName" label="供应商" width="130" show-overflow-tooltip />
        <el-table-column prop="productName" label="产品名称" width="110" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" width="120" show-overflow-tooltip />
        <el-table-column prop="materialType" label="成色" width="110">
          <template #default="{ row }">
            <span v-if="row.materialType">{{ row.materialType }}</span>
            <span v-else class="muted-cell">未填成色</span>
          </template>
        </el-table-column>
        <el-table-column prop="goldWeight" label="金重 (g)" width="90" align="right">
          <template #default="{ row }">{{ fmt(row.goldWeight, 2) }}</template>
        </el-table-column>
        <el-table-column prop="lossRate" label="损耗率" width="78" align="right">
          <template #default="{ row }">{{ pct(row.lossRate) }}</template>
        </el-table-column>
        <el-table-column prop="totalWeight" label="加耗总重 (g)" width="105" align="right">
          <template #default="{ row }">{{ fmt(row.totalWeight, 2) }}</template>
        </el-table-column>
        <el-table-column prop="foldRate" label="折算率" width="78" align="right">
          <template #default="{ row }">{{ row.foldRate == null ? '—' : pct(row.foldRate) }}</template>
        </el-table-column>
        <!-- ⭐ 成色按折算率折成足金：折足金 = 加耗总重 × 折算率 -->
        <el-table-column prop="foldWeight" label="折足金 (g)" width="100" align="right">
          <template #default="{ row }">
            <el-tooltip content="折足金 = 加耗总重 × 折算率" placement="top" :show-after="300">
              <span class="fold-cell" :style="{ color: getFoldColor(row.foldCategory) }">{{ fmt(row.foldWeight, 2) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <!-- 付足料：买配件时付给供应商的足金，冲减本单欠料 -->
        <el-table-column prop="paidFoldWeight" label="付足料 (g)" width="100" align="right">
          <template #default="{ row }">
            <span v-if="Number(row.paidFoldWeight) > 0" class="paid-fold-cell">{{ fmt(row.paidFoldWeight, 2) }}</span>
            <span v-else class="zero-cell">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="patchWeight" label="补钯重" width="90" align="right">
          <template #default="{ row }">{{ fmt(row.patchWeight, 2) }}</template>
        </el-table-column>
        <el-table-column prop="mouthWeight" label="补口重" width="90" align="right">
          <template #default="{ row }">{{ fmt(row.mouthWeight, 2) }}</template>
        </el-table-column>
        <!-- 补口价（单价）× 补口重 = 补口金额 -->
        <el-table-column prop="mouthPrice" label="补口价" width="90" align="right">
          <template #default="{ row }">
            <span v-if="Number(row.mouthPrice) > 0">¥{{ fmt(row.mouthPrice, 2) }}</span>
            <span v-else class="zero-cell">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="mouthAmount" label="补口金额" width="90" align="right">
          <template #default="{ row }">¥{{ fmt(row.mouthAmount, 2) }}</template>
        </el-table-column>
        <el-table-column prop="patchFee" label="补钯金费" width="90" align="right">
          <template #default="{ row }">¥{{ fmt(row.patchFee, 2) }}</template>
        </el-table-column>
        <el-table-column prop="laborFee" label="工费" width="80" align="right">
          <template #default="{ row }">¥{{ fmt(row.laborFee, 2) }}</template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="总金额" width="100" align="right">
          <template #default="{ row }">
            <span style="font-weight:600;color:#E6A23C;">¥{{ fmt(row.totalAmount, 2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'draft'" type="info" size="small">草稿</el-tag>
            <el-tag v-else-if="row.status === 'pending'" type="warning" size="small">待审</el-tag>
            <el-tag v-else-if="row.status === 'approved'" type="success" size="small">生效</el-tag>
            <el-tag v-else-if="row.status === 'rejected'" type="danger" size="small">驳回</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdByName" label="经办人" width="80" />
        <el-table-column prop="auditedByName" label="审核人" width="80" />
        <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <!-- 编辑：草稿、已驳回，且是自己创建的 -->
            <el-button
              v-if="(row.status === 'draft' || row.status === 'rejected') && row.createdByName === currentUserName && !auditOnly"
              type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>

            <!-- 提交：草稿、已驳回，且是自己创建的 -->
            <el-button
              v-if="(row.status === 'draft' || row.status === 'rejected') && row.createdByName === currentUserName"
              type="success" link size="small" @click="handleSubmit(row)">提交</el-button>

            <!-- ⭐ 审核：跳详情页核对整单后再通过/驳回（列表信息不全，不再直接审） -->
            <el-button v-if="(isAudit || isAdmin) && row.status === 'pending'"
              type="success" link size="small" @click="goAudit(row)">审核</el-button>

            <!-- 删除：管理员 -->
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
import { getGoldList, submitGold, deleteGold, getInoutFormOptions } from '@/api/inout'
import { GOLD_CONTENT_OPTIONS, mergeOptions } from '@/constants/inoutOptions'
import { shortcutRange, sameRange } from '@/utils/date'

const route = useRoute()
const router = useRouter()
// ⭐ 审核只读模式：由审核工作台跳转带 mode=audit，隐藏新增/编辑/删除，仅保留通过/驳回
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
// ⭐ 列表搜索：关键字（单号/供应商/产品/内容/成色）+ 产品名称 + 内容
const keyword = ref('')
const filterProductName = ref('')
const filterContent = ref('')
const productNameOptions = ref([])
const contentOptions = ref([])

// 下拉选项取自历史录入值，便于按产品/内容直接筛选
const loadSearchOptions = async () => {
  try {
    const res = await getInoutFormOptions('gold')
    const d = res?.data || {}
    productNameOptions.value = d.productNames || []
    contentOptions.value = mergeOptions(GOLD_CONTENT_OPTIONS, d.contents || [])
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

// ⭐ 新增录入：按当前方向进对应录入口（之前写死 /inout/gold-input 不存在 → 被兜底到工作台）
const goCreate = () => {
  router.push(filterDirection.value === 0 ? '/inout/gold/out' : '/inout/gold/in')
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
// ⭐ 方向由入口带死（1=进/收，0=出/支）：审核工作台按「进 / 出」拆卡跳转
const qDirection = computed(() => {
  const d = route.query.direction
  return (d === undefined || d === '' || d === null) ? undefined : Number(d)
})
const directionLabel = computed(() =>
  qDirection.value === 1 ? '金料 · 入库（付钱）' : qDirection.value === 0 ? '金料 · 出库（收钱）' : '全部方向')
const currentUserName = ref('')
const isAudit = ref(false)
const isAdmin = ref(false)
const selectedRows = ref([])
const tableRef = ref()

const fmt = (v, d) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(d) : (0).toFixed(d)
}
// 率（折算率/损耗率）统一按百分比两位显示，避免 1.0000 这种长小数
const pct = (v) => (Number(v || 0) * 100).toFixed(2) + '%'

const getFoldColor = (cat) => {
  return { gold: '#E6A23C', silver: '#909399', copper: '#67C23A' }[cat] || '#E6A23C'
}

const fmtDate = (v) => v ? String(v).slice(0, 10) : ''

// 可选中：草稿/已驳回 + 是自己创建的
const canSelect = (row) => {
  return (row.status === 'draft' || row.status === 'rejected')
    && row.createdByName === currentUserName.value
}

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}


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
    const res = await getGoldList(params)
    if (res.success) {
      tableData.value = res.data || []
      total.value = res.total || 0
    }
  } catch {}
  finally { loading.value = false }
}

// 编辑：按记录方向进入对应入口（方向由入口决定，不可在页面里切换）
const handleEdit = (row) => {
  const path = row.direction === 1 ? '/inout/gold/in' : '/inout/gold/out'
  router.push(`${path}?id=${row.id}`)
}

// 单条提交
const handleSubmit = async (row) => {
  await ElMessageBox.confirm(`确定提交【${row.recordNo}】审核吗？`, '提示', { type: 'info' })
  const res = await submitGold(row.id)
  if (res.success) { ElMessage.success('提交成功'); loadList() }
}

// 批量提交
const handleBatchSubmit = async () => {
  if (selectedRows.value.length === 0) return
  await ElMessageBox.confirm(`确定提交 ${selectedRows.value.length} 条记录审核吗？`, '提示', { type: 'info' })
  let ok = 0, fail = 0
  for (const r of selectedRows.value) {
    try {
      const res = await submitGold(r.id)
      if (res.success) ok++
      else fail++
    } catch { fail++ }
  }
  ElMessage.success(`成功 ${ok} 条，失败 ${fail} 条`)
  tableRef.value?.clearSelection()
  loadList()
}

// ⭐ 审核 / 查看：统一跳详情页（审核动作在详情页完成）
const goDetail = (row) => router.push({ path: `/inout/audit-detail/gold/${row.id}`, query: { back: route.fullPath } })
const goAudit = (row) => router.push({ path: `/inout/audit-detail/gold/${row.id}`, query: { back: route.fullPath, mode: 'audit' } })

// 删除
const handleDelete = async (row) => {
  await ElMessageBox.confirm('确定删除吗？', '提示', { type: 'warning' })
  const res = await deleteGold(row.id)
  if (res.success) { ElMessage.success('删除成功'); loadList() }
}

// 批量删除
const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) return
  await ElMessageBox.confirm(`确定删除 ${selectedRows.value.length} 条记录吗？`, '提示', { type: 'warning' })
  let ok = 0, fail = 0
  for (const r of selectedRows.value) {
    try {
      const res = await deleteGold(r.id)
      if (res.success) ok++
      else fail++
    } catch { fail++ }
  }
  ElMessage.success(`成功 ${ok} 条，失败 ${fail} 条`)
  tableRef.value?.clearSelection()
  loadList()
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
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; font-size: 16px; }
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
/* 日期快捷 + 方向：单独占一整行，避免和关键字挤在一起 */
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
.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #ecf5ff;
  border-radius: 4px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #409EFF;
}
/* 审核模式：入口带死的筛选条件展示 */
.audit-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #909399;
}
/* 折足金是这个页面的主指标：加粗带下划虚线，提示可以悬浮看口径 */
.fold-cell { font-weight: 600; border-bottom: 1px dashed currentColor; cursor: help; }
.paid-fold-cell { font-weight: 600; color: #F56C6C; }
.zero-cell { color: #c0c4cc; }
.muted-cell { color: #c0c4cc; }
</style>