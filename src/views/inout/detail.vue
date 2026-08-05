<!-- src/views/inout/detail.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📄 总进出详情</h2>
        <el-tag type="primary" size="large">{{ data?.recordNo }}</el-tag>
        <el-tag :type="getStatusType(data?.status)" size="large">
          {{ getStatusText(data?.status) }}
        </el-tag>
      </div>
      <div class="header-right">
        <el-button
          v-if="data?.status === 'pending' && canAudit"
          type="success"
          @click="handleAudit(true)"
          :loading="auditing"
        >
          审核通过
        </el-button>
        <el-button
          v-if="data?.status === 'pending' && canAudit"
          type="danger"
          @click="handleAudit(false)"
          :loading="auditing"
        >
          驳回
        </el-button>
        <el-button
          v-if="(data?.status === 'draft' || data?.status === 'pending') && canEdit"
          type="warning"
          @click="goEdit"
        >
          编辑
        </el-button>
      </div>
    </div>

    <el-card>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="单据编号">{{ data?.recordNo }}</el-descriptions-item>
        <el-descriptions-item label="日期">{{ formatDate(data?.recordDate) }}</el-descriptions-item>
        <el-descriptions-item label="方向">
          <el-tag :type="data?.direction === 'in' ? 'success' : 'danger'" size="small">
            {{ data?.direction === 'in' ? '收入' : '支出' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="品类">{{ data?.category || '-' }}</el-descriptions-item>
        <el-descriptions-item label="成色">{{ data?.color || '-' }}</el-descriptions-item>
        <el-descriptions-item label="重量">{{ (data?.weight || 0).toFixed(3) }}g</el-descriptions-item>
        <el-descriptions-item label="金额">
          <span style="color:#E6A23C;font-weight:bold;">
            ¥{{ (data?.amount || 0).toFixed(2) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="客户">{{ data?.customerName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="关联订单号">{{ data?.orderNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="关联账单号">{{ data?.billNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="3">{{ data?.remark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ data?.createdByName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(data?.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(data?.status)">
            {{ getStatusText(data?.status) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getInoutDetail, auditInout } from '@/api/inout';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const auditing = ref(false);
const data = ref(null);

const canAudit = computed(() => {
  const userType = userStore.userType;
  return userType === 'factoryAudit' || userType === 'admin';
});

const canEdit = computed(() => {
  const userType = userStore.userType;
  return userType === 'factoryOrder' || userType === 'admin';
});

const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
};
const getStatusText = (s) => statusMap[s]?.text || s;
const getStatusType = (s) => statusMap[s]?.type || 'info';

const loadData = async () => {
  const id = route.params.id;
  if (!id) {
    ElMessage.error('参数错误');
    router.back();
    return;
  }

  loading.value = true;
  try {
    const res = await getInoutDetail(id);
    data.value = res?.data;
    if (!data.value) {
      ElMessage.error('记录不存在');
      router.back();
    }
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const handleAudit = async (approved) => {
  try {
    await ElMessageBox.confirm(
      approved ? '确定通过该记录？' : '确定驳回该记录？',
      '审核确认',
      { type: approved ? 'info' : 'warning' }
    );
  } catch { return; }

  auditing.value = true;
  try {
    await auditInout(data.value.id, { approved });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    loadData();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    auditing.value = false;
  }
};

const goEdit = () => {
  router.push(`/inout/create/${data.value.id}`);
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN', { hour12: false });
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.header-left h2 { font-size: 18px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; }

:deep(.el-card__body) { padding: 24px; }
</style>