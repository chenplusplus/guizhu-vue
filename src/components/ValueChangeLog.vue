<!-- src/components/ValueChangeLog.vue -->
<template>
  <div class="value-change-log">
    <div class="log-header">
      <span class="log-title">📊 数值变更记录</span>
      <el-tag v-if="logs.length > 0" size="small" type="info">{{ logs.length }} 条</el-tag>
    </div>

    <el-timeline v-if="logs.length > 0">
      <el-timeline-item
        v-for="log in logs"
        :key="log.id"
        :timestamp="formatTime(log.createdAt)"
        placement="top"
        size="large"
      >
        <div class="log-item">
          <div class="log-item-header">
            <span class="operator">{{ log.operatorName }}</span>
            <el-tag size="small" :type="getSourceType(log.sourceType)">
              {{ getSourceLabel(log.sourceType) }}
            </el-tag>
            <span class="source-no">{{ log.sourceNo }}</span>
            <span class="time">{{ formatTime(log.createdAt) }}</span>
          </div>

          <div class="log-summary" v-if="log.summary">
            <el-icon><InfoFilled /></el-icon>
            {{ log.summary }}
          </div>

          <div class="log-changes">
            <div
              v-for="(value, key) in log.changes"
              :key="key"
              class="change-item"
            >
              <span class="field">{{ getFieldLabel(log.sourceType, key) }}</span>
              <span class="old">{{ formatValue(value.old) }}</span>
              <span class="arrow">→</span>
              <span class="new">{{ formatValue(value.new) }}</span>
            </div>
          </div>

          <div class="log-remark" v-if="log.remark">
            <span class="remark-label">备注：</span>{{ log.remark }}
          </div>
        </div>
      </el-timeline-item>
    </el-timeline>

    <el-empty v-else description="暂无数值变更记录" :image-size="80" />
  </div>
</template>

<script setup>
import { InfoFilled } from '@element-plus/icons-vue'

const props = defineProps({
  logs: {
    type: Array,
    default: () => []
  },
  sourceType: {
    type: String,
    default: ''
  }
})

// ===== 工具方法 =====
const formatTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const formatValue = (val) => {
  if (val === null || val === undefined) return '空'
  if (typeof val === 'number') {
    return Number.isInteger(val) ? val.toString() : val.toFixed(2)
  }
  return String(val)
}

const getSourceType = (type) => {
  const map = { order: 'primary', bill: 'warning', repair: 'success' }
  return map[type] || 'info'
}

const getSourceLabel = (type) => {
  const map = { order: '订单', bill: '账单', repair: '维修单' }
  return map[type] || type
}

// ===== 字段标签映射 =====
const fieldLabels = {
  order: {
    totalAmount: '总金额',
    goldMaterialFee: '足金料',
    laborFee: '工费',
    moldFee: '版费',
    totalWeight: '总重',
    netWeight: '净重',
    lossRate: '损耗率',
    addLossWeight: '加耗重',
    goldPrice: '金价',
    mainStoneAmount: '主石金额',
    subStoneAmount: '副石金额',
    packingFee: '包装费',
    certificateFee: '证书费',
    postageFee: '邮费',
    costPrice: '内部成本',
    profit: '利润',
    mainStoneQty: '主石粒数',
    mainStoneWeight: '主石重量',
    mainStonePrice: '主石单价',
    mainStoneSettingFee: '主石镶石工费',
    subStoneQty: '副石粒数',
    subStoneWeight: '副石重量',
    subStonePrice: '副石单价',
    subStoneSettingFee: '副石镶石工费',
  },
  bill: {
    totalAmount: '总金额',
    totalQuantity: '总数量',
    currentMaterial: '应收足料',
    currentMoney: '应收款',
    receivedMaterial: '来料量',
    receivedMoney: '来款金额',
    totalDebtMaterial: '累欠足料',
    totalDebtMoney: '累欠款',
  },
  repair: {
    chainWeight: '链重',
    waxOutTime: '出蜡时间',
    claspFee: '扣头版费',
    chainModel: '链条型号',
    moldWeight: '倒模重',
    steelWeight: '钢片重',
    moldFee: '倒模工费',
    customerStoneWeight: '客来石重',
    customerGoldWeight: '客来金重',
    bezelWeight: '贝金托重',
    polishWeight: '磨贝重',
    waxOutFee: '出蜡费',
    polishOtherFee: '磨贝/其他费',
    cncFee: 'CNC费',
  }
}

const getFieldLabel = (sourceType, key) => {
  const labels = fieldLabels[sourceType] || {}
  return labels[key] || key
}
</script>

<style scoped>
.value-change-log {
  padding: 4px 0;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8eef2;
}

.log-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.log-item {
  background: #fafafa;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 3px solid #409EFF;
}

.log-item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.log-item .operator {
  font-weight: 600;
  color: #303133;
}

.log-item .source-no {
  color: #909399;
  font-size: 13px;
}

.log-item .time {
  color: #c0c4cc;
  font-size: 12px;
  margin-left: auto;
}

.log-summary {
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.log-changes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 4px 0;
}

.change-item {
  font-size: 13px;
  color: #606266;
  background: #fff;
  padding: 2px 10px;
  border-radius: 4px;
  border: 1px solid #e8eef2;
}

.change-item .field {
  color: #303133;
  font-weight: 500;
}

.change-item .old {
  color: #F56C6C;
}

.change-item .arrow {
  color: #c0c4cc;
  margin: 0 4px;
}

.change-item .new {
  color: #67C23A;
  font-weight: 500;
}

.log-remark {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.log-remark .remark-label {
  color: #606266;
}

:deep(.el-timeline-item__wrapper) {
  padding-left: 24px;
}

:deep(.el-timeline-item__tail) {
  border-left: 2px solid #e8eef2;
}

:deep(.el-timeline-item__node) {
  width: 12px;
  height: 12px;
}
</style>
