<template>
  <div class="inout-cum">
    <div class="ic-head">
      <span class="ic-title">📊 {{ title }}</span>
      <span v-if="tip" class="ic-tip">{{ tip }}</span>
    </div>

    <el-row :gutter="12">
      <el-col v-for="c in cards" :key="c.label" :xs="12" :sm="8" :md="span" :lg="span">
        <div class="ic-box" :class="toneClass(c.tone)">
          <div class="ic-label">{{ c.label }}</div>
          <div class="ic-value">
            {{ c.value }}<span v-if="c.unit" class="ic-unit">{{ c.unit }}</span>
          </div>
          <div v-if="c.sub" class="ic-sub">{{ c.sub }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 三段式：上单 / 本单 / 现在（不用箭头，客户一眼看三个字段） -->
    <div v-if="flowList.length" class="ic-flows">
      <div v-for="f in flowList" :key="f.label" class="ic-flow" :class="toneClass(f.tone)">
        <div class="ic-flow-head">
          <span class="ic-flow-name">{{ f.label }}</span>
          <span v-if="f.sub" class="ic-flow-sub">{{ f.sub }}</span>
        </div>
        <div class="ic-flow-cols">
          <div class="ic-flow-cell">
            <div class="ic-flow-lbl">上单</div>
            <div class="ic-flow-val ic-flow-last">{{ f.last }}</div>
            <div class="ic-flow-hint">之前的累计</div>
          </div>
          <div class="ic-flow-cell ic-flow-mid">
            <div class="ic-flow-lbl">本单</div>
            <div class="ic-flow-val" :class="deltaClass(f)">{{ f.delta }}</div>
            <div class="ic-flow-hint">这一单的进/出</div>
          </div>
          <div class="ic-flow-cell ic-flow-end">
            <div class="ic-flow-lbl">现在</div>
            <div class="ic-flow-val ic-flow-now">{{ f.now }}</div>
            <div class="ic-flow-hint">上单 + 本单</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="notes && notes.length" class="ic-note">
      <div v-for="(n, i) in notes" :key="i" v-html="n" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// 进销存三个录入页（费用 / 钻石 / 金料）共用的「累计」区块
// 口径：选了往来单位 → 该单位截至业务日期的累计；没选 → 全部往来单位合计
const props = defineProps({
  title: { type: String, default: '累计' },
  tip: { type: String, default: '' },
  // [{ label, value, unit, sub, tone }]  tone: in | out | pos | neg | highlight | plain
  cards: { type: Array, default: () => [] },
  // 每张卡在 md/lg 下的栅格宽度（默认 6 = 一行 4 张）
  span: { type: Number, default: 6 },
  // 三段式字段：[{ label, last, delta, now, deltaTone, sub, tone }]
  // 明确写成「上单 / 本单 / 现在」三个字段，不用箭头表达变化
  flows: { type: Array, default: () => [] },
  // 旧写法兼容（{ label, from, to }），新代码请用 flows
  compares: { type: Array, default: () => [] },
  compare: { type: Object, default: null },
  notes: { type: Array, default: () => [] }
})

const flowList = computed(() => {
  if (props.flows && props.flows.length) return props.flows
  const legacy = (props.compares && props.compares.length)
    ? props.compares
    : (props.compare ? [props.compare] : [])
  return legacy.map(x => ({
    label: x.label, last: x.from, delta: '', now: x.to, sub: x.sub, tone: x.tone
  }))
})

const toneClass = (tone) => ({
  'ic-in': tone === 'in',
  'ic-out': tone === 'out',
  'ic-pos': tone === 'pos',
  'ic-neg': tone === 'neg',
  'ic-hl': tone === 'highlight'
})

// 本单：加为红（进），减为绿（出），零为灰
const deltaClass = (f) => {
  if (f.deltaTone === 'pos' || f.deltaTone === 'neg') return 'ic-d-' + f.deltaTone
  const s = String(f.delta || '').replace(/[,\s]/g, '')
  if (s.startsWith('-') || s.startsWith('−')) return 'ic-d-neg'
  if (/[1-9]/.test(s.replace(/[^\d]/g, ''))) return 'ic-d-pos'
  return 'ic-d-zero'
}
</script>

<style scoped>
.inout-cum { padding: 12px 14px 6px; background: #fafbfc; border: 1px solid #ebeef5; border-radius: 8px; }
.ic-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.ic-title { font-size: 13px; font-weight: 600; color: #303133; }
.ic-tip { font-size: 12px; color: #a8abb2; }

.ic-box { background: #f5f7fa; border-radius: 6px; padding: 10px 14px; border-left: 3px solid #909399; }
.ic-box.ic-in { border-left-color: #409EFF; background: #f4f8ff; }
.ic-box.ic-in .ic-value { color: #2f6fd0; }
.ic-box.ic-out { border-left-color: #E6A23C; background: #fdf6ec; }
.ic-box.ic-out .ic-value { color: #b8791a; }
.ic-box.ic-pos { border-left-color: #F56C6C; background: #fef0f0; }
.ic-box.ic-pos .ic-value { color: #F56C6C; }
.ic-box.ic-neg { border-left-color: #67C23A; background: #f0f9eb; }
.ic-box.ic-neg .ic-value { color: #67C23A; }
.ic-box.ic-hl { border-left-color: #409EFF; background: #ecf5ff; }
.ic-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.ic-value { font-size: 16px; font-weight: 600; color: #303133; font-variant-numeric: tabular-nums; }
.ic-unit { font-size: 12px; font-weight: 400; color: #909399; margin-left: 2px; }
.ic-sub { font-size: 12px; color: #a8abb2; margin-top: 4px; }

/* 三段式 */
.ic-flows { margin-top: 10px; }
.ic-flow {
  margin-top: 8px; padding: 10px 14px 12px;
  background: #fff; border: 1px solid #e4e7ed; border-radius: 6px;
}
.ic-flow + .ic-flow { margin-top: 8px; }
.ic-flow-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
.ic-flow-name { font-size: 13px; font-weight: 600; color: #303133; }
.ic-flow-sub { font-size: 12px; color: #a8abb2; }
.ic-flow-cols { display: flex; gap: 10px; }
.ic-flow-cell {
  flex: 1; min-width: 0; padding: 8px 12px;
  background: #f7f8fa; border-radius: 6px; border: 1px solid transparent;
}
.ic-flow-lbl { font-size: 12px; color: #909399; }
.ic-flow-val {
  font-size: 17px; font-weight: 600; color: #303133;
  font-variant-numeric: tabular-nums; line-height: 1.5;
}
.ic-flow-hint { font-size: 11px; color: #c0c4cc; }

.ic-flow-last { color: #606266; }
.ic-flow-mid { background: #fdf6ec; border-color: #faecd8; }
.ic-flow-mid .ic-flow-lbl { color: #b8791a; }
.ic-flow-end { background: #ecf5ff; border-color: #d9ecff; }
.ic-flow-end .ic-flow-lbl { color: #2f6fd0; }
.ic-flow-now { color: #2f6fd0; font-size: 18px; }

.ic-d-pos { color: #F56C6C; }
.ic-d-neg { color: #67C23A; }
.ic-d-zero { color: #909399; }

.ic-note { margin-top: 8px; padding: 8px 12px; background: #fafafa; border-radius: 6px;
  font-size: 12px; color: #909399; line-height: 1.9; }
.ic-note b { color: #606266; }

@media (max-width: 768px) {
  .ic-flow-cols { flex-wrap: wrap; }
  .ic-flow-cell { flex: 1 1 100%; }
}
</style>
