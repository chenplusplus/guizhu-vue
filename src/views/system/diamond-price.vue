<!-- src/views/system/diamond-price.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>💎 钻石价格区间</h2>
    </div>

    <el-alert
      title="钻石价格区间用于下单时校验，超出区间会预警"
      type="info"
      :closable="false"
      show-icon
      style="margin-bottom:16px;"
    />

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="level" label="钻石级别" width="150" />
      <el-table-column prop="minPrice" label="最低价(元/克拉)" width="200" align="right">
        <template #default="{ row }">{{ row.minPrice.toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="maxPrice" label="最高价(元/克拉)" width="200" align="right">
        <template #default="{ row }">{{ row.maxPrice.toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center">
        <template #default="{ row }">
          <el-button size="small" type="warning" link @click="openDialog(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" title="编辑钻石价格区间" width="450px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="140px">
        <el-form-item label="钻石级别">
          <el-input :value="form.level" disabled />
        </el-form-item>
        <el-form-item label="最低价(元/克拉)" prop="minPrice">
          <el-input-number v-model="form.minPrice" :precision="2" :min="0" style="width:100%;" />
        </el-form-item>
        <el-form-item label="最高价(元/克拉)" prop="maxPrice">
          <el-input-number v-model="form.maxPrice" :precision="2" :min="0" style="width:100%;" />
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
import { ElMessage } from 'element-plus';
import { getDiamondPrices, updateDiamondPrice } from '@/api/basedata';

const loading = ref(false);
const submitting = ref(false);
const tableData = ref([]);
const dialogVisible = ref(false);
const formRef = ref();

const form = reactive({
  id: null,
  level: '',
  minPrice: 0,
  maxPrice: 0,
});

const rules = {
  minPrice: [{ required: true, message: '请输入最低价' }],
  maxPrice: [{ required: true, message: '请输入最高价' }],
};

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getDiamondPrices();
    tableData.value = res?.data || [];
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const openDialog = (row) => {
  Object.assign(form, row);
  dialogVisible.value = true;
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      await updateDiamondPrice(form);
      ElMessage.success('更新成功');
      dialogVisible.value = false;
      loadData();
    } catch {
      ElMessage.error('操作失败');
    } finally {
      submitting.value = false;
    }
  });
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
</style>