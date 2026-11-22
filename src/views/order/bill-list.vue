<!-- src/views/order/bill-list.vue
     ⭐ 账单状态（原「账单列表」，替代更早的「生成账单」入口）
     - 账单由「制作完成审核通过」自动生成，不再手动选择订单建单
     - 列表支持：状态筛选 / 日期 / 关键词 / 分页
     - 操作：查看、编辑（待提交/已退回）、提交审核（待提交）
-->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <h2>📄 账单状态</h2>
        <span class="sub-tip">制作完成审核通过后自动生成</span>
      </div>
      <div class="header-right">
        <el-radio-group v-model="statusFilter" size="default" @change="onFilterChange">
          <el-radio-button
            v-for="s in STATUS_FILTERS"
            :key="s.value"
            :value="s.value"
          >
            {{ s.label }}
            <!-- ⭐ 红圈数量：当前日期 / 关键词范围内的全量，不随选中状态变化 -->
            <span v-if="countOf(s.value) > 0" class="status-count">{{ countOf(s.value) }}</span>
          </el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width:250px;"
          @change="onFilterChange"
        />
        <el-input
          v-model="keyword"
          placeholder="账单号 / 客户"
          clearable
          style="width:180px;"
          @clear="onFilterChange"
          @keyup.enter="onFilterChange"
        />
        <el-button type="primary" @click="onFilterChange">查询</el-button>
        <el-button @click="loadData">刷新</el-button>
      </div>
    </div>

    <!-- 汇总（各状态张数已挪到上方状态按钮的红圈里） -->
    <div class="summary-bar">
      <span>共 <b>{{ total }}</b> 张账单</span>
      <span>本页应收 <b class="money">¥{{ pageAmount.toFixed(2) }}</b></span>
    </div>

    <el-table :data="rows" border stripe size="default" empty-text="暂无账单"
      :scrollbar-always-on="true"
    >
      <el-table-column prop="billNo" label="账单号" width="160" fixed align="center">
        <template #default="{ row }">
          <span class="mono link" @click="goDetail(row)">{{ row.billNo }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="客户" min-width="150" show-overflow-tooltip align="center" />
      <el-table-column prop="operatorName" label="业务员" width="110" align="center">
        <template #default="{ row }">{{ row.operatorName || '—' }}</template>
      </el-table-column>
      <el-table-column label="账单日期" width="110" align="center">
        <template #default="{ row }">{{ fmtDate(row.billDate) }}</template>
      </el-table-column>
      <el-table-column prop="orderCount" label="明细数" width="80" align="center" />
      <el-table-column label="应收金额" width="130" align="center">
        <template #default="{ row }">
          <span class="money">¥{{ num(row.totalAmount).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="收款" width="110" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="receiptTag(row.receiptStatus)" effect="plain">
            {{ receiptText(row.receiptStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="账单状态" width="100" align="center">
        <template #default="{ row }">
          <el-tooltip v-if="row.status === 'billRejected' && row.auditRemark"
            :content="'驳回原因：' + row.auditRemark" placement="top">
            <el-tag size="small" :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
          </el-tooltip>
          <el-tag v-else size="small" :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="goDetail(row)">查看</el-button>
          <el-button
            v-if="canEdit(row)"
            type="primary"
            link
            size="small"
            @click="goEdit(row)"
          >编辑</el-button>
          <el-button
            v-if="row.status === 'pending' || row.status === 'billRejected'"
            type="success"
            link
            size="small"
            :loading="submittingId === row.billId"
            @click="submitAudit(row)"
          >{{ row.status === 'billRejected' ? '重新提交' : '提交审核' }}</el-button>
          <el-button
            v-if="row.status === 'returnRequested'"
            type="danger"
            link
            size="small"
            @click="goDetail(row)"
          >处理退回</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="loadData"
        @size-change="onFilterChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getBillList, submitBillAudit } from '@/api/bill';

const router = useRouter();

const rows = ref([]);
const loading = ref(false);
const statusFilter = ref('');

// 默认今天（账单列表默认只看当天账单）
const getTodayRange = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return [today, today];
};

const dateRange = ref(getTodayRange());
const keyword = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const submittingId = ref(null);

const num = (v) => Number(v || 0);
const fmtDate = (v) => (v ? String(v).slice(0, 10) : '-');

const STATUS_TEXT = {
  pending: '待提交',
  billPending: '待审核',
  billRejected: '审核驳回',
  billConfirmed: '待客户审核',
  customerApproved: '待业务确认',
  confirmed: '已确认',
  completed: '已完成',
  returned: '已退回',
  returnRequested: '客户退回待处理',
  returnPending: '退回待审核',
  rejected: '已驳回',
};
const statusText = (s) => STATUS_TEXT[s] || s || '-';
const statusTag = (s) => ({
  pending: 'info',
  billPending: 'warning',
  billRejected: 'danger',
  billConfirmed: 'warning',
  customerApproved: 'primary',
  confirmed: 'success',
  completed: 'success',
  returned: 'danger',
  returnRequested: 'danger',
  returnPending: 'warning',
  rejected: 'danger',
}[s] || 'info');

const receiptText = (s) => ({
  none: '未收款', pending: '收款待审', approved: '已收款', rejected: '收款驳回',
}[s] || '未收款');
const receiptTag = (s) => ({
  none: 'info', pending: 'warning', approved: 'success', rejected: 'danger',
}[s] || 'info');

// 待提交 / 审核驳回 / 已退回 才可编辑
const canEdit = (row) => ['pending', 'billRejected', 'returned'].includes(row.status);

const pageAmount = computed(() => rows.value.reduce((s, r) => s + num(r.totalAmount), 0));

// ⭐ 状态筛选按钮（顺序即展示顺序）
const STATUS_FILTERS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待提交' },
  { value: 'billPending', label: '待审核' },
  { value: 'billRejected', label: '审核驳回' },
  { value: 'billConfirmed', label: '待客户审核' },
  { value: 'customerApproved', label: '待业务确认' },
  { value: 'returned', label: '已退回' },
  { value: 'returnRequested', label: '客户退回待处理' },
  { value: 'returnPending', label: '退回待审核' },
];

// 各状态数量：后端按「当前日期 / 关键词 / 权限」全量统计，不随选中状态变化
const statusCounts = ref({});
const allCount = computed(() =>
  Object.values(statusCounts.value).reduce((s, v) => s + Number(v || 0), 0));
const countOf = (v) => (v ? Number(statusCounts.value[v] || 0) : allCount.value);

const onFilterChange = () => {
  page.value = 1;
  loadData();
};

const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      exactStatus: true,
    };
    if (statusFilter.value) params.status = statusFilter.value;
    if (keyword.value) params.keyword = keyword.value;
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const res = await getBillList(params);
    rows.value = res?.data || [];
    total.value = res?.total || 0;
    statusCounts.value = res?.statusCounts || {};
  } catch (e) {
    console.error('加载账单列表失败:', e);
    ElMessage.error(e?.response?.data?.message || '加载账单列表失败');
  } finally {
    loading.value = false;
  }
};

const goDetail = (row) => router.push(`/order/bill/detail/${row.billId}`);
const goEdit = (row) => router.push(`/order/bill/edit/${row.billId}`);

const submitAudit = async (row) => {
  try {
    await ElMessageBox.confirm(
      `账单 ${row.billNo}（¥${num(row.totalAmount).toFixed(2)}）提交后进入审核，期间不可编辑。确认提交？`,
      '提交审核',
      { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '取消' }
    );
  } catch { return; }

  submittingId.value = row.billId;
  try {
    const res = await submitBillAudit(row.billId);
    if (res.success) {
      ElMessage.success('已提交审核');
      await loadData();
    } else {
      ElMessage.error(res.message || '提交失败');
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e.message || '提交失败');
  } finally {
    submittingId.value = null;
  }
};

onMounted(loadData);
</script>

<style scoped>
.page-container { padding: 16px; }
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 10px; margin-bottom: 12px;
}
.header-left { display: flex; align-items: baseline; gap: 10px; }
.header-left h2 { margin: 0; font-size: 18px; color: #303133; }
.sub-tip { font-size: 12px; color: #909399; }
.header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.summary-bar {
  display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
  background: #f7f9fc; border: 1px solid #ebeef5; border-radius: 8px;
  padding: 10px 14px; margin-bottom: 12px; font-size: 13px; color: #606266;
}
.summary-bar b { color: #303133; font-family: Consolas, Monaco, monospace; }
.summary-bar .money { color: #c0392b; }

/* ⭐ 状态按钮上的红圈数量 */
.status-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  margin-left: 5px;
  border-radius: 9px;
  background: #f56c6c;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  font-family: Consolas, Monaco, monospace;
  vertical-align: middle;
}

.mono { font-family: Consolas, Monaco, monospace; }
.link { color: #409eff; cursor: pointer; }
.link:hover { text-decoration: underline; }
.money { color: #c0392b; font-family: Consolas, Monaco, monospace; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
