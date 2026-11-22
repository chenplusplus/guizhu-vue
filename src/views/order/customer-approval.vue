<!-- src/views/order/customer-approval.vue
     ⭐ 客户审批中心：申请修改审批 / 申请取消审批 / 申请暂停审批
       · 客户审核员 / 管理员：审批（同意 / 驳回）
       · 客户下单员：看自己申请的进度、撤回、申请恢复
       · 工厂操作员：确认取消（工厂阶段）、查看
     入口：菜单「客户审批中心」；工作台卡片带 ?tab=cancel|pause 直达
-->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="hd-left">
        <h2>🗂 客户审批中心</h2>
        <span class="hd-sub">申请修改 / 申请取消 / 申请暂停 统一在这里审</span>
      </div>
      <div class="hd-right">
        <el-button @click="reloadCurrent">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="ap-tabs" @tab-change="onTabChange">
      <!-- ================= 申请修改审批 ================= -->
      <el-tab-pane name="modify">
        <template #label>
          <span class="tab-label">✏️ 申请修改审批
            <el-badge v-if="pendingCounts.modify > 0" :value="pendingCounts.modify" class="tab-badge" />
          </span>
        </template>

        <div class="toolbar">
          <el-radio-group v-model="modify.filter" size="small" @change="loadModify(1)">
            <el-radio-button label="pendingAudit">{{ isFactoryOrder ? '客户待审批' : '待我审批' }}</el-radio-button>
            <el-radio-button label="pendingFactory">待工厂确认</el-radio-button>
            <el-radio-button label="all">全部记录</el-radio-button>
          </el-radio-group>
        </div>

        <el-table :data="modify.rows" border stripe size="small" v-loading="modify.loading" empty-text="暂无修改申请">
          <el-table-column label="订单号" width="170">
            <template #default="{ row }">
              <el-link type="primary" @click="viewOrder(row.orderId)">
                <span :class="{ 'blink-modify': row.modifyTracking }">{{ row.orderNo }}</span>
              </el-link>
            </template>
          </el-table-column>
          <el-table-column label="发起阶段" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="stageType(row.modifyOriginStage)" size="small">{{ stageText(row.modifyOriginStage) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="当前状态" width="150" align="center">
            <template #default="{ row }">
              <el-tag :type="modifyStatusType(row)" size="small">{{ modifyStatusText(row) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="applyName" label="申请人" width="110" />
          <el-table-column label="申请时间" width="155">
            <template #default="{ row }">{{ fmtTime(row.applyAt) }}</template>
          </el-table-column>
          <el-table-column prop="applyReason" label="申请原因" min-width="130" show-overflow-tooltip />
          <el-table-column label="修改明细" min-width="260">
            <template #default="{ row }">
              <div v-for="(d, i) in row.diffs" :key="i" class="diff-row">
                <span class="diff-label">{{ d.fieldLabel }}</span>
                <span class="diff-old">{{ d.oldValue || '空' }}</span>
                <el-icon><Right /></el-icon>
                <span class="diff-new">{{ d.newValue || '空' }}</span>
              </div>
              <div v-if="!row.diffs || row.diffs.length === 0" class="diff-empty">无字段变更</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="210" fixed="right" align="center">
            <template #default="{ row }">
              <template v-if="canAuditModify(row)">
                <el-button size="small" type="success" @click="auditModify(row, true)">同意</el-button>
                <el-button size="small" type="danger" @click="auditModify(row, false)">驳回</el-button>
              </template>
              <el-button v-else-if="canConfirmModify(row)" size="small" type="success" @click="confirmModify(row)">确认生效</el-button>
              <el-button v-if="canWithdrawModify(row)" size="small" type="warning" plain @click="withdrawModify(row)">撤回</el-button>
              <el-tag v-if="!canAuditModify(row) && !canConfirmModify(row) && !canWithdrawModify(row)" size="small" type="info" effect="plain">只看</el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager">
          <el-pagination v-model:current-page="modify.page" v-model:page-size="modify.pageSize" :page-sizes="[10, 20, 50]"
                         :total="modify.total" layout="total, sizes, prev, pager, next" @size-change="loadModify(1)"
                         @current-change="loadModify()" />
        </div>
      </el-tab-pane>

      <!-- ================= 申请取消审批 ================= -->
      <el-tab-pane name="cancel">
        <template #label>
          <span class="tab-label">⛔ 申请取消审批
            <el-badge v-if="pendingCounts.cancel > 0" :value="pendingCounts.cancel" class="tab-badge" />
          </span>
        </template>

        <div class="toolbar">
          <el-radio-group v-model="cancel.state" size="small" @change="loadCancel(1)">
            <el-radio-button label="pending">{{ isFactoryOrder ? '待工厂确认' : '待我审批' }}</el-radio-button>
            <el-radio-button label="done">已处理</el-radio-button>
          </el-radio-group>
          <el-input v-model="cancel.keyword" placeholder="订单号 / 品名" clearable style="width:200px;"
                    @keyup.enter="loadCancel(1)" @clear="loadCancel(1)" />
          <el-date-picker v-model="cancel.range" type="daterange" start-placeholder="开始" end-placeholder="结束"
                          value-format="YYYY-MM-DD" style="width:250px;flex:0 0 250px;" @change="loadCancel(1)" />
          <el-button type="primary" plain @click="loadCancel(1)">查询</el-button>
        </div>

        <el-table :data="cancel.rows" border stripe size="small" v-loading="cancel.loading" empty-text="暂无取消申请">
          <el-table-column label="订单号" width="165">
            <template #default="{ row }">
              <el-link type="primary" @click="viewOrder(row.orderId)">{{ row.orderNo }}</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="productName" label="品名" min-width="140" show-overflow-tooltip />
          <el-table-column label="金额" width="110" align="center">
            <template #default="{ row }">{{ row.totalAmount == null ? '-' : '¥' + Number(row.totalAmount).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column label="当前工序" width="110" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.flowStatus === 'cancelled' ? 'info' : 'warning'">{{ row.flowStatusText }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="cancelReason" label="申请原因" min-width="150" show-overflow-tooltip />
          <el-table-column label="申请人 / 时间" width="170">
            <template #default="{ row }">
              <div>{{ row.cancelApplyName || '-' }}</div>
              <div class="sub-time">{{ fmtTime(row.cancelApplyAt) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="进度" width="190">
            <template #default="{ row }">
              <div class="flow-steps">
                <span :class="{ done: true }">① 客户申请</span>
                <span :class="{ done: !!row.cancelAuditAt }">② 审核员</span>
                <span v-if="row.cancelNeedFactoryConfirm" :class="{ done: !!row.cancelConfirmAt }">③ 工厂确认</span>
              </div>
              <div v-if="row.cancelAuditAt" class="sub-time">
                审核：{{ row.cancelAuditName }} {{ row.cancelAuditRemark ? '（' + row.cancelAuditRemark + '）' : '' }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <template v-if="canAuditCancel(row)">
                <el-button size="small" type="success" @click="handleAuditCancel(row, true)">同意取消</el-button>
                <el-button size="small" type="danger" plain @click="handleAuditCancel(row, false)">驳回</el-button>
              </template>
              <el-button v-else-if="canConfirmCancelRow(row)" size="small" type="success" @click="handleConfirmCancel(row)">确认取消</el-button>
              <el-button v-else-if="canWithdrawCancel(row)" size="small" type="warning" plain @click="handleWithdrawCancel(row)">撤回</el-button>
              <el-tag v-else size="small" type="info" effect="plain">{{ cancelStatusText(row) }}</el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager">
          <el-pagination v-model:current-page="cancel.page" v-model:page-size="cancel.pageSize" :page-sizes="[10, 20, 50]"
                         :total="cancel.total" layout="total, sizes, prev, pager, next" @size-change="loadCancel(1)"
                         @current-change="loadCancel()" />
        </div>
      </el-tab-pane>

      <!-- ================= 申请暂停审批 ================= -->
      <el-tab-pane name="pause">
        <template #label>
          <span class="tab-label">⏸ 申请暂停审批
            <el-badge v-if="pendingCounts.pause > 0" :value="pendingCounts.pause" class="tab-badge" />
          </span>
        </template>

        <div class="toolbar">
          <el-radio-group v-model="pause.state" size="small" @change="loadPause(1)">
            <el-radio-button label="pending">{{ isFactoryOrder ? '待客户审批' : '待我审批' }}</el-radio-button>
            <el-radio-button label="active">暂停中</el-radio-button>
            <el-radio-button label="done">已处理</el-radio-button>
          </el-radio-group>
          <el-input v-model="pause.keyword" placeholder="订单号 / 品名" clearable style="width:200px;"
                    @keyup.enter="loadPause(1)" @clear="loadPause(1)" />
          <el-date-picker v-model="pause.range" type="daterange" start-placeholder="开始" end-placeholder="结束"
                          value-format="YYYY-MM-DD" style="width:250px;flex:0 0 250px;" @change="loadPause(1)" />
          <el-button type="primary" plain @click="loadPause(1)">查询</el-button>
        </div>

        <el-table :data="pause.rows" border stripe size="small" v-loading="pause.loading" empty-text="暂无暂停申请">
          <el-table-column label="订单号" width="165">
            <template #default="{ row }">
              <el-link type="primary" @click="viewOrder(row.orderId)">{{ row.orderNo }}</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="productName" label="品名" min-width="130" show-overflow-tooltip />
          <el-table-column label="当前工序" width="110" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.flowStatus === 'paused' ? 'warning' : 'primary'">
                {{ row.flowStatus === 'paused' ? ('暂停 · ' + (row.pauseOriginStatusText || '—')) : row.flowStatusText }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="申请类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.pauseReqStatus === 'restorePending' ? 'success' : 'warning'" effect="plain">
                {{ row.pauseReqStatus === 'restorePending' ? '申请恢复' : '申请暂停' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="原因" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.pauseReqStatus === 'restorePending' ? (row.restoreReason || row.pauseReason) : (row.pauseReason || row.pauseReqReason) }}
            </template>
          </el-table-column>
          <el-table-column label="申请人 / 时间" width="170">
            <template #default="{ row }">
              <div>{{ row.pauseReqStatus === 'restorePending' ? (row.restoreName || '-') : (row.pauseApplyName || row.pauseReqName || '-') }}</div>
              <div class="sub-time">{{ fmtTime(row.pauseReqStatus === 'restorePending' ? row.restoreAt : (row.pauseApplyAt || row.pauseReqAt)) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="150">
            <template #default="{ row }">
              <el-tag size="small" :type="pauseStatusType(row)">{{ pauseStatusText(row) }}</el-tag>
              <div v-if="row.pauseAuditAt" class="sub-time">
                {{ row.pauseAuditName }}：{{ row.pauseAuditRemark || '—' }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="210" fixed="right" align="center">
            <template #default="{ row }">
              <template v-if="canAuditPause(row)">
                <el-button size="small" type="success" @click="handleAuditPause(row, true)">
                  {{ row.pauseReqStatus === 'restorePending' ? '同意恢复' : '同意暂停' }}
                </el-button>
                <el-button size="small" type="danger" plain @click="handleAuditPause(row, false)">驳回</el-button>
              </template>
              <template v-else-if="canRequestRestore(row)">
                <el-button size="small" type="success" @click="handleRequestRestore(row)">申请恢复</el-button>
              </template>
              <el-button v-else-if="canWithdrawPause(row)" size="small" type="warning" plain @click="handleWithdrawPause(row)">撤回</el-button>
              <el-tag v-else size="small" type="info" effect="plain">{{ pauseStatusText(row) }}</el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager">
          <el-pagination v-model:current-page="pause.page" v-model:page-size="pause.pageSize" :page-sizes="[10, 20, 50]"
                         :total="pause.total" layout="total, sizes, prev, pager, next" @size-change="loadPause(1)"
                         @current-change="loadPause()" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Right } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import {
  getPendingModifyList, auditOrderModify, confirmOrderModify, withdrawOrderModify,
  getCancelApprovalList, getPauseApprovalList,
  auditCancel, withdrawCancel, confirmCancel,
  auditPause, requestRestore, withdrawPause, auditRestore
} from '@/api/order';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const isCustomer = computed(() => userStore.userType === 'customer');
const isCustomerAudit = computed(() => userStore.userType === 'customerAudit');
const isFactoryOrder = computed(() => userStore.userType === 'factoryOrder');
const isAdmin = computed(() => userStore.userType === 'admin');
const canAuditAny = computed(() => isCustomerAudit.value || isAdmin.value);

const TAB_KEY = 'customer-approval-tab';
const allowedTabs = ['modify', 'cancel', 'pause'];
const initTab = () => {
  const q = String(route.query.tab || '').toLowerCase();
  if (allowedTabs.includes(q)) return q;
  const cached = sessionStorage.getItem(TAB_KEY);
  return allowedTabs.includes(cached) ? cached : 'modify';
};
const activeTab = ref(initTab());

const pendingCounts = reactive({ modify: 0, cancel: 0, pause: 0 });

// ⭐ 进入时的默认筛选：
//   工厂操作员不审批，只做「确认生效 / 确认取消」，所以默认落到待工厂确认的那批，
//    否则默认「待我审批」对工厂永远是空列表（工作台三张卡都带 query 指定）
const pickQuery = (key, allowed, def) => {
  const v = String(route.query[key] || '');
  return allowed.includes(v) ? v : def;
};

// ===== 修改 =====
const modify = reactive({
  rows: [], loading: false, page: 1, pageSize: 20, total: 0,
  filter: pickQuery('filter', ['pendingAudit', 'pendingFactory', 'all'],
    isFactoryOrder.value ? 'pendingFactory' : 'pendingAudit')
});

// ===== 取消 =====
const cancel = reactive({
  rows: [], loading: false, page: 1, pageSize: 20, total: 0,
  state: pickQuery('state', ['pending', 'done'], 'pending'),
  keyword: '', range: null
});

// ===== 暂停 =====
const pause = reactive({
  rows: [], loading: false, page: 1, pageSize: 20, total: 0,
  state: pickQuery('state', ['pending', 'active', 'done'],
    isFactoryOrder.value ? 'active' : 'pending'),
  keyword: '', range: null
});

const viewOrder = (id) => router.push(`/order/detail/${id}`);
const fmtTime = (v) => (v ? new Date(v).toLocaleString('zh-CN', { hour12: false }) : '-');

const stageText = (s) => ({ customer: '客户阶段', factory: '工厂阶段', bill: '账单阶段' }[s] || '—');
const stageType = (s) => ({ customer: 'info', factory: 'primary', bill: 'warning' }[s] || 'info');

const modifyStatusText = (row) => {
  if (row.status === 'pendingAudit') return '待客户审批';
  if (row.status === 'pendingFactory') return '待工厂确认';
  if (row.modifyTracking) {
    if (row.flowStatus === 'draft') return '等待客户重新编辑';
    if (row.flowStatus === 'pending') return '等待客户审核';
    if (row.modifyOriginStage === 'factory' || row.modifyOriginStage === 'bill') return '待工厂确认';
    return '追踪中';
  }
  return '已结束';
};
const modifyStatusType = (row) => {
  if (row.status === 'pendingAudit') return 'warning';
  if (row.status === 'pendingFactory') return 'primary';
  if (row.modifyTracking) return 'primary';
  return 'success';
};

const cancelStatusText = (row) => {
  if (row.pauseStatus === 'cancelled') return '已取消';
  if (row.pauseStatus === 'pendingCustomerAudit') return '待审批';
  if (row.pauseStatus === 'pendingFactoryConfirm') return '待工厂确认';
  return '—';
};

const pauseStatusText = (row) => {
  if (row.pauseReqStatus === 'pendingAudit') return '待审批（暂停）';
  if (row.pauseReqStatus === 'restorePending') return '待审批（恢复）';
  if (row.pauseReqStatus === 'rejected') return '已驳回';
  if (row.flowStatus === 'paused') return '暂停中';
  if (row.pauseRestoreAt || row.pauseRestoreAuditAt) return '已恢复';
  return '已结束';
};
const pauseStatusType = (row) => {
  if (row.pauseReqStatus === 'pendingAudit' || row.pauseReqStatus === 'restorePending') return 'warning';
  if (row.pauseReqStatus === 'rejected') return 'danger';
  if (row.flowStatus === 'paused') return 'warning';
  if (row.pauseRestoreAt) return 'success';
  return 'info';
};

// ===== 加载 =====
const loadModify = async (page) => {
  if (page) modify.page = page;
  modify.loading = true;
  try {
    const params = { page: modify.page, pageSize: modify.pageSize };
    if (modify.filter !== 'all') params.status = modify.filter;
    const res = await getPendingModifyList(params);
    const data = res?.data || {};
    if (Array.isArray(data)) {
      modify.rows = data;
      modify.total = data.length;
    } else {
      modify.rows = data.items || data.list || [];
      modify.total = typeof data.total === 'number' ? data.total : modify.rows.length;
    }
  } catch {
    modify.rows = [];
    modify.total = 0;
  } finally {
    modify.loading = false;
  }
};

const loadCancel = async (page) => {
  if (page) cancel.page = page;
  cancel.loading = true;
  try {
    const params = { state: cancel.state, page: cancel.page, pageSize: cancel.pageSize };
    if (cancel.keyword) params.keyword = cancel.keyword;
    if (cancel.range?.length === 2) { params.startDate = cancel.range[0]; params.endDate = cancel.range[1]; }
    const res = await getCancelApprovalList(params);
    cancel.rows = res?.data || [];
    cancel.total = res?.total || 0;
  } catch (e) {
    cancel.rows = [];
    cancel.total = 0;
    ElMessage.error(e.message || '加载取消申请失败');
  } finally {
    cancel.loading = false;
  }
};

const loadPause = async (page) => {
  if (page) pause.page = page;
  pause.loading = true;
  try {
    const params = { state: pause.state, page: pause.page, pageSize: pause.pageSize };
    if (pause.keyword) params.keyword = pause.keyword;
    if (pause.range?.length === 2) { params.startDate = pause.range[0]; params.endDate = pause.range[1]; }
    const res = await getPauseApprovalList(params);
    pause.rows = res?.data || [];
    pause.total = res?.total || 0;
  } catch (e) {
    pause.rows = [];
    pause.total = 0;
    ElMessage.error(e.message || '加载暂停申请失败');
  } finally {
    pause.loading = false;
  }
};

const loadCounts = async () => {
  try {
    // ⭐ 角标口径跟着角色走：工厂看「待工厂确认 / 暂停中」，客户看「待我审批」
    const modifyStatus = isFactoryOrder.value ? 'pendingFactory' : 'pendingAudit';
    const pauseState = isFactoryOrder.value ? 'active' : 'pending';
    const [m, c, p] = await Promise.all([
      getPendingModifyList({ status: modifyStatus, page: 1, pageSize: 1 }),
      getCancelApprovalList({ state: 'pending', page: 1, pageSize: 1 }),
      getPauseApprovalList({ state: pauseState, page: 1, pageSize: 1 })
    ]);
    const mData = m?.data;
    pendingCounts.modify = Array.isArray(mData) ? mData.length : (mData?.total || 0);
    pendingCounts.cancel = c?.total || 0;
    pendingCounts.pause = p?.total || 0;
  } catch { /* 统计失败不影响页面 */ }
};

const reloadCurrent = () => {
  if (activeTab.value === 'modify') loadModify();
  else if (activeTab.value === 'cancel') loadCancel();
  else loadPause();
  loadCounts();
};

const onTabChange = (name) => {
  sessionStorage.setItem(TAB_KEY, name);
  router.replace({ query: { ...route.query, tab: name } });
  reloadCurrent();
};

// ===== 修改：权限与操作 =====
const canAuditModify = (row) => row.status === 'pendingAudit' && canAuditAny.value;
const canConfirmModify = (row) => {
  if (!isFactoryOrder.value && !isAdmin.value) return false;
  if (!row.modifyTracking || row.status === 'pendingAudit') return false;
  if (row.modifyOriginStage !== 'factory' && row.modifyOriginStage !== 'bill') return false;
  return row.flowStatus !== 'draft' && row.flowStatus !== 'pending';
};
const canWithdrawModify = (row) => {
  if (row.status !== 'pendingAudit') return false;
  if (isAdmin.value) return true;
  return isCustomer.value && Number(row.applyBy) === Number(userStore.userId);
};

const auditModify = async (row, approved) => {
  try {
    if (approved) {
      await ElMessageBox.confirm('同意后订单将退回草稿，客户可重新编辑并提交。确认同意？', '同意修改',
        { type: 'warning', confirmButtonText: '确认同意', cancelButtonText: '取消' });
      await auditOrderModify(row.requestId, { approved: true, remark: '同意修改' });
      ElMessage.success('已同意，订单已退回草稿');
    } else {
      const { value } = await ElMessageBox.prompt('请填写驳回原因', '驳回修改', {
        inputType: 'textarea', confirmButtonText: '确认驳回', cancelButtonText: '取消',
        inputPlaceholder: '请输入驳回原因', inputValidator: v => v?.trim() ? true : '请输入驳回原因'
      });
      await auditOrderModify(row.requestId, { approved: false, remark: value.trim() });
      ElMessage.success('已驳回');
    }
    refreshAll();
  } catch (e) {
    if (e !== 'cancel' && e?.name !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const confirmModify = async (row) => {
  try {
    await ElMessageBox.confirm('确认后该修改将生效，订单号不再标记。', '确认修改生效',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' });
    await confirmOrderModify(row.orderId);
    ElMessage.success('已确认');
    refreshAll();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const withdrawModify = async (row) => {
  try {
    await ElMessageBox.confirm('确定撤回该修改申请吗？', '撤回', { type: 'warning' });
    await withdrawOrderModify(row.requestId);
    ElMessage.success('已撤回');
    refreshAll();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '撤回失败');
  }
};

// ===== 取消：权限与操作 =====
const canAuditCancel = (row) => canAuditAny.value
  && ['pendingCustomerAudit', 'pendingFactoryConfirm'].includes(row.pauseStatus)
  && !row.cancelAuditAt;
const canConfirmCancelRow = (row) => (isFactoryOrder.value || isAdmin.value)
  && row.pauseStatus === 'pendingFactoryConfirm' && !!row.cancelAuditAt;
const canWithdrawCancel = (row) => row.pauseStatus === 'pendingCustomerAudit' && !row.cancelAuditAt
  && (isAdmin.value || (isCustomer.value && Number(row.submittedBy) === Number(userStore.userId)));

const handleAuditCancel = async (row, approved) => {
  try {
    if (approved) {
      const tip = row.cancelNeedFactoryConfirm
        ? '同意后取消申请将转给工厂确认，工厂确认后订单终止。确认同意？'
        : '同意后订单立即终止（不可恢复）。确认同意？';
      await ElMessageBox.confirm(tip, '同意取消', { type: 'warning', confirmButtonText: '确认同意', cancelButtonText: '取消' });
      await auditCancel(row.orderId, { approved: true, remark: '同意取消' });
      ElMessage.success(row.cancelNeedFactoryConfirm ? '已同意，等待工厂确认' : '已同意，订单已取消');
    } else {
      const { value } = await ElMessageBox.prompt('请填写驳回原因', '驳回取消', {
        inputType: 'textarea', confirmButtonText: '确认驳回', cancelButtonText: '取消',
        inputPlaceholder: '请输入驳回原因', inputValidator: v => v?.trim() ? true : '请输入驳回原因'
      });
      await auditCancel(row.orderId, { approved: false, remark: value.trim() });
      ElMessage.success('已驳回取消申请');
    }
    refreshAll();
  } catch (e) {
    if (e !== 'cancel' && e?.name !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const handleConfirmCancel = async (row) => {
  try {
    await ElMessageBox.confirm('确认后订单立即终止（不可恢复）。确认取消该订单？', '确认取消',
      { type: 'warning', confirmButtonText: '确认取消', cancelButtonText: '再想想' });
    await confirmCancel(row.orderId, '工厂确认取消');
    ElMessage.success('已确认取消，订单已终止');
    refreshAll();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const handleWithdrawCancel = async (row) => {
  try {
    await ElMessageBox.confirm('撤回后订单恢复正常流转，确定撤回取消申请吗？', '撤回取消申请', { type: 'warning' });
    await withdrawCancel(row.orderId);
    ElMessage.success('已撤回取消申请');
    refreshAll();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '撤回失败');
  }
};

// ===== 暂停：权限与操作 =====
const canAuditPause = (row) => canAuditAny.value
  && ['pendingAudit', 'restorePending'].includes(row.pauseReqStatus);
const canRequestRestore = (row) => isCustomer.value
  && row.flowStatus === 'paused' && row.pauseReqStatus === 'approved'
  && Number(row.submittedBy) === Number(userStore.userId);
const canWithdrawPause = (row) => ['pendingAudit', 'restorePending'].includes(row.pauseReqStatus)
  && (isAdmin.value || (isCustomer.value && Number(row.submittedBy) === Number(userStore.userId)));

const handleAuditPause = async (row, approved) => {
  const isRestore = row.pauseReqStatus === 'restorePending';
  try {
    if (approved) {
      const tip = isRestore
        ? `同意后订单恢复到暂停前的工序「${row.pauseOriginStatusText || '—'}」，工厂可继续制作。确认同意？`
        : `同意后订单立即暂停（暂停前工序：${row.flowStatusText}），工厂不能再推进，需客户方申请恢复。确认同意？`;
      await ElMessageBox.confirm(tip, isRestore ? '同意恢复' : '同意暂停',
        { type: 'warning', confirmButtonText: '确认同意', cancelButtonText: '取消' });
      if (isRestore) await auditRestore(row.orderId, { approved: true, remark: '同意恢复' });
      else await auditPause(row.orderId, { approved: true, remark: '同意暂停' });
      ElMessage.success(isRestore ? '已同意恢复' : '已同意暂停');
    } else {
      const { value } = await ElMessageBox.prompt('请填写驳回原因', isRestore ? '驳回恢复' : '驳回暂停', {
        inputType: 'textarea', confirmButtonText: '确认驳回', cancelButtonText: '取消',
        inputPlaceholder: '请输入驳回原因', inputValidator: v => v?.trim() ? true : '请输入驳回原因'
      });
      if (isRestore) await auditRestore(row.orderId, { approved: false, remark: value.trim() });
      else await auditPause(row.orderId, { approved: false, remark: value.trim() });
      ElMessage.success('已驳回');
    }
    refreshAll();
  } catch (e) {
    if (e !== 'cancel' && e?.name !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const handleRequestRestore = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt('请填写恢复原因', '申请恢复生产', {
      inputType: 'textarea', confirmButtonText: '提交申请', cancelButtonText: '取消',
      inputPlaceholder: '如：款式已确认，可以继续做'
    });
    await requestRestore(row.orderId, (value || '').trim());
    ElMessage.success('恢复申请已提交，等待客户审核员审批');
    refreshAll();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '提交失败');
  }
};

const handleWithdrawPause = async (row) => {
  try {
    await ElMessageBox.confirm('确定撤回该申请吗？', '撤回申请', { type: 'warning' });
    await withdrawPause(row.orderId);
    ElMessage.success('已撤回');
    refreshAll();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '撤回失败');
  }
};

const refreshAll = () => {
  loadCounts();
  reloadCurrent();
};

onMounted(() => {
  reloadCurrent();
  loadCounts();
});
</script>

<style scoped>
.page-container { background: #fff; border-radius: 12px; padding: 20px; min-height: 100%; }
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 14px; border-bottom: 1px solid #e8ecf1; margin-bottom: 8px;
}
.hd-left { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.hd-left h2 { font-size: 19px; font-weight: 600; margin: 0; color: #1d2129; }
.hd-sub { font-size: 12px; color: #86909c; }
.hd-right { display: flex; gap: 8px; }

.tab-label { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; }
.tab-badge { margin-top: -2px; }
.tab-badge :deep(.el-badge__content) { transform: translateY(-2px); }

.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 4px 0 12px; }
.pager { display: flex; justify-content: flex-end; margin-top: 14px; }

.sub-time { font-size: 12px; color: #909399; line-height: 1.5; }
.flow-steps { display: flex; gap: 8px; font-size: 12px; color: #c0c4cc; }
.flow-steps .done { color: #1f9254; font-weight: 500; }

.blink-modify { animation: blink 1s infinite; color: #f56c6c; font-weight: 700; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }

.diff-row { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 2px; }
.diff-label { color: #409eff; min-width: 76px; }
.diff-old { color: #303133; text-decoration: line-through; }
.diff-new { color: #f56c6c; font-weight: 600; }
.diff-empty { color: #909399; font-size: 12px; }
</style>
