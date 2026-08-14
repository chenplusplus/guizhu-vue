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

    <!-- ===== 整体内容 ===== -->
    <div class="content-body">
      <!-- ===== 搜索栏 ===== -->
      <div class="search-bar">
        <el-form :inline="true" size="default">
          <el-form-item label="关键词">
            <el-input
              v-model="searchForm.keyword"
              placeholder="单号/客户"
              clearable
              style="width:160px;"
              @clear="loadData"
              @keyup.enter="loadData"
            />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="searchForm.category" placeholder="全部" clearable style="width:120px;" @change="loadData">
              <el-option label="黄金" value="黄金" />
              <el-option label="K金" value="K金" />
              <el-option label="钻石" value="钻石" />
              <el-option label="银料" value="银料" />
              <el-option label="配件" value="配件" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="方向">
            <el-select v-model="searchForm.direction" placeholder="全部" clearable style="width:100px;" @change="loadData">
              <el-option label="收入" value="in" />
              <el-option label="支出" value="out" />
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
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="结束"
              value-format="YYYY-MM-DD"
              style="width:240px;"
              @change="loadData"
            />
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
        <el-table
          :data="tableData"
          border
          stripe
          style="width:100%;"
          @row-click="openFlowDrawer"
          v-loading="loading"
        >
          <el-table-column prop="recordNo" label="单号" width="140" />
          <el-table-column prop="recordDate" label="日期" width="110" align="center">
            <template #default="{ row }">{{ formatDate(row.recordDate) }}</template>
          </el-table-column>
          <el-table-column prop="category" label="分类" width="100" />
          <el-table-column prop="customerName" label="客户" width="120" />
          <el-table-column prop="direction" label="方向" width="70" align="center">
            <template #default="{ row }">
              <el-tag :type="row.direction === 'in' ? 'success' : 'danger'" size="small">
                {{ row.direction === 'in' ? '收入' : '支出' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="weight" label="重量(g)" width="100" align="right">
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
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdByName" label="创建人" width="90" />
          <el-table-column label="操作" width="180" fixed="right" align="center">
            <template #default="{ row }">
              <!-- 草稿 -->
              <template v-if="row.status === 'draft'">
                <el-button size="small" type="primary" link @click.stop="goEdit(row.id)">编辑</el-button>
                <el-button size="small" type="success" link @click.stop="handleSubmit(row)">提交</el-button>
                <el-button size="small" type="danger" link @click.stop="handleDelete(row)">删除</el-button>
              </template>

              <!-- 待审核 -->
              <template v-if="row.status === 'pending' && canAudit">
                <el-button size="small" type="success" link @click.stop="handleAudit(row, true)">通过</el-button>
                <el-button size="small" type="danger" link @click.stop="handleAudit(row, false)">驳回</el-button>
              </template>

              <!-- 已驳回 -->
              <template v-if="row.status === 'rejected' && canResubmit">
                <el-button size="small" type="primary" link @click.stop="handleResubmit(row)">重新提交</el-button>
              </template>

              <!-- 查看流程 -->
              <el-button size="small" type="info" link @click.stop="openFlowDrawer(row)">流程</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="!loading && tableData.length === 0" description="暂无记录" :image-size="60" />

        <!-- 分页 -->
        <div class="pagination">
          <el-pagination
            v-model:current-page="pagination.current"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadData"
            @current-change="loadData"
          />
        </div>
      </div>
    </div>

    <!-- ===== 流程日志抽屉 ===== -->
    <el-drawer
      v-model="flowDrawerVisible"
      title="📋 流程日志"
      size="420px"
      destroy-on-close
      :close-on-click-modal="true"
    >
      <div class="flow-drawer-content" v-if="currentFlowRow">
        <!-- 基本信息 -->
        <div class="flow-info">
          <div class="flow-info-row">
            <span class="flow-info-label">单号</span>
            <span class="flow-info-value">{{ currentFlowRow.recordNo }}</span>
          </div>
          <div class="flow-info-row">
            <span class="flow-info-label">状态</span>
            <el-tag :type="getStatusType(currentFlowRow.status)" size="small">
              {{ getStatusText(currentFlowRow.status) }}
            </el-tag>
          </div>
          <div class="flow-info-row">
            <span class="flow-info-label">金额</span>
            <span class="flow-info-value" :style="{ color: currentFlowRow.direction === 'in' ? '#67C23A' : '#F56C6C' }">
              ¥{{ (currentFlowRow.amount || 0).toFixed(2) }}
            </span>
          </div>
        </div>

        <div class="flow-divider"></div>

        <!-- 流程步骤 -->
        <div class="flow-steps-title">流程进度</div>
        <div class="flow-steps">
          <div
            v-for="(step, index) in flowSteps"
            :key="index"
            class="flow-step"
            :class="{ active: step.active, done: step.done }"
          >
            <div class="flow-step-indicator">
              <div class="flow-step-dot">
                <el-icon v-if="step.done"><Check /></el-icon>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <div v-if="index < flowSteps.length - 1" class="flow-step-line" :class="{ active: step.done }"></div>
            </div>
            <div class="flow-step-content">
              <div class="flow-step-name">{{ step.name }}</div>
              <div class="flow-step-time">{{ step.time || '' }}</div>
            </div>
          </div>
        </div>

        <div class="flow-divider"></div>

        <!-- 操作记录 -->
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
        <div v-else class="flow-empty">
          <el-empty description="暂无操作记录" :image-size="50" />
        </div>
      </div>
    </el-drawer>

    <!-- ===== 审核弹窗 ===== -->
    <el-dialog v-model="auditDialogVisible" title="审核" width="450px" destroy-on-close>
      <el-form>
        <el-form-item :label="auditForm.approved ? '审核意见' : '驳回原因'">
          <el-input
            v-model="auditForm.remark"
            type="textarea"
            :rows="3"
            :placeholder="auditForm.approved ? '选填' : '请填写驳回原因（必填）'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="confirmAudit"
          :loading="auditLoading"
          :disabled="!auditForm.approved && !auditForm.remark.trim()"
        >
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh, Check } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import {
  getInoutList,
  deleteInout,
  submitInout,
  auditInout,
  resubmitInout,
  getInoutDetail
} from '@/api/inout';
import { getFlowHistory } from '@/api/flow';

const router = useRouter();
const userStore = useUserStore();

// ===== 状态 =====
const loading = ref(false);
const tableData = ref([]);
const total = ref(0);

const searchForm = reactive({
  keyword: '',
  category: '',
  direction: '',
  status: '',
  dateRange: []
});

const pagination = reactive({
  current: 1,
  pageSize: 20
});

// ===== 流程日志抽屉 =====
const flowDrawerVisible = ref(false);
const currentFlowRow = ref(null);
const flowHistories = ref([]);
const flowSteps = ref([]);

// ===== 审核弹窗 =====
const auditDialogVisible = ref(false);
const auditLoading = ref(false);
const auditForm = reactive({ id: 0, approved: true, remark: '' });

// ===== 权限判断 =====
const canAudit = computed(() => {
  const type = userStore.userType;
  return type === 'factoryAudit' || type === 'admin';
});

const canResubmit = computed(() => {
  const type = userStore.userType;
  return type === 'factoryOrder' || type === 'admin';
});

// ===== 状态映射 =====
const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' }
};

const getStatusText = (s) => statusMap[s]?.text || s || '-';
const getStatusType = (s) => statusMap[s]?.type || 'info';

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      keyword: searchForm.keyword || undefined,
      category: searchForm.category || undefined,
      direction: searchForm.direction || undefined,
      status: searchForm.status || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize
    };

    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
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
    .then(async () => {
      await deleteInout(row.id);
      ElMessage.success('删除成功');
      loadData();
    })
    .catch(() => {});
};

// ===== 提交审核 =====
const handleSubmit = async (row) => {
  try {
    await ElMessageBox.confirm('确定提交审核吗？', '提示', { type: 'info' });
    await submitInout(row.id);
    ElMessage.success('提交审核成功');
    loadData();
  } catch {}
};

// ===== 审核 =====
const handleAudit = (row, approved) => {
  auditForm.id = row.id;
  auditForm.approved = approved;
  auditForm.remark = '';
  auditDialogVisible.value = true;
};

const confirmAudit = async () => {
  if (!auditForm.approved && !auditForm.remark.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  auditLoading.value = true;
  try {
    await auditInout(auditForm.id, {
      approved: auditForm.approved,
      remark: auditForm.remark
    });
    ElMessage.success(auditForm.approved ? '审核通过' : '已驳回');
    auditDialogVisible.value = false;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '审核失败');
  } finally {
    auditLoading.value = false;
  }
};

// ===== 重新提交 =====
const handleResubmit = async (row) => {
  try {
    await ElMessageBox.confirm('确定重新提交吗？', '提示', { type: 'info' });
    await resubmitInout(row.id);
    ElMessage.success('已重新提交');
    loadData();
  } catch {}
};

// ============================================================
// 流程日志抽屉
// ============================================================
const openFlowDrawer = async (row) => {
  currentFlowRow.value = row;
  flowDrawerVisible.value = true;

  try {
    // 获取流程历史
    const historyRes = await getFlowHistory('inout_flow', String(row.id));
    const histories = historyRes?.data || [];

    console.log('历史记录:', histories); // 调试日志

    // ===== 1. 构建流程步骤（按时间顺序去重） =====
    const stepMap = {
      draft: { name: '草稿', order: 0 },
      pending: { name: '待审核', order: 1 },
      approved: { name: '已通过', order: 2 },
      rejected: { name: '已驳回', order: 2 }
    };

    // 收集所有出现过的节点（按顺序）
    const allNodes = [];
    histories.forEach(h => {
      if (h.FromNode && !allNodes.includes(h.FromNode)) {
        allNodes.push(h.FromNode);
      }
      if (h.ToNode && !allNodes.includes(h.ToNode)) {
        allNodes.push(h.ToNode);
      }
    });

    // 按 order 排序去重
    const uniqueSteps = [];
    const seen = new Set();
    const sortedNodes = [...allNodes].sort((a, b) => (stepMap[a]?.order || 0) - (stepMap[b]?.order || 0));
    sortedNodes.forEach(node => {
      if (!seen.has(node)) {
        seen.add(node);
        uniqueSteps.push(node);
      }
    });

    // 如果没有任何节点，使用默认
    if (uniqueSteps.length === 0) {
      uniqueSteps.push('draft');
      uniqueSteps.push('pending');
      uniqueSteps.push('approved');
    }

    // 获取当前状态
    const currentStatus = row.status || 'draft';
    const currentOrder = stepMap[currentStatus]?.order || 0;

    // 构建步骤显示
    flowSteps.value = uniqueSteps.map((nodeKey, index) => {
      const nodeOrder = stepMap[nodeKey]?.order || 0;
      return {
        name: stepMap[nodeKey]?.name || nodeKey,
        key: nodeKey,
        active: nodeKey === currentStatus,
        done: nodeOrder < currentOrder || (nodeKey === currentStatus && currentStatus === 'approved'),
        time: ''
      };
    });

    // 为每个步骤匹配时间（从历史记录中找）
    flowSteps.value.forEach((step, index) => {
      // 查找第一次到达该节点的时间
      const found = histories.find(h => h.ToNode === step.key);
      if (found) {
        step.time = found.CreatedAt || '';
      }
      // 如果是当前节点且没有时间，用当前时间
      if (step.active && !step.time) {
        step.time = formatDateTime(new Date());
      }
    });

    // ===== 2. 操作记录（倒序显示，最新的在上面） =====
    if (histories.length > 0) {
      // 按 id 倒序（最新的在前）
      const sorted = [...histories].reverse();
      flowHistories.value = sorted.map(h => ({
        id: h.id,
        operatorName: h.OperatorName || '系统',
        actionName: h.ActionName || h.action_key,
        remark: h.Remark || '',
        createdAt: h.CreatedAt || '',
        actionKey: h.ActionName === '审核通过' ? 'approve' 
                  : h.ActionName === '驳回' ? 'reject' 
                  : h.ActionName === '提交审核' ? 'submit' 
                  : h.ActionName === '重新提交' ? 'resubmit' 
                  : 'create'
      }));
    } else {
      // 没有历史记录时，显示创建记录
      flowHistories.value = [
        {
          id: 1,
          operatorName: row.createdByName || '系统',
          actionName: '创建记录',
          remark: '',
          createdAt: formatDateTime(row.createdAt),
          actionKey: 'create'
        }
      ];
    }

  } catch (error) {
    console.error('加载流程详情失败', error);
    ElMessage.error('加载流程历史失败');
  }
};
const getHistoryColor = (actionKey) => {
  const map = {
    create: '#409EFF',
    submit: '#E6A23C',
    approve: '#67C23A',
    reject: '#F56C6C',
    resubmit: '#409EFF',
    accept: '#409EFF',
    cancel: '#909399',
    return: '#E6A23C',
    confirm: '#67C23A'
  };
  return map[actionKey] || '#909399';
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${formatDate(date)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.page-container {
  background: #f5f7fa;
  padding: 16px;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 14px 20px;
  border-radius: 8px 8px 0 0;
  flex-wrap: wrap;
  gap: 10px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-left h2 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}
.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.content-body {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 16px 20px;
}

.section-divider {
  height: 1px;
  background: #e8ecf1;
  margin: 14px 0;
}

.search-bar :deep(.el-form-item) {
  margin-bottom: 0;
}

:deep(.el-table .cell) {
  padding: 4px 6px;
}
:deep(.el-table .el-table__row) {
  cursor: pointer;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* ===== 流程日志抽屉 ===== */
.flow-drawer-content {
  padding: 4px 0;
}

.flow-info {
  background: #f5f9ff;
  border-radius: 8px;
  padding: 12px 16px;
}
.flow-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}
.flow-info-label {
  color: #909399;
  font-size: 13px;
}
.flow-info-value {
  color: #303133;
  font-weight: 500;
  font-size: 14px;
}

.flow-divider {
  height: 1px;
  background: #e8ecf1;
  margin: 14px 0;
}

.flow-steps-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 12px;
}

.flow-steps {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.flow-step {
  display: flex;
  gap: 12px;
  padding: 6px 0;
}
.flow-step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 28px;
  flex-shrink: 0;
}
.flow-step-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e8ecf1;
  color: #999;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  flex-shrink: 0;
  border: 2px solid transparent;
}
.flow-step.done .flow-step-dot {
  background: #409EFF;
  color: #fff;
  border-color: #409EFF;
}
.flow-step.active .flow-step-dot {
  background: #fff;
  color: #409EFF;
  border-color: #409EFF;
  font-weight: 600;
}
.flow-step-line {
  width: 2px;
  flex: 1;
  min-height: 20px;
  background: #e8ecf1;
  margin: 2px 0;
}
.flow-step-line.active {
  background: #409EFF;
}
.flow-step-content {
  flex: 1;
  padding-top: 2px;
}
.flow-step-name {
  font-size: 14px;
  color: #303133;
}
.flow-step.done .flow-step-name {
  color: #303133;
}
.flow-step.active .flow-step-name {
  color: #409EFF;
  font-weight: 500;
}
.flow-step-time {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.flow-history-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 12px;
}
.flow-history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.flow-history-item {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
}
.flow-history-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 5px;
}
.flow-history-content {
  flex: 1;
}
.flow-history-action {
  display: flex;
  gap: 8px;
  align-items: center;
}
.flow-history-operator {
  font-weight: 500;
  color: #303133;
  font-size: 13px;
}
.flow-history-action-name {
  color: #409EFF;
  font-size: 13px;
}
.flow-history-remark {
  color: #606266;
  font-size: 13px;
  margin-top: 2px;
}
.flow-history-time {
  color: #909399;
  font-size: 12px;
  margin-top: 2px;
}
.flow-empty {
  padding: 20px 0;
}
</style>