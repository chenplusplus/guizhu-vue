<!-- src/views/transaction/transaction-list.vue -->
<template>
  <div class="transaction-list">
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:bold;font-size:15px">📋 交易记录</span>
            <el-select
              v-model="listFilter.status"
              placeholder="状态"
              clearable
              style="width:120px"
              @change="loadList"
            >
              <el-option label="待审核" value="pending" />
              <el-option label="已生效" value="approved" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
            <el-select
              v-model="listFilter.bizType"
              placeholder="业务类型"
              clearable
              style="width:130px"
              @change="loadList"
            >
              <el-option
                v-for="item in bizTypeOptions"
                :key="item.itemKey"
                :label="item.itemLabel"
                :value="item.itemKey"
              />
            </el-select>
            <el-select
              v-model="listFilter.contentCategory"
              placeholder="内容分类"
              clearable
              style="width:150px"
              @change="loadList"
            >
              <el-option
                v-for="item in contentOptions"
                :key="item.itemKey"
                :label="item.itemLabel"
                :value="item.itemKey"
              />
            </el-select>
            <el-select
              v-model="listFilter.counterpartyId"
              placeholder="往来单位"
              clearable
              filterable
              style="width:180px"
              @change="loadList"
            >
              <el-option
                v-for="cp in counterparties"
                :key="cp.id"
                :label="cp.name"
                :value="cp.id"
              />
            </el-select>
            <el-select
              v-model="listFilter.direction"
              placeholder="方向"
              clearable
              style="width:110px"
              @change="loadList"
            >
              <el-option label="收入" value="1" />
              <el-option label="支出" value="0" />
            </el-select>
            <el-date-picker
              v-model="yearMonth"
              type="month"
              value-format="YYYY-M"
              placeholder="选择月份"
              style="width:130px"
              @change="loadList"
            />
            <el-button type="primary" @click="loadList">刷新</el-button>
          </div>
          <el-button type="success" @click="$router.push('/transaction/input')">
            + 新增录入
          </el-button>
        </div>
      </template>

      <!-- 统计栏 -->
      <el-row :gutter="12" style="margin-bottom:12px">
        <el-col :span="6">
          <el-statistic title="本月总收入" :value="stats.totalIn">
            <template #prefix><span style="color:#67c23a">¥</span></template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic title="本月总支出" :value="stats.totalOut">
            <template #prefix><span style="color:#f56c6c">¥</span></template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic title="本月结余" :value="stats.balance">
            <template #prefix>¥</template>
          </el-statistic>
        </el-col>
        <el-col :span="6">
          <el-statistic title="本月笔数" :value="stats.count" />
        </el-col>
      </el-row>

      <el-table :data="listData" stripe border size="small" v-loading="loading">
        <el-table-column prop="recordNo" label="单号" width="160" fixed />
        <el-table-column prop="recordDate" label="日期" width="100" />
        <el-table-column prop="bizType" label="业务类型" width="80" />
        <el-table-column prop="direction" label="方向" width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.direction==='1'||row.direction===1" type="success" size="small">
              收入
            </el-tag>
            <el-tag v-else type="danger" size="small">支出</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contentCategory" label="内容分类" width="110" />
        <el-table-column prop="counterpartyName" label="往来对象" width="140" show-overflow-tooltip />
        <el-table-column label="K金件数" width="100" align="center">
          <template #default="{ row }">
            {{ row.kGoldCountPlus > 0 ? '+' + row.kGoldCountPlus : '' }}
            {{ row.kGoldCountMinus > 0 ? '-' + row.kGoldCountMinus : '' }}
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="重量" width="80" align="right">
          <template #default="{ row }">
            {{ row.weight > 0 ? row.weight.toFixed(2) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="transactionAmount" label="交易金额" width="110" align="right">
          <template #default="{ row }">
            <span v-if="row.transactionAmount > 0" style="color:#67c23a">
              ¥{{ row.transactionAmount.toFixed(2) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="paymentAmount" label="付款金额" width="110" align="right">
          <template #default="{ row }">
            <span v-if="row.paymentAmount > 0" style="color:#f56c6c">
              ¥{{ row.paymentAmount.toFixed(2) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="orderNo" label="关联订单" width="120" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status==='pending'" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="row.status==='approved'||row.status==='running'" type="success" size="small">
              已生效
            </el-tag>
            <el-tag v-else-if="row.status==='rejected'" type="danger" size="small">已驳回</el-tag>
            <el-tag v-else type="info" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdByName" label="经办人" width="80" />
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <!-- 提交按钮：操作员自己的待审核/已驳回记录 -->
            <el-button
              v-if="isFactoryOrder && (row.status==='pending' || row.status==='rejected') && row.createdByName === currentUserName"
              type="primary"
              size="small"
              :loading="row._submitting"
              @click="handleSubmit(row)"
            >
              提交
            </el-button>

            <!-- 审核通过：审核员/admin，待审核状态 -->
            <el-button
              v-if="(isFactoryAudit || isAdmin) && row.status==='pending'"
              type="success"
              size="small"
              :loading="row._auditing"
              @click="handleAudit(row, true)"
            >
              通过
            </el-button>

            <!-- 审核驳回：审核员/admin，待审核状态 -->
            <el-button
              v-if="(isFactoryAudit || isAdmin) && row.status==='pending'"
              type="danger"
              size="small"
              :loading="row._auditing"
              @click="handleAudit(row, false)"
            >
              驳回
            </el-button>

            <!-- 编辑：操作员自己的待审核/已驳回记录，或审核员/admin的待审核记录 -->
            <el-button
              v-if="canEdit(row)"
              type="default"
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top:12px"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="p => { page = p; loadList() }"
      />
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editDialogVisible" title="编辑交易记录" width="700px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" :rules="rules" label-width="120px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="业务日期" prop="recordDate">
              <el-date-picker v-model="editForm.recordDate" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="业务类型" prop="bizType">
              <el-select v-model="editForm.bizType" placeholder="请选择" style="width:100%">
                <el-option v-for="item in bizTypeOptions" :key="item.itemKey" :label="item.itemLabel" :value="item.itemKey" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="往来对象">
              <el-select v-model="editForm.counterpartyId" placeholder="请选择" filterable clearable style="width:100%">
                <el-option v-for="cp in counterparties" :key="cp.id" :label="cp.name" :value="cp.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="内容分类" prop="contentCategory">
              <el-select v-model="editForm.contentCategory" placeholder="请选择" style="width:100%">
                <el-option v-for="item in contentOptions" :key="item.itemKey" :label="item.itemLabel" :value="item.itemKey" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="K金件数+">
              <el-input-number v-model="editForm.kGoldCountPlus" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="K金件数-">
              <el-input-number v-model="editForm.kGoldCountMinus" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="重量(g/ct)">
              <el-input-number v-model="editForm.weight" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="交易金额">
              <el-input-number v-model="editForm.transactionAmount" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="付款金额">
              <el-input-number v-model="editForm.paymentAmount" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="方向" prop="direction">
              <el-select v-model="editForm.direction" style="width:100%">
                <el-option label="收入" value="1" />
                <el-option label="支出" value="0" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="关联订单号">
          <el-input v-model="editForm.orderNo" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { transactionList, transactionSubmit, transactionAudit, transactionUpdate } from '@/api/transaction'
import { getCounterpartyAll } from '@/api/counterparty'
import request from '@/utils/request'

const loading = ref(false)
const listData = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const yearMonth = ref(`${new Date().getFullYear()}-${new Date().getMonth() + 1}`)
const stats = ref({ totalIn: 0, totalOut: 0, balance: 0, count: 0 })

const listFilter = reactive({
  status: '',
  bizType: '',
  contentCategory: '',
  counterpartyId: null,
  direction: ''
})

const bizTypeOptions = ref([])
const contentOptions = ref([])
const counterparties = ref([])

const currentUserName = ref('')
const currentUserType = ref('')
const isFactoryOrder = computed(() => currentUserType.value === 'factoryOrder')
const isFactoryAudit = computed(() => currentUserType.value === 'factoryAudit')
const isAdmin = computed(() => currentUserType.value === 'admin')

// 编辑弹窗
const editDialogVisible = ref(false)
const editFormRef = ref()
const saving = ref(false)
const editForm = reactive({
  id: null, recordDate: '', bizType: '', counterpartyId: null, contentCategory: '',
  direction: '1', kGoldCountPlus: 0, kGoldCountMinus: 0, weight: 0,
  transactionAmount: 0, paymentAmount: 0, orderNo: '', remark: ''
})

const rules = {
  recordDate: [{ required: true, message: '请选择业务日期', trigger: 'change' }],
  bizType: [{ required: true, message: '请选择业务类型', trigger: 'change' }],
  contentCategory: [{ required: true, message: '请选择内容分类', trigger: 'change' }]
}

// ✅ 编辑权限判断
function canEdit(row) {
  // 管理员可以编辑待审核记录
  if (isAdmin.value && row.status === 'pending') return true
  // 审核员可以编辑待审核记录
  if (isFactoryAudit.value && row.status === 'pending') return true
  // 操作员可以编辑自己的待审核或已驳回记录
  if (isFactoryOrder.value && (row.status === 'pending' || row.status === 'rejected') && row.createdByName === currentUserName.value) {
    return true
  }
  return false
}

function loadBizTypes() {
  request({ url: '/dict/items', method: 'get', params: { key: 'biz_type' } })
    .then(res => { if (res.data) bizTypeOptions.value = res.data })
    .catch(() => {})
}

function loadContentOptions() {
  request({ url: '/dict/items', method: 'get', params: { key: 'content_category' } })
    .then(res => { if (res.data) contentOptions.value = res.data })
    .catch(() => {})
}

function loadCounterparties() {
  getCounterpartyAll().then(res => { if (res.data) counterparties.value = res.data }).catch(() => {})
}

function loadUserInfo() {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
  currentUserName.value = userInfo.realName || userInfo.name || ''
  currentUserType.value = (userInfo.userType || '').toLowerCase()
}

function loadList() {
  loading.value = true
  const parts = (yearMonth.value || '').split('-')
  const year = parseInt(parts[0])
  const month = parseInt(parts[1])

  // ✅ 默认不显示草稿
  const status = listFilter.status || undefined

  transactionList({
    page: page.value, pageSize: pageSize.value, year, month,
    status,
    bizType: listFilter.bizType || undefined,
    contentCategory: listFilter.contentCategory || undefined,
    counterpartyId: listFilter.counterpartyId || undefined,
    direction: listFilter.direction || undefined
  }).then(res => {
    // ✅ 过滤掉草稿（后端如果没过滤的话）
    let data = res.data || []
    // 如果后端返回了草稿，前端过滤掉
    data = data.filter(r => r.status !== 'draft')

    listData.value = data.map(r => ({ ...r, _submitting: false, _auditing: false }))
    total.value = res.total || 0

    // 统计（仅已生效记录）
    const approved = data.filter(r => r.status === 'approved' || r.status === 'running')
    stats.value.totalIn = approved.reduce((s, r) => s + (r.transactionAmount || 0), 0)
    stats.value.totalOut = approved.reduce((s, r) => s + (r.paymentAmount || 0), 0)
    stats.value.balance = stats.value.totalIn - stats.value.totalOut
    stats.value.count = approved.length
  }).catch(() => {}).finally(() => { loading.value = false })
}

async function handleSubmit(row) {
  // 已驳回状态重新提交
  if (row.status === 'rejected') {
    try {
      await ElMessageBox.confirm('该记录已被驳回，确定要重新提交审核吗？', '重新提交', { type: 'warning' })
    } catch { return }
  } else {
    try {
      await ElMessageBox.confirm('确定提交该记录审核吗？', '提交审核', { type: 'info' })
    } catch { return }
  }

  row._submitting = true
  try {
    await transactionSubmit(row.id)
    ElMessage.success('提交成功，等待审核')
    loadList()
  } catch (e) {
    ElMessage.error('提交失败')
  } finally {
    row._submitting = false
  }
}

async function handleAudit(row, approved) {
  const action = approved ? '通过' : '驳回'
  try {
    await ElMessageBox.confirm(`确定要${action}该记录吗？`, '审核确认', {
      type: approved ? 'success' : 'warning'
    })
    row._auditing = true
    await transactionAudit({ id: row.id, approved })
    ElMessage.success(`已${action}`)
    loadList()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  } finally {
    row._auditing = false
  }
}

function handleEdit(row) {
  editForm.id = row.id
  editForm.recordDate = row.recordDate
  editForm.bizType = row.bizType || ''
  editForm.counterpartyId = row.counterpartyId
  editForm.contentCategory = row.contentCategory || ''
  editForm.direction = row.direction || '1'
  editForm.kGoldCountPlus = row.kGoldCountPlus || 0
  editForm.kGoldCountMinus = row.kGoldCountMinus || 0
  editForm.weight = row.weight || 0
  editForm.transactionAmount = row.transactionAmount || 0
  editForm.paymentAmount = row.paymentAmount || 0
  editForm.orderNo = row.orderNo || ''
  editForm.remark = row.remark || ''
  editDialogVisible.value = true
}

async function handleSave() {
  editFormRef.value.validate(async valid => {
    if (!valid) return
    saving.value = true
    try {
      await transactionUpdate(editForm)
      ElMessage.success('保存成功')
      editDialogVisible.value = false
      loadList()
    } catch (e) {
      ElMessage.error('保存失败')
    } finally {
      saving.value = false
    }
  })
}

onMounted(() => {
  loadUserInfo()
  loadBizTypes()
  loadContentOptions()
  loadCounterparties()
  loadList()
})
</script>

<style scoped>
.transaction-list { padding: 16px; }
</style>