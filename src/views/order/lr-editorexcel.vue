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

// ====================== 【重点重写】严格对照截图双表头+合并单元格 ======================
const buildWorkbookData = (originDetailRows) => {
  let cellData = {};
  let rowIndex = 0;
  const COL = 29;
  const mergeList = [];

  // ---------- 第0行：标题【支出收入LR表】合并全部29列居中 ----------
  cellData[rowIndex] = { 0: { v: '支出收入LR表', s: 'header_title' } };
  mergeList.push({ startRow: 0, endRow: 0, startColumn: 0, endColumn: COL - 1 });
  rowIndex++;

  // ---------- 第1行：客户 / 成色Au755 / 币种RMB / 出货日期 ----------
  cellData[rowIndex] = {
    1:  { v: '客户:' },
    10: { v: '成色: Au755' },
    20: { v: '币种: RMB' },
    26: { v: '出货日期:2026/7/2' }
  };
  rowIndex++;

  // ---------- 第2行：双表头·上层 ----------
  cellData[rowIndex] = {};
  // 基础列 col0-13：纵向合并（跨第2、3行）
  const baseHeaders = ['流水单号','序号','品名','客户','钻石级别','颜色','件数','手寸/长度','总重','净重','损耗','加耗重','金价','足金料'];
  baseHeaders.forEach((text, col) => {
    cellData[rowIndex][col] = { v: text, s: 'header-blue' };
    mergeList.push({ startRow: rowIndex, endRow: rowIndex + 1, startColumn: col, endColumn: col });
  });
  // 大标题1「钻石费用」横向合并 col14-18
  cellData[rowIndex][14] = { v: '钻石费用', s: 'header-blue' };
  mergeList.push({ startRow: rowIndex, endRow: rowIndex, startColumn: 14, endColumn: 18 });
  // 大标题2「镶石工费」横向合并 col19-23
  cellData[rowIndex][19] = { v: '镶石工费', s: 'header-blue' };
  mergeList.push({ startRow: rowIndex, endRow: rowIndex, startColumn: 19, endColumn: 23 });
  // 尾部单列 col24-28：纵向合并
  const tailHeaders = ['镶石工费','包装证书','版费','工费','应收金额'];
  tailHeaders.forEach((text, idx) => {
    const col = 24 + idx;
    cellData[rowIndex][col] = { v: text, s: 'header-blue' };
    mergeList.push({ startRow: rowIndex, endRow: rowIndex + 1, startColumn: col, endColumn: col });
  });
  rowIndex++;

  // ---------- 第3行：双表头·下层（子列） ----------
  cellData[rowIndex] = {};
  ['粒数','石重(ct)','单价(元)','金额(元)','镶石工费'].forEach((t, i) => {
    cellData[rowIndex][14 + i] = { v: t, s: 'header-blue-sub' };
  });
  ['粒数','石重','单价(元)','金额(元)','镶石工费'].forEach((t, i) => {
    cellData[rowIndex][19 + i] = { v: t, s: 'header-blue-sub' };
  });
  rowIndex++;

  // ---------- 商品明细行（浅蓝色底色） ----------
  originDetailRows.forEach((oneRow) => {
    cellData[rowIndex] = {};
    oneRow.forEach((cellVal, colIdx) => {
      cellData[rowIndex][colIdx] = { v: cellVal ?? '', s: 'row-blue' };
    });
    rowIndex++;
  });

  // ---------- 合计行 ----------
  cellData[rowIndex] = { 0: { v: '合计', s: 'row-blue' } };
  rowIndex++;
  rowIndex++; // 空行分隔

  // ---------- 汇总区表头行 ----------
  cellData[rowIndex] = {};
  ['成色','上单净重出货','本单净重出货','累计净重出货','上单加耗重出货','本单加耗重出货','累计加耗重出货']
    .forEach((t, i) => { cellData[rowIndex][i] = { v: t, s: 'summary-header' }; });
  // 利润区4组标签，每组横向合并多列
  cellData[rowIndex][7]  = { v: '上单钻石利润:', s: 'summary-header' };
  mergeList.push({ startRow: rowIndex, endRow: rowIndex, startColumn: 7,  endColumn: 12 });
  cellData[rowIndex][13] = { v: '上单镶石利润:', s: 'summary-header' };
  mergeList.push({ startRow: rowIndex, endRow: rowIndex, startColumn: 13, endColumn: 18 });
  cellData[rowIndex][19] = { v: '上单工费利润:', s: 'summary-header' };
  mergeList.push({ startRow: rowIndex, endRow: rowIndex, startColumn: 19, endColumn: 24 });
  cellData[rowIndex][25] = { v: '上单应收金额总利润:', s: 'summary-header-red' };
  mergeList.push({ startRow: rowIndex, endRow: rowIndex, startColumn: 25, endColumn: 28 });
  rowIndex++;

  // ---------- 汇总区成色行（18K/14K/9K/PT/银/铜） ----------
  const colorList = ['18K', '14K', '9K', 'PT', '银', '铜'];
  const profitLabels = [
    ['本单钻石利润:', '本单镶石利润:', '本单工费利润:', '本单应收金额总利润:'],
    ['累计钻石利润:', '累计镶石利润:', '累计工费利润:', '累计应收金额总利润:'],
    ['上单每日收入:', '上单每日开支:', '上单出货件数:', '应收总金额:'],
    ['本单每日收入:', '本单每日开支:', '本单出货件数:', ''],
    ['累计收入:',     '累计开支:',     '累计出货件数:', '支出平衡总金额:'],
    ['', '', '', '']
  ];
  colorList.forEach((color, i) => {
    cellData[rowIndex] = {
      0: { v: color },
      3: { s: 'yellow-cell' },
      6: { s: 'yellow-cell' }
    };
    const labels = profitLabels[i];
    if (labels[0]) cellData[rowIndex][7]  = { v: labels[0] };
    if (labels[1]) cellData[rowIndex][13] = { v: labels[1] };
    if (labels[2]) cellData[rowIndex][19] = { v: labels[2] };
    if (labels[3]) {
      const red = labels[3].includes('应收总金额') || labels[3].includes('支出平衡总金额');
      cellData[rowIndex][25] = { v: labels[3], s: red ? 'red-text' : undefined };
    }
    // 每行利润标签都合并对应列
    mergeList.push({ startRow: rowIndex, endRow: rowIndex, startColumn: 7,  endColumn: 12 });
    mergeList.push({ startRow: rowIndex, endRow: rowIndex, startColumn: 13, endColumn: 18 });
    mergeList.push({ startRow: rowIndex, endRow: rowIndex, startColumn: 19, endColumn: 24 });
    mergeList.push({ startRow: rowIndex, endRow: rowIndex, startColumn: 25, endColumn: 28 });
    rowIndex++;
  });

  // ---------- 工作表 & 全局样式 ----------
  const sheetData = {
    name: 'LR表',
    id: 'lr-sheet',
    rowCount: Math.max(rowIndex, 80),
    columnCount: COL,
    defaultColumnWidth: 90,
    defaultRowHeight: 26,
    cellData,
    mergeData: mergeList
  };

  return {
    id: 'lr-workbook',
    sheetOrder: ['lr-sheet'],
    name: 'LR表',
    appVersion: '',
    locale: LocaleType.ZH_CN,
    styles: {
      header_title:      { fs: 20, bl: 1, ht: 2, vt: 2 },
      'header-blue':     { fs: 12, bl: 1, ht: 2, vt: 2, bg: '#409EFF', fc: '#ffffff' },
      'header-blue-sub': { fs: 11, bl: 1, ht: 2, vt: 2, bg: '#409EFF', fc: '#ffffff' },
      'row-blue':        { bg: '#e8f3ff', ht: 2, vt: 2 },
      'yellow-cell':     { bg: '#ffdd00' },
      'summary-header':  { bl: 1, ht: 1, vt: 2 },
      'summary-header-red': { bl: 1, ht: 1, vt: 2, fc: '#ff0000' },
      'red-text':        { fc: '#ff0000' }
    },
    sheets: { 'lr-sheet': sheetData }
  };
};

// 加载数据
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
        await nextTick();
        initUniver(data);
      } else if (res.data.rows && res.data.rows.length > 0) {
        const data = buildTableData(res.data.rows);
        await nextTick();
        initUniver(data);
      } else {
        await generateLrTable();
      }
    } else {
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

// 组装明细行数组（29列，与双表头列位置严格对应）
const buildTableData = (rows) => {
  const data = [];
  rows.forEach((row) => {
    data.push([
      '',                    // 0 流水单号
      row.seqDisplay || '',  // 1 序号
      row.productName || '', // 2 品名
      row.customerName || '',// 3 客户
      row.diamondLevel || '',// 4 钻石级别
      row.color || '',       // 5 颜色
      row.quantity || 1,     // 6 件数
      row.size || '',        // 7 手寸/长度
      row.totalWeight || '', // 8 总重
      row.netWeight || '',   // 9 净重
      row.lossRate || '',    // 10 损耗
      row.addLossWeight || '',// 11 加耗重
      row.goldPrice || '',   // 12 金价
      row.goldMaterialFee || '',// 13 足金料
      '',                    // 14 钻石费用-粒数
      row.stoneQty || '',    // 15 石重(ct)
      row.stoneWeight || '', // 16 单价(元)
      row.stonePrice || '',  // 17 金额(元)
      row.stoneAmount || '', // 18 镶石工费
      row.stoneSettingFee || '',// 19 镶石工费-粒数
      row.subStoneQty || '', // 20 石重
      row.subStoneWeight || '',// 21 单价(元)
      row.subStonePrice || '',// 22 金额(元)
      row.subStoneAmount || '',// 23 镶石工费
      row.subStoneSettingFee || '',// 24 镶石工费(尾列)
      row.packingFee || '',  // 25 包装证书
      row.moldFee || '',     // 26 版费
      row.laborFee || '',    // 27 工费
      row.totalAmount || ''  // 28 应收金额
    ]);
  });
  return data;
};

// 初始化 Univer
const initUniver = (data) => {
  if (!containerRef.value) { console.error('容器不存在'); return; }
  if (univer) { univer.dispose(); univer = null; univerAPI = null; }
  try {
    let tableData = data;
    if (typeof data === 'string') {
      try { tableData = JSON.parse(data); } catch { tableData = []; }
    }
    if (!Array.isArray(tableData) || tableData.length === 0) tableData = [];

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
        UniverSheetsCorePreset({ container: containerRef.value }),
        UniverSheetsConditionalFormattingPreset(),
        UniverSheetsDataValidationPreset(),
        UniverSheetsDrawingPreset(),
        UniverSheetsFilterPreset()
      ]
    });
    univer = result.univer;
    univerAPI = result.univerAPI;
    univer.createUnit(UniverInstanceType.UNIVER_SHEET, workbookData);

    setTimeout(() => {
      try {
        const workbook = univerAPI.getActiveWorkbook();
        if (workbook) {
          workbook.getSheets()?.forEach((sheet) => {
            sheet?.setDefaultStyle({ ht: 2, vt: 2, fs: 12 });
          });
        }
      } catch {}
    }, 200);
    console.log('Univer 初始化成功');
  } catch (error) {
    console.error('Univer 初始化失败:', error);
    ElMessage.error('表格加载失败，请刷新重试');
  }
};

// 导入 Excel
const triggerImport = () => { fileInput.value?.click(); };
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

// 获取表格内全部单元格数据
const getUniverData = () => {
  try {
    if (!univerAPI) return [];
    const workbook = univerAPI.getActiveWorkbook();
    if (!workbook) return [];
    const sheet = workbook.getActiveSheet();
    if (!sheet) return [];
    const data = [];
    const rowCount = sheet.getRowCount() || 80;
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
  } catch { return []; }
};

// 保存
const handleSave = async () => {
  if (!univerAPI) { ElMessage.warning('表格未加载'); return; }
  saving.value = true;
  try {
    const data = getUniverData();
    const lrRows = [];
    // ★ 双表头占了第2、3行，明细从第4行开始（索引4）
    let startRow = 4;
    while (startRow < data.length) {
      const row = data[startRow];
      if (!row || !row[1]) break;
      // 碰到合计行或汇总区停止读取明细
      if (row[0] === '合计' || row[0] === '成色') break;
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
        stoneQty: Number(row[14]) || 0,
        stoneWeight: Number(row[15]) || 0,
        stonePrice: Number(row[16]) || 0,
        stoneAmount: Number(row[17]) || 0,
        stoneSettingFee: Number(row[18]) || 0,
        subStoneQty: Number(row[19]) || 0,
        subStoneWeight: Number(row[20]) || 0,
        subStonePrice: Number(row[21]) || 0,
        subStoneAmount: Number(row[22]) || 0,
        subStoneSettingFee: Number(row[23]) || 0,
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
  } finally { saving.value = false; }
};

// 导出Excel
const handleExport = async () => {
  try { await exportLr(lrId.value); ElMessage.success('导出成功'); }
  catch { ElMessage.error('导出失败'); }
};

onMounted(() => { loadData(); });
onBeforeUnmount(() => {
  if (univer) { univer.dispose(); univer = null; univerAPI = null; }
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
