<!-- src/views/inout/list.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <h2>💰 总进出管理</h2>
        <el-tag type="info" size="large">共 {{ total }} 条</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="goCreate">
          <el-icon><Plus /></el-icon> 新增
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- ===== 搜索栏 ===== -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="单号/客户" clearable style="width:150px;"
            @clear="loadData" @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item label="往来单位">
          <el-select v-model="searchForm.counterpartyId" placeholder="全部" clearable filterable style="width:160px;"
            @change="loadData">
            <el-option v-for="cp in cpOptions" :key="cp.id" :label="cp.name" :value="cp.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="searchForm.category" placeholder="全部" clearable style="width:120px;" @change="loadData">
            <el-option v-for="opt in dictOptions.categories" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="方向">
          <el-select v-model="searchForm.direction" placeholder="全部" clearable style="width:100px;" @change="loadData">
            <el-option v-for="opt in dictOptions.directions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width:120px;" @change="loadData">
            <el-option label="草稿" value="draft" />
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至"
            start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:240px;"
            @change="loadData" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="section-divider"></div>

    <!-- ===== 表格 ===== -->
    <div class="table-section">
      <el-table :data="tableData" border stripe style="width:100%;" @row-click="openFlowDrawer" v-loading="loading">
        <el-table-column prop="recordNo" label="单号" width="140" />
        <el-table-column prop="recordDate" label="日期" width="110" align="center">
          <template #default="{ row }">{{ formatDate(row.recordDate) }}</template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="90" />
        <el-table-column prop="counterpartyName" label="往来单位" width="130">
          <template #default="{ row }">{{ row.counterpartyName || row.customerName || '-' }}</template>
        </el-table-column>
        <el-table-column prop="direction" label="方向" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.direction === 'in' ? 'success' : 'danger'" size="small">
              {{ getDirLabel(row.direction) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="重量(g)" width="90" align="right">
          <template #default="{ row }">{{ row.weight || '-' }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="金额(元)" width="120" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.direction === 'in' ? '#67C23A' : '#F56C6C', fontWeight: 'bold' }">
              ¥{{ (row.amount || 0).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdByName" label="创建人" width="90" />
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <template v-if="row.status === 'draft'">
              <el-button size="small" type="primary" link @click.stop="goEdit(row.id)">编辑</el-button>
              <el-button size="small" type="success" link @click.stop="handleSubmit(row)">提交</el-button>
              <el-button size="small" type="danger" link @click.stop="handleDelete(row)">删除</el-button>
            </template>
            <template v-if="row.status === 'pending' && canAudit">
              <el-button size="small" type="success" link @click.stop="handleAudit(row, true)">通过</el-button>
              <el-button size="small" type="danger" link @click.stop="handleAudit(row, false)">驳回</el-button>
            </template>
            <template v-if="row.status === 'rejected' && canResubmit">
              <el-button size="small" type="primary" link @click.stop="handleResubmit(row)">重新提交</el-button>
            </template>
            <el-button size="small" type="info" link @click.stop="openFlowDrawer(row)">流程</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && tableData.length === 0" description="暂无记录" :image-size="60" />

      <div class="pagination">
        <el-pagination v-model:current-page="pagination.current" v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData" @current-change="loadData" />
      </div>
    </div>

    <!-- ===== 流程日志抽屉 ===== -->
    <el-drawer v-model="flowDrawerVisible" title="📋 流程日志" size="420px" destroy-on-close>
      <div class="flow-drawer-content" v-if="currentFlowRow">
        <div class="flow-info">
          <div class="flow-info-row"><span class="flow-info-label">单号</span><span class="flow-info-value">{{ currentFlowRow.recordNo }}</span></div>
          <div class="flow-info-row"><span class="flow-info-label">状态</span><el-tag :type="getStatusType(currentFlowRow.status)" size="small">{{ getStatusText(currentFlowRow.status) }}</el-tag></div>
          <div class="flow-info-row">
            <span class="flow-info-label">金额</span>
            <span class="flow-info-value" :style="{ color: currentFlowRow.direction === 'in' ? '#67C23A' : '#F56C6C' }">
              ¥{{ (currentFlowRow.amount || 0).toFixed(2) }}
            </span>
          </div>
        </div>
        <div class="flow-divider"></div>
        <div class="flow-history-title">操作记录</div>
        <div class="flow-history-list" v-if="flowHistories.length > 0">
          <div v-for="log in flowHistories" :key="log.id" class="flow-history-item">
            <div class="flow-history-dot" :style="{ background: getHistoryColor(log.actionKey) }"></div>
            <div class="flow-history-content">
              <div class="flow-history-action">
                <span class="flow-history-operator">{{ log.operatorName || '系统' }}</span>
                <span class="flow-history-action-name">{{ log.actionName }}</span>
              </div>
              <div class="flow-history-remark" v-if="log.remark">{{ log.remark }}</div>
              <div class="flow-history-time">{{ log.createdAt }}</div>
            </div>
          </div>
        </div>
        <div v-else class="flow-empty"><el-empty description="暂无操作记录" :image-size="50" /></div>
      </div>
    </el-drawer>

    <!-- ===== 审核弹窗 ===== -->
    <el-dialog v-model="auditDialogVisible" title="审核" width="450px" destroy-on-close>
      <el-form>
        <el-form-item :label="auditForm.approved ? '审核意见' : '驳回原因'">
          <el-input v-model="auditForm.remark" type="textarea" :rows="3"
            :placeholder="auditForm.approved ? '选填' : '请填写驳回原因（必填）'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAudit" :loading="auditLoading"
          :disabled="!auditForm.approved && !auditForm.remark.trim()">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getInoutList, deleteInout, submitInout, auditInout, resubmitInout, getInoutOptions } from '@/api/inout';
import { getFlowHistory } from '@/api/flow';
import { getCounterpartyAll } from '@/api/counterparty';

const router = useRouter();
const userStore = useUserStore();

// ===== 状态 =====
const loading = ref(false);
const tableData = ref([]);
const total = ref(0);
const dictOptions = reactive({ directions: [], categories: [], colors: [] });
const cpOptions = ref([]);

const searchForm = reactive({
  keyword: '',
  counterpartyId: null,
  category: '',
  direction: '',
  status: '',
  dateRange: []
});

const pagination = reactive({ current: 1, pageSize: 20 });

// ===== 流程抽屉 =====
const flowDrawerVisible = ref(false);
const currentFlowRow = ref(null);
const flowHistories = ref([]);

// ===== 审核弹窗 =====
const auditDialogVisible = ref(false);
const auditLoading = ref(false);
const auditForm = reactive({ id: 0, approved: true, remark: '' });

// ===== 权限 =====
const canAudit = computed(() => ['factoryAudit', 'admin'].includes(userStore.userType));
const canResubmit = computed(() => ['factoryOrder', 'admin'].includes(userStore.userType));

// ===== 状态映射 =====
const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' }
};
const getStatusText = (s) => statusMap[s]?.text || s || '-';
const getStatusType = (s) => statusMap[s]?.type || 'info';
const getDirLabel = (d) => dictOptions.directions.find(o => o.value === d)?.label || (d === 'in' ? '收入' : '支出');

// ===== 加载字典 + 往来单位选项 =====
const loadOptions = async () => {
  try {
    const res = await getInoutOptions();
    if (res?.data) {
      dictOptions.directions = res.data.directions || [];
      dictOptions.categories = res.data.categories || [];
      dictOptions.colors = res.data.colors || [];
    }
  } catch {}
  try {
    const res2 = await getCounterpartyAll({ activeOnly: true });
    cpOptions.value = res2?.data || [];
  } catch { cpOptions.value = []; }
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      keyword: searchForm.keyword || undefined,
      counterpartyId: searchForm.counterpartyId || undefined,
      category: searchForm.category || undefined,
      direction: searchForm.direction || undefined,
      status: searchForm.status || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize
    };
    if (searchForm.dateRange?.length === 2) {
      params.startDate = searchForm.dateRange[0];
      params.endDate = searchForm.dateRange[1];
    }
    const res = await getInoutList(params);
    tableData.value = res.data || [];
    total.value = res.total || tableData.value.length;
  } catch (error) {
    console.error('加载失败', error);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  searchForm.keyword = '';
  searchForm.counterpartyId = null;
  searchForm.category = '';
  searchForm.direction = '';
  searchForm.status = '';
  searchForm.dateRange = [];
  pagination.current = 1;
  loadData();
};

// ===== 跳转 =====
const goCreate = () => router.push('/inout/create');
const goEdit = (id) => router.push(`/inout/create?id=${id}`);

// ===== 删除 =====
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定删除记录「${row.recordNo}」吗？`, '提示', { type: 'warning' })
    .then(async () => { await deleteInout(row.id); ElMessage.success('删除成功'); loadData(); }).catch(() => {});
};

// ===== 提交审核 =====
const handleSubmit = async (row) => {
  try { await ElMessageBox.confirm('确定提交审核吗？', '提示', { type: 'info' }); } catch { return; }
  try { await submitInout(row.id); ElMessage.success('提交审核成功'); loadData(); } catch {}
};

// ===== 审核 =====
const handleAudit = (row, approved) => { auditForm.id = row.id; auditForm.approved = approved; auditForm.remark = ''; auditDialogVisible.value = true; };
const confirmAudit = async () => {
  if (!auditForm.approved && !auditForm.remark.trim()) { ElMessage.warning('请填写驳回原因'); return; }
  auditLoading.value = true;
  try {
    await auditInout(auditForm.id, { approved: auditForm.approved, remark: auditForm.remark });
    ElMessage.success(auditForm.approved ? '审核通过' : '已驳回');
    auditDialogVisible.value = false;
    loadData();
  } catch (error) { ElMessage.error(error.message || '审核失败'); }
  finally { auditLoading.value = false; }
};

// ===== 重新提交 =====
const handleResubmit = async (row) => {
  try { await ElMessageBox.confirm('确定重新提交吗？', '提示', { type: 'info' }); } catch { return; }
  try { await resubmitInout(row.id); ElMessage.success('已重新提交'); loadData(); } catch {}
};

// ===== 流程抽屉 =====
const openFlowDrawer = async (row) => {
  currentFlowRow.value = row;
  flowDrawerVisible.value = true;
  try {
    const historyRes = await getFlowHistory('inout_flow', String(row.id));
    const histories = historyRes?.data || [];
    flowHistories.value = [...histories].reverse().map(h => ({
      id: h.id,
      operatorName: h.OperatorName || '系统',
      actionName: h.ActionName || h.action_key,
      remark: h.Remark || '',
      createdAt: h.CreatedAt || '',
      actionKey: h.ActionName === '审核通过' ? 'approve' : h.ActionName === '驳回' ? 'reject' : 'submit'
    }));
  } catch { flowHistories.value = []; }
};

const getHistoryColor = (key) => ({ create: '#409EFF', submit: '#E6A23C', approve: '#67C23A', reject: '#F56C6C' }[key] || '#909399');

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

onMounted(() => { loadOptions(); loadData(); });
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0; flex-wrap: wrap; gap: 10px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; flex-wrap: wrap; }
.content-body { background: #fff; border-radius: 0 0 8px 8px; padding: 16px 20px; }
.section-divider { height: 1px; background: #e8ecf1; margin: 14px 0; }
.search-bar :deep(.el-form-item) { margin-bottom: 0; }
:deep(.el-table .cell) { padding: 4px 6px; }
:deep(.el-table .el-table__row) { cursor: pointer; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
.flow-drawer-content { padding: 4px 0; }
.flow-info { background: #f5f9ff; border-radius: 8px; padding: 12px 16px; }
.flow-info-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
.flow-info-label { color: #909399; font-size: 13px; }
.flow-info-value { color: #303133; font-weight: 500; font-size: 14px; }
.flow-divider { height: 1px; background: #e8ecf1; margin: 14px 0; }
.flow-history-title { font-size: 14px; font-weight: 600; color: #1d2129; margin-bottom: 12px; }
.flow-history-list { display: flex; flex-direction: column; gap: 10px; }
.flow-history-item { display: flex; gap: 12px; padding: 8px 12px; background: #fafafa; border-radius: 6px; }
.flow-history-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
.flow-history-content { flex: 1; }
.flow-history-action { display: flex; gap: 8px; align-items: center; }
.flow-history-operator { font-weight: 500; color: #303133; font-size: 13px; }
.flow-history-action-name { color: #409EFF; font-size: 13px; }
.flow-history-remark { color: #606266; font-size: 13px; margin-top: 2px; }
.flow-history-time { color: #909399; font-size: 12px; margin-top: 2px; }
.flow-empty { padding: 20px 0; }
</style>
