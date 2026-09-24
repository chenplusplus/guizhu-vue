<template>
  <div class="inout-list-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">💰 费用录入列表</span>
          <div>
            <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" style="width:240px;margin-right:8px;" @change="loadList" />
            <el-select v-model="filterStatus" placeholder="状态" clearable style="width:120px;margin-right:8px;" @change="loadList">
              <el-option label="草稿" value="draft" />
              <el-option label="待审核" value="pending" />
              <el-option label="已生效" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
            <el-button type="primary" @click="loadList">刷新</el-button>
            <el-button type="success" @click="$router.push('/inout/expense-input')">+ 新增录入</el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="recordNo" label="单号" width="150" />
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
        <el-table-column prop="expenseCategory" label="资金分类" width="120" />
        <el-table-column prop="amount" label="金额" width="120" align="right">
          <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="paymentAmount" label="付款金额" width="120" align="right">
          <template #default="{ row }">¥{{ (row.paymentAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="lastTotalAmount" label="上单累计" width="120" align="right">
          <template #default="{ row }">¥{{ (row.lastTotalAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="currentTotalAmount" label="本单累计" width="120" align="right">
          <template #default="{ row }">
            <span style="font-weight:600;color:#409EFF;">¥{{ (row.currentTotalAmount || 0).toFixed(2) }}</span>
          </template>
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
        <el-table-column prop="productName" label="产品名称" width="100" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" width="100" show-overflow-tooltip />
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="(row.status === 'draft' || row.status === 'rejected') && row.createdByName === currentUserName"
              type="primary" size="small" @click="handleSubmit(row)">提交</el-button>
            <template v-if="(isAudit || isAdmin) && row.status === 'pending'">
              <el-button type="success" size="small" @click="handleAudit(row, true)">通过</el-button>
              <el-button type="danger" size="small" @click="handleAudit(row, false)">驳回</el-button>
            </template>
            <el-button v-if="isAdmin" type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getExpenseList, submitExpense, auditExpense, deleteExpense } from '@/api/inout'

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
const auditDialogVisible = ref(false)
const auditForm = reactive({ id: 0, approved: true, auditedByName: '', remark: '' })
const fmtDate = (v) => v ? String(v).slice(0, 10) : ''

const loadList = async () => {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value, status: filterStatus.value || undefined }
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0]
      params.endDate = dateRange.value[1]
    }
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

const handleAudit = (row, approved) => {
  auditForm.id = row.id
  auditForm.approved = approved
  auditForm.auditedByName = currentUserName.value
  auditForm.remark = ''
  auditDialogVisible.value = true
}

const confirmAudit = async () => {
  const res = await auditExpense(auditForm.id, auditForm.approved, auditForm.remark, auditForm.auditedByName)
  if (res.success) {
    ElMessage.success(auditForm.approved ? '已通过' : '已驳回')
    auditDialogVisible.value = false
    loadList()
  }
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
  loadList()
})
</script>

<style scoped>
.inout-list-page { padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; font-size: 16px; }
</style>