<!-- src/views/order/alert-list.vue -->
<template>
  <div class="alert-page">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <h2>⚠️ 预警管理</h2>
        <span class="total-badge">共 {{ totalCount }} 条预警</span>
      </div>
      <div class="header-actions">
        <el-button @click="handleScan" :loading="scanning">
          <el-icon><Refresh /></el-icon> 触发扫描
        </el-button>
        <el-button type="primary" @click="handleManual">
          <el-icon><Plus /></el-icon> 手工预警
        </el-button>
      </div>
    </div>

    <!-- ===== 筛选栏 ===== -->
    <div class="filter-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="状态">
          <el-select v-model="filters.isResolved" placeholder="全部" clearable style="width:120px;" @change="loadAlerts">
            <el-option label="未处理" :value="false" />
            <el-option label="已处理" :value="true" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="filters.alertType" placeholder="全部" clearable style="width:140px;" @change="loadAlerts">
            <el-option label="下单超时" value="pending" />
            <el-option label="制作超时" value="production" />
            <el-option label="账单超时" value="bill" />
            <el-option label="手工预警" value="manual" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单号">
          <el-input v-model="filters.keyword" placeholder="订单号/单号" clearable style="width:160px;" @keyup.enter="loadAlerts" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadAlerts">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- ===== 预警列表 ===== -->
    <el-table
      v-loading="loading"
      :data="alertList"
      border
      stripe
      style="width:100%;"
      size="small"
    >
      <el-table-column type="index" label="#" width="50" align="center" />
      <el-table-column label="预警类型" width="110">
        <template #default="{ row }">
          <el-tag :type="typeTag(row.alertType)" size="small">
            {{ typeName(row.alertType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.isResolved" type="success" size="small">已处理</el-tag>
          <el-tag v-else type="danger" size="small">未处理</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="订单号" min-width="140">
        <template #default="{ row }">
          <el-link type="primary" @click="goOrder(row.orderId)" style="font-weight:500;">
            {{ row.orderNo || '—' }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column label="预警原因" min-width="200">
        <template #default="{ row }">
          <span>{{ row.alertReason || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="160">
        <template #default="{ row }">
          <span>{{ formatDateTime(row.createdAt) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="处理人" width="100">
        <template #default="{ row }">
          {{ row.resolvedByName || '—' }}
        </template>
      </el-table-column>
      <el-table-column label="处理时间" width="160">
        <template #default="{ row }">
          <span>{{ row.resolvedAt ? formatDateTime(row.resolvedAt) : '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" align="center" fixed="right">
        <template #default="{ row }">
          <template v-if="!row.isResolved">
            <el-button size="small" type="primary" link @click="openResolve(row)">处理</el-button>
          </template>
          <template v-else>
            <el-button size="small" type="info" link disabled style="cursor:default;">已处理</el-button>
          </template>
          <el-button size="small" type="primary" link @click="goOrder(row.orderId)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ===== 分页 ===== -->
    <div class="pagination-wrap">
      <el-pagination
        background
        layout="total, prev, pager, next"
        :total="totalCount"
        :page-size="pageSize"
        :current-page="currentPage"
        @current-change="handlePageChange"
      />
    </div>

    <!-- ===== 处理预警弹窗 ===== -->
    <el-dialog v-model="resolveDialogVisible" title="处理预警" width="450px" destroy-on-close>
      <div v-if="resolveTarget" class="resolve-info">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="订单号">{{ resolveTarget.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="预警类型">{{ typeName(resolveTarget.alertType) }}</el-descriptions-item>
          <el-descriptions-item label="预警原因">{{ resolveTarget.alertReason }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(resolveTarget.createdAt) }}</el-descriptions-item>
        </el-descriptions>
        <el-form style="margin-top:16px;" label-width="60px">
          <el-form-item label="备注">
            <el-input v-model="resolveRemark" type="textarea" :rows="3" placeholder="输入处理备注（可选）" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="resolveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmResolve" :loading="resolveLoading">确认处理</el-button>
      </template>
    </el-dialog>

    <!-- ===== 手工预警弹窗 ===== -->
    <el-dialog v-model="manualDialogVisible" title="手工预警" width="500px" destroy-on-close>
      <el-form ref="manualFormRef" :model="manualForm" :rules="manualRules" label-width="90px">
        <el-form-item label="关联订单" prop="orderId">
          <el-select
            v-model="manualForm.orderId"
            filterable
            remote
            reserve-keyword
            placeholder="搜索订单号"
            :remote-method="searchOrders"
            :loading="orderSearching"
            style="width:100%;"
            @change="onOrderSelected"
          >
            <el-option
              v-for="o in orderOptions"
              :key="o.orderId"
              :label="o.orderNo"
              :value="o.orderId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="预警原因" prop="reason">
          <el-input v-model="manualForm.reason" placeholder="简要描述预警原因，如：客户催促" />
        </el-form-item>
        <el-form-item label="补充说明">
          <el-input v-model="manualForm.remark" type="textarea" :rows="3" placeholder="补充说明（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitManual" :loading="manualSubmitting">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { getAlertList, resolveAlert } from '@/api/alert'
import { getOrderList } from '@/api/order'

const router = useRouter()

// ===== 状态 =====
const loading = ref(false)
const scanning = ref(false)
const resolveLoading = ref(false)
const manualSubmitting = ref(false)
const orderSearching = ref(false)

const alertList = ref([])
const totalCount = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const filters = reactive({
  isResolved: false,
  alertType: '',
  keyword: '',
})

// ===== 处理弹窗 =====
const resolveDialogVisible = ref(false)
const resolveTarget = ref(null)
const resolveRemark = ref('')

// ===== 手工预警弹窗 =====
const manualDialogVisible = ref(false)
const manualFormRef = ref()
const orderOptions = ref([])
const manualForm = reactive({
  orderId: null,
  reason: '',
  remark: '',
})

const manualRules = {
  orderId: [{ required: true, message: '请选择关联订单' }],
  reason: [{ required: true, message: '请输入预警原因' }],
}

// ===== 加载预警列表 =====
const loadAlerts = async () => {
  loading.value = true
  try {
    const params = { page: currentPage.value, pageSize: pageSize.value }
    if (filters.isResolved !== '' && filters.isResolved !== null) {
      params.isResolved = filters.isResolved
    }
    if (filters.alertType) params.alertType = filters.alertType
    if (filters.keyword) params.keyword = filters.keyword

    const res = await getAlertList(params)
    alertList.value = res?.data || []
    // 分页信息从响应头或响应体取，如果没有则用 data.length 估算
    totalCount.value = res?.total || alertList.value.length || 0
  } catch {
    ElMessage.error('加载预警列表失败')
  } finally {
    loading.value = false
  }
}

const resetFilters = () => {
  filters.isResolved = false
  filters.alertType = ''
  filters.keyword = ''
  currentPage.value = 1
  loadAlerts()
}

const handlePageChange = (page) => {
  currentPage.value = page
  loadAlerts()
}

// ===== 触发扫描 =====
const handleScan = async () => {
  try {
    await ElMessageBox.confirm('确认立即触发预警扫描？扫描将根据订单状态生成新预警。', '触发扫描', {
      type: 'info',
      confirmButtonText: '确认',
    })
  } catch {
    return
  }
  scanning.value = true
  try {
    // 调用后端 scan 接口（无前端封装，手动调）
    const api = (await import('@/api/index')).default
    await api.post('/api/alert/scan')
    ElMessage.success('扫描完成')
    loadAlerts()
  } catch (e) {
    ElMessage.error(e.message || '扫描失败')
  } finally {
    scanning.value = false
  }
}

// ===== 处理预警 =====
const openResolve = (row) => {
  resolveTarget.value = row
  resolveRemark.value = ''
  resolveDialogVisible.value = true
}

const confirmResolve = async () => {
  if (!resolveTarget.value) return
  resolveLoading.value = true
  try {
    await resolveAlert(resolveTarget.value.id)
    ElMessage.success('处理成功')
    resolveDialogVisible.value = false
    loadAlerts()
  } catch (e) {
    ElMessage.error(e.message || '处理失败')
  } finally {
    resolveLoading.value = false
  }
}

// ===== 手工预警 =====
const handleManual = () => {
  manualForm.orderId = null
  manualForm.reason = ''
  manualForm.remark = ''
  orderOptions.value = []
  manualDialogVisible.value = true
}

const searchOrders = async (keyword) => {
  if (!keyword) return
  orderSearching.value = true
  try {
    const res = await getOrderList({ keyword, page: 1, pageSize: 20 })
    orderOptions.value = res?.data || []
  } catch {
    orderOptions.value = []
  } finally {
    orderSearching.value = false
  }
}

const onOrderSelected = () => {}

const submitManual = async () => {
  if (!manualFormRef.value) return
  await manualFormRef.value.validate(async (valid) => {
    if (!valid) return
    manualSubmitting.value = true
    try {
      const api = (await import('@/api/index')).default
      await api.post('/api/alert/manual', manualForm)
      ElMessage.success('手工预警创建成功')
      manualDialogVisible.value = false
      loadAlerts()
    } catch (e) {
      ElMessage.error(e.message || '创建失败')
    } finally {
      manualSubmitting.value = false
    }
  })
}

// ===== 跳转 =====
const goOrder = (orderId) => {
  if (orderId) router.push(`/order/detail/${orderId}`)
}

// ===== 辅助 =====
const typeName = (type) => ({
  pending: '下单超时',
  production: '制作超时',
  bill: '账单超时',
  manual: '手工预警',
})[type] || type || '未知'

const typeTag = (type) => ({
  pending: 'warning',
  production: 'danger',
  bill: 'warning',
  manual: 'primary',
})[type] || 'info'

const formatDateTime = (time) => {
  if (!time) return '—'
  const d = new Date(time)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(loadAlerts)
</script>

<style scoped>
.alert-page {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  min-height: 100%;
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
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.total-badge {
  background: #fef0f0;
  color: #F56C6C;
  font-size: 13px;
  padding: 2px 10px;
  border-radius: 12px;
  border: 1px solid #fde2e2;
}

.header-actions { display: flex; gap: 10px; }

.filter-bar {
  background: #f5f7fa;
  padding: 16px 20px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.filter-bar :deep(.el-form-item) { margin-bottom: 0; }

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.resolve-info { padding: 0; }
</style>
