<template>
  <el-drawer
    v-model="visible"
    :title="`流程节点 - ${orderNo}`"
    direction="rtl"
    size="520px"
    destroy-on-close
  >
    <div class="flow-drawer" v-loading="loading">
      <!-- 当前状态 -->
      <div class="flow-header">
        <span class="status-label">当前状态：</span>
        <el-tag :type="statusTagType" size="large">{{ currentStepName || '未知' }}</el-tag>
      </div>

      <!-- 步骤条 -->
      <div class="flow-steps-wrapper">
        <div class="flow-steps">
          <div
            v-for="(step, index) in stepStatusList"
            :key="index"
            class="step-item"
            :class="{
              'is-completed': step.status === 'completed',
              'is-current': step.status === 'current',
              'is-pending': step.status === 'pending'
            }"
          >
            <div v-if="index > 0" class="step-line" :class="{ 'line-active': step.status !== 'pending' }" />
            <div class="step-node">
              <el-icon v-if="step.status === 'completed'" class="step-icon"><Check /></el-icon>
              <span v-else-if="step.status === 'current'" class="step-number current">{{ index + 1 }}</span>
              <span v-else class="step-number pending">{{ index + 1 }}</span>
            </div>
            <div class="step-label">
              <div class="step-name">{{ step.stepName }}</div>
              <div class="step-status-text">
                <span v-if="step.status === 'completed'" class="text-completed">✓ 已完成</span>
                <span v-else-if="step.status === 'current'" class="text-current">● 处理中</span>
                <span v-else class="text-pending">○ 待处理</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flow-actions" v-if="canOperate && actions.length > 0">
        <el-divider content-position="left">操作</el-divider>
        <div class="action-buttons">
          <el-button
            v-for="btn in actions"
            :key="btn.action"
            :type="btn.btnType"
            @click="handleAction(btn.action)"
          >
            {{ btn.label }}
          </el-button>
        </div>
        <div v-if="showReturnSelector" class="return-selector">
          <el-select v-model="returnTarget" placeholder="选择退回节点" size="small">
            <el-option
              v-for="s in returnableSteps"
              :key="s.stepIndex"
              :label="s.stepName"
              :value="s.stepIndex"
            />
          </el-select>
          <el-button size="small" type="warning" @click="confirmReturn">确认退回</el-button>
        </div>
      </div>

      <!-- 操作日志 -->
      <div class="flow-history" v-if="historyLogs.length > 0">
        <el-divider content-position="left">操作记录</el-divider>
        <el-timeline>
          <el-timeline-item
            v-for="log in historyLogs"
            :key="log.id"
            :timestamp="formatTime(log.createdAt)"
            placement="top"
            size="small"
          >
            <div class="log-item">
              <span class="log-operator">{{ log.operatorName }}</span>
              <span class="log-action">{{ log.actionText }}</span>
              <span v-if="log.remark" class="log-remark">（{{ log.remark }}）</span>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { orderflowApi } from '@/api/orderflow'

const props = defineProps({
  orderId: { type: Number, required: true },
  orderNo: { type: String, default: '' },
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'refresh'])

const loading = ref(false)
const visible = ref(false)
const flowData = ref(null)
const showReturnSelector = ref(false)
const returnTarget = ref(null)

const stepStatusList = computed(() => flowData.value?.stepStatusList || [])
const currentStepName = computed(() => flowData.value?.currentStepName || '')
const canOperate = computed(() => flowData.value?.canOperate || false)
const actions = computed(() => flowData.value?.actions || [])
const historyLogs = computed(() => flowData.value?.historyLogs || [])
const returnableSteps = computed(() => stepStatusList.value.filter(s => s.canReturnTo) || [])

const statusTagType = computed(() => {
  const map = {
    draft: 'info',
    pending: 'warning',
    audited: 'primary',
    producing: 'warning',
    completed: 'success',
    rejected: 'danger',
    cancelled: 'info'
  }
  return map[flowData.value?.flowStatus] || 'info'
})

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val) loadFlowData()
})
watch(visible, (val) => emit('update:modelValue', val))

const loadFlowData = async () => {
  loading.value = true
  try {
    flowData.value = await orderflowApi.get(props.orderId)
  } catch {
    ElMessage.error('加载流程数据失败')
  } finally {
    loading.value = false
  }
}

const handleAction = async (action) => {
  if (action === 'return') {
    showReturnSelector.value = !showReturnSelector.value
    return
  }
  if (action === 'reject') {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回确认', {
      confirmButtonText: '确定驳回',
      inputType: 'textarea',
      inputPlaceholder: '请填写驳回原因'
    })
    if (!value) return ElMessage.warning('驳回必须填写原因')
    await doAction(action, { remark: value })
    return
  }
  await doAction(action)
}

const doAction = async (action, extra = {}) => {
  loading.value = true
  try {
    await orderflowApi.execute(props.orderId, action, extra)
    ElMessage.success('操作成功')
    showReturnSelector.value = false
    await loadFlowData()
    emit('refresh')
  } catch {
    ElMessage.error('操作失败')
  } finally {
    loading.value = false
  }
}

const handleReturnToStep = (stepIndex) => {
  returnTarget.value = stepIndex
  showReturnSelector.value = true
}

const confirmReturn = async () => {
  if (returnTarget.value === null) {
    ElMessage.warning('请选择退回节点')
    return
  }
  const { value } = await ElMessageBox.prompt('请输入退回原因（选填）', '退回确认', {
    inputPlaceholder: '请输入退回原因'
  })
  await doAction('return', { targetStep: returnTarget.value, remark: value || '' })
  returnTarget.value = null
}

const formatTime = (time) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', { hour12: false })
}
</script>

<style scoped>
.flow-drawer { padding: 0 4px; }
.flow-header { display: flex; align-items: center; padding: 12px 0; gap: 12px; }
.status-label { font-weight: 500; color: #606266; }
.flow-steps-wrapper { padding: 16px 0; background: #f5f7fa; border-radius: 8px; margin: 4px 0; }
.flow-steps { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px; position: relative; overflow-x: auto; min-width: 500px; }
.step-item { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; min-width: 60px; }
.step-item.is-completed .step-node { background: #67C23A; border-color: #67C23A; }
.step-item.is-current .step-node { background: #409EFF; border-color: #409EFF; box-shadow: 0 0 0 4px rgba(64,158,255,0.25); transform: scale(1.12); }
.step-item.is-pending .step-node { background: #f5f7fa; border-color: #dcdfe6; }
.step-line { position: absolute; top: 16px; left: -50%; width: 100%; height: 2px; background: #dcdfe6; z-index: 0; }
.step-line.line-active { background: #67C23A; }
.step-node { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 1; background: #f5f7fa; border: 2px solid #dcdfe6; transition: all 0.3s; flex-shrink: 0; }
.step-node .step-icon { color: #fff; font-size: 16px; }
.step-node .step-number { font-size: 14px; font-weight: 600; }
.step-node .step-number.current { color: #fff; }
.step-node .step-number.pending { color: #c0c4cc; }
.step-label { margin-top: 8px; text-align: center; min-width: 50px; }
.step-name { font-size: 13px; font-weight: 500; color: #303133; white-space: nowrap; }
.step-status-text { font-size: 11px; margin-top: 2px; }
.text-completed { color: #67C23A; }
.text-current { color: #409EFF; font-weight: 600; }
.text-pending { color: #c0c4cc; }
.action-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.return-selector { margin-top: 8px; display: flex; gap: 8px; align-items: center; }
.log-item { font-size: 13px; }
.log-operator { font-weight: 500; color: #303133; }
.log-action { margin: 0 4px; color: #409EFF; }
.log-remark { color: #909399; font-size: 12px; }
</style>