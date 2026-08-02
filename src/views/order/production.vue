<!-- src/views/order/production.vue -->
<template>
  <div class="production">
    <a-page-header title="制作管理" />

    <!-- 状态筛选 -->
    <div class="filter-bar">
      <a-radio-group v-model:value="filterStatus" button-style="solid" @change="loadData">
        <a-radio-button value="audited">待制作</a-radio-button>
        <a-radio-button value="producing">制作中</a-radio-button>
        <a-radio-button value="completed">已完成</a-radio-button>
      </a-radio-group>

      <a-button type="primary" @click="loadData" style="margin-left: 16px">
        刷新
      </a-button>
    </div>

    <a-table
      :columns="columns"
      :data-source="tableData"
      :loading="loading"
      row-key="orderId"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'status'">
          <StatusBadge :status="record.flowStatus" />
        </template>

        <template v-else-if="column.dataIndex === 'operation'">
          <a-space>
            <a-button
              v-if="record.flowStatus === 'audited'"
              size="small"
              type="primary"
              @click="startProduction(record)"
            >
              开始制作
            </a-button>

            <a-button
              v-if="record.flowStatus === 'producing'"
              size="small"
              type="primary"
              @click="completeProduction(record)"
            >
              完成制作
            </a-button>

            <a-button
              size="small"
              type="link"
              @click="viewDetail(record.orderId)"
            >
              查看
            </a-button>
          </a-space>
        </template>

        <template v-else>
          {{ record[column.dataIndex] }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import { getProductionList, updateProduction } from '@/api/order';
import StatusBadge from '@/components/StatusBadge.vue';

const router = useRouter();

const loading = ref(false);
const tableData = ref([]);
const filterStatus = ref('audited');

const columns = [
  { title: '订单号', dataIndex: 'orderNo', width: 140 },
  { title: '客户', dataIndex: 'customerName', width: 120 },
  { title: '品名', dataIndex: 'productName', width: 140 },
  { title: '件数', dataIndex: 'quantity', width: 60 },
  { title: '金额', dataIndex: 'amount', width: 100 },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '操作', dataIndex: 'operation', width: 200 },
];

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getProductionList(filterStatus.value);
    tableData.value = res?.data || [];
  } catch {
    message.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const startProduction = (record) => {
  Modal.confirm({
    title: '开始制作',
    content: `确定开始制作订单 ${record.orderNo} 吗？`,
    onOk: async () => {
      try {
        await updateProduction(record.orderId, { status: 'producing', step: 1 });
        message.success('已开始制作');
        loadData();
      } catch (error) {
        message.error(error.message || '操作失败');
      }
    },
  });
};

const completeProduction = (record) => {
  Modal.confirm({
    title: '完成制作',
    content: `确定完成订单 ${record.orderNo} 的制作吗？`,
    onOk: async () => {
      try {
        await updateProduction(record.orderId, { status: 'completed', step: 10 });
        message.success('制作完成');
        loadData();
      } catch (error) {
        message.error(error.message || '操作失败');
      }
    },
  });
};

const viewDetail = (id) => {
  router.push(`/order/my-detail/${id}`);
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.production {
  padding: 16px;
}
.filter-bar {
  margin-bottom: 16px;
}
</style>