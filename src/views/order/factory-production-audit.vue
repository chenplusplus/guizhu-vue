<!-- src/views/order/factory-production-audit.vue -->
<template>
  <div class="page-container" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="page-header">
      <h2>🔍 制作审核</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div v-show="!isFullscreen" class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px;"
            @change="handleSearch"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="keyword"
            placeholder="订单号/品名/客户"
            clearable
            style="width: 200px;"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><RefreshRight /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 汇总 -->
    <div v-show="!isFullscreen" class="summary-bar" v-if="pagination.total > 0">
      <span>共 <b>{{ pagination.total }}</b> 个待审核订单</span>
    </div>

    <!-- 表格 -->
    <el-table
      :class="{ 'table-fullscreen': isFullscreen }"
      :data="tableData"
      border
      stripe
      v-loading="loading"
      row-key="orderId"
    >
      <el-table-column prop="orderNo" label="订单号" width="150" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click="viewDetail(row.orderId)">
            {{ row.orderNo }}
          </el-link>
        </template>
      </el-table-column>

      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="productName" label="品名" min-width="130" />

      <el-table-column label="图片" width="70" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row.imageUrl"
            :src="row.imageUrl"
            fit="cover"
            style="width:45px;height:45px;border-radius:4px;cursor:pointer;"
            :preview-src-list="[row.imageUrl]"
            preview-teleported
          />
          <span v-else style="color:#ccc;font-size:12px;">无图</span>
        </template>
      </el-table-column>

      <el-table-column prop="size" label="手寸" width="80" align="center" />
      <el-table-column prop="quantity" label="数量" width="70" align="center" />
      <el-table-column prop="color" label="成色" width="80" align="center" />
      <el-table-column prop="totalWeight" label="总重" width="85" align="right">
        <template #default="{ row }">{{ row.totalWeight || '-' }}</template>
      </el-table-column>
      <el-table-column prop="netWeight" label="净重" width="85" align="right">
        <template #default="{ row }">{{ row.netWeight || '-' }}</template>
      </el-table-column>
      <el-table-column prop="totalAmount" label="金额" width="110" align="right">
        <template #default="{ row }">
          <span style="color:#E6A23C;font-weight:bold;">
            ¥{{ (row.totalAmount || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="success" size="small" @click="handleAudit(row, true)">
            通过
          </el-button>
          <el-button type="danger" size="small" @click="handleAudit(row, false)">
            驳回
          </el-button>
          <el-button type="primary" size="small" link @click="viewDetail(row.orderId)">
            查看
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无待审核订单" />

    <!-- 分页 -->
    <div v-show="!isFullscreen" style="margin-top:16px;display:flex;justify-content:flex-end;">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- 审核弹窗 -->
    <el-dialog v-model="auditDialogVisible" title="制作完成审核" width="450px" destroy-on-close>
      <div style="margin-bottom: 16px;">
        <p><strong>订单号：</strong>{{ currentOrder?.orderNo }}</p>
        <p><strong>品名：</strong>{{ currentOrder?.productName }}</p>
      </div>
      <el-alert
        v-if="auditApproved"
        type="success"
        title="通过审核，订单将进入【已完成】状态"
        :closable="false"
        show-icon
        style="margin-bottom: 12px;"
      />
      <el-alert
        v-else
        type="warning"
        title="驳回审核，订单将回到【工厂编辑】状态"
        :closable="false"
        show-icon
        style="margin-bottom: 12px;"
      />
      <el-form label-width="80px">
        <el-form-item label="备注">
          <el-input v-model="auditRemark" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button type="success" :loading="auditLoading" @click="confirmAudit(true)">通过</el-button>
        <el-button type="danger" :loading="auditLoading" @click="confirmAudit(false)">驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue';
import { getOrderList, auditProduction } from '@/api/order';

const router = useRouter();

const loading = ref(false);
const isFullscreen = ref(false);
const toggleFullscreen = () => { isFullscreen.value = !isFullscreen.value; };
const handleEsc = (e) => { if (e.key === 'Escape' && isFullscreen.value) isFullscreen.value = false; };

const tableData = ref([]);
const keyword = ref('');
const dateRange = ref([]);

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

// 审核弹窗
const auditDialogVisible = ref(false);
const auditLoading = ref(false);
const currentOrder = ref(null);
const auditApproved = ref(true);
const auditRemark = ref('');

// ===== 日期范围（默认最近30天） =====
const getDateRange = () => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return [startDate.toISOString().split('T')[0], endDate];
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      // ⭐ 只要 polishing（制作完成待审核）
      status: 'polishing',
      keyword: keyword.value || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    };
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }

    const res = await getOrderList(params);
    const responseData = res?.data || res || {};

    let data = [];
    let total = 0;

    if (Array.isArray(responseData)) {
      data = responseData;
      total = responseData.length;
    } else if (Array.isArray(responseData.data)) {
      data = responseData.data;
      total = responseData.total || data.length;
    } else if (responseData.items && Array.isArray(responseData.items)) {
      data = responseData.items;
      total = responseData.total || data.length;
    }

    tableData.value = data;
    pagination.total = total;
  } catch (error) {
    ElMessage.error(error.message || '加载数据失败');
    tableData.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.current = 1;
  loadData();
};

const resetSearch = () => {
  keyword.value = '';
  dateRange.value = getDateRange();
  pagination.current = 1;
  loadData();
};

// ===== 审核 =====
const handleAudit = (row, approved) => {
  currentOrder.value = row;
  auditApproved.value = approved;
  auditRemark.value = '';
  auditDialogVisible.value = true;
};

const confirmAudit = async (approved) => {
  if (!currentOrder.value) return;
  auditLoading.value = true;
  try {
    await auditProduction(currentOrder.value.orderId, {
      approved,
      remark: auditRemark.value || '',
    });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    auditDialogVisible.value = false;
    loadData();
  } catch (e) {
    ElMessage.error(e?.message || '操作失败');
  } finally {
    auditLoading.value = false;
  }
};

// ===== 跳转 =====
const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

// ===== 初始化 =====
onMounted(() => {
  dateRange.value = getDateRange();
  loadData();
  window.addEventListener('keydown', handleEsc);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEsc);
});
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }

.search-bar {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 12px;
}
.search-bar :deep(.el-form-item) { margin-bottom: 0; }

.summary-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 16px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #e8ecf1;
  font-size: 14px;
  color: #606266;
}
.summary-bar b { color: #303133; }

:deep(.el-table .cell) { padding: 6px 8px; }

/* ===== 全屏 ===== */
.page-container.is-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #fff;
  padding: 16px 20px;
  overflow: auto;
  border-radius: 0;
  min-height: 100vh;
}
.table-fullscreen { font-size: 16px; }
.table-fullscreen :deep(.el-table__cell) {
  font-size: 16px !important;
  padding: 14px 10px !important;
}
.table-fullscreen :deep(.el-table__header .el-table__cell) {
  font-size: 17px !important;
  font-weight: 700 !important;
  padding: 16px 10px !important;
  background: #f5f7fa !important;
}
.table-fullscreen :deep(.el-image) { width: 80px !important; height: 80px !important; }
.table-fullscreen :deep(.el-tag) {
  font-size: 15px !important;
  padding: 6px 12px !important;
  height: auto !important;
}
</style>