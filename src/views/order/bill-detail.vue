<!-- src/views/order/bill-detail.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📄 账单详情</h2>
        <el-tag :type="getStatusType(billData?.status)" size="large">
          {{ getStatusText(billData?.status) }}
        </el-tag>
        <el-tag type="primary" size="large">{{ billData?.billNo }}</el-tag>
      </div>
      <div class="header-right">
        <!-- 工厂审核员：审核按钮 -->
        <template v-if="userStore.isFactoryAudit && billData?.status === 'pending'">
          <el-button type="success" @click="handleAudit(true)" :loading="auditing">
            审核通过
          </el-button>
          <el-button type="danger" @click="handleAudit(false)" :loading="auditing">
            驳回
          </el-button>
        </template>

        <!-- 客户：确认/退回按钮 -->
        <template v-if="userStore.isCustomer && billData?.status === 'approved'">
          <el-button type="success" @click="handleConfirm" :loading="confirming">
            确认账单
          </el-button>
          <el-button type="danger" @click="openReturnDialog" :loading="returning">
            退回
          </el-button>
        </template>
      </div>
    </div>

    <!-- 账单信息 -->
    <el-card class="info-card">
      <el-row :gutter="16">
        <el-col :span="6"><span class="label">账单编号：</span><span class="value">{{ billData?.billNo }}</span></el-col>
        <el-col :span="6"><span class="label">客户：</span><span class="value">{{ billData?.customerName }}</span></el-col>
        <el-col :span="6"><span class="label">业务员：</span><span class="value">{{ billData?.operatorName }}</span></el-col>
        <el-col :span="6"><span class="label">成色：</span><span class="value">{{ billData?.color || '-' }}</span></el-col>
        <el-col :span="6"><span class="label">总金额：</span><span class="value" style="color:#E6A23C;font-weight:bold;font-size:18px;">
          ¥{{ (billData?.totalAmount || 0).toFixed(2) }}
        </span></el-col>
        <el-col :span="6"><span class="label">总件数：</span><span class="value">{{ billData?.totalQuantity || 0 }}</span></el-col>
        <el-col :span="6"><span class="label">账单日期：</span><span class="value">{{ formatDate(billData?.billDate) }}</span></el-col>
        <el-col :span="6"><span class="label">状态：</span><el-tag :type="getStatusType(billData?.status)" size="small">
          {{ getStatusText(billData?.status) }}
        </el-tag></el-col>
      </el-row>
      <el-row v-if="billData?.remark" style="margin-top:8px;">
        <el-col :span="24"><span class="label">备注：</span><span class="value">{{ billData?.remark }}</span></el-col>
      </el-row>
    </el-card>

    <!-- 出货明细表 -->
    <el-card class="table-card">
      <template #header>
        <span style="font-weight:600;">📋 出货明细</span>
        <span style="margin-left:16px;color:#999;font-size:13px;">
          共 {{ billData?.details?.length || 0 }} 行
        </span>
        <el-button
          v-if="canEdit"
          size="small"
          type="primary"
          style="float:right;"
          @click="toggleEdit"
        >
          {{ isEditing ? '保存' : '编辑' }}
        </el-button>
      </template>

      <div class="table-wrapper">
        <el-table :data="billData?.details || []" border stripe size="small">
          <el-table-column prop="seqNo" label="序号" width="55" align="center" />
          <el-table-column prop="orderNo" label="订单号" width="120">
            <template #default="{ row }">
              <el-link type="primary" @click="viewOrder(row.orderId)">
                {{ row.orderNo }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="productName" label="品名" min-width="100" />
          <el-table-column prop="customerName" label="客户" width="100" />
          <el-table-column prop="color" label="颜色" width="70" align="center" />
          <el-table-column prop="quantity" label="件数" width="60" align="center" />
          <el-table-column prop="size" label="手寸" width="70" align="center" />
          <el-table-column prop="totalWeight" label="总重" width="80" align="right">
            <template #default="{ row }">
              <span v-if="!isEditing">{{ row.totalWeight || '-' }}</span>
              <el-input-number v-else v-model="row.totalWeight" :precision="3" size="small" style="width:100%;" />
            </template>
          </el-table-column>
          <el-table-column prop="netWeight" label="净重" width="80" align="right">
            <template #default="{ row }">
              <span v-if="!isEditing">{{ row.netWeight || '-' }}</span>
              <el-input-number v-else v-model="row.netWeight" :precision="3" size="small" style="width:100%;" />
            </template>
          </el-table-column>
          <el-table-column prop="lossRate" label="损耗" width="70" align="center">
            <template #default="{ row }">
              <span v-if="!isEditing">{{ row.lossRate || '-' }}</span>
              <el-input-number v-else v-model="row.lossRate" :precision="2" size="small" style="width:100%;" />
            </template>
          </el-table-column>
          <el-table-column prop="goldPrice" label="金价" width="80" align="right">
            <template #default="{ row }">
              <span v-if="!isEditing">{{ row.goldPrice || '-' }}</span>
              <el-input-number v-else v-model="row.goldPrice" :precision="2" size="small" style="width:100%;" />
            </template>
          </el-table-column>
          <el-table-column prop="goldMaterialFee" label="足金料" width="85" align="right">
            <template #default="{ row }">
              <span v-if="!isEditing">{{ row.goldMaterialFee || '-' }}</span>
              <el-input-number v-else v-model="row.goldMaterialFee" :precision="2" size="small" style="width:100%;" />
            </template>
          </el-table-column>
          <el-table-column prop="mainStoneAmount" label="主石" width="80" align="right">
            <template #default="{ row }">
              <span v-if="!isEditing">{{ row.mainStoneAmount || '-' }}</span>
              <el-input-number v-else v-model="row.mainStoneAmount" :precision="2" size="small" style="width:100%;" />
            </template>
          </el-table-column>
          <el-table-column prop="subStoneAmount" label="副石" width="80" align="right">
            <template #default="{ row }">
              <span v-if="!isEditing">{{ row.subStoneAmount || '-' }}</span>
              <el-input-number v-else v-model="row.subStoneAmount" :precision="2" size="small" style="width:100%;" />
            </template>
          </el-table-column>
          <el-table-column prop="laborFee" label="工费" width="80" align="right">
            <template #default="{ row }">
              <span v-if="!isEditing">{{ row.laborFee || '-' }}</span>
              <el-input-number v-else v-model="row.laborFee" :precision="2" size="small" style="width:100%;" />
            </template>
          </el-table-column>
          <el-table-column prop="totalAmount" label="应收" width="100" align="right">
            <template #default="{ row }">
              <span style="color:#E6A23C;font-weight:bold;">
                ¥{{ (row.totalAmount || 0).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="退回" width="60" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.isReturned" type="danger" size="small">已退</el-tag>
              <span v-else style="color:#ccc;">-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div style="margin-top:12px;text-align:right;font-size:14px;color:#666;">
        合计：<b style="color:#E6A23C;font-size:18px;">
          ¥{{ (billData?.totalAmount || 0).toFixed(2) }}
        </b>
        ｜ 总件数：<b>{{ billData?.totalQuantity || 0 }}</b>
      </div>
    </el-card>

    <!-- 流程日志 -->
    <el-card style="margin-top:16px;">
      <template #header><span style="font-weight:600;">📜 流程日志</span></template>
      <FlowLog :bill-id="billId" />
    </el-card>

    <!-- 退回弹窗 -->
    <el-dialog v-model="returnDialogVisible" title="退回账单" width="550px" destroy-on-close>
      <el-alert
        title="选择要退回的明细"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom:16px;"
      />
      <el-table
        :data="billData?.details || []"
        border
        stripe
        @selection-change="handleReturnSelection"
        max-height="300"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="seqNo" label="序号" width="55" align="center" />
        <el-table-column prop="productName" label="品名" min-width="100" />
        <el-table-column prop="totalAmount" label="金额" width="100" align="right" />
      </el-table>

      <el-form style="margin-top:16px;">
        <el-form-item label="退回原因" required>
          <el-input
            v-model="returnForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请填写退回原因"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="returnForm.remark"
            type="textarea"
            :rows="2"
            placeholder="可选备注"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="returnDialogVisible = false">取消</el-button>
        <el-button
          type="danger"
          @click="confirmReturn"
          :loading="returning"
          :disabled="returnSelected.length === 0 || !returnForm.reason"
        >
          确认退回 ({{ returnSelected.length }})
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getBillDetail, auditBill, confirmBill, returnBill, updateBillDetails } from '@/api/bill';
import FlowLog from '@/components/FlowLog.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const billId = computed(() => Number(route.params.id));

const loading = ref(false);
const auditing = ref(false);
const confirming = ref(false);
const returning = ref(false);
const isEditing = ref(false);
const billData = ref(null);
const returnDialogVisible = ref(false);
const returnSelected = ref([]);
const returnForm = ref({ reason: '', remark: '' });

// ===== 权限判断 =====
const canEdit = computed(() => {
  const userType = userStore.userType;
  return (userType === 'factoryOrder' || userType === 'admin') && billData.value?.status === 'pending';
});

// ===== 状态映射 =====
const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  returned: { text: '已退回', type: 'danger' },
  confirmed: { text: '已确认', type: 'success' },
};

const getStatusText = (status) => statusMap[status]?.text || status || '-';
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ===== 加载数据 =====
const loadData = async () => {
  if (!billId.value) return;
  loading.value = true;
  try {
    const res = await getBillDetail(billId.value);
    billData.value = res?.data;
    if (!billData.value) {
      ElMessage.error('账单不存在');
      router.back();
    }
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// ===== 编辑模式切换 =====
const toggleEdit = async () => {
  if (isEditing.value) {
    // 保存
    try {
      await updateBillDetails({
        billId: billId.value,
        details: billData.value.details
      });
      ElMessage.success('保存成功');
      isEditing.value = false;
      loadData();
    } catch {
      ElMessage.error('保存失败');
    }
  } else {
    isEditing.value = true;
  }
};

// ===== 审核 =====
const handleAudit = async (approved) => {
  try {
    await ElMessageBox.confirm(
      approved ? '确定审核通过该账单吗？' : '确定驳回该账单吗？',
      '审核确认',
      { type: approved ? 'info' : 'warning' }
    );
  } catch { return; }

  auditing.value = true;
  try {
    await auditBill(billId.value, { approved });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    loadData();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    auditing.value = false;
  }
};

// ===== 客户确认 =====
const handleConfirm = async () => {
  try {
    await ElMessageBox.confirm('确认账单无误吗？确认后订单将完成。', '确认账单', { type: 'info' });
  } catch { return; }

  confirming.value = true;
  try {
    await confirmBill(billId.value);
    ElMessage.success('账单已确认');
    loadData();
  } catch {
    ElMessage.error('确认失败');
  } finally {
    confirming.value = false;
  }
};

// ===== 退回 =====
const openReturnDialog = () => {
  returnSelected.value = [];
  returnForm.value = { reason: '', remark: '' };
  returnDialogVisible.value = true;
};

const handleReturnSelection = (selection) => {
  returnSelected.value = selection;
};

const confirmReturn = async () => {
  if (returnSelected.value.length === 0) {
    ElMessage.warning('请至少选择一个明细');
    return;
  }
  if (!returnForm.value.reason.trim()) {
    ElMessage.warning('请填写退回原因');
    return;
  }

  returning.value = true;
  try {
    const detailIds = returnSelected.value.map(d => d.id);
    await returnBill(billId.value, {
      reason: returnForm.value.reason,
      remark: returnForm.value.remark,
      detailIds: detailIds
    });
    ElMessage.success('账单已退回');
    returnDialogVisible.value = false;
    loadData();
  } catch {
    ElMessage.error('退回失败');
  } finally {
    returning.value = false;
  }
};

// ===== 查看订单 =====
const viewOrder = (orderId) => {
  router.push(`/order/detail/${orderId}`);
};

// ===== 返回 =====
const goBack = () => {
  router.back();
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.header-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.header-left h2 { font-size: 18px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; flex-wrap: wrap; }

.info-card { background: #fff; margin-bottom: 16px; }
.info-card .el-card__body { padding: 16px 20px; }
.info-card .label { color: #999; font-size: 14px; }
.info-card .value { color: #333; font-size: 14px; font-weight: 500; }

.table-card { background: #fff; }
.table-card .el-card__body { padding: 16px; }
.table-wrapper { overflow-x: auto; }
:deep(.el-table .cell) { padding: 2px 4px; }
:deep(.el-input-number) { width: 100%; }
:deep(.el-input-number .el-input__inner) { text-align: center; }

.stat-card { background: #fafafa; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #ddd; }
.stat-card .stat-number { font-size: 22px; font-weight: bold; color: #303133; }
.stat-card .stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
</style>