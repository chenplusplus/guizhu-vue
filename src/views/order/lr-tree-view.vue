<!-- src/views/order/lr-tree-view.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()" plain>
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>🌳 LR表树形汇总</h2>
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
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button @click="expandAll = !expandAll; toggleExpandAll()">
          {{ expandAll ? '收起全部' : '展开全部' }}
        </el-button>
      </div>
    </div>

    <!-- 筛选栏：客户 / 品名 / 成色 -->
    <div class="filter-bar">
      <div class="filter-item">
        <span class="filter-label">客户</span>
        <el-select
          v-model="filters.customerIds"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          filterable
          placeholder="全部客户"
          style="width:220px;"
        >
          <el-option
            v-for="c in options.customers"
            :key="c.customerId"
            :label="c.customerName"
            :value="c.customerId"
          />
        </el-select>
      </div>
      <div class="filter-item">
        <span class="filter-label">品名</span>
        <el-select
          v-model="filters.products"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          filterable
          placeholder="全部品名"
          style="width:220px;"
        >
          <el-option
            v-for="p in options.products"
            :key="p"
            :label="p"
            :value="p"
          />
        </el-select>
      </div>
      <div class="filter-item">
        <span class="filter-label">成色</span>
        <el-select
          v-model="filters.colors"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          filterable
          placeholder="全部成色"
          style="width:180px;"
        >
          <el-option
            v-for="c in options.colors"
            :key="c"
            :label="c"
            :value="c"
          />
        </el-select>
      </div>
      <el-button type="primary" plain @click="loadData">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <!-- 总览卡片（销售额 / 成本 / 利润 / 件数 / 净重） -->
    <div class="overview-cards">
      <div class="overview-card">
        <div class="card-icon" style="background:#ecf5ff;color:#409EFF;">
          <el-icon><OfficeBuilding /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-label">客户数</div>
          <div class="card-value">{{ summary.customerCount || 0 }}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon" style="background:#f0f9ff;color:#67C23A;">
          <el-icon><Goods /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-label">总件数</div>
          <div class="card-value">{{ summary.quantity || 0 }}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon" style="background:#fdf6ec;color:#E6A23C;">
          <el-icon><Money /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-label">销售额</div>
          <div class="card-value" style="color:#E6A23C;">
            ¥{{ (summary.saleAmount || 0).toFixed(2) }}
          </div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon" style="background:#fef0f0;color:#F56C6C;">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-label">成本</div>
          <div class="card-value" style="color:#F56C6C;">
            ¥{{ (summary.costAmount || 0).toFixed(2) }}
          </div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon" style="background:#f0f9eb;color:#67C23A;">
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-label">利润</div>
          <div class="card-value" :style="{ color: (summary.profit || 0) >= 0 ? '#F56C6C' : '#67C23A' }">
            ¥{{ (summary.profit || 0).toFixed(2) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 树形结构 -->
    <div class="tree-wrapper">
      <el-tree
        ref="treeRef"
        :data="treeData"
        :props="treeProps"
        node-key="nodeKey"
        :default-expand-all="expandAll"
        :expand-on-click-node="false"
        class="lr-tree"
      >
        <template #default="{ data }">
          <!-- 客户节点 -->
          <div v-if="data.nodeType === 'customer'" class="tree-node customer-node">
            <div class="node-left">
              <el-icon class="node-icon" style="color:#409EFF;"><OfficeBuilding /></el-icon>
              <span class="node-title">{{ data.customerName }}</span>
              <el-tag size="small" type="info">{{ data.detailCount }} 条明细</el-tag>
            </div>
            <div class="node-right">
              <span class="metric">件数 <b>{{ data.quantity }}</b></span>
              <span class="metric">净重 <b>{{ (data.netWeight || 0).toFixed(3) }}g</b></span>
              <span class="metric sale">销售 <b>¥{{ (data.saleAmount || 0).toFixed(2) }}</b></span>
              <span class="metric cost">成本 <b>¥{{ (data.costAmount || 0).toFixed(2) }}</b></span>
              <span class="metric" :class="data.profit >= 0 ? 'profit-up' : 'profit-down'">
                利润 <b>¥{{ (data.profit || 0).toFixed(2) }}</b>
              </span>
            </div>
          </div>

          <!-- 明细节点（销售行 / 成本行） -->
          <div v-else class="tree-node detail-node" :class="data.rowType === 'sale' ? 'sale-node' : 'cost-node'">
            <div class="node-left">
              <el-tag v-if="data.rowType === 'sale'" size="small" type="success">销售</el-tag>
              <el-tag v-else size="small" type="warning">成本</el-tag>
              <span class="detail-order-no">{{ data.serialNo || data.billNo }}</span>
              <span class="detail-product">{{ data.productName }}</span>
              <el-tag v-if="data.diamondLevel" size="small" type="info">{{ data.diamondLevel }}</el-tag>
              <el-tag v-if="data.color" size="small">{{ data.color }}</el-tag>
              <el-tag v-if="data.size" size="small" type="info">手寸 {{ data.size }}</el-tag>
            </div>
            <div class="node-right">
              <span class="metric">件数 <b>{{ data.quantity }}</b></span>
              <span class="metric">净重 <b>{{ (data.netWeight || 0).toFixed(3) }}g</b></span>
              <span class="metric">加耗重 <b>{{ (data.addLossWeight || 0).toFixed(3) }}g</b></span>
              <span class="metric">金料费 <b>¥{{ (data.goldMaterialFee || 0).toFixed(2) }}</b></span>
              <span class="metric">工费 <b>¥{{ (data.laborFee || 0).toFixed(2) }}</b></span>
              <span class="metric" :class="data.rowType === 'sale' ? 'sale' : 'cost'">
                {{ data.rowType === 'sale' ? '销售金额' : '成本金额' }}
                <b>¥{{ (data.totalAmount || 0).toFixed(2) }}</b>
              </span>
            </div>
          </div>
        </template>
      </el-tree>

      <el-empty v-if="!loading && treeData.length === 0" description="该时间段暂无LR表" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import {
  ArrowLeft, Refresh, OfficeBuilding, Money, Goods, TrendCharts
} from '@element-plus/icons-vue';
import { getLrTree, getLrTreeOptions } from '@/api/lr';

const loading = ref(false);
const dateType = ref('all');
const customRange = ref([]);
const treeData = ref([]);
const treeRef = ref();
const expandAll = ref(true);

// ===== 筛选 =====
const filters = reactive({
  customerIds: [],
  products: [],
  colors: [],
});
const options = reactive({
  customers: [],
  products: [],
  colors: [],
});

const summary = reactive({
  customerCount: 0,
  quantity: 0,
  saleAmount: 0,
  costAmount: 0,
  profit: 0,
  startDate: '',
  endDate: '',
});

// 顶部日期区间标签
const dateRangeLabel = computed(() => {
  if (dateType.value === 'all') return '全部';
  if (dateType.value === 'today') return '今天';
  if (dateType.value === 'month') return '本月';
  if (summary.startDate && summary.endDate) return `${summary.startDate} ~ ${summary.endDate}`;
  return '';
});

const treeProps = {
  children: 'children',
  label: 'label',
};

// ===== 后端树 → el-tree 需要的 children 结构 =====
const buildTree = (raw) => {
  return (raw || []).map((cust, cIdx) => {
    const details = cust.children || [];
    return {
      nodeKey: `c-${cust.customerId}`,
      nodeType: 'customer',
      label: cust.customerName,
      customerName: cust.customerName,
      detailCount: cust.detailCount,
      quantity: cust.quantity,
      saleAmount: cust.saleAmount,
      costAmount: cust.costAmount,
      profit: cust.profit,
      netWeight: cust.netWeight,
      addLossWeight: cust.addLossWeight,
      children: details.map((d, dIdx) => ({
        nodeKey: `c-${cust.customerId}-d-${dIdx}`,
        nodeType: 'detail',
        label: d.productName,
        ...d,
      })),
    };
  });
};

const onDateTypeChange = () => {
  if (dateType.value !== 'custom') {
    loadData();
    loadOptions();
  }
};

// ===== 加载筛选项 =====
const buildOptionsParams = () => {
  const params = { dateType: dateType.value };
  if (dateType.value === 'custom' && customRange.value?.length === 2) {
    params.startDate = customRange.value[0];
    params.endDate = customRange.value[1];
  }
  return params;
};

const loadOptions = async () => {
  try {
    const res = await getLrTreeOptions(buildOptionsParams());
    const data = res?.data || {};
    options.customers = data.customers || [];
    options.products = data.products || [];
    options.colors = data.colors || [];
  } catch (e) {
    options.customers = [];
    options.products = [];
    options.colors = [];
  }
};

const resetFilters = () => {
  filters.customerIds = [];
  filters.products = [];
  filters.colors = [];
  loadData();
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
    const params = { dateType: dateType.value };
    if (dateType.value === 'custom') {
      params.startDate = customRange.value[0];
      params.endDate = customRange.value[1];
    }
    if (filters.customerIds.length) params.customerId = filters.customerIds.join(',');
    if (filters.products.length) params.productName = filters.products.join(',');
    if (filters.colors.length) params.color = filters.colors.join(',');

    const res = await getLrTree(params);
    if (res?.success) {
      const payload = res.data || {};
      treeData.value = buildTree(payload.tree || []);
      Object.assign(summary, {
        customerCount: payload.summary?.customerCount ?? 0,
        quantity: payload.summary?.quantity ?? 0,
        saleAmount: payload.summary?.saleAmount ?? 0,
        costAmount: payload.summary?.costAmount ?? 0,
        profit: payload.summary?.profit ?? 0,
        startDate: payload.startDate || '',
        endDate: payload.endDate || '',
      });
      await nextTick();
      if (expandAll.value && treeRef.value) {
        const nodes = treeRef.value.store._getAllNodes();
        nodes.forEach((n) => (n.expanded = true));
      }
    }
  } catch (e) {
    ElMessage.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

const toggleExpandAll = async () => {
  await nextTick();
  if (!treeRef.value) return;
  const nodes = treeRef.value.store._getAllNodes();
  nodes.forEach((n) => (n.expanded = expandAll.value));
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

/* ===== 筛选栏 ===== */
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: #fff;
  padding: 12px 24px;
  border-bottom: 1px solid #e8ecf1;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #e8ecf1;
}
.overview-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8faff;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid #e8f0fe;
}
.card-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.card-label { font-size: 12px; color: #8a9aaa; }
.card-value { font-size: 18px; font-weight: 600; color: #1d2129; }

.tree-wrapper {
  background: #fff;
  border-radius: 0 0 12px 12px;
  padding: 16px 24px 24px;
}
.lr-tree {
  background: transparent;
}
:deep(.el-tree-node__content) {
  height: auto;
  min-height: 44px;
  border-bottom: 1px solid #f0f2f5;
  padding: 4px 0;
}
:deep(.el-tree-node__content:hover) {
  background: #f5f9ff;
}
:deep(.el-tree-node__expand-icon) {
  font-size: 16px;
  color: #606266;
}

.tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 12px;
  gap: 16px;
  flex-wrap: wrap;
}
.node-left, .node-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.node-icon { font-size: 16px; }
.node-title { font-weight: 600; font-size: 14px; color: #1d2129; }

.customer-node .node-title { font-size: 15px; color: #409EFF; }

.detail-node { padding-left: 4px; }
.detail-order-no {
  font-family: monospace;
  font-size: 12px;
  color: #409EFF;
  background: #ecf5ff;
  padding: 2px 8px;
  border-radius: 4px;
}
.detail-product {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}

/* 销售行白底 / 成本行蓝底（铺满整行） */
.sale-node {
  background: #ffffff;
}
.cost-node {
  background: #e8f0fe;
}

/* 让成本行的整个 el-tree 行（含展开图标、缩进区域）都变蓝 */
:deep(.el-tree-node__content:has(.cost-node)) {
  background: #e8f0fe;
}
:deep(.el-tree-node__content:has(.cost-node):hover) {
  background: #d9e4f8;
}

.metric { font-size: 12px; color: #909399; }
.metric b { color: #303133; font-weight: 600; margin-left: 2px; }
.metric.sale b { color: #E6A23C; font-size: 13px; }
.metric.cost b { color: #F56C6C; font-size: 13px; }
.profit-up b { color: #F56C6C; }
.profit-down b { color: #67C23A; }

@media (max-width: 768px) {
  .overview-cards { grid-template-columns: 1fr; }
  .tree-node { flex-direction: column; align-items: flex-start; }
}
</style>
