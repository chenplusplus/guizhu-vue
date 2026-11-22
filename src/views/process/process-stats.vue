<!-- src/views/process/process-stats.vue 全局统计：每个师傅发了多少、收了多少 -->
<template>
  <div class="page-container">
    <!-- 页头 -->
    <div class="page-header">
      <div class="header-left">
        <h2>📊 全局统计 · 师傅收发</h2>
        <el-tag v-if="hintText" type="info" effect="plain">{{ hintText }}</el-tag>
      </div>
      <div class="header-right">
        <el-radio-group v-model="dateType" size="small" @change="onDateTypeChange">
          <el-radio-button label="today">今天</el-radio-button>
          <el-radio-button label="month">本月</el-radio-button>
          <el-radio-button label="lastMonth">上月</el-radio-button>
          <el-radio-button label="all">全部</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          size="small"
          style="width: 250px"
          @change="onCustomDate"
        />
        <el-button size="small" @click="reloadAll"><el-icon><Refresh /></el-icon> 刷新</el-button>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <div class="f-row">
        <span class="f-label">工序</span>
        <el-radio-group v-model="filters.mainProcess" size="small" @change="onMainProcessChange">
          <el-radio-button label="">全工厂</el-radio-button>
          <el-radio-button label="ZM">执模</el-radio-button>
          <el-radio-button label="XS">镶石</el-radio-button>
          <el-radio-button label="PG">抛光</el-radio-button>
        </el-radio-group>

        <span class="f-label">师傅</span>
        <el-select
          v-model="filters.masterNames"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          filterable
          placeholder="全部师傅"
          size="small"
          style="width: 200px"
        >
          <el-option v-for="m in options.masters" :key="m.name" :label="m.name" :value="m.name">
            <span class="opt-main">{{ m.name }}</span>
            <span class="opt-side">{{ m.count }} 单</span>
          </el-option>
        </el-select>

        <span class="f-label">内容</span>
        <el-select
          v-model="filters.contents"
          multiple
          collapse-tags
          collapse-tags-tooltip
          clearable
          filterable
          placeholder="全部内容"
          size="small"
          style="width: 220px"
        >
          <el-option-group v-for="g in contentGroups" :key="g.key" :label="g.label">
            <el-option v-for="c in g.items" :key="c.value" :label="c.value" :value="c.value">
              <span class="opt-main">{{ c.value }}</span>
              <span class="opt-side">{{ c.count }} 单</span>
            </el-option>
          </el-option-group>
        </el-select>

        <span class="f-label">成色</span>
        <el-select v-model="filters.materials" multiple collapse-tags clearable placeholder="全部" size="small" style="width: 150px">
          <el-option v-for="m in options.materials" :key="m" :label="m" :value="m" />
        </el-select>

        <span class="f-label">状态</span>
        <el-select v-model="filters.status" clearable placeholder="全部" size="small" style="width: 110px">
          <el-option label="待审核" :value="0" />
          <el-option label="已审核" :value="1" />
        </el-select>

        <el-input v-model="filters.keyword" placeholder="单号 / 产品 / 内容 / 备注 / 师傅" clearable size="small" style="width: 230px">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <el-button size="small" text type="primary" @click="resetFilters">重置</el-button>
      </div>
    </div>

    <div class="content-body" v-loading="loading">
      <!-- 汇总条 -->
      <div class="sum-cards">
        <div class="sum-card">
          <div class="k">师傅数</div>
          <div class="v">{{ summary.masterCount }}</div>
          <div class="s">有单据的师傅</div>
        </div>
        <div class="sum-card">
          <div class="k">单据数</div>
          <div class="v">{{ summary.recordCount }}</div>
          <div class="s">待审 {{ summary.pendingCount }} / 已审 {{ summary.auditedCount }}</div>
        </div>
        <div class="sum-card send">
          <div class="k">发出合计</div>
          <div class="v">{{ w3(summary.sendWeightG) }}<em>g</em></div>
          <div class="s">工厂交给师傅</div>
        </div>
        <div class="sum-card recv">
          <div class="k">回收合计</div>
          <div class="v">{{ w3(summary.recycleWeightG) }}<em>g</em></div>
          <div class="s">师傅交回工厂</div>
        </div>
        <div class="sum-card loss">
          <div class="k">实损耗</div>
          <div class="v">{{ w3(summary.actualLossG) }}<em>g</em></div>
          <div class="s">损耗率 {{ pct(summary.lossRate) }}</div>
        </div>
        <div class="sum-card">
          <div class="k">应回金</div>
          <div class="v" :class="signClass(summary.shouldRecycleG)">{{ w3(summary.shouldRecycleG) }}<em>g</em></div>
          <div class="s">实损耗 − 标准损耗</div>
        </div>
        <div class="sum-card">
          <div class="k">工费合计</div>
          <div class="v">{{ money(summary.laborFee) }}<em>元</em></div>
          <div class="s">标准损耗 {{ w3(summary.standardLossG) }} g</div>
        </div>
      </div>

      <!-- 一、按师傅汇总 -->
      <div class="panel">
        <div class="panel-h">
          <span class="t">一、按师傅汇总</span>
          <span class="hint">点一行只看该师傅；再点一次取消</span>
          <span class="grow"></span>
          <span class="hint">共 {{ masterRows.length }} 位师傅</span>
        </div>
        <div class="table-wrap">
          <table class="grid-table master-table">
            <thead>
              <tr>
                <th class="c-idx">#</th>
                <th class="c-master">师傅</th>
                <th class="c-num">单据数</th>
                <th class="c-num">发出 (g)</th>
                <th class="c-num">回收 (g)</th>
                <th class="c-num">实损耗 (g)</th>
                <th class="c-num">损耗率</th>
                <th class="c-num">标准损耗 (g)</th>
                <th class="c-num">应回金 (g)</th>
                <th class="c-num">工费 (元)</th>
                <th class="c-num">待审</th>
                <th class="c-num">已审</th>
                <th class="c-wide">涉及工序</th>
                <th class="c-wide">涉及内容</th>
                <th class="c-date">业务日期</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(r, i) in masterRows"
                :key="r.masterName"
                :class="{ active: filters.masterNames.length === 1 && filters.masterNames[0] === r.masterName }"
                @click="pickMaster(r.masterName)"
              >
                <td class="c-idx">{{ i + 1 }}</td>
                <td class="c-master"><b>{{ r.masterName }}</b></td>
                <td class="c-num">{{ r.recordCount }}</td>
                <td class="c-num send">{{ w3(r.sendWeightG) }}</td>
                <td class="c-num recv">{{ w3(r.recycleWeightG) }}</td>
                <td class="c-num loss">{{ w3(r.actualLossG) }}</td>
                <td class="c-num loss">{{ pct(r.lossRate) }}</td>
                <td class="c-num">{{ w3(r.standardLossG) }}</td>
                <td class="c-num" :class="signClass(r.shouldRecycleG)">{{ w3(r.shouldRecycleG) }}</td>
                <td class="c-num">{{ money(r.laborFee) }}</td>
                <td class="c-num"><span v-if="r.pendingCount" class="pending">{{ r.pendingCount }}</span><span v-else>—</span></td>
                <td class="c-num">{{ r.auditedCount }}</td>
                <td class="c-wide">{{ r.mainProcesses || '—' }}</td>
                <td class="c-wide ellip" :title="r.contents">{{ r.contents || '—' }}</td>
                <td class="c-date">{{ r.firstDate === r.lastDate ? r.firstDate : `${r.firstDate} ~ ${r.lastDate}` }}</td>
              </tr>
              <tr v-if="!masterRows.length">
                <td colspan="15" class="empty">当前筛选条件没有工序单据</td>
              </tr>
            </tbody>
            <tfoot v-if="masterRows.length">
              <tr>
                <td colspan="2" class="c-master">合计</td>
                <td class="c-num">{{ summary.recordCount }}</td>
                <td class="c-num send">{{ w3(summary.sendWeightG) }}</td>
                <td class="c-num recv">{{ w3(summary.recycleWeightG) }}</td>
                <td class="c-num loss">{{ w3(summary.actualLossG) }}</td>
                <td class="c-num loss">{{ pct(summary.lossRate) }}</td>
                <td class="c-num">{{ w3(summary.standardLossG) }}</td>
                <td class="c-num">{{ w3(summary.shouldRecycleG) }}</td>
                <td class="c-num">{{ money(summary.laborFee) }}</td>
                <td class="c-num">{{ summary.pendingCount }}</td>
                <td class="c-num">{{ summary.auditedCount }}</td>
                <td colspan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- 二、单据明细 -->
      <div class="panel" ref="detailRef">
        <div class="panel-h">
          <span class="t">二、单据明细</span>
          <span class="hint">共 {{ detailTotal }} 条，每页 {{ pageSize }} 条；底部合计为全部 {{ detailTotal }} 条的合计</span>
          <span class="grow"></span>
          <el-button size="small" :loading="exporting" @click="exportCsv">导出 CSV</el-button>
        </div>

        <el-table
          :data="detailRows"
          size="small"
          border
          stripe
          height="520"
          :summary-method="detailSummary"
          show-summary
          class="detail-table"
        >
          <el-table-column type="index" label="#" width="46" align="center" fixed="left" />
          <el-table-column prop="receiptNo" label="单据号" width="160" fixed="left">
            <template #default="{ row }">
              <el-link type="primary" :underline="false" @click="gotoDetail(row)">{{ row.receiptNo }}</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="businessDate" label="业务日期" width="100" align="center">
            <template #default="{ row }">{{ (row.businessDate || '').slice(0, 10) }}</template>
          </el-table-column>
          <el-table-column prop="mainProcessName" label="工序" width="70" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="procTagType(row.mainProcess)" effect="plain">{{ row.mainProcessName }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="masterName" label="师傅" width="100">
            <template #default="{ row }"><b>{{ row.masterName || '—' }}</b></template>
          </el-table-column>
          <el-table-column prop="productName" label="产品名称" width="100" show-overflow-tooltip />
          <el-table-column prop="content" label="内容" width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ row.content || '—' }}</template>
          </el-table-column>
          <el-table-column prop="subProcess" label="子工序" width="110" show-overflow-tooltip>
            <template #default="{ row }">{{ row.subProcess || '—' }}</template>
          </el-table-column>
          <el-table-column prop="materialName" label="成色" width="90">
            <template #default="{ row }">{{ row.materialName || '—' }}</template>
          </el-table-column>
          <el-table-column prop="sendWeightG" label="发出 (g)" width="95" align="right">
            <template #default="{ row }"><span class="send">{{ w3(row.sendWeightG) }}</span></template>
          </el-table-column>
          <el-table-column prop="recycleWeightG" label="回收 (g)" width="95" align="right">
            <template #default="{ row }"><span class="recv">{{ w3(row.recycleWeightG) }}</span></template>
          </el-table-column>
          <el-table-column prop="actualLossG" label="实损耗 (g)" width="95" align="right">
            <template #default="{ row }"><span class="loss">{{ w3(row.actualLossG) }}</span></template>
          </el-table-column>
          <el-table-column label="损耗率" width="80" align="right">
            <template #default="{ row }">{{ row.sendWeightG ? pct((row.actualLossG / row.sendWeightG) * 100) : '—' }}</template>
          </el-table-column>
          <el-table-column prop="standardLossG" label="标准损耗 (g)" width="105" align="right">
            <template #default="{ row }">{{ w3(row.standardLossG) }}</template>
          </el-table-column>
          <el-table-column prop="shouldRecycleG" label="应回金 (g)" width="100" align="right">
            <template #default="{ row }">
              <span :class="signClass(row.shouldRecycleG)">{{ w3(row.shouldRecycleG) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="laborFee" label="工费 (元)" width="90" align="right">
            <template #default="{ row }">{{ money(row.laborFee) }}</template>
          </el-table-column>
          <el-table-column prop="statusText" label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === 1 ? 'success' : 'warning'" effect="plain">
                {{ row.status === 1 ? '已审核' : '待审核' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" width="110" show-overflow-tooltip>
            <template #default="{ row }">{{ row.remark || '—' }}</template>
          </el-table-column>
          <el-table-column prop="submitEmpName" label="提交人" width="90">
            <template #default="{ row }">{{ row.submitEmpName || '—' }}</template>
          </el-table-column>
          <el-table-column prop="auditEmpName" label="审核人" width="90">
            <template #default="{ row }">{{ row.auditEmpName || '—' }}</template>
          </el-table-column>
          <el-table-column label="审核时间" width="140" align="center">
            <template #default="{ row }">{{ fmtTime(row.auditTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="70" align="center" fixed="right">
            <template #default="{ row }">
              <el-link type="primary" :underline="false" @click="gotoDetail(row)">查看</el-link>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :page-sizes="[20, 50, 100, 200]"
            :total="detailTotal"
            layout="total, sizes, prev, pager, next, jumper"
            background
            small
            @current-change="loadDetail"
            @size-change="onPageSizeChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Search } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { getMasterStats, getMasterRecords, getMasterStatsOptions } from '@/api/process';

const router = useRouter();

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const dateType = ref('month');
const dateRange = ref([]);
const loading = ref(false);
const exporting = ref(false);

const filters = reactive({
  mainProcess: '',
  masterNames: [],
  contents: [],
  materials: [],
  status: null,
  keyword: ''
});

const options = reactive({ masters: [], contents: [], materials: [], minDate: '', maxDate: '' });
const summary = reactive({
  masterCount: 0, recordCount: 0, sendWeightG: 0, recycleWeightG: 0, actualLossG: 0,
  standardLossG: 0, shouldRecycleG: 0, lossRate: 0, laborFee: 0, pendingCount: 0, auditedCount: 0
});
const masterRows = ref([]);
const detailRows = ref([]);
const detailTotal = ref(0);
const page = ref(1);
const pageSize = ref(50);
const detailRef = ref(null);

let reqSeq = 0;
let timer = null;

const w3 = (v) => (Number(v) || 0).toFixed(3);
const money = (v) => (Number(v) || 0).toFixed(2);
const pct = (v) => `${(Number(v) || 0).toFixed(2)}%`;
const signClass = (v) => (Number(v) > 0 ? 'pos' : Number(v) < 0 ? 'neg' : '');
const fmtTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '—');
const procTagType = (mp) => (mp === 'ZM' ? 'primary' : mp === 'XS' ? 'warning' : 'success');

const MP_NAME = { ZM: '执模', XS: '镶石', PG: '抛光' };

// 内容按工序分组（当前只选了某个工序时只显示该工序的内容）
const contentGroups = computed(() => {
  const list = options.contents.filter(c => !filters.mainProcess || c.mainProcess === filters.mainProcess);
  const map = new Map();
  list.forEach(c => {
    const key = c.mainProcess || 'OTHER';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  });
  const order = ['ZM', 'XS', 'PG'];
  return [...map.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([key, items]) => ({ key, label: MP_NAME[key] || '其他', items }));
});

const hintText = computed(() => {
  if (dateType.value === 'all' || !dateRange.value?.length) return '全部时间';
  return `${dateRange.value[0]} ~ ${dateRange.value[1]}`;
});

const applyDateType = () => {
  const now = new Date();
  if (dateType.value === 'today') {
    dateRange.value = [fmtDate(now), fmtDate(now)];
  } else if (dateType.value === 'month') {
    // ⭐ 本月 = 1 号 ~ 今天（与列表页口径一致，不再算到月末）
    dateRange.value = [fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)), fmtDate(now)];
  } else if (dateType.value === 'lastMonth') {
    dateRange.value = [fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), fmtDate(new Date(now.getFullYear(), now.getMonth(), 0))];
  } else {
    dateRange.value = [];
  }
};

const onDateTypeChange = () => {
  applyDateType();
  reloadAll();
};

const onCustomDate = () => {
  dateType.value = 'custom';
  reloadAll();
};

const onMainProcessChange = () => {
  // 切工序后，清掉不属于该工序的内容，避免筛出空结果
  if (filters.mainProcess) {
    const allowed = new Set(options.contents
      .filter(c => c.mainProcess === filters.mainProcess)
      .map(c => c.value));
    filters.contents = filters.contents.filter(v => allowed.has(v));
  }
};

const buildParams = (extra = {}) => {
  const p = { ...extra };
  if (dateRange.value?.length === 2) {
    p.startDate = dateRange.value[0];
    p.endDate = dateRange.value[1];
  }
  if (filters.mainProcess) p.mainProcess = filters.mainProcess;
  if (filters.masterNames.length) p.masterNames = filters.masterNames.join(',');
  if (filters.contents.length) p.contents = filters.contents.join(',');
  if (filters.materials.length === 1) p.material = filters.materials[0];
  if (filters.status !== null && filters.status !== '') p.status = filters.status;
  if (filters.keyword.trim()) p.keyword = filters.keyword.trim();
  return p;
};

const loadStats = async () => {
  const seq = ++reqSeq;
  loading.value = true;
  try {
    const res = await getMasterStats(buildParams());
    if (seq !== reqSeq) return;
    const d = res.data || {};
    Object.assign(summary, d.summary || {});
    masterRows.value = d.rows || [];
  } catch (e) {
    ElMessage.error(e?.message || '统计加载失败');
  } finally {
    if (seq === reqSeq) loading.value = false;
  }
};

const loadDetail = async () => {
  try {
    const res = await getMasterRecords(buildParams({ page: page.value, pageSize: pageSize.value }));
    const d = res.data || {};
    detailRows.value = d.rows || [];
    detailTotal.value = d.total || 0;
  } catch (e) {
    ElMessage.error(e?.message || '明细加载失败');
  }
};

const reloadAll = () => {
  page.value = 1;
  loadStats();
  loadDetail();
};

const reloadSoon = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    loadStats();
    loadDetail();
  }, 260);
};

const resetFilters = () => {
  filters.mainProcess = '';
  filters.masterNames = [];
  filters.contents = [];
  filters.materials = [];
  filters.status = null;
  filters.keyword = '';
  reloadAll();
};

const pickMaster = (name) => {
  if (filters.masterNames.length === 1 && filters.masterNames[0] === name) {
    filters.masterNames = [];
  } else {
    filters.masterNames = [name];
  }
  reloadSoon();
  setTimeout(scrollToDetail, 300);
};

// 滚到明细区：找最近的可滚动父容器，留出顶栏高度，避免标题被遮住
const scrollToDetail = () => {
  const el = detailRef.value;
  if (!el) return;
  let node = el.parentElement;
  while (node) {
    const st = getComputedStyle(node);
    if (/(auto|scroll)/.test(st.overflowY) && node.scrollHeight > node.clientHeight + 20) {
      const top = el.getBoundingClientRect().top - node.getBoundingClientRect().top + node.scrollTop - 16;
      node.scrollTo({ top, behavior: 'smooth' });
      return;
    }
    node = node.parentElement;
  }
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16, behavior: 'smooth' });
};

const onPageSizeChange = () => {
  page.value = 1;
  loadDetail();
};

const gotoDetail = (row) => {
  const seg = { ZM: 'zm', XS: 'xs', PG: 'pg' }[row.mainProcess] || 'zm';
  router.push(`/process/${seg}-detail/${row.id}`);
};

// 明细表合计行：用当前筛选的「全量合计」，与上方汇总卡/师傅表合计保持一致
// （el-table 默认只加当前页，分页时会和总量对不上）
const detailSummary = ({ columns }) => {
  const map = {
    sendWeightG: w3(summary.sendWeightG),
    recycleWeightG: w3(summary.recycleWeightG),
    actualLossG: w3(summary.actualLossG),
    standardLossG: w3(summary.standardLossG),
    shouldRecycleG: w3(summary.shouldRecycleG),
    laborFee: money(summary.laborFee)
  };
  return columns.map((col, idx) => {
    if (idx === 0) return '合计';
    if (col.property && map[col.property]) return map[col.property];
    if (col.label === '损耗率') return pct(summary.lossRate);
    return '';
  });
};

const exportCsv = async () => {
  exporting.value = true;
  try {
    const res = await getMasterRecords(buildParams({ page: 1, pageSize: 500 }));
    const rows = res.data?.rows || [];
    if (!rows.length) return ElMessage.warning('没有可导出的数据');
    const heads = ['单据号', '业务日期', '工序', '师傅', '产品名称', '内容', '子工序', '成色',
      '发出(g)', '回收(g)', '实损耗(g)', '损耗率', '标准损耗(g)', '应回金(g)', '工费', '状态', '备注', '提交人', '审核人', '审核时间'];
    const lines = [heads.join(',')];
    rows.forEach(r => {
      const d = (r.businessDate || '').slice(0, 10);
      const rate = r.sendWeightG ? ((r.actualLossG / r.sendWeightG) * 100).toFixed(2) + '%' : '';
      const cells = [r.receiptNo, d, r.mainProcessName, r.masterName, r.productName, r.content, r.subProcess,
        r.materialName, r.sendWeightG, r.recycleWeightG, r.actualLossG, rate, r.standardLossG,
        r.shouldRecycleG, r.laborFee, r.statusText, r.remark, r.submitEmpName, r.auditEmpName, fmtTime(r.auditTime)];
      lines.push(cells.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `师傅收发明细_${hintText.value.replace(/\s/g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    ElMessage.success(`已导出 ${rows.length} 条${res.data.total > rows.length ? '（最多 500 条）' : ''}`);
  } catch (e) {
    ElMessage.error(e?.message || '导出失败');
  } finally {
    exporting.value = false;
  }
};

// 筛选变化自动查询
watch(
  () => [filters.mainProcess, filters.masterNames, filters.contents, filters.materials, filters.status, filters.keyword],
  reloadSoon,
  { deep: true }
);

onMounted(async () => {
  applyDateType();
  try {
    const res = await getMasterStatsOptions();
    const d = res.data || {};
    options.masters = d.masters || [];
    options.contents = d.contents || [];
    options.materials = d.materials || [];
    options.minDate = d.minDate || '';
    options.maxDate = d.maxDate || '';
  } catch { /* 选项失败不阻塞统计 */ }
  reloadAll();
});

onBeforeUnmount(() => clearTimeout(timer));
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }

.page-header {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0; flex-wrap: wrap; gap: 10px;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.filter-bar { background: #fff; padding: 10px 20px 12px; border-top: 1px solid #f0f2f5; }
.f-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.f-label { font-size: 12px; color: #606266; margin-left: 6px; }
.f-row .f-label:first-child { margin-left: 0; }

.content-body { background: #fff; padding: 16px 20px 20px; border-radius: 0 0 8px 8px; }

/* 汇总卡 */
.sum-cards { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
.sum-card { border: 1px solid #ebeef5; border-radius: 6px; padding: 10px 12px; background: #fbfcfe; }
.sum-card .k { font-size: 12px; color: #909399; }
.sum-card .v { font-size: 20px; font-weight: 700; color: #303133; font-family: Consolas, monospace; margin: 4px 0 2px; }
.sum-card .v em { font-size: 12px; font-style: normal; color: #909399; margin-left: 5px; font-weight: 400; }
.sum-card .s { font-size: 11.5px; color: #a8abb2; }
.sum-card.send { border-color: #d6e8ff; background: #f4f9ff; }
.sum-card.send .v { color: #1668dc; }
.sum-card.recv { border-color: #d7f0e2; background: #f5fcf8; }
.sum-card.recv .v { color: #1a8f5a; }
.sum-card.loss { border-color: #ffe6cc; background: #fffaf3; }
.sum-card.loss .v { color: #c26a00; }

/* 面板 */
.panel { margin-top: 14px; }
.panel-h { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.panel-h .t { font-size: 14px; font-weight: 600; color: #303133; }
.panel-h .hint { font-size: 12px; color: #909399; }
.panel-h .grow { flex: 1; }

.table-wrap { overflow-x: auto; border: 1px solid #ebeef5; border-radius: 4px; }
.grid-table { width: 100%; border-collapse: collapse; font-size: 12.5px; white-space: nowrap; }
.grid-table th, .grid-table td { padding: 7px 10px; border-bottom: 1px solid #f0f2f5; }
.grid-table thead th { background: #fafbfd; color: #475569; font-weight: 600; text-align: left; }
.grid-table tbody tr:hover { background: #f7faff; }
.grid-table tbody tr.active { background: #eef5ff; box-shadow: inset 3px 0 0 #1668dc; }
.grid-table tbody tr { cursor: pointer; }
.grid-table tfoot td { background: #fafbfd; font-weight: 700; border-top: 2px solid #e4e9f0; }
.c-idx { width: 44px; text-align: center; color: #a8abb2; }
.c-master { min-width: 96px; }
.c-num { text-align: right; font-variant-numeric: tabular-nums; }
.c-wide { min-width: 150px; }
.c-date { min-width: 160px; color: #606266; }
.ellip { max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
.empty { text-align: center; color: #a8abb2; padding: 24px 0; }
.send { color: #1668dc; }
.recv { color: #1a8f5a; }
.loss { color: #c26a00; }
.pos { color: #c0392b; }
.neg { color: #1a8f5a; }
.pending { color: #e6a23c; font-weight: 700; }

.detail-table { width: 100%; }
.pager { display: flex; justify-content: flex-end; margin-top: 10px; }

.opt-main { float: left; }
.opt-side { float: right; color: #a8abb2; font-size: 12px; margin-left: 12px; }

@media (max-width: 1500px) {
  .sum-cards { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 1100px) {
  .sum-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
