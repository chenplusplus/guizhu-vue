<!-- src/views/process/pg-input.vue 抛光数据录入 -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
        <h2>✨ 抛光数据录入</h2>
        <el-tag type="info" v-if="form.receiptNo">{{ form.receiptNo }}</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSave" :loading="saving"><el-icon><Check /></el-icon> 保存</el-button>
        <el-button @click="handleReset"><el-icon><Refresh /></el-icon> 重置</el-button>
      </div>
    </div>

    <div class="content-body">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" size="large">
        <!-- 基本信息 -->
        <div class="form-section">
          <div class="section-title">📋 基本信息</div>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="单据编号"><el-input v-model="form.receiptNo" readonly placeholder="保存后自动生成" /></el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="业务日期" prop="businessDate">
                <el-date-picker v-model="form.businessDate" type="date" value-format="YYYY-MM-DD" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="工序子类型" prop="processDictId">
                <el-select v-model="form.processDictId" placeholder="请选择" style="width:100%;" @change="onSubProcessChange">
                  <el-option v-for="p in subProcesses" :key="p.id" :label="p.itemLabel" :value="p.id" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="材质" prop="materialId">
                <el-select v-model="form.materialId" placeholder="请选择" style="width:100%;">
                  <el-option v-for="m in pgMaterials" :key="m.id" :label="m.itemLabel" :value="m.id" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 收发数据 -->
        <div class="form-section">
          <div class="section-title">⚖️ 收发数据</div>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="8">
              <el-form-item label="发出重量 (g)" prop="sendWeightG">
                <el-input-number v-model="form.sendWeightG" :min="0" :precision="2" :controls="false" style="width:100%;" @change="calcAuto" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="回收重量 (g)" prop="recycleWeightG">
                <el-input-number v-model="form.recycleWeightG" :min="0" :precision="2" :controls="false" style="width:100%;" @change="calcAuto" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 自动计算 -->
        <div class="form-section calc-section">
          <div class="section-title">📐 自动计算</div>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="8">
              <el-form-item label="实损耗 (g)"><el-input :model-value="form.actualLossG.toFixed(3)" readonly class="calc-input" /></el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="标准损耗 (g)"><el-input :model-value="form.standardLossG.toFixed(3)" readonly class="calc-input" /></el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="应回金 (g)"><el-input :model-value="form.shouldRecycleG.toFixed(3)" readonly class="calc-input" /></el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 抛光专属 -->
        <div class="form-section" v-if="currentSubProcess === '布心抛光'">
          <div class="section-title">🧶 布心抛光专属字段</div>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item label="布心备注说明" prop="clothCoreNote">
                <el-input v-model="form.extraFields.clothCoreNote" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="请输入布心抛光的具体情况说明" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 备注 -->
        <div class="form-section">
          <div class="section-title">📝 备注</div>
          <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" show-word-limit /></el-form-item>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Check, Refresh } from '@element-plus/icons-vue';
import { getProcessOptions, createProcessReceipt } from '@/api/process';

const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const formRef = ref();

const options = reactive({ materials: [], zmSubProcesses: [], pgSubProcesses: [] });
const subProcesses = computed(() => options.pgSubProcesses);
const pgMaterials = computed(() => options.materials.filter(m => !m.itemValue?.includes('PT'))); // 抛光不用PT

const currentSubProcess = computed(() => {
  const p = subProcesses.value.find(p => p.id === form.processDictId);
  return p?.subProcess || '';
});

const form = reactive({
  receiptNo: '',
  businessDate: new Date().toISOString().slice(0, 10),
  processDictId: null,
  materialId: null,
  sendWeightG: 0,
  recycleWeightG: 0,
  actualLossG: 0,
  standardLossG: 0,
  shouldRecycleG: 0,
  extraFields: { clothCoreNote: '' },
  remark: ''
});

const rules = {
  businessDate: [{ required: true, message: '请选择业务日期' }],
  processDictId: [{ required: true, message: '请选择工序子类型' }],
  materialId: [{ required: true, message: '请选择材质' }],
  sendWeightG: [{ required: true, message: '请输入发出重量' }],
  recycleWeightG: [{ required: true, message: '请输入回收重量' }],
};

const calcAuto = () => {
  const send = form.sendWeightG || 0;
  const recycle = form.recycleWeightG || 0;
  form.actualLossG = Math.max(0, send - recycle);
  const proc = subProcesses.value.find(p => p.id === form.processDictId);
  const rate = proc?.defaultLossRate ?? 0;
  form.standardLossG = parseFloat((form.actualLossG * rate).toFixed(3));
  form.shouldRecycleG = parseFloat((form.actualLossG - form.standardLossG).toFixed(3));
};

const onSubProcessChange = () => { calcAuto(); };

const handleSave = async () => {
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      calcAuto();
      const payload = {
        mainProcess: 'PG',
        processDictId: form.processDictId,
        materialId: form.materialId,
        businessDate: form.businessDate,
        sendWeightG: form.sendWeightG,
        recycleWeightG: form.recycleWeightG,
        extraFields: form.extraFields,
        remark: form.remark
      };
      const res = await createProcessReceipt(payload);
      form.receiptNo = res.data?.receiptNo || '';
      ElMessage.success('保存成功，单据号：' + form.receiptNo);
    } catch (e) { ElMessage.error(e.message || '保存失败'); }
    finally { saving.value = false; }
  });
};

const handleReset = () => {
  form.receiptNo = '';
  form.processDictId = null;
  form.materialId = null;
  form.sendWeightG = 0;
  form.recycleWeightG = 0;
  form.actualLossG = 0;
  form.standardLossG = 0;
  form.shouldRecycleG = 0;
  form.extraFields = { clothCoreNote: '' };
  form.remark = '';
};

const loadOptions = async () => {
  loading.value = true;
  try {
    const res = await getProcessOptions();
    options.materials = res.data?.materials || [];
    options.zmSubProcesses = res.data?.zmSubProcesses || [];
    options.pgSubProcesses = res.data?.pgSubProcesses || [];
  } catch { ElMessage.error('加载选项失败'); }
  finally { loading.value = false; }
};

onMounted(loadOptions);
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
.calc-section :deep(.el-input__wrapper) { background: #f0f9eb; }
.calc-input :deep(.el-input__wrapper) { background: #f0f9eb; }
</style>
