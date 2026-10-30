<!-- src/views/system/operation-log.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📜 操作日志</h2>
      <div class="header-actions">
        <el-button @click="handleExport" :disabled="!tableData.length">导出</el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="表单">
          <el-select v-model="filter.sourceType" placeholder="全部" clearable style="width:140px;" @change="reload">
            <el-option v-for="o in options.sourceTypes" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作">
          <el-select v-model="filter.action" placeholder="全部" clearable style="width:130px;" @change="reload">
            <el-option v-for="o in options.actions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filter.keyword" placeholder="单号 / 内容" clearable style="width:180px;"
            @clear="reload" @keyup.enter="reload" />
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="filter.operatorName" placeholder="姓名" clearable style="width:120px;"
            @clear="reload" @keyup.enter="reload" />
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker v-model="filter.dateRange" type="daterange" value-format="YYYY-MM-DD"
            start-placeholder="开始" end-placeholder="结束" style="width:240px;" @change="reload" />
        </el-form-item>
        <el-form-item>
          <el-button @click="quickRange('today')">今天</el-button>
          <el-button @click="quickRange('week')">近 7 天</el-button>
          <el-button @click="quickRange('month')">本月</el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="reload">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 列表 -->
    <el-table :data="tableData" border stripe size="small" v-loading="loading" row-key="id">
      <el-table-column prop="createdAt" label="时间" width="150" align="center">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column prop="sourceTypeName" label="表单" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="sourceTagType(row.sourceType)" effect="light">{{ row.sourceTypeName }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sourceNo" label="单号" width="170" show-overflow-tooltip>
        <template #default="{ row }">{{ row.sourceNo || '-' }}</template>
      </el-table-column>
      <el-table-column prop="actionName" label="操作" width="100" align="center">
        <template #default="{ row }">
          <span :class="'act act-' + row.action">{{ row.actionName || row.action }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="summary" label="内容" min-width="380" show-overflow-tooltip>
        <template #default="{ row }">{{ row.summary || '-' }}</template>
      </el-table-column>
      <el-table-column prop="operatorName" label="操作人" width="100" align="center">
        <template #default="{ row }">{{ row.operatorName || '-' }}</template>
      </el-table-column>
      <el-table-column prop="operatorRole" label="角色" width="110" align="center">
        <template #default="{ row }">
          <span class="role-text">{{ roleText(row.operatorRole) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="明细" width="80" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadData"
        @size-change="reload"
      />
    </div>

    <!-- 明细抽屉 -->
    <el-drawer v-model="detailVisible" title="操作明细" size="520px">
      <div v-if="current" class="detail-head">
        <div class="dh-row"><span>表单</span><b>{{ current.sourceTypeName }}</b></div>
        <div class="dh-row"><span>单号</span><b>{{ current.sourceNo || '-' }}</b></div>
        <div class="dh-row"><span>操作</span><b>{{ current.actionName }}</b></div>
        <div class="dh-row"><span>操作人</span><b>{{ current.operatorName || '-' }}（{{ roleText(current.operatorRole) }}）</b></div>
        <div class="dh-row"><span>时间</span><b>{{ formatDateTime(current.createdAt) }}</b></div>
        <div class="dh-row dh-summary"><span>内容</span><b>{{ current.summary || '-' }}</b></div>
      </div>

      <el-table v-if="changeRows.length" :data="changeRows" border size="small" style="margin-top:12px;">
        <el-table-column prop="label" label="字段" width="130" />
        <el-table-column prop="oldText" label="原值" min-width="120" />
        <el-table-column prop="newText" label="新值" min-width="120" />
      </el-table>
      <el-empty v-else description="本次操作没有字段级差异" :image-size="70" />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import * as XLSX from 'xlsx';
import { getOperationLogs, getOperationLogOptions } from '@/api/log';

const loading = ref(false);
const tableData = ref([]);
const options = reactive({ sourceTypes: [], actions: [] });

const filter = reactive({
  sourceType: '',
  action: '',
  keyword: '',
  operatorName: '',
  dateRange: [],
});

const pagination = reactive({ current: 1, pageSize: 20, total: 0 });

const detailVisible = ref(false);
const current = ref(null);

// 字段中文名（后端 summary 已是中文，这里用于明细表格兜底）
const FIELD_LABELS = {
  salesman: '业务员', orderDate: '订单日期', productName: '品名', quantity: '数量', color: '成色',
  gemColor: '颜色', purityId: '成色ID', diamondLevel: '钻石级别', params: '参数', amount: '金额',
  size: '手寸', widthThick: '宽/厚度', weightRequirement: '克重要求', logoText: 'LOGO文字',
  deliveryDays: '工期', urgentFlag: '加急', warnFlag: '预警', url: '网址', remark: '备注',
  imageUrl: '产品图片', dataImageUrl: '数据图', letterImageUrl: '字印要求图', logoUrl: 'LOGO图片',
  totalAmount: '总金额', totalWeight: '总重', netWeight: '净重', lossRate: '损耗率', addLossWeight: '加耗重',
  goldPrice: '金价', goldMaterialFee: '足金料金额', goldMaterialWeight: '足金料克重',
  packingFee: '包装费', certificateFee: '证书费', postageFee: '邮费', moldFee: '版费', laborFee: '工费',
  mainStoneAmount: '主石金额', subStoneAmount: '副石金额', costPrice: '内部成本',
  mainStoneQty: '主石粒数', mainStoneWeight: '主石重量', mainStonePrice: '主石单价',
  subStoneQty: '副石粒数', subStoneWeight: '副石重量', subStonePrice: '副石单价',
  mainStoneSettingFee: '主石镶石工费', subStoneSettingFee: '副石镶石工费',
  totalSale: '销售总额', totalCost: '成本总额', profit: '毛利',
  currentMoney: '应收款', receivedMoney: '来款金额', receivedMaterial: '来料量',
  totalDebtMoney: '累欠款', totalDebtMaterial: '累欠足料',
};

const changeRows = computed(() => {
  const raw = current.value?.changes;
  if (!raw) return [];
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return []; }
  }
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj).map(k => {
    const v = obj[k] || {};
    // 兼容 JSON 里 Old/New（PascalCase）和 old/new 两种写法
    return {
      field: k,
      label: FIELD_LABELS[k] || k,
      oldText: fmtVal(v.Old !== undefined ? v.Old : v.old),
      newText: fmtVal(v.New !== undefined ? v.New : v.new),
    };
  });
});

const fmtVal = (v) => {
  if (v === null || v === undefined || v === '') return '空';
  if (typeof v === 'boolean') return v ? '是' : '否';
  return String(v);
};

const ROLE_TEXT = {
  admin: '管理员', factoryorder: '工厂操作员', factoryaudit: '工厂审核员',
  factoryuser: '工厂用户', customer: '客户', supplier: '供应商',
};
const roleText = (r) => ROLE_TEXT[String(r || '').toLowerCase()] || r || '-';

const sourceTagType = (t) => ({
  order: 'primary', bill: 'success', lr: 'warning',
  inout_gold: 'info', inout_diamond: '', inout_expense: 'danger',
}[t] || 'info');

const formatDateTime = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
};

const loadOptions = async () => {
  try {
    const res = await getOperationLogOptions();
    options.sourceTypes = res?.data?.sourceTypes || [];
    options.actions = res?.data?.actions || [];
  } catch { /* 忽略 */ }
};

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getOperationLogs({
      sourceType: filter.sourceType || undefined,
      action: filter.action || undefined,
      keyword: filter.keyword || undefined,
      operatorName: filter.operatorName || undefined,
      startDate: filter.dateRange?.[0] || undefined,
      endDate: filter.dateRange?.[1] || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    });
    tableData.value = res?.data || [];
    pagination.total = res?.total || 0;
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const reload = () => { pagination.current = 1; loadData(); };

const quickRange = (type) => {
  const now = new Date();
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (type === 'today') filter.dateRange = [fmt(now), fmt(now)];
  else if (type === 'week') {
    const s = new Date(now); s.setDate(s.getDate() - 6);
    filter.dateRange = [fmt(s), fmt(now)];
  } else {
    filter.dateRange = [fmt(new Date(now.getFullYear(), now.getMonth(), 1)), fmt(now)];
  }
  reload();
};

const resetFilter = () => {
  filter.sourceType = '';
  filter.action = '';
  filter.keyword = '';
  filter.operatorName = '';
  filter.dateRange = [];
  reload();
};

const openDetail = (row) => { current.value = row; detailVisible.value = true; };

const handleExport = () => {
  if (!tableData.value.length) { ElMessage.warning('当前没有可导出的数据'); return; }
  const head = ['时间', '表单', '单号', '操作', '内容', '操作人', '角色'];
  const body = tableData.value.map(r => [
    formatDateTime(r.createdAt), r.sourceTypeName, r.sourceNo, r.actionName,
    r.summary, r.operatorName, roleText(r.operatorRole),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
  ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 80 }, { wch: 10 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '操作日志');
  XLSX.writeFile(wb, `操作日志_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

onMounted(() => { loadOptions(); loadData(); });
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.header-actions { display: flex; gap: 8px; }
.search-bar { background: #f5f7fa; padding: 16px 20px; border-radius: 6px; margin-bottom: 16px; }
.search-bar :deep(.el-form-item) { margin-bottom: 8px; }
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }

.act { font-weight: 600; }
.act-create { color: #409EFF; }
.act-update { color: #E6A23C; }
.act-submit { color: #409EFF; }
.act-audit_pass { color: #1f9254; }
.act-audit_reject { color: #d64545; }
.act-delete { color: #d64545; }
.act-generate { color: #7b61ff; }
.role-text { color: #909399; font-size: 12px; }

.detail-head { background: #f7f9fc; border-radius: 6px; padding: 12px 14px; }
.dh-row { display: flex; gap: 12px; padding: 4px 0; font-size: 13px; }
.dh-row > span { width: 64px; color: #909399; flex: 0 0 64px; }
.dh-row > b { color: #303133; font-weight: 600; }
.dh-summary > b { font-weight: 500; line-height: 1.6; word-break: break-all; }
</style>
