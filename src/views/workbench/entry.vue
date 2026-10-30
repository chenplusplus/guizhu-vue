<!-- src/views/workbench/entry.vue
     ⭐ 录入工作台（工厂操作员）：一目了然的快捷录入入口
     与「审核工作台」同一套卡片风格
-->
<template>
  <div class="entry-workbench">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">⌨️ 录入工作台</span>
            <span class="pending-total">待办 <b>{{ total }}</b> 项</span>
            <span class="sub">今日账单 {{ billToday }} 张</span>
            <span class="sub warn" v-if="costMissing">已完成待录成本 {{ costMissing }}</span>
          </div>
          <el-button size="small" :loading="loading" @click="loadData">刷新</el-button>
        </div>
      </template>

      <div class="card-grid" v-loading="loading">
        <div v-for="c in cards" :key="c.type" class="entry-card" :class="{ 'is-empty': !c.count }">
          <div class="card-top">
            <span class="card-icon">{{ c.icon }}</span>
            <span class="card-name">{{ c.label }}</span>
          </div>
          <div class="card-count" :class="{ zero: !c.count }">{{ c.count }}</div>
          <div class="card-meta">{{ c.unit }}</div>
          <div class="card-actions">
            <el-button
              v-for="a in c.actions"
              :key="a.label"
              size="small"
              type="primary"
              :disabled="!c.count && !c.alwaysOn"
              @click="go(a)"
            >{{ a.label }}</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="tip-card">
      <div class="tip-line">
        <span class="tip-label">常用单据</span>
        <el-button link type="primary" @click="go({ path: '/order/factory-history' })">历史订单</el-button>
        <el-button link type="primary" @click="go({ path: '/order/modify-list' })">修改过订单</el-button>
        <el-button link type="primary" @click="go({ path: '/order/bill/my-list' })">我的账单</el-button>
        <el-button link type="primary" @click="go({ path: '/order/bill/list' })">账单列表</el-button>
        <el-button link type="primary" @click="go({ path: '/inout/list' })">总进出管理</el-button>
        <el-button link type="primary" @click="go({ path: '/transaction/counterpart-summary' })">往来单位汇总</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getEntrySummary } from '@/api/workbench';

const router = useRouter();
const loading = ref(false);
const data = ref({ items: [], total: 0, billToday: 0 });

// 卡片：type 与后端 items[].type 对应
const CARD_META = [
  { type: 'waitAccept', icon: '📥', label: '待接单', unit: '待接单',
    actions: [{ label: '去接单', path: '/order/factory-accept' }] },
  { type: 'editing', icon: '✏️', label: '订单编辑', unit: '制作中',
    actions: [{ label: '去处理', path: '/order/factory-edit-list' }] },
  { type: 'billable', icon: '🧾', label: '账单列表', unit: '待提交审核',
    actions: [{ label: '去处理', path: '/order/bill/list' }] },
  { type: 'cost', icon: '💰', label: '成本表编辑', unit: 'LR 草稿待确认',
    actions: [{ label: '去处理', path: '/order/lr/list' }] },
  {
    type: 'process', icon: '🔧', label: '师傅表录入', unit: '待审核',
    alwaysOn: true,
    actions: [
      { label: '执模', path: '/process/zm-input' },
      { label: '镶石', path: '/process/xs-input' },
      { label: '抛光', path: '/process/pg-input' },
      { label: '单据', path: '/process/zm-list' },
    ]
  },
  {
    type: 'inoutIn', icon: '📥', label: '进销存·录入', unit: '待提交 / 待审核',
    alwaysOn: true,
    actions: [{ label: '去录入', path: '/inout/in-hub' }]
  },
  {
    type: 'inoutOut', icon: '📤', label: '进销存·录出', unit: '待提交 / 待审核',
    alwaysOn: true,
    actions: [{ label: '去录出', path: '/inout/out-hub' }]
  },
];

const counts = computed(() => {
  const m = {};
  (data.value.items || []).forEach(x => { m[x.type] = x.count || 0; });
  // 成本卡复用 LR 草稿数（成本表 = LR 表成本行）
  m.cost = m.lr || 0;
  return m;
});

// 成本卡：用「已完成待录成本」作为计数；LR 草稿作为参考不单独展示
const cards = computed(() => CARD_META.map(c => ({
  ...c,
  count: counts.value[c.type] ?? 0,
})));

const total = computed(() => data.value.total || 0);
const billToday = computed(() => data.value.billToday || 0);
const costMissing = computed(() => data.value.costMissing || 0);

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getEntrySummary();
    data.value = res?.data || { items: [], total: 0, billToday: 0 };
  } catch (e) {
    console.error('加载录入工作台失败:', e);
  } finally {
    loading.value = false;
  }
};

const go = (a) => router.push({ path: a.path, query: a.query || {} });

onMounted(loadData);
</script>

<style scoped>
.entry-workbench { padding: 4px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-left { display: flex; align-items: baseline; gap: 14px; }
.title { font-size: 15px; font-weight: 600; color: #303133; }
.pending-total { font-size: 13px; color: #909399; }
.pending-total b { color: #c0392b; font-size: 18px; margin: 0 2px; }
.sub { font-size: 12px; color: #909399; }
.sub.warn { color: #e6a23c; }

.card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(186px, 1fr)); gap: 12px; }
.entry-card {
  border: 1px solid #ebeef5; border-radius: 8px; padding: 14px; background: #fff;
  transition: box-shadow .2s, border-color .2s;
}
.entry-card:hover { border-color: #c6e2ff; box-shadow: 0 2px 10px rgba(64, 158, 255, .12); }
.entry-card.is-empty { background: #fafafa; }
.card-top { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.card-icon { font-size: 16px; }
.card-name { font-size: 13px; color: #606266; font-weight: 500; flex: 1; }
.card-count { font-size: 30px; font-weight: 700; color: #c0392b; line-height: 1.25; }
.card-count.zero { color: #c0c4cc; }
.card-meta { font-size: 12px; color: #909399; margin-bottom: 10px; }
.card-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.tip-card { margin-top: 12px; }
.tip-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tip-label { font-size: 13px; color: #909399; margin-right: 6px; }
</style>
