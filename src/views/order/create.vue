<!-- src/views/order/create.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>{{ pageTitle }}</h2>
        <el-tag v-if="isEdit" type="warning" size="large">编辑中</el-tag>
        <el-tag v-if="isCopy" type="info" size="large">📋 复刻订单</el-tag>
        <el-tag v-if="orderStatus" :type="getStatusType(orderStatus)" size="large">
          {{ getStatusText(orderStatus) }}
        </el-tag>
      </div>
      <div class="header-right">
        <!-- ⭐ 从历史订单带入 -->
        <el-button @click="openHistoryDialog" :disabled="isEdit">
          <el-icon><Clock /></el-icon> 从历史订单带入
        </el-button>

        <el-button @click="handleSave" :loading="saving">
          <el-icon><Document /></el-icon> 保存
        </el-button>
        <el-button
          v-if="userStore.userType === 'customer' && showSubmitButton"
          type="primary"
          @click="handleSubmit"
          :loading="submitting"
        >
          <el-icon><Check /></el-icon> 提交审核
        </el-button>
        <el-button
          v-if="userStore.userType === 'customerAudit' && showSubmitToFactory"
          type="success"
          @click="handleSubmitToFactory"
          :loading="submitting"
        >
          <el-icon><Check /></el-icon> 提交到工厂
        </el-button>
      </div>
    </div>

    <div class="form-wrapper">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" size="default">
        <!-- 第一行：订单日期 + 业务员 -->
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="订单日期" prop="orderDate">
              <el-date-picker v-model="form.orderDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="业务员" prop="salesman">
              <el-input v-model="form.salesman" placeholder="请输入业务员" clearable style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第二行：品名 -->
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="品名" prop="productName">
              <div class="product-input-wrapper">
                <el-autocomplete
                  v-model="form.productName"
                  :fetch-suggestions="querySearch"
                  placeholder="输入品名搜索，不存在则自动新增"
                  style="flex:1;"
                  clearable
                  @select="handleSelectProduct"
                  @focus="handleFocus"
                >
                  <template #default="{ item }">
                    <div class="product-suggestion">
                      <div class="suggestion-name">{{ item.productName }}</div>
                      <div class="suggestion-info">
                        手寸: {{ item.size || '-' }} ｜ 成色: {{ item.color || '-' }}
                        <span v-if="item.lastOrderDate" class="suggestion-date">最近: {{ formatDate(item.lastOrderDate) }}</span>
                      </div>
                    </div>
                  </template>
                </el-autocomplete>
                <el-button type="primary" @click="openProductDialog">
                  <el-icon><Search /></el-icon> 浏览
                </el-button>
              </div>
              <div v-if="isNewProduct" class="new-product-tip">
                <el-tag type="success" size="small">✨ 将自动创建新产品</el-tag>
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第三行：规格参数 -->
        <el-row :gutter="20">
          <el-col :xs="24" :sm="8">
            <el-form-item label="手寸/长度">
              <el-input v-model="form.size" placeholder="如 17# 或 45cm" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="宽/厚度">
              <el-input v-model="form.widthThick" placeholder="如 2.5mm" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="数量" prop="quantity">
              <el-input-number v-model="form.quantity" :min="1" style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第四行：材质（成色 / 金价 / 钻石级别 / 颜色） -->
        <el-row :gutter="20">
          <el-col :xs="24" :sm="6">
            <el-form-item label="成色" prop="purityId">
              <el-select v-model="form.purityId" placeholder="请选择成色" style="width:100%;" filterable :disabled="isAuditRestricted" @change="onPurityChange">
                <el-option
                  v-for="item in purityOptions"
                  :key="item.id"
                  :label="item.label"
                  :value="item.id"
                >
                  <span class="purity-option">
                    <span class="color-dot" :style="{ background: item.color }"></span>
                    <span>{{ item.label }}</span>
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="金价(元/克)">
              <el-input-number v-model="form.goldPrice" :precision="2" :min="0" placeholder="金价" style="width:100%;" :disabled="isAuditRestricted" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="钻石级别">
              <el-select v-model="form.diamondLevel" placeholder="请选择" style="width:100%;" clearable filterable allow-create :disabled="isAuditRestricted">
                <el-option v-for="item in diamondLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="颜色">
              <el-input v-model="form.gemColor" placeholder="如 红色 / 蓝色" :disabled="isAuditRestricted" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第五行：克重要求 + 工期 + LOGO -->
        <el-row :gutter="20">
          <el-col :xs="24" :sm="6">
            <el-form-item label="克重要求">
              <el-input v-model="form.weightRequirement" placeholder="如 2.5-3.0g" :disabled="isAuditRestricted" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="工期(天)" prop="deliveryDays">
              <el-input-number v-model="form.deliveryDays" :min="1" style="width:100%;" :disabled="isAuditRestricted" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="6">
            <el-form-item label="LOGO">
              <el-input v-model="form.logoText" placeholder="LOGO文字" :disabled="isAuditRestricted" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第六行：网址 -->
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="网址">
              <el-input v-model="form.url" placeholder="产品链接" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第七行：备注 -->
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="备注信息" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ⭐ 第八行：预警 + 加急 -->
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="标记预警">
              <div class="warning-control">
                <el-switch v-model="form.warnFlag" active-text="预警" inactive-text="正常" active-color="#f56c6c" inline-prompt :disabled="isAuditRestricted" />
                <el-input v-if="form.warnFlag" v-model="form.alertReason" placeholder="请输入预警说明" clearable style="max-width:520px;" />
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="标记加急">
              <el-switch v-model="form.urgentFlag" active-text="加急" inactive-text="正常" active-color="#e6a23c" inline-prompt :disabled="isAuditRestricted" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ⭐ 图片区域 -->
        <div class="image-section">
          <div class="image-section-title">📷 图片附件</div>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="8">
              <div class="upload-card">
                <div class="upload-card-label">产品图片</div>
                <MultiImageUpload v-model="productImages" :max-count="10" type="product" />
              </div>
            </el-col>
            <el-col :xs="24" :sm="8">
              <div class="upload-card">
                <div class="upload-card-label">数据图</div>
                <MultiImageUpload v-model="dataImages" :max-count="10" type="data" />
              </div>
            </el-col>
            <el-col :xs="24" :sm="8">
              <div class="upload-card">
                <div class="upload-card-label">字印要求图</div>
                <MultiImageUpload v-model="letterImages" :max-count="10" type="letter" />
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- ⭐ 数据包（3D模型文件） -->
        <div class="file-section">
          <div class="image-section-title">📦 数据包（3D模型 / 订单数据包）</div>
          <MultiFileUpload v-model="dataPackages" :max-count="10" :max-size-m-b="200" />
        </div>
      </el-form>
    </div>

    <!-- ⭐ 历史订单弹窗 -->
    <el-dialog v-model="historyDialogVisible" title="📋 从历史订单带入" width="900px" destroy-on-close>
      <div class="dialog-search">
        <el-input
          v-model="historySearch.keyword"
          placeholder="订单号 / 品名"
          clearable
          prefix-icon="Search"
          style="width:220px;"
          @keyup.enter="loadHistoryList"
        />
        <el-date-picker
          v-model="historySearch.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width:240px;"
        />
        <el-button type="primary" @click="loadHistoryList">查询</el-button>
        <el-button @click="resetHistorySearch">重置</el-button>
      </div>

      <el-table
        :data="historyList"
        border
        stripe
        v-loading="historyLoading"
        max-height="420"
        highlight-current-row
        @row-dblclick="selectHistoryOrder"
      >
        <el-table-column prop="orderNo" label="订单号" width="150" />
        <el-table-column prop="orderDate" label="订单日期" width="110">
          <template #default="{ row }">{{ formatDate(row.orderDate) }}</template>
        </el-table-column>
        <el-table-column prop="productName" label="品名" min-width="140" />
        <el-table-column prop="size" label="手寸" width="90" />
        <el-table-column prop="widthThick" label="宽/厚度" width="100" />
        <el-table-column prop="color" label="成色" width="90" />
        <el-table-column prop="quantity" label="数量" width="70" align="center" />
        <el-table-column prop="flowStatus" label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.flowStatus)" size="small">
              {{ getStatusText(row.flowStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="selectHistoryOrder(row)">
              选择
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!historyLoading && historyList.length === 0" description="暂无历史订单" />

      <div class="dialog-pagination">
        <el-pagination
          v-model:current-page="historyPage.current"
          v-model:page-size="historyPage.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="historyTotal"
          layout="total, sizes, prev, pager, next"
          @size-change="loadHistoryList"
          @current-change="loadHistoryList"
          small
        />
      </div>

      <template #footer>
        <el-button @click="historyDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 产品库弹窗 -->
    <el-dialog v-model="productDialogVisible" title="📦 产品库" width="800px" destroy-on-close>
      <div class="dialog-search">
        <el-input v-model="productSearchKeyword" placeholder="搜索品名/规格" clearable prefix-icon="Search" style="width:280px;" @input="loadProductList" />
        <el-button type="primary" @click="loadProductList">搜索</el-button>
        <span style="margin-left:12px;color:#999;font-size:13px;">共 {{ productTotal }} 个产品</span>
      </div>
      <el-table :data="productList" border stripe v-loading="productLoading" max-height="400" @row-dblclick="selectProductFromDialog" highlight-current-row>
        <el-table-column prop="productName" label="品名" min-width="140" />
        <el-table-column prop="size" label="手寸" width="100" />
        <el-table-column prop="widthThick" label="宽/厚度" width="100" />
        <el-table-column prop="color" label="成色" width="100" />
        <el-table-column prop="diamondLevel" label="钻石级别" width="100" />
        <el-table-column prop="weightRequirement" label="克重要求" width="110" />
        <el-table-column prop="lastOrderDate" label="最近下单" width="110">
          <template #default="{ row }">{{ formatDate(row.lastOrderDate) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="selectProductFromDialog(row)">选择</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!productLoading && productList.length === 0" description="暂无产品" />
      <div class="dialog-pagination">
        <el-pagination
          v-model:current-page="productPage.current"
          v-model:page-size="productPage.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="productTotal"
          layout="total, sizes, prev, pager, next"
          @size-change="loadProductList"
          @current-change="loadProductList"
          small
        />
      </div>
      <template #footer>
        <el-button @click="productDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Document, Check, Search, Clock } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { createOrder, updateOrder, getOrderDetail, submitOrder, auditOrder, acceptOrder, getOrderList } from '@/api/order';
import { createManualAlert } from '@/api/alert';
import { searchProducts, getProductList, createProduct } from '@/api/product';
import { dictApi } from '@/api/dict';
import MultiImageUpload from '@/components/MultiImageUpload.vue';
import MultiFileUpload from '@/components/MultiFileUpload.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

// ===== 状态 =====
const loading = ref(false);
const saving = ref(false);
const submitting = ref(false);
const formRef = ref();
const isEdit = ref(false);
const isCopy = ref(false);
const orderStatus = ref('');
const purityOptions = ref([]);
const diamondLevelOptions = ref([]);

// ===== 图片 =====
const productImages = ref([]);
const dataImages = ref([]);
const letterImages = ref([]);
const dataPackages = ref([]);

// ===== 产品相关 =====
const isNewProduct = ref(false);
const productList = ref([]);
const productTotal = ref(0);
const productLoading = ref(false);
const productDialogVisible = ref(false);
const productSearchKeyword = ref('');
const productPage = reactive({ current: 1, pageSize: 10 });

// ===== ⭐ 历史订单 =====
const historyDialogVisible = ref(false);
const historyList = ref([]);
const historyTotal = ref(0);
const historyLoading = ref(false);
const historySearch = reactive({
  keyword: '',
  dateRange: [],
});
const historyPage = reactive({ current: 1, pageSize: 10 });

// ===== 表单 =====
const form = reactive({
  orderDate: new Date().toISOString().split('T')[0],
  customerId: userStore.customerId || null,
  salesman: userStore.realName || userStore.username || '',
  productName: '',
  quantity: 1,
  deliveryDays: 7,
  color: '',
  purityId: null,
  goldPrice: 0,
  size: '',
  widthThick: '',
  diamondLevel: '',
  weightRequirement: '',
  logoText: '',
  url: '',
  remark: '',
  warnFlag: false,
  alertReason: '',
  gemColor: '',
  urgentFlag: false,
});

const rules = {
  orderDate: [{ required: true, message: '请选择订单日期' }],
  salesman: [{ required: true, message: '请输入业务员' }],
  productName: [{ required: true, message: '请输入品名' }],
  quantity: [{ required: true, message: '请输入数量' }],
  purityId: [{ required: true, message: '请选择成色' }],
  deliveryDays: [{ required: true, message: '请输入工期' }],
};

const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待客户审核', type: 'warning' },
  customerAudited: { text: '客户已审核', type: 'success' },
  customeraudited: { text: '待工厂接单', type: 'success' },
  factory_edit: { text: '工厂编辑中', type: 'primary' },
  accepted: { text: '已接单', type: 'primary' },
  polishing: { text: '制作完成', type: 'primary' },
  billPending: { text: '账单待审核', type: 'warning' },
  billConfirmed: { text: '客户已确认', type: 'success' },
  completed: { text: '已完成', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' },
};
const getStatusText = (s) => statusMap[s]?.text || s || '-';
const getStatusType = (s) => statusMap[s]?.type || 'info';

const pageTitle = computed(() => {
  if (isEdit.value && userStore.userType === 'customerAudit') return '✏️ 编辑待审核订单';
  if (isEdit.value) return '✏️ 编辑订单';
  return '📝 下单';
});

const showSubmitButton = computed(() => {
  if (!isEdit.value) return true;
  return orderStatus.value === 'draft' || orderStatus.value === 'rejected';
});

const showSubmitToFactory = computed(() => {
  return isEdit.value && orderStatus.value === 'pending';
});

// ⭐ 客户审核员编辑限制：仅可改 备注/网址/图片，重要字段禁用
const isAuditRestricted = computed(() => isEdit.value && userStore.userType === 'customerAudit');

// ============================================================
// 成色
// ============================================================
const onPurityChange = (purityId) => {
  const item = purityOptions.value.find(x => x.id === purityId);
  if (item) {
    form.color = item.label;
  }
};

// ============================================================
// 产品搜索
// ============================================================
const querySearch = async (queryString, cb) => {
  if (!queryString || queryString.length < 1) {
    isNewProduct.value = false;
    return cb([]);
  }
  try {
    const res = await searchProducts({ keyword: queryString, limit: 10 });
    const results = res?.data || [];
    const exists = results.some(item => item.productName === queryString.trim());
    isNewProduct.value = !exists && queryString.trim().length > 0;
    cb(results.map(item => ({ ...item, value: item.productName })));
  } catch {
    isNewProduct.value = true;
    cb([]);
  }
};

const handleSelectProduct = (item) => {
  if (item && item.productId) {
    fillFormFromProduct(item);
    isNewProduct.value = false;
    ElMessage.success(`已加载产品「${item.productName}」`);
  }
};

const handleFocus = () => {
  if (form.productName && form.productName.length >= 1) {
    querySearch(form.productName, () => {});
  }
};

const openProductDialog = () => {
  productDialogVisible.value = true;
  productSearchKeyword.value = form.productName || '';
  loadProductList();
};

const loadProductList = async () => {
  productLoading.value = true;
  try {
    const res = await getProductList({
      keyword: productSearchKeyword.value || undefined,
      page: productPage.current,
      pageSize: productPage.pageSize,
    });
    const data = res?.data || {};
    productList.value = data.items || data.list || data || [];
    productTotal.value = data.total || productList.value.length;
  } catch {
    productList.value = [];
    productTotal.value = 0;
  } finally {
    productLoading.value = false;
  }
};

const selectProductFromDialog = (row) => {
  fillFormFromProduct(row);
  productDialogVisible.value = false;
  isNewProduct.value = false;
  ElMessage.success(`已选择产品「${row.productName}」`);
};

const fillFormFromProduct = (product) => {
  form.productName = product.productName;
  form.size = product.size || '';
  form.widthThick = product.widthThick || '';
  if (product.purityId) {
    form.purityId = product.purityId;
    const item = purityOptions.value.find(x => x.id === product.purityId);
    if (item) form.color = item.label;
  } else if (product.color) {
    const item = purityOptions.value.find(x => x.label === product.color);
    if (item) {
      form.purityId = item.id;
      form.color = item.label;
    }
  }
  form.goldPrice = product.goldPrice || 0;
  form.diamondLevel = product.diamondLevel || '';
  form.weightRequirement = product.weightRequirement || '';
  form.logoText = product.logoText || '';
  form.deliveryDays = product.deliveryDays || 7;
};

// ============================================================
// ⭐ 从历史订单带入
// ============================================================
const openHistoryDialog = () => {
  historyDialogVisible.value = true;
  // 默认近 30 天
  const today = new Date();
  const ago30 = new Date();
  ago30.setDate(today.getDate() - 30);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (!historySearch.dateRange || historySearch.dateRange.length !== 2) {
    historySearch.dateRange = [fmt(ago30), fmt(today)];
  }
  historyPage.current = 1;
  loadHistoryList();
};

const resetHistorySearch = () => {
  historySearch.keyword = '';
  const today = new Date();
  const ago30 = new Date();
  ago30.setDate(today.getDate() - 30);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  historySearch.dateRange = [fmt(ago30), fmt(today)];
  historyPage.current = 1;
  loadHistoryList();
};

const loadHistoryList = async () => {
  historyLoading.value = true;
  try {
    const params = {
      keyword: historySearch.keyword || undefined,
      page: historyPage.current,
      pageSize: historyPage.pageSize,
    };
    if (historySearch.dateRange && historySearch.dateRange.length === 2) {
      params.startDate = historySearch.dateRange[0];
      params.endDate = historySearch.dateRange[1];
    }

    const res = await getOrderList(params);

    // 兼容多种返回结构
    let data = res?.data || res || {};
    let list = [];
    let total = 0;
    if (Array.isArray(data)) {
      list = data; total = data.length;
    } else if (data.items && Array.isArray(data.items)) {
      list = data.items; total = data.total || data.items.length;
    } else if (data.list && Array.isArray(data.list)) {
      list = data.list; total = data.total || data.list.length;
    } else if (data.data && Array.isArray(data.data)) {
      list = data.data; total = data.total || data.data.length;
    }

    // 前端过滤掉无意义的订单
    const excludeStatus = ['draft', 'cancelled', 'rejected'];
    historyList.value = list.filter(x => !excludeStatus.includes(x.flowStatus));
    historyTotal.value = total;
  } catch (e) {
    ElMessage.error(e.message || '加载历史订单失败');
    historyList.value = [];
    historyTotal.value = 0;
  } finally {
    historyLoading.value = false;
  }
};

const selectHistoryOrder = async (row) => {
  try {
    const res = await getOrderDetail(row.orderId);
    const data = res?.data;
    if (!data) {
      ElMessage.error('加载订单详情失败');
      return;
    }
    fillFromOrderData(data, true);
    isCopy.value = true;
    isEdit.value = false;
    orderStatus.value = '';
    historyDialogVisible.value = false;
    ElMessage.success(`已带入订单「${row.orderNo}」的数据`);
  } catch (e) {
    ElMessage.error(e.message || '带入失败');
  }
};

// ============================================================
// 加载订单
// ============================================================
const loadOrderData = async () => {
  const id = route.params.id;
  const copyId = route.query.copy;

  if (copyId) {
    isCopy.value = true;
    loading.value = true;
    try {
      const res = await getOrderDetail(copyId);
      fillFromOrderData(res?.data, true);
      ElMessage.success('已复刻订单数据');
    } catch {
      ElMessage.error('加载原订单失败');
    } finally {
      loading.value = false;
    }
    return;
  }

  if (!id) return;
  isEdit.value = true;
  loading.value = true;
  try {
    const res = await getOrderDetail(id);
    fillFromOrderData(res?.data, false);
  } catch {
    ElMessage.error('加载订单失败');
  } finally {
    loading.value = false;
  }
};

const fillFromOrderData = (data, isCopyMode) => {
  if (!data) return;

  form.orderDate = isCopyMode ? new Date().toISOString().split('T')[0] : (data.orderDate?.split('T')[0] || '');
  form.productName = data.productName || '';
  form.salesman = data.salesman || '';
  form.warnFlag = Boolean(data.warnFlag);
  form.alertReason = data.alertReason || '';
  form.quantity = data.quantity || 1;
  form.deliveryDays = data.deliveryDays || 7;
  form.color = data.color || '';
  form.purityId = data.purityId || null;
  form.goldPrice = data.goldPrice || 0;
  form.size = data.size || '';
  form.widthThick = data.widthThick || '';
  form.diamondLevel = data.diamondLevel || '';
  form.weightRequirement = data.weightRequirement || '';
  form.logoText = data.logoText || '';
  form.url = data.url || '';
  form.remark = data.remark || '';
  form.gemColor = data.gemColor || '';
  form.urgentFlag = data.urgentFlag || false;

  orderStatus.value = data.flowStatus || '';

  // 图片按类型拆分
  const imgs = data.images || [];
  productImages.value = imgs.filter(x => x.imageType === 'product');
  dataImages.value = imgs.filter(x => x.imageType === 'data');
  letterImages.value = imgs.filter(x => x.imageType === 'letter');

  // 数据包
  dataPackages.value = (data.dataPackages || []).map(x => ({ ...x }));
};

// ============================================================
// 自动保存新产品
// ============================================================
const saveProductIfNew = async () => {
  if (!isNewProduct.value || !form.productName.trim()) return null;
  try {
    const productData = {
      productName: form.productName.trim(),
      size: form.size,
      widthThick: form.widthThick,
      color: form.color,
      purityId: form.purityId,
      goldPrice: form.goldPrice,
      diamondLevel: form.diamondLevel,
      weightRequirement: form.weightRequirement,
      logoText: form.logoText,
    };
    const res = await createProduct(productData);
    if (res?.success !== false) {
      ElMessage.success(`已自动创建新产品「${form.productName}」`);
      isNewProduct.value = false;
      return res?.data || { productId: res?.productId };
    }
    return null;
  } catch (error) {
    console.warn('创建产品失败:', error);
    return null;
  }
};

// ============================================================
// payload
// ============================================================
const buildPayload = (status) => {
  return {
    orderDate: form.orderDate,
    customerId: userStore.customerId,
    customerName: userStore.customerName || '客户',
    salesman: form.salesman.trim(),
    productName: form.productName.trim(),
    quantity: form.quantity,
    deliveryDays: form.deliveryDays,
    color: form.color,
    purityId: form.purityId,
    goldPrice: form.goldPrice,
    size: form.size,
    widthThick: form.widthThick,
    diamondLevel: form.diamondLevel,
    weightRequirement: form.weightRequirement,
    logoText: form.logoText,
    url: form.url,
    remark: form.remark,
    gemColor: form.gemColor,
    urgentFlag: form.urgentFlag,
    flowStatus: status,
    sourceOrderId: route.query.copy || null,
    warnFlag: form.warnFlag,
    // 图片列表
    productImages: productImages.value,
    dataImages: dataImages.value,
    letterImages: letterImages.value,
    // ⭐ 数据包
    dataPackages: dataPackages.value,
  };
};

const saveWarning = async (orderId) => {
  if (!form.warnFlag || !form.alertReason.trim() || !orderId) return;
  await createManualAlert({
    orderId,
    reason: form.alertReason.trim(),
    remark: '订单创建页标记预警',
  });
};

// ============================================================
// 保存
// ============================================================
const handleSave = async () => {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    await saveProductIfNew();
    const payload = buildPayload('draft');
    if (isEdit.value) {
      await updateOrder({ ...payload, orderId: parseInt(route.params.id) });
      await saveWarning(parseInt(route.params.id));
      ElMessage.success('保存成功');
    } else {
      const res = await createOrder(payload);
      await saveWarning(res.data?.orderId || res.orderId);
      ElMessage.success('保存成功');
      const targetPath = userStore.userType === 'customer' ? '/order/my-list' : '/order/audit';
      router.push(targetPath);
    }
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

// ============================================================
// 提交审核
// ============================================================
const handleSubmit = async () => {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  try {
    await ElMessageBox.confirm('确认提交审核吗？提交后不可再修改。', '提示', { type: 'info' });
  } catch { return; }

  submitting.value = true;
  try {
    await saveProductIfNew();
    let orderId = null;

    if (isEdit.value) {
      const payload = buildPayload('draft');
      await updateOrder({ ...payload, orderId: parseInt(route.params.id) });
      orderId = parseInt(route.params.id);
    } else {
      const payload = buildPayload('draft');
      const res = await createOrder(payload);
      orderId = res.data?.orderId || res.orderId;
    }

    if (!orderId) {
      ElMessage.error('订单ID获取失败');
      return;
    }

    await saveWarning(orderId);
    await submitOrder(orderId);
    ElMessage.success('提交审核成功');
    router.push('/order/my-list');
  } catch (error) {
    ElMessage.error(error.message || '提交失败');
  } finally {
    submitting.value = false;
  }
};

// ============================================================
// 提交到工厂
// ============================================================
const handleSubmitToFactory = async () => {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  try {
    await ElMessageBox.confirm('确认审核通过并提交到工厂吗？', '提交到工厂', { type: 'info' });
  } catch { return; }

  submitting.value = true;
  try {
    await saveProductIfNew();
    const payload = buildPayload('customerAudited');
    await updateOrder({ ...payload, orderId: parseInt(route.params.id) });
    await saveWarning(parseInt(route.params.id));
    await auditOrder(parseInt(route.params.id), { approved: true, remark: '审核通过，提交到工厂' });
    ElMessage.success('审核通过，已提交到工厂');
    router.push('/order/audit');
  } catch (error) {
    ElMessage.error(error.message || '提交失败');
  } finally {
    submitting.value = false;
  }
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ============================================================
// 初始化
// ============================================================
onMounted(() => {
  if (!userStore.customerId) {
    ElMessage.warning('当前用户未关联客户，无法下单');
  }
  Promise.all([
    dictApi.getItemsByKey('purity'),
    dictApi.getItemsByKey('diamondlevel'),
    loadOrderData(),
  ]).then(([purityRes, diamondLevelRes]) => {
    purityOptions.value = (purityRes?.data || []).map(item => {
      let color = '#DCDFE6';
      let convertRate = 1;
      try {
        const extra = item.extraData ? JSON.parse(item.extraData) : {};
        color = extra.color || '#DCDFE6';
        convertRate = extra.convertRate || Number(item.itemValue) || 1;
      } catch {}
      return {
        id: item.id,
        key: item.itemKey,
        value: item.itemValue,
        label: item.itemLabel,
        color,
        convertRate
      };
    });
    diamondLevelOptions.value = (diamondLevelRes?.data || []).map(item => ({
      label: item.itemLabel || item.itemValue,
      value: item.itemValue,
    }));
  }).catch(() => {
    ElMessage.error('加载字典失败');
  });
});
</script>

<style scoped>
.page-container { background: #fff; border-radius: 12px; padding: 24px; min-height: 100%; }
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
  padding-bottom: 16px; border-bottom: 1px solid #e8ecf1;
}
.header-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.header-left h2 { font-size: 20px; font-weight: 600; margin: 0; color: #1d2129; }
.header-right { display: flex; gap: 10px; flex-wrap: wrap; }

.form-wrapper { max-width: 1100px; margin: 0 auto; }
.form-wrapper :deep(.el-form-item) { margin-bottom: 18px; }
.form-wrapper :deep(.el-form-item__label) { font-weight: 500; color: #4e5969; }

.product-input-wrapper { display: flex; align-items: center; gap: 8px; width: 100%; }
.product-input-wrapper :deep(.el-autocomplete) { flex: 1; }
.product-input-wrapper :deep(.el-button) { flex-shrink: 0; height: 32px; padding: 0 16px; }

.product-suggestion { display: flex; flex-direction: column; padding: 4px 0; }
.suggestion-name { font-size: 14px; font-weight: 500; color: #1d2129; }
.suggestion-info { font-size: 12px; color: #86909c; margin-top: 2px; }
.suggestion-date { margin-left: 12px; color: #4e5969; }

.new-product-tip { margin-top: 6px; }

.warning-control { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.warning-control :deep(.el-switch.is-checked .el-switch__core) { background-color: #f56c6c; border-color: #f56c6c; }

.image-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e8ecf1; }
.image-section-title { font-weight: 600; color: #1d2129; font-size: 15px; margin-bottom: 16px; }

/* ⭐ 数据包区域 */
.file-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e8ecf1; }

.upload-card { background: #f7f8fa; border-radius: 8px; padding: 16px; min-height: 140px; }
.upload-card:hover { background: #f0f1f3; }
.upload-card-label { font-size: 13px; font-weight: 500; color: #4e5969; margin-bottom: 10px; text-align: center; }
.upload-card-label.small { font-size: 12px; color: #86909c; margin-top: 8px; }
.small-upload-divider { height: 1px; background: #e8ecf1; margin: 12px 0 8px; }

/* 成色下拉样式 */
.purity-option { display: flex; align-items: center; gap: 8px; }
.color-dot {
  display: inline-block; width: 12px; height: 12px;
  border-radius: 50%; border: 1px solid #dcdfe6; flex-shrink: 0;
}

/* 弹窗 */
.dialog-search { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.dialog-pagination { margin-top: 16px; display: flex; justify-content: flex-end; }

@media (max-width: 768px) {
  .page-container { padding: 12px; }
  .page-header { flex-direction: column; align-items: stretch; }
  .header-left { flex-wrap: wrap; }
  .header-right { justify-content: flex-end; }
  .product-input-wrapper { flex-wrap: wrap; }
  .upload-card { min-height: 100px; margin-bottom: 12px; }
}
</style>