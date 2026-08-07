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
            <div class="info-item"><span class="label">订单号：</span>
              <el-tooltip placement="top" effect="dark">
                <template #content>
                  <div style="font-size:13px;line-height:1.8;max-width:400px;">
                    <div><b>订单号：</b>{{ orderData?.orderNo || '-' }}</div>
                    <div><b>品名：</b>{{ orderData?.productName || '-' }}</div>
                    <div><b>客户：</b>{{ orderData?.customerName || '-' }}</div>
                    <div><b>钻石级别：</b>{{ orderData?.diamondLevel || '-' }}</div>
                    <div><b>颜色：</b>{{ orderData?.color || '-' }}</div>
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
            <div class="info-item"><span class="label">颜色：</span><span class="value">{{ orderData?.color || '-' }}</span></div>
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
            <div class="info-item"><span class="label">状态：</span>
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

      <!-- ===== 分割线 ===== -->
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
              <el-select v-model="orderData.lossRate" style="width:100%;" @change="calcFactory">
                <el-option :value="1.08" label="1.08" />
                <el-option :value="1.10" label="1.10" />
                <el-option :value="1.12" label="1.12" />
                <el-option :value="1.15" label="1.15" />
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
            <el-form-item label="足金料">
              <el-input-number v-model="orderData.goldMaterialFee" :precision="2" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- ===== 分割线 ===== -->
      <div class="section-divider"></div>

      <!-- ===== 主石信息 ===== -->
      <div class="form-section">
        <div class="section-title">💎 主石信息</div>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="4">
            <el-form-item label="粒数">
              <el-input-number v-model="orderData.mainStoneQty" :min="0" style="width:100%;" @change="calcMainStone" />
            </el-form-item>
          </el-col>
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
          <el-col :xs="12" :sm="5">
            <el-form-item label="金额(元)">
              <el-input-number v-model="orderData.mainStoneAmount" :precision="2" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="镶石工费">
              <el-input-number v-model="orderData.mainStoneSettingFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- ===== 分割线 ===== -->
      <div class="section-divider"></div>

      <!-- ===== 副石信息 ===== -->
      <div class="form-section">
        <div class="section-title">💎 副石信息</div>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="4">
            <el-form-item label="粒数">
              <el-input-number v-model="orderData.subStoneQty" :min="0" style="width:100%;" @change="calcSubStone" />
            </el-form-item>
          </el-col>
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
          <el-col :xs="12" :sm="5">
            <el-form-item label="金额(元)">
              <el-input-number v-model="orderData.subStoneAmount" :precision="2" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="镶石工费">
              <el-input-number v-model="orderData.subStoneSettingFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- ===== 分割线 ===== -->
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
                    计算公式：足金料 + 主石金额 + 副石金额 + 主石镶石工费 + 副石镶石工费 + 包装费 + 证书费 + 邮费 + 版费 + 工费<br>
                    足金料 = 净重 × 损耗 × 金价
                  </div>
                </template>
                <el-input-number v-model="orderData.totalAmount" :precision="2" disabled style="width:100%;" />
              </el-tooltip>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- ===== 分割线 ===== -->
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
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-button type="primary" @click="updateStatus" :loading="statusLoading" :disabled="!selectedStatus">
            更新状态
          </el-button>
        </div>
        <!-- 进度条 -->
        <div style="margin-top:12px;">
          <el-steps :active="currentStep" finish-status="success" align-center>
            <el-step v-for="s in statusSteps" :key="s.key" :title="s.label" />
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

const route = useRoute();
const router = useRouter();

const orderId = computed(() => Number(route.params.id));

const orderData = ref({});
const loading = ref(false);
const saving = ref(false);
const statusLoading = ref(false);
const selectedStatus = ref('');

// ===== 状态映射 =====
const statusMap = {
  customerAudited: { text: '待接单', type: 'success', step: 0 },
  accepted: { text: '已接单', type: 'primary', step: 1 },
  waxing: { text: '出蜡', type: 'primary', step: 2 },
  molded: { text: '倒模', type: 'primary', step: 3 },
  setting: { text: '执模', type: 'primary', step: 4 },
  cnc: { text: 'CNC', type: 'primary', step: 5 },
  sweeping: { text: '扫镶口', type: 'primary', step: 6 },
  stoneCutting: { text: '车石', type: 'primary', step: 7 },
  microInlay: { text: '微镶', type: 'primary', step: 8 },
  handInlay: { text: '手镶', type: 'primary', step: 9 },
  polishing: { text: '抛光', type: 'warning', step: 10 },
  completed: { text: '已完成', type: 'success', step: 11 },
};

const getStatusText = (status) => statusMap[status]?.text || status || '-';
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ===== 进度步骤 =====
const statusSteps = [
  { key: 'customerAudited', label: '待接单' },
  { key: 'accepted', label: '已接单' },
  { key: 'waxing', label: '出蜡' },
  { key: 'molded', label: '倒模' },
  { key: 'setting', label: '执模' },
  { key: 'cnc', label: 'CNC' },
  { key: 'sweeping', label: '扫镶口' },
  { key: 'stoneCutting', label: '车石' },
  { key: 'microInlay', label: '微镶' },
  { key: 'handInlay', label: '手镶' },
  { key: 'polishing', label: '抛光' },
  { key: 'completed', label: '完成' },
];

const currentStep = computed(() => {
  const s = orderData.value?.flowStatus;
  return statusMap[s]?.step ?? 0;
});

// ===== 可用状态 =====
const availableStatuses = computed(() => {
  const current = orderData.value?.flowStatus;
  const flowMap = {
    'customerAudited': [{ value: 'accepted', label: '已接单' }],
    'accepted': [{ value: 'waxing', label: '出蜡' }],
    'waxing': [{ value: 'molded', label: '倒模' }],
    'molded': [{ value: 'setting', label: '执模' }],
    'setting': [{ value: 'cnc', label: 'CNC' }],
    'cnc': [{ value: 'sweeping', label: '扫镶口' }],
    'sweeping': [{ value: 'stoneCutting', label: '车石' }],
    'stoneCutting': [{ value: 'microInlay', label: '微镶' }],
    'microInlay': [{ value: 'handInlay', label: '手镶' }],
    'handInlay': [{ value: 'polishing', label: '抛光' }],
    'polishing': [{ value: 'completed', label: '完成' }],
  };
  return flowMap[current] || [];
});

// ===== 计算函数 =====
const calcFactory = () => {
  const netWeight = orderData.value.netWeight || 0;
  const loss = orderData.value.lossRate || 1.10;
  const gold = orderData.value.goldPrice || 0;
  orderData.value.addLossWeight = parseFloat((netWeight * loss).toFixed(3));
  orderData.value.goldMaterialFee = parseFloat((orderData.value.addLossWeight * gold).toFixed(2));
  calcTotal();
};

const calcMainStone = () => {
  const qty = orderData.value.mainStoneQty || 0;
  const weight = orderData.value.mainStoneWeight || 0;
  const price = orderData.value.mainStonePrice || 0;
  orderData.value.mainStoneAmount = parseFloat((qty * weight * price).toFixed(2));
  calcTotal();
};

const calcSubStone = () => {
  const qty = orderData.value.subStoneQty || 0;
  const weight = orderData.value.subStoneWeight || 0;
  const price = orderData.value.subStonePrice || 0;
  orderData.value.subStoneAmount = parseFloat((qty * weight * price).toFixed(2));
  calcTotal();
};

const calcTotal = () => {
  const goldMaterial = orderData.value.goldMaterialFee || 0;
  const mainStone = orderData.value.mainStoneAmount || 0;
  const subStone = orderData.value.subStoneAmount || 0;
  const mainSetting = orderData.value.mainStoneSettingFee || 0;
  const subSetting = orderData.value.subStoneSettingFee || 0;
  const packing = orderData.value.packingFee || 0;
  const certificate = orderData.value.certificateFee || 0;
  const postage = orderData.value.postageFee || 0;
  const mold = orderData.value.moldFee || 0;
  const labor = orderData.value.laborFee || 0;
  orderData.value.totalAmount = parseFloat((
    goldMaterial + mainStone + subStone + mainSetting + subSetting + 
    packing + certificate + postage + mold + labor
  ).toFixed(2));
};

// ===== 加载数据 =====
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
      // 计算默认值
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

// ===== 保存 - 保存后回到列表 =====
const handleSave = async () => {
  // 简单校验
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
    // ⭐ 保存后回到工厂列表
    router.push('/order/factory-list');
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

// ===== 更新状态 =====
const updateStatus = async () => {
  if (!selectedStatus.value) {
    ElMessage.warning('请选择状态');
    return;
  }

  const label = statusMap[selectedStatus.value]?.text || selectedStatus.value;
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

// ===== 返回 =====
const goBack = () => {
  router.push('/order/factory-list');
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  margin: 18px 0;
}

/* ===== 区域标题 ===== */
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

/* ===== 合计金额特殊样式 ===== */
.form-section :deep(.el-form-item:last-child .el-input-number input) {
  color: #E6A23C;
  font-weight: bold;
}
</style>