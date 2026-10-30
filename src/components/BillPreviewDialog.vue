<!-- src/components/BillPreviewDialog.vue
     出货明细预览弹窗（可被多页面复用）
     两种使用方式：
       1) 传 billId          —— 弹窗自己按账单 id 拉取数据（主页/我的账单）
       2) 传 billData+details —— 直接渲染传入数据（编辑页实时预览 / 详情页）
     表格内容由 BillPreviewSheet 渲染
-->
<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`📄 出货明细预览 - ${displayBillData?.billNo || ''}`"
    width="95%"
    top="2vh"
    :close-on-click-modal="false"
    destroy-on-close
    class="bill-preview-dialog"
    @open="handleOpen"
  >
    <div v-loading="loading" class="preview-loading-wrap">
      <BillPreviewSheet
        v-if="!loading && displayBillData"
        :bill-data="displayBillData"
        :details="displayDetails"
        :show-view-detail="!!billId"
        @view-detail="goDetail"
        @close="dialogVisible = false"
      />
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { getBillDetail } from '@/api/bill';
import BillPreviewSheet from '@/components/BillPreviewSheet.vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  billId: { type: Number, default: null },
  // 可选：直接传入数据（传入后不再按 billId 拉取）
  billData: { type: Object, default: null },
  details: { type: Array, default: null },
});

const emit = defineEmits(['update:visible', 'close']);

const router = useRouter();
const dialogVisible = ref(false);
const loading = ref(false);
const fetchedBillData = ref(null);
const fetchedDetails = ref([]);

const displayBillData = computed(() => props.billData || fetchedBillData.value);
const displayDetails = computed(() => props.details || fetchedDetails.value);

// ============================================================
// 加载数据（仅在未外部传数据时按 billId 拉取）
// ============================================================
const loadData = async () => {
  if (props.billData) return;      // 外部已传数据，无需拉取
  if (!props.billId) return;
  loading.value = true;
  try {
    const res = await getBillDetail(props.billId);
    fetchedBillData.value = res?.data;
    fetchedDetails.value = fetchedBillData.value?.details || [];

    if (!fetchedBillData.value) {
      ElMessage.error('账单不存在');
    }
  } catch (error) {
    console.error('加载账单详情失败:', error);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const handleOpen = () => {
  loadData();
};

const goDetail = () => {
  if (props.billId) {
    dialogVisible.value = false;
    router.push(`/order/bill/detail/${props.billId}`);
  }
};

watch(
  () => props.visible,
  (val) => {
    dialogVisible.value = val;
    if (!val) {
      fetchedBillData.value = null;
      fetchedDetails.value = [];
    }
  },
  { immediate: true }
);

watch(
  () => dialogVisible.value,
  (val) => {
    emit('update:visible', val);
    if (!val) {
      emit('close');
    }
  }
);
</script>

<style scoped>
/* ===== 弹窗样式 ===== */
:deep(.bill-preview-dialog .el-dialog) {
  border-radius: 12px;
  max-width: 98vw;
}
:deep(.bill-preview-dialog .el-dialog__header) {
  padding: 16px 24px;
  border-bottom: 1px solid #e8ecf1;
}
:deep(.bill-preview-dialog .el-dialog__body) {
  padding: 0;
  max-height: 85vh;
  overflow-y: auto;
}
:deep(.bill-preview-dialog .el-dialog__footer) {
  display: none;
}

.preview-loading-wrap {
  min-height: 200px;
}
</style>
