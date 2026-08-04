<!-- src/views/order/import.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📤 导入Excel</h2>
        <el-tag type="info" size="large">批量导入</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSaveAll" :loading="saving">
          <el-icon><Check /></el-icon> 保存全部
        </el-button>
        <el-button type="success" @click="downloadTemplate">
          <el-icon><Download /></el-icon> 下载模板
        </el-button>
      </div>
    </div>

    <!-- 导入区域 -->
    <el-card class="upload-card">
      <el-alert
        title="导入说明"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:16px;"
      >
        <template #default>
          <p>1. 点击「下载模板」获取Excel模板</p>
          <p>2. 按模板格式填写数据（品名、客户、数量、成色等）</p>
          <p>3. 上传Excel文件，数据会自动解析到下方表格</p>
          <p>4. 在表格中直接编辑修改数据，确认无误后点击「保存全部」</p>
          <p>5. 客户名称为空时，默认使用当前登录客户</p>
        </template>
      </el-alert>

      <el-upload
        ref="uploadRef"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        :on-remove="handleFileRemove"
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
            支持 .xlsx, .xls 格式
          </div>
        </template>
      </el-upload>
    </el-card>

    <!-- 数据表格（可编辑） -->
    <el-card v-if="tableData.length > 0" class="data-card">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:600;">📋 导入数据预览（共 {{ tableData.length }} 条）</span>
          <div>
            <el-button size="small" @click="clearAll">清空全部</el-button>
            <el-button size="small" type="primary" @click="addRow">添加行</el-button>
          </div>
        </div>
      </template>

      <div class="table-wrapper">
        <el-table :data="tableData" border stripe max-height="500">
          <el-table-column label="序号" width="55" align="center" fixed>
            <template #default="{ $index }">{{ $index + 1 }}</template>
          </el-table-column>

          <el-table-column label="订单日期" width="120" fixed>
            <template #default="{ row }">
              <el-date-picker
                v-model="row.orderDate"
                type="date"
                value-format="YYYY-MM-DD"
                size="small"
                style="width:100%;"
                placeholder="选择日期"
              />
            </template>
          </el-table-column>

          <el-table-column label="品名" min-width="120" fixed>
            <template #default="{ row }">
              <el-input v-model="row.productName" size="small" placeholder="品名" />
            </template>
          </el-table-column>

          <el-table-column label="客户" width="120" fixed>
            <template #default="{ row }">
              <el-select
                v-model="row.customerId"
                size="small"
                style="width:100%;"
                filterable
                placeholder="选择客户"
              >
                <el-option
                  v-for="item in customerList"
                  :key="item.customerId"
                  :label="item.customerName"
                  :value="item.customerId"
                />
              </el-select>
            </template>
          </el-table-column>

          <el-table-column label="手寸/长度" width="120">
            <template #default="{ row }">
              <el-input v-model="row.size" size="small" placeholder="手寸" />
            </template>
          </el-table-column>

          <el-table-column label="宽/厚度" width="120">
            <template #default="{ row }">
              <el-input v-model="row.widthThick" size="small" placeholder="宽/厚度" />
            </template>
          </el-table-column>

          <el-table-column label="数量" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.quantity" :min="1" size="small" style="width:100%;" />
            </template>
          </el-table-column>

          <el-table-column label="成色" width="100">
            <template #default="{ row }">
              <el-select v-model="row.color" size="small" style="width:100%;">
                <el-option label="K黄" value="K黄" />
                <el-option label="K白" value="K白" />
                <el-option label="红" value="红" />
                <el-option label="P1" value="P1" />
                <el-option label="9K" value="9K" />
                <el-option label="14K" value="14K" />
                <el-option label="银" value="银" />
              </el-select>
            </template>
          </el-table-column>

          <el-table-column label="金价" width="110">
            <template #default="{ row }">
              <el-input-number
                v-model="row.goldPrice"
                :precision="2"
                :min="0"
                size="small"
                style="width:100%;"
                placeholder="0.00"
              />
            </template>
          </el-table-column>

          <el-table-column label="钻石级别" width="110">
            <template #default="{ row }">
              <el-select v-model="row.diamondLevel" size="small" style="width:100%;" clearable>
                <el-option label="VS" value="VS" />
                <el-option label="VVS" value="VVS" />
                <el-option label="培育钻" value="培育钻" />
                <el-option label="塔育钻" value="塔育钻" />
              </el-select>
            </template>
          </el-table-column>

          <el-table-column label="克重要求" width="120">
            <template #default="{ row }">
              <el-input v-model="row.weightRequirement" size="small" placeholder="如 2.5-3.0g" />
            </template>
          </el-table-column>

          <el-table-column label="LOGO" width="120">
            <template #default="{ row }">
              <el-input v-model="row.logoText" size="small" placeholder="LOGO" />
            </template>
          </el-table-column>

          <el-table-column label="工期" width="90">
            <template #default="{ row }">
              <el-input-number v-model="row.deliveryDays" :min="1" size="small" style="width:100%;" />
            </template>
          </el-table-column>

          <el-table-column label="网址" min-width="130">
            <template #default="{ row }">
              <el-input v-model="row.url" size="small" placeholder="网址" />
            </template>
          </el-table-column>

          <el-table-column label="备注" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.remark" size="small" placeholder="备注" />
            </template>
          </el-table-column>

          <el-table-column label="操作" width="70" align="center" fixed="right">
            <template #default="{ $index }">
              <el-button type="danger" size="small" link @click="removeRow($index)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 底部统计 -->
      <div style="margin-top:12px;display:flex;gap:24px;font-size:14px;color:#666;">
        <span>总行数：<b style="color:#409EFF;">{{ tableData.length }}</b></span>
        <span>总件数：<b style="color:#409EFF;">{{ totalQuantity }}</b></span>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Check, Download, UploadFilled } from '@element-plus/icons-vue';
import * as XLSX from 'xlsx';
import { useUserStore } from '@/stores/user';
import { createOrder } from '@/api/order';
import { getCustomerList } from '@/api/customer';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const saving = ref(false);
const fileList = ref([]);
const uploadRef = ref();
const tableData = ref([]);
const customerList = ref([]);

// ===== 统计 =====
const totalQuantity = computed(() => {
  return tableData.value.reduce((sum, row) => sum + (row.quantity || 1), 0);
});

// ===== 默认行 =====
const getDefaultRow = () => ({
  orderDate: new Date().toISOString().split('T')[0],
  productName: '',
  customerId: userStore.customerId || null,
  customerName: userStore.customerName || '',
  size: '',
  widthThick: '',
  quantity: 1,
  color: 'K黄',
  goldPrice: 0,
  diamondLevel: '',
  weightRequirement: '',
  logoText: '',
  deliveryDays: 7,
  url: '',
  remark: '',
});

// ===== 加载客户列表 =====
const loadCustomers = async () => {
  try {
    const res = await getCustomerList({ includeInactive: false });
    customerList.value = res?.data || [];
  } catch {
    customerList.value = [];
  }
};

// ===== Excel导入 =====
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

      // 解析数据
      const parsedData = jsonData.map((row) => ({
        orderDate: row['订单日期'] || row['orderDate'] || new Date().toISOString().split('T')[0],
        productName: row['品名'] || row['productName'] || '',
        customerId: row['客户ID'] || row['customerId'] || userStore.customerId || null,
        customerName: row['客户'] || row['customerName'] || userStore.customerName || '',
        size: row['手寸/长度'] || row['size'] || '',
        widthThick: row['宽/厚度'] || row['widthThick'] || '',
        quantity: Number(row['数量'] || row['quantity'] || 1),
        color: row['成色'] || row['color'] || 'K黄',
        goldPrice: Number(row['金价'] || row['goldPrice'] || 0),
        diamondLevel: row['钻石级别'] || row['diamondLevel'] || '',
        weightRequirement: row['克重要求'] || row['weightRequirement'] || '',
        logoText: row['LOGO'] || row['logoText'] || '',
        deliveryDays: Number(row['工期'] || row['deliveryDays'] || 7),
        url: row['网址'] || row['url'] || '',
        remark: row['备注'] || row['remark'] || '',
      }));

      tableData.value = parsedData;
      ElMessage.success(`成功解析 ${parsedData.length} 条数据`);
    } catch (error) {
      console.error('解析失败:', error);
      ElMessage.error('解析Excel失败，请检查格式');
    }
  };
  reader.readAsArrayBuffer(file.raw);
  fileList.value = [];
};

const handleFileRemove = () => {
  tableData.value = [];
};

// ===== 表格操作 =====
const addRow = () => {
  tableData.value.push(getDefaultRow());
};

const removeRow = (index) => {
  if (tableData.value.length <= 1) {
    ElMessage.warning('至少保留一行');
    return;
  }
  tableData.value.splice(index, 1);
};

const clearAll = () => {
  ElMessageBox.confirm('确定要清空所有数据吗？', '提示', { type: 'warning' }).then(() => {
    tableData.value = [];
    addRow();
    ElMessage.success('已清空');
  }).catch(() => {});
};

// ===== 保存全部 =====
const handleSaveAll = async () => {
  // 校验
  const invalid = tableData.value.some(row => !row.productName);
  if (invalid) {
    ElMessage.warning('请填写完整信息（品名不能为空）');
    return;
  }

  saving.value = true;
  try {
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const row of tableData.value) {
      // 如果客户为空，使用当前登录客户
      const customerId = row.customerId || userStore.customerId;
      if (!customerId) {
        failCount++;
        errors.push(`${row.productName}: 未选择客户`);
        continue;
      }

      const payload = {
        orderDate: row.orderDate,
        customerId: customerId,
        customerName: row.customerName || userStore.customerName || '客户',
        productName: row.productName,
        size: row.size || '',
        widthThick: row.widthThick || '',
        quantity: row.quantity || 1,
        color: row.color || 'K黄',
        goldPrice: row.goldPrice || 0,
        diamondLevel: row.diamondLevel || '',
        weightRequirement: row.weightRequirement || '',
        logoText: row.logoText || '',
        deliveryDays: row.deliveryDays || 7,
        url: row.url || '',
        remark: row.remark || '',
        flowStatus: 'pending',
      };

      try {
        await createOrder(payload);
        successCount++;
      } catch {
        failCount++;
        errors.push(`${row.productName}: 保存失败`);
      }
    }

    if (successCount > 0 && failCount === 0) {
      ElMessage.success(`全部 ${successCount} 条导入成功`);
      tableData.value = [];
      addRow();
    } else if (successCount > 0 && failCount > 0) {
      ElMessage.warning(`成功 ${successCount} 条，失败 ${failCount} 条`);
      console.error('失败详情:', errors.join('; '));
    } else {
      ElMessage.error(`全部失败：${errors.join('; ')}`);
    }
  } catch {
    ElMessage.error('保存失败');
  } finally {
    saving.value = false;
  }
};

// ===== 下载模板 =====
const downloadTemplate = () => {
  // 创建模板数据
  const templateData = [{
    '订单日期': '2026-08-04',
    '品名': '戒指',
    '客户ID': 1,
    '客户': '周大福珠宝',
    '手寸/长度': '16',
    '宽/厚度': '2.5',
    '数量': 1,
    '成色': 'K黄',
    '金价': 693.00,
    '钻石级别': 'VS',
    '克重要求': '2.5-3.0g',
    'LOGO': '周大福',
    '工期': 7,
    '网址': 'https://example.com',
    '备注': '加急'
  }];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateData);
  XLSX.utils.book_append_sheet(wb, ws, '订单导入');
  XLSX.writeFile(wb, '订单导入模板.xlsx');

  ElMessage.success('模板下载成功');
};

// ===== 初始化 =====
onMounted(() => {
  loadCustomers();
  // 默认添加一行空行
  tableData.value.push(getDefaultRow());
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

.upload-card,
.data-card {
  background: #fff;
}

.upload-card :deep(.el-card__body) {
  padding: 24px;
}
.data-card :deep(.el-card__body) {
  padding: 16px;
}

:deep(.el-upload-dragger) {
  width: 100%;
  padding: 40px 20px;
}

.table-wrapper {
  overflow-x: auto;
}

:deep(.el-table .cell) {
  padding: 2px 4px;
}
:deep(.el-input-number) {
  width: 100%;
}
:deep(.el-input-number .el-input__inner) {
  text-align: center;
}
</style>