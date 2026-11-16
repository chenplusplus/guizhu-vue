<template>
  <div class="inout-input-page">
    <GoldMaterialSummary ref="summaryComp" :title="summaryTitle" />

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
              <el-tag :type="form.direction === 1 ? 'success' : 'warning'" effect="dark" size="large" class="dir-tag">
                {{ form.direction === 1 ? '入库（付钱）' : '出库（收钱）' }}
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
            <el-form-item label="成色" prop="materialType">
              <el-select v-model="form.materialType" placeholder="请选择成色" filterable allow-create style="width:100%" @change="onMaterialChange">
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
          <el-col :span="6">
            <el-form-item label="关联订单号">
              <el-input v-model="form.orderNo" placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          计算
          <span class="calc-note">
            加耗总重 = 金重 × 损耗率　·　{{ foldWeightLabel }} = 加耗总重 × 折算率　·　补口重 = 金重 − 折足金　·　补口金额 = 补口价 × 补口重
            <template v-if="isInbound">　·　付款金额{{ showPaidFold ? ' / 付足料' : '' }}默认已付，自动带满本单</template>
          </span>
        </el-divider>

        <!-- 第一行：重量 | 损耗 | 总量 | 折算率 -->
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item :label="weightLabel" prop="goldWeight">
              <el-input-number v-model="form.goldWeight" :min="0" :precision="2" :step="0.1" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="损耗率(%)">
              <el-input-number v-model="lossRatePct" :min="0" :max="300" :precision="2" :step="0.5" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="加耗总重">
              <el-input :model-value="formatNum(totalWeight, 2)" readonly size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="折算率(%)" prop="foldRate">
              <el-input-number v-model="foldRatePct" :min="0" :max="200" :precision="2" :step="0.5" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第二行：折算重 | 补钯重（手填） | 补口重（金重−折足） | 补口价（单价） -->
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item :label="foldWeightLabel">
              <el-input :model-value="formatNum(foldWeight, 2)" readonly size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item>
              <template #label>
                <span>补钯重</span>
                <el-tooltip placement="top">
                  <template #content>
                    手填。没改过时默认带出「加耗总重 − 折足金」，<br>
                    改了之后按你填的算。
                  </template>
                  <span class="q-tip">?</span>
                </el-tooltip>
              </template>
              <el-input-number v-model="form.patchWeight" :min="0" :precision="2" size="large" style="width:100%" @change="patchAuto = false" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item>
              <template #label>
                <span>补口重</span>
                <el-tooltip placement="top">
                  <template #content>
                    水口／补口料的克重 = 金重 − 折足金，自动带出；<br>
                    手改过就固定，不再跟着重量变。
                  </template>
                  <span class="q-tip">?</span>
                </el-tooltip>
              </template>
              <el-input-number v-model="form.mouthWeight" :min="0" :precision="2" size="large" style="width:100%" @change="mouthAuto = false" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item>
              <template #label>
                <span>补口价<span class="pay-unit">(元/g)</span></span>
                <el-tooltip placement="top">
                  <template #content>
                    补口料的单价。填了价，补口金额 = 补口价 × 补口重，自动算。
                  </template>
                  <span class="q-tip">?</span>
                </el-tooltip>
              </template>
              <el-input-number v-model="form.mouthPrice" :min="0" :precision="2" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第三行：补口金额 | 补钯金费 | 工费 | 总金额 / 应收卖金款 -->
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item label="补口金额">
              <el-input
                v-if="(form.mouthPrice || 0) > 0"
                :model-value="formatNum(mouthAmountAuto, 2)"
                readonly size="large" style="width:100%"
              />
              <el-input-number v-else v-model="form.mouthAmount" :min="0" :precision="2" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
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
            <el-form-item :label="form.direction === 1 ? '应付金额' : '应收卖金款'">
              <el-input :model-value="formatNum(totalAmount, 2)" readonly size="large" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第四行：付款金额 / 已收款金额 | 付足料（仅入库非足金） | 金价 | 补口 -->
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item>
              <template #label>
                <span :class="{ 'pay-hot': isInbound }">
                  {{ form.direction === 1 ? '实付金额' : '已收款金额' }}
                </span>
                <el-tooltip v-if="isInbound" placement="top">
                  <template #content>
                    默认已付：自动带入本单总金额，改重量 / 金价会跟着变；<br>
                    手动改过就固定，不再跟随。未付部分计入「累计未结金额」。
                  </template>
                  <span class="pay-q">?</span>
                </el-tooltip>
              </template>
              <el-input-number v-model="form.paymentAmount" :min="0" :precision="2" size="large" style="width:100%" @change="payAuto = false" />
            </el-form-item>
          </el-col>
          <el-col v-if="showPaidFold" :span="6">
            <el-form-item>
              <template #label>
                <span class="pay-hot">实付足料<span class="pay-unit">(g)</span></span>
                <el-tooltip placement="top">
                  <template #content>
                    买配件（18K / 9K / PT 等非足金）一般不给钱，付足金给对方抵料款。<br>
                    默认付足：自动带入本单折足金，付满了本单就不再增加欠料。
                  </template>
                  <span class="pay-q">?</span>
                </el-tooltip>
              </template>
              <el-input-number v-model="form.paidFoldWeight" :min="0" :max="foldWeight" :precision="2" size="large" style="width:100%" @change="paidFoldAuto = false" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="金价">
              <el-input-number v-model="form.goldPrice" :min="0" :precision="2" size="large" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="补口">
              <el-input v-model="form.patch" placeholder="可选" size="large" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ⭐ 累计：选了供应商看该供应商，没选看全部往来单位 -->
        <InoutCumBlock
          :title="cumTitle"
          :tip="`截至 ${form.recordDate || '今天'} · 只算已生效单据（草稿 / 待审不计）`"
          :cards="cumCards"
          :span="6"
          :flows="cumFlows"
          :notes="cumNotes" />

        <el-form-item label="备注" style="margin-top:16px;">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item label="图片" style="margin-top:8px;">
          <MultiImageUpload v-model="imageList" :max-count="10" type="inout" tip="可上传凭证、实物照片等，最多10张" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">{{ isEdit ? '保存修改' : '提交录入' }}</el-button>
          <el-button v-if="isEdit" @click="router.push('/inout/gold-list')">取消</el-button>
          <el-button v-else @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { createGold, updateGold, getGoldLastTotal, getGoldById, getInoutFormOptions } from '@/api/inout'
import { useRoute, useRouter } from 'vue-router'
import { getMaterialLossList } from '@/api/materialLoss'
import MultiImageUpload from '@/components/MultiImageUpload.vue'
import GoldMaterialSummary from '@/components/GoldMaterialSummary.vue'
import InoutCumBlock from '@/components/InoutCumBlock.vue'
import { dictApi } from '@/api/dict'
import { GOLD_CONTENT_OPTIONS } from '@/constants/inoutOptions'
import { isPureGold } from '@/utils/color'

const formRef = ref()
const summaryComp = ref()
const route = useRoute()
const router = useRouter()
const submitting = ref(false)
const counterpartyOptions = ref([])
const productNameOptions = ref([])
const contentOptions = ref([])
const nameToId = ref({})
const idToName = ref({})
const counterpartyConfigs = ref([])

const materialOptions = ref([
  '黄金', '18K黄757‰', '18K白757‰', '18K红757‰',
  '14K黄', '14K白', '9K', '22K', 'PT',
  '足银', '925银', '铜'
])

// ⭐ 成色选项与订单成色下拉一致（成色字典 purity），加载后覆盖写死选项
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
const isEdit = computed(() => !!route.query.id)
const pageTitle = computed(() => {
  const t = route.meta?.title || '金录入'
  return isEdit.value ? `编辑${t}` : t
})

const form = reactive({
  recordDate: new Date().toISOString().slice(0, 10),
  direction: defaultDirection,
  counterpartyId: null,
  counterpartyName: '',
  materialType: '',
  goldWeight: 0,
  lossRate: 1,
  foldRate: 1,
  patchWeight: 0,
  mouthWeight: 0,
  mouthPrice: 0,
  mouthAmount: 0,
  patchFee: 0,
  laborFee: 0,
  paymentAmount: 0,
  paidFoldWeight: 0,
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
  lastTotalAmount: 0,
  lastUnpaidAmount: 0,
  // 全部往来单位合计（未选供应商时展示）
  allLastTotalFold: 0,
  allLastTotalSilver: 0,
  allLastTotalCopper: 0,
  allLastTotalAmount: 0,
  allLastUnpaidAmount: 0
})

const rules = {
  recordDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
  materialType: [{ required: true, message: '请选择成色', trigger: 'change' }],
  goldWeight: [{ required: true, message: '请输入重量', trigger: 'blur' }]
}

const formatNum = (v, d) => {
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(d) : (0).toFixed(d)
}

// 损耗率 / 折算率在界面上按百分比两位展示，内部仍存小数（100.00% ↔ 1）
const lossRatePct = computed({
  get: () => Math.round((Number(form.lossRate) || 0) * 10000) / 100,
  set: (v) => { form.lossRate = Math.round((Number(v) || 0) * 100) / 10000 }
})
const foldRatePct = computed({
  get: () => Math.round((Number(form.foldRate) || 0) * 10000) / 100,
  set: (v) => { form.foldRate = Math.round((Number(v) || 0) * 100) / 10000 }
})

// ==================== 计算 ====================
const totalWeight = computed(() => (form.goldWeight || 0) * (form.lossRate || 1))
const foldWeight = computed(() => totalWeight.value * (form.foldRate || 0))
// 总金额 = 折算重 × 金价 + 补口金额 + 补钯金费 + 工费（与后端 InoutGoldService 口径一致）
const totalAmount = computed(() => foldWeight.value * (form.goldPrice || 0)
  + (form.mouthAmount || 0) + (form.patchFee || 0) + (form.laborFee || 0))

// ==================== 付款 / 付足料（2026-11-15） ====================
// 金入库分两种买法：买足金 → 给钱；买其他成色（配件）→ 付足金抵料款。
// 两者都「默认已付」，自动带满本单，填满了本单就不再加进累计欠款 / 欠料。
const isInbound = computed(() => form.direction === 1)

const isPureGoldType = (m) => isPureGold(m)

// 配件单（入库 + 非足金成色）才需要付足料
const showPaidFold = computed(() => isInbound.value && !!form.materialType && !isPureGoldType(form.materialType))

// 自动带入标记：用户手动改过就固定，不再跟随重量 / 金价
const payAuto = ref(true)
const paidFoldAuto = ref(true)

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100

const applyAutoPay = () => {
  if (!isInbound.value) return
  if (payAuto.value) form.paymentAmount = round2(totalAmount.value)
  if (showPaidFold.value && paidFoldAuto.value) form.paidFoldWeight = round2(foldWeight.value)
}

watch([totalAmount, foldWeight, () => form.materialType, () => form.direction], applyAutoPay)

// ==================== 补钯重 / 补口重 / 补口价（2026-11-15） ====================
// 补钯重：手填，没动过时默认带出「加耗总重 − 折足金」
// 补口重：= 金重 − 折足金（水口／补口料的克重），没动过时自动跟随
// 补口金额 = 补口价 × 补口重（补口价 > 0 才自动算；没价时保留手填金额）
const patchAuto = ref(true)
const mouthAuto = ref(true)
const patchWeightDefault = computed(() => totalWeight.value - foldWeight.value)
const mouthWeightDefault = computed(() => (Number(form.goldWeight) || 0) - foldWeight.value)
const mouthAmountAuto = computed(() => round2((Number(form.mouthPrice) || 0) * (Number(form.mouthWeight) || 0)))

watch([patchWeightDefault, mouthWeightDefault], () => {
  if (patchAuto.value) form.patchWeight = round2(patchWeightDefault.value)
  if (mouthAuto.value) form.mouthWeight = round2(mouthWeightDefault.value)
}, { immediate: true })

watch([mouthAmountAuto, () => form.mouthPrice], () => {
  if ((Number(form.mouthPrice) || 0) > 0) form.mouthAmount = mouthAmountAuto.value
})

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

// ===== 累计区块（统一组件 InoutCumBlock）=====
// 选了供应商 → 该供应商；没选 → 全部往来单位
const hasCp = computed(() => !!(form.counterpartyName || '').trim())
const cumTitle = computed(() => `累计 · ${hasCp.value ? form.counterpartyName : '全部往来单位'}`)
const cumBase = computed(() => hasCp.value
  ? {
      fold: lastTotal.lastTotalFold, silver: lastTotal.lastTotalSilver,
      copper: lastTotal.lastTotalCopper, amount: lastTotal.lastTotalAmount,
      unpaid: lastTotal.lastUnpaidAmount
    }
  : {
      fold: lastTotal.allLastTotalFold, silver: lastTotal.allLastTotalSilver,
      copper: lastTotal.allLastTotalCopper, amount: lastTotal.allLastTotalAmount,
      unpaid: lastTotal.allLastUnpaidAmount
    })

// 本单计入累计的折足 = 折足金 − 付足料（入库）；出库不变
const foldDeltaBase = computed(() => {
  const fw = Number(foldWeight.value) || 0
  const paid = form.direction === 1 ? (Number(form.paidFoldWeight) || 0) : 0
  return Math.max(0, fw - paid)
})

const currentTotalFold = computed(() => {
  const base = foldCategory.value === 'silver' ? cumBase.value.silver
             : foldCategory.value === 'copper' ? cumBase.value.copper
             : cumBase.value.fold
  return base + sign.value * foldDeltaBase.value
})

const currentTotalAmount = computed(() => cumBase.value.amount + sign.value * totalAmount.value)

const fmtMoneyCum = (v) => '¥' + Math.abs(Number(v || 0)).toLocaleString('zh-CN', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
})
const cumCards = computed(() => [
  { label: '累计折足金', value: formatNum(cumBase.value.fold, 2), unit: ' g', tone: 'highlight' },
  { label: '累计折银', value: formatNum(cumBase.value.silver, 2), unit: ' g' },
  { label: '累计折铜', value: formatNum(cumBase.value.copper, 2), unit: ' g' },
  { label: '累计未结金额', value: fmtMoneyCum(cumBase.value.unpaid), tone: 'in' }
])

// 三段式字段：上单 / 本单 / 现在（现在 = 上单 ± 本单）
const thisUnpaid = computed(() => (Number(totalAmount.value) || 0) - (Number(form.paymentAmount) || 0))

const fmtSigned = (v) => {
  const n = Number(v || 0)
  return (n < 0 ? '−¥' : '¥') + Math.abs(n).toLocaleString('zh-CN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  })
}

const cumFlows = computed(() => {
  const dirIn = form.direction === 1
  const payTerm = dirIn ? '应付' : '应收'
  const paidTerm = dirIn ? '已付' : '已收'
  // 0 时不要显示 −0.00 / +¥0.00，直接给中性写法
  // 本单计入累计的折足 = 折足金 − 付足料：付足了本单就不再增加欠料
  const deltaFold = Math.round((sign.value * foldDeltaBase.value) * 100) / 100
  const deltaMoney = Math.round((Number(thisUnpaid.value) || 0) * 100) / 100
  const foldDeltaText = Math.abs(deltaFold) < 0.005
    ? '0.00 g'
    : (deltaFold > 0 ? '+' : '−') + formatNum(Math.abs(deltaFold), 2) + ' g'
  const moneyDeltaText = Math.abs(deltaMoney) < 0.005
    ? '¥0.00'
    : (deltaMoney > 0 ? '+¥' : '−¥') + Math.abs(deltaMoney).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const paidFoldText = dirIn && Number(form.paidFoldWeight) > 0
    ? `，付足料 ${formatNum(form.paidFoldWeight, 2)} g`
    : ''
  return [
    {
      label: `累计${foldLabel.value}`,
      last: formatNum(cumBase.value.fold, 2) + ' g',
      delta: foldDeltaText,
      now: formatNum(currentTotalFold.value, 2) + ' g',
      sub: `本次${dirIn ? '入库' : '出库'}${formatNum(foldWeight.value, 2)} g${paidFoldText}，金额 ${dirIn ? '+' : '−'}¥${Math.abs(totalAmount.value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      tone: 'highlight'
    },
    {
      label: '累计金额（未结）',
      last: fmtSigned(cumBase.value.unpaid),
      delta: moneyDeltaText,
      now: fmtSigned(Number(cumBase.value.unpaid || 0) + Number(thisUnpaid.value || 0)),
      sub: `本单金额 = ${payTerm} − ${paidTerm}`,
      tone: 'in'
    }
  ]
})

const cumNotes = computed(() => [
  '<b>上单</b>：截至业务日期、已生效单据的累计（不含正在录入的这一单）；选了供应商算该供应商，没选算全部往来单位。',
  `<b>本单</b>：折足这一行是这一单的${foldLabel.value}${form.direction === 1 ? ' − 付足料（付足了本单就不加）' : ''}，入库为加、出库为减；金额这一行是<b>本单未结</b> = ${form.direction === 1 ? '应付 − 已付' : '应收 − 已收'}。`,
  `<b>现在</b>：上单 + 本单。折足金 = 加耗总重 × 折算率；折算率不能相加，累计由重量反算。`
])

// ==================== 加载数据 ====================
// ⭐ 下拉选项：往来单位 + 产品名称 / 内容的历史值（都支持直接输入新值）
const loadFormOptions = async () => {
  try {
    const res = await getInoutFormOptions('gold')
    const d = res?.data || {}
    counterpartyOptions.value = d.counterparties || []
    productNameOptions.value = d.productNames || []
    // ⭐ 内容：固定清单（倒模货/扣头片/CNC 半成品/链子/回收货/成品货），仍可手动输入新值
    contentOptions.value = [...GOLD_CONTENT_OPTIONS]
    const n2i = {}, i2n = {}
    counterpartyOptions.value.forEach(c => { n2i[c.name] = c.id; i2n[c.id] = c.name })
    nameToId.value = n2i
    idToName.value = i2n
  } catch {}
}

const loadLastTotal = async () => {
  try {
    const res = await getGoldLastTotal(form.recordDate, null, form.counterpartyName || '')
    if (res.success) {
      const d = res.data || {}
      lastTotal.lastTotalFold = Number(d.lastTotalFold) || 0
      lastTotal.lastTotalSilver = Number(d.lastTotalSilver) || 0
      lastTotal.lastTotalCopper = Number(d.lastTotalCopper) || 0
      lastTotal.lastTotalAmount = Number(d.lastTotalAmount) || 0
      lastTotal.lastUnpaidAmount = Number(d.lastUnpaidAmount) || 0
      lastTotal.allLastTotalFold = Number(d.allLastTotalFold) || 0
      lastTotal.allLastTotalSilver = Number(d.allLastTotalSilver) || 0
      lastTotal.allLastTotalCopper = Number(d.allLastTotalCopper) || 0
      lastTotal.allLastTotalAmount = Number(d.allLastTotalAmount) || 0
      lastTotal.allLastUnpaidAmount = Number(d.allLastUnpaidAmount) || 0
    }
  } catch {}
}

// ==================== 供应商变更 ====================
// 下拉里没有的名称也能直接输入：新名称本单先按全局默认折率算，提交时后端自动建档
const onCounterpartyChange = async (name) => {
  form.counterpartyId = name ? (nameToId.value[name] ?? null) : null
  if (!name) {
    counterpartyConfigs.value = []
    loadLastTotal()
    return
  }
  try {
    const res = await getMaterialLossList(form.counterpartyId || 0)
    counterpartyConfigs.value = res.data || []
  } catch { counterpartyConfigs.value = [] }
  if (form.materialType) applyConfig()
  loadLastTotal()
}

// ==================== 成色变更 ====================
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
    ElMessage.warning(`未找到【${form.materialType}】的配置，使用默认折算率 ${(form.foldRate * 100).toFixed(2)}%`)
  }
}

const fillConfig = (config) => {
  form.foldRate = Number(config.convertRate) || 1
  form.lossRate = Number(config.lossRate) || 1
  form.patch = config.defaultPatch || ''
  ElMessage.success(`已带出【${config.materialType}】折算率 ${(form.foldRate * 100).toFixed(2)}%，损耗率 ${(form.lossRate * 100).toFixed(2)}%`)
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
        // 名称命中已有往来单位才带 id；新名称由后端自动建档
        counterpartyId: form.counterpartyName ? (nameToId.value[form.counterpartyName] ?? null) : null,
        counterpartyName: form.counterpartyName || '',
        foldCategory: foldCategory.value,
        images: serializeImages(imageList.value)
      }
      // ⭐ 带 id 进来就是编辑：走 PUT 更新，避免重复建单
      const editId = route.query.id
      const res = editId ? await updateGold(editId, submitData) : await createGold(submitData)
      if (res.success) {
        ElMessage.success(editId ? '修改成功' : '录入成功')
        if (editId) { router.push('/inout/gold-list'); return }
        handleReset()
        loadLastTotal()
        loadFormOptions()
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
  form.counterpartyId = null
  form.counterpartyName = ''
  form.goldWeight = 0
  form.lossRate = 1
  form.foldRate = 1
  form.mouthWeight = 0
  form.mouthPrice = 0
  form.mouthAmount = 0
  form.patchFee = 0
  form.laborFee = 0
  form.paymentAmount = 0
  form.paidFoldWeight = 0
  payAuto.value = true
  paidFoldAuto.value = true
  patchAuto.value = true
  mouthAuto.value = true
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
  await loadFormOptions()
  loadMaterialOptions()
  if (route.query.id) {
    try {
      // 编辑单：先关掉自动带入，避免加载时把已保存的付款金额/付足料改成全额
      payAuto.value = false
      paidFoldAuto.value = false
      patchAuto.value = false
      mouthAuto.value = false
      const res = await getGoldById(route.query.id)
      if (res.success) {
        Object.assign(form, res.data)
        if (form.recordDate && form.recordDate.length > 10) form.recordDate = form.recordDate.slice(0, 10)
        if (!form.createByName) form.createByName = currentUserName.value
        if (!form.counterpartyName && form.counterpartyId) form.counterpartyName = idToName.value[form.counterpartyId] || ''
        imageList.value = parseImages(res.data.images)
        // 原来就是付满的，继续跟随重量 / 金价；付了一部分的保持手填
        payAuto.value = Math.abs(round2(res.data.totalAmount) - round2(form.paymentAmount)) < 0.005
        paidFoldAuto.value = Math.abs(round2(foldWeight.value) - round2(form.paidFoldWeight)) < 0.005
        // 补钯重 / 补口重：原来就是默认值的继续跟随，手改过的保持原样
        patchAuto.value = Math.abs(round2(patchWeightDefault.value) - round2(form.patchWeight)) < 0.005
        mouthAuto.value = Math.abs(round2(mouthWeightDefault.value) - round2(form.mouthWeight)) < 0.005
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

/* 方向由入口决定：只读展示 */
.dir-tag { font-size: 14px; padding: 0 12px; height: 32px; line-height: 32px; }
.dir-hint { margin-left: 8px; font-size: 12px; color: #a8abb2; }
.calc-note { margin-left: 10px; font-size: 12px; font-weight: 400; color: #a8abb2; }
.opt-tag { float: right; margin-left: 10px; font-size: 12px; color: #a8abb2; }

/* 付款金额 / 付足料：默认已付，标红提醒 */
.pay-hot { color: #F56C6C; font-weight: 600; }
.pay-unit { font-weight: 400; }
.pay-q {
  display: inline-block; width: 13px; height: 13px; line-height: 12px;
  margin-left: 3px; text-align: center; font-size: 10px; font-weight: 400;
  color: #F56C6C; background: #fef0f0; border: 1px solid #fbc4c4;
  border-radius: 50%; cursor: help; vertical-align: 1px;
}
/* 补钯重 / 补口重 / 补口价：灰色小问号（口径说明） */
.q-tip {
  display: inline-block; width: 13px; height: 13px; line-height: 12px;
  margin-left: 3px; text-align: center; font-size: 10px; font-weight: 400;
  color: #909399; background: #f4f4f5; border: 1px solid #dcdfe6;
  border-radius: 50%; cursor: help; vertical-align: 1px;
}

/* 累计区块（与「金料按成色汇总」同卡展示） */
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