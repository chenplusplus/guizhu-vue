<!-- src/views/system/RoleList.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>🔑 角色管理</h2>
      <el-button type="primary" @click="showDialog = true">
        <el-icon><Plus /></el-icon> 新增角色
      </el-button>
    </div>

    <!-- 搜索 -->
    <el-form :model="search" inline class="search-form">
      <el-form-item>
        <el-input 
          v-model="search.keyword" 
          placeholder="搜索角色名称/编码" 
          clearable 
          @clear="loadData" 
          @keyup.enter="loadData"
          style="width: 240px;"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 表格 -->
    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="70" align="center" />
      <el-table-column prop="roleName" label="角色名称" width="140" />
      <el-table-column prop="roleCode" label="角色编码" width="160" />
      <el-table-column prop="description" label="描述" min-width="160" />
      <el-table-column prop="isSystem" label="系统角色" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isSystem ? 'danger' : 'info'" size="small">
            {{ row.isSystem ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="340" fixed="right" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="edit(row)">编辑</el-button>
          <el-button size="small" type="success" @click="assignMenus(row)">分配菜单</el-button>
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog 
      v-model="showDialog" 
      :title="editId ? '✏️ 编辑角色' : '➕ 新增角色'" 
      width="520px" 
      @close="resetForm"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="roleCode">
          <el-input 
            v-model="form.roleCode" 
            placeholder="请输入角色编码"
            :disabled="!!editId"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入角色描述" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" style="width:100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分配菜单弹窗 -->
    <el-dialog 
      v-model="menuDialogVisible" 
      title="📋 分配菜单权限" 
      width="600px"
      destroy-on-close
    >
      <div style="margin-bottom:12px;color:#909399;font-size:13px;">
        为 <b style="color:#409EFF;">{{ currentRoleName }}</b> 分配菜单权限
      </div>
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
        <el-button type="primary" :loading="menuSubmitting" @click="saveMenus">保存权限</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { roleApi } from '@/api/role';
import { menuApi } from '@/api/menu';

const loading = ref(false);
const submitting = ref(false);
const menuSubmitting = ref(false);
const tableData = ref([]);
const showDialog = ref(false);
const editId = ref(null);
const formRef = ref();

const menuTree = ref([]);
const menuDialogVisible = ref(false);
const menuTreeRef = ref();
const currentRoleId = ref(null);
const currentRoleName = ref('');

const search = reactive({ keyword: '' });

const form = reactive({
  roleName: '',
  roleCode: '',
  description: '',
  sortOrder: 0,
});

const rules = {
  roleName: [{ required: true, message: '请输入角色名称' }],
  roleCode: [{ required: true, message: '请输入角色编码' }],
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const res = await roleApi.list({ keyword: search.keyword || undefined });
    tableData.value = res?.data || res || [];
    if (!Array.isArray(tableData.value)) {
      tableData.value = [];
    }
  } catch (error) {
    ElMessage.error('加载角色列表失败');
    tableData.value = [];
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  search.keyword = '';
  loadData();
};

// ===== 新增/编辑 =====
const resetForm = () => {
  editId.value = null;
  formRef.value?.resetFields();
  Object.assign(form, {
    roleName: '',
    roleCode: '',
    description: '',
    sortOrder: 0,
  });
};

const edit = async (row) => {
  try {
    const res = await roleApi.get(row.id);
    const data = res?.data || res || {};
    editId.value = data.id;
    Object.assign(form, data);
    showDialog.value = true;
  } catch {
    ElMessage.error('获取角色信息失败');
  }
};

const submit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      if (editId.value) {
        await roleApi.update({ ...form, id: editId.value });
        ElMessage.success('更新成功');
      } else {
        await roleApi.create(form);
        ElMessage.success('创建成功');
      }
      showDialog.value = false;
      loadData();
    } catch (error) {
      ElMessage.error(error.message || '操作失败');
    } finally {
      submitting.value = false;
    }
  });
};

const del = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除角色 "${row.roleName}"？`, '提示', { type: 'warning' });
    await roleApi.delete(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch {}
};

// ===== 分配菜单 =====
const loadMenuTree = async () => {
  try {
    const res = await menuApi.tree();
    menuTree.value = res?.data || res || [];
    if (!Array.isArray(menuTree.value)) {
      menuTree.value = [];
    }
  } catch {
    menuTree.value = [];
  }
};

const assignMenus = async (row) => {
  currentRoleId.value = row.id;
  currentRoleName.value = row.roleName;
  menuDialogVisible.value = true;

  await loadMenuTree();

  try {
    const res = await roleApi.getRoleMenus(row.id);
    let menuIds = res?.data || res || [];
    if (!Array.isArray(menuIds)) {
      menuIds = [];
    }
    await nextTick();
    menuTreeRef.value?.setCheckedKeys(menuIds);
  } catch {
    // ignore
  }
};

const saveMenus = async () => {
  const checkedKeys = menuTreeRef.value?.getCheckedKeys() || [];
  const halfCheckedKeys = menuTreeRef.value?.getHalfCheckedKeys() || [];
  const allKeys = [...checkedKeys, ...halfCheckedKeys];

  menuSubmitting.value = true;
  try {
    await roleApi.saveRoleMenus({
      roleId: currentRoleId.value,
      menuIds: allKeys,
    });
    ElMessage.success('菜单权限保存成功');
    menuDialogVisible.value = false;
  } catch {
    ElMessage.error('保存失败');
  } finally {
    menuSubmitting.value = false;
  }
};

onMounted(loadData);
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
}
.page-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
.search-form {
  background: #f5f7fa;
  padding: 16px 20px;
  border-radius: 6px;
  margin-bottom: 16px;
}
.search-form :deep(.el-form-item) {
  margin-bottom: 0;
}
</style>