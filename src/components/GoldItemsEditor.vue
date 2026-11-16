<!-- src/components/GoldItemsEditor.vue
     一件货多成色：金料明细行内编辑 / 只读展示。
     - 每种成色一行：成色、净重、损耗、加耗重、折算率、折足金、金价、金额
     - 金额口径：加耗重 = 净重 × 损耗；折足金 = 加耗重 × 折算率；金额 = 折足金 × 金价
     - 合计：净重/加耗/折足/金额 求和；综合损耗 = Σ加耗 ÷ Σ净重（反算，禁止相加）
-->
<template>
  <div class="gold-items" :class="{ 'is-cost': costMode }">
    <div class="gi-head">
      <span class="gi-title">{{ title }}</span>
      <!-- ⭐ 成本块标记：销售 / 成本两块标题一样时工厂分不清哪个是成本 -->
      <el-tag v-if="costMode" size="small" type="danger" effect="dark" class="gi-mode-tag">成本</el-tag>
      <span class="gi-hint" v-if="editable">每种成色一行；一件货最多 {{ maxItems }} 种</span>
      <span class="gi-hint" v-else>按成色分段计算，金额相加</span>
      <el-button
        v-if="editable"
        type="primary"
        link
        size="small"
        class="gi-add"
        :disabled="list.length >= maxItems"
        @click="addRow"
      >+ 添加成色</el-button>
    </div>

    <el-table :data="list" border size="small" class="gi-table" :row-class-name="rowClass">
      <!-- ⭐ 定宽：放在账单明细展开行里时外层表格很宽，用 min-width 会把成色列撑到几千像素 -->
      <el-table-column label="成色" width="170">
        <template #default="{ row, $index }">
          <el-select
            v-if="editable"
            v-model="row.purityId"
            size="small"
            filterable
            placeholder="选择成色"
            style="width:100%"
            @change="onPurityChange(row)"
          >
            <el-option v-for="p in purityOptions" :key="p.id" :label="p.label" :value="p.id">
              <span class="purity-option">
                <span class="color-dot" :style="{ background: p.color }"></span>
                <span>{{ p.label }}</span>
                <span class="purity-rate">{{ fmtPct(p.rate) }}</span>
              </span>
            </el-option>
          </el-select>
          <span v-else>
            <span class="color-dot" :style="{ background: colorOf(row.purityId) }"></span>
            {{ row.purityName || nameOf(row.purityId) || '-' }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="净重(g)" width="110" align="right">
        <template #default="{ row }">
          <el-input-number
            v-if="editable"
            v-model="row.netWeight"
            size="small"
            :precision="2"
            :min="0"
            :controls="false"
            style="width:100%"
            @change="recalc(row)"
          />
          <span v-else>{{ fmtW(row.netWeight) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="损耗" width="110" align="center">
        <template #default="{ row }">
          <el-select
            v-if="editable"
            v-model="row.lossRate"
            size="small"
            style="width:100%"
            @change="recalc(row)"
          >
            <el-option v-for="l in lossRateOptions" :key="l.value" :value="l.value" :label="l.label" />
          </el-select>
          <span v-else>{{ num(row.lossRate, 2) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="加耗重" width="95" align="right">
        <template #default="{ row }">{{ fmtW(row.addLossWeight) }}</template>
      </el-table-column>

      <el-table-column label="折算率" width="90" align="right">
        <template #default="{ row }">{{ fmtPct(row.foldRate) }}</template>
      </el-table-column>

      <el-table-column label="折足金" width="100" align="right">
        <template #default="{ row }">{{ fmtW(row.foldWeight) }}</template>
      </el-table-column>

      <el-table-column label="金价" width="110" align="right">
        <template #default="{ row }">
          <el-input-number
            v-if="editable && !priceReadonly"
            v-model="row.goldPrice"
            size="small"
            :precision="2"
            :min="0"
            :controls="false"
            style="width:100%"
            @change="recalc(row)"
          />
          <!-- ⭐ 只读：金价随金价库/订单带出，只显示不可改 -->
          <span v-else class="gi-price-ro" :title="priceReadonly ? '金价由金价库按成色带出，不可修改' : ''">{{ num(row.goldPrice, 2) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="金额" width="120" align="right">
        <template #default="{ row }">
          <span class="gi-amount">{{ money(row.amount) }}</span>
        </template>
      </el-table-column>

      <el-table-column v-if="editable" label="操作" width="62" align="center">
        <template #default="{ $index }">
          <el-button
            type="danger"
            link
            size="small"
            :disabled="list.length <= 1"
            @click="removeRow($index)"
          >删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="gi-sum">
      <span class="gi-sum-item">净重 <b>{{ fmtW(sum.netWeight) }}</b></span>
      <span class="gi-sum-item">加耗重 <b>{{ fmtW(sum.addLossWeight) }}</b></span>
      <span class="gi-sum-item">折足金 <b>{{ fmtW(sum.foldWeight) }}</b></span>
      <span class="gi-sum-item">综合折算率 <b>{{ fmtPct(sum.foldRate) }}</b></span>
      <span class="gi-sum-item">金料费 <b class="gi-total">{{ money(sum.amount) }}</b></span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  purityOptions: { type: Array, default: () => [] },
  lossRateOptions: { type: Array, default: () => [] },
  editable: { type: Boolean, default: true },
  // ⭐ 金价只读：金价由金价库按「下单日 + 成色」带出，工厂/账单编辑都不该改
  priceReadonly: { type: Boolean, default: false },
  maxItems: { type: Number, default: 5 },
  defaultLossRate: { type: Number, default: 1.01 },
  defaultGoldPrice: { type: Number, default: 0 },
  // ⭐ 标题可定制：「销售金料明细 / 成本金料明细」两块并排时靠它区分
  title: { type: String, default: '金料明细（多成色）' },
  // ⭐ 成本块：标题旁挂红色「成本」标记 + 头部/合计条染红
  costMode: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue', 'change']);

const list = ref([]);
let syncing = false;

const num = (v, d = 2) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(d) : '0.00';
};
const fmtW = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '0.00';
  return n.toFixed(2);
};
const fmtPct = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return (n * 100).toFixed(2) + '%';
};
const money = (v) => '¥' + Number(v || 0).toFixed(2);

const r2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

const purityOf = (id) => props.purityOptions.find(p => Number(p.id) === Number(id));
const nameOf = (id) => purityOf(id)?.label || '';
const colorOf = (id) => purityOf(id)?.color || '#909399';

// ===== 初始化：把外部数据转成内部行（保持响应式） =====
const normalize = (arr) => {
  const src = Array.isArray(arr) && arr.length ? arr : [{}];
  return src.slice(0, props.maxItems).map((x, i) => ({
    seq: i + 1,
    purityId: x.purityId ?? null,
    purityName: x.purityName || '',
    netWeight: Number(x.netWeight || 0),
    lossRate: Number(x.lossRate || props.defaultLossRate),
    addLossWeight: Number(x.addLossWeight || 0),
    foldRate: Number(x.foldRate || 0),
    foldWeight: Number(x.foldWeight || 0),
    goldPrice: Number(x.goldPrice || props.defaultGoldPrice),
    amount: Number(x.amount || 0),
    remark: x.remark || ''
  }));
};

const fillRates = (row) => {
  const p = purityOf(row.purityId);
  if (p && Number(p.rate) > 0) row.foldRate = Number(p.rate);
  if (!row.purityName && p) row.purityName = p.label;
};

const recalc = (row, silent = false) => {
  fillRates(row);
  row.netWeight = r2(row.netWeight);
  if (!(row.lossRate > 0)) row.lossRate = props.defaultLossRate;
  row.addLossWeight = r2(row.netWeight * row.lossRate);
  // 折算率未知时保持 0（等成色字典到齐后再算），不默认按 1 折算，避免金额虚高
  if (!(row.foldRate > 0)) row.foldRate = 0;
  row.foldWeight = r2(row.addLossWeight * (row.foldRate || 0));
  row.goldPrice = r2(row.goldPrice);
  row.amount = r2(row.foldWeight * row.goldPrice);
  if (!silent) emitChange();
};

const onPurityChange = (row) => {
  const p = purityOf(row.purityId);
  if (p) {
    row.purityName = p.label;
    row.foldRate = Number(p.rate) > 0 ? Number(p.rate) : 1;
  }
  recalc(row);
};

const addRow = () => {
  if (list.value.length >= props.maxItems) return;
  const first = list.value[0] || {};
  list.value.push({
    seq: list.value.length + 1,
    purityId: null,
    purityName: '',
    netWeight: 0,
    lossRate: first.lossRate || props.defaultLossRate,
    addLossWeight: 0,
    foldRate: 0,
    foldWeight: 0,
    goldPrice: props.defaultGoldPrice,
    amount: 0,
    remark: ''
  });
  emitChange();
};

const removeRow = (idx) => {
  if (list.value.length <= 1) return;
  list.value.splice(idx, 1);
  list.value.forEach((r, i) => (r.seq = i + 1));
  emitChange();
};

const rowClass = ({ row }) => (row.netWeight > 0 ? '' : 'gi-empty');

// ===== 汇总 =====
const sum = computed(() => {
  const valid = list.value.filter(r => Number(r.netWeight) > 0);
  const net = r2(valid.reduce((s, r) => s + Number(r.netWeight || 0), 0));
  const add = r2(valid.reduce((s, r) => s + Number(r.addLossWeight || 0), 0));
  const fold = r2(valid.reduce((s, r) => s + Number(r.foldWeight || 0), 0));
  const amount = r2(valid.reduce((s, r) => s + Number(r.amount || 0), 0));
  return {
    netWeight: net,
    addLossWeight: add,
    foldWeight: fold,
    amount,
    foldRate: add > 0 ? Math.round((fold / add) * 100) / 100 : 0,
    lossRate: net > 0 ? Math.round((add / net) * 10000) / 10000 : props.defaultLossRate,
    goldPrice: fold > 0 ? Math.round((amount / fold) * 100) / 100 : 0,
    purityLabel: valid.length > 1
      ? [...new Set(valid.map(r => r.purityName).filter(Boolean))].join('+')
      : null,
    purityId: valid.length ? valid[0].purityId : null,
    count: valid.length
  };
});

const emitChange = () => {
  if (syncing) return;
  const clean = list.value.map(r => ({
    seq: r.seq,
    purityId: r.purityId,
    purityName: r.purityName,
    netWeight: Number(r.netWeight || 0),
    lossRate: Number(r.lossRate || 1),
    addLossWeight: Number(r.addLossWeight || 0),
    foldRate: Number(r.foldRate || 1),
    foldWeight: Number(r.foldWeight || 0),
    goldPrice: Number(r.goldPrice || 0),
    amount: Number(r.amount || 0),
    remark: r.remark || ''
  }));
  emit('update:modelValue', clean);
  emit('change', sum.value);
};

// 外部数据变化（打开页面 / 切换订单）→ 重建
watch(
  () => props.modelValue,
  (val) => {
    syncing = true;
    list.value = normalize(val);
    list.value.forEach(r => recalc(r, true));
    syncing = false;
  },
  { immediate: true, deep: false }
);

// 成色字典后到（异步加载）→ 重新取折算率重算
watch(
  () => props.purityOptions,
  (opts) => {
    if (!opts || !opts.length) return;
    let changed = false;
    list.value.forEach(r => {
      if (r.purityId) {
        recalc(r, true);
        changed = true;
      }
    });
    if (changed) emitChange();
  },
  { deep: false }
);

// 金价库带入
watch(
  () => props.defaultGoldPrice,
  (v) => {
    list.value.forEach(r => {
      if (!(r.goldPrice > 0) && v > 0) {
        r.goldPrice = Number(v);
        recalc(r, true);
      }
    });
  }
);

defineExpose({ summary: sum, recalcAll: () => list.value.forEach(r => recalc(r)) });
</script>

<style scoped>
.gold-items { margin-top: 6px; }
.gi-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 2px 6px;
}
.gi-title { font-size: 13px; font-weight: 600; color: #303133; }
.gi-hint { font-size: 12px; color: #909399; }
.gi-add { margin-left: auto; }
.gi-table :deep(.el-table__cell) { padding: 3px 0; }
.gi-table :deep(.cell) { padding: 0 6px; }
.gi-table :deep(.gi-empty .cell) { background: #fff; }
.gi-amount { color: #d64545; font-weight: 600; }
/* ⭐ 金价只读：看起来像禁用输入框，明确「只能看不能改」 */
.gi-price-ro {
  display: block;
  padding: 0 6px;
  line-height: 24px;
  background: #f5f7fa;
  border-radius: 3px;
  color: #606266;
  cursor: not-allowed;
  user-select: none;
}
.gi-sum {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  padding: 6px 8px;
  margin-top: 4px;
  background: #f7f9fc;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}
.gi-sum-item b { color: #303133; font-weight: 600; margin-left: 2px; }
.gi-sum-item .gi-total { color: #d64545; }

/* ⭐ 成本块：整块带红调，和上面的销售块一眼分开 */
.gold-items.is-cost .gi-head {
  background: #fdecec;
  border-left: 3px solid #d64545;
  padding-left: 8px;
  border-radius: 3px;
}
.gold-items.is-cost .gi-title { color: #c0392b; }
.gold-items.is-cost .gi-sum {
  background: #fdf3f3;
  border-color: #fbc4c4;
}
.gold-items.is-cost .gi-sum-item b { color: #c0392b; }
.gi-mode-tag { font-weight: 600; }
.purity-option { display: flex; align-items: center; gap: 6px; }
.purity-rate { margin-left: auto; color: #909399; font-size: 11px; }
.color-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
</style>
