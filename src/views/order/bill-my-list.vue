<!-- src/views/order/bill-my-list.vue
     ⭐ 「我的账单 / 账单收款」
     - 按日期查看账单，展示效果与出货明细预览完全一致
     - 明细表末尾追加「实际收款 / 已收款」两列
     - 填写实际收款 → 自动勾选已收款 → 自动汇总 → 提交审核（审核员在工作台处理）
     - 默认查今天；支持 今天 / 本月 / 自定义
     - 导出按天进行（当天 1 张导 xlsx，多张打包 zip）
-->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2>{{ isReceiptMode ? '💰 账单收款' : '📄 我的账单' }}</h2>
      <div class="header-right">
        <el-radio-group v-model="dateType" @change="onDateTypeChange">
          <el-radio-button value="today">今天</el-radio-button>
          <el-radio-button value="month">本月</el-radio-button>
          <el-radio-button value="custom">自定义</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="dateType === 'custom'"
          v-model="customRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width:260px;"
          @change="loadData"
        />
        <span class="range-text">{{ rangeText }}</span>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button type="primary" :loading="exporting" @click="handleExport">
          <el-icon><Download /></el-icon> 导出
        </el-button>
      </div>
    </div>

    <!-- 顶部汇总 -->
    <div v-if="bills.length" class="page-summary">
      <span>共 <b>{{ bills.length }}</b> 张账单</span>
      <span>应收合计 <b class="money">¥{{ totalReceivable.toFixed(2) }}</b></span>
      <span>实收合计 <b class="money actual">¥{{ totalActual.toFixed(2) }}</b></span>
      <span>差额 <b class="money" :class="{ warn: totalDiff !== 0 }">¥{{ totalDiff.toFixed(2) }}</b></span>
      <span>待审核收款 <b class="money">{{ pendingReceiptCount }}</b> 张</span>
    </div>

    <el-empty v-if="!loading && bills.length === 0" description="当前日期没有账单" :image-size="90" />

    <div v-for="b in bills" :key="b.billId" class="bill-block">
      <div class="bill-caption">
        <span class="cap-no">{{ b.billData.billNo }}</span>
        <span class="cap-item">客户：{{ b.billData.customerName || '—' }}</span>
        <span class="cap-item">销售：{{ b.billData.operatorName || '—' }}</span>
        <span class="cap-item">共 {{ (b.details || []).filter(d => d.rowType !== 'return').length }} 项</span>
        <span class="cap-spacer"></span>
        <el-tag :type="receiptTagType(b)" size="small" effect="light">{{ receiptText(b) }}</el-tag>
      </div>

      <BillPreviewSheet
        :ref="(el) => setSheetRef(b.billId, el)"
        :bill-data="b.billData"
        :details="b.details"
        hide-close
        receipt-mode
        :editable-receipt="canEditReceipt(b)"
        @receipt-change="(r) => onReceiptChange(b, r)"
      />

      <!-- 收款汇总与操作 -->
      <div class="receipt-bar">
        <div class="rb-left">
          <span>应收 <b>¥{{ (b._receipt?.receivable || 0).toFixed(2) }}</b></span>
          <span>实收 <b class="actual">¥{{ (b._receipt?.actual || 0).toFixed(2) }}</b></span>
          <span>差额
            <b :class="{ warn: Math.abs(b._receipt?.diff || 0) > 0.001 }">
              ¥{{ (b._receipt?.diff || 0).toFixed(2) }}
            </b>
          </span>
          <span>已收 <b>{{ b._receipt?.receivedCount || 0 }}/{{ b._receipt?.totalCount || 0 }}</b> 行</span>
        </div>
        <div class="rb-right">
          <template v-if="canEditReceipt(b)">
            <el-button size="small" type="primary" :loading="!!b._saving" @click="saveOne(b)">保存收款</el-button>
            <el-button size="small" type="success" :loading="!!b._submitting" @click="submitOne(b)">提交审核</el-button>
          </template>
          <template v-else>
            <span class="rb-tip" :class="'tip-' + receiptStatusOf(b)">
              {{ receiptTip(b) }}
            </span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Download } from '@element-plus/icons-vue';
import {
  getBillList, getBillDetail,
  saveBillReceipt, submitBillReceipt,
} from '@/api/bill';
import BillPreviewSheet from '@/components/BillPreviewSheet.vue';

const route = useRoute();
const isReceiptMode = computed(() => route.query.mode === 'receipt');

const dateType = ref('today');
const customRange = ref([]);
const range = ref([]);           // [start, end]  YYYY-MM-DD
const bills = ref([]);
const loading = ref(false);
const exporting = ref(false);

const sheetRefs = {};
const setSheetRef = (id, el) => { if (el) sheetRefs[id] = el; };

const round2 = (v) => Math.round(Number(v || 0) * 100) / 100;

const fmt = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const rangeText = computed(() => (range.value.length === 2 ? `${range.value[0]} ~ ${range.value[1]}` : ''));

// ===== 收款状态 =====
const receiptStatusOf = (b) => (b?.billData?.receiptStatus || 'none');

// 只有账单本身已确认（已审核通过）才允许收款
const PAYABLE_STATUS = ['confirmed', 'billConfirmed', 'completed'];
const isBillPayable = (b) => PAYABLE_STATUS.includes(b?.billData?.status);

const RECEIPT_TEXT = {
  none: '未填写收款',
  pending: '收款待审核',
  approved: '收款已通过',
  rejected: '收款已驳回',
};
const receiptText = (b) => {
  if (!isBillPayable(b)) return '账单待审核';
  return RECEIPT_TEXT[receiptStatusOf(b)] || '未填写收款';
};
const receiptTagType = (b) => {
  if (!isBillPayable(b)) return 'info';
  return {
    none: 'info', pending: 'warning', approved: 'success', rejected: 'danger',
  }[receiptStatusOf(b)] || 'info';
};

const canEditReceipt = (b) => isBillPayable(b) && ['none', 'rejected'].includes(receiptStatusOf(b));

const receiptTip = (b) => {
  const s = receiptStatusOf(b);
  const d = b.billData || {};
  if (!isBillPayable(b)) return '账单待审核，暂不可收款';
  if (s === 'pending') return `已于 ${String(d.receiptSubmittedAt || '').replace('T', ' ').slice(0, 16) || '—'} 提交，等待审核`;
  if (s === 'approved') return `审核人：${d.receiptAuditedByName || '—'}　实收 ¥${Number(d.receiptActual || 0).toFixed(2)}`;
  if (s === 'rejected') return `驳回原因：${d.receiptRemark || '—'}`;
  return '';
};

// ===== 页面汇总 =====
const totalReceivable = computed(() => round2(bills.value.reduce((s, b) => s + Number(b._receipt?.receivable || 0), 0)));
const totalActual = computed(() => round2(bills.value.reduce((s, b) => s + Number(b._receipt?.actual || 0), 0)));
const totalDiff = computed(() => round2(totalReceivable.value - totalActual.value));
const pendingReceiptCount = computed(() => bills.value.filter(b => receiptStatusOf(b) === 'pending').length);

// ===== 区间 =====
const applyRange = () => {
  const now = new Date();
  if (dateType.value === 'today') {
    const t = fmt(now);
    range.value = [t, t];
  } else if (dateType.value === 'month') {
    range.value = [fmt(new Date(now.getFullYear(), now.getMonth(), 1)), fmt(now)];
  } else if (customRange.value && customRange.value.length === 2) {
    range.value = [...customRange.value];
  }
};

const onDateTypeChange = () => {
  if (dateType.value === 'custom') {
    range.value = customRange.value && customRange.value.length === 2 ? [...customRange.value] : [];
    const t = fmt(new Date());
    if (!range.value.length) { customRange.value = [t, t]; range.value = [t, t]; }
  } else {
    applyRange();
  }
  loadData();
};

// ===== 初始化收款汇总（未改动时也要有数）=====
const initReceiptState = (b) => {
  const details = b.details || [];
  const items = details.filter(d => d.id != null).map(d => ({
    id: d.id,
    actualReceipt: d.actualReceipt === null || d.actualReceipt === undefined ? null : Number(d.actualReceipt),
    isReceived: !!d.isReceived,
  }));
  const actual = round2(items.reduce((s, x) => s + (x.actualReceipt || 0), 0));
  const receivable = round2(details.reduce((s, d) => s + Number(d.totalAmount || 0), 0));
  b._receipt = {
    items,
    actual,
    receivable,
    diff: round2(receivable - actual),
    receivedCount: items.filter(x => x.isReceived).length,
    totalCount: items.length,
  };
};

const onReceiptChange = (b, r) => {
  b._receipt = { ...r, diff: round2((r.receivable || 0) - (r.actual || 0)) };
};

const loadData = async () => {
  if (range.value.length !== 2) { bills.value = []; return; }
  loading.value = true;
  try {
    const res = await getBillList({
      startDate: range.value[0],
      endDate: range.value[1],
      page: 1,
      pageSize: 100,
    });
    const list = res?.data || [];
    const detailed = await Promise.all(list.map(async (b) => {
      try {
        const d = await getBillDetail(b.billId);
        const billData = { ...b, ...(d?.data || {}) };
        if (!billData.operatorName) billData.operatorName = b.operatorName;
        return { billId: b.billId, billData, details: billData.details || [] };
      } catch {
        return { billId: b.billId, billData: b, details: [] };
      }
    }));
    bills.value = detailed.filter(x => x.billData);
    bills.value.forEach(initReceiptState);
  } catch (e) {
    console.error('加载账单失败:', e);
    ElMessage.error('加载账单失败');
  } finally {
    loading.value = false;
  }
};

// ===== 收款操作（表格上方的工具条负责填写，这里只负责落库/提交）=====
const doSave = async (b, silent = false) => {
  if (!b._receipt) return false;
  b._saving = true;
  try {
    const res = await saveBillReceipt(b.billId, { items: b._receipt.items });
    if (!res.success) { ElMessage.error(res.message || '保存失败'); return false; }
    const d = res.data || {};
    b.billData.receiptStatus = d.receiptStatus || b.billData.receiptStatus;
    b.billData.receiptReceivable = d.receivable;
    b.billData.receiptActual = d.actual;
    if (!silent) ElMessage.success('收款已保存');
    return true;
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e.message || '保存失败');
    return false;
  } finally {
    b._saving = false;
  }
};

const saveOne = async (b) => {
  await doSave(b);
  await loadData();
};

const submitOne = async (b) => {
  const r = b._receipt || {};
  if (!r.actual || r.actual <= 0) { ElMessage.warning('请先填写实际收款金额'); return; }
  if ((r.receivedCount || 0) < (r.totalCount || 0)) {
    ElMessage.warning(`还有 ${r.totalCount - r.receivedCount} 行未勾选「已收款」，请先填写实际收款`);
    return;
  }
  try {
    await ElMessageBox.confirm(
      `本单应收 ¥${(r.receivable || 0).toFixed(2)}，实收 ¥${(r.actual || 0).toFixed(2)}，提交后需审核员审核，期间不可修改。确认提交？`,
      '提交收款审核',
      { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '取消' }
    );
  } catch { return; }

  const saved = await doSave(b, true);
  if (!saved) return;

  b._submitting = true;
  try {
    const res = await submitBillReceipt(b.billId);
    if (res.success) {
      ElMessage.success('收款已提交审核');
      await loadData();
    } else {
      ElMessage.error(res.message || '提交失败');
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e.message || '提交失败');
    await loadData();
  } finally {
    b._submitting = false;
  }
};

// ===== 导出：一天一天的导 =====
const handleExport = async () => {
  if (range.value.length !== 2) { ElMessage.warning('请先选择日期'); return; }
  const [s, e] = range.value;
  const days = [];
  const cur = new Date(s + 'T00:00:00');
  const end = new Date(e + 'T00:00:00');
  while (cur <= end) { days.push(fmt(cur)); cur.setDate(cur.getDate() + 1); }

  if (days.length > 62) { ElMessage.warning('导出范围过大，请缩小到 62 天以内'); return; }

  exporting.value = true;
  try {
    for (const day of days) {
      const a = document.createElement('a');
      a.href = `/api/bill/export-day?date=${day}`;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise(r => setTimeout(r, 700));
    }
    ElMessage.success(days.length > 1 ? `已按天导出 ${days.length} 天（浏览器可能提示允许多文件下载）` : '导出已开始');
  } finally {
    exporting.value = false;
  }
};

onMounted(() => {
  applyRange();
  loadData();
});
</script>

<style scoped>
.page-container { padding: 16px; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}
.page-header h2 { margin: 0; font-size: 18px; color: #303133; }
.header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.range-text { font-size: 12px; color: #909399; }

.page-summary {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  background: #f7f9fc; border: 1px solid #ebeef5; border-radius: 8px;
  padding: 10px 14px; margin-bottom: 12px; font-size: 13px; color: #606266;
}
.page-summary b { color: #303133; }
.page-summary .money { color: #c0392b; font-family: Consolas, Monaco, monospace; }
.page-summary .money.actual { color: #1f9254; }
.page-summary .money.warn { color: #d64545; }

.bill-block {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px 12px 14px;
  margin-bottom: 14px;
}
.bill-caption {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px 6px 10px;
  border-bottom: 1px dashed #ebeef5;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}
.cap-no { font-weight: 600; color: #303133; font-family: Consolas, Monaco, monospace; }
.cap-item { color: #909399; }
.cap-spacer { flex: 1; }

/* ===== 收款操作条 ===== */
.receipt-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  margin-top: 10px; padding: 9px 12px;
  background: #fafbfd; border: 1px solid #ebeef5; border-radius: 6px;
  font-size: 13px; color: #606266;
}
.rb-left { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.rb-left b { color: #303133; font-family: Consolas, Monaco, monospace; }
.rb-left b.actual { color: #1f9254; }
.rb-left b.warn { color: #d64545; }
.rb-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rb-tip { font-size: 12px; }
.rb-tip.tip-pending { color: #d98600; }
.rb-tip.tip-approved { color: #1f9254; }
.rb-tip.tip-rejected { color: #d64545; }
</style>
