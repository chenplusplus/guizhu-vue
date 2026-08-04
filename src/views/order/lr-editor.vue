<!-- src/views/order/lr-editor.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📊 支出收入LR表</h2>
        <el-tag type="primary" size="large">{{ lrInfo?.billNo || '' }}</el-tag>
        <el-tag v-if="lrInfo?.status === 'confirmed'" type="success" size="large">已确认</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon> 保存
        </el-button>
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon> 导出Excel
        </el-button>
        <el-button type="warning" @click="triggerImport">
          <el-icon><Upload /></el-icon> 导入Excel
        </el-button>
        <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none;" @change="handleFileImport" />
      </div>
    </div>

    <el-card class="info-card">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="info-item"><span class="label">账单编号：</span><span class="value">{{ lrInfo?.billNo || '-' }}</span></div>
        </el-col>
        <el-col :span="6">
          <div class="info-item"><span class="label">客户：</span><span class="value">{{ lrInfo?.customerName || '-' }}</span></div>
        </el-col>
        <el-col :span="6">
          <div class="info-item"><span class="label">成色：</span><span class="value">{{ lrInfo?.color || '-' }}</span></div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <span class="label">状态：</span>
            <el-tag :type="lrInfo?.status === 'confirmed' ? 'success' : 'warning'" size="small">
              {{ lrInfo?.status === 'confirmed' ? '已确认' : '编辑中' }}
            </el-tag>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <el-card class="table-card">
      <div ref="containerRef" id="univer-container" style="height:600px;width:100%;"></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Check, Download, Upload } from '@element-plus/icons-vue';
import { getLrTable, saveLr, generateLr, exportLr } from '@/api/lr';

// ============================================================
// Univer 预设模式导入
// ============================================================
import {
  createUniver,
  defaultTheme,
  LocaleType,
  merge,
  UniverInstanceType
} from '@univerjs/presets';

import { UniverSheetsCorePreset } from '@univerjs/presets/preset-sheets-core';
import UniverPresetSheetsCoreZhCN from '@univerjs/presets/preset-sheets-core/locales/zh-CN';
import { UniverSheetsConditionalFormattingPreset } from '@univerjs/presets/preset-sheets-conditional-formatting';
import sheetsConditionalFormattingZhCN from '@univerjs/presets/preset-sheets-conditional-formatting/locales/zh-CN';
import { UniverSheetsDataValidationPreset } from '@univerjs/presets/preset-sheets-data-validation';
import sheetsDataValidationZhCN from '@univerjs/presets/preset-sheets-data-validation/locales/zh-CN';
import { UniverSheetsDrawingPreset } from '@univerjs/presets/preset-sheets-drawing';
import sheetsDrawingZhCN from '@univerjs/presets/preset-sheets-drawing/locales/zh-CN';
import { UniverSheetsFilterPreset } from '@univerjs/presets/preset-sheets-filter';
import sheetsFilterZhCN from '@univerjs/presets/preset-sheets-filter/locales/zh-CN';

// 导入样式
import '@univerjs/presets/lib/styles/preset-sheets-core.css';
import '@univerjs/presets/lib/styles/preset-sheets-conditional-formatting.css';
import '@univerjs/presets/lib/styles/preset-sheets-filter.css';
import '@univerjs/presets/lib/styles/preset-sheets-drawing.css';
import '@univerjs/presets/lib/styles/preset-sheets-data-validation.css';


const route = useRoute();
const router = useRouter();
const containerRef = ref(null);
const fileInput = ref(null);

const billId = ref(Number(route.params.billId));
const lrId = ref(0);
const lrInfo = ref(null);
const loading = ref(false);
const saving = ref(false);

let univer = null;
let univerAPI = null;
let isInitialized = false;

const headers = [
  '流水单号', '序号', '品名', '客户', '钻石级别', '颜色', '件数',
  '手寸/长度', '总重', '净重', '损耗', '加耗重', '金价', '足金料',
  '钻石费用', '粒数', '石重(ct)', '单价(元)', '金额(元)', '镶石工费',
  '粒数', '石重', '单价(元)', '金额(元)', '镶石工费',
  '包装证书', '版费', '工费', '应收金额'
];

// ============================================================
// 构建 IWorkbookData - 修复版
// ============================================================
const buildWorkbookData = (data) => {
  const cellData = {};

  console.log('buildWorkbookData 收到数据:', data);

  if (Array.isArray(data) && data.length > 0) {
    data.forEach((row, rowIndex) => {
      cellData[rowIndex] = {};
      if (Array.isArray(row)) {
        row.forEach((cell, colIndex) => {
          cellData[rowIndex][colIndex] = {
            v: cell !== undefined && cell !== null ? String(cell) : ''
          };
        });
      }
    });
  }

  const sheetData = {
    name: 'LR表',
    id: 'lr-sheet',
    rowCount: Math.max(data?.length || 50, 50),
    columnCount: 29,
    defaultColumnWidth: 100,
    defaultRowHeight: 28,
    cellData: cellData
  };

  const result = {
    id: 'lr-workbook',
    sheetOrder: ['lr-sheet'],
    name: 'LR表',
    appVersion: '',
    locale: LocaleType.ZH_CN,
    styles: {
      header_style: {
        fs: 13,
        bl: 1,
        ht: 2,
        vt: 2,
        bg: '#e6f7ff'
      }
    },
    sheets: {
      'lr-sheet': sheetData
    }
  };

  console.log('构建的 workbookData:', result);
  return result;
};

// ============================================================
// 加载数据
// ============================================================
const loadData = async () => {
  loading.value = true;
  try {
    const res = await getLrTable(billId.value);
    console.log('获取LR表数据:', res);

    if (res?.data) {
      lrInfo.value = res.data;
      lrId.value = res.data.id;

      if (res.data.lrData) {
        const data = typeof res.data.lrData === 'string' ? JSON.parse(res.data.lrData) : res.data.lrData;
        console.log('使用 lrData 数据:', data);
        await nextTick();
        initUniver(data);
      } else if (res.data.rows && res.data.rows.length > 0) {
        const data = buildTableData(res.data.rows);
        console.log('使用 rows 构建数据:', data);
        await nextTick();
        initUniver(data);
      } else {
        console.log('没有数据，生成LR表');
        await generateLrTable();
      }
    } else {
      console.log('没有LR表，生成');
      await generateLrTable();
    }
  } catch (error) {
    console.error('加载失败:', error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const generateLrTable = async () => {
  try {
    const res = await generateLr({ billId: billId.value });
    console.log('生成LR表结果:', res);
    if (res.success) {
      lrId.value = res.lrId;
      const dataRes = await getLrTable(billId.value);
      console.log('重新获取LR表数据:', dataRes);
      if (dataRes?.data) {
        lrInfo.value = dataRes.data;
        lrId.value = dataRes.data.id;
        if (dataRes.data.lrData) {
          const data = typeof dataRes.data.lrData === 'string' ? JSON.parse(dataRes.data.lrData) : dataRes.data.lrData;
          await nextTick();
          initUniver(data);
        } else if (dataRes.data.rows && dataRes.data.rows.length > 0) {
          const data = buildTableData(dataRes.data.rows);
          await nextTick();
          initUniver(data);
        }
      }
    }
  } catch (error) {
    console.error('生成失败:', error);
    ElMessage.error('生成LR表失败');
  }
};

// ============================================================
// 构建表格数据
// ============================================================
const buildTableData = (rows) => {
  const data = [];
  data.push(headers);

  rows.forEach((row) => {
    data.push([
      '',
      row.seqDisplay || '',
      row.productName || '',
      row.customerName || '',
      row.diamondLevel || '',
      row.color || '',
      row.quantity || 1,
      row.size || '',
      row.totalWeight || '',
      row.netWeight || '',
      row.lossRate || '',
      row.addLossWeight || '',
      row.goldPrice || '',
      row.goldMaterialFee || '',
      '',
      row.stoneQty || '',
      row.stoneWeight || '',
      row.stonePrice || '',
      row.stoneAmount || '',
      row.stoneSettingFee || '',
      row.subStoneQty || '',
      row.subStoneWeight || '',
      row.subStonePrice || '',
      row.subStoneAmount || '',
      row.subStoneSettingFee || '',
      row.packingFee || '',
      row.moldFee || '',
      row.laborFee || '',
      row.totalAmount || ''
    ]);
  });

  addSummaryRows(data, rows);
  return data;
};

const addSummaryRows = (data, rows) => {
  data.push([]);

  const summaryHeaders = [
    '成色', '上单净重', '本单净重', '累计净重',
    '上单加耗', '本单加耗', '累计加耗',
    '上单钻石利润', '本单钻石利润', '累计钻石利润',
    '上单镶石利润', '本单镶石利润', '累计镶石利润',
    '上单工费利润', '本单工费利润', '累计工费利润',
    '上单应收总利润', '本单应收总利润', '累计应收总利润'
  ];
  const headerRow = new Array(29).fill('');
  summaryHeaders.forEach((h, i) => headerRow[i] = h);
  data.push(headerRow);

  const groups = {};
  rows.forEach(row => {
    const color = row.color || '未分类';
    if (!groups[color]) groups[color] = { sale: [], cost: [] };
    if (row.rowType === 'sale') groups[color].sale.push(row);
    else groups[color].cost.push(row);
  });

  Object.keys(groups).forEach(color => {
    const g = groups[color];
    const saleNet = g.sale.reduce((s, r) => s + (r.netWeight || 0), 0);
    const costNet = g.cost.reduce((s, r) => s + (r.netWeight || 0), 0);
    const saleAddLoss = g.sale.reduce((s, r) => s + (r.addLossWeight || 0), 0);
    const costAddLoss = g.cost.reduce((s, r) => s + (r.addLossWeight || 0), 0);
    const saleTotal = g.sale.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const costTotal = g.cost.reduce((s, r) => s + (r.totalAmount || 0), 0);

    const row = new Array(29).fill('');
    row[0] = color;
    row[1] = 0;
    row[2] = saleNet.toFixed(3);
    row[3] = saleNet.toFixed(3);
    row[4] = 0;
    row[5] = saleAddLoss.toFixed(3);
    row[6] = saleAddLoss.toFixed(3);
    row[7] = 0;
    row[8] = (saleTotal - costTotal).toFixed(2);
    row[9] = (saleTotal - costTotal).toFixed(2);
    data.push(row);
  });

  const totalSale = rows.filter(r => r.rowType === 'sale').reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalCost = rows.filter(r => r.rowType === 'cost').reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalRow = new Array(29).fill('');
  totalRow[0] = '合计';
  totalRow[8] = totalSale.toFixed(2);
  totalRow[9] = totalCost.toFixed(2);
  totalRow[10] = (totalSale - totalCost).toFixed(2);
  data.push(totalRow);

  const incomeRow = new Array(29).fill('');
  incomeRow[0] = '每日收入';
  incomeRow[1] = totalSale.toFixed(2);
  data.push(incomeRow);

  const expenseRow = new Array(29).fill('');
  expenseRow[0] = '每日开支';
  expenseRow[1] = totalCost.toFixed(2);
  data.push(expenseRow);

  const qtyRow = new Array(29).fill('');
  qtyRow[0] = '出货件数';
  qtyRow[1] = rows.filter(r => r.rowType === 'sale').length;
  data.push(qtyRow);
};

// ============================================================
// 初始化 Univer
// ============================================================
const initUniver = (data) => {
  if (!containerRef.value) {
    console.error('容器不存在');
    return;
  }

  if (univer) {
    univer.dispose();
    univer = null;
    univerAPI = null;
  }

  try {
    // 确保数据是数组
    let tableData = data;
    if (typeof data === 'string') {
      try {
        tableData = JSON.parse(data);
      } catch {
        tableData = [];
      }
    }
    if (!Array.isArray(tableData) || tableData.length === 0) {
      // 如果没有数据，创建空表格
      tableData = [headers];
      for (let i = 0; i < 10; i++) {
        tableData.push(new Array(29).fill(''));
      }
    }

    console.log('最终传入的数据:', tableData);

    const workbookData = buildWorkbookData(tableData);

    const result = createUniver({
      locale: LocaleType.ZH_CN,
      locales: {
        [LocaleType.ZH_CN]: merge(
          {},
          UniverPresetSheetsCoreZhCN,
          sheetsConditionalFormattingZhCN,
          sheetsDataValidationZhCN,
          sheetsDrawingZhCN,
          sheetsFilterZhCN
        )
      },
      theme: defaultTheme,
      presets: [
        UniverSheetsCorePreset({
          container: containerRef.value
        }),
        UniverSheetsConditionalFormattingPreset(),
        UniverSheetsDataValidationPreset(),
        UniverSheetsDrawingPreset(),
        UniverSheetsFilterPreset()
      ]
    });

    univer = result.univer;
    univerAPI = result.univerAPI;

    univer.createUnit(UniverInstanceType.UNIVER_SHEET, workbookData);

    // 设置默认样式
    setTimeout(() => {
      try {
        const workbook = univerAPI.getActiveWorkbook();
        if (workbook) {
          const sheets = workbook.getSheets();
          sheets?.forEach((sheet) => {
            sheet?.setDefaultStyle({ ht: 2, vt: 2, fs: 13 });
          });
        }
      } catch {}
    }, 200);

    isInitialized = true;
    console.log('Univer 初始化成功');

  } catch (error) {
    console.error('Univer 初始化失败:', error);
    ElMessage.error('表格加载失败，请刷新重试');
  }
};

// ============================================================
// 导入 Excel
// ============================================================
const triggerImport = () => {
  fileInput.value?.click();
};

const handleFileImport = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    LuckyExcel.transformExcelToUniver(
      file,
      (exportJson) => {
        if (univer) {
          univer.createUnit(UniverInstanceType.UNIVER_SHEET, exportJson || {});
          ElMessage.success('导入成功');
        }
      },
      (error) => {
        console.error('导入失败:', error);
        ElMessage.error('导入失败，请检查文件格式');
      }
    );
  } catch (error) {
    console.error('导入失败:', error);
    ElMessage.error('导入失败');
  }

  event.target.value = '';
};

// ============================================================
// 获取表格数据
// ============================================================
const getUniverData = () => {
  try {
    if (!univerAPI) return [];
    const workbook = univerAPI.getActiveWorkbook();
    if (!workbook) return [];

    const sheet = workbook.getActiveSheet();
    if (!sheet) return [];

    const data = [];
    const rowCount = sheet.getRowCount() || 50;
    const colCount = 29;

    for (let r = 0; r < rowCount; r++) {
      const rowData = [];
      let hasValue = false;
      for (let c = 0; c < colCount; c++) {
        const cell = sheet.getCell(r, c);
        const val = cell?.v !== undefined && cell?.v !== null ? cell.v : '';
        rowData.push(val);
        if (val !== '') hasValue = true;
      }
      if (hasValue) data.push(rowData);
    }
    return data;
  } catch {
    return [];
  }
};

// ============================================================
// 保存
// ============================================================
const handleSave = async () => {
  if (!univerAPI) {
    ElMessage.warning('表格未加载');
    return;
  }

  saving.value = true;
  try {
    const data = getUniverData();

    const lrRows = [];
    let startRow = 1;
    while (startRow < data.length) {
      const row = data[startRow];
      if (!row || !row[1]) break;
      if (row[0] === '成色' || row[0] === '合计' || row[0] === '每日收入' || row[0] === '每日开支' || row[0] === '出货件数') {
        break;
      }

      lrRows.push({
        seqDisplay: row[1] || '',
        productName: row[2] || '',
        customerName: row[3] || '',
        diamondLevel: row[4] || '',
        color: row[5] || '',
        quantity: Number(row[6]) || 1,
        size: row[7] || '',
        totalWeight: Number(row[8]) || 0,
        netWeight: Number(row[9]) || 0,
        lossRate: Number(row[10]) || 0,
        addLossWeight: Number(row[11]) || 0,
        goldPrice: Number(row[12]) || 0,
        goldMaterialFee: Number(row[13]) || 0,
        stoneQty: Number(row[15]) || 0,
        stoneWeight: Number(row[16]) || 0,
        stonePrice: Number(row[17]) || 0,
        stoneAmount: Number(row[18]) || 0,
        stoneSettingFee: Number(row[19]) || 0,
        subStoneQty: Number(row[20]) || 0,
        subStoneWeight: Number(row[21]) || 0,
        subStonePrice: Number(row[22]) || 0,
        subStoneAmount: Number(row[23]) || 0,
        subStoneSettingFee: Number(row[24]) || 0,
        packingFee: Number(row[25]) || 0,
        moldFee: Number(row[26]) || 0,
        laborFee: Number(row[27]) || 0,
        totalAmount: Number(row[28]) || 0,
        rowType: row[1]?.toString().includes('C') ? 'cost' : 'sale',
        sortOrder: 0
      });

      startRow++;
    }

    await saveLr({
      lrId: lrId.value,
      lrData: JSON.stringify(data),
      rows: lrRows
    });

    ElMessage.success('保存成功');

  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

// ============================================================
// 导出Excel
// ============================================================
const handleExport = async () => {
  try {
    await exportLr(lrId.value);
    ElMessage.success('导出成功');
  } catch {
    ElMessage.error('导出失败');
  }
};

// ============================================================
// 生命周期
// ============================================================
onMounted(() => {
  loadData();
});

onBeforeUnmount(() => {
  if (univer) {
    univer.dispose();
    univer = null;
    univerAPI = null;
  }
});
</script>

<style scoped>
.page-container {
  background: #f5f7fa;
  padding: 16px;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.info-card {
  margin-bottom: 16px;
  background: #fff;
}

.info-card .el-card__body {
  padding: 16px 20px;
}

.info-item {
  padding: 4px 0;
}

.info-item .label {
  color: #999;
  font-size: 14px;
}

.info-item .value {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.table-card {
  background: #fff;
}

.table-card .el-card__body {
  padding: 0;
}

#univer-container {
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}
</style>