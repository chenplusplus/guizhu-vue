<!-- src/views/order/factory-edit.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>✏️ 编辑订单</h2>
        <el-tag type="primary" size="large">{{ orderData?.orderNo || '' }}</el-tag>
        <el-tag v-if="orderData?.flowStatus" :type="getStatusType(orderData.flowStatus)" size="large">
          {{ getStatusText(orderData.flowStatus) }}
        </el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon> 保存
        </el-button>
      </div>
    </div>

    <!-- ===== 整体内容区域 ===== -->
    <div class="content-body">
      <!-- ===== 订单信息 ===== -->
      <div class="info-section">
        <el-row :gutter="16">
          <el-col :xs="12" :sm="6">
            <div class="info-item">
              <span class="label">订单号：</span>
              <el-tooltip placement="top" effect="dark">
                <template #content>
                  <div style="font-size:13px;line-height:1.8;max-width:400px;">
                    <div><b>订单号：</b>{{ orderData?.orderNo || '-' }}</div>
                    <div><b>品名：</b>{{ orderData?.productName || '-' }}</div>
                    <div><b>客户：</b>{{ orderData?.customerName || '-' }}</div>
                    <div><b>钻石级别：</b>{{ orderData?.diamondLevel || '-' }}</div>
                    <div><b>成色：</b>{{ orderData?.color || '-' }}</div>
                    <div><b>手寸：</b>{{ orderData?.size || '-' }}</div>
                    <div><b>数量：</b>{{ orderData?.quantity || '-' }}</div>
                    <div><b>金价：</b>{{ orderData?.goldPrice || '-' }}</div>
                    <div><b>备注：</b>{{ orderData?.remark || '-' }}</div>
                  </div>
                </template>
                <span class="value" style="color:#409EFF;cursor:pointer;border-bottom:1px dashed #409EFF;">
                  {{ orderData?.orderNo || '-' }}
                </span>
              </el-tooltip>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">客户：</span><span class="value">{{ orderData?.customerName || '-' }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">品名：</span><span class="value">{{ orderData?.productName || '-' }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item">
              <span class="label">成色：</span>
              <span class="value" style="color:#E6A23C;font-weight:600;">
                <span class="color-dot" :style="{ background: currentPurityColor }"></span>
                {{ orderData?.color || '-' }}
              </span>
              <span v-if="currentPurityRate" style="color:#909399;font-size:12px;margin-left:6px;">
                (折算率 {{ currentPurityRate }})
              </span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">数量：</span><span class="value">{{ orderData?.quantity || '-' }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">手寸：</span><span class="value">{{ orderData?.size || '-' }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">下单日期：</span><span class="value">{{ formatDate(orderData?.orderDate) }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item">
              <span class="label">状态：</span>
              <el-tag :type="getStatusType(orderData?.flowStatus)" size="small">
                {{ getStatusText(orderData?.flowStatus) }}
              </el-tag>
            </div>
          </el-col>
        </el-row>
        <el-row v-if="orderData?.remark" style="margin-top:8px;">
          <el-col :span="24">
            <div class="info-item"><span class="label">备注：</span><span class="value">{{ orderData?.remark }}</span></div>
          </el-col>
        </el-row>
      </div>

      <div class="section-divider"></div>

      <!-- ===== 工厂数据 ===== -->
      <div class="form-section">
        <div class="section-title">📊 工厂数据</div>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="4">
            <el-form-item label="总重(g)">
              <el-input-number v-model="orderData.totalWeight" :precision="3" :min="0" style="width:100%;" @change="calcFactory" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="净重(g)">
              <el-input-number v-model="orderData.netWeight" :precision="3" :min="0" style="width:100%;" @change="calcFactory" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="损耗率">
              <el-select
                v-model="orderData.lossRate"
                :class="{ 'loss-warning': !isStandardLoss }"
                style="width:100%;"
                @change="calcFactory"
              >
                <el-option v-for="item in lossRateOptions" :key="item.value" :value="item.value" :label="item.label" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="加耗重">
              <el-input-number v-model="orderData.addLossWeight" :precision="3" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="金价(元/克)">
              <el-input-number v-model="orderData.goldPrice" :precision="2" :min="0" style="width:100%;" @change="calcFactory" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="足金料克重(g)">
              <el-input-number v-model="orderData.goldMaterialWeight" :precision="3" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="4">
            <el-form-item label="足金料金额">
              <el-input-number v-model="orderData.goldMaterialFee" :precision="2" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <div class="section-divider"></div>

      <!-- ===== 主石信息 ===== -->
      <div class="form-section">
        <div class="section-title">💎 主石信息</div>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="5">
            <el-form-item label="石重(ct)">
              <el-input-number v-model="orderData.mainStoneWeight" :precision="3" :min="0" style="width:100%;" @change="calcMainStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="单价(元)">
              <el-input-number v-model="orderData.mainStonePrice" :precision="2" :min="0" style="width:100%;" @change="calcMainStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="粒数">
              <el-input-number v-model="orderData.mainStoneQty" :min="0" style="width:100%;" @change="calcMainStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="镶石工费">
              <el-input-number v-model="orderData.mainStoneSettingFee" :precision="2" :min="0" style="width:100%;" @change="calcMainStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="金额(元)">
              <el-input-number v-model="orderData.mainStoneAmount" :precision="2" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <div class="section-divider"></div>

      <!-- ===== 副石信息 ===== -->
      <div class="form-section">
        <div class="section-title">💎 副石信息</div>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="5">
            <el-form-item label="石重(ct)">
              <el-input-number v-model="orderData.subStoneWeight" :precision="3" :min="0" style="width:100%;" @change="calcSubStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="单价(元)">
              <el-input-number v-model="orderData.subStonePrice" :precision="2" :min="0" style="width:100%;" @change="calcSubStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="粒数">
              <el-input-number v-model="orderData.subStoneQty" :min="0" style="width:100%;" @change="calcSubStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="镶石工费">
              <el-input-number v-model="orderData.subStoneSettingFee" :precision="2" :min="0" style="width:100%;" @change="calcSubStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="金额(元)">
              <el-input-number v-model="orderData.subStoneAmount" :precision="2" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <div class="section-divider"></div>

      <!-- ===== 其他费用 + 合计 ===== -->
      <div class="form-section">
        <div class="section-title">📦 其他费用</div>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="4">
            <el-form-item label="包装费">
              <el-input-number v-model="orderData.packingFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="证书费">
              <el-input-number v-model="orderData.certificateFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="邮费">
              <el-input-number v-model="orderData.postageFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="版费">
              <el-input-number v-model="orderData.moldFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="工费">
              <el-input-number v-model="orderData.laborFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="合计金额">
              <el-tooltip placement="top" effect="dark">
                <template #content>
                  <div style="font-size:13px;line-height:1.8;">
                    合计 = 足金料金额 + 主石金额 + 副石金额 + 包装费 + 证书费 + 邮费 + 版费 + 工费<br><br>
                    <b>足金料金额</b> = 加耗重 × 成色折算率 × 金价<br>
                    <b>主石金额</b> = 石重 × 单价 + 粒数 × 镶石工费<br>
                    <b>副石金额</b> = 石重 × 单价 + 粒数 × 镶石工费
                  </div>
                </template>
                <el-input-number v-model="orderData.totalAmount" :precision="2" disabled style="width:100%;" />
              </el-tooltip>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <div class="section-divider"></div>

      <!-- ===== ⭐ 图片附件（只读展示） ===== -->
      <div v-if="hasImages" class="form-section">
        <div class="section-title">🖼️ 图片附件</div>

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

      <div class="section-divider"></div>

      <!-- ===== 制作状态 ===== -->
      <div class="form-section">
        <div class="section-title">🔄 制作状态</div>
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          <span style="color:#666;">当前状态：</span>
          <el-tag :type="getStatusType(orderData?.flowStatus)" size="large">
            {{ getStatusText(orderData?.flowStatus) }}
          </el-tag>

          <span style="color:#666; margin-left:16px;">更新为：</span>
          <el-select v-model="selectedStatus" placeholder="选择下一个状态" style="width:200px;">
            <el-option
              v-for="item in availableStatuses"
              :key="item.key"
              :label="item.label"
              :value="item.key"
            />
          </el-select>
          <el-button type="primary" @click="updateStatus" :loading="statusLoading" :disabled="!selectedStatus">
            更新状态
          </el-button>
        </div>
        <div style="margin-top:12px;">
          <el-steps :active="currentStep" finish-status="success" align-center>
            <el-step v-for="s in productionStatuses" :key="s.key" :title="s.label" />
          </el-steps>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Check } from '@element-plus/icons-vue';
import { getOrderDetail, updateOrder, updateProduction } from '@/api/order';
import { dictApi } from '@/api/dict';

const route = useRoute();
const router = useRouter();

const orderId = computed(() => Number(route.params.id));

const orderData = ref({});
const loading = ref(false);
const saving = ref(false);
const statusLoading = ref(false);
const selectedStatus = ref('');
const lossRateOptions = ref([]);
const productionStatuses = ref([]);
const purityDict = ref([]);

// ==================== 状态映射 ====================
const statusMap = {
  customerAudited: { text: '待接单', type: 'success' },
  accepted: { text: '已接单', type: 'primary' },
  factory_edit: { text: '工厂编辑中', type: 'primary' },
  waxing: { text: '出蜡', type: 'primary' },
  molded: { text: '倒模', type: 'primary' },
  setting: { text: '执模', type: 'primary' },
  cnc: { text: 'CNC', type: 'primary' },
  sweeping: { text: '扫镶口', type: 'primary' },
  stoneCutting: { text: '车石', type: 'primary' },
  microInlay: { text: '微镶', type: 'primary' },
  handInlay: { text: '手镶', type: 'primary' },
  polishing: { text: '制作完成', type: 'success' },
  billPending: { text: '账单待审核', type: 'warning' },
  billConfirmed: { text: '客户已确认', type: 'success' },
  completed: { text: '已完成', type: 'success' },
};

const getStatusText = (status) => {
  return productionStatuses.value.find(item => item.key === status)?.label
    || statusMap[status]?.text
    || status
    || '-';
};
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ==================== 进度 ====================
const currentStep = computed(() => {
  const s = orderData.value?.flowStatus;
  const index = productionStatuses.value.findIndex(item => item.key === s);
  return index >= 0 ? index : 0;
});

const availableStatuses = computed(() => {
  const current = orderData.value?.flowStatus;
  const currentIndex = productionStatuses.value.findIndex(item => item.key === current);
  return currentIndex >= 0 ? productionStatuses.value.slice(currentIndex + 1) : productionStatuses.value;
});

// ==================== 标准损耗 ====================
const isStandardLoss = computed(() => {
  const lr = Number(orderData.value.lossRate);
  return lr === 1.10 || lr === 1.08;
});

// ==================== ⭐ 成色折算率（优先用 purityId） ====================
const currentPurityRate = computed(() => {
  // 1. 优先用 purityId
  if (orderData.value?.purityId) {
    const item = purityDict.value.find(x => x.id === orderData.value.purityId);
    if (item) {
      try {
        const extra = item.extraData ? JSON.parse(item.extraData) : {};
        if (extra.convertRate) return Number(extra.convertRate);
      } catch {}
      const rate = Number(item.itemValue);
      if (!isNaN(rate) && rate > 0 && rate <= 1) return rate;
    }
  }

  // 2. 降级：用 color 匹配 itemLabel
  const label = (orderData.value?.color || '').trim();
  if (!label) return 1;
  const item = purityDict.value.find(x => x.itemLabel === label);
  if (!item) return 1;
  try {
    const extra = item.extraData ? JSON.parse(item.extraData) : {};
    if (extra.convertRate) return Number(extra.convertRate);
  } catch {}
  const rate = Number(item.itemValue);
  return isNaN(rate) ? 1 : rate;
});

// ==================== ⭐ 成色颜色 ====================
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

// ==================== ⭐ 图片分组 ====================
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

// ==================== 计算函数 ====================
const calcFactory = () => {
  const netWeight = orderData.value.netWeight || 0;
  const loss = orderData.value.lossRate || 1.10;
  const gold = orderData.value.goldPrice || 0;
  const convertRate = currentPurityRate.value || 1;

  // 加耗重 = 净重 × 损耗
  const addLossWeight = netWeight * loss;
  orderData.value.addLossWeight = parseFloat(addLossWeight.toFixed(3));

  // ⭐ 足金料克重 = 加耗重 × 折算率
  orderData.value.goldMaterialWeight = parseFloat((addLossWeight * convertRate).toFixed(3));

  // 足金料金额 = 足金料克重 × 金价
  orderData.value.goldMaterialFee = parseFloat((orderData.value.goldMaterialWeight * gold).toFixed(2));

  calcTotal();
};

// ⭐ 主石金额 = 石重 × 单价 + 粒数 × 镶石工费
const calcMainStone = () => {
  const qty = orderData.value.mainStoneQty || 0;
  const weight = orderData.value.mainStoneWeight || 0;
  const price = orderData.value.mainStonePrice || 0;
  const settingFee = orderData.value.mainStoneSettingFee || 0;
  orderData.value.mainStoneAmount = parseFloat((weight * price + qty * settingFee).toFixed(2));
  calcTotal();
};

// ⭐ 副石金额 = 石重 × 单价 + 粒数 × 镶石工费
const calcSubStone = () => {
  const qty = orderData.value.subStoneQty || 0;
  const weight = orderData.value.subStoneWeight || 0;
  const price = orderData.value.subStonePrice || 0;
  const settingFee = orderData.value.subStoneSettingFee || 0;
  orderData.value.subStoneAmount = parseFloat((weight * price + qty * settingFee).toFixed(2));
  calcTotal();
};

// 合计
const calcTotal = () => {
  const goldMaterial = orderData.value.goldMaterialFee || 0;
  const mainStone = orderData.value.mainStoneAmount || 0;
  const subStone = orderData.value.subStoneAmount || 0;
  const packing = orderData.value.packingFee || 0;
  const certificate = orderData.value.certificateFee || 0;
  const postage = orderData.value.postageFee || 0;
  const mold = orderData.value.moldFee || 0;
  const labor = orderData.value.laborFee || 0;

  orderData.value.totalAmount = parseFloat((
    goldMaterial + mainStone + subStone +
    packing + certificate + postage + mold + labor
  ).toFixed(2));
};

// ==================== 加载数据 ====================
const loadData = async () => {
  if (!orderId.value) {
    ElMessage.error('订单ID不存在');
    router.back();
    return;
  }

  loading.value = true;
  try {
    const res = await getOrderDetail(orderId.value);
    if (res?.data) {
      orderData.value = res.data;
      calcFactory();
      calcMainStone();
      calcSubStone();
      calcTotal();
    } else {
      ElMessage.error('订单不存在');
      router.back();
    }
  } catch {
    ElMessage.error('加载数据失败');
    router.back();
  } finally {
    loading.value = false;
  }
};

// ==================== 保存 ====================
const handleSave = async () => {
  if (!orderData.value.totalWeight && !orderData.value.netWeight) {
    try {
      await ElMessageBox.confirm('总重和净重都为空，确定要保存吗？', '提示', { type: 'warning' });
    } catch {
      return;
    }
  }

  saving.value = true;
  try {
    await updateOrder(orderData.value);
    ElMessage.success('保存成功');
    router.push('/order/factory-list');
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

// ==================== 更新状态 ====================
const updateStatus = async () => {
  if (!selectedStatus.value) {
    ElMessage.warning('请选择状态');
    return;
  }

  const label = getStatusText(selectedStatus.value);
  statusLoading.value = true;
  try {
    await updateProduction(orderId.value, {
      status: selectedStatus.value,
      step: currentStep.value + 1,
      remark: '',
    });
    ElMessage.success(`状态已更新为：${label}`);
    selectedStatus.value = '';
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '更新失败');
  } finally {
    statusLoading.value = false;
  }
};

// ==================== 返回 ====================
const goBack = () => router.push('/order/factory-list');

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ==================== 初始化 ====================
onMounted(async () => {
  try {
    const [lossRateRes, productionStatusRes, purityRes] = await Promise.all([
      dictApi.getItemsByKey('lossrate'),
      dictApi.getItemsByKey('production_status'),
      dictApi.getItemsByKey('purity'),
    ]);

    lossRateOptions.value = (lossRateRes?.data || []).map(item => ({
      label: item.itemLabel || item.itemValue,
      value: Number(item.itemValue),
    }));

    productionStatuses.value = (productionStatusRes?.data || []).map(item => ({
      key: item.itemValue,
      title: item.itemLabel || item.itemValue,
      label: item.itemLabel || item.itemValue,
    }));

    purityDict.value = purityRes?.data || [];
  } catch {
    ElMessage.error('加载字典失败');
  }
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

/* ===== 内容区域 ===== */
.content-body {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 20px 24px;
}

.section-divider {
  height: 1px;
  background: #e8ecf1;
  margin: 18px 0;
}

.section-title {
  font-weight: 600;
  font-size: 15px;
  color: #1d2129;
  margin-bottom: 14px;
}

/* ===== 信息区域 ===== */
.info-section .info-item {
  padding: 4px 0;
  font-size: 14px;
}
.info-section .info-item .label {
  color: #909399;
}
.info-section .info-item .value {
  color: #303133;
  font-weight: 500;
}

/* ===== 表单区域 ===== */
.form-section :deep(.el-form-item) {
  margin-bottom: 8px;
}
.form-section :deep(.el-form-item__label) {
  font-size: 13px;
  color: #666;
  padding-right: 4px;
}
.form-section :deep(.el-input-number) {
  width: 100%;
}
.form-section :deep(.el-select) {
  width: 100%;
}

/* 合计金额高亮 */
.form-section :deep(.el-form-item:last-child .el-input-number input) {
  color: #E6A23C;
  font-weight: bold;
}

/* ⭐ 损耗非标准值时红色标注 */
.loss-warning :deep(.el-input__wrapper) {
  border: 1px solid #F56C6C !important;
  box-shadow: 0 0 0 1px #F56C6C inset !important;
}
.loss-warning :deep(.el-input__inner) {
  color: #F56C6C !important;
  font-weight: 600;
}

/* ⭐ 成色颜色点 */
.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #dcdfe6;
  vertical-align: middle;
  margin-right: 4px;
}

/* ⭐ 图片区域 */
.image-group {
  margin-bottom: 18px;
}
.image-group:last-child {
  margin-bottom: 0;
}
.image-group-label {
  font-size: 13px;
  font-weight: 500;
  color: #4e5969;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.image-group-label .badge {
  background: #f0f2f5;
  color: #606266;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
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
  gap: 12px;
}
.detail-image {
  width: 100px;
  height: 100px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #e8ecf1;
  transition: transform 0.2s;
  object-fit: cover;
  background: #fafafa;
}
.detail-image:hover {
  transform: scale(1.04);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* ⭐ 字印要求图：蓝色实线框 */
.letter-img {
  border: 2px solid #409EFF;
}
/* ⭐ 字印参考图：橙色虚线框 */
.letter-ref-img {
  border: 2px dashed #E6A23C;
}
</style>