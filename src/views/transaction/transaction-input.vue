<!-- src/views/transaction/transaction-input.vue -->
<template>
  <div class="transaction-input">
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:bold;font-size:16px;">📝 交易录入</span>
          <el-button type="text" @click="$router.push('/transaction/list')">
            查看列表 →
          </el-button>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" size="default">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="业务日期" prop="recordDate">
              <el-date-picker
                v-model="form.recordDate"
                value-format="YYYY-MM-DD"
                style="width:100%"
                placeholder="选择日期"
              />
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
                <el-option
                  v-for="item in bizTypeOptions"
                  :key="item.itemKey"
                  :label="item.itemLabel"
                  :value="item.itemKey"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="往来对象">
              <el-select
                v-model="form.counterpartyId"
                placeholder="请选择"
                filterable
                clearable
                style="width:100%"
              >
                <el-option
                  v-for="item in counterpartyOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="内容分类" prop="contentCategory">
              <el-select v-model="form.contentCategory" placeholder="请选择" style="width:100%">
                <el-option
                  v-for="item in contentOptions"
                  :key="item.itemKey"
                  :label="item.itemLabel"
                  :value="item.itemKey"
                />
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
          <el-col :span="6">
            <el-form-item label="关联订单号">
              <el-input v-model="form.orderNo" placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="交易金额(元)">
              <el-input-number
                v-model="form.transactionAmount"
                :min="0"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="付款金额(元)">
              <el-input-number
                v-model="form.paymentAmount"
                :min="0"
                :precision="2"
                style="width:100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="关联账单号">
              <el-input v-model="form.billNo" placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="可选备注信息" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            提交录入
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { transactionCreate } from '@/api/transaction'
import { getCounterpartyAll } from '@/api/counterparty'
import request from '@/utils/request'

const router = useRouter()
const formRef = ref()
const submitting = ref(false)

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
  billNo: '',
  remark: ''
})

const rules = {
  recordDate: [{ required: true, message: '请选择业务日期', trigger: 'change' }],
  bizType: [{ required: true, message: '请选择业务类型', trigger: 'change' }],
  contentCategory: [{ required: true, message: '请选择内容分类', trigger: 'change' }],
  direction: [{ required: true, message: '请选择方向', trigger: 'change' }]
}

function loadBizTypes() {
  request({ url: '/dict/items', method: 'get', params: { key: 'biz_type' } })
    .then(res => { if (res.data) bizTypeOptions.value = res.data })
    .catch(() => {})
}

function loadContentOptions() {
  request({ url: '/dict/items', method: 'get', params: { key: 'content_category' } })
    .then(res => { if (res.data) contentOptions.value = res.data })
    .catch(() => {})
}

function loadCounterparties() {
  getCounterpartyAll().then(res => {
    if (res.data) counterpartyOptions.value = res.data
  }).catch(() => {})
}

function handleSubmit() {
  formRef.value.validate(valid => {
    if (!valid) return
    submitting.value = true
    transactionCreate(form).then(res => {
      ElMessage.success(`提交成功！单号：${res.recordNo}`)
      // ✅ A) 直接跳转到列表页
      router.push('/transaction/list')
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
  form.orderNo = ''
  form.billNo = ''
  form.remark = ''
}

onMounted(() => {
  loadBizTypes()
  loadContentOptions()
  loadCounterparties()
})
</script>

<style scoped>
.transaction-input {
  padding: 16px;
}
</style>