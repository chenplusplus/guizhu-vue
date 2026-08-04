<!-- src/views/order/bill-stats.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2>📊 账单统计</h2>
      <div style="display:flex;gap:8px;">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width:260px;"
          @change="loadData"
        />
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="12" style="margin-bottom:16px;">
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #409EFF;">
          <div class="stat-number">¥{{ (stats.totalAmount || 0).toFixed(2) }}</div>
          <div class="stat-label">总金额</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #E6A23C;">
          <div class="stat-number">{{ stats.totalCount || 0 }}</div>
          <div class="stat-label">总账单数</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #67C23A;">
          <div class="stat-number">{{ stats.confirmedCount || 0 }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="border-left:4px solid #F56C6C;">
          <div class="stat-number">¥{{ (stats.totalDebt || 0).toFixed(2) }}</div>
          <div class="stat-label">累计欠款</div>
        </div>
      </el-col>
    </el-row>

    <!-- 按客户统计 -->
    <el-card style="margin-bottom:16px;">
      <template #header><span style="font-weight:600;">按客户统计</span></template>
      <el-table :data="customerStats" border stripe size="small">
        <el-table-column prop="customerName" label="客户" width="150" />
        <el-table-column prop="billCount" label="账单数" width="80" align="center" />
        <el-table-column prop="totalAmount" label="总金额" width="120" align="right" />
        <el-table-column prop="paidAmount" label="已付金额" width="120" align="right" />
        <el-table-column prop="debtAmount" label="欠款金额" width="120" align="right">
          <template #default="{ row }">
            <span :style="{color: (row.debtAmount || 0) > 0 ? '#F56C6C' : '#67C23A', fontWeight:'bold'}">
              ¥{{ (row.debtAmount || 0).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 按成色统计 -->
    <el-card>
      <template #header><span style="font-weight:600;">按成色统计</span></template>
      <el-table :data="colorStats" border stripe size="small">
        <el-table-column prop="color" label="成色" width="120" />
        <el-table-column prop="totalAmount" label="总金额" width="150" align="right" />
        <el-table-column prop="totalWeight" label="总净重" width="150" align="right" />
        <el-table-column prop="billCount" label="账单数" width="100" align="center" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getBillStats } from '@/api/bill';

const loading = ref(false);
const dateRange = ref([]);
const stats = ref({});
const customerStats = ref([]);
const colorStats = ref([]);

const loadData = async () => {
  loading.value = true;
  try {
    const params = {};
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const res = await getBillStats(params);
    const data = res?.data || {};
    stats.value = data.summary || {};
    customerStats.value = data.byCustomer || [];
    colorStats.value = data.byColor || [];
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const resetFilter = () => {
  dateRange.value = [];
  loadData();
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.stat-card { background: #fafafa; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #ddd; }
.stat-card .stat-number { font-size: 22px; font-weight: bold; color: #303133; }
.stat-card .stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
</style>