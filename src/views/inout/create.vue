<!-- src/views/inout/create.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📝 总进出录入</h2>
        <el-tag v-if="isEdit" type="warning" size="large">编辑</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          <el-icon><Check /></el-icon> 保存
        </el-button>
      </div>
    </div>

    <el-card>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" size="default">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="日期" prop="recordDate">
              <el-date-picker
                v-model="form.recordDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                style="width:100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="方向" prop="direction">
              <el-select v-model="form.direction" placeholder="请选择方向" style="width:100%;">
                <el-option label="收入" value="in" />
                <el-option label="支出" value="out" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="品类" prop="category">
              <el-input v-model="form.category" placeholder="请输入品类" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="成色" prop="color">
              <el-select v-model="form.color" placeholder="请选择成色" style="width:100%;" clearable>
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

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="重量(g)" prop="weight">
              <el-input-number
                v-model="form.weight"
                :precision="3"
                :min="0"
                placeholder="0.000"
                style="width:100%;"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="金额(元)" prop="amount">
              <el-input-number
                v-model="form.amount"
                :precision="2"
                :min="0"
                placeholder="0.00"
                style="width:100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户">
              <el-select
                v-model="form.customerId"
                placeholder="请选择客户"
                style="width:100%;"
                filterable
                clearable
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
          <el-col :span="12">
            <el-form-item label="客户名称">
              <el-input v-model="form.customerName" placeholder="客户名称（自动带出）" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="关联订单号">
              <el-input v-model="form.orderNo" placeholder="请输入关联订单号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联账单号">
              <el-input v-model="form.billNo" placeholder="请输入关联账单号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Check } from '@element-plus/icons-vue';
import { getCustomerList } from '@/api/customer';
import { createInout, updateInout, getInoutDetail } from '@/api/inout';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const submitting = ref(false);
const formRef = ref();
const isEdit = ref(false);
const customerList = ref([]);

const form = reactive({
  recordDate: new Date().toISOString().split('T')[0],
  direction: 'in',
  category: '',
  color: '',
  weight: 0,
  amount: 0,
  customerId: null,
  customerName: '',
  orderNo: '',
  billNo: '',
  remark: '',
});

const rules = {
  recordDate: [{ required: true, message: '请选择日期' }],
  direction: [{ required: true, message: '请选择方向' }],
  category: [{ required: true, message: '请输入品类' }],
  weight: [{ required: true, message: '请输入重量' }],
  amount: [{ required: true, message: '请输入金额' }],
};

// 加载客户列表
const loadCustomers = async () => {
  try {
    const res = await getCustomerList({ includeInactive: false });
    customerList.value = res?.data || [];
  } catch {
    customerList.value = [];
  }
};

// 加载编辑数据
const loadDetail = async () => {
  const id = route.params.id;
  if (!id) return;

  isEdit.value = true;
  loading.value = true;
  try {
    const res = await getInoutDetail(id);
    const data = res?.data;
    if (data) {
      Object.assign(form, {
        ...data,
        recordDate: data.recordDate?.split('T')[0] || '',
      });
    }
  } catch {
    ElMessage.error('加载数据失败');
    router.back();
  } finally {
    loading.value = false;
  }
};

// ⭐ watch 现在已导入，可以正常使用
watch(() => form.customerId, (val) => {
  if (val) {
    const found = customerList.value.find(c => c.customerId === val);
    form.customerName = found?.customerName || '';
  } else {
    form.customerName = '';
  }
});

// 提交
const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    submitting.value = true;
    try {
      if (isEdit.value) {
        await updateInout({ ...form, id: parseInt(route.params.id) });
        ElMessage.success('更新成功');
      } else {
        await createInout(form);
        ElMessage.success('创建成功');
        // 重置表单
        form.recordDate = new Date().toISOString().split('T')[0];
        form.direction = 'in';
        form.category = '';
        form.color = '';
        form.weight = 0;
        form.amount = 0;
        form.customerId = null;
        form.customerName = '';
        form.orderNo = '';
        form.billNo = '';
        form.remark = '';
        formRef.value.resetFields();
      }
    } catch {
      ElMessage.error('操作失败');
    } finally {
      submitting.value = false;
    }
  });
};

onMounted(() => {
  loadCustomers();
  loadDetail();
});
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }

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
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h2 { font-size: 18px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; }

:deep(.el-card__body) { padding: 24px; }
:deep(.el-form-item) { margin-bottom: 18px; }
</style>