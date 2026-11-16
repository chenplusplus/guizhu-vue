<!-- src/views/order/lr-detail.vue
     LR 表详情（只读，不再走弹窗预览）
       - 路由：/order/lr/detail/:lrId（兼容传 billId，后端按两者都能查）
       - 版式与导出 Excel 完全一致：表头 → 明细（每组销售+成本，组末红线）→ 底部汇总
-->
<template>
  <div class="page-container lr-detail">
    <div class="page-head">
      <div class="head-left">
        <el-button link class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon><span>返回</span>
        </el-button>
        <span class="sep"></span>
        <span class="title">支出收入LR表</span>
        <el-tag v-if="info.billNo" size="small" effect="plain" class="bill-tag">{{ info.billNo }}</el-tag>
        <el-tag v-if="info.customerName" size="small" effect="plain" type="info" class="bill-tag">{{ info.customerName }}</el-tag>
      </div>
      <div class="head-right">
        <span class="meta" v-if="info.createdAt">生成时间：{{ formatDate(info.createdAt) }}</span>
        <el-button type="primary" :disabled="!info.id" @click="handleExport">
          <el-icon><Download /></el-icon> 导出Excel
        </el-button>
      </div>
    </div>

    <LrSheet ref="sheetRef" :lr-id="lrId" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Download } from '@element-plus/icons-vue';
import LrSheet from '@/components/LrSheet.vue';

const route = useRoute();
const router = useRouter();
const sheetRef = ref(null);

const lrId = computed(() => route.params.lrId);
const info = computed(() => sheetRef.value?.previewInfo || {});

const formatDate = (d) => String(d).replace('T', ' ').slice(0, 16);

const goBack = () => {
  if (window.history.length > 1) router.back();
  else router.push({ name: 'LrList' });
};

const handleExport = () => sheetRef.value?.doExport();

</script>

<style scoped>
.page-container.lr-detail {
  background: #fff;
  border-radius: 8px;
  padding: 0 14px 16px;
  min-height: 100%;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 2px 10px;
  border-bottom: 1px solid #eef1f6;
  margin-bottom: 10px;
}
.head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.back-btn { font-size: 13px; color: #4b5563; }
.back-btn .el-icon { margin-right: 3px; }
.sep {
  width: 1px;
  height: 14px;
  background: #e0e4ea;
}
.title {
  font-size: 15px;
  font-weight: 650;
  color: #1d2129;
}
.bill-tag { margin-left: 2px; }

.head-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.head-right .meta {
  font-size: 12px;
  color: #8a94a3;
}
</style>
