<!-- src/views/system/gold-price.vue
     金价库：今日金价（填写 → 工厂审核员 → 客户审核员 → 生效）+ 历史金价
     提交时自动加价：金 +8、银 +2、PT +8 元/克（页面显示加价后的生效价）
-->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>金价库</h2>
      <div class="header-right">
        <el-date-picker v-model="queryDate" type="date" value-format="YYYY-MM-DD"
          :clearable="false" style="width:150px" @change="loadToday" />
        <el-button size="small" :loading="loading" @click="loadAll">刷新</el-button>
      </div>
    </div>

    <!-- ⭐ 待审金价：一天一个标签，点哪天就切到那天审核（不用再翻日期找） -->
    <div v-if="pendingList.length" class="pending-strip">
      <div class="ps-head">
        <span class="ps-title">⏳ 有 {{ pendingList.length }} 天金价待你审核</span>
        <span class="ps-sub">
          点日期直接切到那天<template v-if="pendingOldestDays > 0"> · <b>最早已挂 {{ pendingOldestDays }} 天</b></template>
          · 未审完下单不带价
        </span>
      </div>
      <div class="ps-days">
        <span v-for="p in pendingList" :key="p.id" class="ps-day"
              :class="{ active: queryDate === dayOf(p.priceDate) }" @click="jumpDay(p)">
          {{ dayOf(p.priceDate).slice(5) }}
          <em v-if="p.version > 1">v{{ p.version }}</em>
          <i>{{ waitDays(p.priceDate) }}天</i>
        </span>
      </div>
    </div>

    <!-- 今日金价 -->
    <el-card shadow="never" class="today-card" v-loading="loading">
      <template #header>
        <div class="card-head">
          <span class="card-title">{{ isToday ? '今日金价' : queryDate + ' 金价' }}</span>
          <el-tag size="small" :type="statusTag" effect="plain">{{ statusText }}</el-tag>
          <span v-if="sheet" class="card-meta">第 {{ sheet.version }} 版</span>
          <span v-if="!eff.dayApproved && eff.sourceDate" class="card-meta warn">
            未生效，下单先不带价，生效后自动补价
          </span>
          <div class="head-actions">
            <el-button v-if="canFill" size="small" type="warning" @click="openFill">
              {{ sheet?.status === 'approved' ? '提交改价' : (sheet?.status === 'rejected' ? '修改后重提' : '填写金价') }}
            </el-button>
            <el-button v-if="canFill && sheet?.status === 'approved'" size="small" :loading="backfilling" @click="doBackfill">
              补写当日订单
            </el-button>
            <el-button v-if="canAudit" size="small" type="danger" plain @click="openReject">驳回</el-button>
            <el-button v-if="canAudit" size="small" type="primary" :loading="auditing" @click="approve">
              {{ isCustomerAudit ? '审核通过并生效' : '审核通过' }}
            </el-button>
            <el-button v-if="sheet && !canFill && !canAudit" size="small" @click="openDetail(sheet)">查看留痕</el-button>
          </div>
        </div>
      </template>

      <div class="price-grid">
        <div class="price-box">
          <div class="p-label">金价</div>
          <div class="p-value">{{ shown.gold ? fmt(shown.gold) : '—' }}</div>
          <div class="p-note">元/克 · 足金999 / 18K / 14K / 9K 共用</div>
          <div v-if="Number(sheet?.markupGold) > 0" class="p-mark">
            牌价 {{ fmt(Number(sheet.goldPrice) - Number(sheet.markupGold)) }} + 加价 {{ fmt(sheet.markupGold) }}
          </div>
        </div>
        <div class="price-box">
          <div class="p-label">银价</div>
          <div class="p-value">{{ shown.silver ? fmt(shown.silver) : '—' }}</div>
          <div class="p-note">元/克 · 银950 / S925 共用</div>
          <div v-if="Number(sheet?.markupSilver) > 0" class="p-mark">
            牌价 {{ fmt(Number(sheet.silverPrice) - Number(sheet.markupSilver)) }} + 加价 {{ fmt(sheet.markupSilver) }}
          </div>
        </div>
        <div class="price-box">
          <div class="p-label">PT 价</div>
          <div class="p-value">{{ shown.pt ? fmt(shown.pt) : '—' }}</div>
          <div class="p-note">元/克 · PT 类共用</div>
          <div v-if="Number(sheet?.markupPt) > 0" class="p-mark">
            牌价 {{ fmt(Number(sheet.ptPrice) - Number(sheet.markupPt)) }} + 加价 {{ fmt(sheet.markupPt) }}
          </div>
        </div>
      </div>

      <!-- ⭐ 凭证图片：审核员看这里确认价格来源 -->
      <div v-if="sheetImages.length" class="proof-row">
        <span class="proof-label">价格凭证</span>
        <el-image v-for="(u, i) in sheetImages" :key="u" :src="u" :preview-src-list="sheetImages"
          :initial-index="i" fit="cover" class="proof-img" preview-teleported />
        <span class="proof-tip">{{ sheetImages.length }} 张 · 点击可放大</span>
      </div>

      <el-alert v-if="!eff.hasAnyPrice && !sheet" type="warning" :closable="false" show-icon
        title="金价库还没有任何已生效价格，请先填写今日金价并完成双审" style="margin-bottom:12px" />
    <el-alert v-if="sheet?.status === 'rejected' && sheet?.rejectReason" type="error" :closable="false" show-icon
      :title="`被${sheet.rejectStage === 'customer' ? '客户' : '工厂'}审核员驳回：${sheet.rejectReason}`"
      style="margin-bottom:12px" />
    <el-alert v-if="sheet?.status === 'approved'" type="success" :closable="false" show-icon
      title="生效后自动反写：当天「金价为空」的订单补当天价（有值的不动），历史日期不追溯。已生效但当日订单还空着，可点「补写当日订单」。"
      style="margin-bottom:12px" />

      <div class="chain">
        <span class="step" :class="{ done: !!sheet }">
          <i>1</i> 工厂填写
          <em v-if="sheet?.filledByName">{{ sheet.filledByName }} {{ (sheet.filledAt || '').slice(11, 16) }}</em>
        </span>
        <span class="line" :class="{ done: ['pendingCustomer', 'approved'].includes(sheet?.status) }"></span>
        <span class="step" :class="{ done: ['pendingCustomer', 'approved'].includes(sheet?.status) }">
          <i>2</i> 工厂审核
          <em v-if="sheet?.factoryAuditName">{{ sheet.factoryAuditName }} {{ (sheet.factoryAuditAt || '').slice(11, 16) }}</em>
        </span>
        <span class="line" :class="{ done: sheet?.status === 'approved' }"></span>
        <span class="step" :class="{ done: sheet?.status === 'approved' }">
          <i>3</i> 客户审核
          <em v-if="sheet?.customerAuditName">{{ sheet.customerAuditName }} {{ (sheet.customerAuditAt || '').slice(11, 16) }}</em>
        </span>
        <span class="line" :class="{ done: sheet?.status === 'approved' }"></span>
        <span class="step last" :class="{ done: sheet?.status === 'approved' }">
          <i>4</i> 生效
          <em v-if="sheet?.approvedAt">{{ (sheet.approvedAt || '').slice(11, 16) }}</em>
        </span>
      </div>
    </el-card>

    <!-- 历史 -->
    <el-card shadow="never" style="margin-top:12px">
      <template #header>
        <div class="card-head">
          <span class="card-title">历史金价</span>
          <span class="card-meta">共 {{ total }} 条（含改价版本）</span>
          <div class="head-actions">
            <el-date-picker v-model="range" type="daterange" value-format="YYYY-MM-DD"
              start-placeholder="开始日期" end-placeholder="结束日期" style="width:230px"
              @change="loadList" />
            <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width:120px" @change="loadList">
              <el-option label="已生效" value="approved" />
              <el-option label="待工厂审核" value="pendingFactory" />
              <el-option label="待客户审核" value="pendingCustomer" />
              <el-option label="已驳回" value="rejected" />
              <el-option label="草稿" value="draft" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table :data="rows" size="small" border v-loading="loading">
        <el-table-column prop="priceDate" label="日期" width="110" align="center">
          <template #default="{ row }">{{ (row.priceDate || '').slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="80" align="center">
          <template #default="{ row }">
            <span :class="{ 'v-change': row.version > 1 }">第 {{ row.version }} 版</span>
          </template>
        </el-table-column>
        <el-table-column prop="goldPrice" label="金价" width="100" align="right">
          <template #default="{ row }">{{ fmt(row.goldPrice) }}</template>
        </el-table-column>
        <el-table-column prop="silverPrice" label="银价" width="90" align="right">
          <template #default="{ row }">{{ fmt(row.silverPrice) }}</template>
        </el-table-column>
        <el-table-column prop="ptPrice" label="PT 价" width="90" align="right">
          <template #default="{ row }">{{ fmt(row.ptPrice) }}</template>
        </el-table-column>
        <el-table-column label="凭证" width="80" align="center">
          <template #default="{ row }">
            <el-image v-if="imgList(row.imageUrls).length" :src="imgList(row.imageUrls)[0]" fit="cover"
              class="thumb" :preview-src-list="imgList(row.imageUrls)" preview-teleported />
            <span v-else class="dim">—</span>
          </template>
        </el-table-column>
        <el-table-column label="含加价" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="Number(row.markupGold) > 0" size="small" type="warning" effect="plain">
              金+{{ fmt(row.markupGold) }}
            </el-tag>
            <span v-else class="dim">—</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="tagOf(row.status)" effect="plain">{{ textOf(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="filledByName" label="填写人" width="100" />
        <el-table-column label="工厂审核" width="110">
          <template #default="{ row }">{{ row.factoryAuditName || '—' }}</template>
        </el-table-column>
        <el-table-column label="客户审核" width="110">
          <template #default="{ row }">{{ row.customerAuditName || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">留痕</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination v-if="total > pageSize" style="margin-top:12px; justify-content:flex-end"
        v-model:current-page="page" :page-size="pageSize" :total="total"
        layout="prev, pager, next, total" @current-change="loadList" />
    </el-card>

    <!-- 填写 / 改价 -->
    <el-dialog v-model="fillVisible" :title="fillTitle" width="520px" destroy-on-close>
      <el-alert v-if="fillLocked" type="warning" :closable="false" show-icon style="margin-bottom:12px"
        title="该日期金价正在审核中，不能修改：请换日期，或等审核完成后再改。" />
      <el-alert v-else-if="fillDateSheet?.status === 'approved'" type="warning" :closable="false" show-icon style="margin-bottom:12px">
        该日期已生效，提交后按「改价」处理：重新走工厂审核 → 客户审核，通过后该日期「金价为空」的订单自动补成新价，已有金价的订单不变。
      </el-alert>
      <el-alert v-else-if="fillIsPast" type="info" :closable="false" show-icon style="margin-bottom:12px"
        :title="`正在补填 ${fillForm.priceDate} 的金价：审核通过后只补该日期「金价为空」的订单，不影响其他日期`" />

      <!-- ⭐ 加价规则：填的是牌价，提交时系统自动加价后才生效 -->
      <el-alert type="info" :closable="false" show-icon style="margin-bottom:12px"
        title="填「牌价」，提交时系统自动加价：金 +8、银 +2、PT +8 元/克，审核与下单都用加价后的价" />

      <el-form label-width="88px">
        <el-form-item label="日期" required>
          <el-date-picker v-model="fillForm.priceDate" type="date" value-format="YYYY-MM-DD"
            :clearable="false" :disabled-date="isFutureDate" style="width:100%"
            @change="onFillDateChange" />
        </el-form-item>
        <el-form-item label="金价（牌价）" required>
          <el-input-number v-model="fillForm.goldPrice" :min="0" :precision="2" :step="1" style="width:100%" />
          <span class="unit">元/克 · 足金/K金共用 · 提交后生效 {{ fmt(Number(fillForm.goldPrice || 0) + 8) }}</span>
        </el-form-item>
        <el-form-item label="银价（牌价）" required>
          <el-input-number v-model="fillForm.silverPrice" :min="0" :precision="2" :step="0.1" style="width:100%" />
          <span class="unit">元/克 · 提交后生效 {{ fmt(Number(fillForm.silverPrice || 0) + 2) }}</span>
        </el-form-item>
        <el-form-item label="PT 价（牌价）" required>
          <el-input-number v-model="fillForm.ptPrice" :min="0" :precision="2" :step="1" style="width:100%" />
          <span class="unit">元/克 · 提交后生效 {{ fmt(Number(fillForm.ptPrice || 0) + 8) }}</span>
        </el-form-item>
        <el-form-item label="凭证图片">
          <MultiImageUpload v-model="fillImages" :max-count="6" type="price"
            tip="可上传牌价截图 / 报价单 / 群消息截图，最多 6 张，单张 ≤ 5MB（审核员可查看）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="fillVisible = false">取消</el-button>
        <el-button :loading="saving" type="primary" :disabled="fillLocked" @click="submitFill">提交审核</el-button>
      </template>
    </el-dialog>

    <!-- 驳回 -->
    <el-dialog v-model="rejectVisible" title="驳回金价" width="420px" destroy-on-close>
      <el-input v-model="rejectReason" type="textarea" :rows="3" placeholder="请填写驳回原因（必填）" />
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button :loading="auditing" type="danger" @click="doReject">确认驳回</el-button>
      </template>
    </el-dialog>

    <!-- 留痕 -->
    <el-dialog v-model="detailVisible" :title="detailTitle" width="540px" destroy-on-close>
      <div v-if="detailImages.length" class="proof-row" style="margin-bottom:12px">
        <span class="proof-label">凭证</span>
        <el-image v-for="(u, i) in detailImages" :key="u" :src="u" :preview-src-list="detailImages"
          :initial-index="i" fit="cover" class="proof-img" preview-teleported />
      </div>
      <el-timeline v-if="logs.length">
        <el-timeline-item v-for="l in logs" :key="l.id" :timestamp="(l.createdAt || '').replace('T', ' ').slice(0, 16)">
          <b>{{ actionText(l.action) }}</b>
          <span class="log-op">{{ l.operatorName }}</span>
          <div v-if="l.remark" class="log-remark">{{ l.remark }}</div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无记录" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { todayStr } from '@/utils/date';
import MultiImageUpload from '@/components/MultiImageUpload.vue';
import {
  getPriceSheetToday, getPriceSheetList, getPriceSheetDetail,
  savePriceSheet, auditPriceSheet, backfillPriceSheet, getPendingPriceAudit
} from '@/api/priceSheet';

const userStore = useUserStore();
const loading = ref(false);
const saving = ref(false);
const auditing = ref(false);
const backfilling = ref(false);

const queryDate = ref(todayStr());
const sheet = ref(null);
const eff = ref({});

const rows = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const range = ref(null);
const statusFilter = ref('');

// ⭐ 待审金价（一天一行）
const pendingList = ref([]);
const pendingOldestDays = ref(0);

const fillVisible = ref(false);
const fillForm = ref({ priceDate: todayStr(), goldPrice: 0, silverPrice: 0, ptPrice: 0 });
const fillImages = ref([]);
const fillDateSheet = ref(null);
const rejectVisible = ref(false);
const rejectReason = ref('');
const detailVisible = ref(false);
const detailTitle = ref('金价变更留痕');
const detailImages = ref([]);
const logs = ref([]);

const isFactoryOrder = computed(() => userStore.userType === 'factoryOrder');
const isCustomerAudit = computed(() => userStore.userType === 'customerAudit');
const isFactoryAudit = computed(() => userStore.userType === 'factoryAudit');
const isToday = computed(() => queryDate.value === todayStr());

const statusKey = computed(() => sheet.value?.status || 'none');

// ⭐ 展示价：当天金价单有值就显示单上的价（审核中也能看到待审价），否则显示当前生效/沿用价
const shown = computed(() => {
  const s = sheet.value;
  if (s && Number(s.goldPrice) > 0) {
    return { gold: s.goldPrice, silver: s.silverPrice, pt: s.ptPrice };
  }
  return { gold: eff.value?.goldPrice, silver: eff.value?.silverPrice, pt: eff.value?.ptPrice };
});
const canFill = computed(() => isFactoryOrder.value && ['none', 'draft', 'rejected', 'approved'].includes(statusKey.value));
const canAudit = computed(() =>
  (isCustomerAudit.value && statusKey.value === 'pendingCustomer') ||
  (isFactoryAudit.value && statusKey.value === 'pendingFactory'));

const STATUS_TEXT = {
  none: '未填写', draft: '草稿', pendingCustomer: '待客户审核',
  pendingFactory: '待工厂审核', approved: '已生效', rejected: '已驳回'
};
const STATUS_TAG = {
  none: 'info', draft: 'info', pendingCustomer: 'warning',
  pendingFactory: 'warning', approved: 'success', rejected: 'danger'
};
const textOf = (s) => STATUS_TEXT[s] || s || '-';
const tagOf = (s) => STATUS_TAG[s] || 'info';
const statusText = computed(() => textOf(statusKey.value));
const statusTag = computed(() => tagOf(statusKey.value));
const fillTitle = computed(() => {
  const d = fillForm.value.priceDate || queryDate.value;
  const st = fillDateSheet.value?.status;
  if (st === 'approved') return `改价（${d}）`;
  if (st === 'rejected') return `修改后重提（${d}）`;
  return `填写金价（${d}）`;
});
const fillLocked = computed(() =>
  ['pendingCustomer', 'pendingFactory'].includes(fillDateSheet.value?.status));
const fillIsPast = computed(() => !!fillForm.value.priceDate && fillForm.value.priceDate !== todayStr());
const fmt = (v) => Number(v || 0).toFixed(2);

// 凭证图片：库里存的是逗号分隔字符串
const imgList = (raw) => String(raw || '').split(',').map(x => x.trim()).filter(Boolean);
const parseImages = (raw) => imgList(raw).map((u, i) => ({
  id: null, imageType: 'price', imageUrl: u, sortOrder: i
}));
const sheetImages = computed(() => imgList(sheet.value?.imageUrls));

// 不允许填未来日期
const isFutureDate = (d) => d.getTime() > Date.now();

const ACTION_TEXT = {
  save: '保存草稿', submit: '提交审核', changePrice: '提交改价',
  customerApprove: '客户审核通过', customerReject: '客户驳回',
  factoryApprove: '工厂审核通过（生效）', factoryReject: '工厂驳回',
  backfill: '反写当日订单金价'
};
const actionText = (a) => ACTION_TEXT[a] || a;

const loadToday = async () => {
  const res = await getPriceSheetToday(queryDate.value);
  sheet.value = res?.data?.today || null;
  eff.value = res?.data?.effective || {};
};

const loadList = async () => {
  const params = { page: page.value, pageSize };
  if (range.value?.length === 2) {
    params.start = range.value[0];
    params.end = range.value[1];
  }
  if (statusFilter.value) params.status = statusFilter.value;
  const res = await getPriceSheetList(params);
  rows.value = res?.data || [];
  total.value = res?.total || 0;
};

const loadAll = async () => {
  loading.value = true;
  try {
    await Promise.all([loadToday(), loadList(), loadPending()]);
  } finally {
    loading.value = false;
  }
};

// ⭐ 待审金价（一天一行）：工厂审核员 / 客户审核员才有内容
const loadPending = async () => {
  if (!isFactoryAudit.value && !isCustomerAudit.value) {
    pendingList.value = [];
    return;
  }
  try {
    const res = await getPendingPriceAudit();
    pendingList.value = res?.data || [];
    pendingOldestDays.value = Number(res?.oldestDays || 0);
  } catch (e) {
    pendingList.value = [];
  }
};

const dayOf = (v) => (v ? String(v).slice(0, 10) : '');
const waitDays = (v) => {
  if (!v) return 0;
  const d = new Date(dayOf(v) + 'T00:00:00');
  const t = new Date(todayStr() + 'T00:00:00');
  const n = Math.round((t - d) / 86400000);
  return n > 0 ? n : 0;
};

// 点待审标签 → 切到那天的金价卡，可直接通过/驳回
const jumpDay = async (p) => {
  queryDate.value = dayOf(p.priceDate);
  await loadToday();
};

// 打开填写框前先取该日期的金价单：带出价格、凭证图片和状态（是否审核中/已生效）
const loadFillDate = async (date) => {
  const res = await getPriceSheetToday(date);
  const s = res?.data?.today || null;
  fillDateSheet.value = s;
  // ⭐ 该日期已有单 → 带出原价（改价/驳回重提）；没有单 → 留空，避免误把历史价当成当天价提交
  // ⭐ 库里存的是加价后的价，减掉 markup 还原成「牌价」再回填，否则每改一次就再涨 8 块
  fillForm.value = {
    priceDate: date,
    goldPrice: Number(s?.goldPrice || 0) - Number(s?.markupGold || 0),
    silverPrice: Number(s?.silverPrice || 0) - Number(s?.markupSilver || 0),
    ptPrice: Number(s?.ptPrice || 0) - Number(s?.markupPt || 0)
  };
  fillImages.value = parseImages(s?.imageUrls);
};

const openFill = async () => {
  await loadFillDate(queryDate.value);
  fillVisible.value = true;
};

// ⭐ 换日期：重新带出那天的价与图片（补填历史日期用）
const onFillDateChange = async (d) => {
  if (!d) return;
  await loadFillDate(d);
};

const submitFill = async () => {
  const f = fillForm.value;
  if (!f.priceDate) {
    ElMessage.warning('请选择日期');
    return;
  }
  if (fillLocked.value) {
    ElMessage.warning('该日期金价正在审核中，不能修改');
    return;
  }
  if (!f.goldPrice || !f.silverPrice || !f.ptPrice) {
    ElMessage.warning('三个价格都必须填写');
    return;
  }
  saving.value = true;
  try {
    const res = await savePriceSheet({
      priceDate: f.priceDate,
      goldPrice: f.goldPrice,
      silverPrice: f.silverPrice,
      ptPrice: f.ptPrice,
      imageUrls: fillImages.value.map(x => x.imageUrl).filter(Boolean).join(','),
      submit: true
    });
    if (res?.success) {
      ElMessage.success(`已提交 ${f.priceDate} 金价，等待工厂审核`);
      queryDate.value = f.priceDate;   // 切到刚填的日期，方便接着核对
      fillVisible.value = false;
      await loadAll();
    } else {
      ElMessage.error(res?.message || '提交失败');
    }
  } catch (e) {
    ElMessage.error(e?.message || '提交失败');
  } finally {
    saving.value = false;
  }
};

const approve = async () => {
  auditing.value = true;
  try {
    const res = await auditPriceSheet(sheet.value.id, { approved: true, remark: '' });
    if (res?.success) {
      const n = Number(res?.backfilled || 0);
      // ⭐ 新顺序：工厂审核通过只是转客户审核，客户审核通过才生效
      if (isCustomerAudit.value) {
        ElMessage.success(n > 0 ? `已生效，已反写当日订单 ${n} 单` : '已生效，今日下单按此价');
      } else {
        ElMessage.success('已通过，转客户审核');
      }
      await loadAll();
    } else {
      ElMessage.error(res?.message || '审核失败');
    }
  } finally {
    auditing.value = false;
  }
};

// ⭐ 人工补反写：已生效但当日订单金价还空着时（比如上线前就生效了）用这个补
const doBackfill = async () => {
  if (!sheet.value?.id) return;
  backfilling.value = true;
  try {
    const res = await backfillPriceSheet(sheet.value.id);
    if (res?.success) {
      const n = Number(res?.backfilled || 0);
      ElMessage.success(n > 0 ? `已补写 ${n} 单（金价为空的才补，有值的不动）` : '没有需要补的订单（金价都已有值）');
      await loadAll();
    } else {
      ElMessage.error(res?.message || '补写失败');
    }
  } finally {
    backfilling.value = false;
  }
};

const openReject = () => { rejectReason.value = ''; rejectVisible.value = true; };

const doReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  auditing.value = true;
  try {
    const res = await auditPriceSheet(sheet.value.id, { approved: false, remark: rejectReason.value.trim() });
    if (res?.success) {
      ElMessage.success('已驳回');
      rejectVisible.value = false;
      await loadAll();
    } else {
      ElMessage.error(res?.message || '驳回失败');
    }
  } finally {
    auditing.value = false;
  }
};

const openDetail = async (row) => {
  detailVisible.value = true;
  detailTitle.value = `金价变更留痕（${String(row.priceDate || '').slice(0, 10)}${row.version ? ` 第 ${row.version} 版` : ''}）`;
  detailImages.value = imgList(row.imageUrls);
  logs.value = [];
  const res = await getPriceSheetDetail(row.id);
  logs.value = res?.data?.logs || [];
  const urls = imgList(res?.data?.sheet?.imageUrls);
  if (urls.length) detailImages.value = urls;
};

onMounted(loadAll);
</script>

<style scoped>
/* ⭐ 待审金价标签条 */
.pending-strip {
  border: 1px solid #ffccc7; border-left: 3px solid #cf1322; background: #fff7f6;
  border-radius: 8px; padding: 9px 12px; margin-bottom: 12px;
}
.ps-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.ps-title { font-size: 14px; font-weight: 600; color: #a8071a; }
.ps-sub { font-size: 12px; color: #8c6b68; }
.ps-sub b { color: #cf1322; }
.ps-days { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.ps-day {
  display: inline-flex; align-items: center; gap: 4px; cursor: pointer;
  padding: 3px 9px; border-radius: 12px; border: 1px solid #ffb3ad; background: #fff;
  font-size: 12px; color: #a8071a; transition: all .15s;
}
.ps-day:hover { background: #fff1f0; border-color: #cf1322; }
.ps-day.active { background: #cf1322; border-color: #cf1322; color: #fff; }
.ps-day.active i { color: rgba(255, 255, 255, .8); }
.ps-day em { font-style: normal; font-size: 10px; color: #e6a23c; }
.ps-day.active em { color: #ffe7ba; }
.ps-day i { font-style: normal; font-size: 10px; color: #b37f7f; }

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.page-header h2 { margin: 0; font-size: 16px; }
.header-right { display: flex; gap: 8px; align-items: center; }

.card-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.card-title { font-size: 13px; font-weight: 600; }
.card-meta { font-size: 11px; color: #909399; }
.card-meta.warn { color: #b88230; }
.head-actions { margin-left: auto; display: flex; gap: 8px; }

.price-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
.price-box { background: #f5f7fa; border-radius: 8px; padding: 12px 14px; }
.p-label { font-size: 12px; color: #909399; }
.p-value { font-size: 26px; font-weight: 600; color: #303133; line-height: 1.3; }
.p-note { font-size: 11px; color: #909399; }
.p-mark { font-size: 11px; color: #b88230; margin-top: 2px; }

.chain { display: flex; align-items: center; border-top: 1px solid #ebeef5; padding-top: 14px; font-size: 12px; color: #909399; }
.step { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.step i { width: 15px; height: 15px; border-radius: 50%; background: #dcdfe6; color: #fff;
  font-size: 10px; font-style: normal; display: inline-flex; align-items: center; justify-content: center; }
.step.done { color: #303133; }
.step.done i { background: #409eff; }
.step.last.done i { background: #67c23a; }
.step em { font-style: normal; font-size: 11px; color: #909399; }
.line { flex: 1; height: 1px; background: #ebeef5; margin: 0 10px; }
.line.done { background: #409eff; }

.v-change { color: #b88230; }
.unit { font-size: 11px; color: #909399; margin-left: 8px; }
.log-op { font-size: 12px; color: #909399; margin-left: 8px; }
.log-remark { font-size: 12px; color: #606266; margin-top: 2px; }

/* 凭证图片 */
.proof-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.proof-label { font-size: 12px; color: #909399; }
.proof-img { width: 48px; height: 48px; border-radius: 6px; border: 1px solid #ebeef5; cursor: zoom-in; }
.proof-tip { font-size: 11px; color: #c0c4cc; }
.thumb { width: 32px; height: 32px; border-radius: 4px; cursor: zoom-in; }
.dim { color: #c0c4cc; }
</style>
