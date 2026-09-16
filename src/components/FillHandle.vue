<template>
  <span
    class="fill-handle"
    @mousedown.stop.prevent="$emit('fill-start', $event)"
  />
</template>

<script setup>
defineEmits(['fill-start'])
</script>

<style scoped>
.fill-handle {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 7px;
  height: 7px;
  background: #409eff;
  border: 1px solid #fff;
  border-radius: 1px;
  cursor: crosshair;
  z-index: 10;
  opacity: 0;
  transition: opacity 0.15s;
}
.cell-with-handle:hover .fill-handle,
.cell-with-handle.filling .fill-handle {
  opacity: 1;
}
:global(body.filling-mode) {
  cursor: crosshair !important;
  user-select: none;
}
:global(.el-table__row.fill-target .el-table__cell) {
  background: #ecf5ff !important;
}
</style>