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
              <el-form-item label="材质" prop="materialId">
                <el-select v-model="form.materialId" placeholder="请选择" style="width:100%;">
                  <el-option v-for="m in options.materials" :key="m.id" :label="m.itemLabel" :value="m.id" />
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

        <!-- 镶石类型：手镶 / 微镶（决定填哪套钻石数据、损耗扣哪个卡重） -->
        <div class="form-section">
          <div class="section-title">💎 镶石类型</div>
          <div class="process-cards">
            <div
              v-for="t in inlayTypes" :key="t.value"
              class="process-card" :class="[t.theme, { active: form.extraFields.inlayType === t.value }]"
              @click="pickInlayType(t.value)">
              <div class="pc-bg"></div>
              <div class="pc-icon">{{ t.icon }}</div>
              <div class="pc-body">
                <div class="pc-label">{{ t.label }}</div>
                <div class="pc-desc">{{ t.desc }}</div>
              </div>
              <div class="pc-check" v-if="form.extraFields.inlayType === t.value">✓</div>
            </div>
          </div>
        </div>

        <!-- 师傅：单独一行，大号醒目（与执模录入页一致） -->
        <div class="form-section master-picker-section">
          <div class="mp-icon">👤</div>
          <div class="mp-main">
            <div class="mp-label">镶石师傅</div>
            <el-select
              v-model="form.masterName" filterable allow-create default-first-option clearable
              placeholder="请选择或输入师傅姓名" class="mp-select" @change="loadMasterTotal">
              <el-option v-for="m in options.masters" :key="m.id" :label="m.itemLabel" :value="m.itemValue" />
            </el-select>
          </div>
          <div class="mp-side" v-if="form.masterName">
            <template v-if="masterTotal.recordCount > 0">
              <div class="mp-side-num">{{ masterTotal.recordCount }}</div>
              <div class="mp-side-txt">已生效单数</div>
            </template>
            <div class="mp-side-empty" v-else>暂无历史单</div>
          </div>
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
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="实损耗 (g)"><el-input :model-value="form.actualLossG.toFixed(3)" readonly class="calc-input" /></el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="标准损耗 (g)"><el-input :model-value="form.standardLossG.toFixed(3)" readonly class="calc-input" /></el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="标准损耗率 (%)">
                <el-input-number
                  v-model="form.lossRatePct" :min="0" :max="100" :precision="2" :step="0.5" :controls="false"
                  style="width:100%;" @change="calcAuto" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="应回金 (g)"><el-input :model-value="form.shouldRecycleG.toFixed(3)" readonly class="calc-input" /></el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="实际回金 (g)">
                <el-input-number v-model="form.actualRecycleG" :min="0" :precision="3" :controls="false" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="未回金 (g)">
                <el-input :model-value="unreturnedG.toFixed(3)" readonly
                  class="calc-input" :class="{ 'unreturned-warn': unreturnedG > 0 }" />
              </el-form-item>
            </el-col>
          </el-row>
          <div class="rate-hint">
            标准损耗 = <b>（发出 − 回收 − 钻石克重）× 损耗率</b>（默认 2% = 0.02，可手填），钻石克重 = 卡重 × 0.2（本单 {{ diamondGram.toFixed(3) }} g）；
            实损耗 = 发出 − 回收；应回金 = 实损耗 − 标准损耗；<b>未回金 = 应回金 − 实际回金</b>
          </div>
        </div>

        <!-- 镶石专属：钻石字段（跟上面选的类型走，另一套数据仍保留、切回去还在） -->
        <div class="form-section">
          <div class="section-title">💎 {{ inlayTypeLabel }}钻石信息</div>
          <el-row :gutter="20">
            <template v-if="form.extraFields.inlayType === 'hand'">
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
            </template>
            <template v-else>
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
            </template>
            <el-col :xs="24" :sm="6">
              <el-form-item label="报废重量 (g)">
                <el-input-number v-model="form.extraFields.scrapG" :min="0" :precision="2" :controls="false" style="width:100%;" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="6">
              <el-form-item label="加工费 (元)">
                <el-input-number v-model="form.laborFee" :min="0" :precision="2" :controls="false" style="width:100%;" />
              </el-form-item>
            </el-col>
          </el-row>
          <div class="stone-hint">
            标准损耗按<b>当前类型</b>的卡重扣钻石克重（卡重 × 0.2）；切类型不会清空另一套数据，切回去还在。
          </div>
        </div>

        <!-- 备注 -->
        <div class="form-section">
          <div class="section-title">📝 备注</div>
          <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" show-word-limit /></el-form-item>
        </div>

        <!-- 师傅累计（上单 → 本单 → 累积）：放最下面，先填完钻石和备注再看统计 -->
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
            <b>累计</b>：上单累计 + 本单。应回金 = 实损耗 − 标准损耗（标准损耗 =（发出−回收−钻石克重）× 损耗率）；
            <b>未回金</b> = 应回金 − 实际回金，正数就是这个师傅还欠的金；从本单起录「实际回金」，
            老单没录会按全额未给算，累计数会偏大。
          </div>
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

// ⭐ 镶石类型：手镶 / 微镶（决定填哪套钻石数据、损耗扣哪个卡重）
const inlayTypes = [
  { value: 'micro', label: '微镶', icon: '💠', desc: '小钻密集镶，按微镶卡重扣钻石克重', theme: 'cool' },
  { value: 'hand', label: '手镶', icon: '💎', desc: '手工镶主石，按手镶卡重扣钻石克重', theme: 'warm' }
];
const pickInlayType = (v) => {
  form.extraFields.inlayType = v;
  calcAuto();
};

const form = reactive({
  receiptNo: '',
  businessDate: todayStr(),
  processDictId: null,
  materialId: null,
  sendWeightG: 0,
  recycleWeightG: 0,
  actualLossG: 0,
  standardLossG: 0,
  lossRatePct: 2,                  // 标准损耗率（%，默认 2 = 0.02，可手填）
  shouldRecycleG: 0,
  actualRecycleG: 0,
  extraFields: { microCarat: 0, microCount: 0, handCarat: 0, handCount: 0, scrapG: 0, inlayType: 'micro' },
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

// ⭐ 钻石克重：按当前镶石类型取卡重 × 0.2（1ct = 0.2g）
const diamondGram = computed(() => {
  const ef = form.extraFields || {};
  const carat = ef.inlayType === 'hand' ? Number(ef.handCarat || 0) : Number(ef.microCarat || 0);
  return round3(Math.max(0, carat) * 0.2);
});

const inlayTypeLabel = computed(() => (form.extraFields?.inlayType === 'hand' ? '手镶' : '微镶'));

// 未回金 = 应回金 − 实际回金（正数=师傅还欠，负数=多交了）
const unreturnedG = computed(() => round3((form.shouldRecycleG || 0) - (form.actualRecycleG || 0)));

const calcAuto = () => {
  const send = form.sendWeightG || 0;
  const recycle = form.recycleWeightG || 0;
  const ratePct = Number(form.lossRatePct) || 0;
  form.actualLossG = round3(send - recycle);
  // ⭐ 镶石标准损耗 =（发出 − 回收 − 钻石克重）× 损耗率（默认 2%），与后端 ProcessService 口径一致
  const base = send - recycle - diamondGram.value;
  form.standardLossG = round3(Math.max(0, base) * ratePct / 100);
  form.shouldRecycleG = round3(form.actualLossG - form.standardLossG);
};

// 重量、钻石卡重或损耗率一变就重算，上方自动计算和下方本单/累计同时动
watch(() => [
  form.sendWeightG, form.recycleWeightG,
  form.extraFields?.inlayType, form.extraFields?.microCarat, form.extraFields?.handCarat,
  form.lossRatePct
], () => {
  if (!lockCalc) calcAuto();
});

// ===== 师傅累计（上单累计 / 本单 / 累计）=====
const masterTotal = reactive({
  recordCount: 0, sendWeightG: 0, recycleWeightG: 0, actualLossG: 0, standardLossG: 0, shouldRecycleG: 0, actualRecycleG: 0, unreturnedG: 0
});

const loadMasterTotal = async () => {
  if (!form.masterName) {
    Object.assign(masterTotal, { recordCount: 0, sendWeightG: 0, recycleWeightG: 0, actualLossG: 0, standardLossG: 0, shouldRecycleG: 0, actualRecycleG: 0, unreturnedG: 0 });
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
    form.actualRecycleG = Number(d.actualRecycleG) || 0;
    form.masterName = d.masterName || '';
    form.productName = d.productName || '';
    form.content = d.content || '';
    form.laborFee = Number(d.laborFee) || 0;
    form.remark = d.remark || '';
    const ef = d.extraFields || {};
    // ⭐ 损耗率：老单没存过就回默认 2%（= 0.02）
    const savedRate = ef.lossRatePct;
    form.lossRatePct = savedRate != null && savedRate !== '' && Number.isFinite(Number(savedRate)) ? Number(savedRate) : 2;
    form.extraFields = {
      microCarat: Number(ef.microCarat) || 0,
      microCount: Number(ef.microCount) || 0,
      handCarat: Number(ef.handCarat) || 0,
      handCount: Number(ef.handCount) || 0,
      scrapG: Number(ef.scrapG) || 0,
      // 老单没存类型：手镶有数、微镶没数就当手镶，其余按微镶
      inlayType: ef.inlayType || ((Number(ef.handCarat) || 0) > 0 && !(Number(ef.microCarat) || 0) ? 'hand' : 'micro')
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
    shouldRecycleG: form.shouldRecycleG || 0,
    actualRecycleG: form.actualRecycleG || 0,
    unreturnedG: unreturnedG.value
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
    mk('标准损耗', `（发出−回收−石重）× ${Number(form.lossRatePct) || 0}%`, 'standardLossG'),
    mk('应回金', '实损耗 − 标准损耗', 'shouldRecycleG', 'recycle-cls'),
    mk('实际回金', '师傅已经交回', 'actualRecycleG', 'recycle-cls'),
    mk('未回金', '应回金 − 实际回金', 'unreturnedG', 'unreturned-cls')
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
        actualRecycleG: form.actualRecycleG || 0,
        lossRatePct: Number(form.lossRatePct) || 0,
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
        // 接口把 receiptNo 放在最外层（res.data 里没有），两个都兜一下
        form.receiptNo = res?.receiptNo || res?.data?.receiptNo || '';
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
  form.lossRatePct = 2;
  form.shouldRecycleG = 0;
  form.actualRecycleG = 0;
  form.extraFields = { microCarat: 0, microCount: 0, handCarat: 0, handCount: 0, scrapG: 0, inlayType: 'micro' };
  form.masterName = '';
  form.productName = '';
  form.content = '';
  form.laborFee = 0;
  form.remark = '';
  Object.assign(masterTotal, { recordCount: 0, sendWeightG: 0, recycleWeightG: 0, actualLossG: 0, standardLossG: 0, shouldRecycleG: 0, actualRecycleG: 0, unreturnedG: 0 });
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

/* ⭐ 未回金：正数=师傅还欠（橙红），负数/0 不醒目 */
.total-val.unreturned-cls { color: #d4380d; }
.unreturned-warn :deep(.el-input__wrapper) { background: #fff2e8; }
.unreturned-warn :deep(.el-input__inner) { color: #d4380d; font-weight: 700; }

/* ===== 师傅：单独一行，大号醒目（与执模录入页一模一样）===== */
.master-picker-section {
  display: flex; align-items: center; gap: 18px;
  background: linear-gradient(120deg, #fffaf0 0%, #fff4dc 55%, #fdf0d0 100%);
  border: 2px solid #f3d9a4; border-radius: 14px; padding: 16px 22px;
  box-shadow: 0 4px 16px rgba(202, 138, 4, .10);
}
.mp-icon { font-size: 34px; line-height: 1; }
.mp-main { flex: 1; min-width: 0; }
.mp-label { font-size: 16px; font-weight: 800; color: #a16207; letter-spacing: 2px; margin-bottom: 8px; }
.mp-select { width: 100%; }
.mp-select :deep(.el-select__wrapper) {
  min-height: 56px; padding: 2px 16px; border-radius: 10px;
  background: #fff; border: 2px solid #eab308;
  box-shadow: 0 2px 10px rgba(234, 179, 8, .18);
}
.mp-select :deep(.el-select__wrapper.is-focused) { border-color: #ca8a04; box-shadow: 0 0 0 3px rgba(234, 179, 8, .22); }
.mp-select :deep(.el-select__placeholder) { font-size: 22px; font-weight: 800; color: #b45309 !important; letter-spacing: 1px; }
.mp-select :deep(.el-select__placeholder.is-transparent) { font-size: 17px; font-weight: 500; color: #c8a44e !important; letter-spacing: 0; }
.mp-select :deep(.el-select__selected-item) { color: #b45309; }
.mp-side { text-align: center; padding-left: 18px; border-left: 1px dashed #e7c886; min-width: 96px; }
.mp-side-num { font-size: 28px; font-weight: 800; color: #b45309; line-height: 1.1; }
.mp-side-txt { font-size: 12px; color: #a16207; margin-top: 2px; }
.mp-side-empty { font-size: 12px; color: #c9a227; line-height: 1.5; }

/* ===== 镶石类型卡片：手镶 / 微镶 ===== */
.process-cards { display: flex; gap: 16px; flex-wrap: wrap; width: 100%; }
.process-card {
  position: relative; overflow: hidden; flex: 1 1 280px; max-width: 400px; min-height: 100px;
  display: flex; align-items: center; gap: 16px; padding: 18px 24px;
  border-radius: 14px; border: 2px solid transparent; cursor: pointer;
  transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
}
.process-card:hover { transform: translateY(-2px); }
.process-card .pc-bg { position: absolute; inset: 0; pointer-events: none; opacity: .6; }
.process-card.warm { border-color: #f6c7a1; background: linear-gradient(135deg, #fff7ef, #ffe7d2); }
.process-card.warm .pc-bg {
  background-image: repeating-linear-gradient(135deg, rgba(240, 138, 59, .10) 0 12px, transparent 12px 24px);
}
.process-card.warm.active {
  border-color: #f08a3b; background: linear-gradient(135deg, #ffefdf, #ffd7b4);
  box-shadow: 0 8px 20px rgba(240, 138, 59, .28);
}
.process-card.cool { border-color: #b6dcf6; background: linear-gradient(135deg, #f2f9ff, #dceeff); }
.process-card.cool .pc-bg {
  background-image: radial-gradient(rgba(56, 140, 220, .16) 1.4px, transparent 1.4px);
  background-size: 12px 12px;
}
.process-card.cool.active {
  border-color: #2f8fdc; background: linear-gradient(135deg, #e8f4ff, #c6e4ff);
  box-shadow: 0 8px 20px rgba(47, 143, 220, .26);
}
.pc-icon { position: relative; z-index: 1; font-size: 30px; line-height: 1; }
.pc-body { position: relative; z-index: 1; flex: 1; }
.pc-label { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
.warm .pc-label { color: #c2410c; }
.cool .pc-label { color: #0b6bbd; }
.pc-desc { font-size: 12px; margin-top: 5px; color: #a1745a; }
.cool .pc-desc { color: #5b7d99; }
.pc-check {
  position: absolute; z-index: 2; top: 10px; right: 12px;
  width: 22px; height: 22px; border-radius: 50%; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;
}
.warm.active .pc-check { background: #f08a3b; }
.cool.active .pc-check { background: #2f8fdc; }

/* 公式说明 / 钻石字段提示 */
.rate-hint { font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.8; }
.rate-hint b { color: #606266; }
.stone-hint { font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.8; }
.stone-hint b { color: #606266; }
</style>
