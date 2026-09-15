<template>
  <div class="inout-input-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">🥇 金录入</span>
          <el-button type="primary" size="small" @click="$router.push('/inout/gold-list')">查看列表 →</el-button>
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
            <el-form-item label="方向" prop="direction">
              <el-select v-model="form.direction" style="width:100%">
                <el-option label="收入（入库）" :value="1" />
                <el-option label="支出（出库）" :value="0" />
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
            <el-form-item label="材质" prop="materialType">
              <el-select v-model="form.materialType" placeholder="请选择" filterable allow-create style="width:100%" @change="onMaterialChange">
                <el-option v-for="m in materialOptions" :key="m" :label="m" :value="m" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">计算</el-divider>

        <!-- 第一行：重量 | 损耗 | 总量 | 折算率 -->
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item :label="weightLabel" prop="goldWeight">
              <el-input-number v-model="form.goldWeight" :min="0" :precision="4" :step="0.1" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="损耗">
              <el-input-number v-model="form.lossRate" :min="0" :precision="4" :step="0.001" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="总量">
              <el-input :model-value="formatNum(totalWeight, 4)" readonly size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="折算率">
              <el-input-number v-model="form.foldRate" :min="0" :max="1" :precision="4" :step="0.01" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第二行：折算重 | 补钯重 | 补口重 | 补口金额 -->
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item :label="foldWeightLabel">
              <el-input :model-value="formatNum(foldWeight, 4)" readonly size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="补钯重">
              <el-input :model-value="formatNum(patchWeight, 4)" readonly size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="补口重">
              <el-input-number v-model="form.mouthWeight" :min="0" :precision="4" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="补口金额">
              <el-input-number v-model="form.mouthAmount" :min="0" :precision="2" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第三行：补钯金费 | 工费 | 总金额 | 付款金额 -->
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="补钯金费">
              <el-input-number v-model="form.patchFee" :min="0" :precision="2" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="工费">
              <el-input-number v-model="form.laborFee" :min="0" :precision="2" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="总金额">
              <el-input :model-value="formatNum(totalAmount, 2)" readonly size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="付款金额">
              <el-input-number v-model="form.paymentAmount" :min="0" :precision="2" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第四行：关联订单号 | 补口 | 金价 -->
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="关联订单号">
              <el-input v-model="form.orderNo" placeholder="可选" size="large" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="补口">
              <el-input v-model="form.patch" placeholder="可选" size="large" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="金价">
              <el-input-number v-model="form.goldPrice" :min="0" :precision="2" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">累计</el-divider>

        <el-row :gutter="16">
          <el-col :span="6">
            <div class="stat-box">
              <div class="stat-label">上单累计折足金</div>
              <div class="stat-value">{{ formatNum(lastTotal.lastTotalFold, 4) }} g</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-box">
              <div class="stat-label">上单累计折银</div>
              <div class="stat-value">{{ formatNum(lastTotal.lastTotalSilver, 4) }} g</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-box">
              <div class="stat-label">上单累计折铜</div>
              <div class="stat-value">{{ formatNum(lastTotal.lastTotalCopper, 4) }} g</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-box">
              <div class="stat-label">上单累计金额</div>
              <div class="stat-value">¥{{ formatNum(lastTotal.lastTotalAmount, 2) }}</div>
            </div>
          </el-col>
        </el-row>

        <el-row :gutter="16" style="margin-top:12px;">
          <el-col :span="6">
            <div class="stat-box highlight">
              <div class="stat-label">本单累计{{ foldLabel }}</div>
              <div class="stat-value">{{ formatNum(currentTotalFold, 4) }} g</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="stat-box highlight">
              <div class="stat-label">本单累计金额</div>
              <div class="stat-value">¥{{ formatNum(currentTotalAmount, 2) }}</div>
            </div>
          </el-col>
        </el-row>

        <el-form-item label="备注" style="margin-top:16px;">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">提交录入</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { createGold, getGoldLastTotal } from '@/api/inout'
import { getCounterpartyAll } from '@/api/counterparty'
import { getMaterialLossList } from '@/api/materialLoss'

const formRef = ref()
const submitting = ref(false)
const counterparties = ref([])
const counterpartyConfigs = ref([])

const materialOptions = [
  '黄金', '18K黄757‰', '18K白757‰', '18K红757‰',
  '14K黄', '14K白', '9K', '22K', 'PT',
  '足银', '925银', '铜'
]

const form = reactive({
  recordDate: new Date().toISOString().slice(0, 10),
  direction: 1,
  counterpartyId: null,
  materialType: '',
  goldWeight: 0,
  lossRate: 1,
  foldRate: 1,
  mouthWeight: 0,
  mouthAmount: 0,
  patchFee: 0,
  laborFee: 0,
  paymentAmount: 0,
  patch: '',
  goldPrice: 0,
  orderNo: '',
  remark: ''
})

const lastTotal = reactive({
  lastTotalFold: 0,
  lastTotalSilver: 0,
  lastTotalCopper: 0,
  lastTotalAmount: 0
})

const rules = {
  recordDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  materialType: [{ required: true, message: '请选择材质', trigger: 'change' }],
  goldWeight: [{ required: true, message: '请输入重量', trigger: 'blur' }]
}

const formatNum = (v, d) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(d) : (0).toFixed(d)
}

// ==================== 计算 ====================
const totalWeight = computed(() => (form.goldWeight || 0) * (form.lossRate || 1))
const foldWeight = computed(() => totalWeight.value * (form.foldRate || 0))
const patchWeight = computed(() => totalWeight.value - foldWeight.value)
const totalAmount = computed(() => (form.mouthAmount || 0) + (form.patchFee || 0) + (form.laborFee || 0))

// ==================== 折算类别 ====================
const foldCategory = computed(() => {
  const m = form.materialType || ''
  if (m.includes('银')) return 'silver'
  if (m.includes('铜')) return 'copper'
  return 'gold'
})

// ⭐ 动态字段名
const weightLabel = computed(() => {
  return { gold: '金重(g)', silver: '银重(g)', copper: '铜重(g)' }[foldCategory.value]
})

const foldWeightLabel = computed(() => {
  return { gold: '折足金', silver: '折银重', copper: '折铜重' }[foldCategory.value]
})

const foldLabel = computed(() => {
  return { gold: '折足金', silver: '折银', copper: '折铜' }[foldCategory.value]
})

// ==================== 本单累计 ====================
const sign = computed(() => form.direction === 1 ? 1 : -1)

const currentTotalFold = computed(() => {
  const base = foldCategory.value === 'silver' ? lastTotal.lastTotalSilver
             : foldCategory.value === 'copper' ? lastTotal.lastTotalCopper
             : lastTotal.lastTotalFold
  return base + sign.value * foldWeight.value
})

const currentTotalAmount = computed(() => lastTotal.lastTotalAmount + sign.value * totalAmount.value)

// ==================== 加载数据 ====================
const loadCounterparties = async () => {
  try {
    const res = await getCounterpartyAll()
    if (res.data) counterparties.value = res.data
  } catch {}
}

const loadLastTotal = async () => {
  try {
    const res = await getGoldLastTotal(form.recordDate)
    if (res.success) {
      const d = res.data || {}
      lastTotal.lastTotalFold = Number(d.lastTotalFold) || 0
      lastTotal.lastTotalSilver = Number(d.lastTotalSilver) || 0
      lastTotal.lastTotalCopper = Number(d.lastTotalCopper) || 0
      lastTotal.lastTotalAmount = Number(d.lastTotalAmount) || 0
    }
  } catch {}
}

// ==================== 供应商变更 ====================
const onCounterpartyChange = async (cpId) => {
  if (!cpId) {
    counterpartyConfigs.value = []
    return
  }
  try {
    const res = await getMaterialLossList(cpId)
    counterpartyConfigs.value = res.data || []
  } catch {}
  if (form.materialType) applyConfig()
}

// ==================== 材质变更 ====================
const onMaterialChange = () => {
  applyConfig()
}

const applyConfig = async () => {
  if (!form.materialType) return

  // 1. 找供应商配置
  let config = counterpartyConfigs.value.find(x => x.materialType === form.materialType)

  // 2. 找不到找全局默认
  if (!config) {
    try {
      const res = await getMaterialLossList(0)
      config = (res.data || []).find(x => x.materialType === form.materialType)
    } catch {}
  }

  if (config) {
    fillConfig(config)
  } else {
    // 3. 都用默认值
    form.foldRate = getDefaultConvertRate(form.materialType)
    form.lossRate = 1
    ElMessage.warning(`未找到【${form.materialType}】的配置，使用默认折算率 ${form.foldRate}`)
  }
}

const fillConfig = (config) => {
  form.foldRate = Number(config.convertRate) || 1
  form.lossRate = Number(config.lossRate) || 1
  form.patch = config.defaultPatch || ''
  ElMessage.success(`已带出【${config.materialType}】${foldWeightLabel.value} = ${form.foldRate}，损耗 = ${form.lossRate}`)
}

const getDefaultConvertRate = (materialType) => {
  if (!materialType) return 1
  if (materialType.includes('22K')) return 0.916
  if (materialType.includes('18K')) return 0.75
  if (materialType.includes('14K')) return 0.585
  if (materialType.includes('9K')) return 0.375
  if (materialType.includes('PT')) return 0.95
  if (materialType.includes('银')) return 0.925
  if (materialType.includes('铜')) return 1
  if (materialType.includes('黄金')) return 1
  return 1
}

// ==================== 提交 ====================
const handleSubmit = async () => {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const submitData = {
        ...form,
        foldCategory: foldCategory.value
      }
      const res = await createGold(submitData)
      if (res.success) {
        ElMessage.success('录入成功')
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
  form.direction = 1
  form.materialType = ''
  form.goldWeight = 0
  form.lossRate = 1
  form.foldRate = 1
  form.mouthWeight = 0
  form.mouthAmount = 0
  form.patchFee = 0
  form.laborFee = 0
  form.paymentAmount = 0
  form.orderNo = ''
  form.patch = ''
  form.goldPrice = 0
  form.remark = ''
}

onMounted(() => {
  loadCounterparties()
  loadLastTotal()
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