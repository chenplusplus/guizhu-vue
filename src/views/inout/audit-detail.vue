<!-- src/views/inout/audit-detail.vue —— 进销存详情 / 审核
     版式与录入页（gold-input / diamond-input / expense-input）保持一致：
     同样的四列栅格、同样的字段顺序、同样的分组标题，方便审核员对着纸单逐格核对。 -->
<template>
  <div class="inout-detail-page" v-loading="loading">
    <!-- ===== 顶部：返回 + 标题 + 状态 ===== -->
    <div class="page-head">
      <div class="ph-left">
        <el-button link class="back-btn" @click="goBack">← 返回列表</el-button>
        <h2 class="ph-title">{{ cfg.icon }} {{ cfg.title }}{{ dirText }}</h2>
        <span class="ph-no">{{ data.recordNo || '—' }}</span>
        <el-tag :type="statusTag" effect="dark" size="small">{{ statusText }}</el-tag>
      </div>
      <div class="ph-right">
        <span v-if="isPending" class="ph-tip">请核对单据内容后再审核</span>
        <el-button size="small" @click="load">刷新</el-button>
      </div>
    </div>

    <!-- ===== 单据（与录入表单同版式，只读） ===== -->
    <el-card shadow="never" class="card">
      <template #header>
        <div class="card-head">
          <span class="card-title">单据内容</span>
          <span class="card-tip">与录入表单同一套字段和顺序，逐格核对即可</span>
        </div>
      </template>

      <el-form label-width="110px" size="default" class="ro-form" @submit.prevent>
        <template v-for="(sec, si) in cfg.sections" :key="si">
          <el-divider v-if="sec.title" content-position="left">
            {{ sec.title }}
            <span v-if="sec.tip" class="calc-note">{{ sec.tip }}</span>
          </el-divider>

          <el-row :gutter="16">
            <el-col v-for="(f, fi) in sec.fields" v-show="!f.hide || !f.hide(data)" :key="fi" :span="sec.span || 6">
              <el-form-item :label="labelOf(f)">
                <el-tag v-if="f.type === 'tag'" :type="f.tagType ? f.tagType(data) : 'info'" effect="plain">
                  {{ textOf(f) || '—' }}
                </el-tag>
                <el-input
                  v-else
                  :model-value="textOf(f)"
                  readonly
                  :class="{ 'strong-input': f.strong }"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </template>
      </el-form>
    </el-card>

    <!-- ===== 备注 / 关联 ===== -->
    <el-card v-if="data.remark || data.orderNo || data.billNo" shadow="never" class="card">
      <template #header><span class="card-title">备注与关联</span></template>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="订单号">{{ data.orderNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="账单号">{{ data.billNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
          <span class="remark-text">{{ data.remark || '—' }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- ===== 附件 ===== -->
    <el-card v-if="images.length" shadow="never" class="card">
      <template #header><span class="card-title">附件（{{ images.length }}）</span></template>
      <div class="img-list">
        <el-image v-for="(src, i) in images" :key="i" :src="src" :preview-src-list="images"
          :initial-index="i" fit="cover" class="img-item" preview-teleported />
      </div>
    </el-card>

    <!-- ===== 操作留痕（提交 / 审核 / 修改） ===== -->
    <el-card v-if="logs.length" shadow="never" class="card">
      <template #header><span class="card-title">操作留痕</span></template>
      <el-timeline>
        <el-timeline-item v-for="l in logs" :key="l.id" :timestamp="fmtTime(l.createdAt)" placement="top"
          :type="logType(l.action)">
          <div class="log-item">
            <b>{{ logActionText(l.action) }}</b>
            <span class="log-op">{{ l.operatorName || '—' }}<template v-if="l.operatorRole">（{{ l.operatorRole }}）</template></span>
            <div v-if="l.summary" class="log-sum">{{ l.summary }}</div>
            <div v-if="l.remark" class="log-remark">审核意见：{{ l.remark }}</div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <!-- ===== 审核操作条 ===== -->
    <div v-if="canAudit" class="audit-bar">
      <div class="ab-row">
        <span class="ab-label">审核人</span>
        <el-input v-model="auditForm.auditedByName" size="small" class="ab-name" placeholder="默认当前登录人" />
        <span class="ab-label">审核意见</span>
        <el-input v-model="auditForm.remark" size="small" class="ab-remark"
          :placeholder="rejectMode ? '驳回必须填写原因' : '通过可不填，驳回必填'" clearable />
      </div>
      <div class="ab-actions">
        <span class="ab-hint">通过后该单立即生效并计入进销存；驳回后由录入人修改重提</span>
        <el-button size="small" @click="goBack">返回</el-button>
        <el-button type="danger" :loading="submitting" @click="submitAudit(false)">驳回</el-button>
        <el-button type="success" :loading="submitting" @click="submitAudit(true)">审核通过</el-button>
      </div>
    </div>

    <el-card v-else-if="isPending" shadow="never" class="card result-card">
      <div class="result-line">
        该单待审核，等待审核员处理<span class="result-tip">（审核员通过后才计入进销存）</span>
      </div>
    </el-card>

    <el-card v-else shadow="never" class="card result-card">
      <div class="result-line">
        该单已<el-tag :type="statusTag" size="small">{{ statusText }}</el-tag>
        <template v-if="data.auditedByName">，审核人 {{ data.auditedByName }}</template>
        <template v-if="data.auditedAt">，时间 {{ fmtTime(data.auditedAt) }}</template>
        <span class="result-tip">（仅可查看，不能再审核）</span>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getGoldById, getDiamondById, getExpenseById,
  auditGold, auditDiamond, auditExpense,
} from '@/api/inout'
import { getOperationLogs } from '@/api/log'
import { isPureGold } from '@/utils/color'

const route = useRoute()
const router = useRouter()

const type = computed(() => String(route.params.type || '').toLowerCase())
const recordId = computed(() => route.params.id)

const loading = ref(false)
const submitting = ref(false)
const data = ref({})
const logs = ref([])
const auditForm = reactive({ auditedByName: '', remark: '' })

const userInfo = (() => {
  try { return JSON.parse(localStorage.getItem('userInfo') || '{}') } catch { return {} }
})()
const userType = String(userInfo.userType || '').toLowerCase()
const isAuditor = userType === 'factoryaudit' || userType === 'admin'

// ============================================================
// 格式化（与录入页一致：重量/金额两位小数，率按百分比两位）
// ============================================================
const MONEY = (v) => '¥' + (Math.round(Number(v || 0) * 100) / 100).toFixed(2)
const NUM = (d) => (v) => Number(v || 0).toFixed(d)
const PCT = (v) => (Math.round(Number(v || 0) * 10000) / 100).toFixed(2) + '%'
const TEXT = (v) => (v === null || v === undefined || v === '' ? '' : String(v))
const DATE = (v) => (v ? String(v).slice(0, 10) : '')
// 损耗率 / 折算率在录入页是百分比输入，详情页也用百分比两位
const goldPriceText = (v) => (Number(v || 0) ? NUM(2)(v) : '')

// ============================================================
// 三种单据的字段配置 —— 顺序、分组、列宽都照抄各自录入表单
// ============================================================
const CFG = {
  gold: {
    icon: '🥇',
    title: '金料',
    sourceType: 'inout_gold',
    fetch: getGoldById,
    audit: auditGold,
    listPath: '/inout/gold-list',
    dirText: (d) => (d === 1 ? '入库（付钱）' : '出库（收钱）'),
    sections: [
      {
        fields: [
          { key: 'recordDate', label: '业务日期', fmt: DATE },
          { key: 'direction', label: '方向', type: 'tag', tagType: (d) => (d.direction === 1 ? 'success' : 'warning'), text: (d) => (d.direction === 1 ? '入库（付钱）' : '出库（收钱）') },
          { key: 'counterpartyName', label: '供应商', fmt: TEXT },
          { key: 'materialType', label: '成色', fmt: TEXT },
          { key: 'productName', label: '产品名称', fmt: TEXT },
          { key: 'content', label: '内容', fmt: TEXT },
          { key: 'createdByName', label: '经办人', fmt: TEXT },
        ],
      },
      {
        title: '计算',
        tip: '加耗总重 = 金重 × 损耗率　·　折足金 = 加耗总重 × 折算率',
        fields: [
          { key: 'goldWeight', label: '金重(g)', fmt: NUM(2) },
          { key: 'lossRate', label: '损耗率(%)', fmt: PCT },
          { key: 'totalWeight', label: '加耗总重', fmt: NUM(2) },
          { key: 'foldRate', label: '折算率(%)', fmt: PCT },
          { key: 'foldWeight', label: '折足金', fmt: NUM(2), strong: true },
          { key: 'patchWeight', label: '补钯重', fmt: NUM(2) },
          { key: 'mouthWeight', label: '补口重', fmt: NUM(2) },
          { key: 'mouthPrice', label: '补口价(元/g)', fmt: MONEY },
          { key: 'mouthAmount', label: '补口金额', fmt: MONEY },
        ],
      },
      {
        fields: [
          { key: 'patchFee', label: '补钯金费', fmt: MONEY },
          { key: 'laborFee', label: '工费', fmt: MONEY },
          {
            key: 'totalAmount',
            label: (d) => (d.direction === 1 ? '总金额' : '应收卖金款'),
            fmt: MONEY, strong: true,
          },
          {
            key: 'paymentAmount',
            label: (d) => (d.direction === 1 ? '付款金额' : '已收款金额'),
            fmt: MONEY,
          },
          {
            // 付足料：只有「入库 + 非足金成色（配件）」才有
            key: 'paidFoldWeight',
            label: '付足料(g)', fmt: NUM(2), strong: true,
            hide: (d) => !(d.direction === 1 && !isPureGold(d.materialType)),
          },
          { key: 'orderNo', label: '关联订单号', fmt: TEXT },
          { key: 'patch', label: '补口', fmt: TEXT },
          { key: 'goldPrice', label: '金价', fmt: goldPriceText },
        ],
      },
      {
        title: '累计',
        tip: '上单 = 录这一单之前的累计；本单累计 = 上单 ± 本单',
        fields: [
          { key: 'lastTotalFold', label: '上单累计折足金', fmt: NUM(2) },
          { key: 'currentTotalFold', label: '本单累计折足金', fmt: NUM(2), strong: true },
          { key: 'lastTotalAmount', label: '上单累计金额', fmt: MONEY },
          { key: 'currentTotalAmount', label: '本单累计金额', fmt: MONEY, strong: true },
        ],
      },
    ],
  },

  diamond: {
    icon: '💎',
    title: '钻石',
    sourceType: 'inout_diamond',
    fetch: getDiamondById,
    audit: auditDiamond,
    listPath: '/inout/diamond-list',
    dirText: (d) => (d === 1 ? '入库（采购）' : '出库'),
    sections: [
      {
        fields: [
          { key: 'recordDate', label: '业务日期', fmt: DATE },
          { key: 'direction', label: '方向', type: 'tag', tagType: (d) => (d.direction === 1 ? 'success' : 'warning'), text: (d) => (d.direction === 1 ? '入库（采购）' : '出库') },
          { key: 'counterpartyName', label: '供应商', fmt: TEXT },
          { key: 'diamondType', label: '钻石级别', fmt: TEXT },
          { key: 'materialType', label: '材质', fmt: TEXT },
          { key: 'productName', label: '产品名称', fmt: TEXT },
          { key: 'content', label: '内容', fmt: TEXT },
          { key: 'createdByName', label: '经办人', fmt: TEXT },
        ],
      },
      {
        title: '本单',
        tip: '金额 = 卡数 × 单价；未付 = 金额 − 付款（入库还欠供应商，出库是对方欠我）',
        fields: [
          { key: 'carat', label: '卡数(ct)', fmt: NUM(2), strong: true },
          { key: 'unitPrice', label: '单价(元/ct)', fmt: NUM(2) },
          { key: 'amount', label: '本单金额', fmt: MONEY, strong: true },
          {
            key: 'paymentAmount',
            label: (d) => (d.direction === 1 ? '付款金额' : '收款金额'),
            fmt: MONEY,
          },
          {
            key: 'currentDebt', label: (d) => (d.direction === 1 ? '本单未付' : '本单未收'),
            fmt: MONEY,
          },
          { key: 'orderNo', label: '关联订单号', fmt: TEXT },
        ],
      },
      {
        title: '累计',
        tip: '石重与钱是两个维度：库存看石重，未付只看采购',
        fields: [
          { key: 'lastTotalCarat', label: '上单库存(ct)', fmt: NUM(2) },
          { key: 'currentTotalCarat', label: '本单库存(ct)', fmt: NUM(2), strong: true },
          { key: 'lastTotalAmount', label: '上单累计金额', fmt: MONEY },
          { key: 'currentTotalAmount', label: '本单累计金额', fmt: MONEY, strong: true },
        ],
      },
    ],
  },

  expense: {
    icon: '💰',
    title: '费用',
    sourceType: 'inout_expense',
    fetch: getExpenseById,
    audit: auditExpense,
    listPath: '/inout/expense-list',
    dirText: (d) => (d === 1 ? '收入' : '支出'),
    sections: [
      {
        fields: [
          { key: 'recordDate', label: '业务日期', fmt: DATE },
          { key: 'direction', label: '方向', type: 'tag', tagType: (d) => (d.direction === 1 ? 'success' : 'warning'), text: (d) => (d.direction === 1 ? '收入' : '支出') },
          { key: 'counterpartyName', label: '供应商', fmt: TEXT },
          { key: 'expenseCategory', label: '资金分类', fmt: TEXT },
          { key: 'productName', label: '收款项目', fmt: TEXT },
          { key: 'content', label: '内容', fmt: TEXT },
          { key: 'createdByName', label: '经办人', fmt: TEXT },
        ],
      },
      {
        title: '金额',
        tip: '累计 = 该往来单位截至业务日期的收支净额（收入 − 支出）',
        fields: [
          { key: 'amount', label: '金额', fmt: MONEY, strong: true },
          { key: 'paymentAmount', label: '付款金额', fmt: MONEY },
          { key: 'paymentMethod', label: '支付方式', fmt: TEXT },
          { key: 'orderNo', label: '关联订单号', fmt: TEXT },
          { key: 'lastTotalAmount', label: '上单累计', fmt: MONEY },
          { key: 'currentTotalAmount', label: '本单累计', fmt: MONEY, strong: true },
        ],
      },
    ],
  },
}

const cfg = computed(() => CFG[type.value] || CFG.gold)
const dirText = computed(() => (data.value?.direction === undefined ? '' : cfg.value.dirText(data.value.direction)))
const isPending = computed(() => data.value?.status === 'pending')
const canAudit = computed(() => isAuditor && isPending.value)

const STATUS = {
  draft: ['草稿', 'info'],
  pending: ['待审核', 'warning'],
  approved: ['已生效', 'success'],
  rejected: ['已驳回', 'danger'],
}
const statusText = computed(() => STATUS[data.value?.status]?.[0] || data.value?.status || '—')
const statusTag = computed(() => STATUS[data.value?.status]?.[1] || 'info')

const labelOf = (f) => (typeof f.label === 'function' ? f.label(data.value) : f.label)
const textOf = (f) => {
  if (f.text) return f.text(data.value)
  const v = data.value[f.key]
  if (f.fmt) return f.fmt(v)
  return v === null || v === undefined || v === '' ? '' : String(v)
}

const images = computed(() => {
  const raw = data.value?.images
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter(Boolean) : []
  } catch {
    return String(raw).split(',').map(s => s.trim()).filter(Boolean)
  }
})

const fmtTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 16) : '')

const LOG_ACTION = { create: '新建', update: '修改', submit: '提交审核', audit_pass: '审核通过', audit_reject: '审核驳回', delete: '删除' }
const logActionText = (a) => LOG_ACTION[a] || a || '操作'
const logType = (a) => (a === 'audit_pass' ? 'success' : a === 'audit_reject' ? 'danger' : a === 'submit' ? 'primary' : '')

const load = async () => {
  loading.value = true
  try {
    const res = await cfg.value.fetch(recordId.value)
    if (res?.success) {
      data.value = res.data || {}
      auditForm.auditedByName = userInfo.realName || userInfo.name || ''
      loadLogs()
    } else {
      ElMessage.error(res?.message || '单据不存在')
    }
  } catch (e) {
    ElMessage.error('加载单据失败')
  } finally {
    loading.value = false
  }
}

const loadLogs = async () => {
  if (!data.value?.recordNo) return
  try {
    const res = await getOperationLogs({
      sourceType: cfg.value.sourceType,
      keyword: data.value.recordNo,
      page: 1,
      pageSize: 30,
    })
    const rows = res?.data || []
    logs.value = rows.filter(x => String(x.sourceNo || '') === String(data.value.recordNo))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  } catch { logs.value = [] }
}

const submitAudit = async (approved) => {
  if (!approved && !String(auditForm.remark || '').trim()) {
    ElMessage.warning('驳回必须填写原因')
    return
  }
  const label = approved ? '审核通过' : '驳回'
  try {
    await ElMessageBox.confirm(
      approved
        ? `确认「${data.value.recordNo}」审核通过？通过后立即生效并计入进销存。`
        : `确认驳回「${data.value.recordNo}」？驳回后由录入人修改重提。`,
      label, { type: approved ? 'success' : 'warning', confirmButtonText: label, cancelButtonText: '取消' })
  } catch { return }

  submitting.value = true
  try {
    const res = await cfg.value.audit(recordId.value, approved, auditForm.remark, auditForm.auditedByName)
    if (res?.success) {
      ElMessage.success(approved ? '已通过，单据已生效' : '已驳回')
      goBack(true)
    } else {
      ElMessage.error(res?.message || '审核失败')
    }
  } catch (e) {
    ElMessage.error('审核失败')
  } finally {
    submitting.value = false
  }
}

const goBack = (replace = false) => {
  const back = route.query.back ? decodeURIComponent(String(route.query.back)) : cfg.value.listPath
  if (replace) router.replace(back)
  else router.push(back)
}

watch(type, () => { data.value = {}; logs.value = []; load() })
onMounted(load)
</script>

<style scoped>
.inout-detail-page { padding: 16px 16px 96px; }
/* 顶部 */
.page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ph-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.back-btn { font-size: 13px; color: #606266; }
.ph-title { margin: 0; font-size: 18px; font-weight: 700; color: #303133; }
.ph-no { font-size: 13px; color: #606266; font-variant-numeric: tabular-nums; }
.ph-tip { font-size: 12px; color: #E6A23C; margin-right: 8px; }
/* 卡片 */
.card { margin-bottom: 12px; }
.card-head { display: flex; align-items: baseline; gap: 10px; }
.card-title { font-weight: 600; font-size: 14px; color: #303133; }
.card-tip { font-size: 12px; color: #a8abb2; }
/* 只读表单：跟录入页一样的四列 */
.ro-form :deep(.el-form-item) { margin-bottom: 14px; }
.ro-form :deep(.el-form-item__label) { font-size: 13px; color: #606266; }
.ro-form :deep(.el-input.is-disabled .el-input__wrapper),
.ro-form :deep(.el-input__wrapper) { box-shadow: 0 0 0 1px #e4e7ed inset; background: #fafbfc; }
.ro-form :deep(.el-input__inner) { color: #303133; font-variant-numeric: tabular-nums; }
.ro-form :deep(.el-input__inner[readonly]) { cursor: default; }
.ro-form :deep(.strong-input .el-input__wrapper) { background: #f2f8ff; box-shadow: 0 0 0 1px #d6e6fb inset; }
.ro-form :deep(.strong-input .el-input__inner) { color: #2f6fd0; font-weight: 600; }
.calc-note { margin-left: 10px; font-size: 12px; font-weight: 400; color: #a8abb2; }
/* 备注 / 附件 */
.remark-text { white-space: pre-wrap; color: #606266; }
.img-list { display: flex; flex-wrap: wrap; gap: 10px; }
.img-item { width: 120px; height: 120px; border-radius: 6px; border: 1px solid #ebeef5; cursor: zoom-in; }
/* 留痕 */
.log-item { font-size: 13px; color: #303133; }
.log-op { margin-left: 8px; font-size: 12px; color: #909399; }
.log-sum { margin-top: 3px; font-size: 12px; color: #606266; }
.log-remark { margin-top: 2px; font-size: 12px; color: #E6A23C; }
/* 审核条 */
.audit-bar {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 20;
  background: #fff; border-top: 1px solid #e4e7ed; box-shadow: 0 -2px 10px rgba(0,0,0,.05);
  padding: 10px 24px;
}
.ab-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ab-label { font-size: 12px; color: #909399; }
.ab-name { width: 140px; }
.ab-remark { flex: 0 1 520px; }
.ab-actions { display: flex; align-items: center; gap: 8px; }
.ab-hint { flex: 1; font-size: 12px; color: #a8abb2; }
.result-card { margin-top: 4px; }
.result-line { font-size: 13px; color: #606266; display: flex; align-items: center; gap: 6px; }
.result-tip { color: #a8abb2; }
</style>
