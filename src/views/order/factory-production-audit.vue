<!-- src/views/order/factory-production-audit.vue -->
<template>
  <div class="page-container" :class="{ 'is-fullscreen': isFullscreen }">
    <!-- ⭐ 全屏时常驻右上角的退出按钮（滚动到表格中段也能点，Esc 亦可） -->
    <FullscreenExit v-if="isFullscreen" @exit="toggleFullscreen" />
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
    <div class="audit-toolbar">
      <el-checkbox v-model="expandAll" @change="onExpandAllChange">
        展开销售 / 成本对比
      </el-checkbox>
      <span class="audit-toolbar-tip">
        每条订单下方紧跟「销售行 / 成本行」，与编辑订单页原样一致，可直接对照审核
      </span>
      <span v-if="warnCount > 0" class="audit-toolbar-warn">❗ 有 {{ warnCount }} 单成本高于销售</span>
    </div>

    <el-table
      :class="{ 'table-fullscreen': isFullscreen }"
      :data="tableData"
      border
      stripe
      v-loading="loading"
      row-key="orderId"
      :expand-row-keys="expandKeys"
      @expand-change="onExpandChange"
    >
      <!-- ⭐ 展开行：销售行 + 黄色间隔 + 成本行（原样带过来，只读） -->
      <el-table-column type="expand" width="40">
        <template #default="{ row }">
          <div class="expand-cost-wrap">
            <CostCompareTable
              v-if="costMap[row.orderId]"
              :sale="costMap[row.orderId].sale"
              :cost="costMap[row.orderId].cost"
              :has-cost="costMap[row.orderId].hasCost"
              :warns="costMap[row.orderId].warns"
              :loading="costMap[row.orderId].loading"
              :large="isFullscreen"
            />
            <div v-else class="expand-loading">成本数据加载中…</div>
          </div>
        </template>
      </el-table-column>

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
      <el-table-column label="成色" width="80" align="center">
        <template #default="{ row }">
          <PurityCell :label="row.purityLabel" :color="row.color" />
        </template>
      </el-table-column>
      <el-table-column label="颜色" width="80" align="center">
        <template #default="{ row }">{{ resolveGemColor(row) || '-' }}</template>
      </el-table-column>
      <el-table-column prop="totalWeight" label="总重" width="85" align="right">
        <template #default="{ row }">{{ row.totalWeight || '-' }}</template>
      </el-table-column>
      <el-table-column prop="netWeight" label="净重" width="85" align="right">
        <template #default="{ row }">{{ row.netWeight || '-' }}</template>
      </el-table-column>
      <el-table-column prop="totalAmount" label="金额" width="122" align="right">
        <template #default="{ row }">
          <span style="color:#E6A23C;font-weight:bold;">
            ¥{{ (row.totalAmount || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>

      <!-- ⭐ 成本状态：已录 / 未录 / 高于销售（点开下面的展开行看明细对比） -->
      <el-table-column label="成本" width="132" align="center">
        <template #default="{ row }">
          <template v-if="costMap[row.orderId] && !costMap[row.orderId].loading">
            <el-tooltip v-if="costMap[row.orderId].warns?.length" :content="warnText(row)" placement="top">
              <el-tag type="danger" effect="dark" size="small">
                ❗ 高于销售
              </el-tag>
            </el-tooltip>
            <el-tag v-else-if="costMap[row.orderId].hasCost" type="success" size="small">
              已录 利润 {{ costProfit(row) }}
            </el-tag>
            <el-tag v-else type="info" size="small">
              未录 利润 {{ costProfit(row) }}
            </el-tag>
          </template>
          <span v-else style="color:#c0c4cc;font-size:12px;">…</span>
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
          <el-button type="primary" size="small" link @click="openPreview(row)">
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

    <!-- ⭐ 全屏预览弹窗：明细里带销售/成本对比，可直接审核 -->
   <OrderPreviewDialog
      v-model="previewVisible"
      :order-id="previewOrderId"
      show-cost-compare
      audit-mode
      :audit-loading="previewAuditLoading"
      @audit="onPreviewAudit"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh, Search, RefreshRight } from '@element-plus/icons-vue';
import { getOrderList, auditProduction, getOrderCost } from '@/api/order';
import { autoCreateBill } from '@/api/bill';
import { generateLr } from '@/api/lr';
import OrderPreviewDialog from '@/components/OrderPreviewDialog.vue';
import CostCompareTable from '@/components/CostCompareTable.vue';
import FullscreenExit from '@/components/FullscreenExit.vue';
import PurityCell from '@/components/PurityCell.vue';
import { resolveGemColor } from '@/utils/color';


const router = useRouter();

const loading = ref(false);
const isFullscreen = ref(false);
const tableData = ref([]);
const keyword = ref('');
const dateRange = ref([]);

// ===== ⭐ 销售 / 成本 对比（展开行） =====
const costMap = reactive({});      // orderId -> { sale, cost, hasCost, warns, loading }
const expandKeys = ref([]);
const expandAll = ref(true);

const warnCount = computed(() =>
  tableData.value.filter(r => costMap[r.orderId]?.warns?.length).length
);

const warnText = (row) => (costMap[row.orderId]?.warns || []).map(w => w.text).join('；');

const costProfit = (row) => {
  const d = costMap[row.orderId];
  if (!d) return '-';
  const s = Number(d.sale?.totalAmount) || 0;
  const c = Number(d.cost?.totalAmount) || 0;
  return (s - c).toFixed(2);
};

// 拉取单张订单的销售行 / 成本行（后端一次返回 sale + cost + warns）
const loadCost = async (orderId) => {
  costMap[orderId] = { ...(costMap[orderId] || {}), loading: true };
  try {
    const res = await getOrderCost(orderId);
    const d = res?.data || {};
    costMap[orderId] = {
      sale: d.sale || {},
      cost: d.cost || {},
      hasCost: !!d.hasCost,
      warns: d.warns || [],
      loading: false,
    };
  } catch (e) {
    console.warn('加载销售/成本对比失败:', orderId, e);
    costMap[orderId] = { sale: {}, cost: {}, hasCost: false, warns: [], loading: false, error: true };
  }
};

// 展开全部 / 收起全部
const onExpandAllChange = (v) => {
  expandKeys.value = v ? tableData.value.map(r => r.orderId) : [];
};

// 受控展开：用户点单行箭头时同步 keys
const onExpandChange = (row, expandedRows) => {
  if (Array.isArray(expandedRows)) {
    expandKeys.value = expandedRows.map(r => r.orderId);
    expandAll.value = expandedRows.length === tableData.value.length && expandedRows.length > 0;
  }
  if (!costMap[row.orderId]) loadCost(row.orderId);
};

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  // 全屏时每条订单下方直接展开两行（销售 + 成本），便于连续审核
  if (isFullscreen.value) {
    expandAll.value = true;
    expandKeys.value = tableData.value.map(r => r.orderId);
  }
};
const handleEsc = (e) => { if (e.key === 'Escape' && isFullscreen.value) isFullscreen.value = false; };

// 预览弹窗
const previewVisible = ref(false);
const previewOrderId = ref(null);

const openPreview = (row) => {
  previewOrderId.value = row.orderId;
  previewVisible.value = true;
};
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
// ⚠️ 用本地日期（toISOString 是 UTC，凌晨会少一天）
const fmtLocalDate = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const getDateRange = () => {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return [fmtLocalDate(startDate), fmtLocalDate(today)];
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      // ⭐ 只审「制作完成 + 已提交审核」的单；制作完成未提交的不在审核队列里
      status: 'productionCompleted',
      submitState: 'submitted',
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

    // ⭐ 逐单加载「销售行 / 成本行」，并把展开状态同步到当前页
    Object.keys(costMap).forEach(k => delete costMap[k]);
    data.forEach(r => loadCost(r.orderId));
    expandKeys.value = expandAll.value ? data.map(r => r.orderId) : [];
  } catch (error) {
    ElMessage.error(error.message || '加载数据失败');
    tableData.value = [];
    pagination.total = 0;
    Object.keys(costMap).forEach(k => delete costMap[k]);
    expandKeys.value = [];
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

// ⭐ 审核通过后统一处理：自动生成账单
//    ⭐ 2026-11-20 起：LR 不再在这里生成，改为「账单最终确认」时自动生成
const afterProductionApproved = async (orderId) => {
  try {
    const r = await autoCreateBill(orderId);
    const d = r?.data || r;

    if (d?.skipped) {
      ElMessage.info('账单：' + (d.message || '当天已有待审账单，未重复生成'));
    } else if (d?.billNo) {
      ElMessage.success('已自动生成账单 ' + d.billNo + (d.orderCount ? `（含 ${d.orderCount} 个订单）` : ''));
    }
  } catch (e) {
    console.warn('自动生成账单失败:', e);
    ElMessage.warning('订单已审核，但自动生成账单失败，请在「生成账单」页手动生成');
  }
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

    if (approved) await afterProductionApproved(currentOrder.value.orderId);

    auditDialogVisible.value = false;
    loadData();
  } catch (e) {
    ElMessage.error(e?.message || '操作失败');
  } finally {
    auditLoading.value = false;
  }
};

// ⭐ 全屏预览弹窗里直接审核（对比表就在明细里，看完即审）
const previewAuditLoading = ref(false);
const onPreviewAudit = async ({ approved, remark }) => {
  if (!previewOrderId.value) return;
  previewAuditLoading.value = true;
  try {
    await auditProduction(previewOrderId.value, { approved, remark: remark || '' });
    ElMessage.success(approved ? '审核通过，订单已完成' : '已驳回，订单退回工厂编辑');
    if (approved) await afterProductionApproved(previewOrderId.value);
    previewVisible.value = false;
    loadData();
  } catch (e) {
    ElMessage.error(e?.message || '审核失败');
  } finally {
    previewAuditLoading.value = false;
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

/* ===== 明细工具条（展开销售 / 成本对比） ===== */
.audit-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  margin-bottom: 10px;
  background: #f7f9fc;
  border: 1px solid #e8ecf1;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
}
.audit-toolbar-tip { color: #909399; font-size: 12px; }
.audit-toolbar-warn { margin-left: auto; color: #d64545; font-weight: 600; }

/* 展开行：销售 + 成本对比表 */
.expand-cost-wrap {
  padding: 8px 12px 10px 12px;
  background: #fbfcfe;
  border-top: 1px dashed #dcdfe6;
  border-bottom: 1px dashed #dcdfe6;
}
.expand-loading { padding: 14px; color: #909399; font-size: 13px; }

/* ===== 全屏 ===== */
.page-container.is-fullscreen {
  position: fixed;
  inset: 0;
  /* ⚠️ 低于 Element Plus 弹层层级（2000 起），否则全屏时弹框/提示看不到 */
  z-index: 1999;
  background: #fff;
  padding: 16px 20px;
  overflow: auto;
  border-radius: 0;
  min-height: 100vh;
}
.table-fullscreen { font-size: 16px; }
.table-fullscreen :deep(.el-table__cell) {
  font-size: 16px !important;
  padding: 12px 8px !important;
}
/* ⭐ 展开行里的「销售/成本」对比表保持紧凑，避免全屏放大后数字换行 */
.table-fullscreen :deep(.expand-cost-wrap .el-table__cell) {
  font-size: 14px !important;
  padding: 4px 6px !important;
}
.table-fullscreen :deep(.expand-cost-wrap .el-table__header .el-table__cell) {
  font-size: 14px !important;
  padding: 8px 6px !important;
}
.table-fullscreen :deep(.expand-cost-wrap .el-tag) {
  font-size: 12px !important;
  padding: 0 6px !important;
  height: 20px !important;
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