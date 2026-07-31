<template>
  <div class="page-container">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon> 新增用户
      </el-button>
    </div>

    <div class="search-bar">
      <el-form :model="search" inline>
        <el-form-item>
          <el-input v-model="search.keyword" placeholder="搜索用户名/姓名" clearable @clear="loadData" @keyup.enter="loadData" style="width:200px;" />
        </el-form-item>
        <el-form-item>
          <el-select v-model="search.userType" clearable placeholder="用户类型" @change="loadData" style="width:150px;">
            <el-option v-for="t in userTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading" style="width:100%;">
      <el-table-column prop="userId" label="ID" width="70" />
      <el-table-column prop="username" label="用户名" width="140" />
      <el-table-column prop="realName" label="姓名" width="120" />
      <el-table-column prop="userTypeLabel" label="用户类型" width="140">
        <template #default="{ row }">
          <el-tag :type="userTypeTag(row.userType)" size="small">{{ row.userTypeLabel }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="所属客户" min-width="140">
        <template #default="{ row }">
          <span v-if="row.customerName">{{ row.customerName }}</span>
          <span v-else style="color:#ccc;">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="role" label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="roleTag(row.role)" size="small">{{ row.role }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isActive" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right" align="center">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="warning" @click="resetPwd(row)">重置密码</el-button>
          <el-button size="small" type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" layout="total, sizes, prev, pager, next" @size-change="loadData" @current-change="loadData" />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editId ? '编辑用户' : '新增用户'" width="560px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="!!editId" placeholder="请输入用户名" />
        </el-form-item>

        <el-form-item v-if="!editId" label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>

        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入真实姓名" />
        </el-form-item>

        <el-form-item label="用户类型" prop="userType">
          <el-select v-model="form.userType" @change="onUserTypeChange" style="width:100%;">
            <el-option v-for="t in userTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
          <div style="font-size:12px;color:#909399;margin-top:4px;">
            {{ userTypeHint(form.userType) }}
          </div>
        </el-form-item>

        <el-form-item v-if="form.userType !== 'admin'" label="所属客户" prop="customerId">
          <el-select v-model="form.customerId" filterable placeholder="请选择客户" style="width:100%;">
            <el-option v-for="c in customers" :key="c.customerId" :label="c.customerName" :value="c.customerId" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="editId" label="状态">
          <el-switch v-model="form.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { userApi } from '@/api/user'
import { customerApi } from '@/api/customer'
import dayjs from 'dayjs'

const loading = ref(false)
const submitting = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const dialogVisible = ref(false)
const editId = ref(null)
const formRef = ref()
const customers = ref([])
const userTypes = ref([])

const search = reactive({ keyword: '', userType: '' })
const form = reactive({ username: '', password: '', realName: '', userType: 'customer', customerId: null, isActive: true })

const rules = computed(() => ({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: editId.value ? [] : [{ required: true, message: '请输入密码', trigger: 'blur' }],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  userType: [{ required: true, message: '请选择用户类型', trigger: 'change' }],
  customerId: form.userType !== 'admin' ? [{ required: true, message: '请选择所属客户', trigger: 'change' }] : []
}))

const userTypeTag = (type) => {
  const map = { customer: 'success', customerAudit: 'warning', factoryOrder: 'primary', factoryAudit: 'warning', admin: 'danger' }
  return map[type] || 'info'
}

const roleTag = (role) => {
  const map = { Admin: 'danger', Auditor: 'warning', Operator: 'primary', Customer: 'success' }
  return map[role] || 'info'
}

const userTypeHint = (type) => {
  const hints = {
    customer: '客户：可以下单、查看自己的订单、确认账单',
    customerAudit: '客户审核员：审核自己公司的订单、确认账单',
    factoryOrder: '工厂业务员：查看所有订单、制作管理、生成账单',
    factoryAudit: '工厂审核员：审核所有订单、审核账单',
    admin: '管理员：全部权限'
  }
  return hints[type] || ''
}

const loadUserTypes = async () => {
  try {
    const data = await userApi.types()
    userTypes.value = data || []
  } catch {
    userTypes.value = []
  }
}

const loadCustomers = async () => {
  try {
    customers.value = await customerApi.list({ includeInactive: false })
  } catch {
    customers.value = []
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const data = await userApi.list({ keyword: search.keyword, userType: search.userType })
    tableData.value = data || []
    total.value = data?.length || 0
  } catch { ElMessage.error('加载失败') } finally { loading.value = false }
}

const resetSearch = () => { search.keyword = ''; search.userType = ''; page.value = 1; loadData() }
const openCreate = () => { editId.value = null; resetForm(); dialogVisible.value = true }
const openEdit = async (row) => {
  editId.value = row.userId
  const data = await userApi.get(row.userId)
  Object.assign(form, { username: data.username, realName: data.realName, userType: data.userType, customerId: data.customerId, isActive: data.isActive })
  dialogVisible.value = true
}
const onUserTypeChange = () => { if (form.userType === 'admin') form.customerId = null }
const resetForm = () => {
  formRef.value?.resetFields()
  Object.assign(form, { username: '', password: '', realName: '', userType: 'customer', customerId: null, isActive: true })
}
const submit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (editId.value) {
      await userApi.update({ userId: editId.value, username: form.username, realName: form.realName, userType: form.userType, customerId: form.customerId, isActive: form.isActive })
      ElMessage.success('更新成功')
    } else {
      await userApi.create({ username: form.username, password: form.password, realName: form.realName, userType: form.userType, customerId: form.customerId })
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (error) { ElMessage.error(error.response?.data?.message || '操作失败') } finally { submitting.value = false }
}
const resetPwd = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入新密码', '重置密码', { inputType: 'password', inputPlaceholder: '请输入新密码' })
    if (value) { await userApi.resetPassword(row.userId, value); ElMessage.success('密码重置成功') }
  } catch {}
}
const del = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除用户 ${row.username}？`, '删除确认', { type: 'warning' })
    await userApi.delete(row.userId)
    ElMessage.success('删除成功')
    loadData()
  } catch {}
}
onMounted(() => { loadUserTypes(); loadCustomers(); loadData() })
</script>

<style scoped>
.page-container { padding: 20px; background: #f5f7fa; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 20px; font-weight: 600; color: #1d2129; margin: 0; }
.search-bar { background: #fff; padding: 16px 20px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.el-table { background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; background: #fff; padding: 12px 20px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
</style>