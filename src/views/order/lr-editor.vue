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
        <el-tag v-if="isFinished" type="success" size="large">已确认</el-tag>
        <el-tag v-else-if="isAuditPending" type="warning" size="large">已提交</el-tag>
        <el-tag v-else type="info" size="large">起草</el-tag>
      </div>
      <div class="header-right">
        <el-tag size="small" type="info" effect="plain" style="margin-right:4px;">{{ userStore.userTypeName }}</el-tag>
        <el-button v-if="canEdit" type="primary" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon> 保存
        </el-button>
        <el-button v-if="canSubmitProduction" type="warning" @click="handleSubmitProduction" :loading="flowLoading">
          <el-icon><Upload /></el-icon> 提交
        </el-button>
        <template v-if="canAudit">
          <el-button type="success" @click="handleAudit(true)" :loading="flowLoading">
            <el-icon><Check /></el-icon> 确认
          </el-button>
          <el-button type="danger" @click="handleAudit(false)" :loading="flowLoading">驳回</el-button>
        </template>
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon> 导出Excel
        </el-button>
        <el-button v-if="canEdit" type="warning" @click="triggerImport">
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
            <el-tag :type="isFinished ? 'success' : isAuditPending ? 'warning' : 'info'" size="small">
              {{ isFinished ? '已确认' : isAuditPending ? '已提交' : '起草' }}
            </el-tag>
          </el-col>
        </el-row>
      </div>
      <div class="section-divider"></div>
      <!-- 明细表格 -->
      <div class="table-section">
        <div class="section-title">
          <span>📋 成本核对明细</span>
          <span class="section-subtitle">销售行（白底）只读 ｜ 成本行（蓝底）可编辑</span>
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
            >
            <el-table-column prop="serialNo" label="流水单号" width="100" align="center" />
            <el-table-column prop="seqDisplay" label="序号" width="55" align="center" />
            <el-table-column prop="productName" label="品名" min-width="110" align="center" />
            <el-table-column prop="customerName" label="客户" width="90" align="center" />
            <el-table-column prop="diamondLevel" label="钻石级别" width="85" align="center" />
            <el-table-column prop="color" label="颜色" width="60" align="center" />
            <el-table-column prop="quantity" label="件数" width="55" align="center" />
            <el-table-column prop="size" label="手寸/长度" width="85" align="center" />
            <el-table-column prop="totalWeight" label="总重" width="75" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.totalWeight" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.totalWeight || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="netWeight" label="净重" width="75" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.netWeight" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.netWeight || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="lossRate" label="损耗" width="65" align="center">
              <template #default="{ row }">
                <el-input
                  v-if="row.rowType === 'cost' && canEdit"
                  v-model.number="row.lossRate"
                  size="small"
                  class="cell-input"
                  @change="onCellChange(row)"
                />
                <span v-else>{{ row.lossRate || '-' }}</span>
              </template>
            </el-table-column>
            <!-- 加耗重 标红 -->
            <el-table-column prop="addLossWeight" label="加耗重" width="75" align="center" class-name="col-red">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.addLossWeight" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.addLossWeight || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="goldPrice" label="金价" width="70" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.goldPrice" size="small" class="cell-input" @input="onGoldPriceChange(row)" />
                <span v-else>{{ row.goldPrice || '-' }}</span>
              </template>
            </el-table-column>
            <!-- ⭐ 足金料：销售行只读、成本行可编辑 -->
            <el-table-column prop="goldMaterialFee" label="足金料" width="90" align="center">
              <template #default="{ row }">
                <el-input
                  v-if="row.rowType === 'cost' && canEdit"
                  v-model.number="row.goldMaterialFee"
                  size="small"
                  class="cell-input"
                  @change="onCellChange(row)"
                />
                <span v-else>{{ (row.goldMaterialFee || 0).toFixed(2) }}</span>
              </template>
            </el-table-column>

            <!-- ⭐ 折现金（只显示，不编辑） -->
            <el-table-column label="折现金" width="70" align="center">
              <template #default="{ row }">
                <template v-if="row.rowType === 'sale'">
                  <el-tag v-if="row.goldConvertCash" type="warning" size="small">是</el-tag>
                  <span v-else style="color:#909399;">否</span>
                </template>
              </template>
            </el-table-column>

            <!-- ===== 主石（列顺序：卡重 → 单价 → 粒数 → 镶石工费 → 金额） ===== -->
            <el-table-column label="主石" align="center">
              <el-table-column prop="stoneWeight" label="卡重" width="75" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.stoneWeight" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.stoneWeight || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="stonePrice" label="单价" width="75" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.stonePrice" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.stonePrice || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="stoneQty" label="粒数" width="55" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.stoneQty" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.stoneQty || 0 }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="stoneSettingFee" label="镶石工费" width="85" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.stoneSettingFee" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.stoneSettingFee || '-' }}</span>
                </template>
              </el-table-column>
              <!-- 主石金额 标红，只读 -->
              <el-table-column prop="stoneAmount" label="金额" width="90" align="center" class-name="col-red">
                <template #default="{ row }">
                  <span style="font-weight:bold;">{{ (row.stoneAmount || 0).toFixed(2) }}</span>
                </template>
              </el-table-column>
            </el-table-column>

            <!-- ===== 副石（列顺序：卡重 → 单价 → 粒数 → 镶石工费 → 金额） ===== -->
            <el-table-column label="副石" align="center">
              <el-table-column prop="subStoneWeight" label="卡重" width="65" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.subStoneWeight" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.subStoneWeight || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="subStonePrice" label="单价" width="75" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.subStonePrice" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.subStonePrice || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="subStoneQty" label="粒数" width="55" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.subStoneQty" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.subStoneQty || 0 }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="subStoneSettingFee" label="镶石工费" width="85" align="center">
                <template #default="{ row }">
                  <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.subStoneSettingFee" size="small" class="cell-input" @input="onCellChange(row)" />
                  <span v-else>{{ row.subStoneSettingFee || '-' }}</span>
                </template>
              </el-table-column>
              <!-- 副石金额 标红，只读 -->
              <el-table-column prop="subStoneAmount" label="金额" width="90" align="center" class-name="col-red">
                <template #default="{ row }">
                  <span style="font-weight:bold;">{{ (row.subStoneAmount || 0).toFixed(2) }}</span>
                </template>
              </el-table-column>
            </el-table-column>

            <el-table-column prop="packingFee" label="包装证书" width="80" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.packingFee" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.packingFee || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="moldFee" label="版费" width="65" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.moldFee" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.moldFee || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="laborFee" label="工费" width="65" align="center">
              <template #default="{ row }">
                <el-input v-if="row.rowType === 'cost' && canEdit" v-model.number="row.laborFee" size="small" class="cell-input" @input="onCellChange(row)" />
                <span v-else>{{ row.laborFee || '-' }}</span>
              </template>
            </el-table-column>
            <!-- 应收金额 标红 -->
            <el-table-column prop="totalAmount" label="应收金额" width="95" align="center" class-name="col-red">
              <template #default="{ row }">
                <span style="font-weight:bold;">{{ (row.totalAmount || 0).toFixed(2) }}</span>
              </template>
            </el-table-column>
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
      <!-- ===== 汇总统计（Excel式表格） ===== -->
      <div class="summary-section">
        <div class="section-title">📊 汇总统计</div>
        <!-- 第一部分：净重 + 加耗重（保留原有按成色表格） -->
        <div class="summary-table">
          <div class="summary-row header-row">
            <div class="summary-cell" style="width:70px;">成色</div>
            <div class="summary-cell">上单净重</div>
            <div class="summary-cell">本单净重</div>
            <div class="summary-cell highlight-header">累计净重</div>
            <div class="summary-cell">上单加耗重</div>
            <div class="summary-cell">本单加耗重</div>
            <div class="summary-cell highlight-header">累计加耗重</div>
          </div>
          <div class="summary-row" v-for="item in summaryWeightRows" :key="item.color">
            <div class="summary-cell" style="width:70px;font-weight:600;color:#409EFF;">{{ item.color }}</div>
            <div class="summary-cell">{{ item.prevNetWeight }}</div>
            <div class="summary-cell">{{ item.currNetWeight }}</div>
            <div class="summary-cell highlight-cell">{{ item.totalNetWeight }}</div>
            <div class="summary-cell">{{ item.prevAddLoss }}</div>
            <div class="summary-cell">{{ item.currAddLoss }}</div>
            <div class="summary-cell highlight-cell">{{ item.totalAddLoss }}</div>
          </div>
        </div>

        <!-- 第二部分：利润+收支 Excel原生表格 -->
        <table class="excel-summary-table">
          <tbody>
            <!-- 第1行：上单 -->
            <tr>
              <td class="label-cell">上单钻石利润：</td>
              <td class="value-cell">{{ prevSummary.diamondProfit }}</td>
              <td class="label-cell">上单金利润：</td>
              <td class="value-cell">{{ prevSummary.goldProfit }}</td>
              <td class="label-cell">上单镶石利润：</td>
              <td class="value-cell">{{ prevSummary.settingProfit }}</td>
              <td class="label-cell">上单工费利润：</td>
              <td class="value-cell">{{ prevSummary.laborProfit }}</td>
              <td class="label-cell">上单应收金额总利润：</td>
              <td class="value-cell">{{ prevSummary.totalProfit }}</td>
            </tr>
            <!-- 第2行：本单 -->
            <tr>
              <td class="label-cell">本单钻石利润：</td>
              <td class="value-cell" :class="getProfitClass(currSummary.diamondProfit)">{{ currSummary.diamondProfit.toFixed(2) }}</td>
              <td class="label-cell">本单金利润：</td>
              <td class="value-cell" :class="getProfitClass(currSummary.goldProfit)">{{ currSummary.goldProfit.toFixed(2) }}</td>
              <td class="label-cell">本单镶石利润：</td>
              <td class="value-cell" :class="getProfitClass(currSummary.settingProfit)">{{ currSummary.settingProfit.toFixed(2) }}</td>
              <td class="label-cell">本单工费利润：</td>
              <td class="value-cell" :class="getProfitClass(currSummary.laborProfit)">{{ currSummary.laborProfit.toFixed(2) }}</td>
              <td class="label-cell">本单应收金额总利润：</td>
              <td class="value-cell" :class="getProfitClass(currSummary.totalProfit)">{{ currSummary.totalProfit.toFixed(2) }}</td>
            </tr>
            <!-- 第3行：累计（蓝色字） -->
            <tr>
              <td class="label-cell blue-text">累计钻石利润：</td>
              <td class="value-cell blue-text" :class="getProfitClass(totalSummary.diamondProfit)">{{ totalSummary.diamondProfit.toFixed(2) }}</td>
              <td class="label-cell blue-text">累计金利润：</td>
              <td class="value-cell blue-text" :class="getProfitClass(totalSummary.goldProfit)">{{ totalSummary.goldProfit.toFixed(2) }}</td>
              <td class="label-cell blue-text">累计镶石利润：</td>
              <td class="value-cell blue-text" :class="getProfitClass(totalSummary.settingProfit)">{{ totalSummary.settingProfit.toFixed(2) }}</td>
              <td class="label-cell blue-text">累计工费利润：</td>
              <td class="value-cell blue-text" :class="getProfitClass(totalSummary.laborProfit)">{{ totalSummary.laborProfit.toFixed(2) }}</td>
              <td class="label-cell blue-text">累计应收金额利润：</td>
              <td class="value-cell blue-text" :class="getProfitClass(totalSummary.totalProfit)">{{ totalSummary.totalProfit.toFixed(2) }}</td>
            </tr>
            <!-- 第4行：上单每日收入/开支/出货件数 + 应收总金额（跨行2行） -->
            <tr>
              <td class="label-cell">上单每日收入：</td>
              <td class="value-cell">{{ prevSummary.dailyIncome }}</td>
              <td class="label-cell">上单每日开支：</td>
              <td class="value-cell">-</td>
              <td class="label-cell">上单出货件数：</td>
              <td class="value-cell">-</td>
              <td rowspan="2" class="label-cell red-text total-amount-cell">应收总金额：</td>
              <td rowspan="2" class="value-cell red-text total-amount-cell">¥{{ (summaryData.totalReceivable || 0).toFixed(2) }}</td>
            </tr>
            <!-- 第5行：本单每日收入/开支/出货件数 -->
            <tr>
              <td class="label-cell">本单每日收入：</td>
              <td class="value-cell">{{ (summaryData.totalReceivable || 0).toFixed(2) }}</td>
              <td class="label-cell">本单每日开支：</td>
              <td class="value-cell">{{ currSummary.dailyExpense }}</td>
              <td class="label-cell">本单出货件数：</td>
              <td class="value-cell">{{ currSummary.qty }}</td>
            </tr>
            <!-- 第6行：累计收入/开支/出货件数 + 支出平衡总金额 -->
            <tr>
              <td class="label-cell blue-text">累计收入：</td>
              <td class="value-cell blue-text">¥{{ totalSummary.dailyIncome.toFixed(2) }}</td>
              <td class="label-cell blue-text">累计开支：</td>
              <td class="value-cell blue-text">¥{{ totalSummary.dailyExpense.toFixed(2) }}</td>
              <td class="label-cell blue-text">累计出货件数：</td>
              <td class="value-cell blue-text">{{ totalSummary.qty }}</td>
              <td class="label-cell red-text">支出平衡总金额：</td>
              <td class="value-cell red-text">¥{{ totalSummary.balance.toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElLoading, ElMessageBox } from 'element-plus';
import { ArrowLeft, Check, Download, Upload } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getLrTable, saveLr, generateLr, exportLr, getLrCurrentNode, getLrNodeActions, executeLrAction, getLrSummary } from '@/api/lr';
import { getCustomerShangdan } from '@/api/inventoryMonthly';
import { dictApi } from '@/api/dict';
import * as XLSX from 'xlsx';

const route = useRoute();
const userStore = useUserStore();
const fileInput = ref(null);
const billId = ref(Number(route.params.billId));
const lrId = ref(0);
const lrInfo = ref(null);
const purityDict = ref([]);

const summaryData = ref({
  prevProfit: { diamondProfit: 0, goldProfit: 0, settingProfit: 0, laborProfit: 0, totalProfit: 0 },
  prevBillAmount: { income: 0, expense: 0, qty: 0 },
  todayProfit: { diamondProfit: 0, goldProfit: 0, settingProfit: 0, laborProfit: 0, totalProfit: 0 },
  todayBillAmount: { income: 0, expense: 0, qty: 0 },
  totalReceivable: 0,
  inoutIncome: 0,
  inoutExpense: 0,
});

const loadSummary = async () => {
  if (!billId.value) return;
  try {
    const res = await getLrSummary(billId.value);
    if (res?.data) {
      summaryData.value = res.data;
    }
  } catch (e) {
    console.error('加载汇总失败:', e);
  }
};

const loading = ref(false);
const saving = ref(false);
const flowLoading = ref(false);
const currentNode = ref(null);
const flowActions = ref([]);

const normalizedUserType = computed(() => String(userStore.userType || '').trim().replace(/[_-]/g, '').toLowerCase());
const isFactoryOrderUser = computed(() => normalizedUserType.value === 'factoryorder');
const isFactoryAuditUser = computed(() => ['factoryaudit', '工厂审核员'].includes(normalizedUserType.value));
const normalizedStatus = computed(() => lrInfo.value?.status || currentNode.value?.nodeKey || currentNode.value?.node_key || 'draft');
const isFinished = computed(() => ['completed', 'confirmed', 'finished'].includes(normalizedStatus.value));
const isAuditPending = computed(() => ['productionCompleted', 'production_completed', 'pendingAudit', 'auditPending', 'pending', 'submitted'].includes(normalizedStatus.value));
const canEdit = computed(() => (isFactoryOrderUser.value && !isFinished.value && !isAuditPending.value)
  || (isFactoryAuditUser.value && !isFinished.value));
const canSubmitProduction = computed(() => {
  if (!isFactoryOrderUser.value || isFinished.value || isAuditPending.value) return false;
  return flowActions.value.length === 0 || flowActions.value.some(action => isSubmitAction(action));
});
const canAudit = computed(() => {
  if (!isFactoryAuditUser.value || isFinished.value) return false;
  return isAuditPending.value || flowActions.value.some(action => isApproveAction(action));
});

const getActionKey = (action) => action?.actionKey || action?.action_key || action?.key || '';
const getActionName = (action) => action?.actionName || action?.action_name || '';
const isSubmitAction = (action) => /submit|提交/i.test(`${getActionKey(action)} ${getActionName(action)}`);
const isApproveAction = (action) => /approve|audit|confirm|通过|审核/i.test(`${getActionKey(action)} ${getActionName(action)}`) && !/reject|驳回/i.test(`${getActionKey(action)} ${getActionName(action)}`);
const findAction = (matcher, fallback) => flowActions.value.find(matcher) || { actionKey: fallback };

// ==================== 上单数据（从后端加载） ====================
const prevData = ref({
  summary: {
    totalSale: 0, totalCost: 0, totalProfit: 0,
    totalDiamondProfit: 0, totalGoldProfit: 0, totalSettingProfit: 0, totalLaborProfit: 0,
    totalNetWeight: 0, totalAddLossWeight: 0
  },
  details: []
});

// ==================== 数据 ====================
const saleRows = ref([]);
const costRows = ref([]);
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
const rowClassName = ({ row }) => row.rowType === 'sale' ? 'sale-row' : 'cost-row';
const headerCellStyle = {
  background: '#e8f0fe',
  color: '#1d2129',
  textAlign: 'center',
  fontWeight: '600',
  fontSize: '13px',
  borderBottom: '2px solid #c0d4f0'
};

// ==================== 核心：自动计算 ====================
// ⭐ 从 color 拿成色折算率
const getConvertRate = (row) => {
  const label = (row.color || '').trim();
  if (!label) return 1;
  const item = purityDict.value.find(x => x.itemLabel === label);
  if (!item) return 1;
  try {
    const extra = item.extraData ? JSON.parse(item.extraData) : {};
    if (extra.convertRate) return Number(extra.convertRate);
  } catch {}
  const rate = Number(item.itemValue);
  return isNaN(rate) || rate <= 0 ? 1 : rate;
};

const recalcRow = (row) => {
  if (!row) return;

  const goldPrice = Number(row.goldPrice) || 0;
  const netWeight = Number(row.netWeight) || 0;
  const lossRate = Number(row.lossRate) || 0;
  const convertRate = getConvertRate(row);

  // 加耗重 = 净重 × 损耗
  row.addLossWeight = +(netWeight * lossRate).toFixed(3);

  // 折足金料克重 = 加耗重 × 折算率
  row.goldMaterialWeight = +(row.addLossWeight * convertRate).toFixed(3);

  // ⭐ 金料金额
  if (row.rowType === 'sale') {
    // 销售行：自动算
    if (row.goldConvertCash) {
      // 折现金：加耗重 × 金价
      row.goldMaterialFee = +(row.addLossWeight * goldPrice).toFixed(2);
    } else {
      // 按克计料：克重 × 金价
      row.goldMaterialFee = +(row.goldMaterialWeight * goldPrice).toFixed(2);
    }
  }
  // 成本行：goldMaterialFee 不覆盖（用户手填）

  // 主石金额 = 卡重 × 单价 + 粒数 × 镶石工费
  const sw = Number(row.stoneWeight) || 0;
  const sp = Number(row.stonePrice) || 0;
  const sq = Number(row.stoneQty) || 0;
  const ssf = Number(row.stoneSettingFee) || 0;
  if (sw || sp || sq || ssf) {
    row.stoneAmount = +(sw * sp + sq * ssf).toFixed(2);
  }

  // 副石金额 = 卡重 × 单价 + 粒数 × 镶石工费
  const ssw = Number(row.subStoneWeight) || 0;
  const ssp = Number(row.subStonePrice) || 0;
  const ssq = Number(row.subStoneQty) || 0;
  const sssf = Number(row.subStoneSettingFee) || 0;
  if (ssw || ssp || ssq || sssf) {
    row.subStoneAmount = +(ssw * ssp + ssq * sssf).toFixed(2);
  }

  // 总金额
  if (row.rowType === 'sale') {
    // 销售行：折现金时才把金料金额计入
    const goldMaterial = row.goldConvertCash ? (row.goldMaterialFee || 0) : 0;
    row.totalAmount = +(
      goldMaterial +
      (row.stoneAmount || 0) +
      (row.subStoneAmount || 0) +
      (row.packingFee || 0) +
      (row.moldFee || 0) +
      (row.laborFee || 0)
    ).toFixed(2);
  } else {
    // 成本行：金料金额一定计入（用户手填的）
    row.totalAmount = +(
      (row.goldMaterialFee || 0) +
      (row.stoneAmount || 0) +
      (row.subStoneAmount || 0) +
      (row.packingFee || 0) +
      (row.moldFee || 0) +
      (row.laborFee || 0)
    ).toFixed(2);
  }
};

const syncRowToSource = (row) => {
  if (row.rowType === 'sale') {
    const idx = saleRows.value.findIndex(r => r.id === row.id);
    if (idx !== -1) saleRows.value.splice(idx, 1, { ...row });
  } else {
    let idx = costRows.value.findIndex(r => r.id === row.id && r.id !== null);
    if (idx === -1) idx = costRows.value.findIndex((r, i) => i === row._rowIndex && r.id === null);
    if (idx === -1 && row._rowIndex < costRows.value.length) idx = row._rowIndex;
    if (idx !== -1) costRows.value.splice(idx, 1, { ...row });
  }
};

const onCellChange = (row) => {
  recalcRow(row);
  syncRowToSource(row);
  nextTick();
};

// 主石/副石的单价、卡重、粒数、镶石工费都用 onCellChange（统一 recalcRow）
const onStonePriceChange = (row) => {
  recalcRow(row);
  syncRowToSource(row);
  nextTick();
};
const onSubStonePriceChange = (row) => {
  recalcRow(row);
  syncRowToSource(row);
  nextTick();
};
const onGoldPriceChange = (row) => {
  recalcRow(row);
  syncRowToSource(row);
  nextTick();
};

// ==================== 工具：按成色汇总销售行 ====================
const getSaleRowsByColor = () => {
  const saleList = displayRows.value.filter(r => r.rowType === 'sale');
  const colorMap = new Map();
  saleList.forEach(r => {
    const color = r.color || 'Au755';
    if (!colorMap.has(color)) colorMap.set(color, []);
    colorMap.get(color).push(r);
  });
  return colorMap;
};

// ==================== 第一部分：净重 + 加耗重（按成色） ====================
const summaryWeightRows = computed(() => {
  const colorMap = getSaleRowsByColor();
  const colors = Array.from(colorMap.keys()).sort();
  return colors.map(color => {
    const rows = colorMap.get(color);
    const currNetWeight = rows.reduce((sum, r) => sum + (Number(r.netWeight) || 0), 0);
    const currAddLoss = rows.reduce((sum, r) => sum + (Number(r.addLossWeight) || 0), 0);
    const prevDetail = prevData.value.details.find(d => d.color === color);
    const prevNetWeight = prevDetail?.netWeight ?? 0;
    const prevAddLoss = prevDetail?.addLossWeight ?? 0;
    return {
      color,
      prevNetWeight: prevNetWeight > 0 ? prevNetWeight.toFixed(3) : '-',
      currNetWeight: currNetWeight.toFixed(3),
      totalNetWeight: (prevNetWeight + currNetWeight).toFixed(3),
      prevAddLoss: prevAddLoss > 0 ? prevAddLoss.toFixed(3) : '-',
      currAddLoss: currAddLoss.toFixed(3),
      totalAddLoss: (prevAddLoss + currAddLoss).toFixed(3)
    };
  });
});

// ==================== 汇总（从后端拿） ====================
const prevSummary = computed(() => {
  const p = summaryData.value.prevProfit || {};
  const b = summaryData.value.prevBillAmount || {};
  return {
    diamondProfit: (p.diamondProfit || 0).toFixed(2),
    goldProfit: (p.goldProfit || 0).toFixed(2),
    settingProfit: (p.settingProfit || 0).toFixed(2),
    laborProfit: (p.laborProfit || 0).toFixed(2),
    totalProfit: (p.totalProfit || 0).toFixed(2),
    dailyIncome: (b.income || 0).toFixed(2),
    dailyExpense: (b.expense || 0).toFixed(2),
    qty: b.qty || 0,
  };
});

const currSummary = computed(() => {
  const p = summaryData.value.todayProfit || {};
  const b = summaryData.value.todayBillAmount || {};
  return {
    diamondProfit: p.diamondProfit || 0,
    goldProfit: p.goldProfit || 0,
    settingProfit: p.settingProfit || 0,
    laborProfit: p.laborProfit || 0,
    totalProfit: p.totalProfit || 0,
    totalAmount: b.income || 0,
    dailyExpense: (b.expense || 0).toFixed(2),
    qty: b.qty || 0,
  };
});

const totalSummary = computed(() => {
  const prev = summaryData.value.prevProfit || {};
  const curr = summaryData.value.todayProfit || {};
  const prevB = summaryData.value.prevBillAmount || {};
  const currB = summaryData.value.todayBillAmount || {};
  const balance = (summaryData.value.totalReceivable || 0)
    + (summaryData.value.inoutIncome || 0)
    - (summaryData.value.inoutExpense || 0);
  return {
    diamondProfit: (prev.diamondProfit || 0) + (curr.diamondProfit || 0),
    goldProfit: (prev.goldProfit || 0) + (curr.goldProfit || 0),
    settingProfit: (prev.settingProfit || 0) + (curr.settingProfit || 0),
    laborProfit: (prev.laborProfit || 0) + (curr.laborProfit || 0),
    totalProfit: (prev.totalProfit || 0) + (curr.totalProfit || 0),
    dailyIncome: (prevB.income || 0) + (currB.income || 0),
    dailyExpense: (prevB.expense || 0) + (currB.expense || 0),
    qty: (prevB.qty || 0) + (currB.qty || 0),
    balance,
  };
});

const getProfitClass = (value) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return num >= 0 ? 'profit-positive' : 'profit-negative';
};

// ==================== 加载上单数据 ====================
const loadPrevData = async () => {
  const customerId = lrInfo.value?.customerId;
  if (!customerId) return;
  const recordDate = lrInfo.value?.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];
  try {
    const res = await getCustomerShangdan(customerId, recordDate);
    if (res?.success && res?.data) {
      const d = res.data;
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
    await loadPrevData();
    await loadFlowState();
    await loadSummary();
  } catch (e) {
    console.error(e);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const loadFlowState = async () => {
  if (!lrId.value) return;
  try {
    const nodeRes = await getLrCurrentNode(lrId.value);
    currentNode.value = nodeRes?.data || null;
    const nodeKey = currentNode.value?.nodeKey || currentNode.value?.node_key;
    if (!nodeKey) { flowActions.value = []; return; }
    const actionRes = await getLrNodeActions(nodeKey);
    flowActions.value = actionRes?.data || [];
  } catch (e) {
    console.warn('加载LR流程状态失败:', e);
    flowActions.value = [];
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
  if (!canEdit.value) {
    ElMessage.warning(isFinished.value ? 'LR表已结束，不能修改' : '当前状态不允许编辑');
    return;
  }
  saving.value = true;
  try {
    displayRows.value.forEach(r => recalcRow(r));

    const cleanRows = (rows) => {
      return rows.map(row => {
        const cleaned = { ...row };
        const numberFields = [
          'quantity', 'totalWeight', 'netWeight', 'lossRate', 'addLossWeight',
          'goldPrice', 'goldMaterialFee', 'stoneQty', 'stoneWeight', 'stonePrice',
          'stoneAmount', 'stoneSettingFee', 'subStoneQty', 'subStoneWeight',
          'subStonePrice', 'subStoneAmount', 'subStoneSettingFee', 'packingFee',
          'moldFee', 'laborFee', 'totalAmount'
        ];
        numberFields.forEach(f => {
          const val = cleaned[f];
          if (val === undefined || val === null || val === '') {
            cleaned[f] = 0;
          } else if (typeof val === 'string') {
            cleaned[f] = parseFloat(val) || 0;
          }
          cleaned[f] = Number(cleaned[f]);
        });
        return cleaned;
      });
    };
    const allRows = [
      ...cleanRows(saleRows.value.map(r => ({ ...r, rowType: 'sale' }))),
      ...cleanRows(costRows.value.map(r => ({ ...r, rowType: 'cost' })))
    ];
    await saveLr({ lrId: lrId.value, rows: allRows });
    ElMessage.success('保存成功');
  } catch (e) {
    console.error(e);
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

const executeFlowAction = async (action, remark = '') => {
  const actionKey = getActionKey(action);
  if (!actionKey || !lrId.value) return;
  flowLoading.value = true;
  try {
    await executeLrAction({ businessId: lrId.value, actionKey, remark });
    ElMessage.success(actionKey === 'confirm' || actionKey === 'approve' ? '确认成功，LR表流程结束' : '提交成功');
    await loadData();
  } catch (e) {
    ElMessage.error(e.message || '流程操作失败');
  } finally {
    flowLoading.value = false;
  }
};

const handleSubmitProduction = async () => {
  await ElMessageBox.confirm('确认提交LR表吗？提交后工厂业务员将不能继续编辑。', '提交确认', { type: 'warning' });
  await executeFlowAction(findAction(isSubmitAction, 'submit'), 'LR表已提交');
};

const handleAudit = async (passed) => {
  if (!passed) {
    await ElMessageBox.prompt('请输入驳回原因', '驳回LR表', {
      inputPlaceholder: '驳回时必须填写原因',
      inputValidator: value => value?.trim() ? true : '请输入驳回原因'
    }).then(({ value }) => executeFlowAction({ actionKey: 'reject' }, value.trim()));
    return;
  }
  await ElMessageBox.confirm('确认通过吗？确认后LR表流程将结束且不可修改。', '确认', { type: 'warning' });
  await executeFlowAction(findAction(isApproveAction, 'confirm'), '审核确认通过');
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
          stoneWeight: Number(r[15]) || 0,
          stonePrice: Number(r[16]) || 0,
          stoneQty: Number(r[17]) || 0,
          stoneSettingFee: Number(r[18]) || 0,
          stoneAmount: Number(r[19]) || 0,
          subStoneWeight: Number(r[20]) || 0,
          subStonePrice: Number(r[21]) || 0,
          subStoneQty: Number(r[22]) || 0,
          subStoneSettingFee: Number(r[23]) || 0,
          subStoneAmount: Number(r[24]) || 0,
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
  const loadingInstance = ElLoading.service({
    fullscreen: true, text: '正在导出...', background: 'rgba(0, 0, 0, 0.7)'
  });
  try {
    const response = await exportLr(lrId.value);
    loadingInstance.close();
    const blob = await response.blob();
    if (!blob || blob.size === 0) { ElMessage.error('导出失败：文件为空'); return; }
    if (blob.type === 'application/json') {
      const text = await blob.text();
      try {
        const json = JSON.parse(text);
        ElMessage.error(json.message || '导出失败');
        return;
      } catch {}
    }
    const contentDisposition = response.headers.get('content-disposition');
    let fileName = `支出收入LR表_${lrInfo.value?.billNo || lrId.value}.xlsx`;
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
    setTimeout(() => { window.URL.revokeObjectURL(url); }, 10000);
    ElMessage.success('导出成功');
  } catch (error) {
    loadingInstance.close();
    console.error('导出失败:', error);
    ElMessage.error(error.message || '导出失败，请重试');
  }
};

watch(displayRows, () => {}, { deep: true });

onMounted(async () => {
  // ⭐ 加载成色字典（用于折算率）
  try {
    const res = await dictApi.getItemsByKey('purity');
    purityDict.value = res?.data || [];
  } catch {}

  loadData();
});
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0; flex-wrap: wrap; gap: 10px; }
.header-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; flex-wrap: wrap; }
.content-body { background: #fff; border-radius: 0 0 8px 8px; padding: 16px 20px; }
.info-bar { padding: 6px 0; }
.info-bar .label { color: #909399; font-size: 13px; }
.info-bar .value { color: #303133; font-size: 14px; font-weight: 500; }
.section-divider { height: 1px; background: #e8ecf1; margin: 14px 0; }
.section-title { display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 15px; color: #1d2129; margin-bottom: 12px; }
.section-subtitle { font-weight: 400; font-size: 12px; color: #909399; }
.table-wrapper { overflow-x: auto; }
:deep(.el-table .cell) { padding: 2px 4px; text-align: center !important; }
:deep(.el-table th) { background: #e8f0fe !important; color: #1d2129 !important; font-weight: 600 !important; }
:deep(.el-table th .cell) { color: #1d2129 !important; text-align: center !important; }
:deep(.cell-input .el-input__wrapper) { padding: 0 2px; box-shadow: none; }
:deep(.cell-input .el-input__inner) { text-align: center; font-size: 12px; }
:deep(.sale-row) { background: #ffffff !important; }
:deep(.sale-row:hover) { background: #fafafa !important; }
:deep(.cost-row) { background: #e8f0fe !important; }
:deep(.cost-row:hover) { background: #d9e4f8 !important; }
:deep(.col-red .cell) { color: #f56c6c !important; font-weight: 600; }
:deep(.el-input-number) { width: 100%; }

.summary-section { margin-top: 4px; }
.summary-table { border: 1px solid #e8ecf1; border-radius: 4px; overflow: hidden; margin-bottom: 16px; }
.summary-row { display: flex; border-bottom: 1px solid #e8ecf1; }
.summary-row:last-child { border-bottom: none; }
.summary-cell { flex: 1; padding: 6px 4px; text-align: center; font-size: 12px; border-right: 1px solid #e8ecf1; min-width: 60px; }
.summary-cell:last-child { border-right: none; }
.header-row .summary-cell { background: #f5f7fa; font-weight: 600; color: #606266; }
.highlight-cell { background: #fff3cd; font-weight: 600; }
.highlight-header { background: #f5f7fa; font-weight: 600; color: #303133; }

.excel-summary-table { width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 14px; }
.excel-summary-table td { border: 1px solid #000; padding: 6px 10px; vertical-align: middle; }
.label-cell { background: #fff; font-weight: 500; text-align: right; white-space: nowrap; }
.value-cell { background: #fff; text-align: right; min-width: 100px; font-family: 'Consolas', monospace; }
.blue-text { color: #409EFF; font-weight: 600; }
.red-text { color: #f56c6c; font-weight: 600; }
.total-amount-cell { text-align: center !important; font-size: 16px; }
.profit-positive { color: #f56c6c; }
.profit-negative { color: #909399; }

@media (max-width: 768px) {
  .page-container { padding: 8px; }
  .content-body { padding: 10px 12px; }
  .page-header { padding: 10px 14px; }
  .excel-summary-table { font-size: 12px; }
  .excel-summary-table td { padding: 4px 6px; }
}
</style>