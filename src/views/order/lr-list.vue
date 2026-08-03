<!-- src/views/order/lr-list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📊 LR表管理</h2>
      <div style="display: flex; gap: 8px;">
        <el-button type="primary" @click="openGenerateDialog">
          <el-icon><Plus /></el-icon> 从账单生成LR表
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 统计 -->
    <el-row :gutter="12" style="margin-bottom: 16px;">
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #409EFF;">
          <div class="stat-number">{{ stats.total || 0 }}</div>
          <div class="stat-label">总计</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #E6A23C;">
          <div class="stat-number">{{ stats.draft || 0 }}</div>
          <div class="stat-label">编辑中</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #67C23A;">
          <div class="stat-number">{{ stats.confirmed || 0 }}</div>
          <div class="stat-label">已确认</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #F56C6C;">
          <div class="stat-number">¥{{ (stats.totalProfit || 0).toFixed(2) }}</div>
          <div class="stat-label">总利润</div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索 -->
    <div class="search-bar">
      <el-form :inline="true" :model="search" size="default">
        <el-form-item label="客户">
          <el-input v-model="search.customerName" placeholder="客户名称" clearable style="width: 160px;" />
        </el-form-item>
        <el-form-item label="成色">
          <el-select v-model="search.color" placeholder="全部成色" clearable style="width: 120px;">
            <el-option label="Au750" value="Au750" />
            <el-option label="Au755" value="Au755" />
            <el-option label="9K" value="9K" />
            <el-option label="14K" value="14K" />
            <el-option label="银" value="银" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="search.status" placeholder="全部状态" clearable style="width: 120px;">
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

    <!-- 表格 -->
    <el-table :data="tableData" v-loading="loading" border stripe>
      <el-table-column prop="id" label="ID" width="60" align="center" />
      <el-table-column prop="billNo" label="账单编号" width="160">
        <template #default="{ row }">
          <el-link type="primary" @click="viewBill(row.billId)">
            {{ row.billNo }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="color" label="成色" width="80" align="center" />
      <el-table-column prop="totalSale" label="销售总额" width="120" align="right">
        <template #default="{ row }">
          <span style="color:#67C23A;font-weight:bold;">¥{{ (row.totalSale || 0).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="totalCost" label="成本总额" width="120" align="right">
        <template #default="{ row }">
          <span style="color:#E6A23C;font-weight:bold;">¥{{ (row.totalCost || 0).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="profit" label="利润" width="120" align="right">
        <template #default="{ row }">
          <span :style="{ color: (row.profit || 0) >= 0 ? '#F56C6C' : '#909399', fontWeight: 'bold' }">
            ¥{{ (row.profit || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'confirmed' ? 'success' : 'warning'" size="small">
            {{ row.status === 'confirmed' ? '已确认' : '编辑中' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="editLr(row)">编辑</el-button>
          <el-button size="small" type="success" @click="viewBill(row.billId)">查看账单</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无LR表，请从账单生成" />

    <!-- 分页 -->
    <div style="margin-top:16px;display:flex;justify-content:flex-end;">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="loadData"
      />
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
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, RefreshRight, Plus } from '@element-plus/icons-vue';
import { getLrList, deleteLr, generateLr, getAvailableBillsForLr } from '@/api/lr';

const router = useRouter();
const loading = ref(false);
const billLoading = ref(false);
const generating = ref(false);
const tableData = ref([]);
const showGenerateDialog = ref(false);
const availableBills = ref([]);
const selectedBills = ref([]);

const search = reactive({
  customerName: '',
  color: '',
  status: '',
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const stats = reactive({
  total: 0,
  draft: 0,
  confirmed: 0,
  totalProfit: 0,
});

// ===== 加载LR表列表 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      customerName: search.customerName || undefined,
      color: search.color || undefined,
      status: search.status || undefined,
    };
    const res = await getLrList(params);
    const data = res?.data || [];
    tableData.value = data;
    pagination.total = data.length;

    let draft = 0, confirmed = 0, totalProfit = 0;
    data.forEach(item => {
      if (item.status === 'confirmed') confirmed++;
      else if (item.status === 'draft') draft++;
      totalProfit += item.profit || 0;
    });
    stats.total = data.length;
    stats.draft = draft;
    stats.confirmed = confirmed;
    stats.totalProfit = totalProfit;
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  search.customerName = '';
  search.color = '';
  search.status = '';
  pagination.current = 1;
  loadData();
};

// ===== ✅ 打开弹窗 =====
const openGenerateDialog = () => {
  showGenerateDialog.value = true;
  // 清空上次选中的
  selectedBills.value = [];
};

// ===== ✅ 加载可用账单（弹窗打开时调用） =====
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

// ===== 生成LR表 =====
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
        const res = await generateLr({ billId: bill.id });
        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (successCount > 0 && failCount === 0) {
      ElMessage.success(`成功生成 ${successCount} 个LR表`);
      showGenerateDialog.value = false;
      loadData();
    } else if (successCount > 0 && failCount > 0) {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
      loadData();
    } else {
      ElMessage.error('所有账单生成失败');
    }
  } catch {
    ElMessage.error('生成失败');
  } finally {
    generating.value = false;
  }
};

// ===== 编辑LR表 =====
const editLr = (row) => {
  router.push(`/order/lr/edit/${row.billId}`);
};

// ===== 查看账单 =====
const viewBill = (billId) => {
  router.push(`/order/bill/my-list`);
};

// ===== 删除 =====
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除LR表 ${row.billNo} 吗？`, '提示', { type: 'warning' });
    await deleteLr(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch {}
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }

.search-bar { background: #f5f7fa; padding: 16px 20px; border-radius: 6px; margin-bottom: 16px; }
.search-bar :deep(.el-form-item) { margin-bottom: 0; }

.stat-card { background: #fafafa; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #ddd; }
.stat-card .stat-number { font-size: 22px; font-weight: bold; color: #303133; }
.stat-card .stat-label { font-size: 13px; color: #909399; margin-top: 4px; }

:deep(.el-dialog__body) { padding-top: 16px; }
</style>