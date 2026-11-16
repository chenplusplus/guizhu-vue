<!-- src/views/process/zm-input.vue 执模数据录入 -->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="$router.back()"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
        <h2>{{ isEdit ? '🔧 编辑执模单据' : '🔧 执模数据录入' }}</h2>
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

      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" size="large">
        <!-- 第一行：基本信息 -->
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
              <el-form-item label="内容">
                <el-select
                  v-model="form.content" placeholder="请选择内容" clearable filterable
                  allow-create default-first-option style="width:100%;" class="content-select">
                  <el-option v-for="c in contentOptions" :key="c.itemValue" :label="c.itemLabel" :value="c.itemValue" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 师傅：单独一行，大号醒目 -->
        <div class="form-section master-picker-section">
          <div class="mp-icon">👤</div>
          <div class="mp-main">
            <div class="mp-label">执模师傅</div>
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

        <!-- 执模类型：有耗 / 无耗，不同底图与配色 -->
        <div class="form-section">
          <div class="section-title">🔧 执模类型</div>
          <el-form-item prop="processDictId" class="process-card-item" label-width="0">
            <div class="process-cards">
              <div
                v-for="p in subProcesses" :key="p.id"
                class="process-card" :class="[cardTheme(p), { active: form.processDictId === p.id }]"
                @click="pickSubProcess(p)">
                <div class="pc-bg"></div>
                <div class="pc-icon">{{ cardIcon(p) }}</div>
                <div class="pc-body">
                  <div class="pc-label">{{ cardTitle(p) }}</div>
                  <div class="pc-desc">{{ cardDesc(p) }}</div>
                </div>
                <div class="pc-check" v-if="form.processDictId === p.id">✓</div>
              </div>
              <div class="process-card empty" v-if="!subProcesses.length">
                字典「执模子工序」暂无可用项
              </div>
            </div>
          </el-form-item>
        </div>

        <!-- 第二行：核心数据（发出 / 回收 两张不同底色的卡） -->
        <div class="form-section">
          <div class="section-title">⚖️ 收发数据</div>
          <div class="io-cards">
            <el-form-item prop="sendWeightG" class="io-form-item" label-width="0">
              <div class="io-card io-out">
                <div class="io-head">
                  <span class="io-icon">📤</span>
                  <span class="io-title">发出重量</span>
                  <span class="io-sub">发给师傅</span>
                </div>
                <div class="io-field">
                  <el-input-number
                    v-model="form.sendWeightG" :min="0" :precision="2" :controls="false"
                    class="io-number" placeholder="0.00" @change="calcAuto" />
                  <span class="io-unit">g</span>
                </div>
              </div>
            </el-form-item>
            <el-form-item prop="recycleWeightG" class="io-form-item" label-width="0">
              <div class="io-card io-in">
                <div class="io-head">
                  <span class="io-icon">📥</span>
                  <span class="io-title">回收重量</span>
                  <span class="io-sub">师傅交回</span>
                </div>
                <div class="io-field">
                  <el-input-number
                    v-model="form.recycleWeightG" :min="0" :precision="2" :controls="false"
                    class="io-number" placeholder="0.00" @change="calcAuto" />
                  <span class="io-unit">g</span>
                </div>
              </div>
            </el-form-item>
          </div>
        </div>

        <!-- 第三行：自动计算 -->
        <div class="form-section calc-section">
          <div class="section-title">📐 自动计算</div>
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="标准损耗率">
                <div class="rate-field">
                  <el-input-number
                    v-model="form.lossRatePct" :min="0" :max="100" :precision="2" :step="0.5" :controls="false"
                    :disabled="!isLossySelected" class="rate-number" @change="calcAuto" />
                  <span class="rate-unit">%</span>
                </div>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="实损耗 (g)"><el-input :model-value="form.actualLossG.toFixed(3)" readonly class="calc-input" /></el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="标准损耗 (g)"><el-input :model-value="form.standardLossG.toFixed(3)" readonly class="calc-input" /></el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="应回金 (g)"><el-input :model-value="form.shouldRecycleG.toFixed(3)" readonly class="calc-input" /></el-form-item>
            </el-col>
          </el-row>
          <div class="rate-hint" v-if="isLossySelected">
            标准损耗 = <b>回收重量 × 损耗率</b>（默认 2.5%，可手填）；实损耗 = 发出 − 回收
          </div>
          <div class="rate-hint" v-else-if="form.processDictId">
            无耗执模不扣损耗，实损耗即应回金
          </div>
          <el-alert v-if="overLossG > 0" type="error" :closable="false" show-icon class="over-loss-alert">
            <template #title>
              实损耗 <b>{{ fmt3(form.actualLossG) }}</b> g 已超标准损耗 <b>{{ fmt3(form.standardLossG) }}</b> g，
              超出 <b>{{ fmt3(overLossG) }}</b> g
            </template>
            <template #default>请先核对回收重量 / 余料水口是否录错；确属超耗，保存时还会再确认一次。</template>
          </el-alert>
        </div>

        <!-- 第三行半：师傅累计（上单累计 → 本单 → 累计） -->
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
            <b>上单累计</b>：该师傅截至业务日期、已生效单据的合计（不含正在录入的这一单）。<br>
            <b>本单</b>：上面填的发货 / 回收重量实时算出的值，改一个数下面三行跟着变。<br>
            <b>累计</b>：上单累计 + 本单。应回金 = 实损耗 − 标准损耗；标准损耗 = 回收重量 × 损耗率。
          </div>
        </div>

        <!-- 第四行：执模独有字段 -->
        <div class="form-section" v-if="form.processDictId">
          <div class="section-title">🔩 执模专属字段</div>
          <el-row :gutter="20">
            <!-- 有耗执模：水口（按 95% 折料，仅作回收重量参考，不参与实损耗公式） -->
            <el-col :xs="24" :sm="8" v-if="currentSubProcess === '有耗执模'">
              <el-form-item label="余料水口重量 (g)">
                <el-input-number v-model="form.extraFields.residueWaterG" :min="0" :precision="2" :controls="false" style="width:100%;" />
                <div class="water-hint" v-if="Number(form.extraFields.residueWaterG) > 0">
                  按 95% 折料：<b>{{ fmt3(Number(form.extraFields.residueWaterG) * 0.95) }}</b> g（回收重量可照此填）
                </div>
              </el-form-item>
            </el-col>
            <!-- 无耗执模：发线 -->
            <el-col :xs="24" :sm="8" v-if="currentSubProcess === '无耗执模'">
              <el-form-item label="余料发线重量 (g)">
                <el-input-number v-model="form.extraFields.residueWireG" :min="0" :precision="2" :controls="false" style="width:100%;" />
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Check, Refresh } from '@element-plus/icons-vue';
import { getProcessOptions, createProcessReceipt, updateProcessReceipt, getProcessDetail, getMasterLastTotal } from '@/api/process';
import { todayStr } from '@/utils/date';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const saving = ref(false);
const formRef = ref();

// ===== 编辑模式（/process/zm-input?id=123）=====
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

const options = reactive({ materials: [], zmSubProcesses: [], pgSubProcesses: [], masters: [], zmContents: [] });
const subProcesses = computed(() => options.zmSubProcesses);

const round3 = (v) => Math.round(Number(v || 0) * 1000) / 1000;
const fmt3 = (v) => round3(v).toFixed(3);

const currentSubProcess = computed(() => {
  const p = subProcesses.value.find(p => p.id === form.processDictId);
  return p?.itemValue || '';
});

// ⭐ 有耗执模才扣损耗；标准损耗率默认 2.5%（可手填）
const DEFAULT_LOSS_RATE_PCT = 2.5;
const isLossySelected = computed(() => currentSubProcess.value.includes('有耗'));

// 有耗执模的「内容」只在 倒模货 / 水口 / 其他 里选（字典缺项时前端兜底，保证三项都能选）
const LOSS_CONTENTS = ['倒模货', '水口', '其他'];
const contentOptions = computed(() => {
  if (!isLossySelected.value) return options.zmContents;
  const picked = options.zmContents.filter(c => LOSS_CONTENTS.includes(c.itemValue));
  const missing = LOSS_CONTENTS
    .filter(v => !picked.some(c => c.itemValue === v))
    .map(v => ({ id: `fb-${v}`, itemValue: v, itemLabel: v }));
  return [...picked, ...missing];
});

const form = reactive({
  receiptNo: '',
  businessDate: todayStr(),
  processDictId: null,
  materialId: null,
  sendWeightG: 0,
  recycleWeightG: 0,
  lossRatePct: 0,                  // 标准损耗率（%，有耗默认 2.5，可手填）
  actualLossG: 0,
  standardLossG: 0,
  shouldRecycleG: 0,
  extraFields: { residueWaterG: 0, residueWireG: 0 },
  masterName: '',
  productName: '',
  content: '',
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
  const ratePct = isLossySelected.value ? (Number(form.lossRatePct) || 0) : 0;
  // ⚠️ 与后端 CreateAsync/UpdateAsync 完全一致，否则保存后数字会变
  //    标准损耗 = 回收重量 × 损耗率；实损耗 = 发出 − 回收；应回金 = 实损耗 − 标准损耗
  form.actualLossG = round3(send - recycle);
  form.standardLossG = round3(recycle * ratePct / 100);
  form.shouldRecycleG = round3(form.actualLossG - form.standardLossG);
};

// 实损耗超出标准损耗多少（只在有耗时判断；> 0 就是超耗）
const overLossG = computed(() => {
  if (!isLossySelected.value) return 0;
  const over = round3((form.actualLossG || 0) - (form.standardLossG || 0));
  return over > 0.0005 ? over : 0;
});

const onSubProcessChange = () => { calcAuto(); };

// ===== 执模类型卡片（有耗 / 无耗：不同底图与配色）=====
const stripBrackets = (s) => String(s || '').replace(/[（(][^）)]*[）)]/g, '').trim();
const cardTitle = (p) => stripBrackets(p.itemValue || p.itemLabel) || '未命名';
const cardDesc = (p) => {
  const v = String(p.itemValue || '');
  if (v.includes('有耗')) return `标准损耗率默认 ${DEFAULT_LOSS_RATE_PCT}%，可手填`;
  if (v.includes('无耗')) return '不扣损耗，实损耗即应回金';
  return stripBrackets(p.itemLabel);
};
const cardIcon = (p) => {
  const v = String(p.itemValue || '');
  if (v.includes('有耗')) return '🔥';
  if (v.includes('无耗')) return '💧';
  return '⚙️';
};
const cardTheme = (p) => {
  const v = String(p.itemValue || '');
  if (v.includes('有耗')) return 'warm';
  if (v.includes('无耗')) return 'cool';
  return 'plain';
};
const pickSubProcess = (p) => {
  form.processDictId = p.id;
  // ⭐ 有耗默认 2.5%，无耗 0；选完仍可手填
  form.lossRatePct = String(p.itemValue || '').includes('有耗') ? DEFAULT_LOSS_RATE_PCT : 0;
  onSubProcessChange();
};

// 重量/工序一变就重算，上方自动计算和下方本单/累计同时动（不依赖 change 事件）
watch(() => [form.sendWeightG, form.recycleWeightG, form.processDictId], () => {
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
      mainProcess: 'ZM',
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
      router.replace('/process/zm-list');
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
    form.remark = d.remark || '';
    form.extraFields = {
      residueWaterG: Number(d.extraFields?.residueWaterG) || 0,
      residueWireG: Number(d.extraFields?.residueWireG) || 0
    };
    // ⭐ 标准损耗率：新单据存在 extraFields.lossRatePct；老单据没存，按 标准损耗 ÷ 回收 反算
    const savedRate = Number(d.extraFields?.lossRatePct);
    if (Number.isFinite(savedRate) && savedRate > 0) {
      form.lossRatePct = savedRate;
    } else if (Number(d.recycleWeightG) > 0 && Number(d.standardLossG) > 0) {
      form.lossRatePct = Math.round((Number(d.standardLossG) / Number(d.recycleWeightG)) * 10000) / 100;
    } else {
      form.lossRatePct = 0;
    }
    // 字典ID后端已按名称反查；查不到再按名称兜底匹配一次
    form.processDictId = d.processDictId || subProcesses.value.find(p => p.itemValue === d.subProcess)?.id || null;
    form.materialId = d.materialId || options.materials.find(m => m.itemValue === d.materialName)?.id || null;
    editStatus.value = Number(d.status) || 0;

    const miss = [];
    if (!form.processDictId && d.subProcess) miss.push(`子工序「${d.subProcess}」`);
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

// 五行指标：上单累计 → 本单 → 累计
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
    mk('标准损耗', '回收 × 损耗率', 'standardLossG'),
    mk('应回金', '实损耗 − 标准损耗', 'shouldRecycleG', 'recycle-cls')
  ];
});

const handleSave = async () => {
  if (!canEdit.value) { ElMessage.warning('只有未审核的单据可以编辑'); return; }
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    try {
      calcAuto();
      // ⭐ 超耗二次确认：有耗执模实损耗超过标准损耗时，页面红字已经提示，这里再确认一次
      if (overLossG.value > 0) {
        try {
          await ElMessageBox.confirm(
            `本单实损耗 ${fmt3(form.actualLossG)} g，标准损耗 ${fmt3(form.standardLossG)} g，超出 ${fmt3(overLossG.value)} g。确认保存吗？`,
            '超标准损耗',
            { type: 'warning', confirmButtonText: '仍然保存', cancelButtonText: '返回修改' }
          );
        } catch { return; }
      }
      saving.value = true;
      const payload = {
        mainProcess: 'ZM',
        processDictId: form.processDictId,
        materialId: form.materialId,
        businessDate: form.businessDate,
        sendWeightG: form.sendWeightG,
        recycleWeightG: form.recycleWeightG,
        lossRatePct: isLossySelected.value ? (Number(form.lossRatePct) || 0) : 0,
        extraFields: form.extraFields,
        masterName: form.masterName,
        productName: form.productName,
        content: form.content,
        remark: form.remark
      };
      if (isEdit.value) {
        await updateProcessReceipt({ id: editId.value, ...payload });
        ElMessage.success('修改已保存');
        router.push('/process/zm-list');
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
  form.lossRatePct = 0;
  form.actualLossG = 0;
  form.standardLossG = 0;
  form.shouldRecycleG = 0;
  form.extraFields = { residueWaterG: 0, residueWireG: 0 };
  form.masterName = '';
  form.productName = '';
  form.content = '';
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
    options.zmContents = res.data?.zmContents || [];
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
.form-section:last-child { border-bottom: none; margin-bottom: 0; }
.section-title { font-size: 14px; font-weight: 600; color: #409EFF; margin-bottom: 16px; padding-left: 8px; border-left: 3px solid #409EFF; }
.calc-section :deep(.el-input__wrapper) { background: #f0f9eb; }
.calc-input :deep(.el-input__wrapper) { background: #f0f9eb; }

/* ===== 标准损耗率 / 超耗提醒 ===== */
.rate-field { display: flex; align-items: center; gap: 6px; width: 100%; }
.rate-number { flex: 1; min-width: 0; }
.rate-field :deep(.el-input__wrapper) { background: #fffdf5; }
.rate-unit { font-size: 14px; font-weight: 700; color: #b88230; }
.rate-hint { font-size: 12px; color: #909399; margin: -4px 0 10px 2px; }
.rate-hint b { color: #606266; }
.over-loss-alert { margin-top: 4px; }
.over-loss-alert :deep(.el-alert__title) { font-size: 13px; }
.water-hint { font-size: 12px; color: #909399; line-height: 1.6; margin-top: 4px; }
.water-hint b { color: #c2410c; }

/* ===== 发出 / 回收：两种底色，一眼分清 ===== */
.io-cards { display: flex; gap: 16px; flex-wrap: wrap; }
.io-form-item { flex: 1 1 280px; max-width: 400px; margin-bottom: 0; }
.io-form-item :deep(.el-form-item__content) { width: 100%; }
.io-card {
  position: relative; overflow: hidden; width: 100%;
  border-radius: 14px; border: 2px solid transparent; padding: 14px 20px 16px;
}
.io-card::after {
  content: ''; position: absolute; width: 140px; height: 140px; border-radius: 50%;
  right: -46px; top: -56px; pointer-events: none;
}
/* 发出：暖橙（钱/料出去了）*/
.io-out {
  background: linear-gradient(135deg, #fff6ef 0%, #ffe3cf 100%);
  border-color: #f7ab84; box-shadow: 0 6px 18px rgba(240, 120, 60, .14);
}
.io-out::after { background: radial-gradient(circle, rgba(240, 138, 59, .22), transparent 70%); }
/* 回收：青绿（料回来了）*/
.io-in {
  background: linear-gradient(135deg, #eefbf6 0%, #d3f2e5 100%);
  border-color: #79d2b5; box-shadow: 0 6px 18px rgba(16, 150, 110, .14);
}
.io-in::after { background: radial-gradient(circle, rgba(16, 185, 129, .20), transparent 70%); }
.io-head { position: relative; z-index: 1; display: flex; align-items: baseline; gap: 8px; margin-bottom: 9px; }
.io-icon { font-size: 20px; line-height: 1; }
.io-title { font-size: 16px; font-weight: 800; letter-spacing: 1px; }
.io-out .io-title { color: #c2410c; }
.io-in .io-title { color: #0f766e; }
.io-sub { font-size: 12px; }
.io-out .io-sub { color: #b07a5c; }
.io-in .io-sub { color: #5d8e80; }
.io-field { position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; }
.io-number { flex: 1; min-width: 0; }
.io-number :deep(.el-input__wrapper) {
  min-height: 52px; padding: 0 14px; border-radius: 10px;
  background: #fff; box-shadow: none; border: 2px solid transparent;
}
.io-out .io-number :deep(.el-input__wrapper) { border-color: #f3b48f; }
.io-in .io-number :deep(.el-input__wrapper) { border-color: #7ed0b4; }
.io-out .io-number :deep(.el-input__wrapper.is-focus) { border-color: #e2611b; box-shadow: 0 0 0 3px rgba(226, 97, 27, .15); }
.io-in .io-number :deep(.el-input__wrapper.is-focus) { border-color: #0f9c78; box-shadow: 0 0 0 3px rgba(15, 156, 120, .15); }
.io-number :deep(.el-input__inner) {
  font-size: 24px; font-weight: 800; text-align: right; letter-spacing: .5px;
}
.io-out .io-number :deep(.el-input__inner) { color: #c2410c; }
.io-in .io-number :deep(.el-input__inner) { color: #0f766e; }
.io-unit { font-size: 15px; font-weight: 800; }
.io-out .io-unit { color: #c2410c; }
.io-in .io-unit { color: #0f766e; }

/* ===== 师傅：单独一行，大号醒目（不用黑字）===== */
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

/* ===== 执模类型卡片：有耗 / 无耗 不同底图与配色 ===== */
.process-card-item { margin-bottom: 0; }
.process-card-item :deep(.el-form-item__content) { width: 100%; }
.process-cards { display: flex; gap: 16px; flex-wrap: wrap; width: 100%; }
.process-card {
  position: relative; overflow: hidden; flex: 1 1 280px; max-width: 400px; min-height: 100px;
  display: flex; align-items: center; gap: 16px; padding: 18px 24px;
  border-radius: 14px; border: 2px solid transparent; cursor: pointer;
  transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
}
.process-card:hover { transform: translateY(-2px); }
.process-card .pc-bg { position: absolute; inset: 0; pointer-events: none; opacity: .6; }
/* 有耗：暖橙 + 斜纹底图 */
.process-card.warm { border-color: #f6c7a1; background: linear-gradient(135deg, #fff7ef, #ffe7d2); }
.process-card.warm .pc-bg {
  background-image: repeating-linear-gradient(135deg, rgba(240, 138, 59, .10) 0 12px, transparent 12px 24px);
}
.process-card.warm.active {
  border-color: #f08a3b; background: linear-gradient(135deg, #ffefdf, #ffd7b4);
  box-shadow: 0 8px 20px rgba(240, 138, 59, .28);
}
/* 无耗：冷蓝 + 点阵底图 */
.process-card.cool { border-color: #b6dcf6; background: linear-gradient(135deg, #f2f9ff, #dceeff); }
.process-card.cool .pc-bg {
  background-image: radial-gradient(rgba(56, 140, 220, .16) 1.4px, transparent 1.4px);
  background-size: 12px 12px;
}
.process-card.cool.active {
  border-color: #2f8fdc; background: linear-gradient(135deg, #e8f4ff, #c6e4ff);
  box-shadow: 0 8px 20px rgba(47, 143, 220, .26);
}
/* 其它类型：中性灰蓝 + 网格底图 */
.process-card.plain { border-color: #d8dee8; background: linear-gradient(135deg, #fafbfd, #eef2f7); }
.process-card.plain .pc-bg {
  background-image: linear-gradient(rgba(120, 140, 170, .08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(120, 140, 170, .08) 1px, transparent 1px);
  background-size: 16px 16px;
}
.process-card.plain.active { border-color: #7c93b3; background: linear-gradient(135deg, #f2f6fb, #e2eaf4); box-shadow: 0 8px 20px rgba(124, 147, 179, .22); }
.process-card.empty { cursor: default; color: #909399; font-size: 13px; justify-content: center; border-style: dashed; }
.pc-icon { position: relative; z-index: 1; font-size: 30px; line-height: 1; }
.pc-body { position: relative; z-index: 1; flex: 1; }
.pc-label { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
.warm .pc-label { color: #c2410c; }
.cool .pc-label { color: #0b6bbd; }
.plain .pc-label { color: #47617f; }
.pc-desc { font-size: 12px; margin-top: 5px; color: #a1745a; }
.cool .pc-desc { color: #5b7d99; }
.plain .pc-desc { color: #8296ad; }
.pc-check {
  position: absolute; z-index: 2; top: 10px; right: 12px;
  width: 22px; height: 22px; border-radius: 50%; color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700;
}
.warm.active .pc-check { background: #f08a3b; }
.cool.active .pc-check { background: #2f8fdc; }
.plain.active .pc-check { background: #7c93b3; }

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
