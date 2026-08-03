<!-- src/views/order/bill-edit.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2>✏️ 编辑出货明细</h2>
      <div>
        <el-button type="primary" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon> 保存
        </el-button>
        <el-button type="success" @click="handleGenerateLr" :loading="lrGenerating">
          <el-icon><Document /></el-icon> 生成LR表
        </el-button>
        <el-button type="warning" @click="handleSubmitAudit">
          <el-icon><Select /></el-icon> 提交审核
        </el-button>
      </div>
    </div>

    <!-- 出货明细表格 -->
    <el-card>
      <template #header>
        <span style="font-weight:600;">📋 出货明细</span>
        <span style="margin-left:16px;color:#999;font-size:13px;">
          账单号：{{ billNo }} ｜ 客户：{{ customerName }}
        </span>
      </template>

      <div class="edit-table-wrapper">
        <el-table :data="details" border stripe>
          <el-table-column label="序号" width="60" align="center">
            <template #default="{ $index }">{{ $index + 1 }}</template>
          </el-table-column>
          <el-table-column label="品名" min-width="100">
            <template #default="{ row }">
              <el-input v-model="row.productName" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="颜色" width="80">
            <template #default="{ row }">
              <el-select v-model="row.color" size="small" style="width:100%;">
                <el-option label="K黄" value="K黄" />
                <el-option label="K白" value="K白" />
                <el-option label="K红" value="K红" />
                <el-option label="9K" value="9K" />
                <el-option label="14K" value="14K" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="件数" width="70">
            <template #default="{ row }">
              <el-input-number v-model="row.quantity" :min="1" size="small" style="width:100%;" />
            </template>
          </el-table-column>
          <el-table-column label="净重" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.netWeight" :precision="3" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          <el-table-column label="金价" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.goldPrice" :precision="2" size="small" style="width:100%;" @change="calcRow(row)" />
            </template>
          </el-table-column>
          <el-table-column label="足金料" width="100">
            <template #default="{ row }">
              {{ row.goldMaterialFee || 0 }}
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
          <el-table-column label="应收金额" width="110">
            <template #default="{ row }">
              <span style="color:#E6A23C;font-weight:bold;">{{ (row.totalAmount || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <!-- LR表 -->
    <el-card v-if="lrData" style="margin-top:16px;">
      <template #header>
        <span style="font-weight:600;">📊 支出收入LR表</span>
        <el-tag type="success" size="small" style="margin-left:12px;">已生成</el-tag>
      </template>

      <div class="lr-table-wrapper">
        <table class="lr-table">
          <thead>
            <tr>
              <th>序</th>
              <th>品名</th>
              <th>客户</th>
              <th>颜色</th>
              <th>净重</th>
              <th>金价</th>
              <th>足金料</th>
              <th>主石</th>
              <th>副石</th>
              <th>工费</th>
              <th>应收</th>
              <th>类型</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in lrRows" :key="row.seqDisplay" :class="row.rowType">
              <td>{{ row.seqDisplay }}</td>
              <td>{{ row.productName }}</td>
              <td>{{ row.customerName }}</td>
              <td>{{ row.color }}</td>
              <td>{{ row.netWeight }}</td>
              <td>{{ row.goldPrice }}</td>
              <td>{{ row.goldMaterialFee }}</td>
              <td>{{ row.mainStoneAmount }}</td>
              <td>{{ row.subStoneAmount }}</td>
              <td>{{ row.laborFee }}</td>
              <td>{{ row.totalAmount }}</td>
              <td>
                <el-tag :type="row.rowType === 'sale' ? 'primary' : 'info'" size="small">
                  {{ row.rowType === 'sale' ? '销售' : '成本' }}
                </el-tag>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="10" style="text-align:right;font-weight:600;">销售总额：</td>
              <td style="font-weight:600;color:#67C23A;">¥{{ (lrSummary.totalSale || 0).toFixed(2) }}</td>
              <td></td>
            </tr>
            <tr>
              <td colspan="10" style="text-align:right;font-weight:600;">成本总额：</td>
              <td style="font-weight:600;color:#E6A23C;">¥{{ (lrSummary.totalCost || 0).toFixed(2) }}</td>
              <td></td>
            </tr>
            <tr style="background:#fff7e6;">
              <td colspan="10" style="text-align:right;font-weight:600;font-size:16px;">利润：</td>
              <td style="font-weight:600;font-size:16px;color:#F56C6C;">¥{{ (lrSummary.profit || 0).toFixed(2) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Document, Select } from '@element-plus/icons-vue';
import { getBillDetail, saveBillData, submitBillAudit, generateLr as generateLrApi } from '@/api/bill';

const route = useRoute();
const router = useRouter();
const billId = computed(() => Number(route.params.id));

const loading = ref(false);
const saving = ref(false);
const lrGenerating = ref(false);
const billNo = ref('');
const customerName = ref('');
const details = ref([]);
const lrData = ref(null);

const lrRows = computed(() => {
  if (!lrData.value) return [];
  return lrData.value.rows || [];
});

const lrSummary = computed(() => {
  if (!lrData.value) return {};
  return lrData.value.summary || {};
});

// ===== 计算单行 =====
const calcRow = (row) => {
  const netWeight = row.netWeight || 0;
  const goldPrice = row.goldPrice || 0;
  const lossRate = row.lossRate || 1.1;

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

// ===== 加载数据 =====
const loadData = async () => {
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

    if (data.billData) {
      try {
        details.value = JSON.parse(data.billData);
        details.value.forEach(row => calcRow(row));
      } catch {
        details.value = [];
      }
    }

    if (data.lrData) {
      try {
        lrData.value = JSON.parse(data.lrData);
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

// ===== 保存 =====
const handleSave = async () => {
  saving.value = true;
  try {
    await saveBillData({
      billId: billId.value,
      billData: JSON.stringify(details.value),
      lrData: JSON.stringify(lrData.value)
    });
    ElMessage.success('保存成功');
  } catch {
    ElMessage.error('保存失败');
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
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: #fff; padding: 16px 20px; border-radius: 8px; flex-wrap: wrap; gap: 8px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }

.edit-table-wrapper { overflow-x: auto; }
:deep(.el-table .cell) { padding: 2px 4px; }
:deep(.el-input-number) { width: 100%; }

.lr-table-wrapper { overflow-x: auto; }
.lr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.lr-table th { background: #f5f7fa; padding: 6px 10px; border: 1px solid #e8ecf1; text-align: center; font-weight: 600; }
.lr-table td { padding: 6px 10px; border: 1px solid #e8ecf1; text-align: center; }
.lr-table tfoot td { background: #fafafa; font-weight: 600; }
.lr-table .sale { background: #ffffff; }
.lr-table .cost { background: #f5f7fa; }

:deep(.el-card__body) { padding: 16px; }
</style>