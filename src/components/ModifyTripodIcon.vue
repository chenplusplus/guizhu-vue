<!-- src/components/ModifyTripodIcon.vue -->
<!-- ⭐ 修改标记图标：三角形内感叹号（警告样式，替代原来的 ✏️ 笔图标） -->
<template>
  <svg
    class="warn-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- 三角形（圆角） -->
    <path d="M12 3.6 L21.4 19.6 A1.4 1.4 0 0 1 20.2 21.6 L3.8 21.6 A1.4 1.4 0 0 1 2.6 19.6 Z" />
    <!-- 感叹号竖线 -->
    <path d="M12 9.4 V14.2" />
    <!-- 感叹号点 -->
    <circle cx="12" cy="17.6" r="0.9" fill="currentColor" stroke="none" />
  </svg>
</template>

<script setup>
defineOptions({ name: 'ModifyTripodIcon' });
</script>

<style scoped>
.warn-icon {
  width: 1em;
  height: 1em;
  display: inline-block;
  vertical-align: -0.15em;
}
</style>
