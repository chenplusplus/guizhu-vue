<!-- src/views/order/receipt-in-audit.vue
     ⭐ 来款审核（工厂审核员）
     - 只审核「来款 / 退款」登记单：核对账号、金额、日期、流水号
     - 通过后这笔钱才计入该客户的可用余额，账单「抵扣」才能用
     - 驳回必须填原因，操作员改完会重新提交
-->
<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="left">
            <span class="title">💰 来款审核</span>
            <el-tag size="small" type="warning" effect="plain">待审核 {{ pendingCount }}</el-tag>
          </div>
          <div class="right">
            <el-radio-group v-model="statusFilter" size="small" @change="reload">
              <el-radio-button value="pending">待审核</el-radio-button>
              <el-radio-button value="approved">已通过</el-radio-button>
              <el-radio-button value="rejected">已驳回</el-radio-button>
              <el-radio-button value="all">全部</el-radio-button>
            </el-radio-group>
            <el-input v-model="keyword" size="small" clearable placeholder="单号 / 客户 / 账号"
              style="width:190px;" @keyup.enter="reload" @clear="reload" />
            <el-button size="small" @click="reload">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="rows" border size="small" v-loading="loading"
        empty-text="暂无待审核来款" :scrollbar-always-on="true">
        <el-table-column prop="receiptNo" label="单号" width="140" fixed align="center">
          <template #default="{ row }"><span class="mono">{{ row.receiptNo }}</span></template>
        </el-table-column>
        <el-table-column label="类型" width="70" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.direction === 'out' ? 'warning' : 'success'" effect="plain">
              {{ row.direction === 'out' ? '退款' : '来款' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户" min-width="130" show-overflow-tooltip align="center" />
        <el-table-column prop="accountLabel" label="收款账号" width="130" show-overflow-tooltip align="center" />
        <el-table-column label="金额" width="120" align="center">
          <template #default="{ row }">
            <b :class="row.direction === 'out' ? 'out' : 'in'">¥{{ num(row.amount).toFixed(2) }}</b>
          </template>
        </el-table-column>
        <el-table-column label="日期" width="105" align="center">
          <template #default="{ row }">{{ fmtDate(row.receiptDate) }}</template>
        </el-table-column>
        <el-table-column prop="payerName" label="打款人" width="110" show-overflow-tooltip align="center" />
        <el-table-column prop="payMethod" label="方式" width="95" align="center" />
        <el-table-column prop="bankSerial" label="流水号/回单" width="130" show-overflow-tooltip align="center" />
        <el-table-column prop="remark" label="备注" min-width="130" show-overflow-tooltip align="center" />
        <el-table-column label="客户当前余额" width="125" align="center">
          <template #default="{ row }">
            <span class="balance">¥{{ money(balanceOf(row.customerId)) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交人" width="95" align="center">
          <template #default="{ row }">{{ row.submittedByName || '-' }}</template>
        </el-table-column>
        <el-table-column label="提交时间" width="130" align="center">
          <template #default="{ row }">{{ fmtTime(row.submittedAt) }}</template>
        </el-table-column>
        <el-table-column label="审核人" width="95" align="center">
          <template #default="{ row }">{{ row.auditedByName || '-' }}</template>
        </el-table-column>
        <el-table-column label="审核意见" min-width="120" show-overflow-tooltip align="center">
          <template #default="{ row }">
            <span :class="{ warn: row.status === 'rejected' }">{{ row.auditRemark || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button type="success" link size="small" @click="openAudit(row, true)">通过</el-button>
              <el-button type="danger" link size="small" @click="openAudit(row, false)">驳回</el-button>
            </template>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total"
          layout="prev, pager, next, total" background @current-change="loadList" />
      </div>
    </el-card>

    <el-dialog v-model="auditVisible" :title="auditApproved ? '来款审核通过' : '来款驳回'" width="460px">
      <div class="audit-body">
        <div class="audit-line">
          <b>{{ auditRow?.receiptNo }}</b>　客户 <b>{{ auditRow?.customerName }}</b>
        </div>
        <div class="audit-line">
          账号 <b>{{ auditRow?.accountLabel }}</b>　
          {{ auditRow?.direction === 'out' ? '退款' : '来款' }}
          <b class="in">¥{{ num(auditRow?.amount).toFixed(2) }}</b>　
          日期 <b>{{ fmtDate(auditRow?.receiptDate) }}</b>
        </div>
        <div v-if="auditApproved" class="audit-tip">
          通过后这笔钱计入客户可用余额：
          审核前 ¥{{ money(auditRow ? balanceOf(auditRow.customerId) : 0) }} →
          审核后
          ¥{{ money(auditRow ? balanceOf(auditRow.customerId) + (auditRow.direction === 'out' ? -1 : 1) * num(auditRow.amount) : 0) }}
        </div>
        <el-input v-model="auditRemark" type="textarea" :rows="3" maxlength="200" show-word-limit
          :placeholder="auditApproved ? '审核意见（选填）' : '请填写驳回原因'" />
      </div>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button :type="auditApproved ? 'success' : 'danger'" :loading="auditing" @click="doAudit">
          {{ auditApproved ? '确认通过' : '确认驳回' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getReceiptInList, auditReceiptIn } from '@/api/customerReceipt';

const rows = ref([]);
const balances = ref({});
const loading = ref(false);
const statusFilter = ref('pending');
const keyword = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const pendingCount = ref(0);

const auditVisible = ref(false);
const auditApproved = ref(true);
const auditRemark = ref('');
const auditing = ref(false);
const auditRow = ref(null);

const num = (v) => Number(v || 0);
const money = (v) => num(v).toFixed(2);
const fmtDate = (v) => (v ? String(v).slice(0, 10) : '-');
const fmtTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 16) : '-');
const statusText = (s) => ({ pending: '待审核', approved: '已通过', rejected: '已驳回' }[s] || s || '-');
const statusTag = (s) => ({ pending: 'warning', approved: 'success', rejected: 'danger' }[s] || 'info');
const balanceOf = (customerId) => num(balances.value?.[customerId]);

const loadList = async () => {
  loading.value = true;
  try {
    const res = await getReceiptInList({
      status: statusFilter.value,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    rows.value = res?.data || [];
    total.value = res?.total || 0;
    balances.value = res?.balances || {};
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '加载来款列表失败');
  } finally {
    loading.value = false;
  }
};

const loadPendingCount = async () => {
  try {
    const res = await getReceiptInList({ status: 'pending', page: 1, pageSize: 1 });
    pendingCount.value = res?.total || 0;
  } catch { pendingCount.value = 0; }
};

const reload = () => { page.value = 1; loadList(); loadPendingCount(); };

const openAudit = (row, approved) => {
  auditRow.value = row;
  auditApproved.value = approved;
  auditRemark.value = '';
  auditVisible.value = true;
};

const doAudit = async () => {
  if (!auditApproved.value && !auditRemark.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  auditing.value = true;
  try {
    const res = await auditReceiptIn(auditRow.value.id, {
      approved: auditApproved.value,
      remark: auditRemark.value.trim() || null,
    });
    if (res?.success) {
      ElMessage.success(res.message || '操作成功');
      auditVisible.value = false;
      await Promise.all([loadList(), loadPendingCount()]);
    } else {
      ElMessage.error(res?.message || '操作失败');
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '审核失败');
  } finally {
    auditing.value = false;
  }
};

onMounted(() => {
  loadList();
  loadPendingCount();
});
</script>

<style scoped>
.page-container { padding: 4px; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.card-header .left { display: flex; align-items: center; gap: 10px; }
.card-header .right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.title { font-size: 15px; font-weight: 600; color: #303133; }
.mono { font-family: Consolas, Monaco, monospace; }
.in { color: #1f9254; }
.out { color: #e6a23c; }
.balance { color: #6b3fb5; font-weight: 600; }
.warn { color: #d64545; font-weight: 600; }
.muted { color: #c0c4cc; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }

.audit-body { display: flex; flex-direction: column; gap: 10px; }
.audit-line { font-size: 13px; color: #606266; }
.audit-line b { color: #303133; }
.audit-line b.in { color: #1f9254; }
.audit-tip {
  font-size: 12px; color: #909399; background: #f7f9fc;
  border: 1px solid #ebeef5; border-radius: 6px; padding: 8px 10px;
}
</style>
