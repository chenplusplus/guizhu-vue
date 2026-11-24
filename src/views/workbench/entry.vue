<!-- src/views/workbench/entry.vue
     ⭐ 录入工作台（工厂操作员）：一目了然的快捷录入入口
     与「审核工作台」同一套卡片风格
-->
<template>
  <div class="entry-workbench">
    <!-- ⭐ 今日金价（工厂操作员：未填可当场填写） -->
    <TodayGoldPriceBar />
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

        <!-- ⭐ 今日金价卡片（2026-11-07：从顶部横幅的填写按钮挪到卡片，横幅改纯只读） -->
        <div class="entry-card" :class="{ 'is-empty': goldStat.key === 'none' }">
          <div class="card-top">
            <span class="card-icon">💰</span>
            <span class="card-name">今日金价</span>
          </div>
          <div class="card-count gold-status" :class="'g-' + goldStat.key">{{ goldStat.label }}</div>
          <div class="card-meta">{{ goldStat.meta }}</div>
          <div class="card-actions">
            <el-button size="small" type="primary" @click="openGoldFill">{{ goldStat.btn }}</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="tip-card">
      <div class="tip-line">
        <span class="tip-label">常用单据</span>
        <el-button link type="primary" @click="go({ path: '/order/factory-history' })">历史订单</el-button>
        <el-button link type="primary" @click="go({ path: '/order/customer-approval', query: { tab: 'modify' } })">审批中心</el-button>
        <el-button link type="primary" @click="go({ path: '/order/bill/my-list' })">我的账单</el-button>
        <el-button link type="primary" @click="go({ path: '/order/bill/list' })">账单状态</el-button>
        <el-button link type="primary" @click="go({ path: '/inout/list' })">总进出管理</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="tip-card">
      <div class="tip-line">
        <span class="tip-label">快捷报表</span>
        <el-button
          v-for="report in reportShortcuts"
          :key="report.label"
          link
          type="primary"
          @click="go({ path: report.path })"
        >{{ report.label }}</el-button>
      </div>
    </el-card>

    <!-- 今日金价：填写 / 改价 -->
    <el-dialog v-model="goldFillVisible" :title="goldStatus === 'approved' ? '今日改价' : '填写今日金价'" width="460px" destroy-on-close>
      <el-alert v-if="goldStatus === 'approved'" type="warning" :closable="false" show-icon style="margin-bottom:12px">
        改价需要重新走「工厂审核 → 客户审核」，通过后今日「金价为空」的订单会自动补成新价，已有金价的订单不变。
      </el-alert>
      <!-- ⭐ 填的是牌价，提交时系统自动加价后才生效 -->
      <el-alert type="info" :closable="false" show-icon style="margin-bottom:12px"
        title="填「牌价」，提交时系统自动加价：金 +8、银 +2、PT +8 元/克" />
      <el-form label-width="88px">
        <el-form-item label="日期">
          <span>{{ goldDate }}</span>
          <el-link type="primary" :underline="false" style="margin-left:10px;font-size:12px" @click="router.push('/system/gold-price')">
            补填其他日期
          </el-link>
        </el-form-item>
        <el-form-item label="金价（牌价）" required>
          <el-input-number v-model="goldForm.goldPrice" :min="0" :precision="2" :step="1" style="width:100%" />
          <span class="unit">元/克 · 足金999 / 18K / 14K / 9K 共用 · 提交后 {{ (Number(goldForm.goldPrice||0)+8).toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="银价（牌价）" required>
          <el-input-number v-model="goldForm.silverPrice" :min="0" :precision="2" :step="0.1" style="width:100%" />
          <span class="unit">元/克 · 银950 / S925 共用 · 提交后 {{ (Number(goldForm.silverPrice||0)+2).toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="PT 价（牌价）" required>
          <el-input-number v-model="goldForm.ptPrice" :min="0" :precision="2" :step="1" style="width:100%" />
          <span class="unit">元/克 · PT 类共用 · 提交后 {{ (Number(goldForm.ptPrice||0)+8).toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="凭证图片">
          <MultiImageUpload v-model="goldImages" :max-count="6" type="price"
            tip="可上传牌价截图 / 报价单 / 群消息截图，最多 6 张，单张 ≤ 5MB（审核员可查看）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="goldFillVisible = false">取消</el-button>
        <el-button :loading="goldSaving" type="primary" @click="submitGoldFill">提交审核</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import TodayGoldPriceBar from '@/components/TodayGoldPriceBar.vue';
import MultiImageUpload from '@/components/MultiImageUpload.vue';
import { getEntrySummary } from '@/api/workbench';
import { getPriceSheetToday, savePriceSheet } from '@/api/priceSheet';
// ⭐ 本地时区的「今天」（UTC 会在凌晨 0-8 点退到前一天）
import { todayStr as localTodayStr } from '@/utils/date';

const router = useRouter();
const loading = ref(false);
const data = ref({ items: [], total: 0, billToday: 0 });
const reportShortcuts = [
  { label: '耗材分析', path: '/transaction/factory-summary' },
  { label: '经营看板', path: '/transaction/operating-dashboard' },
  { label: '客户月度账单', path: '/order/customer-monthly-bill' },
  // ⭐ 原「往来单位汇总」（/transaction/counterpart-summary）已下线，统一走对账单
  { label: '往来单位对账单', path: '/inout/report/statement' },
  // ⭐ 月度经营报表：直接进月报列表（新建盘点 / 盘点核算）
  { label: '月度经营报表', path: '/inventory/monthly-list' },
];

// ===== 今日金价卡片 =====
const gold = ref({ today: null, effective: {} });
const goldFillVisible = ref(false);
const goldSaving = ref(false);
const goldForm = ref({ goldPrice: 0, silverPrice: 0, ptPrice: 0 });
const goldImages = ref([]);
const goldDate = ref('');

const goldStatus = computed(() => gold.value.today?.status || gold.value.effective?.todayStatus || 'none');

// 展示价：当天金价单有值优先，否则显示当前生效价
const goldShown = computed(() => {
  const s = gold.value.today;
  if (s && Number(s.goldPrice) > 0) return { gold: s.goldPrice, silver: s.silverPrice, pt: s.ptPrice };
  const e = gold.value.effective || {};
  return { gold: e.goldPrice, silver: e.silverPrice, pt: e.ptPrice };
});

const goldStat = computed(() => {
  const p = goldShown.value;
  const meta = `金 ${p.gold ? Number(p.gold).toFixed(2) : '—'} · 银 ${p.silver ? Number(p.silver).toFixed(2) : '—'} · PT ${p.pt ? Number(p.pt).toFixed(2) : '—'}`;
  const map = {
    none: { key: 'none', label: '未填', btn: '去录入', meta },
    draft: { key: 'none', label: '未填', btn: '去录入', meta },
    rejected: { key: 'rejected', label: '已驳回', btn: '修改后重提', meta },
    pendingCustomer: { key: 'pending', label: '待客户审核', btn: '去查看', meta },
    pendingFactory: { key: 'pending', label: '待工厂审核', btn: '去查看', meta },
    approved: { key: 'ok', label: '已生效', btn: '提交改价', meta },
  };
  return map[goldStatus.value] || map.none;
});

const loadGold = async () => {
  try {
    const res = await getPriceSheetToday();
    gold.value = res?.data || { today: null, effective: {} };
    goldDate.value = localTodayStr();
  } catch (e) {
    console.error('加载今日金价失败:', e);
  }
};

const openGoldFill = () => {
  // 审核中不能改，去金价库看详情
  if (goldStat.value.key === 'pending') { router.push('/system/gold-price'); return; }
  const s = gold.value.today;
  const e = gold.value.effective || {};
  // ⭐ 库里存的是加价后的价，改价回填时减掉 markup 还原成牌价，避免每改一次再涨 8 块
  if (s && Number(s.goldPrice) > 0) {
    goldForm.value = {
      goldPrice: Number(s.goldPrice) - Number(s.markupGold || 0),
      silverPrice: Number(s.silverPrice) - Number(s.markupSilver || 0),
      ptPrice: Number(s.ptPrice) - Number(s.markupPt || 0)
    };
  } else {
    goldForm.value = {
      goldPrice: Number(e.goldPrice || 0),
      silverPrice: Number(e.silverPrice || 0),
      ptPrice: Number(e.ptPrice || 0)
    };
  }
  // 已有凭证图片带出来，改价/重提时不用重传
  goldImages.value = String(s?.imageUrls || '').split(',')
    .map(x => x.trim()).filter(Boolean)
    .map((u, i) => ({ id: null, imageType: 'price', imageUrl: u, sortOrder: i }));
  goldFillVisible.value = true;
};

const submitGoldFill = async () => {
  const f = goldForm.value;
  if (!f.goldPrice || !f.silverPrice || !f.ptPrice) {
    ElMessage.warning('三个价格都必须填写');
    return;
  }
  goldSaving.value = true;
  try {
    const res = await savePriceSheet({
      priceDate: goldDate.value,
      goldPrice: f.goldPrice,
      silverPrice: f.silverPrice,
      ptPrice: f.ptPrice,
      imageUrls: goldImages.value.map(x => x.imageUrl).filter(Boolean).join(','),
      submit: true
    });
    if (res?.success) {
      ElMessage.success('已提交，等待工厂审核');
      goldFillVisible.value = false;
      await loadGold();
      // 通知同页的 TodayGoldPriceBar 刷新
      window.dispatchEvent(new Event('gold-price-refresh'));
    } else {
      ElMessage.error(res?.message || '提交失败');
    }
  } finally {
    goldSaving.value = false;
  }
};

// 卡片：type 与后端 items[].type 对应
const CARD_META = [
  { type: 'waitAccept', icon: '📥', label: '待接单', unit: '待接单',
    actions: [{ label: '去接单', path: '/order/factory-accept' }] },
  { type: 'editing', icon: '✏️', label: '订单编辑', unit: '制作中',
    actions: [{ label: '去处理', path: '/order/factory-edit-list' }] },
  { type: 'submitPending', icon: '📤', label: '订单待提交', unit: '制作完成待提交审核',
    actions: [{ label: '去提交', path: '/order/factory-audit-list', query: { submit: 'pending', range: 'all' } }] },
  // ⭐ 账单待提交：只做「提交账单」这件事，跳「生成账单」页；数字与那一页完全同口径
  { type: 'billGen', icon: '🧾', label: '账单待提交', unit: '待提交 / 驳回重提',
    actions: [{ label: '去提交账单', path: '/order/bill/generate', query: { range: 'all' } }] },
  // ⭐ 退货处理：客户申请退回 → 工厂定退回方式（有新退货会弹提醒）
  { type: 'returnTodo', icon: '↩️', label: '退货处理', unit: '客户申请退回待定方式',
    actions: [{ label: '去处理', path: '/order/return-process' }] },
  // ⭐ 客户审批中心三入口（2026-11-13）：客户发起修改/取消/暂停，到工厂阶段要工厂确认
  //    alwaysOn：数字为 0 也要能点进去看历史，否则按钮灰掉就成了死入口
  { type: 'modifyAudit', icon: '✏️', label: '申请修改审批', unit: '待工厂确认生效', alwaysOn: true,
    actions: [{ label: '去处理', path: '/order/customer-approval', query: { tab: 'modify', filter: 'pendingFactory' } }] },
  { type: 'cancelAudit', icon: '⛔', label: '申请取消审批', unit: '待工厂确认取消', alwaysOn: true,
    actions: [{ label: '去处理', path: '/order/customer-approval', query: { tab: 'cancel', state: 'pending' } }] },
  { type: 'pauseAudit', icon: '⏸', label: '申请暂停审批', unit: '暂停中 · 等客户申请恢复', alwaysOn: true,
    actions: [{ label: '去查看', path: '/order/customer-approval', query: { tab: 'pause', state: 'active' } }] },
  { type: 'billable', icon: '📄', label: '账单状态', unit: '全部账单 · 按状态查看',
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

// 生成账单页里「待审核」张数（只作副标题，不计入待办）
const billGenAudit = computed(() => {
  const it = (data.value.items || []).find(x => x.type === 'billGen');
  return it?.billAudit || 0;
});

// 成本卡：用「已完成待录成本」作为计数；LR 草稿作为参考不单独展示
const cards = computed(() => CARD_META.map(c => {
  // 账单待提交：副标题对齐「生成账单」页的统计（待审核 X 张 · 共 Y 张）
  if (c.type === 'billGen') {
    const audit = billGenAudit.value;
    const todo = counts.value.billGen ?? 0;
    return {
      ...c,
      count: todo,
      unit: audit > 0 ? `待审核 ${audit} 张 · 共 ${todo + audit} 张` : '生成账单 · 待提交/驳回重提',
    };
  }
  // 退货处理：数字按明细行，副标题补「几张账单」
  if (c.type === 'returnTodo') {
    const it = (data.value.items || []).find(x => x.type === 'returnTodo');
    const bills = it?.billCount || 0;
    return {
      ...c,
      count: counts.value.returnTodo ?? 0,
      unit: bills > 0 ? `${bills} 张账单待处理` : '客户申请退回待定方式',
    };
  }
  return { ...c, count: counts.value[c.type] ?? 0 };
}));

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

// ⭐ 新退货提醒统一由布局层（顶栏铃铛）负责弹出，工作台只展示卡片数字

onMounted(() => { loadData(); loadGold(); });
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

/* 今日金价卡片：状态色 */
.card-count.gold-status { font-size: 24px; }
.gold-status.g-none { color: #e6a23c; }
.gold-status.g-rejected { color: #f56c6c; }
.gold-status.g-pending { color: #409eff; }
.gold-status.g-ok { color: #67c23a; }
.unit { font-size: 11px; color: #909399; margin-left: 8px; }
.tip-card { margin-top: 12px; }
.tip-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tip-label { font-size: 13px; color: #909399; margin-right: 6px; }
</style>
