<!-- src/components/FullscreenExit.vue
     全屏模式下的「退出全屏」按钮：固定在右上角，滚动时也一直在；
     同时支持按 Esc 快捷退出（页面滚动到表格中段时也能一键出来）。 -->
<template>
  <transition name="fs-fade">
    <button class="fs-exit" type="button" title="退出全屏（Esc）" @click="$emit('exit')">
      <span class="fs-icon">⤡</span>
      <span>退出全屏</span>
      <span class="fs-key">Esc</span>
    </button>
  </transition>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue';

const emit = defineEmits(['exit']);

const onKey = (e) => {
  if (e.key === 'Escape') {
    emit('exit');
  }
};

onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<style scoped>
.fs-exit {
  position: fixed;
  right: 28px;
  bottom: 28px;
  /* ⚠️ 只在全屏容器内部置顶，不能高过 Element Plus 弹层（2001 起），
     否则弹框打开时这个按钮会压在遮罩/弹框上面 */
  z-index: 300;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid #dcdfe6;
  border-radius: 18px;
  background: #fff;
  color: #1d2129;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
}
.fs-exit:hover {
  border-color: #409eff;
  color: #409eff;
}
.fs-icon { font-size: 16px; line-height: 1; }
.fs-key {
  font-size: 11px;
  font-weight: 400;
  color: #86909c;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  padding: 0 4px;
  line-height: 16px;
}
.fs-fade-enter-active, .fs-fade-leave-active { transition: opacity 0.15s; }
.fs-fade-enter-from, .fs-fade-leave-to { opacity: 0; }
</style>
