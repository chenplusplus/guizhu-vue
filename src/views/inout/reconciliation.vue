<!-- src/views/inout/reconciliation.vue 对账明细 -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
        <h2>📄 对账明细</h2>
        <el-tag type="primary">{{ cpInfo?.name }}</el-tag>
        <el-tag :type="cpInfo?.type === 'customer' ? 'success' : 'warning'">
          {{ cpInfo?.type === 'customer' ? '客户' : '供应商' }}
        </el-tag>
      </div>
    </div>

    <!-- 筛选 + 汇总卡片 -->
    <div class="filter-row">
      <el-form :inline="true" size="default">
        <el-form-item label="年份">
          <el-select v-model="searchForm.year" style="width:100px;" @change="loadData">
            <el-option v-for="y in yearOptions" :key="y" :label="y+'年'" :value="y" />
          </el-select>
        </el-form-item>
        <el-form-item label="月份">
          <el-select v-model="searchForm.month" style="width:90px;" @change="loadData">
            <el-option v-for="m in 12" :key="m" :label="m+'月'" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" @click="loadData">查询</el-button></el-form-item>
      </el-form>
      <div class="recon-summary">
        <span class="label">收入：</span><span class="amount-in">¥{{ (recon.totalIn || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</span>
        <span class="label">支出：</span><span class="amount-out">¥{{ (recon.totalOut || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}</span>
        <span class="label">结余：</span>
        <span :class="(recon.balance || 0) >= 0 ? 'amount-in' : 'amount-out'" style="font-weight:bold;">
          ¥{{ (recon.balance || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}
        </span>
        <span class="label">笔数：</span><span>{{ recon.totalCount || 0 }} 笔</span>
      </div>
    </div>

    <!-- 单位信息 -->
    <div class="cp-info-bar" v-if="cpInfo">
      <span>联系人：{{ cpInfo.contact || '-' }}</span>
      <span>电话：{{ cpInfo.phone || '-' }}</span>
      <span>地址：{{ cpInfo.address || '-' }}</span>
      <span>备注：{{ cpInfo.remark || '-' }}</span>
    </div>

    <!-- 明细表 -->
    <div class="content-table">
      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="recordNo" label="单号" width="140" />
        <el-table-column prop="recordDate" label="日期" width="110" align="center">
          <template #default="{ row }">{{ formatDate(row.recordDate) }}</template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="100" />
        <el-table-column prop="direction" label="方向" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.direction === 'in' ? 'success' : 'danger'" size="small">
              {{ row.direction === 'in' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额(元)" width="130" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.direction === 'in' ? '#67C23A' : '#F56C6C', fontWeight: 'bold' }">
              ¥{{ (row.amount || 0).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="weight" label="重量(g)" width="100" align="right">
          <template #default="{ row }">{{ row.weight || '-' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      </el-table>
      <el-empty v-if="!loading && tableData.length === 0" description="该月无往来记录" :image-size="60" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { getReconciliation } from '@/api/inoutReport';

const route = useRoute();
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

const loading = ref(false);
const tableData = ref([]);
const cpInfo = ref(null);
const recon = reactive({ totalIn: 0, totalOut: 0, balance: 0, totalCount: 0 });
const searchForm = reactive({
  year: parseInt(route.query.year) || currentYear,
  month: parseInt(route.query.month) || currentMonth
});

const loadData = async () => {
  const cpId = parseInt(route.query.counterpartyId);
  if (!cpId) { ElMessage.error('缺少往来单位ID'); return; }
  loading.value = true;
  try {
    const res = await getReconciliation({ counterpartyId: cpId, year: searchForm.year, month: searchForm.month });
    const data = res?.data;
    if (data) {
      cpInfo.value = data.counterparty;
      recon.totalIn = data.totalIn || 0;
      recon.totalOut = data.totalOut || 0;
      recon.balance = data.balance || 0;
      recon.totalCount = data.totalCount || 0;
    }
  } catch { ElMessage.error('加载失败'); }
  finally { loading.value = false; }
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0; flex-wrap: wrap; gap: 10px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.filter-row { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 12px 20px; flex-wrap: wrap; gap: 10px; }
.filter-row :deep(.el-form-item) { margin-bottom: 0; }
.recon-summary { display: flex; align-items: center; gap: 16px; font-size: 15px; }
.recon-summary .label { color: #909399; }
.amount-in { color: #67C23A; font-weight: bold; }
.amount-out { color: #F56C6C; font-weight: bold; }
.cp-info-bar { display: flex; gap: 24px; background: #f5f9ff; padding: 10px 20px; font-size: 13px; color: #606266; }
.content-table { background: #fff; padding: 16px 20px; border-radius: 0 0 8px 8px; margin-top: 2px; }
</style>
