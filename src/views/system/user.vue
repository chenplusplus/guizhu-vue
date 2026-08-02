<!-- src/views/system/user.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="showAddDialog = true">新增用户</el-button>
    </div>

    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="用户名/姓名" clearable />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.userType" placeholder="全部" clearable>
            <el-option label="客户下单员" value="customer" />
            <el-option label="客户审核员" value="customerAudit" />
            <el-option label="工厂操作员" value="factoryOrder" />
            <el-option label="工厂审核员" value="factoryAudit" />
            <el-option label="管理员" value="admin" />
          </el-select>
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

    <el-table :data="tableData" v-loading="loading" border stripe>
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="realName" label="姓名" width="100" />
      <el-table-column prop="phone" label="手机号" width="120" />
      <el-table-column prop="userTypeName" label="角色" width="120" />
      <el-table-column prop="customerName" label="所属客户" width="120" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'danger'">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="160" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" plain @click="editUser(row)">编辑</el-button>
          <el-button size="small" type="warning" plain @click="handleResetPassword(row)">重置密码</el-button>
          <el-button size="small" :type="row.isActive ? 'warning' : 'success'" plain @click="handleToggleActive(row)">
            {{ row.isActive ? '禁用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

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
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input v-model="form.password" placeholder="默认 123456" show-password />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="角色" prop="userType">
          <el-select v-model="form.userType" placeholder="请选择角色" style="width: 100%">
            <el-option label="客户下单员" value="customer" />
            <el-option label="客户审核员" value="customerAudit" />
            <el-option label="工厂操作员" value="factoryOrder" />
            <el-option label="工厂审核员" value="factoryAudit" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属客户" prop="customerId" v-if="form.userType && form.userType !== 'admin'">
          <el-select v-model="form.customerId" placeholder="请选择客户" style="width: 100%" filterable>
            <el-option
              v-for="item in customerList"
              :key="item.customerId"
              :label="item.customerName"
              :value="item.customerId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="isActive">
          <el-switch v-model="form.isActive" active-text="启用" inactive-text="禁用" />
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
  getUserList as apiGetUserList,
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  resetUserPassword as apiResetUserPassword,
  toggleUserActive as apiToggleUserActive
} from '@/api/user';
import { getCustomerList as apiGetCustomerList } from '@/api/customer';

const loading = ref(false);
const submitting = ref(false);
const showAddDialog = ref(false);
const formRef = ref(null);
const isEdit = ref(false);
const customerList = ref([]);

const searchForm = reactive({
  keyword: '',
  userType: '',
  isActive: null,
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const tableData = ref([]);

const form = reactive({
  userId: 0,
  username: '',
  password: '',
  realName: '',
  phone: '',
  userType: '',
  customerId: null,
  isActive: true,
});

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  userType: [{ required: true, message: '请选择角色', trigger: 'change' }],
};

const dialogTitle = computed(() => isEdit.value ? '编辑用户' : '新增用户');

const loadData = async () => {
  loading.value = true;
  try {
    const res = await apiGetUserList({
      keyword: searchForm.keyword || undefined,
      userType: searchForm.userType || undefined,
      isActive: searchForm.isActive !== null ? !!searchForm.isActive : undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    });
    tableData.value = res?.data?.items || res?.data || [];
    pagination.total = res?.data?.total || tableData.value.length;
  } catch {
    tableData.value = [
      { userId: 1, username: 'admin', realName: '管理员', phone: '13900000001', userType: 'admin', userTypeName: '管理员', customerName: null, isActive: true, createdAt: '2026-01-01 10:00:00' },
      { userId: 2, username: 'zhangfei', realName: '张飞', phone: '13800000011', userType: 'customer', userTypeName: '客户下单员', customerName: '周大福珠宝', isActive: true, createdAt: '2026-01-01 10:00:00' },
    ];
    pagination.total = tableData.value.length;
  } finally {
    loading.value = false;
  }
};

const loadCustomers = async () => {
  try {
    const res = await apiGetCustomerList({ includeInactive: false });
    customerList.value = res?.data || [];
  } catch {}
};

const resetSearch = () => {
  searchForm.keyword = '';
  searchForm.userType = '';
  searchForm.isActive = null;
  pagination.current = 1;
  loadData();
};

const editUser = (row) => {
  isEdit.value = true;
  Object.assign(form, row);
  showAddDialog.value = true;
};

const handleResetPassword = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要重置用户 ${row.realName} 的密码为 123456 吗？`, '提示', { type: 'warning' });
    await apiResetUserPassword(row.userId, '123456');
    ElMessage.success('密码已重置为 123456');
  } catch {
    // 用户取消
  }
};

const handleToggleActive = async (row) => {
  try {
    await apiToggleUserActive(row.userId, !row.isActive);
    ElMessage.success('操作成功');
    loadData();
  } catch {
    ElMessage.error('操作失败');
  }
};

const submitForm = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      if (isEdit.value) {
        await apiUpdateUser(form);
        ElMessage.success('更新成功');
      } else {
        await apiCreateUser(form);
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
  loadCustomers();
});
</script>