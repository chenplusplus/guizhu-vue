<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div>
        <el-button @click="$router.back()">返回</el-button>
        <h2>{{ yearMonth }} 盘点</h2>
        <el-tag :type="statusType(data.status)">{{ data.statusText }}</el-tag>
      </div>
      <div>
        <el-button @click="handleRecalc" :disabled="data.status === 'confirmed'">重新核算</el-button>
        <el-button v-if="data.status === 'confirming' || data.status === 'draft'" type="success" @click="handleConfirm">确认盘点</el-button>
        <el-button v-else type="warning" @click="handleUnconfirm">反确认</el-button>
      </div>
    </div>

    <!-- 配色图例 -->
    <el-card shadow="never" style="margin-bottom:12px;">
      <div class="legend-row">
        <span class="legend-title">颜色说明</span>
        <span class="legend-chip mat-gold-999">足金</span>
        <span class="legend-chip mat-gold-18k">18K金</span>
        <span class="legend-chip mat-gold-14k">14K金</span>
        <span class="legend-chip mat-gold-9k">9K金</span>
        <span class="legend-chip mat-pt">PT铂金</span>
        <span class="legend-chip mat-silver">银</span>
        <span class="legend-chip mat-copper">铜</span>
        <span class="legend-chip mat-diamond">钻石</span>
        <span class="legend-chip mat-fee-blue">费用/镶石</span>
        <span class="legend-chip mat-fee-green">工费</span>
        <span class="legend-tip">金按成色由浓黄到淡黄；钻石水光闪烁</span>
      </div>
    </el-card>

    <!-- 合计卡片 -->
    <el-card shadow="never" style="margin-bottom:16px;">
      <el-row :gutter="16">
        <el-col :span="4">
          <div class="stat-box">
            <div class="stat-label">客户数</div>
            <div class="stat-value">{{ data.customerCount || 0 }}</div>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="stat-box">
            <div class="stat-label">系统总利润</div>
            <div class="stat-value">{{ fmt(data.total?.sysTotalProfit) }}</div>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="stat-box highlight">
            <div class="stat-label">人工总利润</div>
            <div class="stat-value">{{ fmt(data.total?.manualTotalProfit) }}</div>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="stat-box">
            <div class="stat-label">系统应收</div>
            <div class="stat-value">{{ fmt(data.total?.sysTotalAmount) }}</div>
          </div>
        </el-col>
        <el-col :span="5">
          <div class="stat-box highlight">
            <div class="stat-label">人工应收</div>
            <div class="stat-value">{{ fmt(data.total?.manualTotalAmount) }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 客户明细 -->
    <el-card v-for="c in data.customers" :key="c.customerId" shadow="never" style="margin-bottom:12px;">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:600;">客户：{{ c.customerName }}（ID: {{ c.customerId }}）</span>
          <el-tag :type="hasVariance(c) ? 'danger' : 'success'" size="small">
            {{ hasVariance(c) ? '有差异' : '一致' }}
          </el-tag>
        </div>
      </template>

      <!-- 利润对比表 -->
      <el-table :data="profitRows(c)" border size="small" :row-class-name="profitRowClass" style="margin-bottom:12px;">
        <el-table-column prop="label" label="项目" width="140" />
        <el-table-column prop="sys" label="系统" align="right" />
        <el-table-column prop="manual" label="人工" align="right" />
        <el-table-column prop="var" label="差异" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.var !== '0.00' ? '#F56C6C' : '#909399' }">{{ row.var }}</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 材料明细 -->
      <el-table :data="c.materials" border size="small" :row-class-name="materialRowClass" style="margin-bottom:12px;">
        <el-table-column prop="color" label="成色" width="110">
          <template #default="{ row }">
            <span class="color-mark" :class="materialRowClass({ row })"></span>{{ row.color || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="系统净重" align="right">
          <template #default="{ row }">{{ fmt4(row.sysNetWeight) }}</template>
        </el-table-column>
        <el-table-column label="人工净重" align="right">
          <template #default="{ row }">
            <el-input-number v-model="row.manualNetWeight" :precision="4" size="small" :disabled="data.status === 'confirmed'" @change="markDirty" />
          </template>
        </el-table-column>
        <el-table-column label="系统加耗重" align="right">
          <template #default="{ row }">{{ fmt4(row.sysAddLossWeight) }}</template>
        </el-table-column>
        <el-table-column label="人工加耗重" align="right">
          <template #default="{ row }">
            <el-input-number v-model="row.manualAddLossWeight" :precision="4" size="small" :disabled="data.status === 'confirmed'" @change="markDirty" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 差异原因 + 保存 -->
    <el-card shadow="never">
      <el-form label-width="100px">
        <el-form-item label="差异原因">
          <el-input v-model="data.varianceReason" type="textarea" :rows="2" :disabled="data.status === 'confirmed'" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave" :disabled="data.status === 'confirmed'" :loading="saving">
            保存人工核算
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getMonthlyDetail, recalcMonthly, saveMonthlyManual, confirmMonthly, unconfirmMonthly } from '@/api/inventoryMonthly';
import { materialRowClass, profitRowClass } from '@/utils/inventoryColors';

const route = useRoute();
const yearMonth = route.params.yearMonth;
const loading = ref(false);
const saving = ref(false);
const data = ref({ customers: [], total: {} });

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getMonthlyDetail(yearMonth);
    data.value = res?.data || { customers: [], total: {} };
  } finally {
    loading.value = false;
  }
};

const handleRecalc = async () => {
  try {
    await ElMessageBox.confirm('重新核算会覆盖系统数据，确定吗？', '提示', { type: 'warning' });
    await recalcMonthly(yearMonth);
    ElMessage.success('重新核算成功');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const handleSave = async () => {
  saving.value = true;
  try {
    const payload = {
      varianceReason: data.value.varianceReason,
      customers: data.value.customers.map(c => ({
        customerId: c.customerId,
        manualNetWeight: c.manualNetWeight,
        manualAddLossWeight: c.manualAddLossWeight,
        manualGoldMaterialFee: c.manualGoldMaterialFee,
        manualLaborFee: c.manualLaborFee,
        manualMainStoneQty: c.manualMainStoneQty,
        manualMainStoneWeight: c.manualMainStoneWeight,
        manualMainStoneAmount: c.manualMainStoneAmount,
        manualSubStoneQty: c.manualSubStoneQty,
        manualSubStoneWeight: c.manualSubStoneWeight,
        manualSubStoneAmount: c.manualSubStoneAmount,
        manualDiamondProfit: c.manualDiamondProfit,
        manualGoldProfit: c.manualGoldProfit,
        manualSettingProfit: c.manualSettingProfit,
        manualLaborProfit: c.manualLaborProfit,
        manualTotalProfit: c.manualTotalProfit,
        manualTotalAmount: c.manualTotalAmount,
        manualReceivedMoney: c.manualReceivedMoney,
        manualTotalDebtMoney: c.manualTotalDebtMoney,
        manualTotalDebtMaterial: c.manualTotalDebtMaterial,
        manualRemark: c.manualRemark
      })),
      materials: data.value.customers.flatMap(c =>
        (c.materials || []).map(m => ({
          customerId: c.customerId,
          color: m.color,
          manualNetWeight: m.manualNetWeight,
          manualAddLossWeight: m.manualAddLossWeight,
          manualFoldWeight: m.manualFoldWeight,
          manualQty: m.manualQty
        }))
      )
    };
    await saveMonthlyManual(yearMonth, payload);
    ElMessage.success('保存成功');
    loadData();
  } catch (e) {
    ElMessage.error(e.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const handleConfirm = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请填写差异原因（可选）', '确认盘点', {
      inputType: 'textarea'
    });
    await confirmMonthly(yearMonth, { varianceReason: value });
    ElMessage.success('确认成功');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const handleUnconfirm = async () => {
  try {
    await ElMessageBox.confirm('确定反确认吗？', '提示', { type: 'warning' });
    await unconfirmMonthly(yearMonth);
    ElMessage.success('已反确认');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const profitRows = (c) => [
  { label: '钻石利润', sys: fmt(c.sysDiamondProfit), manual: fmt(c.manualDiamondProfit), var: fmt(c.manualDiamondProfit - c.sysDiamondProfit) },
  { label: '金利润', sys: fmt(c.sysGoldProfit), manual: fmt(c.manualGoldProfit), var: fmt(c.manualGoldProfit - c.sysGoldProfit) },
  { label: '镶石利润', sys: fmt(c.sysSettingProfit), manual: fmt(c.manualSettingProfit), var: fmt(c.manualSettingProfit - c.sysSettingProfit) },
  { label: '工费利润', sys: fmt(c.sysLaborProfit), manual: fmt(c.manualLaborProfit), var: fmt(c.manualLaborProfit - c.sysLaborProfit) },
  { label: '总利润', sys: fmt(c.sysTotalProfit), manual: fmt(c.manualTotalProfit), var: fmt(c.manualTotalProfit - c.sysTotalProfit) },
  { label: '应收总额', sys: fmt(c.sysTotalAmount), manual: fmt(c.manualTotalAmount), var: fmt(c.manualTotalAmount - c.sysTotalAmount) }
];

const hasVariance = (c) => Math.abs(c.manualTotalProfit - c.sysTotalProfit) > 0.01;
const fmt = (n) => Number(n || 0).toFixed(2);
const fmt4 = (n) => Number(n || 0).toFixed(4);
const statusType = (s) => ({ draft: 'info', confirming: 'warning', confirmed: 'success' }[s] || 'info');
const markDirty = () => {};

onMounted(loadData);
</script>

<style scoped>
.page-container { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.stat-box { background: #f5f7fa; border-radius: 6px; padding: 10px 14px; border-left: 3px solid #909399; }

/* ===== 物料配色（金按成色由浓到淡 / 钻石水光 / 费用蓝绿） ===== */
.legend-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.legend-title { font-size: 13px; color: #606266; margin-right: 4px; font-weight: 600; }
.legend-chip {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 12px;
  font-size: 12px; color: #4a4a4a;
  border: 1px solid rgba(0, 0, 0, 0.06);
}
.legend-tip { font-size: 12px; color: #909399; margin-left: 6px; }
.color-mark {
  display: inline-block; width: 10px; height: 10px;
  border-radius: 3px; margin-right: 6px; vertical-align: middle;
  border: 1px solid rgba(0, 0, 0, 0.15);
}

/* 金：由浓黄 → 淡黄（足金最黄，成色越低越淡） */
:deep(.el-table__row.mat-gold-999) > td.el-table__cell { background: #FFE9A3 !important; }
:deep(.el-table__row.mat-gold-18k) > td.el-table__cell { background: #FDF0BE !important; }
:deep(.el-table__row.mat-gold-14k) > td.el-table__cell { background: #FDF6D9 !important; }
:deep(.el-table__row.mat-gold-9k) > td.el-table__cell { background: #FEFAEC !important; }
:deep(.el-table__row.mat-gold-other) > td.el-table__cell { background: #FBF3E4 !important; }
:deep(.el-table__row.mat-pt) > td.el-table__cell { background: #F0EBF9 !important; }
:deep(.el-table__row.mat-silver) > td.el-table__cell { background: #EDF1F4 !important; }
:deep(.el-table__row.mat-copper) > td.el-table__cell { background: #F7EAE0 !important; }

/* 钻石：水光闪闪（流动高光） */
:deep(.el-table__row.mat-diamond) > td.el-table__cell {
  background: linear-gradient(100deg, #E4F0FF 0%, #FBFDFF 35%, #DCEAFF 50%, #FBFDFF 65%, #E4F0FF 100%) !important;
  background-size: 300% 100%;
  animation: matShine 3.2s linear infinite;
}
@keyframes matShine {
  0%   { background-position: 160% 0; }
  100% { background-position: -60% 0; }
}

/* 费用 / 工费：普通蓝、绿；合计行中性灰 */
:deep(.el-table__row.mat-fee-blue) > td.el-table__cell { background: #E8F2FD !important; }
:deep(.el-table__row.mat-fee-green) > td.el-table__cell { background: #E7F6EC !important; }
:deep(.el-table__row.mat-total) > td.el-table__cell { background: #F4F5F7 !important; }

/* 图例芯片与色块用同一套配色 */
.legend-chip.mat-gold-999 { background: #FFE9A3; }
.legend-chip.mat-gold-18k { background: #FDF0BE; }
.legend-chip.mat-gold-14k { background: #FDF6D9; }
.legend-chip.mat-gold-9k { background: #FEFAEC; }
.legend-chip.mat-pt { background: #F0EBF9; }
.legend-chip.mat-silver { background: #EDF1F4; }
.legend-chip.mat-copper { background: #F7EAE0; }
.legend-chip.mat-fee-blue { background: #E8F2FD; }
.legend-chip.mat-fee-green { background: #E7F6EC; }
.legend-chip.mat-diamond {
  background: linear-gradient(100deg, #E4F0FF 0%, #FBFDFF 35%, #DCEAFF 50%, #FBFDFF 65%, #E4F0FF 100%);
  background-size: 300% 100%;
  animation: matShine 3.2s linear infinite;
}
.color-mark.mat-gold-999 { background: #FFE9A3; }
.color-mark.mat-gold-18k { background: #FDF0BE; }
.color-mark.mat-gold-14k { background: #FDF6D9; }
.color-mark.mat-gold-9k { background: #FEFAEC; }
.color-mark.mat-gold-other { background: #FBF3E4; }
.color-mark.mat-pt { background: #F0EBF9; }
.color-mark.mat-silver { background: #EDF1F4; }
.color-mark.mat-copper { background: #F7EAE0; }
.color-mark.mat-diamond { background: linear-gradient(135deg, #DCE9FF, #FFFFFF 60%, #CFE2FF); }
.stat-box.highlight { border-left-color: #409EFF; background: #ecf5ff; }
.stat-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.stat-value { font-size: 16px; font-weight: 600; color: #303133; }
</style>
