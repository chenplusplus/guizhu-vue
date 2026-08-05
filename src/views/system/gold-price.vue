<!-- src/views/system/gold-price.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>💰 金价管理</h2>
      <el-button type="primary" @click="openDialog()">
        <el-icon><Plus /></el-icon> 新增金价
      </el-button>
    </div>

    <!-- 搜索 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="成色">
          <el-select v-model="filterColor" placeholder="全部成色" clearable style="width:140px;" @change="loadData">
            <el-option label="K黄" value="K黄" />
            <el-option label="K白" value="K白" />
            <el-option label="红" value="红" />
            <el-option label="P1" value="P1" />
            <el-option label="9K" value="9K" />
            <el-option label="14K" value="14K" />
            <el-option label="银" value="银" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="filterColor = ''; loadData()">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="color" label="成色" width="120" />
      <el-table-column prop="price" label="金价(元/克)" width="150" align="right">
        <template #default="{ row }">{{ row.price.toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="effectiveDate" label="生效日期" width="120" align="center">
        <template #default="{ row }">{{ formatDate(row.effectiveDate) }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center">
        <template #default="{ row }">
          <el-button size="small" type="warning" link @click="openDialog(row)">编辑</el-button>
          <el-button size="small" type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="450px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="成色" prop="color">
          <el-select v-model="form.color" placeholder="请选择成色" style="width:100%;" :disabled="!!editId">
            <el-option label="K黄" value="K黄" />
            <el-option label="K白" value="K白" />
            <el-option label="红" value="红" />
            <el-option label="P1" value="P1" />
            <el-option label="9K" value="9K" />
            <el-option label="14K" value="14K" />
            <el-option label="银" value="银" />
          </el-select>
        </el-form-item>
        <el-form-item label="金价" prop="price">
          <el-input-number v-model="form.price" :precision="2" :min="0" style="width:100%;" />
        </el-form-item>
        <el-form-item label="生效日期" prop="effectiveDate">
          <el-date-picker v-model="form.effectiveDate" type="date" value-format="YYYY-MM-DD" style="width:100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { getGoldPrices, createGoldPrice, updateGoldPrice, deleteGoldPrice } from '@/api/basedata';

const loading = ref(false);
const submitting = ref(false);
const tableData = ref([]);
const filterColor = ref('');
const dialogVisible = ref(false);
const editId = ref(null);
const formRef = ref();

const form = reactive({
  color: '',
  price: 0,
  effectiveDate: '',
});

const rules = {
  color: [{ required: true, message: '请选择成色' }],
  price: [{ required: true, message: '请输入金价' }],
  effectiveDate: [{ required: true, message: '请选择生效日期' }],
};

const dialogTitle = computed(() => editId.value ? '编辑金价' : '新增金价');

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getGoldPrices({ color: filterColor.value || undefined });
    tableData.value = res?.data || [];
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const openDialog = (row) => {
  if (row) {
    editId.value = row.id;
    Object.assign(form, row);
  } else {
    editId.value = null;
    form.color = '';
    form.price = 0;
    form.effectiveDate = '';
  }
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      if (editId.value) {
        await updateGoldPrice({ ...form, id: editId.value });
        ElMessage.success('更新成功');
      } else {
        await createGoldPrice(form);
        ElMessage.success('创建成功');
      }
      dialogVisible.value = false;
      loadData();
    } catch {
      ElMessage.error('操作失败');
    } finally {
      submitting.value = false;
    }
  });
};

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除 ${row.color} 的金价？`, '提示', { type: 'warning' });
    await deleteGoldPrice(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch {}
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN', { hour12: false });
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.search-bar { background: #f5f7fa; padding: 16px 20px; border-radius: 6px; margin-bottom: 16px; }
.search-bar :deep(.el-form-item) { margin-bottom: 0; }
</style>