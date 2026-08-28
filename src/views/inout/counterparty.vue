<!-- src/views/inout/counterparty.vue 往来单位管理 -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left"><h2>🏢 往来单位管理</h2><el-tag type="info">共 {{ total }} 家</el-tag></div>
      <div class="header-right">
        <el-button type="primary" @click="openDialog('create')"><el-icon><Plus /></el-icon> 新增单位</el-button>
        <el-button @click="loadData"><el-icon><Refresh /></el-icon> 刷新</el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="关键词"><el-input v-model="searchForm.keyword" placeholder="名称/编码/联系人" clearable style="width:150px;" @clear="loadData" @keyup.enter="loadData" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width:110px;" @change="loadData">
            <el-option label="客户" value="customer" />
            <el-option label="供应商" value="supplier" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.isActive" placeholder="全部" clearable style="width:100px;" @change="loadData">
            <el-option label="启用" :value="true" />
            <el-option label="停用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" @click="loadData">查询</el-button><el-button @click="resetSearch">重置</el-button></el-form-item>
      </el-form>
    </div>

    <div class="section-divider"></div>

    <!-- 表格 -->
    <div class="table-section">
      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="name" label="单位名称" min-width="150" />
        <el-table-column prop="type" label="类型" width="90" align="center">
          <template #default="{ row }"><el-tag :type="row.type === 'customer' ? 'success' : 'warning'" size="small">{{ row.type === 'customer' ? '客户' : '供应商' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="code" label="编码" width="100" />
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="address" label="地址" min-width="150" show-overflow-tooltip />
        <el-table-column prop="isActive" label="状态" width="80" align="center">
          <template #default="{ row }"><el-switch v-model="row.isActive" :loading="row._switchLoading" @change="toggleActive(row)" :disabled="!isAdmin" /></template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openDialog('edit', row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)" :disabled="!isAdmin">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination v-model:current-page="pagination.current" v-model:page-size="pagination.pageSize" :page-sizes="[10, 20, 50]" :total="total"
          layout="total, sizes, prev, pager, next" @size-change="loadData" @current-change="loadData" />
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增往来单位' : '编辑往来单位'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="dialogForm" :rules="dialogRules" label-width="90px">
        <el-form-item label="单位名称" prop="name"><el-input v-model="dialogForm.name" placeholder="必填，唯一" maxlength="100" /></el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="dialogForm.type">
            <el-radio value="customer">客户</el-radio>
            <el-radio value="supplier">供应商</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="编码"><el-input v-model="dialogForm.code" placeholder="选填，用于快速检索" maxlength="50" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="dialogForm.contact" placeholder="选填" maxlength="50" /></el-form-item>
        <el-form-item label="电话"><el-input v-model="dialogForm.phone" placeholder="选填" maxlength="30" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="dialogForm.address" type="textarea" :rows="2" placeholder="选填" maxlength="255" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="dialogForm.remark" type="textarea" :rows="2" placeholder="选填" maxlength="500" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDialog" :loading="dialogLoading">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getCounterpartyList, createCounterparty, updateCounterparty, deleteCounterparty } from '@/api/counterparty';

const userStore = useUserStore();
const isAdmin = computed(() => userStore.userType === 'admin');

const loading = ref(false);
const tableData = ref([]);
const total = ref(0);
const searchForm = reactive({ keyword: '', type: '', isActive: null });
const pagination = reactive({ current: 1, pageSize: 20 });

const dialogVisible = ref(false);
const dialogMode = ref('create');
const dialogLoading = ref(false);
const dialogForm = reactive({ id: null, name: '', type: 'customer', code: '', contact: '', phone: '', address: '', remark: '', isActive: true });
const formRef = ref();
const dialogRules = {
  name: [{ required: true, message: '名称不能为空' }],
  type: [{ required: true, message: '请选择类型' }]
};

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getCounterpartyList({
      keyword: searchForm.keyword || undefined,
      type: searchForm.type || undefined,
      isActive: searchForm.isActive ?? undefined,
      page: pagination.current,
      pageSize: pagination.pageSize
    });
    tableData.value = (res.data || []).map(r => ({ ...r, _switchLoading: false }));
    total.value = res.total || 0;
  } catch { ElMessage.error('加载失败'); }
  finally { loading.value = false; }
};

const resetSearch = () => { searchForm.keyword = ''; searchForm.type = ''; searchForm.isActive = null; pagination.current = 1; loadData(); };

const openDialog = (mode, row = null) => {
  dialogMode.value = mode;
  if (mode === 'edit' && row) {
    Object.assign(dialogForm, { id: row.id, name: row.name, type: row.type, code: row.code || '', contact: row.contact || '', phone: row.phone || '', address: row.address || '', remark: row.remark || '', isActive: row.isActive });
  } else {
    Object.assign(dialogForm, { id: null, name: '', type: 'customer', code: '', contact: '', phone: '', address: '', remark: '', isActive: true });
  }
  dialogVisible.value = true;
};

const confirmDialog = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    dialogLoading.value = true;
    try {
      if (dialogMode.value === 'create') { await createCounterparty({ ...dialogForm }); ElMessage.success('新增成功'); }
      else { await updateCounterparty({ ...dialogForm }); ElMessage.success('更新成功'); }
      dialogVisible.value = false;
      loadData();
    } catch (e) { ElMessage.error(e.message || '操作失败'); }
    finally { dialogLoading.value = false; }
  });
};

const toggleActive = async (row) => {
  row._switchLoading = true;
  try {
    await updateCounterparty({ id: row.id, name: row.name, type: row.type, code: row.code, contact: row.contact, phone: row.phone, address: row.address, remark: row.remark, isActive: row.isActive });
    ElMessage.success(row.isActive ? '已启用' : '已停用');
  } catch { row.isActive = !row.isActive; ElMessage.error('切换失败'); }
  finally { row._switchLoading = false; }
};

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确定删除往来单位「${row.name}」吗？`, '提示', { type: 'warning' });
  try { await deleteCounterparty(row.id); ElMessage.success('删除成功'); loadData(); }
  catch (e) { ElMessage.error(e.message || '删除失败'); }
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0; flex-wrap: wrap; gap: 10px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; }
.search-bar { background: #fff; padding: 16px 20px 0; }
.search-bar :deep(.el-form-item) { margin-bottom: 12px; }
.section-divider { height: 1px; background: #e8ecf1; }
.table-section { background: #fff; padding: 16px 20px 0; border-radius: 0 0 8px 8px; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
