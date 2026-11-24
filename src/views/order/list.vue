<!-- src/views/order/list.vue -->
<template>
  <div class="page-container" :class="{ 'is-fullscreen': isFullscreen }">
    <!-- ⭐ 全屏时常驻右上角的退出按钮（滚动到表格中段也能点，Esc 亦可） -->
    <FullscreenExit v-if="isFullscreen" @exit="toggleFullscreen" />
    <div class="page-header">
      <h2>📋 订单列表</h2>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <el-button type="primary" @click="goCreate">
          <el-icon><Plus /></el-icon> 新增
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button @click="columnVisibleDialog = true">
          <el-icon><Setting /></el-icon> 列设置
        </el-button>
        <el-button @click="toggleFullscreen">
          {{ isFullscreen ? '⛶ 退出全屏' : '⛶ 全屏' }}
        </el-button>
      </div>
    </div>

    <!-- ⭐ 一级 Tab -->
    <div v-show="!isFullscreen" class="order-tabs-wrapper">
      <el-tabs v-model="activeTab" @tab-change="onTabChange" class="order-tabs">
        <el-tab-pane name="pending">
          <template #label>
            <span class="tab-label">
              待处理
              <el-badge v-if="tabCounts.pending > 0" :value="tabCounts.pending" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="waitingFactory">
          <template #label>
            <span class="tab-label">
              待工厂接单
              <el-badge v-if="tabCounts.waitingFactory > 0" :value="tabCounts.waitingFactory" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="factoryProcessing">
          <template #label>
            <span class="tab-label">
              制作中
              <el-badge v-if="tabCounts.factoryProcessing > 0" :value="tabCounts.factoryProcessing" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="productionAudit">
          <template #label>
            <span class="tab-label">
              制作完成待审核
              <el-badge v-if="tabCounts.productionAudit > 0" :value="tabCounts.productionAudit" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="completed">
          <template #label>
            <span class="tab-label">
              已完成
              <el-badge v-if="tabCounts.completed > 0" :value="tabCounts.completed" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="all">
          <template #label>
            <span class="tab-label">
              全部
              <el-badge v-if="tabCounts.total > 0" :value="tabCounts.total" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- ⭐ 二级子筛选（只在"制作中"显示） -->
    <div v-show="!isFullscreen && activeTab === 'factoryProcessing'" class="sub-tabs-wrapper">
      <el-radio-group v-model="subStatus" @change="onSubStatusChange">
        <el-radio-button value="">全部节点</el-radio-button>
        <el-radio-button
          v-for="item in productionStatuses"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
          <span v-if="getSubStatusCount(item.value) > 0" class="sub-count">
            {{ getSubStatusCount(item.value) }}
          </span>
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 搜索栏 -->
    <div v-show="!isFullscreen" class="search-bar">
      <el-form :inline="true" :model="query" size="default">
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="订单号/品名/业务员"
            clearable
            style="width: 200px;"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="日期">
          <el-date-picker
            v-model="query.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px;"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetQuery">
            <el-icon><RefreshRight /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格 -->
    <el-table
      ref="tableRef"
      :class="{ 'table-fullscreen': isFullscreen }"
      :data="tableData"
      v-loading="loading"
      border
      stripe
      style="width: 100%"
      @sort-change="handleSortChange"
      @row-click="handleRowClick"
      @selection-change="handleSelectionChange"
      row-key="orderId"
      :row-class-name="getRowClassName"
    >
      <!-- 多选列 -->
      <el-table-column type="selection" width="40" align="center" />

      <el-table-column label="标记" width="62" fixed align="center">
        <template #default="{ row }">
          <el-tooltip
            v-if="row.warnFlag || row.alertReason || row.urgentFlag || row.isRepair"
            :content="getFlagTooltip(row)"
            placement="top"
          >
            <span class="order-flags">
              <span v-if="row.warnFlag || row.alertReason" class="order-flag order-warning-flag">❗</span>
              <span v-if="row.urgentFlag" class="order-flag order-urgent-flag">🔥</span>
              <!-- ⭐ 修理货：退货返修的单，一直保留标识 -->
              <span v-if="row.isRepair" class="order-flag order-repair-flag">修</span>
            </span>
          </el-tooltip>
          <span v-else class="order-flag-placeholder">-</span>
        </template>
      </el-table-column>

      <el-table-column prop="orderNo" label="订单号" width="150" fixed>
        <template #default="{ row }">
          <el-link
            type="primary"
            :class="{ 'blink-modify': hasPendingModify(row) }"
            @click.stop="viewDetail(row.orderId)"
          >
            {{ row.orderNo }}
            <span v-if="hasPendingModify(row)" class="modify-badge"><ModifyTripodIcon /></span>
          </el-link>
        </template>
      </el-table-column>

      <!-- ⭐ 状态列 -->
      <el-table-column prop="flowStatus" label="状态" width="110" fixed align="center">
        <template #default="{ row }">
          <span v-if="row.flowStatus === 'paused'" class="paused-status" title="工厂暂停中，可恢复生产">
            <span class="paused-bars"><i></i><i></i></span>
            <span class="paused-text">已暂停</span>
          </span>
          <el-tag v-else :type="getStatusType(row.flowStatus)" size="default" effect="light">
            {{ getStatusText(row.flowStatus) }}
          </el-tag>
          <div v-if="row.isRepair" class="repair-tag" title="客户退货返修的单，修好后重新出账">修理货</div>
        </template>
      </el-table-column>

      <!-- 账单列 -->
      <el-table-column label="账单" width="120" align="center">
        <template #default="{ row }">
          <el-link v-if="row.billId" type="primary" @click.stop="viewBill(row.billId)">
            {{ row.billNo || '账单' }}
          </el-link>
          <span v-else-if="row.flowStatus === 'completed'" style="color:#999;font-size:12px">未生成</span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column
        v-for="col in visibleColumns"
        :key="col.prop"
        :prop="col.prop"
        :label="col.label"
        :width="col.width"
        :min-width="col.minWidth"
        :align="col.align || 'center'"
        :sortable="col.sortable"
      >
        <template #default="{ row }">
          <template v-if="col.prop === 'orderDate'">
            {{ formatDate(row.orderDate) }}
          </template>

          <template v-else-if="col.prop === 'customerName'">
            {{ row.salesman || row.customerName || '-' }}
          </template>

          <template v-else-if="col.prop === 'imageUrl'">
            <el-image
              v-if="row.imageUrl"
              :src="row.imageUrl"
              fit="cover"
              style="width:50px;height:50px;border-radius:4px;cursor:pointer;"
              :preview-src-list="[row.imageUrl]"
              preview-teleported
              @click.stop
            />
            <span v-else style="color:#ccc;font-size:12px;">无图</span>
          </template>

          <template v-else-if="col.prop === 'dataImageUrl'">
            <el-image
              v-if="row.dataImageUrl"
              :src="row.dataImageUrl"
              fit="cover"
              style="width:50px;height:50px;border-radius:4px;cursor:pointer;"
              :preview-src-list="[row.dataImageUrl]"
              preview-teleported
              @click.stop
            />
            <span v-else style="color:#ccc;font-size:12px;">无图</span>
          </template>

          <template v-else-if="col.prop === 'gemColor'">
            {{ resolveGemColor(row) || '-' }}
          </template>

          <template v-else-if="col.prop === 'goldPrice'">
            {{ row.goldPrice || '-' }}
          </template>

          <template v-else-if="col.prop === 'url'">
            <a v-if="row.url" :href="row.url" target="_blank" style="color:#409EFF;text-decoration:none;">
              查看链接
            </a>
            <span v-else style="color:#ccc;">-</span>
          </template>

          <template v-else-if="col.prop === 'remark'">
            <span v-if="row.remark">{{ row.remark }}</span>
            <span v-else style="color:#ccc;">-</span>
          </template>

          <template v-else-if="col.prop === 'createdAt'">
            {{ formatDateTime(row.createdAt) }}
          </template>

          <template v-else>
            {{ row[col.prop] ?? '-' }}
          </template>
        </template>
      </el-table-column>

      <!-- ⭐ 操作列 -->
      <el-table-column v-if="!isFullscreen" label="操作" width="320" fixed="right" align="center">
        <template #default="{ row }">
          <!-- 查看 -->
          <el-button size="small" type="primary" link @click.stop="viewDetail(row.orderId)">
            查看
          </el-button>

          <!-- 再次下单 -->
          <el-button size="small" type="success" link @click.stop="handleReOrder(row)">
            再次下单
          </el-button>

          <!-- 预警 -->
          <el-button size="small" type="danger" link @click.stop="openAlertDialog(row)">
            预警
          </el-button>

          <!-- 申请修改 -->
          <el-button
            v-if="canApplyModifyRow(row)"
            size="small"
            type="warning"
            link
            @click.stop="handleApplyModify(row)"
          >
            申请修改
          </el-button>

          <!-- 取消订单 -->
          <el-button
            v-if="canApplyCancelRow(row)"
            size="small"
            type="danger"
            link
            @click.stop="handleApplyCancel(row)"
          >
            取消
          </el-button>

          <!-- 申请暂停 / 申请恢复（客户方发起，审核员审批） -->
          <el-button
            v-if="canApplyPauseRow(row)"
            size="small"
            type="warning"
            link
            @click.stop="handleApplyPause(row)"
          >
            申请暂停
          </el-button>
          <el-button
            v-if="canRequestRestoreRow(row)"
            size="small"
            type="success"
            link
            @click.stop="handleRequestRestore(row)"
          >
            申请恢复
          </el-button>

          <!-- 撤回取消申请（审批前） -->
          <el-button
            v-if="canWithdrawCancelRow(row)"
            size="small"
            type="info"
            link
            @click.stop="handleWithdrawCancelRow(row)"
          >
            撤回取消
          </el-button>

          <!-- 客户审核员：审批取消申请 -->
          <template v-if="canAuditCancelRow(row)">
            <el-button size="small" type="success" link @click.stop="handleAuditCancel(row, true)">
              同意取消
            </el-button>
            <el-button size="small" type="danger" link @click.stop="handleAuditCancel(row, false)">
              驳回取消
            </el-button>
          </template>

          <!-- 自己的订单才显示 -->
          <template v-if="isMine(row)">
            <el-button
              v-if="row.flowStatus === 'draft'"
              size="small"
              type="primary"
              @click.stop="handleSingleSubmit(row)"
            >
              提交
            </el-button>
            <el-button
              v-if="row.flowStatus === 'pending'"
              size="small"
              type="warning"
              @click.stop="handleWithdraw(row)"
            >
              撤回
            </el-button>
            <el-button
              v-if="canEdit(row)"
              size="small"
              type="warning"
              link
              @click.stop="goEdit(row.orderId)"
            >
              编辑
            </el-button>
            <el-button
              v-if="canDelete(row)"
              size="small"
              type="danger"
              link
              @click.stop="handleDelete(row)"
            >
              删除
            </el-button>
          </template>

          <!-- 别人的订单只读 -->
          <el-tag v-else size="small" type="info" effect="plain">只读</el-tag>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div v-show="!isFullscreen" style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="onPageChange"
        @current-change="onPageChange"
      />
    </div>

    <!-- 审核弹窗 -->
    <el-dialog v-model="auditDialogVisible" title="订单审核" width="450px">
      <div style="margin-bottom: 16px;">
        <p><strong>订单号：</strong>{{ currentOrder?.orderNo }}</p>
        <p><strong>客户：</strong>{{ currentOrder?.customerName }}</p>
        <p><strong>品名：</strong>{{ currentOrder?.productName }}</p>
        <p><strong>金额：</strong>¥{{ (currentOrder?.amount || 0).toFixed(2) }}</p>
      </div>
      <el-input
        v-model="auditRemark"
        type="textarea"
        :rows="3"
        placeholder="请输入审核备注（驳回时必填）"
      />
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmAudit(false)" :loading="auditLoading">
          驳回
        </el-button>
        <el-button type="success" @click="confirmAudit(true)" :loading="auditLoading">
          通过
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="alertDialogVisible" title="新增预警" width="460px">
      <el-form ref="alertFormRef" :model="alertForm" :rules="alertRules" label-width="90px">
        <el-form-item label="订单号">
          <el-input :model-value="alertTarget?.orderNo || ''" disabled />
        </el-form-item>
        <el-form-item label="预警说明" prop="reason">
          <el-input v-model="alertForm.reason" type="textarea" :rows="4" placeholder="请输入预警说明" />
        </el-form-item>
        <el-form-item label="补充备注">
          <el-input v-model="alertForm.remark" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="alertDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="submitAlert" :loading="alertSubmitting">确认预警</el-button>
      </template>
    </el-dialog>

    <!-- 列设置弹窗 -->
    <el-dialog v-model="columnVisibleDialog" title="📋 列显示设置" width="500px">
      <div style="display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 0;">
        <el-checkbox
          v-for="col in allColumns"
          :key="col.prop"
          v-model="col.visible"
          :disabled="col.fixed"
          style="width: 120px;"
        >
          {{ col.label }}
        </el-checkbox>
      </div>
      <div style="margin-top: 12px; color: #909399; font-size: 13px;">
        <el-checkbox :model-value="isAllSelected" @change="toggleAllColumns">
          全选
        </el-checkbox>
        <span style="margin-left: 16px;">（灰色列不可隐藏）</span>
      </div>
      <template #footer>
        <el-button @click="columnVisibleDialog = false">取消</el-button>
        <el-button type="primary" @click="applyColumnSettings">应用</el-button>
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
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh, Download, Search, RefreshRight, Setting } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderList, deleteOrder, auditOrder, submitOrder, withdrawSubmit, applyOrderModify, applyCancel, auditCancel, applyPause, requestRestore, withdrawCancel } from '@/api/order';
import { createManualAlert } from '@/api/alert';
import { dictApi } from '@/api/dict';
import FlowDrawer from '@/components/FlowDrawer.vue';
import FullscreenExit from '@/components/FullscreenExit.vue';
import ModifyTripodIcon from '@/components/ModifyTripodIcon.vue';
import { resolveGemColor } from '@/utils/color';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const tableRef = ref();

// ===== 列定义 =====
const allColumns = ref([
  { prop: 'orderDate', label: '订单日期', width: 110, align: 'center', visible: true, sortable: true },
  { prop: 'productName', label: '品名', minWidth: 120, visible: true },
  { prop: 'customerName', label: '销售名称', width: 120, visible: true },
  { prop: 'imageUrl', label: '产品图片', width: 80, align: 'center', visible: true },
  { prop: 'dataImageUrl', label: '数据图', width: 80, align: 'center', visible: true },
  { prop: 'size', label: '手寸/长度', width: 100, visible: true },
  { prop: 'widthThick', label: '宽/厚度', width: 100, visible: true },
  { prop: 'quantity', label: '数量', width: 70, visible: true },
  { prop: 'color', label: '成色', width: 80, visible: true },
  { prop: 'gemColor', label: '颜色', width: 80, visible: true },
  { prop: 'goldPrice', label: '金价', width: 90, align: 'right', visible: true },
  { prop: 'logoText', label: 'LOGO', width: 100, visible: true },
  { prop: 'diamondLevel', label: '钻石级别', width: 100, visible: true },
  { prop: 'weightRequirement', label: '克重要求', width: 110, visible: true },
  { prop: 'deliveryDays', label: '工期', width: 70, visible: true },
  { prop: 'url', label: '网址', minWidth: 120, visible: true },
  { prop: 'remark', label: '备注', minWidth: 100, visible: true },
  { prop: 'createdAt', label: '创建时间', width: 160, visible: true, sortable: true },
]);

const fixedColumns = ['orderNo'];
const columnVisibleDialog = ref(false);

const visibleColumns = computed(() => {
  return allColumns.value.filter(col => col.visible);
});

const isAllSelected = computed(() => {
  const selectable = allColumns.value.filter(col => !col.fixed);
  return selectable.every(col => col.visible);
});

const toggleAllColumns = (val) => {
  allColumns.value.forEach(col => {
    if (!col.fixed) col.visible = val;
  });
};

const applyColumnSettings = () => {
  const settings = {};
  allColumns.value.forEach(col => {
    settings[col.prop] = col.visible;
  });
  localStorage.setItem('orderListColumns', JSON.stringify(settings));
  columnVisibleDialog.value = false;
  ElMessage.success('列设置已保存');
};

const loadColumnSettings = () => {
  try {
    const saved = localStorage.getItem('orderListColumns');
    if (saved) {
      const settings = JSON.parse(saved);
      allColumns.value.forEach(col => {
        if (settings[col.prop] !== undefined) {
          col.visible = settings[col.prop];
        }
      });
    }
  } catch (e) {}
  allColumns.value.forEach(col => {
    if (fixedColumns.includes(col.prop)) {
      col.fixed = true;
      col.visible = true;
    }
  });
};

// ===== 流程抽屉 =====
const flowDrawerVisible = ref(false);
const currentFlowOrderId = ref(0);
const currentFlowOrderNo = ref('');
const currentFlowStatus = ref('');

// ===== 多选 =====
const selectedOrders = ref([]);
const handleSelectionChange = (selection) => {
  selectedOrders.value = selection;
};

// ===== 判断是否为自己的订单 =====
const isMine = (row) => {
  return Number(row.submittedBy) === Number(userStore.userId);
};

// ===== 状态映射 =====
const statusMap = {
  draft: { text: '草稿', type: 'info', color: '#909399' },
  pending: { text: '待客户审核', type: 'warning', color: '#E6A23C' },
  customeraudited: { text: '待工厂接单', type: 'success', color: '#67C23A' },
  factory_edit: { text: '工厂编辑中', type: 'primary', color: '#409EFF' },
  accepted: { text: '已接单', type: 'primary', color: '#409EFF' },
  dataConfirm: { text: '数据确认', type: 'primary', color: '#409EFF' },
  waxing: { text: '出蜡', type: 'primary', color: '#409EFF' },
  molded: { text: '倒模', type: 'primary', color: '#409EFF' },
  cnc: { text: 'CNC', type: 'primary', color: '#409EFF' },
  partsMissing: { text: '配件缺失', type: 'warning', color: '#E6A23C' },
  stoneReady: { text: '配石完成', type: 'primary', color: '#409EFF' },
  setting: { text: '执模', type: 'primary', color: '#409EFF' },
  glue: { text: '滴胶/磨石', type: 'primary', color: '#409EFF' },
  inlay: { text: '镶嵌', type: 'primary', color: '#409EFF' },
  assembly: { text: '组装', type: 'primary', color: '#409EFF' },
  polishing: { text: '制作完成待审核', type: 'warning', color: '#E6A23C' },
  productionCompleted: { text: '制作完成', type: 'warning', color: '#E6A23C' },
  completed: { text: '已完成', type: 'success', color: '#67C23A' },
  rejected: { text: '已驳回', type: 'danger', color: '#F56C6C' },
  cancelled: { text: '已取消', type: 'info', color: '#909399' },
  scrapped: { text: '已报废', type: 'danger', color: '#F56C6C' },
  unqualifiedReturn: { text: '不合格退回', type: 'danger', color: '#F56C6C' },
  paused: { text: '已暂停', type: 'warning', color: '#E6A23C' },
};

const getStatusText = (status) => statusMap[status]?.text || status || '-';
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ===== 行样式 =====
const getRowClassName = ({ row }) => {
  if (row.warnFlag || row.alertReason) return 'row-alert';
  return isMine(row) ? 'row-mine' : 'row-other';
};

// ===== 查询参数 =====
const query = reactive({
  keyword: '',
  dateRange: [],
  orderBy: 'createdAt',
  descending: true,
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const tableData = ref([]);
const loading = ref(false);

// ===== 全屏 =====
const isFullscreen = ref(false);
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};
const handleEsc = (e) => {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false;
  }
};

const auditDialogVisible = ref(false);
const auditLoading = ref(false);
const currentOrder = ref(null);
const auditRemark = ref('');
const alertDialogVisible = ref(false);
const alertSubmitting = ref(false);
const alertFormRef = ref();
const alertTarget = ref(null);
const alertForm = reactive({ reason: '', remark: '' });
const alertRules = { reason: [{ required: true, message: '请输入预警说明', trigger: 'blur' }] };

// ===== ⭐ 一级 Tab =====
const activeTab = ref('pending');
const subStatus = ref('');
const productionStatuses = ref([]);
const tabCounts = reactive({
  pending: 0,
  waitingFactory: 0,
  factoryProcessing: 0,
  productionAudit: 0,
  completed: 0,
  total: 0,
});
const subStatusCounts = ref({});

// Tab 与状态映射
const TAB_STATUS_MAP = {
  pending: ['draft', 'pending', 'rejected'],
  waitingFactory: ['customeraudited'],
  factoryProcessing: [
    'accepted', 'factory_edit', 'dataConfirm', 'waxing', 'molded', 'partsMissing',
    'setting', 'cnc', 'sweeping', 'stoneCutting', 'microInlay', 'handInlay',
    'assembly', 'polishing', 'stoneReady', 'glue', 'inlay'
  ],
  productionAudit: ['productionCompleted'],
  completed: ['completed', 'cancelled', 'scrapped', 'unqualifiedReturn', 'paused'],
  all: null,
};

// ⭐ 工作台卡片可带 ?status=xxx 精确过滤（草稿 / 待审核 / 已驳回 / 已完成）
const exactStatus = ref('');

const matchTab = (order, tab) => {
  if (exactStatus.value) return order.flowStatus === exactStatus.value;
  const statuses = TAB_STATUS_MAP[tab];
  if (!statuses) return true;
  return statuses.includes(order.flowStatus);
};

const updateTabCounts = (list) => {
  tabCounts.pending = list.filter(x => TAB_STATUS_MAP.pending.includes(x.flowStatus)).length;
  tabCounts.waitingFactory = list.filter(x => TAB_STATUS_MAP.waitingFactory.includes(x.flowStatus)).length;
  tabCounts.factoryProcessing = list.filter(x => TAB_STATUS_MAP.factoryProcessing.includes(x.flowStatus)).length;
  tabCounts.productionAudit = list.filter(x => TAB_STATUS_MAP.productionAudit.includes(x.flowStatus)).length;
  tabCounts.completed = list.filter(x => TAB_STATUS_MAP.completed.includes(x.flowStatus)).length;
  tabCounts.total = list.length;
};

const updateSubStatusCounts = (list) => {
  const counts = {};
  list.forEach(x => {
    if (TAB_STATUS_MAP.factoryProcessing.includes(x.flowStatus)) {
      counts[x.flowStatus] = (counts[x.flowStatus] || 0) + 1;
    }
  });
  subStatusCounts.value = counts;
};

const getSubStatusCount = (status) => {
  return subStatusCounts.value[status] || 0;
};

const onTabChange = () => {
  subStatus.value = '';
  exactStatus.value = '';       // 手动切页签 = 看整组
  pagination.current = 1;
  loadData();
};

const onSubStatusChange = () => {
  pagination.current = 1;
  loadData();
};

// ===== 获取默认日期范围（7天前 ~ 今天） =====
const getDefaultDateRange = () => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const format = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return [];   // ⭐ 默认「全部时间」：工作台统计的是全部，避免两边数字对不上
};

// ===== 点击行查看流程 =====
const handleRowClick = (row) => {
  currentFlowOrderId.value = row.orderId;
  currentFlowOrderNo.value = row.orderNo;
  currentFlowStatus.value = row.flowStatus;
  flowDrawerVisible.value = true;
};

// ===== 再次下单 =====
const handleReOrder = (row) => {
  router.push(`/order/create?copy=${row.orderId}`);
};

const openAlertDialog = (row) => {
  alertTarget.value = row;
  alertForm.reason = '';
  alertForm.remark = '';
  alertDialogVisible.value = true;
};

const submitAlert = async () => {
  const valid = await alertFormRef.value?.validate().catch(() => false);
  if (!valid || !alertTarget.value) return;
  alertSubmitting.value = true;
  try {
    await createManualAlert({
      orderId: alertTarget.value.orderId,
      reason: alertForm.reason.trim(),
      remark: alertForm.remark.trim(),
    });
    ElMessage.success('预警已创建');
    alertDialogVisible.value = false;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '创建预警失败');
  } finally {
    alertSubmitting.value = false;
  }
};

// ===== 编辑 =====
const goEdit = (id) => {
  router.push(`/order/create/${id}`);
};

// ===== 权限判断 =====
const canEdit = (row) => {
  const status = row.flowStatus;
  // ⭐ 草稿 / 已驳回：直接编辑；待客户审核要先「撤回」再编辑（按钮已单独提供）
  return status === 'draft' || status === 'rejected';
};

const handleWithdraw = async (row) => {
  try {
    await ElMessageBox.confirm(`确定撤回订单 ${row.orderNo} 吗？撤回后可修改并重新提交。`, '撤回审核', { type: 'warning' });
    await withdrawSubmit(row.orderId);
    ElMessage.success('订单已撤回，可修改后重新提交');
    loadData();
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(error.message || '撤回失败');
  }
};

const canDelete = (row) => {
  const status = row.flowStatus;
  return status === 'draft' || status === 'rejected';
};

// ===== 可申请修改的阶段 =====
// ⭐ 草稿 / 已驳回：直接编辑；待客户审核：撤回后再编辑（都不走申请修改）
// ⭐ 以下阶段订单已进入工厂环节，改动需审核：customeraudited + FACTORY_EDITABLE
const FACTORY_EDITABLE = [
  'customeraudited', 'factory_edit', 'dataConfirm', 'waxing', 'molded', 'cnc', 'partsMissing',
  'sweeping', 'stoneCutting', 'microInlay', 'handInlay', 'assembly', 'polishing', 'paused', 'stoneReady', 'glue', 'inlay', 'billRejected'
];

const APPLY_MODIFY_ALLOWED = [
  ...FACTORY_EDITABLE   // 已含 customeraudited（待工厂接单）
];

const canApplyModifyRow = (row) => {
  if (userStore.userType !== 'customer') return false;
  if (Number(row.submittedBy) !== Number(userStore.userId)) return false;
  if (!row.flowStatus) return false;
  if (!APPLY_MODIFY_ALLOWED.includes(row.flowStatus)) return false;
  if (row.modifyTracking || (row.modifyStatus && row.modifyStatus !== 'none')) return false;
  return true;
};

const handleApplyModify = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt(
      '该订单已进入工厂环节，填写修改原因后由客户审核员审批，同意后退回草稿重新编辑',
      '申请修改',
      {
        confirmButtonText: '提交申请',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '例如：需要更改克重要求 / 钻石级别',
        inputValidator: v => v?.trim() ? true : '请填写原因'
      }
    );
    if (!value || !value.trim()) return;

    const beforeFactoryAcceptance = row.flowStatus === 'customeraudited';
    await applyOrderModify(row.orderId, {
      data: {},
      reason: value.trim()
    });
    ElMessage.success(beforeFactoryAcceptance
      ? '修改申请已提交，等待工厂审核员审批'
      : '修改申请已提交，等待客户审核员审批');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '提交失败');
  }
};

// ===== 可申请取消的阶段 =====
// 取消 = 终止订单；终态(completed/cancelled/scrapped/unqualifiedReturn)不可再取消
// ⚠️ 工厂已暂停(paused)的订单要先恢复生产才能取消，避免 pause* 字段互相覆盖
const CANCEL_FINAL = ['completed', 'cancelled', 'scrapped', 'unqualifiedReturn', 'paused'];

const canApplyCancelRow = (row) => {
  if (userStore.userType !== 'customer') return false;
  if (Number(row.submittedBy) !== Number(userStore.userId)) return false;
  if (!row.flowStatus) return false;
  if (CANCEL_FINAL.includes(row.flowStatus)) return false;
  // 已有进行中的取消申请
  if (row.pauseStatus && row.pauseStatus !== 'none') return false;
  return true;
};

// ===== 客户申请暂停 / 恢复（2026-11-06）=====
// 暂停 = 客户方申请、客户审核员审批后订单停下，工厂不能自行恢复；恢复也要客户方申请
const canApplyPauseRow = (row) => {
  if (userStore.userType !== 'customer') return false;
  if (Number(row.submittedBy) !== Number(userStore.userId)) return false;
  if (!row.flowStatus) return false;
  if (CANCEL_FINAL.includes(row.flowStatus)) return false;          // 含 paused：已暂停不用再申请
  if (['draft', 'pending', 'rejected'].includes(row.flowStatus)) return false; // 还没进工厂，直接取消更合适
  if (row.pauseStatus && row.pauseStatus !== 'none') return false;  // 有取消申请在走
  if (row.pauseReqStatus && row.pauseReqStatus !== 'none' && row.pauseReqStatus !== 'rejected') return false;
  return true;
};

const canRequestRestoreRow = (row) => {
  if (userStore.userType !== 'customer') return false;
  if (Number(row.submittedBy) !== Number(userStore.userId)) return false;
  return row.flowStatus === 'paused' && row.pauseReqStatus === 'approved';
};

// 撤回取消申请：审批前才能撤
const canWithdrawCancelRow = (row) => {
  if (userStore.userType !== 'customer') return false;
  if (Number(row.submittedBy) !== Number(userStore.userId)) return false;
  return row.pauseStatus === 'pendingCustomerAudit' && !row.pauseAuditAt;
};

const handleApplyPause = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt(
      '暂停后工厂无法继续推进，需客户审核员审批；恢复也要由我们提交恢复申请。请填写暂停原因：',
      '申请暂停',
      {
        confirmButtonText: '提交申请', cancelButtonText: '取消',
        inputType: 'textarea', inputPlaceholder: '如：客户改款，等确认后再做',
        inputValidator: v => v?.trim() ? true : '请填写暂停原因'
      }
    );
    if (!value || !value.trim()) return;
    const res = await applyPause(row.orderId, value.trim());
    ElMessage.success(res?.data?.message || '暂停申请已提交');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '提交失败');
  }
};

const handleRequestRestore = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt('请填写恢复原因', '申请恢复生产', {
      confirmButtonText: '提交申请', cancelButtonText: '取消',
      inputType: 'textarea', inputPlaceholder: '如：款式已确认，可以继续做'
    });
    await requestRestore(row.orderId, (value || '').trim());
    ElMessage.success('恢复申请已提交，等待客户审核员审批');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '提交失败');
  }
};

const handleWithdrawCancelRow = async (row) => {
  try {
    await ElMessageBox.confirm('撤回后订单恢复正常流转，确定撤回取消申请吗？', '撤回取消申请', { type: 'warning' });
    await withdrawCancel(row.orderId);
    ElMessage.success('已撤回取消申请');
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '撤回失败');
  }
};

const handleApplyCancel = async (row) => {  // 客户审核前(draft/pending/rejected)：直接取消，无审批
  const directCancel = ['draft', 'pending', 'rejected'].includes(row.flowStatus);
  const tip = directCancel
    ? '该订单尚未进入工厂，取消后将直接终止（不可恢复），确认继续？'
    : row.flowStatus === 'customeraudited'
      ? '该订单客户已审核、工厂尚未接单，提交取消申请后由客户审核员审批，同意即终止。'
      : '该订单工厂已接单，提交取消申请后需客户审核员审批、工厂确认，确认即终止。';

  try {
    const { value } = await ElMessageBox.prompt(tip, '取消订单', {
      confirmButtonText: directCancel ? '确认取消' : '提交取消申请',
      cancelButtonText: '再想想',
      inputType: 'textarea',
      inputPlaceholder: '请填写取消原因',
      inputValidator: v => v?.trim() ? true : '请填写取消原因'
    });
    if (!value || !value.trim()) return;

    const res = await applyCancel(row.orderId, value.trim());
    ElMessage.success(res?.data?.message || (directCancel ? '订单已取消' : '取消申请已提交'));
    loadData();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

// ===== 客户审核员：审批取消申请 =====
const canAuditCancelRow = (row) => {
  if (userStore.userType !== 'customerAudit' && userStore.userType !== 'admin') return false;
  return (row.pauseStatus === 'pendingCustomerAudit' || row.pauseStatus === 'pendingFactoryConfirm')
    && !row.pauseAuditAt;
};

const handleAuditCancel = async (row, approved) => {
  try {
    if (approved) {
      const isFactoryStage = row.pauseStatus === 'pendingFactoryConfirm'
        || row.cancelNeedFactoryConfirm === true;
      await ElMessageBox.confirm(
        isFactoryStage
          ? '同意后取消申请将转给工厂确认，工厂确认后订单终止。确认同意？'
          : '同意后订单将直接终止（不可恢复）。确认同意？',
        '同意取消',
        { type: 'warning', confirmButtonText: '确认同意', cancelButtonText: '再想想' }
      );
      await auditCancel(row.orderId, { approved: true, remark: '同意取消' });
      ElMessage.success('已同意取消申请');
    } else {
      const { value } = await ElMessageBox.prompt('请填写驳回原因', '驳回取消', {
        inputType: 'textarea',
        confirmButtonText: '确认驳回',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入驳回原因',
        inputValidator: v => v?.trim() ? true : '请输入驳回原因'
      });
      await auditCancel(row.orderId, { approved: false, remark: value.trim() });
      ElMessage.success('已驳回取消申请');
    }
    loadData();
  } catch (e) {
    if (e !== 'cancel' && e?.name !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

// ===== 分页切换 =====
const onPageChange = () => {
  loadData();
};

// ===== 搜索 =====
const handleSearch = () => {
  pagination.current = 1;
  loadData();
};

const viewBill = (billId) => {
  router.push(`/order/bill/detail/${billId}`);
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    // ⭐ 一次拉全部，前端过滤 + 分页（第 1 步临时方案）
    const params = {
      keyword: query.keyword || undefined,
      page: 1,
      pageSize: 1000,
      orderBy: query.orderBy,
      descending: query.descending,
    };
    // ⭐ 审核员默认只返回「待审核」，这里要整客户的单来做页签统计
    if (userStore.userType === 'customerAudit') params.status = 'all';

    if (query.dateRange && query.dateRange.length === 2) {
      params.startDate = query.dateRange[0];
      params.endDate = query.dateRange[1];
    }

    const res = await getOrderList(params);

    let data = res?.data || res || {};
    let list = [];

    if (Array.isArray(data)) list = data;
    else if (data.items && Array.isArray(data.items)) list = data.items;
    else if (data.data && Array.isArray(data.data)) list = data.data;
    else list = [];

    // ⭐ 下单员只看自己提交的单；客户审核员要审整个客户的单，所以不过滤
    //    （工作台计数与之保持同一口径，否则「卡片显示 N 条、点进去 M 条」）
    if (userStore.userType !== 'customerAudit') {
      list = list.filter(x => Number(x.submittedBy) === Number(userStore.userId));
    }

    // ⭐ 更新 Tab 数量（从全量算）
    updateTabCounts(list);
    updateSubStatusCounts(list);

    // ⭐ 按 tab 过滤
    let filtered = list.filter(x => matchTab(x, activeTab.value));

    // ⭐ 按 subStatus 过滤
    if (activeTab.value === 'factoryProcessing' && subStatus.value) {
      filtered = filtered.filter(x => x.flowStatus === subStatus.value);
    }

    // ⭐ 前端分页
    pagination.total = filtered.length;
    const start = (pagination.current - 1) * pagination.pageSize;
    tableData.value = filtered.slice(start, start + pagination.pageSize);

  } catch (error) {
    ElMessage.error(error.message || '加载数据失败');
    tableData.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

const resetQuery = () => {
  query.keyword = '';
  query.dateRange = getDefaultDateRange();
  query.orderBy = 'createdAt';
  query.descending = true;
  pagination.current = 1;
  loadData();
};

const handleSortChange = ({ prop, order }) => {
  query.orderBy = prop || 'createdAt';
  query.descending = order !== 'ascending';
  loadData();
};

// ============================================================
// 提交审核（单个）
// ============================================================
const handleSingleSubmit = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要提交订单 ${row.orderNo} 审核吗？`,
      '提交审核',
      { type: 'info' }
    );
    await submitOrder(row.orderId);
    ElMessage.success('提交审核成功');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '提交失败');
    }
  }
};

// ============================================================
// 删除
// ============================================================
const handleDelete = (row) => {
  ElMessageBox.confirm(`确定要删除订单 ${row.orderNo} 吗？`, '提示', { type: 'warning' })
    .then(async () => {
      await deleteOrder(row.orderId);
      ElMessage.success('删除成功');
      loadData();
    })
    .catch(() => {});
};

// ============================================================
// 审核
// ============================================================
const handleQuickAudit = (row) => {
  currentOrder.value = row;
  auditRemark.value = '';
  auditDialogVisible.value = true;
};

const confirmAudit = async (approved) => {
  if (!approved && !auditRemark.value.trim()) {
    ElMessage.warning('驳回必须填写原因');
    return;
  }

  auditLoading.value = true;
  try {
    await auditOrder(currentOrder.value.orderId, {
      approved,
      remark: auditRemark.value || '',
    });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    auditDialogVisible.value = false;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '操作失败');
  } finally {
    auditLoading.value = false;
  }
};

// ============================================================
// 跳转
// ============================================================
const goCreate = () => {
  router.push('/order/create');
};

const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

const hasPendingModify = (row) => {
  return row.modifyTracking === true;
};

const getFlagTooltip = (row) => {
  const messages = [];
  if (row.warnFlag || row.alertReason) messages.push(`注意：${row.alertReason || '请关注该订单'}`);
  if (row.urgentFlag) messages.push('加急');
  if (row.isRepair) messages.push('修理货：退货返修，修好后重新出账');
  return messages.join('；');
};

// ============================================================
// 时间格式化
// ============================================================
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', { hour12: false });
};

// ============================================================
// 初始化
// ============================================================
onMounted(async () => {
  loadColumnSettings();
  query.dateRange = getDefaultDateRange();

  // ⭐ 工作台卡片直达：?tab=factoryProcessing&status=draft
  const qTab = String(route.query.tab || '');
  if (qTab && ['pending', 'waitingFactory', 'factoryProcessing', 'productionAudit', 'completed', 'all'].includes(qTab)) {
    activeTab.value = qTab;
  }
  const qStatus = String(route.query.status || '');
  if (qStatus) exactStatus.value = qStatus;

  // 加载制作节点字典
  try {
    const res = await dictApi.getItemsByKey('production_status');
    productionStatuses.value = (res?.data || []).map(item => ({
      value: item.itemValue,
      label: item.itemLabel || item.itemValue,
    }));
  } catch {}

  loadData();
  window.addEventListener('keydown', handleEsc);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEsc);
});
</script>

<style scoped>
.page-container {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.page-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

/* ===== 一级 Tab ===== */
.order-tabs-wrapper {
  margin-bottom: 8px;
}
.order-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
.order-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  font-weight: 500;
  height: 48px;
  line-height: 48px;
}
.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tab-badge :deep(.el-badge__content) {
  transform: translateY(-2px) translateX(4px);
  font-size: 11px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
  border: none;
}

/* ===== 二级子筛选 ===== */
.sub-tabs-wrapper {
  margin-bottom: 12px;
  background: #fafbfc;
  padding: 10px 16px;
  border-radius: 6px;
  border: 1px solid #e8ecf1;
}
.sub-tabs-wrapper :deep(.el-radio-button__inner) {
  font-size: 13px;
}
.sub-count {
  display: inline-block;
  margin-left: 4px;
  color: #f56c6c;
  font-weight: 600;
}

/* ===== 搜索栏 ===== */
.search-bar {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.search-bar :deep(.el-form-item) {
  margin-bottom: 0;
}
.search-bar :deep(.el-form-item:last-child) {
  margin-left: 8px;
}

:deep(.el-table .cell) {
  padding: 6px 8px;
}
:deep(.el-table .el-table__row) {
  cursor: pointer;
}
:deep(.el-button.is-link) {
  padding: 0 4px;
}
:deep(.el-image) {
  display: inline-block;
}

/* ===== 行样式 ===== */
:deep(.el-table .row-mine) {
  background-color: #ffffff !important;
}
:deep(.el-table .row-other) {
  background-color: #f5f7fa !important;
}
:deep(.el-table .row-other:hover) {
  background-color: #eef1f5 !important;
}
:deep(.el-table .row-alert) {
  background-color: #fff1f0 !important;
  color: #cf1322;
  font-weight: 600;
}
:deep(.el-table .row-alert:hover) {
  background-color: #ffccc7 !important;
}

/* ⭐ 暂停状态：橙色暂停条（工厂临时停，可恢复） */
.paused-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.paused-bars {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #e6a23c;
  box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex-shrink: 0;
}
.paused-bars i {
  display: block;
  width: 2px;
  height: 7px;
  background: #fff;
  border-radius: 1px;
}
.paused-text {
  color: #e6a23c;
  font-weight: 700;
  font-size: 13px;
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
/* ⭐ 修理货：紫色「修」角标 + 状态下面的小标签，扫一眼就知道这单修过 */
.order-repair-flag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: #8b5cf6;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}
.repair-tag {
  display: inline-block;
  margin-top: 2px;
  padding: 0 5px;
  border-radius: 3px;
  border: 1px solid #d8b4fe;
  background: #f5f3ff;
  color: #7c3aed;
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
}

/* ⭐ 待处理修改申请：订单号闪烁 */
.blink-modify {
  animation: blink 1s infinite;
  color: #f56c6c !important;
  font-weight: 700;
}
.modify-badge {
  margin-left: 4px;
  font-size: 14px;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ===== 全屏模式 ===== */
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