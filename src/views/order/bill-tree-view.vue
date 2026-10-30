<!-- src/views/order/bill-tree-view.vue -->
<!-- ⭐ 账单汇总（表格样式，参照出货明细预览弹窗）：客户单选必填默认第一个，明细 + 销售小计 + 总计，含已付款/未付款 -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()" plain>
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>账单汇总</h2>
        <el-tag type="primary" size="large" effect="plain">
          {{ summary.startDate }} ~ {{ summary.endDate }}
        </el-tag>
      </div>
      <div class="header-right">
        <el-radio-group v-model="dateType" @change="onDateTypeChange">
          <el-radio-button value="today">今天</el-radio-button>
          <el-radio-button value="month">本月</el-radio-button>
          <el-radio-button value="custom">自定义</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="dateType === 'custom'"
          v-model="customRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width:260px;"
          @change="loadData"
        />
        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 筛选栏：客户（单选必填）/ 销售 / 品名 / 成色 -->
    <div class="filter-bar">
      <div class="filter-item">
        <span class="filter-label" style="color:#F56C6C;">客户 *</span>
        <el-select
          v-model="filters.customerId"
          filterable
          placeholder="请选择客户" style="width:220px;"
          @change="loadData"
        >
          <el-option v-for="c in options.customers" :key="c.customerId" :label="c.customerName" :value="c.customerId" />
        </el-select>
      </div>
      <div class="filter-item">
        <span class="filter-label">销售</span>
        <el-select
          v-model="filters.salesmen"
          multiple collapse-tags collapse-tags-tooltip clearable filterable
          placeholder="全部销售" style="width:180px;"
        >
          <el-option v-for="s in options.salesmen" :key="s" :label="s" :value="s" />
        </el-select>
      </div>
      <div class="filter-item">
        <span class="filter-label">品名</span>
        <el-select
          v-model="filters.products"
          multiple collapse-tags collapse-tags-tooltip clearable filterable
          placeholder="全部品名" style="width:220px;"
        >
          <el-option v-for="p in options.products" :key="p" :label="p" :value="p" />
        </el-select>
      </div>
      <div class="filter-item">
        <span class="filter-label">成色</span>
        <el-select
          v-model="filters.colors"
          multiple collapse-tags collapse-tags-tooltip clearable filterable
          placeholder="全部成色" style="width:180px;"
        >
          <el-option v-for="c in options.colors" :key="c" :label="c" :value="c" />
        </el-select>
      </div>
      <el-button type="primary" plain @click="loadData">查询</el-button>
      <el-button @click="resetFilters">重置</el-button>
    </div>

    <!-- 总览卡片 -->
    <div class="overview-cards">
      <div class="overview-card">
        <div class="card-icon" style="background:#ecf5ff;color:#409EFF;"><el-icon><User /></el-icon></div>
        <div class="card-content">
          <div class="card-label">总件数</div>
          <div class="card-value">{{ summary.totalQuantity || 0 }}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon" style="background:#fdf6ec;color:#E6A23C;"><el-icon><Money /></el-icon></div>
        <div class="card-content">
          <div class="card-label">应收金额</div>
          <div class="card-value" style="color:#E6A23C;">¥{{ fmtMoney(summary.totalAmount) }}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon" style="background:#f0f9ff;color:#67C23A;"><el-icon><Goods /></el-icon></div>
        <div class="card-content">
          <div class="card-label">已付款</div>
          <div class="card-value" style="color:#67C23A;">¥{{ fmtMoney(summary.paidAmount) }}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon" style="background:#fef0f0;color:#F56C6C;"><el-icon><Wallet /></el-icon></div>
        <div class="card-content">
          <div class="card-label">未付款</div>
          <div class="card-value" style="color:#F56C6C;">¥{{ fmtMoney(summary.unpaidAmount) }}</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon" style="background:#ecf5ff;color:#409EFF;"><el-icon><Coin /></el-icon></div>
        <div class="card-content">
          <div class="card-label">应收足金料</div>
          <div class="card-value" style="color:#409EFF;">{{ fmtG(summary.materialTotal) }} g</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon" style="background:#f0f9ff;color:#67C23A;"><el-icon><Box /></el-icon></div>
        <div class="card-content">
          <div class="card-label">已收足金料</div>
          <div class="card-value" style="color:#67C23A;">{{ fmtG(summary.materialReceived) }} g</div>
        </div>
      </div>
      <div class="overview-card">
        <div class="card-icon" style="background:#fef0f0;color:#F56C6C;"><el-icon><ScaleToOriginal /></el-icon></div>
        <div class="card-content">
          <div class="card-label">未收足金料</div>
          <div class="card-value" style="color:#F56C6C;">{{ fmtG(summary.materialUnpaid) }} g</div>
        </div>
      </div>
    </div>

    <!-- 表格：出货明细弹窗风格（明细 + 销售小计 + 合计） -->
    <div class="tree-wrapper">
      <el-table
        ref="tableRef"
        :data="flatData"
        row-key="nodeKey"
        :row-class-name="rowClassName"
        :span-method="spanMethod"
        border
        size="small"
        :max-height="tableMaxHeight"
        :header-cell-style="headerCellStyle"
        :cell-style="cellStyle"
        class="bill-table"
      >
        <el-table-column prop="orderNo" label="流水单号" width="130" fixed="left">
          <template #default="{ row }">
            <span v-if="row.nodeType === 'detail'" class="order-no" @click.stop="goOrderDetail(row)">{{ row.orderNo }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="seqNo" label="序号" width="50" align="center">
          <template #default="{ row }">
            <span v-if="row.nodeType === 'detail'">{{ row.seqNo }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="productName" label="品名" min-width="140">
          <template #default="{ row }">
            <span v-if="row.nodeType === 'detail'">{{ row.productName }}</span>
            <span v-else-if="row.nodeType === 'subtotal'" class="subtotal-text">{{ row.salesName }}：{{ Number(row.totalAmount || 0).toFixed(2) }}元</span>
            <span v-else-if="row.nodeType === 'total'" class="subtotal-text">合计：</span>
          </template>
        </el-table-column>

        <el-table-column prop="diamondLevel" label="钻石级别" width="80" align="center">
          <template #default="{ row }">
            <span v-if="row.nodeType === 'detail'">{{ row.diamondLevel }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="orderDate" label="订单日期" width="90" align="center">
          <template #default="{ row }">
            <span v-if="row.nodeType === 'detail'">{{ fmtDate(row.orderDate) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="color" label="颜色" width="65" align="center">
          <template #default="{ row }">
            <span v-if="row.nodeType === 'detail'">{{ row.color }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="quantity" label="件数" width="60" align="center">
          <template #default="{ row }">
            <b v-if="row.nodeType !== 'detail'">{{ row.quantity }}</b>
            <span v-else>{{ row.quantity }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="size" label="手寸/长度" width="80" align="center">
          <template #default="{ row }">
            <span v-if="row.nodeType === 'detail'">{{ row.size }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="totalWeight" label="总重" width="70" align="right">
          <template #default="{ row }">
            <b v-if="row.nodeType !== 'detail'">{{ fmtW(row.totalWeight) }}</b>
            <span v-else>{{ fmtW(row.totalWeight) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="netWeight" label="净重" width="70" align="right">
          <template #default="{ row }">
            <b v-if="row.nodeType !== 'detail'">{{ fmtW(row.netWeight) }}</b>
            <span v-else>{{ fmtW(row.netWeight) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="lossRate" label="损耗" width="60" align="right">
          <template #default="{ row }">
            <span v-if="row.nodeType === 'detail'">{{ fmtW(row.lossRate) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="addLossWeight" label="加耗重" width="75" align="right">
          <template #default="{ row }">
            <b v-if="row.nodeType !== 'detail'">{{ fmtW(row.addLossWeight) }}</b>
            <span v-else>{{ fmtW(row.addLossWeight) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="goldPrice" label="金价" width="70" align="right">
          <template #default="{ row }">
            <span v-if="row.nodeType === 'detail'">{{ fmtM(row.goldPrice) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="goldMaterialFee" label="足金料金额" width="90" align="right">
          <template #default="{ row }">
            <b v-if="row.nodeType !== 'detail'">{{ fmtM(row.goldMaterialFee) }}</b>
            <span v-else>{{ fmtM(row.goldMaterialFee) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="goldMaterialWeight" label="足金料(g)" width="95" align="right">
          <template #default="{ row }">
            <b v-if="row.nodeType !== 'detail'">{{ fmtW(row.goldMaterialWeight) }}</b>
            <span v-else>{{ fmtW(row.goldMaterialWeight) }}</span>
          </template>
        </el-table-column>

        <!-- 主石 -->
        <el-table-column label="主石" align="center">
          <el-table-column prop="mainStoneQty" label="粒数" width="55" align="center">
            <template #default="{ row }">
              <b v-if="row.nodeType !== 'detail'">{{ row.mainStoneQty || '' }}</b>
              <span v-else>{{ row.mainStoneQty || '' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="mainStoneWeight" label="石重(ct)" width="80" align="right">
            <template #default="{ row }">
              <b v-if="row.nodeType !== 'detail'">{{ fmtW(row.mainStoneWeight) }}</b>
              <span v-else>{{ fmtW(row.mainStoneWeight) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="mainStonePrice" label="单价(元)" width="80" align="right">
            <template #default="{ row }">
              <span v-if="row.nodeType === 'detail'">{{ fmtM(row.mainStonePrice) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="mainStoneAmount" label="金额(元)" width="85" align="right">
            <template #default="{ row }">
              <b v-if="row.nodeType !== 'detail'">{{ fmtM(row.mainStoneAmount) }}</b>
              <span v-else>{{ fmtM(row.mainStoneAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="mainStoneSettingFee" label="镶石工费" width="85" align="right">
            <template #default="{ row }">
              <b v-if="row.nodeType !== 'detail'">{{ fmtM(row.mainStoneSettingFee) }}</b>
              <span v-else>{{ fmtM(row.mainStoneSettingFee) }}</span>
            </template>
          </el-table-column>
        </el-table-column>

        <!-- 副石 -->
        <el-table-column label="副石" align="center">
          <el-table-column prop="subStoneQty" label="粒数" width="55" align="center">
            <template #default="{ row }">
              <b v-if="row.nodeType !== 'detail'">{{ row.subStoneQty || '' }}</b>
              <span v-else>{{ row.subStoneQty || '' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="subStoneWeight" label="石重" width="70" align="right">
            <template #default="{ row }">
              <b v-if="row.nodeType !== 'detail'">{{ fmtW(row.subStoneWeight) }}</b>
              <span v-else>{{ fmtW(row.subStoneWeight) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="subStonePrice" label="单价(元)" width="80" align="right">
            <template #default="{ row }">
              <span v-if="row.nodeType === 'detail'">{{ fmtM(row.subStonePrice) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="subStoneAmount" label="金额(元)" width="85" align="right">
            <template #default="{ row }">
              <b v-if="row.nodeType !== 'detail'">{{ fmtM(row.subStoneAmount) }}</b>
              <span v-else>{{ fmtM(row.subStoneAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="subStoneSettingFee" label="镶石工费" width="85" align="right">
            <template #default="{ row }">
              <b v-if="row.nodeType !== 'detail'">{{ fmtM(row.subStoneSettingFee) }}</b>
              <span v-else>{{ fmtM(row.subStoneSettingFee) }}</span>
            </template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="包装证书邮费" width="100" align="right">
          <template #default="{ row }">
            <b v-if="row.nodeType !== 'detail'">{{ fmtM((row.packingFee||0) + (row.certificateFee||0) + (row.postageFee||0)) }}</b>
            <span v-else>{{ fmtM((row.packingFee||0) + (row.certificateFee||0) + (row.postageFee||0)) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="moldFee" label="版费" width="70" align="right">
          <template #default="{ row }">
            <b v-if="row.nodeType !== 'detail'">{{ fmtM(row.moldFee) }}</b>
            <span v-else>{{ fmtM(row.moldFee) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="laborFee" label="工费" width="70" align="right">
          <template #default="{ row }">
            <b v-if="row.nodeType !== 'detail'">{{ fmtM(row.laborFee) }}</b>
            <span v-else>{{ fmtM(row.laborFee) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="totalAmount" label="应收金额" width="95" align="right">
          <template #default="{ row }">
            <b v-if="row.nodeType !== 'detail'">{{ fmtM(row.totalAmount) }}</b>
            <span v-else>{{ fmtM(row.totalAmount) }}</span>
          </template>
        </el-table-column>

        <!-- ⭐ 已付款 / 未付款（来款为账单级，仅合计行展示） -->
        <el-table-column prop="paidAmount" label="已付款" width="90" align="right" fixed="right">
          <template #default="{ row }">
            <b v-if="row.nodeType === 'total'">{{ fmtMoney(row.paidAmount) }}</b>
          </template>
        </el-table-column>
        <el-table-column prop="unpaidAmount" label="未付款" width="90" align="right" fixed="right">
          <template #default="{ row }">
            <b v-if="row.nodeType === 'total'">{{ fmtMoney(row.unpaidAmount) }}</b>
          </template>
        </el-table-column>
      </el-table>

      <!-- ⭐ 足金料汇总（按成色：成色 → 折足金料克重，末项为合计） -->
      <div class="material-summary" v-if="materialByColor.length">
        <span class="ms-title">足金料汇总（按成色）</span>
        <div class="ms-items">
          <div class="ms-item" v-for="m in materialByColor" :key="m.color">
            <span class="ms-label">{{ m.color }}</span>
            <span class="ms-value">{{ Number(m.weight || 0).toFixed(3) }} g</span>
          </div>
          <div class="ms-item ms-total">
            <span class="ms-label">合计折足金料</span>
            <span class="ms-value">{{ Number(summary.materialTotal || 0).toFixed(3) }} g</span>
          </div>
        </div>
      </div>

      <el-empty v-if="!loading && flatData.length === 0" :description="emptyText" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  ArrowLeft, Refresh, User, Money, Goods, Wallet, Coin, Box, ScaleToOriginal
} from '@element-plus/icons-vue';
import { getBillTree, getBillTreeOptions } from '@/api/bill';

const router = useRouter();

const loading = ref(false);
const dateType = ref('today');
const customRange = ref([]);
const flatData = ref([]);
const tableRef = ref();
const tableMaxHeight = ref(600);

// ===== 筛选（客户单选必填） =====
const filters = reactive({
  customerId: null,
  salesmen: [],
  products: [],
  colors: [],
});
const options = reactive({
  customers: [],
  salesmen: [],
  products: [],
  colors: [],
});

const summary = reactive({
  customerCount: 0,
  totalQuantity: 0,
  totalAmount: 0,
  paidAmount: 0,
  unpaidAmount: 0,
  materialTotal: 0,
  materialReceived: 0,
  materialUnpaid: 0,
  startDate: '',
  endDate: '',
});

// 足金料按成色汇总
const materialByColor = ref([]);

const emptyText = computed(() => (filters.customerId ? '该时间段暂无账单' : '请先选择客户'));

// ===== 格式化 =====
const fmtW = (v) => {
  const n = Number(v || 0);
  return n === 0 ? '' : n.toFixed(3);
};
const fmtM = (v) => {
  const n = Number(v || 0);
  return n === 0 ? '' : n.toFixed(2);
};
const fmtMoney = (v) => {
  const n = Number(v || 0);
  return n === 0 ? '0.00' : n.toFixed(2);
};
const fmtG = (v) => Number(v || 0).toFixed(3);
const fmtDate = (v) => {
  if (!v) return '';
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

// 订单号穿透查看订单详情
const goOrderDetail = (row) => {
  if (!row?.orderId) return;
  router.push(`/order/detail/${row.orderId}`);
};

// ===== 表格样式（参照出货明细弹窗：黄底红字） =====
const headerCellStyle = () => ({
  background: '#D9D9D9',
  color: '#000',
  fontWeight: 'bold',
  fontSize: '12px',
  padding: '4px 6px',
  border: '1px solid #000',
  textAlign: 'center',
});
const cellStyle = ({ row }) => {
  const base = { padding: '3px 6px', fontSize: '12px', border: '1px solid #000' };
  if (row.nodeType === 'subtotal' || row.nodeType === 'total') {
    return { ...base, background: '#FFFF00', color: '#FF0000', fontWeight: 'bold' };
  }
  return base;
};
const rowClassName = ({ row }) => {
  if (row.nodeType === 'subtotal') return 'row-subtotal';
  if (row.nodeType === 'total') return 'row-total';
  return '';
};
// 小计/合计行：合并「品名 + 钻石级别 + 订单日期」三列展示汇总文本（同预览弹窗）
const spanMethod = ({ row, columnIndex }) => {
  if (row.nodeType === 'subtotal' || row.nodeType === 'total') {
    if (columnIndex === 2) return { rowspan: 1, colspan: 3 };
    if (columnIndex === 3 || columnIndex === 4) return { rowspan: 0, colspan: 0 };
  }
  return { rowspan: 1, colspan: 1 };
};

// ===== 后端树 → 拍平列表（明细行 + 销售小计行 + 总计行） =====
const rawTree = ref([]);

const SUM_KEYS = [
  'quantity', 'totalWeight', 'netWeight', 'addLossWeight',
  'goldMaterialFee', 'goldMaterialWeight',
  'mainStoneQty', 'mainStoneWeight', 'mainStoneAmount', 'mainStoneSettingFee',
  'subStoneQty', 'subStoneWeight', 'subStoneAmount', 'subStoneSettingFee',
  'packingFee', 'certificateFee', 'postageFee', 'moldFee', 'laborFee',
  'totalAmount',
];

const buildFlat = () => {
  const list = [];
  const grand = {};
  SUM_KEYS.forEach((k) => { grand[k] = 0; });
  let seqNo = 1;

  (rawTree.value || []).forEach((cust, ci) => {
    (cust.children || []).forEach((sales, si) => {
      // 明细行
      (sales.children || []).forEach((d, di) => {
        list.push({
          nodeKey: `c-${ci}-s-${si}-d-${di}`,
          nodeType: 'detail',
          seqNo: seqNo++,
          ...d,
        });
      });

      // 销售小计行（汇总料 + 金额，同预览弹窗）
      const subRow = {
        nodeKey: `c-${ci}-s-${si}-sub`,
        nodeType: 'subtotal',
        salesName: sales.salesman || '未指定',
      };
      SUM_KEYS.forEach((k) => {
        subRow[k] = Number(sales[k] || 0);
        grand[k] += Number(sales[k] || 0);
      });
      list.push(subRow);
    });
  });

  // 合计行（已付款/未付款来自客户层，来款为账单级）
  const paidAmount = (rawTree.value || []).reduce((s, c) => s + Number(c.paidAmount || 0), 0);
  const unpaidAmount = (rawTree.value || []).reduce((s, c) => s + Number(c.unpaidAmount || 0), 0);
  list.push({
    nodeKey: 'total',
    nodeType: 'total',
    ...grand,
    paidAmount,
    unpaidAmount,
  });

  flatData.value = list;
};

// ===== 加载筛选项 =====
const buildOptionsParams = () => {
  const params = { dateType: dateType.value };
  if (dateType.value === 'custom' && customRange.value?.length === 2) {
    params.startDate = customRange.value[0];
    params.endDate = customRange.value[1];
  }
  return params;
};

const loadOptions = async (autoLoad = false) => {
  try {
    const res = await getBillTreeOptions(buildOptionsParams());
    const data = res?.data || {};
    options.customers = data.customers || [];
    options.salesmen = data.salesmen || [];
    options.products = data.products || [];
    options.colors = data.colors || [];
    // 默认第一个客户（客户列表不受日期范围影响，始终有值）
    if (!filters.customerId && options.customers.length > 0) {
      filters.customerId = options.customers[0].customerId;
    }
  } catch (e) {
    options.customers = [];
    options.salesmen = [];
    options.products = [];
    options.colors = [];
  }
  if (autoLoad) loadData();
};

const resetFilters = () => {
  filters.salesmen = [];
  filters.products = [];
  filters.colors = [];
  // 客户重置回第一个
  filters.customerId = options.customers.length > 0 ? options.customers[0].customerId : null;
  loadData();
};

const onDateTypeChange = () => {
  if (dateType.value !== 'custom') {
    loadOptions(true);
  }
};

const loadData = async () => {
  if (dateType.value === 'custom') {
    if (!customRange.value || customRange.value.length !== 2) {
      ElMessage.warning('请选择日期范围');
      return;
    }
  }
  if (!filters.customerId) {
    flatData.value = [];
    materialByColor.value = [];
    Object.assign(summary, { customerCount: 0, totalQuantity: 0, totalAmount: 0, paidAmount: 0, unpaidAmount: 0, materialTotal: 0, materialReceived: 0, materialUnpaid: 0 });
    return;
  }

  loading.value = true;
  try {
    const params = { dateType: dateType.value };
    if (dateType.value === 'custom') {
      params.startDate = customRange.value[0];
      params.endDate = customRange.value[1];
    }
    params.customerId = String(filters.customerId);
    if (filters.salesmen.length) params.salesman = filters.salesmen.join(',');
    if (filters.products.length) params.productName = filters.products.join(',');
    if (filters.colors.length) params.color = filters.colors.join(',');

    const res = await getBillTree(params);
    if (res?.success) {
      const payload = res.data || {};
      rawTree.value = payload.tree || [];
      buildFlat();
      const custSum = rawTree.value.reduce(
        (acc, c) => {
          acc.paid += c.paidAmount || 0;
          acc.unpaid += c.unpaidAmount || 0;
          return acc;
        },
        { paid: 0, unpaid: 0 }
      );
      materialByColor.value = payload.materialByColor || [];
      Object.assign(summary, {
        customerCount: payload.summary?.customerCount ?? 0,
        totalQuantity: payload.summary?.quantity ?? 0,
        totalAmount: payload.summary?.totalAmount ?? 0,
        paidAmount: custSum.paid,
        unpaidAmount: custSum.unpaid,
        materialTotal: payload.materialTotal ?? 0,
        materialReceived: payload.materialReceived ?? 0,
        materialUnpaid: payload.materialUnpaid ?? 0,
        startDate: payload.startDate || '',
        endDate: payload.endDate || '',
      });
    }
  } catch (e) {
    ElMessage.error(e?.message || '加载失败');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadOptions();
  loadData();
});
</script>

<style scoped>
.page-container {
  background: #f0f4f9;
  padding: 16px;
  min-height: 100vh;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 12px 12px 0 0;
  flex-wrap: wrap;
  gap: 12px;
}
.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.page-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

/* ===== 筛选栏 ===== */
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: #fff;
  padding: 12px 24px;
  border-bottom: 1px solid #e8ecf1;
}
.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.filter-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 16px;
  background: #fff;
  padding: 16px 24px;
  border-bottom: 1px solid #e8ecf1;
}
.overview-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #f8faff;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid #e8f0fe;
}
.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.card-label { font-size: 13px; color: #8a9aaa; }
.card-value { font-size: 20px; font-weight: 600; color: #1d2129; }

.tree-wrapper {
  background: #fff;
  border-radius: 0 0 12px 12px;
  padding: 16px 24px 24px;
}

/* ===== 足金料汇总（按成色） ===== */
.material-summary {
  margin-top: 16px;
  border: 1px solid #000;
  font-family: 'SimSun', '宋体', serif;
  font-size: 12px;
}
.ms-title {
  display: block;
  background: #D9D9D9;
  border-bottom: 1px solid #000;
  padding: 6px 10px;
  font-weight: bold;
  color: #000;
}
.ms-items {
  display: flex;
  flex-wrap: wrap;
}
.ms-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-right: 1px solid #000;
  min-width: 140px;
}
.ms-item:last-child {
  border-right: none;
}
.ms-label {
  color: #000;
}
.ms-value {
  font-weight: bold;
  color: #1a1a1a;
}
.ms-total {
  background: #FFFF00;
}
.ms-total .ms-label,
.ms-total .ms-value {
  color: #FF0000;
  font-weight: bold;
}

/* ===== 表格样式（参照出货明细弹窗） ===== */
.bill-table {
  font-family: 'SimSun', '宋体', serif;
}
:deep(.bill-table .el-table__header th),
:deep(.bill-table .el-table__header-wrapper th) {
  background: #D9D9D9 !important;
  color: #000 !important;
  font-weight: bold !important;
}
:deep(.bill-table td.el-table__cell) {
  border: 1px solid #000 !important;
}
/* 销售小计行 / 合计行：黄底红字（同预览弹窗） */
:deep(.bill-table .row-subtotal td.el-table__cell),
:deep(.bill-table .row-total td.el-table__cell) {
  background: #FFFF00 !important;
  color: #FF0000 !important;
  font-weight: bold !important;
}
.subtotal-text {
  font-weight: bold;
}
.order-no {
  font-family: monospace;
  font-size: 12px;
  color: #409EFF;
  cursor: pointer;
}
.order-no:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .overview-cards { grid-template-columns: 1fr 1fr; }
}
</style>
