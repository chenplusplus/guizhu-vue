<!-- src/components/LrSheet.vue
     LR 表正文（只读）
       - LR 由订单制作审核通过时自动生成，本组件只渲染，不提供编辑
       - 明细：销售行 + 成本行为一组，组末 2px 红线分隔，成本行显示本组利润
       - 底部：唯一一份汇总（出货 / 利润 / 进销存），进销存可按时间与客户切换
       - 使用方：views/order/lr-detail.vue（详情页）、components/LrPreviewDialog.vue（弹窗）
-->
<template>
  <div class="excel-preview" ref="sheetEl" v-loading="loading">
    <el-empty v-if="!loading && !previewInfo.id" description="未找到该 LR 表" />

    <template v-else>
      <!-- ================= 明细表 ================= -->
      <table class="excel-table main-table">
        <thead>
          <tr>
            <th colspan="29" class="excel-title">支出收入LR表</th>
          </tr>
          <tr class="info-row">
            <th colspan="29" class="info-bar">
              <div class="info-bar-inner">
                <span class="info-item"><span class="info-label">客户：</span><span class="info-value">{{ previewInfo.customerName || '-' }}</span></span>
                <span class="info-item"><span class="info-label">成色：</span><span class="info-value">{{ previewInfo.color || '-' }}</span></span>
                <span class="info-item"><span class="info-label">币种：</span><span class="info-value">RMB</span></span>
                <span class="info-item"><span class="info-label">出货日期：</span><span class="info-value">{{ deliveryDateText }}</span></span>
                <span class="info-item"><span class="info-label">账单号：</span><span class="info-value">{{ previewInfo.billNo || '-' }}</span></span>
              </div>
            </th>
          </tr>
          <tr class="excel-header">
            <th rowspan="2">流水单号</th>
            <th rowspan="2">序号</th>
            <th rowspan="2">品名</th>
            <th rowspan="2">客户</th>
            <th rowspan="2">钻石级别</th>
            <th rowspan="2">颜色</th>
            <th rowspan="2">件数</th>
            <th rowspan="2">手寸/长度</th>
            <th rowspan="2">总重</th>
            <th rowspan="2">净重</th>
            <th rowspan="2">损耗</th>
            <th rowspan="2">加耗重</th>
            <th rowspan="2">金价</th>
            <th rowspan="2">足金料</th>
            <th colspan="5">钻石费用</th>
            <th colspan="5">镶石工费</th>
            <th rowspan="2">包装证书</th>
            <th rowspan="2">版费</th>
            <th rowspan="2">工费</th>
            <th rowspan="2">应收金额</th>
            <th rowspan="2" class="profit-col">本组利润</th>
          </tr>
          <tr class="excel-header">
            <th>粒数</th>
            <th>石重(ct)</th>
            <th>单价(元)</th>
            <th>金额(元)</th>
            <th>镶石工费</th>
            <th>粒数</th>
            <th>石重</th>
            <th>单价(元)</th>
            <th>金额(元)</th>
            <th>镶石工费</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in previewRows"
            :key="idx"
            :class="row.rowType === 'sale' ? 'sale-row' : 'cost-row'"
          >
            <td class="text-center">{{ row.serialNo || '' }}</td>
            <td class="text-center">
              <span :class="row.rowType === 'sale' ? 'seq sale-seq' : 'seq cost-seq'">{{ row.seqDisplay || row.seqNo }}</span>
            </td>
            <td class="text-left">{{ row.productName || '' }}</td>
            <td class="text-center">{{ row.customerName || '' }}</td>
            <td class="text-center">{{ row.diamondLevel || '' }}</td>
            <td class="text-center">{{ row.color || '' }}</td>
            <td class="text-right">{{ row.quantity || '' }}</td>
            <td class="text-center">{{ row.size || '' }}</td>
            <td class="text-right">{{ row.totalWeight || '' }}</td>
            <!-- ⭐ 一件货多成色：净重下面附一行分色明细（单色不显示） -->
            <td class="text-right">
              <template v-if="goldList(row).length > 1">
                <div class="gi-net-total">{{ row.netWeight || '' }}</div>
                <div class="gi-net-split">
                  <span v-for="(it, i) in goldList(row)" :key="i" class="gi-net-item">
                    {{ shortPurity(it.purityName) }} {{ n2(it.netWeight) }}
                  </span>
                </div>
              </template>
              <template v-else>{{ row.netWeight || '' }}</template>
            </td>
            <td class="text-right">{{ row.lossRate || '' }}</td>
            <td class="text-right red-text">{{ row.addLossWeight || '' }}</td>
            <td class="text-right" :title="goldTitle(row)">{{ row.goldPrice || '' }}</td>
            <td class="text-right">{{ row.goldMaterialFee || '' }}</td>
            <td class="text-right">{{ row.stoneQty || '' }}</td>
            <td class="text-right">{{ row.stoneWeight || '' }}</td>
            <td class="text-right">{{ row.stonePrice || '' }}</td>
            <td class="text-right red-text">{{ row.stoneAmount || '' }}</td>
            <td class="text-right">{{ row.stoneSettingFee || '' }}</td>
            <td class="text-right">{{ row.subStoneQty || '' }}</td>
            <td class="text-right">{{ row.subStoneWeight || '' }}</td>
            <td class="text-right">{{ row.subStonePrice || '' }}</td>
            <td class="text-right red-text">{{ row.subStoneAmount || '' }}</td>
            <td class="text-right">{{ row.subStoneSettingFee || '' }}</td>
            <td class="text-right">{{ row.packingFee || '' }}</td>
            <td class="text-right">{{ row.moldFee || '' }}</td>
            <td class="text-right">{{ row.laborFee || '' }}</td>
            <td class="text-right red-text bold">{{ toMoney(row.totalAmount) }}</td>
            <td class="text-right profit-cell">
              <template v-if="row.rowType === 'cost'">{{ toMoney(groupProfit(row.seqNo)) }}</template>
            </td>
          </tr>
          <tr class="total-row">
            <td colspan="6" class="text-left">合计（{{ saleRowCount }} 组）</td>
            <td class="text-right bold">{{ previewTotal.qty }}</td>
            <td></td>
            <td class="text-right">{{ previewTotal.totalWeight }}</td>
            <td class="text-right">{{ previewTotal.netWeight }}</td>
            <td></td>
            <td class="text-right red-text">{{ previewTotal.addLossWeight }}</td>
            <td></td>
            <td class="text-right">{{ previewTotal.goldMaterialFee }}</td>
            <td class="text-right">{{ previewTotal.stoneQty }}</td>
            <td class="text-right">{{ previewTotal.stoneWeight }}</td>
            <td></td>
            <td class="text-right red-text">{{ previewTotal.stoneAmount }}</td>
            <td class="text-right">{{ previewTotal.stoneSettingFee }}</td>
            <td class="text-right">{{ previewTotal.subStoneQty }}</td>
            <td class="text-right">{{ previewTotal.subStoneWeight }}</td>
            <td></td>
            <td class="text-right red-text">{{ previewTotal.subStoneAmount }}</td>
            <td class="text-right">{{ previewTotal.subStoneSettingFee }}</td>
            <td class="text-right">{{ previewTotal.packingFee }}</td>
            <td class="text-right">{{ previewTotal.moldFee }}</td>
            <td class="text-right">{{ previewTotal.laborFee }}</td>
            <td class="text-right red-text bold">{{ previewTotal.totalAmount }}</td>
            <td class="text-right profit-cell">{{ money(totalSummary.totalProfit) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- ================= 底部汇总（唯一一份） ================= -->
      <div class="sum-section">
        <div class="sum-title">
          汇总
          <span>只保留这一份 · 出货 / 利润 / 进销存</span>
        </div>

        <div class="kpis">
          <div class="kpi"><div class="k">本单应收</div><div class="v">{{ money(currSummary.totalAmount) }}</div></div>
          <div class="kpi"><div class="k">本单成本</div><div class="v">{{ money(currSummary.costAmount) }}</div></div>
          <div class="kpi"><div class="k">本单利润</div><div class="v red">{{ money(currSummary.totalProfit) }}</div></div>
          <div class="kpi"><div class="k">上单尚欠</div><div class="v red">{{ money(prevSummary.debt) }}</div></div>
          <div class="kpi"><div class="k">应收总金额（尚欠）</div><div class="v red">{{ money(totalSummary.debt) }}</div></div>
          <div class="kpi"><div class="k">累计支出平衡</div><div class="v blue">{{ money(totalSummary.net) }}</div></div>
        </div>

        <div class="sum-grid">
          <!-- 左：出货 + 利润 -->
          <div class="panel">
            <div class="panel-h">
              <span>出货汇总（按成色）</span>
              <span class="hint">上单 = 本单之前全部 LR</span>
            </div>
            <div class="panel-body">
              <table class="sub-table">
                <thead>
                  <tr>
                    <th>成色</th>
                    <th>上单净重</th><th>本单净重</th><th>累计净重</th>
                    <th>上单加耗</th><th>本单加耗</th><th>累计加耗</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="cr in colorRows" :key="cr.color">
                    <td class="center color-name">{{ cr.color }}</td>
                    <td class="num" :class="{ zero: !cr.prevNet }">{{ cr.prevNetText }}</td>
                    <td class="num" :class="{ zero: !cr.currNet }">{{ cr.currNetText }}</td>
                    <td class="num">{{ cr.totalNetText }}</td>
                    <td class="num" :class="{ zero: !cr.prevLoss }">{{ cr.prevLossText }}</td>
                    <td class="num" :class="{ zero: !cr.currLoss }">{{ cr.currLossText }}</td>
                    <td class="num">{{ cr.totalLossText }}</td>
                  </tr>
                  <tr class="total">
                    <td class="center">合计</td>
                    <td class="num">{{ colorTotal.prevNet }}</td>
                    <td class="num">{{ colorTotal.currNet }}</td>
                    <td class="num">{{ colorTotal.totalNet }}</td>
                    <td class="num">{{ colorTotal.prevLoss }}</td>
                    <td class="num">{{ colorTotal.currLoss }}</td>
                    <td class="num">{{ colorTotal.totalLoss }}</td>
                  </tr>
                </tbody>
              </table>

              <table class="sub-table profit-table">
                <thead>
                  <tr>
                    <th class="left">利润</th><th>金</th><th>钻石</th><th>镶石</th><th>工费</th><th>合计</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="left">本单</td>
                    <td class="num">{{ money(currSummary.goldProfit) }}</td>
                    <td class="num">{{ money(currSummary.diamondProfit) }}</td>
                    <td class="num">{{ money(currSummary.settingProfit) }}</td>
                    <td class="num">{{ money(currSummary.laborProfit) }}</td>
                    <td class="num red bold">{{ money(currSummary.totalProfit) }}</td>
                  </tr>
                  <tr>
                    <td class="left">累计</td>
                    <td class="num">{{ money(totalSummary.goldProfit) }}</td>
                    <td class="num">{{ money(totalSummary.diamondProfit) }}</td>
                    <td class="num">{{ money(totalSummary.settingProfit) }}</td>
                    <td class="num">{{ money(totalSummary.laborProfit) }}</td>
                    <td class="num blue bold">{{ money(totalSummary.totalProfit) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 右：进销存 -->
          <div class="panel">
            <div class="panel-h">
              <span>进销存汇总</span>
              <span class="hint">入库 = 花销 / 出库 = 收款</span>
            </div>
            <div class="filter-bar">
              <span class="lab">时间</span>
              <el-radio-group v-model="inout.time" size="small" @change="loadInout">
                <el-radio-button value="current">本单日</el-radio-button>
                <el-radio-button value="total">累计</el-radio-button>
              </el-radio-group>
              <span class="lab">客户</span>
              <el-radio-group v-model="inout.customer" size="small" @change="loadInout">
                <el-radio-button value="own">本单客户</el-radio-button>
                <el-radio-button value="all">全部客户</el-radio-button>
              </el-radio-group>
            </div>

            <div class="panel-body">
              <div class="sub-label">材料</div>
              <table class="sub-table">
                <thead>
                  <tr>
                    <th rowspan="2" class="left">类别</th>
                    <th colspan="2">入库（采购·支出）</th>
                    <th colspan="2">出库（售出·收入）</th>
                    <th rowspan="2">净额</th>
                  </tr>
                  <tr>
                    <th>重量(加耗)</th><th>金额</th><th>重量(加耗)</th><th>金额</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="left">金（g）</td>
                    <td class="num" :class="{ zero: !inoutData.gold.inAmt }">{{ n2(inoutData.gold.inQty) }}</td>
                    <td class="num" :class="{ zero: !inoutData.gold.inAmt }">{{ money(inoutData.gold.inAmt) }}</td>
                    <td class="num">{{ n2(inoutData.gold.outQty) }}</td>
                    <td class="num" :class="{ zero: !inoutData.gold.outAmt }">{{ money(inoutData.gold.outAmt) }}</td>
                    <td class="num" :class="inoutData.gold.outAmt - inoutData.gold.inAmt >= 0 ? 'red' : 'blue'">
                      {{ money(inoutData.gold.outAmt - inoutData.gold.inAmt) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="left">钻石（ct）</td>
                    <td class="num" :class="{ zero: !inoutData.diamond.inAmt }">{{ n2(inoutData.diamond.inQty) }}</td>
                    <td class="num" :class="{ zero: !inoutData.diamond.inAmt }">{{ money(inoutData.diamond.inAmt) }}</td>
                    <td class="num">{{ n2(inoutData.diamond.outQty) }}</td>
                    <td class="num" :class="{ zero: !inoutData.diamond.outAmt }">{{ money(inoutData.diamond.outAmt) }}</td>
                    <td class="num" :class="inoutData.diamond.outAmt - inoutData.diamond.inAmt >= 0 ? 'red' : 'blue'">
                      {{ money(inoutData.diamond.outAmt - inoutData.diamond.inAmt) }}
                    </td>
                  </tr>
                  <tr class="total">
                    <td class="left">小计</td>
                    <td class="num">—</td>
                    <td class="num">{{ money(inoutData.gold.inAmt + inoutData.diamond.inAmt) }}</td>
                    <td class="num">—</td>
                    <td class="num">{{ money(inoutData.gold.outAmt + inoutData.diamond.outAmt) }}</td>
                    <td class="num">{{ money(inoutData.gold.outAmt + inoutData.diamond.outAmt - inoutData.gold.inAmt - inoutData.diamond.inAmt) }}</td>
                  </tr>
                </tbody>
              </table>

              <div class="sub-label">费用</div>
              <table class="sub-table">
                <thead>
                  <tr>
                    <th class="left">类别</th><th>收入</th><th>支出</th><th>净额</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="left">杂项</td>
                    <td class="num" :class="{ zero: !inoutData.fee.income }">{{ money(inoutData.fee.income) }}</td>
                    <td class="num" :class="{ zero: !inoutData.fee.expense }">{{ money(inoutData.fee.expense) }}</td>
                    <td class="num" :class="inoutData.fee.net >= 0 ? 'red' : 'blue'">{{ money(inoutData.fee.net) }}</td>
                  </tr>
                </tbody>
              </table>

              <div class="fund-strip">
                <span>资金合计</span>
                <span>收入 <b class="red">{{ money(inoutData.total.income) }}</b></span>
                <span>支出 <b>{{ money(inoutData.total.expense) }}</b></span>
                <span>净额 <b :class="inoutData.total.net >= 0 ? 'red' : 'blue'">{{ money(inoutData.total.net) }}</b></span>
              </div>

              <div class="scope-note">{{ inoutNote }}</div>
            </div>
          </div>
        </div>

        <div class="check-bar">{{ payTip }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { getLrTable, exportLr, getLrThreePeriod, getLrInoutSummary } from '@/api/lr';
import { COLOR_BASE, normalizeColor } from '@/utils/color';

const props = defineProps({
  lrId: { type: [Number, String], default: null },
  lrData: { type: Object, default: null },
  rows: { type: Array, default: null },
  auto: { type: Boolean, default: true },
});

const loading = ref(false);
const fetchedInfo = ref(null);
const fetchedRows = ref([]);

// 全公司口径三栏（后端 CompanyLedgerService）
const three = ref(null);
const emptyPeriod = { income: 0, expense: 0, net: 0, saleAmount: 0, costAmount: 0, qty: 0, lrCount: 0, received: 0, debt: 0 };
const period = (k) => (three.value && three.value[k]) || emptyPeriod;

// 进销存汇总（按时间 / 客户切换）
const inout = reactive({ time: 'current', customer: 'own' });
const emptyInout = {
  gold: { inQty: 0, inAmt: 0, outQty: 0, outAmt: 0 },
  diamond: { inQty: 0, inAmt: 0, outQty: 0, outAmt: 0 },
  fee: { income: 0, expense: 0, net: 0 },
  total: { income: 0, expense: 0, net: 0 },
};
const inoutData = ref(JSON.parse(JSON.stringify(emptyInout)));

const money = (v) => (Number(v) || 0).toFixed(2);
const n3 = (v) => (Number(v) || 0).toFixed(3);
const n2 = (v) => (Number(v) || 0).toFixed(2);
const toMoney = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  return isNaN(num) ? '' : num.toFixed(2);
};

const previewInfo = computed(() => props.lrData || fetchedInfo.value || {});

// ===== ⭐ 一件货多成色：LR 行上带的分色快照（只读展示，不参与任何金额计算）=====
const goldList = (row) =>
  (row && Array.isArray(row.goldItemList) ? row.goldItemList : [])
    .filter((x) => Number(x.netWeight) > 0);

// '18K金' → '18K'，'足金999' 保持原样，标签更短一行放得下
const shortPurity = (name) => {
  const s = String(name || '').trim();
  if (!s) return '';
  return /^\d+(\.\d+)?K金$/i.test(s) ? s.replace(/金$/, '') : s;
};

// 多成色时金价是加权反算值，悬停给出各成色单价
const goldTitle = (row) => {
  const list = goldList(row);
  if (list.length <= 1) return '';
  return list
    .map((it) => `${it.purityName || '-'}：${n2(it.netWeight)}g × 损耗 ${it.lossRate} = ${n2(it.addLossWeight)}g，折足 ${n2(it.foldWeight)}g，金价 ${n2(it.goldPrice)}，金额 ${n2(it.amount)}`)
    .join('\n');
};

const deliveryDateText = computed(() => {
  const i = previewInfo.value || {};
  const raw = i.deliveryDate || i.createdAt;
  if (!raw) return '-';
  return String(raw).replace('T', ' ').slice(0, 10);
});

// 明细排序：序号 → 销售行在前 → sortOrder
const previewRows = computed(() => {
  const source = (props.rows && props.rows.length)
    ? props.rows
    : ((props.lrData?.rows?.length) ? props.lrData.rows : fetchedRows.value);
  const rows = (source || []).slice();
  const num = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));
  if (rows.every(r => num(r.seqNo) !== null)) {
    return rows.sort((a, b) => {
      const sa = num(a.seqNo), sb = num(b.seqNo);
      if (sa !== sb) return sa - sb;
      const oa = a.rowType === 'sale' ? 0 : 1;
      const ob = b.rowType === 'sale' ? 0 : 1;
      if (oa !== ob) return oa - ob;
      return (num(a.sortOrder) ?? 0) - (num(b.sortOrder) ?? 0);
    });
  }
  const saleRows = rows.filter(r => r.rowType === 'sale');
  const costRows = rows.filter(r => r.rowType === 'cost');
  const out = [];
  for (let i = 0; i < Math.max(saleRows.length, costRows.length); i++) {
    if (saleRows[i]) out.push(saleRows[i]);
    if (costRows[i]) out.push(costRows[i]);
  }
  return out;
});

const saleRowCount = computed(() => previewRows.value.filter(r => r.rowType === 'sale').length);

// 本组利润 = 销售应收 - 成本应收
const groupProfit = (seqNo) => {
  const list = previewRows.value.filter(r => String(r.seqNo) === String(seqNo));
  const sale = list.find(r => r.rowType === 'sale');
  const cost = list.find(r => r.rowType === 'cost');
  return (Number(sale?.totalAmount) || 0) - (Number(cost?.totalAmount) || 0);
};

// 合计
const previewTotal = computed(() => {
  const saleList = previewRows.value.filter(r => r.rowType === 'sale');
  const sum = (prop) => saleList.reduce((s, r) => s + (Number(r[prop]) || 0), 0);
  return {
    qty: sum('quantity'),
    totalWeight: sum('totalWeight').toFixed(2),
    netWeight: sum('netWeight').toFixed(3),
    addLossWeight: sum('addLossWeight').toFixed(3),
    goldMaterialFee: sum('goldMaterialFee').toFixed(2),
    stoneQty: sum('stoneQty'),
    stoneWeight: sum('stoneWeight').toFixed(2),
    stoneAmount: sum('stoneAmount').toFixed(2),
    stoneSettingFee: sum('stoneSettingFee').toFixed(2),
    subStoneQty: sum('subStoneQty'),
    subStoneWeight: sum('subStoneWeight').toFixed(2),
    subStoneAmount: sum('subStoneAmount').toFixed(2),
    subStoneSettingFee: sum('subStoneSettingFee').toFixed(2),
    packingFee: sum('packingFee').toFixed(2),
    moldFee: sum('moldFee').toFixed(2),
    laborFee: sum('laborFee').toFixed(2),
    totalAmount: sum('totalAmount').toFixed(2),
  };
});

// 按成色：上单 / 本单 / 累计
const colorRows = computed(() => {
  const map = new Map();
  const ensure = (color) => {
    const key = color || '未指定';
    if (!map.has(key)) map.set(key, { color: key, prevNet: 0, prevLoss: 0, currNet: 0, currLoss: 0 });
    return map.get(key);
  };
  COLOR_BASE.forEach(c => ensure(c));

  (three.value?.prevColors || []).forEach(c => {
    const it = ensure(normalizeColor(c.color));
    it.prevNet += Number(c.netWeight) || 0;
    it.prevLoss += Number(c.addLossWeight) || 0;
  });

  const liveRows = (props.rows && props.rows.length) ? props.rows.filter(r => r.rowType === 'sale') : null;
  if (liveRows) {
    liveRows.forEach(r => {
      const it = ensure(normalizeColor(r.color));
      it.currNet += Number(r.netWeight) || 0;
      it.currLoss += Number(r.addLossWeight) || 0;
    });
  } else {
    (three.value?.currentColors || []).forEach(c => {
      const it = ensure(normalizeColor(c.color));
      it.currNet += Number(c.netWeight) || 0;
      it.currLoss += Number(c.addLossWeight) || 0;
    });
  }

  return [...map.values()]
    .filter(it => it.prevNet || it.currNet || it.prevLoss || it.currLoss)
    .map(it => ({
      ...it,
      prevNetText: n3(it.prevNet),
      currNetText: n3(it.currNet),
      totalNetText: n3(it.prevNet + it.currNet),
      prevLossText: n3(it.prevLoss),
      currLossText: n3(it.currLoss),
      totalLossText: n3(it.prevLoss + it.currLoss),
    }));
});

const colorTotal = computed(() => {
  const t = colorRows.value.reduce((a, r) => ({
    prevNet: a.prevNet + r.prevNet,
    currNet: a.currNet + r.currNet,
    prevLoss: a.prevLoss + r.prevLoss,
    currLoss: a.currLoss + r.currLoss,
  }), { prevNet: 0, currNet: 0, prevLoss: 0, currLoss: 0 });
  return {
    prevNet: n3(t.prevNet),
    currNet: n3(t.currNet),
    totalNet: n3(t.prevNet + t.currNet),
    prevLoss: n3(t.prevLoss),
    currLoss: n3(t.currLoss),
    totalLoss: n3(t.prevLoss + t.currLoss),
  };
});

const currSummary = computed(() => {
  const saleList = previewRows.value.filter(r => r.rowType === 'sale');
  const costList = previewRows.value.filter(r => r.rowType === 'cost');
  const sum = (list, prop) => list.reduce((s, r) => s + (Number(r[prop]) || 0), 0);
  const sumSetting = (list) => list.reduce((s, r) => s + (Number(r.stoneQty) || 0) * (Number(r.stoneSettingFee) || 0) + (Number(r.subStoneQty) || 0) * (Number(r.subStoneSettingFee) || 0), 0);

  const saleStone = sum(saleList, 'stoneAmount') + sum(saleList, 'subStoneAmount');
  const costStone = sum(costList, 'stoneAmount') + sum(costList, 'subStoneAmount');
  const saleTotal = sum(saleList, 'totalAmount');
  const costTotal = sum(costList, 'totalAmount');
  const c = period('current');

  const goldProfit = saleTotal - costTotal
    - (saleStone - costStone)
    - (sumSetting(saleList) - sumSetting(costList))
    - (sum(saleList, 'laborFee') - sum(costList, 'laborFee'));

  return {
    diamondProfit: saleStone - costStone,
    settingProfit: sumSetting(saleList) - sumSetting(costList),
    laborProfit: sum(saleList, 'laborFee') - sum(costList, 'laborFee'),
    goldProfit,
    totalProfit: saleTotal - costTotal,
    totalAmount: Number(c.saleAmount) || saleTotal,
    costAmount: Number(c.costAmount) || costTotal,
  };
});

const prevSummary = computed(() => {
  const p = period('prev');
  return {
    debt: Number(p.debt) || 0,
    lrCount: Number(p.lrCount) || 0,
    saleAmount: Number(p.saleAmount) || 0,
    received: Number(p.received) || 0,
  };
});

const totalSummary = computed(() => {
  const t = period('total');
  return {
    diamondProfit: Number(t.diamondProfit) || 0,
    settingProfit: Number(t.settingProfit) || 0,
    laborProfit: Number(t.laborProfit) || 0,
    totalProfit: Number(t.totalProfit) || 0,
    goldProfit: Number(t.goldProfit) || 0,
    income: Number(t.income) || 0,
    expense: Number(t.expense) || 0,
    net: Number(t.net) || 0,
    debt: Number(three.value?.totalReceivable) || 0,
  };
});

const inoutNote = computed(() => {
  const timeText = inout.time === 'current'
    ? `本单日 ${String(three.value?.billDate || previewInfo.value?.createdAt || '').slice(0, 10)}`
    : '截至本单日累计';
  const custText = inout.customer === 'own'
    ? `仅 ${previewInfo.value?.customerName || '本单客户'}`
    : '全部客户';
  const tail = inout.customer === 'own'
    ? '采购入库无客户归属，选中客户时不计入；金额只算进销存单据，账单成品出货见左侧出货汇总。'
    : '全公司口径，采购入库按整体统计。';
  return `${timeText} · ${custText}。${tail}`;
});

const payTip = computed(() => {
  const p = prevSummary.value;
  const c = currSummary.value;
  const t = totalSummary.value;
  return `上单（全公司，本单之前 ${p.lrCount} 张）：应收 ¥${money(p.saleAmount)} / 已收 ¥${money(p.received)} / 尚欠 ¥${money(p.debt)}`
    + `　｜　本单：应收 ¥${money(c.totalAmount)}，利润 ¥${money(c.totalProfit)}`
    + `　｜　累计收入 ¥${money(t.income)} − 累计开支 ¥${money(t.expense)} = 支出平衡 ¥${money(t.net)}`
    + `　｜　应收总金额 ¥${money(t.debt)}`;
});

// ===== 数据加载 =====
const loadInout = async () => {
  const info = previewInfo.value || {};
  const params = {
    timeScope: inout.time,
    customerScope: inout.customer,
  };
  if (info.id) params.lrId = info.id;
  else if (info.billId) params.billId = info.billId;
  else if (props.lrId) params.lrId = props.lrId;
  else return;

  try {
    const res = await getLrInoutSummary(params);
    inoutData.value = res?.data || JSON.parse(JSON.stringify(emptyInout));
  } catch (e) {
    console.error('加载进销存汇总失败:', e);
    inoutData.value = JSON.parse(JSON.stringify(emptyInout));
  }
};

const loadData = async () => {
  if (!props.lrData && props.lrId) {
    loading.value = true;
    try {
      const res = await getLrTable(props.lrId);
      fetchedInfo.value = res?.data || null;
      fetchedRows.value = res?.data?.rows || [];
    } catch (e) {
      console.error('加载LR表失败:', e);
      ElMessage.error('加载 LR 数据失败');
    } finally {
      loading.value = false;
    }
  }

  const tryLoad = async (params) => {
    try {
      const res = await getLrThreePeriod(params);
      if (res?.data) { three.value = res.data; return true; }
    } catch (e) { /* 参数不匹配时换一种再试 */ }
    return false;
  };

  const info = previewInfo.value || {};
  if (info.id) {
    if (!await tryLoad({ lrId: info.id }) && info.billId) await tryLoad({ billId: info.billId });
  } else if (info.billId) {
    await tryLoad({ billId: info.billId });
  } else if (props.lrId) {
    await tryLoad({ lrId: props.lrId });
  }

  await loadInout();
};

const doExport = async () => {
  const lrId = previewInfo.value?.id;
  if (!lrId) {
    ElMessage.warning('LR表ID无效，无法导出');
    return;
  }
  try {
    const response = await exportLr(lrId);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `支出收入LR表_${previewInfo.value?.billNo || lrId}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (e) {
    console.error('导出失败:', e);
    ElMessage.error(e?.message || '导出失败');
  }
};

const sheetEl = ref(null);

onMounted(() => {
  if (props.auto) loadData();
});

watch(() => props.lrId, () => {
  if (props.lrId) loadData();
});

defineExpose({ loadData, doExport, previewInfo });
</script>

<style scoped>
.excel-preview {
  font-family: '宋体', SimSun, sans-serif;
  font-size: 12px;
  color: #000;
  overflow-x: auto;
  padding-bottom: 6px;
}
/* ⭐ 横向滚动条：与账单页一致的加高蓝条，常显可拖 */
.excel-preview::-webkit-scrollbar { height: 14px; }
.excel-preview::-webkit-scrollbar-track { background: #e8f1ff; border-top: 1px solid #c6dcff; }
.excel-preview::-webkit-scrollbar-thumb {
  background: #2f6fd0; border-radius: 7px; border: 2px solid #e8f1ff;
}
.excel-preview::-webkit-scrollbar-thumb:hover { background: #1f5bb8; }

/* ================= 明细表 ================= */
.excel-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #000;
  min-width: 1620px;
}
.excel-table th,
.excel-table td {
  border: 1px solid #000;
  padding: 4px 4px;
  vertical-align: middle;
  font-size: 11.5px;
  font-weight: normal;
  white-space: nowrap;
}

/* ⭐ 一件货多成色：净重格里的分色小字 */
.gi-net-total {
  line-height: 1.15;
}
.gi-net-split {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 1px;
  line-height: 1.15;
}
.gi-net-item {
  font-size: 9.5px;
  color: #6b7280;
  letter-spacing: 0;
}
.excel-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  padding: 10px 0;
  letter-spacing: 4px;
}
.info-row th {
  border: none;
  padding: 6px 10px;
  font-weight: normal;
  text-align: left;
}
.info-bar-inner {
  display: flex;
  align-items: center;
}
.info-bar-inner .info-item {
  flex: 1 1 20%;
  white-space: nowrap;
}
.info-row .info-label { font-weight: 500; color: #444; }
.info-row .info-value { font-weight: 600; margin-left: 4px; }
.excel-header { text-align: center; font-weight: 500; }

.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.red-text { color: #d64545; }
.blue-text { color: #2b6cb0; }
.bold { font-weight: bold; }

.sale-row { background: #fff; }
.cost-row { background: #eaf2fb; }
.cost-row td { color: #0b3d66; }

/* ⭐ 每组结束：2px 红线分隔 */
.cost-row td {
  border-bottom: 2px solid #d64545;
}

.seq { font-weight: 600; }
.sale-seq { color: #1d2129; }
.cost-seq { color: #2b6cb0; }

.profit-col { background: #fdf0ee; color: #c0392b; }
.profit-cell { font-weight: 700; color: #d64545; }

.total-row {
  background: #f5f5f5;
  font-weight: 500;
}
.total-row td { border-top: 2px solid #000; }

/* ================= 底部汇总 ================= */
.sum-section {
  margin-top: 18px;
  border: 1px solid #d9dee7;
  border-radius: 6px;
  background: #fff;
  padding: 12px 14px 14px;
  font-family: -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.sum-title {
  font-size: 14px;
  font-weight: 650;
  color: #1d2129;
  margin-bottom: 10px;
}
.sum-title span {
  font-size: 12px;
  font-weight: 400;
  color: #8a94a3;
  margin-left: 8px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}
.kpi {
  border: 1px solid #e2e7ef;
  border-radius: 5px;
  padding: 8px 10px;
  background: #fbfcfe;
}
.kpi .k { font-size: 11.5px; color: #6b7785; }
.kpi .v {
  font-size: 15px;
  font-weight: 650;
  margin-top: 2px;
  font-family: Consolas, monospace;
  color: #1d2129;
}
.kpi .v.red { color: #d64545; }
.kpi .v.blue { color: #2b6cb0; }

.sum-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(520px, 1fr));
  gap: 12px;
  align-items: start;
}
.panel {
  border: 1px solid #e2e7ef;
  border-radius: 6px;
  overflow: hidden;
}
.panel-h {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: #f7f9fc;
  border-bottom: 1px solid #e2e7ef;
  font-weight: 600;
  font-size: 12.5px;
}
.panel-h .hint { font-weight: 400; color: #8a94a3; font-size: 11.5px; }
.panel-body { padding: 8px 10px 10px; }

.sub-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.sub-table th,
.sub-table td {
  border: 1px solid #e2e7ef;
  padding: 4px 7px;
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
}
.sub-table th { background: #fbfcfe; color: #475569; font-weight: 600; text-align: center; }
.sub-table th.left { text-align: left; }
.sub-table td.center { text-align: center; }
.sub-table td.num { text-align: right; font-family: Consolas, monospace; }
.sub-table td.left { text-align: left; }
.sub-table td.zero { color: #c3cad4; }
.sub-table tr.total td { background: #f7f9fc; font-weight: 650; }
.sub-table .color-name { color: #2b6cb0; font-weight: 600; }
.sub-table .red { color: #d64545; }
.sub-table .blue { color: #2b6cb0; }
.sub-table .bold { font-weight: 700; }

.profit-table { margin-top: 8px; }

.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 7px 10px;
  border-bottom: 1px solid #e2e7ef;
  background: #fcfdff;
}
.filter-bar .lab { font-size: 11.5px; color: #6b7785; }

.sub-label {
  font-size: 11.5px;
  color: #6b7785;
  margin: 2px 0 4px;
}

.fund-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding: 8px 10px;
  background: #f7f9fc;
  border: 1px solid #e2e7ef;
  border-radius: 4px;
  font-size: 12px;
}
.fund-strip b { font-family: Consolas, monospace; font-size: 13px; }
.fund-strip .red { color: #d64545; }
.fund-strip .blue { color: #2b6cb0; }

.scope-note {
  margin-top: 8px;
  padding: 6px 9px;
  background: #fffdf5;
  border: 1px solid #f0e6c8;
  border-radius: 4px;
  color: #8a6d3b;
  font-size: 11.5px;
  line-height: 1.7;
  white-space: normal;
}

.check-bar {
  margin-top: 10px;
  padding: 8px 10px;
  background: #fdf6ec;
  border-radius: 4px;
  color: #8a6d3b;
  font-size: 12px;
  line-height: 1.7;
}
</style>
