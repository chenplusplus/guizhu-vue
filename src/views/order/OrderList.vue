<template>
  <div class="page-container">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <h2>订单列表</h2>
      <!-- 新建订单按钮：只有 customer（客户）可以看到 -->
      <el-button
        v-if="canCreate"
        type="primary"
        @click="$router.push('/order/create')"
      >
        <el-icon><Plus /></el-icon> 新建订单
      </el-button>
    </div>

    <!-- ===== 搜索栏 ===== -->
    <div class="search-bar">
      <el-form :model="filters" inline>
        <el-form-item>
          <el-select
            v-model="filters.status"
            clearable
            placeholder="全部状态"
            @change="loadData"
            style="width:150px;"
          >
            <el-option
              v-for="(label, val) in statusMap"
              :key="val"
              :label="label"
              :value="val"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="filters.keyword"
            placeholder="搜索订单号/客户/产品"
            clearable
            @clear="loadData"
            @keyup.enter="loadData"
            style="width:200px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
          <!-- 客户审核员：快捷筛选待审核 -->
          <el-button
            v-if="isCustomerAuditor"
            type="warning"
            @click="filters.status = 'pending'; loadData()"
          >
            待审核
          </el-button>
          <!-- 工厂审核员：快捷筛选客户已审核 -->
          <el-button
            v-if="isFactoryAuditor"
            type="warning"
            @click="filters.status = 'customerAudited'; loadData()"
          >
            待工厂审核
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- ===== 表格 ===== -->
    <el-table
      :data="tableData"
      border
      stripe
      v-loading="loading"
      :row-class-name="rowClass"
      style="width:100%;"
    >
      <el-table-column prop="orderNo" label="订单号" width="160" fixed="left" />
      <el-table-column prop="customerName" label="客户" min-width="120" />
      <el-table-column prop="orderDate" label="日期" width="110" />
      <el-table-column prop="productName" label="产品" min-width="140" show-overflow-tooltip />
      <el-table-column prop="diamondLevel" label="钻石级别" width="100" align="center">
        <template #default="{ row }">
          <span v-if="row.diamondLevel">{{ row.diamondLevel }}</span>
          <span v-else style="color:#ccc;">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="quantity" label="数量" width="70" align="center" />
      <el-table-column prop="color" label="颜色" width="80" align="center">
        <template #default="{ row }">
          <span v-if="row.color">{{ row.color }}</span>
          <span v-else style="color:#ccc;">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="amount" label="金额" width="130" align="right">
        <template #default="{ row }">¥{{ row.amount?.toFixed(2) || '0.00' }}</template>
      </el-table-column>
      <el-table-column prop="statusText" label="状态" width="120" align="center">
        <template #default="{ row }">
          <StatusBadge :status="row.flowStatus" />
        </template>
      </el-table-column>
      <el-table-column label="预警" width="60" align="center">
        <template #default="{ row }">
          <el-icon v-if="row.warnFlag" color="#F56C6C"><Warning /></el-icon>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right" align="center">
        <template #default="{ row }">
          <el-button size="small" @click="viewDetail(row.orderId)">查看</el-button>

          <!-- ===== 客户审核员：待客户审核（pending） ===== -->
          <template v-if="isCustomerAuditor && row.flowStatus === 'pending'">
            <el-button size="small" type="success" @click="auditOrder(row, true)">
              通过
            </el-button>
            <el-button size="small" type="danger" @click="auditOrder(row, false)">
              驳回
            </el-button>
          </template>

          <!-- ===== 工厂审核员：待工厂审核（customerAudited） ===== -->
          <template v-if="isFactoryAuditor && row.flowStatus === 'customerAudited'">
            <el-button size="small" type="success" @click="auditOrder(row, true)">
              通过
            </el-button>
            <el-button size="small" type="danger" @click="auditOrder(row, false)">
              驳回
            </el-button>
          </template>

          <!-- ===== 删除按钮（仅草稿/已驳回，且是提交人或管理员） ===== -->
          <el-button
            v-if="canDelete(row)"
            size="small"
            type="danger"
            @click="deleteOrder(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ===== 分页 ===== -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Warning } from '@element-plus/icons-vue'
import { orderApi } from '@/api/order'
import { useUserStore } from '@/store/user'
import StatusBadge from '@/components/StatusBadge.vue'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

// ===== 状态 =====
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

// ===== 当前用户信息 =====
const currentUserId = computed(() => userStore.userId)
const currentRole = computed(() => userStore.role || 'Customer')
const userType = computed(() => userStore.userType || 'customer')

// ===== 权限判断 =====
// 客户（customer）可以创建订单
const canCreate = computed(() => userType.value === 'customer')

// 客户审核员（customerAudit）
const isCustomerAuditor = computed(() => userType.value === 'customerAudit')

// 工厂审核员（factoryAudit）
const isFactoryAuditor = computed(() => userType.value === 'factoryAudit')

// 管理员
const isAdmin = computed(() => currentRole.value === 'Admin')

// ===== 状态映射 =====
const statusMap = {
  draft: '草稿',
  pending: '待客户审核',
  customerAudited: '客户已审核',
  factoryPending: '待工厂审核',
  audited: '已审核',
  producing: '制作中',
  completed: '已完成',
  rejected: '已驳回',
  cancelled: '已取消'
}

// ===== 搜索条件 =====
const filters = reactive({
  status: null,
  keyword: ''
})

// ===== 行样式（预警高亮） =====
const rowClass = ({ row }) => {
  return row.warnFlag ? 'warn-row' : ''
}

// ===== 是否可删除 =====
const canDelete = (row) => {
  const canStatus = row.flowStatus === 'draft' || row.flowStatus === 'rejected'
  const isOwner = row.submittedBy === String(currentUserId.value)
  const isAdminUser = isAdmin.value
  return canStatus && (isOwner || isAdminUser)
}

// ===== 格式化时间 =====
const formatTime = (time) => {
  if (!time) return '-'
  return dayjs(time).format('YYYY-MM-DD HH:mm')
}

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      status: filters.status,
      keyword: filters.keyword,
      page: page.value,
      limit: pageSize.value
    }
    const data = await orderApi.list(params)
    tableData.value = data || []
    total.value = data?.length || 0
  } catch {
    ElMessage.error('加载订单列表失败')
  } finally {
    loading.value = false
  }
}

// ===== 重置搜索 =====
const resetFilters = () => {
  filters.status = null
  filters.keyword = ''
  page.value = 1
  loadData()
}

// ===== 查看详情 =====
const viewDetail = (orderId) => {
  router.push(`/order/detail/${orderId}`)
}

// ===== 审核订单 =====
const auditOrder = async (row, approved) => {
  try {
    const action = approved ? '通过' : '驳回'
    let remark = ''

    if (!approved) {
      const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回订单', {
        confirmButtonText: '确定驳回',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '请填写驳回原因'
      })
      if (value === null || value === undefined) return
      remark = value
    } else {
      await ElMessageBox.confirm(`确认审核通过订单 ${row.orderNo}？`, '审核通过', {
        type: 'success'
      })
    }

    await orderApi.audit(row.orderId, { approved, remark })
    ElMessage.success(`审核${action}成功`)
    loadData()
  } catch {
    // 用户取消
  }
}

// ===== 删除订单 =====
const deleteOrder = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除订单 ${row.orderNo}？`, '删除确认', {
      type: 'warning'
    })
    await orderApi.delete(row.orderId)
    ElMessage.success('删除成功')
    loadData()
  } catch {
    // 用户取消
  }
}

// ===== 初始化 =====
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1d2129;
  margin: 0;
}

.search-bar {
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.search-bar .el-form-item {
  margin-bottom: 0;
}

.el-table {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:deep(.el-table .warn-row) {
  background: #fff0f0 !important;
}

:deep(.el-table .warn-row:hover) {
  background: #ffe0e0 !important;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  background: #fff;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
</style>