<template>
  <div class="page-container">
    <div class="page-header">
      <h2>新建订单</h2>
      <el-button type="primary" :loading="submitting" @click="submitOrder">提交审核</el-button>
    </div>

    <el-card class="form-card">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" label-position="right">
        <!-- 日期 -->
        <el-form-item label="日期" prop="orderDate">
          <el-date-picker v-model="form.orderDate" value-format="YYYY-MM-DD" style="width:200px;" />
        </el-form-item>

        <!-- 产品名称 + 图片 -->
        <el-form-item label="产品名称" prop="productName">
          <div class="product-row">
            <el-input v-model="form.productName" placeholder="请输入产品名称" style="flex:1;" />
            <div class="upload-area" @dragover.prevent @drop="handleDrop">
              <span v-if="!form.imageUrl" class="upload-placeholder">拖拽图片至此</span>
              <div v-else class="upload-preview">
                <img :src="form.imageUrl" alt="产品图片" />
                <el-icon class="remove-img" @click="form.imageUrl = ''"><CircleClose /></el-icon>
              </div>
            </div>
          </div>
        </el-form-item>

        <!-- 钻石级别 -->
        <el-form-item label="钻石级别">
          <el-select v-model="form.diamondLevel" placeholder="请选择" style="width:200px;">
            <el-option label="VS" value="VS" />
            <el-option label="VVS" value="VVS" />
            <el-option label="培育钻" value="培育钻" />
            <el-option label="塔育钻" value="塔育钻" />
            <el-option label="无" value="" />
          </el-select>
        </el-form-item>

        <!-- 参数 -->
        <el-form-item label="参数">
          <el-input v-model="form.params" placeholder="请输入参数" style="width:300px;" />
        </el-form-item>

        <!-- 数量 + 颜色 -->
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="数量" prop="quantity">
              <el-input-number v-model="form.quantity" :min="1" style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="颜色">
              <el-select v-model="form.color" placeholder="请选择" style="width:100%;">
                <el-option label="K黄" value="K黄" />
                <el-option label="K白" value="K白" />
                <el-option label="9K" value="9K" />
                <el-option label="14K" value="14K" />
                <el-option label="18K" value="18K" />
                <el-option label="银" value="银" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 金额 -->
        <el-form-item label="金额" prop="amount">
          <el-input-number v-model="form.amount" :precision="2" :step="100" style="width:200px;" />
        </el-form-item>

        <!-- LOGO + 工期 -->
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="LOGO">
              <div class="upload-area logo-upload" @dragover.prevent @drop="handleLogoDrop">
                <span v-if="!form.logoUrl" class="upload-placeholder">拖拽LOGO至此</span>
                <div v-else class="upload-preview">
                  <img :src="form.logoUrl" alt="LOGO" />
                  <el-icon class="remove-img" @click="form.logoUrl = ''"><CircleClose /></el-icon>
                </div>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="工期">
              <el-input-number v-model="form.deliveryDays" :min="1" :max="60" style="width:100%;" />
              <span style="margin-left:4px;">天</span>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 网址 -->
        <el-form-item label="网址">
          <el-input v-model="form.url" placeholder="请输入产品网址" style="width:400px;" />
        </el-form-item>

        <!-- 备注 -->
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="备注信息" style="width:500px;" />
        </el-form-item>

          <!-- 客户字段：管理员可下拉选择，非管理员自动填充 -->
        <el-form-item v-if="isAdmin" label="所属客户" prop="customerId">
          <el-select
            v-model="form.customerId"
            filterable
            placeholder="请选择客户"
            style="width:300px;"
            @change="onCustomerChange"
          >
            <el-option
              v-for="c in customers"
              :key="c.customerId"
              :label="c.customerName"
              :value="c.customerId"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-else label="所属客户">
          <el-input :value="form.customerName || userStore.customerName" disabled style="width:300px;" />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CircleClose } from '@element-plus/icons-vue'
import { orderApi } from '@/api/order'
import { customerApi } from '@/api/customer'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref()
const submitting = ref(false)

const isAdmin = computed(() => userStore.role === 'Admin')
const customers = ref([])

const form = reactive({
  customerId: null,
  customerName: '',
  orderDate: new Date().toISOString().split('T')[0],
  productName: '',
  imageUrl: '',
  diamondLevel: '',
  params: '',
  quantity: 1,
  color: '',
  amount: 0,
  logoUrl: '',
  deliveryDays: 7,
  url: '',
  remark: ''
})

const rules = {
  productName: [{ required: true, message: '请输入产品名称' }],
  quantity: [{ required: true, message: '请输入数量' }],
  amount: [{ required: true, message: '请输入金额' }]
}

// ===== 加载客户列表 =====
const loadCustomers = async () => {
  if (isAdmin.value) {
    try {
      customers.value = await customerApi.list({ includeInactive: false })
    } catch {
      customers.value = []
    }
  }
}

// ===== 自动填充当前客户 =====
const initCustomer = () => {
  if (isAdmin.value) return
  if (userStore.customerId) {
    form.customerId = userStore.customerId
    form.customerName = userStore.customerName || ''
  }
}

const onCustomerChange = (val) => {
  const c = customers.value.find(x => x.customerId === val)
  if (c) form.customerName = c.customerName
}

// ===== 图片拖拽 =====
const handleDrop = (e) => {
  const files = e.dataTransfer.files
  if (files.length > 0) {
    const reader = new FileReader()
    reader.onload = (ev) => { form.imageUrl = ev.target.result }
    reader.readAsDataURL(files[0])
  }
}

const handleLogoDrop = (e) => {
  const files = e.dataTransfer.files
  if (files.length > 0) {
    const reader = new FileReader()
    reader.onload = (ev) => { form.logoUrl = ev.target.result }
    reader.readAsDataURL(files[0])
  }
}

// ===== 提交订单 =====
const submitOrder = async () => {
  if (!formRef.value) return
  await formRef.value.validate()

  if (!form.customerId) {
    ElMessage.warning('请选择所属客户')
    return
  }

  submitting.value = true
  try {
    const payload = {
      customerId: form.customerId,
      orderDate: form.orderDate,
      productName: form.productName,
      imageUrl: form.imageUrl,
      diamondLevel: form.diamondLevel,
      params: form.params,
      quantity: form.quantity,
      color: form.color,
      amount: form.amount,
      logoUrl: form.logoUrl,
      deliveryDays: form.deliveryDays,
      url: form.url,
      remark: form.remark
    }
    const res = await orderApi.create(payload)
    if (res.success) {
      ElMessage.success('订单提交成功，等待审核')
      router.push('/order')
    }
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadCustomers()
  initCustomer()
})
</script>

<style scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.form-card { max-width: 800px; }
.product-row { display: flex; gap: 12px; align-items: center; width: 100%; }
.upload-area { width: 100px; height: 100px; border: 2px dashed #d9d9d9; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; flex-shrink: 0; overflow: hidden; position: relative; }
.upload-area:hover { border-color: #409EFF; }
.upload-placeholder { color: #bfbfbf; font-size: 12px; text-align: center; padding: 8px; }
.upload-preview { width: 100%; height: 100%; position: relative; }
.upload-preview img { width: 100%; height: 100%; object-fit: cover; }
.remove-img { position: absolute; top: -4px; right: -4px; font-size: 18px; color: #F56C6C; cursor: pointer; background: #fff; border-radius: 50%; }
.logo-upload { width: 80px; height: 80px; }
</style>