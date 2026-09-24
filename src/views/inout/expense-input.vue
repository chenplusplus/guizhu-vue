<template>
  <div class="inout-input-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">💰 资金录入</span>
          <el-button type="primary" size="small" @click="$router.push('/inout/expense-list')">查看列表 →</el-button>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px" size="default">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="业务日期" prop="recordDate">
              <el-date-picker v-model="form.recordDate" type="date" value-format="YYYY-MM-DD" style="width:100%" @change="loadLastTotal" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="方向">
              <el-select v-model="form.direction" style="width:100%" :disabled="directionLocked">
                <el-option label="支出" :value="0" />
                <el-option label="收入" :value="1" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="供应商">
              <el-select v-model="form.counterpartyId" placeholder="请选择" filterable clearable style="width:100%" @change="onCounterpartyChange">
                <el-option v-for="cp in counterparties" :key="cp.id" :label="cp.name" :value="cp.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="资金分类" prop="expenseCategory">
              <el-select v-model="form.expenseCategory" placeholder="请选择" style="width:100%">
                <el-option v-for="c in expenseCategories" :key="c.value" :label="c.label" :value="c.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="产品名称">
              <el-input v-model="form.productName" placeholder="请输入产品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="内容">
              <el-input v-model="form.content" placeholder="请输入内容" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="录入人">
              <el-input v-model="form.createByName" placeholder="默认登录人，可改" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">金额</el-divider>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="金额" prop="amount">
              <el-input-number v-model="form.amount" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="付款金额">
              <el-input-number v-model="form.paymentAmount" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="关联订单号">
              <el-input v-model="form.orderNo" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">累计</el-divider>

        <el-row :gutter="16">
          <el-col :span="12">
            <div class="stat-box">
              <div class="stat-label">上单累计金额</div>
              <div class="stat-value">¥{{ lastTotal.lastTotalAmount.toFixed(2) }}</div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="stat-box highlight">
              <div class="stat-label">本单累计金额</div>
              <div class="stat-value">¥{{ currentTotalAmountDisplay.toFixed(2) }}</div>
            </div>
          </el-col>
        </el-row>

        <el-form-item style="margin-top:16px;">
          <el-button type="primary" :loading="submitting" @click="handleSubmit">提交录入</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createExpense, getExpenseLastTotal, getExpenseById } from '@/api/inout'
import { getCounterpartyAll } from '@/api/counterparty'

const route = useRoute()
const formRef = ref()
const submitting = ref(false)
const counterparties = ref([])

const expenseCategories = [
  { value: '倒模费用', label: '倒模费用' },
  { value: '配件费用', label: '配件费用' },
  { value: '房租水电', label: '房租/水电' },
  { value: '工资', label: '工资' },
  { value: '工具费用', label: '工具费用' },
  { value: '滴胶电金', label: '滴胶/电金' },
  { value: '彩宝费用', label: '彩宝费用' },
  { value: '伙食费', label: '伙食费' },
  { value: '其他开支', label: '其他开支' },
  { value: '蜡费', label: '蜡费' },
  { value: '磨石费', label: '磨石费' },
  { value: '维修', label: '维修' },
  { value: '回收', label: '回收' },
  { value: '货款', label: '货款' }
]

const form = reactive({
  recordDate: new Date().toISOString().slice(0, 10),
  direction: 0,
  counterpartyId: null,
  expenseCategory: '',
  amount: 0,
  paymentAmount: 0,
  orderNo: '',
  remark: '',
  productName: '',
  content: '',
  createByName: ''
})

const currentUserName = ref('')
try {
  const ui = JSON.parse(localStorage.getItem('userInfo') || '{}')
  currentUserName.value = ui.realName || ui.name || ''
} catch {}

const presetDirection = computed(() => {
  const d = route.meta.direction
  return (d === 0 || d === 1) ? Number(d) : null
})
const directionLocked = computed(() => presetDirection.value !== null)
const applyDirectionPreset = () => {
  if (presetDirection.value !== null) {
    form.direction = presetDirection.value
  }
}

const lastTotal = reactive({ lastTotalAmount: 0 })

const rules = {
  recordDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  expenseCategory: [{ required: true, message: '请选择分类', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
}

const sign = computed(() => form.direction === 1 ? 1 : -1)
const currentTotalAmountDisplay = computed(() => lastTotal.lastTotalAmount + sign.value * (form.amount || 0))

const loadCounterparties = async () => {
  try {
    const res = await getCounterpartyAll()
    if (res.data) counterparties.value = res.data
  } catch {}
}

const loadLastTotal = async () => {
  try {
    const res = await getExpenseLastTotal(form.recordDate, form.counterpartyId)
    if (res.success) Object.assign(lastTotal, res.data)
  } catch {}
}

const onCounterpartyChange = (cpId) => {
  loadLastTotal()
}

const handleSubmit = async () => {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const res = await createExpense(form)
      if (res.success) {
        ElMessage.success('资金录入成功')
        handleReset()
        loadLastTotal()
      }
    } catch (e) {
      ElMessage.error('提交失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleReset = () => {
  formRef.value?.resetFields()
  form.recordDate = new Date().toISOString().slice(0, 10)
  form.direction = presetDirection.value !== null ? presetDirection.value : 0
  form.amount = 0
  form.paymentAmount = 0
  form.remark = ''
  form.productName = ''
  form.content = ''
  form.createByName = currentUserName.value
}

onMounted(async () => {
  loadCounterparties()
  if (route.query.id) {
    try {
      const res = await getExpenseById(route.query.id)
      if (res.success) {
        Object.assign(form, res.data)
        if (form.recordDate && form.recordDate.length > 10) form.recordDate = form.recordDate.slice(0, 10)
        if (!form.createByName) form.createByName = currentUserName.value
      }
    } catch {}
  }
  if (!form.createByName) form.createByName = currentUserName.value
  loadLastTotal()
  applyDirectionPreset()
})

watch(() => route.fullPath, () => {
  applyDirectionPreset()
})
</script>

<style scoped>
.inout-input-page { padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; font-size: 16px; }
.stat-box { background: #f5f7fa; border-radius: 6px; padding: 10px 14px; border-left: 3px solid #909399; }
.stat-box.highlight { border-left-color: #409EFF; background: #ecf5ff; }
.stat-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.stat-value { font-size: 16px; font-weight: 600; color: #303133; }
</style>