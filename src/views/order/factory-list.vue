<!-- src/views/order/factory-list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>🏭 工厂订单</h2>
      <el-tag type="primary">已接单：{{ acceptedCount }}</el-tag>
    </div>

    <!-- 状态筛选 -->
    <div class="filter-bar">
      <el-radio-group v-model="filterStatus" @change="loadData">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="accepted">待制作</el-radio-button>
        <el-radio-button value="producing">制作中</el-radio-button>
        <el-radio-button value="completed">已完成</el-radio-button>
      </el-radio-group>
      <el-input
        v-model="keyword"
        placeholder="搜索订单号/品名"
        style="width: 200px; margin-left: 16px;"
        clearable
        @clear="loadData"
        @keyup.enter="loadData"
      />
      <el-button type="primary" @click="loadData" style="margin-left: 8px;">搜索</el-button>
    </div>

    <!-- 表格 -->
    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="orderNo" label="订单号" width="150" />
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="productName" label="品名" min-width="120" />
      <el-table-column prop="quantity" label="件数" width="70" align="center" />
      <el-table-column prop="amount" label="金额" width="110" align="right">
        <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="flowStatus" label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.flowStatus)" size="small">
            {{ getStatusText(row.flowStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" width="160">
        <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" align="center">
        <template #default="{ row }">
          <el-button type="primary" size="small" @click="goEdit(row.orderId)">
            编辑
          </el-button>
          <el-button type="primary" size="small" link @click="viewDetail(row.orderId)">
            查看
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无工厂订单" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { getOrderList } from '@/api/order';

const router = useRouter();
const loading = ref(false);
const tableData = ref([]);
const filterStatus = ref('');
const keyword = ref('');

// 状态映射
const statusMap = {
  accepted: { text: '已接单', type: 'primary' },
  waxing: { text: '出蜡', type: 'primary' },
  molded: { text: '倒模', type: 'primary' },
  setting: { text: '执模', type: 'primary' },
  cnc: { text: 'CNC', type: 'primary' },
  sweeping: { text: '扫镶口', type: 'primary' },
  stoneCutting: { text: '车石', type: 'primary' },
  microInlay: { text: '微镶', type: 'primary' },
  handInlay: { text: '手镶', type: 'primary' },
  polishing: { text: '抛光', type: 'warning' },
  completed: { text: '已完成', type: 'success' },
  scrapped: { text: '已报废', type: 'danger' },
};

const getStatusText = (status) => statusMap[status]?.text || status;
const getStatusType = (status) => statusMap[status]?.type || 'info';

const acceptedCount = computed(() => {
  return tableData.value.filter(item => item.flowStatus === 'accepted').length;
});

// 加载数据
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      status: filterStatus.value || undefined,
      keyword: keyword.value || undefined,
    };
    const res = await getOrderList(params);
    tableData.value = res?.data || [];
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const goEdit = (id) => {
  router.push(`/order/factory-edit/${id}`);
};

const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.filter-bar { display: flex; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
</style>