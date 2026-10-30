<template>
  <div class="inout-input-page">
    <GoldMaterialSummary ref="summaryComp" :title="summaryTitle">
      <template #footer>
        <div class="cum-block">
          <div class="cum-head">
            <span class="cum-title">📊 累计</span>
            <span class="cum-tip">上单 = 该往来单位在所选日期之前的累计；本单 = 上单 {{ form.direction === 1 ? '+' : '−' }} 本单{{ foldLabel }}</span>
          </div>

          <el-row :gutter="12">
            <el-col :xs="12" :sm="8" :md="4">
              <div class="stat-box">
                <div class="stat-label">上单累计折足金</div>
                <div class="stat-value">{{ formatNum(lastTotal.lastTotalFold, 4) }} g</div>
              </div>
            </el-col>
            <el-col :xs="12" :sm="8" :md="4">
              <div class="stat-box">
                <div class="stat-label">上单累计折银</div>
                <div class="stat-value">{{ formatNum(lastTotal.lastTotalSilver, 4) }} g</div>
              </div>
            </el-col>
            <el-col :xs="12" :sm="8" :md="4">
              <div class="stat-box">
                <div class="stat-label">上单累计折铜</div>
                <div class="stat-value">{{ formatNum(lastTotal.lastTotalCopper, 4) }} g</div>
              </div>
            </el-col>
            <el-col :xs="12" :sm="8" :md="4">
              <div class="stat-box">
                <div class="stat-label">上单累计金额</div>
                <div class="stat-value">¥{{ formatNum(lastTotal.lastTotalAmount, 2) }}</div>
              </div>
            </el-col>
            <el-col :xs="12" :sm="8" :md="4">
              <div class="stat-box highlight">
                <div class="stat-label">本单累计{{ foldLabel }}</div>
                <div class="stat-value">{{ formatNum(currentTotalFold, 4) }} g</div>
              </div>
            </el-col>
            <el-col :xs="12" :sm="8" :md="4">
              <div class="stat-box highlight">
                <div class="stat-label">本单累计金额</div>
                <div class="stat-value">¥{{ formatNum(currentTotalAmount, 2) }}</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </template>
    </GoldMaterialSummary>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">🥇 {{ pageTitle }}</span>
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
          <el-col :span="6">
            <el-form-item label="产品名称">
              <el-input v-model="form.productName" placeholder="请输入产品名称" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="内容">
              <el-input v-model="form.content" placeholder="请输入内容" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="经办人">
              <el-input v-model="form.createByName" placeholder="默认登录人，可改" />
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

        <el-form-item label="备注" style="margin-top:16px;">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item label="图片" style="margin-top:8px;">
          <MultiImageUpload v-model="imageList" :max-count="10" type="inout" tip="可上传凭证、实物照片等，最多10张" />
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
import { createGold, getGoldLastTotal, getGoldById } from '@/api/inout'
import { useRoute } from 'vue-router'
import { getCounterpartyAll } from '@/api/counterparty'
import { getMaterialLossList } from '@/api/materialLoss'
import MultiImageUpload from '@/components/MultiImageUpload.vue'
import GoldMaterialSummary from '@/components/GoldMaterialSummary.vue'
import { dictApi } from '@/api/dict'

const formRef = ref()
const summaryComp = ref()
const route = useRoute()
const submitting = ref(false)
const counterparties = ref([])
const counterpartyConfigs = ref([])

const materialOptions = ref([
  '黄金', '18K黄757‰', '18K白757‰', '18K红757‰',
  '14K黄', '14K白', '9K', '22K', 'PT',
  '足银', '925银', '铜'
])

// ⭐ 材质选项与订单成色下拉一致（成色字典 purity），加载后覆盖写死选项
const loadMaterialOptions = async () => {
  try {
    const res = await dictApi.getItemsByKey('purity')
    const labels = (res?.data || []).map(x => x.itemLabel || x.itemValue).filter(Boolean)
    if (labels.length) materialOptions.value = labels
  } catch {}
}

// ⭐ 路由决定默认方向（/inout/gold/in = 收入，/inout/gold/out = 支出）
const defaultDirection = Number(route.meta?.direction ?? 1)

// ⭐ 汇总卡标题跟随页面（金入库 / 金出库）
const summaryTitle = computed(() => defaultDirection === 0 ? '🧮 金料汇总 · 累计（金出库）' : '🧮 金料汇总 · 累计（金入库）')

// ⭐ 表单卡标题跟随路由（金入库 / 金出库）
const pageTitle = computed(() => route.meta?.title || '金录入')

const form = reactive({
  recordDate: new Date().toISOString().slice(0, 10),
  direction: defaultDirection,
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

// ⭐ 图片列表（v-model 绑定到 MultiImageUpload，元素为 {imageUrl,...}）
const imageList = ref([])

// 解析后端返回的 images JSON 字符串 -> 图片对象数组
const parseImages = (s) => {
  if (!s) return []
  try {
    const arr = JSON.parse(s)
    if (Array.isArray(arr)) return arr.map(u => ({ imageUrl: u, imageName: '', imageType: 'inout', sortOrder: 0, remark: '' }))
  } catch {}
  return []
}
// 序列化图片对象数组 -> JSON 字符串
const serializeImages = (list) => {
  const urls = (list || []).map(x => x?.imageUrl).filter(Boolean)
  return urls.length ? JSON.stringify(urls) : ''
}

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
    const res = await getGoldLastTotal(form.recordDate, form.counterpartyId)
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
  loadLastTotal()
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
        foldCategory: foldCategory.value,
        images: serializeImages(imageList.value)
      }
      const res = await createGold(submitData)
      if (res.success) {
        ElMessage.success('录入成功')
        handleReset()
        loadLastTotal()
        summaryComp.value?.reload()
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
  form.direction = defaultDirection
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
  form.productName = ''
  form.content = ''
  form.createByName = currentUserName.value
  imageList.value = []
}

onMounted(async () => {
  loadCounterparties()
  loadMaterialOptions()
  if (route.query.id) {
    try {
      const res = await getGoldById(route.query.id)
      if (res.success) {
        Object.assign(form, res.data)
        if (form.recordDate && form.recordDate.length > 10) form.recordDate = form.recordDate.slice(0, 10)
        if (!form.createByName) form.createByName = currentUserName.value
        imageList.value = parseImages(res.data.images)
      }
    } catch {}
  }
  if (!form.createByName) form.createByName = currentUserName.value
  loadLastTotal()
})
</script>

<style scoped>
.inout-input-page { padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; font-size: 16px; }

/* 累计区块（与「金料按材质汇总」同卡展示） */
.cum-block { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #e4e7ed; }
.cum-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.cum-title { font-weight: 600; font-size: 14px; color: #409EFF; }
.cum-tip { font-size: 12px; color: #a8abb2; }
.cum-block :deep(.el-col) { margin-bottom: 10px; }

.stat-box { height: 100%; box-sizing: border-box; background: #f5f7fa; border-radius: 6px; padding: 10px 14px; border-left: 3px solid #909399; }
.stat-box.highlight { border-left-color: #409EFF; background: #ecf5ff; }
.stat-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.stat-value { font-size: 16px; font-weight: 600; color: #303133; white-space: nowrap; }
</style>