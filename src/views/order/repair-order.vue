<template>
  <div class="repair-form-container">
    <el-card class="form-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="card-title">{{ isEdit ? '编辑维修单' : '新建维修单' }}</span>
          <div class="card-actions">
            <el-button @click="handleCancel">取消</el-button>
            <el-button type="primary" @click="handleSubmit" :loading="submitting">
              {{ isEdit ? '保存修改' : '确认创建' }}
            </el-button>
          </div>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" size="default">
        <!-- 完全复刻图片表格布局，原生table，合并单元格 -->
        <div class="table-wrap">
          <table class="repair-table">
            <tbody>
              <!--第1行 客户 | B | 维修单(跨列居中) | 编号(红字)-->
              <tr>
                <td class="label-td">客户</td>
                <td>
                  <el-select v-model="form.customerId" placeholder="请选择客户" filterable style="width:100%" size="small">
                    <el-option v-for="item in customerList" :key="item.customerId" :label="item.customerName" :value="item.customerId" />
                  </el-select>
                </td>
                <td colspan="4" class="title-cell">维修单</td>
                <td class="red-text label-td">编号</td>
                <td><el-input v-model="form.repairNo" disabled size="small"/></td>
              </tr>

              <!--第2行 品名 | 订单日期 | 出货日期 |流水单号-->
              <tr>
                <td class="label-td">品名</td>
                <td><el-input v-model="form.productName" size="small"/></td>
                <td class="label-td">订单日期</td>
                <td><el-date-picker v-model="form.orderDate" type="date" value-format="YYYY-MM-DD" style="width:100%" size="small"/></td>
                <td class="label-td">出货日期</td>
                <td><el-date-picker v-model="form.deliveryDate" type="date" value-format="YYYY-MM-DD" style="width:100%" size="small"/></td>
                <td class="label-td">流水单号：</td>
                <td><el-input v-model="form.serialNo" size="small"/></td>
              </tr>

              <!--第3行 数量、颜色、宽/厚度、出蜡、钻石级别【红底】、工费【红字】-->
              <tr>
                <td class="label-td">数量</td>
                <td><el-input-number v-model="form.quantity" :min="1" style="width:100%" size="small"/></td>
                <td class="label-td">颜色</td>
                <td><el-input v-model="form.color" size="small"/></td>
                <td class="label-td">宽/厚度</td>
                <td><el-input-number v-model="form.widthThick" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">出蜡</td>
                <td><el-checkbox v-model="form.hasWaxOut" size="small">出蜡</el-checkbox></td>
                <td class="red-bg white-text label-td">钻石级别</td>
                <td>
                  <el-select v-model="form.diamondLevel" size="small" style="width:100%" clearable>
                    <el-option v-for="item in diamondLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </td>
                <td class="red-text label-td">工费</td>
                <td><el-input-number v-model="form.laborFee" :min="0" :precision="2" style="width:100%" size="small"/></td>
              </tr>

              <!--第4行 手寸/长度、克重要求、链重、出蜡时间、数据石重、钻石价格-->
              <tr>
                <td class="label-td">手寸/长度</td>
                <td><el-input v-model="form.size" size="small"/></td>
                <td class="label-td">克重要求</td>
                <td><el-input v-model="form.weightRequirement" size="small"/></td>
                <td class="label-td">链重</td>
                <td><el-input-number v-model="form.chainWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">出蜡时间</td>
                <td><el-date-picker v-model="form.waxOutTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%" size="small"/></td>
                <td class="label-td">数据石重</td>
                <td><el-input-number v-model="form.dataStoneWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">钻石价格</td>
                <td><el-input-number v-model="form.diamondPrice" :min="0" :precision="2" style="width:100%" size="small"/></td>
              </tr>

              <!--第5行 字印要求(红字跨列) |扣头、版费、数据粒数、宝石价格 -->
              <tr>
                <td colspan="2" class="red-text label-td">字印要求</td>
                <td class="label-td">扣头</td>
                <td><el-input v-model="form.clasp" size="small"/></td>
                <td class="label-td">版费</td>
                <td><el-input-number v-model="form.claspFee" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">数据粒数</td>
                <td><el-input-number v-model="form.dataStoneCount" :min="0" style="width:100%" size="small"/></td>
                <td class="label-td">宝石价格</td>
                <td><el-input-number v-model="form.gemPrice" :min="0" :precision="2" style="width:100%" size="small"/></td>
              </tr>

              <!--第6行 链条型号、倒模重、实际石重、宝石重 -->
              <tr>
                <td rowspan="5"><el-input v-model="form.engraveRequire" type="textarea" :rows="8" size="small"/></td>
                <td class="label-td">链条型号</td>
                <td><el-input v-model="form.chainModel" size="small"/></td>
                <td class="label-td">倒模重</td>
                <td><el-input-number v-model="form.moldWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">实际石重</td>
                <td><el-input-number v-model="form.realStoneWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">宝石重</td>
                <td><el-input-number v-model="form.gemWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
              </tr>

              <!--第7行 钢片重、倒模工费、实际粒数、宝石粒数 -->
              <tr>
                <td class="label-td">钢片重</td>
                <td><el-input-number v-model="form.steelWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">倒模工费</td>
                <td><el-input-number v-model="form.moldFee" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">实际粒数</td>
                <td><el-input-number v-model="form.realStoneCount" :min="0" style="width:100%" size="small"/></td>
                <td class="label-td">宝石粒数</td>
                <td><el-input-number v-model="form.gemCount" :min="0" style="width:100%" size="small"/></td>
              </tr>

              <!--第8行 客来石重 | 注意：跨列 -->
              <tr>
                <td class="label-td">客来石重</td>
                <td><el-input-number v-model="form.customerStoneWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td colspan="6" class="label-td note-cell">
                  <div>注意：</div>
                  <el-input v-model="form.note" type="textarea" :rows="3" size="small"/>
                </td>
              </tr>

              <!--第9行 客来金重 -->
              <tr>
                <td class="label-td">客来金重</td>
                <td><el-input-number v-model="form.customerGoldWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
              </tr>

              <!--第10行 贝金托重 -->
              <tr>
                <td class="label-td">贝金托重</td>
                <td><el-input-number v-model="form.bezelWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
              </tr>

              <!--第11行 磨贝重、出蜡费、磨贝/其他费、CNC费 -->
              <tr>
                <td class="label-td">磨贝重</td>
                <td><el-input-number v-model="form.polishWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">出蜡费</td>
                <td><el-input-number v-model="form.waxOutFee" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">磨贝/其他费</td>
                <td><el-input-number v-model="form.polishOtherFee" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">CNC费</td>
                <td><el-input-number v-model="form.cncFee" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <!--备注大单元格 跨多行 -->
                <td rowspan="5" colspan="4" class="label-td">
                  <div>备注</div>
                  <el-input v-model="form.remark" type="textarea" :rows="10" size="small"/>
                </td>
              </tr>

              <!--下方大空白行，匹配图片底部大片空白区域 -->
              <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            </tbody>
          </table>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createRepair, updateRepair, getRepairDetail, getRepairByOrderId } from '../../api/repair'
import { getCustomerList } from '../../api/customer'
import { dictApi } from '../../api/dict'
const router = useRouter()
const route = useRoute()
const isEdit = computed(() => route.params.id && route.params.id !== 'create')
const orderId = computed(() => parseInt(route.query.orderId) || null)

// ==================== 客户列表 ====================
const customerList = ref([])
const diamondLevelOptions = ref([])
const fetchCustomers = async () => {
  try {
    const res = await getCustomerList({ page: 1, pageSize: 100 })
    if (res.success) customerList.value = res.data || []
  } catch (error) {
    console.error('获取客户列表失败:', error)
  }
}

// ==================== 表单【在你原有字段基础上补充图片上缺失字段】 ====================
const formRef = ref(null)
const submitting = ref(false)
const form = reactive({
  id: null,
  repairNo: '',
  orderId: null,
  customerId: null,
  customerName: '',
  productName: '',
  orderDate: '',
  deliveryDate: '',
  serialNo: '',
  quantity: 1,
  color: '',
  widthThick: null,
  hasWaxOut: false,
  size: '',
  weightRequirement: '',
  chainWeight: null,
  waxOutTime: '',
  claspFee: null,
  chainModel: '',
  moldWeight: null,
  steelWeight: null,
  moldFee: null,
  customerStoneWeight: null,
  customerGoldWeight: null,
  bezelWeight: null,
  polishWeight: null,
  waxOutFee: null,
  polishOtherFee: null,
  cncFee: null,
  remark: '',

  //==== 图片新增字段，后端同步这些字段 ====
  diamondLevel:'', //钻石级别
  laborFee:null, //工费
  dataStoneWeight:null, //数据石重
  diamondPrice:null, //钻石价格
  dataStoneCount:null, //数据粒数
  gemPrice:null, //宝石价格
  realStoneWeight:null, //实际石重
  gemWeight:null, //宝石重
  realStoneCount:null, //实际粒数
  gemCount:null, //宝石粒数
  clasp:'', //扣头
  engraveRequire:'', //字印要求
  note:'' //注意
})

const rules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  productName: [{ required: true, message: '请输入品名', trigger: 'blur' }]
}

// ==================== 加载数据【完全保留原有逻辑】 ====================
const loadData = async () => {
  if (isEdit.value) {
    try {
      const res = await getRepairDetail(route.params.id)
      if (res.success) {
        const data = res.data
        Object.keys(form).forEach(key => {
          if (data[key] !== undefined) form[key] = data[key]
        })
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      ElMessage.error('加载数据失败')
    }
  } else if (orderId.value) {
    // 从订单预填
    try {
      const res = await getRepairByOrderId(orderId.value)
      if (res.success && res.isNew) {
        const data = res.data
        Object.keys(form).forEach(key => {
          if (data[key] !== undefined && data[key] !== null) form[key] = data[key]
        })
        form.orderId = data.orderId || orderId.value
        form.quantity = data.quantity || 1
      } else if (res.success && !res.isNew) {
        // 已有维修单，跳转到编辑
        ElMessage.info('该订单已有维修单，正在跳转...')
        router.push(`/repair/edit/${res.data.id}`)
      }
    } catch (error) {
      console.error('加载订单数据失败:', error)
    }
  }
}

// ==================== 提交【原样保留】 ====================
const handleSubmit = async () => {
  await formRef.value?.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const submitData = { ...form }
      delete submitData.id
      delete submitData.repairNo
      let res
      if (isEdit.value) {
        submitData.id = form.id
        res = await updateRepair(submitData)
      } else {
        res = await createRepair(submitData)
      }
      if (res.success) {
        ElMessage.success(isEdit.value ? '保存成功' : '创建成功')
        router.push('/order/factory-list')
      } else {
        ElMessage.error(res.message || '操作失败')
      }
    } catch (error) {
      console.error('提交失败:', error)
      ElMessage.error('提交失败')
    } finally {
      submitting.value = false
    }
  })
}
const handleCancel = () => {
  router.push('/order/factory-list')
}

// ==================== 初始化 ====================
onMounted(() => {
  dictApi.getItemsByKey('diamondlevel').then((res) => {
    diamondLevelOptions.value = (res?.data || []).map(item => ({
      label: item.itemLabel || item.itemValue,
      value: item.itemValue,
    }))
  }).catch(() => {
    ElMessage.error('加载钻石级别字典失败')
  })
  fetchCustomers()
  loadData()
})
</script>

<style scoped>
.repair-form-container {
  padding: 12px 16px;
  background-color: #f5f7fa;
  min-height: 100vh;
}
.form-card {
  max-width: 1400px;
  margin: 0 auto;
  border-radius: 8px;
}
.form-card .el-card__body {
  padding:16px !important;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.card-actions {
  display: flex;
  gap: 8px;
}

.table-wrap{
  width:100%;
  overflow:auto;
}
.repair-table{
  width:100%;
  border-collapse: collapse;
  border:1px solid #000;
  font-size:13px;
}
.repair-table td{
  border:1px solid #000;
  padding:4px 6px;
  vertical-align: middle;
}
.label-td{
  background:#fff;
  white-space:nowrap;
}
.title-cell{
  font-size:16px;
  font-weight:bold;
  text-align:center;
}
.red-text{
  color:#ff0000;
}
.red-bg{
  background-color:#ff0000;
}
.white-text{
  color:#ffffff;
}
.note-cell{
  vertical-align: top;
}
:deep(.el-input__inner),:deep(.el-textarea__inner){
  border:none;
  background:transparent;
  padding:2px 4px;
}
:deep(.el-select .el-input__inner){
  border:none;
}

/*打印样式，打印隐藏头部按钮，只输出表格*/
@media print{
  .card-header{
    display:none !important;
  }
  .repair-form-container{
    background:#fff;
    padding:0;
  }
  .form-card{
    box-shadow:none;
  }
}
</style>
