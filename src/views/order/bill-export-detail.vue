<!-- src/views/order/bill-export-detail.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" plain>
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📋 出货明细表</h2>
      </div>
      <div class="header-right">
        <el-tag v-if="data.BillNo" type="primary" size="large">{{ data.BillNo }}</el-tag>
        <el-button type="primary" @click="handleExport" :disabled="!data.BillNo">
          <el-icon><Download /></el-icon> 导出Excel
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- ===== Excel 格式主体 ===== -->
    <div v-if="data.BillNo" class="excel-body">

      <!-- ===== 标题 ===== -->
      <div class="excel-title">出 &nbsp; 货 &nbsp; 明 &nbsp; 细 &nbsp; 表</div>

      <!-- ===== 基础信息行 ===== -->
      <div class="info-row">
        <span class="info-label">客户：</span>
        <span class="info-value">{{ data.Customer || '-' }}</span>
        <span class="info-label">成色：</span>
        <span class="info-value">{{ data.Color || '-' }}</span>
        <span class="info-label">币种：</span>
        <span class="info-value">{{ data.Currency || '-' }}</span>
        <span class="info-label">出货日期：</span>
        <span class="info-value">{{ data.BillDate || '-' }}</span>
      </div>

      <!-- ===== 表头 ===== -->
      <el-table :data="data.Rows || []" border stripe size="small" class="export-table"
        :row-class-name="getRowClassName"
        :header-cell-style="headerCellStyle"
        :cell-style="cellStyle">

        <el-table-column prop="OrderNo" label="流水单号" width="120" fixed="left"
          :cell-style="{fontWeight:'bold'}"/>

        <el-table-column prop="Seq" label="序号" width="60" align="center"/>

        <el-table-column prop="ProductName" label="品名" min-width="130"/>

        <el-table-column prop="CustomerName" label="客户" width="100"/>

        <el-table-column prop="DiamondLevel" label="钻石级别" width="90" align="center"/>

        <el-table-column prop="OrderDate" label="订单日期" width="90" align="center"/>

        <el-table-column prop="Color" label="颜色" width="70" align="center"/>

        <el-table-column prop="Quantity" label="件数" width="60" align="center"/>

        <el-table-column prop="Size" label="手寸/长度" width="80" align="center"/>

        <!-- 总重 + 净重 + 损耗 + 加耗重 -->
        <el-table-column label="总重" width="80" align="right">
          <template #default="{ row }">
            <span v-if="!row.IsCustomerSummary">{{ fmt(row.TotalWeight) }}</span>
            <span v-else class="summary-cell">{{ fmt(row.TotalWeight) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="净重" width="80" align="right">
          <template #default="{ row }">
            <span v-if="!row.IsCustomerSummary">{{ fmt(row.NetWeight) }}</span>
            <span v-else class="summary-cell">{{ fmt(row.NetWeight) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="损耗" width="70" align="right">
          <template #default="{ row }">
            <span v-if="!row.IsCustomerSummary">{{ fmt(row.LossRate) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="加耗重" width="90" align="right">
          <template #default="{ row }">
            <span v-if="!row.IsCustomerSummary">{{ fmt(row.AddLossWeight) }}</span>
            <span v-else class="summary-cell">{{ fmt(row.AddLossWeight) }}</span>
          </template>
        </el-table-column>

        <!-- 金价 + 足金料 -->
        <el-table-column label="金价" width="80" align="right">
          <template #default="{ row }">
            <span v-if="!row.IsCustomerSummary && row.GoldPrice > 0">{{ fmt(row.GoldPrice) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="足金料" width="100" align="right">
          <template #default="{ row }">
            <span v-if="!row.IsCustomerSummary">{{ fmt(row.GoldMaterialFee) }}</span>
            <span v-else class="summary-cell">{{ fmt(row.GoldMaterialFee) }}</span>
          </template>
        </el-table-column>

        <!-- 主石 -->
        <el-table-column label="主石" align="center">
          <el-table-column label="粒数" width="55" align="center">
            <template #default="{ row }">
              <span v-if="!row.IsCustomerSummary">{{ row.MainStoneQty || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="石重(ct)" width="85" align="right">
            <template #default="{ row }">
              <span v-if="!row.IsCustomerSummary">{{ fmt(row.MainStoneWeight) }}</span>
              <span v-else class="summary-cell">{{ fmt(row.MainStoneWeight) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="单价(元)" width="85" align="right">
            <template #default="{ row }">
              <span v-if="!row.IsCustomerSummary && row.MainStonePrice > 0">{{ fmt(row.MainStonePrice) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="金额(元)" width="95" align="right">
            <template #default="{ row }">
              <span v-if="!row.IsCustomerSummary">{{ fmt(row.MainStoneAmount) }}</span>
              <span v-else class="summary-cell">{{ fmt(row.MainStoneAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="镶石工费" width="90" align="right">
            <template #default="{ row }">
              <span v-if="!row.IsCustomerSummary">{{ fmt(row.MainStoneSettingFee) }}</span>
              <span v-else class="summary-cell">{{ fmt(row.MainStoneSettingFee) }}</span>
            </template>
          </el-table-column>
        </el-table-column>

        <!-- 副石 -->
        <el-table-column label="副石" align="center">
          <el-table-column label="粒数" width="55" align="center">
            <template #default="{ row }">
              <span v-if="!row.IsCustomerSummary">{{ row.SubStoneQty || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column label="石重" width="70" align="right">
            <template #default="{ row }">
              <span v-if="!row.IsCustomerSummary">{{ fmt(row.SubStoneWeight) }}</span>
              <span v-else class="summary-cell">{{ fmt(row.SubStoneWeight) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="单价(元)" width="85" align="right">
            <template #default="{ row }">
              <span v-if="!row.IsCustomerSummary && row.SubStonePrice > 0">{{ fmt(row.SubStonePrice) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="金额(元)" width="90" align="right">
            <template #default="{ row }">
              <span v-if="!row.IsCustomerSummary">{{ fmt(row.SubStoneAmount) }}</span>
              <span v-else class="summary-cell">{{ fmt(row.SubStoneAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="镶石工费" width="90" align="right">
            <template #default="{ row }">
              <span v-if="!row.IsCustomerSummary">{{ fmt(row.SubStoneSettingFee) }}</span>
              <span v-else class="summary-cell">{{ fmt(row.SubStoneSettingFee) }}</span>
            </template>
          </el-table-column>
        </el-table-column>

        <!-- 包装证书邮费 -->
        <el-table-column label="包装证书邮费" width="100" align="right">
          <template #default="{ row }">
            <span v-if="!row.IsCustomerSummary">{{ fmt(row.PackingFee) }}</span>
            <span v-else class="summary-cell">{{ fmt(row.PackingFee) }}</span>
          </template>
        </el-table-column>

        <!-- 版费 -->
        <el-table-column label="版费" width="80" align="right">
          <template #default="{ row }">
            <span v-if="!row.IsCustomerSummary">{{ fmt(row.CertificateFee) }}</span>
            <span v-else class="summary-cell">{{ fmt(row.CertificateFee) }}</span>
          </template>
        </el-table-column>

        <!-- 工费 -->
        <el-table-column label="工费" width="80" align="right">
          <template #default="{ row }">
            <span v-if="!row.IsCustomerSummary">{{ fmt(row.LaborFee) }}</span>
            <span v-else class="summary-cell">{{ fmt(row.LaborFee) }}</span>
          </template>
        </el-table-column>

        <!-- 磨石费 -->
        <el-table-column label="磨石费" width="80" align="right">
          <template #default="{ row }">
            <span v-if="!row.IsCustomerSummary">{{ fmt(row.MoldFee) }}</span>
            <span v-else class="summary-cell">{{ fmt(row.MoldFee) }}</span>
          </template>
        </el-table-column>

        <!-- 模具费 -->
        <el-table-column label="模具费" width="80" align="right">
          <template #default="{ row }">
            <span v-if="!row.IsCustomerSummary">{{ fmt(row.MoldFee) }}</span>
            <span v-else class="summary-cell">{{ fmt(row.MoldFee) }}</span>
          </template>
        </el-table-column>

        <!-- 应收金额 -->
        <el-table-column label="应收金额" width="110" align="right" fixed="right"
          :cell-style="{fontWeight:'bold'}">
          <template #default="{ row }">
            <span v-if="!row.IsCustomerSummary" style="color:#E6A23C;font-weight:bold;">
              {{ fmt(row.TotalAmount) }}
            </span>
            <span v-else class="summary-cell" style="font-weight:bold;color:#303133;">
              {{ fmt(row.TotalAmount) }}
            </span>
          </template>
        </el-table-column>
      </el-table>

      <!-- ===== 底部汇总区 ===== -->
      <div class="footer-area">
        <el-row :gutter="0">
          <el-col :span="12">
            <!-- 左侧：欠款信息 -->
            <div class="footer-block">
              <div class="footer-row">
                <span class="flabel">上单欠足料：</span>
                <span class="fval">{{ fmt(data.LastDebtMaterial) }}</span>
                <span class="flabel">本单应收足料：</span>
                <span class="fval">{{ fmt(data.CurrentMaterial) }}</span>
                <span class="flabel">来足料重：</span>
                <span class="fval">{{ fmt(data.ReceivedMaterial) }}</span>
                <span class="flabel" style="color:#F56C6C;font-weight:bold;">累欠足金料：</span>
                <span class="fval" style="color:#F56C6C;font-weight:bold;">{{ fmt(data.TotalDebtMaterial) }}</span>
              </div>
              <div class="footer-row">
                <span class="flabel">上单欠款：</span>
                <span class="fval">{{ fmt(data.LastDebtMoney) }}</span>
                <span class="flabel">本单应收款：</span>
                <span class="fval">{{ fmt(data.CurrentMoney) }}</span>
                <span class="flabel">来款金额：</span>
                <span class="fval">{{ fmt(data.ReceivedMoney) }}</span>
                <span class="flabel" style="color:#F56C6C;font-weight:bold;">累计欠款：</span>
                <span class="fval" style="color:#F56C6C;font-weight:bold;">{{ fmt(data.TotalDebtMoney) }}</span>
              </div>
              <div class="footer-row">
                <span class="flabel">现金来款：</span>
                <span class="fval"></span>
                <span class="flabel">支付宝来款：</span>
                <span class="fval"></span>
                <span class="flabel">微信来款：</span>
                <span class="fval"></span>
                <span class="flabel">银行来款：</span>
                <span class="fval"></span>
                <span class="flabel">抵扣金额：</span>
                <span class="fval"></span>
              </div>
              <div class="footer-row">
                <span class="flabel">来款日期：</span>
                <span class="fval"></span>
                <span class="flabel">来款日期：</span>
                <span class="fval"></span>
                <span class="flabel">来款日期：</span>
                <span class="fval"></span>
                <span class="flabel">来款日期：</span>
                <span class="fval"></span>
                <span class="flabel">抵扣日期：</span>
                <span class="fval"></span>
              </div>
            </div>
          </el-col>
          <el-col :span="12" style="display:flex;align-items:flex-end;justify-content:flex-end;padding-right:16px;">
            <div class="sign-area">
              <div style="margin-bottom:8px;">制单：<span style="display:inline-block;min-width:120px;border-bottom:1px solid #303133;"></span></div>
              <div>备注：<span style="display:inline-block;min-width:200px;border-bottom:1px solid #303133;"></span></div>
            </div>
          </el-col>
        </el-row>
        <div class="note-text">
          注：为了保证您的利益，请将以上产品送当地部门检测。
        </div>
      </div>

    </div>

    <!-- 空状态 -->
    <el-empty v-if="!loading && !data.BillNo" :description="emptyText"/>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Download, Refresh } from '@element-plus/icons-vue';
import { getBillExportData, exportBill } from '@/api/bill';

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const data = ref({});

// 空状态提示文字
const emptyText = computed(() => {
  return route.query.billId ? '暂无出货明细数据' : '请从账单列表选择要查看的账单';
});

// ============================================================
// 格式化工具
// ============================================================
const fmt = (v) => {
  if (v === null || v === undefined || v === '') return '';
  const n = parseFloat(v);
  if (isNaN(n)) return '';
  return n.toFixed(n % 1 === 0 ? 0 : (Math.abs(n) < 1 ? 4 : 2));
};

// ============================================================
// 表格样式
// ============================================================
const headerCellStyle = () => ({
  background: '#2c3e50',
  color: '#ffffff',
  fontWeight: 'bold',
  fontSize: '12px',
  fontFamily: '宋体, SimSun',
  textAlign: 'center',
  padding: '4px 6px',
});

const cellStyle = () => ({
  fontSize: '12px',
  fontFamily: '宋体, SimSun',
  padding: '3px 6px',
});

const getRowClassName = ({ row }) => {
  if (row.CustomerGroup === '__total') return 'total-row';
  if (row.IsCustomerSummary) return 'customer-summary-row';
  return '';
};

// ============================================================
// 加载数据
// ============================================================
const loadData = async () => {
  const billId = route.query.billId;
  
  // 如果没有 billId，显示提示，但不请求数据
  if (!billId) {
    data.value = {};
    return;
  }

  loading.value = true;
  try {
    // ✅ 传入 billId 获取对应账单的明细数据
    const res = await getBillExportData(billId);
    if (res?.data?.BillNo) {
      data.value = res.data;
    } else {
      data.value = {};
      ElMessage.warning('暂无出货明细数据');
    }
  } catch (e) {
    console.error('加载出货明细失败:', e);
    ElMessage.error(e.message || '加载失败');
    data.value = {};
  } finally {
    loading.value = false;
  }
};

// ============================================================
// 返回
// ============================================================
const goBack = () => {
  router.back();
};

// ============================================================
// 导出 Excel
// ============================================================
const handleExport = async () => {
  if (!data.value.BillNo || !data.value.Rows || data.value.Rows.length === 0) {
    ElMessage.warning('无数据可导出');
    return;
  }
  
  try {
    const billId = route.query.billId;
    const response = await exportBill(billId);
    const blob = new Blob([response], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `出货明细_${data.value.BillNo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (e) {
    console.error('导出失败:', e);
    ElMessage.error(e.message || '导出失败');
  }
};

// ============================================================
// 初始化
// ============================================================
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.page-container {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.header-left { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
}
.header-right { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  flex-wrap: wrap;
}
.page-header h2 { 
  font-size: 18px; 
  font-weight: 600; 
  margin: 0; 
}

/* ===== Excel 风格 ===== */
.excel-body {
  border: 1px solid #d0d0d0;
  font-family: '宋体', SimSun;
}

.excel-title {
  text-align: center;
  font-size: 22px;
  font-weight: bold;
  font-family: '宋体', SimSun;
  padding: 14px 0 10px;
  letter-spacing: 6px;
  border-bottom: 2px solid #333;
  color: #1a1a1a;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 8px 20px;
  font-size: 13px;
  font-family: '宋体', SimSun;
  flex-wrap: wrap;
  border-bottom: 1px solid #d0d0d0;
  gap: 4px 12px;
}
.info-label {
  font-weight: normal;
  color: #555;
  white-space: nowrap;
}
.info-value {
  font-weight: bold;
  color: #1a1a1a;
  margin-right: 12px;
}

/* 表格 */
.export-table {
  font-family: '宋体', SimSun;
  font-size: 12px;
}

:deep(.customer-summary-row) td {
  background: #fff3cd !important;
  font-weight: bold;
  color: #856404;
  border-top: 1.5px solid #e6c96c;
}

:deep(.total-row) td {
  background: #ffffcc !important;
  font-weight: bold;
  color: #1a1a1a;
  border-top: 2px solid #333;
}

.summary-cell {
  font-weight: bold;
  color: #856404;
}

/* 底部 */
.footer-area {
  padding: 12px 20px;
  border-top: 2px solid #333;
  font-family: '宋体', SimSun;
  font-size: 13px;
  background: #fafafa;
}

.footer-block { 
  display: flex; 
  flex-direction: column; 
  gap: 6px; 
}
.footer-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}
.flabel {
  color: #555;
  white-space: nowrap;
}
.fval {
  display: inline-block;
  min-width: 60px;
  color: #1a1a1a;
  font-weight: bold;
}

.sign-area {
  font-family: '宋体', SimSun;
  font-size: 13px;
  color: #555;
  margin-left: 40px;
  margin-bottom: 8px;
}

.note-text {
  margin-top: 8px;
  font-size: 12px;
  color: #888;
  font-family: '宋体', SimSun;
}

/* 空状态适配 */
:deep(.el-empty) {
  padding: 60px 0;
}
</style>