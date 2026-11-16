<!-- src/components/TodayGoldPriceBar.vue
     工作台顶部的「今日金价」横幅（4 个角色共用）
     - 工厂操作员：未填 / 驳回 → 可直接填写（提交时自动加价 金+8 / 银+2 / PT+8）
     - 工厂审核员：pendingFactory → 通过 / 驳回（第一环节）
     - 客户审核员：pendingCustomer → 通过 / 驳回（第二环节，通过即生效）
     - 客户下单员及其他：只读显示
-->
<template>
  <div v-if="loaded" class="price-bar" :class="'tone-' + tone">
    <div class="bar-left">
      <div class="bar-title">{{ barTitle }}</div>
      <div class="bar-sub">{{ barSub }}</div>
    </div>

    <div class="bar-prices">
      <span class="p-item">金价 <b :class="{ empty: !shown.gold }">{{ shown.gold ? fmt(shown.gold) : '—' }}</b></span>
      <span class="p-item">银价 <b :class="{ empty: !shown.silver }">{{ shown.silver ? fmt(shown.silver) : '—' }}</b></span>
      <span class="p-item">PT <b :class="{ empty: !shown.pt }">{{ shown.pt ? fmt(shown.pt) : '—' }}</b></span>
    </div>

    <!-- ⭐ 审核员在这里就能看价格凭证，不用再跳金价库 -->
    <div v-if="barImages.length" class="bar-imgs">
      <el-image v-for="(u, i) in barImages" :key="u" :src="u" :preview-src-list="barImages"
        :initial-index="i" fit="cover" class="bar-img" preview-teleported />
    </div>

    <div class="bar-actions">
      <!-- ⭐ 2026-11-07：工厂操作员的「填写今日金价」挪到录入工作台卡片，横幅对所有人只读；
           审核员的通过 / 驳回仍保留在这里 -->
      <template v-if="canAudit">
        <el-button size="small" type="danger" plain @click="openReject">驳回</el-button>
        <el-button size="small" type="primary" @click="approve">{{ auditLabel }}</el-button>
      </template>
      <span v-else class="bar-hint">{{ readonlyHint }}</span>
    </div>
  </div>

  <!-- 驳回 -->
  <el-dialog v-model="rejectVisible" title="驳回金价" width="420px" destroy-on-close>
    <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请填写驳回原因（必填）" />
    <template #footer>
      <el-button @click="rejectVisible = false">取消</el-button>
      <el-button :loading="auditing" type="danger" @click="doReject">确认驳回</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { getPriceSheetToday, auditPriceSheet } from '@/api/priceSheet';
// ⭐ 本地时区的「今天」（UTC 会在凌晨 0-8 点退到前一天）
import { todayStr as localTodayStr } from '@/utils/date';

const userStore = useUserStore();
const loaded = ref(false);
const auditing = ref(false);
const todaySheet = ref(null);
const eff = ref({});
const todayStr = ref('');

const rejectVisible = ref(false);
const rejectReason = ref('');

const status = computed(() => todaySheet.value?.status || eff.value?.todayStatus || 'none');

// ⭐ 展示价：当天金价单有值就显示单上的价（审核员要看着价审），否则显示当前生效/沿用价
const shown = computed(() => {
  const s = todaySheet.value;
  if (s && Number(s.goldPrice) > 0) {
    return { gold: s.goldPrice, silver: s.silverPrice, pt: s.ptPrice };
  }
  return { gold: eff.value?.goldPrice, silver: eff.value?.silverPrice, pt: eff.value?.ptPrice };
});
const isRejected = computed(() => status.value === 'rejected');
// 凭证图片（逗号分隔）
const barImages = computed(() => String(todaySheet.value?.imageUrls || '')
  .split(',').map(x => x.trim()).filter(Boolean));

const isFactoryOrder = computed(() => userStore.userType === 'factoryOrder');
const isCustomerAudit = computed(() => userStore.userType === 'customerAudit');
const isFactoryAudit = computed(() => userStore.userType === 'factoryAudit');

const canFill = computed(() =>
  isFactoryOrder.value && ['none', 'draft', 'rejected', 'approved'].includes(status.value));
const canAudit = computed(() =>
  (isCustomerAudit.value && status.value === 'pendingCustomer') ||
  (isFactoryAudit.value && status.value === 'pendingFactory'));

const auditLabel = computed(() => (isCustomerAudit.value ? '审核通过并生效' : '审核通过'));

const tone = computed(() => {
  if (canAudit.value) return 'info';
  if (canFill.value && status.value !== 'approved') return 'warn';
  if (status.value === 'approved') return 'ok';
  return 'muted';
});

const barTitle = computed(() => {
  if (canFill.value) {
    if (status.value === 'approved') return '今日金价';
    return isRejected.value ? '今日金价被驳回' : '今日金价未填';
  }
  if (canAudit.value) return '待你审核';
  if (status.value === 'approved') return '今日金价';
  if (status.value === 'pendingCustomer') return '待客户审核';
  if (status.value === 'pendingFactory') return '待工厂审核';
  if (status.value === 'rejected') return '今日金价已驳回';
  return '今日金价';
});

const barSub = computed(() => {
  if (isRejected.value && todaySheet.value?.rejectReason)
    return `驳回原因：${todaySheet.value.rejectReason}`;
  if (status.value === 'pendingFactory' && todaySheet.value?.submittedAt)
    return `${(todaySheet.value.submittedAt || '').slice(11, 16)} 提交待工厂审核`;
  if (status.value === 'pendingCustomer' && todaySheet.value?.factoryAuditName)
    return `工厂 ${todaySheet.value.factoryAuditName} 已通过，待客户审核`;
  if (status.value === 'approved' && todaySheet.value?.approvedAt)
    return `${(todaySheet.value.approvedAt || '').slice(11, 16)} 生效`;
  // ⭐ 未生效 → 下单先不带价，生效后由金价库反写当天订单（不再沿用上次价）
  if (!eff.value?.dayApproved && eff.value?.sourceDate)
    return `今日未生效，下单先不带价（生效后自动补价）`;
  return todayStr.value;
});

// ⭐ 是否已经有生效价（今日单已通过，或沿用的上一张已生效单）
const isLive = computed(() =>
  status.value === 'approved' || (status.value === 'none' && !!eff.value?.dayApproved));

const readonlyHint = computed(() => {
  // ⭐ 工厂操作员：填写入口在录入工作台「今日金价」卡片
  if (isFactoryOrder.value) {
    if (status.value === 'pendingFactory') return '已提交，等待工厂审核';
    if (status.value === 'pendingCustomer') return '工厂已通过，等待客户审核';
    if (isLive.value) return '今日已生效，改价去录入工作台卡片';
    if (isRejected.value) return '已被驳回，请在下方「今日金价」卡片重新填写';
    return '今日未填，请在下方「今日金价」卡片填写';
  }
  if (isCustomerAudit.value) {
    if (status.value === 'pendingFactory') return '等待工厂审核';
    if (isLive.value) return '今日已生效，下单按此价';
    if (isRejected.value) return '已被驳回，等待工厂重新填写';
    return '等待工厂填写今日金价';
  }
  if (isFactoryAudit.value) {
    if (status.value === 'pendingCustomer') return '等待客户审核';
    if (isLive.value) return '今日金价已生效';
    if (isRejected.value) return '已被驳回，等待工厂重新填写';
    return '等待工厂填写今日金价';
  }
  // 下单员等只读角色
  if (isLive.value) return '下单时按成色自动带入，无需操作';
  return '今日未生效，下单先不带价，生效后自动补价';
});

const fmt = (v) => Number(v || 0).toFixed(2);

const load = async () => {
  try {
    const res = await getPriceSheetToday();
    todaySheet.value = res?.data?.today || null;
    eff.value = res?.data?.effective || {};
    todayStr.value = localTodayStr();
    loaded.value = true;
    maybeRemind();
  } catch (e) {
    loaded.value = false;
  }
};

// ⭐ 每天 8:00 后，工厂操作员进工作台若今日金价还没提交，弹一次提醒（当天只弹一次）
const maybeRemind = () => {
  if (!canFill.value) return;
  // ⭐ 已生效就别再催了：canFill 含 approved 只是为了允许改价，不代表「没填」
  if (status.value === 'approved') return;
  if (new Date().getHours() < 8) return;
  const key = 'priceSheetRemind:' + todayStr.value;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  ElNotification({
    title: '今日金价还没填',
    message: '请在录入工作台「今日金价」卡片填写三个价格并提交审核',
    type: 'warning',
    duration: 8000
  });
};

const approve = async () => {
  const id = todaySheet.value?.id;
  if (!id) return;
  auditing.value = true;
  try {
    const res = await auditPriceSheet(id, { approved: true, remark: '' });
    if (res?.success) {
      const n = Number(res?.backfilled || 0);
      // ⭐ 新顺序：工厂审核通过只是转客户审核，客户审核通过才生效
      ElMessage.success(isCustomerAudit.value
        ? (n > 0 ? `已生效，已反写今日订单 ${n} 单` : '已生效，今日下单按此价')
        : '已通过，转客户审核');
      await load();
    } else {
      ElMessage.error(res?.message || '审核失败');
    }
  } finally {
    auditing.value = false;
  }
};

const openReject = () => {
  rejectReason.value = '';
  rejectVisible.value = true;
};

const doReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  auditing.value = true;
  try {
    const res = await auditPriceSheet(todaySheet.value.id, { approved: false, remark: rejectReason.value.trim() });
    if (res?.success) {
      ElMessage.success('已驳回工厂');
      rejectVisible.value = false;
      await load();
    } else {
      ElMessage.error(res?.message || '驳回失败');
    }
  } finally {
    auditing.value = false;
  }
};

// 录入工作台提交金价后通知本组件刷新
const onGoldRefresh = () => load();
onMounted(() => {
  load();
  window.addEventListener('gold-price-refresh', onGoldRefresh);
});
onBeforeUnmount(() => window.removeEventListener('gold-price-refresh', onGoldRefresh));
</script>

<style scoped>
.price-bar {
  display: flex; align-items: center; gap: 16px;
  padding: 12px 16px; border-radius: 8px; border: 1px solid #ebeef5;
  border-left-width: 3px; background: #fff; margin-bottom: 12px;
}
.price-bar.tone-warn { background: #fdf6ec; border-color: #f5dab1; border-left-color: #e6a23c; }
.price-bar.tone-info { background: #ecf5ff; border-color: #b3d8ff; border-left-color: #409eff; }
.price-bar.tone-ok { background: #f0f9eb; border-color: #d9ecbf; border-left-color: #67c23a; }
.price-bar.tone-muted { background: #f4f4f5; border-color: #e4e7ed; border-left-color: #909399; }

.bar-left { min-width: 120px; }
.bar-title { font-size: 13px; font-weight: 600; color: #303133; }
.bar-sub { font-size: 11px; color: #909399; margin-top: 2px; }
.price-bar.tone-warn .bar-title { color: #b88230; }

.bar-prices { display: flex; gap: 20px; flex: 1; flex-wrap: wrap; }
.p-item { font-size: 12px; color: #909399; }
.p-item b { font-size: 15px; font-weight: 600; color: #303133; margin-left: 2px; }
.p-item b.empty { color: #d9d9d9; }

.bar-actions { display: flex; align-items: center; gap: 8px; }
.bar-hint { font-size: 11px; color: #909399; }

.bar-imgs { display: flex; gap: 4px; }
.bar-img { width: 34px; height: 34px; border-radius: 4px; border: 1px solid #ebeef5; cursor: zoom-in; }

.unit { font-size: 11px; color: #909399; margin-left: 8px; }
</style>
