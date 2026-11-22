<template>
  <div class="inout-input-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">💎 {{ pageTitle }}</span>
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
              <el-tag :type="form.direction === 1 ? 'success' : 'warning'" effect="dark" size="large" class="dir-tag">
                {{ form.direction === 1 ? '入库（采购）' : '出库' }}
              </el-tag>
              <span class="dir-hint">由入口决定，不可改</span>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="供应商">
              <el-select v-model="form.counterpartyName" placeholder="选择或直接输入新供应商" filterable allow-create default-first-option clearable style="width:100%" @change="onCounterpartyChange">
                <el-option v-for="cp in counterpartyOptions" :key="cp.name" :label="cp.name" :value="cp.name">
                  <span>{{ cp.name }}</span>
                  <span class="opt-tag">{{ cp.type === 'customer' ? '客户' : '供应商' }}</span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="钻石级别" prop="diamondType">
              <el-select v-model="form.diamondType" placeholder="请选择级别" clearable filterable allow-create default-first-option style="width:100%">
                <el-option v-for="g in gradeOptions" :key="g" :label="g" :value="g" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="材质" prop="materialType">
              <el-select v-model="form.materialType" placeholder="请选择材质" style="width:100%">
                <el-option v-for="m in materialOptions" :key="m" :label="m" :value="m" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="产品名称">
              <el-select v-model="form.productName" placeholder="选择或输入新产品名称" filterable allow-create default-first-option clearable style="width:100%">
                <el-option v-for="p in productNameOptions" :key="p" :label="p" :value="p" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="内容">
              <el-select v-model="form.content" placeholder="选择或输入新内容" filterable allow-create default-first-option clearable style="width:100%">
                <el-option v-for="c in contentOptions" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="经办人">
              <el-input v-model="form.createByName" placeholder="默认登录人，可改" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">本单</el-divider>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="卡数(ct)" prop="carat">
              <el-input-number v-model="form.carat" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单价(元/ct)" prop="unitPrice">
              <el-input-number v-model="form.unitPrice" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="应付金额">
              <el-input :model-value="amountDisplay" readonly style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item :label="form.direction === 1 ? '实付金额' : '收款金额'">
              <div class="pay-row">
                <el-input-number v-model="form.paymentAmount" :min="0" :precision="2" style="width:100%" />
                <el-button link type="primary" class="pay-all" @click="form.paymentAmount = amount">全额</el-button>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="form.direction === 1 ? '本单未付' : '本单未收'">
              <div class="inline-amount" :class="debtClass">
                {{ fmtMoney(debt) }}
                <span class="inline-hint">{{ form.direction === 1 ? '金额 − 付款' : '金额 − 收款' }}</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="关联订单号">
              <el-input v-model="form.orderNo" placeholder="出库填了订单号即算订单出库" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ⭐ 累计：选了供应商看该供应商，没选看全部往来单位（钱和石重是两个维度） -->
        <InoutCumBlock
          :title="cumTitle"
          :tip="`截至 ${form.recordDate || '今天'} · 只算已生效单据（草稿 / 待审不计）`"
          :cards="cumCards"
          :span="4"
          :flows="cumFlows"
          :notes="cumNotes" />

        <el-form-item label="备注" style="margin-top:12px;">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item label="图片" style="margin-top:8px;">
          <MultiImageUpload v-model="imageList" :max-count="10" type="inout" tip="可上传凭证、实物照片等，最多10张" />
        </el-form-item>

        <el-form-item style="margin-top:16px;">
          <el-button :loading="saving" @click="handleSave">{{ isEdit ? '保存修改' : '保存草稿' }}</el-button>
          <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">提交审核</el-button>
          <el-button v-if="isEdit" @click="router.push('/inout/diamond-list')">取消</el-button>
          <el-button v-else @click="handleReset">重置</el-button>
          <span class="action-tip">保存＝存草稿（还能改）；提交＝直接送审（提交后不可编辑）</span>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createDiamond, updateDiamond, submitDiamond, getDiamondLastTotal, getDiamondById, getInoutFormOptions } from '@/api/inout'
import MultiImageUpload from '@/components/MultiImageUpload.vue'
import InoutCumBlock from '@/components/InoutCumBlock.vue'
import { DIAMOND_CONTENT_OPTIONS, DIAMOND_GRADE_OPTIONS, DIAMOND_MATERIAL_OPTIONS } from '@/constants/inoutOptions'
import { todayStr } from '@/utils/date'

const route = useRoute()
const router = useRouter()
const formRef = ref()
const submitting = ref(false)
const counterpartyOptions = ref([])
const productNameOptions = ref([])
const contentOptions = ref([])
const nameToId = ref({})
const idToName = ref({})
const materialOptions = ref([...DIAMOND_MATERIAL_OPTIONS])
const gradeOptions = ref([...DIAMOND_GRADE_OPTIONS])

const form = reactive({
  recordDate: todayStr(),
  direction: 1,
  status: '', // 草稿 / 待审 / 生效 / 驳回（编辑时由后端带回）
  counterpartyId: null,
  counterpartyName: '',
  diamondType: '',
  materialType: '',
  carat: 0,
  unitPrice: 0,
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

// ⭐ 图片列表
const imageList = ref([])
const parseImages = (s) => {
  if (!s) return []
  try {
    const arr = JSON.parse(s)
    if (Array.isArray(arr)) return arr.map(u => ({ imageUrl: u, imageName: '', imageType: 'inout', sortOrder: 0, remark: '' }))
  } catch {}
  return []
}
const serializeImages = (list) => {
  const urls = (list || []).map(x => x?.imageUrl).filter(Boolean)
  return urls.length ? JSON.stringify(urls) : ''
}

const presetDirection = computed(() => {
  const d = route.meta.direction
  return (d === 0 || d === 1) ? Number(d) : null
})
// 页面标题跟随路由（钻石入库 / 钻石出库）
const isEdit = computed(() => !!route.query.id)
const pageTitle = computed(() => {
  const t = route.meta?.title || '钻石录入'
  return isEdit.value ? `编辑${t}` : t
})
const applyDirectionPreset = () => {
  // 编辑历史记录时以记录自身方向为准，不被入口覆盖
  if (route.query.id) return
  if (presetDirection.value !== null) {
    form.direction = presetDirection.value
  }
}

// 累计：石重（库存）与钱（采购未付）分开
const lastTotal = reactive({
  inCarat: 0, outCarat: 0, orderOutCarat: 0, stockCarat: 0,
  purchaseAmount: 0, paidAmount: 0, unpaidAmount: 0,
  allInCarat: 0, allOutCarat: 0, allOrderOutCarat: 0, allStockCarat: 0,
  allPurchaseAmount: 0, allPaidAmount: 0, allUnpaidAmount: 0
})

const rules = {
  recordDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  diamondType: [{ required: true, message: '请选择级别', trigger: 'change' }],
  materialType: [{ required: true, message: '请选择材质', trigger: 'change' }],
  carat: [{ required: true, message: '请输入卡数', trigger: 'blur' }],
  unitPrice: [{ required: true, message: '请输入单价', trigger: 'blur' }]
}

const fmt2 = (v) => (Math.round(Number(v || 0) * 100) / 100).toFixed(2)
const fmtMoney = (v) => {
  const n = Math.round(Number(v || 0) * 100) / 100
  const s = Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (n < 0 ? '-¥' : '¥') + s
}
const debtOf = (v) => Math.round(Number(v || 0) * 100) / 100
const debtClassOf = (v) => {
  const n = debtOf(v)
  return n > 0 ? 'debt-owed' : n < 0 ? 'debt-pre' : 'debt-clear'
}

const amount = computed(() => Math.round((form.carat || 0) * (form.unitPrice || 0) * 100) / 100)
const amountDisplay = computed(() => amount.value.toFixed(2))
const sign = computed(() => form.direction === 1 ? 1 : -1)
// 本单未付/未收 = 本单金额 − 付款
const debt = computed(() => Math.round((amount.value - (form.paymentAmount || 0)) * 100) / 100)
const debtClass = computed(() => debtClassOf(debt.value))

// 录入后的累计：石重按方向增减；钱只在入库时增应付
const stockAfter = computed(() => Math.round((lastTotal.stockCarat + sign.value * (form.carat || 0)) * 100) / 100)
const unpaidAfter = computed(() =>
  Math.round((lastTotal.unpaidAmount + (form.direction === 1 ? debt.value : 0)) * 100) / 100)
const allStockAfter = computed(() => Math.round((lastTotal.allStockCarat + sign.value * (form.carat || 0)) * 100) / 100)
const allUnpaidAfter = computed(() =>
  Math.round((lastTotal.allUnpaidAmount + (form.direction === 1 ? debt.value : 0)) * 100) / 100)

// ===== 累计区块（统一组件 InoutCumBlock）=====
// 选了供应商 → 该供应商；没选 → 全部往来单位
const hasCp = computed(() => !!(form.counterpartyName || '').trim())
const cumTitle = computed(() => `累计 · ${hasCp.value ? form.counterpartyName : '全部往来单位'}`)
const cumBase = computed(() => {
  const all = !hasCp.value
  return all
    ? {
        in: lastTotal.allInCarat, out: lastTotal.allOutCarat, orderOut: lastTotal.allOrderOutCarat,
        stock: lastTotal.allStockCarat, purchase: lastTotal.allPurchaseAmount,
        paid: lastTotal.allPaidAmount, unpaid: lastTotal.allUnpaidAmount
      }
    : {
        in: lastTotal.inCarat, out: lastTotal.outCarat, orderOut: lastTotal.orderOutCarat,
        stock: lastTotal.stockCarat, purchase: lastTotal.purchaseAmount,
        paid: lastTotal.paidAmount, unpaid: lastTotal.unpaidAmount
      }
})
const cumCards = computed(() => {
  const t = cumBase.value
  return [
    { label: '累计入库（买进来）', value: fmt2(t.in), unit: ' ct', tone: 'in' },
    {
      label: '累计出库（出去 + 订单出去）', value: fmt2(t.out), unit: ' ct', tone: 'out',
      sub: t.orderOut > 0 ? `其中订单 ${fmt2(t.orderOut)} ct` : ''
    },
    { label: '当前库存', value: fmt2(t.stock), unit: ' ct', tone: 'highlight' },
    { label: '累计采购金额', value: fmtMoney(t.purchase), tone: 'in' },
    { label: '累计已付', value: fmtMoney(t.paid), tone: 'out' },
    {
      label: '累计未付 = 采购 − 已付', value: fmtMoney(t.unpaid),
      tone: debtOf(t.unpaid) > 0 ? 'pos' : 'plain'
    }
  ]
})
// 三段式字段：上单 / 本单 / 现在（现在 = 上单 ± 本单）
const cumFlows = computed(() => {
  const all = !hasCp.value
  const carat = Number(form.carat || 0)
  const dSign = form.direction === 1 ? 1 : -1
  const debtDelta = form.direction === 1 ? debt.value : 0
  return [
    {
      label: '库存石重',
      last: fmt2(cumBase.value.stock) + ' ct',
      delta: (dSign >= 0 ? '+' : '−') + fmt2(carat) + ' ct',
      now: fmt2(all ? allStockAfter.value : stockAfter.value) + ' ct',
      sub: `${form.direction === 1 ? '入库买进' : '出库卖出'}，本单 ${fmt2(carat)} ct`,
      tone: 'highlight'
    },
    {
      label: '应付供应商（未付）',
      last: fmtMoney(cumBase.value.unpaid),
      delta: (debtDelta >= 0 ? '+' : '−') + fmtMoney(Math.abs(debtDelta)),
      now: fmtMoney(all ? allUnpaidAfter.value : unpaidAfter.value),
      sub: form.direction === 1 ? '入库才增应付' : '出库是卖货收钱，不动应付',
      tone: 'plain'
    }
  ]
})
const cumNotes = [
  '<b>上单</b>：截至业务日期、已生效单据的累计（不含正在录入的这一单）；选了供应商算该供应商，没选算全部往来单位。',
  '<b>本单</b>：这一单入库/出库的克拉数与金额。',
  '<b>现在</b>：上单 + 本单。<b>库存石重(ct)</b> = 买进来的 − 出去的 − 订单出去的；出库时填了关联订单号即算「订单出库」，同样从库存扣减。',
  '<b>钱（应付供应商）</b>：只算采购（入库）。本单未付 = 本单金额 − 付款；累计未付 = 累计采购金额 − 累计已付。出库卖货不进供应商应付。'
]

const loadFormOptions = async () => {
  try {
    const res = await getInoutFormOptions('diamond')
    const d = res?.data || {}
    counterpartyOptions.value = d.counterparties || []
    productNameOptions.value = d.productNames || []
    // ⭐ 内容：固定清单（VVS/VS/i1/i2/i3），仍可手动输入新值
    contentOptions.value = [...DIAMOND_CONTENT_OPTIONS]
    const n2i = {}, i2n = {}
    counterpartyOptions.value.forEach(c => { n2i[c.name] = c.id; i2n[c.id] = c.name })
    nameToId.value = n2i
    idToName.value = i2n
  } catch {}
}

const loadLastTotal = async () => {
  try {
    const res = await getDiamondLastTotal(form.recordDate, form.counterpartyId || null, form.counterpartyName || '', route.query.id || undefined)
    if (res.success) Object.assign(lastTotal, res.data)
  } catch {}
}

// 下拉里没有的名称也能直接输入，提交时后端自动建档
const onCounterpartyChange = (name) => {
  form.counterpartyId = name ? (nameToId.value[name] ?? null) : null
  loadLastTotal()
}

// ==================== 保存 / 提交 ====================
// ⭐ 两个动作分开：保存 = 存草稿（状态 draft，还能改）；提交 = 存库后立刻送审（pending）
const saving = ref(false)
const savedId = ref(null)
const recordId = computed(() => savedId.value || route.query.id || null)
const canSubmit = computed(() => !form.status || form.status === 'draft' || form.status === 'rejected')

// 只读字段不回传（status 由后端 / 提交动作控制）
const restForm = () => {
  const o = { ...form }
  delete o.status
  return o
}

const buildPayload = () => ({
  ...restForm(),
  counterpartyId: form.counterpartyName ? (nameToId.value[form.counterpartyName] ?? null) : null,
  counterpartyName: form.counterpartyName || '',
  images: serializeImages(imageList.value)
})

const saveRecord = async () => {
  const payload = buildPayload()
  if (recordId.value) {
    await updateDiamond(recordId.value, payload)
    return recordId.value
  }
  const res = await createDiamond(payload)
  const id = res?.data?.id ?? res?.id
  if (!id) throw new Error(res?.message || '保存失败')
  savedId.value = id
  return id
}

// 保存：只落库，不送审，留在本页可继续改
const handleSave = async () => {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      const id = await saveRecord()
      // ⭐ 存过之后转成编辑态：再点保存走更新，不会重复建单
      if (!route.query.id) {
        router.replace({ path: route.path, query: { ...route.query, id } })
      }
      if (!form.status) form.status = 'draft'
      ElMessage.success('已保存为草稿：可在列表继续提交，也可直接点「提交审核」')
      loadLastTotal()
    } catch (e) {
      ElMessage.error(e?.message || '保存失败')
    } finally {
      saving.value = false
    }
  })
}

// 提交：保存 + 立刻提交审核，成功后回列表
const handleSubmit = async () => {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const id = await saveRecord()
      const res = await submitDiamond(id)
      if (res?.success === false) throw new Error(res.message || '提交失败')
      ElMessage.success('已提交审核')
      router.push('/inout/diamond-list')
    } catch (e) {
      ElMessage.error(e?.message || '提交失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleReset = () => {
  formRef.value?.resetFields()
  form.recordDate = todayStr()
  form.direction = presetDirection.value !== null ? presetDirection.value : 1
  form.counterpartyId = null
  form.counterpartyName = ''
  form.materialType = ''
  form.carat = 0
  form.unitPrice = 0
  form.paymentAmount = 0
  form.orderNo = ''
  form.remark = ''
  form.productName = ''
  form.content = ''
  form.createByName = currentUserName.value
  imageList.value = []
}

onMounted(async () => {
  applyDirectionPreset()
  await loadFormOptions()
  if (route.query.id) {
    try {
      const res = await getDiamondById(route.query.id)
      if (res.success) {
        Object.assign(form, res.data)
        if (form.recordDate && form.recordDate.length > 10) form.recordDate = form.recordDate.slice(0, 10)
        if (!form.createByName) form.createByName = currentUserName.value
        if (!form.counterpartyName && form.counterpartyId) form.counterpartyName = idToName.value[form.counterpartyId] || ''
        imageList.value = parseImages(form.images)
      }
    } catch {}
  }
  if (!form.createByName) form.createByName = currentUserName.value
  loadLastTotal()
})

watch(() => route.fullPath, () => {
  applyDirectionPreset()
})
</script>

<style scoped>
.inout-input-page { padding: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.title { font-weight: 600; font-size: 16px; }
/* 保存 / 提交 说明 */
.action-tip { margin-left: 12px; font-size: 12px; color: #a8abb2; }
.dir-tag { font-size: 14px; padding: 0 12px; height: 32px; line-height: 32px; }
.dir-hint { margin-left: 8px; font-size: 12px; color: #a8abb2; }
.opt-tag { float: right; margin-left: 10px; font-size: 12px; color: #a8abb2; }
/* 付款输入 + 全额 */
.pay-row { display: flex; align-items: center; gap: 6px; width: 100%; }
.pay-row .el-input-number { flex: 1; }
.pay-all { flex: none; padding: 0; }
.inline-amount { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 32px; }
.inline-hint { font-size: 12px; font-weight: 400; color: #a8abb2; margin-left: 6px; }
.stat-box { background: #f5f7fa; border-radius: 6px; padding: 10px 14px; border-left: 3px solid #909399; }
.stat-box.highlight { border-left-color: #409EFF; background: #ecf5ff; }
.stat-box.blue { border-left-color: #409EFF; background: #f4f8ff; }
/* 未付配色：红=还没付清，绿=多付，灰=刚好付清 */
.stat-box.debt-owed { border-left-color: #F56C6C; background: #fef0f0; }
.stat-box.debt-owed .stat-value { color: #F56C6C; }
.stat-box.debt-pre { border-left-color: #67C23A; background: #f0f9eb; }
.stat-box.debt-pre .stat-value { color: #67C23A; }
.stat-box.debt-clear { border-left-color: #909399; }
.stat-box.debt-clear .stat-value { color: #909399; }
.debt-owed { color: #F56C6C; }
.debt-pre { color: #67C23A; }
.debt-clear { color: #909399; }
.debt-hint { font-size: 12px; color: #909399; line-height: 1.9; padding: 10px 14px; background: #fafafa; border-radius: 6px; }
.debt-hint b { color: #606266; }
.stat-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.stat-value { font-size: 16px; font-weight: 600; color: #303133; }
.stat-value b { font-size: 18px; }
.stat-sub { font-size: 12px; color: #a8abb2; margin-top: 4px; }
.unit { font-size: 12px; font-weight: 400; color: #909399; margin-left: 3px; }
.unit-note { font-size: 12px; font-weight: 400; color: #E6A23C; margin-left: 6px; }
</style>
