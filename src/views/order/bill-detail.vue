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
        <template v-if="userStore.isFactoryAudit && billData?.status === 'pending'">
          <el-button type="success" @click="handleAudit(true)" :loading="auditing">
            审核通过
          </el-button>
          <el-button type="danger" @click="handleAudit(false)" :loading="auditing">
            驳回
          </el-button>
        </template>
        <template v-if="userStore.isCustomer && billData?.status === 'approved'">
          <el-button type="success" @click="handleConfirm" :loading="confirming">
            确认账单
          </el-button>
          <el-button type="danger" @click="openReturnDialog">
            退回
          </el-button>
        </template>
      </div>
    </div>

    <!-- 账单信息 -->
    <el-card class="info-card">
      <el-row :gutter="16">
        <el-col :span="6">
          <span class="label">账单编号：</span>
          <span class="value">{{ billData?.billNo }}</span>
        </el-col>
        <el-col :span="6">
          <span class="label">客户：</span>
          <span class="value">{{ billData?.customerName }}</span>
        </el-col>
        <el-col :span="6">
          <span class="label">公司：</span>
          <span class="value">{{ billData?.company || '-' }}</span>
        </el-col>
        <el-col :span="6">
          <span class="label">成色：</span>
          <span class="value">{{ billData?.color || '-' }}</span>
        </el-col>
        <el-col :span="6">
          <span class="label">总金额：</span>
          <span class="value" style="color:#E6A23C;font-weight:bold;font-size:18px;">
            ¥{{ (billData?.totalAmount || 0).toFixed(2) }}
          </span>
        </el-col>
        <el-col :span="6">
          <span class="label">总件数：</span>
          <span class="value">{{ billData?.totalQuantity || 0 }}</span>
        </el-col>
        <el-col :span="6">
          <span class="label">账单日期：</span>
          <span class="value">{{ formatDate(billData?.billDate) }}</span>
        </el-col>
        <el-col :span="6">
          <span class="label">状态：</span>
          <el-tag :type="getStatusType(billData?.status)" size="small">
            {{ getStatusText(billData?.status) }}
          </el-tag>
        </el-col>
      </el-row>
      <el-row v-if="billData?.remark" style="margin-top:8px;">
        <el-col :span="24">
          <span class="label">备注：</span>
          <span class="value">{{ billData?.remark }}</span>
        </el-col>
      </el-row>
    </el-card>

    <!-- 出货明细 -->
    <el-card class="table-card">
      <template #header>
        <span style="font-weight:600;">📋 出货明细</span>
        <span style="margin-left:16px;color:#999;font-size:13px;">
          共 {{ billData?.details?.length || 0 }} 行
        </span>
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
          <el-table-column prop="color" label="颜色" width="70" align="center" />
          <el-table-column prop="quantity" label="件数" width="60" align="center" />
          <el-table-column prop="netWeight" label="净重" width="80" align="right" />
          <el-table-column prop="goldPrice" label="金价" width="80" align="right" />
          <el-table-column prop="goldMaterialFee" label="足金料" width="85" align="right" />
          <el-table-column prop="mainStoneAmount" label="主石" width="80" align="right" />
          <el-table-column prop="subStoneAmount" label="副石" width="80" align="right" />
          <el-table-column prop="laborFee" label="工费" width="80" align="right" />
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

    <!-- ===== 底部汇总区 ===== -->
    <el-card class="summary-card" v-if="billData?.billId">
      <template #header>
        <span style="font-weight:600;">📊 汇总</span>
        <span v-if="canEditPayment" style="margin-left:16px;color:#999;font-size:13px;">
          来料/来款可编辑
        </span>
      </template>
      <el-row :gutter="20">
        <!-- 左列：足料 -->
        <el-col :span="12">
          <div class="summary-item">
            <span class="label">上单欠足料：</span>
            <span class="value">{{ (billData.lastDebtMaterial || 0).toFixed(3) }}g</span>
          </div>
          <div class="summary-item">
            <span class="label">本单应收足料：</span>
            <span class="value" style="color:#E6A23C;font-weight:bold;">
              {{ (billData.currentMaterial || 0).toFixed(3) }}g
            </span>
          </div>
          <div class="summary-item" v-if="canEditPayment">
            <span class="label">来足料重：</span>
            <el-input-number
              v-model="billData.receivedMaterial"
              :precision="3"
              :min="0"
              size="small"
              style="width:140px;"
              @change="handleUpdatePayment"
            />
          </div>
          <div class="summary-item" v-else>
            <span class="label">来足料重：</span>
            <span class="value">{{ (billData.receivedMaterial || 0).toFixed(3) }}g</span>
          </div>
          <div class="summary-item">
            <span class="label">累欠足金料：</span>
            <span class="value" :style="{ color: (billData.totalDebtMaterial || 0) > 0 ? '#F56C6C' : '#67C23A', fontWeight: 'bold' }">
              {{ (billData.totalDebtMaterial || 0).toFixed(3) }}g
            </span>
          </div>
        </el-col>

        <!-- 右列：金额 -->
        <el-col :span="12">
          <div class="summary-item">
            <span class="label">上单欠款：</span>
            <span class="value">¥{{ (billData.lastDebtMoney || 0).toFixed(2) }}</span>
          </div>
          <div class="summary-item">
            <span class="label">本单应收款：</span>
            <span class="value" style="color:#E6A23C;font-weight:bold;">
              ¥{{ (billData.currentMoney || 0).toFixed(2) }}
            </span>
          </div>
          <div class="summary-item" v-if="canEditPayment">
            <span class="label">来款金额：</span>
            <el-input-number
              v-model="billData.receivedMoney"
              :precision="2"
              :min="0"
              size="small"
              style="width:140px;"
              @change="handleUpdatePayment"
            />
          </div>
          <div class="summary-item" v-else>
            <span class="label">来款金额：</span>
            <span class="value">¥{{ (billData.receivedMoney || 0).toFixed(2) }}</span>
          </div>
          <div class="summary-item">
            <span class="label">累计欠款：</span>
            <span class="value" :style="{ color: (billData.totalDebtMoney || 0) > 0 ? '#F56C6C' : '#67C23A', fontWeight: 'bold' }">
              ¥{{ (billData.totalDebtMoney || 0).toFixed(2) }}
            </span>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 流程日志 -->
    <el-card style="margin-top:16px;">
      <template #header><span style="font-weight:600;">📜 流程日志</span></template>
      <FlowLog :bill-id="billId" />
    </el-card>

    <!-- 退回弹窗 -->
    <el-dialog v-model="returnDialogVisible" title="退回账单" width="550px" destroy-on-close>
      <el-alert title="选择要退回的明细" type="warning" :closable="false" show-icon style="margin-bottom:16px;" />
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
          <el-input v-model="returnForm.reason" type="textarea" :rows="3" placeholder="请填写退回原因" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="returnForm.remark" type="textarea" :rows="2" placeholder="可选备注" />
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
import { getBillDetail, auditBill, confirmBill, returnBill, updatePayment } from '@/api/bill';
import FlowLog from '@/components/FlowLog.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const billId = computed(() => Number(route.params.id));

const loading = ref(false);
const auditing = ref(false);
const confirming = ref(false);
const returning = ref(false);
const billData = ref(null);
const returnDialogVisible = ref(false);
const returnSelected = ref([]);
const returnForm = ref({ reason: '', remark: '' });

// ===== 权限判断 =====
const canEditPayment = computed(() => {
  const userType = userStore.userType;
  return (userType === 'factoryOrder' || userType === 'admin') && billData.value?.status === 'pending';
});

// ===== 状态映射 =====
const statusMap = {
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  returned: { text: '已退回', type: 'danger' },
  confirmed: { text: '已确认', type: 'success' },
};
const getStatusText = (s) => statusMap[s]?.text || s;
const getStatusType = (s) => statusMap[s]?.type || 'info';

// ============================================================
// 加载数据
// ============================================================
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

// ============================================================
// ⭐ 更新来料/来款（方法名改为 handleUpdatePayment 避免冲突）
// ============================================================
const handleUpdatePayment = async () => {
  if (!billData.value) return;
  try {
    await updatePayment(billId.value, {
      receivedMaterial: billData.value.receivedMaterial || 0,
      receivedMoney: billData.value.receivedMoney || 0,
    });
    ElMessage.success('更新成功');
  } catch {
    ElMessage.error('更新失败');
    loadData();
  }
};

// ============================================================
// 审核
// ============================================================
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

// ============================================================
// 客户确认
// ============================================================
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

// ============================================================
// 退回
// ============================================================
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
    await returnBill(billId.value, {
      reason: returnForm.value.reason,
      remark: returnForm.value.remark,
      detailIds: returnSelected.value.map(d => d.id),
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

// ============================================================
// 查看订单
// ============================================================
const viewOrder = (id) => {
  router.push(`/order/detail/${id}`);
};

// ============================================================
// 返回
// ============================================================
const goBack = () => {
  router.back();
};

// ============================================================
// 时间格式化
// ============================================================
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ============================================================
// 初始化
// ============================================================
onMounted(loadData);
</script>

<style scoped>
.page-container {
  background: #f5f7fa;
  padding: 16px;
  min-height: 100vh;
}

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
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.header-left h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.info-card,
.table-card,
.summary-card {
  background: #fff;
  margin-bottom: 16px;
}
.info-card .el-card__body {
  padding: 16px 20px;
}
.info-card .label {
  color: #999;
  font-size: 14px;
}
.info-card .value {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.table-card .el-card__body {
  padding: 16px;
}
.table-wrapper {
  overflow-x: auto;
}
:deep(.el-table .cell) {
  padding: 2px 4px;
}

.summary-card .el-card__body {
  padding: 16px 20px;
}
.summary-item {
  padding: 6px 0;
  display: flex;
  align-items: center;
}
.summary-item .label {
  color: #666;
  font-size: 14px;
  min-width: 110px;
}
.summary-item .value {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}
</style>