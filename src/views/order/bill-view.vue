<!--
  src/views/order/today-bill.vue
  今天出货明细（按客户小节汇总）
  样式复刻 Excel 出货明细表；数据字段参考 bill-detail.vue 的 details 结构
  依赖接口（需在 @/api/bill 中新增）：
    getTodayBillList(params)  -> 返回今日所有出货明细扁平数组，字段同 bill-detail.details
-->
<template>
  <div class="today-bill-page" v-loading="loading">
    <!-- ===== 顶部操作栏 ===== -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button @click="goBack" plain>
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2 class="page-title">📄 今天出货明细</h2>
        <el-tag type="primary" size="large" effect="plain">{{ formatDate(queryDate) }}</el-tag>
      </div>
      <div class="toolbar-right">
        <el-date-picker
          v-model="queryDate"
          type="date"
          placeholder="选择日期"
          value-format="YYYY-MM-DD"
          :clearable="false"
          style="width:160px;"
        />
        <el-button type="primary" @click="loadData">
          <el-icon><Search /></el-icon> 查询
        </el-button>
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon> 导出
        </el-button>
      </div>
    </div>

    <!-- ===== 出货明细表（Excel 风格） ===== -->
    <div class="bill-sheet">
      <!-- 大标题 -->
      <div class="sheet-title">出　货　明　细　表</div>

      <!-- 表头信息行 -->
      <div class="sheet-meta">
        <div class="meta-item"><span class="meta-label">客户：</span><span class="meta-value">{{ sheetMeta.customerName || '—' }}</span></div>
        <div class="meta-item"><span class="meta-label">成色：</span><span class="meta-value">{{ sheetMeta.color || 'Au755' }}</span></div>
        <div class="meta-item"><span class="meta-label">币种：</span><span class="meta-value">RMB</span></div>
        <div class="meta-item"><span class="meta-label">出货日期：</span><span class="meta-value">{{ formatDate(queryDate) }}</span></div>
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

      <!-- ===== 底部汇总区 ===== -->
      <div class="sheet-footer">
        <!-- 第一行：足料 -->
        <div class="footer-row">
          <div class="footer-cell"><span class="f-label">上单欠足料：</span><span class="f-value">{{ footer.lastDebtMaterial }}</span></div>
          <div class="footer-cell"><span class="f-label">本单应收足料：</span><span class="f-value highlight">{{ footer.currentMaterial }}</span></div>
          <div class="footer-cell"><span class="f-label">来足料重：</span><span class="f-value">{{ footer.receivedMaterial }}</span></div>
          <div class="footer-cell"><span class="f-label">累欠足金料：</span><span class="f-value" :class="{'text-red': footer.totalDebtMaterialNum > 0}">{{ footer.totalDebtMaterial }}</span></div>
        </div>
        <!-- 第二行：欠款 -->
        <div class="footer-row">
          <div class="footer-cell"><span class="f-label">上单欠款：</span><span class="f-value">{{ footer.lastDebtMoney }}</span></div>
          <div class="footer-cell"><span class="f-label">本单应收款：</span><span class="f-value highlight">{{ footer.currentMoney }}</span></div>
          <div class="footer-cell"><span class="f-label">来款金额：</span><span class="f-value">{{ footer.receivedMoney }}</span></div>
          <div class="footer-cell"><span class="f-label">累计欠款：</span><span class="f-value" :class="{'text-red': footer.totalDebtMoneyNum > 0}">{{ footer.totalDebtMoney }}</span></div>
        </div>
        <!-- 第三行：来款渠道 -->
        <div class="footer-row">
          <div class="footer-cell"><span class="f-label">现金来款：</span><span class="f-value">{{ footer.cashPayment }}</span></div>
          <div class="footer-cell"><span class="f-label">支付宝来款：</span><span class="f-value">{{ footer.alipayPayment }}</span></div>
          <div class="footer-cell"><span class="f-label">微信来款：</span><span class="f-value">{{ footer.wechatPayment }}</span></div>
          <div class="footer-cell"><span class="f-label">银行来款：</span><span class="f-value">{{ footer.bankPayment }}</span></div>
          <div class="footer-cell"><span class="f-label">抵扣金额：</span><span class="f-value">{{ footer.deductionAmount }}</span></div>
        </div>
        <!-- 第四行：来款日期 -->
        <div class="footer-row">
          <div class="footer-cell"><span class="f-label">来款日期：</span><span class="f-value">{{ footer.cashDate }}</span></div>
          <div class="footer-cell"><span class="f-label">来款日期：</span><span class="f-value">{{ footer.alipayDate }}</span></div>
          <div class="footer-cell"><span class="f-label">来款日期：</span><span class="f-value">{{ footer.wechatDate }}</span></div>
          <div class="footer-cell"><span class="f-label">来款日期：</span><span class="f-value">{{ footer.bankDate }}</span></div>
          <div class="footer-cell"><span class="f-label">抵扣日期：</span><span class="f-value">{{ footer.deductionDate }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElLoading } from 'element-plus';
import { ArrowLeft, Search, Download } from '@element-plus/icons-vue';
// ⭐ 接口需在 @/api/bill 中新增，返回今日所有出货明细扁平数组，字段同 bill-detail.details
// import { getTodayBillList } from '@/api/bill';

const router = useRouter();
const loading = ref(false);
const queryDate = ref(formatDate(new Date()));
const rawDetails = ref([]);

// ===== 表头信息 =====
const sheetMeta = computed(() => {
  const first = rawDetails.value[0] || {};
  return {
    customerName: first.customerName || '',
    color: first.color || 'Au755',
  };
});

// ===== 按客户分组 → 明细行 + 黄色小计行 + 合计行 =====
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

// ===== 底部汇总数据（今日维度，暂无接口则留空，接入后填充） =====
const footer = computed(() => {
  const totalAmt = tableData.value.length
    ? tableData.value[tableData.value.length - 1].totalAmount
    : 0;
  return {
    lastDebtMaterial: '—',
    currentMaterial: '—',
    receivedMaterial: '—',
    totalDebtMaterial: '—',
    totalDebtMaterialNum: 0,
    lastDebtMoney: '—',
    currentMoney: `¥${Number(totalAmt || 0).toFixed(2)}`,
    receivedMoney: '¥0.00',
    totalDebtMoney: '—',
    totalDebtMoneyNum: 0,
    cashPayment: '',
    alipayPayment: '',
    wechatPayment: '',
    bankPayment: '',
    deductionAmount: '',
    cashDate: '',
    alipayDate: '',
    wechatDate: '',
    bankDate: '',
    deductionDate: '',
  };
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
    // 品名列(index=2)占据 流水单号+序号+品名 三列
    if (columnIndex === 2) return { rowspan: 1, colspan: 3 };
    if (columnIndex === 0 || columnIndex === 1) return { rowspan: 0, colspan: 0 };
  }
  return { rowspan: 1, colspan: 1 };
};

// ============================================================
// 加载数据（接口对齐 bill-detail.vue 写法）
// ============================================================
const loadData = async () => {
  if (!queryDate.value) {
    ElMessage.warning('请选择日期');
    return;
  }
  loading.value = true;
  try {
    // ⭐ 实际项目取消注释，接口返回今日所有出货明细扁平数组
    // const res = await getTodayBillList({ billDate: queryDate.value });
    // rawDetails.value = res?.data || [];

    // ---------- mock 数据（接入真实接口后删除） ----------
    rawDetails.value = mockData();
    // ------------------------------------------------------

    if (rawDetails.value.length === 0) {
      ElMessage.warning('当日暂无出货明细');
    }
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// ============================================================
// 导出（复用 bill-detail.vue 的原生 fetch 方式）
// ============================================================
const handleExport = async () => {
  if (!queryDate.value) {
    ElMessage.warning('请选择日期');
    return;
  }
  const ld = ElLoading.service({
    fullscreen: true,
    text: '正在导出...',
    background: 'rgba(0,0,0,0.7)',
  });
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/bill/export-today?billDate=${queryDate.value}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
    ld.close();
    if (!response.ok) {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        ElMessage.error(json.message || `导出失败：${response.status}`);
      } catch {
        ElMessage.error(`导出失败：${response.status}`);
      }
      return;
    }
    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      ElMessage.error('导出失败：文件为空');
      return;
    }
    const contentDisposition = response.headers.get('content-disposition');
    let fileName = `今天出货明细_${queryDate.value}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) fileName = decodeURIComponent(match[1].replace(/['"]/g, ''));
    }
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    ElMessage.success('导出成功');
  } catch (error) {
    ld.close();
    ElMessage.error(error.message || '导出失败，请重试');
  }
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

const goBack = () => router.back();

// ============================================================
// Mock 数据（结构对齐 bill-detail.details，接入真实接口后删除整个函数）
// ============================================================
function mockData() {
  return [
    { serialNo: '1', productName: 'LYWD耳钉', customerName: 'CANDICE', diamondLevel: '7/6', orderDate: '2026-07-06', color: 'K黄', quantity: 1, size: '', totalWeight: 2.75, netWeight: 2.74, lossRate: 1.10, addedWeight: 3.01, goldPrice: 693, goldMaterialFee: 2.28, mainStoneQty: 0, mainStoneWeight: 0, mainStonePrice: 0, mainStoneAmount: 0, mainStoneSettingFee: 0, subStoneQty: 2, subStoneWeight: 0.08, subStonePrice: 700, subStoneAmount: 66, subStoneSettingFee: 5, packingFee: 0, certificateFee: 0, postageFee: 0, moldFee: 0, laborFee: 260, totalAmount: 2415 },
    { serialNo: '3', productName: 'D调的尾巴部分', customerName: 'HELEN', diamondLevel: '7/2', orderDate: '2026-07-02', color: 'K黄', quantity: 1, size: '', totalWeight: 3.12, netWeight: 3.11, lossRate: 1.10, addedWeight: 3.42, goldPrice: 679, goldMaterialFee: 2.58, mainStoneQty: 0, mainStoneWeight: 0, mainStonePrice: 0, mainStoneAmount: 0, mainStoneSettingFee: 0, subStoneQty: 20, subStoneWeight: 0.13, subStonePrice: 3000, subStoneAmount: 450, subStoneSettingFee: 3, packingFee: 0, certificateFee: 0, postageFee: 0, moldFee: 0, laborFee: 0, totalAmount: 2773 },
    { serialNo: '5', productName: '窄版满天星K戒', customerName: 'JOCO', diamondLevel: '7/3', orderDate: '2026-07-03', color: 'K红', quantity: 1, size: '48', totalWeight: 2.53, netWeight: 2.51, lossRate: 1.10, addedWeight: 2.76, goldPrice: 696, goldMaterialFee: 2.08, mainStoneQty: 0, mainStoneWeight: 0, mainStonePrice: 0, mainStoneAmount: 0, mainStoneSettingFee: 0, subStoneQty: 72, subStoneWeight: 0.15, subStonePrice: 3000, subStoneAmount: 666, subStoneSettingFee: 3, packingFee: 0, certificateFee: 0, postageFee: 0, moldFee: 0, laborFee: 100, totalAmount: 2688 },
    { serialNo: '7', productName: '大号满天星K戒', customerName: 'BILL', diamondLevel: '7/6', orderDate: '2026-07-06', color: 'K黄', quantity: 1, size: '64', totalWeight: 9.37, netWeight: 9.31, lossRate: 1.10, addedWeight: 10.24, goldPrice: 693, goldMaterialFee: 7.73, mainStoneQty: 0, mainStoneWeight: 0, mainStonePrice: 0, mainStoneAmount: 0, mainStoneSettingFee: 0, subStoneQty: 84, subStoneWeight: 0.89, subStonePrice: 3400, subStoneAmount: 3278, subStoneSettingFee: 3, packingFee: 0, certificateFee: 0, postageFee: 0, moldFee: 0, laborFee: 230, totalAmount: 10605 },
    { serialNo: '9', productName: '小号铆钉手镯', customerName: 'JENNY', diamondLevel: '6/29', orderDate: '2026-06-29', color: 'K黄', quantity: 1, size: '15', totalWeight: 29.69, netWeight: 29.69, lossRate: '', addedWeight: 32.66, goldPrice: 674, goldMaterialFee: 24.66, mainStoneQty: 0, mainStoneWeight: 0, mainStonePrice: 0, mainStoneAmount: 0, mainStoneSettingFee: 0, subStoneQty: 0, subStoneWeight: 0, subStonePrice: 0, subStoneAmount: 0, subStoneSettingFee: 0, packingFee: 0, certificateFee: 0, postageFee: 0, moldFee: 30, laborFee: 750, totalAmount: 22792 },
  ];
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
/* ===== 页面容器 ===== */
.today-bill-page {
  background: #f0f4f9;
  padding: 12px;
  min-height: 100vh;
}

/* ===== 顶部操作栏 ===== */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 12px 20px;
  border-radius: 8px 8px 0 0;
  flex-wrap: wrap;
  gap: 10px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1d2129;
}

/* ===== 出货明细表主体（Excel 风格） ===== */
.bill-sheet {
  background: #fff;
  padding: 16px 20px 24px;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
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
}
.meta-item {
  flex: 1;
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

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .today-bill-page { padding: 6px; }
  .bill-sheet { padding: 10px 8px 16px; }
  .sheet-title { font-size: 18px; letter-spacing: 4px; }
  .sheet-meta { flex-wrap: wrap; gap: 4px; }
  .meta-item { flex: 0 0 50%; }
}
</style>
