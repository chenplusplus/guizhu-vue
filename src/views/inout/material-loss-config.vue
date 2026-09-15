<template>  <div class="material-loss-page">    <el-card shadow="never">      <template #header>        <div class="card-header">          <span class="title">⚙️ 供应商损耗率配置</span>          <div>            <el-select v-model="filterCounterpartyId" placeholder="全部供应商" clearable filterable style="width:200px;margin-right:8px;" @change="loadList">              <el-option label="全局默认" :value="0" />              <el-option v-for="cp in counterparties" :key="cp.id" :label="cp.name" :value="cp.id" />            </el-select>            <el-button type="primary" @click="handleAdd">+ 新增配置</el-button>          </div>        </div>      </template>      <el-table :data="tableData" border stripe v-loading="loading">        <el-table-column prop="counterpartyName" label="供应商" width="180">          <template #default="{ row }">            <el-tag v-if="row.isDefault" type="warning" size="small">全局默认</el-tag>            <span v-else>{{ row.counterpartyName }}</span>          </template>        </el-table-column>        <el-table-column prop="materialType" label="材质" width="120" />        <el-table-column label="损耗率" width="120" align="right">          <template #default="{ row }">            {{ (row.lossRate * 100).toFixed(2) }}%          </template>        </el-table-column>        <el-table-column label="折率" width="120" align="right">          <template #default="{ row }">            {{ row.foldRate.toFixed(4) }}          </template>        </el-table-column>        <el-table-column prop="defaultPatch" label="默认补口" width="140" />        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />        <el-table-column label="操作" width="150" align="center">          <template #default="{ row }">            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>            <el-button type="danger" link size="small" @click="handleDelete(row)" v-if="!row.isDefault">删除</el-button>          </template>        </el-table-column>      </el-table>    </el-card>    <!-- 编辑弹窗 -->    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" @close="handleDialogClose">      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">        <el-form-item label="供应商" prop="counterpartyId">          <el-select v-model="form.counterpartyId" placeholder="请选择" filterable style="width:100%">            <el-option label="全局默认" :value="0" />            <el-option v-for="cp in counterparties" :key="cp.id" :label="cp.name" :value="cp.id" />          </el-select>        </el-form-item>        <el-form-item label="材质" prop="materialType">          <el-select v-model="form.materialType" placeholder="请选择" style="width:100%">            <el-option v-for="m in materialOptions" :key="m" :label="m" :value="m" />          </el-select>        </el-form-item>        <el-form-item label="损耗率" prop="lossRate">          <el-input-number v-model="form.lossRate" :min="0" :max="1" :precision="4" :step="0.01" style="width:100%" />          <div style="font-size:12px;color:#909399;">如 0.25 表示 25%</div>        </el-form-item>        <el-form-item label="折率">          <el-input :value="(1 - form.lossRate).toFixed(4)" readonly />        </el-form-item>        <el-form-item label="默认补口">          <el-input v-model="form.defaultPatch" placeholder="如 补口A" />        </el-form-item>        <el-form-item label="排序">          <el-input-number v-model="form.sortOrder" :min="0" style="width:100%" />        </el-form-item>        <el-form-item label="备注">          <el-input v-model="form.remark" type="textarea" :rows="2" />        </el-form-item>      </el-form>      <template #footer>        <el-button @click="dialogVisible = false">取消</el-button>        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>      </template>    </el-dialog>  </div></template><script setup>import { ref, reactive, 
onMounted }
from 'vue'
import { ElMessage, ElMessageBox }
from 'element-plus'
import { getMaterialLossList, saveMaterialLoss, deleteMaterialLoss }
from '@/api/materialLoss'
import { getCounterpartyAll }
from '@/api/counterparty'
const
loading = ref(false)
const
saving = ref(false)
const
tableData = ref([])
const
counterparties = ref([])
const
filterCounterpartyId = ref(null)
const
materialOptions = ['黄金', '18K', '14K', '9K', '22K','PT', '银', '铜']
const
dialogVisible = ref(false)
const
dialogTitle = ref('')
const
formRef = ref()
const
form = reactive({  id: null,  counterpartyId: 0,  materialType: '',  lossRate: 0,  defaultPatch: '',  sortOrder: 0,  remark: ''})
const
rules = {  counterpartyId: [{ required: true, message: '请选择供应商', trigger:'change' }],  materialType: [{ required: true, message: '请选择材质', trigger:'change' }],  lossRate: [{ required: true, message: '请输入损耗率', trigger:'blur' }]}
const
loadCounterparties = async () => {  
try {    
const
res = await
getCounterpartyAll()
if (res.data)
counterparties.value = res.data  }
catch {}}
const
loadList = async () => {  loading.value = true
try {    
const
res = await
getMaterialLossList(filterCounterpartyId.value)
if (res.success)
tableData.value = res.data || []  }
catch {}
finally { loading.value = false }}
const
handleAdd = () => {  dialogTitle.value = '新增配置'
Object.assign(form, {    id: null, counterpartyId: 0, materialType: '', lossRate: 0,    defaultPatch: '', sortOrder: 0, remark: ''  })
dialogVisible.value = true}
const
handleEdit = (row) => {  dialogTitle.value = '编辑配置'
Object.assign(form, {    id: row.id,    counterpartyId: row.counterpartyId,    materialType: row.materialType,    lossRate: row.lossRate,    defaultPatch: row.defaultPatch,    sortOrder: row.sortOrder,    remark: row.remark  })
dialogVisible.value = true}
const
handleSave = async () => {  await
formRef.value.validate(async (valid) => {    
if (!valid)
return
saving.value = true
try {      
const
res = await
saveMaterialLoss(form)
if (res.success) {        ElMessage.success(res.message || '保存成功')
dialogVisible.value = false
loadList()      }    }
catch (e) {      ElMessage.error('保存失败')    }
finally {      saving.value = false    }  })}
const
handleDelete = (row) => {  ElMessageBox.confirm(`确定删除【${row.counterpartyName} - ${row.materialType}】的配置吗？`, '提示', {    type:'warning'  }).then(async () => {    
const
res = await
deleteMaterialLoss(row.id)
if (res.success) {      ElMessage.success('删除成功')
loadList()    }  }).catch(() => {})}
const
handleDialogClose = () => {  formRef.value?.clearValidate()}
onMounted(() => {  loadCounterparties()
loadList()})</script><style scoped>.material-loss-page { padding: 16px; }.card-header { display: flex; justify-content: space-between; align-items: center; }.title { font-weight: 600; font-size: 16px; }</style>
