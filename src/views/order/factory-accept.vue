<!-- src/views/order/factory-accept.vue
     ⭐ 待接单：只显示「客户已审核、工厂未接单」的订单，列与客户下单列表一致，只能接单
-->
<template>
  <div class="page-container" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="page-header">
      <div class="header-left">
        <h2>📥 待接单</h2>
        <el-tag type="warning" effect="plain">共 {{ filtered.length }} 单</el-tag>
      </div>
      <div class="header-right">
        <el-button
          v-if="selectedRows.length > 0"
          type="success"
          @click="handleBatchAccept"
        >批量接单 ({{ selectedRows.length }})</el-button>
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏预览' }}
        </el-button>
      </div>
    </div>

    <div v-show="!isFullscreen" class="filter-bar">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        style="width:260px;"
        @change="loadData"
      />
      <el-input
        v-model="keyword"
        placeholder="订单号 / 品名"
        clearable
        style="width:200px;"
        @keyup.enter="loadData"
        @clear="loadData"
      />
      <el-button type="primary" @click="loadData">查询</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <el-table
      ref="tableRef"
      :class="{ 'table-fullscreen': isFullscreen }"
      :data="pagedRows"
      :empty-text="'暂无待接单订单'"
      border
      stripe
      v-loading="loading"
      row-key="orderId"
      @selection-change="rows => selectedRows = rows"
    >
      <el-table-column type="selection" width="45" align="center" />

      <el-table-column label="标记" width="48" align="center" fixed>
        <template #default="{ row }">
          <span v-if="row.urgentFlag" class="order-flag order-urgent-flag">🔥</span>
          <span v-else-if="row.warnFlag || row.alertReason" class="order-flag order-warning-flag">❗</span>
          <span v-else class="order-flag-placeholder">-</span>
        </template>
      </el-table-column>

      <el-table-column prop="orderNo" label="订单号" width="140" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click.stop="goDetail(row.orderId)">{{ row.orderNo }}</el-link>
        </template>
      </el-table-column>

      <el-table-column prop="orderDate" label="订单日期" width="110" align="center">
        <template #default="{ row }">{{ formatDate(row.orderDate) }}</template>
      </el-table-column>
      <el-table-column prop="productName" label="品名" min-width="140" show-overflow-tooltip />
      <el-table-column prop="customerName" label="客户" width="150" show-overflow-tooltip />

      <el-table-column label="图片" width="76" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row.imageUrl"
            :src="row.imageUrl"
            fit="cover"
            style="width:48px;height:48px;border-radius:4px;cursor:pointer;"
            :preview-src-list="[row.imageUrl]"
            preview-teleported
            @click.stop
          />
          <span v-else class="no-img">无图</span>
        </template>
      </el-table-column>

      <el-table-column label="数据图" width="76" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row.dataImageUrl"
            :src="row.dataImageUrl"
            fit="cover"
            style="width:48px;height:48px;border-radius:4px;cursor:pointer;"
            :preview-src-list="[row.dataImageUrl]"
            preview-teleported
            @click.stop
          />
          <span v-else class="no-img">无图</span>
        </template>
      </el-table-column>

      <el-table-column prop="size" label="手寸/长度" width="100" align="center" />
      <el-table-column prop="widthThick" label="宽/厚度" width="100" align="center" />
      <el-table-column prop="quantity" label="数量" width="70" align="center" />
      <el-table-column prop="color" label="成色" width="80" align="center" />
      <el-table-column prop="goldPrice" label="金价" width="90" align="right" />
      <el-table-column prop="logoText" label="LOGO" width="100" show-overflow-tooltip />
      <el-table-column prop="diamondLevel" label="钻石级别" width="100" align="center" />
      <el-table-column prop="weightRequirement" label="克重要求" width="110" align="center" />
      <el-table-column prop="deliveryDays" label="工期" width="70" align="center" />

      <el-table-column label="字印要求图" width="96" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row.letterImageUrl"
            :src="row.letterImageUrl"
            fit="cover"
            style="width:48px;height:48px;border-radius:4px;cursor:pointer;"
            :preview-src-list="[row.letterImageUrl]"
            preview-teleported
            @click.stop
          />
          <span v-else class="no-img">无图</span>
        </template>
      </el-table-column>

      <el-table-column prop="url" label="网址" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <a v-if="row.url" :href="row.url" target="_blank" class="link" @click.stop>{{ row.url }}</a>
          <span v-else class="no-img">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="130" show-overflow-tooltip />

      <el-table-column v-if="!isFullscreen" label="操作" width="90" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="success" size="small" @click.stop="handleAccept(row)">接单</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-show="!isFullscreen" class="pager">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[20, 50, 100]"
        :total="filtered.length"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { getOrderList, acceptOrder } from '@/api/order';

const router = useRouter();
const loading = ref(false);
const isFullscreen = ref(false);
const keyword = ref('');
const dateRange = ref([]);
const allRows = ref([]);
const selectedRows = ref([]);
const pagination = ref({ current: 1, pageSize: 20 });

const normalizeStatus = (s) => String(s || '').trim().replace(/[_-]/g, '').toLowerCase();

// 只保留「客户已审核、工厂未接单」
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return allRows.value.filter(r => {
    if (normalizeStatus(r.flowStatus) !== 'customeraudited') return false;
    if (!kw) return true;
    return String(r.orderNo || '').toLowerCase().includes(kw)
      || String(r.productName || '').toLowerCase().includes(kw);
  });
});

const pagedRows = computed(() => {
  const start = (pagination.value.current - 1) * pagination.value.pageSize;
  return filtered.value.slice(start, start + pagination.value.pageSize);
});

const formatDate = (v) => (v ? String(v).slice(0, 10) : '-');
const toggleFullscreen = () => { isFullscreen.value = !isFullscreen.value; };
const handleEsc = (event) => {
  if (event.key === 'Escape' && isFullscreen.value) isFullscreen.value = false;
};

const loadData = async () => {
  loading.value = true;
  try {
    const params = { page: 1, pageSize: 1000 };
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    const res = await getOrderList(params);
    const d = res?.data || res || {};
    const list = Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : (d.items || []));
    allRows.value = list;
    pagination.value.current = 1;
  } catch (e) {
    console.error('加载待接单失败:', e);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  keyword.value = '';
  dateRange.value = [];
  loadData();
};

const handleAccept = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要接单 ${row.orderNo} 吗？`, '接单确认', { type: 'info' });
  } catch { return; }
  try {
    await acceptOrder(row.orderId);
    ElMessage.success('接单成功');
    loadData();
  } catch (e) {
    ElMessage.error(e?.message || '接单失败');
  }
};

const handleBatchAccept = async () => {
  if (!selectedRows.value.length) return;
  try {
    await ElMessageBox.confirm(`确定接单 ${selectedRows.value.length} 个订单吗？`, '批量接单', { type: 'info' });
  } catch { return; }
  let ok = 0, fail = 0;
  for (const row of selectedRows.value) {
    try { await acceptOrder(row.orderId); ok++; } catch { fail++; }
  }
  ElMessage.success(`接单成功 ${ok} 个${fail ? '，失败 ' + fail + ' 个' : ''}`);
  loadData();
};

const goDetail = (id) => router.push(`/order/detail/${id}`);

onMounted(() => {
  loadData();
  window.addEventListener('keydown', handleEsc);
});
onUnmounted(() => window.removeEventListener('keydown', handleEsc));
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 16px; min-height: 100%; }
.page-container.is-fullscreen { position: fixed; inset: 0; z-index: 1000; overflow: auto; border-radius: 0; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 10px; flex-wrap: wrap; }
.header-left { display: flex; align-items: center; gap: 12px; }
.page-header h2 { margin: 0; font-size: 18px; color: #303133; }
.header-right { display: flex; gap: 8px; align-items: center; }
.filter-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
.no-img { color: #c0c4cc; font-size: 12px; }
.order-flag { font-size: 16px; }
.order-warning-flag { color: #e6a23c; }
.order-urgent-flag { color: #f56c6c; }
.order-flag-placeholder { color: #dcdfe6; }
.link { color: #409eff; text-decoration: none; }
.pager { display: flex; justify-content: flex-end; margin-top: 14px; }
.table-fullscreen { font-size: 16px; }
.table-fullscreen :deep(.el-table__cell) { font-size: 16px !important; padding: 14px 10px !important; }
.table-fullscreen :deep(.el-table__header .el-table__cell) { font-size: 17px !important; font-weight: 700 !important; padding: 16px 10px !important; }
.table-fullscreen :deep(.el-image) { width: 80px !important; height: 80px !important; }
.table-fullscreen :deep(.el-link) { font-size: 16px; }
</style>
