<!-- src/components/LrPreviewDialog.vue
     支出收入 LR 表弹窗（只读）
       - 正文由 LrSheet.vue 渲染，与详情页完全同一套版式
       - 主要使用方：views/order/lr-editor.vue（历史页面里的查看）
-->
<template>
  <el-dialog
    v-model="dialogVisible"
    title="支出收入LR表"
    width="96%"
    top="2vh"
    :close-on-click-modal="false"
    destroy-on-close
    class="lr-preview-dialog"
  >
    <LrSheet ref="sheetRef" :lr-id="lrId" :lr-data="lrData" :rows="rows" />

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
      <el-button type="primary" @click="sheetRef?.doExport()">导出Excel</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import LrSheet from './LrSheet.vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  lrId: { type: [Number, String], default: null },
  lrData: { type: Object, default: null },
  rows: { type: Array, default: null },
});

const emit = defineEmits(['update:visible', 'close']);

const dialogVisible = ref(false);
const sheetRef = ref(null);

watch(
  () => props.visible,
  (val) => { dialogVisible.value = val; },
  { immediate: true }
);

watch(
  () => dialogVisible.value,
  (val) => {
    emit('update:visible', val);
    if (!val) emit('close');
  }
);
</script>

<style>
.lr-preview-dialog { margin: 0 auto; }
.lr-preview-dialog .el-dialog__body {
  padding: 8px 12px;
  overflow: auto;
}
</style>
