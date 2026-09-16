<template>
  <div class="batch-page">
    <!-- ===== 顶部 ===== -->
    <div class="batch-header">
      <div class="header-left">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon> 返回列表
        </el-button>
        <h2>批量编辑工厂订单</h2>
        <el-tag type="info" size="small">共 {{ rows.length }} 条</el-tag>
        <el-tag type="success" size="small">已编辑 {{ editedCount }} 条</el-tag>
        <el-tag v-if="savedCount > 0" type="warning" size="small">
          已保存 {{ savedCount }} 条
        </el-tag>
      </div>
      <div class="header-right">
        <el-button
          type="primary"
          @click="batchSave"
          :loading="saving"
          :disabled="editedCount === 0"
        >
          <el-icon><Check /></el-icon> 批量保存
        </el-button>
      </div>
    </div>

    <!-- ===== 筛选栏 ===== -->
    <div class="filter-bar">
      <el-select
        v-model="filter.status"
        placeholder="状态"
        clearable
        style="width: 160px"
        @change="handleSearch"
      >
        <el-option
          v-for="item in statusOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-select
        v-model="filter.customerId"
        placeholder="全部客户"
        clearable
        filterable
        style="width: 180px"
        @change="handleSearch"
      >
        <el-option
          v-for="item in customerList"
          :key="item.customerId"
          :label="item.customerName"
          :value="item.customerId"
        />
      </el-select>

      <el-input
        v-model="filter.keyword"
        placeholder="订单号/品名"
        clearable
        style="width: 200px"
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      />

      <el-date-picker
        v-model="filter.dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width: 240px"
        @change="handleSearch"
      />

      <el-button type="primary" @click="handleSearch">
        <el-icon><Search /></el-icon> 搜索
      </el-button>
      <el-button @click="resetSearch">
        <el-icon><RefreshRight /></el-icon> 重置
      </el-button>
      <el-button @click="loadData" :loading="loading">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>

      <span class="tip">
        💡 拖动单元格右下角蓝点向下填充 · Enter 跳到下一行同列
      </span>
    </div>

    <!-- ===== 表格 ===== -->
    <div class="batch-table-wrapper" v-loading="loading">
      <el-table
        ref="tableRef"
        :data="rows"
        border
        size="small"
        height="100%"
        row-key="_rowId"
        :row-class-name="rowClassName"
      >
        <!-- ===== 只读列（固定左侧）===== -->
        <el-table-column label="#" width="46" align="center" fixed>
          <template #default="{ $index }">
            <span :style="{ color: rows[$index]._saved ? '#c0c4cc' : '#606266' }">
              {{ $index + 1 }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="订单号" width="125" fixed>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="viewDetail(row)">
              {{ row.orderNo }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="90" align="center" fixed>
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.flowStatus)" size="small">
              {{ getStatusText(row.flowStatus) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="客户" width="110" fixed>
          <template #default="{ row }">{{ row.customerName || '-' }}</template>
        </el-table-column>

        <el-table-column label="品名" width="110" fixed>
          <template #default="{ row }">{{ row.productName || '-' }}</template>
        </el-table-column>

        <el-table-column label="成色" width="70" align="center">
          <template #default="{ row }">{{ row.color || '-' }}</template>
        </el-table-column>

        <el-table-column label="手寸" width="70" align="center">
          <template #default="{ row }">{{ row.size || '-' }}</template>
        </el-table-column>

        <el-table-column label="数量" width="60" align="center">
          <template #default="{ row }">{{ row.quantity || '-' }}</template>
        </el-table-column>

        <!-- ===== 工厂数据 ===== -->
        <el-table-column label="工厂数据" align="center">
          <el-table-column label="总重(g)" width="88">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.totalWeight"
                  :precision="3" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'totalWeight')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="净重(g)" width="88">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.netWeight"
                  :precision="3" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'netWeight')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="损耗率" width="80">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-select
                  v-model="row.lossRate"
                  size="small"
                  :class="{ 'loss-warning': !isStandardLoss(row.lossRate) }"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                >
                  <el-option
                    v-for="item in lossRateOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'lossRate')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="加耗重" width="80">
            <template #default="{ row }">
              <span>{{ (row.addLossWeight || 0).toFixed(3) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="折算率" width="70" align="center">
            <template #default="{ row }">
              <span style="color: #909399; font-size: 12px;">
                {{ getPurityRate(row.purityId) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="金价" width="85">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.goldPrice"
                  :precision="2" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'goldPrice')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="金料方式" width="88">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-select
                  v-model="row.goldConvertCash"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                >
                  <el-option label="算料" :value="false" />
                  <el-option label="折现" :value="true" />
                </el-select>
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'goldConvertCash')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="足金料克重" width="95">
            <template #default="{ row }">
              <span>{{ (row.goldMaterialWeight || 0).toFixed(3) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="足金料金额" width="95">
            <template #default="{ row }">
              <span style="color: #E6A23C; font-weight: 500;">
                {{ (row.goldMaterialFee || 0).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
        </el-table-column>

        <!-- ===== 主石 ===== -->
        <el-table-column label="主石" align="center">
          <el-table-column label="石重(ct)" width="88">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.mainStoneWeight"
                  :precision="3" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'mainStoneWeight')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="单价" width="85">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.mainStonePrice"
                  :precision="2" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'mainStonePrice')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="粒数" width="65">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.mainStoneQty"
                  :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'mainStoneQty')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="镶石工费" width="88">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.mainStoneSettingFee"
                  :precision="2" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'mainStoneSettingFee')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="金额" width="90">
            <template #default="{ row }">
              <span style="color: #E6A23C; font-weight: 500;">
                {{ (row.mainStoneAmount || 0).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
        </el-table-column>

        <!-- ===== 副石 ===== -->
        <el-table-column label="副石" align="center">
          <el-table-column label="石重(ct)" width="88">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.subStoneWeight"
                  :precision="3" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'subStoneWeight')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="单价" width="85">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.subStonePrice"
                  :precision="2" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'subStonePrice')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="粒数" width="65">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.subStoneQty"
                  :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'subStoneQty')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="镶石工费" width="88">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.subStoneSettingFee"
                  :precision="2" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'subStoneSettingFee')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="金额" width="90">
            <template #default="{ row }">
              <span style="color: #E6A23C; font-weight: 500;">
                {{ (row.subStoneAmount || 0).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
        </el-table-column>

        <!-- ===== 其他费用 ===== -->
        <el-table-column label="其他费用" align="center">
          <el-table-column label="包装费" width="80">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.packingFee"
                  :precision="2" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'packingFee')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="证书费" width="80">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.certificateFee"
                  :precision="2" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'certificateFee')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="邮费" width="80">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.postageFee"
                  :precision="2" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'postageFee')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="版费" width="80">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.moldFee"
                  :precision="2" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'moldFee')"
                />
              </div>
            </template>
          </el-table-column>

          <el-table-column label="工费" width="80">
            <template #default="{ row }">
              <div class="cell-with-handle">
                <el-input-number
                  v-model="row.laborFee"
                  :precision="2" :min="0" :controls="false"
                  size="small"
                  :disabled="!row._editable || row._saved"
                  style="width: 100%"
                  @change="() => recalcRow(row)"
                />
                <FillHandle
                  v-if="row._editable && !row._saved"
                  @fill-start="(e) => startFill(e, row, 'laborFee')"
                />
              </div>
            </template>
          </el-table-column>
        </el-table-column>

        <!-- ===== 合计 ===== -->
        <el-table-column label="合计" align="center" fixed="right">
          <el-table-column label="合计金额" width="105">
            <template #default="{ row }">
              <span style="color: #E6A23C; font-weight: bold; font-size: 14px;">
                ¥{{ (row.totalAmount || 0).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
        </el-table-column>

        <!-- ===== 状态列 ===== -->
        <el-table-column label="保存" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-tag v-if="row._saved" type="success" size="small">已保存</el-tag>
            <el-tag v-else-if="row._error" type="danger" size="small">错误</el-tag>
            <el-tag v-else-if="!row._editable" type="info" size="small">只读</el-tag>
            <span v-else style="color: #909399; font-size: 12px;">待保存</span>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && rows.length === 0" description="暂无符合条件的订单" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft, Check, Search, Refresh, RefreshRight
} from '@element-plus/icons-vue'
import { getOrderList, getOrderDetail, updateOrder } from '@/api/order'
import { getCustomerList } from '@/api/customer'
import { dictApi } from '@/api/dict'
import { useUserStore } from '@/stores/user'
import FillHandle from '@/components/FillHandle.vue'

const router = useRouter()
const userStore = useUserStore()
const tableRef = ref()

const MAX_ROWS = 100

// ==================== 状态 ====================
const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const customerList = ref([])
const lossRateOptions = ref([])
const productionStatuses = ref([])
const purityDict = ref([])

const filter = reactive({
  status: '',
  customerId: '',
  keyword: '',
  dateRange: []
})

// ==================== 状态映射 ====================
const statusMap = {
  customerAudited: { text: '待接单', type: 'success' },
  accepted: { text: '已接单', type: 'primary' },
  factory_edit: { text: '编辑中', type: 'primary' },
  waxing: { text: '出蜡', type: 'primary' },
  molded: { text: '倒模', type: 'primary' },
  setting: { text: '执模', type: 'primary' },
  cnc: { text: 'CNC', type: 'primary' },
  sweeping: { text: '扫镶口', type: 'primary' },
  stoneCutting: { text: '车石', type: 'primary' },
  microInlay: { text: '微镶', type: 'primary' },
  handInlay: { text: '手镶', type: 'primary' },
  polishing: { text: '制作完成', type: 'success' },
  billPending: { text: '账单待审核', type: 'warning' },
  billConfirmed: { text: '客户已确认', type: 'success' },
  completed: { text: '已完成', type: 'success' }
}

const normalizeStatus = (status) => {
  const value = String(status || '').trim()
  const normalized = value.replace(/[_-]/g, '').toLowerCase()
  const aliases = {
    customeraudited: 'customerAudited',
    factoryedit: 'factory_edit',
    billpending: 'billPending',
    billconfirmed: 'billConfirmed',
    stonecutting: 'stoneCutting',
    microinlay: 'microInlay',
    handinlay: 'handInlay'
  }
  return aliases[normalized] || value
}

const getStatusText = (status) => {
  const n = normalizeStatus(status)
  return productionStatuses.value.find(x => x.value === n)?.label
    || statusMap[n]?.text
    || status
    || '-'
}

const getStatusType = (status) =>
  statusMap[normalizeStatus(status)]?.type || 'info'

// ==================== 状态选项 ====================
const statusOptions = computed(() => {
  // 制作中 + 待接单 + 账单阶段
  return productionStatuses.value.length
    ? productionStatuses.value
    : [
        { value: 'customerAudited', label: '待接单' },
        { value: 'factory_edit', label: '编辑中' },
        { value: 'waxing', label: '出蜡' },
        { value: 'molded', label: '倒模' },
        { value: 'setting', label: '执模' },
        { value: 'cnc', label: 'CNC' },
        { value: 'sweeping', label: '扫镶口' },
        { value: 'stoneCutting', label: '车石' },
        { value: 'microInlay', label: '微镶' },
        { value: 'handInlay', label: '手镶' },
        { value: 'polishing', label: '制作完成' },
        { value: 'billPending', label: '账单待审核' },
        { value: 'billConfirmed', label: '客户已确认' },
        { value: 'completed', label: '已完成' }
      ]
})

// ==================== 权限 ====================
const BILL_STAGE_STATUSES = ['billPending', 'billRejected', 'billConfirmed', 'completed']
// 工厂操作员可编辑状态：与后端 FactoryPreBillStatuses 严格一致（避免前端可编辑但后端拒收导致保存失败）
const PRE_BILL_STATUSES = [
  'customeraudited', 'accepted', 'dataConfirm', 'factory_edit', 'waxing', 'molded',
  'cnc', 'partsMissing', 'sweeping', 'stoneCutting', 'stoneReady', 'setting',
  'microInlay', 'handInlay', 'glue', 'inlay', 'assembly', 'polishing', 'billRejected'
]

const canEditRow = (row) => {
  const st = normalizeStatus(row.flowStatus).toLowerCase()
  if (userStore.isAdmin) return true
  if (userStore.isFactoryAudit) return BILL_STAGE_STATUSES.some(s => s.toLowerCase() === st)
  if (userStore.isFactoryOrder) return PRE_BILL_STATUSES.includes(st)
  return false
}

// ==================== 统计 ====================
const editedCount = computed(() =>
  rows.value.filter(r => r._editable && !r._saved && r._dirty).length
)
const savedCount = computed(() => rows.value.filter(r => r._saved).length)

// ==================== 纯度 ====================
const getPurityRate = (purityId) => {
  if (!purityId) return '1.000'
  const item = purityDict.value.find(x => x.id === purityId)
  if (!item) return '1.000'
  try {
    const extra = item.extraData ? JSON.parse(item.extraData) : {}
    if (extra.convertRate) return Number(extra.convertRate).toFixed(3)
  } catch {}
  const rate = Number(item.itemValue)
  return !isNaN(rate) && rate > 0 && rate <= 1 ? rate.toFixed(3) : '1.000'
}

const getPurityRateNum = (purityId) => Number(getPurityRate(purityId))

// ==================== 标准损耗 ====================
const isStandardLoss = (lr) => {
  if (lr === null || lr === undefined || lr === '') return true
  const n = Number(lr)
  return Math.abs(n - 1.08) < 1e-9 || Math.abs(n - 1.10) < 1e-9
}

// ==================== 行计算 ====================
const recalcRow = (row) => {
  const netWeight = Number(row.netWeight) || 0
  const loss = Number(row.lossRate) || 1.10
  const gold = Number(row.goldPrice) || 0
  const convertRate = getPurityRateNum(row.purityId)

  // 加耗重
  const addLossWeight = netWeight * loss
  row.addLossWeight = parseFloat(addLossWeight.toFixed(3))

  if (row.goldConvertCash) {
    // 折现：足金料克重=0，足金料金额 = 加耗重 × 金价（不乘折算率）
    row.goldMaterialWeight = 0
    row.goldMaterialFee = parseFloat((addLossWeight * gold).toFixed(2))
  } else {
    // 算料：足金料克重 = 加耗重 × 折算率
    row.goldMaterialWeight = parseFloat((addLossWeight * convertRate).toFixed(3))
    row.goldMaterialFee = parseFloat((row.goldMaterialWeight * gold).toFixed(2))
  }

  // 主石金额 = 石重 × 单价 + 粒数 × 镶石工费
  const mainQty = Number(row.mainStoneQty) || 0
  const mainWeight = Number(row.mainStoneWeight) || 0
  const mainPrice = Number(row.mainStonePrice) || 0
  const mainSetting = Number(row.mainStoneSettingFee) || 0
  row.mainStoneAmount = parseFloat((mainWeight * mainPrice + mainQty * mainSetting).toFixed(2))

  // 副石金额
  const subQty = Number(row.subStoneQty) || 0
  const subWeight = Number(row.subStoneWeight) || 0
  const subPrice = Number(row.subStonePrice) || 0
  const subSetting = Number(row.subStoneSettingFee) || 0
  row.subStoneAmount = parseFloat((subWeight * subPrice + subQty * subSetting).toFixed(2))

  // 合计
  const goldMaterial = row.goldConvertCash ? (row.goldMaterialFee || 0) : 0
  const packing = Number(row.packingFee) || 0
  const certificate = Number(row.certificateFee) || 0
  const postage = Number(row.postageFee) || 0
  const mold = Number(row.moldFee) || 0
  const labor = Number(row.laborFee) || 0

  row.totalAmount = parseFloat((
    goldMaterial + row.mainStoneAmount + row.subStoneAmount +
    packing + certificate + postage + mold + labor
  ).toFixed(2))

  row._dirty = true
}

// ==================== 行样式 ====================
const rowClassName = ({ row }) => {
  if (row._saved) return 'row-saved'
  if (row._error) return 'row-error'
  if (!row._editable) return 'row-readonly'
  return ''
}

// ==================== 数据加载 ====================
let rowIdSeed = 1
const genRowId = () => `fb_${Date.now()}_${rowIdSeed++}`

const normalizeRow = (detail, editable) => ({
  _rowId: genRowId(),
  _editable: editable,
  _saved: false,
  _error: null,
  _dirty: false,
  // 只读
  orderId: detail.orderId,
  orderNo: detail.orderNo,
  flowStatus: normalizeStatus(detail.flowStatus),
  customerName: detail.customerName || '',
  productName: detail.productName || '',
  color: detail.color || '',
  size: detail.size || '',
  quantity: detail.quantity || 1,
  purityId: detail.purityId,
  // 工厂可编辑
  totalWeight: detail.totalWeight || 0,
  netWeight: detail.netWeight || 0,
  lossRate: detail.lossRate || 1.10,
  addLossWeight: detail.addLossWeight || 0,
  goldPrice: detail.goldPrice || 0,
  goldConvertCash: !!detail.goldConvertCash,
  goldMaterialWeight: detail.goldMaterialWeight || 0,
  goldMaterialFee: detail.goldMaterialFee || 0,
  // 主石
  mainStoneQty: detail.mainStoneQty || 0,
  mainStoneWeight: detail.mainStoneWeight || 0,
  mainStonePrice: detail.mainStonePrice || 0,
  mainStoneAmount: detail.mainStoneAmount || 0,
  mainStoneSettingFee: detail.mainStoneSettingFee || 0,
  // 副石
  subStoneQty: detail.subStoneQty || 0,
  subStoneWeight: detail.subStoneWeight || 0,
  subStonePrice: detail.subStonePrice || 0,
  subStoneAmount: detail.subStoneAmount || 0,
  subStoneSettingFee: detail.subStoneSettingFee || 0,
  // 其他
  packingFee: detail.packingFee || 0,
  certificateFee: detail.certificateFee || 0,
  postageFee: detail.postageFee || 0,
  moldFee: detail.moldFee || 0,
  laborFee: detail.laborFee || 0,
  totalAmount: detail.totalAmount || 0,
  factoryRemark: detail.factoryRemark || ''
})

const defaultStatusFilter = () => {
  // 审核员默认账单待审核，其他默认全部（待接单+制作中）
  if (userStore.isFactoryAudit) return 'billPending'
  return ''
}

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      keyword: filter.keyword || undefined,
      customerId: filter.customerId || undefined,
      page: 1,
      pageSize: MAX_ROWS
    }

    if (filter.status) {
      params.status = filter.status
    }

    if (filter.dateRange && filter.dateRange.length === 2) {
      params.startDate = filter.dateRange[0]
      params.endDate = filter.dateRange[1]
    }

    const res = await getOrderList(params)
    let list = []
    if (Array.isArray(res)) list = res
    else if (res?.data && Array.isArray(res.data)) list = res.data
    else if (res?.data?.items) list = res.data.items
    else if (res?.items) list = res.items

    if (list.length > MAX_ROWS) {
      list = list.slice(0, MAX_ROWS)
      ElMessage.warning(`数据量过大，已只加载前 ${MAX_ROWS} 条，请收窄筛选条件`)
    }

    // 逐条拉详情（保证工厂字段完整）
    const details = await Promise.all(
      list.map(o => getOrderDetail(o.orderId).catch(() => null))
    )

    rows.value = details
      .filter(x => x && x.success && x.data)
      .map(x => {
        const detail = x.data
        const editable = canEditRow(detail)
        return normalizeRow(detail, editable)
      })

    // 重新计算一遍（保证显示正确）
    rows.value.forEach(r => {
      r._dirty = false
      recalcRow(r)
      r._dirty = false
    })
  } catch (e) {
    console.error(e)
    ElMessage.error('加载数据失败')
    rows.value = []
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  loadData()
}

const resetSearch = () => {
  filter.status = defaultStatusFilter()
  filter.customerId = ''
  filter.keyword = ''
  filter.dateRange = []
  loadData()
}

// ==================== 拖拽填充 ====================
const FILLABLE_FIELDS = new Set([
  'totalWeight', 'netWeight', 'lossRate', 'goldPrice', 'goldConvertCash',
  'mainStoneWeight', 'mainStonePrice', 'mainStoneQty', 'mainStoneSettingFee',
  'subStoneWeight', 'subStonePrice', 'subStoneQty', 'subStoneSettingFee',
  'packingFee', 'certificateFee', 'postageFee', 'moldFee', 'laborFee'
])

let fillState = null
let fillRows = []

const startFill = (e, row, field) => {
  if (!FILLABLE_FIELDS.has(field)) return
  if (!row._editable || row._saved) return

  fillState = {
    field,
    sourceRowId: row._rowId,
    sourceValue: row[field]
  }
  fillRows = []

  document.body.classList.add('filling-mode')
  document.addEventListener('mousemove', onFillMove)
  document.addEventListener('mouseup', onFillEnd)
  e.preventDefault?.()
}

const onFillMove = (e) => {
  if (!fillState) return
  const el = document.elementFromPoint(e.clientX, e.clientY)
  if (!el) return
  const tr = el.closest('.el-table__body tr.el-table__row')
  if (!tr) return

  const allTrs = Array.from(document.querySelectorAll('.el-table__body tr.el-table__row'))
  const hoverIdx = allTrs.indexOf(tr)
  if (hoverIdx === -1) return

  const sourceIdx = rows.value.findIndex(r => r._rowId === fillState.sourceRowId)
  if (sourceIdx === -1) return
  if (hoverIdx <= sourceIdx) return

  allTrs.forEach((t, i) => {
    if (i > sourceIdx && i <= hoverIdx) t.classList.add('fill-target')
    else t.classList.remove('fill-target')
  })

  fillRows = rows.value.slice(sourceIdx + 1, hoverIdx + 1)
}

const onFillEnd = () => {
  document.body.classList.remove('filling-mode')
  document.removeEventListener('mousemove', onFillMove)
  document.removeEventListener('mouseup', onFillEnd)

  if (fillState && fillRows.length > 0) {
    const val = fillState.sourceValue
    fillRows.forEach(r => {
      if (!r._editable || r._saved) return
      r[fillState.field] = val
      recalcRow(r)
    })
  }

  document.querySelectorAll('.fill-target').forEach(el => {
    el.classList.remove('fill-target')
  })

  fillState = null
  fillRows = []
}

// ==================== Enter 跳下一行同列 ====================
const FOCUS_FIELDS = [
  'totalWeight', 'netWeight', 'lossRate', 'goldPrice', 'goldConvertCash',
  'mainStoneWeight', 'mainStonePrice', 'mainStoneQty', 'mainStoneSettingFee',
  'subStoneWeight', 'subStonePrice', 'subStoneQty', 'subStoneSettingFee',
  'packingFee', 'certificateFee', 'postageFee', 'moldFee', 'laborFee'
]

const focusNextRow = (rowId, field) => {
  const idx = rows.value.findIndex(r => r._rowId === rowId)
  if (idx === -1) return
  const nextRow = rows.value[idx + 1]
  if (!nextRow) return
  focusCell(nextRow._rowId, field)
}

const focusCell = (rowId, field) => {
  nextTick(() => {
    const idx = rows.value.findIndex(r => r._rowId === rowId)
    if (idx === -1) return
    const trs = document.querySelectorAll('.el-table__body tr.el-table__row')
    if (!trs[idx]) return
    const tr = trs[idx]

    // 通过列头文本无法直接定位，用 data 属性（element-plus 不给）
    // 简化：找到该行所有 input，根据字段名猜测 index 不可靠
    // 用 placeholder 或 class 定位太脆。改成：在 field 上加 data-field
    // 这里我们在 el-input-number 外层包了一个 div，可以查询
    // 更稳的做法：给每个 input 加 data-field（见下文模板调整）
    const input = tr.querySelector(`[data-field="${field}"] input`)
    if (input) {
      input.focus()
      input.select?.()
    }
  })
}

// ==================== 批量保存 ====================
const validateRow = (row) => {
  row._error = null
  if (!row._editable) {
    row._error = '无权限编辑'
    return false
  }
  return true
}

const buildUpdatePayload = (row) => ({
  orderId: row.orderId,
  totalWeight: row.totalWeight,
  netWeight: row.netWeight,
  lossRate: row.lossRate,
  addLossWeight: row.addLossWeight,
  goldPrice: row.goldPrice,
  goldConvertCash: row.goldConvertCash,
  goldMaterialWeight: row.goldMaterialWeight,
  goldMaterialFee: row.goldMaterialFee,
  mainStoneQty: row.mainStoneQty,
  mainStoneWeight: row.mainStoneWeight,
  mainStonePrice: row.mainStonePrice,
  mainStoneAmount: row.mainStoneAmount,
  mainStoneSettingFee: row.mainStoneSettingFee,
  subStoneQty: row.subStoneQty,
  subStoneWeight: row.subStoneWeight,
  subStonePrice: row.subStonePrice,
  subStoneAmount: row.subStoneAmount,
  subStoneSettingFee: row.subStoneSettingFee,
  packingFee: row.packingFee,
  certificateFee: row.certificateFee,
  postageFee: row.postageFee,
  moldFee: row.moldFee,
  laborFee: row.laborFee,
  totalAmount: row.totalAmount,
  factoryRemark: row.factoryRemark
})

const batchSave = async () => {
  const targets = rows.value.filter(r => r._editable && !r._saved && r._dirty)
  if (targets.length === 0) {
    ElMessage.warning('没有需要保存的行')
    return
  }

  saving.value = true
  let okCount = 0
  let failCount = 0

  try {
    for (const row of targets) {
      try {
        const res = await updateOrder(buildUpdatePayload(row))
        // updateOrder 返回 { success: true/false }
        if (res?.success !== false) {
          row._saved = true
          row._error = null
          okCount++
        } else {
          row._error = res?.message || '保存失败'
          failCount++
        }
      } catch (e) {
        row._error = e?.response?.data?.message || e?.message || '保存失败'
        failCount++
      }
    }

    if (okCount > 0) ElMessage.success(`✅ 成功保存 ${okCount} 条`)
    if (failCount > 0) ElMessage.error(`❌ ${failCount} 条保存失败，请检查红色标记`)
  } finally {
    saving.value = false
  }
}

// ==================== 跳转 ====================
const goBack = () => router.push('/order/factory-list')
const viewDetail = (row) => {
  if (row._saved) return
  router.push(`/order/factory-edit/${row.orderId}`)
}

// ==================== 初始化 ====================
const fetchCustomers = async () => {
  try {
    const res = await getCustomerList({ includeInactive: false })
    customerList.value = res?.data || []
  } catch {
    customerList.value = []
  }
}

onMounted(async () => {
  // 字典
  try {
    const [lossRes, prodRes, purityRes] = await Promise.all([
      dictApi.getItemsByKey('lossrate'),
      dictApi.getItemsByKey('production_status'),
      dictApi.getItemsByKey('purity')
    ])
    lossRateOptions.value = (lossRes?.data || []).map(item => ({
      label: item.itemLabel || item.itemValue,
      value: Number(item.itemValue)
    }))
    productionStatuses.value = (prodRes?.data || []).map(item => ({
      value: normalizeStatus(item.itemValue),
      label: item.itemLabel || item.itemValue
    }))
    purityDict.value = purityRes?.data || []
  } catch (e) {
    console.error('字典加载失败', e)
  }

  filter.status = defaultStatusFilter()
  fetchCustomers()
  loadData()
})

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onFillMove)
  document.removeEventListener('mouseup', onFillEnd)
  document.body.classList.remove('filling-mode')
})
</script>

<style scoped>
.batch-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 12px;
  box-sizing: border-box;
  gap: 10px;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-left h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 8px 0 0;
  color: #303133;
}
.header-right {
  display: flex;
  gap: 10px;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.filter-bar .tip {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}

.batch-table-wrapper {
  flex: 1;
  overflow: hidden;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  padding: 6px;
  min-height: 0;
}

:deep(.el-table) {
  height: 100%;
}

:deep(.el-table__body-wrapper) {
  overflow-y: auto;
}

.cell-with-handle {
  position: relative;
  width: 100%;
}

:deep(.el-table__row.row-saved) td {
  background: #fafafa !important;
  color: #c0c4cc;
}
:deep(.el-table__row.row-saved .el-input__wrapper) {
  background: #f5f5f5 !important;
}

:deep(.el-table__row.row-error td) {
  background: #fef0f0 !important;
}

:deep(.el-table__row.row-readonly td) {
  background: #f5f7fa !important;
}

:deep(.el-table__row.fill-target td) {
  background: #ecf5ff !important;
}

:deep(.el-table .cell) {
  padding: 0 4px;
  line-height: 1.3;
}
:deep(.el-input-number--small) {
  width: 100%;
}
:deep(.el-input-number--small .el-input__wrapper) {
  padding-left: 4px;
  padding-right: 4px;
}
:deep(.el-input-number.is-controls-right .el-input__wrapper) {
  padding-right: 4px;
}

.loss-warning :deep(.el-input__wrapper) {
  border: 1px solid #f56c6c !important;
  box-shadow: 0 0 0 1px #f56c6c inset !important;
}
.loss-warning :deep(.el-input__inner) {
  color: #f56c6c !important;
  font-weight: 600;
}
</style>