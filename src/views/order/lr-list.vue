<!-- src/views/order/lr-list.vue
     LR 表管理（只读）
       - 只显示「对比明细」：每组 = 销售行 + 成本行，组间粗红线分隔
       - ⭐ 2026-11-15 起：原页面底部的两块汇总（进销存 / 累计 KPI + 按成色）
         已迁到「经营看板」→ components/LrSummaryPanels.vue
       - 默认时间 = 今天
-->
<template>
  <div class="page-container" :class="{ 'is-lr-full': isFull }" v-loading="loading">

    <!-- ===== 搜索栏 ===== -->
    <div class="search-bar">
      <el-form :inline="true" :model="search" size="default">
        <el-form-item label="时间">
          <el-radio-group v-model="search.dateType" @change="onDateTypeChange">
            <el-radio-button value="today">今天</el-radio-button>
            <el-radio-button value="month">本月</el-radio-button>
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="custom">自定义</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="search.dateType === 'custom'">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px;"
            @change="loadData"
          />
        </el-form-item>

        <el-form-item label="客户">
          <el-select
            v-model="search.customerId"
            placeholder="全部客户"
            clearable
            filterable
            style="width: 170px;"
            @change="loadData"
          >
            <el-option
              v-for="item in customerList"
              :key="item.customerId"
              :label="item.customerName"
              :value="item.customerId"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="品名">
          <el-input
            v-model="search.productName"
            placeholder="输入品名关键字"
            clearable
            style="width: 150px;"
            @keyup.enter="loadData"
            @clear="loadData"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-form-item label="成色">
          <el-select v-model="search.color" placeholder="全部成色" clearable style="width: 110px;" @change="loadData">
            <el-option v-for="c in colorOptions" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="loadData">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><RefreshRight /></el-icon> 重置
          </el-button>
          <!-- ⭐ 下载：当前筛选范围的全部 LR，一单一单往下排，末尾带汇总 -->
          <el-button
            type="primary"
            plain
            :loading="downloading"
            :disabled="!rows.length"
            @click="handleDownload"
          >
            <el-icon><Download /></el-icon> 下载
          </el-button>
          <!-- ⭐ 全屏查看：整页铺满屏幕、表格压到一屏宽（不用左右滚），Esc 退出 -->
          <el-button v-if="!isFull" :disabled="!rows.length" @click="enterFull">
            <el-icon><FullScreen /></el-icon> 全屏查看
          </el-button>
          <el-button v-else type="primary" plain @click="exitFull">
            <el-icon><Close /></el-icon> 退出全屏（Esc）
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- ===== 范围条 ===== -->
    <div class="hint-bar">
      <el-icon><InfoFilled /></el-icon>
      <span>LR 表在<b>账单最终确认</b>后自动生成（一张账单一份），内容只读；明细按「销售行 + 成本行」成组，每组末尾红线分隔。</span>
      <span class="hint-count">
        范围 <b>{{ rangeText }}</b>　｜　共 <b>{{ lrCount }}</b> 份 LR、<b>{{ groupCount }}</b> 组
      </span>
    </div>

    <!-- ===== 明细（最上面，一行一行，每组两行，组间粗红线） ===== -->
    <div class="detail-head">
      <span class="dt-title">LR 明细</span>
      <span class="dt-hint">销售行在上、成本行在下；每组末尾粗红线分隔。点账单号进详情。</span>
      <span class="dt-hint right" v-if="rows.length">共 {{ rows.length }} 行 / {{ groupCount }} 组</span>
    </div>

    <div class="detail-scroll" v-if="rows.length">
      <table class="excel-table" :style="tableZoomStyle">
        <thead>
          <tr>
            <th rowspan="2" class="bill-col">账单号</th>
            <th rowspan="2">流水单号</th>
            <th rowspan="2">序号</th>
            <th rowspan="2">品名</th>
            <th rowspan="2">客户</th>
            <th rowspan="2">钻石级别</th>
            <th rowspan="2">颜色</th>
            <th rowspan="2">件数</th>
            <th rowspan="2">手寸/长度</th>
            <th rowspan="2">总重</th>
            <th rowspan="2">净重</th>
            <th rowspan="2">损耗</th>
            <th rowspan="2">加耗重</th>
            <th rowspan="2">金价</th>
            <th rowspan="2">足金料</th>
            <th colspan="5">钻石费用</th>
            <th colspan="5">镶石工费</th>
            <th rowspan="2">包装证书</th>
            <th rowspan="2">版费</th>
            <th rowspan="2">工费</th>
            <th rowspan="2">应收金额</th>
            <th rowspan="2" class="profit-col">本组利润</th>
          </tr>
          <tr>
            <th>粒数</th>
            <th>石重(ct)</th>
            <th>单价(元)</th>
            <th>金额(元)</th>
            <th>镶石工费</th>
            <th>粒数</th>
            <th>石重</th>
            <th>单价(元)</th>
            <th>金额(元)</th>
            <th>镶石工费</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in displayRows"
            :key="row.rowId || idx"
            :class="row.rowType === 'sale' ? 'sale-row' : 'cost-row'"
          >
            <!-- ⭐ 全屏：账单号两行（销售 + 成本）合并成一个单元格，居中 -->
            <td
              v-if="!isFull || row._first"
              class="text-center bill-cell"
              :rowspan="isFull && row._first ? row._span : undefined"
            >
              <el-link
                v-if="row.rowType === 'sale'"
                type="primary"
                class="bill-link"
                @click="goDetail(row)"
              >{{ row.billNo }}</el-link>
            </td>
            <td class="text-center">{{ row.serialNo || '' }}</td>
            <td class="text-center">
              <span :class="row.rowType === 'sale' ? 'seq sale-seq' : 'seq cost-seq'">{{ row.seqDisplay || row.seqNo }}</span>
            </td>
            <td class="text-left">{{ row.productName || '' }}</td>
            <td class="text-center">{{ row.customerName || '' }}</td>
            <td class="text-center">{{ row.diamondLevel || '' }}</td>
            <td class="text-center">{{ row.color || '' }}</td>
            <td class="text-right">{{ row.quantity || '' }}</td>
            <td class="text-center">{{ row.size || '' }}</td>
            <td class="text-right">{{ n3(row.totalWeight) }}</td>
            <td class="text-right">{{ n3(row.netWeight) }}</td>
            <td class="text-right">{{ fmtRate(row.lossRate) }}</td>
            <td class="text-right red-text">{{ n3(row.addLossWeight) }}</td>
            <td class="text-right">{{ n2(row.goldPrice) }}</td>
            <td class="text-right">{{ n2(row.goldMaterialFee) }}</td>
            <td class="text-right">{{ row.stoneQty || '' }}</td>
            <td class="text-right">{{ n3(row.stoneWeight) }}</td>
            <td class="text-right">{{ n2(row.stonePrice) }}</td>
            <td class="text-right red-text">{{ n2(row.stoneAmount) }}</td>
            <td class="text-right">{{ n2(row.stoneSettingFee) }}</td>
            <td class="text-right">{{ row.subStoneQty || '' }}</td>
            <td class="text-right">{{ n3(row.subStoneWeight) }}</td>
            <td class="text-right">{{ n2(row.subStonePrice) }}</td>
            <td class="text-right red-text">{{ n2(row.subStoneAmount) }}</td>
            <td class="text-right">{{ n2(row.subStoneSettingFee) }}</td>
            <td class="text-right">{{ n2(packFee(row)) }}</td>
            <td class="text-right">{{ n2(row.moldFee) }}</td>
            <td class="text-right">{{ n2(row.laborFee) }}</td>
            <td class="text-right red-text bold">{{ n2(row.totalAmount) }}</td>
            <!-- ⭐ 本组利润：两行合并成一个单元格，居中、红字加粗（全屏和非全屏都合并） -->
            <td v-if="row._first" :rowspan="row._span" class="profit-cell">
              <template v-if="row._profit !== null">{{ money(row._profit) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <el-empty
      v-else
      :description="search.dateType === 'today' ? '今天还没有 LR 表（账单最终确认后自动生成）' : '该范围内没有 LR 表'"
    />


  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Search, RefreshRight, InfoFilled, FullScreen, Close, Download } from '@element-plus/icons-vue';
import { getLrCustomers, getLrSheet, exportLrAll } from '@/api/lr';

const router = useRouter();

const loading = ref(false);
const customerList = ref([]);
const dateRange = ref([]);
const sheet = ref(null);

// ============================================================
// ⭐ 全屏查看（照「我的账单」的范围全屏做法）
//    - 整页 position:fixed 铺满视口，白底，盖住侧边栏
//    - 表格在 .is-lr-full 下压缩字号/内边距，30 列压进一屏宽，不用左右滚
//    - 本页只剩明细，全屏后整屏都是明细
//    - Esc 退出（捕获阶段拦，避免顺带关掉弹窗）
// ============================================================
const isFull = ref(false);

// 全屏下按需微缩：数据把 30 列撑得比屏还宽时，整体等比缩到刚好一屏（下限 0.8）
//   - 只缩表格，不动字号/列宽，量自然宽度用 zoom=1
//   - 缩放后行高一起变小，纵向也更省
const fitZoom = ref(1);
const tableZoomStyle = computed(() => (isFull.value && fitZoom.value !== 1 ? { zoom: fitZoom.value } : null));

const refitTable = () => {
  if (!isFull.value) { fitZoom.value = 1; return; }
  const box = document.querySelector('.detail-scroll');
  const table = box && box.querySelector('.excel-table');
  if (!box || !table) return;
  fitZoom.value = 1; // 先归位量自然宽度，再决定缩放
  requestAnimationFrame(() => {
    if (!isFull.value) return;
    // 宽度必须在全屏布局生效后再量，否则拿到的是旧容器宽
    const avail = box.clientWidth;
    const natural = table.getBoundingClientRect().width || 1;
    if (natural > avail + 1) {
      // -3 是给 100% 宽度换算留的余量，floor 保证只会缩多不会缩少
      const z = Math.max(0.8, Math.min(1, (avail - 3) / natural));
      fitZoom.value = Math.floor(z * 1000) / 1000;
    }
  });
};

const onFullKey = (e) => {
  if (e.key !== 'Escape' || !isFull.value) return;
  e.preventDefault();
  e.stopPropagation();
  exitFull();
};

let fitTimer = null;
const onFullResize = () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(refitTable, 150);
};

const enterFull = () => {
  if (!rows.value.length) return;
  isFull.value = true;
  document.body.style.overflow = 'hidden';
  window.addEventListener('keydown', onFullKey, true);
  window.addEventListener('resize', onFullResize);
  refitTable();
};

const exitFull = () => {
  if (!isFull.value) return;
  isFull.value = false;
  fitZoom.value = 1;
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onFullKey, true);
  window.removeEventListener('resize', onFullResize);
  clearTimeout(fitTimer);
};

const search = reactive({
  customerId: '',
  productName: '',
  dateType: 'today',
  color: '',
});

// ============================================================
// ⭐ 下载：按当前筛选条件导出全部 LR 成一张 Excel
//    - 一张单一个区块（标题 → 表头 → 销售/成本行 → 合计行），单与单之间空一行
//    - 全部单之后再给总汇总（按成色 + 金料/钻石/镶石/工费利润）
// ============================================================
const downloading = ref(false);

const handleDownload = async () => {
  if (!rows.value.length) return;
  downloading.value = true;
  try {
    const res = await exportLrAll({
      customerId: search.customerId || '',
      productName: search.productName || '',
      color: search.color || '',
      dateType: search.dateType,
      startDate: search.dateType === 'custom' ? (dateRange.value?.[0] || '') : '',
      endDate: search.dateType === 'custom' ? (dateRange.value?.[1] || '') : '',
    });
    const blob = await res.blob();
    // 文件名优先取后端 content-disposition（中文走 RFC5987）
    const cd = res.headers.get('content-disposition') || '';
    const matched = cd.match(/filename\*=UTF-8''([^;]+)/i) || cd.match(/filename="?([^";]+)"?/i);
    const fileName = matched ? decodeURIComponent(matched[1]) : '支出收入LR表_汇总.xlsx';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success(`已导出 ${lrCount.value} 份 LR`);
  } catch (e) {
    ElMessage.error(e?.message || '导出失败');
  } finally {
    downloading.value = false;
  }
};

const colorOptions = ['18K', '14K', '9K', 'PT', '足金999', '银950', '银', '铜'];

// ⭐ 2026-11-15：本页只留「对比明细」；原来的进销存 + 汇总（累计 / 按成色）两块
//    已迁到「经营看板」→ components/LrSummaryPanels.vue
const emptyData = {
  lrCount: 0,
  dateType: 'today',
  startDate: '',
  endDate: '',
  rows: [],
};

const data = computed(() => sheet.value || emptyData);
const rows = computed(() => data.value.rows || []);
const lrCount = computed(() => data.value.lrCount || 0);
const groupCount = computed(() => rows.value.filter(r => r.rowType === 'sale').length);

// ⭐ 按组（同一 lrId + seqNo）切好：首行带 _first/_span，组利润 _profit 挂在首行
//   - 后端 ORDER BY sortOrder, seqNo, rowType DESC → 每组固定「销售行 + 成本行」相邻
//   - _span 交给模板做 rowspan，实现账单号 / 本组利润两行合一
const ROW_KEY = (r) => `${r.lrId}__${r.seqNo}`;
const displayRows = computed(() => {
  const list = rows.value;
  const out = [];
  let i = 0;
  while (i < list.length) {
    const key = ROW_KEY(list[i]);
    let n = 1;
    while (i + n < list.length && ROW_KEY(list[i + n]) === key) n++;
    const grp = list.slice(i, i + n);
    const sale = grp.find((r) => r.rowType === 'sale');
    const cost = grp.find((r) => r.rowType === 'cost');
    // 只有销售 + 成本都在才算得出利润（缺一行就留空，别把整行金额当利润）
    const profit = sale && cost
      ? (Number(sale.totalAmount) || 0) - (Number(cost.totalAmount) || 0)
      : null;
    grp.forEach((r, j) => {
      out.push({ ...r, _first: j === 0, _span: j === 0 ? n : 0, _profit: profit });
    });
    i += n;
  }
  return out;
});

const rangeText = computed(() => {
  const d = data.value;
  if (!d.startDate || d.startDate === '全部') return '全部时间';
  if (d.startDate === d.endDate) return d.startDate;
  return `${d.startDate} ~ ${d.endDate}`;
});

const money = (v) => (Number(v) || 0).toFixed(2);
const n2 = (v) => (v === null || v === undefined || v === '' ? '' : Number(v).toFixed(2));
const n3 = (v) => (v === null || v === undefined || v === '' ? '' : Number(v).toFixed(3));
const fmtRate = (v) => {
  if (v === null || v === undefined || v === '') return '';
  const num = Number(v);
  return isNaN(num) ? '' : num.toFixed(4);
};
const packFee = (row) => (Number(row.packingFee) || 0) + (Number(row.certificateFee) || 0) + (Number(row.postageFee) || 0);

const onDateTypeChange = (val) => {
  if (val !== 'custom') dateRange.value = [];
  loadData();
};

const loadCustomers = async () => {
  try {
    const res = await getLrCustomers();
    customerList.value = res?.data || [];
  } catch {
    customerList.value = [];
  }
};

const loadData = async () => {
  if (search.dateType === 'custom') {
    if (!dateRange.value || dateRange.value.length !== 2) return;
  }
  loading.value = true;
  try {
    const params = {
      customerId: search.customerId || undefined,
      productName: search.productName || undefined,
      color: search.color || undefined,
      dateType: search.dateType || 'today',
      startDate: search.dateType === 'custom' ? dateRange.value?.[0] : undefined,
      endDate: search.dateType === 'custom' ? dateRange.value?.[1] : undefined,
    };
    const res = await getLrSheet(params);
    sheet.value = res?.data || null;
  } catch (e) {
    console.error('加载 LR 明细失败:', e);
    ElMessage.error('加载 LR 明细失败');
    sheet.value = null;
  } finally {
    loading.value = false;
    // 全屏里改筛选条件后重新算一次缩放
    if (isFull.value) refitTable();
  }
};

const resetSearch = () => {
  search.customerId = '';
  search.productName = '';
  search.dateType = 'today';
  search.color = '';
  dateRange.value = [];
  loadData();
};

const goDetail = (row) => {
  if (!row?.lrId) return;
  router.push({ name: 'LrDetail', params: { lrId: row.lrId } });
};

onMounted(() => {
  loadCustomers();
  loadData();
});

// 路由切走时别把 body 的滚动锁和 Esc 监听留在页面上
onBeforeUnmount(() => {
  if (isFull.value) exitFull();
  else window.removeEventListener('keydown', onFullKey, true);
});
</script>

<style scoped>
.page-container {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px 20px;
  min-height: 100%;
}

/* ===== 搜索 ===== */
.search-bar {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 10px;
}
.search-bar :deep(.el-form-item) { margin-bottom: 0; }

.hint-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  background: #f0f7ff;
  border: 1px solid #d6e6fb;
  color: #3a6ea5;
  font-size: 12.5px;
  padding: 7px 12px;
  border-radius: 5px;
  margin-bottom: 12px;
}
.hint-bar .hint-count { margin-left: auto; color: #6b7785; }
.hint-bar .hint-count b { color: #2b6cb0; }

/* ===== 明细 ===== */
.detail-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 4px 2px 8px;
  border-bottom: 1px solid #eef1f6;
  margin-bottom: 8px;
}
.dt-title { font-size: 14px; font-weight: 650; color: #1d2129; }
.dt-hint { font-size: 11.5px; color: #8a94a3; }
.dt-hint.right { margin-left: auto; }

.detail-scroll {
  overflow-x: auto;
  padding-bottom: 8px;
}
.detail-scroll::-webkit-scrollbar { height: 14px; }
.detail-scroll::-webkit-scrollbar-track { background: #e8f1ff; border-top: 1px solid #c6dcff; }
.detail-scroll::-webkit-scrollbar-thumb {
  background: #2f6fd0; border-radius: 7px; border: 2px solid #e8f1ff;
}
.detail-scroll::-webkit-scrollbar-thumb:hover { background: #1f5bb8; }

.excel-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #000;
  min-width: 2020px;
  font-family: '宋体', SimSun, sans-serif;
}
.excel-table th,
.excel-table td {
  border: 1px solid #000;
  padding: 4px;
  vertical-align: middle;
  font-size: 11.5px;
  font-weight: normal;
  white-space: nowrap;
}
.excel-table thead th { background: #f7f7f7; text-align: center; font-weight: 500; }

.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.red-text { color: #d64545; }
.bold { font-weight: bold; }

.sale-row { background: #fff; }
.cost-row { background: #e7f1fe; }
.cost-row td { color: #0b3d66; }
/* 每组结束：4px 红线（比之前更粗更醒目） */
.cost-row td { border-bottom: 4px solid #d64545; }

.seq { font-weight: 600; }
.sale-seq { color: #1d2129; }
.cost-seq { color: #2b6cb0; }

.profit-col { background: #fdf0ee; color: #c0392b; }
/* 利润两行合一：居中、红字加粗；底色统一，跨行时不出现半白半蓝
   ⚠️ 必须写成 .excel-table td.profit-cell：基础规则 `.excel-table td{font-weight:normal}`
      scoped 后是 (0,2,1)，单写 .profit-cell 只有 (0,2,0)，加粗会被压掉 */
.excel-table td.profit-cell {
  text-align: center;
  vertical-align: middle;
  font-weight: 700;
  color: #d64545;
  background: #fdf0ee;
}

.bill-cell { padding: 2px 4px; }
.bill-link { font-size: 11.5px; }

/* 账单号列固定在左边：横向滚到右侧看利润时仍知道是哪张单 */
.excel-table th.bill-col {
  position: sticky;
  left: 0;
  z-index: 3;
  width: 200px;
  min-width: 200px;
  background: #f7f7f7;
  box-shadow: 2px 0 0 #e2e7ef;
}
.excel-table td.bill-cell {
  position: sticky;
  left: 0;
  z-index: 2;
  width: 200px;
  min-width: 200px;
  background: #fff;
  box-shadow: 2px 0 0 #e2e7ef;
}
.excel-table tr.cost-row td.bill-cell { background: #e7f1fe; }

:deep(.el-table .cell) { padding: 4px 8px; }

/* ==================== ⭐ 全屏查看 ====================
   整页铺满视口、白底盖住侧边栏；表格压字号 + 压内边距，30 列塞进一屏宽（不用左右滚）。
   本页只有明细，全屏即整屏明细。Esc 退出。 */
.page-container.is-lr-full {
  position: fixed;
  inset: 0;
  z-index: 2600;
  margin: 0;
  padding: 0 8px 6px;
  border-radius: 0;
  min-height: 0;
  background: #fff;
  /* ⭐ 整页不滚：搜索条固定，只有明细区内部上下滚 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.is-lr-full .search-bar {
  flex: 0 0 auto;
  padding: 2px 8px;
  margin-bottom: 4px;
  background: #f7f9fc;
}
.is-lr-full .search-bar :deep(.el-form-item) { margin-bottom: 0; margin-right: 10px; }
.is-lr-full .search-bar :deep(.el-form-item__label) { font-size: 12px; padding-right: 6px; }
.is-lr-full .hint-bar { display: none; }

/* 明细：标题条收紧，说明文字省掉 */
.is-lr-full .detail-head {
  flex: 0 0 auto;
  padding: 0 2px 3px;
  margin-bottom: 2px;
  border-bottom: 0;
}
.is-lr-full .dt-title { font-size: 12.5px; }
.is-lr-full .dt-hint { display: none; }
.is-lr-full .dt-hint.right { display: inline; margin-left: auto; }

/* 明细区自己滚（双行表头带 rowspan，钉住会互相遮挡，所以不固定表头） */
.is-lr-full .detail-scroll {
  flex: 1 1 auto;
  min-height: 0;
  padding-bottom: 2px;
  overflow: auto;
}
.is-lr-full .excel-table {
  min-width: 0;
  width: 100%;
  font-size: 10px;
  line-height: 1.2;
}
.is-lr-full .excel-table th,
.is-lr-full .excel-table td { padding: 0 3px; }
.is-lr-full .excel-table thead th { font-weight: 500; }
/* 账单号列仍然固定左侧，但不必占 200px */
.is-lr-full .excel-table th.bill-col,
.is-lr-full .excel-table td.bill-cell {
  width: 122px;
  min-width: 122px;
}
.is-lr-full .bill-link { font-size: 10px; }
/* 组间红线细一点，省纵向空间 */
.is-lr-full .cost-row td { border-bottom: 2px solid #d64545; }

</style>
