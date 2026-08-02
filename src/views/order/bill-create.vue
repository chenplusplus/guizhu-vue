<!-- src/views/order/bill-create.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2>📄 生成账单</h2>
      <div>
        <el-button type="primary" @click="handleCreateBill" :disabled="selectedOrders.length === 0" :loading="creating">
          生成出货明细
        </el-button>
      </div>
    </div>

    <!-- 选择订单 -->
    <el-card>
      <template #header>
        <span style="font-weight:600;">选择已完成订单</span>
        <span style="margin-left:16px;color:#999;font-size:13px;">
          已选 {{ selectedOrders.length }} 个订单
        </span>
      </template>

      <el-table :data="orderList" border stripe @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="orderNo" label="订单号" width="150" />
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column prop="productName" label="品名" min-width="120" />
        <el-table-column prop="quantity" label="件数" width="70" align="center" />
        <el-table-column prop="amount" label="金额" width="110" align="right">
          <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="color" label="颜色" width="80" />
        <el-table-column prop="createdAt" label="完成时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && orderList.length === 0" description="暂无已完成订单" />
    </el-card>

    <!-- 出货明细预览 -->
    <el-card v-if="billData" style="margin-top:16px;">
      <template #header>
        <span style="font-weight:600;">📋 出货明细</span>
        <span style="margin-left:16px;color:#999;font-size:13px;">
          账单号：{{ billNo }}
        </span>
      </template>

      <div class="bill-table-wrapper">
        <table class="bill-table">
          <thead>
            <tr>
              <th>序号</th>
              <th>品名</th>
              <th>客户</th>
              <th>颜色</th>
              <th>件数</th>
              <th>手寸</th>
              <th>总重</th>
              <th>净重</th>
              <th>损耗</th>
              <th>加耗重</th>
              <th>金价</th>
              <th>足金料</th>
              <th>主石</th>
              <th>副石</th>
              <th>工费</th>
              <th>应收</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in billDetails" :key="row.seqNo">
              <td>{{ row.seqNo }}</td>
              <td>{{ row.productName }}</td>
              <td>{{ row.customerName }}</td>
              <td>{{ row.color }}</td>
              <td>{{ row.quantity }}</td>
              <td>{{ row.size || '-' }}</td>
              <td>{{ row.totalWeight }}</td>
              <td>{{ row.netWeight }}</td>
              <td>{{ row.lossRate }}</td>
              <td>{{ row.addLossWeight }}</td>
              <td>{{ row.goldPrice }}</td>
              <td>{{ row.goldMaterialFee }}</td>
              <td>{{ row.mainStoneAmount || 0 }}</td>
              <td>{{ row.subStoneAmount || 0 }}</td>
              <td>{{ row.laborFee || 0 }}</td>
              <td>{{ row.totalAmount }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="15" style="text-align:right;font-weight:600;">合计：</td>
              <td style="font-weight:600;color:#E6A23C;">
                ¥{{ totalAmount.toFixed(2) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="margin-top:16px;text-align:right;">
        <el-button type="success" @click="goEditBill">
          在线编辑出货明细
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { getAvailableOrders, createBill, getBillDetail } from '@/api/bill';

const router = useRouter();
const loading = ref(false);
const creating = ref(false);
const orderList = ref([]);
const selectedOrders = ref([]);
const billData = ref(null);
const billNo = ref('');
const billId = ref(0);

const billDetails = computed(() => {
  if (!billData.value) return [];
  try {
    return JSON.parse(billData.value);
  } catch {
    return [];
  }
});

const totalAmount = computed(() => {
  return billDetails.value.reduce((sum, row) => sum + (row.totalAmount || 0), 0);
});

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getAvailableOrders();
    orderList.value = res?.data || [];
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const handleSelectionChange = (selection) => {
  selectedOrders.value = selection;
};

// ✅ 改名避免和 import 冲突
const handleCreateBill = async () => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请至少选择一个订单');
    return;
  }

  creating.value = true;
  try {
    const orderIds = selectedOrders.value.map(o => o.orderId);
    const res = await createBill({
      orderIds: orderIds,
      billDate: new Date().toISOString()
    });

    if (res.success) {
      billId.value = res.billId;
      billNo.value = res.billNo;

      const detailRes = await getBillDetail(res.billId);
      billData.value = detailRes?.data?.billData || '[]';
      ElMessage.success('账单创建成功');
    }
  } catch {
    ElMessage.error('创建账单失败');
  } finally {
    creating.value = false;
  }
};

const goEditBill = () => {
  if (billId.value) {
    router.push(`/order/bill/edit/${billId.value}`);
  }
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }

.bill-table-wrapper { overflow-x: auto; }
.bill-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bill-table th { background: #f5f7fa; padding: 8px 10px; border: 1px solid #e8ecf1; text-align: center; font-weight: 600; white-space: nowrap; }
.bill-table td { padding: 6px 10px; border: 1px solid #e8ecf1; text-align: center; }
.bill-table tfoot td { background: #fafafa; font-weight: 600; }

:deep(.el-card__body) { padding: 16px; }
</style>