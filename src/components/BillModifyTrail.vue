<!-- src/components/BillModifyTrail.vue
     账单「修改记录」：账单生成后（待提交阶段）被改过什么，逐条标红展示，供工厂审核员审核前核对。
     数据来源 GET /api/bill/{id}/modify-trail（source_type=bill, action=edit 的字段级留痕）。
-->
<template>
  <div v-if="batches.length > 0" class="trail-card" :class="{ compact }">
    <div class="trail-head">
      <span class="trail-icon">✎</span>
      <span class="trail-title">修改记录</span>
      <span class="trail-count">{{ batches.length }} 次 · {{ total }} 处</span>
      <span class="trail-tip">红色为改后值，审核时请重点核对</span>
      <el-button
        v-if="collapsible"
        link
        size="small"
        class="trail-toggle"
        @click="expanded = !expanded"
      >{{ expanded ? '收起' : '展开' }}</el-button>
    </div>

    <div v-show="expanded" class="trail-body">
      <div v-for="(b, bi) in batches" :key="b.logId || bi" class="trail-batch">
        <div class="batch-head">
          <span class="batch-time">{{ fmtTime(b.createdAt) }}</span>
          <span class="batch-user">{{ b.operatorName || '—' }}</span>
          <span class="batch-role">{{ b.roleText || roleText(b.operatorRole) }}</span>
          <span class="batch-remark">{{ b.remark || '编辑账单明细' }}</span>
          <span class="batch-num">{{ b.items.length }} 处</span>
        </div>

        <table class="trail-table">
          <thead>
            <tr>
              <th style="width:150px;">订单号</th>
              <th style="width:130px;">品名</th>
              <th style="width:130px;">修改项</th>
              <th style="width:120px;">原值</th>
              <th style="width:130px;">改后</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(it, i) in b.items" :key="i">
              <td class="mono">{{ it.orderNo || '账单' }}</td>
              <td class="ellipsis" :title="productOf(it)">{{ productOf(it) || '—' }}</td>
              <td class="field">{{ it.field }}</td>
              <td class="old">{{ it.oldValue }}</td>
              <td class="new">{{ it.newValue }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { getBillModifyTrail } from '@/api/bill'

const props = defineProps({
  billId: { type: [Number, String], required: true },
  // 账单明细（可选）：用于把 detailId 还原成品名
  details: { type: Array, default: () => [] },
  // 列表内嵌时用紧凑样式
  compact: { type: Boolean, default: false },
  // 是否可折叠（详情页默认展开不可折叠；审核列表展开行内默认展开）
  collapsible: { type: Boolean, default: false },
})

const total = ref(0)
const batches = ref([])
const expanded = ref(true)

const productMap = computed(() => {
  const m = {}
  ;(props.details || []).forEach(d => {
    if (d?.id != null) m[d.id] = d.productName
    if (d?.orderNo) m[`no:${d.orderNo}`] = d.productName
  })
  return m
})

const productOf = (it) => {
  if (it.productName) return it.productName
  if (it.detailId && productMap.value[it.detailId]) return productMap.value[it.detailId]
  if (it.orderNo && productMap.value[`no:${it.orderNo}`]) return productMap.value[`no:${it.orderNo}`]
  return ''
}

const roleText = (role) => ({
  factoryOrder: '工厂业务员',
  factoryAudit: '工厂审核员',
  customer: '客户',
  customerAudit: '客户审核员',
  admin: '管理员',
}[role] || role || '')

const fmtTime = (t) => {
  if (!t) return '—'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const load = async () => {
  if (!props.billId) return
  try {
    const res = await getBillModifyTrail(props.billId)
    const data = res?.data || {}
    total.value = data.total || 0
    batches.value = data.batches || []
  } catch {
    total.value = 0
    batches.value = []
  }
}

watch(() => props.billId, load)
onMounted(load)

defineExpose({ reload: load })
</script>

<style scoped>
.trail-card {
  margin-top: 16px;
  border: 1px solid #fbc4c4;
  border-left: 4px solid #F56C6C;
  border-radius: 8px;
  background: #fffafa;
  overflow: hidden;
}
.trail-card.compact {
  margin-top: 8px;
  border-radius: 6px;
}

.trail-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #fef0f0;
  border-bottom: 1px solid #fde2e2;
  flex-wrap: wrap;
}
.trail-icon { color: #F56C6C; font-size: 15px; font-weight: 700; }
.trail-title { font-size: 14px; font-weight: 700; color: #F56C6C; }
.trail-count {
  font-size: 12px; color: #F56C6C; background: #fff;
  border: 1px solid #fbc4c4; border-radius: 10px; padding: 1px 8px;
}
.trail-tip { font-size: 12px; color: #b88230; }
.trail-toggle { margin-left: auto; color: #F56C6C; }

.trail-body { padding: 4px 14px 12px; }
.trail-batch + .trail-batch { border-top: 1px dashed #f3d6d6; }

.batch-head {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0 6px; font-size: 12px; flex-wrap: wrap;
}
.batch-time { color: #606266; font-variant-numeric: tabular-nums; }
.batch-user { font-weight: 600; color: #303133; }
.batch-role { color: #909399; background: #f4f4f5; padding: 1px 6px; border-radius: 4px; }
.batch-remark { color: #909399; }
.batch-num { margin-left: auto; color: #F56C6C; font-weight: 600; }

.trail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  table-layout: fixed;
}
.trail-table th {
  background: #fdf5f5;
  color: #909399;
  font-weight: 500;
  text-align: center;
  padding: 5px 8px;
  border-bottom: 1px solid #f5e0e0;
}
.trail-table td {
  text-align: center;
  padding: 5px 8px;
  border-bottom: 1px solid #faf0f0;
  color: #303133;
}
.trail-table tr:last-child td { border-bottom: none; }
.trail-table td.mono { text-align: center; font-family: ui-monospace, Menlo, Consolas, monospace; }
.trail-table td.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trail-table td.field { color: #606266; }
.trail-table td.old {
  text-align: center;
  color: #a8abb2;
  text-decoration: line-through;
  font-variant-numeric: tabular-nums;
}
.trail-table td.new {
  text-align: center;
  color: #F56C6C;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
