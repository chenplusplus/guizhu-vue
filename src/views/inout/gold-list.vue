<template>
  <div class="inout-list-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">🥇 金录入列表</span>
          <div v-if="!auditOnly">
            <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD"
              style="width:240px;margin-right:8px;" @change="loadList" />
            <el-select v-model="filterStatus" placeholder="状态" clearable style="width:120px;margin-right:8px;" @change="loadList">
              <el-option label="草稿" value="draft" />
              <el-option label="待审核" value="pending" />
              <el-option label="已生效" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
            <el-button type="primary" @click="loadList">刷新</el-button>
            <el-button type="success" @click="$router.push('/inout/gold-input')">+ 新增录入</el-button>
          </div>
          <div v-else class="audit-badge">
            <el-tag type="danger" effect="dark" size="small">待审核</el-tag>
            <span>{{ directionLabel }}</span>
            <el-button size="small" @click="loadList">刷新</el-button>
          </div>
        </div>
      </template>

      <!-- ⭐ 批量操作栏 -->
      <div class="batch-bar" v-if="selectedRows.length > 0 && !auditOnly">
        <span>已选 {{ selectedRows.length }} 条</span>
        <el-button type="primary" size="small" @click="handleBatchSubmit">批量提交</el-button>
        <el-button type="danger" size="small" v-if="isAdmin && !auditOnly" @click="handleBatchDelete">批量删除</el-button>
      </div>

      <!-- ⭐ 材料分类汇总（行=材料/成色，列=重量与金额） -->
      <div class="summary-block" v-if="!auditOnly">
        <div class="summary-title">🧮 材料分类汇总</div>
        <el-table :data="materialSummaryRows" border size="small" class="summary-table" show-summary
          :summary-method="materialSummary" :row-class-name="materialRowClass">
          <el-table-column prop="materialType" label="材料（成色）" min-width="120" fixed>
            <template #default="{ row }">
              <span class="color-mark" :class="materialRowClass({ row })"></span>{{ row.materialType || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="inWeight" label="收入重(g)" align="right" width="110">
            <template #default="{ row }"><span class="in-val">{{ fmt(row.inWeight, 3) }}</span></template>
          </el-table-column>
          <el-table-column prop="outWeight" label="支出重(g)" align="right" width="110">
            <template #default="{ row }"><span class="out-val">{{ fmt(row.outWeight, 3) }}</span></template>
          </el-table-column>
          <el-table-column prop="netWeight" label="净重(g)" align="right" width="110">
            <template #default="{ row }"><b>{{ fmt(row.netWeight, 3) }}</b></template>
          </el-table-column>
          <el-table-column prop="inAddLoss" label="收入加耗(g)" align="right" width="115">
            <template #default="{ row }">{{ fmt(row.inAddLoss, 3) }}</template>
          </el-table-column>
          <el-table-column prop="outAddLoss" label="支出加耗(g)" align="right" width="115">
            <template #default="{ row }">{{ fmt(row.outAddLoss, 3) }}</template>
          </el-table-column>
          <el-table-column prop="netAddLoss" label="净加耗(g)" align="right" width="115">
            <template #default="{ row }"><b>{{ fmt(row.netAddLoss, 3) }}</b></template>
          </el-table-column>
          <el-table-column prop="lossRate" label="损耗" align="right" width="90">
            <template #default="{ row }">{{ fmt(row.lossRate, 4) }}</template>
          </el-table-column>
          <el-table-column prop="inFold" label="收入折算(g)" align="right" width="115">
            <template #default="{ row }">{{ fmt(row.inFold, 3) }}</template>
          </el-table-column>
          <el-table-column prop="outFold" label="支出折算(g)" align="right" width="115">
            <template #default="{ row }">{{ fmt(row.outFold, 3) }}</template>
          </el-table-column>
          <el-table-column prop="netFold" label="净折算(g)" align="right" width="115">
            <template #default="{ row }">
              <b style="color:#409EFF;">{{ fmt(row.netFold, 3) }}</b>
            </template>
          </el-table-column>
          <el-table-column prop="inAmount" label="收入金额(元)" align="right" width="130">
            <template #default="{ row }"><span class="in-val">¥{{ fmt(row.inAmount, 2) }}</span></template>
          </el-table-column>
          <el-table-column prop="outAmount" label="支出金额(元)" align="right" width="130">
            <template #default="{ row }"><span class="out-val">¥{{ fmt(row.outAmount, 2) }}</span></template>
          </el-table-column>
          <el-table-column prop="netAmount" label="净额(元)" align="right" width="130">
            <template #default="{ row }">
              <b :class="row.netAmount >= 0 ? 'net-in' : 'net-out'">¥{{ fmt(row.netAmount, 2) }}</b>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-table :data="tableData" border stripe v-loading="loading" size="small"
        @selection-change="handleSelectionChange" ref="tableRef">
        <!-- ⭐ 多选列 -->
        <el-table-column type="selection" width="45" align="center" :selectable="canSelect" />

        <el-table-column prop="recordNo" label="单号" width="140" fixed />
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
        <el-table-column prop="materialType" label="材质" width="120" />
        <el-table-column prop="goldWeight" label="重量" width="90" align="right">
          <template #default="{ row }">{{ fmt(row.goldWeight, 4) }}</template>
        </el-table-column>
        <el-table-column prop="lossRate" label="损耗" width="80" align="right">
          <template #default="{ row }">{{ fmt(row.lossRate, 4) }}</template>
        </el-table-column>
        <el-table-column prop="totalWeight" label="总量" width="90" align="right">
          <template #default="{ row }">{{ fmt(row.totalWeight, 4) }}</template>
        </el-table-column>
        <el-table-column prop="foldWeight" label="折算重" width="90" align="right">
          <template #default="{ row }">
            <span :style="{ color: getFoldColor(row.foldCategory) }">{{ fmt(row.foldWeight, 4) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="patchWeight" label="补钯重" width="90" align="right">
          <template #default="{ row }">{{ fmt(row.patchWeight, 4) }}</template>
        </el-table-column>
        <el-table-column prop="mouthWeight" label="补口重" width="90" align="right">
          <template #default="{ row }">{{ fmt(row.mouthWeight, 4) }}</template>
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
        <el-table-column prop="currentTotalFold" label="本单累计" width="120" align="right">
          <template #default="{ row }">
            <span style="font-weight:600;color:#409EFF;">{{ fmt(row.currentTotalFold, 4) }}</span>
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
        <el-table-column prop="productName" label="产品名称" width="100" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" width="100" show-overflow-tooltip />
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

            <!-- 审核：审核员/管理员，待审核 -->
            <template v-if="(isAudit || isAdmin) && row.status === 'pending'">
              <el-button type="success" link size="small" @click="handleAudit(row, true)">通过</el-button>
              <el-button type="danger" link size="small" @click="handleAudit(row, false)">驳回</el-button>
            </template>

            <!-- 删除：管理员 -->
            <el-button v-if="isAdmin && !auditOnly" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 审核弹窗（录入审核人/备注） -->
      <el-dialog v-model="auditDialogVisible" title="审核" width="420px" append-to-body>
        <el-form label-width="80px">
          <el-form-item label="审核人">
            <el-input v-model="auditForm.auditedByName" placeholder="默认当前登录人" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="auditForm.remark" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="auditDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmAudit">确定</el-button>
        </template>
      </el-dialog>

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
import { getGoldList, getGoldSummaryByMaterial, submitGold, auditGold, deleteGold } from '@/api/inout'

const route = useRoute()
const router = useRouter()
// ⭐ 审核只读模式：由审核工作台跳转带 mode=audit，隐藏新增/编辑/删除，仅保留通过/驳回
const auditOnly = computed(() => route.query.mode === 'audit' || isAudit.value)
const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const dateRange = ref([])
const filterStatus = ref(route.query.status || '')
// ⭐ 方向由入口带死（1=进/收，0=出/支）：审核工作台按「进 / 出」拆卡跳转
const qDirection = computed(() => {
  const d = route.query.direction
  return (d === undefined || d === '' || d === null) ? undefined : Number(d)
})
const directionLabel = computed(() =>
  qDirection.value === 1 ? '金料 · 进（收入）' : qDirection.value === 0 ? '金料 · 出（支出）' : '全部方向')
const currentUserName = ref('')
const isAudit = ref(false)
const isAdmin = ref(false)
const selectedRows = ref([])
const tableRef = ref()

const fmt = (v, d) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(d) : (0).toFixed(d)
}

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

const auditDialogVisible = ref(false)
const auditForm = reactive({ id: 0, approved: true, auditedByName: '', remark: '' })

const loadList = async () => {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value, status: filterStatus.value || undefined }
    if (qDirection.value !== undefined) params.direction = qDirection.value
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await getGoldList(params)
    if (res.success) {
      tableData.value = res.data || []
      total.value = res.total || 0
    }
  } catch {}
  finally { loading.value = false }
  loadSummary()
}

// ===== 材料分类汇总（随筛选联动） =====
const summaryData = ref([])   // [{materialType, inWeight, outWeight, inTotalWeight, outTotalWeight, inFoldWeight, outFoldWeight, inAmount, outAmount}]
const dictLabels = ref([])    // 成色字典顺序

// 行=材料；按成色字典排序，字典外的排最后
const materialSummaryRows = computed(() => {
  return summaryData.value.map(x => {
    const inW = Number(x.inWeight) || 0
    const outW = Number(x.outWeight) || 0
    const inA = Number(x.inTotalWeight) || 0
    const outA = Number(x.outTotalWeight) || 0
    const inF = Number(x.inFoldWeight) || 0
    const outF = Number(x.outFoldWeight) || 0
    const netW = inW - outW
    const netA = inA - outA
    return {
      materialType: x.materialType,
      inWeight: inW,
      outWeight: outW,
      netWeight: netW,
      inAddLoss: inA,
      outAddLoss: outA,
      netAddLoss: netA,
      lossRate: netW !== 0 ? netA / netW : 0,
      inFold: inF,
      outFold: outF,
      netFold: inF - outF,
      inAmount: Number(x.inAmount) || 0,
      outAmount: Number(x.outAmount) || 0,
      netAmount: (Number(x.inAmount) || 0) - (Number(x.outAmount) || 0),
      _order: dictLabels.value.indexOf(x.materialType)
    }
  }).sort((a, b) => {
    const oa = a._order === -1 ? 999 : a._order
    const ob = b._order === -1 ? 999 : b._order
    return oa - ob
  })
})

// 成色配色（金系由浓到淡，PT/银/铜各有色）
const tone = (c) => {
  const s = String(c || '')
  if (/足金|999|990|黄金|^黄/.test(s)) return 'mat-gold-999'
  if (/玫瑰金|18\s*K/i.test(s)) return 'mat-gold-18k'
  if (/白色|14\s*K/i.test(s)) return 'mat-gold-14k'
  if (/9\s*K|22\s*K/i.test(s)) return 'mat-gold-9k'
  if (/PT|铂/i.test(s)) return 'mat-pt'
  if (/银/i.test(s)) return 'mat-silver'
  if (/铜/i.test(s)) return 'mat-copper'
  return 'mat-gold-other'
}
const materialRowClass = ({ row }) => tone(row?.materialType)

// 合计行
const materialSummary = ({ columns, data }) => {
  const sums = []
  columns.forEach((col, i) => {
    if (i === 0) { sums[i] = '合计'; return; }
    if (col.property === 'lossRate') { sums[i] = ''; return; }
    if (['inWeight', 'outWeight', 'netWeight', 'inAddLoss', 'outAddLoss', 'netAddLoss', 'inFold', 'outFold', 'netFold'].includes(col.property)) {
      sums[i] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 1000) / 1000
      return
    }
    if (['inAmount', 'outAmount', 'netAmount'].includes(col.property)) {
      sums[i] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 100) / 100
      return
    }
    sums[i] = ''
  })
  return sums
}

// 加载成色字典（决定行的排序）
const loadDict = async () => {
  try {
    const { dictApi } = await import('@/api/dict')
    const res = await dictApi.getItemsByKey('purity')
    dictLabels.value = (res?.data || []).map(x => x.itemLabel || x.itemValue)
  } catch {}
}

const loadSummary = async () => {
  if (auditOnly.value) return  // 审核模式隐藏汇总，不请求
  try {
    const params = { status: filterStatus.value || undefined }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
    const res = await getGoldSummaryByMaterial(params)
    if (res.success) summaryData.value = res.data || []
  } catch {}
}

// 编辑
const handleEdit = (row) => {
  router.push(`/inout/gold-input?id=${row.id}`)
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

// 审核
const handleAudit = (row, approved) => {
  auditForm.id = row.id
  auditForm.approved = approved
  auditForm.auditedByName = currentUserName.value
  auditForm.remark = ''
  auditDialogVisible.value = true
}

const confirmAudit = async () => {
  const res = await auditGold(auditForm.id, auditForm.approved, auditForm.remark, auditForm.auditedByName)
  if (res.success) {
    ElMessage.success(auditForm.approved ? '已通过' : '已驳回')
    auditDialogVisible.value = false
    loadList()
  }
}

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
  loadDict()
  loadList()
})
</script>

<style scoped>
.inout-list-page { padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; font-size: 16px; }
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
.summary-block { margin-bottom: 14px; }
.summary-title { font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #8c5a18; }
.summary-table { width: 100%; }
.in-val { color: #67c23a; font-weight: 600; }
.out-val { color: #f56c6c; font-weight: 600; }
.net-in { color: #409eff; }
.net-out { color: #e6a23c; }
.color-mark { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: middle; border: 1px solid rgba(0,0,0,.15); }

/* 成色配色 */
:deep(.el-table__row.mat-gold-999) > td.el-table__cell { background: #FFE9A3 !important; }
:deep(.el-table__row.mat-gold-18k) > td.el-table__cell { background: #FDF0BE !important; }
:deep(.el-table__row.mat-gold-14k) > td.el-table__cell { background: #FDF6D9 !important; }
:deep(.el-table__row.mat-gold-9k) > td.el-table__cell { background: #FEFAEC !important; }
:deep(.el-table__row.mat-gold-other) > td.el-table__cell { background: #FBF3E4 !important; }
:deep(.el-table__row.mat-pt) > td.el-table__cell { background: #F0EBF9 !important; }
:deep(.el-table__row.mat-silver) > td.el-table__cell { background: #EDF1F4 !important; }
:deep(.el-table__row.mat-copper) > td.el-table__cell { background: #F7EAE0 !important; }
.color-mark.mat-gold-999 { background: #FFE9A3; }
.color-mark.mat-gold-18k { background: #FDF0BE; }
.color-mark.mat-gold-14k { background: #FDF6D9; }
.color-mark.mat-gold-9k { background: #FEFAEC; }
.color-mark.mat-gold-other { background: #FBF3E4; }
.color-mark.mat-pt { background: #F0EBF9; }
.color-mark.mat-silver { background: #EDF1F4; }
.color-mark.mat-copper { background: #F7EAE0; }
/* 审核模式：入口带死的筛选条件展示 */
.audit-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #909399;
}
</style>