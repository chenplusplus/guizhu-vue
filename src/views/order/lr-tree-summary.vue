<!-- src/views/order/lr-tree-summary.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()" plain>
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📊 LR表汇总</h2>
        <el-tag type="primary" size="large" effect="plain">
          {{ dateRangeLabel }}
        </el-tag>
      </div>
      <div class="header-right">
        <el-radio-group v-model="dateType" @change="onDateTypeChange">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="today">今天</el-radio-button>
          <el-radio-button value="month">本月</el-radio-button>
          <el-radio-button value="custom">自定义</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="dateType === 'custom'"
          v-model="customRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width:260px;"
          @change="loadData"
        />
        <el-select
          v-model="filterCustomerId"
          clearable
          filterable
          placeholder="全部客户"
          style="width:200px;"
          @change="loadData"
        >
          <el-option
            v-for="c in options.customers"
            :key="c.customerId"
            :label="c.customerName"
            :value="c.customerId"
          />
        </el-select>
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 总览卡片 -->
    <div class="overview-cards">
      <div class="overview-card">
        <div class="card-label">客户数</div>
        <div class="card-value">{{ summary.total?.customerCount || 0 }}</div>
      </div>
      <div class="overview-card">
        <div class="card-label">LR单数</div>
        <div class="card-value">{{ summary.total?.lrCount || 0 }}</div>
      </div>
      <div class="overview-card">
        <div class="card-label">总件数</div>
        <div class="card-value">{{ summary.total?.quantity || 0 }}</div>
      </div>
      <div class="overview-card">
        <div class="card-label">销售额</div>
        <div class="card-value" style="color:#E6A23C;">¥{{ fmt(summary.total?.saleAmount) }}</div>
      </div>
      <div class="overview-card">
        <div class="card-label">成本</div>
        <div class="card-value" style="color:#F56C6C;">¥{{ fmt(summary.total?.costAmount) }}</div>
      </div>
      <div class="overview-card">
        <div class="card-label">利润</div>
        <div class="card-value" :style="{ color: (summary.total?.profit || 0) >= 0 ? '#F56C6C' : '#67C23A' }">
          ¥{{ fmt(summary.total?.profit) }}
        </div>
      </div>
      <div class="overview-card">
        <div class="card-label">净重</div>
        <div class="card-value">{{ fmt(summary.total?.netWeight, 3) }}g</div>
      </div>
      <div class="overview-card">
        <div class="card-label">加耗重</div>
        <div class="card-value">{{ fmt(summary.total?.addLossWeight, 3) }}g</div>
      </div>
    </div>

    <!-- 经营看板 -->
    <div class="board-section">
      <div class="board-title">🏦 经营看板</div>
      <div class="board-grid">
        <!-- 订单侧 -->
        <div class="board-group">
          <div class="board-group-title">📦 订单<span class="board-tip">（LR 毛利）</span></div>
          <div class="board-item">
            <span class="board-label">销售额</span>
            <span class="board-value" style="color:#E6A23C;">¥{{ fmt(board.orderSale) }}</span>
          </div>
          <div class="board-item">
            <span class="board-label">成本</span>
            <span class="board-value" style="color:#909399;">¥{{ fmt(board.orderCost) }}</span>
          </div>
          <div class="board-item">
            <span class="board-label">毛利</span>
            <span class="board-value" :style="{ color: (board.orderProfit || 0) >= 0 ? '#F56C6C' : '#67C23A' }">¥{{ fmt(board.orderProfit) }}</span>
          </div>
        </div>
        <!-- 进销存侧（参考，不参与利润计算） -->
        <div class="board-group">
          <div class="board-group-title">🔄 进销存<span class="board-tip">（参考·不参与利润）</span></div>
          <div class="board-item">
            <span class="board-label">入库（采购）</span>
            <span class="board-value" style="color:#67C23A;">¥{{ fmt(board.inoutIncome) }}</span>
          </div>
          <div class="board-item">
            <span class="board-label">出库（领用）</span>
            <span class="board-value" style="color:#F56C6C;">¥{{ fmt(board.inoutExpense) }}</span>
          </div>
          <div class="board-item">
            <span class="board-label">进销存净额</span>
            <span class="board-value" :style="{ color: (board.inoutNet || 0) >= 0 ? '#67C23A' : '#F56C6C' }">¥{{ fmt(board.inoutNet) }}</span>
          </div>
        </div>
        <!-- 综合侧：销售额 − 进销存费用 -->
        <div class="board-group board-group-total">
          <div class="board-group-title">💰 经营结果<span class="board-tip">（销售额 − 进销存费用）</span></div>
          <div class="board-item">
            <span class="board-label">销售额</span>
            <span class="board-value" style="color:#E6A23C;">¥{{ fmt(board.totalIncome) }}</span>
          </div>
          <div class="board-item">
            <span class="board-label">进销存费用</span>
            <span class="board-value" style="color:#909399;">¥{{ fmt(board.totalExpense) }}</span>
          </div>
          <div class="board-item board-item-main">
            <span class="board-label">经营净利</span>
            <span class="board-value board-value-main" :style="{ color: (board.totalProfit || 0) >= 0 ? '#F56C6C' : '#67C23A' }">
              ¥{{ fmt(board.totalProfit) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 按客户汇总 -->
    <div class="section">
      <div class="section-title">📋 按客户汇总</div>
      <el-table :data="summary.byCustomer || []" border stripe show-summary :summary-method="customerSummaryMethod" style="width:100%;">
        <el-table-column prop="customerName" label="客户" min-width="140" fixed />
        <el-table-column prop="lrCount" label="LR单数" width="90" align="center" />
        <el-table-column prop="saleAmount" label="销售额" width="130" align="right">
          <template #default="{ row }">¥{{ fmt(row.saleAmount) }}</template>
        </el-table-column>
        <el-table-column prop="costAmount" label="成本" width="130" align="right">
          <template #default="{ row }">¥{{ fmt(row.costAmount) }}</template>
        </el-table-column>
        <el-table-column prop="profit" label="利润" width="130" align="right">
          <template #default="{ row }">
            <span :style="{ color: (row.profit || 0) >= 0 ? '#F56C6C' : '#67C23A', fontWeight: 'bold' }">
              ¥{{ fmt(row.profit) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="goldProfit" label="金利润" width="120" align="right">
          <template #default="{ row }">
            <span :style="{ color: (row.goldProfit || 0) >= 0 ? '#F56C6C' : '#67C23A' }">¥{{ fmt(row.goldProfit) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="diamondProfit" label="钻石利润" width="120" align="right">
          <template #default="{ row }">
            <span :style="{ color: (row.diamondProfit || 0) >= 0 ? '#F56C6C' : '#67C23A' }">¥{{ fmt(row.diamondProfit) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="settingProfit" label="镶石利润" width="120" align="right">
          <template #default="{ row }">
            <span :style="{ color: (row.settingProfit || 0) >= 0 ? '#F56C6C' : '#67C23A' }">¥{{ fmt(row.settingProfit) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="laborProfit" label="工费利润" width="120" align="right">
          <template #default="{ row }">
            <span :style="{ color: (row.laborProfit || 0) >= 0 ? '#F56C6C' : '#67C23A' }">¥{{ fmt(row.laborProfit) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="件数" width="90" align="right" />
        <el-table-column prop="netWeight" label="客户净重" width="110" align="right">
          <template #default="{ row }">{{ fmt(row.netWeight, 3) }}g</template>
        </el-table-column>
        <el-table-column prop="addLossWeight" label="加耗重" width="110" align="right">
          <template #default="{ row }">{{ fmt(row.addLossWeight, 3) }}g</template>
        </el-table-column>
        <el-table-column prop="foldedWeight" label="实际净重(折足金)" width="150" align="right">
          <template #default="{ row }">
            <span style="font-weight:600;color:#409EFF;">{{ fmt(row.foldedWeight, 3) }}g</span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 按成色汇总 -->
    <div class="section">
      <div class="section-title">🎨 按成色汇总（给客户出的金 / 自己出的金）</div>
      <el-table :data="summary.byColor || []" border stripe show-summary :summary-method="colorSummaryMethod" style="width:100%;">
        <el-table-column prop="color" label="成色" min-width="100" fixed />
        <el-table-column prop="netWeight" label="客户净重" width="110" align="right">
          <template #default="{ row }">{{ fmt(row.netWeight, 3) }}g</template>
        </el-table-column>
        <el-table-column prop="addLossWeight" label="加耗重" width="110" align="right">
          <template #default="{ row }">{{ fmt(row.addLossWeight, 3) }}g</template>
        </el-table-column>
        <el-table-column prop="foldedWeight" label="实际净重(折足金)" width="150" align="right">
          <template #default="{ row }">
            <span style="font-weight:600;color:#409EFF;">{{ fmt(row.foldedWeight, 3) }}g</span>
          </template>
        </el-table-column>
        <el-table-column prop="saleAmount" label="给客户·账单金额" width="150" align="right">
          <template #default="{ row }">¥{{ fmt(row.saleAmount) }}</template>
        </el-table-column>
        <el-table-column prop="costFoldedWeight" label="自己出·折足金重" width="150" align="right">
          <template #default="{ row }">
            <span style="color:#67C23A;">{{ fmt(row.costFoldedWeight, 3) }}g</span>
          </template>
        </el-table-column>
        <el-table-column prop="costAmount" label="自己出·成本金额" width="150" align="right">
          <template #default="{ row }">
            <span style="color:#67C23A;">¥{{ fmt(row.costAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="利润" width="140" align="right">
          <template #default="{ row }">
            <span :style="{ color: ((row.saleAmount || 0) - (row.costAmount || 0)) >= 0 ? '#F56C6C' : '#67C23A', fontWeight: 'bold' }">
              ¥{{ fmt((row.saleAmount || 0) - (row.costAmount || 0)) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 钻石汇总（主石 / 副石） -->
    <div class="section">
      <div class="section-title">💎 钻石汇总（卡重 / 单价 / 利润）</div>
      <el-table :data="summary.byStone || []" border stripe show-summary :summary-method="stoneSummaryMethod" style="width:100%;">
        <el-table-column prop="label" label="分类" min-width="90" fixed />
        <el-table-column prop="saleQty" label="给客户·数量" width="110" align="right" />
        <el-table-column prop="saleCarat" label="给客户·卡重" width="120" align="right">
          <template #default="{ row }">{{ fmt(row.saleCarat, 3) }}ct</template>
        </el-table-column>
        <el-table-column prop="salePrice" label="给客户·单价" width="130" align="right">
          <template #default="{ row }">¥{{ fmt(row.salePrice) }}/ct</template>
        </el-table-column>
        <el-table-column prop="saleAmount" label="给客户·金额" width="140" align="right">
          <template #default="{ row }">¥{{ fmt(row.saleAmount) }}</template>
        </el-table-column>
        <el-table-column prop="costCarat" label="自己出·卡重" width="120" align="right">
          <template #default="{ row }">{{ fmt(row.costCarat, 3) }}ct</template>
        </el-table-column>
        <el-table-column prop="costPrice" label="自己出·单价" width="130" align="right">
          <template #default="{ row }">¥{{ fmt(row.costPrice) }}/ct</template>
        </el-table-column>
        <el-table-column prop="costAmount" label="自己出·金额" width="140" align="right">
          <template #default="{ row }">
            <span style="color:#67C23A;">¥{{ fmt(row.costAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="profit" label="利润" width="130" align="right">
          <template #default="{ row }">
            <span :style="{ color: (row.profit || 0) >= 0 ? '#F56C6C' : '#67C23A', fontWeight: 'bold' }">
              ¥{{ fmt(row.profit) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 工费汇总（总额一行） -->
    <div class="section">
      <div class="section-title">🛠 工费汇总</div>
      <div class="labor-bar">
        <div class="labor-item">
          <div class="labor-label">给客户 · 应收工费</div>
          <div class="labor-value" style="color:#E6A23C;">¥{{ fmt(laborData.saleLaborFee) }}</div>
        </div>
        <div class="labor-item">
          <div class="labor-label">自己出 · 成本工费</div>
          <div class="labor-value" style="color:#67C23A;">¥{{ fmt(laborData.costLaborFee) }}</div>
        </div>
        <div class="labor-item">
          <div class="labor-label">工费利润</div>
          <div class="labor-value" :style="{ color: laborData.laborProfit >= 0 ? '#F56C6C' : '#67C23A' }">
            ¥{{ fmt(laborData.laborProfit) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 支出（进销存）汇总 -->
    <div class="section">
      <div class="section-title">💰 支出（进销存）汇总</div>
      <el-table :data="inoutRows" border stripe show-summary :summary-method="inoutSummaryMethod" style="width:100%;">
        <el-table-column prop="label" label="物料" min-width="120" fixed />
        <el-table-column prop="inAmount" label="入（金额）" width="150" align="right">
          <template #default="{ row }">
            <span style="color:#67C23A;">¥{{ fmt(row.inAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="outAmount" label="出（金额）" width="150" align="right">
          <template #default="{ row }">
            <span style="color:#F56C6C;">¥{{ fmt(row.outAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="净额（入-出）" width="150" align="right">
          <template #default="{ row }">
            <span :style="{ color: ((row.inAmount || 0) - (row.outAmount || 0)) >= 0 ? '#67C23A' : '#F56C6C', fontWeight: 'bold' }">
              ¥{{ fmt((row.inAmount || 0) - (row.outAmount || 0)) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="inWeight" label="入重(折算g)" width="140" align="right">
          <template #default="{ row }">{{ row.inWeight ? fmt(row.inWeight, 3) + 'g' : '-' }}</template>
        </el-table-column>
        <el-table-column prop="outWeight" label="出重(折算g)" width="140" align="right">
          <template #default="{ row }">{{ row.outWeight ? fmt(row.outWeight, 3) + 'g' : '-' }}</template>
        </el-table-column>
        <el-table-column prop="inCarat" label="入重(克拉)" width="130" align="right">
          <template #default="{ row }">{{ row.inCarat ? fmt(row.inCarat, 3) + 'ct' : '-' }}</template>
        </el-table-column>
        <el-table-column prop="outCarat" label="出重(克拉)" width="130" align="right">
          <template #default="{ row }">{{ row.outCarat ? fmt(row.outCarat, 3) + 'ct' : '-' }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Refresh } from '@element-plus/icons-vue';
import { getLrTreeSummary, getLrTreeOptions } from '@/api/lr';

const loading = ref(false);
const dateType = ref('all');
const customRange = ref([]);
const filterCustomerId = ref('');

const options = reactive({
  customers: [],
});

const summary = reactive({
  startDate: '',
  endDate: '',
  total: {},
  byCustomer: [],
  byColor: [],
  byStone: [],
  inout: {},
});

// 工费汇总（总额一行）
const laborData = reactive({ saleLaborFee: 0, costLaborFee: 0, laborProfit: 0 });

// 经营看板数据
const board = computed(() => {
  const b = summary.board || {};
  return {
    orderSale: b.orderSale || 0,
    orderCost: b.orderCost || 0,
    orderProfit: b.orderProfit || 0,
    inoutIncome: b.inoutIncome || 0,
    inoutExpense: b.inoutExpense || 0,
    inoutNet: b.inoutNet || 0,
    totalIncome: b.totalIncome || 0,
    totalExpense: b.totalExpense || 0,
    totalProfit: b.totalProfit || 0,
  };
});

// 进销存支出汇总行（金 / 钻石 / 费用）
const inoutRows = computed(() => {
  const io = summary.inout || {};
  const rows = [];
  if (io.gold) {
    rows.push({
      label: '金',
      inAmount: io.gold.inAmount || 0,
      outAmount: io.gold.outAmount || 0,
      inWeight: io.gold.inWeight || 0,
      outWeight: io.gold.outWeight || 0,
      inCarat: 0,
      outCarat: 0,
    });
  }
  if (io.diamond) {
    rows.push({
      label: '钻石',
      inAmount: io.diamond.inAmount || 0,
      outAmount: io.diamond.outAmount || 0,
      inWeight: 0,
      outWeight: 0,
      inCarat: io.diamond.inCarat || 0,
      outCarat: io.diamond.outCarat || 0,
    });
  }
  if (io.expense) {
    rows.push({
      label: '费用',
      inAmount: io.expense.inAmount || 0,
      outAmount: io.expense.outAmount || 0,
      inWeight: 0,
      outWeight: 0,
      inCarat: 0,
      outCarat: 0,
    });
  }
  return rows;
});

const fmt = (val, digits = 2) => {
  const n = Number(val || 0);
  return n.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

// 顶部日期区间标签
const dateRangeLabel = computed(() => {
  if (dateType.value === 'all') return '全部';
  if (dateType.value === 'today') return '今天';
  if (dateType.value === 'month') return '本月';
  if (summary.startDate && summary.endDate) return `${summary.startDate} ~ ${summary.endDate}`;
  return '';
});

const buildParams = () => {
  const params = { dateType: dateType.value };
  if (dateType.value === 'custom' && customRange.value?.length === 2) {
    params.startDate = customRange.value[0];
    params.endDate = customRange.value[1];
  }
  if (filterCustomerId.value) params.customerId = String(filterCustomerId.value);
  return params;
};

const onDateTypeChange = () => {
  if (dateType.value !== 'custom') {
    loadData();
    loadOptions();
  }
};

const loadOptions = async () => {
  try {
    const res = await getLrTreeOptions({ dateType: dateType.value });
    options.customers = res?.data?.customers || [];
  } catch {
    options.customers = [];
  }
};

const loadData = async () => {
  if (dateType.value === 'custom') {
    if (!customRange.value || customRange.value.length !== 2) {
      ElMessage.warning('请选择日期范围');
      return;
    }
  }
  loading.value = true;
  try {
    const res = await getLrTreeSummary(buildParams());
    if (res?.success) {
      const d = res.data || {};
      summary.startDate = d.startDate || '';
      summary.endDate = d.endDate || '';
      summary.total = d.total || {};
      summary.byCustomer = d.byCustomer || [];
      summary.byColor = d.byColor || [];
      summary.byStone = d.byStone || [];
      Object.assign(laborData, d.labor || { saleLaborFee: 0, costLaborFee: 0, laborProfit: 0 });
      summary.inout = d.inout || {};
      summary.board = d.board || {};
    }
  } catch (e) {
    ElMessage.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

// 按客户汇总的合计行
const customerSummaryMethod = ({ columns, data }) => {
  const sums = [];
  columns.forEach((col, index) => {
    if (index === 0) { sums[index] = '合计'; return; }
    if (col.property === 'lrCount') { sums[index] = data.reduce((s, r) => s + (Number(r.lrCount) || 0), 0); return; }
    if (['saleAmount', 'costAmount', 'profit', 'goldProfit', 'diamondProfit', 'settingProfit', 'laborProfit', 'quantity'].includes(col.property)) {
      sums[index] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 100) / 100;
      return;
    }
    if (['netWeight', 'addLossWeight', 'foldedWeight'].includes(col.property)) {
      sums[index] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 1000) / 1000;
      return;
    }
    sums[index] = '';
  });
  return sums;
};

// 按成色汇总的合计行
const colorSummaryMethod = ({ columns, data }) => {
  const sums = [];
  columns.forEach((col, index) => {
    if (index === 0) { sums[index] = '合计'; return; }
    if (['netWeight', 'addLossWeight', 'foldedWeight', 'costFoldedWeight'].includes(col.property)) {
      sums[index] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 1000) / 1000;
      return;
    }
    if (['saleAmount', 'costAmount'].includes(col.property)) {
      sums[index] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 100) / 100;
      return;
    }
    sums[index] = '';
  });
  return sums;
};

// 钻石汇总合计（主石 + 副石）
const stoneSummaryMethod = ({ columns, data }) => {
  const sums = [];
  columns.forEach((col, index) => {
    if (index === 0) { sums[index] = '合计'; return; }
    if (col.property === 'saleQty') {
      sums[index] = data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0);
      return;
    }
    if (['saleCarat', 'costCarat'].includes(col.property)) {
      sums[index] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 1000) / 1000;
      return;
    }
    if (['saleAmount', 'costAmount', 'profit'].includes(col.property)) {
      sums[index] = Math.round(data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0) * 100) / 100;
      return;
    }
    sums[index] = '';
  });
  return sums;
};

// 进销存支出汇总的合计行（入/出金额、折算重、克拉）
const inoutSummaryMethod = ({ columns, data }) => {
  const sums = [];
  columns.forEach((col, index) => {
    if (index === 0) { sums[index] = '合计'; return; }
    if (['inAmount', 'outAmount'].includes(col.property)) {
      sums[index] = data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0);
      return;
    }
    // 净额列（无 property）
    if (col.label === '净额（入-出）') {
      sums[index] = data.reduce((s, r) => s + ((Number(r.inAmount) || 0) - (Number(r.outAmount) || 0)), 0);
      return;
    }
    if (['inWeight', 'outWeight', 'inCarat', 'outCarat'].includes(col.property)) {
      sums[index] = data.reduce((s, r) => s + (Number(r[col.property]) || 0), 0);
      return;
    }
    sums[index] = '';
  });
  return sums;
};

onMounted(() => {
  loadData();
  loadOptions();
});
</script>

<style scoped>
.page-container {
  background: #f0f4f9;
  padding: 16px;
  min-height: 100vh;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 12px 12px 0 0;
  flex-wrap: wrap;
  gap: 12px;
}
.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.page-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #e8ecf1;
}
.overview-card {
  background: #f8faff;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid #e8f0fe;
}
.card-label { font-size: 12px; color: #8a9aaa; }
.card-value { font-size: 18px; font-weight: 600; color: #1d2129; margin-top: 4px; }

/* 经营看板 */
.board-section {
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #e8ecf1;
}
.board-title {
  font-weight: 600;
  font-size: 15px;
  color: #1d2129;
  margin-bottom: 12px;
}
.board-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.board-group {
  background: #f8faff;
  border: 1px solid #e8f0fe;
  border-radius: 10px;
  padding: 14px 16px;
}
.board-group-total {
  background: linear-gradient(135deg, #fff7f0 0%, #fef0f0 100%);
  border-color: #fde2e2;
}
.board-group-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #e8ecf1;
}
.board-tip {
  font-size: 11px;
  font-weight: 400;
  color: #a8abb2;
}
.board-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}
.board-item-main {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px dashed #e8ecf1;
}
.board-label { font-size: 13px; color: #8a9aaa; }
.board-value { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
.board-value-main { font-size: 22px; font-weight: 700; }

.section {
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #e8ecf1;
}
.section-title {
  font-weight: 600;
  font-size: 15px;
  color: #1d2129;
  margin-bottom: 12px;
}

/* 工费汇总条 */
.labor-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.labor-item {
  flex: 1;
  min-width: 200px;
  padding: 14px 18px;
  background: #fdf6ec;
  border: 1px solid #f5dab1;
  border-radius: 6px;
}
.labor-label {
  font-size: 13px;
  color: #8c5a18;
  margin-bottom: 6px;
}
.labor-value {
  font-size: 20px;
  font-weight: 700;
}

@media (max-width: 768px) {
  .overview-cards { grid-template-columns: 1fr 1fr; }
  .board-grid { grid-template-columns: 1fr; }
}
</style>
