<!-- src/views/process/pg-list.vue 抛光单据列表 -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left"><h2>✨ 抛光单据列表</h2><el-tag type="info">共 {{ total }} 条</el-tag></div>
      <div class="header-right">
        <el-button v-if="!auditOnly" type="primary" @click="$router.push({ path: '/process/pg-input', query: { master: searchForm.masterName || undefined } })"><el-icon><Plus /></el-icon> 录入</el-button>
        <el-button @click="loadData"><el-icon><Refresh /></el-icon> 刷新</el-button>
      </div>
    </div>

    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="单据编号"><el-input v-model="searchForm.keyword" placeholder="单据编号" clearable style="width:150px;" @keyup.enter="loadData" /></el-form-item>
        <el-form-item label="师傅名称"><el-input v-model="searchForm.masterName" placeholder="师傅名称" clearable style="width:120px;" @keyup.enter="loadData" /></el-form-item>
        <el-form-item label="工序类型">
          <el-select v-model="searchForm.processDictId" placeholder="全部" clearable style="width:130px;" @change="loadData">
            <el-option v-for="p in subProcesses" :key="p.id" :label="p.subProcess" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="材质">
          <el-select v-model="searchForm.materialId" placeholder="全部" clearable style="width:110px;" @change="loadData">
            <el-option v-for="m in pgMaterials" :key="m.id" :label="m.itemLabel" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width:100px;" @change="loadData">
            <el-option label="未审核" :value="0" /><el-option label="已审核" :value="1" /><el-option label="异常" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期"><el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:240px;" @change="onDateChange" /></el-form-item>
        <el-form-item><el-button type="primary" @click="loadData">查询</el-button><el-button @click="resetSearch">重置</el-button></el-form-item>
      </el-form>
    </div>

    <div class="section-divider"></div>

    <!-- 🔥 有耗汇总：跨分页，按当前筛选条件（只统计「有耗」单），标准损耗按 95% 折算 -->
    <div class="loss-summary">
      <div class="ls-head">
        🔥 有耗汇总
        <span class="ls-sub">按当前筛选，共 {{ lossSummary.recordCount }} 张有耗单（不含无耗/布心）· 标准损耗按 95% 折算</span>
      </div>
      <div class="ls-items">
        <div class="ls-item">
          <span class="ls-label">发出</span>
          <b class="ls-val">{{ fmt2(lossSummary.sendWeightG) }}</b><span class="ls-unit">g</span>
        </div>
        <div class="ls-item" v-if="lossSummary.residueWaterG > 0">
          <span class="ls-label">水口</span>
          <b class="ls-val">{{ fmt2(lossSummary.residueWaterG) }}</b><span class="ls-unit">g</span>
        </div>
        <div class="ls-item">
          <span class="ls-label">回收</span>
          <b class="ls-val">{{ fmt2(lossSummary.recycleWeightG) }}</b><span class="ls-unit">g</span>
        </div>
        <div class="ls-item">
          <span class="ls-label">实损耗</span>
          <b class="ls-val loss">{{ fmt3(lossSummary.actualLossG) }}</b><span class="ls-unit">g</span>
        </div>
        <div class="ls-item">
          <span class="ls-label">标准损耗 ×95%</span>
          <b class="ls-val">{{ fmt3(lossSummary.standardLossG) }}</b><span class="ls-unit">g</span>
        </div>
        <div class="ls-item" :class="{ over: lossSummary.overLossG > 0 }">
          <span class="ls-label">超耗</span>
          <b class="ls-val">{{ fmt3(lossSummary.overLossG) }}</b><span class="ls-unit">g</span>
        </div>
        <div class="ls-item" :class="{ over: lossSummary.overCount > 0 }">
          <span class="ls-label">超标单数</span>
          <b class="ls-val">{{ lossSummary.overCount }}</b><span class="ls-unit">单</span>
        </div>
      </div>
      <div class="ls-hint" v-if="lossSummary.overCount > 0">
        ⚠️ 有 {{ lossSummary.overCount }} 张单实损耗超过标准损耗，合计超 {{ fmt3(lossSummary.overLossG) }} g，表格里已标红
      </div>
    </div>

    <div class="table-section">
      <el-table :data="tableData" border stripe v-loading="loading" :row-class-name="rowClassName">
        <el-table-column prop="receiptNo" label="单据编号" width="170" />
        <el-table-column prop="businessDate" label="业务日期" width="110" align="center">
          <template #default="{ row }">{{ formatDate(row.businessDate) }}</template>
        </el-table-column>
        <el-table-column prop="subProcess" label="工序类型" width="120" align="center">
          <template #default="{ row }"><el-tag :type="row.subProcess === '布心抛光' ? 'warning' : 'primary'" size="small">{{ row.subProcess }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="materialName" label="材质" width="90" align="center" />
        <el-table-column prop="sendWeightG" label="发出(g)" width="90" align="right"><template #default="{ row }">{{ row.sendWeightG?.toFixed(2) }}</template></el-table-column>
        <el-table-column prop="recycleWeightG" label="回收(g)" width="90" align="right"><template #default="{ row }">{{ row.recycleWeightG?.toFixed(2) }}</template></el-table-column>
        <el-table-column prop="actualLossG" label="实损耗(g)" width="95" align="right">
          <template #default="{ row }">
            <span :class="isOverLoss(row) ? 'over-loss-text' : (row.actualLossG > 0 ? 'loss-text' : '')">
              {{ row.actualLossG?.toFixed(3) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="standardLossG" label="标准损耗×95%" width="100" align="right"><template #default="{ row }">{{ row.standardLossG?.toFixed(3) }}</template></el-table-column>
        <el-table-column label="超耗(g)" width="85" align="right">
          <template #default="{ row }">
            <span v-if="row.overLossG > 0" class="over-loss-text">+{{ Number(row.overLossG).toFixed(3) }}</span>
            <span v-else class="ok-text">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="shouldRecycleG" label="应回金(g)" width="100" align="right">
          <template #default="{ row }"><span class="recycle-text">{{ row.shouldRecycleG?.toFixed(3) }}</span></template>
        </el-table-column>
        <el-table-column label="未回金(g)" width="100" align="right">
          <template #default="{ row }">
            <span :class="unreturned(row) > 0 ? 'unreturned-text' : 'recycle-text'">{{ unreturned(row).toFixed(3) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : row.status === 2 ? 'danger' : 'warning'" size="small">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="masterName" label="师傅" width="100" align="center" />
        <el-table-column prop="productName" label="产品名称" width="120" align="center" />
        <el-table-column prop="content" label="内容" width="140" align="center" />
        <el-table-column prop="submitEmpName" label="经办人" width="90" align="center" />
        <el-table-column prop="auditEmpName" label="审核人" width="90" align="center" />
        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="$router.push(`/process/pg-detail/${row.id}`)">查看</el-button>
            <el-button v-if="row.status === 0 && !auditOnly" size="small" type="warning" link @click="openEdit(row)">编辑</el-button>
            <el-button v-if="(isAdmin || isAuditUser) && row.status === 0" size="small" type="success" link @click="openAudit(row)">审核</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination v-model:current-page="pagination.current" v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next"
          @size-change="loadData" @current-change="loadData" />
      </div>
    </div>

    <el-dialog v-model="auditVisible" title="审核单据" width="420px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="单据编号">{{ auditRow?.receiptNo }}</el-form-item>
        <el-form-item label="审核结果"><el-radio-group v-model="auditForm.approved"><el-radio :value="true">通过</el-radio><el-radio :value="false">驳回</el-radio></el-radio-group></el-form-item>
        <el-form-item label="备注"><el-input v-model="auditForm.auditNote" type="textarea" :rows="3" :placeholder="auditForm.approved ? '选填' : '驳回原因（必填）'" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAudit" :loading="auditLoading">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Refresh } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getProcessList, auditProcessReceipt, getProcessOptions } from '@/api/process';
import { shortcutRange } from '@/utils/date';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const isAdmin = computed(() => userStore.userType === 'admin');
// ⭐ 审核只读模式（审核工作台跳转带 mode=audit）：隐藏录入/编辑，保留审核
const auditOnly = computed(() => route.query.mode === 'audit');
const isAuditUser = computed(() => ['factoryaudit', 'admin'].includes(String(userStore.userType || '').toLowerCase()));
const loading = ref(false);
const tableData = ref([]);
const total = ref(0);
// 有耗汇总（后端按当前筛选跨分页算好，只统计有耗单，标准损耗已按 95% 折算）
const lossSummary = reactive({
  recordCount: 0, sendWeightG: 0, residueWaterG: 0, recycleWeightG: 0,
  actualLossG: 0, standardLossG: 0, overCount: 0, overLossG: 0
});
const fmt2 = (v) => (Number(v) || 0).toFixed(2);
const fmt3 = (v) => (Number(v) || 0).toFixed(3);
// 超耗行整行淡红底
const rowClassName = ({ row }) => (row.overLossG > 0 ? 'over-row' : '');
const options = reactive({ materials: [], zmSubProcesses: [], pgSubProcesses: [] });
const subProcesses = computed(() => options.pgSubProcesses);
const pgMaterials = computed(() => options.materials.filter(m => !m.itemValue?.includes('PT')));
// ⭐ 日期默认本月（1 号 ~ 今天）；审核工作台进来（mode=audit）默认不限，避免往期待审被藏掉
const defaultRange = () => (route.query.mode === 'audit' ? [] : shortcutRange('month'));
const dateRange = ref(defaultRange());
const searchForm = reactive({
  keyword: '', masterName: '', processDictId: null, materialId: null, status: null,
  startDate: dateRange.value[0] || '', endDate: dateRange.value[1] || ''
});
const pagination = reactive({ current: 1, pageSize: 20 });
const auditVisible = ref(false);
const auditRow = ref(null);
const auditForm = reactive({ approved: true, auditNote: '' });
const auditLoading = ref(false);

const formatDate = (d) => d ? d.slice(0, 10) : '-';
const onDateChange = (val) => { searchForm.startDate = val?.[0] || ''; searchForm.endDate = val?.[1] || ''; loadData(); };

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getProcessList({ mainProcess: 'PG', keyword: searchForm.keyword || undefined, masterName: searchForm.masterName || undefined, processDictId: searchForm.processDictId || undefined, materialId: searchForm.materialId || undefined, status: searchForm.status ?? undefined, startDate: searchForm.startDate || undefined, endDate: searchForm.endDate || undefined, page: pagination.current, pageSize: pagination.pageSize });
    tableData.value = res.data || [];
    total.value = res.total || 0;
    Object.assign(lossSummary, res.lossSummary || {});
  } catch { ElMessage.error('加载失败'); } finally { loading.value = false; }
};
// 重置回「本月」，不是回到不限日期
const resetSearch = () => {
  const r = defaultRange();
  Object.assign(searchForm, { keyword: '', masterName: '', processDictId: null, materialId: null, status: null, startDate: r[0] || '', endDate: r[1] || '' });
  dateRange.value = [...r];
  pagination.current = 1;
  loadData();
};
const openEdit = (row) => router.push(`/process/pg-input?id=${row.id}`);
const openAudit = (row) => { auditRow.value = row; auditForm.approved = true; auditForm.auditNote = ''; auditVisible.value = true; };
const confirmAudit = async () => {
  if (!auditForm.approved && !auditForm.auditNote.trim()) { ElMessage.warning('驳回必须填写原因'); return; }
  auditLoading.value = true;
  try { await auditProcessReceipt({ id: auditRow.value.id, approved: auditForm.approved, auditNote: auditForm.auditNote }); ElMessage.success(auditForm.approved ? '审核通过' : '已驳回'); auditVisible.value = false; loadData(); }
  catch (e) { ElMessage.error(e.message || '操作失败'); } finally { auditLoading.value = false; }
};
const loadOptions = async () => { try { const res = await getProcessOptions(); options.materials = res.data?.materials || []; options.zmSubProcesses = res.data?.zmSubProcesses || []; options.pgSubProcesses = res.data?.pgSubProcesses || []; } catch {} };
onMounted(() => { loadOptions(); loadData(); });

// 超耗：后端已按「标准损耗 ×95%」算好超耗量，> 0 即超标
const isOverLoss = (row) => Number(row?.overLossG || 0) > 0;

// 未回金 = 应回金 − 实际回金（正数=师傅还欠，负数=多交了）
const unreturned = (row) => {
  const v = Number(row?.shouldRecycleG || 0) - Number(row?.actualRecycleG || 0);
  return Math.round(v * 1000) / 1000;
};
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0; flex-wrap: wrap; gap: 10px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; }
.search-bar { background: #fff; padding: 16px 20px 0; }
.search-bar :deep(.el-form-item) { margin-bottom: 12px; }
.section-divider { height: 1px; background: #e8ecf1; }
.table-section { background: #fff; padding: 16px 20px; border-radius: 0 0 8px 8px; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
.loss-text { color: #E6A23C; }
.over-loss-text { color: #cf1322; font-weight: 700; }
.ok-text { color: #c0c4cc; }
:deep(.over-row) { background: #fff1f0 !important; }
:deep(.over-row:hover > td) { background: #ffe7e5 !important; }

/* ===== 有耗汇总条 ===== */
.loss-summary { background: #fff; padding: 14px 20px; }
.ls-head { font-size: 14px; font-weight: 700; color: #c2410c; display: flex; align-items: center; gap: 10px; }
.ls-sub { font-size: 12px; font-weight: 400; color: #909399; }
.ls-items { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
.ls-item {
  flex: 1 1 130px; min-width: 120px; padding: 8px 12px; border-radius: 10px;
  background: #f8fbff; border: 1px solid #e2ecfa;
}
.ls-item.over { background: #fff1f0; border-color: #ffc9c4; }
.ls-label { display: block; font-size: 12px; color: #909399; }
.ls-val { font-size: 19px; font-weight: 800; color: #303133; }
.ls-val.loss { color: #E6A23C; }
.ls-item.over .ls-val { color: #cf1322; }
.ls-unit { font-size: 11px; color: #a8abb2; margin-left: 2px; }
.ls-hint { margin-top: 10px; font-size: 12px; color: #cf1322; background: #fff1f0; border: 1px dashed #ffb3ad; border-radius: 6px; padding: 6px 12px; }
.recycle-text { color: #67C23A; font-weight: bold; }
.unreturned-text { color: #d4380d; font-weight: 600; }
</style>
