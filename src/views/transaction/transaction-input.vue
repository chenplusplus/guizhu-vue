<template>
  <div class="transaction-input">
    <el-card>
      <template #header>
        <span>数据录入</span>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="业务日期" prop="recordDate">
              <el-date-picker v-model="form.recordDate" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单号">
              <el-input v-model="form.recordNo" readonly placeholder="保存后自动生成" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="业务类型" prop="bizType">
              <el-select v-model="form.bizType" placeholder="请选择" style="width:100%">
                <el-option v-for="item in bizTypeOptions" :key="item.itemKey" :label="item.itemLabel" :value="item.itemKey" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="往来对象" prop="counterpartyId">
              <el-select v-model="form.counterpartyId" placeholder="请选择" filterable style="width:100%" clearable>
                <el-option v-for="item in counterpartyOptions" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="内容分类" prop="contentCategory">
              <el-select v-model="form.contentCategory" placeholder="请选择" style="width:100%">
                <el-option v-for="item in contentOptions" :key="item.itemKey" :label="item.itemLabel" :value="item.itemKey" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="方向" prop="direction">
              <el-select v-model="form.direction" placeholder="请选择" style="width:100%">
                <el-option label="收入（入库）" value="1" />
                <el-option label="支出（出库）" value="0" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">数量与金额</el-divider>

        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="K金件数+">
              <el-input-number v-model="form.kGoldCountPlus" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="K金件数-">
              <el-input-number v-model="form.kGoldCountMinus" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="重量(g/ct)">
              <el-input-number v-model="form.weight" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="交易金额(元)">
              <el-input-number v-model="form.transactionAmount" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="付款金额(元)">
              <el-input-number v-model="form.paymentAmount" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="关联订单号">
              <el-input v-model="form.orderNo" placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">提交录入</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 最近录入列表 -->
    <el-card style="margin-top:16px">
      <template #header>
        <span>已录入记录（当月）</span>
        <el-button type="text" @click="loadList">刷新</el-button>
      </template>
      <el-table :data="listData" stripe border>
        <el-table-column prop="recordNo" label="单号" width="150" />
        <el-table-column prop="recordDate" label="日期" width="100" />
        <el-table-column prop="bizType" label="业务类型" width="80" />
        <el-table-column prop="counterpartyName" label="往来对象" width="140" />
        <el-table-column prop="contentCategory" label="内容分类" width="100" />
        <el-table-column prop="kGoldCountPlus" label="件数+" width="70" align="right" />
        <el-table-column prop="kGoldCountMinus" label="件数-" width="70" align="right" />
        <el-table-column prop="weight" label="重量" width="80" align="right" />
        <el-table-column prop="transactionAmount" label="交易金额" width="100" align="right">
          <template #default="{ row }">{{ row.transactionAmount > 0 ? row.transactionAmount.toFixed(2) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="paymentAmount" label="付款金额" width="100" align="right">
          <template #default="{ row }">{{ row.paymentAmount > 0 ? row.paymentAmount.toFixed(2) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.status==='draft'" type="info" size="small">草稿</el-tag>
            <el-tag v-else-if="row.status==='pending'" type="warning" size="small">待审核</el-tag>
            <el-tag v-else-if="row.status==='approved'||row.status==='running'" type="success" size="small">已生效</el-tag>
            <el-tag v-else type="danger" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdByName" label="经办人" width="80" />
      </el-table>
      <el-pagination
        style="margin-top:12px"
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="loadList"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { transactionCreate, transactionList } from '@/api/transaction'
import { getCounterpartyAll } from '@/api/counterparty'
import request from '@/utils/request'

const formRef = ref()
const submitting = ref(false)
const listData = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const bizTypeOptions = ref([])
const contentOptions = ref([])
const counterpartyOptions = ref([])

const form = reactive({
  recordDate: new Date().toISOString().slice(0, 10),
  recordNo: '',
  bizType: '',
  counterpartyId: null,
  contentCategory: '',
  direction: '1',
  kGoldCountPlus: 0,
  kGoldCountMinus: 0,
  weight: 0,
  transactionAmount: 0,
  paymentAmount: 0,
  orderNo: '',
  remark: ''
})

const rules = {
  recordDate: [{ required: true, message: '请选择业务日期', trigger: 'change' }],
  bizType: [{ required: true, message: '请选择业务类型', trigger: 'change' }],
  contentCategory: [{ required: true, message: '请选择内容分类', trigger: 'change' }],
  direction: [{ required: true, message: '请选择方向', trigger: 'change' }]
}

function loadBizTypes() {
  request({ url: '/api/dict/items', method: 'get', params: { key: 'biz_type' } })
    .then(res => { if (res.data) bizTypeOptions.value = res.data }) // eslint-disable-line
    .catch(() => {})
}

function loadContentOptions() {
  request({ url: '/api/dict/items', method: 'get', params: { key: 'content_category' } })
    .then(res => { if (res.data) contentOptions.value = res.data }) // eslint-disable-line
    .catch(() => {})
}

function loadCounterparties() {
  getCounterpartyAll().then(res => {
    if (res.data) counterpartyOptions.value = res.data
  }).catch(() => {})
}

function loadList() {
  const now = new Date()
  transactionList({
    page: page.value,
    pageSize: pageSize.value,
    year: now.getFullYear(),
    month: now.getMonth() + 1
  }).then(res => {
    listData.value = res.data || []
    total.value = res.total || 0
  }).catch(() => {})
}

function handleSubmit() {
  formRef.value.validate(valid => {
    if (!valid) return
    submitting.value = true
    transactionCreate(form).then(res => {
      ElMessage.success(`提交成功！单号：${res.recordNo}`)
      handleReset()
      loadList()
    }).catch(() => {
      ElMessage.error('提交失败')
    }).finally(() => {
      submitting.value = false
    })
  })
}

function handleReset() {
  formRef.value?.resetFields()
  form.recordDate = new Date().toISOString().slice(0, 10)
  form.kGoldCountPlus = 0
  form.kGoldCountMinus = 0
  form.weight = 0
  form.transactionAmount = 0
  form.paymentAmount = 0
  form.direction = '1'
}

onMounted(() => {
  loadBizTypes()
  loadContentOptions()
  loadCounterparties()
  loadList()
})
</script>

<style scoped>
.transaction-input { padding: 16px; }
</style>
