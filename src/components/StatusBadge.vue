<!-- src/components/StatusBadge.vue -->
<template>
  <a-tag :color="colorMap[status] || 'default'">
    {{ textMap[status] || status }}
  </a-tag>
</template>

<script setup>
const props = defineProps({
  status: { type: String, required: true },
});

const textMap = {
  draft: '草稿',
  pending: '待客户审核',
  customerAudited: '客户已审核',
  factoryPending: '待工厂审核',
  audited: '工厂已审核',
  producing: '制作中',
  completed: '已完成',
  rejected: '已驳回',
  cancelled: '已取消',
};

const colorMap = {
  draft: 'default',
  pending: 'orange',
  customerAudited: 'blue',
  factoryPending: 'orange',
  audited: 'blue',
  producing: 'purple',
  completed: 'green',
  rejected: 'red',
  cancelled: 'default',
};
</script>