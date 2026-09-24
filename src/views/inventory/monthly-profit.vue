<!-- src/views/inventory/monthly-profit.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- 头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack">返回</el-button>
        <el-date-picker
          v-model="yearMonth"
          type="month"
          value-format="YYYY-MM"
          :clearable="false"
          style="width:130px;"
          @change="loadData"
        />
        <h2>利润滚动表</h2>
        <el-tag :type="statusType">{{ data.statusText || '待初始化' }}</el-tag>
        <el-tag v-if="data.confirmedAt" type="info" size="small">
          确认于 {{ formatDateTime(data.confirmedAt) }}
        </el-tag>
      </div>
      <div class="header-right">
        <el-button v-if="!data.customers || data.customers.length === 0" type="primary" @click="handleInit">
          初始化本月
        </el-button>
        <template v-else>
          <el-button @click="handleRecalc" :disabled="isConfirmed">重新核算</el-button>
          <el-button v-if="!isConfirmed" type="success" @click="handleConfirm">确认盘点</el-button>
          <el-button v-else type="warning" @click="handleUnconfirm">反确认</el-button>
        </template>
      </div>
    </div>

    <!-- 合计卡片 -->
    <el-card shadow="never" class="summary-card" v-if="data.customers && data.customers.length > 0">
      <el-row :gutter="16">
        <el-col :span="4">
          <div class="stat-box">
            <div class="stat-label">客户数</div>
            <div class="stat-value">{{ data.customerCount || 0 }}</div>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="stat-box">
            <div class="stat-label">月初始利润</div>
            <div class="stat-value">{{ fmt(data.totalPrevProfit) }}</div>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="stat-box">
            <div class="stat-label">本月产生</div>
            <div class="stat-value">{{ fmt(data.totalCurrProfit) }}</div>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="stat-box">
            <div class="stat-label">系统累计</div>
            <div class="stat-value">{{ fmt(data.totalSysProfit) }}</div>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="stat-box highlight">
            <div class="stat-label">人工累计</div>
            <div class="stat-value">{{ fmt(data.totalManualProfit) }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 一览利润表 -->
    <el-card shadow="never" v-if="data.customers && data.customers.length > 0">
      <el-table
        :data="flatRows"
        border
        stripe
        size="small"
        :span-method="spanMethod"
        :row-class-name="rowClassName"
        style="width: 100%;"
      >
        <el-table-column prop="customerName" label="客户" width="140" fixed />
        <el-table-column prop="purityColor" label="成色" width="80" align="center" />

        <!-- 月初始 -->
        <el-table-column label="月初始" align="center">
          <el-table-column label="钻石" width="90" align="right">
            <template #default="{ row }">{{ fmt(row.prevDiamondProfit) }}</template>
          </el-table-column>
          <el-table-column label="金" width="90" align="right">
            <template #default="{ row }">{{ fmt(row.prevGoldProfit) }}</template>
          </el-table-column>
          <el-table-column label="镶石" width="90" align="right">
            <template #default="{ row }">{{ fmt(row.prevSettingProfit) }}</template>
          </el-table-column>
          <el-table-column label="工费" width="90" align="right">
            <template #default="{ row }">{{ fmt(row.prevLaborProfit) }}</template>
          </el-table-column>
          <el-table-column label="合计" width="100" align="right">
            <template #default="{ row }">
              <b>{{ fmt(row.prevTotalProfit) }}</b>
            </template>
          </el-table-column>
        </el-table-column>

        <!-- 本月产生 -->
        <el-table-column label="本月产生" align="center">
          <el-table-column label="钻石" width="90" align="right">
            <template #default="{ row }">{{ fmt(row.currDiamondProfit) }}</template>
          </el-table-column>
          <el-table-column label="金" width="90" align="right">
            <template #default="{ row }">{{ fmt(row.currGoldProfit) }}</template>
          </el-table-column>
          <el-table-column label="镶石" width="90" align="right">
            <template #default="{ row }">{{ fmt(row.currSettingProfit) }}</template>
          </el-table-column>
          <el-table-column label="工费" width="90" align="right">
            <template #default="{ row }">{{ fmt(row.currLaborProfit) }}</template>
          </el-table-column>
          <el-table-column label="合计" width="100" align="right">
            <template #default="{ row }">
              <b style="color:#409EFF;">{{ fmt(row.currTotalProfit) }}</b>
            </template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="系统累计" width="110" align="right">
          <template #default="{ row }">
            <b>{{ fmt(row.sysTotalProfit) }}</b>
          </template>
        </el-table-column>

        <el-table-column label="人工累计" width="110" align="right">
          <template #default="{ row }">
            <b :style="{ color: row.variance !== 0 ? '#F56C6C' : '#303133' }">
              {{ fmt(row.manualTotalProfit) }}
            </b>
          </template>
        </el-table-column>

        <el-table-column label="差异" width="90" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.variance !== 0 ? '#F56C6C' : '#909399' }">
              {{ row.variance > 0 ? '+' : '' }}{{ fmt(row.variance) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary" link size="small"
              :disabled="isConfirmed"
              @click="openManualDialog(row)"
            >
              调整
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 差异原因 -->
    <el-card shadow="never" style="margin-top:16px;" v-if="data.customers && data.customers.length > 0">
      <el-form label-width="100px">
        <el-form-item label="差异原因">
          <el-input
            v-model="data.varianceReason"
            type="textarea" :rows="2"
            :disabled="isConfirmed"
            placeholder="可选"
          />
        </el-form-item>
        <el-form-item v-if="!isConfirmed">
          <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 人工调整弹窗 -->
    <el-dialog
      v-model="manualDialogVisible"
      :title="`人工核算 - ${manualRow?.customerName} / ${manualRow?.purityColor}`"
      width="640px"
      destroy-on-close
    >
      <el-form label-width="120px" size="default">
        <el-divider content-position="left">利润</el-divider>

        <el-form-item label="钻石利润">
          <div class="manual-field">
            <el-input-number v-model="manualForm.manualDiamondProfit" :precision="2" style="width:180px;" />
            <span class="sys-hint">系统：{{ fmt(manualRow?.prevDiamondProfit + manualRow?.currDiamondProfit) }}</span>
          </div>
        </el-form-item>

        <el-form-item label="金利润">
          <div class="manual-field">
            <el-input-number v-model="manualForm.manualGoldProfit" :precision="2" style="width:180px;" />
            <span class="sys-hint">系统：{{ fmt(manualRow?.prevGoldProfit + manualRow?.currGoldProfit) }}</span>
          </div>
        </el-form-item>

        <el-form-item label="镶石利润">
          <div class="manual-field">
            <el-input-number v-model="manualForm.manualSettingProfit" :precision="2" style="width:180px;" />
            <span class="sys-hint">系统：{{ fmt(manualRow?.prevSettingProfit + manualRow?.currSettingProfit) }}</span>
          </div>
        </el-form-item>

        <el-form-item label="工费利润">
          <div class="manual-field">
            <el-input-number v-model="manualForm.manualLaborProfit" :precision="2" style="width:180px;" />
            <span class="sys-hint">系统：{{ fmt(manualRow?.prevLaborProfit + manualRow?.currLaborProfit) }}</span>
          </div>
        </el-form-item>

        <el-form-item label="总利润">
          <div class="manual-field">
            <el-input-number v-model="manualForm.manualTotalProfit" :precision="2" style="width:180px;" />
            <span class="sys-hint">系统：{{ fmt(manualRow?.sysTotalProfit) }}</span>
          </div>
        </el-form-item>

        <el-divider content-position="left">材料</el-divider>

        <el-form-item label="净重(g)">
          <div class="manual-field">
            <el-input-number v-model="manualForm.manualNetWeight" :precision="2" style="width:180px;" />
            <span class="sys-hint">系统：{{ fmt(manualRow?.prevNetWeight + manualRow?.currNetWeight) }}</span>
          </div>
        </el-form-item>

        <el-form-item label="加耗重(g)">
          <div class="manual-field">
            <el-input-number v-model="manualForm.manualAddLossWeight" :precision="2" style="width:180px;" />
            <span class="sys-hint">系统：{{ fmt(manualRow?.prevAddLossWeight + manualRow?.currAddLossWeight) }}</span>
          </div>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="manualForm.manualRemark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="resetToSystem">恢复系统值</el-button>
        <el-button @click="manualDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveManualItem" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getMonthlyProfit, initMonthlyProfit, recalcMonthlyProfit,
  saveMonthlyManual, confirmMonthlyProfit, unconfirmMonthlyProfit
} from '@/api/monthlyProfit';

const route = useRoute();
const router = useRouter();
const yearMonth = ref(route.params.yearMonth || new Date().toISOString().slice(0, 7));

const loading = ref(false);
const saving = ref(false);
const data = ref({ customers: [], varianceReason: '' });

const isConfirmed = computed(() => data.value.status === 'confirmed');
const statusType = computed(() => isConfirmed.value ? 'success' : 'info');

const flatRows = computed(() => {
  const rows = [];
  (data.value.customers || []).forEach(c => {
    (c.materials || []).forEach(m => {
      rows.push({
        customerId: c.customerId,
        customerName: c.customerName,
        ...m,
        variance: m.manualTotalProfit - (m.prevTotalProfit + m.currTotalProfit)
      });
    });
  });
  return rows;
});

const spanMethod = ({ row, columnIndex, rowIndex }) => {
  if (columnIndex !== 0) return;
  const rows = flatRows.value;
  const sameCustomerRows = rows.filter(r => r.customerId === row.customerId);
  if (sameCustomerRows.length <= 1) return;
  const firstIndex = rows.findIndex(r => r.customerId === row.customerId);
  if (rowIndex === firstIndex) {
    return { rowspan: sameCustomerRows.length, colspan: 1 };
  }
  return { rowspan: 0, colspan: 0 };
};

const rowClassName = ({ row }) => row.variance !== 0 ? 'row-variance' : '';

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getMonthlyProfit(yearMonth.value);
    if (res && res.success && res.data) {
      data.value = res.data;
    } else {
      data.value = { customers: [], varianceReason: '' };
    }
  } finally {
    loading.value = false;
  }
};

const handleInit = async () => {
  try {
    await ElMessageBox.confirm('初始化会按上月 manual + 本月 lr_tables 生成初值，确定吗？', '提示', { type: 'warning' });
    loading.value = true;
    await initMonthlyProfit(yearMonth.value);
    ElMessage.success('初始化成功');
    await loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.message || '初始化失败');
  } finally {
    loading.value = false;
  }
};

const handleRecalc = async () => {
  try {
    await ElMessageBox.confirm('重新核算会覆盖本月系统值，人工值不受影响。', '提示', { type: 'warning' });
    loading.value = true;
    await recalcMonthlyProfit(yearMonth.value);
    ElMessage.success('重新核算成功');
    await loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.message || '操作失败');
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  saving.value = true;
  try {
    await saveMonthlyManual(yearMonth.value, {
      varianceReason: data.value.varianceReason,
      items: []
    });
    ElMessage.success('保存成功');
  } catch (e) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const manualDialogVisible = ref(false);
const manualRow = ref(null);
const manualForm = ref({});

const openManualDialog = (row) => {
  manualRow.value = row;
  manualForm.value = {
    manualDiamondProfit: row.manualDiamondProfit,
    manualGoldProfit: row.manualGoldProfit,
    manualSettingProfit: row.manualSettingProfit,
    manualLaborProfit: row.manualLaborProfit,
    manualTotalProfit: row.manualTotalProfit,
    manualNetWeight: row.manualNetWeight,
    manualAddLossWeight: row.manualAddLossWeight,
    manualRemark: row.manualRemark
  };
  manualDialogVisible.value = true;
};

const resetToSystem = () => {
  const r = manualRow.value;
  manualForm.value = {
    manualDiamondProfit: r.prevDiamondProfit + r.currDiamondProfit,
    manualGoldProfit: r.prevGoldProfit + r.currGoldProfit,
    manualSettingProfit: r.prevSettingProfit + r.currSettingProfit,
    manualLaborProfit: r.prevLaborProfit + r.currLaborProfit,
    manualTotalProfit: r.sysTotalProfit,
    manualNetWeight: r.prevNetWeight + r.currNetWeight,
    manualAddLossWeight: r.prevAddLossWeight + r.currAddLossWeight,
    manualRemark: r.manualRemark
  };
};

const saveManualItem = async () => {
  saving.value = true;
  try {
    await saveMonthlyManual(yearMonth.value, {
      varianceReason: data.value.varianceReason,
      items: [{
        customerId: manualRow.value.customerId,
        purityColor: manualRow.value.purityColor,
        ...manualForm.value
      }]
    });
    ElMessage.success('保存成功');
    manualDialogVisible.value = false;
    await loadData();
  } catch (e) {
    ElMessage.error(e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const handleConfirm = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请填写差异原因（可选）', '确认盘点', {
      inputType: 'textarea',
      inputValue: data.value.varianceReason || ''
    });
    await confirmMonthlyProfit(yearMonth.value, { varianceReason: value });
    ElMessage.success('确认成功');
    await loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.message || '操作失败');
  }
};

const handleUnconfirm = async () => {
  try {
    await ElMessageBox.confirm('反确认后本月不再是滚动的锚点，确定吗？', '提示', { type: 'warning' });
    await unconfirmMonthlyProfit(yearMonth.value);
    ElMessage.success('已反确认');
    await loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.message || '操作失败');
  }
};

const goBack = () => router.push('/inventory');

const fmt = (n) => Number(n || 0).toFixed(2);
const formatDateTime = (d) => d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '-';

onMounted(loadData);
</script>

<style scoped>
.page-container { padding: 16px; background: #f5f7fa; min-height: 100vh; }
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0;
  flex-wrap: wrap; gap: 10px;
}
.header-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.summary-card { margin: 12px 0; border-radius: 8px; }
.stat-box { background: #f5f7fa; border-radius: 6px; padding: 10px 14px; border-left: 3px solid #909399; }
.stat-box.highlight { border-left-color: #409EFF; background: #ecf5ff; }
.stat-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.stat-value { font-size: 16px; font-weight: 600; color: #303133; }

:deep(.row-variance) { background: #fff8e6 !important; }
:deep(.row-variance:hover) { background: #fff3cd !important; }

.manual-field { display: flex; align-items: center; gap: 12px; }
.sys-hint { color: #909399; font-size: 12px; }
</style>