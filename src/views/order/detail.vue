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
        <el-tag :type="statusTagType" size="large">{{ statusText }}</el-tag>
        <el-tag v-if="orderData?.warnFlag" type="danger" size="large">⚠️ 紧急</el-tag>
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
          style="margin-bottom: 8px;"
        />
      </div>

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
              <span class="label">业务员</span>
              <span class="value">{{ orderData?.salesman || '-' }}</span>
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
              <span class="label">订单状态</span>
              <el-tag :type="statusTagType" size="default">{{ statusText }}</el-tag>
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

      <!-- ===== 产品信息 ===== -->
      <div class="info-section">
        <div class="section-title">📦 产品信息</div>
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">品名</span>
              <span class="value">{{ orderData?.productName || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">成色</span>
              <span class="value">{{ orderData?.color || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">数量</span>
              <span class="value">{{ orderData?.quantity || 1 }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">手寸/长度</span>
              <span class="value">{{ orderData?.size || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">宽/厚度</span>
              <span class="value">{{ orderData?.widthThick || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">克重要求</span>
              <span class="value">{{ orderData?.weightRequirement || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">钻石级别</span>
              <span class="value">{{ orderData?.diamondLevel || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">LOGO文字</span>
              <span class="value">{{ orderData?.logoText || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <div class="info-item">
              <span class="label">金额</span>
              <span class="value">¥{{ formatMoney(orderData?.amount) }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="24">
            <div class="info-item">
              <span class="label">备注</span>
              <span class="value">{{ orderData?.remark || '-' }}</span>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- ===== 产品图片 ===== -->
      <div v-if="hasImages" class="info-section">
        <div class="section-title">🖼️ 产品图片</div>
        <div class="image-list">
          <el-image
            v-if="orderData?.imageUrl"
            :src="orderData.imageUrl"
            fit="cover"
            class="detail-image"
            :preview-src-list="[orderData.imageUrl]"
            preview-teleported
          />
          <el-image
            v-if="orderData?.dataImageUrl"
            :src="orderData.dataImageUrl"
            fit="cover"
            class="detail-image"
            :preview-src-list="[orderData.dataImageUrl]"
            preview-teleported
          />
          <el-image
            v-if="orderData?.letterImageUrl"
            :src="orderData.letterImageUrl"
            fit="cover"
            class="detail-image"
            :preview-src-list="[orderData.letterImageUrl]"
            preview-teleported
          />
          <div v-if="!hasImages" class="no-image">暂无图片</div>
        </div>
      </div>

      <div v-if="hasFactoryData" class="section-divider"></div>

      <!-- ===== 工厂数据（有数据时才显示） ===== -->
      <div v-if="hasFactoryData" class="info-section">
        <div class="section-title">🏭 工厂数据</div>
        <el-row :gutter="20">
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">总重 (g)</span>
              <span class="value">{{ orderData?.totalWeight ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">净重 (g)</span>
              <span class="value">{{ orderData?.netWeight ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">损耗率</span>
              <span class="value">{{ orderData?.lossRate ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">加耗重</span>
              <span class="value">{{ orderData?.addLossWeight ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">金价</span>
              <span class="value">{{ orderData?.goldPrice ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">足金料</span>
              <span class="value">{{ orderData?.goldMaterialFee ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">主石数量</span>
              <span class="value">{{ orderData?.mainStoneQty ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">主石重量</span>
              <span class="value">{{ orderData?.mainStoneWeight ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">主石金额</span>
              <span class="value">{{ orderData?.mainStoneAmount ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">副石数量</span>
              <span class="value">{{ orderData?.subStoneQty ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">副石重量</span>
              <span class="value">{{ orderData?.subStoneWeight ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">副石金额</span>
              <span class="value">{{ orderData?.subStoneAmount ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">工费</span>
              <span class="value">{{ orderData?.laborFee ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">包装费</span>
              <span class="value">{{ orderData?.packingFee ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">证书费</span>
              <span class="value">{{ orderData?.certificateFee ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">蜡模费</span>
              <span class="value">{{ orderData?.moldFee ?? '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="24" :md="24">
            <div class="info-item">
              <span class="label">工厂备注</span>
              <span class="value">{{ orderData?.factoryRemark || '-' }}</span>
            </div>
          </el-col>
          <el-col :xs="24" :sm="24" :md="24">
            <div class="info-item" style="background:#f5f7fa;padding:12px 16px;border-radius:6px;margin-top:4px;">
              <span class="label" style="font-weight:600;color:#1d2129;">合计金额</span>
              <span class="value" style="font-size:20px;color:#409EFF;font-weight:700;">
                ¥{{ formatMoney(orderData?.totalAmount) }}
              </span>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- ===== 无工厂数据提示 ===== -->
      <div v-else-if="!loading && orderData?.orderId" class="info-section">
        <div class="section-title">🏭 工厂数据</div>
        <el-empty description="暂无工厂数据，等待工厂业务员录入" :image-size="60" />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { getOrderDetail } from '@/api/order';

const route = useRoute();
const router = useRouter();

const orderId = computed(() => Number(route.params.id));
const loading = ref(false);
const orderData = ref({});

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

// ===== 是否有图片 =====
const hasImages = computed(() => {
  return !!(orderData.value?.imageUrl || orderData.value?.dataImageUrl || orderData.value?.letterImageUrl);
});

// ===== 是否有工厂数据 =====
const hasFactoryData = computed(() => {
  const data = orderData.value;
  const factoryFields = [
    data?.totalWeight, data?.netWeight, data?.lossRate, data?.addLossWeight,
    data?.goldPrice, data?.goldMaterialFee, data?.mainStoneQty, data?.mainStoneWeight,
    data?.mainStoneAmount, data?.subStoneQty, data?.subStoneWeight, data?.subStoneAmount,
    data?.laborFee, data?.packingFee, data?.certificateFee, data?.moldFee,
    data?.factoryRemark, data?.totalAmount
  ];
  return factoryFields.some(f => f !== null && f !== undefined && f !== '');
});

// ===== 预警提示 =====
const warnings = computed(() => {
  const list = [];
  const data = orderData.value;
  if (!data) return list;

  // 工期预警
  if (data.deliveryDays && data.deliveryDays <= 3) {
    list.push(`⏰ 工期仅剩 ${data.deliveryDays} 天，请尽快处理！`);
  }

  // 紧急标记
  if (data.warnFlag) {
    list.push('🚨 该订单已被标记为紧急订单，请优先处理！');
  }

  // 金额异常
  if (data.amount && data.amount > 100000) {
    list.push('💰 订单金额超过 10 万元，请注意确认！');
  }

  // 数量异常
  if (data.quantity && data.quantity > 100) {
    list.push('📦 订单数量超过 100 件，请注意生产安排！');
  }

  // 驳回状态提醒
  if (data.flowStatus === 'rejected') {
    list.push('❌ 该订单已被驳回，请查看驳回原因后重新提交。');
  }

  // 已取消提醒
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
  } catch (error) {
    console.error('加载失败:', error);
    ElMessage.error(error.message || '加载订单详情失败');
  } finally {
    loading.value = false;
  }
};

// ===== 格式工具 =====
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

/* ===== 整体内容区域 ===== */
.content-body {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 20px 24px;
}

/* ===== 预警区域 ===== */
.warning-section {
  margin-bottom: 20px;
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
.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.detail-image {
  width: 120px;
  height: 120px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #e8ecf1;
  transition: transform 0.2s;
  object-fit: cover;
}
.detail-image:hover {
  transform: scale(1.03);
}
.no-image {
  color: #c0c4cc;
  font-size: 14px;
  padding: 20px 0;
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
    width: 80px;
    height: 80px;
  }
}
</style>