<!-- src/views/process/zm-list.vue 执模单据列表 -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left"><h2>🔧 执模单据列表</h2><el-tag type="info">共 {{ total }} 条</el-tag></div>
      <div class="header-right">
        <el-button type="primary" @click="$router.push('/process/zm-input')"><el-icon><Plus /></el-icon> 录入</el-button>
        <el-button @click="loadData"><el-icon><Refresh /></el-icon> 刷新</el-button>
      </div>
    </div>

    <!-- 搜索 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="单据编号"><el-input v-model="searchForm.keyword" placeholder="单据编号" clearable style="width:150px;" @keyup.enter="loadData" /></el-form-item>
        <el-form-item label="工序类型">
          <el-select v-model="searchForm.processDictId" placeholder="全部" clearable style="width:130px;" @change="loadData">
            <el-option v-for="p in subProcesses" :key="p.id" :label="p.itemLabel" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="材质">
          <el-select v-model="searchForm.materialId" placeholder="全部" clearable style="width:110px;" @change="loadData">
            <el-option v-for="m in options.materials" :key="m.id" :label="m.itemLabel" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width:100px;" @change="loadData">
            <el-option label="未审核" :value="0" />
            <el-option label="已审核" :value="1" />
            <el-option label="异常" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期"><el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:240px;" @change="onDateChange" /></el-form-item>
        <el-form-item><el-button type="primary" @click="loadData">查询</el-button><el-button @click="resetSearch">重置</el-button></el-form-item>
      </el-form>
    </div>

    <div class="section-divider"></div>

    <div class="table-section">
      <el-table :data="tableData" border stripe v-loading="loading" @sort-change="onSort">
        <el-table-column prop="receiptNo" label="单据编号" width="170" />
        <el-table-column prop="businessDate" label="业务日期" width="110" align="center">
          <template #default="{ row }">{{ formatDate(row.businessDate) }}</template>
        </el-table-column>
        <el-table-column prop="subProcess" label="工序类型" width="110" align="center">
          <template #default="{ row }"><el-tag size="small">{{ row.subProcess }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="materialName" label="材质" width="90" align="center" />
        <el-table-column prop="sendWeightG" label="发出(g)" width="90" align="right">
          <template #default="{ row }">{{ row.sendWeightG?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="recycleWeightG" label="回收(g)" width="90" align="right">
          <template #default="{ row }">{{ row.recycleWeightG?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="actualLossG" label="实损耗(g)" width="95" align="right">
          <template #default="{ row }"><span :class="row.actualLossG > 0 ? 'loss-text' : ''">{{ row.actualLossG?.toFixed(3) }}</span></template>
        </el-table-column>
        <el-table-column prop="standardLossG" label="标准损耗(g)" width="100" align="right">
          <template #default="{ row }">{{ row.standardLossG?.toFixed(3) }}</template>
        </el-table-column>
        <el-table-column prop="shouldRecycleG" label="应回金(g)" width="100" align="right">
          <template #default="{ row }"><span class="recycle-text">{{ row.shouldRecycleG?.toFixed(3) }}</span></template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : row.status === 2 ? 'danger' : 'warning'" size="small">{{ row.statusText }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submitEmpName" label="录入人" width="90" align="center" />
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="$router.push(`/process/zm-detail/${row.id}`)">查看</el-button>
            <el-button v-if="row.status === 0" size="small" type="warning" link @click="openEdit(row)">编辑</el-button>
            <el-button v-if="isAdmin && row.status === 0" size="small" type="success" link @click="openAudit(row)">审核</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination v-model:current-page="pagination.current" v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next"
          @size-change="loadData" @current-change="loadData" />
      </div>
    </div>

    <!-- 审核弹窗 -->
    <el-dialog v-model="auditVisible" title="审核单据" width="420px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="单据编号">{{ auditRow?.receiptNo }}</el-form-item>
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditForm.approved">
            <el-radio :value="true">通过</el-radio>
            <el-radio :value="false">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="auditForm.auditNote" type="textarea" :rows="3" :placeholder="auditForm.approved ? '选填' : '驳回原因（必填）'" />
        </el-form-item>
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
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Refresh } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getProcessList, auditProcessReceipt, getProcessOptions } from '@/api/process';

const router = useRouter();
const userStore = useUserStore();
const isAdmin = computed(() => userStore.userType === 'admin');

const loading = ref(false);
const tableData = ref([]);
const total = ref(0);
const options = reactive({ materials: [], zmSubProcesses: [], pgSubProcesses: [] });
const subProcesses = computed(() => options.zmSubProcesses);
const dateRange = ref([]);
const searchForm = reactive({ keyword: '', processDictId: null, materialId: null, status: null, startDate: '', endDate: '' });
const pagination = reactive({ current: 1, pageSize: 20 });

const auditVisible = ref(false);
const auditRow = ref(null);
const auditForm = reactive({ approved: true, auditNote: '' });
const auditLoading = ref(false);

const formatDate = (d) => d ? d.slice(0, 10) : '-';
const onDateChange = (val) => { searchForm.startDate = val?.[0] || ''; searchForm.endDate = val?.[1] || ''; loadData(); };
const onSort = () => loadData();

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getProcessList({
      mainProcess: 'ZM',
      keyword: searchForm.keyword || undefined,
      processDictId: searchForm.processDictId || undefined,
      materialId: searchForm.materialId || undefined,
      status: searchForm.status ?? undefined,
      startDate: searchForm.startDate || undefined,
      endDate: searchForm.endDate || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize
    });
    tableData.value = res.data || [];
    total.value = res.total || 0;
  } catch { ElMessage.error('加载失败'); }
  finally { loading.value = false; }
};

const resetSearch = () => { Object.assign(searchForm, { keyword: '', processDictId: null, materialId: null, status: null, startDate: '', endDate: '' }); dateRange.value = []; pagination.current = 1; loadData(); };

const openEdit = (row) => router.push(`/process/zm-input?id=${row.id}`);

const openAudit = (row) => { auditRow.value = row; auditForm.approved = true; auditForm.auditNote = ''; auditVisible.value = true; };

const confirmAudit = async () => {
  if (!auditForm.approved && !auditForm.auditNote.trim()) { ElMessage.warning('驳回必须填写原因'); return; }
  auditLoading.value = true;
  try {
    await auditProcessReceipt({ id: auditRow.value.id, approved: auditForm.approved, auditNote: auditForm.auditNote });
    ElMessage.success(auditForm.approved ? '审核通过' : '已驳回');
    auditVisible.value = false;
    loadData();
  } catch (e) { ElMessage.error(e.message || '操作失败'); }
  finally { auditLoading.value = false; }
};

const loadOptions = async () => {
  try {
    const res = await getProcessOptions();
    options.materials = res.data?.materials || [];
    options.zmSubProcesses = res.data?.zmSubProcesses || [];
    options.pgSubProcesses = res.data?.pgSubProcesses || [];
  } catch {}
};

onMounted(() => { loadOptions(); loadData(); });
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
.recycle-text { color: #67C23A; font-weight: bold; }
</style>
