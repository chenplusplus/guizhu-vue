<!-- src/views/inout/list.vue
     总进出管理 = 金料 / 钻石 / 金额 三张录入表的合并流水（只读）
     录入与修改仍走各自模块（进模块 / 出模块 的录入页、分类列表页）
     口径见后端 GET /api/inout/overview 注释
-->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <h2>💰 总进出管理</h2>
        <el-tag type="info" size="large">共 {{ total }} 条</el-tag>
        <span class="header-tip">金料 / 钻石 / 金额 合并流水</span>
      </div>
      <div class="header-right">
        <el-button @click="go('/inout/in-hub')">
          <el-icon><Download /></el-icon> 进模块
        </el-button>
        <el-button @click="go('/inout/out-hub')">
          <el-icon><Upload /></el-icon> 出模块
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- ===== 搜索栏 ===== -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="单号/单位/产品/内容" clearable
            style="width:190px;" @clear="reload" @keyup.enter="reload" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width:110px;" @change="reload">
            <el-option label="金料" value="gold" />
            <el-option label="钻石" value="diamond" />
            <el-option label="金额" value="expense" />
          </el-select>
        </el-form-item>
        <el-form-item label="方向">
          <el-select v-model="searchForm.direction" placeholder="全部" clearable style="width:100px;" @change="reload">
            <el-option label="进" :value="1" />
            <el-option label="出" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width:110px;" @change="reload">
            <el-option label="草稿" value="draft" />
            <el-option label="待审" value="pending" />
            <el-option label="生效" value="approved" />
            <el-option label="驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="往来单位">
          <el-select v-model="searchForm.counterpartyId" placeholder="全部" clearable filterable
            style="width:160px;" @change="reload">
            <el-option v-for="cp in cpOptions" :key="cp.id" :label="cp.name" :value="cp.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至"
            start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:250px; flex:0 0 250px;"
            @change="reload" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="reload">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button link type="primary" @click="setRange('month')">本月</el-button>
          <el-button link type="primary" @click="setRange('all')">全部</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- ===== 汇总条 ===== -->
    <div class="sum-bar">
      <div class="sum-main">
        <span class="sum-item">
          <span class="sum-label">进</span>
          <b class="in">{{ summary.inCount }}</b> 笔
          <b class="in">¥{{ money(summary.inAmount) }}</b>
        </span>
        <span class="sum-sep"></span>
        <span class="sum-item">
          <span class="sum-label">出</span>
          <b class="out">{{ summary.outCount }}</b> 笔
          <b class="out">¥{{ money(summary.outAmount) }}</b>
        </span>
        <span class="sum-sep"></span>
        <span class="sum-item">
          <span class="sum-label">净额</span>
          <b :class="netAmount >= 0 ? 'in' : 'out'">¥{{ money(netAmount) }}</b>
        </span>
      </div>
      <div class="sum-types">
        <span v-for="t in summary.byType" :key="t.type" class="type-chip">
          <em>{{ t.typeName }}</em>
          进 {{ t.inCount }}/¥{{ money(t.inAmount) }}<template v-if="t.type !== 'expense'">（{{ num(t.inWeight) }}{{ weightUnit(t.type) }}）</template>
          · 出 {{ t.outCount }}/¥{{ money(t.outAmount) }}<template v-if="t.type !== 'expense'">（{{ num(t.outWeight) }}{{ weightUnit(t.type) }}）</template>
        </span>
      </div>
      <div class="sum-range">统计范围：{{ rangeText }}</div>
    </div>

    <!-- ===== 表格 ===== -->
    <div class="table-section">
      <el-table :data="tableData" border stripe style="width:100%;" empty-text="没有符合条件的记录">
        <el-table-column label="类型" width="82" align="center" fixed>
          <template #default="{ row }">
            <el-tag :type="typeTag(row.type)" size="small" effect="plain">{{ row.typeName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="recordNo" label="单号" width="150" fixed />
        <el-table-column prop="recordDate" label="日期" width="105" align="center">
          <template #default="{ row }">{{ fmtDate(row.recordDate) }}</template>
        </el-table-column>
        <el-table-column prop="direction" label="方向" width="66" align="center">
          <template #default="{ row }">
            <el-tag :type="row.direction === 1 ? 'success' : 'danger'" size="small">
              {{ row.direction === 1 ? '进' : '出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="往来单位" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.counterpartyName || '-' }}</template>
        </el-table-column>
        <el-table-column label="产品 / 规格" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <template v-if="row.productName && row.spec">
              <span>{{ row.productName }}</span><span class="spec-text">｜{{ row.spec }}</span>
            </template>
            <span v-else-if="row.productName">{{ row.productName }}</span>
            <span v-else-if="row.spec" class="spec-text">{{ row.spec }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="内容" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ row.content || '-' }}</template>
        </el-table-column>
        <el-table-column label="重量" width="110" align="right">
          <template #default="{ row }">
            <span v-if="row.weight !== null && row.weight !== undefined">
              {{ num(row.weight) }}<i class="unit">{{ weightUnit(row.type) }}</i>
            </span>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="金额(元)" width="125" align="right">
          <template #default="{ row }">
            <span :class="row.direction === 1 ? 'amt-in' : 'amt-out'">{{ money(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="86" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdByName" label="创建人" width="100" show-overflow-tooltip />
      </el-table>

      <div class="pagination">
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
          :page-sizes="[20, 50, 100, 200]" :total="total" layout="total, sizes, prev, pager, next, jumper"
          @size-change="onSizeChange" @current-change="loadData" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh, Download, Upload } from '@element-plus/icons-vue';
import api from '@/api/index';
import { getCounterpartyAll } from '@/api/counterparty';
import { todayStr } from '@/utils/date';

const router = useRouter();

const loading = ref(false);
const tableData = ref([]);
const total = ref(0);
const cpOptions = ref([]);

const emptySummary = () => ({
  byType: [], inCount: 0, outCount: 0, inAmount: 0, outAmount: 0
});
const summary = ref(emptySummary());

const searchForm = reactive({
  keyword: '', type: '', direction: null, status: '', counterpartyId: null, dateRange: []
});
const pagination = reactive({ page: 1, pageSize: 20 });

// ===== 默认本月（当天所在月 1 号 ~ 今天），避免「点进来是空」 =====
const monthStart = () => {
  const t = todayStr();
  return t.slice(0, 8) + '01';
};
const setRange = (mode) => {
  if (mode === 'all') searchForm.dateRange = [];
  else searchForm.dateRange = [monthStart(), todayStr()];
  reload();
};

const rangeText = computed(() => {
  const r = searchForm.dateRange;
  if (!r || r.length !== 2) return '全部日期';
  return `${r[0]} ~ ${r[1]}`;
});

const netAmount = computed(() =>
  Number(summary.value.inAmount || 0) - Number(summary.value.outAmount || 0));

// ===== 展示辅助 =====
const money = (v) => Number(v || 0).toFixed(2);
const num = (v) => Number(v || 0).toFixed(2);
const weightUnit = (type) => (type === 'diamond' ? 'ct' : 'g');
const fmtDate = (d) => (d ? String(d).slice(0, 10) : '-');
const typeTag = (t) => (t === 'gold' ? 'warning' : t === 'diamond' ? 'primary' : 'success');

const STATUS = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待审', type: 'warning' },
  approved: { text: '生效', type: 'success' },
  rejected: { text: '驳回', type: 'danger' }
};
const statusText = (s) => STATUS[s]?.text || s || '-';
const statusType = (s) => STATUS[s]?.type || 'info';

const go = (p) => router.push(p);

// ===== 数据加载 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      keyword: searchForm.keyword || undefined,
      type: searchForm.type || undefined,
      direction: searchForm.direction === null || searchForm.direction === '' ? undefined : searchForm.direction,
      status: searchForm.status || undefined,
      counterpartyId: searchForm.counterpartyId || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize
    };
    if (searchForm.dateRange?.length === 2) {
      params.startDate = searchForm.dateRange[0];
      params.endDate = searchForm.dateRange[1];
    }
    const res = await api.get('/inout/overview', { params });
    tableData.value = res.data || [];
    total.value = res.total || 0;
    const s = res.summary || {};
    summary.value = {
      byType: s.byType || [],
      inCount: s.inCount || 0,
      outCount: s.outCount || 0,
      inAmount: s.inAmount || 0,
      outAmount: s.outAmount || 0
    };
  } catch (e) {
    console.error('加载总进出失败', e);
    ElMessage.error(e?.message || '加载失败');
    tableData.value = [];
    total.value = 0;
    summary.value = emptySummary();
  } finally {
    loading.value = false;
  }
};

const reload = () => { pagination.page = 1; loadData(); };
const onSizeChange = () => { pagination.page = 1; loadData(); };

const resetSearch = () => {
  searchForm.keyword = '';
  searchForm.type = '';
  searchForm.direction = null;
  searchForm.status = '';
  searchForm.counterpartyId = null;
  searchForm.dateRange = [monthStart(), todayStr()];
  reload();
};

const loadOptions = async () => {
  try {
    const res = await getCounterpartyAll({ activeOnly: true });
    cpOptions.value = res?.data || [];
  } catch { cpOptions.value = []; }
};

onMounted(() => {
  searchForm.dateRange = [monthStart(), todayStr()];
  loadOptions();
  loadData();
});
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; background: #fff;
  padding: 14px 20px; border-radius: 8px 8px 0 0; flex-wrap: wrap; gap: 10px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.header-tip { font-size: 12px; color: #909399; }
.header-right { display: flex; gap: 8px; flex-wrap: wrap; }

.search-bar { background: #fff; padding: 12px 20px; }
.search-bar :deep(.el-form-item) { margin-bottom: 8px; }

.sum-bar { background: #fff; padding: 10px 20px 14px; border-top: 1px dashed #ebeef5; }
.sum-main { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; font-size: 13px; color: #606266; }
.sum-item b { font-size: 16px; margin: 0 2px; }
.sum-item b.in, .amt-in { color: #2f9e5f; }
.sum-item b.out, .amt-out { color: #d9534f; }
.sum-sep { width: 1px; height: 14px; background: #e4e7ed; }
.sum-label { color: #909399; margin-right: 4px; }
.sum-types { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.type-chip { font-size: 12px; color: #606266; background: #f7f8fa; border: 1px solid #eef0f3;
  border-radius: 12px; padding: 3px 10px; }
.type-chip em { font-style: normal; font-weight: 600; color: #303133; margin-right: 6px; }
.sum-range { font-size: 12px; color: #b0b3b8; margin-top: 8px; }

.section-divider { height: 1px; background: #e8ecf1; }
.table-section { background: #fff; padding: 12px 20px 18px; border-radius: 0 0 8px 8px; }
:deep(.el-table .cell) { padding: 4px 6px; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
.spec-text { color: #909399; }
.unit { font-style: normal; color: #b0b3b8; margin-left: 2px; font-size: 11px; }
.muted { color: #c0c4cc; }
</style>
