<!-- src/views/inout/counterparty.vue 往来单位管理 -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <h2>🏢 往来单位管理</h2>
        <el-tag type="info">共 {{ total }} 家</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="openDialog('create')">
          <el-icon><Plus /></el-icon> 新增单位
        </el-button>
        <el-button type="warning" plain @click="openGlobalLossConfig">
          ⚙️ 全局默认配置
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="名称/编码/联系人" clearable style="width:150px;" @clear="loadData" @keyup.enter="loadData" />
        </el-form-item>
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
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="section-divider"></div>

    <!-- 表格 -->
    <div class="table-section">
      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="name" label="单位名称" min-width="150" />
        <el-table-column prop="type" label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'customer' ? 'success' : 'warning'" size="small">
              {{ row.type === 'customer' ? '客户' : '供应商' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="编码" width="100" />
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="address" label="地址" min-width="150" show-overflow-tooltip />
        <el-table-column label="折算配置" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'supplier'" :type="row._lossCount > 0 ? 'success' : 'info'" size="small"
              style="cursor:pointer;" @click="openLossConfig(row)">
              {{ row._lossCount > 0 ? row._lossCount + ' 条' : '未配置' }}
            </el-tag>
            <span v-else style="color:#c0c4cc;">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.isActive" :loading="row._switchLoading" @change="toggleActive(row)" :disabled="!isAdmin" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="{ row }">
            <el-button v-if="row.type === 'supplier'" size="small" type="warning" link @click="openLossConfig(row)">折算配置</el-button>
            <el-button size="small" type="primary" link @click="openDialog('edit', row)">编辑</el-button>
            <el-button size="small" type="danger" link @click="handleDelete(row)" :disabled="!isAdmin">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination v-model:current-page="pagination.current" v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]" :total="total"
          layout="total, sizes, prev, pager, next"
          @size-change="loadData" @current-change="loadData" />
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增往来单位' : '编辑往来单位'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="dialogForm" :rules="dialogRules" label-width="90px">
        <el-form-item label="单位名称" prop="name">
          <el-input v-model="dialogForm.name" placeholder="必填，唯一" maxlength="100" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="dialogForm.type">
            <el-radio value="customer">客户</el-radio>
            <el-radio value="supplier">供应商</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="dialogForm.code" placeholder="选填，用于快速检索" maxlength="50" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="dialogForm.contact" placeholder="选填" maxlength="50" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="dialogForm.phone" placeholder="选填" maxlength="30" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="dialogForm.address" type="textarea" :rows="2" placeholder="选填" maxlength="255" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="dialogForm.remark" type="textarea" :rows="2" placeholder="选填" maxlength="500" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDialog" :loading="dialogLoading">确认</el-button>
      </template>
    </el-dialog>

    <!-- ⭐ 折算配置抽屉 -->
    <el-drawer v-model="lossDrawerVisible" :title="lossDrawerTitle" size="1050px" :close-on-click-modal="false">
      <div class="loss-config-container">
        <div class="loss-toolbar">
          <div class="loss-tip">
            💡 配置后，金录入选该供应商 + 材质时会自动带出【折算率】【损耗】【补口】
          </div>
          <el-button type="primary" size="small" @click="addLossRow">
            <el-icon><Plus /></el-icon> 新增材质
          </el-button>
        </div>

        <el-table :data="lossList" border stripe size="small" style="margin-top:12px;">
          <!-- 材质/成色 -->
          <el-table-column label="材质/成色" width="160">
            <template #default="{ row }">
              <el-select v-model="row.materialType" placeholder="选择" size="small" filterable allow-create style="width:100%;" @change="onMaterialChange(row)">
                <el-option v-for="m in materialOptions" :key="m" :label="m" :value="m"
                  :disabled="isMaterialDisabled(row, m)" />
              </el-select>
            </template>
          </el-table-column>

          <!-- 折算类别 -->
          <el-table-column label="折算类别" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getFoldTagType(row.foldCategory)" size="small">
                {{ getFoldLabel(row.foldCategory) }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- ⭐ 折算率（可手改） -->
          <el-table-column label="折算率" width="130">
            <template #default="{ row }">
              <el-input-number v-model="row.convertRate" :min="0" :max="1" :precision="4" :step="0.01"
                size="small" style="width:100%;" />
            </template>
          </el-table-column>

          <!-- ⭐ 损耗（倍数，可手改） -->
          <el-table-column label="损耗(倍数)" width="130">
            <template #default="{ row }">
              <el-input-number v-model="row.lossRate" :min="0" :precision="4" :step="0.001"
                size="small" style="width:100%;" />
            </template>
          </el-table-column>

          <!-- 最终折率（自动计算） -->
          <el-table-column label="最终折率" width="110">
            <template #default="{ row }">
              <el-input :model-value="calcFoldRate(row)" readonly size="small" />
            </template>
          </el-table-column>

          <!-- 默认补口 -->
          <el-table-column label="默认补口" width="130">
            <template #default="{ row }">
              <el-input v-model="row.defaultPatch" placeholder="选填" size="small" />
            </template>
          </el-table-column>

          <!-- 备注 -->
          <el-table-column label="备注" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.remark" placeholder="选填" size="small" />
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column label="操作" width="70" align="center">
            <template #default="{ $index }">
              <el-button type="danger" link size="small" @click="removeLossRow($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-if="lossList.length === 0" description="暂无配置，点击右上角新增" :image-size="80" />
      </div>

      <template #footer>
        <el-button @click="lossDrawerVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingLoss" @click="saveLossConfig">保存全部</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getCounterpartyList, createCounterparty, updateCounterparty, deleteCounterparty } from '@/api/counterparty';
import { getMaterialLossList, saveMaterialLoss, deleteMaterialLoss } from '@/api/materialLoss';

const userStore = useUserStore();
const isAdmin = computed(() => userStore.userType === 'admin');

const loading = ref(false);
const tableData = ref([]);
const total = ref(0);
const searchForm = reactive({ keyword: '', type: '', isActive: null });
const pagination = reactive({ current: 1, pageSize: 20 });

// ==================== 新增/编辑弹窗 ====================
const dialogVisible = ref(false);
const dialogMode = ref('create');
const dialogLoading = ref(false);
const dialogForm = reactive({ id: null, name: '', type: 'customer', code: '', contact: '', phone: '', address: '', remark: '', isActive: true });
const formRef = ref();
const dialogRules = {
  name: [{ required: true, message: '名称不能为空' }],
  type: [{ required: true, message: '请选择类型' }]
};

// ==================== 折算配置抽屉 ====================
const lossDrawerVisible = ref(false);
const lossDrawerTitle = ref('');
const currentSupplier = ref(null);
const lossList = ref([]);
const savingLoss = ref(false);

// 材质选项（按成色细分）
const materialOptions = [
  '黄金',
  '18K黄757‰', '18K白757‰', '18K红757‰',
  '14K黄', '14K白', '14K红',
  '9K黄', '9K白',
  '22K',
  'PT',
  '足银', '925银', '银',
  '铜'
];

// 根据材质名判断折算类别
const getFoldCategoryByMaterial = (materialType) => {
  if (!materialType) return 'gold';
  if (materialType.includes('银')) return 'silver';
  if (materialType.includes('铜')) return 'copper';
  return 'gold';
};

// 根据材质名带出默认折算率
const getDefaultConvertRate = (materialType) => {
  if (!materialType) return 1;
  if (materialType.includes('22K')) return 0.916;
  if (materialType.includes('18K')) return 0.75;
  if (materialType.includes('14K')) return 0.585;
  if (materialType.includes('9K')) return 0.375;
  if (materialType.includes('PT')) return 0.95;
  if (materialType.includes('银')) return 0.925;
  if (materialType.includes('铜')) return 1;
  if (materialType.includes('黄金')) return 1;
  return 1;
};

// ==================== 数据加载 ====================
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
    tableData.value = (res.data || []).map(r => ({ ...r, _switchLoading: false, _lossCount: 0 }));
    total.value = res.total || 0;

    // 加载供应商折算配置数量
    const suppliers = tableData.value.filter(r => r.type === 'supplier');
    for (const s of suppliers) {
      try {
        const lossRes = await getMaterialLossList(s.id);
        s._lossCount = (lossRes.data || []).length;
      } catch {}
    }
  } catch { ElMessage.error('加载失败'); }
  finally { loading.value = false; }
};

const resetSearch = () => {
  searchForm.keyword = '';
  searchForm.type = '';
  searchForm.isActive = null;
  pagination.current = 1;
  loadData();
};

// ==================== 新增/编辑 ====================
const openDialog = (mode, row = null) => {
  dialogMode.value = mode;
  if (mode === 'edit' && row) {
    Object.assign(dialogForm, {
      id: row.id, name: row.name, type: row.type,
      code: row.code || '', contact: row.contact || '',
      phone: row.phone || '', address: row.address || '',
      remark: row.remark || '', isActive: row.isActive
    });
  } else {
    Object.assign(dialogForm, {
      id: null, name: '', type: 'customer', code: '',
      contact: '', phone: '', address: '', remark: '', isActive: true
    });
  }
  dialogVisible.value = true;
};

const confirmDialog = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    dialogLoading.value = true;
    try {
      if (dialogMode.value === 'create') {
        await createCounterparty({ ...dialogForm });
        ElMessage.success('新增成功');
      } else {
        await updateCounterparty({ ...dialogForm });
        ElMessage.success('更新成功');
      }
      dialogVisible.value = false;
      loadData();
    } catch (e) {
      ElMessage.error(e.message || '操作失败');
    } finally {
      dialogLoading.value = false;
    }
  });
};

const toggleActive = async (row) => {
  row._switchLoading = true;
  try {
    await updateCounterparty({
      id: row.id, name: row.name, type: row.type,
      code: row.code, contact: row.contact, phone: row.phone,
      address: row.address, remark: row.remark, isActive: row.isActive
    });
    ElMessage.success(row.isActive ? '已启用' : '已停用');
  } catch {
    row.isActive = !row.isActive;
    ElMessage.error('切换失败');
  } finally {
    row._switchLoading = false;
  }
};

const handleDelete = async (row) => {
  await ElMessageBox.confirm(`确定删除往来单位「${row.name}」吗？`, '提示', { type: 'warning' });
  try {
    await deleteCounterparty(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (e) {
    ElMessage.error(e.message || '删除失败');
  }
};

// ==================== ⭐ 折算配置 ====================
const openLossConfig = async (row) => {
  if (!row || row.type !== 'supplier') {
    ElMessage.warning('只有供应商才能配置折算率');
    return;
  }
  currentSupplier.value = row;
  lossDrawerTitle.value = `折算配置 - ${row.name}`;
  lossList.value = [];
  lossDrawerVisible.value = true;

  try {
    const res = await getMaterialLossList(row.id);
    lossList.value = (res.data || []).map(x => ({
      id: x.id,
      materialType: x.materialType,
      foldCategory: x.foldCategory || getFoldCategoryByMaterial(x.materialType),
      convertRate: Number(x.convertRate) || getDefaultConvertRate(x.materialType),
      lossRate: Number(x.lossRate) || 1,
      defaultPatch: x.defaultPatch || '',
      remark: x.remark || ''
    }));
  } catch (e) {
    ElMessage.error('加载配置失败');
  }
};

// 全局默认配置
const openGlobalLossConfig = async () => {
  currentSupplier.value = { id: 0, name: '全局默认' };
  lossDrawerTitle.value = '全局默认配置';
  lossList.value = [];
  lossDrawerVisible.value = true;

  try {
    const res = await getMaterialLossList(0);
    lossList.value = (res.data || []).map(x => ({
      id: x.id,
      materialType: x.materialType,
      foldCategory: x.foldCategory || getFoldCategoryByMaterial(x.materialType),
      convertRate: Number(x.convertRate) || getDefaultConvertRate(x.materialType),
      lossRate: Number(x.lossRate) || 1,
      defaultPatch: x.defaultPatch || '',
      remark: x.remark || ''
    }));
  } catch (e) {
    ElMessage.error('加载配置失败');
  }
};

const addLossRow = () => {
  const used = new Set(lossList.value.map(x => x.materialType));
  const available = materialOptions.find(m => !used.has(m));
  const mat = available || '';
  lossList.value.push({
    id: null,
    materialType: mat,
    foldCategory: getFoldCategoryByMaterial(mat),
    convertRate: getDefaultConvertRate(mat),
    lossRate: 1,
    defaultPatch: '',
    remark: ''
  });
};

const removeLossRow = (index) => {
  lossList.value.splice(index, 1);
};

// 材质变更时自动更新折算类别和折算率
const onMaterialChange = (row) => {
  row.foldCategory = getFoldCategoryByMaterial(row.materialType);
  row.convertRate = getDefaultConvertRate(row.materialType);
};

// 计算最终折率 = 折算率 × 损耗
const calcFoldRate = (row) => {
  const cr = Number(row.convertRate) || 0;
  const lr = Number(row.lossRate) || 0;
  return (cr * lr).toFixed(4);
};

const isMaterialDisabled = (currentRow, material) => {
  return lossList.value.some(r => r !== currentRow && r.materialType === material);
};

// 折算类别显示
const getFoldLabel = (cat) => {
  return { gold: '折足金', silver: '折银', copper: '折铜' }[cat] || '折足金';
};
const getFoldTagType = (cat) => {
  return { gold: 'warning', silver: 'info', copper: 'success' }[cat] || 'warning';
};

const saveLossConfig = async () => {
  for (const item of lossList.value) {
    if (!item.materialType) {
      ElMessage.warning('请选择材质');
      return;
    }
  }
  const types = lossList.value.map(x => x.materialType);
  if (new Set(types).size !== types.length) {
    ElMessage.warning('存在重复的材质配置');
    return;
  }

  savingLoss.value = true;
  try {
    // 获取原有ID列表，删除被移除的
    const originalRes = await getMaterialLossList(currentSupplier.value.id);
    const originalIds = (originalRes.data || []).map(x => x.id);
    const currentIds = lossList.value.filter(x => x.id).map(x => x.id);
    for (const oldId of originalIds) {
      if (!currentIds.includes(oldId)) {
        await deleteMaterialLoss(oldId);
      }
    }

    // 保存（新增或更新）
    for (const item of lossList.value) {
      await saveMaterialLoss({
        id: item.id,
        counterpartyId: currentSupplier.value.id,
        materialType: item.materialType,
        foldCategory: item.foldCategory,
        convertRate: item.convertRate,
        lossRate: item.lossRate,
        defaultPatch: item.defaultPatch,
        remark: item.remark,
        sortOrder: materialOptions.indexOf(item.materialType)
      });
    }
    ElMessage.success('保存成功');
    lossDrawerVisible.value = false;
    loadData();
  } catch (e) {
    ElMessage.error('保存失败：' + (e.message || ''));
  } finally {
    savingLoss.value = false;
  }
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

/* 折算配置抽屉 */
.loss-config-container { padding: 4px 0; }
.loss-toolbar { display: flex; justify-content: space-between; align-items: center; }
.loss-tip { font-size: 13px; color: #909399; }
</style>