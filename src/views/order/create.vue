<!-- src/views/order/create.vue -->
<template>
  <div class="page-container">
    <!-- ===== 权限检查 ===== -->
    <el-alert
      v-if="!canOrder"
      title="您没有下单权限"
      :description="`只有客户下单员和管理员可以下单，当前角色为：${userStore.userTypeName}`"
      type="warning"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    />

    <div class="page-header">
      <h2>📝 下单</h2>
      <div style="display: flex; gap: 12px;">
        <el-button type="primary" @click="openAddDialog" :disabled="!canOrder">
          <el-icon><Plus /></el-icon> 新增产品
        </el-button>
        <el-button type="success" plain @click="handleImportExcel" :disabled="!canOrder">
          <el-icon><UploadFilled /></el-icon> 导入Excel
        </el-button>
        <el-button @click="previewOrder" :disabled="!canOrder || orderDetails.length === 0">
          <el-icon><View /></el-icon> 预览
        </el-button>
        <el-button type="primary" @click="submitOrder" :loading="submitting" :disabled="!canOrder || orderDetails.length === 0">
          <el-icon><Check /></el-icon> 提交订单
        </el-button>
      </div>
    </div>

    <!-- ===== 客户信息 ===== -->
    <el-card style="margin-bottom: 16px;">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="info-item">
            <span class="label">客户名称：</span>
            <span class="value">{{ userStore.customerName || '未关联客户' }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <span class="label">下单日期：</span>
            <span class="value">{{ orderDate }}</span>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="info-item">
            <span class="label">状态：</span>
            <el-tag type="warning" size="small">待审核</el-tag>
          </div>
        </el-col>
        <el-col :span="6" style="text-align: right; color: #999; font-size: 14px; line-height: 40px;">
          共 <b style="color: #409EFF;">{{ orderDetails.length }}</b> 项产品
        </el-col>
      </el-row>
    </el-card>

    <!-- ===== 产品列表 ===== -->
    <el-card>
      <el-table :data="orderDetails" border stripe style="width: 100%" max-height="450">
        <el-table-column label="序号" width="55" align="center">
          <template #default="{ $index }">{{ $index + 1 }}</template>
        </el-table-column>

        <el-table-column label="图片" width="80" align="center">
          <template #default="{ row }">
            <img v-if="row.imageUrl" :src="row.imageUrl" class="table-image" @click="previewImage(row.imageUrl)" />
            <span v-else style="color: #ccc; font-size: 12px;">无图</span>
          </template>
        </el-table-column>

        <el-table-column prop="productName" label="品名" min-width="120" />
        <el-table-column prop="color" label="颜色" width="80" />
        <el-table-column prop="quantity" label="件数" width="70" align="center" />
        <el-table-column prop="size" label="手寸" width="80" />
        <el-table-column prop="diamondLevel" label="钻石级别" width="100" />
        <el-table-column prop="params" label="参数" min-width="80" />
        <el-table-column prop="amount" label="金额" width="110" align="right">
          <template #default="{ row }">¥{{ (row.amount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="deliveryDays" label="工期" width="70" align="center" />
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row, $index }">
            <el-button type="primary" size="small" link @click="editRow(row, $index)">编辑</el-button>
            <el-button type="danger" size="small" link @click="removeRow($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 12px; text-align: right; font-size: 14px; color: #666;">
        合计：<b style="color: #E6A23C; font-size: 18px;">¥{{ totalAmount.toFixed(2) }}</b>
        ｜ 总件数：<b>{{ totalQuantity }}</b>
      </div>
    </el-card>

    <!-- ============================================================ -->
    <!-- ===== 新增/编辑产品弹窗 ===== -->
    <!-- ============================================================ -->
    <el-dialog 
      v-model="showDialog" 
      :title="dialogTitle"
      width="650px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px" size="default">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="品名" prop="productName">
              <el-input v-model="form.productName" placeholder="请输入品名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="颜色" prop="color">
              <el-select v-model="form.color" style="width: 100%">
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
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="件数" prop="quantity">
              <el-input-number v-model="form.quantity" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手寸">
              <el-input v-model="form.size" placeholder="如：15" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="钻石级别">
              <el-select v-model="form.diamondLevel" style="width: 100%" clearable>
                <el-option label="VS" value="VS" />
                <el-option label="VVS" value="VVS" />
                <el-option label="培育钻" value="培育钻" />
                <el-option label="塔育钻" value="塔育钻" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="工期(天)">
              <el-input-number v-model="form.deliveryDays" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="金额">
              <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%" placeholder="0.00" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="参数">
              <el-input v-model="form.params" placeholder="参数信息" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息（选填）" />
        </el-form-item>

        <!-- ===== 图片上传（拖拽+点击） ===== -->
        <el-form-item label="产品图片">
          <div 
            class="upload-area" 
            :class="{ 'has-image': form.imageUrl }"
            @dragover.prevent 
            @drop.prevent="handleDrop"
          >
            <!-- 有图片时显示预览 -->
            <div v-if="form.imageUrl" class="upload-preview">
              <img :src="form.imageUrl" class="preview-img" />
              <div class="upload-overlay">
                <el-button size="small" type="primary" @click.stop="triggerUpload">更换</el-button>
                <el-button size="small" type="danger" @click.stop="removeImage">删除</el-button>
              </div>
            </div>
            <!-- 无图片时显示上传区域 -->
            <div v-else class="upload-placeholder" @click="triggerUpload">
              <el-icon class="upload-icon"><Plus /></el-icon>
              <span>点击上传或拖拽图片到此处</span>
              <span class="upload-tip">支持 JPG, PNG, GIF, WebP，最大5MB</span>
            </div>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleFileSelect"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="saveProduct" :loading="saving">
          {{ isEdit ? '保存修改' : '添加产品' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 图片预览弹窗 ===== -->
    <el-dialog v-model="imagePreviewVisible" title="图片预览" width="500px" center>
      <div style="text-align: center;">
        <img :src="previewImageUrl" style="max-width: 100%; max-height: 500px; border-radius: 4px;" />
      </div>
    </el-dialog>

    <!-- ===== 预览订单弹窗 ===== -->
    <el-dialog v-model="previewVisible" title="订单预览" width="90%" top="5vh">
      <div style="max-height: 70vh; overflow-y: auto;">
        <el-table :data="orderDetails" border stripe>
          <el-table-column label="序号" width="55" align="center">
            <template #default="{ $index }">{{ $index + 1 }}</template>
          </el-table-column>
          <el-table-column label="图片" width="80" align="center">
            <template #default="{ row }">
              <img v-if="row.imageUrl" :src="row.imageUrl" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" />
              <span v-else style="color: #ccc;">无图</span>
            </template>
          </el-table-column>
          <el-table-column prop="productName" label="品名" min-width="120" />
          <el-table-column prop="color" label="颜色" width="80" />
          <el-table-column prop="quantity" label="件数" width="70" />
          <el-table-column prop="size" label="手寸" width="80" />
          <el-table-column prop="diamondLevel" label="钻石级别" width="100" />
          <el-table-column prop="params" label="参数" min-width="80" />
          <el-table-column prop="deliveryDays" label="工期" width="70" />
          <el-table-column prop="amount" label="金额" width="110" align="right" />
          <el-table-column prop="remark" label="备注" min-width="80" />
        </el-table>
        <div style="margin-top: 16px; text-align: right; font-size: 16px;">
          合计：<b style="color: #E6A23C; font-size: 20px;">¥{{ totalAmount.toFixed(2) }}</b>
          ｜ 总件数：<b>{{ totalQuantity }}</b>
        </div>
      </div>
    </el-dialog>

    <!-- ===== Excel导入弹窗 ===== -->
    <el-dialog v-model="importVisible" title="导入Excel" width="600px">
      <el-upload
        ref="uploadRef"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        :file-list="fileList"
        accept=".xlsx,.xls"
        :limit="1"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处，或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 .xlsx, .xls 格式，列名：品名、颜色、件数、手寸、金额
          </div>
        </template>
      </el-upload>

      <el-table v-if="importPreview.length > 0" :data="importPreview" border stripe style="margin-top: 16px;" max-height="300">
        <el-table-column prop="productName" label="品名" min-width="120" />
        <el-table-column prop="color" label="颜色" width="80" />
        <el-table-column prop="quantity" label="件数" width="70" />
        <el-table-column prop="size" label="手寸" width="80" />
        <el-table-column prop="amount" label="金额" width="100" />
      </el-table>

      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport" :disabled="importPreview.length === 0">
          确认导入 ({{ importPreview.length }}条)
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Delete, UploadFilled, View, Check } from '@element-plus/icons-vue';
import * as XLSX from 'xlsx';
import { createOrder } from '@/api/order';
import { uploadImage } from '@/api/upload';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const fileInput = ref(null);
const formRef = ref(null);
const uploadRef = ref(null);

// ===== 权限 =====
const canOrder = computed(() => {
  const userType = userStore.userType;
  return userType === 'customer' || userType === 'admin';
});

// ===== 日期 =====
const orderDate = ref(new Date().toLocaleDateString('zh-CN'));

// ===== 订单数据 =====
const orderDetails = ref([]);

// ===== 弹窗控制 =====
const showDialog = ref(false);
const isEdit = ref(false);
const editIndex = ref(-1);
const saving = ref(false);
const submitting = ref(false);
const previewVisible = ref(false);
const imagePreviewVisible = ref(false);
const previewImageUrl = ref('');
const importVisible = ref(false);
const importPreview = ref([]);
const fileList = ref([]);

// ===== 表单数据 =====
const form = reactive({
  productName: '',
  color: 'K黄',
  quantity: 1,
  size: '',
  diamondLevel: '',
  params: '',
  amount: 0,
  deliveryDays: 7,
  remark: '',
  imageUrl: '',
  imageFile: null,
});

const rules = {
  productName: [{ required: true, message: '请输入品名', trigger: 'blur' }],
  color: [{ required: true, message: '请选择颜色', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入件数', trigger: 'blur' }],
};

// ===== 计算统计 =====
const totalQuantity = computed(() => {
  return orderDetails.value.reduce((sum, row) => sum + (row.quantity || 0), 0);
});

const totalAmount = computed(() => {
  return orderDetails.value.reduce((sum, row) => sum + (row.amount || 0), 0);
});

const dialogTitle = computed(() => isEdit.value ? '✏️ 编辑产品' : '➕ 新增产品');

// ============================================================
// 图片上传
// ============================================================
const triggerUpload = () => {
  fileInput.value?.click();
};

const handleFileSelect = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请上传图片文件');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过5MB');
    return;
  }
  // 预览
  const reader = new FileReader();
  reader.onload = (e) => {
    form.imageUrl = e.target.result;
    form.imageFile = file;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
};

const handleDrop = (event) => {
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        form.imageUrl = e.target.result;
        form.imageFile = file;
      };
      reader.readAsDataURL(file);
    } else {
      ElMessage.error('请拖拽图片文件');
    }
  }
};

const removeImage = () => {
  form.imageUrl = '';
  form.imageFile = null;
};

// ============================================================
// 新增/编辑产品
// ============================================================
const openAddDialog = () => {
  isEdit.value = false;
  editIndex.value = -1;
  resetForm();
  showDialog.value = true;
};

const editRow = (row, index) => {
  isEdit.value = true;
  editIndex.value = index;
  Object.assign(form, {
    productName: row.productName,
    color: row.color,
    quantity: row.quantity,
    size: row.size || '',
    diamondLevel: row.diamondLevel || '',
    params: row.params || '',
    amount: row.amount || 0,
    deliveryDays: row.deliveryDays || 7,
    remark: row.remark || '',
    imageUrl: row.imageUrl || '',
    imageFile: null,
  });
  showDialog.value = true;
};

const resetForm = () => {
  form.productName = '';
  form.color = 'K黄';
  form.quantity = 1;
  form.size = '';
  form.diamondLevel = '';
  form.params = '';
  form.amount = 0;
  form.deliveryDays = 7;
  form.remark = '';
  form.imageUrl = '';
  form.imageFile = null;
  if (formRef.value) formRef.value.resetFields();
};

const saveProduct = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    
    saving.value = true;
    try {
      let finalImageUrl = form.imageUrl;

      // 如果有新图片，上传到服务器
      if (form.imageFile) {
        const res = await uploadImage(form.imageFile);
        if (res.success) {
          finalImageUrl = res.url;
        } else {
          ElMessage.error(res.message || '图片上传失败');
          saving.value = false;
          return;
        }
      }

      const productData = {
        productName: form.productName.trim(),
        color: form.color,
        quantity: form.quantity,
        size: form.size || '',
        diamondLevel: form.diamondLevel || '',
        params: form.params || '',
        amount: form.amount || 0,
        deliveryDays: form.deliveryDays || 7,
        remark: form.remark || '',
        imageUrl: finalImageUrl,
      };

      if (isEdit.value && editIndex.value >= 0) {
        orderDetails.value[editIndex.value] = productData;
        ElMessage.success('修改成功');
      } else {
        orderDetails.value.push(productData);
        ElMessage.success('添加成功');
      }
      showDialog.value = false;
    } catch (error) {
      ElMessage.error(error.message || '操作失败');
    } finally {
      saving.value = false;
    }
  });
};

const removeRow = (index) => {
  ElMessageBox.confirm('确定要删除该产品吗？', '提示', { type: 'warning' }).then(() => {
    orderDetails.value.splice(index, 1);
    ElMessage.success('删除成功');
  }).catch(() => {});
};

// ============================================================
// 预览
// ============================================================
const previewOrder = () => {
  if (orderDetails.value.length === 0) {
    ElMessage.warning('没有产品数据');
    return;
  }
  previewVisible.value = true;
};

const previewImage = (url) => {
  previewImageUrl.value = url;
  imagePreviewVisible.value = true;
};

// ============================================================
// Excel导入
// ============================================================
const handleImportExcel = () => {
  importVisible.value = true;
  importPreview.value = [];
  fileList.value = [];
};

const handleFileChange = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      if (!jsonData || jsonData.length === 0) {
        ElMessage.warning('Excel文件为空');
        return;
      }

      importPreview.value = jsonData.map((row) => ({
        productName: row['品名'] || row['ProductName'] || row['产品名称'] || '',
        color: row['颜色'] || row['Color'] || 'K黄',
        quantity: Number(row['件数'] || row['Quantity'] || 1),
        size: row['手寸'] || row['Size'] || '',
        amount: Number(row['金额'] || row['Amount'] || 0),
      }));

      ElMessage.success(`成功解析 ${importPreview.value.length} 条数据`);
    } catch (error) {
      ElMessage.error('解析Excel失败，请检查格式');
    }
  };
  reader.readAsArrayBuffer(file.raw);
  fileList.value = [];
};

const confirmImport = () => {
  if (importPreview.value.length === 0) {
    ElMessage.warning('没有数据可导入');
    return;
  }
  importPreview.value.forEach((item) => {
    orderDetails.value.push({
      ...item,
      diamondLevel: '',
      params: '',
      deliveryDays: 7,
      remark: '',
      imageUrl: '',
    });
  });
  const count = importPreview.value.length;
  importPreview.value = [];
  importVisible.value = false;
  ElMessage.success(`成功导入 ${count} 条数据`);
};

// ============================================================
// 提交订单
// ============================================================
const submitOrder = async () => {
  if (orderDetails.value.length === 0) {
    ElMessage.warning('请至少添加一个产品');
    return;
  }

  const customerId = userStore.customerId;
  if (!customerId || customerId <= 0) {
    ElMessage.error('当前用户未关联客户，无法下单');
    return;
  }

  submitting.value = true;
  try {
    let successCount = 0;
    let failCount = 0;

    for (const detail of orderDetails.value) {
      const payload = {
        customerId: customerId,
        customerName: userStore.customerName || '客户',
        productName: detail.productName.trim(),
        color: detail.color,
        quantity: detail.quantity || 1,
        size: detail.size || '',
        diamondLevel: detail.diamondLevel || '',
        params: detail.params || '',
        amount: detail.amount || 0,
        deliveryDays: detail.deliveryDays || 7,
        remark: detail.remark || '',
        imageUrl: detail.imageUrl || '',
      };

      try {
        const res = await createOrder(payload);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    if (successCount > 0 && failCount === 0) {
      ElMessage.success(`全部 ${successCount} 个订单提交成功！`);
      orderDetails.value = [];
    } else if (successCount > 0 && failCount > 0) {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
    } else {
      ElMessage.error('所有订单提交失败');
    }
  } catch (error) {
    ElMessage.error(error.message || '下单失败');
  } finally {
    submitting.value = false;
  }
};
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
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.page-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.info-item {
  padding: 8px 0;
}
.info-item .label {
  color: #999;
  font-size: 14px;
}
.info-item .value {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.table-image {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
}
.table-image:hover {
  transform: scale(1.8);
  z-index: 10;
  position: relative;
}

/* ===== 上传区域 ===== */
.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  min-height: 140px;
  transition: all 0.3s;
  overflow: hidden;
}
.upload-area:hover {
  border-color: #409EFF;
}
.upload-area.has-image {
  border-color: #67C23A;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 140px;
  cursor: pointer;
  color: #999;
}
.upload-placeholder:hover {
  background: #f5f7fa;
}
.upload-icon {
  font-size: 40px;
}
.upload-tip {
  font-size: 12px;
  color: #c0c4cc;
}

.upload-preview {
  position: relative;
  display: inline-block;
  width: 100%;
}
.preview-img {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  display: block;
}
.upload-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px;
  display: flex;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s;
}
.upload-preview:hover .upload-overlay {
  opacity: 1;
}

:deep(.el-dialog__body) {
  padding-top: 16px;
}
:deep(.el-form-item) {
  margin-bottom: 18px;
}
</style>