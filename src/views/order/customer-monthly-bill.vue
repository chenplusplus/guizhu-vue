<template>
  <div class="customer-monthly-bill">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>📊 客户月度账单</h2>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <el-date-picker
        v-model="selectedMonth"
        type="month"
        format="YYYY-MM"
        value-format="YYYY-MM"
        placeholder="选择月份"
        style="width:150px"
        @change="loadSummary"
      />
      <el-button type="primary" icon="Plus" @click="openCreateDialog">+ 快捷收款/收料</el-button>
      <el-button icon="Refresh" @click="loadSummary">刷新</el-button>
    </div>

    <!-- 汇总表：每客户一行 -->
    <div class="table-wrap">
      <el-table :data="summaryList" stripe border size="small" @row-click="openDrawer" highlight-current-row>
        <el-table-column prop="customerName" label="客户" min-width="130" fixed />
        <el-table-column prop="monthGoldMaterialWeight" label="本月足金料(g)" align="right" min-width="130">
          <template #default="{row}">{{ fmtWeight(row.monthGoldMaterialWeight) }}</template>
        </el-table-column>
        <el-table-column prop="monthReceivableAmount" label="本月应收金额(元)" align="right" min-width="140">
          <template #default="{row}">{{ fmtMoney(row.monthReceivableAmount) }}</template>
        </el-table-column>
        <el-table-column prop="monthReceivedMaterial" label="本月来料(g)" align="right" min-width="120">
          <template #default="{row}">{{ fmtWeight(row.monthReceivedMaterial) }}</template>
        </el-table-column>
        <el-table-column prop="monthReceivedMoney" label="本月来款(元)" align="right" min-width="120">
          <template #default="{row}">{{ fmtMoney(row.monthReceivedMoney) }}</template>
        </el-table-column>
        <el-table-column prop="totalDebtMaterial" label="累欠足料(g)" align="right" min-width="120">
          <template #default="{row}">
            <span :class="row.totalDebtMaterial > 0 ? 'debt-pos' : 'debt-zero'">
              {{ fmtWeight(row.totalDebtMaterial) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="totalDebtMoney" label="累欠金额(元)" align="right" min-width="120">
          <template #default="{row}">
            <span :class="row.totalDebtMoney > 0 ? 'debt-pos' : 'debt-zero'">
              {{ fmtMoney(row.totalDebtMoney) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{row}">
            <el-button type="primary" link size="small" @click.stop="openDrawer(row)">明细</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="summaryList.length === 0 && !loading" description="暂无数据" />
    </div>

    <!-- 收款/收料弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '快捷收款/收料' : '编辑收款/收料'" width="520px"
      :close-on-click-modal="false">
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="110px">
        <el-form-item label="客户" prop="customerId">
          <el-select v-model="form.customerId" placeholder="请选择客户" filterable style="width:100%"
            @change="onCustomerChange">
            <el-option v-for="c in customerOptions" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="支付方式" prop="paymentMethod">
          <el-select v-model="form.paymentMethod" placeholder="请选择" style="width:100%">
            <el-option v-for="m in methodOptions" :key="m.value" :label="m.label" :value="m.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="来足金料(g)" prop="goldMaterial">
          <el-input-number v-model="form.goldMaterial" :min="0" :precision="3" :step="0.1" style="width:100%" placeholder="克" />
        </el-form-item>
        <el-form-item label="来款(元)" prop="amount">
          <el-input-number v-model="form.amount" :min="0" :precision="2" :step="100" style="width:100%" placeholder="元" />
        </el-form-item>
        <el-form-item label="关联账单" prop="billId">
          <el-select v-model="form.billId" placeholder="可选，不填为散收" clearable filterable style="width:100%"
            @change="onBillChange">
            <el-option v-for="b in billOptions" :key="b.billId" :label="b.billNo + ' — ' + b.customerName" :value="b.billId" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期" prop="recordDate">
          <el-date-picker v-model="form.recordDate" type="date" format="YYYY-MM-DD"
            value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">{{ dialogMode === 'create' ? '新增' : '保存' }}</el-button>
      </template>
    </el-dialog>

    <!-- 明细抽屉 -->
    <el-drawer v-model="drawerVisible" :title="'明细 — ' + (drawerCustomerName || '')" size="780px"
      direction="rtl" :with-header="true">
      <div class="drawer-toolbar">
        <span class="drawer-month">{{ selectedMonth }}</span>
        <el-button type="primary" size="small" icon="Plus" @click="openCreateDialog">新增收款</el-button>
      </div>

      <!-- 图例 -->
      <div class="drawer-legend">
        <span class="legend-item legend-bill">● 账单（+应收）</span>
        <span class="legend-item legend-pay">● 收款（-来料/来款）</span>
      </div>

      <!-- 明细列表：账单+收款合并，按时间排序 -->
      <el-table :data="drawerAllRecords" stripe border size="small" class="detail-table">
        <el-table-column prop="recordDate" label="日期" width="110">
          <template #default="{row}">{{ fmtDate(row.recordDate) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="80">
          <template #default="{row}">
            <el-tag :type="row.type === 'bill' ? 'primary' : 'warning'" size="small">
              {{ row.type === 'bill' ? '账单' : '收款' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="billNo" label="单号/方式" min-width="150">
          <template #default="{row}">
            <span v-if="row.type === 'bill'">{{ row.billNo }}</span>
            <span v-else>{{ row.paymentMethod ? methodLabel(row.paymentMethod) : (row.billNo || '散收') }}</span>
          </template>
        </el-table-column>
        <el-table-column label="足金料(g)" align="right" width="120">
          <template #default="{row}">
            <span v-if="row.type === 'bill'" class="amount-bill">{{ fmtWeight(row.goldMaterial) }}</span>
            <span v-else class="amount-pay">{{ row.goldMaterial > 0 ? '-' + fmtWeight(row.goldMaterial) : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="金额(元)" align="right" width="130">
          <template #default="{row}">
            <span v-if="row.type === 'bill'" class="amount-bill">{{ fmtMoney(row.amount) }}</span>
            <span v-else class="amount-pay">{{ row.amount > 0 ? '-' + fmtMoney(row.amount) : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="operatorName" label="经办人" width="90">
          <template #default="{row}">{{ row.createdByName || row.operatorName || '-' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{row}">
            <el-button v-if="row.type === 'payment'" type="primary" link size="small" @click="openEditDialog(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 底部汇总 -->
      <div class="drawer-summary" v-if="drawerAllRecords.length > 0">
        <span class="sum-bill">本月应收足金料：<strong>{{ fmtWeight(drawerBillGold) }}</strong></span>
        <span class="sum-pay">本月收款足金料：<strong>{{ fmtWeight(drawerPayGold) }}</strong></span>
        <span class="sum-debt">本月净欠足金料：<strong>{{ fmtWeight(drawerBillGold - drawerPayGold) }}</strong></span>
      </div>
      <div class="drawer-summary" v-if="drawerAllRecords.length > 0">
        <span class="sum-bill">本月应收金额：<strong>{{ fmtMoney(drawerBillMoney) }}</strong></span>
        <span class="sum-pay">本月收款金额：<strong>{{ fmtMoney(drawerPayMoney) }}</strong></span>
        <span class="sum-debt">本月净欠金额：<strong>{{ fmtMoney(drawerBillMoney - drawerPayMoney) }}</strong></span>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getCustomerMonthlySummary,
  getCustomerMonthlyDetail,
  getCustomerPaymentList,
  createCustomerPayment,
  updateCustomerPayment,
  deleteCustomerPayment
} from '@/api/customer-payment';
import { getCustomerList } from '@/api/customer';
import { getAvailableBillsForLr } from '@/api/lr';

const selectedMonth = ref(new Date().toISOString().slice(0, 7));
const summaryList = ref([]);
const loading = ref(false);

// 客户选项
const customerOptions = ref([]);
const billOptions = ref([]);

// 新增/编辑弹窗
const dialogVisible = ref(false);
const dialogMode = ref('create');
const saving = ref(false);
const formRef = ref(null);

const form = ref({
  customerId: null,
  customerName: '',
  billId: null,
  billNo: '',
  paymentMethod: 'cash',
  goldMaterial: 0,
  amount: 0,
  recordDate: new Date().toISOString().slice(0, 10),
  remark: ''
});

const formRules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  paymentMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
  recordDate: [{ required: true, message: '请选择日期', trigger: 'change' }]
};

const methodOptions = [
  { value: 'cash', label: '现金' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信' },
  { value: 'bank', label: '银行转账' },
  { value: 'deduct', label: '抵扣' }
];

// 抽屉
const drawerVisible = ref(false);
const drawerCustomerId = ref(null);
const drawerCustomerName = ref('');
const drawerAllRecords = ref([]);
const drawerBillGold = ref(0);
const drawerPayGold = ref(0);
const drawerBillMoney = ref(0);
const drawerPayMoney = ref(0);
// 当前编辑的收款记录原始行（用于定位 id）
const editingPaymentRow = ref(null);

// ===== 工具函数 =====
const fmtWeight = (v) => (v != null && v !== 0) ? parseFloat(v).toFixed(3) + 'g' : '0.000g';
const fmtMoney = (v) => (v != null && v !== 0) ? '¥' + parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '¥0.00';
const fmtDate = (v) => {
  if (!v) return '-';
  return String(v).slice(0, 10);
};
const methodLabel = (v) => methodOptions.find(m => m.value === v)?.label || v || '-';

// ===== 数据加载 =====
const loadCustomers = async () => {
  try {
    const res = await getCustomerList();
    const list = res?.data || res || [];
    customerOptions.value = list.map(c => ({ id: c.customerId || c.id, name: c.customerName || c.name }));
  } catch { customerOptions.value = []; }
};

const loadBills = async () => {
  try {
    const res = await getAvailableBillsForLr();
    billOptions.value = res?.data || [];
  } catch { billOptions.value = []; }
};

const loadSummary = async () => {
  loading.value = true;
  try {
    const res = await getCustomerMonthlySummary(selectedMonth.value);
    summaryList.value = res?.data || [];
  } catch (e) {
    ElMessage.error('加载汇总失败：' + (e.message || ''));
    summaryList.value = [];
  } finally {
    loading.value = false;
  }
};

// ===== 抽屉 =====
const openDrawer = async (row) => {
  drawerCustomerId.value = row.customerId;
  drawerCustomerName.value = row.customerName;
  drawerVisible.value = true;
  await loadDrawerRecords();
};

const loadDrawerRecords = async () => {
  try {
    const res = await getCustomerMonthlyDetail(drawerCustomerId.value, selectedMonth.value);
    const d = res?.data || {};
    const bills = Array.isArray(d.bills) ? d.bills : [];
    const payments = Array.isArray(d.payments) ? d.payments : [];

    // 合并并按时间排序
    const merged = [
      ...bills.map(b => ({ ...b, type: 'bill' })),
      ...payments.map(p => ({ ...p, type: 'payment' }))
    ].sort((a, b) => {
      const da = new Date(a.recordDate || '');
      const db = new Date(b.recordDate || '');
      return da - db;
    });

    drawerAllRecords.value = merged;

    // 汇总
    drawerBillGold.value = bills.reduce((s, b) => s + parseFloat(b.goldMaterial || 0), 0);
    drawerBillMoney.value = bills.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
    drawerPayGold.value = payments.reduce((s, p) => s + parseFloat(p.goldMaterial || 0), 0);
    drawerPayMoney.value = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  } catch (e) {
    ElMessage.error('加载明细失败：' + (e.message || ''));
    drawerAllRecords.value = [];
  }
};

// ===== 新增/编辑 =====
const onCustomerChange = (cid) => {
  const c = customerOptions.value.find(x => x.id === cid);
  form.value.customerName = c?.name || '';
};

const onBillChange = (billId) => {
  if (!billId) { form.value.billNo = ''; return; }
  const b = billOptions.value.find(x => x.billId === billId);
  form.value.billNo = b?.billNo || '';
};

const openCreateDialog = () => {
  dialogMode.value = 'create';
  form.value = {
    customerId: drawerCustomerId.value || null,
    customerName: drawerCustomerName.value || '',
    billId: null,
    billNo: '',
    paymentMethod: 'cash',
    goldMaterial: 0,
    amount: 0,
    recordDate: new Date().toISOString().slice(0, 10),
    remark: ''
  };
  dialogVisible.value = true;
};

const openEditDialog = (row) => {
  if (row.type !== 'payment') return;
  editingPaymentRow.value = row;
  dialogMode.value = 'edit';
  form.value = {
    customerId: row.customerId || drawerCustomerId.value,
    customerName: row.customerName || drawerCustomerName.value,
    billId: row.billId || null,
    billNo: row.billNo || '',
    paymentMethod: row.paymentMethod || 'cash',
    goldMaterial: row.goldMaterial || 0,
    amount: row.amount || 0,
    recordDate: fmtDate(row.recordDate),
    remark: row.remark || ''
  };
  dialogVisible.value = true;
};

const submitForm = async () => {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    if (dialogMode.value === 'create') {
      await createCustomerPayment(form.value);
      ElMessage.success('新增成功');
      loadSummary();
      if (drawerVisible.value) loadDrawerRecords();
    } else {
      if (!editingPaymentRow.value?.id) { ElMessage.error('找不到记录ID'); return; }
      await updateCustomerPayment(editingPaymentRow.value.id, {
        paymentMethod: form.value.paymentMethod,
        goldMaterial: form.value.goldMaterial,
        amount: form.value.amount,
        recordDate: form.value.recordDate,
        remark: form.value.remark
      });
      ElMessage.success('保存成功');
      if (drawerVisible.value) loadDrawerRecords();
    }
    dialogVisible.value = false;
  } catch (e) {
    ElMessage.error(e?.message || '操作失败');
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadCustomers();
  loadBills();
  loadSummary();
});
</script>

<style scoped>
.customer-monthly-bill { padding: 16px; }
.page-header { margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; }
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.table-wrap { margin-bottom: 16px; }

/* 抽屉 */
.drawer-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #eee; }
.drawer-month { font-weight: 600; color: #409eff; font-size: 14px; }
.drawer-legend { display: flex; gap: 20px; padding: 8px 16px; font-size: 12px; border-bottom: 1px solid #f0f0f0; background: #fafafa; }
.legend-item { display: inline-flex; align-items: center; }
.legend-bill { color: #409eff; }
.legend-pay { color: #e6a23c; }
.drawer-summary { display: flex; gap: 24px; padding: 8px 16px; font-size: 12px; background: #f5f7fa; }
.drawer-summary span { flex: 1; }
.drawer-summary strong { font-size: 13px; }
.sum-bill strong { color: #409eff; }
.sum-pay strong { color: #e6a23c; }
.sum-debt strong { color: #f56c6c; }

/* 明细表行颜色 */
:deep(.detail-table) .bill-row { background: #ecf5ff !important; }
:deep(.detail-table) .payment-row { background: #fef0e7 !important; }

/* 金额颜色 */
.amount-bill { color: #409eff; font-weight: 600; }
.amount-pay { color: #e6a23c; font-weight: 600; }
.debt-pos { color: #e6a23c; font-weight: 600; }
.debt-zero { color: #67c23a; }
.muted { color: #c0c4cc; }
</style>
