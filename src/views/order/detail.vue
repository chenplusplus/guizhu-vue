<!-- src/views/order/detail.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()" size="small">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📋 订单详情</h2>
        <el-tag :type="statusTagType" size="small">{{ statusText }}</el-tag>
        <el-tag v-if="orderData?.warnFlag" type="danger" size="small">❗ 注意</el-tag>
        <el-tag v-if="orderData?.urgentFlag" type="warning" size="small">🔥 加急</el-tag>
        <el-tag v-if="orderData?.modifyTracking" type="info" size="small">✏️ 修改追踪中</el-tag>
      </div>
      <div class="header-right">
        <el-button v-if="canWithdraw" type="warning" size="small" @click="handleWithdraw">
          撤回审核
        </el-button>
        <!-- ⭐ 工厂操作员：工厂流转阶段 + 制作完成（含待审核）可编辑 -->
        <el-button v-if="canFactoryEdit" type="primary" size="small" @click="goFactoryEdit">
          ✏️ 编辑
        </el-button>
        <!-- ⭐ 客户已审核通过、进入工厂环节后，改动需申请修改 -->
        <el-button v-if="canApplyModify" type="warning" size="small" @click="handleApplyModify">
          申请修改
        </el-button>
        <!-- ⭐ 取消订单 -->
        <el-button v-if="canApplyCancel" type="danger" size="small" @click="handleApplyCancel">
          ⛔ 取消
        </el-button>
        <!-- ⭐ 客户申请暂停 / 申请恢复（审核员审批） -->
        <el-button v-if="canApplyPause" type="warning" size="small" @click="handleApplyPause">
          ⏸ 申请暂停
        </el-button>
        <el-button v-if="canRequestRestore" type="success" size="small" @click="handleRequestRestore">
          ▶ 申请恢复
        </el-button>
        <el-button v-if="canWithdrawCancelApply" type="info" size="small" plain @click="handleWithdrawCancelApply">
          撤回取消申请
        </el-button>
        <!-- ⭐ 客户审核员：审批取消 -->
        <template v-if="canAuditCancel">
          <el-button type="success" size="small" @click="handleAuditCancel(true)">同意取消</el-button>
          <el-button type="danger" size="small" plain @click="handleAuditCancel(false)">驳回取消</el-button>
        </template>
        <el-button
          v-if="canConfirmModify"
          type="success"
          size="small"
          @click="handleConfirmModify"
        >
          ✓ 确认修改生效
        </el-button>
        <el-button size="small" @click="flowDrawerVisible = true">🕐 流程记录</el-button>
      </div>
    </div>

    <!-- ===== 内容区域 ===== -->
    <div class="content-body">
      <!-- ===== 工厂暂停中提示 ===== -->
      <el-alert
        v-if="orderData?.flowStatus === 'paused'"
        type="warning"
        :closable="false"
        show-icon
        class="pause-banner"
      >
        <template #title>
          ⏸ 订单暂停中（{{ orderData?.pauseOwner === 'customer' ? '客户申请暂停，等客户方申请恢复' : '等工厂恢复生产' }}）
        </template>
        <div class="pause-banner-body">
          <span>暂停前工序：<b>{{ orderData?.pauseOriginStatusText || '—' }}</b></span>
          <span>暂停时间：<b>{{ formatDateTime(orderData?.pausedAt) }}</b></span>
          <span v-if="orderData?.pauseReason || orderData?.pauseReqReason">原因：{{ orderData.pauseReason || orderData.pauseReqReason }}</span>
          <span v-if="orderData?.pauseOwner === 'customer'" class="pause-banner-tip">如需继续，请点上方「▶ 申请恢复」并由客户审核员审批</span>
          <span v-else class="pause-banner-tip">如需取消，请先让工厂恢复生产</span>
        </div>
      </el-alert>

      <!-- ===== 预警提示 ===== -->
      <div v-if="warnings.length > 0" class="warning-section">
        <el-alert
          v-for="(warning, index) in warnings"
          :key="index"
          :title="warning"
          type="warning"
          :closable="false"
          show-icon
          style="margin-bottom: 6px;"
        />
      </div>

      <!-- ===== 基本信息 + 产品信息（表格形式） ===== -->
      <div class="info-section">
        <h4 class="detail-block-title">基本信息</h4>
        <el-table :data="[orderData]" border size="small" class="detail-table">
          <el-table-column prop="orderNo" label="订单编号" min-width="170" />
          <el-table-column prop="customerName" label="客户名称" min-width="140" />
          <el-table-column prop="salesman" label="业务员" min-width="100" />
          <el-table-column label="下单日期" min-width="120">
            <template #default="{ row }">{{ formatDate(row.orderDate) }}</template>
          </el-table-column>
          <el-table-column label="创建时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="状态" min-width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTagType" size="small">{{ statusText }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="网址" min-width="120">
            <template #default="{ row }">
              <a v-if="row.url" :href="row.url" target="_blank" class="url-link">查看链接</a>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        </el-table>

        <h4 class="detail-block-title">产品信息</h4>
        <el-table :data="[orderData]" border size="small" class="detail-table">
          <el-table-column prop="productName" label="品名" min-width="120" />
          <el-table-column label="成色" min-width="110">
            <template #default="{ row }">
              <span class="purity-cell">
                <span class="color-dot" :style="{ background: currentPurityColor }"></span>
                {{ row.purityLabel || row.color || '-' }}
                <span v-if="currentPurityRate !== null && !row.purityLabel" class="purity-rate">（折算率 {{ currentPurityRate.toFixed(3) }}）</span>
              </span>
            </template>
          </el-table-column>
          <el-table-column label="颜色" min-width="90">
            <template #default="{ row }">{{ resolveGemColor(row) || '-' }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" min-width="70" align="center" />
          <el-table-column prop="size" label="手寸/长度" min-width="100" />
          <el-table-column prop="widthThick" label="宽/厚度" min-width="90" />
          <el-table-column prop="weightRequirement" label="克重要求" min-width="110" />
          <el-table-column prop="diamondLevel" label="钻石级别" min-width="100" />
          <el-table-column prop="logoText" label="LOGO文字" min-width="120" />
          <el-table-column label="工期(天)" min-width="90" align="center">
            <template #default="{ row }">{{ row.deliveryDays || '-' }}</template>
          </el-table-column>
          <el-table-column label="金额" min-width="120">
            <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <!-- ===== 数据包 ===== -->
      <div v-if="dataPackages.length > 0" class="info-section" style="margin-top:16px;">
        <h4 class="detail-block-title">📦 数据包</h4>
        <el-table :data="dataPackages" border size="small">
          <el-table-column prop="fileName" label="文件名" min-width="220" show-overflow-tooltip />
          <el-table-column label="大小" width="120" align="center">
            <template #default="{ row }">{{ row.fileSize ? (row.fileSize / 1024 / 1024).toFixed(2) + ' MB' : '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button type="primary" size="small" link @click="downloadFile(row.fileUrl || row.url, row.fileName)">下载</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- ===== 图片附件 ===== -->
      <div v-if="hasImages" class="image-section">
        <div class="section-divider"></div>

        <!-- 产品图片 -->
        <div v-if="productImages.length" class="image-group">
          <div class="image-group-label">
            产品图片
            <span class="badge">{{ productImages.length }}</span>
          </div>
          <div class="image-list">
            <el-image
              v-for="(img, i) in productImages"
              :key="img.id || i"
              :src="img.imageUrl"
              fit="cover"
              class="detail-image"
              :preview-src-list="productImages.map(x => x.imageUrl)"
              :initial-index="i"
              preview-teleported
            />
          </div>
        </div>

        <!-- 数据图 -->
        <div v-if="dataImages.length" class="image-group">
          <div class="image-group-label">
            数据图
            <span class="badge">{{ dataImages.length }}</span>
          </div>
          <div class="image-list">
            <el-image
              v-for="(img, i) in dataImages"
              :key="img.id || i"
              :src="img.imageUrl"
              fit="cover"
              class="detail-image"
              :preview-src-list="dataImages.map(x => x.imageUrl)"
              :initial-index="i"
              preview-teleported
            />
          </div>
        </div>

        <!-- 字印相关 -->
        <div v-if="letterImages.length || letterRefImages.length" class="image-group">
          <div class="image-group-label">
            字印相关
            <span v-if="letterImages.length" class="badge badge-blue">要求图 {{ letterImages.length }}</span>
            <span v-if="letterRefImages.length" class="badge badge-orange">参考图 {{ letterRefImages.length }}</span>
          </div>
          <div class="image-list">
            <el-image
              v-for="(img, i) in letterImages"
              :key="'l-' + (img.id || i)"
              :src="img.imageUrl"
              fit="cover"
              class="detail-image letter-img"
              :preview-src-list="[...letterImages, ...letterRefImages].map(x => x.imageUrl)"
              :initial-index="i"
              preview-teleported
            />
            <el-image
              v-for="(img, i) in letterRefImages"
              :key="'lr-' + (img.id || i)"
              :src="img.imageUrl"
              fit="cover"
              class="detail-image letter-ref-img"
              :preview-src-list="[...letterImages, ...letterRefImages].map(x => x.imageUrl)"
              :initial-index="letterImages.length + i"
              preview-teleported
            />
          </div>
        </div>

        <!-- 兼容旧数据 -->
        <div
          v-if="!productImages.length && !dataImages.length && !letterImages.length && !letterRefImages.length
                && (orderData?.imageUrl || orderData?.dataImageUrl || orderData?.letterImageUrl)"
          class="image-group"
        >
          <div class="image-group-label">旧版本图片</div>
          <div class="image-list">
            <el-image v-if="orderData?.imageUrl" :src="orderData.imageUrl" fit="cover" class="detail-image" :preview-src-list="[orderData.imageUrl]" preview-teleported />
            <el-image v-if="orderData?.dataImageUrl" :src="orderData.dataImageUrl" fit="cover" class="detail-image" :preview-src-list="[orderData.dataImageUrl]" preview-teleported />
            <el-image v-if="orderData?.letterImageUrl" :src="orderData.letterImageUrl" fit="cover" class="detail-image" :preview-src-list="[orderData.letterImageUrl]" preview-teleported />
          </div>
        </div>
      </div>

      <!-- ===== 待处理的修改申请（新链路） ===== -->
     <div
       v-if="orderData?.modifyTracking === true
             || orderData?.modifyStatus === 'pendingAudit'
             || orderData?.modifyStatus === 'pendingFactoryAudit'"
       class="pending-modify-section"
     >
  <div class="modify-log-title">
    ✏️ {{ getModifyStatusText(orderData) }}
    <el-tag :type="orderData.modifyStatus === 'pendingAudit' || orderData.modifyStatus === 'pendingFactoryAudit' ? 'warning' : 'primary'" size="small">
      {{ getModifyStatusText(orderData) }}
    </el-tag>
  </div>

  <div v-if="orderData.modifyReason" class="modify-reason">
    <span class="modify-reason-label">申请原因：</span>
    <span>{{ orderData.modifyReason }}</span>
  </div>

  <div v-if="pendingDiffs.length > 0" class="change-list">
    <div v-for="(d, i) in pendingDiffs" :key="i" class="change-row">
      <span class="modify-log-field">{{ d.fieldLabel }}</span>
      <span class="modify-log-old">{{ d.oldValue || '空' }}</span>
      <el-icon><Right /></el-icon>
      <span class="modify-log-new">{{ d.newValue || '空' }}</span>
    </div>
  </div>

  <div style="margin-top: 12px; display: flex; gap: 8px;">
    <template v-if="canApproveModify">
      <el-button type="success" size="small" @click="handleAuditModify(true)">同意修改</el-button>
      <el-button type="danger" size="small" @click="handleAuditModify(false)">驳回</el-button>
    </template>
    <el-button
      v-if="canWithdrawModify"
      type="warning" size="small" plain
      @click="handleWithdrawModify"
    >
      撤回申请
    </el-button>
  </div>
</div>

      <!-- ===== 关联账单 ===== -->
      <div v-if="orderData?.billId" class="bill-info-section">
        <div class="bill-info-title">📋 关联账单</div>
        <div class="bill-info-row">
          <span class="bill-info-label">账单号：</span>
          <el-link type="primary" @click.stop="viewBill(orderData.billId)">
            {{ orderData.billNo || orderData.billId }}
          </el-link>
        </div>
        <div class="bill-info-row">
          <span class="bill-info-label">账单状态：</span>
          <el-tag :type="getBillStatusType(orderData.billStatus)" size="small">
            {{ getBillStatusText(orderData.billStatus) }}
          </el-tag>
        </div>
        <div v-if="orderData.billTotalAmount != null" class="bill-info-row">
          <span class="bill-info-label">账单金额：</span>
          <span>¥ {{ orderData.billTotalAmount.toFixed(2) }}</span>
        </div>
      </div>

      <!-- ===== 修改记录（字段级改动明细；仅撤回/同意修改后重提期间的改动） ===== -->
      <div class="modify-log-section" v-if="changeLogs.length > 0">
        <div class="modify-log-title">📝 修改记录</div>
        <el-timeline>
          <el-timeline-item
            v-for="(log, idx) in changeLogs"
            :key="log.id || idx"
            :timestamp="formatDateTime(log.createdAt)"
            placement="top"
          >
            <div class="modify-log-item">
              <div class="modify-log-meta">
                <span class="modify-log-user">{{ log.operatorName || '-' }}</span>
                <span class="modify-log-role">{{ log.operatorRole || '' }}</span>
                <span class="modify-log-op">修改订单</span>
              </div>
              <div class="change-list">
                <div v-for="(c, i) in log.changeList" :key="i" class="change-row">
                  <span class="modify-log-field">{{ c.label }}</span>
                  <span class="modify-log-old">{{ c.old }}</span>
                  <el-icon><Right /></el-icon>
                  <span class="modify-log-new">{{ c.new }}</span>
                </div>
              </div>
              <div class="modify-log-remark" v-if="log.remark">{{ log.remark }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>

      <!-- ===== 流程抽屉（含申请修改/同意修改事件） ===== -->
      <FlowDrawer
        v-model="flowDrawerVisible"
        :order-id="orderId"
        :order-no="orderData?.orderNo || ''"
        :current-status="orderData?.flowStatus || ''"
        @refresh="loadData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Right } from '@element-plus/icons-vue';
import { getOrderDetail, getOrderLogs, withdrawSubmit, getOrderModifyDiff, auditOrderModify, withdrawOrderModify, applyOrderModify, confirmOrderModify, applyCancel, auditCancel, applyPause, requestRestore, withdrawCancel } from '@/api/order';
import { getValueChangeLogs } from '@/api/valueChangeLog';
import { dictApi } from '@/api/dict';
import { useUserStore } from '@/stores/user';
import FlowDrawer from '@/components/FlowDrawer.vue';
import { resolveGemColor } from '@/utils/color';

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();

const orderId = computed(() => Number(route.params.id));
const loading = ref(false);
const orderData = ref({});
const purityDict = ref([]);
const changeLogs = ref([]);
const pendingDiffs = ref([]);
const flowDrawerVisible = ref(false);

// ===== 当前用户角色 =====
const isCustomer = computed(() => userStore.userType === 'customer');
const isCustomerAudit = computed(() => userStore.userType === 'customerAudit');
const isFactoryOrder = computed(() => userStore.userType === 'factoryOrder');
const isFactoryAudit = computed(() => userStore.userType === 'factoryAudit');
const isAdmin = computed(() => userStore.userType === 'admin');

// ⭐ 工厂可编辑阶段（跟后端 FlowStatus.FactoryEditableStatuses 对齐）
const FACTORY_EDITABLE = [
  'customeraudited', 'factory_edit', 'dataConfirm', 'waxing', 'molded', 'cnc', 'partsMissing',
  'sweeping', 'stoneCutting', 'microInlay', 'handInlay', 'assembly', 'polishing', 'paused', 'stoneReady', 'glue', 'inlay', 'billRejected'
];

// ⭐ 工厂操作员可编辑订单主体的状态（与后端 FlowStatus.IsFactoryOrderEditable 对齐）
//    制作完成（含已提交待审核）也放开：审核通过前允许改
const FACTORY_ORDER_EDITABLE = [...FACTORY_EDITABLE, 'productionCompleted'];
const canFactoryEdit = computed(() =>
  (isFactoryOrder.value || isAdmin.value)
  && FACTORY_ORDER_EDITABLE.includes(orderData.value?.flowStatus)
);
const goFactoryEdit = () => router.push(`/order/factory-edit/${orderId.value}`);

const canApplyModify = computed(() =>
  isCustomer.value
  && Number(orderData.value?.submittedBy) === Number(userStore.userId)
  && FACTORY_EDITABLE.includes(orderData.value?.flowStatus)
  && orderData.value?.modifyTracking !== true
);

// ===== 取消订单 =====
const CANCEL_FINAL = ['completed', 'cancelled', 'scrapped', 'unqualifiedReturn', 'paused'];
const canApplyCancel = computed(() =>
  isCustomer.value
  && Number(orderData.value?.submittedBy) === Number(userStore.userId)
  && orderData.value?.flowStatus
  && !CANCEL_FINAL.includes(orderData.value?.flowStatus)
  && (!orderData.value?.pauseStatus || orderData.value?.pauseStatus === 'none')
);

const canAuditCancel = computed(() =>
  (isCustomerAudit.value || isAdmin.value)
  && ['pendingCustomerAudit', 'pendingFactoryConfirm'].includes(orderData.value?.pauseStatus)
  && !orderData.value?.pauseAuditAt
);

// ⭐ 客户申请暂停：工厂已接单之后、未暂停、无取消申请在走
const canApplyPause = computed(() =>
  isCustomer.value
  && Number(orderData.value?.submittedBy) === Number(userStore.userId)
  && orderData.value?.flowStatus
  && !CANCEL_FINAL.includes(orderData.value?.flowStatus)
  && !['draft', 'pending', 'rejected'].includes(orderData.value?.flowStatus)
  && (!orderData.value?.pauseStatus || orderData.value?.pauseStatus === 'none')
  && (!orderData.value?.pauseReqStatus || orderData.value?.pauseReqStatus === 'none' || orderData.value?.pauseReqStatus === 'rejected')
);

// ⭐ 客户申请恢复：客户申请暂停的单，审批通过后由客户发起恢复
const canRequestRestore = computed(() =>
  isCustomer.value
  && Number(orderData.value?.submittedBy) === Number(userStore.userId)
  && orderData.value?.flowStatus === 'paused'
  && orderData.value?.pauseReqStatus === 'approved'
);

// ⭐ 撤回取消申请：客户审核员审批前
const canWithdrawCancelApply = computed(() =>
  isCustomer.value
  && Number(orderData.value?.submittedBy) === Number(userStore.userId)
  && orderData.value?.pauseStatus === 'pendingCustomerAudit'
  && !orderData.value?.pauseAuditAt
);

const canApproveModify = computed(() =>
  ((isCustomerAudit.value || isAdmin.value) && orderData.value?.modifyStatus === 'pendingAudit')
  || ((isFactoryAudit.value || isAdmin.value) && orderData.value?.modifyStatus === 'pendingFactoryAudit')
);

const canWithdrawModify = computed(() =>
  isCustomer.value
  && Number(orderData.value?.submittedBy) === Number(userStore.userId)
  && ['pendingAudit', 'pendingFactoryAudit'].includes(orderData.value?.modifyStatus)
);

// ⭐ 工厂操作员：追踪中 + 发起时是工厂/账单阶段 → 可确认生效
const canConfirmModify = computed(() =>
  isFactoryOrder.value
  && orderData.value?.modifyTracking === true
  && (orderData.value?.modifyOriginStage === 'factory'
      || orderData.value?.modifyOriginStage === 'bill')
);

const getModifyStatusText = (order) => {
  if (order.modifyStatus === 'pendingFactoryAudit') return '待工厂审核员审批';
  if (order.modifyStatus === 'pendingAudit') return '待客户审核员审批';
  if (!order.modifyTracking) return '修改追踪中';
  if (order.flowStatus === 'draft') return '等待客户重新编辑';
  if (order.flowStatus === 'pending') return '等待客户审核';
  return order.modifyOriginStage === 'preFactory'
    ? '等待客户重新编辑'
    : '等待工厂确认';
};

const handleConfirmModify = async () => {
  try {
    await ElMessageBox.confirm(
      '确认后该修改将生效，订单号不再标记。',
      '确认修改生效',
      { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' }
    );
    await confirmOrderModify(orderId.value);
    ElMessage.success('已确认');
    loadData();
    loadLogs();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const handleAuditModify = async (approved) => {
  if (!orderData.value?.modifyRequestId) {
    ElMessage.error('修改申请ID不存在');
    return;
  }
  try {
    if (!approved) {
      const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回修改', {
        inputValidator: v => v?.trim() ? true : '请输入驳回原因'
      });
      await auditOrderModify(orderData.value.modifyRequestId, { approved: false, remark: value });
      ElMessage.success('已驳回');
    } else {
      await ElMessageBox.confirm('同意后订单将退回草稿，客户可重新编辑并提交。', '同意修改', { type: 'warning' });
      await auditOrderModify(orderData.value.modifyRequestId, { approved: true, remark: '同意修改' });
      ElMessage.success('已同意，订单已退回草稿');
    }
    loadData();
    loadLogs();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const handleWithdrawModify = async () => {
  if (!orderData.value?.modifyRequestId) return;
  try {
    await ElMessageBox.confirm('确定撤回修改申请吗？', '撤回', { type: 'warning' });
    await withdrawOrderModify(orderData.value.modifyRequestId);
    ElMessage.success('已撤回');
    loadData();
    loadLogs();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '撤回失败');
  }
};
const canWithdraw = computed(() => isCustomer.value
  && orderData.value?.flowStatus === 'pending'
  && Number(orderData.value?.submittedBy) === Number(userStore.userId));

// ===== 修改记录（字段级改动明细，来自 value_change_logs） =====
// ===== 账单状态显示 =====
// ⭐ 订单上反写的 billStatus：兼容驼峰（billConfirmed）和下划线（bill_confirmed）两种历史写法
const getBillStatusText = (status) => {
  const map = {
    pending: '待提交', bill_pending: '待审核', billPending: '待审核',
    bill_confirmed: '待客户审核', billConfirmed: '待客户审核',
    customer_approved: '待业务确认', customerApproved: '待业务确认',
    bill_rejected: '审核驳回', billRejected: '审核驳回',
    confirmed: '已确认', approved: '已审批', rejected: '已驳回',
    returned: '已退回', completed: '已完成', cancelled: '已取消'
  };
  return status ? (map[status] || status) : '-';
};
const getBillStatusType = (status) => {
  const map = {
    pending: 'warning', bill_pending: 'warning', billPending: 'warning',
    bill_confirmed: 'warning', billConfirmed: 'warning',
    customer_approved: 'primary', customerApproved: 'primary',
    bill_rejected: 'danger', billRejected: 'danger',
    confirmed: 'success', approved: 'success', rejected: 'danger',
    returned: 'danger', completed: 'success', cancelled: 'info'
  };
  return status ? (map[status] || 'info') : 'info';
};

const viewBill = (billId) => {
  router.push(`/order/bill/detail/${billId}`);
};

// 字段标签：与后端 ChangeLogHelper.OrderFieldLabels 对应
const CHANGE_FIELD_LABELS = {
  salesman: '业务员', orderDate: '订单日期', imageUrl: '产品图片', dataImageUrl: '数据图',
  letterImageUrl: '字印要求图', productName: '品名', quantity: '数量', color: '成色',
  gemColor: '颜色', purityId: '成色ID', diamondLevel: '钻石级别', params: '参数', amount: '金额',
  logoUrl: 'LOGO图片', size: '手寸', widthThick: '宽/厚度', weightRequirement: '克重要求',
  logoText: 'LOGO文字', url: '网址', remark: '备注', deliveryDays: '工期', warnFlag: '预警',
  urgentFlag: '加急', totalAmount: '总金额', goldMaterialFee: '足金料', laborFee: '工费',
  moldFee: '版费', totalWeight: '总重', netWeight: '净重', lossRate: '损耗率',
  addLossWeight: '加耗重', goldPrice: '金价', mainStoneAmount: '主石金额', subStoneAmount: '副石金额',
  packingFee: '包装费', certificateFee: '证书费', postageFee: '邮费', costPrice: '内部成本',
  profit: '利润', mainStoneQty: '主石粒数', mainStoneWeight: '主石重量', mainStonePrice: '主石单价',
  mainStoneSettingFee: '主石镶石工费', subStoneQty: '副石粒数', subStoneWeight: '副石重量',
  subStonePrice: '副石单价', subStoneSettingFee: '副石镶石工费',
};

const formatChangeVal = (v) => {
  if (v === true) return '是';
  if (v === false) return '否';
  if (v === null || v === undefined || v === '') return '空';
  return String(v);
};

const loadLogs = async () => {
  if (!orderId.value) return;
  try {
    const res = await getValueChangeLogs('order', String(orderId.value));
    const items = res?.data || [];
    changeLogs.value = items.map(log => {
      const changes = log.changes || {};
      const changeList = Object.keys(changes).map(k => ({
        label: CHANGE_FIELD_LABELS[k] || k,
        old: formatChangeVal(changes[k]?.old),
        new: formatChangeVal(changes[k]?.new),
      }));
      return {
        id: `change-${log.id}`,
        createdAt: log.createdAt,
        operatorName: log.operatorName,
        operatorRole: log.operatorRole,
        remark: log.remark,
        changeList,
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch {
    changeLogs.value = [];
  }
};

const handleApplyModify = async () => {
  const beforeFactoryAcceptance = orderData.value?.flowStatus === 'customeraudited';
  try {
    const { value } = await ElMessageBox.prompt(
      beforeFactoryAcceptance
        ? '请填写申请修改的原因（提交后由工厂审核员审批，同意后可重新编辑并重新提交）'
        : '请填写申请修改的原因（提交后由客户审核员审批，同意后订单退回草稿可重新编辑）',
      '申请修改',
      {
        confirmButtonText: '提交申请',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '例如：需要更改克重要求 / 钻石级别',
        inputValidator: v => v?.trim() ? true : '请填写原因'
      }
    );
    if (!value || !value.trim()) return;

    await applyOrderModify(orderId.value, {
      data: {},
      reason: value.trim()
    });
    ElMessage.success(beforeFactoryAcceptance
      ? '修改申请已提交，等待工厂审核员审批'
      : '修改申请已提交，等待客户审核员审批');
    loadData();
    loadLogs();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '提交失败');
  }
};

// ===== 取消订单 =====
const handleApplyCancel = async () => {
  const status = orderData.value?.flowStatus;
  const directCancel = ['draft', 'pending', 'rejected'].includes(status);
  const tip = directCancel
    ? '该订单尚未进入工厂，取消后将直接终止（不可恢复），确认继续？'
    : status === 'customeraudited'
      ? '该订单客户已审核、工厂尚未接单，提交取消申请后由客户审核员审批，同意即终止。'
      : '该订单工厂已接单，提交取消申请后需客户审核员审批、工厂确认，确认即终止。';
  try {
    const { value } = await ElMessageBox.prompt(tip, '取消订单', {
      confirmButtonText: directCancel ? '确认取消' : '提交取消申请',
      cancelButtonText: '再想想',
      inputType: 'textarea',
      inputPlaceholder: '请填写取消原因',
      inputValidator: v => v?.trim() ? true : '请填写取消原因'
    });
    if (!value || !value.trim()) return;

    const res = await applyCancel(orderId.value, value.trim());
    ElMessage.success(res?.data?.message || (directCancel ? '订单已取消' : '取消申请已提交'));
    loadData();
    loadLogs();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

// ===== 客户申请暂停 / 恢复 / 撤回取消 =====
const handleApplyPause = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      '暂停后工厂无法继续推进，需客户审核员审批；恢复也要由我们提交恢复申请。请填写暂停原因：',
      '申请暂停',
      {
        confirmButtonText: '提交申请', cancelButtonText: '取消',
        inputType: 'textarea', inputPlaceholder: '如：客户改款，等确认后再做',
        inputValidator: v => v?.trim() ? true : '请填写暂停原因'
      }
    );
    if (!value || !value.trim()) return;
    const res = await applyPause(orderId.value, value.trim());
    ElMessage.success(res?.data?.message || '暂停申请已提交');
    loadData();
    loadLogs();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '提交失败');
  }
};

const handleRequestRestore = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请填写恢复原因', '申请恢复生产', {
      confirmButtonText: '提交申请', cancelButtonText: '取消',
      inputType: 'textarea', inputPlaceholder: '如：款式已确认，可以继续做'
    });
    await requestRestore(orderId.value, (value || '').trim());
    ElMessage.success('恢复申请已提交，等待客户审核员审批');
    loadData();
    loadLogs();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '提交失败');
  }
};

const handleWithdrawCancelApply = async () => {
  try {
    await ElMessageBox.confirm('撤回后订单恢复正常流转，确定撤回取消申请吗？', '撤回取消申请', { type: 'warning' });
    await withdrawCancel(orderId.value);
    ElMessage.success('已撤回取消申请');
    loadData();
    loadLogs();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '撤回失败');
  }
};

const handleAuditCancel = async (approved) => {  try {
    if (approved) {
      const isFactoryStage = orderData.value?.pauseStatus === 'pendingFactoryConfirm'
        || orderData.value?.cancelNeedFactoryConfirm === true;
      await ElMessageBox.confirm(
        isFactoryStage
          ? '同意后取消申请将转给工厂确认，工厂确认后订单终止。确认同意？'
          : '同意后订单将直接终止（不可恢复）。确认同意？',
        '同意取消',
        { type: 'warning', confirmButtonText: '确认同意', cancelButtonText: '再想想' }
      );
      await auditCancel(orderId.value, { approved: true, remark: '同意取消' });
      ElMessage.success('已同意取消申请');
    } else {
      const { value } = await ElMessageBox.prompt('请填写驳回原因', '驳回取消', {
        inputType: 'textarea',
        confirmButtonText: '确认驳回',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入驳回原因',
        inputValidator: v => v?.trim() ? true : '请输入驳回原因'
      });
      await auditCancel(orderId.value, { approved: false, remark: value.trim() });
      ElMessage.success('已驳回取消申请');
    }
    loadData();
    loadLogs();
  } catch (e) {
    if (e !== 'cancel' && e?.name !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const handleWithdraw = async () => {
  try {
    await ElMessageBox.confirm('撤回后订单会回到草稿状态，可以修改后重新提交。', '撤回审核', {
      confirmButtonText: '确认撤回',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await withdrawSubmit(orderId.value);
    ElMessage.success('订单已撤回，可修改后重新提交');
    loadData();
    loadLogs();
  } catch {
    return;
  }
};



// ===== 状态映射（全量） =====
const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待客户审核', type: 'warning' },
  customeraudited: { text: '待接单', type: 'success' },
  factory_edit: { text: '工厂编辑中', type: 'primary' },
  dataConfirm: { text: '数据确认', type: 'primary' },
  waxing: { text: '出蜡', type: 'primary' },
  molded: { text: '已倒模', type: 'primary' },
  cnc: { text: 'CNC', type: 'primary' },
  partsMissing: { text: '配件缺失', type: 'warning' },
  stoneReady: { text: '配石完成', type: 'primary' },
  setting: { text: '执模', type: 'primary' },
  glue: { text: '滴胶/磨石', type: 'primary' },
  inlay: { text: '镶嵌', type: 'primary' },
  assembly: { text: '组装', type: 'primary' },
  polishing: { text: '抛光', type: 'primary' },
  sweeping: { text: '扫镶口', type: 'primary' },
  stoneCutting: { text: '车石', type: 'primary' },
  microInlay: { text: '微镶', type: 'primary' },
  handInlay: { text: '手镶', type: 'primary' },
  productionCompleted: { text: '制作完成', type: 'warning' },
  billPending: { text: '账单待审核', type: 'warning' },
  billRejected: { text: '账单驳回', type: 'danger' },
  billConfirmed: { text: '待确认', type: 'success' },
  completed: { text: '已完成', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' },
  scrapped: { text: '报废', type: 'danger' },
  unqualifiedReturn: { text: '不合格退回', type: 'danger' },
  paused: { text: '已暂停', type: 'warning' },
};

const statusText = computed(() => {
  const status = orderData.value?.flowStatus || 'draft';
  return statusMap[status]?.text || status;
});

const statusTagType = computed(() => {
  const status = orderData.value?.flowStatus || 'draft';
  return statusMap[status]?.type || 'info';
});

// ===== 图片分组 =====
const productImages = computed(() =>
  (orderData.value?.images || []).filter(x => x.imageType === 'product')
);
const dataImages = computed(() =>
  (orderData.value?.images || []).filter(x => x.imageType === 'data')
);
const letterImages = computed(() =>
  (orderData.value?.images || []).filter(x => x.imageType === 'letter')
);
const letterRefImages = computed(() =>
  (orderData.value?.images || []).filter(x => x.imageType === 'letter_ref')
);

const dataPackages = computed(() => orderData.value?.dataPackages || []);

const hasImages = computed(() => {
  return productImages.value.length > 0
    || dataImages.value.length > 0
    || letterImages.value.length > 0
    || letterRefImages.value.length > 0
    || !!(orderData.value?.imageUrl || orderData.value?.dataImageUrl || orderData.value?.letterImageUrl);
});

// ===== 成色颜色 =====
const currentPurityColor = computed(() => {
  if (orderData.value?.purityId) {
    const item = purityDict.value.find(x => x.id === orderData.value.purityId);
    if (item) {
      try {
        const extra = item.extraData ? JSON.parse(item.extraData) : {};
        if (extra.color) return extra.color;
      } catch {}
    }
  }
  const label = (orderData.value?.color || '').trim();
  if (label) {
    const item = purityDict.value.find(x => x.itemLabel === label);
    if (item) {
      try {
        const extra = item.extraData ? JSON.parse(item.extraData) : {};
        if (extra.color) return extra.color;
      } catch {}
    }
  }
  return '#DCDFE6';
});

// ===== 成色折算率 =====
const currentPurityRate = computed(() => {
  if (orderData.value?.purityId) {
    const item = purityDict.value.find(x => x.id === orderData.value.purityId);
    if (item) return Number(item.itemValue);
  }
  const label = (orderData.value?.color || '').trim();
  if (label) {
    const item = purityDict.value.find(x => x.itemLabel === label);
    if (item) return Number(item.itemValue);
  }
  return null;
});

// ===== 预警提示 =====
const warnings = computed(() => {
  const list = [];
  const data = orderData.value;
  if (!data) return list;

  if (data.deliveryDays && data.deliveryDays <= 3) {
    list.push(`⏰ 工期仅剩 ${data.deliveryDays} 天，请尽快处理！`);
  }

  if (data.urgentFlag) {
    list.push('🚨 该订单已被标记为紧急订单，请优先处理！');
  }

  if (data.warnFlag) {
    const reason = data.alertReason ? `（${data.alertReason}）` : '';
    list.push(`⚠️ 该订单已被标记注意，请留意处理${reason}`);
  }

  if (data.flowStatus === 'rejected') {
    list.push('❌ 该订单已被驳回，请查看驳回原因后重新提交。');
  }

  if (data.flowStatus === 'cancelled') {
    list.push('🚫 该订单已取消。');
  }

  return list;
});

// ===== 加载数据 =====
const loadData = async () => {
  if (!orderId.value) return;
  loading.value = true;
  try {
    const res = await getOrderDetail(orderId.value);
    orderData.value = res.data || {};
    // ⭐ 如果有进行中的修改申请，加载 diff
    if (orderData.value?.modifyRequestId) {
      try {
        const r = await getOrderModifyDiff(orderData.value.modifyRequestId);
        pendingDiffs.value = r?.data || [];
      } catch {
        pendingDiffs.value = [];
      }
    } else {
      pendingDiffs.value = [];
    }
    loadLogs();
  } catch (error) {
    console.error('加载失败:', error);
    ElMessage.error(error.message || '加载订单详情失败');
  } finally {
    loading.value = false;
  }
};

// ===== 数据包下载 =====
const downloadFile = (url, name) => {
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = name || (url.split('/').pop()) || 'file';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// ===== 工具 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${formatDate(date)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatMoney = (val) => {
  if (val === null || val === undefined) return '0.00';
  return Number(val).toFixed(2);
};

// ===== 初始化 =====
onMounted(async () => {
  try {
    const purityRes = await dictApi.getItemsByKey('purity');
    purityDict.value = purityRes?.data || [];
  } catch {}
  loadData();
});
</script>

<style scoped>
.page-container {
  background: #f5f7fa;
  padding: 12px;
  min-height: 100vh;
}

/* ===== 页面头部 ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 10px 16px;
  border-radius: 6px 6px 0 0;
  flex-wrap: wrap;
  gap: 8px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.header-left h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

/* ===== 内容区域 ===== */
.content-body {
  background: #fff;
  border-radius: 0 0 6px 6px;
  padding: 12px 16px;
}

/* ===== 预警 ===== */
.warning-section {
  margin-bottom: 12px;
}

/* ===== 暂停中提示 ===== */
.pause-banner {
  margin-bottom: 12px;
  border: 1px solid #f5c98a;
}
.pause-banner :deep(.el-alert__title) {
  font-weight: 700;
  color: #b9770e;
}
.pause-banner-body {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 4px;
  font-size: 13px;
  color: #8a6100;
}
.pause-banner-tip {
  color: #b9770e;
  opacity: 0.85;
}

/* ===== 分割线 ===== */
.section-divider {
  height: 1px;
  background: #e8ecf1;
  margin: 12px 0;
}

/* ===== 信息项 ===== */
.info-item {
  padding: 4px 0;
}
.info-item .label {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-bottom: 1px;
}
.info-item .value {
  display: block;
  font-size: 13px;
  color: #303133;
  font-weight: 500;
  word-break: break-all;
}
.url-link {
  color: #409EFF;
  text-decoration: none;
  cursor: pointer;
}
.url-link:hover {
  text-decoration: underline;
}

/* ===== 成色颜色点 ===== */
.color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid #dcdfe6;
  vertical-align: middle;
  margin-right: 3px;
}
.purity-rate {
  font-size: 12px;
  color: #909399;
  margin-left: 2px;
}

/* ===== 图片区域 ===== */
.image-group {
  margin-bottom: 12px;
}
.image-group:last-child {
  margin-bottom: 0;
}
.image-group-label {
  font-size: 12px;
  font-weight: 500;
  color: #4e5969;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.image-group-label .badge {
  background: #f0f2f5;
  color: #606266;
  font-size: 11px;
  padding: 0 6px;
  border-radius: 8px;
  font-weight: normal;
}
.image-group-label .badge-blue {
  background: #ecf5ff;
  color: #409EFF;
}
.image-group-label .badge-orange {
  background: #fdf6ec;
  color: #E6A23C;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.detail-image {
  width: 90px;
  height: 90px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #e8ecf1;
  transition: transform 0.2s;
  object-fit: cover;
  background: #fafafa;
}
.detail-image:hover {
  transform: scale(1.04);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 字印要求图：蓝色实线框 */
.letter-img {
  border: 2px solid #409EFF;
}
/* 字印参考图：橙色虚线框 */
.letter-ref-img {
  border: 2px dashed #E6A23C;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .page-container {
    padding: 6px;
  }
  .content-body {
    padding: 8px 10px;
  }
  .page-header {
    padding: 8px 10px;
  }
  .detail-image {
    width: 70px;
    height: 70px;
  }
}

/* ===== 头部右侧操作 ===== */
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ===== 修改记录面板 ===== */
.modify-log-section {
  margin-top: 16px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 12px 16px;
}
.modify-log-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}
.modify-log-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}
.modify-log-user {
  font-weight: 600;
  color: #303133;
}
.modify-log-detail {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  flex-wrap: wrap;
}
.change-list {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.change-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  flex-wrap: wrap;
}
.modify-log-field {
  color: #409eff;
}
.modify-log-old {
  color: #303133; /* 旧值黑色 */
  text-decoration: line-through;
}
.modify-log-new {
  color: #f56c6c; /* 新值红色 */
  font-weight: 600;
}
.modify-log-remark {
  margin-top: 4px;
  font-size: 13px;
  color: #606266;
}

/* ===== 待处理的修改申请 ===== */
.pending-modify-section {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fff8e6;
  border: 1px solid #f7d794;
  border-radius: 6px;
}
.pending-modify-section .modify-log-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}
.modify-reason {
  margin: 8px 0;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
}
.modify-reason-label {
  color: #909399;
  margin-right: 4px;
}
</style>