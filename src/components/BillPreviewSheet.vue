<!-- src/components/BillPreviewSheet.vue
     出货明细表（Excel 风格）——纯展示组件，可被多个页面复用
     props:
       billData  账单头部信息（客户/成色/日期/状态/底部欠料欠款汇总）
       details   明细行数组
       showViewDetail 是否显示「查看完整详情」按钮（默认 false）
-->
<template>
  <div class="preview-content">
    <div class="bill-sheet" v-if="billData">
      <!-- 大标题 -->
      <div class="sheet-title">出　货　明　细　表</div>

      <!-- 表头信息行 -->
      <div class="sheet-meta">
        <div class="meta-item">
          <span class="meta-label">客户：</span>
          <span class="meta-value">{{ billData.customerName || '—' }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">成色：</span>
          <span class="meta-value">{{ billData.color || 'Au755' }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">币种：</span>
          <span class="meta-value">RMB</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">出货日期：</span>
          <span class="meta-value">{{ formatDate(billData.billDate) }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">状态：</span>
          <el-tag :type="getStatusType(billData.status)" size="small">
            {{ getStatusText(billData.status) }}
          </el-tag>
        </div>
      </div>

      <!-- ⭐ 收款录入条：直接填整单实际收款，自动按行分摊并勾选「已收款」 -->
      <div v-if="receiptMode" class="receipt-toolbar">
        <span class="rt-label">实际收款</span>
        <el-input-number
          v-if="editableReceipt"
          :model-value="totalActual"
          :controls="false"
          :precision="2"
          :min="0"
          size="small"
          class="rt-input"
          @change="onTotalChange"
        />
        <b v-else class="rt-total">¥{{ totalActual.toFixed(2) }}</b>
        <span class="rt-item">应收 <b>¥{{ receivableTotal.toFixed(2) }}</b></span>
        <span class="rt-item">差额 <b :class="{ warn: diffTotal > 0.001 }">¥{{ diffTotal.toFixed(2) }}</b></span>
        <span class="rt-item">
          已收款
          <b :class="{ ok: totalCount > 0 && receivedCount >= totalCount }">{{ receivedCount }}/{{ totalCount }}</b> 行
        </span>
        <span class="rt-spacer"></span>
        <template v-if="editableReceipt">
          <el-button size="small" @click="fillByReceivable">按应收全额</el-button>
          <el-button size="small" @click="clearReceipt">清空</el-button>
        </template>
      </div>

      <!-- 主表格 -->
      <div class="sheet-table-wrapper">
        <el-table
          :data="tableData"
          border
          size="small"
          :row-class-name="rowClassName"
          :cell-style="cellStyle"
          :header-cell-style="headerCellStyle"
          style="width:100%;"
          :span-method="spanMethod"
        >
          <el-table-column prop="serialNo" label="流水单号" width="80" align="center" />
          <el-table-column prop="seqNo" label="序号" width="50" align="center" />
          <el-table-column prop="productName" label="品名" min-width="130" align="left" />
          <el-table-column prop="customerName" label="客户" width="100" align="center">
            <template #default="{ row }">
              <span class="customer-red">{{ row.customerName }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="diamondLevel" label="钻石级别" width="80" align="center" />
          <el-table-column prop="orderDate" label="订单日期" width="90" align="center">
            <template #default="{ row }">{{ formatDate(row.orderDate) }}</template>
          </el-table-column>
          <el-table-column prop="color" label="颜色" width="60" align="center" />
          <el-table-column prop="quantity" label="件数" width="55" align="center" />
          <el-table-column prop="size" label="手寸/长度" width="85" align="center" />
          <el-table-column prop="totalWeight" label="总重" width="70" align="right" />
          <el-table-column prop="netWeight" label="净重" width="70" align="right" />
          <el-table-column prop="lossRate" label="损耗" width="60" align="right" />
          <el-table-column prop="addedWeight" label="加耗重" width="70" align="right" />
          <el-table-column prop="goldPrice" label="金价" width="70" align="right" />
          <el-table-column prop="goldMaterialFee" label="足金料金额" width="80" align="right" />

          <!-- 足金料克重 -->
          <el-table-column
            prop="goldMaterialWeight"
            label="足金料(g)"
            width="100"
            align="right"
          >
            <template #default="{ row }">
              {{ (row.goldMaterialWeight || 0).toFixed(3) }}
            </template>
          </el-table-column>

          <!-- 主石 -->
          <el-table-column label="主石" align="center">
            <el-table-column prop="mainStoneQty" label="粒数" width="55" align="center" />
            <el-table-column prop="mainStoneWeight" label="石重(ct)" width="80" align="right" />
            <el-table-column prop="mainStonePrice" label="单价(元)" width="80" align="right" />
            <el-table-column prop="mainStoneAmount" label="金额(元)" width="85" align="right" />
            <el-table-column prop="mainStoneSettingFee" label="镶石工费" width="85" align="right" />
          </el-table-column>

          <!-- 副石 -->
          <el-table-column label="副石" align="center">
            <el-table-column prop="subStoneQty" label="粒数" width="55" align="center" />
            <el-table-column prop="subStoneWeight" label="石重" width="70" align="right" />
            <el-table-column prop="subStonePrice" label="单价(元)" width="80" align="right" />
            <el-table-column prop="subStoneAmount" label="金额(元)" width="85" align="right" />
            <el-table-column prop="subStoneSettingFee" label="镶石工费" width="85" align="right" />
          </el-table-column>

          <!-- 包装证书邮费 -->
          <el-table-column label="包装证书邮费" width="105" align="right">
            <template #default="{ row }">
              {{ row.rowType === 'detail'
                ? ((row.packingFee || 0) + (row.certificateFee || 0) + (row.postageFee || 0)).toFixed(2)
                : (row.packingCertPostage || 0).toFixed(2) }}
            </template>
          </el-table-column>

          <!-- 版费 -->
          <el-table-column prop="moldFee" label="版费" width="65" align="right" />

          <!-- 工费 -->
          <el-table-column prop="laborFee" label="工费" width="70" align="right" />

          <!-- 应收金额 -->
          <el-table-column prop="totalAmount" label="应收金额" width="95" align="right">
            <template #default="{ row }">
              <span class="amount-red">{{ (row.totalAmount || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>

          <!-- ⭐ 收款：实际收款（明细行可填，小计/合计行自动汇总） -->
          <el-table-column v-if="receiptMode" label="实际收款" width="112" align="right">
            <template #default="{ row }">
              <template v-if="row.rowType === 'detail'">
                <el-input
                  v-if="editableReceipt"
                  :model-value="row._actual"
                  size="small"
                  class="receipt-input"
                  placeholder="0.00"
                  @update:model-value="(v) => onActualInput(row, v)"
                />
                <span v-else class="receipt-value">
                  {{ row._actual === '' || row._actual === null || row._actual === undefined
                    ? '-'
                    : Number(row._actual).toFixed(2) }}
                </span>
              </template>
              <span v-else class="receipt-sum">{{ Number(row._receiptTotal || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>

          <!-- ⭐ 收款：已收款（填写实收后自动勾选） -->
          <el-table-column v-if="receiptMode" label="已收款" width="80" align="center">
            <template #default="{ row }">
              <template v-if="row.rowType === 'detail'">
                <el-checkbox
                  v-if="editableReceipt"
                  :model-value="!!row._received"
                  @update:model-value="(v) => onReceivedToggle(row, v)"
                />
                <span v-else class="recv-flag" :class="row._received ? 'ok' : 'no'">
                  {{ row._received ? '✓' : '' }}
                </span>
              </template>
              <span v-else class="recv-count" :class="{ all: row._receivedCount >= row._rowCount && row._rowCount > 0 }">
                {{ row._receivedCount }}/{{ row._rowCount }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 底部汇总区 -->
      <div class="sheet-footer">
        <!-- 第一行：足料 -->
        <div class="footer-row">
          <div class="footer-cell">
            <span class="f-label">上单欠足料：</span>
            <span class="f-value">{{ (billData.lastDebtMaterial || 0).toFixed(3) }}g</span>
          </div>
          <div class="footer-cell">
            <span class="f-label">本单应收足料：</span>
            <span class="f-value highlight">{{ (billData.currentMaterialWeight || 0).toFixed(3) }}g</span>
          </div>
          <div class="footer-cell">
            <span class="f-label">来足料重：</span>
            <span class="f-value">{{ (billData.receivedMaterial || 0).toFixed(3) }}g</span>
          </div>
          <div class="footer-cell">
            <span class="f-label">累欠足金料：</span>
            <span class="f-value" :class="{'text-red': (billData.totalDebtMaterial || 0) > 0}">
              {{ (billData.totalDebtMaterial || 0).toFixed(3) }}g
            </span>
          </div>
        </div>

        <!-- 第二行：欠款 -->
        <div class="footer-row">
          <div class="footer-cell">
            <span class="f-label">上单欠款：</span>
            <span class="f-value">¥{{ (billData.lastDebtMoney || 0).toFixed(2) }}</span>
          </div>
          <div class="footer-cell">
            <span class="f-label">本单应收款：</span>
            <span class="f-value highlight">¥{{ (billData.currentMoney || 0).toFixed(2) }}</span>
          </div>
          <div class="footer-cell">
            <span class="f-label">来款金额：</span>
            <span class="f-value">¥{{ (billData.receivedMoney || 0).toFixed(2) }}</span>
          </div>
          <div class="footer-cell">
            <span class="f-label">累计欠款：</span>
            <span class="f-value" :class="{'text-red': (billData.totalDebtMoney || 0) > 0}">
              ¥{{ (billData.totalDebtMoney || 0).toFixed(2) }}
            </span>
          </div>
        </div>

        <!-- 第三行：备注 -->
        <div class="footer-row" v-if="billData.remark">
          <div class="footer-cell" style="flex:4;">
            <span class="f-label">备注：</span>
            <span class="f-value">{{ billData.remark }}</span>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="preview-actions" v-if="showViewDetail || !hideClose">
        <el-button v-if="showViewDetail" type="primary" @click="emit('view-detail')">
          <el-icon><View /></el-icon> 查看完整详情
        </el-button>
        <el-button v-if="!hideClose" @click="emit('close')">关闭</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { View } from '@element-plus/icons-vue';

const props = defineProps({
  billData: { type: Object, default: null },
  details: { type: Array, default: () => [] },
  showViewDetail: { type: Boolean, default: false },
  // ⭐ 页面内嵌使用时隐藏「关闭」按钮
  hideClose: { type: Boolean, default: false },
  // ⭐ 收款模式：表格末尾追加「实际收款 / 已收款」两列
  receiptMode: { type: Boolean, default: false },
  // ⭐ 收款可编辑（填写实际收款、勾选已收款）；只读审核时传 false
  editableReceipt: { type: Boolean, default: false },
});

const emit = defineEmits(['view-detail', 'close', 'receipt-change']);

// ============================================================
// ⭐ 收款：行级编辑状态（以 bill_details.id 为 key）
//    不直接改 props，避免父组件重算导致输入丢失
// ============================================================
const receiptMap = ref({});

const buildFromDetails = () => {
  const m = {};
  (props.details || []).forEach((d) => {
    if (d.id == null) return;
    m[d.id] = {
      actual: d.actualReceipt === null || d.actualReceipt === undefined ? '' : Number(d.actualReceipt),
      received: !!d.isReceived,
    };
  });
  receiptMap.value = m;
};

watch(() => props.details, buildFromDetails, { immediate: true });

const receiptOf = (d) => receiptMap.value[d.id] || { actual: '', received: false };

// 填写实际收款 → 有金额自动勾选「已收款」，清空则取消勾选
const onActualInput = (row, v) => {
  const id = row._detailId;
  if (id == null) return;
  const num = v === '' || v === null || v === undefined ? null : Number(v);
  const received = num !== null && !Number.isNaN(num) && num > 0;
  receiptMap.value = { ...receiptMap.value, [id]: { actual: v, received } };
  emitReceiptChange();
};

const onReceivedToggle = (row, v) => {
  const id = row._detailId;
  if (id == null) return;
  const cur = receiptOf({ id });
  receiptMap.value = { ...receiptMap.value, [id]: { actual: cur.actual, received: !!v } };
  emitReceiptChange();
};

// 汇总并通知父组件
const emitReceiptChange = () => {
  const items = (props.details || []).filter(d => d.id != null).map((d) => {
    const r = receiptOf(d);
    const num = r.actual === '' || r.actual === null || r.actual === undefined ? null : Number(r.actual);
    return {
      id: d.id,
      actualReceipt: num === null || Number.isNaN(num) ? null : round2(num),
      isReceived: !!r.received,
    };
  });
  const actual = items.reduce((s, x) => s + (x.actualReceipt || 0), 0);
  const receivable = (props.details || []).reduce((s, d) => s + Number(d.totalAmount || 0), 0);
  emit('receipt-change', {
    items,
    actual: round2(actual),
    receivable: round2(receivable),
    receivedCount: items.filter(x => x.isReceived).length,
    totalCount: items.length,
  });
};

// 一键：按每行应收全额填入并全部勾选
const fillByReceivable = () => {
  const m = {};
  (props.details || []).forEach((d) => {
    if (d.id == null) return;
    const amt = round2(d.totalAmount || 0);
    m[d.id] = { actual: amt > 0 ? amt.toFixed(2) : '', received: amt > 0 };
  });
  receiptMap.value = m;
  emitReceiptChange();
};

// 清空
const clearReceipt = () => {
  const m = {};
  (props.details || []).forEach((d) => {
    if (d.id == null) return;
    m[d.id] = { actual: '', received: false };
  });
  receiptMap.value = m;
  emitReceiptChange();
};

defineExpose({ fillByReceivable, clearReceipt, emitReceiptChange, receiptMap });

// ===== ⭐ 整单收款汇总（工具条用）=====
const receivableTotal = computed(() =>
  round2((props.details || []).reduce((s, d) => s + Number(d.totalAmount || 0), 0)));

const totalActual = computed(() =>
  round2((props.details || [])
    .filter(d => d.id != null)
    .reduce((s, d) => {
      const a = receiptOf(d).actual;
      return s + (a === '' || a === null || a === undefined ? 0 : Number(a) || 0);
    }, 0)));

const diffTotal = computed(() => round2(receivableTotal.value - totalActual.value));

const totalCount = computed(() => (props.details || []).filter(d => d.id != null).length);

const receivedCount = computed(() =>
  (props.details || []).filter(d => d.id != null && receiptOf(d).received).length);

// 填整单实收：按明细顺序分摊（最后一行取余数），有金额的行自动勾选
const setTotalActual = (total) => {
  const list = (props.details || []).filter(d => d.id != null);
  let remain = Math.max(0, Number(total) || 0);
  const m = {};
  list.forEach((d, i) => {
    const due = round2(d.totalAmount || 0);
    let take;
    if (i === list.length - 1) take = remain;
    else take = Math.min(due > 0 ? due : remain, remain);
    take = round2(Math.max(0, take));
    remain = round2(remain - take);
    m[d.id] = { actual: take > 0 ? take.toFixed(2) : '', received: take > 0 };
  });
  receiptMap.value = m;
  emitReceiptChange();
};

const onTotalChange = (v) => setTotalActual(v);

// ===== 状态映射 =====
const statusMap = {
  pending: { text: '待审核', type: 'warning' },
  billPending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  returned: { text: '已退回', type: 'danger' },
  confirmed: { text: '已确认', type: 'success' },
};

const getStatusText = (s) => statusMap[s]?.text || s;
const getStatusType = (s) => statusMap[s]?.type || 'info';

// ===== 表格数据 =====
const tableData = computed(() => {
  const list = props.details || [];
  if (list.length === 0) return [];

  const groups = {};
  const order = [];
  list.forEach((item) => {
    const key = item.customerName || '未知客户';
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(item);
  });

  const rows = [];
  let globalSeq = 1;

  const grand = {
    quantity: 0, totalWeight: 0, netWeight: 0, addedWeight: 0, goldMaterialFee: 0,
    goldMaterialWeight: 0,
    mainStoneQty: 0, mainStoneWeight: 0, mainStoneAmount: 0, mainStoneSettingFee: 0,
    subStoneQty: 0, subStoneWeight: 0, subStoneAmount: 0, subStoneSettingFee: 0,
    packingCertPostage: 0, moldFee: 0, laborFee: 0, totalAmount: 0,
    receiptTotal: 0, receivedCount: 0, rowCount: 0,
  };

  order.forEach((custName) => {
    const items = groups[custName];
    const sub = {
      quantity: 0, totalWeight: 0, netWeight: 0, addedWeight: 0, goldMaterialFee: 0,
      goldMaterialWeight: 0,
      mainStoneQty: 0, mainStoneWeight: 0, mainStoneAmount: 0, mainStoneSettingFee: 0,
      subStoneQty: 0, subStoneWeight: 0, subStoneAmount: 0, subStoneSettingFee: 0,
      packingCertPostage: 0, moldFee: 0, laborFee: 0, totalAmount: 0,
      receiptTotal: 0, receivedCount: 0, rowCount: 0,
    };

    items.forEach((d) => {
      // ⭐ 兼容不同数据源字段名：流水单号 / 加耗重
      const added = Number(d.addedWeight ?? d.addLossWeight ?? 0);
      const serial = d.serialNo ?? d.orderNo ?? '';
      // ⭐ 收款状态
      const rec = receiptOf(d);

      rows.push({
        ...d,
        serialNo: serial,
        addedWeight: added,
        rowType: 'detail',
        seqNo: globalSeq++,
        _groupKey: custName,
        _detailId: d.id,
        _actual: rec.actual,
        _received: !!rec.received,
      });

      const pcp = (d.packingFee || 0) + (d.certificateFee || 0) + (d.postageFee || 0);
      sub.quantity += Number(d.quantity || 0);
      sub.totalWeight += Number(d.totalWeight || 0);
      sub.netWeight += Number(d.netWeight || 0);
      sub.addedWeight += added;
      sub.goldMaterialFee += Number(d.goldMaterialFee || 0);
      sub.goldMaterialWeight += Number(d.goldMaterialWeight || 0);
      sub.mainStoneQty += Number(d.mainStoneQty || 0);
      sub.mainStoneWeight += Number(d.mainStoneWeight || 0);
      sub.mainStoneAmount += Number(d.mainStoneAmount || 0);
      sub.mainStoneSettingFee += Number(d.mainStoneSettingFee || 0);
      sub.subStoneQty += Number(d.subStoneQty || 0);
      sub.subStoneWeight += Number(d.subStoneWeight || 0);
      sub.subStoneAmount += Number(d.subStoneAmount || 0);
      sub.subStoneSettingFee += Number(d.subStoneSettingFee || 0);
      sub.packingCertPostage += pcp;
      sub.moldFee += Number(d.moldFee || 0);
      sub.laborFee += Number(d.laborFee || 0);
      sub.totalAmount += Number(d.totalAmount || 0);

      // ⭐ 收款累计（本客户小计）
      const ra = rec.actual === '' || rec.actual === null || rec.actual === undefined
        ? 0 : (Number(rec.actual) || 0);
      sub.receiptTotal += ra;
      sub.rowCount += 1;
      if (rec.received) sub.receivedCount += 1;
    });

    rows.push({
      rowType: 'subtotal',
      _groupKey: custName,
      productName: `${custName}：${sub.totalAmount.toFixed(2)}元`,
      customerName: '',
      quantity: sub.quantity,
      totalWeight: round3(sub.totalWeight),
      netWeight: round3(sub.netWeight),
      addedWeight: round3(sub.addedWeight),
      goldMaterialFee: round2(sub.goldMaterialFee),
      goldMaterialWeight: round3(sub.goldMaterialWeight),
      mainStoneQty: sub.mainStoneQty,
      mainStoneWeight: round3(sub.mainStoneWeight),
      mainStoneAmount: round2(sub.mainStoneAmount),
      mainStoneSettingFee: round2(sub.mainStoneSettingFee),
      subStoneQty: sub.subStoneQty,
      subStoneWeight: round3(sub.subStoneWeight),
      subStoneAmount: round2(sub.subStoneAmount),
      subStoneSettingFee: round2(sub.subStoneSettingFee),
      packingCertPostage: round2(sub.packingCertPostage),
      moldFee: round2(sub.moldFee),
      laborFee: round2(sub.laborFee),
      totalAmount: round2(sub.totalAmount),
      _receiptTotal: round2(sub.receiptTotal),
      _receivedCount: sub.receivedCount,
      _rowCount: sub.rowCount,
    });

    Object.keys(grand).forEach((k) => { grand[k] += sub[k]; });
  });

  rows.push({
    rowType: 'total',
    productName: '合计：',
    customerName: '',
    quantity: grand.quantity,
    totalWeight: round3(grand.totalWeight),
    netWeight: round3(grand.netWeight),
    addedWeight: round3(grand.addedWeight),
    goldMaterialFee: round2(grand.goldMaterialFee),
    goldMaterialWeight: round3(grand.goldMaterialWeight),
    mainStoneQty: grand.mainStoneQty,
    mainStoneWeight: round3(grand.mainStoneWeight),
    mainStoneAmount: round2(grand.mainStoneAmount),
    mainStoneSettingFee: round2(grand.mainStoneSettingFee),
    subStoneQty: grand.subStoneQty,
    subStoneWeight: round3(grand.subStoneWeight),
    subStoneAmount: round2(grand.subStoneAmount),
    subStoneSettingFee: round2(grand.subStoneSettingFee),
    packingCertPostage: round2(grand.packingCertPostage),
    moldFee: round2(grand.moldFee),
    laborFee: round2(grand.laborFee),
    totalAmount: round2(grand.totalAmount),
    _receiptTotal: round2(grand.receiptTotal),
    _receivedCount: grand.receivedCount,
    _rowCount: grand.rowCount,
  });

  return rows;
});

// ===== 表格样式方法 =====
const rowClassName = ({ row }) => {
  if (row.rowType === 'subtotal') return 'row-subtotal';
  if (row.rowType === 'total') return 'row-total';
  return '';
};

const cellStyle = ({ row }) => {
  const base = { padding: '3px 4px', fontSize: '12px', border: '1px solid #000' };
  if (row.rowType === 'subtotal' || row.rowType === 'total') {
    return { ...base, background: '#FFFF00', color: '#FF0000', fontWeight: 'bold' };
  }
  return base;
};

const headerCellStyle = () => ({
  background: '#D9D9D9',
  color: '#000',
  fontWeight: 'bold',
  fontSize: '12px',
  padding: '4px',
  border: '1px solid #000',
  textAlign: 'center',
});

const spanMethod = ({ row, columnIndex }) => {
  if (row.rowType === 'subtotal' || row.rowType === 'total') {
    if (columnIndex === 2) return { rowspan: 1, colspan: 3 };
    if (columnIndex === 0 || columnIndex === 1) return { rowspan: 0, colspan: 0 };
  }
  return { rowspan: 1, colspan: 1 };
};

// ============================================================
// 工具函数
// ============================================================
function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function round2(v) { return Math.round(Number(v || 0) * 100) / 100; }
function round3(v) { return Math.round(Number(v || 0) * 1000) / 1000; }
</script>

<style scoped>
.preview-content {
  padding: 16px 20px 24px;
}

.bill-sheet {
  background: #fff;
}

.sheet-title {
  text-align: center;
  font-size: 22px;
  font-weight: bold;
  letter-spacing: 8px;
  color: #000;
  margin-bottom: 8px;
  font-family: 'SimSun', '宋体', serif;
}

.sheet-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #000;
  margin-bottom: 6px;
  padding: 0 2px;
  font-family: 'SimSun', '宋体', serif;
  flex-wrap: wrap;
  gap: 4px;
}
.meta-item {
  flex: 1;
  min-width: 100px;
}
.meta-label {
  color: #000;
}
.meta-value {
  color: #000;
  font-weight: 500;
}

.sheet-table-wrapper {
  border: 1px solid #000;
  overflow-x: auto;
}

/* ⭐ 收款录入条 */
.receipt-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 7px 10px;
  margin-bottom: 6px;
  background: #fffdf5;
  border: 1px dashed #e6c66b;
  border-radius: 6px;
  font-family: 'SimSun', '宋体', serif;
  font-size: 12px;
  color: #606266;
}
.rt-label { font-weight: 600; color: #303133; }
.rt-input { width: 124px; }
.rt-input :deep(.el-input__inner) { text-align: right; font-family: Consolas, Monaco, monospace; }
.rt-total { color: #c0392b; font-size: 14px; font-family: Consolas, Monaco, monospace; }
.rt-item b { color: #303133; font-family: Consolas, Monaco, monospace; }
.rt-item b.warn { color: #d64545; }
.rt-item b.ok { color: #1f9254; }
.rt-spacer { flex: 1; }

:deep(.el-table) {
  --el-table-border-color: #000;
  --el-table-header-bg-color: #D9D9D9;
  --el-table-row-hover-bg-color: #fff;
  font-family: 'SimSun', '宋体', serif;
}
:deep(.el-table table) {
  border-collapse: collapse;
}
:deep(.el-table th.el-table__cell) {
  background: #D9D9D9 !important;
  border: 1px solid #000 !important;
  color: #000 !important;
  font-weight: bold !important;
  font-size: 12px !important;
  padding: 4px !important;
}
:deep(.el-table td.el-table__cell) {
  border: 1px solid #000 !important;
  padding: 3px 4px !important;
  font-size: 12px !important;
  color: #000;
}
:deep(.el-table .cell) {
  padding: 0 !important;
  line-height: 1.4;
}
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background: #fff !important;
}
:deep(.el-table .row-subtotal td.el-table__cell),
:deep(.el-table .row-total td.el-table__cell) {
  background: #FFFF00 !important;
  color: #FF0000 !important;
  font-weight: bold !important;
}

.customer-red {
  color: #FF0000;
  font-weight: bold;
}
.amount-red {
  color: #FF0000;
  font-weight: bold;
}

/* ===== ⭐ 收款两列 ===== */
.receipt-input {
  width: 100%;
}
.receipt-input :deep(.el-input__wrapper) {
  padding: 0 4px;
  box-shadow: 0 0 0 1px #c8d0da inset;
  border-radius: 3px;
  background: #fffdf5;
}
.receipt-input :deep(.el-input__inner) {
  height: 22px;
  line-height: 22px;
  font-size: 12px;
  text-align: right;
  font-family: 'SimSun', '宋体', serif;
}
.receipt-value { color: #303133; }
.receipt-sum { color: #FF0000; font-weight: bold; }
.recv-flag { display: inline-block; font-weight: bold; color: #2e9e5b; font-size: 14px; }
.recv-flag.no { color: transparent; }
.recv-count { font-size: 11px; color: #909399; }
.recv-count.all { color: #2e9e5b; font-weight: bold; }
:deep(.el-table .cell .el-checkbox) { height: auto; margin-right: 0; }

.sheet-footer {
  margin-top: 0;
  border: 1px solid #000;
  border-top: none;
  font-family: 'SimSun', '宋体', serif;
  font-size: 12px;
  color: #000;
}
.footer-row {
  display: flex;
  border-bottom: 1px solid #000;
}
.footer-row:last-child {
  border-bottom: none;
}
.footer-cell {
  flex: 1;
  padding: 6px 8px;
  border-right: 1px solid #000;
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.footer-cell:last-child {
  border-right: none;
}
.f-label {
  color: #000;
  white-space: nowrap;
}
.f-value {
  color: #000;
  flex: 1;
}
.f-value.highlight {
  color: #FF0000;
  font-weight: bold;
}
.text-red {
  color: #FF0000 !important;
  font-weight: bold;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e8ecf1;
}

@media (max-width: 768px) {
  .preview-content { padding: 10px 8px 16px; }
  .sheet-title { font-size: 18px; letter-spacing: 4px; }
  .sheet-meta { flex-wrap: wrap; gap: 4px; }
  .meta-item { flex: 0 0 50%; }
  .footer-row { flex-wrap: wrap; }
  .footer-cell { flex: 0 0 50%; border-bottom: 1px solid #000; }
}
</style>
