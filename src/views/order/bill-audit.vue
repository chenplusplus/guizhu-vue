<!-- src/views/order/bill-audit.vue -->
<template>
  <div class="page-container">
    <!-- ⭐ 账单审核只有工厂审核员 / 管理员可用（路由已挡，这里再兜一层） -->
    <el-result v-if="!canAudit" icon="warning" title="无权访问"
      sub-title="账单审核仅工厂审核员或管理员可操作" />

    <template v-else>
    <div class="page-header">
      <h2>🔍 账单审核</h2>
      <div class="header-right">
        <!-- ⭐ 待审核 / 已审核 切换：审核完的单留在「已审核」里，不会凭空消失 -->
        <el-radio-group v-model="viewMode" @change="onModeChange">
          <el-radio-button value="pending">待审核</el-radio-button>
          <el-radio-button value="done">已审核</el-radio-button>
        </el-radio-group>
        <el-button type="primary" plain @click="loadData()">刷新</el-button>
      </div>
    </div>

    <div class="stat-card" :style="viewMode === 'pending'
      ? 'border-left:4px solid #E6A23C;margin-bottom:16px;padding:12px 16px;background:#fafafa;border-radius:6px;'
      : 'border-left:4px solid #67C23A;margin-bottom:16px;padding:12px 16px;background:#fafafa;border-radius:6px;'">
      <span style="font-size:22px;font-weight:bold;color:#303133;">{{ tableData.length }}</span>
      <span style="font-size:13px;color:#909399;margin-left:8px;">
        {{ viewMode === 'pending' ? '个待审核账单' : '个已审核账单' }}
      </span>
      <span v-if="viewMode === 'pending' && tableData.length" class="stat-sub">
        其中 {{ totalOrderCount }} 个订单，合计 ¥{{ totalAmountSum.toFixed(2) }}
      </span>
      <span class="auto-tip">每 30 秒自动刷新</span>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading" @row-click="onRowClick"
      :row-key="row => row.billId"
      :scrollbar-always-on="true"
    >
      <!-- ⭐ 展开行：审核前直接看到这张账单改过什么（标红） -->
      <el-table-column type="expand" width="46">
        <template #default="{ row }">
          <div class="expand-box">
            <div class="order-line">
              <span class="order-label">关联订单：</span>
              <span class="order-nos">{{ row.orderNos || '—' }}</span>
            </div>
            <BillModifyTrail
              v-if="modifyCounts[row.billId]"
              :bill-id="row.billId"
              compact
            />
            <span v-else class="no-modify">该账单提交审核前没有修改记录</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="billNo" label="账单编号" width="150" align="center">
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.billId)">{{ row.billNo }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="客户" width="110" align="center" />
      <el-table-column prop="operatorName" label="业务员" width="90" align="center" />
      <!-- ⭐ 关联订单号：这张账单是哪几单合出来的，一眼能看到 -->
      <el-table-column label="关联订单" min-width="200" align="center">
        <template #default="{ row }">
          <span class="order-nos-cell" :title="row.orderNos || ''">{{ row.orderNos || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="totalAmount" label="总金额" width="120" align="center">
        <template #default="{ row }">¥{{ (row.totalAmount || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="totalQuantity" label="总件数" width="70" align="center" />
      <el-table-column prop="orderCount" label="订单数" width="70" align="center" />
      <el-table-column v-if="viewMode === 'done'" label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="修改" width="88" align="center">
        <template #default="{ row }">
          <span v-if="modifyCounts[row.billId]" class="modify-flag">
            改 {{ modifyCounts[row.billId] }} 次
          </span>
          <span v-else class="no-flag">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="提交时间" width="150" align="center">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="215" align="center" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click.stop="viewDetail(row.billId)">查看</el-button>
          <template v-if="viewMode === 'pending'">
            <el-button size="small" type="success" @click.stop="handleAudit(row, true)">通过</el-button>
            <el-button size="small" type="danger" @click.stop="handleAudit(row, false)">驳回</el-button>
          </template>
          <span v-else class="audited-at">{{ formatDateTime(row.auditedAt) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0"
      :description="viewMode === 'pending' ? '暂无待审核账单' : '还没有审核过的账单'" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getBillList, auditBill, getBillModifyCounts } from '@/api/bill';
import { useUserStore } from '@/stores/user';
import BillModifyTrail from '@/components/BillModifyTrail.vue';

const router = useRouter();
const userStore = useUserStore();
const canAudit = computed(() => userStore.userType === 'factoryAudit' || userStore.isAdmin);
const loading = ref(false);
const tableData = ref([]);
// 待审核 / 已审核
const viewMode = ref('pending');
// billId → 修改次数（>0 时列表红字提示「改 N 次」，展开可看明细）
const modifyCounts = ref({});

// 已审核：工厂审过之后的几个阶段都算「已审核」（待客户确认 → 客户已确认 → 确认完成）
const DONE_STATUSES = 'billConfirmed,customerApproved,confirmed,completed,billRejected';

const totalOrderCount = computed(() => tableData.value.reduce((s, r) => s + (r.orderCount || 0), 0));
const totalAmountSum = computed(() => tableData.value.reduce((s, r) => s + Number(r.totalAmount || 0), 0));

const statusText = (s) => ({
  billPending: '待审核',
  billConfirmed: '待客户审核',
  customerApproved: '客户已确认',
  confirmed: '已确认',
  completed: '已完成',
  billRejected: '审核驳回',
  returned: '客户退回',
  returnPending: '退货待处理'
}[s] || s || '—');

const statusTagType = (s) => ({
  billPending: 'warning',
  billConfirmed: 'primary',
  customerApproved: 'success',
  confirmed: 'success',
  completed: 'info',
  billRejected: 'danger'
}[s] || 'info');

// ⭐ silent=true：自动刷新时静默更新，不弹 loading 遮罩、不打散用户展开的行
const loadData = async (silent = false) => {
  if (!canAudit.value) return;   // 非审核角色不请求接口
  if (!silent) loading.value = true;
  try {
    const params = viewMode.value === 'pending'
      ? { status: 'pending' }
      : { status: DONE_STATUSES, pageSize: 100 };
    const res = await getBillList(params);
    tableData.value = res?.data || [];
    await loadModifyCounts();
  } catch {
    if (!silent) ElMessage.error('加载失败');
  } finally {
    if (!silent) loading.value = false;
  }
};

const loadModifyCounts = async () => {
  const ids = (tableData.value || []).map(r => r.billId).filter(Boolean);
  if (ids.length === 0) { modifyCounts.value = {}; return; }
  try {
    const res = await getBillModifyCounts(ids);
    modifyCounts.value = res?.data || {};
  } catch {
    modifyCounts.value = {};
  }
};

const onModeChange = () => loadData();

// ⭐ 点行跳详情，但点展开箭头/展开内容时不要跳
const onRowClick = (row, column, event) => {
  const el = event?.target;
  if (el && (el.closest('.el-table__expand-icon') || el.closest('.el-table__expanded-cell'))) return;
  viewDetail(row.billId);
};

const handleAudit = async (row, approved) => {
  try {
    await ElMessageBox.confirm(approved ? '审核通过该账单？' : '驳回该账单？', '确认', { type: approved ? 'info' : 'warning' });
    await auditBill(row.billId, { approved });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    loadData();
  } catch {}
};

const viewDetail = (id) => {
  router.push(`/order/bill/detail/${id}`);
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN', { hour12: false });
};

// ⭐ 30 秒自动刷新：王五提交后不用手动刷新也能看到新单（页面切到后台时不刷）
let refreshTimer = null;
const startTimer = () => {
  stopTimer();
  refreshTimer = setInterval(() => {
    if (!document.hidden && !loading.value) loadData(true);
  }, 30000);
};
const stopTimer = () => {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
};

onMounted(() => { loadData(); startTimer(); });
onBeforeUnmount(stopTimer);
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.auto-tip {
  margin-left: auto;
  font-size: 12px;
  color: #a8abb2;
  white-space: nowrap;
}
.stat-card {
  display: flex;
  align-items: center;
}
.stat-sub {
  margin-left: 14px;
  font-size: 13px;
  color: #606266;
}
.order-nos-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: Consolas, Monaco, monospace;
  font-size: 12.5px;
  color: #1d2129;
}
.expand-box { padding: 6px 12px; }
.order-line { margin-bottom: 8px; font-size: 13px; }
.order-label { color: #909399; }
.order-nos {
  font-family: Consolas, Monaco, monospace;
  color: #1d2129;
  word-break: break-all;
}
.modify-flag { color: #f56c6c; font-weight: 600; }
.no-flag { color: #c0c4cc; }
.no-modify { color: #909399; font-size: 13px; }
.audited-at { color: #909399; font-size: 12.5px; }
</style>
