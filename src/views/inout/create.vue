<!-- src/views/inout/create.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>{{ isEdit ? '✏️ 编辑记录' : '📝 新增记录' }}</h2>
        <el-tag v-if="isEdit" type="warning" size="large">编辑中</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSave" :loading="saving">
        <el-icon><Check /></el-icon> 保存草稿
      </el-button>
      <el-button type="success" @click="handleSubmitDirect" :loading="submitting">
        <el-icon><Select /></el-icon> 提交审核
      </el-button>
      </div>
    </div>

    <div class="content-body">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="日期" prop="recordDate">
              <el-date-picker
                v-model="form.recordDate"
                type="date"
                value-format="YYYY-MM-DD"
                style="width:100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="方向" prop="direction">
              <el-select v-model="form.direction" style="width:100%;">
                <el-option label="收入" value="in" />
                <el-option label="支出" value="out" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="8">
            <el-form-item label="分类" prop="category">
              <el-input v-model="form.category" placeholder="如：金料、钻石" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="颜色" prop="color">
              <el-select v-model="form.color" style="width:100%;">
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
            <el-form-item label="客户">
              <el-select
                v-model="form.customerId"
                placeholder="选择客户"
                clearable
                filterable
                style="width:100%;"
              >
                <el-option
                  v-for="item in customerList"
                  :key="item.customerId"
                  :label="item.customerName"
                  :value="item.customerId"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="重量(g)" prop="weight">
              <el-input-number v-model="form.weight" :precision="3" :min="0" style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="金额(元)" prop="amount">
              <el-input-number v-model="form.amount" :precision="2" :min="0" style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="关联订单号">
              <el-input v-model="form.orderNo" placeholder="选填" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="关联账单号">
              <el-input v-model="form.billNo" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="选填" />
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Check, Select } from '@element-plus/icons-vue';
import { createInout, updateInout, getInoutDetail, submitInout } from '@/api/inout';
import { getCustomerList } from '@/api/customer';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const saving = ref(false);
const submitting = ref(false);
const isEdit = ref(false);
const formRef = ref();
const customerList = ref([]);

const form = reactive({
  recordDate: new Date().toISOString().split('T')[0],
  direction: 'in',
  category: '',
  color: 'K黄',
  customerId: null,
  customerName: '',
  weight: 0,
  amount: 0,
  orderNo: '',
  billNo: '',
  remark: ''
});

const rules = {
  recordDate: [{ required: true, message: '请选择日期' }],
  direction: [{ required: true, message: '请选择方向' }],
  category: [{ required: true, message: '请输入分类' }]
};

// ===== 加载客户 =====
const loadCustomers = async () => {
  try {
    const res = await getCustomerList({ includeInactive: false });
    customerList.value = res?.data || [];
  } catch {
    customerList.value = [];
  }
};

// ===== 加载编辑数据 =====
const loadData = async () => {
  const id = route.query.id;
  if (!id) return;
  isEdit.value = true;
  loading.value = true;
  try {
    const res = await getInoutDetail(id);
    const data = res?.data;
    if (data) {
      Object.assign(form, {
        recordDate: data.recordDate?.split('T')[0] || '',
        direction: data.direction || 'in',
        category: data.category || '',
        color: data.color || 'K黄',
        customerId: data.customerId || null,
        customerName: data.customerName || '',
        weight: data.weight || 0,
        amount: data.amount || 0,
        orderNo: data.orderNo || '',
        billNo: data.billNo || '',
        remark: data.remark || ''
      });
    }
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

// ===== 保存 =====
const handleSave = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      const payload = { ...form };
      if (isEdit.value) {
        payload.id = parseInt(route.query.id);
        await updateInout(payload);
      } else {
        await createInout(payload);
      }
      ElMessage.success('保存成功');
      router.push('/inout/list');
    } catch {
      ElMessage.error('保存失败');
    } finally {
      saving.value = false;
    }
  });
};

// ===== 提交审核 =====

const handleSubmitDirect = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    try {
      await ElMessageBox.confirm('确认提交审核吗？提交后将不可再编辑。', '提示', { type: 'info' });
    } catch { return; }

    submitting.value = true;
    try {
      let id = route.query.id;
      
      // 如果是新建，先保存再提交
      if (!id) {
        const payload = { ...form };
        const createRes = await createInout(payload);
        id = createRes.id;
      } else {
        // 如果是编辑，先更新再提交
        const payload = { ...form, id: parseInt(id) };
        await updateInout(payload);
      }
      
      // 提交审核
      await submitInout(id);
      ElMessage.success('提交审核成功');
      router.push('/inout/list');
    } catch (error) {
      ElMessage.error(error.message || '提交失败');
    } finally {
      submitting.value = false;
    }
  });
};
onMounted(() => {
  loadCustomers();
  loadData();
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
  padding: 14px 20px;
  border-radius: 8px 8px 0 0;
  flex-wrap: wrap;
  gap: 10px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.header-left h2 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}
.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.content-body {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 20px 24px;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}
:deep(.el-input-number) {
  width: 100%;
}
</style>