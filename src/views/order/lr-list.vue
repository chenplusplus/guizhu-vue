<!-- src/views/order/lr-list.vue -->
<template>
  <div class="page-container">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <h2>📊 LR表管理</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <el-button type="primary" @click="openGenerateDialog">
          <el-icon><Plus /></el-icon> 从账单生成LR表
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- ===== 左树右列布局 ===== -->
    <div class="main-layout">
      <!-- ===== 左侧客户树 ===== -->
      <div class="left-tree">
        <div class="tree-header">
          <span class="tree-title">📂 客户列表</span>
          <span class="tree-count">{{ customerTree.length }} 个客户</span>
        </div>
        <el-tree
          ref="treeRef"
          :data="customerTree"
          :props="{ label: 'customerName', value: 'customerId' }"
          node-key="customerId"
          highlight-current
          default-expand-all
          @node-click="handleNodeClick"
        >
          <template #default="{ node, data }">
            <span class="tree-node">
              <span class="node-label">{{ data.customerName }}</span>
              <span class="node-count">{{ data.count }}</span>
            </span>
          </template>
        </el-tree>
        <div class="tree-footer" @click="selectAll">
          <span>📋 全部客户</span>
          <span class="tree-count">{{ totalCount }}</span>
        </div>
      </div>

      <!-- ===== 右侧内容 ===== -->
      <div class="right-content">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <el-form :inline="true" :model="search" size="default">
            <el-form-item label="成色">
              <el-select v-model="search.color" placeholder="全部成色" clearable style="width: 120px;" @change="loadData">
                <el-option label="18K" value="18K" />
                <el-option label="14K" value="14K" />
                <el-option label="9K" value="9K" />
                <el-option label="PT" value="PT" />
                <el-option label="银" value="银" />
                <el-option label="铜" value="铜" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="search.status" placeholder="全部状态" clearable style="width: 120px;" @change="loadData">
                <el-option label="编辑中" value="draft" />
                <el-option label="已确认" value="confirmed" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadData">
                <el-icon><Search /></el-icon> 查询
              </el-button>
              <el-button @click="resetSearch">
                <el-icon><RefreshRight /></el-icon> 重置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- ===== 汇总卡片（小尺寸） ===== -->
        <div class="summary-cards">
          <!-- 第一行：利润汇总 -->
          <div class="summary-row">
            <div class="summary-card">
              <span class="card-label">📊 总利润</span>
              <span class="card-value" style="color:#F56C6C;">¥{{ summary.totalProfit.toFixed(2) }}</span>
            </div>
            <div class="summary-card">
              <span class="card-label">💎 钻石利润</span>
              <span class="card-value">¥{{ summary.diamondProfit.toFixed(2) }}</span>
            </div>
            <div class="summary-card">
              <span class="card-label">🔧 镶石利润</span>
              <span class="card-value">¥{{ summary.settingProfit.toFixed(2) }}</span>
            </div>
            <div class="summary-card">
              <span class="card-label">🛠 工费利润</span>
              <span class="card-value">¥{{ summary.laborProfit.toFixed(2) }}</span>
            </div>
          </div>
          <!-- 第二行：净重 + 加耗重（按成色） -->
          <div class="summary-row">
            <div class="summary-card" style="flex:1.4;">
              <span class="card-label">📦 累计净重出货</span>
              <div class="color-group">
                <span v-for="(val, key) in summary.netWeightByColor" :key="key" class="color-tag">
                  {{ key }}: {{ val.toFixed(3) }}g
                </span>
                <span v-if="Object.keys(summary.netWeightByColor).length === 0" style="color:#bbb;">暂无数据</span>
              </div>
            </div>
            <div class="summary-card" style="flex:1.4;">
              <span class="card-label">📦 累计加耗重出货</span>
              <div class="color-group">
                <span v-for="(val, key) in summary.addLossByColor" :key="key" class="color-tag">
                  {{ key }}: {{ val.toFixed(3) }}g
                </span>
                <span v-if="Object.keys(summary.addLossByColor).length === 0" style="color:#bbb;">暂无数据</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== 表格 ===== -->
        <el-table
          :data="tableData"
          v-loading="loading"
          border
          stripe
          style="width:100%;"
          @row-click="viewDetail"
          row-key="id"
        >
          <el-table-column prop="billNo" label="账单编号" width="160">
            <template #default="{ row }">
              <el-link type="primary" @click.stop="viewDetail(row)">
                {{ row.billNo }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="customerName" label="客户" width="120" />
          <el-table-column prop="color" label="成色" width="70" align="center" />
          <el-table-column prop="totalSale" label="销售额" width="110" align="right">
            <template #default="{ row }">¥{{ (row.totalSale || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="totalCost" label="成本" width="110" align="right">
            <template #default="{ row }">¥{{ (row.totalCost || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="profit" label="利润" width="110" align="right">
            <template #default="{ row }">
              <span :style="{ color: (row.profit || 0) >= 0 ? '#F56C6C' : '#909399', fontWeight: 'bold' }">
                ¥{{ (row.profit || 0).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="diamondProfit" label="钻石利润" width="110" align="right">
            <template #default="{ row }">¥{{ (row.diamondProfit || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="settingProfit" label="镶石利润" width="110" align="right">
            <template #default="{ row }">¥{{ (row.settingProfit || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="laborProfit" label="工费利润" width="110" align="right">
            <template #default="{ row }">¥{{ (row.laborProfit || 0).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="netWeight" label="净重" width="90" align="right">
            <template #default="{ row }">{{ (row.netWeight || 0).toFixed(3) }}g</template>
          </el-table-column>
          <el-table-column prop="addLossWeight" label="加耗重" width="90" align="right">
            <template #default="{ row }">{{ (row.addLossWeight || 0).toFixed(3) }}g</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'confirmed' ? 'success' : 'warning'" size="small">
                {{ row.status === 'confirmed' ? '已确认' : '编辑中' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="160">
            <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" align="center" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" @click.stop="editLr(row)">编辑</el-button>
              <el-button size="small" type="danger" @click.stop="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!loading && tableData.length === 0" description="暂无LR表" />

        <!-- 分页 -->
        <div style="margin-top:16px;display:flex;justify-content:flex-end;">
          <el-pagination
            v-model:current-page="pagination.current"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadData"
            @current-change="loadData"
          />
        </div>
      </div>
    </div>

    <!-- ===== 生成LR表弹窗 ===== -->
    <el-dialog
      v-model="showGenerateDialog"
      title="从账单生成LR表"
      width="700px"
      destroy-on-close
      @open="loadAvailableBills"
    >
      <el-alert
        title="选择需要生成LR表的账单（已确认且未生成LR表的账单）"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:16px;"
      />
      <el-table
        :data="availableBills"
        v-loading="billLoading"
        border
        stripe
        @selection-change="handleBillSelection"
        max-height="400"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="billNo" label="账单编号" width="160" />
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column prop="color" label="成色" width="80" />
        <el-table-column prop="totalAmount" label="总金额" width="120" align="right">
          <template #default="{ row }">¥{{ (row.totalAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <div style="margin-top:12px;color:#999;font-size:13px;">
        已选 <b style="color:#409EFF;">{{ selectedBills.length }}</b> 个账单
      </div>
      <template #footer>
        <el-button @click="showGenerateDialog = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleGenerateLr"
          :loading="generating"
          :disabled="selectedBills.length === 0"
        >
          生成LR表
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, RefreshRight, Plus } from '@element-plus/icons-vue';
import { getLrList, deleteLr, generateLr, getAvailableBillsForLr, getLrCustomers } from '@/api/lr';

const router = useRouter();
const treeRef = ref();
const loading = ref(false);
const billLoading = ref(false);
const generating = ref(false);
const tableData = ref([]);
const allData = ref([]);
const customerTree = ref([]);
const showGenerateDialog = ref(false);
const availableBills = ref([]);
const selectedBills = ref([]);
const selectedCustomerId = ref(null);
const totalCount = ref(0);

const search = reactive({
  color: '',
  status: '',
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

// ===== 汇总计算 =====
const summary = computed(() => {
  const list = tableData.value;
  if (!list.length) {
    return {
      totalProfit: 0,
      diamondProfit: 0,
      settingProfit: 0,
      laborProfit: 0,
      netWeightByColor: {},
      addLossByColor: {},
    };
  }

  const netWeightByColor = {};
  const addLossByColor = {};

  list.forEach(item => {
    const color = item.color || '其他';
    netWeightByColor[color] = (netWeightByColor[color] || 0) + (item.netWeight || 0);
    addLossByColor[color] = (addLossByColor[color] || 0) + (item.addLossWeight || 0);
  });

  // 按成色排序
  const colorOrder = ['18K', '14K', '9K', 'PT', '银', '铜'];
  const sortColors = (obj) => {
    const sorted = {};
    colorOrder.forEach(c => {
      if (obj[c] !== undefined) sorted[c] = obj[c];
    });
    Object.keys(obj).forEach(c => {
      if (!sorted[c]) sorted[c] = obj[c];
    });
    return sorted;
  };

  return {
    totalProfit: list.reduce((s, r) => s + (r.profit || 0), 0),
    diamondProfit: list.reduce((s, r) => s + (r.diamondProfit || 0), 0),
    settingProfit: list.reduce((s, r) => s + (r.settingProfit || 0), 0),
    laborProfit: list.reduce((s, r) => s + (r.laborProfit || 0), 0),
    netWeightByColor: sortColors(netWeightByColor),
    addLossByColor: sortColors(addLossByColor),
  };
});

// ===== 加载客户树 =====
const loadCustomers = async () => {
  try {
    const res = await getLrCustomers();
    const data = res?.data || [];
    customerTree.value = data.map(item => ({
      ...item,
      count: item.count || 0,
    }));
    totalCount.value = data.reduce((s, r) => s + (r.count || 0), 0);
  } catch {
    customerTree.value = [];
  }
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      customerId: selectedCustomerId.value || undefined,
      color: search.color || undefined,
      status: search.status || undefined,
    };
    const res = await getLrList(params);
    const data = res?.data || [];
    allData.value = data;
    tableData.value = data;
    pagination.total = data.length;
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  search.color = '';
  search.status = '';
  selectedCustomerId.value = null;
  treeRef.value?.setCurrentKey(null);
  pagination.current = 1;
  loadData();
};

// ===== 树节点点击 =====
const handleNodeClick = (data) => {
  selectedCustomerId.value = data.customerId;
  pagination.current = 1;
  loadData();
};

const selectAll = () => {
  selectedCustomerId.value = null;
  treeRef.value?.setCurrentKey(null);
  pagination.current = 1;
  loadData();
};

// ===== 查看详情（跳转编辑页） =====
const viewDetail = (row) => {
  router.push(`/order/lr/edit/${row.billId}`);
};

const editLr = (row) => {
  router.push(`/order/lr/edit/${row.billId}`);
};

// ===== 删除 =====
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除LR表 ${row.billNo} 吗？`, '提示', { type: 'warning' });
    await deleteLr(row.id);
    ElMessage.success('删除成功');
    loadData();
    loadCustomers();
  } catch {}
};

// ===== 生成LR表弹窗 =====
const openGenerateDialog = () => {
  showGenerateDialog.value = true;
  selectedBills.value = [];
};

const loadAvailableBills = async () => {
  billLoading.value = true;
  try {
    const res = await getAvailableBillsForLr();
    availableBills.value = res?.data || [];
    if (availableBills.value.length === 0) {
      ElMessage.info('没有可生成LR表的账单');
    }
  } catch {
    ElMessage.error('加载账单失败');
  } finally {
    billLoading.value = false;
  }
};

const handleBillSelection = (selection) => {
  selectedBills.value = selection;
};

const handleGenerateLr = async () => {
  if (selectedBills.value.length === 0) {
    ElMessage.warning('请至少选择一个账单');
    return;
  }

  generating.value = true;
  try {
    let successCount = 0;
    let failCount = 0;

    for (const bill of selectedBills.value) {
      try {
        const res = await generateLr({ billId: bill.billId });
        if (res.success) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0 && failCount === 0) {
      ElMessage.success(`成功生成 ${successCount} 个LR表`);
      showGenerateDialog.value = false;
      loadData();
      loadCustomers();
    } else if (successCount > 0 && failCount > 0) {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
      loadData();
      loadCustomers();
    } else {
      ElMessage.error('所有账单生成失败');
    }
  } catch {
    ElMessage.error('生成失败');
  } finally {
    generating.value = false;
  }
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

// ===== 初始化 =====
onMounted(() => {
  loadCustomers();
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
}
.page-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

/* ===== 左树右列布局 ===== */
.main-layout {
  display: flex;
  gap: 16px;
  min-height: 500px;
}

/* ===== 左侧树 ===== */
.left-tree {
  width: 220px;
  min-width: 180px;
  background: #f8faff;
  border-radius: 8px;
  border: 1px solid #e8f0fe;
  padding: 12px 0;
  max-height: 700px;
  overflow-y: auto;
  flex-shrink: 0;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 14px 10px 14px;
  border-bottom: 1px solid #e8f0fe;
}
.tree-title {
  font-weight: 600;
  font-size: 14px;
  color: #1d2129;
}
.tree-count {
  font-size: 12px;
  color: #8a9aaa;
  background: #ecf5ff;
  padding: 0 8px;
  border-radius: 10px;
}

:deep(.el-tree) {
  background: transparent;
  padding: 4px 0;
}
:deep(.el-tree-node__content) {
  height: 36px;
  padding: 0 14px;
  border-radius: 4px;
  margin: 1px 6px;
}
:deep(.el-tree-node__content:hover) {
  background: #e8f0fe;
}
:deep(.el-tree-node__content.is-current) {
  background: #d9ecff;
}

.tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-size: 13px;
}
.node-label {
  color: #303133;
}
.node-count {
  font-size: 11px;
  color: #8a9aaa;
  background: #ecf5ff;
  padding: 0 8px;
  border-radius: 10px;
}

.tree-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px 0 14px;
  margin: 4px 6px 0 6px;
  border-top: 1px solid #e8f0fe;
  cursor: pointer;
  font-size: 13px;
  color: #409EFF;
  font-weight: 500;
}
.tree-footer:hover {
  color: #66b1ff;
}

/* ===== 右侧内容 ===== */
.right-content {
  flex: 1;
  min-width: 0;
}

.search-bar {
  background: #f8faff;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  border: 1px solid #e8f0fe;
}
.search-bar :deep(.el-form-item) {
  margin-bottom: 0;
}

/* ===== 汇总卡片 ===== */
.summary-cards {
  background: #f8faff;
  border-radius: 8px;
  border: 1px solid #e8f0fe;
  padding: 10px 14px;
  margin-bottom: 12px;
}

.summary-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.summary-row + .summary-row {
  margin-top: 8px;
}

.summary-card {
  flex: 1;
  min-width: 100px;
  background: #fff;
  border-radius: 6px;
  padding: 8px 12px;
  border: 1px solid #e8f0fe;
}
.summary-card .card-label {
  display: block;
  font-size: 12px;
  color: #8a9aaa;
}
.summary-card .card-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
  margin-top: 2px;
}

.color-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 2px;
}
.color-tag {
  font-size: 12px;
  color: #303133;
  background: #ecf5ff;
  padding: 0 6px;
  border-radius: 3px;
}

/* ===== 表格 ===== */
:deep(.el-table .el-table__row) {
  cursor: pointer;
}
:deep(.el-table .cell) {
  padding: 4px 6px;
}

/* ===== 滚动条 ===== */
.left-tree::-webkit-scrollbar {
  width: 4px;
}
.left-tree::-webkit-scrollbar-thumb {
  background: #d4e2f0;
  border-radius: 2px;
}
.left-tree::-webkit-scrollbar-track {
  background: transparent;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
  }
  .left-tree {
    width: 100%;
    max-height: 200px;
  }
}
</style>