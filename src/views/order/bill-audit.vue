<!-- src/views/order/bill-audit.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>🔍 账单审核</h2>
      <el-tag type="warning">待审核账单</el-tag>
    </div>

    <!-- 统计 -->
    <el-row :gutter="12" style="margin-bottom: 16px;">
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #E6A23C;">
          <div class="stat-number">{{ tableData.length }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </el-col>
    </el-row>

    <!-- 表格 -->
    <el-table :data="tableData" v-loading="loading" border stripe>
      <el-table-column prop="billNo" label="账单编号" width="160">
        <template #default="{ row }">
          <el-link type="primary" @click="viewDetail(row.billId)">
            {{ row.billNo }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="orderNo" label="订单号" width="140" />
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="totalQuantity" label="件数" width="70" align="center" />
      <el-table-column prop="totalAmount" label="总金额" width="120" align="right">
        <template #default="{ row }">
          <span style="color:#E6A23C;font-weight:bold;">
            ¥{{ (row.totalAmount || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="提交时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="viewDetail(row.id)">
            查看
          </el-button>
          <el-button size="small" type="success" @click="handleAudit(row, true)">
            通过
          </el-button>
          <el-button size="small" type="danger" @click="handleAudit(row, false)">
            驳回
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无待审核账单" />

    <!-- ===== 账单详情弹窗 ===== -->
    <el-dialog v-model="detailVisible" :title="`账单审核 - ${detailData?.billNo || ''}`" width="92%" top="5vh">
      <div v-loading="detailLoading">
        <el-descriptions :column="4" border>
          <el-descriptions-item label="账单编号">{{ detailData?.billNo }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ detailData?.customerName }}</el-descriptions-item>
          <el-descriptions-item label="成色">{{ detailData?.color || '-' }}</el-descriptions-item>
          <el-descriptions-item label="账单日期">{{ formatDate(detailData?.billDate) }}</el-descriptions-item>
          <el-descriptions-item label="总件数">{{ detailData?.totalQuantity || 0 }}</el-descriptions-item>
          <el-descriptions-item label="总金额" span="3">
            <span style="color:#E6A23C;font-size:18px;font-weight:bold;">
              ¥{{ (detailData?.totalAmount || 0).toFixed(2) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag type="warning">待审核</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ formatDate(detailData?.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ detailData?.createdByName || '-' }}</el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">📋 出货明细</el-divider>
        <el-table :data="detailDetails" border stripe size="small" max-height="350">
          <el-table-column prop="seqNo" label="序号" width="60" align="center" />
          <el-table-column prop="productName" label="品名" min-width="100" />
          <el-table-column prop="customerName" label="客户" width="100" />
          <el-table-column prop="color" label="颜色" width="70" />
          <el-table-column prop="quantity" label="件数" width="60" align="center" />
          <el-table-column prop="netWeight" label="净重" width="80" align="right" />
          <el-table-column prop="goldPrice" label="金价" width="80" align="right" />
          <el-table-column prop="goldMaterialFee" label="足金料" width="90" align="right" />
          <el-table-column prop="mainStoneAmount" label="主石" width="90" align="right" />
          <el-table-column prop="subStoneAmount" label="副石" width="90" align="right" />
          <el-table-column prop="laborFee" label="工费" width="80" align="right" />
          <el-table-column prop="totalAmount" label="金额" width="100" align="right">
            <template #default="{ row }">
              <span style="color:#E6A23C;font-weight:bold;">{{ row.totalAmount }}</span>
            </template>
          </el-table-column>
        </el-table>

        <!-- LR表 -->
        <el-divider content-position="left" v-if="detailLrRows.length > 0">📊 支出收入LR表</el-divider>
        <el-table v-if="detailLrRows.length > 0" :data="detailLrRows" border stripe size="small" max-height="300">
          <el-table-column prop="seqDisplay" label="序" width="60" align="center" />
          <el-table-column prop="productName" label="品名" min-width="100" />
          <el-table-column prop="customerName" label="客户" width="100" />
          <el-table-column prop="color" label="颜色" width="70" />
          <el-table-column prop="netWeight" label="净重" width="80" align="right" />
          <el-table-column prop="goldMaterialFee" label="足金料" width="90" align="right" />
          <el-table-column prop="totalAmount" label="金额" width="100" align="right" />
          <el-table-column label="类型" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.rowType === 'sale' ? 'primary' : 'info'" size="small">
                {{ row.rowType === 'sale' ? '销售' : '成本' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="detailLrRows.length > 0" style="margin-top:12px;text-align:right;font-size:14px;padding:12px;background:#f5f7fa;border-radius:4px;">
          <span>销售总额：<b style="color:#67C23A;">¥{{ (detailLrSummary?.totalSale || 0).toFixed(2) }}</b></span>
          <span style="margin-left:24px;">成本总额：<b style="color:#E6A23C;">¥{{ (detailLrSummary?.totalCost || 0).toFixed(2) }}</b></span>
          <span style="margin-left:24px;">利润：<b style="color:#F56C6C;">¥{{ (detailLrSummary?.profit || 0).toFixed(2) }}</b></span>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="danger" @click="handleAudit(detailData, false)" :loading="auditing">
          驳回
        </el-button>
        <el-button type="success" @click="handleAudit(detailData, true)" :loading="auditing">
          审核通过
        </el-button>
      </template>
    </el-dialog>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回原因" width="450px">
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="4"
        placeholder="请填写驳回原因（必填）"
      />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReject" :loading="rejectLoading">
          确认驳回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getBillList, getBillDetail, auditBill } from '@/api/bill';

const loading = ref(false);
const detailLoading = ref(false);
const auditing = ref(false);
const rejectLoading = ref(false);
const tableData = ref([]);
const detailVisible = ref(false);
const detailData = ref(null);
const detailDetails = ref([]);
const detailLrRows = ref([]);
const detailLrSummary = ref({});
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const currentRow = ref(null);

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const res = await getBillList({ status: 'pending' });
    tableData.value = res?.data || [];
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

// ===== 查看详情 =====
const viewDetail = async (id) => {
  detailVisible.value = true;
  detailLoading.value = true;
  try {
    const res = await getBillDetail(id);
    const data = res?.data;
    if (data) {
      detailData.value = data;
      detailDetails.value = data.details || [];

      // 解析LR数据
      if (data.lrData) {
        try {
          const lr = typeof data.lrData === 'string' ? JSON.parse(data.lrData) : data.lrData;
          detailLrRows.value = lr.rows || [];
          detailLrSummary.value = lr.summary || {};
        } catch {
          detailLrRows.value = [];
          detailLrSummary.value = {};
        }
      } else {
        detailLrRows.value = [];
        detailLrSummary.value = {};
      }
    }
  } catch {
    ElMessage.error('加载详情失败');
  } finally {
    detailLoading.value = false;
  }
};

// ===== 审核 =====
const handleAudit = (row, approved) => {
  currentRow.value = row;
  if (!approved) {
    rejectReason.value = '';
    rejectDialogVisible.value = true;
  } else {
    doAudit(row, true, '');
  }
};

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  rejectLoading.value = true;
  try {
    await doAudit(currentRow.value, false, rejectReason.value);
    rejectDialogVisible.value = false;
    rejectReason.value = '';
  } finally {
    rejectLoading.value = false;
  }
};

const doAudit = async (row, approved, remark) => {
  auditing.value = true;
  try {
    await auditBill(row.billId, { approved, remark });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    detailVisible.value = false;
    loadData();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    auditing.value = false;
  }
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }

.stat-card { background: #fafafa; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #ddd; }
.stat-card .stat-number { font-size: 22px; font-weight: bold; color: #303133; }
.stat-card .stat-label { font-size: 13px; color: #909399; margin-top: 4px; }

:deep(.el-descriptions__label) { width: 120px; }
</style>