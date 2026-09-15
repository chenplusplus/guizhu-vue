<template>
  <div class="inout-input-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">💎 钻石录入</span>
          <el-button type="primary" size="small" @click="$router.push('/inout/diamond-list')">查看列表 →</el-button>
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
                <el-option label="收入" :value="1" />
                <el-option label="支出" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="供应商">
              <el-select v-model="form.counterpartyId" placeholder="请选择" filterable clearable style="width:100%">
                <el-option v-for="cp in counterparties" :key="cp.id" :label="cp.name" :value="cp.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="钻石类型" prop="diamondType">
              <el-select v-model="form.diamondType" style="width:100%">
                <el-option label="天然钻" value="天然钻" />
                <el-option label="培育钻" value="培育钻" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">数量与金额</el-divider>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="卡数(ct)" prop="carat">
              <el-input-number v-model="form.carat" :min="0" :precision="4" style="width:100%" @change="calc" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单价(元/ct)" prop="unitPrice">
              <el-input-number v-model="form.unitPrice" :min="0" :precision="2" style="width:100%" @change="calc" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="金额">
              <el-input :model-value="amountDisplay" readonly style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
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
          <el-col :span="8">
            <el-form-item label="备注">
              <el-input v-model="form.remark" />
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
import { createDiamond, getDiamondLastTotal } from '@/api/inout'
import { getCounterpartyAll } from '@/api/counterparty'

const route = useRoute()
const formRef = ref()
const submitting = ref(false)
const counterparties = ref([])

const form = reactive({
  recordDate: new Date().toISOString().slice(0, 10),
  direction: 1,
  counterpartyId: null,
  diamondType: '天然钻',
  carat: 0,
  unitPrice: 0,
  paymentAmount: 0,
  orderNo: '',
  remark: ''
})

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
  diamondType: [{ required: true, message: '请选择类型', trigger: 'change' }],
  carat: [{ required: true, message: '请输入卡数', trigger: 'blur' }],
  unitPrice: [{ required: true, message: '请输入单价', trigger: 'blur' }]
}

const amount = computed(() => (form.carat || 0) * (form.unitPrice || 0))
const amountDisplay = computed(() => amount.value.toFixed(2))
const sign = computed(() => form.direction === 1 ? 1 : -1)
const currentTotalAmountDisplay = computed(() => lastTotal.lastTotalAmount + sign.value * amount.value)

const loadCounterparties = async () => {
  try {
    const res = await getCounterpartyAll()
    if (res.data) counterparties.value = res.data
  } catch {}
}

const loadLastTotal = async () => {
  try {
    const res = await getDiamondLastTotal(form.recordDate)
    if (res.success) Object.assign(lastTotal, res.data)
  } catch {}
}

const calc = () => {}

const handleSubmit = async () => {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const res = await createDiamond(form)
      if (res.success) {
        ElMessage.success('钻石录入成功')
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
  form.direction = presetDirection.value !== null ? presetDirection.value : 1
  form.carat = 0
  form.unitPrice = 0
  form.paymentAmount = 0
  form.remark = ''
}

onMounted(() => {
  loadCounterparties()
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