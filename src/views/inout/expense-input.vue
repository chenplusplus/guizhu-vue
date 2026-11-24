<template>
  <div class="inout-input-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">💰 {{ pageTitle }}</span>
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
              <el-tag :type="form.direction === 1 ? 'success' : 'warning'" effect="dark" size="large" class="dir-tag">
                {{ form.direction === 1 ? '收入' : '支出' }}
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
            <el-form-item label="资金分类" prop="expenseCategory">
              <el-select v-model="form.expenseCategory" placeholder="请选择" style="width:100%">
                <el-option v-for="c in expenseCategories" :key="c.value" :label="c.label" :value="c.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="收款项目">
              <el-select v-model="form.productName" placeholder="选择或输入新的收款项目" filterable allow-create default-first-option clearable style="width:100%">
                <el-option v-for="p in productNameOptions" :key="p" :label="p" :value="p" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="内容">
              <el-select v-model="form.content" placeholder="选择或输入新内容" filterable allow-create default-first-option clearable style="width:100%">
                <el-option v-for="c in contentOptions" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="经办人">
              <el-input v-model="form.createByName" placeholder="默认登录人，可改" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">金额</el-divider>

        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item :label="form.direction === 1 ? '应收金额':'应付金额' " prop="amount">
              <el-input-number v-model="form.amount" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item :label="form.direction === 1 ?  '实收金额':'实付金额'">
              <el-input-number v-model="form.paymentAmount" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="支付方式">
              <el-select v-model="form.paymentMethod" placeholder="请选择" clearable style="width:100%">
                <el-option v-for="p in paymentMethods" :key="p" :label="p" :value="p" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
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

        <!-- ⭐ 累计：选了供应商看该供应商，没选看全部往来单位 -->
        <InoutCumBlock
          :title="cumTitle"
          :tip="`截至 ${form.recordDate || '今天'} · 只算已生效单据（草稿 / 待审不计）`"
          :cards="cumCards"
          :span="8"
          :flows="cumFlows"
          :notes="cumNotes" />

        <el-form-item style="margin-top:16px;">
          <el-button :loading="saving" @click="handleSave">{{ isEdit ? '保存修改' : '保存草稿' }}</el-button>
          <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">提交审核</el-button>
          <el-button v-if="isEdit" @click="router.push('/inout/expense-list')">取消</el-button>
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
import { createExpense, updateExpense, submitExpense, getExpenseLastTotal, getExpenseById, getInoutFormOptions } from '@/api/inout'
import { EXPENSE_CATEGORY_OPTIONS, PAYMENT_METHOD_OPTIONS } from '@/constants/inoutOptions'
import InoutCumBlock from '@/components/InoutCumBlock.vue'
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

// ⭐ 资金分类：费用入 / 费用出 共用（含「抵扣款项」）
const expenseCategories = EXPENSE_CATEGORY_OPTIONS
// ⭐ 支付方式：银行卡 / 支付宝 / 微信 / 现货 / USD
const paymentMethods = PAYMENT_METHOD_OPTIONS

const form = reactive({
  recordDate: todayStr(),
  direction: 0,
  status: '', // 草稿 / 待审 / 生效 / 驳回（编辑时由后端带回）
  counterpartyId: null,
  counterpartyName: '',
  expenseCategory: '',
  amount: 0,
  paymentAmount: 0,
  paymentMethod: '',
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
// 页面标题跟随路由（费用入 / 费用出）
const isEdit = computed(() => !!route.query.id)
const pageTitle = computed(() => {
  const t = route.meta?.title || '资金录入'
  return isEdit.value ? `编辑${t}` : t
})
const applyDirectionPreset = () => {
  // 编辑历史记录时以记录自身方向为准，不被入口覆盖
  if (route.query.id) return
  if (presetDirection.value !== null) {
    form.direction = presetDirection.value
  }
}

// 累计：按供应商维度（上单净额 + 累计收入/支出/净额 + 全部供应商合计）
const lastTotal = reactive({
  lastTotalAmount: 0,
  inAmount: 0, outAmount: 0, netAmount: 0, recordCount: 0,
  allInAmount: 0, allOutAmount: 0, allNetAmount: 0
})

const rules = {
  recordDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  expenseCategory: [{ required: true, message: '请选择分类', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
}

const sign = computed(() => form.direction === 1 ? 1 : -1)
const fmtMoney = (v) => {
  const n = Math.round(Number(v || 0) * 100) / 100
  const s = Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (n < 0 ? '-¥' : '¥') + s
}
const netOf = (v) => Math.round(Number(v || 0) * 100) / 100
// 本单累计 = 上单累计 + 方向 × 本单金额
const currentAfter = computed(() => netOf(lastTotal.lastTotalAmount + sign.value * (form.amount || 0)))
const allNetAfter = computed(() => netOf(lastTotal.allNetAmount + sign.value * (form.amount || 0)))

// ===== 累计区块（统一组件 InoutCumBlock）=====
// 选了供应商 → 该供应商；没选 → 全部往来单位
const hasCp = computed(() => !!(form.counterpartyName || '').trim())
const cumTitle = computed(() => `累计 · ${hasCp.value ? form.counterpartyName : '全部往来单位'}`)
const netTone = (v) => { const n = netOf(v); return n > 0 ? 'pos' : n < 0 ? 'neg' : 'plain' }
const cumCards = computed(() => {
  const all = !hasCp.value
  const inAmt = all ? lastTotal.allInAmount : lastTotal.inAmount
  const outAmt = all ? lastTotal.allOutAmount : lastTotal.outAmount
  const netAmt = all ? lastTotal.allNetAmount : lastTotal.netAmount
  return [
    {
      label: '累计收入', value: fmtMoney(inAmt), tone: 'in',
      sub: all ? '全部往来单位合计' : `已生效 ${lastTotal.recordCount} 笔`
    },
    { label: '累计支出', value: fmtMoney(outAmt), tone: 'out' },
    { label: '累计净额（收入 − 支出）', value: fmtMoney(netAmt), tone: netTone(netAmt) }
  ]
})
// 三段式字段：上单 / 本单 / 累积（累积 = 上单 ± 本单）
const cumFlows = computed(() => {
  const all = !hasCp.value
  const base = all ? lastTotal.allNetAmount : lastTotal.lastTotalAmount
  const delta = sign.value * (form.amount || 0)
  const after = all ? allNetAfter.value : currentAfter.value
  return [{
    label: `${all ? '全部往来单位' : form.counterpartyName}：累计净额`,
    last: fmtMoney(base),
    delta: (delta >= 0 ? '+' : '−') + fmtMoney(Math.abs(delta)),
    now: fmtMoney(after),
    sub: `本次${form.direction === 1 ? '收入' : '支出'} ${fmtMoney(Math.abs(form.amount || 0))}`,
    tone: netTone(after)
  }]
})
const cumNotes = [
  '<b>上单</b>：截至业务日期、已生效记录的收支净额（不含正在录入的这一单）。',
  '<b>本单</b>：这一单的金额，收入为加、支出为减。',
  '<b>累积</b>：上单 + 本单，也就是这笔录进去以后的累计净额。<b>累计收入/支出</b>分别统计进出总额，<b>累计净额</b>才是两者相抵。'
]

const loadFormOptions = async () => {
  try {
    const res = await getInoutFormOptions('expense')
    const d = res?.data || {}
    counterpartyOptions.value = d.counterparties || []
    productNameOptions.value = d.productNames || []
    contentOptions.value = d.contents || []
    const n2i = {}, i2n = {}
    counterpartyOptions.value.forEach(c => { n2i[c.name] = c.id; i2n[c.id] = c.name })
    nameToId.value = n2i
    idToName.value = i2n
  } catch {}
}

const loadLastTotal = async () => {
  try {
    // 编辑场景排除自身，避免把自己算进「上单累计」
    const res = await getExpenseLastTotal(form.recordDate, form.counterpartyId || null, form.counterpartyName || '', route.query.id || undefined)
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
  counterpartyName: form.counterpartyName || ''
})

const saveRecord = async () => {
  const payload = buildPayload()
  if (recordId.value) {
    await updateExpense(recordId.value, payload)
    return recordId.value
  }
  const res = await createExpense(payload)
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
      const res = await submitExpense(id)
      if (res?.success === false) throw new Error(res.message || '提交失败')
      ElMessage.success('已提交审核')
      router.push('/inout/expense-list')
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
  form.direction = presetDirection.value !== null ? presetDirection.value : 0
  form.counterpartyId = null
  form.counterpartyName = ''
  form.amount = 0
  form.paymentAmount = 0
  form.paymentMethod = ''
  form.remark = ''
  form.productName = ''
  form.content = ''
  form.createByName = currentUserName.value
}

onMounted(async () => {
  await loadFormOptions()
  if (route.query.id) {
    try {
      const res = await getExpenseById(route.query.id)
      if (res.success) {
        Object.assign(form, res.data)
        if (form.recordDate && form.recordDate.length > 10) form.recordDate = form.recordDate.slice(0, 10)
        if (!form.createByName) form.createByName = currentUserName.value
        if (!form.counterpartyName && form.counterpartyId) form.counterpartyName = idToName.value[form.counterpartyId] || ''
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
/* 保存 / 提交 说明 */
.action-tip { margin-left: 12px; font-size: 12px; color: #a8abb2; }
.dir-tag { font-size: 14px; padding: 0 12px; height: 32px; line-height: 32px; }
.dir-hint { margin-left: 8px; font-size: 12px; color: #a8abb2; }
.opt-tag { float: right; margin-left: 10px; font-size: 12px; color: #a8abb2; }
</style>