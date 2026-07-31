<template>
  <el-tag :type="tagType" size="small">{{ text }}</el-tag>
</template>

<script setup>
const props = defineProps({
  status: { type: String, default: 'draft' }
})

const statusMap = {
  draft: '草稿',
  pending: '待审核',
  audited: '已审核',
  producing: '制作中',
  completed: '已完成',
  rejected: '已驳回',
  cancelled: '已取消'
}

const statusType = {
  draft: 'info',
  pending: 'warning',
  audited: 'primary',
  producing: 'warning',
  completed: 'success',
  rejected: 'danger',
  cancelled: 'info'
}

const text = statusMap[props.status] || '未知'
const tagType = statusType[props.status] || 'info'
</script>