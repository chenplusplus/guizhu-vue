<!-- src/views/order/return-list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>↩️ 退货记录</h2>
      <el-button @click="loadData">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <!-- 搜索 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="状态">
          <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width:140px;" @change="loadData">
            <el-option label="待审核" value="pending" />
            <el-option label="已处理" value="processed" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户">
          <el-input v-model="keyword" placeholder="客户名称" clearable style="width:160px;" @clear="loadData" @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计 -->
    <el-row :gutter="12" style="margin-bottom:16px;">
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #E6A23C;">
          <div class="stat-number">{{ statusCount.pending || 0 }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #67C23A;">
          <div class="stat-number">{{ statusCount.processed || 0 }}</div>
          <div class="stat-label">已处理</div>
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
    <el-table :data="tableData" border stripe v-loading="loading" @row-click="viewDetail">
      <el-table-column prop="returnNo" label="退货编号" width="150">
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.id)">{{ row.returnNo }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="billNo" label="原账单号" width="140" />
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="operatorName" label="业务员" width="100" />
      <el-table-column prop="returnAmount" label="退货金额" width="120" align="right">
        <template #default="{ row }">¥{{ (row.returnAmount || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="returnReason" label="退货原因" min-width="120" />
      <el-table-column prop="status" label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="退货时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click.stop="viewDetail(row.id)">查看</el-button>
          <el-button
            v-if="row.status === 'pending' && canAudit"
            size="small"
            type="success"
            @click.stop="handleAudit(row, true)"
          >
            通过
          </el-button>
          <el-button
            v-if="row.status === 'pending' && canAudit"
            size="small"
            type="danger"
            @click.stop="handleAudit(row, false)"
          >
            驳回
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无退货记录" />

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

    <!-- 退货详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="`退货详情 - ${detailData?.returnNo}`" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="退货编号">{{ detailData?.returnNo }}</el-descriptions-item>
        <el-descriptions-item label="原账单号">{{ detailData?.billNo }}</el-descriptions-item>
        <el-descriptions-item label="客户">{{ detailData?.customerName }}</el-descriptions-item>
        <el-descriptions-item label="业务员">{{ detailData?.operatorName }}</el-descriptions-item>
        <el-descriptions-item label="退货金额">
          <span style="color:#E6A23C;font-weight:bold;">¥{{ (detailData?.returnAmount || 0).toFixed(2) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(detailData?.status)">{{ getStatusText(detailData?.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="退货原因" :span="2">{{ detailData?.returnReason }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData?.returnRemark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="处理备注" :span="2">{{ detailData?.processRemark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="退货时间" :span="2">{{ formatDate(detailData?.createdAt) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button
          v-if="detailData?.status === 'pending' && canAudit"
          type="success"
          @click="handleAudit(detailData, true)"
        >
          审核通过
        </el-button>
        <el-button
          v-if="detailData?.status === 'pending' && canAudit"
          type="danger"
          @click="handleAudit(detailData, false)"
        >
          驳回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getReturns, getReturnDetail, auditReturn } from '@/api/return';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const tableData = ref([]);
const filterStatus = ref('');
const keyword = ref('');
const detailVisible = ref(false);
const detailData = ref(null);

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const statusCount = reactive({ pending: 0, processed: 0, rejected: 0 });

const canAudit = computed(() => {
  const userType = userStore.userType;
  return userType === 'admin' || userType === 'factoryAudit';
});

const statusMap = {
  pending: { text: '待审核', type: 'warning' },
  processed: { text: '已处理', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
};
const getStatusText = (s) => statusMap[s]?.text || s;
const getStatusType = (s) => statusMap[s]?.type || 'info';

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getReturns({
      status: filterStatus.value || undefined,
      customerName: keyword.value || undefined,
    });
    const data = res?.data || [];
    tableData.value = data;
    pagination.total = data.length;
    Object.keys(statusCount).forEach(k => statusCount[k] = 0);
    data.forEach(item => { if (statusCount[item.status] !== undefined) statusCount[item.status]++; });
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const viewDetail = async (id) => {
  try {
    const res = await getReturnDetail(id);
    detailData.value = res?.data;
    detailVisible.value = true;
  } catch {
    ElMessage.error('加载详情失败');
  }
};

const handleAudit = async (row, approved) => {
  try {
    await ElMessageBox.confirm(
      approved ? '确定通过该退货申请？' : '确定驳回该退货申请？',
      '审核确认',
      { type: approved ? 'info' : 'warning' }
    );
    await auditReturn(row.id, { approved });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    loadData();
    detailVisible.value = false;
  } catch {}
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', { hour12: false });
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
:deep(.el-table .el-table__row) { cursor: pointer; }
</style>