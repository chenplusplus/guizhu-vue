<template>
  <div class="page-container">
    <div class="page-header">
      <h2>制作管理</h2>
      <div class="header-actions">
        <el-select v-model="filterStatus" clearable placeholder="全部状态" @change="loadData" style="width:140px;">
          <el-option label="待制作" value="audited" />
          <el-option label="制作中" value="producing" />
          <el-option label="已完成" value="completed" />
        </el-select>
        <el-button type="primary" @click="loadData">刷新</el-button>
      </div>
    </div>

    <el-row :gutter="16" class="stat-row">
      <el-col :span="8"><el-card shadow="hover" class="stat-card"><div class="stat-number">{{ stats.audited }}</div><div class="stat-label">待制作</div></el-card></el-col>
      <el-col :span="8"><el-card shadow="hover" class="stat-card" style="border-color:#409EFF;"><div class="stat-number" style="color:#409EFF;">{{ stats.producing }}</div><div class="stat-label">制作中</div></el-card></el-col>
      <el-col :span="8"><el-card shadow="hover" class="stat-card" style="border-color:#67C23A;"><div class="stat-number" style="color:#67C23A;">{{ stats.completed }}</div><div class="stat-label">已完成</div></el-card></el-col>
    </el-row>

    <el-table :data="tableData" border stripe v-loading="loading" style="width:100%;">
      <el-table-column prop="orderNo" label="订单号" width="160" fixed="left" />
      <el-table-column prop="customerName" label="客户" min-width="120" />
      <el-table-column prop="productName" label="产品" min-width="140" show-overflow-tooltip />
      <el-table-column prop="quantity" label="数量" width="70" align="center" />
      <el-table-column prop="amount" label="金额" width="130" align="right"><template #default="{ row }">¥{{ row.amount?.toFixed(2) || '0.00' }}</template></el-table-column>
      <el-table-column prop="statusText" label="状态" width="100" align="center"><template #default="{ row }"><el-tag :type="row.statusType || 'warning'">{{ row.statusText }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="200" fixed="right" align="center">
        <template #default="{ row }">
          <el-button size="small" @click="viewDetail(row.orderId)">查看</el-button>
          <el-button v-if="row.flowStatus === 'audited'" size="small" type="primary" @click="startProduction(row)">开始制作</el-button>
          <el-button v-if="row.flowStatus === 'producing'" size="small" type="success" @click="completeProduction(row)">完成制作</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" layout="total, sizes, prev, pager, next" @size-change="loadData" @current-change="loadData" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi } from '@/api/order'

const router = useRouter()
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filterStatus = ref(null)

const stats = reactive({ audited: 0, producing: 0, completed: 0 })

const loadData = async () => {
  loading.value = true
  try {
    const data = await orderApi.productionList({ status: filterStatus.value })
    tableData.value = data || []
    total.value = data?.length || 0
    stats.audited = data?.filter(item => item.flowStatus === 'audited').length || 0
    stats.producing = data?.filter(item => item.flowStatus === 'producing').length || 0
    stats.completed = data?.filter(item => item.flowStatus === 'completed').length || 0
  } catch { ElMessage.error('加载制作列表失败') } finally { loading.value = false }
}

const startProduction = async (row) => {
  try {
    await ElMessageBox.confirm(`确认开始制作订单 ${row.orderNo}？`, '开始制作', { type: 'info' })
    await orderApi.updateProduction(row.orderId, { status: 'producing' })
    ElMessage.success('已开始制作')
    loadData()
  } catch {}
}

const completeProduction = async (row) => {
  try {
    await ElMessageBox.confirm(`确认完成制作订单 ${row.orderNo}？`, '完成制作', { type: 'success' })
    await orderApi.updateProduction(row.orderId, { status: 'completed' })
    ElMessage.success('制作完成')
    loadData()
  } catch {}
}

const viewDetail = (orderId) => router.push(`/order/detail/${orderId}`)

onMounted(loadData)
</script>

<style scoped>
.page-container { padding: 20px; background: #f5f7fa; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 20px; font-weight: 600; color: #1d2129; margin: 0; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.stat-row { margin-bottom: 16px; }
.stat-card { text-align: center; padding: 8px 0; border-radius: 8px; }
.stat-number { font-size: 32px; font-weight: 700; color: #1d2129; }
.stat-label { font-size: 14px; color: #86909c; margin-top: 4px; }
.el-table { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; background: #fff; padding: 12px 20px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
</style>