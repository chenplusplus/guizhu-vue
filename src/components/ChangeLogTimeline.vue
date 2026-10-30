<!-- src/components/ChangeLogTimeline.vue -->
<!-- 可复用的「修改记录」时间轴组件：展示 value_change_logs 的字段级变更 -->
<template>
  <div class="modify-log-section" v-if="changeLogs.length > 0">
    <div class="modify-log-title">📝 修改记录</div>
    <el-timeline>
      <el-timeline-item
        v-for="(log, idx) in changeLogs"
        :key="log.id || idx"
        :timestamp="formatDateTime(log.createdAt)"
        placement="top"
      >
        <div class="modify-log-item">
          <div class="modify-log-meta">
            <span class="modify-log-user">{{ log.operatorName || '-' }}</span>
            <span class="modify-log-role">{{ log.operatorRole || '' }}</span>
            <span class="modify-log-op">修改记录</span>
          </div>
          <div class="change-list">
            <div v-for="(c, i) in log.changeList" :key="i" class="change-row">
              <span class="modify-log-field">{{ c.label }}</span>
              <span class="modify-log-old">{{ c.old }}</span>
              <el-icon><Right /></el-icon>
              <span class="modify-log-new">{{ c.new }}</span>
            </div>
          </div>
          <div class="modify-log-remark" v-if="log.remark">{{ log.remark }}</div>
        </div>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { Right } from '@element-plus/icons-vue'
import { getValueChangeLogs } from '@/api/valueChangeLog'

const props = defineProps({
  sourceType: { type: String, required: true }, // 'order' | 'bill' | 'lr'
  sourceId: { type: [String, Number], required: true },
  // 字段标签映射（可选），默认空则用原始字段名
  fieldLabels: { type: Object, default: () => ({}) },
})

const changeLogs = ref([])

const formatChangeVal = (v) => {
  if (v === true) return '是'
  if (v === false) return '否'
  if (v === null || v === undefined || v === '') return '空'
  return String(v)
}

const formatDateTime = (time) => {
  if (!time) return '—'
  const d = new Date(time)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const loadLogs = async () => {
  if (!props.sourceId) return
  try {
    const res = await getValueChangeLogs(props.sourceType, String(props.sourceId))
    const items = res?.data || []
    changeLogs.value = items.map(log => {
      const changes = log.changes || {}
      const changeList = Object.keys(changes).map(k => ({
        label: props.fieldLabels[k] || k,
        old: formatChangeVal(changes[k]?.old),
        new: formatChangeVal(changes[k]?.new),
      }))
      return {
        id: `change-${log.id}`,
        createdAt: log.createdAt,
        operatorName: log.operatorName,
        operatorRole: log.operatorRole,
        remark: log.remark,
        changeList,
      }
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } catch {
    changeLogs.value = []
  }
}

watch(() => props.sourceId, () => { loadLogs() })
onMounted(loadLogs)
</script>

<style scoped>
.modify-log-section {
  margin-top: 16px;
  padding: 16px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}
.modify-log-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #303133;
}
.modify-log-item {
  padding: 4px 0;
}
.modify-log-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.modify-log-user {
  font-weight: 600;
  color: #303133;
}
.modify-log-role {
  font-size: 12px;
  color: #909399;
  background: #f4f4f5;
  padding: 1px 6px;
  border-radius: 4px;
}
.modify-log-op {
  font-size: 12px;
  color: #909399;
}
.change-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.change-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}
.modify-log-field {
  color: #606266;
  font-weight: 500;
  min-width: 90px;
}
.modify-log-old {
  color: #F56C6C;
  text-decoration: line-through;
  background: #fef0f0;
  padding: 1px 6px;
  border-radius: 4px;
}
.modify-log-new {
  color: #67C23A;
  font-weight: 600;
  background: #f0f9eb;
  padding: 1px 6px;
  border-radius: 4px;
}
.modify-log-remark {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}
</style>
