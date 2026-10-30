<template>
  <div class="customer-monthly-bill">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>📊 客户月度账单</h2>
    </div>

    <!-- 查询栏 -->
    <div class="toolbar">
      <el-date-picker
        v-model="selectedMonth"
        type="month"
        format="YYYY-MM"
        value-format="YYYY-MM"
        placeholder="选择月份"
        style="width:140px"
      />
      <el-select
        v-model="query.customerId"
        placeholder="客户"
        clearable filterable
        style="width:180px"
      >
        <el-option v-for="c in customerOptions" :key="c.id" :label="c.name" :value="c.id" />
      </el-select>
      <el-input
        v-model="query.keyword"
        placeholder="客户名 / 账单号"
        clearable
        style="width:180px"
        @keyup.enter="loadSummary"
      />
      <el-button type="primary" icon="Search" @click="loadSummary">查询</el-button>
      <el-button @click="resetQuery">重置</el-button>
      <el-divider direction="vertical" />
      <el-button link type="primary" @click="quickMonth(0)">本月</el-button>
      <el-button link type="primary" @click="quickMonth(-1)">上月</el-button>
      <el-divider direction="vertical" />
      <el-button type="success" icon="Plus" @click="openCreateDialog">+ 快捷收款/收料</el-button>
      <el-button type="warning" icon="List" @click="openOrderCollectDialog">按订单收款</el-button>
      <el-button icon="Refresh" @click="loadSummary">刷新</el-button>
    </div>

    <!-- 汇总表：每客户一行（应收 / 已收 / 未收） -->
    <div class="table-wrap">
      <el-table :data="summaryList" stripe border size="small" v-loading="loading" @row-click="openDrawer" highlight-current-row>
        <el-table-column prop="customerName" label="客户" min-width="130" fixed />

        <!-- 本月金额：应收 / 已收 / 未收 -->
        <el-table-column label="本月金额(元)" align="center">
          <template #default><span style="color:#909399;font-size:12px;">应收 / 已收 / 未收</span></template>
        </el-table-column>
        <el-table-column prop="monthReceivableAmount" label="本月应收" align="right" min-width="120">
          <template #default="{row}">{{ fmtMoney(row.monthReceivableAmount) }}</template>
        </el-table-column>
        <el-table-column prop="monthReceivedMoney" label="本月已收" align="right" min-width="120">
          <template #default="{row}">
            <span class="recv-pos">{{ fmtMoney(row.monthReceivedMoney) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="本月未收" align="right" min-width="120">
          <template #default="{row}">
            <span :class="unpaidClass(row.monthReceivableAmount - row.monthReceivedMoney)">
              {{ fmtMoney((row.monthReceivableAmount || 0) - (row.monthReceivedMoney || 0)) }}
            </span>
          </template>
        </el-table-column>

        <!-- 本月金料：应收 / 已收 / 未收 -->
        <el-table-column prop="monthGoldMaterialWeight" label="本月应收料(g)" align="right" min-width="125">
          <template #default="{row}">{{ fmtWeight(row.monthGoldMaterialWeight) }}</template>
        </el-table-column>
        <el-table-column prop="monthReceivedMaterial" label="本月已收料(g)" align="right" min-width="125">
          <template #default="{row}">
            <span class="recv-pos">{{ fmtWeight(row.monthReceivedMaterial) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="本月未收料(g)" align="right" min-width="125">
          <template #default="{row}">
            <span :class="unpaidClass((row.monthGoldMaterialWeight || 0) - (row.monthReceivedMaterial || 0))">
              {{ fmtWeight((row.monthGoldMaterialWeight || 0) - (row.monthReceivedMaterial || 0)) }}
            </span>
          </template>
        </el-table-column>

        <!-- 累计：应收 / 已收 / 未收 -->
        <el-table-column prop="totalReceivableMoney" label="累计应收(元)" align="right" min-width="130">
          <template #default="{row}">{{ fmtMoney(row.totalReceivableMoney) }}</template>
        </el-table-column>
        <el-table-column prop="totalReceivedMoney" label="累计已收(元)" align="right" min-width="130">
          <template #default="{row}">
            <span class="recv-pos">{{ fmtMoney(row.totalReceivedMoney) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalDebtMoney" label="累计未收(元)" align="right" min-width="130">
          <template #default="{row}">
            <span :class="unpaidClass(row.totalDebtMoney)">{{ fmtMoney(row.totalDebtMoney) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalReceivableMaterial" label="累计应收料(g)" align="right" min-width="130">
          <template #default="{row}">{{ fmtWeight(row.totalReceivableMaterial) }}</template>
        </el-table-column>
        <el-table-column prop="totalReceivedMaterial" label="累计已收料(g)" align="right" min-width="130">
          <template #default="{row}">
            <span class="recv-pos">{{ fmtWeight(row.totalReceivedMaterial) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalDebtMaterial" label="累计未收料(g)" align="right" min-width="130">
          <template #default="{row}">
            <span :class="unpaidClass(row.totalDebtMaterial)">{{ fmtWeight(row.totalDebtMaterial) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{row}">
            <el-button type="primary" link size="small" @click.stop="openDrawer(row)">账单明细</el-button>
            <el-button type="success" link size="small" @click.stop="openPaymentDetail(row)">收款明细</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="summaryList.length === 0 && !loading" description="暂无数据" />
    </div>

    <!-- 收款明细弹窗（可查看/编辑/删除） -->
    <el-dialog v-model="payDetailVisible" :title="`💵 收款明细 — ${payDetailCustomer}`" width="900px" :close-on-click-modal="false">
      <div class="pay-sum" v-if="payDetailList.length">
        <span>共 {{ payDetailList.length }} 笔</span>
        <span>已收金料：<strong class="recv-pos">{{ fmtWeight(paySumMaterial) }}</strong></span>
        <span>已收金额：<strong class="recv-pos">{{ fmtMoney(paySumMoney) }}</strong></span>
      </div>
      <el-table :data="payDetailList" border stripe size="small" v-loading="payDetailLoading" max-height="420">
        <el-table-column prop="recordDate" label="日期" width="110">
          <template #default="{row}">{{ fmtDate(row.recordDate) }}</template>
        </el-table-column>
        <el-table-column label="方式" width="100" align="center">
          <template #default="{row}">{{ methodText(row.paymentMethod) }}</template>
        </el-table-column>
        <el-table-column prop="billNo" label="关联账单" min-width="130" show-overflow-tooltip>
          <template #default="{row}">{{ row.billNo || '散收' }}</template>
        </el-table-column>
        <el-table-column prop="goldMaterial" label="收金料(g)" width="110" align="right">
          <template #default="{row}">{{ fmtWeight(row.goldMaterial) }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="收金额(元)" width="130" align="right">
          <template #default="{row}">
            <span class="recv-pos">{{ fmtMoney(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdByName" label="经办人" width="90" />
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
        <el-table-column label="操作" width="110" fixed="right" align="center">
          <template #default="{row}">
            <el-button type="primary" link size="small" @click="openEditPayment(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="removePayment(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="payDetailList.length === 0 && !payDetailLoading" description="该月暂无收款记录" />
      <template #footer>
        <el-button @click="payDetailVisible = false">关闭</el-button>
        <el-button type="primary" @click="openCreateDialog">+ 新增收款</el-button>
      </template>
    </el-dialog>

    <!-- 编辑收款弹窗 -->
    <el-dialog v-model="payEditVisible" title="编辑收款记录" width="480px" :close-on-click-modal="false">
      <el-form :model="payForm" label-width="100px" size="small">
        <el-form-item label="支付方式">
          <el-select v-model="payForm.paymentMethod" style="width:100%">
            <el-option v-for="m in methodOptions" :key="m.value" :label="m.label" :value="m.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="来足金料(g)">
          <el-input-number v-model="payForm.goldMaterial" :min="0" :precision="3" :step="0.1" style="width:100%" />
        </el-form-item>
        <el-form-item label="来款(元)">
          <el-input-number v-model="payForm.amount" :min="0" :precision="2" :step="100" style="width:100%" />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="payForm.recordDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="payForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="payEditVisible = false">取消</el-button>
        <el-button type="primary" :loading="paySaving" @click="savePaymentEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 收款/收料弹窗 -->
    <el-dialog v-model="dialogVisible" title="快捷收款/收料" width="520px"
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
        <el-button type="primary" :loading="saving" @click="submitForm">新增</el-button>
      </template>
    </el-dialog>

    <!-- 按订单收款弹窗 -->
    <el-dialog
      v-model="orderCollectVisible"
      title="💰 按订单收款"
      width="1100px"
      :close-on-click-modal="false"
      top="6vh"
    >
      <!-- 筛选栏 -->
      <div class="collect-filter">
        <el-date-picker
          v-model="collectFilter.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 260px"
          @change="loadCollectable"
        />
        <el-select
          v-model="collectFilter.customerId"
          placeholder="客户"
          clearable
          filterable
          style="width: 180px"
          @change="loadCollectable"
        >
          <el-option v-for="c in customerOptions" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-select
          v-model="collectFilter.salesman"
          placeholder="销售"
          clearable
          filterable
          style="width: 160px"
          @change="loadCollectable"
        >
          <el-option v-for="s in salesmanOptions" :key="s" :label="s" :value="s" />
        </el-select>
        <el-button type="primary" icon="Search" @click="loadCollectable">查询</el-button>
        <el-button @click="resetCollectFilter">重置</el-button>
      </div>

      <!-- 候选明细表格 -->
      <el-table
        ref="collectTableRef"
        :data="collectableList"
        stripe
        border
        size="small"
        max-height="420"
        v-loading="collectLoading"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column prop="orderNo" label="订单号" width="130" />
        <el-table-column prop="billNo" label="账单号" width="130" />
        <el-table-column prop="customerName" label="客户" min-width="100" show-overflow-tooltip />
        <el-table-column prop="salesman" label="销售" width="80" />
        <el-table-column prop="productName" label="品名" min-width="120" show-overflow-tooltip />
        <el-table-column prop="color" label="成色" width="70" />
        <el-table-column prop="quantity" label="数量" width="55" align="center" />
        <el-table-column prop="goldMaterialWeight" label="足金料(g)" width="90" align="right">
          <template #default="{row}">{{ fmtWeight(row.goldMaterialWeight) }}</template>
        </el-table-column>
        <el-table-column label="足金料费" width="95" align="right">
          <template #default="{row}">
            <span v-if="row.isMaterial" class="muted">来料 ¥0.00</span>
            <span v-else>{{ fmtMoney(row.goldMaterialFee) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="钻石(元)" width="110" align="right">
          <template #default="{row}">
            {{ fmtMoney((row.mainStoneAmount || 0) + (row.subStoneAmount || 0)) }}
          </template>
        </el-table-column>
        <el-table-column label="镶石费(元)" width="95" align="right">
          <template #default="{row}">
            {{ fmtMoney((row.mainStoneSettingFee || 0) + (row.subStoneSettingFee || 0)) }}
          </template>
        </el-table-column>
        <el-table-column label="包证邮(元)" width="95" align="right">
          <template #default="{row}">
            {{ fmtMoney((row.packingFee || 0) + (row.certificateFee || 0) + (row.postageFee || 0)) }}
          </template>
        </el-table-column>
        <el-table-column label="版费+工费(元)" width="110" align="right">
          <template #default="{row}">
            {{ fmtMoney((row.moldFee || 0) + (row.laborFee || 0)) }}
          </template>
        </el-table-column>
        <el-table-column label="金价" width="100" align="center">
          <template #default="{row}">
            <el-input-number
              v-model="row.goldPrice"
              :min="0"
              :precision="2"
              :step="10"
              size="small"
              controls-position="right"
              :disabled="row.isMaterial"
              style="width: 100%"
              @change="onRowChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="来料" width="65" align="center">
          <template #default="{row}">
            <el-switch
              v-model="row.isMaterial"
              size="small"
              @change="onMaterialChange(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="收款金额(元)" width="130" align="right" fixed="right">
          <template #default="{row}">
            <el-input-number
              v-model="row.collectAmount"
              :min="0"
              :precision="2"
              :step="100"
              size="small"
              controls-position="right"
              style="width: 100%"
            />
          </template>
        </el-table-column>
      </el-table>

      <!-- 汇总 -->
      <div class="collect-summary">
        <span>已选 <strong>{{ collectSelected.length }}</strong> 项</span>
        <span>应收合计：<strong class="c-blue">{{ fmtMoney(collectTotalAmount) }}</strong></span>
        <span>足金料合计：<strong class="c-orange">{{ fmtWeight(collectTotalMaterial) }}</strong></span>
      </div>

      <template #footer>
        <el-button @click="orderCollectVisible = false">取消</el-button>
        <el-button type="primary" :loading="collectSaving" @click="submitOrderCollect">确认收款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getCustomerMonthlySummary,
  createCustomerPayment,
  getCollectableOrders,
  getCustomerPaymentList,
  updateCustomerPayment,
  deleteCustomerPayment
} from '@/api/customer-payment';
import { getCustomerList } from '@/api/customer';
import { getAvailableBillsForLr } from '@/api/lr';

const router = useRouter();

const selectedMonth = ref(new Date().toISOString().slice(0, 7));
const summaryList = ref([]);
const loading = ref(false);

// 客户选项
const customerOptions = ref([]);
const billOptions = ref([]);

// 新增/编辑弹窗
const dialogVisible = ref(false);
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

// ===== 工具函数 =====
const fmtWeight = (v) => (v != null && v !== 0) ? parseFloat(v).toFixed(3) + 'g' : '0.000g';
const fmtMoney = (v) => (v != null && v !== 0) ? '¥' + parseFloat(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '¥0.00';
const fmtDate = (v) => {
  if (!v) return '-';
  return String(v).slice(0, 10);
};

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

// ===== 查询条件 =====
const query = reactive({ customerId: null, keyword: '' });

const loadSummary = async () => {
  if (!selectedMonth.value) {
    ElMessage.warning('请选择月份');
    return;
  }
  loading.value = true;
  try {
    const params = {};
    if (query.customerId) params.customerId = query.customerId;
    if (query.keyword) params.keyword = query.keyword.trim();
    const res = await getCustomerMonthlySummary(selectedMonth.value, params);
    summaryList.value = res?.data || [];
  } catch (e) {
    ElMessage.error('加载汇总失败：' + (e.message || ''));
    summaryList.value = [];
  } finally {
    loading.value = false;
  }
};

const resetQuery = () => {
  query.customerId = null;
  query.keyword = '';
  loadSummary();
};

// 快捷月份：0=本月，-1=上月
const quickMonth = (offset) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  selectedMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  loadSummary();
};

// 未收金额/料：>0 橙色（欠款），<=0 绿色（已结清或预收）
const unpaidClass = (v) => (Number(v) > 0 ? 'debt-pos' : 'recv-pos');

// ===== 收款明细 =====
const payDetailVisible = ref(false);
const payDetailLoading = ref(false);
const payDetailList = ref([]);
const payDetailCustomer = ref('');

const paySumMoney = computed(() => payDetailList.value.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0));
const paySumMaterial = computed(() => payDetailList.value.reduce((s, r) => s + (parseFloat(r.goldMaterial) || 0), 0));

const methodText = (m) => (methodOptions.find(x => x.value === m)?.label) || m || '-';

const openPaymentDetail = async (row) => {
  payDetailCustomer.value = row.customerName || '';
  payDetailVisible.value = true;
  payDetailLoading.value = true;
  try {
    const res = await getCustomerPaymentList({
      customerId: row.customerId,
      yearMonth: selectedMonth.value,
      pageSize: 200
    });
    payDetailList.value = res?.data || [];
  } catch (e) {
    ElMessage.error('加载收款明细失败：' + (e.message || ''));
    payDetailList.value = [];
  } finally {
    payDetailLoading.value = false;
  }
};

// ===== 编辑 / 删除收款 =====
const payEditVisible = ref(false);
const paySaving = ref(false);
const payForm = ref({ id: 0, paymentMethod: 'cash', goldMaterial: 0, amount: 0, recordDate: '', remark: '' });

const openEditPayment = (row) => {
  payForm.value = {
    id: row.id,
    paymentMethod: row.paymentMethod,
    goldMaterial: Number(row.goldMaterial) || 0,
    amount: Number(row.amount) || 0,
    recordDate: fmtDate(row.recordDate),
    remark: row.remark || ''
  };
  payEditVisible.value = true;
};

const savePaymentEdit = async () => {
  paySaving.value = true;
  try {
    await updateCustomerPayment(payForm.value.id, {
      paymentMethod: payForm.value.paymentMethod,
      goldMaterial: payForm.value.goldMaterial,
      amount: payForm.value.amount,
      recordDate: payForm.value.recordDate,
      remark: payForm.value.remark
    });
    ElMessage.success('保存成功');
    payEditVisible.value = false;
    // 刷新明细 + 汇总（已收/未收会跟着变）
    const cid = summaryList.value.find(x => x.customerName === payDetailCustomer.value)?.customerId;
    if (cid) await openPaymentDetail({ customerId: cid, customerName: payDetailCustomer.value });
    loadSummary();
  } catch (e) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    paySaving.value = false;
  }
};

const removePayment = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除这笔收款记录吗？', '提示', { type: 'warning' });
  } catch { return; }
  try {
    await deleteCustomerPayment(row.id);
    ElMessage.success('已删除');
    const cid = summaryList.value.find(x => x.customerName === payDetailCustomer.value)?.customerId;
    if (cid) await openPaymentDetail({ customerId: cid, customerName: payDetailCustomer.value });
    loadSummary();
  } catch (e) {
    ElMessage.error(e?.message || '删除失败');
  }
};

// ===== 明细：跳转到独立明细页面 =====
const openDrawer = (row) => {
  router.push({
    path: '/order/customer-bill-detail',
    query: {
      customerId: row.customerId,
      customerName: row.customerName,
      month: selectedMonth.value
    }
  });
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
  form.value = {
    customerId: null,
    customerName: '',
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

const submitForm = async () => {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  saving.value = true;
  try {
    await createCustomerPayment(form.value);
    ElMessage.success('新增成功');
    loadSummary();
    // 若正在查看某客户的收款明细，同步刷新
    if (payDetailVisible.value) {
      openPaymentDetail({ customerId: form.value.customerId, customerName: form.value.customerName });
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

// ===== 按订单收款 =====
const orderCollectVisible = ref(false);
const collectLoading = ref(false);
const collectSaving = ref(false);
const collectTableRef = ref(null);
const collectableList = ref([]);
const collectSelected = ref([]);
const salesmanOptions = ref([]);

const collectFilter = reactive({
  dateRange: null,
  customerId: null,
  salesman: ''
});

// 已勾选明细的汇总
const collectTotalAmount = computed(() =>
  collectSelected.value.reduce((s, r) => s + (parseFloat(r.collectAmount) || 0), 0)
);
const collectTotalMaterial = computed(() =>
  collectSelected.value.reduce((s, r) => s + (parseFloat(r.goldMaterialWeight) || 0), 0)
);

// 加载候选明细
const loadCollectable = async () => {
  collectLoading.value = true;
  try {
    const params = {};
    if (collectFilter.dateRange && collectFilter.dateRange.length === 2) {
      params.startDate = collectFilter.dateRange[0];
      params.endDate = collectFilter.dateRange[1];
    }
    if (collectFilter.customerId) params.customerId = collectFilter.customerId;
    if (collectFilter.salesman) params.salesman = collectFilter.salesman;

    const res = await getCollectableOrders(params);
    const list = (res?.data || []).map(d => ({
      ...d,
      // 收款金额默认 = 各费用项之和（足金料费 + 钻石 + 镶石 + 包证邮 + 版费 + 工费）
      collectAmount: calcRowAmount(d),
      isMaterial: false
    }));
    collectableList.value = list;
    // 销售下拉（去重）
    salesmanOptions.value = [...new Set(list.map(d => d.salesman).filter(Boolean))];
  } catch (e) {
    ElMessage.error('加载收款明细失败：' + (e.message || ''));
    collectableList.value = [];
  } finally {
    collectLoading.value = false;
  }
};

const resetCollectFilter = () => {
  collectFilter.dateRange = null;
  collectFilter.customerId = null;
  collectFilter.salesman = '';
  loadCollectable();
};

const openOrderCollectDialog = () => {
  orderCollectVisible.value = true;
  collectSelected.value = [];
  loadCollectable();
};

// 勾选变化
const onSelectionChange = (selection) => {
  collectSelected.value = selection;
};

// 计算某行的应收金额：金料费(来料=0) + 钻石 + 镶石 + 包证邮 + 版费 + 工费
const calcRowAmount = (row) => {
  const goldFee = row.isMaterial ? 0 : (parseFloat(row.goldMaterialFee) || 0);
  const other =
    (parseFloat(row.mainStoneAmount) || 0) +
    (parseFloat(row.mainStoneSettingFee) || 0) +
    (parseFloat(row.subStoneAmount) || 0) +
    (parseFloat(row.subStoneSettingFee) || 0) +
    (parseFloat(row.packingFee) || 0) +
    (parseFloat(row.certificateFee) || 0) +
    (parseFloat(row.postageFee) || 0) +
    (parseFloat(row.moldFee) || 0) +
    (parseFloat(row.laborFee) || 0);
  return Math.max(0, goldFee + other);
};

// 来料开关：开启→金料费归0（其它费用保留）；关闭→恢复金料费
const onMaterialChange = (row) => {
  if (row.isMaterial) {
    row.goldPrice = 0;
  }
  // 重新计算金额：来料时只去掉金料费，钻石/工费等照算
  row.collectAmount = calcRowAmount(row);
};

// 手动改金价：重算金料费（= 新金价 × 料重），其余费用不变
const onRowChange = (row) => {
  if (row.isMaterial) return; // 来料时金价锁定0
  const newGoldFee = (parseFloat(row.goldPrice) || 0) * (parseFloat(row.goldMaterialWeight) || 0);
  row.goldMaterialFee = Math.round(newGoldFee * 100) / 100;
  row.collectAmount = calcRowAmount(row);
};

// 提交收款
const submitOrderCollect = async () => {
  if (collectSelected.value.length === 0) {
    ElMessage.warning('请先勾选要收款的订单');
    return;
  }
  // 按客户分组（一条收款记录对应一个客户）
  const groups = {};
  collectSelected.value.forEach(r => {
    const key = r.customerId;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  collectSaving.value = true;
  try {
    for (const cid of Object.keys(groups)) {
      const lines = groups[cid];
      const first = lines[0];
      await createCustomerPayment({
        customerId: parseInt(cid),
        customerName: first.customerName,
        billId: lines.length === 1 ? first.billId : null,
        billNo: lines.length === 1 ? first.billNo : '',
        paymentMethod: 'bank',
        recordDate: new Date().toISOString().slice(0, 10),
        remark: '按订单收款',
        lines: lines.map(r => ({
          detailId: r.detailId,
          orderId: r.orderId,
          goldPrice: r.isMaterial ? 0 : (parseFloat(r.goldPrice) || 0),
          goldMaterialWeight: parseFloat(r.goldMaterialWeight) || 0,
          goldMaterialFee: r.isMaterial ? 0 : (parseFloat(r.goldMaterialFee) || 0),
          mainStoneAmount: parseFloat(r.mainStoneAmount) || 0,
          mainStoneSettingFee: parseFloat(r.mainStoneSettingFee) || 0,
          subStoneAmount: parseFloat(r.subStoneAmount) || 0,
          subStoneSettingFee: parseFloat(r.subStoneSettingFee) || 0,
          packingFee: parseFloat(r.packingFee) || 0,
          certificateFee: parseFloat(r.certificateFee) || 0,
          postageFee: parseFloat(r.postageFee) || 0,
          moldFee: parseFloat(r.moldFee) || 0,
          laborFee: parseFloat(r.laborFee) || 0,
          collectAmount: parseFloat(r.collectAmount) || 0,
          isMaterial: !!r.isMaterial
        }))
      });
    }
    ElMessage.success('收款成功');
    orderCollectVisible.value = false;
    loadSummary();
  } catch (e) {
    ElMessage.error(e?.message || '收款失败');
  } finally {
    collectSaving.value = false;
  }
};
</script>

<style scoped>
.customer-monthly-bill { padding: 16px; }
.page-header { margin-bottom: 16px; }
.page-header h2 { margin: 0; font-size: 18px; }
.toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.table-wrap { margin-bottom: 16px; }

/* 金额颜色 */
.debt-pos { color: #e6a23c; font-weight: 600; }
.recv-pos { color: #67c23a; font-weight: 600; }
.pay-sum {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 10px;
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
  border-radius: 4px;
  font-size: 13px;
  color: #529b2e;
}
.debt-zero { color: #67c23a; }
.muted { color: #c0c4cc; }

/* 按订单收款弹窗 */
.collect-filter { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.collect-summary { display: flex; gap: 24px; padding: 10px 16px; margin-top: 12px; background: #f5f7fa; border-radius: 6px; font-size: 13px; }
.collect-summary strong { font-size: 14px; }
.c-blue { color: #409eff; }
.c-orange { color: #e6a23c; }

</style>
