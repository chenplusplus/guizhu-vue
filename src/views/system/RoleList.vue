<template>
  <div class="page-container">
    <div class="page-header">
      <h2>角色管理</h2>
      <el-button type="primary" @click="showDialog = true">
        <el-icon><Plus /></el-icon> 新增角色
      </el-button>
    </div>

    <!-- 搜索 -->
    <el-form :model="search" inline class="search-form">
      <el-form-item>
        <el-input v-model="search.keyword" placeholder="搜索角色名称/编码" clearable @clear="loadData" @keyup.enter="loadData" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData">查询</el-button>
      </el-form-item>
    </el-form>

    <!-- 表格 -->
    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="roleId" label="ID" width="80" />
      <el-table-column prop="roleName" label="角色名称" width="150" />
      <el-table-column prop="roleCode" label="角色编码" width="150" />
      <el-table-column prop="description" label="描述" min-width="150" />
      <el-table-column prop="isSystem" label="系统角色" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isSystem ? 'danger' : 'info'" size="small">
            {{ row.isSystem ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="isActive" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
            {{ row.isActive ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="edit(row)">编辑</el-button>
          <el-button size="small" type="primary" @click="assignMenus(row)">分配菜单</el-button>
          <el-button
            v-if="!row.isSystem"
            size="small"
            type="danger"
            @click="del(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ===== 新增/编辑弹窗 ===== -->
    <el-dialog v-model="showDialog" :title="editId ? '编辑角色' : '新增角色'" width="500px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="roleCode">
          <el-input v-model="form.roleCode" placeholder="请输入角色编码" :disabled="!!editId" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="状态" v-if="editId">
          <el-switch v-model="form.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>

    <!-- ===== 分配菜单弹窗 ===== -->
    <el-dialog v-model="menuDialogVisible" title="分配菜单权限" width="600px">
      <el-tree
        ref="menuTreeRef"
        :data="menuTree"
        show-checkbox
        node-key="menuId"
        default-expand-all
        :props="{ label: 'menuName', children: 'children' }"
      />
      <template #footer>
        <el-button @click="menuDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="menuSubmitting" @click="saveMenus">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick} from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { roleApi } from '@/api/role'
import { menuApi } from '@/api/menu'


const loading = ref(false)
const submitting = ref(false)
const menuSubmitting = ref(false)
const tableData = ref([])
const showDialog = ref(false)
const editId = ref(null)
const formRef = ref()

// 菜单树
const menuTree = ref([])
const menuDialogVisible = ref(false)
const menuTreeRef = ref()
const currentRoleId = ref(null)

const search = reactive({ keyword: '' })

const form = reactive({
  roleName: '',
  roleCode: '',
  description: '',
  isActive: true
})

const rules = {
  roleName: [{ required: true, message: '请输入角色名称' }],
  roleCode: [{ required: true, message: '请输入角色编码' }]
}

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true
  try {
    tableData.value = await roleApi.list(search)
  } finally {
    loading.value = false
  }
}

// ===== 加载菜单树 =====
const loadMenuTree = async () => {
  try {
    menuTree.value = await menuApi.tree()
  } catch {
    menuTree.value = []
  }
}

// ===== 新增/编辑 =====
const resetForm = () => {
  editId.value = null
  formRef.value?.resetFields()
  Object.assign(form, { roleName: '', roleCode: '', description: '', isActive: true })
}

const edit = async (row) => {
  editId.value = row.roleId
  Object.assign(form, { ...row })
  showDialog.value = true
}

const submit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (editId.value) {
      await roleApi.update(form)
      ElMessage.success('更新成功')
    } else {
      await roleApi.create(form)
      ElMessage.success('创建成功')
    }
    showDialog.value = false
    loadData()
  } finally {
    submitting.value = false
  }
}

const del = async (row) => {
  await ElMessageBox.confirm(`确认删除角色 "${row.roleName}"？`, '提示', { type: 'warning' })
  await roleApi.delete(row.roleId)
  ElMessage.success('删除成功')
  loadData()
}

// ===== 分配菜单 =====
const assignMenus = async (row) => {
  currentRoleId.value = row.roleId
  menuDialogVisible.value = true

  // 加载菜单树
  await loadMenuTree()

  // 获取角色已有菜单
  const checkedIds = await roleApi.getRoleMenus(row.roleId)

  // 设置选中
  await nextTick()
  menuTreeRef.value?.setCheckedKeys(checkedIds || [])
}

const saveMenus = async () => {
  const checkedKeys = menuTreeRef.value?.getCheckedKeys() || []
  const halfCheckedKeys = menuTreeRef.value?.getHalfCheckedKeys() || []
  const allKeys = [...checkedKeys, ...halfCheckedKeys]

  menuSubmitting.value = true
  try {
    await roleApi.saveRoleMenus({
      roleId: currentRoleId.value,
      menuIds: allKeys
    })
    ElMessage.success('菜单权限保存成功')
    menuDialogVisible.value = false
  } finally {
    menuSubmitting.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.search-form { background: #f5f7fa; padding: 16px 20px; border-radius: 6px; margin-bottom: 16px; }
</style>