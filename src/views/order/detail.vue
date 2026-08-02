<!-- src/views/order/detail.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>订单详情</h2>
        <el-tag :type="statusTagType" size="large">{{ statusText }}</el-tag>
        <el-tag v-if="orderData?.warnFlag" type="danger" size="large">⚠️ 紧急</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showFlowDrawer = true">
          <el-icon><Connection /></el-icon> 查看流程
        </el-button>
        <el-button v-if="canEdit" type="warning" @click="toggleEdit">
          <el-icon><Edit /></el-icon> {{ isEditing ? '保存' : '编辑' }}
        </el-button>
      </div>
    </div>

    <!-- ===== 基本信息 ===== -->
    <el-card style="margin-bottom: 16px;">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="info-item">
            <span class="label">订单编号：</span>
            <span class="value">{{ orderData?.orderNo || '-' }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <span class="label">客户名称：</span>
            <span class="value">{{ orderData?.customerName || '-' }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <span class="label">下单日期：</span>
            <span class="value">{{ formatDate(orderData?.orderDate) }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <span class="label">创建时间：</span>
            <span class="value">{{ formatDate(orderData?.createdAt) }}</span>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- ===== 订单内容 ===== -->
    <el-card>
      <template #header>
        <span style="font-weight: 600;">📋 订单内容</span>
        <span style="margin-left: 16px; color: #999; font-size: 13px;">
          共 {{ orderData?.quantity || 0 }} 件 ｜ 金额 ¥{{ (orderData?.amount || 0).toFixed(2) }}
        </span>
      </template>

      <el-table :data="[orderData]" border stripe v-if="orderData">
        <el-table-column label="品名" min-width="140">
          <template #default>
            <el-input 
              v-model="orderData.productName" 
              placeholder="品名"
              :disabled="!isEditing"
              size="small"
              clearable
            />
          </template>
        </el-table-column>

        <el-table-column label="颜色" width="100">
          <template #default>
            <el-select v-model="orderData.color" :disabled="!isEditing" size="small" style="width: 100%">
              <el-option label="K黄" value="K黄" />
              <el-option label="K白" value="K白" />
              <el-option label="红" value="红" />
              <el-option label="P1" value="P1" />
              <el-option label="9K" value="9K" />
              <el-option label="14K" value="14K" />
              <el-option label="银" value="银" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="件数" width="80">
          <template #default>
            <el-input-number 
              v-model="orderData.quantity" 
              :min="1" 
              :disabled="!isEditing"
              size="small"
              style="width: 100%"
            />
          </template>
        </el-table-column>

        <el-table-column label="手寸" width="100">
          <template #default>
            <el-input 
              v-model="orderData.size" 
              placeholder="手寸"
              :disabled="!isEditing"
              size="small"
              clearable
            />
          </template>
        </el-table-column>

        <el-table-column label="钻石级别" width="115">
          <template #default>
            <el-select v-model="orderData.diamondLevel" :disabled="!isEditing" size="small" style="width: 100%" clearable>
              <el-option label="VS" value="VS" />
              <el-option label="VVS" value="VVS" />
              <el-option label="培育钻" value="培育钻" />
              <el-option label="塔育钻" value="塔育钻" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="参数" min-width="100">
          <template #default>
            <el-input 
              v-model="orderData.params" 
              placeholder="参数"
              :disabled="!isEditing"
              size="small"
              clearable
            />
          </template>
        </el-table-column>

        <el-table-column label="工期(天)" width="90">
          <template #default>
            <el-input-number 
              v-model="orderData.deliveryDays" 
              :min="1" 
              :disabled="!isEditing"
              size="small"
              style="width: 100%"
            />
          </template>
        </el-table-column>

        <el-table-column label="金额(元)" width="120">
          <template #default>
            <el-input-number 
              v-model="orderData.amount" 
              :min="0" 
              :precision="2" 
              :disabled="!isEditing"
              size="small"
              style="width: 100%"
              placeholder="0.00"
            />
          </template>
        </el-table-column>

        <el-table-column label="备注" min-width="100">
          <template #default>
            <el-input 
              v-model="orderData.remark" 
              placeholder="备注"
              :disabled="!isEditing"
              size="small"
              clearable
            />
          </template>
        </el-table-column>

        <el-table-column label="图片" width="80" align="center">
          <template #default>
            <img 
              v-if="orderData.imageUrl" 
              :src="orderData.imageUrl" 
              class="table-image" 
              @click="previewImage(orderData.imageUrl)"
            />
            <span v-else style="color: #ccc; font-size: 12px;">无图</span>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 12px; text-align: right; font-size: 14px; color: #666;">
        合计：<b style="color: #E6A23C; font-size: 18px;">¥{{ (orderData?.amount || 0).toFixed(2) }}</b>
        ｜ 总件数：<b>{{ orderData?.quantity || 0 }}</b>
      </div>
    </el-card>

    <!-- ===== 审核/操作区域 ===== -->
    <el-card style="margin-top: 16px;" v-if="canAudit || canSubmitToFactory || canFactoryAudit || canMarkUrgent || canCancel">
      <template #header>
        <span style="font-weight: 600;">⚙️ 操作</span>
      </template>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <!-- 客户审核 -->
        <template v-if="userStore.isCustomerAudit && orderData?.flowStatus === 'pending'">
          <el-button type="success" @click="handleAudit(true)">
            <el-icon><Select /></el-icon> 审核通过
          </el-button>
          <el-button type="danger" @click="handleAudit(false)">
            <el-icon><Close /></el-icon> 驳回
          </el-button>
        </template>

        <!-- 工厂操作员提交 -->
        <template v-if="userStore.isFactoryOrder && orderData?.flowStatus === 'customerAudited'">
          <el-button type="primary" @click="handleSubmitToFactory">
            <el-icon><Upload /></el-icon> 提交到工厂
          </el-button>
        </template>

        <!-- 工厂审核 -->
        <template v-if="userStore.isFactoryAudit && orderData?.flowStatus === 'factoryPending'">
          <el-button type="success" @click="handleFactoryAudit(true)">
            <el-icon><Select /></el-icon> 审核通过
          </el-button>
          <el-button type="danger" @click="handleFactoryAudit(false)">
            <el-icon><Close /></el-icon> 驳回
          </el-button>
        </template>

        <!-- 工厂操作员制作 -->
        <template v-if="userStore.isFactoryOrder && (orderData?.flowStatus === 'audited' || orderData?.flowStatus === 'producing')">
          <el-button 
            v-if="orderData?.flowStatus === 'audited'"
            type="primary" 
            @click="handleStartProduction"
          >
            <el-icon><Operation /></el-icon> 开始制作
          </el-button>
          <el-button 
            v-if="orderData?.flowStatus === 'producing'"
            type="success" 
            @click="handleCompleteProduction"
          >
            <el-icon><Finished /></el-icon> 完成制作
          </el-button>
        </template>

        <!-- 标记紧急 - 使用文字图标 -->
        <template v-if="canMarkUrgent">
          <el-button 
            :type="orderData?.warnFlag ? 'warning' : 'danger'"
            @click="handleToggleUrgent"
          >
            ⚠️ {{ orderData?.warnFlag ? '取消紧急' : '标记紧急' }}
          </el-button>
        </template>

        <!-- 取消订单 -->
        <template v-if="canCancel">
          <el-button type="danger" plain @click="handleCancel">
            <el-icon><Delete /></el-icon> 取消订单
          </el-button>
        </template>
      </div>
    </el-card>

    <!-- ===== 操作记录 ===== -->
    <el-card style="margin-top: 16px;">
      <template #header>
        <span style="font-weight: 600;">📜 操作记录</span>
      </template>
      <el-timeline v-if="historyLogs.length > 0">
        <el-timeline-item
          v-for="log in historyLogs"
          :key="log.id"
          :timestamp="formatDate(log.createdAt)"
          placement="top"
          size="small"
        >
          <div class="log-item">
            <span class="log-operator">{{ log.operatorName || '系统' }}</span>
            <span class="log-action">{{ log.actionText || log.remark }}</span>
            <span v-if="log.remark && log.remark !== log.actionText" class="log-remark">（{{ log.remark }}）</span>
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无操作记录" :image-size="60" />
    </el-card>

    <!-- ===== 流程抽屉 ===== -->
    <FlowDrawer
      v-model="showFlowDrawer"
      :order-id="orderId"
      :order-no="orderData?.orderNo"
      @refresh="loadData"
    />

    <!-- ===== 图片预览弹窗 ===== -->
    <el-dialog v-model="imagePreviewVisible" title="图片预览" width="500px" center>
      <div style="text-align: center;">
        <img :src="previewImageUrl" style="max-width: 100%; max-height: 500px; border-radius: 4px;" />
      </div>
    </el-dialog>

    <!-- ===== 驳回原因弹窗 ===== -->
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
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowLeft, Connection, Edit, Select, Close, Upload,
  Operation, Finished, Delete
} from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderDetail, updateOrder, auditOrder, submitToFactory, updateProduction, cancelOrder, markUrgent } from '@/api/order';
import FlowDrawer from '@/components/FlowDrawer.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const orderId = computed(() => Number(route.params.id));
const orderData = ref(null);
const loading = ref(false);
const isEditing = ref(false);
const historyLogs = ref([]);
const showFlowDrawer = ref(false);
const imagePreviewVisible = ref(false);
const previewImageUrl = ref('');
const rejectDialogVisible = ref(false);
const rejectReason = ref('');
const rejectLoading = ref(false);
const pendingAuditAction = ref(null);

// ===== 状态映射 =====
const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待客户审核', type: 'warning' },
  customerAudited: { text: '客户已审核', type: 'primary' },
  factoryPending: { text: '待工厂审核', type: 'warning' },
  audited: { text: '工厂已审核', type: 'primary' },
  producing: { text: '制作中', type: 'warning' },
  completed: { text: '已完成', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' },
};

const statusText = computed(() => {
  return statusMap[orderData.value?.flowStatus]?.text || orderData.value?.flowStatus || '-';
});

const statusTagType = computed(() => {
  return statusMap[orderData.value?.flowStatus]?.type || 'info';
});

// ===== 权限判断 =====
const canEdit = computed(() => {
  const status = orderData.value?.flowStatus;
  const userType = userStore.userType;
  if (userType === 'admin') return true;
  if (userType === 'customer' && (status === 'draft' || status === 'rejected')) return true;
  return false;
});

const canAudit = computed(() => {
  const status = orderData.value?.flowStatus;
  const userType = userStore.userType;
  return userType === 'customerAudit' && status === 'pending';
});

const canSubmitToFactory = computed(() => {
  const status = orderData.value?.flowStatus;
  const userType = userStore.userType;
  return userType === 'factoryOrder' && status === 'customerAudited';
});

const canFactoryAudit = computed(() => {
  const status = orderData.value?.flowStatus;
  const userType = userStore.userType;
  return userType === 'factoryAudit' && status === 'factoryPending';
});

const canMarkUrgent = computed(() => {
  const status = orderData.value?.flowStatus;
  const userType = userStore.userType;
  if (status === 'completed' || status === 'cancelled') return false;
  return userType === 'admin' || userType === 'factoryOrder';
});

const canCancel = computed(() => {
  const status = orderData.value?.flowStatus;
  const userType = userStore.userType;
  if (status === 'completed' || status === 'cancelled') return false;
  return userType === 'admin' || userType === 'customerAudit';
});

// ===== 加载数据 =====
const loadData = async () => {
  if (!orderId.value) return;
  loading.value = true;
  try {
    const res = await getOrderDetail(orderId.value);
    if (res?.data) {
      orderData.value = res.data;
      historyLogs.value = [
        { id: 1, operatorName: '张飞', actionText: '创建订单', remark: '', createdAt: orderData.value?.createdAt },
        { id: 2, operatorName: '系统', actionText: '提交审核', remark: '', createdAt: new Date(Date.now() - 3600000).toISOString() },
      ];
    } else {
      ElMessage.error('订单不存在');
      router.back();
    }
  } catch (error) {
    ElMessage.error(error.message || '加载失败');
    router.back();
  } finally {
    loading.value = false;
  }
};

// ===== 格式工具 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', { hour12: false });
};

// ===== 预览图片 =====
const previewImage = (url) => {
  previewImageUrl.value = url;
  imagePreviewVisible.value = true;
};

// ===== 编辑模式 =====
const toggleEdit = async () => {
  if (isEditing.value) {
    try {
      const res = await updateOrder(orderData.value);
      if (res.success) {
        ElMessage.success('保存成功');
        isEditing.value = false;
        loadData();
      } else {
        ElMessage.error(res.message || '保存失败');
      }
    } catch (error) {
      ElMessage.error(error.message || '保存失败');
    }
  } else {
    isEditing.value = true;
  }
};

// ===== 审核 =====
const handleAudit = (approved) => {
  if (!approved) {
    rejectReason.value = '';
    rejectDialogVisible.value = true;
    pendingAuditAction.value = { type: 'customerAudit', approved: false };
    return;
  }
  doAudit('customerAudit', true, '');
};

const handleFactoryAudit = (approved) => {
  if (!approved) {
    rejectReason.value = '';
    rejectDialogVisible.value = true;
    pendingAuditAction.value = { type: 'factoryAudit', approved: false };
    return;
  }
  doAudit('factoryAudit', true, '');
};

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  rejectLoading.value = true;
  try {
    const action = pendingAuditAction.value;
    if (action) {
      await doAudit(action.type, false, rejectReason.value);
    }
    rejectDialogVisible.value = false;
    rejectReason.value = '';
  } finally {
    rejectLoading.value = false;
  }
};

const doAudit = async (auditType, approved, remark) => {
  try {
    await auditOrder(orderId.value, { approved, remark });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '操作失败');
    throw error;
  }
};

// ===== 提交到工厂 =====
const handleSubmitToFactory = async () => {
  try {
    await ElMessageBox.confirm('确定要将该订单提交到工厂审核吗？', '提示', { type: 'info' });
    await submitToFactory(orderId.value);
    ElMessage.success('已提交到工厂');
    loadData();
  } catch {}
};

// ===== 制作操作 =====
const handleStartProduction = async () => {
  try {
    await ElMessageBox.confirm('确定要开始制作该订单吗？', '提示', { type: 'info' });
    await updateProduction(orderId.value, { status: 'producing', step: 1 });
    ElMessage.success('已开始制作');
    loadData();
  } catch {}
};

const handleCompleteProduction = async () => {
  try {
    await ElMessageBox.confirm('确定要完成该订单的制作吗？', '提示', { type: 'info' });
    await updateProduction(orderId.value, { status: 'completed', step: 10 });
    ElMessage.success('制作完成');
    loadData();
  } catch {}
};

// ===== 标记紧急 =====
const handleToggleUrgent = async () => {
  const isUrgent = !orderData.value?.warnFlag;
  try {
    await markUrgent(orderId.value, isUrgent);
    ElMessage.success(isUrgent ? '已标记紧急' : '已取消紧急标记');
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '操作失败');
  }
};

// ===== 取消订单 =====
const handleCancel = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入取消原因（选填）', '取消订单', {
      confirmButtonText: '确定取消',
      inputType: 'textarea',
      inputPlaceholder: '请输入取消原因',
    });
    await cancelOrder(orderId.value, value || '');
    ElMessage.success('订单已取消');
    loadData();
  } catch {}
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.page-container {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.info-item {
  padding: 8px 0;
}
.info-item .label {
  color: #999;
  font-size: 14px;
}
.info-item .value {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.table-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
}
.table-image:hover {
  transform: scale(1.8);
  z-index: 10;
  position: relative;
}

.log-item {
  font-size: 14px;
}
.log-operator {
  font-weight: 600;
  color: #303133;
}
.log-action {
  margin: 0 4px;
  color: #409EFF;
}
.log-remark {
  color: #909399;
  font-size: 13px;
}

:deep(.el-card__body) {
  padding: 16px 20px;
}
:deep(.el-table .cell) {
  padding: 4px 6px;
}
:deep(.el-input-number) {
  width: 100%;
}
</style>