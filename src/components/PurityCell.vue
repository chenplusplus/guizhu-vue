<!-- src/components/PurityCell.vue
     成色单元格（列表通用）：单色显示成色名，多色显示「18K+9K」短标签，悬停看完整明细 -->
<template>
  <span v-if="!display" class="pc-empty">-</span>
  <el-tooltip v-else-if="isMulti" :content="label" placement="top" :show-after="150">
    <span class="pc-multi">{{ display }}</span>
  </el-tooltip>
  <span v-else class="pc-single">{{ display }}</span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 后端 purityLabel：多成色时形如 "18K金+9K金"，单成色为 null
  label: { type: String, default: '' },
  // 单成色的老字段（orders.color）
  color: { type: String, default: '' },
});

const isMulti = computed(() => !!(props.label && props.label.includes('+')));

// 18K金 → 18K；足金999 保持原样
const short = (s) => {
  const t = String(s || '').trim();
  return t.replace(/^(\d+K)金$/, '$1');
};

const display = computed(() => {
  if (isMulti.value) {
    const parts = props.label.split('+').map(short).filter(Boolean);
    return parts.length > 2 ? `多色${parts.length}` : parts.join('+');
  }
  return props.color || '';
});
</script>

<style scoped>
.pc-empty {
  color: #c0c4cc;
}
.pc-single {
  color: #303133;
}
.pc-multi {
  display: inline-block;
  padding: 0 4px;
  font-size: 12px;
  line-height: 17px;
  color: #b8860b;
  background: #fdf6e3;
  border: 1px solid #f0d9a8;
  border-radius: 3px;
  white-space: nowrap;
  cursor: default;
}
</style>
