<!-- src/views/order/bill-receipt-audit.vue
     ⭐ 账单收款审核（工厂审核员）
     - 列表：应收 / 实收 / 差额 / 已收行 / 状态
     - 点开抽屉：与账单预览完全一致的明细（只读收款两列）
     - 通过后回写「来款金额」与「累计欠款」；驳回需填原因
-->
<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="left">
            <span class="title">💰 账单收款审核</span>
            <el-tag size="small" type="warning" effect="plain">待审核 {{ pendingCount }}</el-tag>
          </div>
          <div class="right">
            <el-radio-group v-model="statusFilter" size="small" @change="loadList">
              <el-radio-button value="pending">待审核</el-radio-button>
              <el-radio-button value="approved">已通过</el-radio-button>
              <el-radio-button value="rejected">已驳回</el-radio-button>
              <el-radio-button value="all">全部</el-radio-button>
            </el-radio-group>
            <el-input v-model="keyword" size="small" clearable placeholder="账单号 / 客户"
                      style="width:180px;" @keyup.enter="loadList" @clear="loadList" />
            <el-button size="small" @click="loadList">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="rows" border size="small" v-loading="loading" empty-text="暂无收款单">
        <el-table-column prop="billNo" label="账单号" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="mono">{{ row.billNo }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户" min-width="140" show-overflow-tooltip />
        <el-table-column prop="operatorName" label="销售" width="90" align="center" />
        <el-table-column label="账单日期" width="110" align="center">
          <template #default="{ row }">{{ fmtDate(row.billDate) }}</template>
        </el-table-column>
        <el-table-column label="应收" width="120" align="right">
          <template #default="{ row }">¥{{ num(row.receiptReceivable).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="实收" width="120" align="right">
          <template #default="{ row }">
            <b class="actual">¥{{ num(row.receiptActual).toFixed(2) }}</b>
          </template>
        </el-table-column>
        <el-table-column label="差额" width="110" align="right">
          <template #default="{ row }">
            <span :class="{ warn: Math.abs(num(row.receiptReceivable) - num(row.receiptActual)) > 0.001 }">
              ¥{{ (num(row.receiptReceivable) - num(row.receiptActual)).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="已收行" width="90" align="center">
          <template #default="{ row }">
            <span class="recv">{{ row.receivedRows || 0 }}/{{ row.totalRows || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTag(row.receiptStatus)">{{ statusText(row.receiptStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="145" align="center">
          <template #default="{ row }">{{ fmtTime(row.receiptSubmittedAt) }}</template>
        </el-table-column>
        <el-table-column label="审核人" width="90" align="center">
          <template #default="{ row }">{{ row.receiptAuditedByName || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openDetail(row)">查看明细</el-button>
            <template v-if="row.receiptStatus === 'pending'">
              <el-button type="success" link size="small" @click="openAudit(row, true)">通过</el-button>
              <el-button type="danger" link size="small" @click="openAudit(row, false)">驳回</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, total"
          background
          @current-change="loadList"
        />
      </div>
    </el-card>

    <!-- 明细抽屉 -->
    <el-drawer v-model="drawerVisible" title="收款明细" size="82%" destroy-on-close>
      <div v-loading="detailLoading" class="drawer-body">
        <div v-if="current" class="drawer-summary">
          <span>账单号 <b>{{ current.billNo }}</b></span>
          <span>客户 <b>{{ current.customerName }}</b></span>
          <span>应收 <b>¥{{ num(current.receiptReceivable).toFixed(2) }}</b></span>
          <span>实收 <b class="actual">¥{{ num(current.receiptActual).toFixed(2) }}</b></span>
          <span>状态 <el-tag size="small" :type="statusTag(current.receiptStatus)">{{ statusText(current.receiptStatus) }}</el-tag></span>
        </div>
        <BillPreviewSheet
          v-if="currentDetail"
          :bill-data="currentDetail"
          :details="currentDetail.details || []"
          receipt-mode
          hide-close
        />
        <div v-if="current && current.receiptRemark" class="drawer-remark">
          审核意见：{{ current.receiptRemark }}
        </div>
      </div>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="drawerVisible = false">关闭</el-button>
          <template v-if="current && current.receiptStatus === 'pending'">
            <el-button type="danger" plain @click="openAudit(current, false)">驳回</el-button>
            <el-button type="success" @click="openAudit(current, true)">通过并回写来款</el-button>
          </template>
        </div>
      </template>
    </el-drawer>

    <!-- 审核弹窗 -->
    <el-dialog v-model="auditVisible" :title="auditApproved ? '收款审核通过' : '收款驳回'" width="440px">
      <div class="audit-body">
        <div class="audit-line">
          账单 <b>{{ auditRow?.billNo }}</b>　客户 <b>{{ auditRow?.customerName }}</b>
        </div>
        <div class="audit-line">
          应收 <b>¥{{ num(auditRow?.receiptReceivable).toFixed(2) }}</b>　
          实收 <b class="actual">¥{{ num(auditRow?.receiptActual).toFixed(2) }}</b>
        </div>
        <div v-if="auditApproved" class="audit-tip">
          通过后将把「来款金额」更新为 ¥{{ num(auditRow?.receiptActual).toFixed(2) }}，并重算累计欠款。
        </div>
        <el-input
          v-model="auditRemark"
          type="textarea"
          :rows="3"
          maxlength="200"
          show-word-limit
          :placeholder="auditApproved ? '审核意见（选填）' : '请填写驳回原因'"
        />
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
import { getBillReceiptList, auditBillReceipt, getBillDetail } from '@/api/bill';
import BillPreviewSheet from '@/components/BillPreviewSheet.vue';

const rows = ref([]);
const loading = ref(false);
const statusFilter = ref('pending');
const keyword = ref('');
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

const pendingCount = ref(0);

const drawerVisible = ref(false);
const detailLoading = ref(false);
const current = ref(null);
const currentDetail = ref(null);

const auditVisible = ref(false);
const auditApproved = ref(true);
const auditRemark = ref('');
const auditing = ref(false);
const auditRow = ref(null);

const num = (v) => Number(v || 0);
const fmtDate = (v) => (v ? String(v).slice(0, 10) : '-');
const fmtTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 16) : '-');

const statusText = (s) => ({ none: '未提交', pending: '待审核', approved: '已通过', rejected: '已驳回' }[s] || '未提交');
const statusTag = (s) => ({ none: 'info', pending: 'warning', approved: 'success', rejected: 'danger' }[s] || 'info');

const loadList = async () => {
  loading.value = true;
  try {
    const res = await getBillReceiptList({
      status: statusFilter.value,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    const list = res?.data || [];
    // 补充「已收行/总行数」
    const enriched = await Promise.all(list.map(async (r) => {
      try {
        const d = await getBillDetail(r.billId);
        const details = d?.data?.details || [];
        return {
          ...r,
          totalRows: details.length,
          receivedRows: details.filter(x => x.isReceived).length,
        };
      } catch {
        return { ...r, totalRows: 0, receivedRows: 0 };
      }
    }));
    rows.value = enriched;
    total.value = res?.total || enriched.length;
  } catch (e) {
    console.error('加载收款列表失败:', e);
    ElMessage.error(e?.response?.data?.message || '加载收款列表失败');
  } finally {
    loading.value = false;
  }
};

const loadPendingCount = async () => {
  try {
    const res = await getBillReceiptList({ status: 'pending', page: 1, pageSize: 1 });
    pendingCount.value = res?.total || 0;
  } catch { pendingCount.value = 0; }
};

const openDetail = async (row) => {
  current.value = row;
  currentDetail.value = null;
  drawerVisible.value = true;
  detailLoading.value = true;
  try {
    const d = await getBillDetail(row.billId);
    currentDetail.value = { ...row, ...(d?.data || {}) };
  } catch (e) {
    ElMessage.error('加载明细失败');
  } finally {
    detailLoading.value = false;
  }
};

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
    const res = await auditBillReceipt(auditRow.value.billId, {
      approved: auditApproved.value,
      remark: auditRemark.value.trim() || undefined,
    });
    if (res.success) {
      ElMessage.success(res.message || '操作成功');
      auditVisible.value = false;
      drawerVisible.value = false;
      await Promise.all([loadList(), loadPendingCount()]);
    } else {
      ElMessage.error(res.message || '操作失败');
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e.message || '审核失败');
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
.actual { color: #1f9254; }
.warn { color: #d64545; font-weight: 600; }
.recv { font-family: Consolas, Monaco, monospace; color: #606266; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }

.drawer-body { padding: 0 8px; }
.drawer-summary {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  background: #f7f9fc; border: 1px solid #ebeef5; border-radius: 8px;
  padding: 10px 14px; margin-bottom: 10px; font-size: 13px; color: #606266;
}
.drawer-summary b { color: #303133; }
.drawer-summary b.actual { color: #1f9254; }
.drawer-remark { margin-top: 12px; font-size: 13px; color: #d64545; }
.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; }

.audit-body { display: flex; flex-direction: column; gap: 10px; }
.audit-line { font-size: 13px; color: #606266; }
.audit-line b { color: #303133; }
.audit-line b.actual { color: #1f9254; }
.audit-tip {
  font-size: 12px; color: #909399; background: #f7f9fc;
  border: 1px solid #ebeef5; border-radius: 6px; padding: 8px 10px;
}
</style>
