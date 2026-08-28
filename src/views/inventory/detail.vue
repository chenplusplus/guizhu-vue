<!-- src/views/inventory/detail.vue -->
<template>
  <div class="inventory-detail-page">
    <!-- ===== 返回 + 头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>盘点批次详情</h2>
        <el-tag :type="statusType(batch.batchStatus)" size="large">{{ batch.batchStatusText }}</el-tag>
      </div>
      <div class="header-actions">
        <el-button v-if="batch.batchStatus === 'preparing' || batch.batchStatus === 'confirming'" type="primary" @click="openActualDialog">
          录入实际数据
        </el-button>
        <el-button v-if="batch.batchStatus === 'confirming'" type="success" @click="handleConfirm">
          确认盘点
        </el-button>
        <el-button v-if="batch.batchStatus === 'confirmed'" type="warning" @click="handleUnconfirm">
          反确认
        </el-button>
        <el-button v-if="batch.batchStatus !== 'confirmed' && batch.batchStatus !== 'cancelled'" type="danger" plain @click="handleCancel">
          取消
        </el-button>
      </div>
    </div>

    <el-row :gutter="16">
      <!-- ===== 左侧：汇总卡片 ===== -->
      <el-col :span="14">
        <el-card class="summary-card" shadow="never">
          <template #header><span>盘点汇总</span></template>
          
          <!-- 批次信息 -->
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="批次号">{{ batch.batchNo || '—' }}</el-descriptions-item>
            <el-descriptions-item label="批次名称">{{ batch.batchName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="盘点日期">{{ formatDate(batch.inventoryDate) }}</el-descriptions-item>
            <el-descriptions-item label="截止日期">{{ formatDate(batch.cutoffDate) }}</el-descriptions-item>
            <el-descriptions-item label="创建人">{{ batch.createdByName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatTime(batch.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="确认人">{{ batch.confirmedByName || '—' }}</el-descriptions-item>
            <el-descriptions-item label="确认时间">{{ formatTime(batch.confirmedAt) }}</el-descriptions-item>
          </el-descriptions>

          <!-- 金额汇总 -->
          <el-divider content-position="left">金额汇总</el-divider>
          <el-table :data="summaryRows" border size="small" style="margin-bottom:12px;">
            <el-table-column label="项目" width="120" />
            <el-table-column label="期初结余" align="right">
              <template #default="{ row }"><span class="num">{{ formatMoney(row.opening) }}</span></template>
            </el-table-column>
            <el-table-column label="系统金额" align="right">
              <template #default="{ row }"><span class="num">{{ formatMoney(row.system) }}</span></template>
            </el-table-column>
            <el-table-column label="实际盘点" align="right">
              <template #default="{ row }">
                <span class="num" :class="{ editable: canEditActual }" @click="canEditActual && openActualDialog()">
                  {{ formatMoney(row.actual) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="差异" align="right">
              <template #default="{ row }">
                <span class="num" :class="getVarianceClass(row.variance)">
                  {{ formatMoney(row.variance) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="期末结余" align="right">
              <template #default="{ row }"><span class="num">{{ formatMoney(row.closing) }}</span></template>
            </el-table-column>
          </el-table>

          <!-- 差异原因 -->
          <el-alert v-if="batch.varianceReason" :title="`差异原因：${batch.varianceReason}`" type="warning" :closable="false" />

          <!-- 材料明细 -->
          <el-divider content-position="left">材料明细</el-divider>
          <el-table :data="materialRows" border size="small">
            <el-table-column label="材料" width="120" />
            <el-table-column label="期初(g)" align="right">
              <template #default="{ row }">{{ row.opening?.toFixed(4) || '0.0000' }}</template>
            </el-table-column>
            <el-table-column label="系统(g)" align="right">
              <template #default="{ row }">{{ row.system?.toFixed(4) || '0.0000' }}</template>
            </el-table-column>
            <el-table-column label="实际(g)" align="right">
              <template #default="{ row }">{{ row.actual?.toFixed(4) || '0.0000' }}</template>
            </el-table-column>
            <el-table-column label="差异(g)" align="right">
              <template #default="{ row }">
                <span :class="getVarianceClass(row.variance)">{{ row.variance?.toFixed(4) || '0.0000' }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- ===== 右侧：单据列表 + 操作日志 ===== -->
      <el-col :span="10">
        <!-- 单据明细 -->
        <el-card class="events-card" shadow="never">
          <template #header>
            <span>单据明细 ({{ batch.events?.length || 0 }})</span>
          </template>
          <el-table :data="batch.events" border size="small" max-height="400">
            <el-table-column type="index" label="#" width="40" align="center" />
            <el-table-column label="类型" width="60">
              <template #default="{ row }">
                <el-tag :type="row.sourceType === 'bill' ? 'primary' : 'warning'" size="small">
                  {{ row.sourceType === 'bill' ? '账单' : '进出' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="单据号" min-width="130">
              <template #default="{ row }">
                <el-link type="primary" :href="getDocLink(row)" target="_blank">{{ row.sourceNo }}</el-link>
              </template>
            </el-table-column>
            <el-table-column label="日期" width="90">
              <template #default="{ row }">{{ formatDate(row.sourceDate) }}</template>
            </el-table-column>
            <el-table-column label="金额" width="90" align="right">
              <template #default="{ row }">
                <span class="num">{{ formatMoney(row.amountSale || row.amountIn) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 操作日志 -->
        <el-card class="logs-card" shadow="never" style="margin-top:12px;">
          <template #header><span>操作日志</span></template>
          <el-timeline v-if="batch.logs?.length > 0">
            <el-timeline-item v-for="log in batch.logs" :key="log.id" :timestamp="formatTime(log.operationTime)" placement="top">
              <p><el-tag size="small">{{ log.operationTypeText }}</el-tag> — {{ log.operatorName || '系统' }}</p>
              <p class="log-desc">{{ log.description }}</p>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无操作记录" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <!-- ===== 录入实际数据对话框 ===== -->
    <el-dialog v-model="actualDialogVisible" title="录入实际盘点数据" width="500px">
      <el-form ref="actualFormRef" :model="actualForm" label-width="120px" size="default">
        <el-divider content-position="left">金额（系统值供参考）</el-divider>
        <el-form-item label="实际销售额">
          <el-input-number v-model="actualForm.sale" :precision="2" :controls="false" style="width:200px;" />
          <span class="hint">（系统：{{ formatMoney(batch.systemSummary?.sale) }}）</span>
        </el-form-item>
        <el-form-item label="实际销售成本">
          <el-input-number v-model="actualForm.cost" :precision="2" :controls="false" style="width:200px;" />
          <span class="hint">（系统：{{ formatMoney(batch.systemSummary?.cost) }}）</span>
        </el-form-item>
        <el-form-item label="实际销售利润">
          <el-input-number v-model="actualForm.profit" :precision="2" :controls="false" style="width:200px;" />
          <span class="hint">（系统：{{ formatMoney(batch.systemSummary?.profit) }}）</span>
        </el-form-item>
        <el-form-item label="实际进金额">
          <el-input-number v-model="actualForm.inAmount" :precision="2" :controls="false" style="width:200px;" />
          <span class="hint">（系统：{{ formatMoney(batch.systemSummary?.inAmount) }}）</span>
        </el-form-item>
        <el-form-item label="实际出金额">
          <el-input-number v-model="actualForm.outAmount" :precision="2" :controls="false" style="width:200px;" />
          <span class="hint">（系统：{{ formatMoney(batch.systemSummary?.outAmount) }}）</span>
        </el-form-item>
        <el-divider content-position="left">差异原因</el-divider>
        <el-form-item label="差异说明" prop="varianceReason">
          <el-input v-model="actualForm.varianceReason" type="textarea" :rows="3" placeholder="请说明实际与系统的差异原因" style="width:320px;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="actualDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveActual" :loading="saveLoading">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===== 编辑期初对话框 ===== -->
    <el-dialog v-model="openingDialogVisible" title="编辑期初数据" width="500px">
      <el-form :model="openingForm" label-width="120px" size="default">
        <el-alert title="修改期初会影响系统汇总，请谨慎操作" type="warning" :closable="false" style="margin-bottom:16px;" />
        <el-form-item label="期初销售额">
          <el-input-number v-model="openingForm.sale" :precision="2" :controls="false" style="width:200px;" />
        </el-form-item>
        <el-form-item label="期初销售成本">
          <el-input-number v-model="openingForm.cost" :precision="2" :controls="false" style="width:200px;" />
        </el-form-item>
        <el-form-item label="期初销售利润">
          <el-input-number v-model="openingForm.profit" :precision="2" :controls="false" style="width:200px;" />
        </el-form-item>
        <el-form-item label="编辑原因" required>
          <el-input v-model="openingForm.reason" placeholder="请说明修改原因" style="width:280px;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="openingDialogVisible = false">取消</el-button>
        <el-button type="warning" @click="handleSaveOpening" :loading="saveLoading">保存期初</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getBatchDetail, updateActualSummary, editOpeningSummary, confirmBatch, unconfirmBatch, cancelBatch } from '@/api/inventory'

const route = useRoute()
const router = useRouter()

const batch = ref({})
const actualDialogVisible = ref(false)
const openingDialogVisible = ref(false)
const saveLoading = ref(false)
const actualFormRef = ref()

const actualForm = ref({ sale: 0, cost: 0, profit: 0, inAmount: 0, outAmount: 0, varianceReason: '' })
const openingForm = ref({ sale: 0, cost: 0, profit: 0, reason: '' })

const canEditActual = computed(() => batch.value.batchStatus === 'preparing' || batch.value.batchStatus === 'confirming')

const summaryRows = computed(() => [
  { name: '销售额', opening: batch.value.openingSummary?.sale, system: batch.value.systemSummary?.sale, actual: batch.value.actualSummary?.sale, variance: batch.value.varianceSummary?.sale, closing: batch.value.closingSummary?.sale },
  { name: '销售成本', opening: batch.value.openingSummary?.cost, system: batch.value.systemSummary?.cost, actual: batch.value.actualSummary?.cost, variance: batch.value.varianceSummary?.cost, closing: batch.value.closingSummary?.cost },
  { name: '销售利润', opening: batch.value.openingSummary?.profit, system: batch.value.systemSummary?.profit, actual: batch.value.actualSummary?.profit, variance: batch.value.varianceSummary?.profit, closing: batch.value.closingSummary?.profit },
  { name: '进金额', opening: batch.value.openingSummary?.inAmount, system: batch.value.systemSummary?.inAmount, actual: batch.value.actualSummary?.inAmount, variance: batch.value.varianceSummary?.inAmount, closing: batch.value.closingSummary?.inAmount },
  { name: '出金额', opening: batch.value.openingSummary?.outAmount, system: batch.value.systemSummary?.outAmount, actual: batch.value.actualSummary?.outAmount, variance: batch.value.varianceSummary?.outAmount, closing: batch.value.closingSummary?.outAmount },
  { name: '单据数量', opening: batch.value.openingSummary?.quantity, system: batch.value.systemSummary?.quantity, actual: batch.value.actualSummary?.quantity, variance: batch.value.varianceSummary?.quantity, closing: batch.value.closingSummary?.quantity }
])

const materialRows = computed(() => {
  const allKeys = new Set([
    ...Object.keys(batch.value.openingSummary?.materials || {}),
    ...Object.keys(batch.value.systemSummary?.materials || {}),
    ...Object.keys(batch.value.actualSummary?.materials || {})
  ])
  return Array.from(allKeys).map(key => ({
    name: key,
    opening: batch.value.openingSummary?.materials?.[key],
    system: batch.value.systemSummary?.materials?.[key],
    actual: batch.value.actualSummary?.materials?.[key],
    variance: batch.value.varianceSummary?.materials?.[key]
  }))
})

onMounted(() => {
  const id = route.query.id
  if (id) loadDetail(id)
})

async function loadDetail(id) {
  try {
    const res = await getBatchDetail(id)
    if (res.success) {
      batch.value = res.data || {}
    }
  } catch (e) {
    ElMessage.error('加载失败')
  }
}

function openActualDialog() {
  const s = batch.value.systemSummary || {}
  const a = batch.value.actualSummary || {}
  actualForm.value = {
    sale: a.sale ?? s.sale ?? 0,
    cost: a.cost ?? s.cost ?? 0,
    profit: a.profit ?? s.profit ?? 0,
    inAmount: a.inAmount ?? s.inAmount ?? 0,
    outAmount: a.outAmount ?? s.outAmount ?? 0,
    varianceReason: ''
  }
  actualDialogVisible.value = true
}

async function handleSaveActual() {
  saveLoading.value = true
  try {
    const res = await updateActualSummary(batch.value.id, {
      actualSummary: {
        sale: actualForm.value.sale,
        cost: actualForm.value.cost,
        profit: actualForm.value.profit,
        inAmount: actualForm.value.inAmount,
        outAmount: actualForm.value.outAmount,
        quantity: batch.value.systemSummary?.quantity || 0,
        materials: batch.value.actualSummary?.materials || {}
      },
      varianceReason: actualForm.value.varianceReason
    })
    if (res.success) {
      ElMessage.success('保存成功')
      actualDialogVisible.value = false
      loadDetail(batch.value.id)
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saveLoading.value = false
  }
}

async function handleSaveOpening() {
  if (!openingForm.value.reason) {
    ElMessage.warning('请填写修改原因')
    return
  }
  saveLoading.value = true
  try {
    const res = await editOpeningSummary(batch.value.id, {
      openingSummary: {
        sale: openingForm.value.sale,
        cost: openingForm.value.cost,
        profit: openingForm.value.profit,
        inAmount: batch.value.openingSummary?.inAmount || 0,
        outAmount: batch.value.openingSummary?.outAmount || 0,
        quantity: batch.value.openingSummary?.quantity || 0,
        materials: batch.value.openingSummary?.materials || {}
      },
      reason: openingForm.value.reason
    })
    if (res.success) {
      ElMessage.success('期初已更新')
      openingDialogVisible.value = false
      loadDetail(batch.value.id)
    }
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    saveLoading.value = false
  }
}

async function handleConfirm() {
  try {
    await ElMessageBox.confirm('确认盘点后数据将被锁定，确定要确认吗？', '确认盘点', { type: 'warning' })
    const res = await confirmBatch(batch.value.id)
    if (res.success) {
      ElMessage.success('盘点已确认')
      loadDetail(batch.value.id)
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

async function handleUnconfirm() {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入反确认原因', '反确认', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '原因不能为空'
    })
    const res = await unconfirmBatch(batch.value.id, reason)
    if (res.success) {
      ElMessage.success('已反确认')
      loadDetail(batch.value.id)
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

async function handleCancel() {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入取消原因', '取消盘点', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '原因不能为空'
    })
    const res = await cancelBatch(batch.value.id, reason)
    if (res.success) {
      ElMessage.success('已取消')
      goBack()
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

function goBack() {
  router.push('/inventory')
}

function getDocLink(row) {
  if (row.sourceType === 'bill') return `#/bill/detail?id=${row.sourceId}`
  if (row.sourceType === 'inout') return `#/inout/list`
  return 'javascript:;'
}

function formatDate(val) {
  if (!val) return '—'
  return String(val).substring(0, 10)
}

function formatTime(val) {
  if (!val) return '—'
  return String(val).replace('T', ' ').substring(0, 19)
}

function formatMoney(val) {
  if (val == null) return '0.00'
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusType(status) {
  return { preparing: 'primary', confirming: 'warning', confirmed: 'success', cancelled: 'info' }[status] || ''
}

function getVarianceClass(val) {
  if (!val || val === 0) return ''
  return val > 0 ? 'positive' : 'negative'
}
</script>

<style scoped>
.inventory-detail-page {
  padding: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
}

.num { font-family: monospace; }
.editable { color: #409eff; cursor: pointer; text-decoration: underline; }
.positive { color: #67c23a; }
.negative { color: #f56c6c; }
.hint { color: #999; font-size: 12px; margin-left: 8px; }
.log-desc { color: #666; font-size: 13px; margin-top: 4px; }
</style>
