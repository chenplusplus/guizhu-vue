<!-- src/views/order/customer-bill-detail.vue -->
<template>
  <div class="customer-bill-detail">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" plain>
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>客户账单明细</h2>
        <el-select
          v-model="customerId"
          placeholder="选择客户"
          filterable
          clearable
          style="width:220px"
          @change="onCustomerChange"
        >
          <el-option v-for="c in customerOptions" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </div>
      <div class="header-right">
        <el-radio-group v-model="rangeType" @change="onRangeChange">
          <el-radio-button value="month">本月</el-radio-button>
          <el-radio-button value="all">全部</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="rangeType === 'month'"
          v-model="month"
          type="month"
          format="YYYY-MM"
          value-format="YYYY-MM"
          placeholder="选择月份"
          style="width:140px"
          :disabled="rangeType === 'all'"
          @change="onMonthChange"
        />
        <el-button @click="loadDetail">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 图例 -->
    <div class="legend-bar">
      <span class="legend-item legend-bill">● 账单（+应收）</span>
      <span class="legend-item legend-pay">● 收款（-来料/来款）</span>
    </div>

    <!-- 明细列表：账单+收款合并，按时间排序 -->
    <div class="table-wrap" v-loading="loading">
      <el-table :data="allRecords" stripe border size="small" class="detail-table">
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

      <el-empty v-if="!loading && allRecords.length === 0" :description="emptyText" />
    </div>

    <!-- 底部汇总 -->
    <div class="summary-wrap" v-if="allRecords.length > 0">
      <div class="summary-card">
        <div class="summary-title">足金料汇总（{{ rangeLabel }}）</div>
        <div class="summary-row">
          <span class="sum-bill">应收足金料：<strong>{{ fmtWeight(billGold) }}</strong></span>
          <span class="sum-pay">收款足金料：<strong>{{ fmtWeight(payGold) }}</strong></span>
          <span class="sum-debt">净欠足金料：<strong>{{ fmtWeight(billGold - payGold) }}</strong></span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-title">金额汇总（{{ rangeLabel }}）</div>
        <div class="summary-row">
          <span class="sum-bill">应收金额：<strong>{{ fmtMoney(billMoney) }}</strong></span>
          <span class="sum-pay">收款金额：<strong>{{ fmtMoney(payMoney) }}</strong></span>
          <span class="sum-debt">净欠金额：<strong>{{ fmtMoney(billMoney - payMoney) }}</strong></span>
        </div>
      </div>
    </div>

    <!-- 编辑收款弹窗 -->
    <el-dialog v-model="dialogVisible" title="编辑收款/收料" width="520px" :close-on-click-modal="false">
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="110px">
        <el-form-item label="客户" prop="customerId">
          <el-select v-model="form.customerId" placeholder="请选择客户" filterable style="width:100%">
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
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Refresh } from '@element-plus/icons-vue';
import {
  getCustomerMonthlyDetail,
  updateCustomerPayment
} from '@/api/customer-payment';
import { getCustomerList } from '@/api/customer';

const route = useRoute();
const router = useRouter();

// 查询参数
const customerId = ref(route.query.customerId ? Number(route.query.customerId) : null);
const customerName = ref(route.query.customerName || '');
const month = ref(route.query.month || new Date().toISOString().slice(0, 7));
const rangeType = ref(route.query.rangeType === 'all' ? 'all' : 'month');

const loading = ref(false);
const allRecords = ref([]);
const billGold = ref(0);
const payGold = ref(0);
const billMoney = ref(0);
const payMoney = ref(0);

// 编辑弹窗
const dialogVisible = ref(false);
const saving = ref(false);
const formRef = ref(null);
const editingPaymentRow = ref(null);
const customerOptions = ref([]);

const form = ref({
  customerId: null,
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

// ===== 工具函数 =====
const fmtWeight = (v) => (v != null && v !== 0) ? parseFloat(v).toFixed(3) + 'g' : '0.000g';
const fmtMoney = (v) => (v != null && v !== 0) ? '¥' + parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '¥0.00';
const fmtDate = (v) => {
  if (!v) return '-';
  return String(v).slice(0, 10);
};
const methodLabel = (v) => methodOptions.find(m => m.value === v)?.label || v || '-';

// 范围标签：本月显示月份，全部显示"全部"
const rangeLabel = computed(() => rangeType.value === 'all' ? '全部' : (month.value || ''));

// 空态提示
const emptyText = computed(() => {
  if (!customerId.value) return '请先选择客户';
  return rangeType.value === 'all' ? '该客户暂无明细' : '该客户该月份暂无明细';
});

// ===== 加载客户 =====
const loadCustomers = async () => {
  try {
    const res = await getCustomerList();
    const list = res?.data || res || [];
    customerOptions.value = list.map(c => ({ id: c.customerId || c.id, name: c.customerName || c.name }));
  } catch { customerOptions.value = []; }
};

// ===== 加载明细 =====
const loadDetail = async () => {
  if (!customerId.value) {
    allRecords.value = [];
    billGold.value = payGold.value = billMoney.value = payMoney.value = 0;
    return;
  }
  loading.value = true;
  try {
    // 全部模式传 "all"，本月模式传具体月份
    const ym = rangeType.value === 'all' ? 'all' : month.value;
    const res = await getCustomerMonthlyDetail(customerId.value, ym);
    const d = res?.data || {};
    const bills = Array.isArray(d.bills) ? d.bills : [];
    const payments = Array.isArray(d.payments) ? d.payments : [];

    const merged = [
      ...bills.map(b => ({ ...b, type: 'bill' })),
      ...payments.map(p => ({ ...p, type: 'payment' }))
    ].sort((a, b) => {
      const da = new Date(a.recordDate || '');
      const db = new Date(b.recordDate || '');
      return da - db;
    });

    allRecords.value = merged;

    billGold.value = bills.reduce((s, b) => s + parseFloat(b.goldMaterial || 0), 0);
    billMoney.value = bills.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
    payGold.value = payments.reduce((s, p) => s + parseFloat(p.goldMaterial || 0), 0);
    payMoney.value = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  } catch (e) {
    ElMessage.error('加载明细失败：' + (e.message || ''));
    allRecords.value = [];
  } finally {
    loading.value = false;
  }
};

// 月份切换
const onMonthChange = () => {
  router.replace({
    path: route.path,
    query: { ...route.query, month: month.value, rangeType: rangeType.value }
  });
  loadDetail();
};

// 客户切换
const onCustomerChange = (val) => {
  const c = customerOptions.value.find(x => x.id === val);
  const name = c ? c.name : '';
  customerName.value = name;
  router.replace({
    path: route.path,
    query: { ...route.query, customerId: val, customerName: name, rangeType: rangeType.value }
  });
  loadDetail();
};

// 本月/全部切换
const onRangeChange = () => {
  router.replace({
    path: route.path,
    query: { ...route.query, rangeType: rangeType.value, month: month.value }
  });
  loadDetail();
};

// 返回
const goBack = () => {
  router.back();
};

// ===== 编辑收款 =====
const openEditDialog = (row) => {
  if (row.type !== 'payment') return;
  editingPaymentRow.value = row;
  form.value = {
    customerId: row.customerId || customerId.value,
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
  if (!editingPaymentRow.value?.id) { ElMessage.error('找不到记录ID'); return; }
  saving.value = true;
  try {
    await updateCustomerPayment(editingPaymentRow.value.id, {
      paymentMethod: form.value.paymentMethod,
      goldMaterial: form.value.goldMaterial,
      amount: form.value.amount,
      recordDate: form.value.recordDate,
      remark: form.value.remark
    });
    ElMessage.success('保存成功');
    dialogVisible.value = false;
    loadDetail();
  } catch (e) {
    ElMessage.error(e?.message || '操作失败');
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadCustomers();
  loadDetail();
});
</script>

<style scoped>
.customer-bill-detail { padding: 16px; min-height: 100vh; background: #f0f4f9; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 12px 12px 0 0;
  flex-wrap: wrap;
  gap: 12px;
}
.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.page-header h2 { margin: 0; font-size: 18px; font-weight: 600; }

.legend-bar {
  display: flex;
  gap: 20px;
  padding: 10px 24px;
  font-size: 12px;
  background: #fff;
  border-bottom: 1px solid #e8ecf1;
}
.legend-item { display: inline-flex; align-items: center; }
.legend-bill { color: #409eff; }
.legend-pay { color: #e6a23c; }

.table-wrap {
  background: #fff;
  padding: 16px 24px;
}

/* 明细表行颜色 */
:deep(.detail-table) .bill-row { background: #ecf5ff !important; }
:deep(.detail-table) .payment-row { background: #fef0e7 !important; }

/* 金额颜色 */
.amount-bill { color: #409eff; font-weight: 600; }
.amount-pay { color: #e6a23c; font-weight: 600; }

/* 底部汇总 */
.summary-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  background: #fff;
  padding: 16px 24px 24px;
  border-radius: 0 0 12px 12px;
}
.summary-card {
  border: 1px solid #e8f0fe;
  border-radius: 10px;
  padding: 14px 18px;
  background: #f8faff;
}
.summary-title {
  font-size: 13px;
  font-weight: 600;
  color: #8a9aaa;
  margin-bottom: 10px;
}
.summary-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}
.summary-row strong { font-size: 15px; }
.sum-bill strong { color: #409eff; }
.sum-pay strong { color: #e6a23c; }
.sum-debt strong { color: #f56c6c; }

@media (max-width: 768px) {
  .summary-wrap { grid-template-columns: 1fr; }
}
</style>
