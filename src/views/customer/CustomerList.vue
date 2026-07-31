<template>
  <div class="page-container">
    <div class="page-header"><h2>客户管理</h2><el-button type="primary" @click="showDialog = true"><el-icon><Plus /></el-icon>新增客户</el-button></div>
    <el-form :model="search" inline class="search-form">
      <el-form-item><el-input v-model="search.keyword" placeholder="搜索名称/编号" clearable @clear="loadData" @keyup.enter="loadData" /></el-form-item>
      <el-form-item><el-checkbox v-model="search.includeInactive" @change="loadData">显示已禁用</el-checkbox></el-form-item>
      <el-form-item><el-button type="primary" @click="loadData">查询</el-button></el-form-item>
    </el-form>
    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="customerNo" label="编号" width="140" />
      <el-table-column prop="customerName" label="名称" min-width="150" />
      <el-table-column prop="contactPerson" label="联系人" width="100" />
      <el-table-column prop="contactPhone" label="电话" width="120" />
      <el-table-column prop="level" label="等级" width="80"><template #default="{ row }"><el-tag :type="levelMap[row.level] || ''">{{ row.level }}</el-tag></template></el-table-column>
      <el-table-column prop="orderCount" label="订单数" width="80" align="center" />
      <el-table-column prop="totalAmount" label="累计金额" width="140" align="right"><template #default="{ row }">¥{{ row.totalAmount?.toFixed(2) }}</template></el-table-column>
      <el-table-column prop="isActive" label="状态" width="80"><template #default="{ row }"><el-tag :type="row.isActive ? 'success' : 'danger'">{{ row.isActive ? '启用' : '禁用' }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="edit(row)">编辑</el-button>
          <el-button size="small" :type="row.isActive ? 'warning' : 'success'" @click="toggle(row)">{{ row.isActive ? '禁用' : '启用' }}</el-button>
          <el-button size="small" type="danger" @click="del(row)" :disabled="row.orderCount > 0">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="showDialog" :title="editId ? '编辑客户' : '新增客户'" width="500px" @close="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="名称" prop="customerName"><el-input v-model="form.customerName" /></el-form-item>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="联系人"><el-input v-model="form.contactPerson" /></el-form-item></el-col><el-col :span="12"><el-form-item label="电话"><el-input v-model="form.contactPhone" /></el-form-item></el-col></el-row>
        <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
        <el-form-item label="等级"><el-select v-model="form.level"><el-option label="普通" value="普通" /><el-option label="VIP" value="VIP" /><el-option label="SVIP" value="SVIP" /></el-select></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="showDialog = false">取消</el-button><el-button type="primary" :loading="submitting" @click="submit">确定</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { customerApi } from '@/api/customer'

const loading = ref(false); const submitting = ref(false); const tableData = ref([]); const showDialog = ref(false); const editId = ref(null); const formRef = ref()
const search = reactive({ keyword: '', includeInactive: false })
const form = reactive({ customerName: '', contactPerson: '', contactPhone: '', address: '', level: '普通', remark: '' })
const rules = { customerName: [{ required: true, message: '请输入客户名称' }] }
const levelMap = { VIP: 'warning', SVIP: 'danger', 普通: 'info' }

const loadData = async () => { loading.value = true; try { tableData.value = await customerApi.list(search) } finally { loading.value = false } }
const resetForm = () => { editId.value = null; formRef.value?.resetFields(); Object.assign(form, { customerName: '', contactPerson: '', contactPhone: '', address: '', level: '普通', remark: '' }) }
const edit = async (row) => { editId.value = row.customerId; const data = await customerApi.get(row.customerId); Object.assign(form, data); showDialog.value = true }
const submit = async () => { await formRef.value?.validate(); submitting.value = true; try { if (editId.value) { await customerApi.update({ ...form, customerId: editId.value }); ElMessage.success('更新成功') } else { await customerApi.create(form); ElMessage.success('创建成功') } showDialog.value = false; loadData() } finally { submitting.value = false } }
const toggle = async (row) => { await customerApi.toggle(row.customerId, !row.isActive); ElMessage.success(row.isActive ? '已禁用' : '已启用'); loadData() }
const del = async (row) => { await ElMessageBox.confirm(`确认删除 ${row.customerName}？`, '提示', { type: 'warning' }); await customerApi.delete(row.customerId); ElMessage.success('删除成功'); loadData() }
onMounted(loadData)
</script>