<!-- src/views/system/MenuList.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h2>📂 菜单管理</h2>
      <el-button type="primary" @click="showDialog = true">
        <el-icon><Plus /></el-icon> 新增菜单
      </el-button>
    </div>

    <el-table
      :data="tableData"
      border
      stripe
      row-key="menuId"
      default-expand-all
    >
      <el-table-column prop="menuId" label="ID" width="80" />
      <el-table-column prop="menuName" label="菜单名称" min-width="150" />
      <el-table-column prop="menuPath" label="路由路径" width="180" />
      <el-table-column prop="menuIcon" label="图标" width="120">
        <template #default="{ row }">
          <span v-if="row.menuIcon">
            {{ row.menuIcon }}
          </span>
          <span v-else style="color:#ccc;">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="menuType" label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.menuType === 'menu' ? 'primary' : 'success'" size="small">
            {{ row.menuType === 'menu' ? '菜单' : '按钮' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="permissionCode" label="权限编码" width="180">
        <template #default="{ row }">
          <span v-if="row.permissionCode" style="font-family: monospace; font-size: 12px;">
            {{ row.permissionCode }}
          </span>
          <span v-else style="color:#ccc;">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
      <el-table-column prop="isVisible" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.isVisible ? 'success' : 'danger'" size="small">
            {{ row.isVisible ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="edit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ===== 新增/编辑弹窗 ===== -->
    <el-dialog v-model="showDialog" :title="editId ? '编辑菜单' : '新增菜单'" width="550px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="上级菜单">
          <el-select v-model="form.parentId" placeholder="请选择上级菜单" clearable>
            <el-option label="顶级菜单" :value="0" />
            <el-option
              v-for="item in menuOptions"
              :key="item.menuId"
              :label="item.menuName"
              :value="item.menuId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="菜单名称" prop="menuName">
          <el-input v-model="form.menuName" placeholder="请输入菜单名称" />
        </el-form-item>
        <el-form-item label="路由路径">
          <el-input v-model="form.menuPath" placeholder="如 /order" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.menuIcon" placeholder="如 📊" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="类型">
              <el-select v-model="form.menuType" style="width:100%;">
                <el-option label="菜单" value="menu" />
                <el-option label="按钮" value="button" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="form.sortOrder" :min="0" style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="权限编码">
          <el-input v-model="form.permissionCode" placeholder="如 order:view" />
        </el-form-item>
        <el-form-item label="状态" v-if="editId">
          <el-switch v-model="form.isVisible" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { menuApi } from '@/api/menu';

const loading = ref(false);
const submitting = ref(false);
const tableData = ref([]);
const showDialog = ref(false);
const editId = ref(null);
const formRef = ref();

const form = reactive({
  parentId: 0,
  menuName: '',
  menuPath: '',
  menuIcon: '',
  menuType: 'menu',
  permissionCode: '',
  sortOrder: 0,
  isVisible: true
});

const rules = {
  menuName: [{ required: true, message: '请输入菜单名称' }]
};

const menuOptions = computed(() => {
  const flat = [];
  const flatten = (list, prefix = '') => {
    if (!list || !Array.isArray(list)) return;
    for (const item of list) {
      flat.push({ ...item, menuName: prefix + item.menuName });
      if (item.children && item.children.length) {
        flatten(item.children, prefix + '　');
      }
    }
  };
  flatten(tableData.value);
  return flat;
});

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const res = await menuApi.tree();
    // 安全处理
    tableData.value = res?.data || res || [];
    if (!Array.isArray(tableData.value)) {
      tableData.value = [];
    }
  } catch (error) {
    console.error('加载菜单失败:', error);
    ElMessage.error('加载菜单失败');
    tableData.value = [];
  } finally {
    loading.value = false;
  }
};

// ===== 重置表单 =====
const resetForm = () => {
  editId.value = null;
  formRef.value?.resetFields();
  Object.assign(form, {
    parentId: 0,
    menuName: '',
    menuPath: '',
    menuIcon: '',
    menuType: 'menu',
    permissionCode: '',
    sortOrder: 0,
    isVisible: true
  });
};

// ===== 编辑 =====
const edit = async (row) => {
  try {
    editId.value = row.menuId;
    const res = await menuApi.get(row.menuId);
    const data = res?.data || res || {};
    Object.assign(form, data);
    showDialog.value = true;
  } catch (error) {
    ElMessage.error('获取菜单信息失败');
  }
};

// ===== 提交 =====
const submit = async () => {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    if (editId.value) {
      await menuApi.update({ ...form, menuId: editId.value });
      ElMessage.success('更新成功');
    } else {
      await menuApi.create(form);
      ElMessage.success('创建成功');
    }
    showDialog.value = false;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '操作失败');
  } finally {
    submitting.value = false;
  }
};

// ===== 删除 =====
const del = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除菜单 "${row.menuName}"？`, '提示', { type: 'warning' });
    await menuApi.delete(row.menuId);
    ElMessage.success('删除成功');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败');
    }
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 8px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
</style>