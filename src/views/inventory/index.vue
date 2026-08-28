<!-- src/views/inventory/index.vue -->
<template>
  <div class="inventory-page">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <h2>📦 盘点管理</h2>
      </div>
      <div class="header-actions">
        <el-button @click="loadShangdan">
          <el-icon><Refresh /></el-icon> 刷新上单
        </el-button>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon> 新建盘点
        </el-button>
      </div>
    </div>

    <!-- ===== 上单概览 ===== -->
    <el-card class="shangdan-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>📊 上单概览</span>
          <span class="update-time" v-if="shangdanData.calculatedAt">
            计算时间：{{ formatTime(shangdanData.calculatedAt) }}
          </span>
        </div>
      </template>
      <el-descriptions :column="4" border size="small">
        <el-descriptions-item label="最近盘点批次" :span="2">
          <template v-if="shangdanData.lastBatch">
            <el-tag type="success" size="small">{{ shangdanData.lastBatch.batchNo }}</el-tag>
            {{ shangdanData.lastBatch.batchName }}
          </template>
          <span v-else class="text-muted">暂无</span>
        </el-descriptions-item>
        <el-descriptions-item label="最近盘点截止日">
          {{ shangdanData.lastBatch ? formatDate(shangdanData.lastBatch.cutoffDate) : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="最近盘点确认时间">
          {{ shangdanData.lastBatch?.confirmedAt ? formatTime(shangdanData.lastBatch.confirmedAt) : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="待盘点单据数">
          <el-tag :type="shangdanData.pendingEventCount > 0 ? 'warning' : 'info'" size="small">
            {{ shangdanData.pendingEventCount }} 条
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 汇总数据 -->
      <el-divider content-position="left">上单金额汇总</el-divider>
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-box">
            <div class="stat-label">销售额</div>
            <div class="stat-value price">{{ formatMoney(shangdanData.totalSummary?.sale) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-box">
            <div class="stat-label">销售成本</div>
            <div class="stat-value cost">{{ formatMoney(shangdanData.totalSummary?.cost) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-box">
            <div class="stat-label">销售利润</div>
            <div class="stat-value profit">{{ formatMoney(shangdanData.totalSummary?.profit) }}</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-box">
            <div class="stat-label">进出金额(入-出)</div>
            <div class="stat-value">{{ formatMoney(shangdanData.totalSummary?.inAmount) }} - {{ formatMoney(shangdanData.totalSummary?.outAmount) }}</div>
          </div>
        </el-col>
      </el-row>

      <!-- 材料明细 -->
      <el-divider content-position="left">材料汇总</el-divider>
      <el-row :gutter="12" v-if="Object.keys(shangdanData.totalSummary?.materials || {}).length > 0">
        <el-col :span="4" v-for="(val, key) in shangdanData.totalSummary?.materials" :key="key">
          <div class="material-tag">
            <span class="material-name">{{ key }}</span>
            <span class="material-val">{{ val.toFixed(4) }}g</span>
          </div>
        </el-col>
      </el-row>
      <el-empty v-else description="暂无材料数据" :image-size="60" />
    </el-card>

    <!-- ===== Tabs ===== -->
    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- 盘点批次列表 -->
      <el-tab-pane label="盘点批次" name="batches">
        <div class="tab-toolbar">
          <el-form :inline="true" size="default">
            <el-form-item label="状态">
              <el-select v-model="batchFilters.status" placeholder="全部" clearable style="width:120px;" @change="loadBatches">
                <el-option label="盘点中" value="preparing" />
                <el-option label="待确认" value="confirming" />
                <el-option label="已确认" value="confirmed" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
            </el-form-item>
            <el-form-item label="日期">
              <el-date-picker v-model="batchFilters.dateRange" type="daterange" range-separator="至" 
                start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:240px;" @change="loadBatches" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadBatches">查询</el-button>
              <el-button @click="resetBatchFilters">重置</el-button>
            </el-form-item>
          </el-form>
        </div>

        <el-table v-loading="batchLoading" :data="batchList" border stripe size="small">
          <el-table-column type="index" label="#" width="50" align="center" />
          <el-table-column label="批次号" width="160">
            <template #default="{ row }">
              <el-link type="primary" @click="openBatchDetail(row)">{{ row.batchNo }}</el-link>
            </template>
          </el-table-column>
          <el-table-column label="批次名称" min-width="160">
            <template #default="{ row }">{{ row.batchName || '—' }}</template>
          </el-table-column>
          <el-table-column label="盘点日期" width="110">
            <template #default="{ row }">{{ formatDate(row.inventoryDate) }}</template>
          </el-table-column>
          <el-table-column label="截止日期" width="110">
            <template #default="{ row }">{{ formatDate(row.cutoffDate) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="statusType(row.batchStatus)" size="small">{{ row.batchStatusText }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="单据数" width="80" align="center">
            <template #default="{ row }">{{ row.eventCount }}</template>
          </el-table-column>
          <el-table-column label="销售额" width="120" align="right">
            <template #default="{ row }"><span class="price">{{ formatMoney(row.totalSale) }}</span></template>
          </el-table-column>
          <el-table-column label="销售利润" width="120" align="right">
            <template #default="{ row }"><span class="profit">{{ formatMoney(row.totalProfit) }}</span></template>
          </el-table-column>
          <el-table-column label="创建人" width="100">
            <template #default="{ row }">{{ row.createdByName || '—' }}</template>
          </el-table-column>
          <el-table-column label="创建时间" width="160">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" link @click="openBatchDetail(row)">查看</el-button>
              <el-button v-if="row.batchStatus === 'preparing'" type="warning" size="small" link @click="openBatchDetail(row)">录入</el-button>
              <el-button v-if="row.batchStatus === 'confirming'" type="success" size="small" link @click="handleConfirm(row)">确认</el-button>
              <el-button v-if="row.batchStatus === 'confirmed'" type="danger" size="small" link @click="handleUnconfirm(row)">反确认</el-button>
              <el-button v-if="row.batchStatus !== 'confirmed' && row.batchStatus !== 'cancelled'" type="info" size="small" link @click="handleCancel(row)">取消</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="batchPage"
          v-model:page-size="batchPageSize"
          :total="batchTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadBatches"
          @current-change="loadBatches"
          style="margin-top:12px;justify-content:flex-end;"
        />
      </el-tab-pane>

      <!-- 待盘点事件 -->
      <el-tab-pane label="待盘点事件" name="pending">
        <div class="tab-toolbar">
          <el-form :inline="true" size="default">
            <el-form-item label="单据类型">
              <el-select v-model="eventFilters.sourceType" placeholder="全部" clearable style="width:120px;" @change="loadPendingEvents">
                <el-option label="账单" value="bill" />
                <el-option label="进出记录" value="inout" />
              </el-select>
            </el-form-item>
            <el-form-item label="截止日期">
              <el-date-picker v-model="eventFilters.cutoffDate" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:140px;" @change="loadPendingEvents" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadPendingEvents">查询</el-button>
              <el-button @click="eventFilters = { sourceType: null, cutoffDate: null }; loadPendingEvents()">重置</el-button>
            </el-form-item>
          </el-form>
        </div>

        <el-table v-loading="eventLoading" :data="eventList" border stripe size="small">
          <el-table-column type="index" label="#" width="50" align="center" />
          <el-table-column label="单据类型" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.sourceType === 'bill' ? 'primary' : 'warning'" size="small">
                {{ row.sourceType === 'bill' ? '账单' : '进出' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="单据号" min-width="160">
            <template #default="{ row }">{{ row.sourceNo || '—' }}</template>
          </el-table-column>
          <el-table-column label="单据日期" width="110">
            <template #default="{ row }">{{ formatDate(row.sourceDate) }}</template>
          </el-table-column>
          <el-table-column label="确认时间" width="160">
            <template #default="{ row }">{{ formatTime(row.confirmedAt) }}</template>
          </el-table-column>
          <el-table-column label="销售额" width="120" align="right">
            <template #default="{ row }"><span class="price">{{ formatMoney(row.amountSale) }}</span></template>
          </el-table-column>
          <el-table-column label="成本" width="110" align="right">
            <template #default="{ row }">{{ formatMoney(row.amountCost) }}</template>
          </el-table-column>
          <el-table-column label="利润" width="110" align="right">
            <template #default="{ row }"><span class="profit">{{ formatMoney(row.amountProfit) }}</span></template>
          </el-table-column>
          <el-table-column label="数量" width="70" align="center">
            <template #default="{ row }">{{ row.quantity || 1 }}</template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="eventPage"
          v-model:page-size="eventPageSize"
          :total="eventTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadPendingEvents"
          @current-change="loadPendingEvents"
          style="margin-top:12px;justify-content:flex-end;"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- ===== 新建盘点对话框 ===== -->
    <el-dialog v-model="createDialogVisible" title="新建盘点批次" width="600px">
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="120px" size="default">
        <el-form-item label="批次名称" prop="batchName">
          <el-input v-model="createForm.batchName" placeholder="如：2024年08月盘点" style="width:300px;" />
        </el-form-item>
        <el-form-item label="盘点日期" prop="inventoryDate" required>
          <el-date-picker v-model="createForm.inventoryDate" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:180px;" />
        </el-form-item>
        <el-form-item label="截止日期" prop="cutoffDate" required>
          <el-date-picker v-model="createForm.cutoffDate" value-format="YYYY-MM-DD" placeholder="截止日期" style="width:180px;" />
        </el-form-item>
        <el-divider content-position="left">预览（将纳入的单据）</el-divider>
        <el-alert v-if="previewData.eventCount !== undefined" :title="`共 ${previewData.eventCount} 条单据，销售额 ${formatMoney(previewData.systemSummary?.sale)}`" type="info" :closable="false" />
        <el-button type="info" link style="margin-top:8px;" @click="handlePreview" :loading="previewLoading">
          点击预览将纳入的单据
        </el-button>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="createLoading">确认创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getShangdan, getBatchList, getBatchDetail, getPendingEvents, previewBatch, createBatch, confirmBatch, unconfirmBatch, cancelBatch } from '@/api/inventory'

// ===== 状态 =====
const activeTab = ref('batches')

// 上单数据
const shangdanData = ref({})

// 批次列表
const batchList = ref([])
const batchLoading = ref(false)
const batchFilters = ref({ status: null, dateRange: null })
const batchPage = ref(1)
const batchPageSize = ref(20)
const batchTotal = ref(0)

// 待盘点事件
const eventList = ref([])
const eventLoading = ref(false)
const eventFilters = ref({ sourceType: null, cutoffDate: null })
const eventPage = ref(1)
const eventPageSize = ref(20)
const eventTotal = ref(0)

// 新建盘点
const createDialogVisible = ref(false)
const createFormRef = ref()
const createForm = ref({ batchName: '', inventoryDate: '', cutoffDate: '' })
const createLoading = ref(false)
const previewLoading = ref(false)
const previewData = ref({})

const createRules = {
  inventoryDate: [{ required: true, message: '请选择盘点日期', trigger: 'change' }],
  cutoffDate: [{ required: true, message: '请选择截止日期', trigger: 'change' }]
}

// ===== 生命周期 =====
onMounted(() => {
  loadShangdan()
  loadBatches()
  loadPendingEvents()
})

// ===== 数据加载 =====
async function loadShangdan() {
  try {
    const res = await getShangdan()
    if (res.success) {
      shangdanData.value = res.data || {}
    }
  } catch (e) {
    console.error('loadShangdan error:', e)
  }
}

async function loadBatches() {
  batchLoading.value = true
  try {
    const params = { page: batchPage.value, pageSize: batchPageSize.value }
    if (batchFilters.value.status) params.status = batchFilters.value.status
    if (batchFilters.value.dateRange?.length === 2) {
      params.startDate = batchFilters.value.dateRange[0]
      params.endDate = batchFilters.value.dateRange[1]
    }
    const res = await getBatchList(params)
    if (res.success) {
      batchList.value = res.data || []
      batchTotal.value = res.total || 0
    }
  } catch (e) {
    console.error('loadBatches error:', e)
  } finally {
    batchLoading.value = false
  }
}

async function loadPendingEvents() {
  eventLoading.value = true
  try {
    const params = { page: eventPage.value, pageSize: eventPageSize.value }
    if (eventFilters.value.sourceType) params.sourceType = eventFilters.value.sourceType
    if (eventFilters.value.cutoffDate) params.cutoffDate = eventFilters.value.cutoffDate
    const res = await getPendingEvents(params)
    if (res.success) {
      eventList.value = res.data || []
      eventTotal.value = res.total || 0
    }
  } catch (e) {
    console.error('loadPendingEvents error:', e)
  } finally {
    eventLoading.value = false
  }
}

// ===== 操作 =====
function openCreateDialog() {
  createForm.value = { batchName: '', inventoryDate: '', cutoffDate: '' }
  previewData.value = {}
  createDialogVisible.value = true
}

async function handlePreview() {
  if (!createForm.value.cutoffDate) {
    ElMessage.warning('请先选择截止日期')
    return
  }
  previewLoading.value = true
  try {
    const res = await previewBatch({
      inventoryDate: createForm.value.inventoryDate || new Date().toISOString().split('T')[0],
      cutoffDate: createForm.value.cutoffDate
    })
    if (res.success) {
      previewData.value = res.data || {}
    }
  } catch (e) {
    console.error('preview error:', e)
  } finally {
    previewLoading.value = false
  }
}

async function handleCreate() {
  if (!createFormRef.value) return
  await createFormRef.value.validate(async (valid) => {
    if (!valid) return
    createLoading.value = true
    try {
      const res = await createBatch({
        batchName: createForm.value.batchName,
        inventoryDate: createForm.value.inventoryDate || new Date().toISOString().split('T')[0],
        cutoffDate: createForm.value.cutoffDate
      })
      if (res.success) {
        ElMessage.success('盘点批次创建成功')
        createDialogVisible.value = false
        loadBatches()
        loadPendingEvents()
        loadShangdan()
      } else {
        ElMessage.error(res.message || '创建失败')
      }
    } catch (e) {
      ElMessage.error(e.message || '创建失败')
    } finally {
      createLoading.value = false
    }
  })
}

function openBatchDetail(row) {
  // 跳转到详情页
  window.location.hash = `#/inventory/detail?id=${row.id}`
}

async function handleConfirm(row) {
  try {
    await ElMessageBox.confirm(`确认盘点批次 ${row.batchNo}？确认后数据将被锁定。`, '确认盘点', { type: 'warning' })
    const res = await confirmBatch(row.id)
    if (res.success) {
      ElMessage.success('盘点已确认')
      loadBatches()
      loadShangdan()
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

async function handleUnconfirm(row) {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入反确认原因', '反确认', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '原因不能为空'
    })
    const res = await unconfirmBatch(row.id, reason)
    if (res.success) {
      ElMessage.success('已反确认')
      loadBatches()
      loadShangdan()
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

async function handleCancel(row) {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入取消原因', '取消盘点', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '原因不能为空'
    })
    const res = await cancelBatch(row.id, reason)
    if (res.success) {
      ElMessage.success('已取消')
      loadBatches()
      loadPendingEvents()
      loadShangdan()
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

function resetBatchFilters() {
  batchFilters.value = { status: null, dateRange: null }
  batchPage.value = 1
  loadBatches()
}

// ===== 格式化 =====
function formatDate(val) {
  if (!val) return '—'
  return val.substring(0, 10)
}

function formatTime(val) {
  if (!val) return '—'
  return val.replace('T', ' ').substring(0, 19)
}

function formatMoney(val) {
  if (val == null) return '0.00'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusType(status) {
  return { preparing: 'primary', confirming: 'warning', confirmed: 'success', cancelled: 'info' }[status] || ''
}
</script>

<style scoped>
.inventory-page {
  padding: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
}

.shangdan-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.update-time {
  font-size: 12px;
  color: #999;
}

.stat-box {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px 16px;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
}

.stat-value.price { color: #409eff; }
.stat-value.cost { color: #e6a23c; }
.stat-value.profit { color: #67c23a; }

.material-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  padding: 4px 12px;
}

.material-name {
  font-weight: 600;
  color: #409eff;
}

.material-val {
  color: #666;
  font-size: 13px;
}

.tab-toolbar {
  margin-bottom: 12px;
}

.text-muted { color: #999; }
</style>
