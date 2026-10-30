<template>
  <div class="page-container op-report" v-loading="loading">
    <div class="page-header">
      <div>
        <el-button @click="$router.back()">返回</el-button>
        <h2>📊 月度经营报表</h2>
        <el-tag size="small">{{ periodLabel }}</el-tag>
      </div>
      <div>
        <el-button icon="Notebook" @click="$router.push('/inventory/monthly-list')">盘点核算</el-button>
        <el-button type="primary" icon="Download" @click="handleExport">导出月报表</el-button>
        <el-button icon="Refresh" @click="loadReport">刷新</el-button>
      </div>
    </div>

    <!-- 筛选栏：时间维度（月/年/全部）+ 客户多选（默认全部） -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-radio-group v-model="filter.periodType" @change="loadReport">
          <el-radio-button label="month">按月</el-radio-button>
          <el-radio-button label="year">按年</el-radio-button>
          <el-radio-button label="all">全部</el-radio-button>
        </el-radio-group>

        <el-date-picker v-if="filter.periodType === 'month'" v-model="filter.yearMonth" type="month"
          format="YYYY-MM" value-format="YYYY-MM" placeholder="选择月份" style="width:140px" @change="loadReport" />
        <el-date-picker v-else-if="filter.periodType === 'year'" v-model="filter.year" type="year"
          format="YYYY" value-format="YYYY" placeholder="选择年份" style="width:140px" @change="loadReport" />

        <el-select v-model="filter.customerIds" multiple filterable collapse-tags collapse-tags-tooltip
          placeholder="客户（默认全部）" clearable style="width:320px" @change="loadReport">
          <el-option v-for="c in customerOptions" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>

        <el-button type="primary" icon="Search" @click="loadReport">查询</el-button>
        <el-button @click="selectAllCustomers">全选客户</el-button>
        <el-button @click="clearCustomers">清空</el-button>
        <el-button @click="resetFilter">重置</el-button>
        <el-tag type="info" effect="plain">已选 {{ selectedCustomerText }}</el-tag>
      </div>
    </el-card>

    <!-- ⭐ 口径说明（2026-10-29 定稿）：净利 = 销售额 − 进销存费用；草稿 LR 计入销售 -->
    <div class="caliber-box">
      <div class="caliber-head">口径说明</div>
      <div class="caliber-line">
        <b>销售额</b>：按<b>账单日期</b>归月，取 LR 销售行；未做 LR 的账单取账单应收（currentMoney）。
        <b>草稿 LR 同样计入</b> —— 订单经客户确认即为已定，LR 是否确认不影响销售归属。
      </div>
      <div class="caliber-line">
        <b>成本</b>：取 LR 成本行（已录订单成本优先），仅用于计算「毛利」，<b>不参与经营净利</b>。
        <b class="hl">经营净利 = 销售额 − 进销存费用</b>；进销存金料 / 钻石出库属采购领用，不在此扣减。
      </div>
    </div>

    <!-- 经营总览卡片 -->
    <div class="cards">
      <div class="card-item card-sale">
        <div class="card-label">销售额</div>
        <div class="card-value">{{ fmtMoney(totals.saleAmount) }}</div>
      </div>
      <div class="card-item card-cost">
        <div class="card-label">成本（LR 成本行）</div>
        <div class="card-value">{{ fmtMoney(totals.costAmount) }}</div>
        <div class="card-hint">参考 · 不参与净利</div>
      </div>
      <div class="card-item card-misc">
        <div class="card-label">进销存费用</div>
        <div class="card-value">{{ fmtMoney(totals.miscExpense) }}</div>
        <div class="card-hint">净利的扣减项</div>
      </div>
      <div class="card-item card-net">
        <div class="card-label">经营净利</div>
        <div class="card-value" :class="profitClass(totals.netProfit)">{{ fmtMoney(totals.netProfit) }}</div>
        <div class="card-hint">= 销售额 − 进销存费用</div>
      </div>
      <div class="card-item card-recv">
        <div class="card-label">已收</div>
        <div class="card-value recv">{{ fmtMoney(totals.receivedMoney) }}</div>
      </div>
      <div class="card-item card-unrecv">
        <div class="card-label">未收</div>
        <div class="card-value" :class="unpaidClass(totals.unpaidMoney)">{{ fmtMoney(totals.unpaidMoney) }}</div>
      </div>
      <div class="card-item card-mat">
        <div class="card-label">金料 已收/未收(g)</div>
        <div class="card-value">
          <span class="recv">{{ fmtW(totals.receivedMaterial) }}</span>
          <span style="color:#c0c4cc"> / </span>
          <span :class="unpaidClass(totals.unpaidMaterial)">{{ fmtW(totals.unpaidMaterial) }}</span>
        </div>
      </div>
    </div>

    <!-- 客户经营汇总表 -->
    <el-card shadow="never" class="block-card">
      <template #header><span class="block-title">🏷 客户经营汇总（销售 / 成本 / 利润 / 已收未收）</span></template>
      <el-table :data="customers" border stripe size="small" show-summary :summary-method="customerSummary" max-height="520">
        <el-table-column prop="customerName" label="客户" min-width="140" fixed />

        <el-table-column label="销售" align="center" label-class-name="hdr-sale">
          <el-table-column prop="saleAmount" label="销售额" align="right" width="132" sortable class-name="cell-sale">
            <template #default="{ row }"><b class="v-sale">{{ fmtMoney(row.saleAmount) }}</b></template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="成本" align="center" label-class-name="hdr-cost">
          <el-table-column prop="costAmount" label="成本" align="right" width="132" sortable class-name="cell-cost">
            <template #default="{ row }"><span class="v-cost">{{ fmtMoney(row.costAmount) }}</span></template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="毛利" align="center" label-class-name="hdr-profit">
          <el-table-column prop="profit" label="合计" align="right" width="126" sortable>
            <template #default="{ row }"><b :class="profitClass(row.profit)">{{ fmtMoney(row.profit) }}</b></template>
          </el-table-column>
          <el-table-column prop="goldProfit" label="金" align="right" width="104">
            <template #default="{ row }"><span :class="profitClass(row.goldProfit)">{{ fmtMoney(row.goldProfit) }}</span></template>
          </el-table-column>
          <el-table-column prop="diamondProfit" label="钻石" align="right" width="104">
            <template #default="{ row }"><span :class="profitClass(row.diamondProfit)">{{ fmtMoney(row.diamondProfit) }}</span></template>
          </el-table-column>
          <el-table-column prop="laborProfit" label="工费" align="right" width="104">
            <template #default="{ row }"><span :class="profitClass(row.laborProfit)">{{ fmtMoney(row.laborProfit) }}</span></template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="收款" align="center" label-class-name="hdr-recv">
          <el-table-column prop="receivedMoney" label="已收" align="right" width="126">
            <template #default="{ row }"><span class="recv">{{ fmtMoney(row.receivedMoney) }}</span></template>
          </el-table-column>
          <el-table-column prop="unpaidMoney" label="未收" align="right" width="126">
            <template #default="{ row }"><b :class="unpaidClass(row.unpaidMoney)">{{ fmtMoney(row.unpaidMoney) }}</b></template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="金料 (g)" align="center" label-class-name="hdr-mat">
          <el-table-column prop="saleMaterial" label="客户净重" align="right" width="112">
            <template #default="{ row }">{{ fmtW(row.saleMaterial) }}</template>
          </el-table-column>
          <el-table-column prop="receivedMaterial" label="已收料" align="right" width="112">
            <template #default="{ row }"><span class="recv">{{ fmtW(row.receivedMaterial) }}</span></template>
          </el-table-column>
          <el-table-column prop="unpaidMaterial" label="未收料" align="right" width="112">
            <template #default="{ row }"><span :class="unpaidClass(row.unpaidMaterial)">{{ fmtW(row.unpaidMaterial) }}</span></template>
          </el-table-column>
        </el-table-column>
      </el-table>
      <div class="misc-row">
        <span class="misc-formula">
          <span class="formula-title">经营净利</span>
          = 销售额 <b class="v-sale">{{ fmtMoney(totals.saleAmount) }}</b>
          − 进销存费用 <b class="v-cost">{{ fmtMoney(totals.miscExpense) }}</b>
          = <b class="formula-result" :class="profitClass(totals.netProfit)">{{ fmtMoney(totals.netProfit) }}</b>
          <span class="misc-sub">（成本 {{ fmtMoney(totals.costAmount) }} 为 LR 口径，仅作参考）</span>
        </span>
      </div>
    </el-card>

    <!-- 钻石汇总（主石 / 副石：卡重 / 金额 / 镶石工费） -->
    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="card-header">
          <span class="block-title">💎 钻石汇总（卡重 / 金额 / 镶石工费）</span>
          <span class="stone-tip">
            钻石合计 {{ fmtW(totals.diamondCarat) }} ct ｜ 金额 {{ fmtMoney(totals.diamondAmount) }} ｜
            镶石工费 {{ fmtMoney(totals.settingFee) }}
          </span>
        </div>
      </template>
      <el-table :data="byStone" border stripe size="small" show-summary :summary-method="stoneSummary" class="stone-table">
        <el-table-column prop="label" label="分类" min-width="90" fixed />

        <el-table-column label="销售" align="center" label-class-name="hdr-sale">
          <el-table-column prop="saleQty" label="数量" width="76" align="right" class-name="cell-sale" />
          <el-table-column prop="saleCarat" label="卡重(ct)" width="104" align="right" class-name="cell-sale">
            <template #default="{ row }"><b class="v-sale">{{ fmtC(row.saleCarat) }}</b></template>
          </el-table-column>
          <el-table-column prop="salePrice" label="单价(元/ct)" width="112" align="right" class-name="cell-sale">
            <template #default="{ row }">{{ row.saleCarat ? fmtMoney(row.salePrice) : '-' }}</template>
          </el-table-column>
          <el-table-column prop="saleAmount" label="金额(元)" width="130" align="right" class-name="cell-sale">
            <template #default="{ row }"><b class="v-sale">{{ fmtMoney(row.saleAmount) }}</b></template>
          </el-table-column>
          <el-table-column prop="saleSetting" label="镶石工费" width="116" align="right" class-name="cell-sale">
            <template #default="{ row }"><span class="v-sale">{{ fmtMoney(row.saleSetting) }}</span></template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="成本" align="center" label-class-name="hdr-cost">
          <el-table-column prop="costCarat" label="卡重(ct)" width="104" align="right" class-name="cell-cost">
            <template #default="{ row }">{{ fmtC(row.costCarat) }}</template>
          </el-table-column>
          <el-table-column prop="costAmount" label="金额(元)" width="130" align="right" class-name="cell-cost">
            <template #default="{ row }"><b class="v-cost">{{ fmtMoney(row.costAmount) }}</b></template>
          </el-table-column>
          <el-table-column prop="costSetting" label="镶石工费" width="116" align="right" class-name="cell-cost">
            <template #default="{ row }"><span class="v-cost">{{ fmtMoney(row.costSetting) }}</span></template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="毛利" align="center" label-class-name="hdr-profit">
          <el-table-column prop="profit" label="钻石利润" width="126" align="right">
            <template #default="{ row }"><b :class="profitClass(row.profit)">{{ fmtMoney(row.profit) }}</b></template>
          </el-table-column>
          <el-table-column prop="settingProfit" label="镶石工费利润" width="136" align="right">
            <template #default="{ row }"><b :class="profitClass(row.settingProfit)">{{ fmtMoney(row.settingProfit) }}</b></template>
          </el-table-column>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 成色汇总（保留颜色区分） -->
    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="card-header">
          <span class="block-title">🎨 成色汇总（销售 / 成本 / 利润）</span>
          <div class="legend-row">
            <span class="legend-chip mat-gold-999">足金</span>
            <span class="legend-chip mat-gold-18k">18K</span>
            <span class="legend-chip mat-gold-14k">14K</span>
            <span class="legend-chip mat-gold-9k">9K</span>
            <span class="legend-chip mat-pt">PT</span>
            <span class="legend-chip mat-silver">银</span>
            <span class="legend-chip mat-copper">铜</span>
          </div>
        </div>
      </template>
      <el-table :data="byColor" border stripe size="small" show-summary :summary-method="colorSummary"
        :row-class-name="colorRowClass">
        <el-table-column prop="color" label="成色" min-width="110" fixed>
          <template #default="{ row }">
            <span class="color-mark" :class="colorRowClass({ row })"></span>{{ row.color }}
          </template>
        </el-table-column>

        <el-table-column label="销售重量 (g)" align="center" label-class-name="hdr-mat">
          <el-table-column prop="netWeight" label="客户净重" align="right" width="118">
            <template #default="{ row }">{{ fmtW(row.netWeight) }}</template>
          </el-table-column>
          <el-table-column prop="addLossWeight" label="加耗重" align="right" width="110">
            <template #default="{ row }">{{ fmtW(row.addLossWeight) }}</template>
          </el-table-column>
          <el-table-column prop="foldedWeight" label="折足金" align="right" width="118">
            <template #default="{ row }"><b style="color:#409EFF;">{{ fmtW(row.foldedWeight) }}</b></template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="销售" align="center" label-class-name="hdr-sale">
          <el-table-column prop="saleAmount" label="销售额" align="right" width="136">
            <template #default="{ row }"><b class="v-sale">{{ fmtMoney(row.saleAmount) }}</b></template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="成本" align="center" label-class-name="hdr-cost">
          <el-table-column prop="costNetWeight" label="净重(g)" align="right" width="112">
            <template #default="{ row }"><span class="v-cost">{{ fmtW(row.costNetWeight) }}</span></template>
          </el-table-column>
          <el-table-column prop="costFoldedWeight" label="折足金(g)" align="right" width="120">
            <template #default="{ row }"><b class="v-cost">{{ fmtW(row.costFoldedWeight) }}</b></template>
          </el-table-column>
          <el-table-column prop="costAmount" label="金额" align="right" width="136">
            <template #default="{ row }"><b class="v-cost">{{ fmtMoney(row.costAmount) }}</b></template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="毛利" align="center" label-class-name="hdr-profit">
          <el-table-column prop="profit" label="合计" align="right" width="126">
            <template #default="{ row }"><b :class="profitClass(row.profit)">{{ fmtMoney(row.profit) }}</b></template>
          </el-table-column>
          <el-table-column prop="goldProfit" label="金利润" align="right" width="126">
            <template #default="{ row }"><span :class="profitClass(row.goldProfit)">{{ fmtMoney(row.goldProfit) }}</span></template>
          </el-table-column>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 其他费用（包装 / 证书 / 邮费 / 版费 / 工费） -->
    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="card-header">
          <span class="block-title">🧾 其他费用（包装 / 证书 / 邮费 / 版费 / 工费）</span>
          <span class="stone-tip">销售取 LR 销售行（证书费/邮费取账单明细）｜成本取 LR 成本行</span>
        </div>
      </template>
      <el-table :data="byOtherFee" border stripe size="small" show-summary :summary-method="feeSummary">
        <el-table-column prop="label" label="费用项" min-width="120" fixed />

        <el-table-column label="销售" align="center" label-class-name="hdr-sale">
          <el-table-column prop="saleAmount" label="金额" align="right" width="160">
            <template #default="{ row }"><b class="v-sale">{{ fmtMoney(row.saleAmount) }}</b></template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="成本" align="center" label-class-name="hdr-cost">
          <el-table-column prop="costAmount" label="金额" align="right" width="160">
            <template #default="{ row }"><span class="v-cost">{{ fmtMoney(row.costAmount) }}</span></template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="毛利" align="center" label-class-name="hdr-profit">
          <el-table-column prop="profit" label="合计" align="right" width="160">
            <template #default="{ row }"><b :class="profitClass(row.profit)">{{ fmtMoney(row.profit) }}</b></template>
          </el-table-column>
          <el-table-column prop="profitRate" label="毛利率" align="right" width="110">
            <template #default="{ row }">
              <span :class="profitClass(row.profit)">
                {{ Number(row.costAmount) > 0 ? Number(row.profitRate).toFixed(2) + '%' : '-' }}
              </span>
            </template>
          </el-table-column>
        </el-table-column>
      </el-table>
      <div class="fee-note">说明：证书费 / 邮费在 LR 成本行中未单独记录，成本侧为 0，毛利率不做计算。</div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Refresh, Download, Notebook } from '@element-plus/icons-vue';
import * as XLSX from 'xlsx';
import { getOperationReport } from '@/api/inventoryMonthly';
import { getCustomerList } from '@/api/customer';

const loading = ref(false);
const customers = ref([]);
const byColor = ref([]);
const byStone = ref([]);
const byOtherFee = ref([]);
const totals = ref({});
const customerOptions = ref([]);

const now = new Date();
const filter = reactive({
  periodType: 'month',                                   // 默认按月
  yearMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  year: String(now.getFullYear()),
  customerIds: []                                        // 空 = 全部客户（默认）
});

const periodLabel = computed(() => {
  const p = report.value?.period || {};
  if (p.type === 'year') return `${p.label || ''}`;
  if (p.type === 'all') return '全部时间';
  return p.label || '';
});

// ⭐ 经营净利 = 销售额 − 成本（进销存费用已含在成本里，不再重复扣减）
const report = ref(null);

const selectedCustomerText = computed(() => {
  if (!filter.customerIds.length) return '全部客户';
  return `${filter.customerIds.length} 个客户`;
});

// ===== 数字格式 =====
const fmtMoney = (v) => '¥' + Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtW = (v) => Number(v || 0).toFixed(3);
const fmtC = (v) => Number(v || 0).toFixed(3);
const profitClass = (v) => (Number(v) >= 0 ? 'profit-pos' : 'profit-neg');
const unpaidClass = (v) => (Number(v) > 0 ? 'unpaid' : 'recv');

// ===== 加载 =====
const loadReport = async () => {
  loading.value = true;
  try {
    const params = { periodType: filter.periodType };
    if (filter.periodType === 'month') params.yearMonth = filter.yearMonth;
    if (filter.periodType === 'year') params.year = filter.year;
    if (filter.customerIds.length) params.customerIds = filter.customerIds.join(',');
    const res = await getOperationReport(params);
    const d = res?.data || {};
    report.value = d;
    customers.value = d.customers || [];
    byColor.value = d.byColor || [];
    byStone.value = d.byStone || [];
    byOtherFee.value = d.byOtherFee || [];
    totals.value = d.totals || {};
  } catch (e) {
    ElMessage.error('加载报表失败：' + (e.message || ''));
  } finally {
    loading.value = false;
  }
};

const loadCustomers = async () => {
  try {
    const res = await getCustomerList();
    const list = res?.data || res || [];
    customerOptions.value = list.map(c => ({ id: c.customerId || c.id, name: c.customerName || c.name }));
  } catch { customerOptions.value = []; }
};

const resetFilter = () => {
  filter.periodType = 'month';
  filter.yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  filter.year = String(now.getFullYear());
  filter.customerIds = [];
  loadReport();
};

// 全选 / 清空客户
const selectAllCustomers = () => {
  filter.customerIds = customerOptions.value.map(c => c.id);
  loadReport();
};
const clearCustomers = () => {
  filter.customerIds = [];
  loadReport();
};

// ===== 合计行 =====
const customerSummary = ({ columns, data }) => {
  const sums = [];
  columns.forEach((col, i) => {
    if (i === 0) { sums[i] = '合计'; return; }
    if (['saleAmount', 'costAmount', 'profit', 'goldProfit', 'diamondProfit', 'laborProfit', 'receivedMoney', 'unpaidMoney'].includes(col.property)) {
      sums[i] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 100) / 100;
      return;
    }
    if (['saleMaterial', 'receivedMaterial', 'unpaidMaterial'].includes(col.property)) {
      sums[i] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 1000) / 1000;
      return;
    }
    sums[i] = '';
  });
  return sums;
};

const colorSummary = ({ columns, data }) => {
  const sums = [];
  columns.forEach((col, i) => {
    if (i === 0) { sums[i] = '合计'; return; }
    if (['saleAmount', 'costAmount', 'profit', 'goldProfit'].includes(col.property)) {
      sums[i] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 100) / 100;
      return;
    }
    if (['netWeight', 'addLossWeight', 'foldedWeight', 'costNetWeight', 'costFoldedWeight'].includes(col.property)) {
      sums[i] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 1000) / 1000;
      return;
    }
    sums[i] = '';
  });
  return sums;
};

// 钻石汇总合计
const stoneSummary = ({ columns, data }) => {
  const sums = [];
  columns.forEach((col, i) => {
    if (i === 0) { sums[i] = '合计'; return; }
    if (col.property === 'saleQty') {
      sums[i] = data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0);
      return;
    }
    if (['saleCarat', 'costCarat'].includes(col.property)) {
      sums[i] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 1000) / 1000;
      return;
    }
    if (['salePrice', 'costPrice'].includes(col.property)) { sums[i] = ''; return; }
    if (['saleAmount', 'saleSetting', 'costAmount', 'costSetting', 'profit', 'settingProfit'].includes(col.property)) {
      sums[i] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 100) / 100;
      return;
    }
    sums[i] = '';
  });
  return sums;
};

// ===== 其他费用合计 =====
const feeSummary = ({ columns, data }) => {
  const sums = [];
  const sum = (k) => Math.round(data.reduce((s, r) => s + (Number(r[k]) || 0), 0) * 100) / 100;
  const tSale = sum('saleAmount');
  const tCost = sum('costAmount');
  columns.forEach((col, i) => {
    if (i === 0) { sums[i] = '合计'; return; }
    if (col.property === 'saleAmount' || col.property === 'costAmount' || col.property === 'profit') {
      sums[i] = sum(col.property);
      return;
    }
    if (col.property === 'profitRate') {
      sums[i] = tCost > 0 && tSale > 0 ? Math.round((tSale - tCost) / tSale * 10000) / 100 + '%' : '-';
      return;
    }
    sums[i] = '';
  });
  return sums;
};

// ===== 成色配色（复用上月度盘点的规则） =====
const tone = (c) => {
  const s = String(c || '');
  if (/足金|999|990|黄金|^黄/.test(s)) return 'mat-gold-999';
  if (/玫瑰金|18\s*K/i.test(s)) return 'mat-gold-18k';
  if (/白色|14\s*K/i.test(s)) return 'mat-gold-14k';
  if (/9\s*K|22\s*K/i.test(s)) return 'mat-gold-9k';
  if (/PT|铂/i.test(s)) return 'mat-pt';
  if (/银/i.test(s)) return 'mat-silver';
  if (/铜/i.test(s)) return 'mat-copper';
  return 'mat-gold-other';
};
const colorRowClass = ({ row }) => tone(row?.color);

// ===== 导出月报表 =====
const handleExport = () => {
  if (!customers.value.length && !byColor.value.length) {
    ElMessage.warning('当前没有可导出的数据');
    return;
  }
  const wb = XLSX.utils.book_new();

  // Sheet1：客户经营汇总
  const head1 = ['客户', '销售额', '成本', '毛利', '金利润', '钻石利润', '工费利润',
    '已收款', '未收款', '客户净重(g)', '已收料(g)', '未收料(g)'];
  const body1 = customers.value.map(r => [
    r.customerName, r.saleAmount, r.costAmount, r.profit, r.goldProfit, r.diamondProfit, r.laborProfit,
    r.receivedMoney, r.unpaidMoney, r.saleMaterial, r.receivedMaterial, r.unpaidMaterial
  ]);
  const t = totals.value || {};
  const foot1 = [
    '合计', t.saleAmount, t.costAmount, t.profit, t.goldProfit, t.diamondProfit, t.laborProfit,
    t.receivedMoney, t.unpaidMoney, t.saleMaterial, t.receivedMaterial, t.unpaidMaterial
  ];
  const ws1 = XLSX.utils.aoa_to_sheet([[`月度经营报表（${periodLabel.value}）`], [], head1, ...body1, [], foot1,
    [], ['进销存费用', t.miscExpense], ['经营净利（销售额−进销存费用）', t.netProfit]]);
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];
  ws1['!cols'] = [{ wch: 22 }, ...head1.slice(1).map(() => ({ wch: 13 }))];
  XLSX.utils.book_append_sheet(wb, ws1, '客户经营汇总');

  // Sheet2：成色汇总
  const head2 = ['成色', '销售净重(g)', '加耗重(g)', '销售折足金(g)', '销售额', '成本净重(g)', '成本折足金(g)', '成本金额', '毛利', '金利润'];
  const body2 = byColor.value.map(r => [r.color, r.netWeight, r.addLossWeight, r.foldedWeight, r.saleAmount, r.costNetWeight, r.costFoldedWeight, r.costAmount, r.profit, r.goldProfit]);
  const sum = (k) => Math.round(byColor.value.reduce((s, r) => s + (Number(r[k]) || 0), 0) * 100) / 100;
  const sum3 = (k) => Math.round(byColor.value.reduce((s, r) => s + (Number(r[k]) || 0), 0) * 1000) / 1000;
  const foot2 = ['合计', sum3('netWeight'), sum3('addLossWeight'), sum3('foldedWeight'), sum('saleAmount'),
    sum3('costNetWeight'), sum3('costFoldedWeight'), sum('costAmount'), sum('profit'), sum('goldProfit')];
  const ws2 = XLSX.utils.aoa_to_sheet([[`成色汇总（${periodLabel.value}）`], [], head2, ...body2, [], foot2]);
  ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
  ws2['!cols'] = [{ wch: 16 }, ...head2.slice(1).map(() => ({ wch: 15 }))];
  XLSX.utils.book_append_sheet(wb, ws2, '成色汇总');

  // Sheet3：钻石汇总
  const head3 = ['分类', '数量', '卡重(ct)', '单价(元/ct)', '金额(元)', '镶石工费(元)',
    '成本卡重(ct)', '成本金额(元)', '成本镶石工费', '钻石利润', '镶石工费利润'];
  const body3 = byStone.value.map(r => [r.label, r.saleQty, r.saleCarat, r.salePrice, r.saleAmount, r.saleSetting,
    r.costCarat, r.costAmount, r.costSetting, r.profit, r.settingProfit]);
  const sSum = (k) => Math.round(byStone.value.reduce((s, r) => s + (Number(r[k]) || 0), 0) * 100) / 100;
  const sSum3 = (k) => Math.round(byStone.value.reduce((s, r) => s + (Number(r[k]) || 0), 0) * 1000) / 1000;
  const foot3 = ['合计', byStone.value.reduce((s, r) => s + (Number(r.saleQty) || 0), 0),
    sSum3('saleCarat'), '', sSum('saleAmount'), sSum('saleSetting'),
    sSum3('costCarat'), sSum('costAmount'), sSum('costSetting'), sSum('profit'), sSum('settingProfit')];
  const ws3 = XLSX.utils.aoa_to_sheet([[`钻石汇总（${periodLabel.value}）`], [], head3, ...body3, [], foot3]);
  ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];
  ws3['!cols'] = [{ wch: 10 }, ...head3.slice(1).map(() => ({ wch: 14 }))];
  XLSX.utils.book_append_sheet(wb, ws3, '钻石汇总');

  // Sheet4：其他费用
  const head4 = ['费用项', '销售金额', '成本金额', '毛利', '毛利率(%)'];
  const body4 = byOtherFee.value.map(r => [r.label, r.saleAmount, r.costAmount, r.profit,
    Number(r.costAmount) > 0 ? r.profitRate : '']);
  const fSum = (k) => Math.round(byOtherFee.value.reduce((s, r) => s + (Number(r[k]) || 0), 0) * 100) / 100;
  const fsale = fSum('saleAmount'), fcost = fSum('costAmount');
  const foot4 = ['合计', fsale, fcost, Math.round((fsale - fcost) * 100) / 100,
    fsale > 0 ? Math.round((fsale - fcost) / fsale * 10000) / 100 : 0];
  const ws4 = XLSX.utils.aoa_to_sheet([[`其他费用（${periodLabel.value}）`], [], head4, ...body4, [], foot4]);
  ws4['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  ws4['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws4, '其他费用');

  const name = `经营报表_${filter.periodType === 'month' ? filter.yearMonth : filter.periodType === 'year' ? filter.year : '全部'}.xlsx`;
  XLSX.writeFile(wb, name);
  ElMessage.success('已导出 ' + name);
};

onMounted(() => {
  loadCustomers();
  loadReport();
});
</script>

<style scoped>
.page-container { padding: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.page-header h2 { display: inline-block; margin: 0 8px; font-size: 18px; }
.filter-card { margin-bottom: 12px; }
.filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

/* 经营总览卡片 */
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 12px; }
.card-item { background: #fff; border-radius: 6px; padding: 12px 14px; border-left: 3px solid #909399; }
.card-label { font-size: 12px; color: #909399; margin-bottom: 6px; }
.card-hint { font-size: 11px; color: #a8abb2; margin-top: 4px; }
.card-value { font-size: 18px; font-weight: 700; }
.card-sale { border-left-color: #409EFF; }
.card-cost { border-left-color: #67C23A; }
.card-profit { border-left-color: #E6A23C; }
.card-misc { border-left-color: #909399; }
.card-net { border-left-color: #F56C6C; background: #fef0f0; }
.card-recv { border-left-color: #67C23A; }
.card-unrecv { border-left-color: #E6A23C; }
.card-mat { border-left-color: #409EFF; }
.stone-tip { font-size: 12px; color: #606266; }
.fee-note { margin-top: 8px; font-size: 12px; color: #909399; }
.stone-table :deep(.el-table__row) { background: linear-gradient(100deg, #F2F8FF 0%, #FFFFFF 60%); }

/* ⭐ 销售 / 成本 / 利润 / 收款 / 金料 分组表头配色 */
:deep(.el-table th.hdr-sale)   { background: #dbeafe !important; color: #185fa5 !important; font-weight: 600; }
:deep(.el-table th.hdr-cost)   { background: #dcf3e5 !important; color: #1f7a4d !important; font-weight: 600; }
:deep(.el-table th.hdr-profit) { background: #fdeed8 !important; color: #a1671a !important; font-weight: 600; }
:deep(.el-table th.hdr-recv)   { background: #eceff4 !important; color: #4a5568 !important; font-weight: 600; }
:deep(.el-table th.hdr-mat)    { background: #efeafd !important; color: #5b4b9a !important; font-weight: 600; }

:deep(.el-table td.cell-sale)  { background: #f6faff !important; }
:deep(.el-table td.cell-cost)  { background: #f4fcf7 !important; }
:deep(.el-table .el-table__footer td.cell-sale) { background: #e9f3ff !important; font-weight: 700; }
:deep(.el-table .el-table__footer td.cell-cost) { background: #e8f9ef !important; font-weight: 700; }

.v-sale { color: #185fa5; }
.v-cost { color: #1f7a4d; }

.block-card { margin-bottom: 12px; }
.block-title { font-weight: 600; font-size: 15px; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }

/* 杂项支出行 */
.caliber-box {
  background: #f7fafd; border: 1px solid #d9e6f5; border-left: 3px solid #409eff;
  border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; color: #4e5969; line-height: 1.75;
}
.caliber-head { font-weight: 600; color: #185fa5; margin-bottom: 4px; font-size: 13px; }
.caliber-line b { color: #303133; }
.caliber-line b.hl { color: #c0392b; }

.misc-row {
  display: flex; align-items: center; gap: 14px;
  margin-top: 10px; padding: 10px 14px;
  background: #f7f9fc; border: 1px solid #ebeef5; border-radius: 6px;
  font-size: 13px; color: #606266;
}
.misc-formula { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.formula-title { font-weight: 600; color: #303133; padding: 2px 8px; background: #eef2f7; border-radius: 4px; }
.misc-sub { font-size: 12px; color: #909399; }
.formula-result { font-size: 16px; }
.formula-result.profit-pos { color: #f56c6c; }
.formula-result.profit-neg { color: #67c23a; }

/* 颜色 */
.profit-pos { color: #f56c6c; }
.profit-neg { color: #67c23a; }
.recv { color: #67c23a; font-weight: 600; }
.unpaid { color: #e6a23c; font-weight: 600; }

/* 成色配色 */
:deep(.el-table__row.mat-gold-999) > td.el-table__cell { background: #FFE9A3 !important; }
:deep(.el-table__row.mat-gold-18k) > td.el-table__cell { background: #FDF0BE !important; }
:deep(.el-table__row.mat-gold-14k) > td.el-table__cell { background: #FDF6D9 !important; }
:deep(.el-table__row.mat-gold-9k) > td.el-table__cell { background: #FEFAEC !important; }
:deep(.el-table__row.mat-gold-other) > td.el-table__cell { background: #FBF3E4 !important; }
:deep(.el-table__row.mat-pt) > td.el-table__cell { background: #F0EBF9 !important; }
:deep(.el-table__row.mat-silver) > td.el-table__cell { background: #EDF1F4 !important; }
:deep(.el-table__row.mat-copper) > td.el-table__cell { background: #F7EAE0 !important; }
.legend-row { display: flex; gap: 6px; flex-wrap: wrap; }
.legend-chip { padding: 2px 9px; border-radius: 10px; font-size: 12px; color: #4a4a4a; border: 1px solid rgba(0,0,0,.06); }
.legend-chip.mat-gold-999 { background: #FFE9A3; }
.legend-chip.mat-gold-18k { background: #FDF0BE; }
.legend-chip.mat-gold-14k { background: #FDF6D9; }
.legend-chip.mat-gold-9k { background: #FEFAEC; }
.legend-chip.mat-pt { background: #F0EBF9; }
.legend-chip.mat-silver { background: #EDF1F4; }
.legend-chip.mat-copper { background: #F7EAE0; }
.color-mark { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: middle; border: 1px solid rgba(0,0,0,.15); }
.color-mark.mat-gold-999 { background: #FFE9A3; }
.color-mark.mat-gold-18k { background: #FDF0BE; }
.color-mark.mat-gold-14k { background: #FDF6D9; }
.color-mark.mat-gold-9k { background: #FEFAEC; }
.color-mark.mat-gold-other { background: #FBF3E4; }
.color-mark.mat-pt { background: #F0EBF9; }
.color-mark.mat-silver { background: #EDF1F4; }
.color-mark.mat-copper { background: #F7EAE0; }
</style>
