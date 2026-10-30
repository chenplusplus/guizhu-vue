<template>
  <div class="audit-workbench">
    <!-- 顶部：待办总览 -->
    <el-card shadow="never" class="summary-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">✅ 审核工作台</span>
            <span class="pending-total">待办 <b>{{ totalPending }}</b> 项</span>
          </div>
          <el-button size="small" :loading="loading" @click="loadAll">刷新</el-button>
        </div>
      </template>

      <div class="card-grid" v-loading="loading">
        <div v-for="c in cards" :key="c.type" class="audit-card" :class="{ 'is-empty': !c.count, 'is-readonly': c.isReadonly }">
          <div class="card-top">
            <span class="card-icon">{{ c.icon }}</span>
            <span class="card-name">{{ c.label }}</span>
            <el-tag v-if="c.isReadonly" size="small" type="info" effect="plain">只读</el-tag>
          </div>
          <div class="card-count" :class="{ zero: !c.count }">{{ c.count }}</div>
          <div class="card-meta">最近提交：{{ c.latestAt ? fmtTime(c.latestAt) : '—' }}</div>
          <div class="card-actions">
            <el-button
              v-for="a in c.actions"
              :key="a.label"
              size="small"
              :type="c.isReadonly ? 'info' : 'primary'"
              :plain="c.isReadonly"
              :disabled="!c.count && !c.isReadonly"
              @click="go(a)"
            >{{ a.label }}</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 待办明细 -->
    <el-card shadow="never" class="detail-card">
      <template #header>
        <div class="card-header">
          <span class="title">📋 待办明细</span>
          <div>
            <el-select v-model="filterType" size="small" clearable placeholder="全部类型"
                       style="width:170px;margin-right:8px;" @change="loadList">
              <el-option v-for="c in cards.filter(x => !x.isReadonly)" :key="c.type" :label="c.label" :value="c.type" />
            </el-select>
            <el-button size="small" @click="loadList">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="rows" border size="small" v-loading="loading" empty-text="暂无待办">
        <el-table-column prop="bizType" label="类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="tagType(row.bizType)">{{ typeLabel(row.bizType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bizNo" label="单号" min-width="150" show-overflow-tooltip />
        <el-table-column prop="party" label="往来单位 / 师傅" min-width="150" show-overflow-tooltip />
        <el-table-column label="金额" width="130" align="right">
          <template #default="{ row }">{{ row.amount == null ? '-' : '¥' + Number(row.amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="单据日期" width="120" align="center">
          <template #default="{ row }">{{ fmtDate(row.bizDate) }}</template>
        </el-table-column>
        <el-table-column label="提交时间" width="150" align="center">
          <template #default="{ row }">{{ fmtTime(row.createdTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goType(row.bizType)">去处理</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAuditPendingSummary, getAuditPendingList } from '@/api/audit';

const router = useRouter();

const loading = ref(false);
const filterType = ref('');
const rows = ref([]);
const counts = ref({});

// 卡片元数据：type → 名称 / 图标 / 跳转目标
// 进销存按「进 / 出」拆卡，direction: 1=进（收），0=出（支）
const CARD_META = [
  { type: 'goldIn',    icon: '🥇', label: '金料·进', actions: [{ label: '去审核', path: '/inout/gold-list',    query: { status: 'pending', direction: '1', mode: 'audit' } }] },
  { type: 'goldOut',   icon: '🥇', label: '金料·出', actions: [{ label: '去审核', path: '/inout/gold-list',    query: { status: 'pending', direction: '0', mode: 'audit' } }] },
  { type: 'diamondIn', icon: '💎', label: '钻石·进', actions: [{ label: '去审核', path: '/inout/diamond-list', query: { status: 'pending', direction: '1', mode: 'audit' } }] },
  { type: 'diamondOut',icon: '💎', label: '钻石·出', actions: [{ label: '去审核', path: '/inout/diamond-list', query: { status: 'pending', direction: '0', mode: 'audit' } }] },
  { type: 'expenseIn', icon: '💰', label: '金额·进', actions: [{ label: '去审核', path: '/inout/expense-list', query: { status: 'pending', direction: '1', mode: 'audit' } }] },
  { type: 'expenseOut',icon: '💰', label: '金额·出', actions: [{ label: '去审核', path: '/inout/expense-list', query: { status: 'pending', direction: '0', mode: 'audit' } }] },
  { type: 'bill',      icon: '🧾', label: '账单审核',        actions: [{ label: '去审核', path: '/order/bill/audit',   query: {} }] },
  { type: 'receipt',   icon: '💰', label: '账单收款',        actions: [{ label: '去审核', path: '/order/bill/receipt-audit', query: {} }] },
  { type: 'lr',        icon: '📊', label: 'LR 表',           actions: [{ label: '去审核', path: '/order/lr/list',      query: { status: 'submitted', mode: 'audit' } }] },
  { type: 'batch',     icon: '📦', label: '盘点',            actions: [{ label: '去审核', path: '/inventory',          query: { status: 'preparing', mode: 'audit' } }] },
  {
    type: 'process', icon: '🔧', label: '师傅进出',
    actions: [
      { label: '执模', path: '/process/zm-list', query: { mode: 'audit' } },
      { label: '镶石', path: '/process/xs-list', query: { mode: 'audit' } },
      { label: '抛光', path: '/process/pg-list', query: { mode: 'audit' } },
    ]
  },
  { type: 'orderAudit', icon: '🏭', label: '制作完成待审',
    actions: [{ label: '去审核', path: '/order/factory-audit-list', query: { mode: 'audit' } }] },
  { type: 'completed', icon: '✅', label: '已完成订单', isReadonly: true,
    actions: [{ label: '去查看', path: '/order/list', query: { status: 'completed', mode: 'audit' } }] },
];
const cards = computed(() => CARD_META.map(m => {
  const hit = (counts.value.items || []).find(x => x.type === m.type) || {};
  return { ...m, count: hit.count || 0, latestAt: hit.latestAt, isReadonly: !!m.isReadonly };
}));

const totalPending = computed(() => counts.value.totalPending || 0);

const typeLabel = (t) => (CARD_META.find(x => x.type === t)?.label || t);
const tagType = (t) => ({
  goldIn: 'warning', goldOut: 'warning', diamondIn: 'primary', diamondOut: 'primary',
  expenseIn: 'success', expenseOut: 'success',
  bill: 'danger', receipt: 'success', lr: 'primary', batch: 'info', process: 'warning',
  orderAudit: 'success'
}[t] || 'info');

const fmtDate = (v) => (v ? String(v).slice(0, 10) : '-');
const fmtTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 16) : '-');

const loadSummary = async () => {
  const res = await getAuditPendingSummary();
  counts.value = res?.data || {};
};

const loadList = async () => {
  const res = await getAuditPendingList({ type: filterType.value || undefined, limit: 50 });
  rows.value = res?.data || [];
};

const loadAll = async () => {
  loading.value = true;
  try {
    await Promise.all([loadSummary(), loadList()]);
  } catch (e) {
    console.error('加载审核待办失败:', e);
  } finally {
    loading.value = false;
  }
};

const go = (action) => router.push({ path: action.path, query: action.query || {} });
const goType = (type) => {
  const meta = CARD_META.find(x => x.type === type);
  if (meta?.actions?.length) go(meta.actions[0]);
};

onMounted(loadAll);
</script>

<style scoped>
.audit-workbench { padding: 4px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-left { display: flex; align-items: baseline; gap: 14px; }
.title { font-size: 15px; font-weight: 600; color: #303133; }
.pending-total { font-size: 13px; color: #909399; }
.pending-total b { color: #c0392b; font-size: 18px; margin: 0 2px; }

.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
.audit-card {
  border: 1px solid #ebeef5; border-radius: 8px; padding: 14px; background: #fff;
  transition: box-shadow .2s, border-color .2s;
}
.audit-card:hover { border-color: #c6e2ff; box-shadow: 0 2px 10px rgba(64, 158, 255, .12); }
.audit-card.is-empty { background: #fafafa; }
.audit-card.is-readonly { background: #f7f9fc; }
.card-top { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.card-icon { font-size: 16px; }
.card-name { font-size: 13px; color: #606266; font-weight: 500; flex: 1; }
.card-count { font-size: 30px; font-weight: 700; color: #c0392b; line-height: 1.25; }
.card-count.zero { color: #c0c4cc; }
.card-meta { font-size: 12px; color: #909399; margin-bottom: 10px; }
.card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.detail-card { margin-top: 12px; }
</style>
