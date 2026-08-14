<!-- src/views/inout/detail.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📄 总进出详情</h2>
        <el-tag :type="getStatusType(data?.status)" size="large">
          {{ getStatusText(data?.status) }}
        </el-tag>
        <el-tag type="primary" size="large">{{ data?.recordNo }}</el-tag>
      </div>
      <div class="header-right">
        <template v-if="data?.status === 'draft'">
          <el-button type="primary" @click="goEdit">编辑</el-button>
          <el-button type="success" @click="handleSubmit">提交审核</el-button>
          <el-button type="danger" @click="handleDelete">删除</el-button>
        </template>
        <template v-if="data?.status === 'pending' && canAudit">
          <el-button type="success" @click="handleAudit(true)">审核通过</el-button>
          <el-button type="danger" @click="handleAudit(false)">驳回</el-button>
        </template>
        <template v-if="data?.status === 'rejected' && canResubmit">
          <el-button type="primary" @click="handleResubmit">重新提交</el-button>
        </template>
      </div>
    </div>

    <div class="content-body">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="单号">{{ data?.recordNo }}</el-descriptions-item>
        <el-descriptions-item label="日期">{{ formatDate(data?.recordDate) }}</el-descriptions-item>
        <el-descriptions-item label="方向">
          <el-tag :type="data?.direction === 'in' ? 'success' : 'danger'">
            {{ data?.direction === 'in' ? '收入' : '支出' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="分类">{{ data?.category }}</el-descriptions-item>
        <el-descriptions-item label="颜色">{{ data?.color || '-' }}</el-descriptions-item>
        <el-descriptions-item label="客户">{{ data?.customerName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="重量">{{ data?.weight || '-' }} g</el-descriptions-item>
        <el-descriptions-item label="金额">
          <span :style="{ color: data?.direction === 'in' ? '#67C23A' : '#F56C6C', fontWeight: 'bold' }">
            ¥{{ (data?.amount || 0).toFixed(2) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="关联订单">{{ data?.orderNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="关联账单">{{ data?.billNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(data?.status)">{{ getStatusText(data?.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建人">{{ data?.createdByName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(data?.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ data?.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 审核弹窗 -->
    <el-dialog v-model="auditDialogVisible" title="审核" width="450px">
      <el-form>
        <el-form-item label="审核意见">
          <el-input
            v-model="auditRemark"
            type="textarea"
            :rows="3"
            :placeholder="auditApproved ? '选填' : '请填写驳回原因（必填）'"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAudit" :loading="auditLoading">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getInoutDetail, deleteInout, submitInout, auditInout, resubmitInout } from '@/api/inout';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const data = ref(null);
const auditDialogVisible = ref(false);
const auditLoading = ref(false);
const auditApproved = ref(true);
const auditRemark = ref('');

const canAudit = computed(() => {
  const type = userStore.userType;
  return type === 'factoryAudit' || type === 'admin';
});

const canResubmit = computed(() => {
  const type = userStore.userType;
  return type === 'factoryOrder' || type === 'admin';
});

const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' }
};

const getStatusText = (s) => statusMap[s]?.text || s || '-';
const getStatusType = (s) => statusMap[s]?.type || 'info';

const loadData = async () => {
  const id = route.params.id;
  if (!id) return;
  loading.value = true;
  try {
    const res = await getInoutDetail(id);
    data.value = res?.data;
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const goEdit = () => router.push(`/inout/create?id=${data.value.id}`);

const handleDelete = async () => {
  await ElMessageBox.confirm('确定删除吗？', '提示', { type: 'warning' });
  await deleteInout(data.value.id);
  ElMessage.success('删除成功');
  router.push('/inout/list');
};

const handleSubmit = async () => {
  await ElMessageBox.confirm('确定提交审核吗？', '提示', { type: 'info' });
  await submitInout(data.value.id);
  ElMessage.success('提交成功');
  loadData();
};

const handleAudit = (approved) => {
  auditApproved.value = approved;
  auditRemark.value = '';
  auditDialogVisible.value = true;
};

const confirmAudit = async () => {
  if (!auditApproved.value && !auditRemark.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  auditLoading.value = true;
  try {
    await auditInout(data.value.id, {
      approved: auditApproved.value,
      remark: auditRemark.value
    });
    ElMessage.success(auditApproved.value ? '审核通过' : '已驳回');
    auditDialogVisible.value = false;
    loadData();
  } finally {
    auditLoading.value = false;
  }
};

const handleResubmit = async () => {
  await ElMessageBox.confirm('确定重新提交吗？', '提示', { type: 'info' });
  await resubmitInout(data.value.id);
  ElMessage.success('已重新提交');
  loadData();
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${formatDate(date)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

onMounted(loadData);
</script>

<style scoped>
.page-container {
  background: #f5f7fa;
  padding: 16px;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 14px 20px;
  border-radius: 8px 8px 0 0;
  flex-wrap: wrap;
  gap: 10px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.header-left h2 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}
.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.content-body {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 20px 24px;
}

:deep(.el-descriptions__label) {
  width: 120px;
}
</style>