<!-- src/views/inout/list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>💰 总进出管理</h2>
      <div style="display:flex;gap:8px;">
        <el-button type="primary" @click="goCreate">
          <el-icon><Plus /></el-icon> 新增
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="方向">
          <el-select v-model="filter.direction" placeholder="全部" clearable style="width:120px;" @change="loadData">
            <el-option label="收入" value="in" />
            <el-option label="支出" value="out" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filter.status" placeholder="全部" clearable style="width:120px;" @change="loadData">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filter.keyword" placeholder="单号/客户/品类" clearable style="width:180px;" @clear="loadData" @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 统计 -->
    <el-row :gutter="12" style="margin-bottom:16px;">
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #67C23A;">
          <div class="stat-number">¥{{ stats.totalIn.toFixed(2) }}</div>
          <div class="stat-label">总收入</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #F56C6C;">
          <div class="stat-number">¥{{ stats.totalOut.toFixed(2) }}</div>
          <div class="stat-label">总支出</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" :style="{ borderLeft: `4px solid ${stats.balance >= 0 ? '#409EFF' : '#F56C6C'}` }">
          <div class="stat-number" :style="{ color: stats.balance >= 0 ? '#409EFF' : '#F56C6C' }">
            ¥{{ stats.balance.toFixed(2) }}
          </div>
          <div class="stat-label">结余</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #909399;">
          <div class="stat-number">{{ stats.totalCount }}</div>
          <div class="stat-label">总笔数</div>
        </div>
      </el-col>
    </el-row>

    <!-- 表格 -->
    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="recordNo" label="单据编号" width="140" />
      <el-table-column prop="recordDate" label="日期" width="110" align="center">
        <template #default="{ row }">{{ formatDate(row.recordDate) }}</template>
      </el-table-column>
      <el-table-column prop="category" label="品类" width="100" />
      <el-table-column prop="color" label="成色" width="80" align="center" />
      <el-table-column prop="direction" label="方向" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.direction === 'in' ? 'success' : 'danger'" size="small">
            {{ row.direction === 'in' ? '收入' : '支出' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="weight" label="重量" width="90" align="right">
        <template #default="{ row }">{{ (row.weight || 0).toFixed(3) }}g</template>
      </el-table-column>
      <el-table-column prop="amount" label="金额" width="120" align="right">
        <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="status" label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="viewDetail(row.id)">查看</el-button>
          <el-button
            v-if="row.status === 'pending' && canAudit"
            size="small"
            type="success"
            @click="handleAudit(row, true)"
          >
            通过
          </el-button>
          <el-button
            v-if="row.status === 'pending' && canAudit"
            size="small"
            type="danger"
            @click="handleAudit(row, false)"
          >
            驳回
          </el-button>
          <el-button
            v-if="row.status === 'draft' || row.status === 'pending'"
            size="small"
            type="danger"
            link
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无记录" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getInoutList, deleteInout, auditInout, getInoutStats } from '@/api/inout';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const tableData = ref([]);
const stats = reactive({ totalIn: 0, totalOut: 0, balance: 0, totalCount: 0 });

const filter = reactive({
  direction: '',
  status: '',
  keyword: '',
});

const canAudit = computed(() => {
  const userType = userStore.userType;
  return userType === 'factoryAudit' || userType === 'admin';
});

const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
};
const getStatusText = (s) => statusMap[s]?.text || s;
const getStatusType = (s) => statusMap[s]?.type || 'info';

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getInoutList(filter);
    tableData.value = res?.data || [];
    // 加载统计
    const statsRes = await getInoutStats();
    Object.assign(stats, statsRes?.data || {});
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const goCreate = () => {
  router.push('/inout/create');
};

const viewDetail = (id) => {
  router.push(`/inout/detail/${id}`);
};

const handleAudit = async (row, approved) => {
  try {
    await ElMessageBox.confirm(
      approved ? '确定通过该记录？' : '确定驳回该记录？',
      '审核确认',
      { type: approved ? 'info' : 'warning' }
    );
    await auditInout(row.id, { approved });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    loadData();
  } catch {}
};

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除 ${row.recordNo}？`, '提示', { type: 'warning' });
    await deleteInout(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch {}
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN', { hour12: false });
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
:deep(.el-table .cell) { padding: 6px 8px; }
</style>