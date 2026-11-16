<!-- src/components/CostCompareTable.vue
     ⭐ 销售 / 成本 对比表（只读）
     - 与「编辑订单」页的「成本数据（LR 成本行）」表格完全同构：
       销售行（白底）+ 黄色填充间隔行 + 成本行（红底）
     - 列顺序、列宽、标签一律照搬，只把输入框换成只读文本
     - 数据来自 GET /api/order/cost/{orderId} → { sale, cost, hasCost, warns }
       cost 为空时后端已按「与销售一致」克隆，这里同样回退
     - 用于：制作完成审核页的明细展开行（审核员看，不可改）
-->
<template>
  <div class="cost-compare" :class="{ 'is-large': large }" v-loading="loading">
    <!-- 顶部状态条 -->
    <div class="cc-bar">
      <span v-if="!hideTitle" class="cc-title">📊 销售 / 成本 对比</span>
      <el-tag v-if="warns.length" type="danger" effect="dark" size="small">
        ❗ 成本高于销售（{{ warns.length }} 项）
      </el-tag>
      <el-tag v-else-if="!hasCost" type="info" size="small">成本未录入（默认与销售一致）</el-tag>
      <el-tag v-else type="success" size="small">成本已录入</el-tag>
      <span class="cc-spacer"></span>
      <span class="cc-sum">
        销售 <b class="c-sale">¥{{ saleAmount.toFixed(2) }}</b>
      </span>
      <span class="cc-sum">
        成本 <b class="c-cost">¥{{ costAmount.toFixed(2) }}</b>
      </span>
      <span class="cc-profit">
        利润
        <b :class="profit >= 0 ? 'p-ok' : 'p-bad'">
          ¥{{ profit.toFixed(2) }}
        </b>
      </span>
      <span class="cc-margin" v-if="saleAmount > 0">
        毛利率 <b :class="profit >= 0 ? 'p-ok' : 'p-bad'">{{ ((profit / saleAmount) * 100).toFixed(1) }}%</b>
      </span>
    </div>

    <div class="cc-scroll">
      <el-table
        :data="tableData"
        border
        :fit="false"
        :size="large ? 'default' : 'small'"
        class="cost-table"
        :row-class-name="rowClassName"
        :cell-class-name="cellClassName"
        :span-method="spanMethod"
      >
        <el-table-column label="类型" :width="large ? 110 : 96" fixed align="center">
          <template #default="{ row }">
            <el-tag v-if="row.__type === 'sale'" size="small" type="info">销售</el-tag>
            <span v-else-if="row.__type === 'cost'" class="cost-type-cell">
              <el-tooltip v-if="warns.length" :content="warnReason" placement="top">
                <span class="cost-warn-icon">❗</span>
              </el-tooltip>
              <el-tag size="small" type="danger" effect="dark">成本</el-tag>
            </span>
          </template>
        </el-table-column>

        <!-- ⭐ 一件货多成色：分色列出净重，单成色显示成色名 -->
        <el-table-column label="成色" :width="large ? 150 : 136" align="left">
          <template #default="{ row }">
            <!-- ⭐ 老单没有分色子表：回退到 color -->
            <div v-if="!goldList(row).length" class="gi-none">{{ row.color || '-' }}</div>
            <div v-else class="gi-lines">
              <div v-for="(it, i) in goldList(row)" :key="i" class="gi-line">
                <span class="gi-name">{{ it.purityName || '-' }}</span>
                <span class="gi-w">{{ fmtW(it.netWeight) }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="quantity" label="件数" width="70" align="center" />
        <el-table-column prop="totalWeight" label="总重" width="85" align="center">
          <template #default="{ row }">{{ fmtW(row.totalWeight) }}</template>
        </el-table-column>
        <el-table-column prop="netWeight" label="净重" width="85" align="center">
          <template #default="{ row }">{{ fmtW(row.netWeight) }}</template>
        </el-table-column>
        <el-table-column prop="lossRate" label="损耗" width="80" align="center">
          <template #default="{ row }">{{ row.lossRate ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="addLossWeight" label="加耗重" width="90" align="center">
          <template #default="{ row }"><span class="auto-cell">{{ fmtW(row.addLossWeight) }}</span></template>
        </el-table-column>
        <el-table-column prop="goldPrice" label="金价" width="85" align="center">
          <template #default="{ row }">{{ fmtM(row.goldPrice) }}</template>
        </el-table-column>
        <el-table-column prop="goldMaterialWeight" label="足金料(g)" width="95" align="center">
          <template #default="{ row }"><span class="auto-cell">{{ fmtW(row.goldMaterialWeight) }}</span></template>
        </el-table-column>
        <el-table-column prop="goldMaterialFee" label="足金料金额" width="105" align="center">
          <template #default="{ row }"><span class="auto-cell">{{ fmtM(row.goldMaterialFee) }}</span></template>
        </el-table-column>

        <el-table-column label="主石" align="center">
          <el-table-column prop="stoneWeight" label="石重(ct)" width="92" align="center">
            <template #default="{ row }">{{ fmtW(row.stoneWeight) }}</template>
          </el-table-column>
          <el-table-column prop="stonePrice" label="单价" width="85" align="center">
            <template #default="{ row }">{{ fmtM(row.stonePrice) }}</template>
          </el-table-column>
          <el-table-column prop="stoneQty" label="粒数" width="70" align="center">
            <template #default="{ row }">{{ row.stoneQty ?? '-' }}</template>
          </el-table-column>
          <el-table-column prop="stoneSettingFee" label="镶石工费" width="90" align="center">
            <template #default="{ row }">{{ fmtM(row.stoneSettingFee) }}</template>
          </el-table-column>
          <el-table-column prop="stoneAmount" label="金额" width="95" align="center">
            <template #default="{ row }"><span class="auto-cell">{{ fmtM(row.stoneAmount) }}</span></template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="副石" align="center">
          <el-table-column prop="subStoneWeight" label="石重(ct)" width="88" align="center">
            <template #default="{ row }">{{ fmtW(row.subStoneWeight) }}</template>
          </el-table-column>
          <el-table-column prop="subStonePrice" label="单价" width="80" align="center">
            <template #default="{ row }">{{ fmtM(row.subStonePrice) }}</template>
          </el-table-column>
          <el-table-column prop="subStoneQty" label="粒数" width="65" align="center">
            <template #default="{ row }">{{ row.subStoneQty ?? '-' }}</template>
          </el-table-column>
          <el-table-column prop="subStoneSettingFee" label="镶石工费" width="85" align="center">
            <template #default="{ row }">{{ fmtM(row.subStoneSettingFee) }}</template>
          </el-table-column>
          <el-table-column prop="subStoneAmount" label="金额" width="90" align="center">
            <template #default="{ row }"><span class="auto-cell">{{ fmtM(row.subStoneAmount) }}</span></template>
          </el-table-column>
        </el-table-column>

        <el-table-column prop="packingFee" label="包装费" width="82" align="center">
          <template #default="{ row }">{{ fmtM(row.packingFee) }}</template>
        </el-table-column>
        <el-table-column prop="certificateFee" label="证书费" width="82" align="center">
          <template #default="{ row }">{{ fmtM(row.certificateFee) }}</template>
        </el-table-column>
        <el-table-column prop="postageFee" label="邮费" width="80" align="center">
          <template #default="{ row }">{{ fmtM(row.postageFee) }}</template>
        </el-table-column>
        <el-table-column prop="moldFee" label="版费" width="80" align="center">
          <template #default="{ row }">{{ fmtM(row.moldFee) }}</template>
        </el-table-column>
        <el-table-column prop="laborFee" label="工费" width="80" align="center">
          <template #default="{ row }">{{ fmtM(row.laborFee) }}</template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="应收/成本合计" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <span class="auto-cell" :class="{ 'cost-total-text': row.__type === 'cost' }">
              {{ fmtM(row.totalAmount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="利润" width="100" align="center" class-name="profit-column" fixed="right">
          <template #default="{ row }">
            <span v-if="row.__type === 'sale'" class="profit-cell" :class="profit >= 0 ? 'p-ok' : 'p-bad'">
              {{ fmtM(profit) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="warns.length" class="cost-warn-tip">
      <span class="cost-warn-icon">❗</span>
      <div>
        <div class="cost-warn-title">成本高于销售，请复核：</div>
        <div v-for="(w, i) in warns" :key="i" class="cost-warn-item">{{ w.text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 销售行：GET /api/order/cost/{id} → data.sale
  sale: { type: Object, default: () => ({}) },
  // 成本行：GET /api/order/cost/{id} → data.cost（未录入时后端返回销售克隆）
  cost: { type: Object, default: () => ({}) },
  hasCost: { type: Boolean, default: false },
  // 预警明细：[{ field, label, text }]
  warns: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  large: { type: Boolean, default: false },
  // 外层已有区块标题时隐藏内置标题
  hideTitle: { type: Boolean, default: false },
});

const saleRow = computed(() => props.sale || {});
const costRow = computed(() => (props.cost && Object.keys(props.cost).length ? props.cost : props.sale) || {});

const tableData = computed(() => [
  { ...saleRow.value, __type: 'sale' },
  { __type: 'gap' },
  { ...costRow.value, __type: 'cost' },
]);

const saleAmount = computed(() => Number(saleRow.value.totalAmount) || 0);
const costAmount = computed(() => Number(costRow.value.totalAmount) || 0);
const profit = computed(() => parseFloat((saleAmount.value - costAmount.value).toFixed(2)));

// 成本行超出项（与后端 warns 的 field 一一对应）
const overSet = computed(() => new Set((props.warns || []).map(w => w.field)));
const warnReason = computed(() => (props.warns || []).map(w => w.text).join('；'));

const rnd2 = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return 0;
  return Math.round((Math.abs(n) + 1e-9) * 100) / 100 * Math.sign(n);
};
const fmtW = (v) => (v === null || v === undefined || v === '' ? '-' : rnd2(v).toFixed(2));
const fmtM = (v) => (v === null || v === undefined || v === '' ? '-' : Number(v).toFixed(2));

const rowClassName = ({ row }) => {
  if (row.__type === 'gap') return 'cost-gap-row';
  return row.__type === 'cost' ? 'cost-row-red' : 'sale-row-white';
};

// ⭐ 一件货多成色：该行的分色净重明细（空行如 gap 行返回空数组）
const goldList = (row) =>
  (row && Array.isArray(row.goldItems) ? row.goldItems : [])
    .filter((x) => Number(x.netWeight) > 0);

// 成本行中「成本 > 销售」的单元格标红
const cellClassName = ({ row, column }) => {
  if (row.__type !== 'cost') return '';
  const key = column.property;
  return key && overSet.value.has(key) ? 'over-cell' : '';
};

// 利润列纵向合并三行（与编辑页一致）
const spanMethod = ({ rowIndex, column }) => {
  if (column.label !== '利润') return;
  if (rowIndex === 0) return { rowspan: 3, colspan: 1 };
  return { rowspan: 0, colspan: 0 };
};
</script>

<style scoped>
.cost-compare { width: 100%; }

/* ⭐ 一件货多成色：成色列分色列出 */
.gi-lines {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.35;
}
.gi-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  white-space: nowrap;
}
.gi-line .gi-name { color: #303133; }
.gi-line .gi-w { color: #606266; font-variant-numeric: tabular-nums; }
.gi-none { color: #c0c4cc; text-align: center; }

.cc-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  margin-bottom: 6px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
}
.cc-title { font-weight: 600; color: #303133; }
.cc-spacer { flex: 1; }
.cc-sum { color: #606266; }
.cc-sum b { font-family: Consolas, Monaco, monospace; font-size: 13px; }
.c-sale { color: #1f9254; }
.c-cost { color: #c0392b; }
.cc-profit b, .cc-margin b { font-family: Consolas, Monaco, monospace; font-size: 14px; }
.p-ok { color: #1f9254; }
.p-bad { color: #d64545; }
.is-large .cc-bar { font-size: 15px; padding: 10px 14px; }
.is-large .cc-sum b { font-size: 15px; }
.is-large .cc-profit b, .is-large .cc-margin b { font-size: 18px; }

/* 表格宽度大：交给 el-table 内部横向滚动，右侧「合计 / 利润」固定可见 */
.cc-scroll { width: 100%; }

.cost-table :deep(.cost-row-red) { background: #fdecec !important; }
.cost-table :deep(.cost-row-red td.el-table__cell) {
  background: #fdecec !important;
  color: #c0392b;
}
.cost-table :deep(.sale-row-white td.el-table__cell) { background: #ffffff; }
/* ⭐ 销售行与成本行之间的分隔行（黄色，更高，预示「销售段结束 / 成本段开始」） */
.cost-table :deep(tr.cost-gap-row > td.el-table__cell) {
  background: #ffe58f !important;
  border-top: 0 !important;
  border-bottom: 0 !important;
  padding: 0 !important;
  height: 18px !important;
}
.cost-table :deep(tr.cost-gap-row > td.el-table__cell .cell) { display: none; }

.cost-table :deep(.cell) { padding: 3px 4px; }
.cost-table :deep(.over-cell) { background: #fef0f0 !important; }
.cost-table :deep(.over-cell .cell) { color: #f56c6c !important; font-weight: 700; }

.auto-cell { color: #606266; font-family: Consolas, Monaco, monospace; }
.cost-total-text { color: #c0392b !important; font-weight: 600; }
.profit-cell { font-weight: 600; font-family: Consolas, Monaco, monospace; }
.cost-table :deep(.profit-column) { vertical-align: middle; text-align: center; }
.cost-type-cell { display: inline-flex; align-items: center; gap: 4px; }

.cost-warn-icon {
  color: #f56c6c;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  cursor: help;
}
.cost-warn-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 6px;
}
.cost-warn-title { font-size: 13px; font-weight: 600; color: #c0392b; }
.cost-warn-item { font-size: 12px; color: #c0392b; line-height: 1.8; }

.is-large .cost-table :deep(.el-table__cell) { font-size: 14px; }
.is-large .cost-table :deep(.el-table__header .el-table__cell) { font-size: 14px; font-weight: 700; }
</style>
