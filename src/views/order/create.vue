<!-- src/views/order/create.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
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
        <!-- ⭐ 保存按钮（所有人都显示） -->
        <el-button @click="handleSave" :loading="saving">
          <el-icon><Document /></el-icon> 保存
        </el-button>

        <!-- ⭐ 提交审核：只有客户下单员（customer）显示 -->
        <el-button
          v-if="userStore.userType === 'customer' && showSubmitButton"
          type="primary"
          @click="handleSubmit"
          :loading="submitting"
        >
          <el-icon><Check /></el-icon> 提交审核
        </el-button>

        <!-- ⭐ 提交到工厂：只有客户审核员（customerAudit）编辑待审核订单时显示 -->
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
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" label-position="right" size="default">
        
        <!-- ===== 第一行：订单日期 + 业务员 ===== -->
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="订单日期" prop="orderDate">
              <el-date-picker
                v-model="form.orderDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                style="width:100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="业务员">
              <el-input
                :value="userStore.realName || userStore.username || '当前用户'"
                disabled
                style="width:100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ===== 第二行：品名（带搜索和新增） ===== -->
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
                        <span v-if="item.lastOrderDate" class="suggestion-date">
                          最近: {{ formatDate(item.lastOrderDate) }}
                        </span>
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

        <!-- ===== 第三行：规格参数 ===== -->
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

        <!-- ===== 第四行：材质相关 ===== -->
        <el-row :gutter="20">
          <el-col :xs="24" :sm="8">
            <el-form-item label="成色" prop="color">
              <el-select v-model="form.color" placeholder="请选择成色" style="width:100%;">
                <el-option label="K黄" value="K黄" />
                <el-option label="K白" value="K白" />
                <el-option label="红" value="红" />
                <el-option label="P1" value="P1" />
                <el-option label="9K" value="9K" />
                <el-option label="14K" value="14K" />
                <el-option label="银" value="银" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="金价(元/克)">
              <el-input-number v-model="form.goldPrice" :precision="2" :min="0" placeholder="金价" style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="钻石级别">
              <el-select v-model="form.diamondLevel" placeholder="请选择" style="width:100%;" clearable>
                <el-option label="VS" value="VS" />
                <el-option label="VVS" value="VVS" />
                <el-option label="培育钻" value="培育钻" />
                <el-option label="塔育钻" value="塔育钻" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ===== 第五行：克重要求 + 工期 + LOGO ===== -->
        <el-row :gutter="20">
          <el-col :xs="24" :sm="8">
            <el-form-item label="克重要求">
              <el-input v-model="form.weightRequirement" placeholder="如 2.5-3.0g" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="工期(天)" prop="deliveryDays">
              <el-input-number v-model="form.deliveryDays" :min="1" style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="LOGO">
              <el-input v-model="form.logoText" placeholder="LOGO文字" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ===== 第六行：网址 ===== -->
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="网址">
              <el-input v-model="form.url" placeholder="产品链接" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ===== 第七行：备注 ===== -->
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="备注信息" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ===== 图片区域 ===== -->
        <div class="image-section">
          <div class="image-section-title">📷 图片附件</div>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="8">
              <div class="upload-card">
                <div class="upload-card-label">产品图片</div>
                <ImageUpload v-model="form.imageUrl" :limit="5" :multiple="true" type="product" tip="最多5张" />
              </div>
            </el-col>
            <el-col :xs="24" :sm="8">
              <div class="upload-card">
                <div class="upload-card-label">数据图</div>
                <ImageUpload v-model="form.dataImageUrl" :limit="5" :multiple="true" type="data" tip="最多5张" />
              </div>
            </el-col>
            <el-col :xs="24" :sm="8">
              <div class="upload-card">
                <div class="upload-card-label">字印要求图</div>
                <ImageUpload v-model="form.letterImageUrl" :limit="5" :multiple="true" type="letter" tip="最多5张" />
              </div>
            </el-col>
          </el-row>
        </div>
      </el-form>
    </div>

    <!-- ===== 产品库弹窗 ===== -->
    <el-dialog v-model="productDialogVisible" title="📦 产品库" width="800px" destroy-on-close>
      <div class="dialog-search">
        <el-input
          v-model="productSearchKeyword"
          placeholder="搜索品名/规格"
          clearable
          prefix-icon="Search"
          style="width:280px;"
          @input="loadProductList"
        />
        <el-button type="primary" @click="loadProductList">搜索</el-button>
        <span style="margin-left:12px;color:#999;font-size:13px;">共 {{ productTotal }} 个产品</span>
      </div>
      <el-table 
        :data="productList" 
        border 
        stripe 
        v-loading="productLoading" 
        max-height="400" 
        @row-dblclick="selectProductFromDialog"
        highlight-current-row
      >
        <el-table-column prop="productName" label="品名" min-width="140" />
        <el-table-column prop="size" label="手寸" width="100" />
        <el-table-column prop="widthThick" label="宽/厚度" width="100" />
        <el-table-column prop="color" label="成色" width="80" />
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
import { ArrowLeft, Document, Check, Search } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { createOrder, updateOrder, getOrderDetail, submitOrder, acceptOrder } from '@/api/order';
import { searchProducts, getProductList, createProduct } from '@/api/product';
import ImageUpload from '@/components/ImageUpload.vue';

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

// ===== 产品相关 =====
const isNewProduct = ref(false);
const productList = ref([]);
const productTotal = ref(0);
const productLoading = ref(false);
const productDialogVisible = ref(false);
const productSearchKeyword = ref('');
const productPage = reactive({ current: 1, pageSize: 10 });

// ===== 表单 =====
const form = reactive({
  orderDate: new Date().toISOString().split('T')[0],
  customerId: userStore.customerId || null,
  productName: '',
  quantity: 1,
  deliveryDays: 7,
  color: 'K黄',
  goldPrice: 0,
  size: '',
  widthThick: '',
  diamondLevel: '',
  weightRequirement: '',
  logoText: '',
  url: '',
  remark: '',
  imageUrl: '',
  dataImageUrl: '',
  letterImageUrl: '',
});

// ===== 验证规则 =====
const rules = {
  orderDate: [{ required: true, message: '请选择订单日期' }],
  productName: [{ required: true, message: '请输入品名' }],
  quantity: [{ required: true, message: '请输入数量' }],
  color: [{ required: true, message: '请选择成色' }],
  deliveryDays: [{ required: true, message: '请输入工期' }],
};

// ===== 状态映射 =====
const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待客户审核', type: 'warning' },
  customerAudited: { text: '客户已审核', type: 'success' },
  accepted: { text: '已接单', type: 'primary' },
  completed: { text: '已完成', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' },
};

const getStatusText = (status) => statusMap[status]?.text || status;
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ============================================================
// ⭐ 页面标题
// ============================================================
const pageTitle = computed(() => {
  if (isEdit.value && userStore.userType === 'customerAudit') {
    return '✏️ 编辑待审核订单';
  }
  if (isEdit.value) {
    return '✏️ 编辑订单';
  }
  return '📝 下单';
});

// ============================================================
// ⭐ 按钮显示控制
// ============================================================
// 显示"提交审核"（客户下单员）
const showSubmitButton = computed(() => {
  // 新建时：显示
  if (!isEdit.value) return true;
  // 编辑时：只有草稿或已驳回状态才显示
  return orderStatus.value === 'draft' || orderStatus.value === 'rejected';
});

// 显示"提交到工厂"（客户审核员）
const showSubmitToFactory = computed(() => {
  // 只有编辑待审核(pending)状态的订单才显示
  return isEdit.value && orderStatus.value === 'pending';
});

// ============================================================
// 产品搜索（自动补全）
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
    
    const suggestions = results.map(item => ({
      ...item,
      value: item.productName,
    }));
    
    cb(suggestions);
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

// ============================================================
// 产品库弹窗
// ============================================================
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

// ============================================================
// 填充表单
// ============================================================
const fillFormFromProduct = (product) => {
  form.productName = product.productName;
  form.size = product.size || '';
  form.widthThick = product.widthThick || '';
  form.color = product.color || 'K黄';
  form.goldPrice = product.goldPrice || 0;
  form.diamondLevel = product.diamondLevel || '';
  form.weightRequirement = product.weightRequirement || '';
  form.logoText = product.logoText || '';
  form.deliveryDays = product.deliveryDays || 7;
  form.imageUrl = product.imageUrl || '';
  form.dataImageUrl = product.dataImageUrl || '';
  form.letterImageUrl = product.letterImageUrl || '';
};

// ============================================================
// 加载订单数据
// ============================================================
const loadOrderData = async () => {
  const id = route.params.id;
  const copyId = route.query.copy;

  if (copyId) {
    isCopy.value = true;
    loading.value = true;
    try {
      const res = await getOrderDetail(copyId);
      const data = res?.data;
      if (data) {
        Object.assign(form, {
          orderDate: new Date().toISOString().split('T')[0],
          productName: data.productName || '',
          quantity: data.quantity || 1,
          deliveryDays: data.deliveryDays || 7,
          color: data.color || 'K黄',
          goldPrice: data.goldPrice || 0,
          size: data.size || '',
          widthThick: data.widthThick || '',
          diamondLevel: data.diamondLevel || '',
          weightRequirement: data.weightRequirement || '',
          logoText: data.logoText || '',
          url: data.url || '',
          remark: data.remark || '',
          imageUrl: data.imageUrl || '',
          dataImageUrl: data.dataImageUrl || '',
          letterImageUrl: data.letterImageUrl || '',
        });
        ElMessage.success('已复刻订单数据');
      }
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
    const data = res?.data;
    if (data) {
      Object.assign(form, {
        orderDate: data.orderDate?.split('T')[0] || '',
        productName: data.productName || '',
        quantity: data.quantity || 1,
        deliveryDays: data.deliveryDays || 7,
        color: data.color || 'K黄',
        goldPrice: data.goldPrice || 0,
        size: data.size || '',
        widthThick: data.widthThick || '',
        diamondLevel: data.diamondLevel || '',
        weightRequirement: data.weightRequirement || '',
        logoText: data.logoText || '',
        url: data.url || '',
        remark: data.remark || '',
        imageUrl: data.imageUrl || '',
        dataImageUrl: data.dataImageUrl || '',
        letterImageUrl: data.letterImageUrl || '',
      });
      orderStatus.value = data.flowStatus;
    }
  } catch {
    ElMessage.error('加载订单失败');
  } finally {
    loading.value = false;
  }
};

// ============================================================
// 自动保存新产品
// ============================================================
const saveProductIfNew = async () => {
  if (!isNewProduct.value || !form.productName.trim()) {
    return null;
  }
  
  try {
    const productData = {
      productName: form.productName.trim(),
      size: form.size,
      widthThick: form.widthThick,
      color: form.color,
      goldPrice: form.goldPrice,
      diamondLevel: form.diamondLevel,
      weightRequirement: form.weightRequirement,
      logoText: form.logoText,
      imageUrl: form.imageUrl,
      dataImageUrl: form.dataImageUrl,
      letterImageUrl: form.letterImageUrl,
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
// 构建 payload
// ============================================================
const buildPayload = (status) => {
  return {
    orderDate: form.orderDate,
    customerId: userStore.customerId,
    customerName: userStore.customerName || '客户',
    productName: form.productName.trim(),
    quantity: form.quantity,
    deliveryDays: form.deliveryDays,
    color: form.color,
    goldPrice: form.goldPrice,
    size: form.size,
    widthThick: form.widthThick,
    diamondLevel: form.diamondLevel,
    weightRequirement: form.weightRequirement,
    logoText: form.logoText,
    url: form.url,
    remark: form.remark,
    flowStatus: status,
    imageUrl: form.imageUrl,
    dataImageUrl: form.dataImageUrl,
    letterImageUrl: form.letterImageUrl,
    sourceOrderId: route.query.copy || null,
  };
};

// ============================================================
// ⭐ 保存（所有人都可以用）
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
      ElMessage.success('保存成功');
    } else {
      await createOrder(payload);
      ElMessage.success('保存成功');
      // 新建后跳转到列表
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
// ⭐ 提交审核（仅客户下单员）
// ============================================================
const handleSubmit = async () => {
  if (!formRef.value) return;
  
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  
  try {
    await ElMessageBox.confirm('确认提交审核吗？提交后不可再修改。', '提示', { type: 'info' });
  } catch {
    return;
  }

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
// ⭐ 提交到工厂（仅客户审核员）
// ============================================================

const handleSubmitToFactory = async () => {
  if (!formRef.value) return;
  
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  
  try {
    await ElMessageBox.confirm(
      '确认审核通过并提交到工厂吗？',
      '提交到工厂',
      { type: 'info' }
    );
  } catch {
    return;
  }

  submitting.value = true;
  try {
    // 先保存订单
    await saveProductIfNew();
    
    const payload = buildPayload('customerAudited');
    await updateOrder({ ...payload, orderId: parseInt(route.params.id) });
    
    // ⭐ 调用审核通过接口（不是接单）
    await auditOrder(parseInt(route.params.id), { 
      approved: true, 
      remark: '审核通过，提交到工厂' 
    });
    
    ElMessage.success('审核通过，已提交到工厂');
    router.push('/order/audit');
  } catch (error) {
    ElMessage.error(error.message || '提交失败');
  } finally {
    submitting.value = false;
  }
};

// ============================================================
// 工具
// ============================================================
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ============================================================
// 初始化
// ============================================================
onMounted(() => {
  if (!userStore.customerId) {
    ElMessage.warning('当前用户未关联客户，无法下单');
  }
  loadOrderData();
});
</script>

<style scoped>
.page-container {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  min-height: 100%;
}

/* ===== 页面头部 ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e8ecf1;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #1d2129;
}

.header-right {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* ===== 表单容器 ===== */
.form-wrapper {
  max-width: 1100px;
  margin: 0 auto;
}

.form-wrapper :deep(.el-form-item) {
  margin-bottom: 18px;
}

.form-wrapper :deep(.el-form-item__label) {
  font-weight: 500;
  color: #4e5969;
}

/* ===== 品名输入框 ===== */
.product-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.product-input-wrapper :deep(.el-autocomplete) {
  flex: 1;
}

.product-input-wrapper :deep(.el-button) {
  flex-shrink: 0;
  height: 32px;
  padding: 0 16px;
}

/* ===== 自动补全建议 ===== */
.product-suggestion {
  display: flex;
  flex-direction: column;
  padding: 4px 0;
}

.suggestion-name {
  font-size: 14px;
  font-weight: 500;
  color: #1d2129;
}

.suggestion-info {
  font-size: 12px;
  color: #86909c;
  margin-top: 2px;
}

.suggestion-date {
  margin-left: 12px;
  color: #4e5969;
}

/* ===== 新产品提示 ===== */
.new-product-tip {
  margin-top: 6px;
}

/* ===== 图片区域 ===== */
.image-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e8ecf1;
}

.image-section-title {
  font-weight: 600;
  color: #1d2129;
  font-size: 15px;
  margin-bottom: 16px;
}

.upload-card {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 16px;
  min-height: 140px;
  transition: background 0.2s;
}

.upload-card:hover {
  background: #f0f1f3;
}

.upload-card-label {
  font-size: 13px;
  font-weight: 500;
  color: #4e5969;
  margin-bottom: 10px;
  text-align: center;
}

/* ===== 产品库弹窗 ===== */
.dialog-search {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.dialog-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .page-container {
    padding: 12px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-left {
    flex-wrap: wrap;
  }
  
  .header-right {
    justify-content: flex-end;
  }
  
  .product-input-wrapper {
    flex-wrap: wrap;
  }
  
  .product-input-wrapper :deep(.el-autocomplete) {
    flex: 1;
    min-width: 150px;
  }
  
  .upload-card {
    min-height: 100px;
    margin-bottom: 12px;
  }
}

/* ===== 全局样式优化 ===== */
:deep(.el-input__wrapper) {
  border-radius: 6px;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 6px;
}

:deep(.el-textarea__inner) {
  border-radius: 6px;
}

:deep(.el-button) {
  border-radius: 6px;
}

:deep(.el-card) {
  border-radius: 8px;
}

:deep(.el-dialog) {
  border-radius: 12px;
}

:deep(.el-dialog__header) {
  padding: 20px 24px 0;
}

:deep(.el-dialog__body) {
  padding: 16px 24px 20px;
}

:deep(.el-dialog__footer) {
  padding: 0 24px 20px;
}
</style>