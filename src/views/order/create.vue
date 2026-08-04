<!-- src/views/order/create.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📝 下单</h2>
        <el-tag v-if="isEdit" type="warning" size="large">编辑中</el-tag>
        <el-tag v-if="orderStatus" :type="getStatusType(orderStatus)" size="large">
          {{ getStatusText(orderStatus) }}
        </el-tag>
      </div>
      <div class="header-right">
        <el-button @click="handleSaveDraft" :loading="saving">
          <el-icon><Document /></el-icon> 保存草稿
        </el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          <el-icon><Check /></el-icon> 提交审核
        </el-button>
      </div>
    </div>

    <!-- 表单 -->
    <div class="form-wrapper">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="110px"
        label-position="right"
        size="default"
      >
        <!-- 第一行：订单日期 + 客户（只读） -->
        <el-row :gutter="16">
          <el-col :span="12">
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
          <el-col :span="12">
            <el-form-item label="客户">
              <el-input
                :value="userStore.customerName || '未关联客户'"
                disabled
                style="width:100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第二行：品名（带自动匹配） + 手寸 + 宽厚 -->
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="品名" prop="productName">
              <el-input
                v-model="form.productName"
                placeholder="输入品名自动匹配"
                @input="handleProductSearch"
                @focus="handleProductSearch"
              />
              <!-- 匹配结果下拉 -->
              <div v-if="showMatchList && matchResults.length > 0" class="match-dropdown">
                <div
                  v-for="item in matchResults"
                  :key="item.productId"
                  class="match-item"
                  @click="selectProduct(item)"
                >
                  <div class="match-name">{{ item.productName }}</div>
                  <div class="match-info">
                    最近下单：{{ formatDate(item.lastOrderDate) }} ｜ 使用 {{ item.usageCount }} 次
                  </div>
                </div>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="手寸/长度" prop="size">
              <el-input v-model="form.size" placeholder="请输入手寸或长度" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="宽/厚度" prop="widthThick">
              <el-input v-model="form.widthThick" placeholder="请输入宽度/厚度" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第三行：数量 + 成色 + 金价 -->
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="数量" prop="quantity">
              <el-input-number v-model="form.quantity" :min="1" style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
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
          <el-col :span="8">
            <el-form-item label="金价(元/克)" prop="goldPrice">
              <el-input-number
                v-model="form.goldPrice"
                :precision="2"
                :min="0"
                placeholder="请输入金价"
                style="width:100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第四行：钻石级别 + 克重要求 + 工期 -->
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="钻石级别" prop="diamondLevel">
              <el-select v-model="form.diamondLevel" placeholder="请选择钻石级别" style="width:100%;" clearable>
                <el-option label="VS" value="VS" />
                <el-option label="VVS" value="VVS" />
                <el-option label="培育钻" value="培育钻" />
                <el-option label="塔育钻" value="塔育钻" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="克重要求" prop="weightRequirement">
              <el-input v-model="form.weightRequirement" placeholder="如 2.5-3.0g" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="工期(天)" prop="deliveryDays">
              <el-input-number v-model="form.deliveryDays" :min="1" style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 第五行：LOGO + 网址 -->
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="LOGO" prop="logoText">
              <el-input v-model="form.logoText" placeholder="请输入LOGO文字" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="网址" prop="url">
              <el-input v-model="form.url" placeholder="请输入产品链接" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 备注 -->
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注信息" />
        </el-form-item>

        <!-- 图片区域 -->
          <div style="margin-top:16px;">
          <div style="font-weight:600;color:#303133;margin-bottom:12px;">📷 图片附件</div>
          <el-row :gutter="16">
            <!-- 产品图片 -->
            <el-col :span="8">
              <div class="upload-section">
                <div class="upload-label">产品图片</div>
                <ImageUpload 
                  v-model="form.imageUrl" 
                  :limit="5" 
                  :multiple="true"
                  type="product"
                  tip="最多5张，每张最大5MB"
                />
              </div>
            </el-col>

            <!-- 数据图 -->
            <el-col :span="8">
              <div class="upload-section">
                <div class="upload-label">数据图</div>
                <ImageUpload 
                  v-model="form.dataImageUrl" 
                  :limit="5" 
                  :multiple="true"
                  type="data"
                  tip="最多5张，每张最大5MB"
                />
              </div>
            </el-col>

            <!-- 字印要求图 -->
            <el-col :span="8">
              <div class="upload-section">
                <div class="upload-label">字印要求图</div>
                <ImageUpload 
                  v-model="form.letterImageUrl" 
                  :limit="5" 
                  :multiple="true"
                  type="letter"
                  tip="最多5张，每张最大5MB"
                />
              </div>
            </el-col>
          </el-row>
        </div>
      </el-form>
    </div>
  </div>
</template>

<!-- src/views/order/create.vue -->
<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Document, Check, Plus } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { createOrder, updateOrder, getOrderDetail } from '@/api/order';
import { getCustomerList } from '@/api/customer';
import { uploadImage } from '@/api/upload';
import ImageUpload from '@/components/ImageUpload.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const saving = ref(false);
const submitting = ref(false);
const formRef = ref();
const isEdit = ref(false);
const orderStatus = ref('');
const customerList = ref([]);
const uploading = ref(false);

// ===== 表单数据 =====
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
  // 图片相关
  imageList: [],
  dataImageList: [],
  letterImageList: [],
  imageUrl: '',
  dataImageUrl: '',
  letterImageUrl: '',
});

// ===== 验证规则 =====
const rules = {
  orderDate: [{ required: true, message: '请选择订单日期' }],
  customerId: [{ required: true, message: '请选择客户' }],
  productName: [{ required: true, message: '请输入品名' }],
  quantity: [{ required: true, message: '请输入数量' }],
  color: [{ required: true, message: '请选择成色' }],
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
// 图片处理
// ============================================================
const handleImageChange = (file, listKey) => {
  // 预览
  const reader = new FileReader();
  reader.onload = (e) => {
    file.url = e.target.result;
  };
  reader.readAsDataURL(file.raw);
};

const handleImageRemove = (file, listKey) => {
  // 移除时清理
};

// ============================================================
// ⭐ 上传图片到服务器
// ============================================================
const uploadImagesToServer = async (fileList, type) => {
  const urls = [];
  for (const item of fileList) {
    // 如果已经有URL（编辑时回显的），直接使用
    if (item.url && item.url.startsWith('/uploads/')) {
      urls.push(item.url);
      continue;
    }
    // 新图片需要上传
    if (item.raw) {
      try {
        const res = await uploadImage(item.raw, type);
        if (res.success) {
          urls.push(res.url);
        }
      } catch (error) {
        console.error(`${type}图片上传失败:`, error);
        throw new Error(`图片上传失败: ${item.name}`);
      }
    }
  }
  return urls;
};

// ============================================================
// 构建提交数据
// ============================================================
const buildPayload = (status) => {
  const payload = {
    orderDate: form.orderDate,
    customerId: form.customerId,
    customerName: userStore.customerName || '客户',
    productName: form.productName,
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
  };
  if (isEdit.value) {
    payload.orderId = parseInt(route.params.id);
  }
  return payload;
};

// ============================================================
// 保存草稿
// ============================================================
const handleSaveDraft = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    saving.value = true;
    try {
      // ⭐ 先上传图片
      const [imageUrls, dataImageUrls, letterImageUrls] = await Promise.all([
        uploadImagesToServer(form.imageList, 'product'),
        uploadImagesToServer(form.dataImageList, 'data'),
        uploadImagesToServer(form.letterImageList, 'letter'),
      ]);

      form.imageUrl = imageUrls.join(',');
      form.dataImageUrl = dataImageUrls.join(',');
      form.letterImageUrl = letterImageUrls.join(',');

      const payload = buildPayload('draft');
      if (isEdit.value) {
        await updateOrder({ ...payload, orderId: route.params.id });
        ElMessage.success('保存成功');
      } else {
        await createOrder(payload);
        ElMessage.success('保存成功');
        resetForm();
      }
    } catch (error) {
      ElMessage.error(error.message || '保存失败');
    } finally {
      saving.value = false;
    }
  });
};

// ============================================================
// 提交审核
// ============================================================
const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    try {
      await ElMessageBox.confirm('确认提交审核吗？提交后不可再修改。', '提示', { type: 'info' });
    } catch {
      return;
    }

    submitting.value = true;
    try {
     
      const payload = buildPayload('pending');
      if (isEdit.value) {
        await updateOrder({ ...payload, orderId: route.params.id });
        ElMessage.success('提交成功');
      } else {
        await createOrder(payload);
        ElMessage.success('提交成功');
        resetForm();
      }
      router.push('/order/my-list');
    } catch (error) {
      ElMessage.error(error.message || '提交失败');
    } finally {
      submitting.value = false;
    }
  });
};

// ============================================================
// 重置表单
// ============================================================
const resetForm = () => {
  form.orderDate = new Date().toISOString().split('T')[0];
  form.productName = '';
  form.quantity = 1;
  form.deliveryDays = 7;
  form.color = 'K黄';
  form.goldPrice = 0;
  form.size = '';
  form.widthThick = '';
  form.diamondLevel = '';
  form.weightRequirement = '';
  form.logoText = '';
  form.url = '';
  form.remark = '';
  form.imageList = [];
  form.dataImageList = [];
  form.letterImageList = [];
  form.imageUrl = '';
  form.dataImageUrl = '';
  form.letterImageUrl = '';
  formRef.value?.resetFields();
};

// ============================================================
// 加载客户列表
// ============================================================
const loadCustomers = async () => {
  try {
    const res = await getCustomerList({ includeInactive: false });
    customerList.value = res?.data || [];
  } catch {
    customerList.value = [
      { customerId: 1, customerName: '周大福珠宝' },
      { customerId: 2, customerName: '老凤祥珠宝' },
    ];
  }
};

// ============================================================
// 加载订单数据（编辑时）
// ============================================================
const loadOrderData = async () => {
  const id = route.params.id;
  if (!id) return;

  isEdit.value = true;
  loading.value = true;
  try {
    const res = await getOrderDetail(id);
    const data = res?.data;
    if (data) {
      Object.assign(form, {
        orderDate: data.orderDate?.split('T')[0] || '',
        customerId: data.customerId,
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

      // 图片回显
      if (data.imageUrl) {
        const urls = data.imageUrl.split(',').filter(u => u);
        form.imageList = urls.map((url, index) => ({
          id: index,
          url: url,
          name: `产品图片${index + 1}`,
        }));
      }
      if (data.dataImageUrl) {
        const urls = data.dataImageUrl.split(',').filter(u => u);
        form.dataImageList = urls.map((url, index) => ({
          id: index,
          url: url,
          name: `数据图${index + 1}`,
        }));
      }
      if (data.letterImageUrl) {
        const urls = data.letterImageUrl.split(',').filter(u => u);
        form.letterImageList = urls.map((url, index) => ({
          id: index,
          url: url,
          name: `字印图${index + 1}`,
        }));
      }

      orderStatus.value = data.flowStatus;
    }
  } catch {
    ElMessage.error('加载订单失败');
  } finally {
    loading.value = false;
  }
};

// ============================================================
// 初始化
// ============================================================
onMounted(() => {
  if (!userStore.customerId) {
    ElMessage.warning('当前用户未关联客户，无法下单');
  }
  loadCustomers();
  loadOrderData();
});
</script>

<style scoped>
.page-container {
  background: #f5f7fa;
  padding: 16px;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.form-wrapper {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #333;
}

/* ===== 产品匹配下拉 ===== */
.match-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 2px;
}

.match-item {
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.match-item:hover {
  background: #f0f7ff;
}

.match-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.match-info {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* ===== 图片上传 ===== */
.upload-section {
  text-align: center;
}

.upload-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

:deep(.el-upload--picture-card) {
  width: 80px;
  height: 80px;
  line-height: 80px;
}

:deep(.el-upload-list--picture-card .el-upload-list__item) {
  width: 80px;
  height: 80px;
}

/* 品名输入框相对定位，用于下拉 */
:deep(.el-form-item__content) {
  position: relative;
}
</style>