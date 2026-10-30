<!-- src/components/LrPreviewDialog.vue
     支出收入LR表预览弹窗（可被多页面复用）
     两种使用方式：
       1) 传 lrId            —— 弹窗自己按 LR id / billId 拉取数据（LR列表/编辑页已保存数据）
       2) 传 lrData + rows   —— 直接渲染传入数据（编辑页实时预览，rows 为当前表格行）
     表格样式与 LR 列表里的「预览」完全一致
-->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="支出收入LR表预览"
    width="96%"
    top="2vh"
    :close-on-click-modal="false"
    destroy-on-close
    class="lr-preview-dialog"
  >
    <div class="excel-preview" v-loading="loading">
      <!-- 主表格：明细部分 -->
      <table class="excel-table main-table">
        <thead>
          <!-- 标题行 -->
          <tr>
            <th colspan="29" class="excel-title">支出收入LR表</th>
          </tr>
          <!-- 信息行 -->
          <tr class="info-row">
            <th colspan="3"></th>
            <th class="info-label">客户：</th>
            <th colspan="2" class="info-value">{{ previewInfo.customerName || '-' }}</th>
            <th class="info-label">成色：</th>
            <th colspan="2" class="info-value">{{ previewInfo.color || 'Au755' }}</th>
            <th class="info-label">币种：</th>
            <th colspan="2" class="info-value">RMB</th>
            <th class="info-label">出货日期：</th>
            <th colspan="16" class="info-value">{{ previewInfo.deliveryDate || '-' }}</th>
          </tr>
          <!-- 第一层表头 -->
          <tr class="excel-header">
            <th rowspan="2">流水单号</th>
            <th rowspan="2">序号</th>
            <th rowspan="2">品名</th>
            <th rowspan="2"></th>
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
          </tr>
          <!-- 第二层表头 -->
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
          <!-- 明细行：先销售行 后成本行 与Excel顺序一致 -->
          <tr v-for="(row, idx) in previewRows" :key="idx" :class="row.rowType === 'sale' ? 'sale-row' : 'cost-row'">
            <td class="text-center">{{ row.serialNo || '' }}</td>
            <td class="text-center">{{ row.seqDisplay || '' }}</td>
            <td class="text-left">{{ row.productName || '' }}</td>
            <td></td>
            <td class="text-center">{{ row.customerName || '' }}</td>
            <td class="text-center">{{ row.diamondLevel || '' }}</td>
            <td class="text-center">{{ row.color || '' }}</td>
            <td class="text-right">{{ row.quantity || '' }}</td>
            <td class="text-center">{{ row.size || '' }}</td>
            <td class="text-right">{{ row.totalWeight || '' }}</td>
            <td class="text-right">{{ row.netWeight || '' }}</td>
            <td class="text-right">{{ row.lossRate || '' }}</td>
            <td class="text-right red-text">{{ row.addLossWeight || '' }}</td>
            <td class="text-right">{{ row.goldPrice || '' }}</td>
            <td class="text-right">{{ row.goldMaterialFee || '' }}</td>
            <!-- 钻石费用（主石） -->
            <td class="text-right">{{ row.stoneQty || '' }}</td>
            <td class="text-right">{{ row.stoneWeight || '' }}</td>
            <td class="text-right">{{ row.stonePrice || '' }}</td>
            <td class="text-right red-text">{{ row.stoneAmount || '' }}</td>
            <td class="text-right">{{ row.stoneSettingFee || '' }}</td>
            <!-- 镶石工费（副石） -->
            <td class="text-right">{{ row.subStoneQty || '' }}</td>
            <td class="text-right">{{ row.subStoneWeight || '' }}</td>
            <td class="text-right">{{ row.subStonePrice || '' }}</td>
            <td class="text-right red-text">{{ row.subStoneAmount || '' }}</td>
            <td class="text-right">{{ row.subStoneSettingFee || '' }}</td>
            <!-- 其他 -->
            <td class="text-right">{{ row.packingFee || '' }}</td>
            <td class="text-right">{{ row.moldFee || '' }}</td>
            <td class="text-right">{{ row.laborFee || '' }}</td>
            <td class="text-right red-text bold">{{ toMoney(row.totalAmount) }}</td>
          </tr>
          <!-- 合计行 -->
          <tr class="total-row">
            <td colspan="7" class="text-left">合计：</td>
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
          </tr>
        </tbody>
      </table>

      <!-- 空行分隔 -->
      <div class="empty-gap"></div>

      <!-- 底部汇总表：和Excel完全对齐 -->
      <table class="excel-table summary-table">
        <tbody>
          <!-- 第1行：表头 + 上单利润 -->
          <tr>
            <td class="header-cell">成色</td>
            <td class="header-cell">上单净重出货</td>
            <td class="header-cell">本单净重出货</td>
            <td class="header-cell">累计净重出货</td>
            <td></td>
            <td class="header-cell">上单加耗重出货</td>
            <td></td>
            <td></td>
            <td class="header-cell">本单加耗重出货</td>
            <td></td>
            <td class="header-cell">累计加耗重出货</td>
            <td></td>
            <td></td>
            <td class="label-cell">上单钻石利润：</td>
            <td colspan="3" class="value-cell">{{ prevSummary.diamondProfit }}</td>
            <td class="label-cell">上单镶石利润：</td>
            <td colspan="3" class="value-cell">{{ prevSummary.settingProfit }}</td>
            <td class="label-cell">上单工费利润：</td>
            <td colspan="3" class="value-cell">{{ prevSummary.laborProfit }}</td>
            <td class="label-cell">上单应收金额总利润：</td>
            <td colspan="3" class="value-cell">{{ prevSummary.totalProfit }}</td>
          </tr>
          <!-- 第2行：18K + 本单利润 -->
          <tr>
            <td class="color-cell">18K</td>
            <td class="value-cell">{{ getWeightByColor('18K').prevNet }}</td>
            <td class="value-cell">{{ getWeightByColor('18K').currNet }}</td>
            <td class="value-cell">{{ getWeightByColor('18K').totalNet }}</td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('18K').prevLoss }}</td>
            <td></td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('18K').currLoss }}</td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('18K').totalLoss }}</td>
            <td></td>
            <td></td>
            <td class="label-cell">本单钻石利润：</td>
            <td colspan="3" class="value-cell profit-val">{{ currSummary.diamondProfit.toFixed(2) }}</td>
            <td class="label-cell">本单镶石利润：</td>
            <td colspan="3" class="value-cell profit-val">{{ currSummary.settingProfit.toFixed(2) }}</td>
            <td class="label-cell">本单工费利润：</td>
            <td colspan="3" class="value-cell profit-val">{{ currSummary.laborProfit.toFixed(2) }}</td>
            <td class="label-cell">本单应收金额总利润：</td>
            <td colspan="3" class="value-cell profit-val">{{ currSummary.totalProfit.toFixed(2) }}</td>
          </tr>
          <!-- 第3行：14K + 累计利润 -->
          <tr>
            <td class="color-cell">14K</td>
            <td class="value-cell">{{ getWeightByColor('14K').prevNet }}</td>
            <td class="value-cell">{{ getWeightByColor('14K').currNet }}</td>
            <td class="value-cell">{{ getWeightByColor('14K').totalNet }}</td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('14K').prevLoss }}</td>
            <td></td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('14K').currLoss }}</td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('14K').totalLoss }}</td>
            <td></td>
            <td></td>
            <td class="label-cell blue-text">累计钻石利润：</td>
            <td colspan="3" class="value-cell blue-text profit-val">{{ totalSummary.diamondProfit.toFixed(2) }}</td>
            <td class="label-cell blue-text">累计镶石利润：</td>
            <td colspan="3" class="value-cell blue-text profit-val">{{ totalSummary.settingProfit.toFixed(2) }}</td>
            <td class="label-cell blue-text">累计工费利润：</td>
            <td colspan="3" class="value-cell blue-text profit-val">{{ totalSummary.laborProfit.toFixed(2) }}</td>
            <td class="label-cell blue-text">累计应收金额利润：</td>
            <td colspan="3" class="value-cell blue-text profit-val">{{ totalSummary.totalProfit.toFixed(2) }}</td>
          </tr>
          <!-- 第4行：9K + 上单每日收支 -->
          <tr>
            <td class="color-cell">9K</td>
            <td class="value-cell">{{ getWeightByColor('9K').prevNet }}</td>
            <td class="value-cell">{{ getWeightByColor('9K').currNet }}</td>
            <td class="value-cell">{{ getWeightByColor('9K').totalNet }}</td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('9K').prevLoss }}</td>
            <td></td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('9K').currLoss }}</td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('9K').totalLoss }}</td>
            <td></td>
            <td></td>
            <td class="label-cell">上单每日收入：</td>
            <td colspan="3" class="value-cell">{{ prevSummary.dailyIncome }}</td>
            <td class="label-cell">上单每日开支：</td>
            <td colspan="3" class="value-cell">-</td>
            <td class="label-cell">上单出货件数：</td>
            <td colspan="3" class="value-cell">-</td>
            <td class="label-cell red-text bold" rowspan="2">应收总金额：</td>
            <td colspan="3" class="value-cell red-text bold" rowspan="2">¥{{ currSummary.totalAmount.toFixed(2) }}</td>
          </tr>
          <!-- 第5行：PT + 本单每日收支 -->
          <tr>
            <td class="color-cell">PT</td>
            <td class="value-cell">{{ getWeightByColor('PT').prevNet }}</td>
            <td class="value-cell">{{ getWeightByColor('PT').currNet }}</td>
            <td class="value-cell">{{ getWeightByColor('PT').totalNet }}</td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('PT').prevLoss }}</td>
            <td></td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('PT').currLoss }}</td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('PT').totalLoss }}</td>
            <td></td>
            <td></td>
            <td class="label-cell">本单每日收入：</td>
            <td colspan="3" class="value-cell">{{ currSummary.totalAmount.toFixed(2) }}</td>
            <td class="label-cell">本单每日开支：</td>
            <td colspan="3" class="value-cell">{{ currSummary.dailyExpense }}</td>
            <td class="label-cell">本单出货件数：</td>
            <td colspan="3" class="value-cell">{{ currSummary.qty }}</td>
          </tr>
          <!-- 第6行：银 + 累计收支 -->
          <tr>
            <td class="color-cell">银</td>
            <td class="value-cell">{{ getWeightByColor('银').prevNet }}</td>
            <td class="value-cell">{{ getWeightByColor('银').currNet }}</td>
            <td class="value-cell">{{ getWeightByColor('银').totalNet }}</td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('银').prevLoss }}</td>
            <td></td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('银').currLoss }}</td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('银').totalLoss }}</td>
            <td></td>
            <td></td>
            <td class="label-cell blue-text">累计收入：</td>
            <td colspan="3" class="value-cell blue-text">¥{{ totalSummary.dailyIncome.toFixed(2) }}</td>
            <td class="label-cell blue-text">累计开支：</td>
            <td colspan="3" class="value-cell blue-text">¥{{ totalSummary.dailyExpense.toFixed(2) }}</td>
            <td class="label-cell blue-text">累计出货件数：</td>
            <td colspan="3" class="value-cell blue-text">{{ totalSummary.qty }}</td>
            <td class="label-cell red-text bold">支出平衡总金额：</td>
            <td colspan="3" class="value-cell red-text bold">¥{{ totalSummary.balance.toFixed(2) }}</td>
          </tr>
          <!-- 第7行：铜 -->
          <tr>
            <td class="color-cell">铜</td>
            <td class="value-cell">{{ getWeightByColor('铜').prevNet }}</td>
            <td class="value-cell">{{ getWeightByColor('铜').currNet }}</td>
            <td class="value-cell">{{ getWeightByColor('铜').totalNet }}</td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('铜').prevLoss }}</td>
            <td></td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('铜').currLoss }}</td>
            <td></td>
            <td class="value-cell">{{ getWeightByColor('铜').totalLoss }}</td>
            <td></td>
            <td></td>
            <td colspan="16"></td>
          </tr>
        </tbody>
      </table>
    </div>
    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
      <el-button type="primary" @click="handleExportPreview">导出Excel</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { getLrTable, exportLr } from '@/api/lr';
import { getCustomerShangdan } from '@/api/inventoryMonthly';

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 按 id 拉取（后端支持 LR id 或 billId）
  lrId: { type: [Number, String], default: null },
  // 或直接传入数据（编辑页实时预览）
  lrData: { type: Object, default: null },
  // 可选：直接指定要渲染的行（不传则用 lrData.rows）
  rows: { type: Array, default: null },
});

const emit = defineEmits(['update:visible', 'close']);

const dialogVisible = ref(false);
const loading = ref(false);
const fetchedInfo = ref(null);
const fetchedRows = ref([]);

const prevData = ref({
  summary: {
    totalSale: 0, totalCost: 0, totalProfit: 0,
    totalDiamondProfit: 0, totalSettingProfit: 0, totalLaborProfit: 0,
    totalNetWeight: 0, totalAddLossWeight: 0
  },
  details: []
});

const previewInfo = computed(() => props.lrData || fetchedInfo.value || {});

// 明细行：先所有销售行，后所有成本行（与Excel顺序一致）
const previewRows = computed(() => {
  const source = (props.rows && props.rows.length)
    ? props.rows
    : ((props.lrData?.rows?.length) ? props.lrData.rows : fetchedRows.value);
  const rows = source || [];
  const saleRows = rows.filter(r => r.rowType === 'sale');
  const costRows = rows.filter(r => r.rowType === 'cost');
  return [...saleRows, ...costRows];
});

const toMoney = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  return isNaN(num) ? '' : num.toFixed(2);
};

// 打开时加载：未外部传数据则按 id 拉取
const loadData = async () => {
  const customerIdForPrev = previewInfo.value?.customerId;
  const recordDate = previewInfo.value?.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];

  if (!props.lrData && props.lrId) {
    loading.value = true;
    try {
      // 后端 GetLrTable 支持按 lr id 或 billId 查询
      const res = await getLrTable(props.lrId);
      fetchedInfo.value = res?.data || null;
      fetchedRows.value = res?.data?.rows || [];
    } catch (e) {
      console.error('加载LR预览失败:', e);
      ElMessage.error('加载预览数据失败');
    } finally {
      loading.value = false;
    }
  }

  // 上单数据（和编辑页/列表逻辑一致）
  const info = previewInfo.value || {};
  const customerId = info.customerId || customerIdForPrev;
  if (!customerId) return;
  try {
    const customerRes = await getCustomerShangdan(customerId, recordDate);
    if (customerRes?.success && customerRes?.data) {
      const d = customerRes.data;
      prevData.value.summary = {
        totalSale: d.totalAmount || 0,
        totalCost: 0,
        totalProfit: d.totalProfit || 0,
        totalDiamondProfit: d.diamondProfit || 0,
        totalGoldProfit: d.goldProfit || 0,
        totalSettingProfit: d.settingProfit || 0,
        totalLaborProfit: d.laborProfit || 0,
        totalNetWeight: d.netWeight || 0,
        totalAddLossWeight: d.addLossWeight || 0
      };
      prevData.value.details = (d.materials || []).map(m => ({
        color: m.color,
        netWeight: m.manualNetWeight,
        addLossWeight: m.manualAddLossWeight
      }));
    }
  } catch (e) {
    console.error('加载上单失败:', e);
  }
};

// 合计计算
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
    totalAmount: sum('totalAmount').toFixed(2)
  };
});

// 按成色取重量数据
const getWeightByColor = (color) => {
  const saleList = previewRows.value.filter(r => r.rowType === 'sale' && r.color === color);
  const currNet = saleList.reduce((s, r) => s + (Number(r.netWeight) || 0), 0);
  const currLoss = saleList.reduce((s, r) => s + (Number(r.addLossWeight) || 0), 0);
  const prevDetail = prevData.value.details.find(d => d.color === color);
  const prevNet = prevDetail?.netWeight ?? 0;
  const prevLoss = prevDetail?.addLossWeight ?? 0;
  return {
    prevNet: prevNet > 0 ? prevNet.toFixed(3) : '',
    currNet: currNet > 0 ? currNet.toFixed(3) : '',
    totalNet: (prevNet + currNet).toFixed(3),
    prevLoss: prevLoss > 0 ? prevLoss.toFixed(3) : '',
    currLoss: currLoss > 0 ? currLoss.toFixed(3) : '',
    totalLoss: (prevLoss + currLoss).toFixed(3)
  };
};

// 利润汇总（和编辑页逻辑完全一致）
const currSummary = computed(() => {
  const saleList = previewRows.value.filter(r => r.rowType === 'sale');
  const costList = previewRows.value.filter(r => r.rowType === 'cost');
  const sum = (list, prop) => list.reduce((s, r) => s + (Number(r[prop]) || 0), 0);

  const saleStoneAmount = sum(saleList, 'stoneAmount') + sum(saleList, 'subStoneAmount');
  const costStoneAmount = sum(costList, 'stoneAmount') + sum(costList, 'subStoneAmount');
  // 镶石工费总额 = 粒数 × 单粒工费
  const sumSetting = (list) => list.reduce((s, r) => s + (Number(r.stoneQty) || 0) * (Number(r.stoneSettingFee) || 0) + (Number(r.subStoneQty) || 0) * (Number(r.subStoneSettingFee) || 0), 0);
  const saleStoneSetting = sumSetting(saleList);
  const costStoneSetting = sumSetting(costList);
  const saleLaborFee = sum(saleList, 'laborFee');
  const costLaborFee = sum(costList, 'laborFee');
  const saleTotal = sum(saleList, 'totalAmount');
  const costTotal = sum(costList, 'totalAmount');
  const saleQty = saleList.reduce((s, r) => s + (Number(r.quantity) || 1), 0);

  return {
    diamondProfit: saleStoneAmount - costStoneAmount,
    settingProfit: saleStoneSetting - costStoneSetting,
    laborProfit: saleLaborFee - costLaborFee,
    totalProfit: saleTotal - costTotal,
    totalAmount: saleTotal,
    qty: saleQty,
    dailyExpense: costTotal.toFixed(2)
  };
});

const prevSummary = computed(() => {
  const data = prevData.value.summary;
  return {
    diamondProfit: data.totalDiamondProfit > 0 ? data.totalDiamondProfit.toFixed(2) : '-',
    settingProfit: data.totalSettingProfit > 0 ? data.totalSettingProfit.toFixed(2) : '-',
    laborProfit: data.totalLaborProfit > 0 ? data.totalLaborProfit.toFixed(2) : '-',
    totalProfit: data.totalProfit > 0 ? data.totalProfit.toFixed(2) : '-',
    dailyIncome: data.totalSale > 0 ? data.totalSale.toFixed(2) : '-'
  };
});

const totalSummary = computed(() => {
  const prev = prevData.value.summary;
  const curr = currSummary.value;
  const prevDiamond = Number(prev.totalDiamondProfit) || 0;
  const prevSetting = Number(prev.totalSettingProfit) || 0;
  const prevLabor = Number(prev.totalLaborProfit) || 0;
  const prevProfit = Number(prev.totalProfit) || 0;
  const prevSale = Number(prev.totalSale) || 0;
  const prevCost = Number(prev.totalCost) || 0;

  return {
    diamondProfit: prevDiamond + curr.diamondProfit,
    settingProfit: prevSetting + curr.settingProfit,
    laborProfit: prevLabor + curr.laborProfit,
    totalProfit: prevProfit + curr.totalProfit,
    dailyIncome: prevSale + curr.totalAmount,
    dailyExpense: prevCost + curr.totalAmount,
    qty: (prevSale > 0 ? 1 : 0) + curr.qty,
    balance: prevProfit + curr.totalProfit
  };
});

// 导出Excel
const handleExportPreview = async () => {
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

watch(
  () => props.visible,
  (val) => {
    dialogVisible.value = val;
    if (val) {
      loadData();
    } else {
      fetchedInfo.value = null;
      fetchedRows.value = [];
    }
  },
  { immediate: true }
);

watch(
  () => dialogVisible.value,
  (val) => {
    emit('update:visible', val);
    if (!val) emit('close');
  }
);
</script>

<style scoped>
/* ========== Excel预览样式（与LR列表预览一致） ========== */
.excel-preview {
  font-family: '宋体', SimSun, sans-serif;
  font-size: 12px;
  color: #000;
  overflow-x: auto;
}
.excel-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #000;
}
.excel-table th,
.excel-table td {
  border: 1px solid #000;
  padding: 4px 6px;
  vertical-align: middle;
  font-weight: normal;
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
  padding: 5px;
  font-weight: normal;
}
.info-label {
  text-align: right;
  font-weight: 500;
}
.info-value {
  text-align: left;
}
.excel-header {
  text-align: center;
  font-weight: 500;
}
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.red-text { color: #f56c6c; }
.blue-text { color: #409eff; }
.bold { font-weight: bold; }

.sale-row {
  background: #fff;
}
.cost-row {
  background: #cfe8ff;
}
.cost-row td {
  color: #0b3d66;
}
.total-row {
  background: #f5f5f5;
  font-weight: 500;
}

.empty-gap {
  height: 15px;
}

/* 汇总表样式 */
.summary-table {
  margin-top: 5px;
}
.summary-table .header-cell {
  text-align: center;
  font-weight: 500;
}
.summary-table .color-cell {
  font-weight: 600;
  color: #409eff;
  text-align: center;
}
.summary-table .label-cell {
  text-align: right;
  font-weight: 500;
  white-space: nowrap;
}
.summary-table .value-cell {
  text-align: right;
  min-width: 80px;
  font-family: 'Consolas', monospace;
}
.summary-table .profit-val {
  color: #f56c6c;
}
</style>

<style>
/* 预览弹窗：横向撑满屏幕、减少滚动 */
.lr-preview-dialog {
  margin: 0 auto;
}
.lr-preview-dialog .el-dialog__body {
  padding: 8px 12px;
  overflow: auto;
}
.lr-preview-dialog .excel-preview {
  width: 100%;
  overflow-x: auto;
}
</style>
