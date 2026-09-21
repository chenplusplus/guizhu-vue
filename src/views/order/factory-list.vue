<!-- src/views/order/factory-list.vue -->
<template>
  <div class="page-container" :class="{ 'is-fullscreen': isFullscreen }">
    <div class="page-header">
      <h2>🏭 工厂订单</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <el-button
          v-if="selectedOrders.length > 0 && filterStatus === 'customerAudited'"
          type="success"
          @click="handleBatchAccept"
        >
          批量接单 ({{ selectedOrders.length }})
        </el-button>
        <el-button
          v-if="selectedOrders.length > 0 && filterStatus === 'polishing'"
          type="warning"
          @click="handleBatchGenerateBill"
        >
          批量生成账单 ({{ selectedOrders.length }})
        </el-button>
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div v-show="!isFullscreen" class="filter-bar">
      <el-radio-group v-model="filterStatus" @change="handleSearch">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="customerAudited">待接单</el-radio-button>
        <el-radio-button value="producing">制作中</el-radio-button>
        <el-radio-button value="polishing">制作完成</el-radio-button>
        <el-radio-button value="billPending">账单待审核</el-radio-button>
        <el-radio-button value="completed">已完成</el-radio-button>
      </el-radio-group>

      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width: 240px; margin-left: 12px;"
        @change="handleSearch"
      />

      <el-input
        v-model="keyword"
        placeholder="搜索订单号/品名"
        style="width: 180px; margin-left: 8px;"
        clearable
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      />

      <el-select
        v-model="filterCustomerId"
        placeholder="全部客户"
        clearable
        filterable
        style="width: 180px; margin-left: 8px;"
        @change="handleSearch"
      >
        <el-option
          v-for="item in customerList"
          :key="item.customerId"
          :label="item.customerName"
          :value="item.customerId"
        />
      </el-select>

      <el-button type="primary" @click="handleSearch" style="margin-left: 8px;">
        <el-icon><Search /></el-icon> 搜索
      </el-button>
      <el-button @click="resetSearch">
        <el-icon><RefreshRight /></el-icon> 重置
      </el-button>
    </div>

    <!-- 汇总 -->
    <div v-show="!isFullscreen" class="summary-bar" v-if="pagination.total > 0">
      <span>共 <b>{{ pagination.total }}</b> 个订单</span>
      <span v-if="selectedOrders.length > 0" style="color:#409EFF;">
        已选 <b>{{ selectedOrders.length }}</b> 个
      </span>
      <span v-if="selectedOrders.length > 0" style="color:#E6A23C;">
        金额 ¥{{ selectedTotal.toFixed(2) }}
      </span>
    </div>

    <!-- 表格 -->
    <el-table
      ref="tableRef"
      :class="{ 'table-fullscreen': isFullscreen }"
      :data="tableData"
      border
      stripe
      v-loading="loading"
      @selection-change="handleSelectionChange"
      @row-click="handleRowClick"
      row-key="orderId"
    >
      <!-- 选择列 -->
      <el-table-column type="selection" width="45" align="center" @click.stop />

      <el-table-column label="标记" width="48" fixed align="center">
        <template #default="{ row }">
          <el-tooltip
            v-if="row.warnFlag || row.alertReason || row.urgentFlag"
            :content="getFlagTooltip(row)"
            placement="top"
          >
            <span class="order-flags">
              <span v-if="row.warnFlag || row.alertReason" class="order-flag order-warning-flag">⚠️</span>
              <span v-if="row.urgentFlag" class="order-flag order-urgent-flag">🔥</span>
            </span>
          </el-tooltip>
          <span v-else class="order-flag-placeholder">-</span>
        </template>
      </el-table-column>

      <el-table-column prop="orderNo" label="订单号" width="150" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.orderId)">
            {{ row.orderNo }}
          </el-link>
        </template>
      </el-table-column>

      <!-- 状态列 -->
      <el-table-column prop="flowStatus" label="状态" width="110" align="center" fixed>
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.flowStatus)" size="default" effect="light">
            {{ getStatusText(row.flowStatus) }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- 账单列 -->
      <el-table-column label="账单" width="120" align="center">
        <template #default="{ row }">
          <el-link v-if="row.billId" type="primary" @click.stop="viewBill(row.billId)">
            {{ row.billNo || '账单' }}
          </el-link>
          <span v-else-if="normalizeStatus(row.flowStatus) === 'completed'" style="color:#999;font-size:12px">未生成</span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="orderDate" label="订单日期" width="110" align="center">
        <template #default="{ row }">
          {{ formatDate(row.orderDate) }}
        </template>
      </el-table-column>
      <el-table-column prop="productName" label="品名" min-width="120" />
      <el-table-column label="图片" width="70" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row.imageUrl"
            :src="row.imageUrl"
            fit="cover"
            style="width: 45px; height: 45px; border-radius: 4px; cursor: pointer;"
            :preview-src-list="[row.imageUrl]"
            preview-teleported
            @click.stop
          />
          <span v-else style="color: #ccc; font-size: 12px;">无图</span>
        </template>
      </el-table-column>
      <el-table-column prop="size" label="手寸" width="80" align="center" />
      <el-table-column prop="quantity" label="数量" width="70" align="center" />
      <el-table-column prop="color" label="成色" width="80" align="center" />
      <el-table-column prop="goldPrice" label="金价" width="90" align="right">
        <template #default="{ row }">{{ row.goldPrice || '-' }}</template>
      </el-table-column>
      <el-table-column prop="diamondLevel" label="钻石级别" width="100" align="center" />
      <el-table-column prop="deliveryDays" label="工期" width="70" align="center" />
      <el-table-column prop="totalWeight" label="总重" width="85" align="right">
        <template #default="{ row }">{{ row.totalWeight || '-' }}</template>
      </el-table-column>
      <el-table-column prop="netWeight" label="净重" width="85" align="right">
        <template #default="{ row }">{{ row.netWeight || '-' }}</template>
      </el-table-column>
      <el-table-column prop="lossRate" label="损耗" width="84" align="center">
        <template #default="{ row }">
          <span v-if="isAbnormalLoss(row.lossRate)" class="loss-abnormal" title="非标准损耗（1.08 / 1.10）">
            {{ row.lossRate }}
          </span>
          <span v-else>{{ row.lossRate || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="laborFee" label="工费" width="85" align="right">
        <template #default="{ row }">{{ row.laborFee || '-' }}</template>
      </el-table-column>
      <el-table-column prop="totalAmount" label="金额" width="110" align="right">
        <template #default="{ row }">
          <span style="color: #E6A23C; font-weight: bold;">
            ¥{{ (row.totalAmount || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>

      <!-- 操作列：悬浮下拉，减少占宽 -->
      <el-table-column v-if="!isFullscreen" label="操作" width="96" fixed="right" align="center">
        <template #default="{ row }">
          <el-dropdown
            trigger="hover"
            placement="left-start"
            @command="(cmd) => handleRowAction(cmd, row)"
            @visible-change="(v) => { if (v) ensurePackage(row); }"
          >
            <el-button size="small" type="primary" plain @click.stop>
              操作<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-if="normalizeStatus(row.flowStatus) === 'customerAudited'"
                  command="accept"
                >接单</el-dropdown-item>

                <el-dropdown-item
                  v-if="isInProduction(row.flowStatus) || normalizeStatus(row.flowStatus) === 'factory_edit'"
                  command="status"
                >更新状态</el-dropdown-item>

                <el-dropdown-item command="repair">维修单</el-dropdown-item>

                <el-dropdown-item
                  v-if="normalizeStatus(row.flowStatus) === 'completed' && !row.billId && (isFactoryOrder || isAdmin)"
                  command="bill"
                >生成账单</el-dropdown-item>

                <el-dropdown-item
                  v-if="normalizeStatus(row.flowStatus) === 'polishing' && (isFactoryAudit || isAdmin)"
                  command="auditProduction"
                >审核制作完成</el-dropdown-item>

                <el-dropdown-item
                  v-if="canEditRow(row)"
                  command="edit"
                >编辑</el-dropdown-item>

                <el-dropdown-item v-if="row._hasPackage" command="downloadPackage">数据包下载</el-dropdown-item>

                <el-dropdown-item command="view" divided>查看</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无工厂订单" />

    <!-- 分页 -->
    <div v-show="!isFullscreen" style="margin-top: 16px; display: flex; justify-content: flex-end;">
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

    <!-- 更新制作状态弹窗 -->
    <el-dialog v-model="statusDialogVisible" title="更新制作状态" width="450px" destroy-on-close>
      <div style="margin-bottom: 16px;">
        <p><strong>订单号：</strong>{{ currentOrder?.orderNo }}</p>
        <p><strong>品名：</strong>{{ currentOrder?.productName }}</p>
        <p><strong>当前状态：</strong>
          <el-tag :type="getStatusType(currentOrder?.flowStatus)" size="small">
            {{ getStatusText(currentOrder?.flowStatus) }}
          </el-tag>
        </p>
      </div>

      <el-form label-width="80px">
        <el-form-item label="更新为" required>
          <el-select v-model="selectedStatus" placeholder="请选择目标状态" style="width: 100%;">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="statusRemark"
            type="textarea"
            :rows="2"
            placeholder="可选备注"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="confirmStatusUpdate"
          :loading="statusLoading"
          :disabled="!selectedStatus"
        >
          确认更新
        </el-button>
      </template>
    </el-dialog>

    <!-- 审核制作完成弹窗 -->
    <el-dialog v-model="auditProductionDialogVisible" title="审核制作完成" width="450px" destroy-on-close>
      <el-alert
        v-if="auditProductionRow"
        :type="auditProductionApproved ? 'success' : 'warning'"
        :title="auditProductionApproved ? AUDIT_PRODUCTION_TITLES.pass : AUDIT_PRODUCTION_TITLES.reject"
        style="margin-bottom: 16px"
      />
      <el-form label-width="80px">
        <el-form-item label="订单号">
          <el-input :model-value="auditProductionRow?.orderNo" disabled />
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input v-model="auditProductionRemark" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditProductionDialogVisible = false">取消</el-button>
        <el-button type="success" :loading="auditProductionLoading" @click="confirmAuditProduction(true)">通过</el-button>
        <el-button type="danger" :loading="auditProductionLoading" @click="confirmAuditProduction(false)">驳回</el-button>
      </template>
    </el-dialog>

    <!-- 流程抽屉 -->
    <FlowDrawer
      v-model="flowDrawerVisible"
      :order-id="currentFlowOrderId"
      :order-no="currentFlowOrderNo"
      :current-status="currentFlowStatus"
      @refresh="loadData"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, RefreshRight, Tools, ArrowDown } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderList, acceptOrder, updateProduction, getOrderDetail, auditProduction } from '@/api/order';
import { getCustomerList } from '@/api/customer';
import { dictApi } from '@/api/dict';
import { createBill } from '@/api/bill';
import FlowDrawer from '@/components/FlowDrawer.vue';

const router = useRouter();
const userStore = useUserStore();
const tableRef = ref();

const loading = ref(false);
const isFullscreen = ref(false);
const toggleFullscreen = () => { isFullscreen.value = !isFullscreen.value; };
const handleEsc = (e) => { if (e.key === 'Escape' && isFullscreen.value) { isFullscreen.value = false; } };
const tableData = ref([]);
const batchCreating = ref(false);
const keyword = ref('');
const filterStatus = ref('');
const filterCustomerId = ref('');
const selectedOrders = ref([]);
const customerList = ref([]);
const productionStatuses = ref([]);

const dateRange = ref([]);

// 状态更新弹窗
const statusDialogVisible = ref(false);
const auditProductionDialogVisible = ref(false);
const auditProductionRow = ref(null);
const auditProductionApproved = ref(true);
const auditProductionRemark = ref('');
const auditProductionLoading = ref(false);
const statusLoading = ref(false);
const currentOrder = ref(null);
const selectedStatus = ref('');
const statusRemark = ref('');

// 流程抽屉
const flowDrawerVisible = ref(false);
const currentFlowOrderId = ref(0);
const currentFlowOrderNo = ref('');
const currentFlowStatus = ref('');

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const selectedTotal = computed(() => {
  return selectedOrders.value.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
});

// ============================================================
// 状态映射
// ============================================================
const statusMap = {
  customerAudited: { text: '待接单', type: 'success' },
  accepted: { text: '已接单', type: 'primary' },
  factory_edit: { text: '编辑中', type: 'primary' },
  waxing: { text: '出蜡', type: 'primary' },
  molded: { text: '倒模', type: 'primary' },
  setting: { text: '执模', type: 'primary' },
  cnc: { text: 'CNC', type: 'primary' },
  sweeping: { text: '扫镶口', type: 'primary' },
  stoneCutting: { text: '车石', type: 'primary' },
  microInlay: { text: '微镶', type: 'primary' },
  handInlay: { text: '手镶', type: 'primary' },
  polishing: { text: '制作完成待审核', type: 'warning' },
  billPending: { text: '账单待审核', type: 'warning' },
  billConfirmed: { text: '客户已确认', type: 'success' },
  completed: { text: '已完成', type: 'success' },
};

const normalizeStatus = (status) => {
  const value = String(status || '').trim();
  const normalized = value.replace(/[_-]/g, '').toLowerCase();
  const aliases = {
    customeraudited: 'customerAudited',
    factoryedit: 'factory_edit',
    billpending: 'billPending',
    billconfirmed: 'billConfirmed',
    stonecutting: 'stoneCutting',
    microinlay: 'microInlay',
    handinlay: 'handInlay'
  };
  return aliases[normalized] || value;
};

const getStatusText = (status) => {
  const normalized = normalizeStatus(status);
  return productionStatuses.value.find(item => item.value === normalized)?.label
    || statusMap[normalized]?.text
    || status
    || '-';
};
const getStatusType = (status) => statusMap[normalizeStatus(status)]?.type || 'info';

const getFlagTooltip = (row) => {
  const messages = [];
  if (row.warnFlag || row.alertReason) messages.push(`注意：${row.alertReason || '请关注该订单'}`);
  if (row.urgentFlag) messages.push('紧急');
  return messages.join('；');
};

const isInProduction = (status) => {
  return productionStatuses.value.some(item => item.value === normalizeStatus(status));
};

// ============================================================
// ⭐ 损耗异常判断：非 1.08 / 1.10 视为非标准损耗（列表加红框标注）
// ============================================================
const isAbnormalLoss = (lossRate) => {
  if (lossRate === null || lossRate === undefined || lossRate === '') return false;
  const n = Number(lossRate);
  if (isNaN(n)) return false;
  return Math.abs(n - 1.08) > 1e-9 && Math.abs(n - 1.10) > 1e-9;
};

// ============================================================
// ⭐ 编辑按钮权限
//   工厂操作员：账单待审核之前一直可编辑（不受制作状态约束）
//   工厂审核员：出账单之后（账单待审核及以后）仍可编辑
//   管理员：始终可编辑
// ============================================================
const BILL_STAGE_STATUSES = ['billPending', 'billRejected', 'billConfirmed', 'completed'];

const canEditRow = (row) => {
  const st = normalizeStatus(row.flowStatus);
  if (userStore.isAdmin) return true;
  if (userStore.isFactoryAudit) return BILL_STAGE_STATUSES.includes(st);
  if (userStore.isFactoryOrder) return !BILL_STAGE_STATUSES.includes(st);
  return false;
};

// ============================================================
// ⭐ 操作列下拉分发
// ============================================================
const handleRowAction = (cmd, row) => {
  switch (cmd) {
    case 'accept': handleAccept(row); break;
    case 'status': openStatusDialog(row); break;
    case 'repair': goRepair(row); break;
    case 'bill': handleGenerateBill(row); break;
    case 'edit': goFactoryEdit(row.orderId); break;
    case 'downloadPackage': downloadOrderPackage(row); break;
    case 'auditProduction': openAuditProductionDialog(row); break;
    case 'view': viewDetail(row.orderId); break;
  }
};

// ============================================================
// 状态选项
// ============================================================
const statusOptions = computed(() => {
  const current = currentOrder.value?.flowStatus;
  const currentIndex = productionStatuses.value.findIndex(s => s.value === current);
  if (currentIndex >= 0) {
    return productionStatuses.value.slice(currentIndex + 1);
  }
  return productionStatuses.value;
});

// ============================================================
// 加载客户列表
// ============================================================
const loadCustomers = async () => {
  try {
    const res = await getCustomerList({ includeInactive: false });
    customerList.value = res?.data || [];
  } catch {
    customerList.value = [];
  }
};

// ============================================================
// 获取日期范围（最近一个月）
// ============================================================
const getDateRange = () => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  return [startDateStr, endDate];
};

const viewBill = (billId) => {
  router.push(`/order/bill/detail/${billId}`);
};

// ============================================================
// 加载数据
// ============================================================
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      keyword: keyword.value || undefined,
      customerId: filterCustomerId.value || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    };

    if (filterStatus.value) {
      params.status = filterStatus.value;
    }

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
    } else {
      data = Array.isArray(responseData) ? responseData : [];
      total = data.length;
    }

    // 只显示工厂相关状态
    const factoryStatuses = new Set([
      'customerAudited', 'factory_edit', 'billPending', 'billConfirmed', 'completed',
      ...productionStatuses.value.map(item => item.value),
    ]);
    
    tableData.value = data
      .map(item => ({ ...item, flowStatus: normalizeStatus(item.flowStatus) }))
    pagination.total = tableData.value.length || total;
    
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error('加载数据失败');
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
  filterStatus.value = '';
  filterCustomerId.value = '';
  dateRange.value = getDateRange();
  pagination.current = 1;
  loadData();
};

// ============================================================
// 多选
// ============================================================
const handleSelectionChange = (selection) => {
  selectedOrders.value = selection;
};

// ============================================================
// 行点击
// ============================================================
const handleRowClick = (row, column) => {
  // 如果点击的是 selection 列，不处理
  if (column.type === 'selection') return
  // 如果点击的是操作列，不处理
  if (column.label === '操作') return
  // 否则打开流程抽屉
  currentFlowOrderId.value = row.orderId;
  currentFlowOrderNo.value = row.orderNo;
  currentFlowStatus.value = row.flowStatus;
  flowDrawerVisible.value = true;
};

// ============================================================
// 跳转维修单
// ============================================================
const goRepair = (row) => {
  router.push({
    name: 'RepairCreate',
    query: { orderId: row.orderId }
  })
}

// 下拉展开时按需确认该订单是否含数据包，避免无包订单显示下载入口
const ensurePackage = async (row) => {
  if (row._pkgChecked) return;
  try {
    const res = await getOrderDetail(row.orderId);
    const pkgs = (res && res.data && res.data.dataPackages) || [];
    row._hasPackage = pkgs.length > 0;
  } catch (e) {
    row._hasPackage = false;
  }
  row._pkgChecked = true;
};

// 数据包下载
const downloadOrderPackage = async (row) => {
  try {
    const res = await getOrderDetail(row.orderId)
    const pkgs = res?.data?.dataPackages || []
    if (!pkgs.length) {
      ElMessage.info('该订单暂无数据包')
      return
    }
    pkgs.forEach(pkg => {
      const url = pkg.fileUrl || pkg.url
      const name = pkg.fileName || pkg.name || 'package'
      if (!url) return
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    })
  } catch {
    ElMessage.error('获取数据包失败')
  }
}

// ============================================================
// 打开状态更新弹窗
// ============================================================
const openStatusDialog = (row) => {
  currentOrder.value = row;
  selectedStatus.value = '';
  statusRemark.value = '';
  statusDialogVisible.value = true;
};

// ============================================================
// 确认状态更新
// ============================================================
const confirmStatusUpdate = async () => {
  if (!selectedStatus.value) {
    ElMessage.warning('请选择目标状态');
    return;
  }

  statusLoading.value = true;
  try {
    const label = statusOptions.value.find(s => s.value === selectedStatus.value)?.label || selectedStatus.value;
    
    await updateProduction(currentOrder.value.orderId, {
      status: selectedStatus.value,
      step: 0,
      remark: statusRemark.value || `制作状态更新为：${label}`,
    });
    
    ElMessage.success(`状态已更新为：${label}`);
    statusDialogVisible.value = false;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '更新失败');
  } finally {
    statusLoading.value = false;
  }
};

// ============================================================
// 接单
// ============================================================
const handleBatchAccept = async () => {
  const acceptList = selectedOrders.value.filter(row => row.flowStatus === 'customerAudited');
  if (acceptList.length === 0) {
    ElMessage.warning('请选择待接单的订单');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要接单 ${acceptList.length} 个订单吗？`, '批量接单', { type: 'info' });
    let successCount = 0, failCount = 0;

    for (const order of acceptList) {
      try {
        await acceptOrder(order.orderId);
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0 && failCount === 0) {
      ElMessage.success(`${successCount} 个订单接单成功`);
    } else {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
    }
    loadData();
  } catch {}
};

const handleAccept = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要接单 ${row.orderNo} 吗？`, '接单确认', { type: 'info' });
    await acceptOrder(row.orderId);
    ElMessage.success('接单成功');
    loadData();
  } catch {}
};

// ============================================================
// 生成账单
// ============================================================
// Audit production dialog string constants
const AUDIT_PRODUCTION_TITLES = {
  pass: '通过审核，订单将进入【已完成】状态',
  reject: '驳回审核，订单将回到【工厂编辑】状态',
};

const openAuditProductionDialog = (row) => {
  auditProductionRow.value = row;
  auditProductionApproved.value = true;
  auditProductionRemark.value = '';
  auditProductionDialogVisible.value = true;
};

const confirmAuditProduction = async (approved) => {
  if (!auditProductionRow.value) return;
  auditProductionLoading.value = true;
  try {
    const res = await auditProduction(auditProductionRow.value.orderId, {
      approved,
      remark: auditProductionRemark.value,
    });
    if (res.success) {
      ElMessage.success(res.data?.message || (approved ? '审核通过' : '已驳回'));
      auditProductionDialogVisible.value = false;
      loadData();
    } else {
      ElMessage.error(res.message || '操作失败');
    }
  } catch (error) {
    ElMessage.error(error.message || '审核失败');
  } finally {
    auditProductionLoading.value = false;
  }
};

const handleGenerateBill = (row) => {
  router.push(`/order/bill/create?orderIds=${row.orderId}`);
};

const handleBatchGenerateBill = async () => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请先选择订单');
    return;
  }
  
  const validOrders = selectedOrders.value.filter(o => o.flowStatus === 'polishing');
  if (validOrders.length === 0) {
    ElMessage.warning('请选择状态为"制作完成"的订单');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定为 ${validOrders.length} 个订单生成账单吗？`, '生成账单', { type: 'info' });
  } catch {
    return;
  }

  batchCreating.value = true;
  try {
    const orderIds = validOrders.map(o => o.orderId);
    const res = await createBill({ orderIds });
    if (res.success) {
      ElMessage.success(`账单 ${res.billNo} 创建成功`);
      router.push(`/order/bill/edit/${res.billId}`);
    }
  } catch (error) {
    ElMessage.error(error.message || '生成账单失败');
  } finally {
    batchCreating.value = false;
  }
};

// ============================================================
// 跳转
// ============================================================
const goFactoryEdit = (orderId) => {
  router.push(`/order/factory-edit/${orderId}`);
};

const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

// ============================================================
// 时间格式化
// ============================================================
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ============================================================
// 初始化
// ============================================================
onMounted(() => {
  // ⭐ 默认最近一个月
  dateRange.value = getDateRange();
  loadCustomers();
  dictApi.getItemsByKey('production_status').then((res) => {
    productionStatuses.value = (res?.data || []).map(item => ({
      value: normalizeStatus(item.itemValue),
      label: item.itemLabel || item.itemValue,
    }));
    loadData();
  }).catch(() => {
    ElMessage.error('加载制作状态字典失败');
    loadData();
  });
  window.addEventListener('keydown', handleEsc);
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

.filter-bar {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
  background: #f5f7fa;
  padding: 10px 16px;
  border-radius: 6px;
}

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
:deep(.el-table .el-table__row) { cursor: pointer; }
:deep(.el-button.is-link) { padding: 0 4px; }

:deep(.el-image) { transition: transform 0.3s; }
:deep(.el-image:hover) { transform: scale(2.5); z-index: 10; position: relative; }

/* ⭐ 非标准损耗（非 1.08/1.10）：红框标注，不使用红色字体 */
.loss-abnormal {
  display: inline-block;
  min-width: 50px;
  padding: 1px 6px;
  border: 1px solid #F56C6C;
  border-radius: 4px;
  background: #fef0f0;
  color: #606266;
  font-weight: 600;
  font-size: 12px;
}

.order-flag {
  font-weight: 600;
  white-space: nowrap;
  font-size: 16px;
  line-height: 1;
}

.order-flags {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.order-warning-flag,
.order-urgent-flag {
  color: #f56c6c;
}

.order-flag-placeholder {
  color: #c0c4cc;
}
/* ===== 全屏模式 ===== */
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

.table-fullscreen {
  font-size: 16px;
}

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

.table-fullscreen :deep(.el-table .cell) {
  line-height: 1.6;
}

.table-fullscreen :deep(.el-image) {
  width: 80px !important;
  height: 80px !important;
}

.table-fullscreen :deep(.el-tag) {
  font-size: 15px !important;
  padding: 6px 12px !important;
  height: auto !important;
}

.table-fullscreen :deep(.el-link) {
  font-size: 16px !important;
}
</style>