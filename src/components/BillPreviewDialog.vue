<!-- src/components/BillPreviewDialog.vue -->
<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`📄 出货明细预览 - ${billData?.billNo || ''}`"
    width="95%"
    top="2vh"
    :close-on-click-modal="false"
    destroy-on-close
    class="bill-preview-dialog"
    @open="handleOpen"
  >
    <div v-loading="loading" class="preview-content">
      <!-- ===== 出货明细表（Excel 风格，完全复用 bill-view.vue） ===== -->
      <div class="bill-sheet" v-if="!loading && billData">
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
            <!-- 1 流水单号 -->
            <el-table-column prop="serialNo" label="流水单号" width="80" align="center" />
            <!-- 2 序号 -->
            <el-table-column prop="seqNo" label="序号" width="50" align="center" />
            <!-- 3 品名 -->
            <el-table-column prop="productName" label="品名" min-width="130" align="left" />
            <!-- 4 客户 -->
            <el-table-column prop="customerName" label="客户" width="100" align="center">
              <template #default="{ row }">
                <span class="customer-red">{{ row.customerName }}</span>
              </template>
            </el-table-column>
            <!-- 5 钻石级别 -->
            <el-table-column prop="diamondLevel" label="钻石级别" width="80" align="center" />
            <!-- 6 订单日期 -->
            <el-table-column prop="orderDate" label="订单日期" width="90" align="center">
              <template #default="{ row }">{{ formatDate(row.orderDate) }}</template>
            </el-table-column>
            <!-- 7 颜色 -->
            <el-table-column prop="color" label="颜色" width="60" align="center" />
            <!-- 8 件数 -->
            <el-table-column prop="quantity" label="件数" width="55" align="center" />
            <!-- 9 手寸/长度 -->
            <el-table-column prop="size" label="手寸/长度" width="85" align="center" />
            <!-- 10 总重 -->
            <el-table-column prop="totalWeight" label="总重" width="70" align="right" />
            <!-- 11 净重 -->
            <el-table-column prop="netWeight" label="净重" width="70" align="right" />
            <!-- 12 损耗 -->
            <el-table-column prop="lossRate" label="损耗" width="60" align="right" />
            <!-- 13 加耗重 -->
            <el-table-column prop="addedWeight" label="加耗重" width="70" align="right" />
            <!-- 14 金价 -->
            <el-table-column prop="goldPrice" label="金价" width="70" align="right" />
            <!-- 15 足金料 -->
            <el-table-column prop="goldMaterialFee" label="足金料" width="80" align="right" />
            <!-- 16-20 主石 -->
            <el-table-column label="主石" align="center">
              <el-table-column prop="mainStoneQty" label="粒数" width="55" align="center" />
              <el-table-column prop="mainStoneWeight" label="石重(ct)" width="80" align="right" />
              <el-table-column prop="mainStonePrice" label="单价(元)" width="80" align="right" />
              <el-table-column prop="mainStoneAmount" label="金额(元)" width="85" align="right" />
              <el-table-column prop="mainStoneSettingFee" label="镶石工费" width="85" align="right" />
            </el-table-column>
            <!-- 21-25 副石 -->
            <el-table-column label="副石" align="center">
              <el-table-column prop="subStoneQty" label="粒数" width="55" align="center" />
              <el-table-column prop="subStoneWeight" label="石重" width="70" align="right" />
              <el-table-column prop="subStonePrice" label="单价(元)" width="80" align="right" />
              <el-table-column prop="subStoneAmount" label="金额(元)" width="85" align="right" />
              <el-table-column prop="subStoneSettingFee" label="镶石工费" width="85" align="right" />
            </el-table-column>
            <!-- 26 包装证书邮费 -->
            <el-table-column label="包装证书邮费" width="105" align="right">
              <template #default="{ row }">
                {{ row.rowType === 'detail'
                  ? ((row.packingFee || 0) + (row.certificateFee || 0) + (row.postageFee || 0)).toFixed(2)
                  : (row.packingCertPostage || 0).toFixed(2) }}
              </template>
            </el-table-column>
            <!-- 27 版费 -->
            <el-table-column prop="moldFee" label="版费" width="65" align="right" />
            <!-- 28 工费 -->
            <el-table-column prop="laborFee" label="工费" width="70" align="right" />
            <!-- 29 应收金额 -->
            <el-table-column prop="totalAmount" label="应收金额" width="95" align="right">
              <template #default="{ row }">
                <span class="amount-red">{{ (row.totalAmount || 0).toFixed(2) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- ===== 底部汇总区（完全复用 bill-view.vue） ===== -->
        <div class="sheet-footer">
          <!-- 第一行：足料 -->
          <div class="footer-row">
            <div class="footer-cell">
              <span class="f-label">上单欠足料：</span>
              <span class="f-value">{{ (billData.lastDebtMaterial || 0).toFixed(3) }}g</span>
            </div>
            <div class="footer-cell">
              <span class="f-label">本单应收足料：</span>
              <span class="f-value highlight">{{ (billData.currentMaterial || 0).toFixed(3) }}g</span>
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
        <div class="preview-actions">
          <el-button type="primary" @click="goDetail">
            <el-icon><View /></el-icon> 查看完整详情
          </el-button>
          <el-button @click="dialogVisible = false">关闭</el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { View } from '@element-plus/icons-vue';
import { getBillDetail } from '@/api/bill';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  billId: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(['update:visible', 'close']);

const router = useRouter();
const dialogVisible = ref(false);
const loading = ref(false);
const billData = ref(null);
const rawDetails = ref([]);

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

// ===== 表格数据（按客户分组 → 明细行 + 黄色小计行 + 合计行） =====
const tableData = computed(() => {
  const list = rawDetails.value || [];
  if (list.length === 0) return [];

  // 按客户分组（同一客户连续排列）
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

  // 合计累加器
  const grand = {
    quantity: 0, totalWeight: 0, netWeight: 0, addedWeight: 0, goldMaterialFee: 0,
    mainStoneQty: 0, mainStoneWeight: 0, mainStoneAmount: 0, mainStoneSettingFee: 0,
    subStoneQty: 0, subStoneWeight: 0, subStoneAmount: 0, subStoneSettingFee: 0,
    packingCertPostage: 0, moldFee: 0, laborFee: 0, totalAmount: 0,
  };

  order.forEach((custName) => {
    const items = groups[custName];
    // 小计累加器
    const sub = {
      quantity: 0, totalWeight: 0, netWeight: 0, addedWeight: 0, goldMaterialFee: 0,
      mainStoneQty: 0, mainStoneWeight: 0, mainStoneAmount: 0, mainStoneSettingFee: 0,
      subStoneQty: 0, subStoneWeight: 0, subStoneAmount: 0, subStoneSettingFee: 0,
      packingCertPostage: 0, moldFee: 0, laborFee: 0, totalAmount: 0,
    };

    items.forEach((d) => {
      const pcp = (d.packingFee || 0) + (d.certificateFee || 0) + (d.postageFee || 0);
      rows.push({
        ...d,
        rowType: 'detail',
        seqNo: globalSeq++,
        _groupKey: custName,
      });
      // 累加小计
      sub.quantity += Number(d.quantity || 0);
      sub.totalWeight += Number(d.totalWeight || 0);
      sub.netWeight += Number(d.netWeight || 0);
      sub.addedWeight += Number(d.addedWeight || 0);
      sub.goldMaterialFee += Number(d.goldMaterialFee || 0);
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
    });

    // 黄色小计行
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
    });

    // 累加合计
    Object.keys(grand).forEach((k) => { grand[k] += sub[k]; });
  });

  // 合计行
  rows.push({
    rowType: 'total',
    productName: '合计：',
    customerName: '',
    quantity: grand.quantity,
    totalWeight: round3(grand.totalWeight),
    netWeight: round3(grand.netWeight),
    addedWeight: round3(grand.addedWeight),
    goldMaterialFee: round2(grand.goldMaterialFee),
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
  });

  return rows;
});

// ===== 表格样式方法 =====
const rowClassName = ({ row }) => {
  if (row.rowType === 'subtotal') return 'row-subtotal';
  if (row.rowType === 'total') return 'row-total';
  return '';
};

const cellStyle = ({ row, column, rowIndex }) => {
  const base = { padding: '3px 4px', fontSize: '12px', border: '1px solid #000' };
  if (row.rowType === 'subtotal') {
    return { ...base, background: '#FFFF00', color: '#FF0000', fontWeight: 'bold' };
  }
  if (row.rowType === 'total') {
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

// 小计行/合计行：空列合并到品名列
const spanMethod = ({ row, column, columnIndex }) => {
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

// ============================================================
// 加载数据
// ============================================================
const loadData = async () => {
  if (!props.billId) return;
  loading.value = true;
  try {
    const res = await getBillDetail(props.billId);
    billData.value = res?.data;
    rawDetails.value = billData.value?.details || [];
    
    if (!billData.value) {
      ElMessage.error('账单不存在');
    }
  } catch (error) {
    console.error('加载账单详情失败:', error);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const handleOpen = () => {
  loadData();
};

// ============================================================
// 跳转详情
// ============================================================
const goDetail = () => {
  if (props.billId) {
    dialogVisible.value = false;
    router.push(`/order/bill/detail/${props.billId}`);
  }
};

// ============================================================
// 监听 visible
// ============================================================
watch(
  () => props.visible,
  (val) => {
    dialogVisible.value = val;
    if (!val) {
      // 关闭时重置数据
      billData.value = null;
      rawDetails.value = [];
    }
  },
  { immediate: true }
);

watch(
  () => dialogVisible.value,
  (val) => {
    emit('update:visible', val);
    if (!val) {
      emit('close');
    }
  }
);
</script>

<style scoped>
/* ===== 弹窗样式 ===== */
:deep(.bill-preview-dialog .el-dialog) {
  border-radius: 12px;
  max-width: 98vw;
}
:deep(.bill-preview-dialog .el-dialog__header) {
  padding: 16px 24px;
  border-bottom: 1px solid #e8ecf1;
}
:deep(.bill-preview-dialog .el-dialog__body) {
  padding: 0;
  max-height: 85vh;
  overflow-y: auto;
}
:deep(.bill-preview-dialog .el-dialog__footer) {
  display: none;
}

.preview-content {
  padding: 16px 20px 24px;
}

/* ===== 出货明细表主体（Excel 风格，完全复用 bill-view.vue） ===== */
.bill-sheet {
  background: #fff;
}

/* 大标题 */
.sheet-title {
  text-align: center;
  font-size: 22px;
  font-weight: bold;
  letter-spacing: 8px;
  color: #000;
  margin-bottom: 8px;
  font-family: 'SimSun', '宋体', serif;
}

/* 表头信息行 */
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

/* 表格包裹 */
.sheet-table-wrapper {
  border: 1px solid #000;
  overflow-x: auto;
}

/* ===== 覆盖 Element Plus 表格样式 → Excel 风格 ===== */
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
/* 去掉斑马纹 */
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background: #fff !important;
}
/* 小计行 / 合计行 黄色背景 */
:deep(.el-table .row-subtotal td.el-table__cell),
:deep(.el-table .row-total td.el-table__cell) {
  background: #FFFF00 !important;
  color: #FF0000 !important;
  font-weight: bold !important;
}

/* 客户名红色 */
.customer-red {
  color: #FF0000;
  font-weight: bold;
}
/* 应收金额红色 */
.amount-red {
  color: #FF0000;
  font-weight: bold;
}

/* ===== 底部汇总区 ===== */
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

/* ===== 预览底部操作 ===== */
.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e8ecf1;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .preview-content { padding: 10px 8px 16px; }
  .sheet-title { font-size: 18px; letter-spacing: 4px; }
  .sheet-meta { flex-wrap: wrap; gap: 4px; }
  .meta-item { flex: 0 0 50%; }
  .footer-row { flex-wrap: wrap; }
  .footer-cell { flex: 0 0 50%; border-bottom: 1px solid #000; }
}
</style>