<!-- src/views/inout/hub.vue
     ⭐ 进销存「进 / 出」模块首页：三个大按钮直达金 / 钻石 / 金额录入
     由路由 meta.direction 区分（1=进，0=出）
-->
<template>
  <div class="inout-hub" :class="isIn ? 'is-in' : 'is-out'">
    <div class="hub-header">
      <div class="hub-title">
        <span class="hub-icon">{{ isIn ? '📥' : '📤' }}</span>
        <div>
          <h2>{{ isIn ? '进模块' : '出模块' }}</h2>
          <p>{{ isIn ? '金料 / 钻石 / 金额 的收入登记' : '金料 / 钻石 / 金额 的支出登记' }}</p>
        </div>
      </div>
      <div class="hub-meta">
        <span class="meta-item">今日 <b>{{ todayTotal }}</b> 条</span>
        <el-button size="small" :loading="loading" @click="loadCounts">刷新</el-button>
      </div>
    </div>

    <div class="tile-grid" v-loading="loading">
      <div v-for="t in tiles" :key="t.key" class="tile" @click="go(t)">
        <div class="tile-icon">{{ t.icon }}</div>
        <div class="tile-body">
          <div class="tile-title">{{ t.title }}</div>
          <div class="tile-desc">{{ t.desc }}</div>
        </div>
        <div class="tile-side">
          <div class="tile-count">{{ t.today }}</div>
          <div class="tile-count-label">今日</div>
        </div>
        <div class="tile-arrow">›</div>
      </div>
    </div>

    <div class="hub-footer">
      <span class="foot-label">查看明细</span>
      <el-button link type="primary" @click="go({ path: '/inout/gold-list', query: q })">金列表</el-button>
      <el-button link type="primary" @click="go({ path: '/inout/diamond-list', query: q })">钻石列表</el-button>
      <el-button link type="primary" @click="go({ path: '/inout/expense-list', query: q })">资金列表</el-button>
      <el-button link type="primary" @click="go({ path: '/inout/list' })">总进出管理</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getGoldList, getDiamondList, getExpenseList } from '@/api/inout';

const route = useRoute();
const router = useRouter();

const direction = computed(() => Number(route.meta?.direction ?? 1));
const isIn = computed(() => direction.value === 1);
const loading = ref(false);

const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const counts = ref({ gold: 0, diamond: 0, expense: 0 });

const BASE_TILES = [
  { key: 'gold',    icon: '🥇', title: '金料', descIn: '金料入库登记（含损耗、金价、工费）', pathIn: '/inout/gold/in',    pathOut: '/inout/gold/out',    list: '/inout/gold-list' },
  { key: 'diamond', icon: '💎', title: '钻石', descIn: '钻石入库登记（克拉、单价、金额）',   pathIn: '/inout/diamond/in', pathOut: '/inout/diamond/out', list: '/inout/diamond-list' },
  { key: 'expense', icon: '💰', title: '金额', descIn: '费用 / 资金收入登记',                pathIn: '/inout/expense/in', pathOut: '/inout/expense/out', list: '/inout/expense-list' },
];

const tiles = computed(() => BASE_TILES.map(t => ({
  ...t,
  title: t.title + (isIn.value ? '录入' : '录出'),
  desc: isIn.value ? t.descIn : t.descIn.replace('入库', '出库').replace('收入', '支出'),
  path: isIn.value ? t.pathIn : t.pathOut,
  today: counts.value[t.key] || 0,
})));

const todayTotal = computed(() => (counts.value.gold || 0) + (counts.value.diamond || 0) + (counts.value.expense || 0));
const q = computed(() => ({ direction: String(direction.value) }));

const loadCounts = async () => {
  loading.value = true;
  const d = today();
  const params = { startDate: d, endDate: d, direction: direction.value, page: 1, pageSize: 1 };
  try {
    const [g, dm, ex] = await Promise.all([
      getGoldList(params).catch(() => null),
      getDiamondList(params).catch(() => null),
      getExpenseList(params).catch(() => null),
    ]);
    counts.value = {
      gold: g?.total || 0,
      diamond: dm?.total || 0,
      expense: ex?.total || 0,
    };
  } finally {
    loading.value = false;
  }
};

const go = (t) => router.push({ path: t.path, query: t.query || {} });

onMounted(loadCounts);
</script>

<style scoped>
.inout-hub { padding: 6px; }

.hub-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-radius: 10px; margin-bottom: 16px;
  background: #f4fbf6; border: 1px solid #d6efdd;
}
.is-out .hub-header { background: #fdf7f2; border-color: #f4dfc9; }
.hub-title { display: flex; align-items: center; gap: 14px; }
.hub-icon { font-size: 34px; line-height: 1; }
.hub-title h2 { margin: 0; font-size: 20px; color: #303133; }
.hub-title p { margin: 4px 0 0; font-size: 13px; color: #909399; }
.hub-meta { display: flex; align-items: center; gap: 12px; }
.meta-item { font-size: 13px; color: #606266; }
.meta-item b { color: #2f9e5f; font-size: 20px; margin: 0 3px; }
.is-out .meta-item b { color: #d9822b; }

.tile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.tile {
  display: flex; align-items: center; gap: 16px;
  padding: 30px 24px; border-radius: 14px; cursor: pointer;
  background: #fff; border: 1px solid #ebeef5;
  transition: transform .15s, box-shadow .15s, border-color .15s;
}
.tile:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(64,158,255,.14); border-color: #b3d8ff; }
.is-in .tile:hover { border-color: #9ed8b3; box-shadow: 0 6px 18px rgba(47,158,95,.16); }
.is-out .tile:hover { border-color: #f0c9a0; box-shadow: 0 6px 18px rgba(217,130,43,.16); }

.tile-icon {
  width: 76px; height: 76px; flex: 0 0 76px;
  display: flex; align-items: center; justify-content: center;
  font-size: 40px; border-radius: 18px; background: #f5f9ff;
}
.is-in .tile-icon { background: #eef9f1; }
.is-out .tile-icon { background: #fdf3ea; }
.tile-body { flex: 1; min-width: 0; }
.tile-title { font-size: 19px; font-weight: 600; color: #303133; margin-bottom: 6px; }
.tile-desc { font-size: 13px; color: #909399; line-height: 1.5; }
.tile-side { text-align: right; padding-right: 6px; }
.tile-count { font-size: 28px; font-weight: 700; color: #2f9e5f; line-height: 1.1; }
.is-out .tile-count { color: #d9822b; }
.is-in .tile-count.is-zero { color: #c0c4cc; }
.tile-count-label { font-size: 11px; color: #b0b3b8; }
.tile-arrow { font-size: 26px; color: #c8c9cc; line-height: 1; }

.hub-footer {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin-top: 16px; padding: 10px 14px; border-radius: 8px; background: #fafafa;
}
.foot-label { font-size: 13px; color: #909399; margin-right: 6px; }
</style>
