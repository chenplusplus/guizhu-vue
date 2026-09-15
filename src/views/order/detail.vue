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
        <el-tag v-if="orderData?.warnFlag" type="danger" size="small">⚠️ 紧急</el-tag>
        <el-tag v-if="orderData?.urgentFlag" type="warning" size="small">🔥 加急</el-tag>
        <el-tag v-if="orderData?.modifyRequested" type="info" size="small">✏️ 待同意修改</el-tag>
      </div>
      <div class="header-right">
        <el-button v-if="canApplyModify" type="warning" size="small" @click="handleApplyModify">
          申请修改
        </el-button>
        <el-button v-if="canApproveModify" type="primary" size="small" @click="handleApproveModify">
          同意修改
        </el-button>
      </div>
    </div>

    <!-- ===== 内容区域 ===== -->
    <div class="content-body">
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

      <!-- ===== 基本信息 + 产品信息（合并成一块） ===== -->
      <div class="info-section">
        <el-row :gutter="12">
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">订单编号</span>
              <span class="value">{{ orderData?.orderNo || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">客户名称</span>
              <span class="value">{{ orderData?.customerName || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">业务员</span>
              <span class="value">{{ orderData?.salesman || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">下单日期</span>
              <span class="value">{{ formatDate(orderData?.orderDate) }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">创建时间</span>
              <span class="value">{{ formatDateTime(orderData?.createdAt) }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">订单状态</span>
              <el-tag :type="statusTagType" size="small">{{ statusText }}</el-tag>
            </div>
          </el-col>

          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">品名</span>
              <span class="value">{{ orderData?.productName || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">成色</span>
              <span class="value">
                <span class="color-dot" :style="{ background: currentPurityColor }"></span>
                {{ orderData?.color || '-' }}
              </span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">颜色</span>
              <span class="value">{{ orderData?.gemColor || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">数量</span>
              <span class="value">{{ orderData?.quantity || 1 }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">手寸/长度</span>
              <span class="value">{{ orderData?.size || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">宽/厚度</span>
              <span class="value">{{ orderData?.widthThick || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">克重要求</span>
              <span class="value">{{ orderData?.weightRequirement || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">钻石级别</span>
              <span class="value">{{ orderData?.diamondLevel || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">LOGO文字</span>
              <span class="value">{{ orderData?.logoText || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">工期</span>
              <span class="value">{{ orderData?.deliveryDays || '-' }} 天</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4">
            <div class="info-item">
              <span class="label">金额</span>
              <span class="value">¥{{ formatMoney(orderData?.amount) }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6" :lg="4" v-if="orderData?.url">
            <div class="info-item">
              <span class="label">网址</span>
              <a :href="orderData.url" target="_blank" class="value url-link">查看链接</a>
            </div>
          </el-col>
          <el-col :xs="24" :sm="24" :md="24" :lg="24">
            <div class="info-item">
              <span class="label">备注</span>
              <span class="value">{{ orderData?.remark || '-' }}</span>
            </div>
          </el-col>
        </el-row>
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

      <!-- ===== 修改记录（日志框） ===== -->
      <div class="modify-log-section" v-if="operationLogs.length > 0">
        <div class="modify-log-title">📝 修改记录</div>
        <el-timeline>
          <el-timeline-item
            v-for="(log, idx) in operationLogs"
            :key="log.id || idx"
            :timestamp="formatDateTime(log.createdAt)"
            placement="top"
          >
            <div class="modify-log-item">
              <div class="modify-log-meta">
                <span class="modify-log-user">{{ log.operatorName || '-' }}</span>
                <span class="modify-log-role">{{ log.operatorRole || '' }}</span>
                <span class="modify-log-op">{{ log.operationType || '' }}</span>
              </div>
              <div class="modify-log-detail" v-if="log.fieldName">
                <span class="modify-log-field">{{ log.fieldName }}</span>
                <span class="modify-log-old">{{ log.oldValue || '-' }}</span>
                <el-icon><Right /></el-icon>
                <span class="modify-log-new">{{ log.newValue || '-' }}</span>
              </div>
              <div class="modify-log-remark" v-if="log.remark">{{ log.remark }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Right } from '@element-plus/icons-vue';
import { getOrderDetail, applyModify, approveModify, getOrderLogs } from '@/api/order';
import { dictApi } from '@/api/dict';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const route = useRoute();
const router = useRouter();

const orderId = computed(() => Number(route.params.id));
const loading = ref(false);
const orderData = ref({});
const purityDict = ref([]);
const operationLogs = ref([]);

// ===== 当前用户角色 =====
const isCustomer = computed(() => userStore.userType === 'customer');
const isCustomerAudit = computed(() => userStore.userType === 'customerAudit');

// 允许申请修改的状态（客户已审核 → 账单确认之间）
const ALLOW_MODIFY_STATUS = ['customeraudited', 'accepted', 'DataConfirm', 'Waxing', 'Molded', 'CNC', 'PartsMissing', 'StoneReady', 'Setting', 'Glue', 'Inlay', 'Assembly', 'Polishing', 'billPending'];
const canApplyModify = computed(() => isCustomer.value && ALLOW_MODIFY_STATUS.includes(orderData.value?.flowStatus));
const canApproveModify = computed(() => isCustomerAudit.value && orderData.value?.modifyRequested);

// ===== 修改记录 =====
const loadLogs = async () => {
  if (!orderId.value) return;
  try {
    const res = await getOrderLogs(orderId.value);
    operationLogs.value = res?.data || [];
  } catch {
    operationLogs.value = [];
  }
};

const handleApplyModify = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请填写申请修改的原因', '申请修改', {
      confirmButtonText: '提交申请',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '例如：需要更改克重要求 / 钻石级别',
    });
    if (!value || !value.trim()) return;
    await applyModify(orderId.value, { reason: value.trim() });
    ElMessage.success('已提交修改申请，等待客户审核员同意');
    loadData();
    loadLogs();
  } catch (e) {
    if (e !== 'cancel' && e?.name !== 'cancel') return;
  }
};

const handleApproveModify = async () => {
  try {
    await ElMessageBox.confirm('同意客户修改申请后，订单将回到草稿状态，由客户重新编辑并提交。', '同意修改', {
      confirmButtonText: '同意修改',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await approveModify(orderId.value);
    ElMessage.success('已同意修改，订单已回到草稿');
    loadData();
    loadLogs();
  } catch {
    return;
  }
};

// ===== 状态映射 =====
const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待客户审核', type: 'warning' },
  customerAudited: { text: '客户已审核', type: 'success' },
  factory_edit: { text: '工厂编辑中', type: 'primary' },
  polishing: { text: '制作完成', type: 'primary' },
  billPending: { text: '账单待审核', type: 'warning' },
  billConfirmed: { text: '客户已确认', type: 'success' },
  completed: { text: '已完成', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' },
  scrapped: { text: '已报废', type: 'danger' }
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

// ===== 预警提示 =====
const warnings = computed(() => {
  const list = [];
  const data = orderData.value;
  if (!data) return list;

  if (data.deliveryDays && data.deliveryDays <= 3) {
    list.push(`⏰ 工期仅剩 ${data.deliveryDays} 天，请尽快处理！`);
  }

  if (data.warnFlag) {
    list.push('🚨 该订单已被标记为紧急订单，请优先处理！');
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
    loadLogs();
  } catch (error) {
    console.error('加载失败:', error);
    ElMessage.error(error.message || '加载订单详情失败');
  } finally {
    loading.value = false;
  }
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
.modify-log-field {
  color: #409eff;
}
.modify-log-old {
  color: #f56c6c;
  text-decoration: line-through;
}
.modify-log-new {
  color: #67c23a;
}
.modify-log-remark {
  margin-top: 4px;
  font-size: 13px;
  color: #606266;
}
</style>