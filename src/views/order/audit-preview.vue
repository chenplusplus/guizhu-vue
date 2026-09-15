<!-- src/views/order/audit-preview.vue -->
<template>
  <div class="audit-preview-page" v-loading="loading">
    <!-- ===== 顶部标题栏 ===== -->
    <div class="top-bar">
      <div class="top-left">
        <span class="page-title">📋 待审核订单</span>
        <el-tag type="info" size="small">共 {{ tableData.length }} 条</el-tag>
        <el-tag v-if="selectedRows.length" type="primary" size="small">
          已选 {{ selectedRows.length }} 条
        </el-tag>
      </div>
      <div class="top-right">
        <el-button size="small" @click="loadList">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- ===== 表格容器（横竖滚动）===== -->
    <div class="table-container">
      <table class="audit-table">
        <!-- 表头 -->
        <thead>
          <tr>
            <th class="col-check sticky-left">
              <el-checkbox
                v-model="allChecked"
                :indeterminate="isIndeterminate"
                @change="handleCheckAll"
              />
            </th>
            <th class="col-no">订单号</th>
            <th class="col-date">日期</th>
            <th class="col-product">产品名称</th>
            <th class="col-customer">客户</th>
            <th class="col-image">图片</th>
            <th class="col-image">数据图</th>
            <th class="col-size">手寸/长度</th>
            <th class="col-width">宽/厚度</th>
            <th class="col-qty">数量</th>
            <th class="col-color">成色</th>
            <th class="col-price">金价</th>
            <th class="col-logo">LOGO</th>
            <th class="col-diamond">钻石级别</th>
            <th class="col-weight">克重要求</th>
            <th class="col-days">工期</th>
            <th class="col-image">字印要求图</th>
            <th class="col-url">网址</th>
            <th class="col-remark">备注</th>
            <th class="col-actions sticky-right">操作</th>
          </tr>
        </thead>

        <!-- 表体 -->
        <tbody>
          <tr
            v-for="row in tableData"
            :key="row.orderId"
            :class="{ 'row-selected': isSelected(row.orderId) }"
          >
            <td class="col-check sticky-left">
              <el-checkbox
                :model-value="isSelected(row.orderId)"
                @change="(val) => handleCheckRow(row, val)"
              />
            </td>

            <td class="col-no">{{ row.orderNo || '-' }}</td>
            <td class="col-date">{{ formatDate(row.orderDate) }}</td>
            <td class="col-product">{{ row.productName || '-' }}</td>
            <td class="col-customer">{{ row.customerName || '-' }}</td>

            <!-- 产品图片 -->
            <td class="col-image">
              <div v-if="getImages(row, 'product').length" class="image-cell">
                <el-image
                  v-for="(img, i) in getImages(row, 'product')"
                  :key="'p-' + (img.id || i)"
                  :src="img.imageUrl"
                  fit="contain"
                  class="cell-image"
                  :preview-src-list="getImages(row, 'product').map(x => x.imageUrl)"
                  :initial-index="i"
                  preview-teleported
                />
              </div>
              <span v-else class="empty">-</span>
            </td>

            <!-- 数据图 -->
            <td class="col-image">
              <div v-if="getImages(row, 'data').length" class="image-cell">
                <el-image
                  v-for="(img, i) in getImages(row, 'data')"
                  :key="'d-' + (img.id || i)"
                  :src="img.imageUrl"
                  fit="contain"
                  class="cell-image"
                  :preview-src-list="getImages(row, 'data').map(x => x.imageUrl)"
                  :initial-index="i"
                  preview-teleported
                />
              </div>
              <span v-else class="empty">-</span>
            </td>

            <td class="col-size">{{ row.size || '-' }}</td>
            <td class="col-width">{{ row.widthThick || '-' }}</td>
            <td class="col-qty">{{ row.quantity || '-' }}</td>

            <td class="col-color">
              <span class="color-dot" :style="{ background: getPurityColor(row) }"></span>
              {{ row.color || '-' }}
            </td>

            <td class="col-price">{{ row.goldPrice || '-' }}</td>
            <td class="col-logo">{{ row.logoText || '-' }}</td>
            <td class="col-diamond">{{ row.diamondLevel || '-' }}</td>
            <td class="col-weight">{{ row.weightRequirement || '-' }}</td>
            <td class="col-days">{{ row.deliveryDays || '-' }} 天</td>

            <!-- 字印要求图 -->
            <td class="col-image">
              <div v-if="getImages(row, 'letter').length" class="image-cell">
                <el-image
                  v-for="(img, i) in getImages(row, 'letter')"
                  :key="'l-' + (img.id || i)"
                  :src="img.imageUrl"
                  fit="contain"
                  class="cell-image"
                  :preview-src-list="getImages(row, 'letter').map(x => x.imageUrl)"
                  :initial-index="i"
                  preview-teleported
                />
              </div>
              <span v-else class="empty">-</span>
            </td>

            <td class="col-url">
              <a v-if="row.url" :href="row.url" target="_blank" class="url-link">链接</a>
              <span v-else>-</span>
            </td>

            <td class="col-remark">{{ row.remark || '-' }}</td>

            <td class="col-actions sticky-right">
              <el-button type="danger" size="small" link @click="handleRejectSingle(row)">
                驳回
              </el-button>
              <el-button type="success" size="small" link @click="handleApproveSingle(row)">
                通过
              </el-button>
            </td>
          </tr>

          <tr v-if="!loading && tableData.length === 0">
            <td :colspan="20" class="empty-row">暂无待审核订单</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== 底部固定按钮 ===== -->
    <div class="footer-bar">
      <div class="footer-left">
        <span v-if="selectedRows.length" class="selected-info">
          已选 {{ selectedRows.length }} 条
        </span>
        <span v-else class="selected-info empty">请勾选需要操作的订单</span>
      </div>
      <div class="footer-right">
        <el-button
          type="danger"
          size="large"
          :disabled="selectedRows.length === 0 || submitting"
          @click="handleRejectBatch"
        >
          批量驳回（{{ selectedRows.length }}）
        </el-button>
        <el-button
          type="success"
          size="large"
          :disabled="selectedRows.length === 0 || submitting"
          :loading="submitting"
          @click="handleApproveBatch"
        >
          批量通过（{{ selectedRows.length }}）
        </el-button>
      </div>
    </div>

    <!-- ===== 驳回输入框 ===== -->
    <el-dialog
      v-model="rejectDialogVisible"
      title="驳回订单"
      width="500px"
      :close-on-click-modal="false"
      append-to-body
    >
      <div v-if="rejectTargets.length > 1" style="margin-bottom:12px;color:#909399;font-size:13px;">
        共驳回 {{ rejectTargets.length }} 个订单
      </div>
      <el-input
        v-model="rejectRemark"
        type="textarea"
        :rows="4"
        placeholder="请输入驳回原因"
      />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="submitting">
          确认驳回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getOrderList, auditOrder } from '@/api/order'
import { dictApi } from '@/api/dict'

const loading = ref(false)
const submitting = ref(false)
const tableData = ref([])
const purityDict = ref([])

// ===== 勾选 =====
const selectedRows = ref([])

const isSelected = (orderId) => selectedRows.value.some(x => x.orderId === orderId)

const handleCheckRow = (row, val) => {
  if (val) {
    if (!isSelected(row.orderId)) {
      selectedRows.value.push(row)
    }
  } else {
    selectedRows.value = selectedRows.value.filter(x => x.orderId !== row.orderId)
  }
}

const allChecked = computed(() =>
  tableData.value.length > 0 && selectedRows.value.length === tableData.value.length
)

const isIndeterminate = computed(() =>
  selectedRows.value.length > 0 && selectedRows.value.length < tableData.value.length
)

const handleCheckAll = (val) => {
  if (val) {
    selectedRows.value = [...tableData.value]
  } else {
    selectedRows.value = []
  }
}

// ===== 图片 =====
const getImages = (row, type) => {
  return (row.images || []).filter(x => x.imageType === type)
}

// ===== 成色颜色 =====
const getPurityColor = (row) => {
  if (row.purityId) {
    const item = purityDict.value.find(x => x.id === row.purityId)
    if (item) {
      try {
        const extra = item.extraData ? JSON.parse(item.extraData) : {}
        if (extra.color) return extra.color
      } catch {}
    }
  }
  const label = (row.color || '').trim()
  if (label) {
    const item = purityDict.value.find(x => x.itemLabel === label)
    if (item) {
      try {
        const extra = item.extraData ? JSON.parse(item.extraData) : {}
        if (extra.color) return extra.color
      } catch {}
    }
  }
  return '#DCDFE6'
}

// ===== 加载列表 =====
const loadList = async () => {
  loading.value = true
  try {
    const res = await getOrderList({
      status: 'pending',
      page: 1,
      pageSize: 1000
    })

    let data = res?.data || {}
    let list = []

    if (Array.isArray(data)) {
      list = data
    } else if (data.items && Array.isArray(data.items)) {
      list = data.items
    } else if (data.data && Array.isArray(data.data)) {
      list = data.data
    }

    tableData.value = list
    selectedRows.value = []
  } catch (error) {
    ElMessage.error(error.message || '加载数据失败')
    tableData.value = []
  } finally {
    loading.value = false
  }
}

// ===== 单个通过 =====
const handleApproveSingle = async (row) => {
  submitting.value = true
  try {
    await auditOrder(row.orderId, { approved: true, remark: '' })
    ElMessage.success(`订单 ${row.orderNo} 审核通过`)
    loadList()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// ===== 单个驳回 =====
const rejectDialogVisible = ref(false)
const rejectTargets = ref([])
const rejectRemark = ref('')

const handleRejectSingle = (row) => {
  rejectTargets.value = [row]
  rejectRemark.value = ''
  rejectDialogVisible.value = true
}

// ===== 批量通过 =====
const handleApproveBatch = async () => {
  if (selectedRows.value.length === 0) return

  submitting.value = true
  try {
    let ok = 0, fail = 0
    for (const row of selectedRows.value) {
      try {
        await auditOrder(row.orderId, { approved: true, remark: '' })
        ok++
      } catch {
        fail++
      }
    }
    ElMessage.success(`成功 ${ok} 条，失败 ${fail} 条`)
    selectedRows.value = []
    loadList()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// ===== 批量驳回 =====
const handleRejectBatch = () => {
  if (selectedRows.value.length === 0) return
  rejectTargets.value = [...selectedRows.value]
  rejectRemark.value = ''
  rejectDialogVisible.value = true
}

const confirmReject = async () => {
  if (!rejectRemark.value.trim()) {
    ElMessage.warning('请输入驳回原因')
    return
  }

  submitting.value = true
  try {
    let ok = 0, fail = 0
    for (const row of rejectTargets.value) {
      try {
        await auditOrder(row.orderId, { approved: false, remark: rejectRemark.value.trim() })
        ok++
      } catch {
        fail++
      }
    }
    ElMessage.success(`成功驳回 ${ok} 条，失败 ${fail} 条`)
    rejectDialogVisible.value = false
    selectedRows.value = []
    loadList()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// ===== 日期 =====
const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ===== 初始化 =====
onMounted(async () => {
  try {
    const purityRes = await dictApi.getItemsByKey('purity')
    purityDict.value = purityRes?.data || []
  } catch {}
  loadList()
})
</script>

<style scoped>
/* ===== 全屏页面 ===== */
.audit-preview-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
  font-family: "Microsoft YaHei", sans-serif;
}

/* ===== 顶部标题栏（系统风格）===== */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e8ecf1;
  flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.top-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.top-right {
  display: flex;
  gap: 8px;
}

/* ===== 表格容器（横竖滚动）===== */
.table-container {
  flex: 1;
  overflow: auto;
  background: #fff;
  margin: 0;
  position: relative;
}

/* ===== 表格 ===== */
.audit-table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  table-layout: fixed;
  width: max-content;
  min-width: 100%;
}

.audit-table th,
.audit-table td {
  border-right: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
  padding: 8px 10px;
  vertical-align: middle;
  text-align: center;
  word-break: break-word;
  background: #fff;
}

.audit-table th {
  background: #fafafa;
  font-weight: 600;
  color: #303133;
  position: sticky;
  top: 0;
  z-index: 10;
  white-space: nowrap;
  font-size: 13px;
  height: 44px;
  border-bottom: 1px solid #dcdfe6;
}

.audit-table tbody tr:hover td {
  background: #f5f7fa;
}

.audit-table tbody tr.row-selected td {
  background: #ecf5ff;
}

/* ⭐ 粘性列：勾选列固定在左侧 */
.sticky-left {
  position: sticky;
  left: 0;
  z-index: 15;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.06);
}
.audit-table th.sticky-left {
  z-index: 20;
  background: #fafafa;
}
.audit-table tbody tr:hover td.sticky-left {
  background: #f5f7fa;
}
.audit-table tbody tr.row-selected td.sticky-left {
  background: #ecf5ff;
}

/* ⭐ 粘性列：操作列固定在右侧 */
.sticky-right {
  position: sticky;
  right: 0;
  z-index: 15;
  box-shadow: -2px 0 4px rgba(0, 0, 0, 0.06);
}
.audit-table th.sticky-right {
  z-index: 20;
  background: #fafafa;
}
.audit-table tbody tr:hover td.sticky-right {
  background: #f5f7fa;
}
.audit-table tbody tr.row-selected td.sticky-right {
  background: #ecf5ff;
}

/* ===== 列宽 ===== */
.col-check { width: 50px; min-width: 50px; }
.col-no { width: 140px; min-width: 140px; }
.col-date { width: 100px; min-width: 100px; }
.col-product { width: 130px; min-width: 130px; }
.col-customer { width: 110px; min-width: 110px; }
.col-image { width: 220px; min-width: 220px; }
.col-size { width: 90px; min-width: 90px; }
.col-width { width: 90px; min-width: 90px; }
.col-qty { width: 60px; min-width: 60px; }
.col-color { width: 100px; min-width: 100px; }
.col-price { width: 80px; min-width: 80px; }
.col-logo { width: 100px; min-width: 100px; }
.col-diamond { width: 90px; min-width: 90px; }
.col-weight { width: 100px; min-width: 100px; }
.col-days { width: 70px; min-width: 70px; }
.col-url { width: 80px; min-width: 80px; }
.col-remark { width: 120px; min-width: 120px; }
.col-actions { width: 130px; min-width: 130px; }

/* ===== 图片格子 ===== */
.image-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}
.cell-image {
  width: 60px;
  height: 60px;
  border: 1px solid #e8ecf1;
  border-radius: 4px;
  cursor: pointer;
  background: #fafafa;
  object-fit: contain;
}
.cell-image:hover {
  border-color: #409EFF;
}
.empty { color: #c0c4cc; }

.empty-row {
  text-align: center;
  padding: 60px;
  color: #909399;
  font-size: 15px;
}

/* ===== 成色颜色点 ===== */
.color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid #dcdfe6;
  vertical-align: middle;
  margin-right: 4px;
}

/* ===== URL ===== */
.url-link {
  color: #409EFF;
  text-decoration: none;
}
.url-link:hover { text-decoration: underline; }

/* ===== 底部固定按钮（系统风格）===== */
.footer-bar {
  flex-shrink: 0;
  height: 64px;
  background: #fff;
  border-top: 1px solid #e8ecf1;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}

.footer-left .selected-info {
  font-size: 14px;
  color: #409EFF;
  font-weight: 500;
}
.footer-left .selected-info.empty {
  color: #909399;
  font-weight: normal;
}

.footer-right {
  display: flex;
  gap: 12px;
}
</style>