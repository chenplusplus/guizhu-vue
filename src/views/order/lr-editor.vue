<!-- src/views/order/lr-editor.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📊 成本核对</h2>
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

    <!-- ===== 整体内容 ===== -->
    <div class="content-body">
      <!-- 账单信息 -->
      <div class="info-bar">
        <el-row :gutter="16">
          <el-col :xs="12" :sm="6"><span class="label">账单编号：</span><span class="value">{{ lrInfo?.billNo || '-' }}</span></el-col>
          <el-col :xs="12" :sm="6"><span class="label">客户：</span><span class="value">{{ lrInfo?.customerName || '-' }}</span></el-col>
          <el-col :xs="12" :sm="6"><span class="label">成色：</span><span class="value">{{ lrInfo?.color || 'Au755' }}</span></el-col>
          <el-col :xs="12" :sm="6"><span class="label">状态：</span>
            <el-tag :type="lrInfo?.status === 'confirmed' ? 'success' : 'warning'" size="small">
              {{ lrInfo?.status === 'confirmed' ? '已确认' : '编辑中' }}
            </el-tag>
          </el-col>
        </el-row>
      </div>

      <div class="section-divider"></div>

      <!-- 明细表格 -->
      <div class="table-section">
        <div class="section-title">
          <span>📋 成本核对明细</span>
          <span class="section-subtitle">销售行（浅蓝）只读 ｜ 成本行（浅灰）可编辑</span>
        </div>

        <div class="table-wrapper">
          <el-table
            :data="displayRows"
            border
            size="small"
            style="width:100%;"
            :row-class-name="rowClassName"
            :header-cell-style="headerCellStyle"
            max-height="550"
            @cell-edit="handleCellEdit"
          >
            <!-- 基础列 - 全部居中 -->
            <el-table-column prop="serialNo" label="流水单号" width="100" align="center" />
            <el-table-column prop="seqDisplay" label="序号" width="55" align="center" />
            <el-table-column prop="productName" label="品名" min-width="110" align="center" />
            <el-table-column prop="customerName" label="客户" width="90" align="center" />
            <el-table-column prop="diamondLevel" label="钻石级别" width="85" align="center" />
            <el-table-column prop="color" label="颜色" width="60" align="center" />
            <el-table-column prop="quantity" label="件数" width="55" align="center" />
            <el-table-column prop="size" label="手寸/长度" width="85" align="center" />

            <!-- 工厂数据列 - 全部居中 -->
            <el-table-column prop="totalWeight" label="总重" width="75" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost'" v-model.number="row.totalWeight" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.totalWeight || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="netWeight" label="净重" width="75" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost'" v-model.number="row.netWeight" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.netWeight || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="lossRate" label="损耗" width="65" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost'" v-model.number="row.lossRate" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.lossRate || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="addLossWeight" label="加耗重" width="75" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost'" v-model.number="row.addLossWeight" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.addLossWeight || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="goldPrice" label="金价" width="70" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost'" v-model.number="row.goldPrice" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.goldPrice || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="goldMaterialFee" label="足金料" width="80" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost'" v-model.number="row.goldMaterialFee" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.goldMaterialFee || '-' }}</span>
              </template>
            </el-table-column>

            <!-- 主石 - 全部居中 -->
            <el-table-column label="主石" align="center">
              <el-table-column prop="stoneQty" label="粒数" width="50" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost'" v-model.number="row.stoneQty" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.stoneQty || 0 }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="stoneWeight" label="石重(ct)" width="75" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost'" v-model.number="row.stoneWeight" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.stoneWeight || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="stonePrice" label="单价(元)" width="75" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost'" v-model.number="row.stonePrice" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.stonePrice || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="stoneAmount" label="金额(元)" width="85" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost'" v-model.number="row.stoneAmount" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.stoneAmount || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="stoneSettingFee" label="镶石工费" width="80" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost'" v-model.number="row.stoneSettingFee" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.stoneSettingFee || '-' }}</span>
                </template>
              </el-table-column>
            </el-table-column>

            <!-- 副石 - 全部居中 -->
            <el-table-column label="副石" align="center">
              <el-table-column prop="subStoneQty" label="粒数" width="50" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost'" v-model.number="row.subStoneQty" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.subStoneQty || 0 }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="subStoneWeight" label="石重" width="65" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost'" v-model.number="row.subStoneWeight" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.subStoneWeight || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="subStonePrice" label="单价(元)" width="75" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost'" v-model.number="row.subStonePrice" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.subStonePrice || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="subStoneAmount" label="金额(元)" width="85" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost'" v-model.number="row.subStoneAmount" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.subStoneAmount || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="subStoneSettingFee" label="镶石工费" width="80" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost'" v-model.number="row.subStoneSettingFee" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.subStoneSettingFee || '-' }}</span>
                </template>
              </el-table-column>
            </el-table-column>

            <!-- 尾部 - 全部居中 -->
            <el-table-column prop="packingFee" label="包装证书" width="80" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost'" v-model.number="row.packingFee" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.packingFee || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="moldFee" label="版费" width="65" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost'" v-model.number="row.moldFee" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.moldFee || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="laborFee" label="工费" width="65" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost'" v-model.number="row.laborFee" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.laborFee || '-' }}</span>
              </template>
            </el-table-column>

            <el-table-column prop="totalAmount" label="应收金额" width="95" align="center">
              <template #default="{ row }">
                <span style="color:#E6A23C;font-weight:bold;">{{ (row.totalAmount || 0).toFixed(2) }}</span>
              </template>
            </el-table-column>

            <!-- 操作 -->
            <el-table-column label="操作" width="55" align="center" fixed="right">
              <template #default="{ row }">
                <el-tag v-if="row.rowType === 'sale'" type="info" size="small">只读</el-tag>
                <el-tag v-else type="warning" size="small">编辑</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- ===== 汇总统计（按成色）- 自动更新 ===== -->
      <div class="summary-section">
        <div class="section-title">📊 汇总统计（按成色）</div>
        <el-table :data="summaryRows" border size="small" :header-cell-style="headerCellStyle" style="width:100%;">
          <el-table-column prop="color" label="成色" width="70" align="center" />
          <el-table-column prop="prevNetWeight" label="上单净重" width="100" align="center" />
          <el-table-column prop="currNetWeight" label="本单净重" width="100" align="center" />
          <el-table-column prop="totalNetWeight" label="累计净重" width="100" align="center">
            <template #default="{ row }"><span class="highlight-cell">{{ row.totalNetWeight }}</span></template>
          </el-table-column>
          <el-table-column prop="prevAddLoss" label="上单加耗重" width="110" align="center" />
          <el-table-column prop="currAddLoss" label="本单加耗重" width="110" align="center" />
          <el-table-column prop="totalAddLoss" label="累计加耗重" width="110" align="center">
            <template #default="{ row }"><span class="highlight-cell">{{ row.totalAddLoss }}</span></template>
          </el-table-column>
          <el-table-column label="钻石利润" align="center">
            <el-table-column prop="prevDiamondProfit" label="上单" width="85" align="center" />
            <el-table-column prop="currDiamondProfit" label="本单" width="85" align="center" />
            <el-table-column prop="totalDiamondProfit" label="累计" width="85" align="center" />
          </el-table-column>
          <el-table-column label="镶石利润" align="center">
            <el-table-column prop="prevSettingProfit" label="上单" width="85" align="center" />
            <el-table-column prop="currSettingProfit" label="本单" width="85" align="center" />
            <el-table-column prop="totalSettingProfit" label="累计" width="85" align="center" />
          </el-table-column>
          <el-table-column label="工费利润" align="center">
            <el-table-column prop="prevLaborProfit" label="上单" width="85" align="center" />
            <el-table-column prop="currLaborProfit" label="本单" width="85" align="center" />
            <el-table-column prop="totalLaborProfit" label="累计" width="85" align="center" />
          </el-table-column>
          <el-table-column label="应收总利润" align="center">
            <el-table-column prop="prevTotalProfit" label="上单" width="95" align="center" />
            <el-table-column prop="currTotalProfit" label="本单" width="95" align="center" />
            <el-table-column prop="totalTotalProfit" label="累计" width="95" align="center" />
          </el-table-column>
        </el-table>
      </div>

      <div class="section-divider"></div>

      <!-- 底部统计 -->
      <div class="bottom-stats">
        <div class="stats-row">
          <span>上单每日收入：<b>{{ bottomStats.prevIncome || '-' }}</b></span>
          <span>本单每日开支：<b>{{ bottomStats.currExpense || '-' }}</b></span>
          <span>本单出货件数：<b>{{ bottomStats.currQty }}</b></span>
          <span style="color:#F56C6C;">应收总金额：<b>¥{{ bottomStats.totalAmount.toFixed(2) }}</b></span>
        </div>
        <div class="stats-row">
          <span>累计收入：<b>{{ bottomStats.totalIncome || '-' }}</b></span>
          <span>累计开支：<b>{{ bottomStats.totalExpense || '-' }}</b></span>
          <span>累计出货件数：<b>{{ bottomStats.totalQty }}</b></span>
          <span style="color:#F56C6C;">支出平衡总金额：<b>¥{{ bottomStats.balance.toFixed(2) }}</b></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage,ElLoading } from 'element-plus';
import { ArrowLeft, Check, Download, Upload } from '@element-plus/icons-vue';
import { getLrTable, saveLr, generateLr, exportLr } from '@/api/lr';
import * as XLSX from 'xlsx';

const route = useRoute();
const fileInput = ref(null);
const billId = ref(Number(route.params.billId));
const lrId = ref(0);
const lrInfo = ref(null);
const loading = ref(false);
const saving = ref(false);

// ==================== 数据 ====================
const saleRows = ref([]);
const costRows = ref([]);

// 显示行（销售行 + 成本行交替）
const displayRows = computed(() => {
  const result = [];
  const maxLen = Math.max(saleRows.value.length, costRows.value.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < saleRows.value.length) {
      result.push({ ...saleRows.value[i], rowType: 'sale', _rowIndex: i });
    }
    if (i < costRows.value.length) {
      result.push({ ...costRows.value[i], rowType: 'cost', _rowIndex: i, _saleRowId: saleRows.value[i]?.id || null });
    }
  }
  return result;
});

// ==================== 行样式 ====================
const rowClassName = ({ row }) => {
  return row.rowType === 'sale' ? 'sale-row' : 'cost-row';
};

const headerCellStyle = {
  background: '#e8f0fe',
  color: '#1d2129',
  textAlign: 'center',
  fontWeight: '600',
  fontSize: '13px',
  borderBottom: '2px solid #c0d4f0'
};

// ==================== ⭐ 核心：自动计算 ====================
const recalcRow = (row) => {
  if (!row) return;

  // 1. 加耗重 = 净重 × 损耗
  if (row.netWeight && row.lossRate) {
    row.addLossWeight = +(row.netWeight * row.lossRate).toFixed(3);
  }

  // 2. 足金料 = 加耗重 × 金价
  if (row.addLossWeight && row.goldPrice) {
    row.goldMaterialFee = +(row.addLossWeight * row.goldPrice).toFixed(2);
  }

  // 3. 主石金额 = 粒数 × 石重 × 单价
  if (row.stoneQty && row.stoneWeight && row.stonePrice) {
    row.stoneAmount = +(row.stoneQty * row.stoneWeight * row.stonePrice).toFixed(2);
  }

  // 4. 副石金额 = 粒数 × 石重 × 单价
  if (row.subStoneQty && row.subStoneWeight && row.subStonePrice) {
    row.subStoneAmount = +(row.subStoneQty * row.subStoneWeight * row.subStonePrice).toFixed(2);
  }

  // 5. 应收金额 = 足金料 + 主石金额 + 主石镶石工费 + 副石金额 + 副石镶石工费 + 包装证书 + 版费 + 工费
  row.totalAmount = +(
    (row.goldMaterialFee || 0) +
    (row.stoneAmount || 0) +
    (row.stoneSettingFee || 0) +
    (row.subStoneAmount || 0) +
    (row.subStoneSettingFee || 0) +
    (row.packingFee || 0) +
    (row.moldFee || 0) +
    (row.laborFee || 0)
  ).toFixed(2);
};

// ==================== 单元格变化触发重算 ====================
const onCellChange = (row) => {
  recalcRow(row);
  // ⭐ 触发汇总表更新（通过重新计算 computed）
  // summaryRows 会自动更新
};

// ==================== 从数据中动态读取成色 ====================
const colorList = computed(() => {
  const colors = new Set();
  displayRows.value.forEach(r => {
    if (r.color) colors.add(r.color);
  });
  return Array.from(colors).sort();
});

// ==================== ⭐ 汇总统计（自动计算） ====================
const summaryRows = computed(() => {
  return colorList.value.map(color => {
    const rows = displayRows.value.filter(r => (r.color || '') === color);
    const saleRows_ = rows.filter(r => r.rowType === 'sale');
    const costRows_ = rows.filter(r => r.rowType === 'cost');

    // 销售行汇总
    const saleSum = (prop) => saleRows_.reduce((s, r) => s + (Number(r[prop]) || 0), 0);
    // 成本行汇总
    const costSum = (prop) => costRows_.reduce((s, r) => s + (Number(r[prop]) || 0), 0);
    // 利润 = 销售 - 成本
    const diff = (prop) => saleSum(prop) - costSum(prop);

    // ⭐ 钻石利润 = 主石金额 + 副石金额 的销售-成本差
    const diamondProfit = diff('stoneAmount') + diff('subStoneAmount');
    // ⭐ 镶石利润 = 主石镶石工费 + 副石镶石工费 的销售-成本差
    const settingProfit = diff('stoneSettingFee') + diff('subStoneSettingFee');
    // ⭐ 工费利润 = 工费 的销售-成本差
    const laborProfit = diff('laborFee');
    // ⭐ 总利润 = 应收金额 的销售-成本差
    const totalProfit = diff('totalAmount');

    return {
      color,
      prevNetWeight: '-',
      currNetWeight: saleSum('netWeight').toFixed(3),
      totalNetWeight: saleSum('netWeight').toFixed(3),
      prevAddLoss: '-',
      currAddLoss: saleSum('addLossWeight').toFixed(3),
      totalAddLoss: saleSum('addLossWeight').toFixed(3),
      prevDiamondProfit: '-',
      currDiamondProfit: diamondProfit.toFixed(2),
      totalDiamondProfit: diamondProfit.toFixed(2),
      prevSettingProfit: '-',
      currSettingProfit: settingProfit.toFixed(2),
      totalSettingProfit: settingProfit.toFixed(2),
      prevLaborProfit: '-',
      currLaborProfit: laborProfit.toFixed(2),
      totalLaborProfit: laborProfit.toFixed(2),
      prevTotalProfit: '-',
      currTotalProfit: totalProfit.toFixed(2),
      totalTotalProfit: totalProfit.toFixed(2)
    };
  });
});

// ==================== 底部统计 ====================
const bottomStats = computed(() => {
  const saleSum = (prop) => displayRows.value.filter(r => r.rowType === 'sale').reduce((s, r) => s + (Number(r[prop]) || 0), 0);
  const costSum = (prop) => displayRows.value.filter(r => r.rowType === 'cost').reduce((s, r) => s + (Number(r[prop]) || 0), 0);
  const qty = displayRows.value.filter(r => r.rowType === 'sale').reduce((s, r) => s + (Number(r.quantity) || 1), 0);
  return {
    prevIncome: '-',
    currExpense: '-',
    currQty: qty,
    totalAmount: saleSum('totalAmount'),
    totalIncome: '-',
    totalExpense: '-',
    totalQty: qty,
    balance: saleSum('totalAmount') - costSum('totalAmount')
  };
});

// ==================== 加载数据 ====================
const loadData = async () => {
  loading.value = true;
  try {
    const res = await getLrTable(billId.value);
    if (res?.data) {
      lrInfo.value = res.data;
      lrId.value = res.data.id;
      if (res.data.rows && res.data.rows.length > 0) {
        saleRows.value = res.data.rows.filter(r => r.rowType === 'sale').map(r => ({ ...r }));
        costRows.value = res.data.rows.filter(r => r.rowType === 'cost').map(r => ({ ...r }));
        while (costRows.value.length < saleRows.value.length) {
          const idx = costRows.value.length;
          costRows.value.push({ ...saleRows.value[idx], rowType: 'cost', id: null });
        }
        displayRows.value.forEach(r => recalcRow(r));
      } else {
        await generateLrTable();
      }
    } else {
      await generateLrTable();
    }
  } catch (e) {
    console.error(e);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const generateLrTable = async () => {
  try {
    const res = await generateLr({ billId: billId.value });
    if (res.success) {
      lrId.value = res.lrId;
      const dataRes = await getLrTable(billId.value);
      if (dataRes?.data) {
        lrInfo.value = dataRes.data;
        lrId.value = dataRes.data.id;
        if (dataRes.data.rows?.length) {
          saleRows.value = dataRes.data.rows.filter(r => r.rowType === 'sale');
          costRows.value = dataRes.data.rows.filter(r => r.rowType === 'cost');
          while (costRows.value.length < saleRows.value.length) {
            const idx = costRows.value.length;
            costRows.value.push({ ...saleRows.value[idx], rowType: 'cost', id: null });
          }
          displayRows.value.forEach(r => recalcRow(r));
        }
      }
    }
  } catch (e) {
    ElMessage.error('生成LR表失败');
  }
};

// ==================== 保存 ====================
const handleSave = async () => {
  saving.value = true;
  try {
    displayRows.value.forEach(r => recalcRow(r));
    const allRows = [
      ...saleRows.value.map(r => ({ ...r, rowType: 'sale' })),
      ...costRows.value.map(r => ({ ...r, rowType: 'cost' }))
    ];
    await saveLr({
      lrId: lrId.value,
      rows: allRows
    });
    ElMessage.success('保存成功');
  } catch (e) {
    console.error(e);
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

// ==================== 导入导出 ====================
const triggerImport = () => fileInput.value?.click();

const handleFileImport = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const detailRows = json.slice(4).filter(r => r[1]);
      const newSaleRows = [];
      const newCostRows = [];
      detailRows.forEach((r, idx) => {
        const baseRow = {
          serialNo: r[0] || '',
          seqDisplay: r[1] || (idx + 1),
          productName: r[2] || '',
          customerName: r[3] || '',
          diamondLevel: r[4] || '',
          color: r[5] || '',
          quantity: Number(r[6]) || 1,
          size: r[7] || '',
          totalWeight: Number(r[8]) || 0,
          netWeight: Number(r[9]) || 0,
          lossRate: Number(r[10]) || 0,
          addLossWeight: Number(r[11]) || 0,
          goldPrice: Number(r[12]) || 0,
          goldMaterialFee: Number(r[13]) || 0,
          stoneQty: Number(r[15]) || 0,
          stoneWeight: Number(r[16]) || 0,
          stonePrice: Number(r[17]) || 0,
          stoneAmount: Number(r[18]) || 0,
          stoneSettingFee: Number(r[19]) || 0,
          subStoneQty: Number(r[20]) || 0,
          subStoneWeight: Number(r[21]) || 0,
          subStonePrice: Number(r[22]) || 0,
          subStoneAmount: Number(r[23]) || 0,
          subStoneSettingFee: Number(r[24]) || 0,
          packingFee: Number(r[25]) || 0,
          moldFee: Number(r[26]) || 0,
          laborFee: Number(r[27]) || 0,
          totalAmount: Number(r[28]) || 0
        };
        newSaleRows.push({ ...baseRow, rowType: 'sale' });
        newCostRows.push({ ...baseRow, rowType: 'cost' });
      });
      saleRows.value = newSaleRows;
      costRows.value = newCostRows;
      displayRows.value.forEach(r => recalcRow(r));
      ElMessage.success(`导入成功，共${saleRows.value.length}行`);
    } catch (err) {
      console.error(err);
      ElMessage.error('导入失败');
    }
  };
  reader.readAsArrayBuffer(file);
  event.target.value = '';
};

const handleExport = async () => {
  if (!lrId.value) {
    ElMessage.warning('LR表ID无效');
    return;
  }

  const loading = ElLoading.service({
    fullscreen: true,
    text: '正在导出...',
    background: 'rgba(0, 0, 0, 0.7)'
  });

  try {
    const response = await exportLr(lrId.value);
    loading.close();

    const blob = await response.blob();
    
    if (!blob || blob.size === 0) {
      ElMessage.error('导出失败：文件为空');
      return;
    }

    // 检查是否是 JSON 错误
    if (blob.type === 'application/json') {
      const text = await blob.text();
      try {
        const json = JSON.parse(text);
        ElMessage.error(json.message || '导出失败');
        return;
      } catch {
        // 不是 JSON，继续下载
      }
    }

    // 获取文件名
    const contentDisposition = response.headers.get('content-disposition');
    let fileName = `支出收入LR表_${lrInfo.value?.billNo || lrId.value}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) {
        fileName = decodeURIComponent(match[1].replace(/['"]/g, ''));
      }
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 10000);
    
    ElMessage.success('导出成功');
  } catch (error) {
    loading.close();
    console.error('导出失败:', error);
    ElMessage.error(error.message || '导出失败，请重试');
  }
};

onMounted(() => loadData());
</script>

<style scoped>
.page-container {
  background: #f5f7fa;
  padding: 16px;
  min-height: 100vh;
}

/* ===== 页面头部 ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 14px 20px;
  border-radius: 8px 8px 0 0;
  flex-wrap: wrap;
  gap: 10px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.header-left h2 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}
.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ===== 整体内容 ===== */
.content-body {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 16px 20px;
}

/* ===== 信息栏 ===== */
.info-bar {
  padding: 6px 0;
}
.info-bar .label {
  color: #909399;
  font-size: 13px;
}
.info-bar .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

/* ===== 分割线 ===== */
.section-divider {
  height: 1px;
  background: #e8ecf1;
  margin: 14px 0;
}

/* ===== 区域标题 ===== */
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 15px;
  color: #1d2129;
  margin-bottom: 12px;
}
.section-subtitle {
  font-weight: 400;
  font-size: 12px;
  color: #909399;
}

/* ===== 表格 ===== */
.table-wrapper {
  overflow-x: auto;
}
:deep(.el-table .cell) {
  padding: 2px 4px;
  text-align: center !important;
}
:deep(.el-table th) {
  background: #e8f0fe !important;
  color: #1d2129 !important;
  font-weight: 600 !important;
}
:deep(.el-table th .cell) {
  color: #1d2129 !important;
  text-align: center !important;
}
:deep(.cell-input .el-input__wrapper) {
  padding: 0 2px;
  box-shadow: none;
}
:deep(.cell-input .el-input__inner) {
  text-align: center;
  font-size: 12px;
}
:deep(.sale-row) {
  background: #f0f7ff !important;
}
:deep(.sale-row:hover) {
  background: #e3f0fa !important;
}
:deep(.cost-row) {
  background: #f8f8f8 !important;
}
:deep(.cost-row:hover) {
  background: #efefef !important;
}
:deep(.el-input-number) {
  width: 100%;
}

/* ===== 高亮单元格 ===== */
.highlight-cell {
  display: inline-block;
  width: 100%;
  background: #ffdd00;
  padding: 2px 0;
  font-weight: 600;
}

/* ===== 底部统计 ===== */
.bottom-stats {
  padding: 8px 0;
}
.stats-row {
  display: flex;
  justify-content: space-around;
  padding: 4px 0;
  font-size: 13px;
  flex-wrap: wrap;
  gap: 8px;
}
.stats-row b {
  color: #303133;
}
.stats-row span {
  color: #606266;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .page-container {
    padding: 8px;
  }
  .content-body {
    padding: 10px 12px;
  }
  .page-header {
    padding: 10px 14px;
  }
  .stats-row {
    justify-content: flex-start;
    gap: 12px;
  }
}
</style>