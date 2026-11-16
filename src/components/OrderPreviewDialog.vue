<template>
  <el-dialog
    v-model="visible"
    :fullscreen="isFull"
    :width="isFull ? '100%' : '92%'"
    destroy-on-close
    class="order-preview-dialog"
    @open="onOpen"
  >
    <!-- ⭐ 头部：标题 + 退出全屏 / 全屏（打开默认全屏，可一键缩回普通弹窗） -->
    <template #header>
      <div class="dlg-header">
        <span class="dlg-title">订单预览 - {{ orderData?.orderNo || '' }}</span>
        <el-button size="small" @click="isFull = !isFull">
          {{ isFull ? '退出全屏' : '全屏' }}
        </el-button>
      </div>
    </template>
    <div v-loading="loading" class="preview-body">

      <!-- ===== 顶部信息条 ===== -->
      <div class="preview-header">
        <span class="header-item"><span class="label">订单号：</span><span class="value">{{ orderData?.orderNo || '-' }}</span></span>
        <span class="header-item"><span class="label">客户：</span><span class="value">{{ orderData?.customerName || '-' }}</span></span>
        <span class="header-item"><span class="label">业务员：</span><span class="value">{{ orderData?.salesman || '-' }}</span></span>
        <span class="header-item">
          <span class="label">状态：</span>
          <el-tag :type="getStatusType(orderData?.flowStatus)" size="small">{{ getStatusText(orderData?.flowStatus) }}</el-tag>
        </span>
        <span class="header-item"><span class="label">下单日期：</span><span class="value">{{ formatDate(orderData?.orderDate) }}</span></span>
      </div>

      <!-- ===== 订单信息 ===== -->
      <div class="section-title">📋 订单信息</div>
      <table class="excel-table">
        <tbody>
          <tr>
            <td class="label-td">品名</td>
            <td class="value-td">{{ orderData?.productName || '-' }}</td>
            <td class="label-td">成色</td>
            <td class="value-td">
              <span class="color-dot" :style="{ background: currentPurityColor }"></span>
              {{ orderData?.purityLabel || orderData?.color || '-' }}
            </td>
            <td class="label-td">手寸/长度</td>
            <td class="value-td">{{ orderData?.size || '-' }}</td>
            <td class="label-td">数量</td>
            <td class="value-td">{{ orderData?.quantity || '-' }}</td>
            <td class="label-td">颜色</td>
            <td class="value-td">{{ resolveGemColor(orderData) || '-' }}</td>
          </tr>
          <tr>
            <td class="label-td">宽/厚度</td>
            <td class="value-td">{{ orderData?.widthThick || '-' }}</td>
            <td class="label-td">克重要求</td>
            <td class="value-td">{{ orderData?.weightRequirement || '-' }}</td>
            <td class="label-td">钻石级别</td>
            <td class="value-td">{{ orderData?.diamondLevel || '-' }}</td>
            <td class="label-td">工期</td>
            <td class="value-td">{{ orderData?.deliveryDays || '-' }} 天</td>
            <td class="label-td">LOGO</td>
            <td class="value-td">{{ orderData?.logoText || '-' }}</td>
          </tr>
          <tr>
            <td class="label-td">网址</td>
            <td class="value-td" colspan="9">
              <a v-if="orderData?.url" class="link" :href="orderData.url" target="_blank">{{ orderData.url }}</a>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ===== 工厂数据 ===== -->
      <div class="section-title">📊 工厂数据</div>
      <table class="excel-table">
        <tbody>
          <tr>
            <td class="label-td">总重(g)</td>
            <td class="value-td">{{ orderData?.totalWeight ?? '-' }}</td>
            <td class="label-td">净重(g)</td>
            <td class="value-td">{{ orderData?.netWeight ?? '-' }}</td>
            <td class="label-td">损耗率</td>
            <td class="value-td">{{ orderData?.lossRate ?? '-' }}</td>
            <td class="label-td">加耗重</td>
            <td class="value-td">{{ orderData?.addLossWeight ?? '-' }}</td>
            <td class="label-td">金价</td>
            <td class="value-td money">{{ formatMoney(orderData?.goldPrice) }}</td>
          </tr>
          <tr>
            <td class="label-td">足金料克重(g)</td>
            <td class="value-td">{{ fmtN(orderData?.goldMaterialWeight) }}</td>
            <td class="label-td">足金料金额</td>
            <td class="value-td money">{{ formatMoney(orderData?.goldMaterialFee) }}</td>
            <td class="value-td" colspan="6"></td>
          </tr>
        </tbody>
      </table>

      <!-- ===== ⭐ 一件货多成色：金料逐成色明细 ===== -->
      <template v-if="isMultiGold">
        <div class="section-title">🎨 金料成色明细</div>
        <table class="excel-table gi-table">
          <colgroup>
            <col style="width:12%" /><col style="width:13%" /><col style="width:10%" />
            <col style="width:13%" /><col style="width:11%" /><col style="width:13%" />
            <col style="width:12%" /><col style="width:16%" />
          </colgroup>
          <tbody>
            <tr class="gi-head">
              <td>成色</td>
              <td>净重(g)</td>
              <td>损耗</td>
              <td>加耗重(g)</td>
              <td>折算率</td>
              <td>足金料(g)</td>
              <td>金价</td>
              <td>足金料金额</td>
            </tr>
            <tr v-for="(it, i) in goldItemList" :key="'gi' + i">
              <td class="gi-name">
                <span class="color-dot" :style="{ background: purityColorOf(it.purityId) }"></span>
                {{ it.purityName || '-' }}
              </td>
              <td>{{ fmtN(it.netWeight) }}</td>
              <td>{{ fmtN(it.lossRate) }}</td>
              <td>{{ fmtN(it.addLossWeight) }}</td>
              <td>{{ fmtN(it.foldRate) }}</td>
              <td>{{ fmtN(it.foldWeight) }}</td>
              <td>{{ fmtN(it.goldPrice) }}</td>
              <td class="money">{{ formatMoney(it.amount) }}</td>
            </tr>
            <tr class="gi-sum">
              <td>合计</td>
              <td>{{ fmtN(goldSum.netWeight) }}</td>
              <td>{{ fmtN(goldSum.lossRate) }}</td>
              <td>{{ fmtN(goldSum.addLossWeight) }}</td>
              <td>{{ fmtN(goldSum.foldRate) }}</td>
              <td>{{ fmtN(goldSum.foldWeight) }}</td>
              <td>{{ fmtN(goldSum.goldPrice) }}</td>
              <td class="money">{{ formatMoney(goldSum.amount) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="gi-tip">
          说明：损耗率为各成色分别设定，合计行损耗率与折算率由「Σ加耗 ÷ Σ净重」「Σ折足 ÷ Σ加耗」反算，不可相加。
        </div>
      </template>

      <!-- ===== 主石 ===== -->
      <div class="section-title">💎 主石信息</div>
      <table class="excel-table">
        <tbody>
          <tr>
            <td class="label-td">石重(ct)</td>
            <td class="value-td">{{ orderData?.mainStoneWeight ?? '-' }}</td>
            <td class="label-td">单价(元)</td>
            <td class="value-td money">{{ formatMoney(orderData?.mainStonePrice) }}</td>
            <td class="label-td">粒数</td>
            <td class="value-td">{{ orderData?.mainStoneQty ?? 0 }}</td>
            <td class="label-td">镶石工费</td>
            <td class="value-td money">{{ formatMoney(orderData?.mainStoneSettingFee) }}</td>
            <td class="label-td">金额</td>
            <td class="value-td money">{{ formatMoney(orderData?.mainStoneAmount) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- ===== 副石 ===== -->
      <div class="section-title">💎 副石信息</div>
      <table class="excel-table">
        <tbody>
          <tr>
            <td class="label-td">石重(ct)</td>
            <td class="value-td">{{ orderData?.subStoneWeight ?? '-' }}</td>
            <td class="label-td">单价(元)</td>
            <td class="value-td money">{{ formatMoney(orderData?.subStonePrice) }}</td>
            <td class="label-td">粒数</td>
            <td class="value-td">{{ orderData?.subStoneQty ?? 0 }}</td>
            <td class="label-td">镶石工费</td>
            <td class="value-td money">{{ formatMoney(orderData?.subStoneSettingFee) }}</td>
            <td class="label-td">金额</td>
            <td class="value-td money">{{ formatMoney(orderData?.subStoneAmount) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- ===== 其他费用 ===== -->
      <div class="section-title">📦 其他费用</div>
      <table class="excel-table">
        <tbody>
          <tr>
            <td class="label-td">包装费</td>
            <td class="value-td money">{{ formatMoney(orderData?.packingFee) }}</td>
            <td class="label-td">证书费</td>
            <td class="value-td money">{{ formatMoney(orderData?.certificateFee) }}</td>
            <td class="label-td">邮费</td>
            <td class="value-td money">{{ formatMoney(orderData?.postageFee) }}</td>
            <td class="label-td">版费</td>
            <td class="value-td money">{{ formatMoney(orderData?.moldFee) }}</td>
            <td class="label-td">工费</td>
            <td class="value-td money">{{ formatMoney(orderData?.laborFee) }}</td>
          </tr>
          <tr>
            <td class="label-td">工厂备注</td>
            <td class="value-td" colspan="9">{{ orderData?.factoryRemark || '-' }}</td>
          </tr>
          <tr class="total-row">
            <td class="label-td total-label">合计金额</td>
            <td class="value-td total-value" colspan="9">
              ¥{{ formatMoney(orderData?.totalAmount) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- ===== ⭐ 销售 / 成本对比（制作完成审核：原样带过来一起审） ===== -->
      <template v-if="showCostCompare">
        <div class="section-title">📊 销售 / 成本 对比</div>
        <div class="cost-compare-block" v-loading="costLoading">
          <CostCompareTable
            :sale="costData.sale"
            :cost="costData.cost"
            :has-cost="costData.hasCost"
            :warns="costData.warns"
            :loading="costLoading"
            hide-title
          />
        </div>
      </template>

      <!-- ===== ⭐ 成本金料明细：逐成色成本 + 利润（列与上方金料成色明细一致，末尾加利润列） ===== -->
      <template v-if="showCostGoldDetail">
        <div class="section-title">💰 成本金料明细</div>
        <table class="excel-table gi-table">
          <colgroup>
            <col style="width:13%" /><col style="width:11%" /><col style="width:9%" />
            <col style="width:11%" /><col style="width:10%" /><col style="width:11%" />
            <col style="width:10%" /><col style="width:13%" /><col style="width:12%" />
          </colgroup>
          <tbody>
            <tr class="gi-head">
              <td>成色</td>
              <td>净重(g)</td>
              <td>损耗</td>
              <td>加耗重(g)</td>
              <td>折算率</td>
              <td>足金料(g)</td>
              <td>金价</td>
              <td>足金料金额</td>
              <td>利润</td>
            </tr>
            <tr v-for="(it, i) in costGoldRows" :key="'cgi' + i">
              <td class="gi-name">
                <span class="color-dot" :style="{ background: purityColorOf(it.purityId) }"></span>
                {{ it.purityName || '-' }}
              </td>
              <template v-if="it.__hasCost">
                <td>{{ fmtN(it.netWeight) }}</td>
                <td>{{ fmtN(it.lossRate) }}</td>
                <td>{{ fmtN(it.addLossWeight) }}</td>
                <td>{{ fmtN(it.foldRate) }}</td>
                <td>{{ fmtN(it.foldWeight) }}</td>
                <td>{{ fmtN(it.goldPrice) }}</td>
                <td class="money">{{ formatMoney(it.amount) }}</td>
              </template>
              <template v-else>
                <td class="gi-none" colspan="6">成本未录入</td>
                <td class="gi-none">-</td>
              </template>
              <td class="money" :class="it.profit >= 0 ? 'p-ok' : 'p-bad'">{{ formatMoney(it.profit) }}</td>
            </tr>
            <tr class="gi-sum">
              <td>合计</td>
              <td>{{ fmtN(costGoldSum.netWeight) }}</td>
              <td>{{ fmtN(costGoldSum.lossRate) }}</td>
              <td>{{ fmtN(costGoldSum.addLossWeight) }}</td>
              <td>{{ fmtN(costGoldSum.foldRate) }}</td>
              <td>{{ fmtN(costGoldSum.foldWeight) }}</td>
              <td>{{ fmtN(costGoldSum.goldPrice) }}</td>
              <td class="money">{{ formatMoney(costGoldSum.amount) }}</td>
              <td class="money" :class="costGoldSum.profit >= 0 ? 'p-ok' : 'p-bad'">
                {{ formatMoney(costGoldSum.profit) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div class="gi-tip">
          说明：利润 = 该成色「销售足金料金额 − 成本足金料金额」，只算金料部分（不含钻石与各项费用）。<span
            v-if="!costData.hasCost">当前成本未录入，成本按与销售一致计算，故利润为 0。</span>
        </div>
      </template>

      <!-- ===== 备注 ===== -->
      <div class="section-title">📝 备注</div>
      <table class="excel-table">
        <tbody>
          <tr>
            <td class="value-td remark-cell" colspan="10">{{ orderData?.remark || '-' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- ===== 图片区 ===== -->
      <div class="section-title" v-if="hasImages">🖼️ 图片附件</div>
      <div class="image-section" v-if="hasImages">
        <div class="image-group" v-if="productImages.length">
          <div class="image-label">产品图片（{{ productImages.length }}）</div>
          <div class="image-list">
            <el-image v-for="(img, i) in productImages" :key="'p' + i" :src="img.imageUrl" fit="cover" class="preview-img"
              :preview-src-list="productImages.map(x => x.imageUrl)" :initial-index="i" preview-teleported />
          </div>
        </div>
        <div class="image-group" v-if="dataImages.length">
          <div class="image-label">数据图（{{ dataImages.length }}）</div>
          <div class="image-list">
            <el-image v-for="(img, i) in dataImages" :key="'d' + i" :src="img.imageUrl" fit="cover" class="preview-img"
              :preview-src-list="dataImages.map(x => x.imageUrl)" :initial-index="i" preview-teleported />
          </div>
        </div>
        <div class="image-group" v-if="letterImages.length || letterRefImages.length">
          <div class="image-label">
            字印图
            <span v-if="letterImages.length" style="color:#409EFF;">要求 {{ letterImages.length }}</span>
            <span v-if="letterRefImages.length" style="color:#E6A23C; margin-left:8px;">参考 {{ letterRefImages.length }}</span>
          </div>
          <div class="image-list">
            <el-image v-for="(img, i) in letterImages" :key="'l' + i" :src="img.imageUrl" fit="cover" class="preview-img letter-img"
              :preview-src-list="[...letterImages, ...letterRefImages].map(x => x.imageUrl)" :initial-index="i" preview-teleported />
            <el-image v-for="(img, i) in letterRefImages" :key="'lr' + i" :src="img.imageUrl" fit="cover" class="preview-img letter-ref-img"
              :preview-src-list="[...letterImages, ...letterRefImages].map(x => x.imageUrl)" :initial-index="letterImages.length + i" preview-teleported />
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="preview-footer">
        <template v-if="auditMode">
          <el-input
            v-model="auditRemark"
            placeholder="审核备注（驳回时建议填写原因）"
            clearable
            style="flex:1;margin-right:12px;"
          />
          <el-button @click="visible = false">关闭</el-button>
          <el-button type="danger" :loading="auditLoading" @click="submitAudit(false)">驳回</el-button>
          <el-button type="success" :loading="auditLoading" @click="submitAudit(true)">通过</el-button>
        </template>
        <el-button v-else @click="visible = false">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { getOrderDetail, getOrderCost } from '@/api/order';
import { dictApi } from '@/api/dict';
import CostCompareTable from '@/components/CostCompareTable.vue';
import { resolveGemColor } from '@/utils/color';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  orderId: { type: [Number, String], default: null },
  // ⭐ 审核模式：底部出现「驳回 / 通过」，看完明细直接审
  auditMode: { type: Boolean, default: false },
  auditLoading: { type: Boolean, default: false },
  // ⭐ 显示「销售 / 成本」对比（制作完成审核）
  showCostCompare: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'audit']);

const auditRemark = ref('');
watch(() => props.modelValue, (v) => { if (v) auditRemark.value = ''; });

const submitAudit = (approved) => {
  emit('audit', { approved, remark: auditRemark.value });
};

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const loading = ref(false);
const orderData = ref({});
const purityDict = ref([]);
// ⭐ 弹窗是否全屏（打开默认全屏，可切回普通大小）
const isFull = ref(true);

// ⭐ 销售 / 成本对比
const costLoading = ref(false);
const costData = ref({ sale: {}, cost: {}, hasCost: false, warns: [] });

const loadCost = async (orderId) => {
  if (!props.showCostCompare || !orderId) return;
  costLoading.value = true;
  try {
    const res = await getOrderCost(orderId);
    const d = res?.data || {};
    costData.value = {
      sale: d.sale || {},
      cost: d.cost || {},
      hasCost: !!d.hasCost,
      warns: d.warns || [],
    };
  } catch (e) {
    costData.value = { sale: {}, cost: {}, hasCost: false, warns: [] };
  } finally {
    costLoading.value = false;
  }
};

const onOpen = async () => {
  isFull.value = true;
  if (!props.orderId) return;
  costData.value = { sale: {}, cost: {}, hasCost: false, warns: [] };
  loading.value = true;
  try {
    const res = await getOrderDetail(props.orderId);
    orderData.value = res?.data || {};
  } catch (e) {
    orderData.value = {};
  } finally {
    loading.value = false;
  }
  loadCost(props.orderId);
};

const statusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待客户审核', type: 'warning' },
  customeraudited: { text: '待工厂接单', type: 'success' },
  factory_edit: { text: '工厂编辑中', type: 'primary' },
  accepted: { text: '已接单', type: 'primary' },
  dataConfirm: { text: '数据确认', type: 'primary' },
  waxing: { text: '出蜡', type: 'primary' },
  molded: { text: '倒模', type: 'primary' },
  cnc: { text: 'CNC', type: 'primary' },
  partsMissing: { text: '配件缺失', type: 'warning' },
  stoneReady: { text: '配石完成', type: 'primary' },
  setting: { text: '执模', type: 'primary' },
  glue: { text: '滴胶/磨石', type: 'primary' },
  inlay: { text: '镶嵌', type: 'primary' },
  assembly: { text: '组装', type: 'primary' },
  polishing: { text: '抛光', type: 'primary' },
  productionCompleted: { text: '制作完成', type: 'warning' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'info' },
  scrapped: { text: '已报废', type: 'danger' },
};
const getStatusText = (s) => statusMap[s]?.text || s || '-';
const getStatusType = (s) => statusMap[s]?.type || 'info';

const formatMoney = (v) => (v === null || v === undefined || v === '') ? '0.00' : Number(v).toFixed(2);
const formatDate = (d) => {
  if (!d) return '-';
  const dd = new Date(d);
  return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
};

const currentPurityColor = computed(() => {
  const label = (orderData.value?.color || '').trim();
  if (label && purityDict.value.length) {
    const item = purityDict.value.find(x => x.itemLabel === label);
    if (item) {
      try {
        const extra = item.extraData ? JSON.parse(item.extraData) : {};
        if (extra.color) return extra.color;
      } catch {}
    }
  }
  return '#DCDFE6';
});

// ===== ⭐ 一件货多成色：金料分色明细 =====
const fmtN = (v) => {
  const n = Number(v || 0);
  return n ? n.toFixed(2) : '0.00';
};

const purityColorOf = (purityId) => {
  if (purityId == null) return '#DCDFE6';
  const item = purityDict.value.find(x => Number(x.id) === Number(purityId));
  if (item) {
    try {
      const extra = item.extraData ? JSON.parse(item.extraData) : {};
      if (extra.color) return extra.color;
    } catch {}
  }
  return '#DCDFE6';
};

const goldItemList = computed(() =>
  (orderData.value?.goldItems || []).filter(x => Number(x.netWeight) > 0));

const isMultiGold = computed(() => goldItemList.value.length > 1);

// ===== ⭐ 成本金料明细（逐成色成本 + 利润） =====
// 成本侧分色明细来自 GET /order/cost/{id} → data.cost.goldItems
// （成本未录入时后端已按销售克隆，利润因此为 0，与「销售 / 成本 对比」口径一致）
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

const goldKeyOf = (it) => (it && it.purityId != null && it.purityId !== '')
  ? 'id:' + it.purityId
  : 'nm:' + String((it && it.purityName) || '').trim();

const costGoldList = computed(() =>
  (costData.value?.cost?.goldItems || []).filter(x => Number(x.netWeight) > 0));

// 销售按成色汇总的金料金额（算逐成色利润用）
const saleAmtByPurity = computed(() => {
  const m = new Map();
  for (const it of goldItemList.value) {
    const k = goldKeyOf(it);
    m.set(k, (m.get(k) || 0) + Number(it.amount || 0));
  }
  return m;
});

// 成本和销售成色不一致时，销售有、成本没有的成色也要列出来，避免利润漏算
const costGoldRows = computed(() => {
  const rows = [];
  const seen = new Set();
  for (const it of costGoldList.value) {
    const k = goldKeyOf(it);
    seen.add(k);
    const saleAmt = saleAmtByPurity.value.get(k) || 0;
    rows.push({ ...it, __hasCost: true, profit: r2(saleAmt - Number(it.amount || 0)) });
  }
  for (const it of goldItemList.value) {
    const k = goldKeyOf(it);
    if (seen.has(k)) continue;
    rows.push({ ...it, __hasCost: false, profit: r2(it.amount) });
  }
  return rows;
});

// 合计：率一律反算，不可相加；成本聚合只算真录了成本的成色，利润按全部成色
const costGoldSum = computed(() => {
  let netWeight = 0, addLossWeight = 0, foldWeight = 0, amount = 0, profit = 0;
  for (const it of costGoldRows.value) {
    profit += Number(it.profit || 0);
    if (!it.__hasCost) continue;
    netWeight += Number(it.netWeight || 0);
    addLossWeight += Number(it.addLossWeight || 0);
    foldWeight += Number(it.foldWeight || 0);
    amount += Number(it.amount || 0);
  }
  return {
    netWeight, addLossWeight, foldWeight, amount, profit: r2(profit),
    lossRate: netWeight ? addLossWeight / netWeight : 0,
    foldRate: addLossWeight ? foldWeight / addLossWeight : 0,
    goldPrice: foldWeight ? amount / foldWeight : 0,
  };
});

// 只有「多成色」才展开（单成色的金料数据上方「工厂数据」已有，不必重复）
const showCostGoldDetail = computed(() =>
  props.showCostCompare && costGoldRows.value.length > 0 &&
  (isMultiGold.value || costGoldList.value.length > 1));

// 合计行：率一律反算，不可相加
const goldSum = computed(() => {
  const list = goldItemList.value;
  const s = list.reduce((acc, it) => {
    acc.netWeight += Number(it.netWeight || 0);
    acc.addLossWeight += Number(it.addLossWeight || 0);
    acc.foldWeight += Number(it.foldWeight || 0);
    acc.amount += Number(it.amount || 0);
    return acc;
  }, { netWeight: 0, addLossWeight: 0, foldWeight: 0, amount: 0 });
  return {
    ...s,
    lossRate: s.netWeight ? s.addLossWeight / s.netWeight : 0,
    foldRate: s.addLossWeight ? s.foldWeight / s.addLossWeight : 0,
    goldPrice: s.foldWeight ? s.amount / s.foldWeight : 0,
  };
});

const productImages = computed(() => (orderData.value?.images || []).filter(x => x.imageType === 'product'));const dataImages = computed(() => (orderData.value?.images || []).filter(x => x.imageType === 'data'));
const letterImages = computed(() => (orderData.value?.images || []).filter(x => x.imageType === 'letter'));
const letterRefImages = computed(() => (orderData.value?.images || []).filter(x => x.imageType === 'letter_ref'));
const hasImages = computed(() =>
  productImages.value.length || dataImages.value.length ||
  letterImages.value.length || letterRefImages.value.length);

dictApi.getItemsByKey('purity').then(res => { purityDict.value = res?.data || []; }).catch(() => {});
</script>

<style scoped>
/* ⭐ 弹窗头部：标题 + 退出全屏 */
.dlg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-right: 28px;
}
.dlg-title { font-size: 16px; font-weight: 600; color: #1d2129; }
.preview-body {
  padding: 4px 8px;
}
.preview-footer { display: flex; align-items: center; justify-content: flex-end; }
.cost-compare-block { margin-bottom: 12px; }

/* ===== 顶部信息条 ===== */
.preview-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  padding: 10px 16px;
  background: #f8faff;
  border: 1px solid #e8f0fe;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 14px;
}
.header-item .label { color: #909399; }
.header-item .value { color: #303133; font-weight: 500; }

/* ===== 分区标题 ===== */
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
  margin: 12px 0 6px;
  text-align: left;
}

/* ===== ⭐ 多成色金料明细表 ===== */
.gi-table td {
  text-align: center;
  background: #fff;
}
.gi-table .gi-head td {
  background: #e8eef7;
  font-weight: 700;
  color: #1d2129;
}
.gi-table .gi-name {
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gi-table td.money {
  color: #f56c6c;
  font-weight: 600;
}
.gi-table .gi-sum td {
  background: #fff8e6;
  color: #E6A23C;
  font-weight: 700;
}
.gi-table .gi-sum td.money {
  color: #f56c6c;
}
/* 成本金料明细：利润列正绿负红（与「销售 / 成本 对比」一致），需压过 .gi-table td.money */
.gi-table td.money.p-ok,
.gi-table .gi-sum td.money.p-ok { color: #1f9254; }
.gi-table td.money.p-bad,
.gi-table .gi-sum td.money.p-bad { color: #d64545; }
.gi-table td.gi-none { color: #c0c4cc; font-size: 12px; }
.gi-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  margin: -2px 0 10px;
  text-align: left;
}

/* ===== Excel 表格：10 列 ===== */
.excel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
  margin-bottom: 8px;
}
.excel-table td {
  border: 1px solid #000;
  padding: 5px 6px;
  height: 30px;
  vertical-align: middle;
  word-break: break-all;
  overflow: hidden;
}
/* 标签列固定窄一点 */
.excel-table td.label-td {
  background: #f5f7fa;
  text-align: center;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  width: 80px;
}
.excel-table td.value-td {
  color: #303133;
  background: #fff;
  width: auto;
}
.excel-table td.value-td.money {
  color: #f56c6c;
  font-weight: 600;
}
.excel-table td.value-td.link {
  color: #409EFF;
  text-decoration: none;
}

/* ===== 合计 ===== */
.total-row .total-label {  background: #fff8e6;
  color: #E6A23C;
  font-weight: 700;
}
.total-row .total-value {
  background: #fff8e6;
  color: #f56c6c;
  font-weight: 700;
  font-size: 18px;
  text-align: right;
  padding-right: 20px;
}

/* ===== 备注 ===== */
.remark-cell {
  min-height: 60px;
  line-height: 1.6;
  white-space: pre-wrap;
}

/* ===== 成色点 ===== */
.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #dcdfe6;
  vertical-align: middle;
  margin-right: 4px;
}

/* ===== 图片区 ===== */
.image-section {
  padding: 12px 16px;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px solid #e8ecf1;
  margin-bottom: 8px;
}
.image-group {
  margin-bottom: 12px;
}
.image-group:last-child {
  margin-bottom: 0;
}
.image-label {
  font-size: 13px;
  font-weight: 500;
  color: #4e5969;
  margin-bottom: 8px;
}
.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.preview-img {
  width: 120px;
  height: 120px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #e8ecf1;
  object-fit: cover;
  background: #fafafa;
}
.letter-img {
  border: 2px solid #409EFF;
}
.letter-ref-img {
  border: 2px dashed #E6A23C;
}
</style>