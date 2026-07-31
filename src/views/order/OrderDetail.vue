<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
        <h2>订单 {{ orderData?.orderNo }}</h2>
      </div>
      <div>
        <el-button type="primary" @click="openFlowDrawer"><el-icon><Share /></el-icon> 查看流程</el-button>
        <el-button v-if="canDelete" type="danger" @click="deleteOrder"><el-icon><Delete /></el-icon> 删除</el-button>
      </div>
    </div>

    <el-card class="info-card">
      <el-row :gutter="16">
        <el-col :span="6"><span class="label">客户：</span><span class="value">{{ orderData?.customerName }}</span></el-col>
        <el-col :span="6"><span class="label">订单日期：</span><span class="value">{{ orderData?.orderDate }}</span></el-col>
        <el-col :span="6"><span class="label">状态：</span><StatusBadge :status="orderData?.flowStatus" /></el-col>
        <el-col :span="6"><span class="label">金额：</span><span class="value" style="color:#F56C6C;font-weight:bold;font-size:18px;">¥{{ orderData?.amount?.toFixed(2) }}</span></el-col>
      </el-row>
      <el-row :gutter="16" style="margin-top:8px;">
        <el-col :span="6"><span class="label">产品：</span><span class="value">{{ orderData?.productName }}</span></el-col>
        <el-col :span="6"><span class="label">钻石级别：</span><span class="value">{{ orderData?.diamondLevel || '-' }}</span></el-col>
        <el-col :span="6"><span class="label">数量：</span><span class="value">{{ orderData?.quantity }}</span></el-col>
        <el-col :span="6"><span class="label">工期：</span><span class="value">{{ orderData?.deliveryDays || '-' }} 天</span></el-col>
      </el-row>
      <el-row :gutter="16" style="margin-top:8px;">
        <el-col :span="24"><span class="label">备注：</span><span class="value">{{ orderData?.remark || '-' }}</span></el-col>
      </el-row>
      <!-- 审核员可见字段 -->
      <el-row :gutter="16" style="margin-top:8px;" v-if="isAuditor">
        <el-col :span="6"><span class="label" style="color:#E6A23C;">损耗率：</span><span class="value">{{ orderData?.lossRate || '-' }}</span></el-col>
        <el-col :span="6"><span class="label" style="color:#E6A23C;">金价：</span><span class="value">{{ orderData?.goldPrice || '-' }}</span></el-col>
        <el-col :span="6"><span class="label" style="color:#E6A23C;">成本价：</span><span class="value">{{ orderData?.costPrice || '-' }}</span></el-col>
      </el-row>
    </el-card>

    <el-card class="detail-card" v-if="orderData?.productName">
      <template #header><span>产品信息</span></template>
      <el-row :gutter="16">
        <el-col :span="8" v-if="orderData?.imageUrl">
          <img :src="orderData.imageUrl" style="max-width:100%;max-height:200px;border-radius:4px;" />
        </el-col>
        <el-col :span="8" v-if="orderData?.logoUrl">
          <div><span class="label">LOGO：</span></div>
          <img :src="orderData.logoUrl" style="max-width:100%;max-height:100px;border-radius:4px;" />
        </el-col>
        <el-col :span="8" v-if="orderData?.url">
          <span class="label">网址：</span>
          <a :href="orderData.url" target="_blank">{{ orderData.url }}</a>
        </el-col>
      </el-row>
    </el-card>

    <FlowDrawer ref="flowDrawerRef" v-model="flowDrawerVisible" :order-id="orderId" :order-no="orderData?.orderNo" @refresh="loadData" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Share, Delete } from '@element-plus/icons-vue'
import { orderApi } from '@/api/order'
import { useUserStore } from '@/store/user'
import StatusBadge from '@/components/StatusBadge.vue'
import FlowDrawer from '@/components/FlowDrawer.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const orderId = ref(Number(route.params.id))
const loading = ref(false)
const orderData = ref(null)
const flowDrawerVisible = ref(false)

const currentRole = computed(() => userStore.role || 'Customer')
const isAuditor = computed(() => currentRole.value === 'Auditor' || currentRole.value === 'Admin')

const canDelete = computed(() => {
  if (!orderData.value) return false
  const status = orderData.value.flowStatus
  const role = currentRole.value
  return (status === 'draft' || status === 'rejected') && (role === 'Admin' || role === 'Operator')
})

const loadData = async () => {
  loading.value = true
  try {
    orderData.value = await orderApi.get(orderId.value)
  } catch { ElMessage.error('加载订单失败') } finally { loading.value = false }
}

const openFlowDrawer = () => { flowDrawerVisible.value = true }

const deleteOrder = async () => {
  try {
    await ElMessageBox.confirm(`确认删除订单 ${orderData.value?.orderNo}？`, '删除确认', { type: 'warning' })
    await orderApi.delete(orderId.value)
    ElMessage.success('删除成功')
    router.push('/order')
  } catch {}
}

onMounted(loadData)
</script>

<style scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h2 { margin: 0; font-size: 18px; }
.info-card { margin-bottom: 16px; }
.detail-card { margin-bottom: 16px; }
.label { color: #909399; font-size: 14px; }
.value { color: #303133; font-size: 14px; }
</style>