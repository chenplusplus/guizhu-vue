<template>
  <div class="inout-list-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">🥇 金录入列表</span>
          <div>
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
        </div>
      </template>

      <!-- ⭐ 批量操作栏 -->
      <div class="batch-bar" v-if="selectedRows.length > 0">
        <span>已选 {{ selectedRows.length }} 条</span>
        <el-button type="primary" size="small" @click="handleBatchSubmit">批量提交</el-button>
        <el-button type="danger" size="small" v-if="isAdmin" @click="handleBatchDelete">批量删除</el-button>
      </div>

      <el-table :data="tableData" border stripe v-loading="loading" size="small"
        @selection-change="handleSelectionChange" ref="tableRef">
        <!-- ⭐ 多选列 -->
        <el-table-column type="selection" width="45" align="center" :selectable="canSelect" />

        <el-table-column prop="recordNo" label="单号" width="140" fixed />
        <el-table-column prop="recordDate" label="日期" width="100" />
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
        <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <!-- 编辑：草稿、已驳回，且是自己创建的 -->
            <el-button
              v-if="(row.status === 'draft' || row.status === 'rejected') && row.createdByName === currentUserName"
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
            <el-button v-if="isAdmin" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getGoldList, submitGold, auditGold, deleteGold } from '@/api/inout'

const router = useRouter()
const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const dateRange = ref([])
const filterStatus = ref('')
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

// 可选中：草稿/已驳回 + 是自己创建的
const canSelect = (row) => {
  return (row.status === 'draft' || row.status === 'rejected')
    && row.createdByName === currentUserName.value
}

const handleSelectionChange = (rows) => {
  selectedRows.value = rows
}

const loadList = async () => {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value, status: filterStatus.value || undefined }
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
const handleAudit = async (row, approved) => {
  const action = approved ? '通过' : '驳回'
  await ElMessageBox.confirm(`确定${action}吗？`, '提示', { type: approved ? 'success' : 'warning' })
  const res = await auditGold(row.id, approved)
  if (res.success) { ElMessage.success(`已${action}`); loadList() }
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
</style>