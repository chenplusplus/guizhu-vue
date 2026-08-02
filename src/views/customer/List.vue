<!-- src/views/customer/list.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>客户管理</h2>
      <el-button type="primary" @click="showAddDialog = true">新增客户</el-button>
    </div>

    <!-- 搜索 -->
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="客户名称/编号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.isActive" placeholder="全部" clearable>
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格 -->
    <el-table :data="tableData" v-loading="loading" border stripe>
      <el-table-column prop="customerNo" label="客户编号" width="150" />
      <el-table-column prop="customerName" label="客户名称" width="150" />
      <el-table-column prop="contactPerson" label="联系人" width="100" />
      <el-table-column prop="contactPhone" label="联系电话" width="120" />
      <el-table-column prop="level" label="等级" width="80" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'danger'">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="orderCount" label="订单数" width="80" />
      <el-table-column prop="totalAmount" label="总金额" width="120" align="right" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" plain @click="editCustomer(row)">编辑</el-button>
          <el-button size="small" :type="row.isActive ? 'warning' : 'success'" plain @click="toggleActive(row)">
            {{ row.isActive ? '禁用' : '启用' }}
          </el-button>
          <el-button size="small" type="danger" plain @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="pagination.current"
      v-model:page-size="pagination.pageSize"
      :total="pagination.total"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="loadData"
      @current-change="loadData"
      style="margin-top: 16px; justify-content: flex-end"
    />

    <!-- 新增/编辑对话框 -->
    <el-dialog :title="dialogTitle" v-model="showAddDialog" width="500px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="客户名称" prop="customerName">
          <el-input v-model="form.customerName" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="联系人" prop="contactPerson">
          <el-input v-model="form.contactPerson" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="contactPhone">
          <el-input v-model="form.contactPhone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="等级" prop="level">
          <el-select v-model="form.level" placeholder="请选择等级" style="width: 100%">
            <el-option label="普通" value="普通" />
            <el-option label="VIP" value="VIP" />
            <el-option label="SVIP" value="SVIP" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 导入 API（重命名避免冲突）
import { 
  getCustomerList as apiGetCustomerList,
  createCustomer as apiCreateCustomer,
  updateCustomer as apiUpdateCustomer,
  deleteCustomer as apiDeleteCustomer,
  toggleCustomerActive as apiToggleCustomerActive
} from '@/api/customer';

const loading = ref(false);
const submitting = ref(false);
const showAddDialog = ref(false);
const formRef = ref(null);
const isEdit = ref(false);

const searchForm = reactive({
  keyword: '',
  isActive: null,
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const tableData = ref([]);

const form = reactive({
  customerId: 0,
  customerName: '',
  contactPerson: '',
  contactPhone: '',
  address: '',
  level: '普通',
  remark: '',
});

const rules = {
  customerName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
};

const dialogTitle = computed(() => isEdit.value ? '编辑客户' : '新增客户');

const loadData = async () => {
  loading.value = true;
  try {
    const res = await apiGetCustomerList({
      keyword: searchForm.keyword || undefined,
      includeInactive: searchForm.isActive === 0,
      page: pagination.current,
      pageSize: pagination.pageSize,
    });
    tableData.value = res?.data?.items || res?.data || [];
    pagination.total = res?.data?.total || tableData.value.length;
  } catch {
    // 模拟数据
    tableData.value = [
      { customerId: 1, customerNo: 'C20260101001', customerName: '周大福珠宝', contactPerson: '张经理', contactPhone: '13800000001', level: 'VIP', isActive: true, orderCount: 15, totalAmount: 128000 },
      { customerId: 2, customerNo: 'C20260101002', customerName: '老凤祥珠宝', contactPerson: '李总', contactPhone: '13800000002', level: '普通', isActive: true, orderCount: 8, totalAmount: 56000 },
    ];
    pagination.total = tableData.value.length;
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  searchForm.keyword = '';
  searchForm.isActive = null;
  pagination.current = 1;
  loadData();
};

const editCustomer = (row) => {
  isEdit.value = true;
  Object.assign(form, row);
  showAddDialog.value = true;
};

const toggleActive = async (row) => {
  try {
    await apiToggleCustomerActive(row.customerId, !row.isActive);
    ElMessage.success('操作成功');
    loadData();
  } catch {
    ElMessage.error('操作失败');
  }
};

// 重命名为 handleDelete 避免冲突
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除客户 ${row.customerName} 吗？`, '提示', { type: 'warning' });
    await apiDeleteCustomer(row.customerId);
    ElMessage.success('删除成功');
    loadData();
  } catch {
    // 用户取消删除
  }
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      if (isEdit.value) {
        await apiUpdateCustomer(form);
        ElMessage.success('更新成功');
      } else {
        await apiCreateCustomer(form);
        ElMessage.success('创建成功');
      }
      showAddDialog.value = false;
      loadData();
    } catch {
      ElMessage.error('操作失败');
    } finally {
      submitting.value = false;
    }
  });
};

onMounted(() => {
  loadData();
});
</script>