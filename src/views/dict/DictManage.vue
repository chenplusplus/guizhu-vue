<template>
  <div class="page-container">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <h2>📖 数据字典管理</h2>
      <div class="header-actions">
        <el-button @click="handleInit" :loading="initLoading" plain type="info">
          <el-icon><Lightning /></el-icon> 初始化数据
        </el-button>
        <el-button type="primary" @click="openCategoryDialog()">
          <el-icon><Plus /></el-icon> 新增分类
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="分类名称">
          <el-input v-model="searchKey" placeholder="搜索分类名称/键名" clearable style="width:180px;" @input="loadCategories" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadCategories">查询</el-button>
          <el-button @click="searchKey = ''; loadCategories()">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- ===== 左右分栏 ===== -->
    <div class="dict-layout">
      <!-- 左侧：分类列表 -->
      <div class="left-panel">
        <div class="panel-title">📁 字典分类</div>
        <el-table
          :data="filteredCategories"
          border
          stripe
          v-loading="loading"
          highlight-current-row
          @row-click="selectCategory"
          :current-row-key="selectedCategory?.id"
          style="width:100%;"
          size="small"
          max-height="calc(100vh - 260px)"
        >
          <el-table-column prop="categoryName" label="分类名称" min-width="120">
            <template #default="{ row }">
              <span :class="{ 'row-inactive': !row.isActive }">{{ row.categoryName }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="categoryKey" label="键名" width="130">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ row.categoryKey }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="itemCount" label="条目" width="60" align="center" />
          <el-table-column label="状态" width="65" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.isActive ? 'success' : 'info'">
                {{ row.isActive ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="130" align="center">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click.stop="openCategoryDialog(row)">编辑</el-button>
              <el-button size="small" type="danger" link @click.stop="deleteCategory(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 右侧：条目列表 -->
      <div class="right-panel">
        <div class="panel-title">
          <span>📋 字典条目</span>
          <span v-if="selectedCategory" class="panel-subtitle">—— {{ selectedCategory.categoryName }}</span>
          <el-button
            v-if="selectedCategory"
            type="primary"
            size="small"
            style="margin-left:12px;"
            @click="openItemDialog()"
          >
            <el-icon><Plus /></el-icon> 新增条目
          </el-button>
        </div>

        <template v-if="selectedCategory">
          <el-table
            :data="categoryItems"
            border
            stripe
            v-loading="itemsLoading"
            size="small"
            max-height="calc(100vh - 320px)"
          >
            <el-table-column prop="sortOrder" label="排序" width="60" align="center" />
            <el-table-column label="标签" min-width="120">
              <template #default="{ row }">
                <span :class="{ 'row-inactive': !row.isActive }">{{ row.itemLabel || '—' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="itemKey" label="键名" width="130">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ row.itemKey || '—' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="itemValue" label="值" min-width="140">
              <template #default="{ row }">
                <span style="font-weight:500;">{{ row.itemValue }}</span>
              </template>
            </el-table-column>
            <el-table-column label="默认" width="60" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.isDefault" type="warning" size="small">默认</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="65" align="center">
              <template #default="{ row }">
                <el-tag size="small" :type="row.isActive ? 'success' : 'info'">
                  {{ row.isActive ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="130" align="center">
              <template #default="{ row }">
                <el-button size="small" type="primary" link @click="openItemDialog(row)">编辑</el-button>
                <el-button size="small" type="danger" link @click="deleteItem(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>

        <el-empty v-else description="请先选择一个分类" style="margin-top:60px;" />
      </div>
    </div>

    <!-- ===== 分类弹窗 ===== -->
    <el-dialog v-model="categoryDialogVisible" :title="categoryEditId ? '编辑分类' : '新增分类'" width="500px" destroy-on-close>
      <el-form ref="categoryFormRef" :model="categoryForm" :rules="categoryRules" label-width="100px">
        <el-form-item label="分类键名" prop="categoryKey">
          <el-input v-model="categoryForm.categoryKey" placeholder="如：lossrate, goldprice, color" :disabled="!!categoryEditId" />
          <div class="form-tip">⚠️ 键名唯一，用于程序标识，不能含空格</div>
        </el-form-item>
        <el-form-item label="分类名称" prop="categoryName">
          <el-input v-model="categoryForm.categoryName" placeholder="如：损耗率、金价、成色" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="categoryForm.description" placeholder="分类的用途说明（可选）" />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="categoryForm.sortOrder" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="categoryForm.isActive" />
          <span style="margin-left:10px;color:#909399;">{{ categoryForm.isActive ? '启用' : '停用' }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCategory" :loading="categorySubmitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- ===== 条目弹窗 ===== -->
    <el-dialog v-model="itemDialogVisible" :title="itemEditId ? '编辑条目' : '新增条目'" width="550px" destroy-on-close>
      <el-form ref="itemFormRef" :model="itemForm" :rules="itemRules" label-width="100px">
        <el-form-item label="所属分类">
          <el-input :value="selectedCategory?.categoryName" disabled />
        </el-form-item>
        <el-form-item label="显示标签" prop="itemLabel">
          <el-input v-model="itemForm.itemLabel" placeholder="用户看到的文本，如：足金999" />
        </el-form-item>
        <el-form-item label="键名" prop="itemKey">
          <el-input v-model="itemForm.itemKey" placeholder="程序内部标识（可选），如：gold999" />
        </el-form-item>
        <el-form-item label="值" prop="itemValue">
          <el-input v-model="itemForm.itemValue" placeholder="实际存储的值，如：580.00" />
        </el-form-item>
        <el-form-item label="扩展数据" prop="extraData">
          <el-input v-model="itemForm.extraData" placeholder='JSON格式，如：{"unit":"元/克"}' type="textarea" :rows="2" />
          <div class="form-tip">可存储单位、描述等额外信息，JSON格式</div>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="itemForm.sortOrder" :min="0" :max="999" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="默认">
              <el-switch v-model="itemForm.isDefault" />
              <span style="margin-left:10px;color:#909399;font-size:12px;">设为默认选项</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="启用状态">
          <el-switch v-model="itemForm.isActive" />
          <span style="margin-left:10px;color:#909399;">{{ itemForm.isActive ? '启用' : '停用' }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitItem" :loading="itemSubmitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Lightning } from '@element-plus/icons-vue'
import { dictApi } from '@/api/dict'

// ===== 状态 =====
const loading = ref(false)
const itemsLoading = ref(false)
const initLoading = ref(false)
const categoryDialogVisible = ref(false)
const itemDialogVisible = ref(false)
const categorySubmitting = ref(false)
const itemSubmitting = ref(false)
const categoryEditId = ref(null)
const itemEditId = ref(null)
const categoryFormRef = ref()
const itemFormRef = ref()

const categories = ref([])
const categoryItems = ref([])
const selectedCategory = ref(null)
const searchKey = ref('')

// ===== 计算属性 =====
const filteredCategories = computed(() => {
  if (!searchKey.value) return categories.value
  const k = searchKey.value.toLowerCase()
  return categories.value.filter(c =>
    c.categoryName.toLowerCase().includes(k) ||
    c.categoryKey.toLowerCase().includes(k)
  )
})

// ===== 分类表单 =====
const categoryForm = reactive({
  categoryKey: '',
  categoryName: '',
  description: '',
  sortOrder: 0,
  isActive: true,
})

const categoryRules = {
  categoryKey: [{ required: true, message: '请输入分类键名' }],
  categoryName: [{ required: true, message: '请输入分类名称' }],
}

// ===== 条目表单 =====
const itemForm = reactive({
  categoryId: 0,
  itemKey: '',
  itemLabel: '',
  itemValue: '',
  extraData: '',
  sortOrder: 0,
  isDefault: false,
  isActive: true,
})

const itemRules = {
  itemValue: [{ required: true, message: '请输入条目值' }],
  itemLabel: [{ required: true, message: '请输入显示标签' }],
}

// ===== 加载分类列表 =====
const loadCategories = async () => {
  loading.value = true
  try {
    const res = await dictApi.getCategories()
    categories.value = res?.data || []
    // 如果已有选中分类，刷新条目
    if (selectedCategory.value) {
      const updated = categories.value.find(c => c.id === selectedCategory.value.id)
      if (updated) {
        selectedCategory.value = updated
        await loadCategoryItems(selectedCategory.value.id)
      } else {
        selectedCategory.value = null
        categoryItems.value = []
      }
    }
  } catch {
    ElMessage.error('加载分类失败')
  } finally {
    loading.value = false
  }
}

// ===== 选中分类，加载条目 =====
const selectCategory = async (row) => {
  selectedCategory.value = row
  await loadCategoryItems(row.id)
}

const loadCategoryItems = async (categoryId) => {
  itemsLoading.value = true
  try {
    const res = await dictApi.getItems(categoryId)
    categoryItems.value = res?.data || []
  } catch {
    ElMessage.error('加载条目失败')
  } finally {
    itemsLoading.value = false
  }
}

// ===== 新增/编辑分类 =====
const openCategoryDialog = (row) => {
  if (row) {
    categoryEditId.value = row.id
    Object.assign(categoryForm, {
      categoryKey: row.categoryKey,
      categoryName: row.categoryName,
      description: row.description || '',
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    })
  } else {
    categoryEditId.value = null
    Object.assign(categoryForm, {
      categoryKey: '',
      categoryName: '',
      description: '',
      sortOrder: 0,
      isActive: true,
    })
  }
  categoryDialogVisible.value = true
}

const submitCategory = async () => {
  if (!categoryFormRef.value) return
  await categoryFormRef.value.validate(async (valid) => {
    if (!valid) return
    categorySubmitting.value = true
    try {
      if (categoryEditId.value) {
        await dictApi.updateCategory({ ...categoryForm, id: categoryEditId.value })
        ElMessage.success('更新成功')
      } else {
        await dictApi.createCategory(categoryForm)
        ElMessage.success('创建成功')
      }
      categoryDialogVisible.value = false
      await loadCategories()
    } catch (e) {
      ElMessage.error(e.message || '操作失败')
    } finally {
      categorySubmitting.value = false
    }
  })
}

const deleteCategory = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定删除分类「${row.categoryName}」？该分类下所有条目也会一并删除！`,
      '删除分类',
      { type: 'warning' }
    )
    await dictApi.deleteCategory(row.id)
    ElMessage.success('删除成功')
    if (selectedCategory.value?.id === row.id) {
      selectedCategory.value = null
      categoryItems.value = []
    }
    await loadCategories()
  } catch {}
}

// ===== 新增/编辑条目 =====
const openItemDialog = (row) => {
  if (!selectedCategory.value) {
    ElMessage.warning('请先选择一个分类')
    return
  }
  itemForm.categoryId = selectedCategory.value.id
  if (row) {
    itemEditId.value = row.id
    Object.assign(itemForm, {
      itemKey: row.itemKey || '',
      itemLabel: row.itemLabel || '',
      itemValue: row.itemValue,
      extraData: row.extraData || '',
      sortOrder: row.sortOrder,
      isDefault: !!row.isDefault,
      isActive: row.isActive,
    })
  } else {
    itemEditId.value = null
    Object.assign(itemForm, {
      itemKey: '',
      itemLabel: '',
      itemValue: '',
      extraData: '',
      sortOrder: 0,
      isDefault: false,
      isActive: true,
    })
  }
  itemDialogVisible.value = true
}

const submitItem = async () => {
  if (!itemFormRef.value) return
  await itemFormRef.value.validate(async (valid) => {
    if (!valid) return
    itemSubmitting.value = true
    try {
      if (itemEditId.value) {
        await dictApi.updateItem({ ...itemForm, id: itemEditId.value })
        ElMessage.success('更新成功')
      } else {
        await dictApi.createItem(itemForm)
        ElMessage.success('创建成功')
      }
      itemDialogVisible.value = false
      await loadCategoryItems(selectedCategory.value.id)
      await loadCategories()
    } catch (e) {
      ElMessage.error(e.message || '操作失败')
    } finally {
      itemSubmitting.value = false
    }
  })
}

const deleteItem = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定删除条目「${row.itemLabel || row.itemValue}」？`,
      '删除条目',
      { type: 'warning' }
    )
    await dictApi.deleteItem(row.id)
    ElMessage.success('删除成功')
    await loadCategoryItems(selectedCategory.value.id)
    await loadCategories()
  } catch {}
}

// ===== 初始化数据 =====
const handleInit = async () => {
  try {
    await ElMessageBox.confirm(
      '确认初始化数据字典？这将根据现有数据决定是否插入预设数据。',
      '初始化数据',
      { type: 'info' }
    )
  } catch {
    return
  }
  initLoading.value = true
  try {
    const res = await dictApi.initData()
    ElMessage.success(res?.message || '初始化成功')
    await loadCategories()
  } catch (e) {
    ElMessage.error(e.message || '初始化失败')
  } finally {
    initLoading.value = false
  }
}

onMounted(loadCategories)
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.header-actions { display: flex; gap: 10px; }
.search-bar { background: #f5f7fa; padding: 16px 20px; border-radius: 6px; margin-bottom: 16px; }
.search-bar :deep(.el-form-item) { margin-bottom: 0; }

/* ===== 分栏布局 ===== */
.dict-layout { display: flex; gap: 16px; min-height: 500px; }
.left-panel { width: 480px; flex-shrink: 0; }
.right-panel { flex: 1; min-width: 0; }
.panel-title {
  font-weight: 600;
  font-size: 14px;
  color: #1d2129;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}
.panel-subtitle { font-weight: 400; color: #4e5969; font-size: 13px; }

/* ===== 非活跃行 ===== */
.row-inactive { color: #c0c4cc; }

/* ===== 表单 ===== */
.form-tip { font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.4; }

@media (max-width: 900px) {
  .dict-layout { flex-direction: column; }
  .left-panel { width: 100%; }
}
</style>
