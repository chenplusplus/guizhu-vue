<!-- src/views/inventory/index.vue —— 月度盘点专版 -->
<template>
  <div class="inventory-page">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <h2>📦 月度盘点</h2>
      <div class="header-actions">
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button type="primary" @click="goMonthlyList">
          <el-icon><Search /></el-icon> 月度盘点列表
        </el-button>
      </div>
    </div>

    <!-- ===== 快捷导航 ===== -->
    <el-card class="nav-card" shadow="never">
      <el-row :gutter="16">
        <el-col :span="8">
          <div class="nav-item nav-blue" @click="goMonthlyList">
            <div class="nav-icon">📅</div>
            <div class="nav-text">
              <div class="nav-title">月度盘点</div>
              <div class="nav-desc">按月份汇总对账</div>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="nav-item nav-orange" @click="goMonthlyDetail">
            <div class="nav-icon">👥</div>
            <div class="nav-text">
              <div class="nav-title">月度盘点明细</div>
              <div class="nav-desc">按客户维度查看</div>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="nav-item nav-green" @click="goCustomerBill">
            <div class="nav-icon">💰</div>
            <div class="nav-text">
              <div class="nav-title">客户月度账单</div>
              <div class="nav-desc">应收/收款/欠款汇总</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- ===== 月度盘点概览 ===== -->
    <el-card class="overview-card" shadow="never" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>月度盘点概览</span>
          <span class="update-time" v-if="lastUpdated">更新时间：{{ lastUpdated }}</span>
        </div>
      </template>

      <el-table :data="monthlyList" border stripe size="small">
        <el-table-column label="月份" width="120">
          <template #default="{ row }">
            <el-link type="primary" @click="viewDetail(row.yearMonth)" :underline="false">
              <strong>{{ row.yearMonth }}</strong>
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="确认时间" width="160">
          <template #default="{ row }">{{ fmtDateTime(row.confirmedAt) }}</template>
        </el-table-column>
        <el-table-column label="系统确认人" width="110">
          <template #default="{ row }">{{ row.confirmedByName || '—' }}</template>
        </el-table-column>
        <el-table-column label="说明" min-width="200">
          <template #default="{ row }">
            <span class="text-muted">{{ row.remark || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="viewDetail(row.yearMonth)">明细</el-button>
            <el-button v-if="row.status !== 'confirmed'" type="success" size="small" link @click="handleConfirm(row)">确认</el-button>
            <el-button v-else type="warning" size="small" link @click="handleUnconfirm(row)">反确认</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ===== 客户维度预览（最近已确认月份） ===== -->
    <el-card class="customer-card" shadow="never" v-if="confirmedMonth" v-loading="customerLoading">
      <template #header>
        <div class="card-header">
          <span>客户维度预览（{{ confirmedMonth }}）</span>
          <el-link type="primary" size="small" @click="viewDetail(confirmedMonth)">查看全部 →</el-link>
        </div>
      </template>

      <el-table :data="customerPreview" border stripe size="small">
        <el-table-column label="客户" min-width="160">
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="viewDetailForCustomer(confirmedMonth, row.customerId)">
              {{ row.customerName }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="系统净重(g)" align="right" width="130">
          <template #default="{row}">
            <span class="price">{{ fmtWeight(row.sysNetWeight) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="系统金料费(元)" align="right" width="140">
          <template #default="{row}">
            <span class="price">{{ fmtMoney(row.sysGoldMaterialFee) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="系统总利润(元)" align="right" width="140">
          <template #default="{row}">
            <span class="profit">{{ fmtMoney(row.sysTotalProfit) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="系统总应收(元)" align="right" width="140">
          <template #default="{row}">
            <span>{{ fmtMoney(row.sysTotalAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="系统实收(元)" align="right" width="130">
          <template #default="{row}">
            <span class="profit">{{ fmtMoney(row.sysReceivedMoney) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="系统欠款(元)" align="right" width="140">
          <template #default="{row}">
            <span :class="row.sysTotalDebtMoney > 0 ? 'debt-pos' : 'debt-zero'">
              {{ fmtMoney(row.sysTotalDebtMoney) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="手工净重(g)" align="right" width="130">
          <template #default="{row}">
            <span class="text-muted">{{ row.manualNetWeight ? fmtWeight(row.manualNetWeight) : '—' }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-empty v-else-if="!loading" description="暂无已确认的月度盘点" :image-size="60" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { getMonthlyList, getMonthlyDetail, confirmMonthly, unconfirmMonthly } from '@/api/inventoryMonthly';

const router = useRouter();
const loading = ref(false);
const customerLoading = ref(false);
const monthlyList = ref([]);
const customerPreview = ref([]);
const confirmedMonth = ref('');
const lastUpdated = ref('');

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getMonthlyList();
    monthlyList.value = res?.data || [];
    if (monthlyList.value.length > 0) {
      lastUpdated.value = new Date().toLocaleString('zh-CN', { hour12: false });
    }
    // 找最近已确认月份
    const confirmed = monthlyList.value.find(m => m.status === 'confirmed');
    if (confirmed) {
      confirmedMonth.value = confirmed.yearMonth;
      loadCustomerPreview(confirmed.yearMonth);
    } else {
      confirmedMonth.value = '';
      customerPreview.value = [];
    }
  } catch (e) {
    ElMessage.error('加载失败：' + (e.message || ''));
  } finally {
    loading.value = false;
  }
};

const loadCustomerPreview = async (yearMonth) => {
  customerLoading.value = true;
  try {
    // 通过月度明细接口获取客户数据
    const res = await getMonthlyDetail(yearMonth);
    customerPreview.value = (res?.data || []).slice(0, 10);
  } catch (e) {
    customerPreview.value = [];
  } finally {
    customerLoading.value = false;
  }
};

const goMonthlyList = () => { router.push('/inventory/monthly'); };
const goMonthlyDetail = () => {
  const m = confirmedMonth.value || new Date().toISOString().slice(0, 7);
  router.push(`/inventory/monthly/${m}`);
};
const goCustomerBill = () => { router.push('/order/customer-monthly-bill'); };

const viewDetail = (yearMonth) => { router.push(`/inventory/monthly/${yearMonth}`); };

const viewDetailForCustomer = (yearMonth, customerId) => {
  router.push({ path: `/inventory/monthly/${yearMonth}`, query: { customerId } });
};

const handleConfirm = async (row) => {
  try {
    await ElMessageBox.confirm(`确认 ${row.yearMonth} 月度盘点？`, '确认盘点', { type: 'warning' });
    await confirmMonthly(row.yearMonth, {});
    ElMessage.success('已确认');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const handleUnconfirm = async (row) => {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入反确认原因', '反确认', {
      confirmButtonText: '确认', cancelButtonText: '取消',
      inputPattern: /\S+/, inputErrorMessage: '原因不能为空'
    });
    await unconfirmMonthly(row.yearMonth);
    ElMessage.success('已反确认');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const statusType = (s) => ({ draft: 'info', confirming: 'warning', confirmed: 'success' }[s] || 'info');
const statusText = (s) => ({ draft: '草稿', confirming: '待确认', confirmed: '已确认' }[s] || s);
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('zh-CN', { hour12: false }) : '—';
const fmtMoney = (v) => v == null ? '—' : Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtWeight = (v) => v == null ? '—' : Number(v).toFixed(3) + 'g';

onMounted(loadData);
</script>

<style scoped>
.inventory-page { padding: 16px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-header h2 { margin: 0; font-size: 18px; }
.header-actions { display: flex; gap: 8px; }

/* 导航卡片 */
.nav-card { margin-bottom: 16px; }
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 20px; border-radius: 8px; cursor: pointer;
  transition: filter 0.2s;
}
.nav-item:hover { filter: brightness(0.95); }
.nav-blue { background: #ecf5ff; border: 1px solid #d9ecff; }
.nav-orange { background: #fef0e7; border: 1px solid #fbeed5; }
.nav-green { background: #f0f9eb; border: 1px solid #e1f3d8; }
.nav-icon { font-size: 28px; }
.nav-title { font-size: 15px; font-weight: 600; color: #303133; }
.nav-desc { font-size: 12px; color: #909399; margin-top: 2px; }

/* 概览卡片 */
.overview-card, .customer-card { margin-bottom: 16px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.update-time { font-size: 12px; color: #999; }

/* 金额颜色 */
.price { color: #409eff; font-weight: 600; }
.profit { color: #67c23a; font-weight: 600; }
.debt-pos { color: #f56c6c; font-weight: 600; }
.debt-zero { color: #67c23a; }
.text-muted { color: #909399; }
</style>
