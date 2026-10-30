<!-- src/views/workbench/customer.vue
     ⭐ 客户工作台（按角色区分）
        · 客户下单员（customer）      → 下单 / 草稿 / 待确认账单
        · 客户审核员（customerAudit） → 订单审核 / 修改审核 / 账单确认
     与「录入工作台」「审核工作台」同一套卡片风格，顶部保留问候语
-->
<template>
  <div class="customer-workbench">
    <!-- ===== 顶部欢迎区域（保留问候语）===== -->
    <div class="welcome-section">
      <div class="welcome-left">
        <h1>👋 欢迎回来，{{ userStore.realName || userStore.userName || '用户' }}</h1>
        <p class="welcome-sub">{{ greeting }}，{{ roleHint }}</p>
      </div>
      <div class="welcome-right">
        <span class="date-display">{{ currentDate }}</span>
        <span class="weekday">{{ currentWeekday }}</span>
        <el-tag size="small" effect="plain" class="role-tag">{{ userStore.userTypeName }}</el-tag>
      </div>
    </div>

    <!-- ===== 待办总览 ===== -->
    <el-card shadow="never" class="summary-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">{{ isAudit ? '✅ 客户审核工作台' : '📝 客户下单工作台' }}</span>
            <span class="pending-total">待办 <b>{{ total }}</b> 项</span>
            <span class="sub" v-if="billToConfirmAmount > 0">
              待确认账单金额 ¥{{ fmtMoney(billToConfirmAmount) }}
            </span>
          </div>
          <el-button size="small" :loading="loading" @click="loadData">刷新</el-button>
        </div>
      </template>

      <div class="card-grid" v-loading="loading">
        <div v-for="c in cards" :key="c.type" class="wb-card"
             :class="{ 'is-empty': !c.count, 'is-readonly': c.isReadonly }">
          <div class="card-top">
            <span class="card-icon">{{ c.icon }}</span>
            <span class="card-name">{{ c.label }}</span>
            <el-tag v-if="c.isReadonly" size="small" type="info" effect="plain">只读</el-tag>
          </div>
          <div class="card-count" :class="{ zero: !c.count }">{{ c.count }}</div>
          <div class="card-meta">{{ c.unit }}</div>
          <div class="card-actions">
            <el-button
              v-for="a in c.actions"
              :key="a.label"
              size="small"
              :type="c.isReadonly ? 'info' : 'primary'"
              :plain="c.isReadonly"
              :disabled="!c.count"
              @click="go(a)"
            >{{ a.label }}</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- ===== 待办明细 ===== -->
    <el-card shadow="never" class="detail-card">
      <template #header>
        <div class="card-header">
          <span class="title">📋 待办明细</span>
          <div>
            <el-select v-model="filterType" size="small" clearable placeholder="全部类型"
                       style="width:170px;margin-right:8px;">
              <el-option v-for="c in filterOptions" :key="c.type" :label="c.label" :value="c.type" />
            </el-select>
            <el-button size="small" @click="loadData">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="filteredTodos" border size="small" v-loading="loading" empty-text="暂无待办，今日无单可做">
        <el-table-column label="类型" width="130" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="tagType(row.bizType)">{{ typeLabel(row.bizType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bizNo" label="单号" min-width="150" show-overflow-tooltip />
        <el-table-column prop="party" label="品名 / 客户" min-width="150" show-overflow-tooltip />
        <el-table-column label="金额" width="130" align="right">
          <template #default="{ row }">{{ row.amount == null ? '-' : '¥' + Number(row.amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="日期" width="120" align="center">
          <template #default="{ row }">{{ fmtDate(row.bizDate) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="110" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleTodo(row)">{{ actionText(row) }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ===== 快捷入口 ===== -->
    <el-card shadow="never" class="quick-card">
      <template #header><span class="title">🚀 快捷入口</span></template>
      <div class="quick-grid">
        <div v-for="item in quickActions" :key="item.path" class="quick-item" @click="go(item)">
          <div class="quick-icon" :style="{ background: item.bgColor }">
            <span style="font-size:26px;">{{ item.icon }}</span>
          </div>
          <span class="quick-label">{{ item.label }}</span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { getCustomerSummary } from '@/api/workbench';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// 审核员模式：客户审核员 或 由「客户审核工作台」路由进入（管理员预览）
const isAudit = computed(() =>
  userStore.isCustomerAudit || route.name === 'CustomerAuditWorkbench'
);

const loading = ref(false);
const data = ref({ items: [], todos: [], total: 0, billToConfirmAmount: 0 });
const filterType = ref('');

// ===== 日期 / 问候语（保留上午好 / 下午好）=====
const now = new Date();
const currentDate = computed(() =>
  now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
);
const currentWeekday = computed(() =>
  ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()]
);
const greeting = computed(() => {
  const hour = now.getHours();
  if (hour < 6) return '夜深了，注意休息';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了，注意休息';
});
const roleHint = computed(() =>
  isAudit.value ? '今天要审的单都在下面' : '今天要下的单都在这儿'
);

// ===== 卡片定义（按角色区分）=====
const CUSTOMER_CARDS = [
  { type: 'draft',         icon: '📝', label: '草稿订单',   unit: '待提交',
    actions: [{ label: '去处理', path: '/order/my-list' }] },
  { type: 'pendingAudit',  icon: '⏳', label: '待客户审核', unit: '已提交待审核',
    actions: [{ label: '去查看', path: '/order/my-list' }] },
  { type: 'rejected',      icon: '⛔', label: '审核未通过', unit: '需修改后重新提交',
    actions: [{ label: '去修改', path: '/order/my-list' }] },
  { type: 'producing',     icon: '🏭', label: '制作中',     unit: '工厂进行中',
    actions: [{ label: '去查看', path: '/order/my-list' }] },
  { type: 'billToConfirm', icon: '🧾', label: '待确认账单', unit: '账单待我确认',
    actions: [{ label: '去确认', path: '/order/bill/my-list' }] },
  { type: 'returnPending', icon: '↩️', label: '退货待处理', unit: '处理中',
    actions: [{ label: '去查看', path: '/order/return' }] },
  { type: 'completed',     icon: '📦', label: '已完成订单', unit: '历史记录', isReadonly: true,
    actions: [{ label: '去查看', path: '/order/my-list' }] },
];

const AUDIT_CARDS = [
  { type: 'pendingAudit',  icon: '✅', label: '待审核订单', unit: '待我审核',
    actions: [{ label: '去审核', path: '/order/audit' }] },
  { type: 'modifyAudit',   icon: '✏️', label: '修改待审核', unit: '待我审核',
    actions: [{ label: '去审核', path: '/order/modify-list' }] },
  { type: 'billToConfirm', icon: '🧾', label: '待确认账单', unit: '账单待我确认',
    actions: [{ label: '去确认', path: '/order/bill/my-list' }] },
  { type: 'rejected',      icon: '⛔', label: '审核未通过', unit: '客户侧待修改',
    actions: [{ label: '去查看', path: '/order/my-list' }] },
  { type: 'returnPending', icon: '↩️', label: '退货待处理', unit: '处理中',
    actions: [{ label: '去查看', path: '/order/return' }] },
  { type: 'producing',     icon: '🏭', label: '制作中订单', unit: '仅查看', isReadonly: true,
    actions: [{ label: '去查看', path: '/order/my-list' }] },
  { type: 'completed',     icon: '📦', label: '已完成订单', unit: '历史记录', isReadonly: true,
    actions: [{ label: '去查看', path: '/order/my-list' }] },
];

const CARD_META = computed(() => (isAudit.value ? AUDIT_CARDS : CUSTOMER_CARDS));

const counts = computed(() => {
  const m = {};
  (data.value.items || []).forEach(x => { m[x.type] = x.count || 0; });
  return m;
});

const cards = computed(() =>
  CARD_META.value.map(c => ({ ...c, count: counts.value[c.type] ?? 0 }))
);

const total = computed(() => data.value.total || 0);
const billToConfirmAmount = computed(() => data.value.billToConfirmAmount || 0);

// ===== 待办明细 =====
const TODOS = computed(() => data.value.todos || []);

// 筛选下拉只列「当前待办里真实存在的类型」，避免选了必空
const filterOptions = computed(() => {
  const present = new Set(TODOS.value.map(r => r.bizType));
  return CARD_META.value.filter(c => present.has(c.type));
});

const filteredTodos = computed(() => {
  let rows = TODOS.value;
  if (isAudit.value) rows = rows.filter(r => r.bizType !== 'draft');
  else rows = rows.filter(r => r.bizType !== 'modifyAudit');
  if (filterType.value) rows = rows.filter(r => r.bizType === filterType.value);
  return rows;
});

const typeLabel = (t) => (CARD_META.value.find(x => x.type === t)?.label || {
  draft: '草稿订单', pendingAudit: '待审核订单', rejected: '审核未通过',
  producing: '制作中', billToConfirm: '待确认账单', modifyAudit: '修改待审核',
  returnPending: '退货待处理', completed: '已完成订单', billConfirmed: '账单已确认',
}[t] || t);

const tagType = (t) => ({
  draft: 'info', pendingAudit: 'warning', rejected: 'danger',
  producing: 'primary', billToConfirm: 'success', modifyAudit: 'warning',
  returnPending: 'danger', completed: 'info',
}[t] || 'info');

const actionText = (row) => ({
  draft: '继续编辑', pendingAudit: isAudit.value ? '去审核' : '查看',
  modifyAudit: '去审核', billToConfirm: '去确认', returnPending: '去查看',
}[row.bizType] || '去处理');

const handleTodo = (row) => {
  if (row.bizType === 'draft') return router.push(`/order/create/${row.bizId}`);
  if (row.bizType === 'billToConfirm') return router.push(`/order/bill/detail/${row.bizId}`);
  if (row.bizType === 'pendingAudit' && isAudit.value) return router.push('/order/audit');
  if (row.bizType === 'modifyAudit') return router.push('/order/modify-list');
  if (row.bizType === 'returnPending') return router.push('/order/return');
  return router.push(`/order/detail/${row.bizId}`);
};

// ===== 快捷入口（按角色区分）=====
const quickActions = computed(() => (isAudit.value ? [
  { icon: '✅', label: '订单审核',     path: '/order/audit',         bgColor: '#FFF7E6' },
  { icon: '🧾', label: '我的账单',     path: '/order/bill/my-list',  bgColor: '#E6F7FF' },
  { icon: '✏️', label: '修改审核', path: '/order/modify-list',   bgColor: '#F6FFED' },
  { icon: '📋', label: '我的订单',     path: '/order/my-list',       bgColor: '#F0F5FF' },
  { icon: '↩️', label: '退货记录',     path: '/order/return',        bgColor: '#FFF1F0' },
] : [
  { icon: '➕', label: '新建订单',     path: '/order/create',        bgColor: '#E6F7FF' },
  { icon: '📋', label: '我的订单',     path: '/order/my-list',       bgColor: '#F6FFED' },
  { icon: '🧾', label: '我的账单',     path: '/order/bill/my-list',  bgColor: '#F0F5FF' },
  { icon: '✏️', label: '修改订单',     path: '/order/modify-list',   bgColor: '#FFF7E6' },
  { icon: '↩️', label: '退货记录',     path: '/order/return',        bgColor: '#FFF1F0' },
  { icon: '🏭', label: '历史订单',     path: '/order/factory-history', bgColor: '#F9F0FF' },
]));

// ===== 工具 =====
const fmtDate = (v) => (v ? String(v).slice(0, 10) : '-');
const fmtMoney = (v) => Number(v || 0).toFixed(2);

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getCustomerSummary();
    data.value = res?.data || { items: [], todos: [], total: 0, billToConfirmAmount: 0 };
  } catch (e) {
    console.error('加载客户工作台失败:', e);
  } finally {
    loading.value = false;
  }
};

const go = (a) => router.push({ path: a.path, query: a.query || {} });

onMounted(loadData);
</script>

<style scoped>
.customer-workbench { padding: 4px; background: #f0f2f5; min-height: 100%; }

/* ===== 欢迎区域 ===== */
.welcome-section {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; padding: 18px 24px; border-radius: 12px; margin-bottom: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .04);
}
.welcome-left h1 { font-size: 21px; font-weight: 600; color: #1d2129; margin: 0 0 4px 0; }
.welcome-sub { color: #86909c; font-size: 14px; margin: 0; }
.welcome-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.date-display { font-size: 15px; font-weight: 500; color: #1d2129; }
.weekday { font-size: 13px; color: #86909c; }
.role-tag { margin-top: 2px; }

/* ===== 卡片区 ===== */
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-left { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.title { font-size: 15px; font-weight: 600; color: #303133; }
.pending-total { font-size: 13px; color: #909399; }
.pending-total b { color: #c0392b; font-size: 18px; margin: 0 2px; }
.sub { font-size: 12px; color: #909399; }

.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 10px; }
.wb-card {
  border: 1px solid #ebeef5; border-radius: 8px; padding: 14px; background: #fff;
  transition: box-shadow .2s, border-color .2s;
}
.wb-card:hover { border-color: #c6e2ff; box-shadow: 0 2px 10px rgba(64, 158, 255, .12); }
.wb-card.is-empty { background: #fafafa; }
.wb-card.is-readonly { background: #f7f9fc; }
.card-top { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.card-icon { font-size: 16px; }
.card-name { font-size: 13px; color: #606266; font-weight: 500; flex: 1; }
.card-count { font-size: 30px; font-weight: 700; color: #c0392b; line-height: 1.25; }
.card-count.zero { color: #c0c4cc; }
.card-meta { font-size: 12px; color: #909399; margin-bottom: 10px; }
.card-actions { display: flex; gap: 6px; flex-wrap: wrap; }

/* ===== 明细 / 快捷入口 ===== */
.detail-card, .quick-card { margin-top: 12px; }
.quick-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 12px; padding: 4px 0; }
.quick-item {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  cursor: pointer; padding: 12px 8px; border-radius: 8px; transition: all .3s;
}
.quick-item:hover { background: #f5f7fa; transform: translateY(-2px); }
.quick-icon {
  width: 54px; height: 54px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.quick-label { font-size: 13px; color: #4e5969; text-align: center; white-space: nowrap; }
</style>
