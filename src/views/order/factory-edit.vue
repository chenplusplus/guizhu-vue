<!-- src/views/order/factory-edit.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
        <h2>✏️ 编辑订单</h2>
        <el-tag :type="statusTagType" size="large">{{ statusText }}</el-tag>
        <el-tag v-if="orderData?.warnFlag" type="danger" size="large">⚠️ 紧急</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="saveOrder" :loading="saving">
          <el-icon><Check /></el-icon> 保存
        </el-button>
        <el-button 
          v-if="canGenerateBill" 
          type="warning" 
          @click="handleGenerateBill"
          :loading="billLoading"
        >
          <el-icon><Document /></el-icon> 生成账单
        </el-button>
      </div>
    </div>

    <!-- 基本信息 -->
    <el-card class="info-card">
      <el-row :gutter="16">
        <el-col :span="4"><span class="label">订单号：</span><span class="value">{{ orderData?.orderNo }}</span></el-col>
        <el-col :span="4"><span class="label">客户：</span><span class="value">{{ orderData?.customerName }}</span></el-col>
        <el-col :span="4"><span class="label">品名：</span><span class="value">{{ orderData?.productName }}</span></el-col>
        <el-col :span="4"><span class="label">颜色：</span><span class="value">{{ orderData?.color }}</span></el-col>
        <el-col :span="4"><span class="label">件数：</span><span class="value">{{ orderData?.quantity }}</span></el-col>
        <el-col :span="4"><span class="label">手寸：</span><span class="value">{{ orderData?.size || '-' }}</span></el-col>
      </el-row>
      <!-- 产品图片 -->
      <div class="image-area">
        <span class="label">产品图片：</span>
        <el-image
          v-if="orderData?.imageUrl"
          :src="orderData.imageUrl"
          :preview-src-list="[orderData.imageUrl]"
          fit="cover"
          class="product-image"
          preview-teleported
        />
        <span v-else style="color:#ccc;">暂无图片</span>
      </div>
    </el-card>

    <!-- 工厂数据 -->
    <el-card class="form-card">
      <template #header><span style="font-weight:600;">📊 工厂数据</span></template>
      <el-row :gutter="16">
        <el-col :span="4">
          <el-form-item label="总重(g)">
            <el-input-number v-model="orderData.totalWeight" :precision="3" :min="0" style="width:100%;" @change="calcFactory" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="净重(g)">
            <el-input-number v-model="orderData.netWeight" :precision="3" :min="0" style="width:100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="损耗率">
            <el-select v-model="orderData.lossRate" style="width:100%;" @change="calcFactory">
              <el-option :value="1.08" label="1.08" />
              <el-option :value="1.10" label="1.10" />
              <el-option :value="1.12" label="1.12" />
              <el-option :value="1.15" label="1.15" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="加耗重">
            <el-input-number v-model="orderData.addLossWeight" :precision="3" disabled style="width:100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="金价(元/克)">
            <el-input-number v-model="orderData.goldPrice" :precision="2" :min="0" style="width:100%;" @change="calcFactory" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="足金料">
            <el-input-number v-model="orderData.goldMaterialFee" :precision="2" disabled style="width:100%;" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-card>

    <!-- 主石信息 -->
    <el-card class="form-card">
      <template #header><span style="font-weight:600;">💎 主石信息</span></template>
      <el-row :gutter="16">
        <el-col :span="4">
          <el-form-item label="粒数">
            <el-input-number v-model="orderData.mainStoneQty" :min="0" style="width:100%;" @change="calcMainStone" />
          </el-form-item>
        </el-col>
        <el-col :span="5">
          <el-form-item label="石重(ct)">
            <el-input-number v-model="orderData.mainStoneWeight" :precision="3" :min="0" style="width:100%;" @change="calcMainStone" />
          </el-form-item>
        </el-col>
        <el-col :span="5">
          <el-form-item label="单价(元)">
            <el-input-number v-model="orderData.mainStonePrice" :precision="2" :min="0" style="width:100%;" @change="calcMainStone" />
          </el-form-item>
        </el-col>
        <el-col :span="5">
          <el-form-item label="金额(元)">
            <el-input-number v-model="orderData.mainStoneAmount" :precision="2" disabled style="width:100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="5">
          <el-form-item label="镶石工费">
            <el-input-number v-model="orderData.mainStoneSettingFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-card>

    <!-- 副石信息 -->
    <el-card class="form-card">
      <template #header><span style="font-weight:600;">💎 副石信息</span></template>
      <el-row :gutter="16">
        <el-col :span="4">
          <el-form-item label="粒数">
            <el-input-number v-model="orderData.subStoneQty" :min="0" style="width:100%;" @change="calcSubStone" />
          </el-form-item>
        </el-col>
        <el-col :span="5">
          <el-form-item label="石重(ct)">
            <el-input-number v-model="orderData.subStoneWeight" :precision="3" :min="0" style="width:100%;" @change="calcSubStone" />
          </el-form-item>
        </el-col>
        <el-col :span="5">
          <el-form-item label="单价(元)">
            <el-input-number v-model="orderData.subStonePrice" :precision="2" :min="0" style="width:100%;" @change="calcSubStone" />
          </el-form-item>
        </el-col>
        <el-col :span="5">
          <el-form-item label="金额(元)">
            <el-input-number v-model="orderData.subStoneAmount" :precision="2" disabled style="width:100%;" />
          </el-form-item>
        </el-col>
        <el-col :span="5">
          <el-form-item label="镶石工费">
            <el-input-number v-model="orderData.subStoneSettingFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-card>

    <!-- 其他费用 -->
    <el-card class="form-card">
      <template #header><span style="font-weight:600;">📦 其他费用</span></template>
      <el-row :gutter="16">
        <el-col :span="4">
          <el-form-item label="包装费">
            <el-input-number v-model="orderData.packingFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="证书费">
            <el-input-number v-model="orderData.certificateFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="邮费">
            <el-input-number v-model="orderData.postageFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="版费">
            <el-input-number v-model="orderData.moldFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="工费">
            <el-input-number v-model="orderData.laborFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-form-item label="合计金额">
            <el-input-number v-model="orderData.totalAmount" :precision="2" disabled style="width:100%;" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-card>

    <!-- 制作状态 -->
    <el-card class="form-card">
      <template #header><span style="font-weight:600;">🔄 制作状态</span></template>
      <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
        <span style="color:#666;">当前状态：</span>
        <el-tag :type="statusTagType" size="large">{{ statusText }}</el-tag>
        
        <span style="color:#666; margin-left:16px;">更新为：</span>
      <el-select v-model="selectedStatus" placeholder="选择下一个状态" style="width:200px;">
    <el-option label="出蜡" value="waxing" />
    <el-option label="倒模" value="molded" />
    <el-option label="执模" value="setting" />
    <el-option label="CNC" value="cnc" />
    <el-option label="扫镶口" value="sweeping" />
    <el-option label="车石" value="stoneCutting" />
    <el-option label="微镶" value="microInlay" />
    <el-option label="手镶" value="handInlay" />
    <el-option label="抛光" value="polishing" />
    <el-option label="完成" value="completed" />
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
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Check, Document } from '@element-plus/icons-vue';
import { getOrderDetail, updateOrder, updateProduction, generateBill } from '@/api/order';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const orderId = computed(() => Number(route.params.id));
const orderData = ref({});
const loading = ref(false);
const saving = ref(false);
const statusLoading = ref(false);
const billLoading = ref(false);
const selectedStatus = ref('');

// 状态映射
const statusMap = {
  waxing: { text: '出蜡', type: 'primary', step: 1 },
  molded: { text: '倒模', type: 'primary', step: 2 },
  setting: { text: '执模', type: 'primary', step: 3 },
  cnc: { text: 'CNC', type: 'primary', step: 4 },
  sweeping: { text: '扫镶口', type: 'primary', step: 5 },
  stoneCutting: { text: '车石', type: 'primary', step: 6 },
  microInlay: { text: '微镶', type: 'primary', step: 7 },
  handInlay: { text: '手镶', type: 'primary', step: 8 },
  polishing: { text: '抛光', type: 'warning', step: 9 },
  completed: { text: '已完成', type: 'success', step: 10 },
};

// 状态步骤（用于进度条）
const statusSteps = [
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

// 状态转换规则
const transitions = {
  accepted: ['waxing'],
  waxing: ['molded'],
  molded: ['setting'],
  setting: ['cnc'],
  cnc: ['sweeping'],
  sweeping: ['stoneCutting'],
  stoneCutting: ['microInlay'],
  microInlay: ['handInlay'],
  handInlay: ['polishing'],
  polishing: ['completed'],
  completed: [],
};

const statusText = computed(() => {
  const s = orderData.value?.flowStatus;
  return statusMap[s]?.text || s || '-';
});

const statusTagType = computed(() => {
  const s = orderData.value?.flowStatus;
  return statusMap[s]?.type || 'info';
});

const currentStep = computed(() => {
  const s = orderData.value?.flowStatus;
  return statusMap[s]?.step ?? 0;
});

const availableStatuses = computed(() => {
  const current = orderData.value?.flowStatus;
  const targets = transitions[current] || [];
  return targets.map(key => ({
    value: key,
    label: statusMap[key]?.text || key,
  }));
});

const canGenerateBill = computed(() => {
  const status = orderData.value?.flowStatus;
  return status === 'polishing' || status === 'completed';
});

// ===== 计算函数 =====
const calcFactory = () => {
  const total = orderData.value.totalWeight || 0;
  const loss = orderData.value.lossRate || 1.10;
  const gold = orderData.value.goldPrice || 0;
  orderData.value.addLossWeight = total * loss;
  orderData.value.goldMaterialFee = orderData.value.addLossWeight * gold;
  calcTotal();
};

const calcMainStone = () => {
  const qty = orderData.value.mainStoneQty || 0;
  const weight = orderData.value.mainStoneWeight || 0;
  const price = orderData.value.mainStonePrice || 0;
  orderData.value.mainStoneAmount = qty * weight * price;
  calcTotal();
};

const calcSubStone = () => {
  const qty = orderData.value.subStoneQty || 0;
  const weight = orderData.value.subStoneWeight || 0;
  const price = orderData.value.subStonePrice || 0;
  orderData.value.subStoneAmount = qty * weight * price;
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
  orderData.value.totalAmount = goldMaterial + mainStone + subStone + mainSetting + subSetting + packing + certificate + postage + mold + labor;
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const res = await getOrderDetail(orderId.value);
    orderData.value = res?.data || {};
    // 计算默认值
    calcFactory();
    calcMainStone();
    calcSubStone();
    calcTotal();
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};
// 判断是否可编辑
const isEditable = computed(() => {
  const userType = userStore.userType;
  const status = orderData.value?.flowStatus;
  
  // 管理员可编辑
  if (userType === 'admin') return true;
  
  // 工厂业务员：客户已审核及之后状态可编辑
  if (userType === 'factoryOrder') {
    const editableStatuses = [
      'customerAudited', 'accepted', 'dataConfirm', 'waxing',
      'molded', 'cnc', 'partsMissing', 'stoneReady',
      'setting', 'glue', 'inlay', 'assembly', 'polishing'
    ];
    return editableStatuses.includes(status);
  }
  
  return false;
});

// 所有字段禁用状态
const allDisabled = computed(() => !isEditable.value);
// ===== 保存 =====
const saveOrder = async () => {
  saving.value = true;
  try {
    // 深拷贝数据，避免修改原对象
    const payload = JSON.parse(JSON.stringify(orderData.value));
    
    // 确保 OrderId 存在
    payload.OrderId = orderData.value.orderId;
    
    // 格式化数字字段：将字符串转为数字，null/undefined 转为 0 或删除
    const numberFields = [
      'quantity', 'amount',
      'totalWeight', 'netWeight', 'lossRate', 'addLossWeight', 'goldPrice', 'goldMaterialFee',
      'mainStoneQty', 'mainStoneWeight', 'mainStonePrice', 'mainStoneAmount', 'mainStoneSettingFee',
      'subStoneQty', 'subStoneWeight', 'subStonePrice', 'subStoneAmount', 'subStoneSettingFee',
      'packingFee', 'certificateFee', 'postageFee', 'moldFee', 'laborFee', 'totalAmount',
      'costPrice', 'profit', 'deliveryDays'
    ];
    
    numberFields.forEach(field => {
      if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
        const num = Number(payload[field]);
        if (!isNaN(num)) {
          payload[field] = num;
        } else {
          // 如果是无效数字，删除该字段（让后端使用默认值）
          delete payload[field];
        }
      } else {
        // 如果值为空，删除该字段
        delete payload[field];
      }
    });

    // 字符串字段：空字符串删除或转为 null
    const stringFields = ['productName', 'imageUrl', 'diamondLevel', 'params', 'color', 'logoUrl', 'url', 'remark', 'factoryRemark'];
    stringFields.forEach(field => {
      if (payload[field] === '' || payload[field] === null || payload[field] === undefined) {
        delete payload[field];
      }
    });

    // 确保必要的字段存在
    if (!payload.productName) {
      payload.productName = orderData.value.productName || '';
    }

    console.log('提交数据:', payload);
    
    await updateOrder(payload);
    ElMessage.success('保存成功');
    loadData();
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error(error.response?.data?.message || error.message || '保存失败');
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
    await updateProduction(orderId.value, { status: selectedStatus.value, step: currentStep.value + 1 });
    ElMessage.success(`状态已更新为：${label}`);
    selectedStatus.value = '';
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '更新失败');
  } finally {
    statusLoading.value = false;
  }
};

// ===== 生成账单 =====
const handleGenerateBill = async () => {
  try {
    await ElMessageBox.confirm('确定要生成账单吗？', '生成账单', { type: 'info' });
    billLoading.value = true;
    await generateBill(orderId.value);
    ElMessage.success('账单已生成，等待工厂审核员审核');
    loadData();
  } catch {}
  finally {
    billLoading.value = false;
  }
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; background: #fff; padding: 16px 20px; border-radius: 8px; }
.header-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.header-left h2 { font-size: 18px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; flex-wrap: wrap; }

.info-card { margin-bottom: 16px; background: #fff; }
.info-card .el-row { padding: 4px 0; }
.info-card .label { color: #999; font-size: 14px; }
.info-card .value { color: #333; font-size: 14px; font-weight: 500; }

.image-area { margin-top: 12px; display: flex; align-items: center; gap: 12px; }
.product-image { width: 80px; height: 80px; border-radius: 4px; object-fit: cover; cursor: pointer; transition: transform 0.3s; }
.product-image:hover { transform: scale(1.2); z-index: 10; }

.form-card { margin-bottom: 16px; background: #fff; }
.form-card :deep(.el-form-item) { margin-bottom: 8px; }
.form-card :deep(.el-form-item__label) { font-size: 13px; color: #666; padding-right: 4px; }

:deep(.el-card__body) { padding: 16px 20px; }
:deep(.el-card__header) { padding: 12px 20px; border-bottom: 1px solid #f0f0f0; }
</style>