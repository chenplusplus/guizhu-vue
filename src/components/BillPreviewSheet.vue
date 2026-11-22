<!-- src/components/BillPreviewSheet.vue
     出货明细表（Excel 风格）——纯展示组件，可被多个页面复用
     props:
       billData  账单头部信息（客户/成色/日期/状态/底部欠料欠款汇总）
       details   明细行数组
       showViewDetail 是否显示「查看完整详情」按钮（默认 false）
-->
<template>
  <!-- ⭐ 全屏看单：Teleport 到 body，避免被父容器（卡片 / 弹窗 / overflow）裁掉 -->
  <Teleport to="body" :disabled="!isFull">
  <div class="preview-content" :class="{ 'is-full': isFull, 'is-compact': props.compact }">
    <div class="bill-sheet" v-if="billData">
      <!-- 大标题 + 全屏看单 -->
      <div class="sheet-head">
        <div class="sheet-title">出　货　明　细　表</div>
        <div class="sheet-tools" v-if="!hideFullBtn">
          <el-button v-if="!hideFullBtn" size="small" text class="fs-btn" @click="toggleFull">
            <el-icon><Close v-if="isFull" /><FullScreen v-else /></el-icon>
            <span>{{ isFull ? '退出全屏（Esc）' : '全屏看单' }}</span>
          </el-button>
        </div>
      </div>

      <!-- 表头信息行 -->
      <!-- ⭐ 紧凑排版时单号/客户已在页面的账单标题条上，这里不再重复 -->
      <div class="sheet-meta">
        <div v-if="!props.compact" class="meta-item">
          <span class="meta-label">单号：</span>
          <span class="meta-value">{{ billData.billNo || '—' }}</span>
        </div>
        <div v-if="!props.compact" class="meta-item">
          <span class="meta-label">客户：</span>
          <span class="meta-value">{{ billData.customerName || '—' }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">成色：</span>
          <span class="meta-value">{{ colorText }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">币种：</span>
          <span class="meta-value">RMB</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">出货日期：</span>
          <span class="meta-value">{{ formatDate(billData.billDate) }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">状态：</span>
          <el-tag :type="getStatusType(billData.status)" size="small">
            {{ getStatusText(billData.status) }}
          </el-tag>
        </div>
      </div>

      <!-- ⭐ 收款录入条：直接填整单实际收款，自动按行分摊并勾选「已收款」 -->
      <div v-if="receiptMode" class="receipt-toolbar">
        <span class="rt-label">实际收款</span>
        <el-input-number
          v-if="editableReceipt"
          :model-value="totalActual"
          :controls="false"
          :precision="2"
          :min="0"
          size="small"
          class="rt-input"
          @change="onTotalChange"
        />
        <b v-else class="rt-total">¥{{ totalActual.toFixed(2) }}</b>
        <span class="rt-item">应收 <b>¥{{ fmtYuan(receivableTotal) }}</b></span>
        <span class="rt-item">抵扣 <b class="offset-text">¥{{ totalOffset.toFixed(2) }}</b></span>
        <span class="rt-item">差额 <b :class="{ warn: diffTotal > 0.001 }">¥{{ diffTotal.toFixed(2) }}</b></span>
        <span class="rt-item">
          已处理
          <b :class="{ ok: totalCount > 0 && settledCount >= totalCount }">{{ settledCount }}/{{ totalCount }}</b> 行
        </span>
        <span class="rt-spacer"></span>
        <template v-if="editableReceipt">
          <el-button size="small" @click="fillByReceivable">按应收全额</el-button>
          <el-button size="small" @click="clearReceipt">清空</el-button>
        </template>
      </div>

      <!-- 主表格 -->
      <div class="sheet-table-wrapper" ref="tableWrapRef">
        <el-table
          ref="tableRef"
          :data="tableData"
          border
          size="small"
          :max-height="isFull ? fullHeight : undefined"
          :row-class-name="rowClassName"
          :cell-style="cellStyle"
          :header-cell-style="headerCellStyle"
          :scrollbar-always-on="true"
          style="width:100%;"
          :span-method="spanMethod"
        >
          <el-table-column prop="serialNo" :label="dense ? '单号' : '流水单号'" :width="dense ? 78 : 80" align="center" show-overflow-tooltip />
          <el-table-column prop="seqNo" label="序号" :width="dense ? 24 : 50" align="center" />
          <el-table-column prop="productName" label="品名" :min-width="dense ? 50 : 130" align="center" show-overflow-tooltip />
          <el-table-column prop="customerName" label="客户" :width="dense ? 44 : 100" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="customer-red">{{ row.customerName }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="diamondLevel" :label="dense ? '级别' : '钻石级别'" :width="dense ? 41 : 80" align="center" />
          <el-table-column prop="orderDate" :label="dense ? '日期' : '订单日期'" :width="dense ? 64 : 90" align="center">
            <template #default="{ row }">{{ formatDate(row.orderDate) }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="件数" :width="dense ? 22 : 55" align="center" />
          <el-table-column prop="size" :label="dense ? '手寸' : '手寸/长度'" :width="dense ? 36 : 85" align="center" show-overflow-tooltip />
          <el-table-column prop="totalWeight" label="总重" :width="dense ? 40 : 70" align="center">
            <template #default="{ row }">{{ fmtNum(row.totalWeight) }}</template>
          </el-table-column>

          <!-- ⭐ 一件货多成色：每种成色单独一行，成色列不合并 -->
          <el-table-column label="成色" :width="dense ? 46 : 88" align="center" class-name="gi-col" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.rowType !== 'detail'"></span>
              <!-- ⭐ 老账单没有分色子表：回退到明细 color，不能只认 purityLabel -->
              <span v-else-if="row.__gi" class="gi-purity">{{ row.__gi.purityName || row.purityLabel || row.color || '-' }}</span>
              <span v-else class="gi-purity">{{ row.purityLabel || row.color || '-' }}</span>
            </template>
          </el-table-column>

          <!-- ⭐ 颜色（K黄/K白/K红）≠ 成色：排在成色之后，取值来自 orders.gemColor（color 存的是成色名） -->
          <el-table-column prop="gemColor" label="颜色" :width="dense ? 34 : 60" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="row.rowType === 'detail'" class="cell-color">{{ resolveGemColor(row) || '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="netWeight" label="净重" :width="dense ? 40 : 70" align="center" class-name="gi-col">
            <template #default="{ row }">{{ fmtNum(gv(row, 'netWeight')) }}</template>
          </el-table-column>
          <el-table-column prop="lossRate" label="损耗" :width="dense ? 30 : 60" align="center" class-name="gi-col">
            <template #default="{ row }">{{ fmtNum(gv(row, 'lossRate')) }}</template>
          </el-table-column>
          <el-table-column prop="addedWeight" :label="dense ? '加耗' : '加耗重'" :width="dense ? 40 : 70" align="center" class-name="gi-col">
            <template #default="{ row }">{{ fmtNum(gv(row, 'addedWeight')) }}</template>
          </el-table-column>
          <el-table-column prop="goldPrice" label="金价" :width="dense ? 40 : 70" align="center" class-name="gi-col">
            <template #default="{ row }">{{ fmtNum(gv(row, 'goldPrice')) }}</template>
          </el-table-column>
          <el-table-column prop="goldMaterialFee" :label="dense ? '料款' : '足金料金额'" :min-width="dense ? 50 : 80" align="center" show-overflow-tooltip class-name="gi-col">
            <template #default="{ row }">{{ fmtNum(gv(row, 'goldMaterialFee')) }}</template>
          </el-table-column>

          <!-- 足金料克重 -->
          <el-table-column
            prop="goldMaterialWeight"
            :label="dense ? '料重(g)' : '足金料(g)'"
            :width="dense ? 44 : 100"
            align="center"
            class-name="gi-col"
          >
            <template #default="{ row }">
              {{ fmtNum(gv(row, 'goldMaterialWeight'), false) }}
            </template>
          </el-table-column>

          <!-- 主石 -->
          <el-table-column label="主石" align="center">
            <el-table-column prop="mainStoneQty" label="粒数" :width="dense ? 24 : 55" align="center" />
            <el-table-column prop="mainStoneWeight" :label="dense ? '石重' : '石重(ct)'" :width="dense ? 34 : 80" align="center">
              <template #default="{ row }">{{ fmtNum(row.mainStoneWeight) }}</template>
            </el-table-column>
            <el-table-column prop="mainStonePrice" :label="dense ? '单价' : '单价(元)'" :width="dense ? 38 : 80" align="center" />
            <el-table-column prop="mainStoneAmount" :label="dense ? '金额' : '金额(元)'" :min-width="dense ? 43 : 85" align="center" show-overflow-tooltip />
            <el-table-column prop="mainStoneSettingFee" :label="dense ? '镶工' : '镶石工费'" :width="dense ? 44 : 85" align="center" />
          </el-table-column>

          <!-- 副石 -->
          <el-table-column label="副石" align="center">
            <el-table-column prop="subStoneQty" label="粒数" :width="dense ? 24 : 55" align="center" />
            <el-table-column prop="subStoneWeight" :label="dense ? '石重' : '石重(ct)'" :width="dense ? 34 : 84" align="center">
              <template #default="{ row }">{{ fmtNum(row.subStoneWeight) }}</template>
            </el-table-column>
            <el-table-column prop="subStonePrice" :label="dense ? '单价' : '单价(元)'" :width="dense ? 38 : 80" align="center" />
            <el-table-column prop="subStoneAmount" :label="dense ? '金额' : '金额(元)'" :min-width="dense ? 43 : 85" align="center" show-overflow-tooltip />
            <el-table-column prop="subStoneSettingFee" :label="dense ? '镶工' : '镶石工费'" :width="dense ? 44 : 85" align="center" />
          </el-table-column>

          <!-- 包装证书邮费 -->
          <el-table-column :label="dense ? '包装邮费' : '包装证书邮费'" :width="dense ? 46 : 105" align="center">
            <template #default="{ row }">
              {{ row.rowType === 'detail'
                ? ((row.packingFee || 0) + (row.certificateFee || 0) + (row.postageFee || 0)).toFixed(2)
                : (row.packingCertPostage || 0).toFixed(2) }}
            </template>
          </el-table-column>

          <!-- 版费 -->
          <el-table-column prop="moldFee" label="版费" :width="dense ? 32 : 65" align="center" />

          <!-- 工费 -->
          <el-table-column prop="laborFee" label="工费" :width="dense ? 32 : 70" align="center" />

          <!-- 应收金额 -->
          <el-table-column prop="totalAmount" :label="dense ? '应收' : '应收金额'" :min-width="dense ? 47 : 95" align="center" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="amount-red">{{ fmtYuan(row.totalAmount) }}</span>
            </template>
          </el-table-column>

          <!-- ⭐ 收款：实际收款（明细行可填，小计/合计行自动汇总） -->
          <el-table-column v-if="receiptMode" :label="dense ? '实收' : '实际收款'" :min-width="dense ? 51 : 112" align="center">
            <template #default="{ row }">
              <template v-if="row.rowType === 'detail'">
                <el-input
                  v-if="editableReceipt"
                  :model-value="row._actual"
                  size="small"
                  class="receipt-input"
                  placeholder="0.00"
                  @update:model-value="(v) => onActualInput(row, v)"
                />
                <span v-else class="receipt-value">
                  {{ row._actual === '' || row._actual === null || row._actual === undefined
                    ? '-'
                    : Number(row._actual).toFixed(2) }}
                </span>
              </template>
              <span v-else class="receipt-sum">{{ Number(row._receiptTotal || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>

          <!-- ⭐ 收款：已收款（勾选后自动按该行应收填入实收） -->
          <el-table-column v-if="receiptMode" :label="dense ? '已收' : '已收款'" :width="dense ? 44 : 76" align="center">
            <template #default="{ row }">
              <template v-if="row.rowType === 'detail'">
                <el-checkbox
                  v-if="editableReceipt"
                  :model-value="!!row._received"
                  @update:model-value="(v) => onReceivedToggle(row, v)"
                />
                <span v-else class="recv-flag" :class="row._received ? 'ok' : 'no'">
                  {{ row._received ? '已收' : '未收' }}
                </span>
              </template>
              <span v-else class="recv-count" :class="{ all: row._settledCount >= row._rowCount && row._rowCount > 0 }">
                {{ row._settledCount }}/{{ row._rowCount }}
              </span>
            </template>
          </el-table-column>

          <!-- ⭐ 收款：抵扣（货款已在进销存收回，勾选后该行从实际收款中剔除） -->
          <el-table-column v-if="receiptMode" label="抵扣" :min-width="dense ? 50 : 76" align="center">
            <template #default="{ row }">
              <template v-if="row.rowType === 'detail'">
                <el-checkbox
                  v-if="editableReceipt"
                  :model-value="!!row._offset"
                  @update:model-value="(v) => onOffsetToggle(row, v)"
                />
                <span v-else class="offset-flag" :class="row._offset ? 'ok' : 'no'">
                  {{ row._offset ? '抵' : '' }}
                </span>
              </template>
              <span v-else class="offset-sum">{{ Number(row._offsetTotal || 0).toFixed(2) }}</span>
            </template>
          </el-table-column>
        </el-table>

      </div>

      <!-- 底部汇总区 -->
      <div class="sheet-footer" ref="footerRef">
        <!-- 第一行：足料 -->
        <div class="footer-row">
          <div class="footer-cell">
            <span class="f-label">上单欠足料：</span>
            <span class="f-value">{{ fmtNum(billData.lastDebtMaterial) }}g</span>
          </div>
          <div class="footer-cell">
            <span class="f-label">本单应收足料：</span>
            <span class="f-value highlight">{{ fmtNum(billData.currentMaterialWeight) }}g</span>
          </div>
          <!-- ⭐ 收款/抵扣勾选的行 = 已用现金把料买下，直接在来料格里标「现金付款」，不单独占一格 -->
          <div class="footer-cell cell-material">
            <span class="f-label">来足料重：</span>
            <span class="f-value f-value-fixed">{{ fmtNum(billData.receivedMaterial) }}g</span>
            <span
              v-if="(billData.settledMaterialWeight || 0) > 0"
              class="cash-tag"
              title="本单已收款或已抵扣明细行的折足料合计，这部分金料已用现金付清"
            >现金付款 {{ fmtNum(billData.settledMaterialWeight) }}g</span>
          </div>
          <div class="footer-cell" title="累欠足金料 = 上单欠料 + 本单应收足料 − 来足料重 − 现金付款足料">
            <span class="f-label">累欠足金料：</span>
            <span class="f-value" :class="{'text-red': (billData.totalDebtMaterial || 0) > 0}">
              {{ fmtNum(billData.totalDebtMaterial) }}g
            </span>
          </div>
        </div>

        <!-- 第二行：欠款 -->
        <div class="footer-row">
          <div class="footer-cell">
            <span class="f-label">上单欠款：</span>
            <span class="f-value">¥{{ (billData.lastDebtMoney || 0).toFixed(2) }}</span>
          </div>
          <div class="footer-cell">
            <span class="f-label">本单应收款：</span>
            <span class="f-value highlight">¥{{ fmtYuan(billData.currentMoney) }}</span>
          </div>
          <div class="footer-cell cell-receive">
            <span class="f-label">来款金额：</span>
            <span class="f-value">¥{{ (billData.receivedMoney || 0).toFixed(2) }}</span>
            <!-- ⭐ 抵扣结算：来款金额只记现金实收，抵扣另标（口径同上面「现金付款」）
                 只在收款审核通过后显示，与 receivedMoney 的写回时机保持一致 -->
            <span
              v-if="billData.receiptStatus === 'approved' && (billData.receiptOffset || 0) > 0"
              class="offset-tag"
              :title="`本单收款有 ¥${Number(billData.receiptOffset || 0).toFixed(2)} 用客户来款余额抵扣，不计入实收现金；累计欠款已扣掉这部分`"
            >抵扣 ¥{{ Number(billData.receiptOffset || 0).toFixed(2) }}</span>
          </div>
          <div class="footer-cell">
            <span class="f-label">累计欠款：</span>
            <span class="f-value" :class="{'text-red': (billData.totalDebtMoney || 0) > 0}">
              ¥{{ (billData.totalDebtMoney || 0).toFixed(2) }}
            </span>
          </div>
        </div>

        <!-- 第三行：备注 -->
        <div class="footer-row" v-if="billData.remark">
          <div class="footer-cell" style="flex:4;">
            <span class="f-label">备注：</span>
            <span class="f-value">{{ billData.remark }}</span>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="preview-actions" v-if="showViewDetail || !hideClose">
        <el-button v-if="showViewDetail" type="primary" @click="emit('view-detail')">
          <el-icon><View /></el-icon> 查看完整详情
        </el-button>
        <el-button v-if="!hideClose" @click="emit('close')">关闭</el-button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue';
import { View, FullScreen, Close } from '@element-plus/icons-vue';
import { normalizeColor, resolveGemColor } from '@/utils/color';

const props = defineProps({
  billData: { type: Object, default: null },
  details: { type: Array, default: () => [] },
  showViewDetail: { type: Boolean, default: false },
  // ⭐ 页面内嵌使用时隐藏「关闭」按钮
  hideClose: { type: Boolean, default: false },
  // ⭐ 收款模式：表格末尾追加「实际收款 / 已收款」两列
  receiptMode: { type: Boolean, default: false },
  // ⭐ 收款可编辑（填写实际收款、勾选已收款）；只读审核时传 false
  editableReceipt: { type: Boolean, default: false },
  // ⭐ 紧凑排版：用于「范围内全屏对账」（父页面铺满全屏、多张单一屏排下来）
  //    只切列宽/字号，不自己定位、不自己滚动
  compact: { type: Boolean, default: false },
  // ⭐ 已经在父页面的全屏里了，隐藏单张「全屏看单」按钮
  hideFullBtn: { type: Boolean, default: false },
});

const emit = defineEmits(['view-detail', 'close', 'receipt-change']);

// ============================================================
// ⭐ 全屏看单：铺满整屏、字段紧凑、只上下滚动，方便对账
//    - Teleport 到 body，避免被卡片 / 弹窗 / overflow 裁掉
//    - 全屏时列宽切到紧凑值（见模板里的 :width="dense ? 紧凑 : 原值"）
// ============================================================
const isFull = ref(false);
// ⭐ 紧凑排版 = 单张全屏 或 父页面范围全屏；两者共用一套列宽与字号
const dense = computed(() => isFull.value || props.compact);
const tableRef = ref(null);
const tableWrapRef = ref(null);
const footerRef = ref(null);
// 全屏时给 el-table 一个确定高度：表头固定、只有表体上下滚动
const fullHeight = ref(null);

const computeFullHeight = () => {
  if (!isFull.value) { fullHeight.value = null; return; }
  const top = tableWrapRef.value?.getBoundingClientRect().top ?? 0;
  const footH = footerRef.value?.getBoundingClientRect().height ?? 0;
  fullHeight.value = Math.max(120, Math.floor(window.innerHeight - top - footH - 8));
};

const relayout = () => {
  nextTick(() => {
    computeFullHeight();
    nextTick(() => {
      tableRef.value?.doLayout?.();
      requestAnimationFrame(() => tableRef.value?.doLayout?.());
    });
  });
};

const closeFull = () => { isFull.value = false; };
const toggleFull = () => { isFull.value = !isFull.value; };

const onFullKey = (e) => {
  if (e.key !== 'Escape' || !isFull.value) return;
  // ⭐ 捕获阶段拦下：只退出全屏，别把外面的抽屉/弹窗一起关掉
  e.preventDefault();
  e.stopPropagation();
  closeFull();
};

// 全屏时窗口尺寸变化要重新算表格高度
const onWindowResize = () => { if (isFull.value) relayout(); };

watch(isFull, (v) => {
  document.body.style.overflow = v ? 'hidden' : '';
  if (v) {
    window.addEventListener('keydown', onFullKey, true);
    window.addEventListener('resize', onWindowResize);
  } else {
    window.removeEventListener('keydown', onFullKey, true);
    window.removeEventListener('resize', onWindowResize);
  }
  relayout();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onFullKey, true);
  window.removeEventListener('resize', onWindowResize);
  if (isFull.value) document.body.style.overflow = '';
});

// ============================================================
// 成色：账单表头统一写大类（一张账单可能混 14K/18K，写具体成色会误导）
//   K金 / 足金 / 银 / PT / 铜
// ============================================================
const colorText = computed(() => {
  const raw = String(props.billData?.color || '').trim();
  if (!raw) return 'K金';
  const n = normalizeColor(raw);
  if (n.includes('足金')) return '足金';
  if (n.includes('银')) return '银';
  if (n.includes('PT')) return 'PT';
  if (n.includes('铜')) return '铜';
  return 'K金';
});

// 应收金额：取整（四舍五入到元），与后端 bill_details.totalAmount 口径一致
const fmtYuan = (v) => String(Math.round(Number(v) || 0));

// ⭐ 逐行「实际应收」：退回过的行不能再按原价收
//   labor / labor_loss = 保留 工费+版费+包装证书邮费+镶石工费(粒数×单价)，损耗另收；full = 整行退掉，应收 0
//   与后端 RowReceivableSql / RecalcBillSummaryAsync / receipt 口径保持一致
const detailDue = (d) => {
  if (!d) return 0;
  if (!Number(d.isReturned)) return round2(d.totalAmount || 0);
  const t = d.returnType;
  if (t === 'labor' || t === 'labor_loss') {
    const setting =
      Number(d.mainStoneQty || 0) * Number(d.mainStoneSettingFee || 0) +
      Number(d.subStoneQty || 0) * Number(d.subStoneSettingFee || 0);
    return round2(
      Number(d.laborFee || 0) +
        Number(d.moldFee || 0) +
        Number(d.packingFee || 0) +
        Number(d.certificateFee || 0) +
        Number(d.postageFee || 0) +
        setting +
        Number(d.lossAmount || 0)
    );
  }
  return 0;
};

// 其余数值：两位小数（四舍五入），空值显示 0.00
const fmtNum = (v) => (Number(v) || 0).toFixed(2);

// ============================================================
// ⭐ 收款：行级编辑状态（以 bill_details.id 为 key）
//    不直接改 props，避免父组件重算导致输入丢失
// ============================================================
const receiptMap = ref({});

const buildFromDetails = () => {
  const m = {};
  (props.details || []).forEach((d) => {
    if (d.id == null) return;
    m[d.id] = {
      actual: d.actualReceipt === null || d.actualReceipt === undefined ? '' : Number(d.actualReceipt),
      received: !!d.isReceived,
      offset: !!d.isOffset,
      offsetAmount: d.offsetAmount === null || d.offsetAmount === undefined ? null : Number(d.offsetAmount),
    };
  });
  receiptMap.value = m;
};

watch(() => props.details, buildFromDetails, { immediate: true });

const receiptOf = (d) => receiptMap.value[d.id] || { actual: '', received: false, offset: false, offsetAmount: null };

// 填写实际收款 → 有金额自动勾选「已收款」；填了实收就代表不是抵扣
const onActualInput = (row, v) => {
  const id = row._detailId;
  if (id == null) return;
  const num = v === '' || v === null || v === undefined ? null : Number(v);
  const received = num !== null && !Number.isNaN(num) && num > 0;
  receiptMap.value = {
    ...receiptMap.value,
    [id]: { actual: v, received, offset: false, offsetAmount: null }
  };
  emitReceiptChange();
};

// 勾选「已收款」→ 自动把该行应收填入实收；取消勾选 → 清空实收
// ⭐ 实际收款跟着勾选项联动，不用一行一行手工敲金额
const onReceivedToggle = (row, v) => {
  const id = row._detailId;
  if (id == null) return;
  const cur = receiptOf({ id });
  let actual = '';
  if (v) {
    const due = round2(row.totalAmount || 0);
    actual = cur.actual === '' || cur.actual === null || cur.actual === undefined
      ? (due > 0 ? due.toFixed(2) : '')
      : cur.actual;
  }
  receiptMap.value = {
    ...receiptMap.value,
    [id]: { actual, received: !!v, offset: false, offsetAmount: null }
  };
  emitReceiptChange();
};

// 勾选「抵扣」→ 这行货款已经在进销存收回，实收清零、已收取消
const onOffsetToggle = (row, v) => {
  const id = row._detailId;
  if (id == null) return;
  const due = round2(row.totalAmount || 0);
  receiptMap.value = {
    ...receiptMap.value,
    [id]: {
      actual: '',
      received: false,
      offset: !!v,
      offsetAmount: v ? due : null,
    }
  };
  emitReceiptChange();
};

// 汇总并通知父组件
const emitReceiptChange = () => {
  const items = (props.details || []).filter(d => d.id != null).map((d) => {
    const r = receiptOf(d);
    const num = r.actual === '' || r.actual === null || r.actual === undefined ? null : Number(r.actual);
    const offset = !!r.offset;
    return {
      id: d.id,
      actualReceipt: offset || num === null || Number.isNaN(num) ? null : round2(num),
      isReceived: !!r.received && !offset,
      isOffset: offset,
      offsetAmount: offset ? round2(r.offsetAmount ?? detailDue(d)) : null,
    };
  });
  const actual = items.reduce((s, x) => s + (x.actualReceipt || 0), 0);
  const offset = items.reduce((s, x) => s + (x.offsetAmount || 0), 0);
  const receivable = (props.details || []).reduce((s, d) => s + Number(d.totalAmount || 0), 0);
  emit('receipt-change', {
    items,
    actual: round2(actual),
    offset: round2(offset),
    receivable: round2(receivable),
    receivedCount: items.filter(x => x.isReceived).length,
    offsetCount: items.filter(x => x.isOffset).length,
    settledCount: items.filter(x => x.isReceived || x.isOffset).length,
    totalCount: items.length,
  });
};

// 一键：按每行应收全额填入并全部勾选（抵扣行保持抵扣，不重复算实收）
const fillByReceivable = () => {
  const m = {};
  (props.details || []).forEach((d) => {
    if (d.id == null) return;
    const cur = receiptOf(d);
    if (cur.offset) {
      m[d.id] = { ...cur };
      return;
    }
    const amt = round2(detailDue(d));
    m[d.id] = { actual: amt > 0 ? amt.toFixed(2) : '', received: amt > 0, offset: false, offsetAmount: null };
  });
  receiptMap.value = m;
  emitReceiptChange();
};

// 清空
const clearReceipt = () => {
  const m = {};
  (props.details || []).forEach((d) => {
    if (d.id == null) return;
    m[d.id] = { actual: '', received: false, offset: false, offsetAmount: null };
  });
  receiptMap.value = m;
  emitReceiptChange();
};

// ⭐ 父页面切「范围全屏」时列宽会变，需要重新布局表格
const doLayout = () => tableRef.value?.doLayout?.();
defineExpose({ fillByReceivable, clearReceipt, emitReceiptChange, receiptMap, doLayout });

// ===== ⭐ 整单收款汇总（工具条用）=====
// 应收金额取整（与 bill_details.totalAmount 一致：明细已按元四舍五入）
const receivableTotal = computed(() =>
  Math.round((props.details || []).reduce((s, d) => s + detailDue(d), 0)));

const totalActual = computed(() =>
  round2((props.details || [])
    .filter(d => d.id != null && !receiptOf(d).offset)
    .reduce((s, d) => {
      const a = receiptOf(d).actual;
      return s + (a === '' || a === null || a === undefined ? 0 : Number(a) || 0);
    }, 0)));

const totalOffset = computed(() =>
  round2((props.details || [])
    .filter(d => d.id != null && receiptOf(d).offset)
    .reduce((s, d) => {
      const o = receiptOf(d).offsetAmount;
      return s + (o === null || o === undefined ? detailDue(d) : Number(o) || 0);
    }, 0)));

// 差额 = 应收 − 实收 − 抵扣
const diffTotal = computed(() => round2(receivableTotal.value - totalActual.value - totalOffset.value));

// 需要处理的明细行（应收为 0 的行不参与「已处理 / 共几行」的统计，与后端校验一致）
const payableRows = computed(() =>
  (props.details || []).filter(d => d.id != null && detailDue(d) > 0));

const totalCount = computed(() => payableRows.value.length);

const settledCount = computed(() =>
  payableRows.value.filter((d) => {
    const r = receiptOf(d);
    return r.received || r.offset;
  }).length);

// 填整单实收：按明细顺序分摊（跳过抵扣行，最后一行取余数），有金额的行自动勾选
const setTotalActual = (total) => {
  const list = (props.details || []).filter(d => d.id != null);
  const targets = list.filter(d => !receiptOf(d).offset);
  let remain = Math.max(0, Number(total) || 0);
  const m = { ...receiptMap.value };
  // 抵扣行保持原样
  list.filter(d => receiptOf(d).offset).forEach((d) => { m[d.id] = { ...receiptOf(d) }; });
  targets.forEach((d, i) => {
    const due = round2(detailDue(d));
    let take;
    if (i === targets.length - 1) take = remain;
    else take = Math.min(due > 0 ? due : remain, remain);
    take = round2(Math.max(0, take));
    remain = round2(remain - take);
    m[d.id] = { actual: take > 0 ? take.toFixed(2) : '', received: take > 0, offset: false, offsetAmount: null };
  });
  receiptMap.value = m;
  emitReceiptChange();
};

const onTotalChange = (v) => setTotalActual(v);

// ===== 状态映射 =====
const statusMap = {
  // 制作完成自动生成、还没提交审核
  pending: { text: '待提交', type: 'warning' },
  billPending: { text: '待审核', type: 'warning' },
  // 工厂审核通过、等待客户审核员审核
  billConfirmed: { text: '待客户审核', type: 'warning' },
  // 客户审核员已通过、等待业务员确认
  customerApproved: { text: '待业务确认', type: 'primary' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  returned: { text: '已退回', type: 'danger' },
  confirmed: { text: '已确认', type: 'success' },
  completed: { text: '已完成', type: 'success' },
};

const getStatusText = (s) => statusMap[s]?.text || s;
const getStatusType = (s) => statusMap[s]?.type || 'info';

// ===== 表格数据 =====
const tableData = computed(() => {
  const list = props.details || [];
  if (list.length === 0) return [];

  const groups = {};
  const order = [];
  list.forEach((item) => {
    const key = item.customerName || '未知客户';
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(item);
  });

  const rows = [];
  let globalSeq = 1;

  const grand = {
    quantity: 0, totalWeight: 0, netWeight: 0, addedWeight: 0, goldMaterialFee: 0,
    goldMaterialWeight: 0,
    mainStoneQty: 0, mainStoneWeight: 0, mainStoneAmount: 0, mainStoneSettingFee: 0,
    subStoneQty: 0, subStoneWeight: 0, subStoneAmount: 0, subStoneSettingFee: 0,
    packingCertPostage: 0, moldFee: 0, laborFee: 0, totalAmount: 0,
    receiptTotal: 0, offsetTotal: 0, receivedCount: 0, settledCount: 0, rowCount: 0,
  };

  order.forEach((custName) => {
    const items = groups[custName];
    const sub = {
      quantity: 0, totalWeight: 0, netWeight: 0, addedWeight: 0, goldMaterialFee: 0,
      goldMaterialWeight: 0,
      mainStoneQty: 0, mainStoneWeight: 0, mainStoneAmount: 0, mainStoneSettingFee: 0,
      subStoneQty: 0, subStoneWeight: 0, subStoneAmount: 0, subStoneSettingFee: 0,
      packingCertPostage: 0, moldFee: 0, laborFee: 0, totalAmount: 0,
      receiptTotal: 0, offsetTotal: 0, receivedCount: 0, settledCount: 0, rowCount: 0,
    };

    items.forEach((d) => {
      // ⭐ 兼容不同数据源字段名：流水单号 / 加耗重
      const added = Number(d.addedWeight ?? d.addLossWeight ?? 0);
      const serial = d.serialNo ?? d.orderNo ?? '';
      // ⭐ 收款状态
      const rec = receiptOf(d);

      // ⭐ 一件货多成色：有几种成色就展开几行，非金料列纵向合并
      const goldItems = (d.goldItems || []).filter((x) => Number(x.netWeight) > 0);
      const seq = globalSeq++;
      const baseRow = {
        ...d,
        // ⭐ 退回过的行按实际应收展示（labor/labor_loss 只留工费+损耗，full 为 0）
        totalAmount: round2(detailDue(d)),
        serialNo: serial,
        addedWeight: added,
        rowType: 'detail',
        seqNo: seq,
        _groupKey: custName,
        _detailId: d.id,
        _actual: rec.actual,
        _received: !!rec.received,
        _offset: !!rec.offset,
      };

      if (goldItems.length > 1) {
        goldItems.forEach((it, j) => {
          rows.push({
            ...baseRow,
            __gi: it,
            __gspan: goldItems.length,
            __gfirst: j === 0,
            __gidx: j,
          });
        });
      } else {
        rows.push({
          ...baseRow,
          __gi: goldItems[0] || null,
          __gspan: 1,
          __gfirst: true,
          __gidx: 0,
        });
      }

      const pcp = (d.packingFee || 0) + (d.certificateFee || 0) + (d.postageFee || 0);
      sub.quantity += Number(d.quantity || 0);
      sub.totalWeight += Number(d.totalWeight || 0);
      sub.netWeight += Number(d.netWeight || 0);
      sub.addedWeight += added;
      sub.goldMaterialFee += Number(d.goldMaterialFee || 0);
      sub.goldMaterialWeight += Number(d.goldMaterialWeight || 0);
      sub.mainStoneQty += Number(d.mainStoneQty || 0);
      sub.mainStoneWeight += Number(d.mainStoneWeight || 0);
      sub.mainStoneAmount += Number(d.mainStoneAmount || 0);
      sub.mainStoneSettingFee += Number(d.mainStoneSettingFee || 0);
      sub.subStoneQty += Number(d.subStoneQty || 0);
      sub.subStoneWeight += Number(d.subStoneWeight || 0);
      sub.subStoneAmount += Number(d.subStoneAmount || 0);
      sub.subStoneSettingFee += Number(d.subStoneSettingFee || 0);
      sub.packingCertPostage += pcp;
      sub.moldFee += Number(d.moldFee || 0);
      sub.laborFee += Number(d.laborFee || 0);
      sub.totalAmount += round2(detailDue(d));

      // ⭐ 收款累计（本客户小计）
      const ra = rec.actual === '' || rec.actual === null || rec.actual === undefined
        ? 0 : (Number(rec.actual) || 0);
      sub.receiptTotal += ra;
      if (rec.offset) {
        sub.offsetTotal += rec.offsetAmount === null || rec.offsetAmount === undefined
          ? detailDue(d) : (Number(rec.offsetAmount) || 0);
      }
      sub.rowCount += detailDue(d) > 0 ? 1 : 0;
      if (rec.received) sub.receivedCount += 1;
      if (rec.received || rec.offset) sub.settledCount += 1;
    });

    rows.push({
      rowType: 'subtotal',
      _groupKey: custName,
      productName: `${custName}：${sub.totalAmount.toFixed(2)}元`,
      customerName: '',
      quantity: sub.quantity,
      totalWeight: round3(sub.totalWeight),
      netWeight: round3(sub.netWeight),
      addedWeight: round3(sub.addedWeight),
      goldMaterialFee: round2(sub.goldMaterialFee),
      goldMaterialWeight: round3(sub.goldMaterialWeight),
      mainStoneQty: sub.mainStoneQty,
      mainStoneWeight: round3(sub.mainStoneWeight),
      mainStoneAmount: round2(sub.mainStoneAmount),
      mainStoneSettingFee: round2(sub.mainStoneSettingFee),
      subStoneQty: sub.subStoneQty,
      subStoneWeight: round3(sub.subStoneWeight),
      subStoneAmount: round2(sub.subStoneAmount),
      subStoneSettingFee: round2(sub.subStoneSettingFee),
      packingCertPostage: round2(sub.packingCertPostage),
      moldFee: round2(sub.moldFee),
      laborFee: round2(sub.laborFee),
      totalAmount: round2(sub.totalAmount),
      _receiptTotal: round2(sub.receiptTotal),
      _offsetTotal: round2(sub.offsetTotal),
      _receivedCount: sub.receivedCount,
      _settledCount: sub.settledCount,
      _rowCount: sub.rowCount,
    });

    Object.keys(grand).forEach((k) => { grand[k] += sub[k]; });
  });

  rows.push({
    rowType: 'total',
    productName: '合计：',
    customerName: '',
    quantity: grand.quantity,
    totalWeight: round3(grand.totalWeight),
    netWeight: round3(grand.netWeight),
    addedWeight: round3(grand.addedWeight),
    goldMaterialFee: round2(grand.goldMaterialFee),
    goldMaterialWeight: round3(grand.goldMaterialWeight),
    mainStoneQty: grand.mainStoneQty,
    mainStoneWeight: round3(grand.mainStoneWeight),
    mainStoneAmount: round2(grand.mainStoneAmount),
    mainStoneSettingFee: round2(grand.mainStoneSettingFee),
    subStoneQty: grand.subStoneQty,
    subStoneWeight: round3(grand.subStoneWeight),
    subStoneAmount: round2(grand.subStoneAmount),
    subStoneSettingFee: round2(grand.subStoneSettingFee),
    packingCertPostage: round2(grand.packingCertPostage),
    moldFee: round2(grand.moldFee),
    laborFee: round2(grand.laborFee),
    totalAmount: round2(grand.totalAmount),
    _receiptTotal: round2(grand.receiptTotal),
    _offsetTotal: round2(grand.offsetTotal),
    _receivedCount: grand.receivedCount,
    _settledCount: grand.settledCount,
    _rowCount: grand.rowCount,
  });

  return rows;
});

// ===== ⭐ 多成色：金料列取值（展开行取当前成色那一段，合并行回退到行汇总值）=====
const GOLD_FIELD_MAP = {
  netWeight: 'netWeight',
  lossRate: 'lossRate',
  addedWeight: 'addLossWeight',
  goldPrice: 'goldPrice',
  goldMaterialFee: 'amount',
  goldMaterialWeight: 'foldWeight',
};

const gv = (row, key) => {
  const it = row && row.__gi;
  if (!it) return row ? row[key] : 0;
  const k = GOLD_FIELD_MAP[key];
  if (!k) return row[key];
  const v = it[k];
  return v === null || v === undefined ? 0 : v;
};

// ===== 表格样式方法 =====
const rowClassName = ({ row }) => {
  if (row.rowType === 'subtotal') return 'row-subtotal';
  if (row.rowType === 'total') return 'row-total';
  return '';
};

const cellStyle = ({ row }) => {
  const base = { padding: '3px 4px', fontSize: '12px', border: '1px solid #000' };
  if (row.rowType === 'subtotal' || row.rowType === 'total') {
    return { ...base, background: '#FFFF00', color: '#FF0000', fontWeight: 'bold' };
  }
  return base;
};

const headerCellStyle = () => ({
  background: '#D9D9D9',
  color: '#000',
  fontWeight: 'bold',
  fontSize: '12px',
  padding: '4px',
  border: '1px solid #000',
  textAlign: 'center',
});

const spanMethod = ({ row, column, columnIndex }) => {
  if (row.rowType === 'subtotal' || row.rowType === 'total') {
    if (columnIndex === 2) return { rowspan: 1, colspan: 3 };
    if (columnIndex === 0 || columnIndex === 1) return { rowspan: 0, colspan: 0 };
    return { rowspan: 1, colspan: 1 };
  }

  // ⭐ 多成色：金料列（class 含 gi-col）各自一行，其余列纵向合并
  const cls = column?.className;
  if (typeof cls === 'string' && cls.split(/\s+/).includes('gi-col')) {
    return { rowspan: 1, colspan: 1 };
  }
  if (row.__gspan > 1) {
    return row.__gfirst ? { rowspan: row.__gspan, colspan: 1 } : { rowspan: 0, colspan: 0 };
  }
  return { rowspan: 1, colspan: 1 };
};

// ============================================================
// 工具函数
// ============================================================
function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function round2(v) { return Math.round(Number(v || 0) * 100) / 100; }
function round3(v) { return Math.round(Number(v || 0) * 1000) / 1000; }
</script>

<style scoped>
.preview-content {
  padding: 16px 20px 24px;
}

.bill-sheet {
  background: #fff;
}

.sheet-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.sheet-title {
  text-align: center;
  font-size: 22px;
  font-weight: bold;
  letter-spacing: 8px;
  color: #000;
  font-family: 'SimSun', '宋体', serif;
}

.sheet-tools {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
}
.fs-btn {
  font-family: 'SimSun', '宋体', serif;
  font-size: 12px;
  color: #2f6fd0;
}
.fs-btn :deep(.el-icon) { margin-right: 3px; }

.sheet-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #000;
  margin-bottom: 6px;
  padding: 0 2px;
  font-family: 'SimSun', '宋体', serif;
  flex-wrap: wrap;
  gap: 4px;
}
.meta-item {
  flex: 1;
  min-width: 100px;
}
.meta-label {
  color: #000;
}
.meta-value {
  color: #000;
  font-weight: 500;
}

.sheet-table-wrapper {
  border: 1px solid #000;
  overflow-x: auto;
}

/* ⭐ 横向滚动条：加高 + 蓝色，始终显示，让客户一眼看到能左右拉 */
.sheet-table-wrapper :deep(.el-scrollbar__bar.is-horizontal) {
  height: 14px;
  left: 0;
  right: 0;
  bottom: 0;
  background: #e8f1ff;
  border-top: 1px solid #c6dcff;
  border-radius: 0;
  opacity: 1;
}
.sheet-table-wrapper :deep(.el-scrollbar__bar.is-horizontal > div) {
  height: 100%;
  min-width: 60px;
  border-radius: 7px;
  background: #2f6fd0;
  opacity: 1;
  border: 2px solid #e8f1ff;
}
.sheet-table-wrapper :deep(.el-scrollbar__bar.is-horizontal > div:hover) {
  background: #1f5bb8;
  opacity: 1;
}
/* 滚动条占位，避免最后一行被加高的滚动条压住 */
.sheet-table-wrapper :deep(.el-table__body-wrapper .el-scrollbar__view) {
  padding-bottom: 12px;
}

/* ⭐ 收款录入条 */
.receipt-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 7px 10px;
  margin-bottom: 6px;
  background: #fffdf5;
  border: 1px dashed #e6c66b;
  border-radius: 6px;
  font-family: 'SimSun', '宋体', serif;
  font-size: 12px;
  color: #606266;
}
.rt-label { font-weight: 600; color: #303133; }
.rt-input { width: 124px; }
.rt-input :deep(.el-input__inner) { text-align: center; font-family: Consolas, Monaco, monospace; }
.rt-total { color: #c0392b; font-size: 14px; font-family: Consolas, Monaco, monospace; }
.rt-item b { color: #303133; font-family: Consolas, Monaco, monospace; }
.rt-item b.warn { color: #d64545; }
.rt-item b.ok { color: #1f9254; }
.rt-spacer { flex: 1; }

:deep(.el-table) {
  --el-table-border-color: #000;
  --el-table-header-bg-color: #D9D9D9;
  --el-table-row-hover-bg-color: #fff;
  font-family: 'SimSun', '宋体', serif;
}
:deep(.el-table table) {
  border-collapse: collapse;
}
:deep(.el-table th.el-table__cell) {
  background: #D9D9D9 !important;
  border: 1px solid #000 !important;
  color: #000 !important;
  font-weight: bold !important;
  font-size: 12px !important;
  padding: 4px !important;
}
:deep(.el-table td.el-table__cell) {
  border: 1px solid #000 !important;
  padding: 3px 4px !important;
  font-size: 12px !important;
  color: #000;
}
:deep(.el-table .cell) {
  padding: 0 !important;
  line-height: 1.4;
}
:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background: #fff !important;
}
:deep(.el-table .row-subtotal td.el-table__cell),
:deep(.el-table .row-total td.el-table__cell) {
  background: #FFFF00 !important;
  color: #FF0000 !important;
  font-weight: bold !important;
}

.customer-red {
  color: #FF0000;
  font-weight: bold;
}
.amount-red {
  color: #FF0000;
  font-weight: bold;
}

/* ===== ⭐ 一件货多成色：成色列 ===== */
.gi-purity {
  font-size: 12px;
  color: #303133;
  white-space: nowrap;
}

/* ===== ⭐ 颜色列（K黄/K白/K红）：紧凑模式列很窄，单独压字号避免截断 ===== */
.cell-color {
  font-size: 12px;
  color: #303133;
  white-space: nowrap;
}
.is-compact .cell-color {
  font-size: 9.5px;
  letter-spacing: -0.2px;
}

/* ===== ⭐ 收款两列 ===== */
.receipt-input {
  width: 100%;
}
.receipt-input :deep(.el-input__wrapper) {
  padding: 0 4px;
  box-shadow: 0 0 0 1px #c8d0da inset;
  border-radius: 3px;
  background: #fffdf5;
}
.receipt-input :deep(.el-input__inner) {
  height: 22px;
  line-height: 22px;
  font-size: 12px;
  text-align: center;
  font-family: 'SimSun', '宋体', serif;
}
.receipt-value { color: #303133; }
.receipt-sum { color: #FF0000; font-weight: bold; }
.recv-flag { display: inline-block; font-weight: bold; color: #2e9e5b; font-size: 12px; }
.recv-flag.no { color: #b0b3b8; font-weight: 400; }
.recv-count { font-size: 11px; color: #909399; }
.recv-count.all { color: #2e9e5b; font-weight: bold; }
/* ⭐ 抵扣：货款已在进销存收回，用蓝色与实收区分 */
.rt-item b.offset-text { color: #1d63c9; }
.offset-flag { display: inline-block; font-weight: bold; color: #1d63c9; font-size: 12px; }
.offset-flag.no { color: transparent; }
.offset-sum { color: #1d63c9; font-weight: bold; }
:deep(.el-table .cell .el-checkbox) { height: auto; margin-right: 0; }

.sheet-footer {
  margin-top: 0;
  border: 1px solid #000;
  border-top: none;
  font-family: 'SimSun', '宋体', serif;
  font-size: 12px;
  color: #000;
}
.footer-row {
  display: flex;
  border-bottom: 1px solid #000;
}
.footer-row:last-child {
  border-bottom: none;
}
.footer-cell {
  flex: 1;
  padding: 6px 8px;
  border-right: 1px solid #000;
  min-height: 28px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.footer-cell:last-child {
  border-right: none;
}
.f-label {
  color: #000;
  white-space: nowrap;
}
.f-value {
  color: #000;
  flex: 1;
}
.f-value.highlight {
  color: #FF0000;
  font-weight: bold;
}
.text-red {
  color: #FF0000 !important;
  font-weight: bold;
}
/* ⭐ 现金付款标记：收款/抵扣结算掉的料，跟在「来足料重」后面，不单独占格 */
.cell-material {
  flex-wrap: wrap;
  row-gap: 2px;
}
.f-value-fixed {
  flex: 0 0 auto;
}
.cash-tag {
  flex: 0 0 auto;
  margin-left: 4px;
  padding: 0 6px;
  border: 1px solid #a7dcbd;
  border-radius: 9px;
  background: #eaf7f0;
  color: #1f9254;
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}
/* ⭐ 抵扣标记：跟在「来款金额」后面，说明这笔钱不是现金到账而是余额抵扣 */
.cell-receive {
  flex-wrap: wrap;
  row-gap: 2px;
}
.offset-tag {
  flex: 0 0 auto;
  margin-left: 4px;
  padding: 0 6px;
  border: 1px solid #b9d0ef;
  border-radius: 9px;
  background: #eef4fd;
  color: #1d63c9;
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
  cursor: help;
}

.preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e8ecf1;
}

/* ==================== ⭐ 全屏看单（对账）====================
   目标：一屏放得下全部字段、不左右滚动、只上下滚动；
   做法：铺满视口 + 列宽切紧凑值（模板里 isFull 三元）+ 字号/内边距收紧 */
.preview-content.is-full {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: #fff;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.is-full .bill-sheet {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 6px 8px 0;
  box-sizing: border-box;
}
.is-full .sheet-head { flex: 0 0 auto; margin-bottom: 2px; }
.is-full .sheet-title { font-size: 15px; letter-spacing: 6px; }
.is-full .sheet-meta {
  flex: 0 0 auto;
  font-size: 12px;
  margin-bottom: 4px;
  gap: 1px 10px;
  justify-content: flex-start;
}
.is-full .meta-item { flex: 0 0 auto; min-width: 0; }
.is-full .receipt-toolbar {
  flex: 0 0 auto;
  padding: 4px 8px;
  margin-bottom: 4px;
  font-size: 11px;
  gap: 10px;
}
.is-full .sheet-table-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  /* 表格自带外框；容器再套 1px border 会让内部宽多 1px，触发多余横向滚动条 */
  border: 0;
}
/* 紧凑：表头 10px 可换行、单元格 11px、内边距压到最小 */
.is-full :deep(.el-table) { font-size: 10.5px; }
.is-full :deep(.el-table th.el-table__cell) {
  font-size: 10px !important;
  padding: 2px 1px !important;
  line-height: 1.15;
  white-space: normal;
}
.is-full :deep(.el-table td.el-table__cell) {
  font-size: 10.5px !important;
  padding: 0 2px !important;
  line-height: 1.6;
}
.is-full :deep(.el-table .cell) {
  padding: 0 1px !important;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.is-full :deep(.el-table th .cell) {
  padding: 0 !important;
  white-space: normal;
  line-height: 1.15;
}
.is-full .sheet-footer { flex: 0 0 auto; }
.is-full .footer-row { font-size: 11px; }
.is-full .footer-cell { padding: 3px 6px; min-height: 22px; }
.is-full .cash-tag { font-size: 10px; line-height: 14px; padding: 0 5px; }
.is-full .offset-tag { font-size: 10px; line-height: 14px; padding: 0 5px; }
.is-full .preview-actions { display: none; }
/* 全屏只上下滚：彻底关掉横向滚动（1px 取整也会冒出一条蓝条） */
.is-full :deep(.el-table__body-wrapper .el-scrollbar__wrap) { overflow-x: hidden !important; }
.is-full :deep(.el-scrollbar__bar.is-horizontal) { display: none !important; }
.is-full .receipt-input :deep(.el-input__inner) { height: 20px; line-height: 20px; font-size: 11px; }

/* ============ ⭐ 紧凑排版（范围全屏：多张账单一次排下来）============
   与 .is-full 共用同一套列宽/字号，区别只在：不定位、不裁高度、隐藏大标题 */
.preview-content.is-compact { padding: 0; }
.is-compact .bill-sheet { padding: 0; }
.is-compact .sheet-head { display: none; }
.is-compact .sheet-meta {
  flex-wrap: wrap;
  font-size: 11px;
  margin-bottom: 3px;
  gap: 0 8px;
}
.is-compact .meta-item { flex: 0 0 auto; min-width: 0; }
.is-compact .receipt-toolbar {
  padding: 3px 6px;
  margin-bottom: 3px;
  font-size: 11px;
  gap: 8px;
}
.is-compact .sheet-table-wrapper { border: 0; overflow: hidden; }
.is-compact :deep(.el-table) { font-size: 10.5px; }
.is-compact :deep(.el-table th.el-table__cell) {
  font-size: 10px !important;
  padding: 3px 1px !important;
  line-height: 1.2;
  white-space: normal;
}
/* 主石/副石 这类分组表头要和子表头区分开，别挤成一条线 */
.is-compact :deep(.el-table__header thead tr:first-child th:not([rowspan="2"])) {
  background: #f0f5ff;
  font-weight: 600;
  letter-spacing: 1px;
}
.is-compact :deep(.el-table td.el-table__cell) {
  font-size: 10.5px !important;
  padding: 0 2px !important;
  line-height: 1.45;
}
.is-compact :deep(.el-table .cell) {
  padding: 0 1px !important;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.is-compact :deep(.el-table th .cell) {
  padding: 0 !important;
  white-space: normal;
  line-height: 1.12;
}
.is-compact .sheet-footer { margin-top: 3px; }
.is-compact .footer-row { font-size: 10.5px; }
.is-compact .footer-cell { padding: 2px 5px; min-height: 20px; }
.is-compact .cash-tag { font-size: 9.5px; line-height: 13px; padding: 0 4px; margin-left: 3px; }
.is-compact .preview-actions { display: none; }
/* 一屏放下：横向不滚（列宽已按屏幕算好） */
.is-compact :deep(.el-table__body-wrapper .el-scrollbar__wrap) { overflow-x: hidden !important; }
.is-compact :deep(.el-scrollbar__bar.is-horizontal) { display: none !important; }
.is-compact .receipt-input :deep(.el-input__inner) { height: 20px; line-height: 20px; font-size: 11px; }

@media (max-width: 768px) {
  .preview-content { padding: 10px 8px 16px; }
  .sheet-title { font-size: 18px; letter-spacing: 4px; }
  .sheet-meta { flex-wrap: wrap; gap: 4px; }
  .meta-item { flex: 0 0 50%; }
  .footer-row { flex-wrap: wrap; }
  .footer-cell { flex: 0 0 50%; border-bottom: 1px solid #000; }
}
</style>
