<!-- src/views/order/detail.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📋 订单详情</h2>
        <el-tag :type="nodeTagType" size="large">{{ currentNodeName }}</el-tag>
        <el-tag v-if="orderData?.warnFlag" type="danger" size="large">⚠️ 紧急</el-tag>
      </div>
      <div class="header-right">
        <!-- ⭐ 动态渲染操作按钮 -->
        <template v-for="action in actions" :key="action.actionKey">
          <el-button 
            :type="action.actionType || 'primary'"
            @click="handleAction(action)"
            :loading="actionLoading"
          >
            {{ action.actionName }}
          </el-button>
        </template>
        <el-button type="primary" @click="showFlowDrawer = true">
          <el-icon><Connection /></el-icon> 查看流程
        </el-button>
      </div>
    </div>

    <!-- ===== 整体内容 ===== -->
    <div class="content-body">
      <!-- ===== 基本信息 ===== -->
      <div class="info-section">
        <div class="section-title">📌 基本信息</div>
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">订单编号</span>
              <span class="value">{{ orderData?.orderNo || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">客户名称</span>
              <span class="value">{{ orderData?.customerName || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">下单日期</span>
              <span class="value">{{ formatDate(orderData?.orderDate) }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">创建时间</span>
              <span class="value">{{ formatDateTime(orderData?.createdAt) }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">业务员</span>
              <span class="value">{{ orderData?.salesman || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">订单状态</span>
              <el-tag :type="nodeTagType" size="default">{{ currentNodeName }}</el-tag>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">紧急标记</span>
              <el-tag v-if="orderData?.warnFlag" type="danger" size="default">⚠️ 紧急</el-tag>
              <span v-else class="value" style="color:#999;">正常</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">工期</span>
              <span class="value">{{ orderData?.deliveryDays || '-' }} 天</span>
            </div>
          </el-col>
        </el-row>
      </div>

      <div class="section-divider"></div>

      <!-- ===== 产品信息（动态渲染字段） ===== -->
      <div class="info-section">
        <div class="section-title">📦 产品信息</div>
        <el-row :gutter="20">
          <el-col 
            v-for="field in visibleFields" 
            :key="field.fieldKey"
            :xs="12" :sm="8" :md="6"
          >
            <div class="info-item">
              <span class="label">{{ field.fieldLabel }}</span>
              <!-- 可编辑字段 -->
              <template v-if="field.isEditable">
                <el-input 
                  v-if="field.fieldKey === 'remark'"
                  v-model="orderData[field.fieldKey]" 
                  size="small" 
                  style="max-width:100%;"
                  placeholder="请输入"
                />
                <el-input-number 
                  v-else-if="['quantity','totalWeight','netWeight','lossRate','goldPrice','goldMaterialFee','laborFee','packingFee'].includes(field.fieldKey)"
                  v-model="orderData[field.fieldKey]" 
                  :precision="field.fieldKey === 'quantity' ? 0 : 3"
                  :min="0"
                  size="small" 
                  style="max-width:120px;"
                />
                <el-select 
                  v-else-if="['color','diamondLevel'].includes(field.fieldKey)"
                  v-model="orderData[field.fieldKey]" 
                  size="small" 
                  style="max-width:120px;"
                >
                  <el-option v-if="field.fieldKey === 'color'" label="K黄" value="K黄" />
                  <el-option v-if="field.fieldKey === 'color'" label="K白" value="K白" />
                  <el-option v-if="field.fieldKey === 'color'" label="红" value="红" />
                  <el-option v-if="field.fieldKey === 'color'" label="P1" value="P1" />
                  <el-option v-if="field.fieldKey === 'color'" label="9K" value="9K" />
                  <el-option v-if="field.fieldKey === 'color'" label="14K" value="14K" />
                  <el-option v-if="field.fieldKey === 'color'" label="银" value="银" />
                  <el-option v-if="field.fieldKey === 'diamondLevel'" label="VS" value="VS" />
                  <el-option v-if="field.fieldKey === 'diamondLevel'" label="VVS" value="VVS" />
                  <el-option v-if="field.fieldKey === 'diamondLevel'" label="培育钻" value="培育钻" />
                  <el-option v-if="field.fieldKey === 'diamondLevel'" label="塔育钻" value="塔育钻" />
                </el-select>
                <el-input 
                  v-else
                  v-model="orderData[field.fieldKey]" 
                  size="small" 
                  style="max-width:150px;"
                />
              </template>
              <!-- 只读字段 -->
              <span v-else class="value">{{ orderData[field.fieldKey] || '-' }}</span>
            </div>
          </el-col>
        </el-row>
      </div>

      <div class="section-divider" v-if="showFactoryFields"></div>

      <!-- ===== 工厂数据（工厂角色可见） ===== -->
      <div class="info-section" v-if="showFactoryFields">
        <div class="section-title">🏭 工厂数据</div>
        <el-row :gutter="20">
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">总重(g)</span>
              <span class="value">{{ orderData?.totalWeight || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">净重(g)</span>
              <span class="value">{{ orderData?.netWeight || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">损耗率</span>
              <span class="value">{{ orderData?.lossRate || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">加耗重</span>
              <span class="value">{{ orderData?.addLossWeight || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">足金料</span>
              <span class="value">{{ orderData?.goldMaterialFee || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">工费</span>
              <span class="value">{{ orderData?.laborFee || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">包装费</span>
              <span class="value">{{ orderData?.packingFee || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">工厂备注</span>
              <span class="value">{{ orderData?.factoryRemark || '-' }}</span>
            </div>
          </el-col>
        </el-row>
      </div>

      <div class="section-divider"></div>

      <!-- ===== 流程记录 ===== -->
      <div class="log-section">
        <div class="section-title">📜 流程记录</div>
        <el-timeline v-if="histories.length > 0">
          <el-timeline-item
            v-for="log in histories"
            :key="log.id"
            :timestamp="log.createdAt"
            placement="top"
            size="small"
          >
            <div class="log-item">
              <span class="log-operator">{{ log.operatorName || '系统' }}</span>
              <span class="log-action">{{ log.actionName }}</span>
              <span v-if="log.remark" class="log-remark">（{{ log.remark }}）</span>
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无流程记录" :image-size="60" />
      </div>
    </div>

    <!-- ===== 流程抽屉 ===== -->
    <el-drawer v-model="showFlowDrawer" title="📊 流程进度" size="500px" destroy-on-close>
      <div class="flow-drawer-content">
        <div class="flow-steps">
          <el-steps direction="vertical" :active="flowStepIndex" finish-status="success">
            <el-step 
              v-for="(step, index) in flowSteps" 
              :key="index"
              :title="step.label"
              :description="step.description"
              :status="index < flowStepIndex ? 'success' : index === flowStepIndex ? 'process' : 'wait'"
            />
          </el-steps>
        </div>
        <div class="flow-history">
          <div class="flow-history-title">操作记录</div>
          <div v-for="log in histories" :key="log.id" class="flow-history-item">
            <span class="history-time">{{ log.createdAt }}</span>
            <span class="history-content">{{ log.operatorName }} {{ log.actionName }}</span>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- ===== 操作弹窗 ===== -->
    <el-dialog v-model="actionDialogVisible" :title="actionDialogTitle" width="450px" destroy-on-close>
      <el-form>
        <el-form-item :label="actionActionKey === 'reject' ? '驳回原因' : '备注'">
          <el-input 
            v-model="actionRemark" 
            type="textarea" 
            :rows="4" 
            :placeholder="actionActionKey === 'reject' ? '请填写驳回原因（必填）' : '请输入备注（选填）'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="actionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAction" :loading="actionLoading">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Connection } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderDetail, updateOrder } from '@/api/order';
import { getNodeConfig, getNodeActions, executeAction, getFlowHistory, getCurrentNode } from '@/api/flow';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const orderId = computed(() => Number(route.params.id));

const loading = ref(false);
const orderData = ref({});
const nodeConfig = ref({});
const actions = ref([]);
const visibleFields = ref([]);
const histories = ref([]);
const flowSteps = ref([]);
const flowStepIndex = ref(0);
const showFlowDrawer = ref(false);
const actionLoading = ref(false);
const actionDialogVisible = ref(false);
const actionDialogTitle = ref('');
const actionActionKey = ref('');
const actionTargetNode = ref('');
const actionRemark = ref('');

// ===== 计算属性 =====
const currentNodeName = computed(() => {
  return nodeConfig.value?.node?.nodeName || orderData.value?.flowStatus || '草稿';
});

const nodeTagType = computed(() => {
  const map = {
    'draft': 'info',
    'pending': 'warning',
    'customer_audited': 'success',
    'factory_edit': 'primary',
    'factory_pending': 'warning',
    'completed': 'success'
  };
  return map[orderData.value?.flowStatus] || 'info';
});

const showFactoryFields = computed(() => {
  const userType = userStore.userType;
  return ['factoryOrder', 'factoryAudit', 'admin'].includes(userType);
});

// ===== 加载数据 =====
const loadData = async () => {
  if (!orderId.value) return;
  loading.value = true;
  try {
    // 1. 获取订单数据
    const orderRes = await getOrderDetail(orderId.value);
    orderData.value = orderRes.data;

    // 2. 获取当前节点信息
    const nodeRes = await getCurrentNode(orderId.value);
    const nodeKey = nodeRes?.data?.nodeKey || orderData.value?.flowStatus || 'draft';
    
    // 3. 获取节点配置
    const configRes = await getNodeConfig('order_flow', nodeKey);
    nodeConfig.value = configRes.data || {};
    visibleFields.value = nodeConfig.value?.fields || [];

    // 4. 获取可执行操作（传入当前节点key）
    const actionRes = await getNodeActions('order_flow', nodeKey);
    actions.value = actionRes.data || [];

    // 5. 获取流程历史
    const historyRes = await getFlowHistory('order_flow', String(orderId.value));
    histories.value = historyRes.data || [];

    // 6. 构建流程步骤（用于抽屉）
    buildFlowSteps(nodeKey);

  } catch (error) {
    console.error('加载失败:', error);
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

// ===== 构建流程步骤 =====
const buildFlowSteps = (currentNode) => {
  const allSteps = [
    { key: 'draft', label: '草稿', description: '客户提交订单' },
    { key: 'pending', label: '待客户审核', description: '客户审核员审核' },
    { key: 'customer_audited', label: '客户已审核', description: '等待工厂接单' },
    { key: 'factory_edit', label: '工厂处理中', description: '工厂业务员处理' },
    { key: 'factory_pending', label: '待工厂审核', description: '工厂审核员审核' },
    { key: 'completed', label: '已完成', description: '订单完成' }
  ];
  
  flowSteps.value = allSteps;
  const idx = allSteps.findIndex(s => s.key === currentNode);
  flowStepIndex.value = idx >= 0 ? idx : 0;
};

// ===== 执行操作 =====
const handleAction = (action) => {
  if (action.actionKey === 'reject' || action.actionKey === 'submit') {
    actionDialogTitle.value = action.actionName;
    actionActionKey.value = action.actionKey;
    actionTargetNode.value = action.toNode;
    actionRemark.value = '';
    actionDialogVisible.value = true;
  } else {
    // 直接执行
    doAction(action.actionKey, action.toNode, '');
  }
};

const confirmAction = async () => {
  if (actionActionKey.value === 'reject' && !actionRemark.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  await doAction(actionActionKey.value, actionTargetNode.value, actionRemark.value);
  actionDialogVisible.value = false;
};

const doAction = async (actionKey, toNode, remark) => {
  actionLoading.value = true;
  try {
    const res = await executeAction({
      flowCode: 'order_flow',
      businessId: String(orderId.value),
      fromNode: orderData.value?.flowStatus || 'draft',
      toNode: toNode,
      actionKey: actionKey,
      remark: remark
    });
    
    if (res.success) {
      ElMessage.success(res.message || '操作成功');
      // 重新加载数据
      await loadData();
    } else {
      ElMessage.error(res.message || '操作失败');
    }
  } catch (error) {
    console.error('操作失败:', error);
    ElMessage.error(error.message || '操作失败');
  } finally {
    actionLoading.value = false;
  }
};

// ===== 格式工具 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${formatDate(date)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.page-container {
  background: #f5f7fa;
  padding: 16px;
  min-height: 100vh;
}

/* ===== 页面头部 ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px 8px 0 0;
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

/* ===== 整体内容区域 ===== */
.content-body {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 20px 24px;
}

/* ===== 分割线 ===== */
.section-divider {
  height: 1px;
  background: #e8ecf1;
  margin: 20px 0;
}

/* ===== 区域标题 ===== */
.section-title {
  font-weight: 600;
  font-size: 15px;
  color: #1d2129;
  margin-bottom: 14px;
}

/* ===== 信息项 ===== */
.info-item {
  padding: 6px 0;
}
.info-item .label {
  display: block;
  font-size: 13px;
  color: #909399;
  margin-bottom: 2px;
}
.info-item .value {
  display: block;
  font-size: 14px;
  color: #303133;
  font-weight: 500;
  word-break: break-all;
}

/* ===== 图片 ===== */
.image-group {
  background: #f7f8fa;
  border-radius: 6px;
  padding: 12px;
  min-height: 80px;
}
.image-group-label {
  font-size: 13px;
  font-weight: 500;
  color: #4e5969;
  margin-bottom: 8px;
}
.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.detail-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
  object-fit: cover;
  border: 1px solid #e8ecf1;
}
.detail-image:hover {
  transform: scale(1.05);
}

/* ===== 底部操作栏 ===== */
.action-bar {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 12px 24px;
  margin-top: 0;
  border-top: 1px solid #e8ecf1;
}
.action-bar-inner {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.action-label {
  font-weight: 600;
  font-size: 14px;
  color: #1d2129;
}
.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .page-container {
    padding: 8px;
  }
  .content-body {
    padding: 12px 16px;
  }
  .page-header {
    padding: 12px 16px;
  }
  .detail-image {
    width: 60px;
    height: 60px;
  }
  .action-bar {
    padding: 12px 16px;
  }
  .action-bar-inner {
    flex-direction: column;
    align-items: stretch;
  }
  .action-buttons {
    justify-content: flex-start;
  }
}
</style>