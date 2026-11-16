<!-- src/views/process/xs-input.vue 镶石数据录入 -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
        <h2>{{ isEdit ? '💎 编辑镶石单据' : '💎 镶石数据录入' }}</h2>
        <el-tag type="info" v-if="form.receiptNo">{{ form.receiptNo }}</el-tag>
        <el-tag v-if="isEdit" :type="statusTagType" size="small">{{ statusText }}</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSave" :loading="saving" :disabled="!canEdit">
          <el-icon><Check /></el-icon> {{ isEdit ? '保存修改' : '保存' }}
        </el-button>
        <el-button @click="handleReset"><el-icon><Refresh /></el-icon> {{ isEdit ? '还原' : '重置' }}</el-button>
      </div>
    </div>

    <div class="content-body">
      <el-alert
        v-if="isEdit && !canEdit"
        type="warning" :closable="false" show-icon
        title="只有未审核的单据可以编辑"
        description="当前单据已审核或已标记异常，如需修改请联系审核员驳回后再编辑。"
        style="margin-bottom: 16px;" />
      <el-alert
        v-if="dictWarning"
        type="warning" :closable="false" show-icon
        :title="dictWarning"
        description="原字典项可能已被删除或改名，重新选择后保存即可。"
        style="margin-bottom: 16px;" />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="130px" size="large">
        <!-- 基本信息 -->
        <div class="form-section">
          <div class="section-title">📋 基本信息</div>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="单据编号"><el-input v-model="form.receiptNo" readonly placeholder="保存后自动生成" /></el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="业务日期" prop="businessDate">
                <el-date-picker v-model="form.businessDate" type="date" value-format="YYYY-MM-DD" style="width:100%;" @change="loadMasterTotal" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="工序子类型">
                <el-select v-model="form.processDictId" placeholder="正常镶石" style="width:100%;">
                  <el-option v-for="p in subProcesses" :key="p.id" :label="p.itemLabel" :value="p.id" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="材质" prop="materialId">
                <el-select v-model="form.materialId" placeholder="请选择" style="width:100%;">
                  <el-option v-for="m in options.materials" :key="m.id" :label="m.itemLabel" :value="m.id" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="师傅名称">
                <el-select v-model="form.masterName" filterable allow-create default-first-option placeholder="选择或输入师傅" style="width:100%;" @change="loadMasterTotal">
                  <el-option v-for="m in options.masters" :key="m.id" :label="m.itemLabel" :value="m.itemValue" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="产品名称"><el-input v-model="form.productName" placeholder="请输入产品名称" /></el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="内容"><el-input v-model="form.content" placeholder="请输入内容" /></el-form-item>
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

        <!-- 师傅累计（上单累计 → 本单 → 累计） -->
        <div class="form-section master-section">
          <div class="section-title">
            👤 该师傅累计（截至 {{ form.businessDate || '今天' }}）
            <span class="master-name" v-if="form.masterName">{{ form.masterName }}</span>
            <span class="master-name empty" v-else>未选师傅</span>
            <span class="master-count" v-if="form.masterName">已生效 {{ masterTotal.recordCount }} 单</span>
          </div>
          <el-table :data="masterRows" border size="small" class="master-table" style="max-width: 820px;">
            <el-table-column prop="label" label="指标" width="180">
              <template #default="{ row }">
                <span class="row-label">{{ row.label }}</span>
                <span class="row-sub">{{ row.sub }}</span>
              </template>
            </el-table-column>
            <el-table-column label="上单累计" align="right" width="200">
              <template #default="{ row }">{{ fmt3(row.prev) }}<span class="u">g</span></template>
            </el-table-column>
            <el-table-column label="本单" align="right" width="200">
              <template #default="{ row }">
                <span :class="{ 'cur-strong': row.cur !== 0 }">{{ fmt3(row.cur) }}</span><span class="u">g</span>
              </template>
            </el-table-column>
            <el-table-column label="累计" align="right" width="220">
              <template #default="{ row }">
                <b class="total-val" :class="row.cls">{{ fmt3(row.total) }}</b><span class="u">g</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="master-hint">
            <b>上单累计</b>：该师傅截至业务日期、已生效的镶石单合计（不含正在录入的这一单）。<br>
            <b>本单</b>：上面填的发货 / 回收重量实时算出的值，改一个数下面三行跟着变。<br>
            <b>累计</b>：上单累计 + 本单。应回金 = 实损耗 − 标准损耗；镶石标准损耗固定为 0。
          </div>
        </div>

        <!-- 镶石专属：钻石字段 -->
        <div class="form-section">
          <div class="section-title">💎 镶石专属字段（钻石信息）</div>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="6">
              <el-form-item label="微镶钻石重量 (ct)">
                <el-input-number v-model="form.extraFields.microCarat" :min="0" :precision="3" :controls="false" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="6">
              <el-form-item label="微镶粒数">
                <el-input-number v-model="form.extraFields.microCount" :min="0" :precision="0" :controls="false" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="6">
              <el-form-item label="手镶钻石重量 (ct)">
                <el-input-number v-model="form.extraFields.handCarat" :min="0" :precision="3" :controls="false" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="6">
              <el-form-item label="手镶粒数">
                <el-input-number v-model="form.extraFields.handCount" :min="0" :precision="0" :controls="false" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="报废重量 (g)">
                <el-input-number v-model="form.extraFields.scrapG" :min="0" :precision="2" :controls="false" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="8">
              <el-form-item label="加工费 (元)">
                <el-input-number v-model="form.laborFee" :min="0" :precision="2" :controls="false" style="width:100%;" />
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
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Check, Refresh } from '@element-plus/icons-vue';
import { getProcessOptions, createProcessReceipt, updateProcessReceipt, getProcessDetail, getMasterLastTotal } from '@/api/process';
import { todayStr } from '@/utils/date';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const saving = ref(false);
const formRef = ref();

// ===== 编辑模式（/process/xs-input?id=123）=====
const editId = computed(() => {
  const v = Number(route.query.id);
  return Number.isFinite(v) && v > 0 ? v : 0;
});
const isEdit = computed(() => editId.value > 0);
const editStatus = ref(0);                       // 0 未审核 / 1 已审核 / 2 异常
const canEdit = computed(() => !isEdit.value || editStatus.value === 0);
const statusText = computed(() => editStatus.value === 1 ? '已审核' : editStatus.value === 2 ? '异常' : '未审核');
const statusTagType = computed(() => editStatus.value === 1 ? 'success' : editStatus.value === 2 ? 'danger' : 'warning');
const dictWarning = ref('');
let lockCalc = false;                            // 回填时不触发重算，保留库里的原始值

const options = reactive({ materials: [], zmSubProcesses: [], pgSubProcesses: [], masters: [] });
// 镶石只有一种：正常镶石，损耗率=0，硬编码
const subProcesses = [{ id: 0, itemKey: '正常镶石', itemValue: '正常镶石', itemLabel: '正常镶石', defaultLossRate: 0 }];

const round3 = (v) => Math.round(Number(v || 0) * 1000) / 1000;
const fmt3 = (v) => round3(v).toFixed(3);

const form = reactive({
  receiptNo: '',
  businessDate: todayStr(),
  processDictId: null,
  materialId: null,
  sendWeightG: 0,
  recycleWeightG: 0,
  actualLossG: 0,
  standardLossG: 0,
  shouldRecycleG: 0,
  extraFields: { microCarat: 0, microCount: 0, handCarat: 0, handCount: 0, scrapG: 0 },
  masterName: '',
  productName: '',
  content: '',
  laborFee: 0,
  remark: ''
});

const rules = {
  businessDate: [{ required: true, message: '请选择业务日期' }],
  materialId: [{ required: true, message: '请选择材质' }],
  sendWeightG: [{ required: true, message: '请输入发出重量' }],
  recycleWeightG: [{ required: true, message: '请输入回收重量' }],
};

const calcAuto = () => {
  const send = form.sendWeightG || 0;
  const recycle = form.recycleWeightG || 0;
  // ⚠️ 与后端 CreateAsync 一致：实损耗 = 发货 − 回收，标准损耗镶石固定 0
  form.actualLossG = round3(send - recycle);
  form.standardLossG = 0;
  form.shouldRecycleG = round3(form.actualLossG - form.standardLossG);
};

// 重量一变就重算，上方自动计算和下方本单/累计同时动
watch(() => [form.sendWeightG, form.recycleWeightG], () => {
  if (!lockCalc) calcAuto();
});

// ===== 师傅累计（上单累计 / 本单 / 累计）=====
const masterTotal = reactive({
  recordCount: 0, sendWeightG: 0, recycleWeightG: 0, actualLossG: 0, standardLossG: 0, shouldRecycleG: 0
});

const loadMasterTotal = async () => {
  if (!form.masterName) {
    Object.assign(masterTotal, { recordCount: 0, sendWeightG: 0, recycleWeightG: 0, actualLossG: 0, standardLossG: 0, shouldRecycleG: 0 });
    return;
  }
  try {
    const res = await getMasterLastTotal({
      mainProcess: 'XS',
      masterName: form.masterName,
      businessDate: form.businessDate || undefined,
      excludeId: route.query.id || undefined
    });
    if (res.success) Object.assign(masterTotal, res.data);
  } catch {}
};

// ===== 编辑模式：加载单据并回填 =====
const loadDetail = async () => {
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const res = await getProcessDetail(editId.value);
    const d = res.data;
    if (!d || !d.id) {
      ElMessage.error('单据不存在或已被删除');
      router.replace('/process/xs-list');
      return;
    }
    lockCalc = true;                    // 回填期间不重算，先显示库里的原始值
    form.receiptNo = d.receiptNo || '';
    form.businessDate = String(d.businessDate || '').slice(0, 10) || todayStr();
    form.sendWeightG = Number(d.sendWeightG) || 0;
    form.recycleWeightG = Number(d.recycleWeightG) || 0;
    form.actualLossG = Number(d.actualLossG) || 0;
    form.standardLossG = Number(d.standardLossG) || 0;
    form.shouldRecycleG = Number(d.shouldRecycleG) || 0;
    form.masterName = d.masterName || '';
    form.productName = d.productName || '';
    form.content = d.content || '';
    form.laborFee = Number(d.laborFee) || 0;
    form.remark = d.remark || '';
    form.extraFields = {
      microCarat: Number(d.extraFields?.microCarat) || 0,
      microCount: Number(d.extraFields?.microCount) || 0,
      handCarat: Number(d.extraFields?.handCarat) || 0,
      handCount: Number(d.extraFields?.handCount) || 0,
      scrapG: Number(d.extraFields?.scrapG) || 0
    };
    // 镶石子工序固定「正常镶石」(id=0)；材质按名称兜底匹配
    form.processDictId = d.processDictId || subProcesses[0].id;
    form.materialId = d.materialId || options.materials.find(m => m.itemValue === d.materialName)?.id || null;
    editStatus.value = Number(d.status) || 0;

    const miss = [];
    if (!form.materialId && d.materialName) miss.push(`材质「${d.materialName}」`);
    dictWarning.value = miss.length ? `${miss.join('、')}已不在字典中` : '';
  } catch (e) {
    ElMessage.error(e.message || '加载单据失败');
  } finally {
    loading.value = false;
    await nextTick();                   // 等 watch 跑完再解锁
    lockCalc = false;
  }
  await loadMasterTotal();
};

const masterRows = computed(() => {
  const cur = {
    sendWeightG: form.sendWeightG || 0,
    recycleWeightG: form.recycleWeightG || 0,
    actualLossG: form.actualLossG || 0,
    standardLossG: form.standardLossG || 0,
    shouldRecycleG: form.shouldRecycleG || 0
  };
  const mk = (label, sub, key, cls) => ({
    label, sub, key,
    prev: masterTotal[key] || 0,
    cur: round3(cur[key]),
    total: round3((masterTotal[key] || 0) + (cur[key] || 0)),
    cls: cls || ''
  });
  return [
    mk('发货重量', '发出给师傅', 'sendWeightG'),
    mk('回收重量', '师傅交回', 'recycleWeightG'),
    mk('实损耗', '发货 − 回收', 'actualLossG', 'loss-cls'),
    mk('标准损耗', '镶石固定为 0', 'standardLossG'),
    mk('应回金', '实损耗 − 标准损耗', 'shouldRecycleG', 'recycle-cls')
  ];
});

const handleSave = async () => {
  if (!canEdit.value) { ElMessage.warning('只有未审核的单据可以编辑'); return; }
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      calcAuto();
      const payload = {
        mainProcess: 'XS',
        processDictId: form.processDictId || subProcesses[0].id,
        materialId: form.materialId,
        businessDate: form.businessDate,
        sendWeightG: form.sendWeightG,
        recycleWeightG: form.recycleWeightG,
        extraFields: form.extraFields,
        masterName: form.masterName,
        productName: form.productName,
        content: form.content,
        laborFee: form.laborFee,
        remark: form.remark
      };
      if (isEdit.value) {
        await updateProcessReceipt({ id: editId.value, ...payload });
        ElMessage.success('修改已保存');
        router.push('/process/xs-list');
      } else {
        const res = await createProcessReceipt(payload);
        form.receiptNo = res.data?.receiptNo || '';
        ElMessage.success('保存成功，单据号：' + form.receiptNo);
        await loadMasterTotal();
      }
    } catch (e) { ElMessage.error(e.message || '保存失败'); }
    finally { saving.value = false; }
  });
};

const handleReset = async () => {
  // 编辑模式下「还原」= 回到打开页面时的数据，不清空
  if (isEdit.value) {
    await loadDetail();
    ElMessage.info('已还原为保存前的数据');
    return;
  }
  form.receiptNo = '';
  form.processDictId = null;
  form.materialId = null;
  form.sendWeightG = 0;
  form.recycleWeightG = 0;
  form.actualLossG = 0;
  form.standardLossG = 0;
  form.shouldRecycleG = 0;
  form.extraFields = { microCarat: 0, microCount: 0, handCarat: 0, handCount: 0, scrapG: 0 };
  form.masterName = '';
  form.productName = '';
  form.content = '';
  form.laborFee = 0;
  form.remark = '';
  Object.assign(masterTotal, { recordCount: 0, sendWeightG: 0, recycleWeightG: 0, actualLossG: 0, standardLossG: 0, shouldRecycleG: 0 });
};

const loadOptions = async () => {
  loading.value = true;
  try {
    const res = await getProcessOptions();
    options.materials = res.data?.materials || [];
    options.zmSubProcesses = res.data?.zmSubProcesses || [];
    options.pgSubProcesses = res.data?.pgSubProcesses || [];
    options.masters = res.data?.masters || [];
    form.processDictId = subProcesses[0].id;
    if (route.query.master) form.masterName = String(route.query.master);
  } catch { ElMessage.error('加载选项失败'); }
  finally { loading.value = false; }
};

onMounted(async () => {
  await loadOptions();
  if (isEdit.value) await loadDetail();
  else await loadMasterTotal();
});
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

/* ===== 师傅累计表 ===== */
.master-section { background: #f8fbff; border: 1px solid #e2ecfa; border-radius: 8px; padding: 16px; }
.master-section .section-title { border-left-color: #2f6fd0; color: #2f6fd0; display: flex; align-items: center; gap: 10px; }
.master-name { font-size: 13px; font-weight: 600; color: #303133; background: #e8f1ff; padding: 1px 10px; border-radius: 10px; }
.master-name.empty { color: #909399; background: #f2f3f5; font-weight: 400; }
.master-count { font-size: 12px; font-weight: 400; color: #909399; }
.master-table :deep(.el-table__header th) { background: #eef4fd; color: #5a6b82; font-weight: 600; }
.master-table :deep(.el-table__row td) { padding: 6px 0; }
.row-label { font-weight: 600; color: #303133; }
.row-sub { display: block; font-size: 11px; color: #a8abb2; }
.total-val { font-size: 15px; color: #303133; }
.total-val.loss-cls { color: #E6A23C; }
.total-val.recycle-cls { color: #2f6fd0; }
.cur-strong { font-weight: 600; color: #303133; }
.u { font-size: 11px; color: #a8abb2; margin-left: 2px; }
.master-hint { font-size: 12px; color: #909399; line-height: 1.9; margin-top: 10px; padding: 8px 12px; background: #fff; border-radius: 6px; }
.master-hint b { color: #606266; }
</style>
