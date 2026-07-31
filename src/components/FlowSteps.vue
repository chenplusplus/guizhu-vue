<template>
  <div class="flow-steps">
    <div v-for="(step, index) in steps" :key="index" class="step-item"
      :class="{ 'is-completed': step.status === 'completed', 'is-current': step.status === 'current', 'is-pending': step.status === 'pending' }">
      <div v-if="index > 0" class="step-line" :class="{ 'line-active': step.status !== 'pending' }" />
      <div class="step-node" :title="step.stepName" @click="step.canReturnTo && step.status === 'completed' ? emit('return-to-step', step.stepIndex) : null">
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
        <el-tag v-if="step.canReturnTo && step.status === 'completed'" size="small" type="warning" class="return-tag" @click.stop="emit('return-to-step', step.stepIndex)">可退回</el-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Check } from '@element-plus/icons-vue'
defineProps({ steps: { type: Array, default: () => [] }, currentStep: { type: Number, default: 0 } })
const emit = defineEmits(['return-to-step'])
</script>

<style scoped>
.flow-steps { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px; position: relative; overflow-x: auto; min-width: 500px; }
.step-item { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; min-width: 60px; }
.step-item.is-completed .step-node { background: #67C23A; border-color: #67C23A; }
.step-item.is-current .step-node { background: #409EFF; border-color: #409EFF; box-shadow: 0 0 0 4px rgba(64,158,255,0.25); transform: scale(1.12); }
.step-item.is-pending .step-node { background: #f5f7fa; border-color: #dcdfe6; }
.step-line { position: absolute; top: 16px; left: -50%; width: 100%; height: 2px; background: #dcdfe6; z-index: 0; }
.step-line.line-active { background: #67C23A; }
.step-node { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 1; background: #f5f7fa; border: 2px solid #dcdfe6; transition: all 0.3s; flex-shrink: 0; cursor: default; }
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
.return-tag { margin-top: 4px; cursor: pointer; font-size: 10px; }
.return-tag:hover { opacity: 0.8; }
</style>