<!-- src/views/order/bill-my-list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📄 我的账单</h2>
      <el-button type="primary" @click="loadData">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <!-- 搜索 -->
    <div class="search-bar">
      <el-form :inline="true" :model="search" size="default">
        <el-form-item label="状态">
          <el-select v-model="search.status" placeholder="全部状态" clearable style="width: 140px;">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
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

    <!-- 统计 -->
    <el-row :gutter="12" style="margin-bottom: 16px;">
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #E6A23C;">
          <div class="stat-number">{{ statusCount.pending || 0 }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #409EFF;">
          <div class="stat-number">{{ statusCount.approved || 0 }}</div>
          <div class="stat-label">待确认</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #67C23A;">
          <div class="stat-number">{{ statusCount.confirmed || 0 }}</div>
          <div class="stat-label">已确认</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #F56C6C;">
          <div class="stat-number">{{ statusCount.rejected || 0 }}</div>
          <div class="stat-label">已驳回</div>
        </div>
      </el-col>
    </el-row>

    <!-- 表格 -->
    <el-table :data="tableData" v-loading="loading" border stripe row-key="id">
      <el-table-column prop="billNo" label="账单编号" width="160">
        <template #default="{ row }">
          <el-link type="primary" @click="viewDetail(row.id)">
            {{ row.billNo }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="orderNo" label="订单号" width="140" />
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="totalQuantity" label="件数" width="70" align="center" />
      <el-table-column prop="totalAmount" label="总金额" width="120" align="right">
        <template #default="{ row }">
          <span style="color:#E6A23C;font-weight:bold;">
            ¥{{ (row.totalAmount || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="viewDetail(row.id)">
            查看
          </el-button>
          <el-button
            v-if="row.status === 'approved'"
            size="small"
            type="success"
            @click="handleConfirm(row)"
          >
            确认
          </el-button>
          <el-button
            v-if="row.status === 'approved'"
            size="small"
            type="danger"
            @click="handleReject(row)"
          >
            退回
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无账单" />

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

    <!-- 账单详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="`账单详情 - ${detailData?.billNo || ''}`" width="92%" top="5vh" destroy-on-close>
      <div v-loading="detailLoading">
        <el-descriptions :column="4" border>
          <el-descriptions-item label="账单编号">{{ detailData?.billNo }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ detailData?.customerName }}</el-descriptions-item>
          <el-descriptions-item label="成色">{{ detailData?.color || '-' }}</el-descriptions-item>
          <el-descriptions-item label="账单日期">{{ formatDate(detailData?.billDate) }}</el-descriptions-item>
          <el-descriptions-item label="总件数">{{ detailData?.totalQuantity || 0 }}</el-descriptions-item>
          <el-descriptions-item label="总金额" span="3">
            <span style="color:#E6A23C;font-size:18px;font-weight:bold;">
              ¥{{ (detailData?.totalAmount || 0).toFixed(2) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(detailData?.status)">
              {{ getStatusText(detailData?.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(detailData?.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="审核时间">{{ formatDate(detailData?.auditedAt) || '-' }}</el-descriptions-item>
          <el-descriptions-item label="确认时间">{{ formatDate(detailData?.confirmedAt) || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">📋 出货明细</el-divider>
        <el-table :data="detailDetails" border stripe size="small" max-height="350">
          <el-table-column prop="seqNo" label="序号" width="60" align="center" />
          <el-table-column prop="productName" label="品名" min-width="100" />
          <el-table-column prop="customerName" label="客户" width="100" />
          <el-table-column prop="color" label="颜色" width="70" />
          <el-table-column prop="quantity" label="件数" width="60" align="center" />
          <el-table-column prop="netWeight" label="净重" width="80" align="right" />
          <el-table-column prop="goldPrice" label="金价" width="80" align="right" />
          <el-table-column prop="goldMaterialFee" label="足金料" width="90" align="right" />
          <el-table-column prop="mainStoneAmount" label="主石" width="90" align="right" />
          <el-table-column prop="subStoneAmount" label="副石" width="90" align="right" />
          <el-table-column prop="laborFee" label="工费" width="80" align="right" />
          <el-table-column prop="totalAmount" label="金额" width="100" align="right">
            <template #default="{ row }">
              <span style="color:#E6A23C;font-weight:bold;">{{ row.totalAmount }}</span>
            </template>
          </el-table-column>
        </el-table>

        <!-- LR表 -->
        <el-divider content-position="left" v-if="detailLrRows.length > 0">📊 支出收入LR表</el-divider>
        <el-table v-if="detailLrRows.length > 0" :data="detailLrRows" border stripe size="small" max-height="300">
          <el-table-column prop="seqDisplay" label="序" width="60" align="center" />
          <el-table-column prop="productName" label="品名" min-width="100" />
          <el-table-column prop="customerName" label="客户" width="100" />
          <el-table-column prop="color" label="颜色" width="70" />
          <el-table-column prop="netWeight" label="净重" width="80" align="right" />
          <el-table-column prop="goldMaterialFee" label="足金料" width="90" align="right" />
          <el-table-column prop="totalAmount" label="金额" width="100" align="right" />
          <el-table-column label="类型" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.rowType === 'sale' ? 'primary' : 'info'" size="small">
                {{ row.rowType === 'sale' ? '销售' : '成本' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="detailLrRows.length > 0" style="margin-top:12px;text-align:right;font-size:14px;padding:12px;background:#f5f7fa;border-radius:4px;">
          <span>销售总额：<b style="color:#67C23A;">¥{{ (detailLrSummary?.totalSale || 0).toFixed(2) }}</b></span>
          <span style="margin-left:24px;">成本总额：<b style="color:#E6A23C;">¥{{ (detailLrSummary?.totalCost || 0).toFixed(2) }}</b></span>
          <span style="margin-left:24px;">利润：<b style="color:#F56C6C;">¥{{ (detailLrSummary?.profit || 0).toFixed(2) }}</b></span>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button
          v-if="detailData?.status === 'approved'"
          type="success"
          @click="handleConfirm(detailData)"
        >
          确认账单
        </el-button>
        <el-button
          v-if="detailData?.status === 'approved'"
          type="danger"
          @click="handleReject(detailData)"
        >
          退回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue';
import { getBillList, getBillDetail, confirmBill, rejectBill } from '@/api/bill';

const loading = ref(false);
const detailLoading = ref(false);
const tableData = ref([]);
const detailVisible = ref(false);
const detailData = ref(null);
const detailDetails = ref([]);
const detailLrRows = ref([]);
const detailLrSummary = ref({});

const search = reactive({
  status: '',
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const statusCount = ref({
  pending: 0,
  approved: 0,
  rejected: 0,
  confirmed: 0,
});

// ===== 状态映射 =====
const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  confirmed: { text: '已确认', type: 'success' },
};

const getStatusText = (status) => statusMap[status]?.text || status || '-';
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      status: search.status || undefined,
    };
    const res = await getBillList(params);
    const data = res?.data || [];
    tableData.value = data;
    pagination.total = data.length;

    const stats = { pending: 0, approved: 0, rejected: 0, confirmed: 0 };
    data.forEach(item => {
      if (stats[item.status] !== undefined) {
        stats[item.status]++;
      }
    });
    statusCount.value = stats;
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  search.status = '';
  pagination.current = 1;
  loadData();
};

// ===== 查看详情 =====
const viewDetail = async (id) => {
  if (!id) {
    ElMessage.warning('账单ID无效');
    return;
  }
  
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const res = await getBillDetail(id);
    const data = res?.data;
    if (data) {
      detailData.value = data;
      detailDetails.value = data.details || [];

      if (data.lrData) {
        try {
          const lr = typeof data.lrData === 'string' ? JSON.parse(data.lrData) : data.lrData;
          detailLrRows.value = lr.rows || [];
          detailLrSummary.value = lr.summary || {};
        } catch {
          detailLrRows.value = [];
          detailLrSummary.value = {};
        }
      } else {
        detailLrRows.value = [];
        detailLrSummary.value = {};
      }
    }
  } catch {
    ElMessage.error('加载详情失败');
  } finally {
    detailLoading.value = false;
  }
};

// ===== 确认账单 =====
const handleConfirm = async (row) => {
  if (!row || !row.billId) {
    ElMessage.warning('账单信息无效');
    return;
  }
  try {
    await ElMessageBox.confirm('确认账单无误吗？确认后订单将完成。', '确认账单', { type: 'info' });
    await confirmBill(row.billId);
    ElMessage.success('账单已确认');
    detailVisible.value = false;
    loadData();
  } catch {}
};

// ===== 退回账单 =====
const handleReject = async (row) => {
  if (!row || !row.billId) {
    ElMessage.warning('账单信息无效');
    return;
  }
  try {
    const { value } = await ElMessageBox.prompt('请输入退回原因', '退回账单', {
      inputType: 'textarea',
      inputPlaceholder: '请说明退回原因',
      confirmButtonText: '确定退回',
    });
    if (value) {
      await rejectBill(row.billId, { remark: value });
      ElMessage.success('已退回');
      detailVisible.value = false;
      loadData();
    }
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

:deep(.el-descriptions__label) { width: 120px; }
</style>