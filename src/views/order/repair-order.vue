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
        <!-- ⭐ 复制单：能不能带出源单数据，由工厂在这里选（下单时不再选） -->
        <div v-if="copyInfo.isCopyOrder && !isEdit" class="copy-bar no-print">
          <el-icon><CopyDocument /></el-icon>
          <span class="copy-text">
            该单是复制单，来源订单 <b>{{ copyInfo.sourceOrderNo || '—' }}</b>
          </span>
          <span class="copy-switch">
            <span class="copy-switch-label">从复刻订单带出</span>
            <el-switch v-model="bringRepair" :loading="copyInfo.loading" @change="onBringRepairChange" />
          </span>
          <span class="copy-hint">
            {{ bringRepair ? '已带出源单的工费 / 主石 / 钻石价 / 链重等，可改' : '不带出，维修单从空白开始' }}
          </span>
        </div>
        <el-alert
          v-if="copyNotice"
          :title="copyNotice"
          type="success"
          :closable="true"
          show-icon
          class="copy-notice no-print"
          @close="copyNotice = ''"
        />
        <!-- ⭐ 历史钻石带入：同客户 + 同钻石级别，只带钻石部分（石重 / 粒数 / 价格 / 工费） -->
        <div class="diamond-bring-bar no-print">
          <span class="db-level">钻石级别：<b>{{ form.diamondLevel || '未填' }}</b></span>
          <el-button
            size="small"
            type="primary"
            plain
            :loading="diamondBringLoading"
            @click="handleBringDiamond"
          >
            带入历史钻石
          </el-button>
          <span class="db-hint" :class="{ 'is-ok': diamondBringOk }">{{ diamondBringHint }}</span>
        </div>
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
                <td colspan="4">
                  <el-input v-model="form.repairNo" size="small" placeholder="可手填，留空自动生成"/>
                </td>
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
                  <el-input v-model="form.waxOut" size="small" placeholder="手填：是/否/待定"/>
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

              <!-- 第5行：手寸/长度 | 克重要求 | 链重 | 出蜡时间 | 主石石重(ct) | 钻石价格 -->
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
                <td>
                  <el-input v-model="form.chainWeight" size="small" placeholder="手填，可带单位"/>
                </td>
                <td class="label-td">出蜡时间</td>
                <td>
                  <el-date-picker v-model="form.waxOutTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" style="width:100%" size="small"/>
                </td>
                <td class="label-td">主石石重(ct)</td>
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
                <td class="red-text label-td">字印要求</td>
                <td colspan="3" class="order-field">
                  <el-input v-model="form.letterRequirement" size="small" placeholder="订单字印内容，可改"/>
                </td>
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
                      <el-image
                        v-if="imageUrls.product"
                        :src="imageUrls.product"
                        :preview-src-list="[imageUrls.product]"
                        :preview-teleported="true"
                        fit="cover"
                        class="preview-img"
                        alt="产品图"
                      />
                      <div v-else class="preview-img preview-img-empty">暂无图片</div>
                    </div>
                    <div class="img-item">
                      <div class="img-label">字印图片</div>
                      <el-image
                        v-if="imageUrls.letter"
                        :src="imageUrls.letter"
                        :preview-src-list="[imageUrls.letter]"
                        :preview-teleported="true"
                        fit="cover"
                        class="preview-img"
                        alt="字印图"
                      />
                      <div v-else class="preview-img preview-img-empty">暂无图片</div>
                    </div>
                  </div>
                </td>
                <td class="label-td">链条型号</td>
                <td><el-input v-model="form.chainModel" size="small"/></td>
                <td class="label-td">倒模重</td>
                <td><el-input-number v-model="form.moldWeight" :min="0" :precision="2" style="width:100%" size="small"/></td>
                <td class="label-td">副石石重(ct)</td>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { CopyDocument } from '@element-plus/icons-vue'
import { createRepair, updateRepair, getRepairDetail, getRepairByOrderId } from '../../api/repair'
import { getCustomerList } from '../../api/customer'
import { getDiamondBring } from '../../api/order'
import { dictApi } from '../../api/dict'

const router = useRouter()
const route = useRoute()
const isEdit = computed(() => route.params.id && route.params.id !== 'create')
const orderId = computed(() => parseInt(route.query.orderId) || null)
// ⭐ 保存/取消后回到进来的那一页（订单编辑 → 维修单要回订单编辑，不要跳订单列表）
const fromPath = computed(() => {
  const f = route.query.from
  return typeof f === 'string' && f ? f : '/order/factory-edit-list'
})

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

// ⭐ 复制下单提示（带出来源维修单时显示）
const copyNotice = ref('')

// ⭐ 复制单：是否带出源订单维修单数据，由工厂在这里选（下单时不再选）
const copyInfo = reactive({ isCopyOrder: false, sourceOrderNo: '', loading: false })
const bringRepair = ref(true)

// ⭐ 历史钻石带入：同客户 + 同钻石级别才允许带，只带钻石部分（石重 / 粒数 / 价格 / 工费）
const diamondBringLoading = ref(false)
const diamondBringOk = ref(false)
const DIAMOND_BRING_TIP = '按同客户 + 同钻石级别匹配历史订单，只带主石/副石石重、粒数、价格、工费'
const diamondBringHint = ref(DIAMOND_BRING_TIP)

const handleBringDiamond = async () => {
  const level = String(form.diamondLevel || '').trim()
  const customerId = Number(form.customerId || 0)
  if (!level) {
    ElMessage.warning('该单没有钻石级别：只有级别相同才允许带入')
    return
  }
  if (!customerId) {
    ElMessage.warning('请先选择客户，才能匹配历史订单')
    return
  }

  const hasData = ['mainStoneWeight', 'mainStoneCount', 'mainStoneLaborFee', 'diamondPrice',
    'sideStoneWeight', 'sideStoneCount', 'sideStonePrice', 'sideStoneLaborFee']
    .some(k => Number(form[k] || 0) > 0)
  if (hasData) {
    try {
      await ElMessageBox.confirm(
        '当前维修单已填钻石数据，带入会覆盖石重 / 粒数 / 价格 / 工费，继续吗？',
        '带入历史钻石数据',
        { type: 'warning', confirmButtonText: '覆盖带入', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
  }

  diamondBringLoading.value = true
  diamondBringOk.value = false
  try {
    const res = await getDiamondBring({ customerId, diamondLevel: level })
    const d = res?.data || res || {}
    if (!d.found) {
      diamondBringHint.value = d.message || '没有找到级别相同且填过钻石数据的历史订单'
      ElMessage.info(diamondBringHint.value)
      return
    }

    // ⭐ 只写钻石部分：主石（石重/粒数/单价/工费）、副石（石重/粒数/单价/工费）
    const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
    form.mainStoneWeight = num(d.mainStoneWeight)
    form.mainStoneCount = num(d.mainStoneQty)
    form.mainStoneLaborFee = num(d.mainStoneSettingFee)
    form.diamondPrice = num(d.mainStonePrice)
    form.sideStoneWeight = num(d.subStoneWeight)
    form.sideStoneCount = num(d.subStoneQty)
    form.sideStonePrice = num(d.subStonePrice)
    form.sideStoneLaborFee = num(d.subStoneSettingFee)

    diamondBringOk.value = true
    const dateStr = d.sourceOrderDate ? String(d.sourceOrderDate).slice(0, 10) : ''
    diamondBringHint.value = `已带入 来源 ${d.sourceOrderNo || d.sourceOrderId}${dateStr ? '（' + dateStr + '）' : ''} 的钻石数据`
    ElMessage.success('已带入历史钻石数据')
  } catch (e) {
    diamondBringHint.value = e?.message || '带入失败，请重试'
    ElMessage.error(diamondBringHint.value)
  } finally {
    diamondBringLoading.value = false
  }
}

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
  diamondLevel: '',
  letterRequirement: '',
  orderDate: '',
  deliveryDate: '',
  serialNo: '',

  // 工厂手填字段
  chainWeight: '',      // ⭐ 文本，可手填
  waxOut: '',           // ⭐ 文本，可手填
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

// ⭐ 订单预填（复制单切换「带出/不带出」时会再跑一遍，所以单独抽出来）
const applyOrderPrefill = (data) => {
  // ⭐ 只带 12 个字段
  form.orderId = data.orderId || orderId.value
  form.customerId = data.customerId
  form.productName = data.productName || ''
  form.quantity = data.quantity || 1
  form.size = data.size || ''
  form.color = data.color || ''
  form.weightRequirement = data.weightRequirement || ''
  form.widthThick = data.widthThick ? Number(data.widthThick) : null
  form.diamondLevel = data.diamondLevel || ''
  form.letterRequirement = data.letterRequirement || data.logoText || ''
  form.orderDate = data.orderDate || ''
  form.deliveryDate = data.deliveryDate || ''
  form.serialNo = data.serialNo || ''

  // ⭐ 额外带入：钻石 / 石重 / 工费 / 粒数 / 副石 / 倒模（没有则空着）
  const numOrNull = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
  form.mainStoneWeight = numOrNull(data.mainStoneWeight)
  form.mainStoneCount = numOrNull(data.mainStoneQty ?? data.mainStoneCount)
  form.mainStoneLaborFee = numOrNull(data.mainStoneSettingFee ?? data.mainStoneLaborFee)
  form.diamondPrice = numOrNull(data.mainStonePrice ?? data.diamondPrice)
  form.laborFee = numOrNull(data.laborFee)
  form.moldFee = numOrNull(data.moldFee)
  form.sideStoneWeight = numOrNull(data.subStoneWeight ?? data.sideStoneWeight)
  form.sideStoneCount = numOrNull(data.subStoneQty ?? data.sideStoneCount)
  form.sideStonePrice = numOrNull(data.subStonePrice ?? data.sideStonePrice)
  form.sideStoneLaborFee = numOrNull(data.subStoneSettingFee ?? data.sideStoneLaborFee)

  // ⭐ 复制单带出来源维修单的其余字段（可改）；不带出时这些保持空白
  //    ⚠️ 文本字段必须给空串而不是 null：后端 DTO 里这些列可空，
  //       但传 null 会撞上 .NET 的隐式必填校验（「Note 为必填项」那串报错）
  const copyTextKeys = ['clasp', 'chainModel', 'chainWeight', 'waxOut', 'note', 'remark2']
  const copyNumKeys = ['claspFee', 'moldWeight', 'steelWeight', 'waxOutTime',
    'customerStoneWeight', 'customerGoldWeight', 'bezelWeight',
    'polishWeight', 'waxOutFee', 'polishOtherFee', 'cncFee']
  copyTextKeys.forEach(k => { form[k] = data.fromCopy ? (data[k] ?? '') : '' })
  copyNumKeys.forEach(k => { form[k] = data.fromCopy ? (data[k] ?? null) : null })
  if (data.fromCopy) form.letterRequirement = data.letterRequirement || form.letterRequirement

  copyNotice.value = data.fromCopy
    ? (data.sourceRepairNo
      ? `已带出复制来源订单的维修单（${data.sourceRepairNo}）数据，可直接修改`
      : '已带出复制来源订单的维修单数据，可直接修改')
    : ''

  // 图片
  imageUrls.product = data.productImage || ''
  imageUrls.letter = data.letterImage || ''
}

// ⭐ 工厂切换「从复刻订单带出」：重新拉一次预填（带/不带源单维修单数据）
const onBringRepairChange = async (val) => {
  if (!orderId.value) return
  if (!val) {
    try {
      await ElMessageBox.confirm(
        '关闭后，已带出的源单维修单数据（工费 / 主石 / 钻石价 / 链重 等）会被清空，确定不从这个复刻订单带出吗？',
        '不从复刻订单带出',
        { type: 'warning', confirmButtonText: '确定不带出', cancelButtonText: '仍然带出' }
      )
    } catch {
      bringRepair.value = true
      return
    }
  }
  copyInfo.loading = true
  try {
    const res = await getRepairByOrderId(orderId.value, val ? 1 : 0)
    if (res.success && res.isNew) {
      applyOrderPrefill(res.data)
      ElMessage.success(val ? '已从复刻订单带出' : '已清空带出数据，从空白开始')
    }
  } catch (e) {
    ElMessage.error('切换失败，请重试')
  } finally {
    copyInfo.loading = false
  }
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
        applyOrderPrefill(data)
        // ⭐ 复制单：把「来源单号 + 当前带出开关」放到页面上，由工厂决定
        copyInfo.isCopyOrder = !!data.isCopyOrder
        copyInfo.sourceOrderNo = data.sourceOrderNo || ''
        bringRepair.value = data.copyBringRepair === undefined || data.copyBringRepair === null
          ? true
          : Number(data.copyBringRepair) === 1

        ElMessage.success(data.fromCopy ? '已从复制来源订单带出维修单数据' : '已从订单带入数据')
      } else if (res.success && !res.isNew) {
        ElMessage.info('该订单已有维修单，正在跳转...')
        router.push({ path: `/repair/edit/${res.data.id}`, query: route.query.from ? { from: route.query.from } : {} })
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
      // ⭐ 维修单不做必填控制：文本字段一律补空串，避免后端隐式必填校验把保存拦掉
      const textFields = ['repairNo', 'customerName', 'productName', 'serialNo', 'color', 'size',
        'weightRequirement', 'diamondLevel', 'letterRequirement', 'chainWeight', 'waxOut',
        'clasp', 'chainModel', 'note', 'remark', 'remark2', 'productImage', 'letterImage']
      textFields.forEach(k => {
        if (submitData[k] === null || submitData[k] === undefined) submitData[k] = ''
      })
      // ⭐ 日期字段空值要给 null（空串会被后端当成「格式不正确」）
      ;['orderDate', 'deliveryDate', 'waxOutTime'].forEach(k => {
        if (submitData[k] === '' || submitData[k] === undefined) submitData[k] = null
      })
      // ⭐ 编号可手填：留空由后端自动生成（编辑时留空 = 保持原编号）
      submitData.repairNo = (form.repairNo || '').trim()
      submitData.chainWeight = (form.chainWeight || '').toString().trim()
      submitData.waxOut = (form.waxOut || '').toString().trim()
      submitData.letterRequirement = (form.letterRequirement || '').toString().trim()
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
        router.push(fromPath.value)
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

const handleCancel = () => router.push(fromPath.value)

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

          /* ===== 图片 =====
             ⚠️ 打印窗口是新开的空白页，没有引入 Element Plus 的 CSS，
              el-image 内部的 <img> 没有任何尺寸约束 → 按原图尺寸渲染，
              一张图就能占满整页。这里必须把 img 明确锁进小框里。 */
          .img-cell { vertical-align: top; }
          .img-group { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
          .img-item { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
          .img-label { font-size: 10px; text-align: left; color: #333; }

          .preview-img,
          .preview-img .el-image__inner {
            display: block !important;
            width: 200px !important;
            min-width: 0 !important;
            max-width: 200px !important;
            height: 70px !important;
            max-height: 70px !important;
            object-fit: cover !important;
            overflow: hidden !important;
            border: 1px solid #000;
            background: #fff;
            line-height: 0;
          }
          .preview-img.preview-img-empty {
            display: flex !important;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #999;
            border-color: #000;
          }

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

.copy-notice {
  margin-bottom: 10px;
}

/* ⭐ 复制单「从复刻订单带出」开关条 */
.copy-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 9px 14px;
  margin-bottom: 10px;
  background: #f0f7ff;
  border: 1px solid #c6e2ff;
  border-radius: 6px;
  font-size: 13px;
  color: #303133;
}
.copy-bar .copy-text b { color: #409eff; }
.copy-bar .copy-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
.copy-bar .copy-switch-label { font-weight: 600; }
.copy-bar .copy-hint { color: #909399; font-size: 12px; }

/* ⭐ 历史钻石带入条（维修单顶部） */
.diamond-bring-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 14px;
  margin-bottom: 10px;
  background: #fdf6ec;
  border: 1px solid #f5dab1;
  border-radius: 6px;
  font-size: 13px;
  color: #303133;
}
.diamond-bring-bar .db-level { color: #606266; }
.diamond-bring-bar .db-level b { color: #1d2129; }
.diamond-bring-bar .db-hint { color: #909399; font-size: 12px; }
.diamond-bring-bar .db-hint.is-ok { color: #67c23a; }

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
  cursor: zoom-in;
  display: block;
}

.preview-img :deep(img) {
  object-fit: cover;
}

.preview-img-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 12px;
  cursor: default;
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

  /* 图片打印：固定小图（与屏幕 220×80 接近），避免按原图尺寸撑满整页 */
  .preview-img {
    width: 200px !important;
    max-width: 200px !important;
    height: 70px !important;
    overflow: hidden !important;
    border: 1px solid #000;
  }
  .preview-img :deep(img),
  .preview-img .el-image__inner {
    width: 100% !important;
    height: 100% !important;
    max-width: 100% !important;
    max-height: 100% !important;
    object-fit: cover !important;
    display: block !important;
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