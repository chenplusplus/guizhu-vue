<!-- src/views/order/bill-edit.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>✏️ {{ isNew ? '创建出货单' : '编辑出货明细' }}</h2>
        <el-tag v-if="isNew" type="warning" size="large">新建</el-tag>
        <el-tag v-else :type="statusType" size="large">{{ statusText }}</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon> 保存
        </el-button>
        <el-button type="success" @click="handleGenerateLr" :loading="lrGenerating" v-if="!isNew">
          <el-icon><Document /></el-icon> 生成LR表
        </el-button>
        <el-button type="warning" @click="handleSubmitAudit" v-if="!isNew">
          <el-icon><Select /></el-icon> 提交审核
        </el-button>
      </div>
    </div>

    <!-- 账单信息 -->
    <el-card style="margin-bottom:16px;">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="info-item"><span class="label">账单号：</span>{{ billNo || '-' }}</div>
        </el-col>
        <el-col :span="6">
          <div class="info-item"><span class="label">客户：</span>{{ customerName || '-' }}</div>
        </el-col>
        <el-col :span="6">
          <div class="info-item"><span class="label">状态：</span>
            <el-tag :type="statusType" size="small">{{ statusText }}</el-tag>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item"><span class="label">订单数：</span>{{ details.length }}</div>
        </el-col>
      </el-row>
    </el-card>

    <!-- ⭐ 出货明细表格 - 更完整的字段 -->
    <el-card>
      <template #header>
        <span style="font-weight:600;">📋 出货明细</span>
        <span style="margin-left:16px;color:#999;font-size:13px;">
          共 {{ details.length }} 条明细 ｜ 合计金额：<b style="color:#E6A23C;">¥{{ totalAmount.toFixed(2) }}</b>
        </span>
      </template>

      <div class="edit-table-wrapper">
        <el-table :data="details" border stripe max-height="500">
          <el-table-column label="序号" width="55" align="center">
            <template #default="{ $index }">{{ $index + 1 }}</template>
          </el-table-column>
          
          <el-table-column label="订单号" width="140">
            <template #default="{ row }">
              <el-link type="primary" @click="viewOrder(row.orderId)">{{ row.orderNo }}</el-link>
            </template>
          </el-table-column>
          
          <el-table-column label="品名" min-width="100">
            <template #default="{ row }">
              <el-input v-model="row.productName" size="small" />
            </template>
          </el-table-column>
          
          <el-table-column label="客户" width="100">
            <template #default="{ row }">
              <el-input v-model="row.customerName" size="small" />
            </template>
          </el-table-column>
          
          <el-table-column label="颜色" width="80">
            <template #default="{ row }">
              <el-select v-model="row.color" size="small" style="width:100%;">
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
          
          <el-table-column label="件数" width="70">
            <template #default="{ row }">
              <el-input-number v-model="row.quantity" :min="1" size="small" style="width:100%;" @change="calcTotal" />
            </template>
          </el-table-column>
          
          <el-table-column label="手寸" width="80">
            <template #default="{ row }">
              <el-input v-model="row.size" size="small" />
            </template>
          </el-table-column>
          
          <el-table-column label="总重(g)" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.totalWeight" :precision="3" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="净重(g)" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.netWeight" :precision="3" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="损耗率" width="80">
            <template #default="{ row }">
              <el-input-number v-model="row.lossRate" :precision="2" :step="0.05" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="加耗重" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.addLossWeight" :precision="3" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="金价" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.goldPrice" :precision="2" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="金料费" width="100">
            <template #default="{ row }">
              <el-input-number v-model="row.goldMaterialFee" :precision="2" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="主石金额" width="100">
            <template #default="{ row }">
              <el-input-number v-model="row.mainStoneAmount" :precision="2" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="副石金额" width="100">
            <template #default="{ row }">
              <el-input-number v-model="row.subStoneAmount" :precision="2" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="工费" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.laborFee" :precision="2" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="包装费" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.packingFee" :precision="2" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="证书费" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.certificateFee" :precision="2" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="运费" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.postageFee" :precision="2" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="模具费" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.moldFee" :precision="2" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          
          <el-table-column label="应收金额" width="110" fixed="right">
            <template #default="{ row }">
              <span style="color:#E6A23C;font-weight:bold;">¥{{ (row.totalAmount || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <!-- 底部汇总 -->
      <div class="table-footer">
        <span>合计件数：<b>{{ totalQuantity }}</b></span>
        <span>金料费合计：<b>¥{{ totalGoldFee.toFixed(2) }}</b></span>
        <span>工费合计：<b>¥{{ totalLaborFee.toFixed(2) }}</b></span>
        <span style="color:#E6A23C;font-size:16px;">应收合计：<b>¥{{ totalAmount.toFixed(2) }}</b></span>
      </div>
    </el-card>

    <!-- LR表 -->
    <el-card v-if="lrData" style="margin-top:16px;">
      <template #header>
        <span style="font-weight:600;">📊 支出收入LR表</span>
        <el-tag type="success" size="small" style="margin-left:12px;">已生成</el-tag>
      </template>
      <!-- ... LR表内容保持不变 ... -->
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Check, Document, Select } from '@element-plus/icons-vue';
import { getBillDetail, saveBillData, submitBillAudit, generateLr as generateLrApi } from '@/api/bill';

const route = useRoute();
const router = useRouter();
const billId = computed(() => Number(route.params.id));

const loading = ref(false);
const saving = ref(false);
const lrGenerating = ref(false);
const isNew = ref(false);
const billNo = ref('');
const customerName = ref('');
const billStatus = ref('');
const details = ref([]);
const lrData = ref(null);

// ===== 状态 =====
const statusMap = {
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  confirmed: { text: '已确认', type: 'success' },
};

const statusText = computed(() => statusMap[billStatus.value]?.text || billStatus.value || '-');
const statusType = computed(() => statusMap[billStatus.value]?.type || 'info');

// ===== 汇总计算 =====
const totalAmount = computed(() => {
  return details.value.reduce((sum, row) => sum + (row.totalAmount || 0), 0);
});

const totalQuantity = computed(() => {
  return details.value.reduce((sum, row) => sum + (row.quantity || 1), 0);
});

const totalGoldFee = computed(() => {
  return details.value.reduce((sum, row) => sum + (row.goldMaterialFee || 0), 0);
});

const totalLaborFee = computed(() => {
  return details.value.reduce((sum, row) => sum + (row.laborFee || 0), 0);
});

// ===== 计算单行 =====
const calcRow = (row) => {
  const netWeight = row.netWeight || 0;
  const goldPrice = row.goldPrice || 0;
  const lossRate = row.lossRate || 1.0;

  row.addLossWeight = parseFloat((netWeight * lossRate).toFixed(3));
  row.goldMaterialFee = parseFloat((row.addLossWeight * goldPrice).toFixed(2));

  const mainStone = row.mainStoneAmount || 0;
  const subStone = row.subStoneAmount || 0;
  const labor = row.laborFee || 0;
  const packing = row.packingFee || 0;
  const certificate = row.certificateFee || 0;
  const postage = row.postageFee || 0;
  const mold = row.moldFee || 0;

  row.totalAmount = parseFloat((
    row.goldMaterialFee + mainStone + subStone + labor + packing + certificate + postage + mold
  ).toFixed(2));
};

const calcTotal = () => {
  // 重新计算所有行
  details.value.forEach(row => calcRow(row));
};

// ===== 加载数据 =====
const loadData = async () => {
  // 如果是新建（没有 billId），从 query 参数获取订单数据
  if (!route.params.id) {
    isNew.value = true;
    const orderIds = route.query.orderIds?.split(',').map(Number) || [];
    if (orderIds.length === 0) {
      ElMessage.warning('请选择订单');
      router.back();
      return;
    }
    // 从工厂列表传过来的数据
    const ordersData = route.query.ordersData ? JSON.parse(decodeURIComponent(route.query.ordersData)) : [];
    if (ordersData.length > 0) {
      details.value = ordersData.map(o => ({
        orderId: o.orderId,
        orderNo: o.orderNo,
        customerName: o.customerName || '',
        productName: o.productName || '',
        color: o.color || 'K黄',
        quantity: o.quantity || 1,
        size: o.size || '',
        totalWeight: o.totalWeight || 0,
        netWeight: o.netWeight || 0,
        lossRate: o.lossRate || 1.0,
        addLossWeight: o.addLossWeight || 0,
        goldPrice: o.goldPrice || 0,
        goldMaterialFee: o.goldMaterialFee || 0,
        mainStoneAmount: o.mainStoneAmount || 0,
        subStoneAmount: o.subStoneAmount || 0,
        laborFee: o.laborFee || 0,
        packingFee: o.packingFee || 0,
        certificateFee: o.certificateFee || 0,
        postageFee: o.postageFee || 0,
        moldFee: o.moldFee || 0,
        totalAmount: o.totalAmount || 0,
      }));
      customerName.value = ordersData[0]?.customerName || '';
      calcTotal();
    }
    return;
  }

  // 编辑模式
  loading.value = true;
  try {
    const res = await getBillDetail(billId.value);
    const data = res?.data;
    if (!data) {
      ElMessage.error('账单不存在');
      router.back();
      return;
    }

    billNo.value = data.billNo || '';
    customerName.value = data.customerName || '';
    billStatus.value = data.status || '';

    if (data.details) {
      details.value = data.details;
      details.value.forEach(row => calcRow(row));
    }

    if (data.lrData) {
      try {
        lrData.value = typeof data.lrData === 'string' ? JSON.parse(data.lrData) : data.lrData;
      } catch {
        lrData.value = null;
      }
    }
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

// ===== 查看订单 =====
const viewOrder = (orderId) => {
  if (orderId) {
    router.push(`/order/detail/${orderId}`);
  }
};

// ===== 保存 =====
const handleSave = async () => {
  saving.value = true;
  try {
    await saveBillData({
      billId: billId.value,
      details: details.value,
    });
    ElMessage.success('保存成功');
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

// ===== 生成LR表 =====
const handleGenerateLr = async () => {
  lrGenerating.value = true;
  try {
    const res = await generateLrApi(billId.value);
    if (res.success) {
      lrData.value = res.data;
      ElMessage.success('LR表生成成功');
    }
  } catch {
    ElMessage.error('生成LR表失败');
  } finally {
    lrGenerating.value = false;
  }
};

// ===== 提交审核 =====
const handleSubmitAudit = async () => {
  try {
    await ElMessageBox.confirm('确认提交审核吗？提交后工厂审核员将进行审核。', '提交审核', { type: 'info' });
    await submitBillAudit(billId.value);
    ElMessage.success('提交审核成功');
    router.push('/order/bill/my-list');
  } catch {}
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100%; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  flex-wrap: wrap;
  gap: 8px;
}
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.header-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.header-right { display: flex; gap: 8px; flex-wrap: wrap; }

.info-item { padding: 4px 0; }
.info-item .label { color: #999; font-size: 14px; }
.info-item .value { color: #333; font-size: 14px; }

.edit-table-wrapper { overflow-x: auto; }
:deep(.el-table .cell) { padding: 2px 4px; }
:deep(.el-input-number) { width: 100%; }
:deep(.el-input) { width: 100%; }

.table-footer {
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 6px;
  margin-top: 12px;
  font-size: 14px;
  flex-wrap: wrap;
}
.table-footer b { color: #303133; }

/* LR表样式 */
.lr-table-wrapper { overflow-x: auto; }
.lr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.lr-table th { background: #f5f7fa; padding: 6px 10px; border: 1px solid #e8ecf1; text-align: center; font-weight: 600; }
.lr-table td { padding: 6px 10px; border: 1px solid #e8ecf1; text-align: center; }
.lr-table tfoot td { background: #fafafa; font-weight: 600; }
.lr-table .sale { background: #ffffff; }
.lr-table .cost { background: #f5f7fa; }

:deep(.el-card__body) { padding: 16px; }
</style>