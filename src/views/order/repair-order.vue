<template>
  <div class="repair-form-container">
    <el-card class="form-card" shadow="never">
      <template #header>
        <div class="card-header no-print">
          <span class="card-title">{{ isEdit ? '编辑维修单' : '新建维修单' }}</span>
          <div class="card-actions">
            <el-button @click="handleCancel">取消</el-button>
            <el-button @click="handlePrint">打印</el-button>
            <el-button type="primary" @click="handleSubmit" :loading="submitting">
              {{ isEdit ? '保存修改' : '确认创建' }}
            </el-button>
          </div>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" size="default">
        <div class="table-wrap">
          <!-- ============ 主表：可填写区域 ============ -->
          <table class="repair-table main-table">
            <tbody>
              <!-- 第1行：客户 | B | 维修单 | 编号 -->
              <tr>
                <td class="label-td">客户</td>
                <td class="order-field"  colspan="2">
                  <span v-if="isOrderLoaded" class="readonly-value">{{ customerName }}</span>
                  <el-select v-else v-model="form.customerId" placeholder="请选择客户" filterable style="width:100%" size="small">
                    <el-option v-for="item in customerList" :key="item.customerId" :label="item.customerName" :value="item.customerId" />
                  </el-select>
                </td>
                <td colspan="4" class="title-cell">维修单</td>
                <td class="red-text label-td">编号</td>
                <td colspan="4"></td>
              </tr>
              <!-- 第3行：品名 | 订单日期 | 出货日期 | 流水单号 -->
              <tr>
                <td class="label-td">品名</td>
                <td colspan="2" class="order-field">
                  <span v-if="isOrderLoaded" class="readonly-value">{{ form.productName || '-' }}</span>
                  <el-input v-else v-model="form.productName" size="small"/>
                </td>
                <td class="label-td">订单日期</td>
                <td colspan="2" class="order-field">
                  <span v-if="isOrderLoaded" class="readonly-value">{{ form.orderDate || '-' }}</span>
                  <el-date-picker v-else v-model="form.orderDate" type="date" value-format="YYYY-MM-DD" style="width:100%" size="small"/>
                </td>
                <td class="label-td">出货日期</td>
                <td colspan="2" class="order-field">
                  <span v-if="isOrderLoaded" class="readonly-value">{{ form.deliveryDate || '-' }}</span>
                  <el-date-picker v-else v-model="form.deliveryDate" type="date" value-format="YYYY-MM-DD" style="width:100%" size="small"/>
                </td>
                <td class="label-td">流水单号：</td>
                <td colspan="2" class="order-field">
                  <span v-if="isOrderLoaded" class="readonly-value">{{ form.serialNo || '-' }}</span>
                  <el-input v-else v-model="form.serialNo" size="small"/>
                </td>
              </tr>

              <!-- 第4行：数量 | 颜色 | 宽/厚度 | 出蜡 | 钻石级别 | 工费 -->
              <tr>
                <td class="label-td">数量</td>
                <td class="order-field">
                  <span v-if="isOrderLoaded" class="readonly-value">{{ form.quantity }}</span>
                  <el-input-number v-else v-model="form.quantity" :min="1" style="width:100%" size="small"/>
                </td>
                <td class="label-td">颜色</td>
                <td class="order-field">
                  <span v-if="isOrderLoaded" class="readonly-value">{{ form.color || '-' }}</span>
                  <el-input v-else v-model="form.color" size="small"/>
                </td>
                <td class="label-td">宽/厚度</td>
                <td class="order-field">
                  <span v-if="isOrderLoaded" class="readonly-value">{{ form.widthThick ?? '-' }}</span>
                  <el-input-number v-else v-model="form.widthThick" :min="0" :precision="2" style="width:100%" size="small"/>
                </td>
                <td class="label-td">出蜡</td>
                <td>
                  <span v-if="isOrderLoaded" class="readonly-value">{{ form.hasWaxOut || '-' }}</span>
                  <el-input v-else v-model="form.hasWaxOut" size="small"/>
                </td>
                <td class="red-bg white-text label-td">钻石级别</td>
                <td class="order-field">
                  <span v-if="isOrderLoaded" class="readonly-value">{{ form.diamondLevel || '-' }}</span>
                  <el-select v-else v-model="form.diamondLevel" size="small" style="width:100%" clearable>
                    <el-option v-for="item in diamondLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </td>
                <td class="red-text label-td">工费</td>
                <td>
                  <el-input-number v-model="form.laborFee" :min="0" :precision="2" style="width:100%" size="small"/>
                </td>
              </tr>

              <!-- 第5行：手寸/长度 | 克重要求 | 链重 | 出蜡时间 | 主石卡重 | 钻石价格 -->
              <tr>
                <td class="label-td">手寸/长度</td>
                <td class="order-field">
                  <span v-if="isOrderLoaded" class="readonly-value">{{ form.size || '-' }}</span>
                  <el-input v-else v-model="form.size" size="small"/>
                </td>
                <td class="label-td">克重要求</td>
                <td class="order-field">
                  <span v-if="isOrderLoaded" class="readonly-value">{{ form.weightRequirement || '-' }}</span>
                  <el-input v-else v-model="form.weightRequirement" size="small"/>
                </td>
                <td class="label-td">链重</td>
                <td class="order-field">
                  <span v-if="isOrderLoaded" class="readonly-value">{{ form.chainWeight ?? '-' }}</span>
                  <el-input-number v-else v-model="form.chainWeight" :min="0" :precision="2" style="width:100%" size="small"/>
                </td>
                <td class="label-td">出蜡时间</td>
                <td>
                  <el-date-picker v-model="form.waxOutTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width:100%" size="small"/>
                </td>
                <td class="label-td">主石卡重</td>
                <td>
                  <el-input-number v-model="form.mainStoneWeight" :min="0" :precision="2" style="width:100%" size="small"/>
                </td>
                <td class="label-td">钻石价格</td>
                <td>
                  <el-input-number v-model="form.diamondPrice" :min="0" :precision="2" style="width:100%" size="small"/>
                </td>
              </tr>

              <!-- 第6行：字印要求 | 扣头 | 版费 | 主石粒数 | 主石工费 -->
              <tr>
                <td colspan="4" class="red-text label-td">字印要求</td>
                <td class="label-td">扣头</td>
                <td>
                  <el-input v-model="form.clasp" size="small"/>
                </td>
                <td class="label-td">版费</td>
                <td>
                  <el-input-number v-model="form.claspFee" :min="0" :precision="2" style="width:100%" size="small"/>
                </td>
                <td class="label-td">主石粒数</td>
                <td>
                  <el-input-number v-model="form.mainStoneCount" :min="0" style="width:100%" size="small"/>
                </td>
                <td class="label-td">主石工费</td>
                <td>
                  <el-input-number v-model="form.mainStoneLaborFee" :min="0" :precision="2" style="width:100%" size="small"/>
                </td>
              </tr>

              <!-- 第7-11行：左侧图片区(跨5行4列) + 右侧字段 + 备注 -->
              <tr>
                <td colspan="4" rowspan="6" class="img-cell">
                  <div class="img-group">
                    <div class="img-item">
                      <div class="img-label">产品图片</div>
                      <img :src="imageUrls.product" alt="产品图" class="preview-img"/>
                    </div>
                    <div class="img-item">
                      <div class="img-label">字印图片</div>
                      <img :src="imageUrls.letter" alt="字印图" class="preview-img"/>
                    </div>
                  </div>
                </td>
                <td class="label-td">链条型号</td>
                <td><el-input v-model="form.chainModel" size="small"/></td>
                <td class="label-td">倒模重</td>
                <td><el-input-number v-model="form.moldWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">副石卡重</td>
                <td><el-input-number v-model="form.sideStoneWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">副石价格</td>
                <td><el-input-number v-model="form.sideStonePrice" :min="0" :precision="2" style="width:100%" size="small"/></td>
              </tr>

              <tr>
                <td class="label-td">钢片重</td>
                <td><el-input-number v-model="form.steelWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">倒模工费</td>
                <td><el-input-number v-model="form.moldFee" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">副石粒数</td>
                <td><el-input-number v-model="form.sideStoneCount" :min="0" style="width:100%" size="small"/></td>
                <td class="label-td">副石工费</td>
                <td><el-input-number v-model="form.sideStoneLaborFee" :min="0" :precision="2" style="width:100%" size="small"/></td>
              </tr>

              <tr>
                <td class="label-td">客来石重</td>
                <td><el-input-number v-model="form.customerStoneWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td colspan="6" class="label-td note-cell">
                  <div>注意：</div>
                  <el-input v-model="form.note" type="textarea" :rows="2" size="small"/>
                </td>
              </tr>

              <tr>
                <td class="label-td">客来金重</td>
                <td><el-input-number v-model="form.customerGoldWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td colspan="6" rowspan="2" class="remark-cell">
                  <div class="remark-title">备注</div>
                  <el-input v-model="form.remark" type="textarea" :rows="5" size="small"/>
                </td>
              </tr>

              <tr>
                <td class="label-td">贝金托重</td>
                <td><el-input-number v-model="form.bezelWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
              </tr>

              <!-- 第12行：磨贝重 | 出蜡费 | 磨贝/其他费 | CNC费 -->
              <tr>
                <td class="label-td">磨贝重</td>
                <td><el-input-number v-model="form.polishWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">出蜡费</td>
                <td><el-input-number v-model="form.waxOutFee" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">磨贝/其他费</td>
                <td><el-input-number v-model="form.polishOtherFee" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">CNC费</td>
                <td><el-input-number v-model="form.cncFee" :min="0" :precision="2" style="width:100%" size="small"/></td>
              </tr>
            </tbody>
          </table>

          <!-- 分隔空行（打印时缩小） -->
          <div class="print-gap"></div>

          <!-- ============ 打印区域：工序跟踪表（仅打印用） ============ -->
          <table class="repair-table print-table">
            <tbody>
              <!-- 数据确认行 -->
              <tr class="process-header">
                <td class="label-td">数据确认</td>
                <td class="label-td">出蜡</td>
                <td class="label-td">倒模</td>
                <td class="label-td">配件缺失</td>
                <td class="label-td">执模</td>
                <td class="label-td">车石</td>
                <td class="label-td">CNC</td>
                <td class="label-td">扫镶口</td>
                <td class="label-td">镶石</td>
                <td class="label-td">扣链</td>
                <td class="label-td">抛光</td>
                <td class="label-td">备注</td>
              </tr>

              <tr class="check-row">
                <td></td><td></td><td></td><td></td><td></td><td></td>
                <td></td><td></td><td></td><td></td><td></td><td></td>
              </tr>

              <tr class="process-detail-header">
                <td class="label-td">部门</td>
                <td class="label-td">日期</td>
                <td class="label-td">发货重量</td>
                <td class="label-td">签名</td>
                <td class="label-td">时间</td>
                <td class="label-td">收货重量</td>
                <td class="label-td">签名</td>
                <td class="label-td">时间</td>
                <td class="label-td">收回日期</td>
                <td class="label-td">水口</td>
                <td class="label-td">收回时间</td>
                <td class="label-td">报废重量</td>
              </tr>

              <tr class="process-row"><td class="label-td" rowspan="2" >执模/有耗</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td class="label-td">扣链</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td class="label-td">扣链</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td class="label-td">CNC</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td class="label-td"  rowspan="2">微镶</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td class="label-td"  rowspan="2">手镶</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td class="label-td"  rowspan="2">抛光有耗</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td class="label-td">磨石/滴胶</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td class="label-td">抛光无耗</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td class="label-td">扫相口</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
              <tr class="process-row"><td class="label-td">成品抛光</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
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

// 客户列表 & 字典
const customerList = ref([])
const diamondLevelOptions = ref([])
const isOrderLoaded = computed(() => Boolean(form.orderId))
const customerName = computed(() => {
  const customer = customerList.value.find(item => Number(item.customerId) === Number(form.customerId))
  return customer?.customerName || form.customerId || '-'
})

// ⭐ 图片地址（从订单带入）
const imageUrls = reactive({
  product: '',
  letter: '',
})

const fetchCustomers = async () => {
  try {
    const res = await getCustomerList({ page: 1, pageSize: 100 })
    if (res.success) customerList.value = res.data || []
  } catch (error) {
    console.error('获取客户列表失败:', error)
  }
}

// ============================================================
// 表单字段
// ⭐ 订单带出的只有 12 个（图片里列的），其余是工厂手填
// ============================================================
const formRef = ref(null)
const submitting = ref(false)
const form = reactive({
  id: null,
  repairNo: '',
  orderId: null,

  // ⭐ 订单带出字段（红字）
  customerId: null,
  productName: '',
  quantity: 1,
  size: '',
  color: '',
  weightRequirement: '',
  widthThick: null,
  chainWeight: null,
  diamondLevel: '',
  orderDate: '',
  deliveryDate: '',
  serialNo: '',

  // 工厂手填字段
  hasWaxOut: false,
  waxOutTime: '',
  laborFee: null,
  mainStoneWeight: null,
  diamondPrice: null,
  clasp: '',
  claspFee: null,
  mainStoneCount: null,
  mainStoneLaborFee: null,
  chainModel: '',
  moldWeight: null,
  sideStoneWeight: null,
  sideStonePrice: null,
  steelWeight: null,
  moldFee: null,
  sideStoneCount: null,
  sideStoneLaborFee: null,
  customerStoneWeight: null,
  customerGoldWeight: null,
  bezelWeight: null,
  polishWeight: null,
  waxOutFee: null,
  polishOtherFee: null,
  cncFee: null,
  note: '',
  remark: '',
  remark2: '',
})

const rules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  productName: [{ required: true, message: '请输入品名', trigger: 'blur' }]
}

// ============================================================
// 加载数据
// ============================================================
const loadData = async () => {
  if (isEdit.value) {
    try {
      const res = await getRepairDetail(route.params.id)
      if (res.success) {
        const data = res.data
        Object.keys(form).forEach(key => {
          if (data[key] !== undefined && data[key] !== null) form[key] = data[key]
        })
        // 图片
        if (data.productImage) imageUrls.product = data.productImage
        if (data.letterImage) imageUrls.letter = data.letterImage
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      ElMessage.error('加载数据失败')
    }
  } else if (orderId.value) {
    try {
      const res = await getRepairByOrderId(orderId.value)
      if (res.success && res.isNew) {
        const data = res.data
        // ⭐ 只带 12 个字段
        form.orderId = data.orderId || orderId.value
        form.customerId = data.customerId
        form.productName = data.productName || ''
        form.quantity = data.quantity || 1
        form.size = data.size || ''
        form.color = data.color || ''
        form.weightRequirement = data.weightRequirement || ''
        form.widthThick = data.widthThick ? Number(data.widthThick) : null
        form.chainWeight = data.chainWeight ? Number(data.chainWeight) : null
        form.diamondLevel = data.diamondLevel || ''
        form.orderDate = data.orderDate || ''
        form.deliveryDate = data.deliveryDate || ''
        form.serialNo = data.serialNo || ''

        // ⭐ 额外带入：钻石 / 石重 / 工费 / 粒数（没有则空着）
        form.diamondLevel = data.diamondLevel || ''
        form.mainStoneWeight = data.mainStoneWeight != null ? Number(data.mainStoneWeight) : null
        form.mainStoneCount = data.mainStoneQty != null ? Number(data.mainStoneQty) : null
        form.mainStoneLaborFee = data.mainStoneSettingFee != null ? Number(data.mainStoneSettingFee) : null
        form.diamondPrice = data.mainStonePrice != null ? Number(data.mainStonePrice) : null
        form.laborFee = data.laborFee != null ? Number(data.laborFee) : null

        // 图片
        imageUrls.product = data.productImage || ''
        imageUrls.letter = data.letterImage || ''

        ElMessage.success('已从订单带入数据')
      } else if (res.success && !res.isNew) {
        ElMessage.info('该订单已有维修单，正在跳转...')
        router.push(`/repair/edit/${res.data.id}`)
      }
    } catch (error) {
      console.error('加载订单数据失败:', error)
    }
  }
}

// ============================================================
// 提交
// ============================================================
const handleSubmit = async () => {
  await formRef.value?.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const submitData = { ...form }
      delete submitData.id
      delete submitData.repairNo
      submitData.productImage = imageUrls.product
      submitData.letterImage = imageUrls.letter
      submitData.customerName = customerName.value || '' 
      submitData.waxOutTime = submitData.waxOutTime || null

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

const handleCancel = () => router.push('/order/factory-list')

const convertToPlainText = (source, target) => {
  const selector = '.el-input-number, .el-select, .el-date-editor, .el-checkbox, .el-input, .el-textarea'
  const getControls = (container) => Array.from(container.querySelectorAll(selector)).filter(control => {
    return !control.parentElement?.closest('.el-input-number, .el-select, .el-date-editor, .el-checkbox')
  })
  const sourceControls = getControls(source)
  const targetControls = getControls(target)

  sourceControls.forEach((control, index) => {
    const targetControl = targetControls[index]
    if (!targetControl) return

    let value = ''
    if (control.classList.contains('el-checkbox')) {
      value = control.querySelector('input')?.checked ? '是' : '否'
    } else if (control.classList.contains('el-select')) {
      value = control.querySelector('.el-select__selected-item')?.textContent?.trim()
        || control.querySelector('input')?.value
        || ''
    } else if (control.classList.contains('el-input-number')) {
      value = control.querySelector('input')?.value || ''
    } else if (control.matches('.el-date-editor, .el-input')) {
      value = control.querySelector('input')?.value || ''
    } else if (control.classList.contains('el-textarea')) {
      value = control.querySelector('textarea')?.value || ''
    } else {
      value = control.textContent?.trim() || ''
    }

    const span = document.createElement('span')
    span.className = 'plain-text'
    span.textContent = value || '-'
    targetControl.replaceWith(span)
  })
}

const handlePrint = () => {
  const sourceEl = document.querySelector('.form-card');
  if (!sourceEl) {
    ElMessage.error('找不到打印内容');
    return;
  }

  // ⭐ 克隆整个卡片
  const clone = sourceEl.cloneNode(true);

  // ⭐ 把克隆节点里所有 Element Plus 控件替换为纯文本 span
  convertToPlainText(sourceEl, clone);

  // ⭐ 打开新窗口
  const printWindow = window.open('', '_blank', 'width=1000,height=1400');
  if (!printWindow) {
    ElMessage.warning('请允许浏览器弹出窗口');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>维修单打印</title>
        <style>
          @page { size: A4 portrait; margin: 8mm 6mm; }
          * { box-sizing: border-box; }
          html, body {
            margin: 0; padding: 0;
            font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
            font-size: 12px; color: #000; background: #fff;
          }

          /* 隐藏按钮 / 卡片头 / 菜单 */
          .no-print, .el-card__header, .card-header,
          .el-button, .el-pagination, .el-tag {
            display: none !important;
          }
          .el-card { border: none !important; box-shadow: none !important; }
          .el-card__body { padding: 0 !important; }

          /* ===== 表格 ===== */
          table.repair-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          table.repair-table td {
            border: 1px solid #000;
            padding: 3px 5px;
            height: 24px;
            vertical-align: middle;
            font-size: 11px;
            word-break: break-all;
          }
          .label-td {
            text-align: center;
            font-weight: 500;
            white-space: nowrap;
          }
          .title-cell {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            letter-spacing: 6px;
          }
          .red-text { color: #ff0000 !important; }
          .red-bg {
            background: #ff0000 !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .white-text { color: #fff !important; }
          .empty-row td { height: 10px; border: none; }

          /* 订单带出字段红字 */
          .order-field {
            color: #ff0000 !important;
            font-weight: 500;
          }

          /* ===== 纯文本值 ===== */
          .plain-text {
            display: block;
            width: 100%;
            font-size: 11px;
            color: inherit;
            white-space: pre-wrap;
            word-break: break-all;
            min-height: 16px;
          }

          /* ===== 图片 ===== */
          .preview-img {
            max-width: 100%;
            height: 70px;
            object-fit: contain;
            border: 1px solid #000;
          }
          .img-label { font-size: 10px; text-align: center; }
          .img-group { display: flex; flex-direction: column; gap: 4px; }
          .img-item { display: flex; flex-direction: column; align-items: center; }

          /* ===== 打印表格 ===== */
          .print-gap { height: 0 !important; margin: 0 !important; }
          .print-table .process-header td {
            background: #f0f0f0 !important;
            font-weight: 600;
            text-align: center;
            padding: 2px !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-table .process-detail-header td {
            background: #f7f7f7 !important;
            text-align: center;
            padding: 2px !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-table .check-row td { height: 18px !important; padding: 0 !important; }
          .print-table .process-row td { height: 22px !important; padding: 1px 3px !important; }

          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>${clone.outerHTML}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 600);
};

// ============================================================
// 初始化
// ============================================================
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
/* ============================================================
   屏幕样式
   ============================================================ */
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

.form-card :deep(.el-card__body) {
  padding: 16px !important;
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

.table-wrap {
  width: 100%;
  overflow: auto;
}

.repair-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #000;
  font-size: 13px;
  table-layout: fixed;
}

.repair-table td {
  border: 1px solid #000;
  padding: 4px 6px;
  vertical-align: middle;
  height: 28px;
}

.label-td {
  background: #fff;
  white-space: nowrap;
  text-align: center;
  font-weight: 500;
}

.title-cell {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  letter-spacing: 8px;
}

.red-text {
  color: #ff0000;
}

.red-bg {
  background-color: #ff0000;
}

.white-text {
  color: #ffffff;
}

.note-cell {
  vertical-align: top;
  text-align: left;
}

.note-cell > div {
  font-weight: 500;
  margin-bottom: 2px;
}

.remark-title {
  font-weight: 500;
  text-align: center;
  margin-bottom: 2px;
}

.remark-cell {
  vertical-align: top;
}

.empty-row td {
  height: 12px;
  border: none;
}

/* 图片区域 */
.img-cell {
  vertical-align: top;
  padding: 8px !important;
}

.img-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}

.img-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.img-label {
  font-size: 12px;
  color: #606266;
}

.preview-img {
  width: 100%;
  max-width: 220px;
  height: 80px;
  object-fit: cover;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fafafa;
}

/* 订单带出字段红字 */
.order-field :deep(.el-input__inner),
.order-field :deep(.el-select .el-input__inner),
.order-field :deep(.el-date-editor .el-input__inner),
.order-field :deep(.el-input-number .el-input__inner) {
  color: #ff0000;
  font-weight: 500;
}

/* 输入框透明无边框 */
:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  border: none;
  background: transparent;
  padding: 2px 4px;
}

:deep(.el-select .el-input__inner) {
  border: none;
}

/* 打印区域样式（屏幕上也显示） */
  .print-gap {
    height: 0;
    margin: 0;
  }

.print-table .process-header td {
  background: #f5f7fa;
  font-weight: 600;
}

.print-table .process-detail-header td {
  font-size: 12px;
  background: #fafafa;
}

.print-table .process-row td {
  height: 28px;
}

.print-table .check-row td {
  height: 24px;
}

/* ============================================================
   ⭐ 打印样式（A4）
   ============================================================ */
@media print {
  /* A4 纸张 */
  @page {
    size: A4 portrait;
    margin: 8mm 6mm;
  }

  html, body {
    width: 210mm;
    margin: 0;
    padding: 0;
    background: #fff;
  }

  /* 隐藏所有非打印元素 */
  .no-print,
  .card-header,
  .el-card__header {
    display: none !important;
  }

  .repair-form-container {
    background: #fff;
    padding: 0;
    min-height: auto;
  }

  .form-card {
    box-shadow: none;
    border: none;
    margin: 0;
    max-width: 100%;
  }

  .form-card :deep(.el-card__body) {
    padding: 0 !important;
  }

  .table-wrap {
    overflow: visible;
    width: 100%;
  }

  /* 表格整体 */
  .repair-table {
    width: 100%;
    border-collapse: collapse;
    page-break-inside: avoid;
    font-size: 11px;
  }

  .repair-table td {
    border: 1px solid #000;
    padding: 2px 4px;
    height: 22px;
  }

  /* ⭐ 输入框打印时去边框、去背景 */
  :deep(.el-input__inner),
  :deep(.el-textarea__inner) {
    color: #000 !important;
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    font-size: 11px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner),
  :deep(.el-select__wrapper),
  :deep(.el-date-editor) {
    box-shadow: none !important;
    background: transparent !important;
    padding: 0 !important;
  }

  /* 红字保留 */
  .order-field :deep(.el-input__inner),
  .order-field :deep(.el-select .el-input__inner) {
    color: #ff0000 !important;
    font-weight: 500;
  }

  /* 图片打印 */
  .preview-img {
    max-width: 100%;
    height: 70px;
    object-fit: contain;
    border: 1px solid #000;
  }

  /* ⭐ 数据确认行无间隙 */
  .print-table .process-header td {
    padding: 2px 3px !important;
    height: 20px !important;
    line-height: 1.2;
    background: #f5f7fa !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-table .check-row td {
    height: 18px !important;
    padding: 0 !important;
  }

  .print-table .process-detail-header td {
    padding: 2px 3px !important;
    height: 20px !important;
    background: #fafafa !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-table .process-row td {
    height: 22px !important;
    padding: 1px 3px !important;
  }

  /* 打印间隔缩小 */
  .print-gap {
    height: 0 !important;
    margin: 0 !important;
  }

  /* 红底保留颜色 */
  .red-bg {
    background-color: #ff0000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .white-text {
    color: #fff !important;
  }

  /* 表头/底边不重复 */
  thead {
    display: table-header-group;
  }

  tr {
    page-break-inside: avoid;
  }
}
</style>