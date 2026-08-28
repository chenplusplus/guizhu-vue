<!-- src/views/process/process-detail.vue 通用详情页（执模/镶石/抛光共用） -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
        <h2>{{ title }}</h2>
        <el-tag :type="statusTagType">{{ statusText }}</el-tag>
      </div>
      <div class="header-right">
        <el-button v-if="detail.status === 0" type="warning" @click="handleEdit">编辑</el-button>
        <el-button v-if="isAdmin && detail.status === 0" type="success" @click="openAudit(true)">通过</el-button>
        <el-button v-if="isAdmin && detail.status === 0" type="danger" @click="openAudit(false)">驳回</el-button>
      </div>
    </div>

    <div class="content-body">
      <!-- 基本信息 -->
      <div class="form-section">
        <div class="section-title">📋 基本信息</div>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="单据编号">{{ detail.receiptNo }}</el-descriptions-item>
          <el-descriptions-item label="业务日期">{{ formatDate(detail.businessDate) }}</el-descriptions-item>
          <el-descriptions-item label="工序类型"><el-tag size="small">{{ detail.subProcess }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="材质">{{ detail.materialName }}</el-descriptions-item>
          <el-descriptions-item label="录入人">{{ detail.submitEmpName }}</el-descriptions-item>
          <el-descriptions-item label="录入时间">{{ formatDateTime(detail.createTime) }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 收发数据 -->
      <div class="form-section">
        <div class="section-title">⚖️ 收发数据</div>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="发出重量">{{ detail.sendWeightG?.toFixed(2) }} g</el-descriptions-item>
          <el-descriptions-item label="回收重量">{{ detail.recycleWeightG?.toFixed(2) }} g</el-descriptions-item>
          <el-descriptions-item label="实损耗"><span class="loss">{{ detail.actualLossG?.toFixed(3) }} g</span></el-descriptions-item>
          <el-descriptions-item label="标准损耗">{{ detail.standardLossG?.toFixed(3) }} g</el-descriptions-item>
          <el-descriptions-item label="应回金"><span class="recycle">{{ detail.shouldRecycleG?.toFixed(3) }} g</span></el-descriptions-item>
          <el-descriptions-item label="损耗率">{{ lossRate }}%</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 各工序专属字段 -->
      <div class="form-section" v-if="detail.extraFields && Object.keys(detail.extraFields).length > 0">
        <div class="section-title">{{ mainProcessName }}</div>
        <el-descriptions :column="3" border size="small">
          <template v-if="detail.mainProcess === 'ZM'">
            <el-descriptions-item label="余料水口重量">{{ detail.extraFields.residueWaterG?.toFixed(2) || 0 }} g</el-descriptions-item>
            <el-descriptions-item label="余料发线重量">{{ detail.extraFields.residueWireG?.toFixed(2) || 0 }} g</el-descriptions-item>
          </template>
          <template v-if="detail.mainProcess === 'XS'">
            <el-descriptions-item label="微镶钻石重量">{{ detail.extraFields.microCarat?.toFixed(3) || 0 }} ct</el-descriptions-item>
            <el-descriptions-item label="微镶粒数">{{ detail.extraFields.microCount || 0 }}</el-descriptions-item>
            <el-descriptions-item label="手镶钻石重量">{{ detail.extraFields.handCarat?.toFixed(3) || 0 }} ct</el-descriptions-item>
            <el-descriptions-item label="手镶粒数">{{ detail.extraFields.handCount || 0 }}</el-descriptions-item>
            <el-descriptions-item label="报废重量"><span class="scrap">{{ detail.extraFields.scrapG?.toFixed(2) || 0 }} g</span></el-descriptions-item>
          </template>
          <template v-if="detail.mainProcess === 'PG'">
            <el-descriptions-item label="布心备注">{{ detail.extraFields.clothCoreNote || '-' }}</el-descriptions-item>
          </template>
        </el-descriptions>
      </div>

      <!-- 审核信息 -->
      <div class="form-section" v-if="detail.status > 0">
        <div class="section-title">✅ 审核信息</div>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="审核人">{{ detail.auditEmpName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="审核时间">{{ formatDateTime(detail.auditTime) }}</el-descriptions-item>
          <el-descriptions-item label="审核备注" :span="2">{{ detail.auditNote || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 备注 -->
      <div class="form-section" v-if="detail.remark">
        <div class="section-title">📝 备注</div>
        <el-input type="textarea" :model-value="detail.remark" readonly :rows="2" />
      </div>
    </div>

    <!-- 审核弹窗 -->
    <el-dialog v-model="auditVisible" title="审核单据" width="420px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="单据编号">{{ detail.receiptNo }}</el-form-item>
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditForm.approved">
            <el-radio :value="true">通过</el-radio>
            <el-radio :value="false">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="auditForm.auditNote" type="textarea" :rows="3" :placeholder="auditForm.approved ? '选填' : '驳回原因（必填）'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAudit" :loading="auditLoading">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getProcessDetail, auditProcessReceipt } from '@/api/process';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const isAdmin = computed(() => userStore.userType === 'admin');

const loading = ref(false);
const detail = ref({});
const auditVisible = ref(false);
const auditForm = ref({ approved: true, auditNote: '' });
const auditLoading = ref(false);

const processMap = { ZM: '🔧 执模', XS: '💎 镶石', PG: '✨ 抛光' };
const mainProcessName = computed(() => processMap[detail.value.mainProcess] || '');
const title = computed(() => `${mainProcessName.value}单据详情`);

const statusText = computed(() => detail.value.status === 1 ? '已审核' : detail.value.status === 2 ? '异常' : '未审核');
const statusTagType = computed(() => detail.value.status === 1 ? 'success' : detail.value.status === 2 ? 'danger' : 'warning');
const lossRate = computed(() => detail.value.sendWeightG > 0 ? ((detail.value.actualLossG / detail.value.sendWeightG) * 100).toFixed(2) : '0.00');

const formatDate = (d) => d ? d.slice(0, 10) : '-';
const formatDateTime = (d) => d ? d.slice(0, 19).replace('T', ' ') : '-';

const handleEdit = () => {
  const map = { ZM: '/process/zm-input', XS: '/process/xs-input', PG: '/process/pg-input' };
  router.push(`${map[detail.value.mainProcess]}?id=${detail.value.id}`);
};

const openAudit = (approved) => { auditForm.value.approved = approved; auditForm.value.auditNote = ''; auditVisible.value = true; };

const confirmAudit = async () => {
  if (!auditForm.value.approved && !auditForm.value.auditNote.trim()) { ElMessage.warning('驳回必须填写原因'); return; }
  auditLoading.value = true;
  try {
    await auditProcessReceipt({ id: detail.value.id, approved: auditForm.value.approved, auditNote: auditForm.value.auditNote });
    ElMessage.success(auditForm.value.approved ? '审核通过' : '已驳回');
    auditVisible.value = false;
    loadDetail();
  } catch (e) { ElMessage.error(e.message || '操作失败'); }
  finally { auditLoading.value = false; }
};

const loadDetail = async () => {
  loading.value = true;
  try {
    const res = await getProcessDetail(route.params.id);
    detail.value = res.data || {};
  } catch (e) { ElMessage.error(e.message || '加载失败'); }
  finally { loading.value = false; }
};

onMounted(loadDetail);
</script>

<style scoped>
.page-container { background: #f5f7fa; padding: 16px; min-height: 100vh; }
.page-header { display: flex; justify-content: space-between; align-items: center; background: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0; flex-wrap: wrap; gap: 10px; }
.header-left { display: flex; align-items: center; gap: 10px; }
.header-left h2 { font-size: 17px; font-weight: 600; margin: 0; }
.header-right { display: flex; gap: 8px; }
.content-body { background: #fff; padding: 20px; border-radius: 0 0 8px 8px; }
.form-section { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #e8ecf1; }
.form-section:last-child { border-bottom: none; }
.section-title { font-size: 14px; font-weight: 600; color: #409EFF; margin-bottom: 16px; padding-left: 8px; border-left: 3px solid #409EFF; }
.loss { color: #E6A23C; font-weight: bold; }
.recycle { color: #67C23A; font-weight: bold; }
.scrap { color: #F56C6C; }
</style>
