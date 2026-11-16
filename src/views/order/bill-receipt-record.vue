<!-- src/views/order/bill-receipt-record.vue
     ⭐ 收款记录（客户侧）
        · 数据来源：工厂在「账单收款」录收款 → 收款审核通过 → 生成一条到账记录
        · 客户下单员 / 客户审核员看自己客户，管理员看全部
        · 未读：进页面时把「新」标出来（对比上次已读位点），随后自动标记已读
-->
<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <h2>💰 收款记录</h2>
        <span class="sub-tip">工厂收款审核通过后自动生成 · 最新到账在最上面</span>
      </div>
      <div class="header-right">
        <el-radio-group v-model="dateType" @change="onDateTypeChange">
          <el-radio-button value="month">本月</el-radio-button>
          <el-radio-button value="today">今天</el-radio-button>
          <el-radio-button value="all">全部</el-radio-button>
        </el-radio-group>
        <el-input
          v-model="keyword"
          placeholder="账单号 / 客户 / 备注"
          clearable
          style="width:200px;"
          @keyup.enter="loadData"
          @clear="loadData"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- 汇总 -->
    <div class="summary-bar">
      <div class="sum-item">
        <span class="sum-label">本月已收</span>
        <span class="sum-value actual">¥{{ money(monthActual + monthOffset) }}</span>
      </div>
      <div class="sum-item">
        <span class="sum-label">其中抵扣</span>
        <span class="sum-value offset">¥{{ money(monthOffset) }}</span>
      </div>
      <div class="sum-item">
        <span class="sum-label">本月笔数</span>
        <span class="sum-value">{{ monthCount }}</span>
      </div>
      <div class="sum-item" v-if="newCount > 0">
        <span class="sum-label">本次新到账</span>
        <span class="sum-value unread">{{ newCount }} 笔</span>
      </div>
      <div class="sum-item">
        <span class="sum-label">当前筛选</span>
        <span class="sum-value">{{ total }} 笔</span>
      </div>
    </div>

    <el-empty v-if="!loading && records.length === 0"
      description="当前范围内还没有收款记录"
      :image-size="90" />

    <el-table
      v-else
      ref="tableRef"
      :data="records"
      border
      size="small"
      class="record-table"
      :row-class-name="rowClass"
      row-key="id"
      empty-text="暂无收款记录"
      @expand-change="onExpandChange"
      :scrollbar-always-on="true"
    >
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="detail-wrap">
            <div class="detail-head">
              <span>本单收的明细（{{ row.orderCount }} 个订单）</span>
              <span class="detail-sub">
                工厂提交 {{ fmtTime(row.submittedAt) }}<template v-if="row.submittedByName"> · {{ row.submittedByName }}</template>
                <template v-if="row.auditedByName"> ｜ 审核 {{ row.auditedByName }}</template>
              </span>
            </div>
            <el-table :data="detailsOf(row)" border size="small" class="detail-table"
              :scrollbar-always-on="true"
            >
              <el-table-column prop="orderNo" label="订单号" width="150" show-overflow-tooltip />
              <el-table-column prop="productName" label="品名" min-width="140" show-overflow-tooltip />
              <el-table-column label="成色" width="70" align="center">
                <template #default="{ row }">
                  <PurityCell :label="row.purityLabel" :color="row.color" />
                </template>
              </el-table-column>
              <el-table-column label="数量" width="60" align="right">
                <template #default="{ row: d }">{{ d.quantity || 0 }}</template>
              </el-table-column>
              <el-table-column label="应收" width="100" align="right">
                <template #default="{ row: d }">¥{{ money(d.totalAmount) }}</template>
              </el-table-column>
              <el-table-column label="实收 / 抵扣" width="150" align="right">
                <template #default="{ row: d }">
                  <span v-if="d.isOffset" class="tag-offset">抵扣 ¥{{ money(d.offsetAmount) }}</span>
                  <span v-else class="tag-received">¥{{ money(d.actualReceipt) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="费用构成" min-width="260">
                <template #default="{ row: d }">
                  <span class="fee-line">{{ feeText(d) }}</span>
                </template>
              </el-table-column>
            </el-table>
            <div class="detail-foot" v-if="row.remark">备注：{{ row.remark }}</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="到账时间" width="168">
        <template #default="{ row }">
          <div class="time-cell">
            <span class="time-main">{{ fmtDate(row.receivedAt) }}</span>
            <span class="time-sub">{{ fmtClock(row.receivedAt) }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="账单" width="170">
        <template #default="{ row }">
          <div class="bill-cell">
            <span class="bill-no">{{ row.billNo }}</span>
            <el-tag v-if="isNew(row)" size="small" type="danger" effect="dark" class="new-tag">新</el-tag>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="customerName" label="客户" min-width="120" show-overflow-tooltip />

      <el-table-column label="订单" width="70" align="center">
        <template #default="{ row }">{{ row.orderCount || 0 }} 单</template>
      </el-table-column>

      <el-table-column label="应收" width="110" align="right">
        <template #default="{ row }">¥{{ money(row.receivable) }}</template>
      </el-table-column>

      <!-- ⭐ 已收 = 实收 + 抵扣：紧跟在应收后面，加粗绿色一眼看到钱到账没有 -->
      <el-table-column label="已收" width="140" align="right">
        <template #default="{ row }">
          <div class="received-cell">
            <b class="money-received">¥{{ money(receivedOf(row)) }}</b>
            <span v-if="Number(row.offsetAmount) > 0" class="received-sub">
              含抵扣 ¥{{ money(row.offsetAmount) }}
            </span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="差额" width="100" align="right">
        <template #default="{ row }">
          <span :class="{ 'money-diff': Math.abs(Number(row.diffAmount) || 0) > 0.001 }">¥{{ money(row.diffAmount) }}</span>
        </template>
      </el-table-column>

      <el-table-column label="收款方式" width="110" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.method" size="small" effect="plain">{{ row.method }}</el-tag>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="90" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="previewRow(row)">
            {{ isExpanded(row) ? '收起' : '看账单' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager" v-if="total > pageSize">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="loadData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import { getReceiptRecords, markReceiptRead } from '@/api/bill';
import PurityCell from '@/components/PurityCell.vue';

const loading = ref(false);
const tableRef = ref(null);
const expandKeys = ref([]);      // 当前展开预览的行
const records = ref([]);
const page = ref(1);
const pageSize = 20;
const total = ref(0);
const unread = ref(0);
const newCount = ref(0);       // 本次进入时的未读数（标记已读后仍保留展示）
const lastReadId = ref(0);       // 本次进入前的已读位点，用来标「新」
const monthActual = ref(0);
const monthOffset = ref(0);
const monthCount = ref(0);

const dateType = ref('month');
const keyword = ref('');
const range = ref([]);

const money = (v) => Number(v || 0).toFixed(2);

const fmtDate = (t) => (t ? String(t).slice(0, 10) : '—');
const fmtClock = (t) => (t ? String(t).replace('T', ' ').slice(11, 16) : '');
const fmtTime = (t) => (t ? String(t).replace('T', ' ').slice(0, 16) : '—');

const isNew = (row) => Number(row.id) > Number(lastReadId.value || 0);
const rowClass = ({ row }) => (isNew(row) ? 'row-new' : '');

// ⭐ 已收 = 实收 + 抵扣（客户实际收回来的钱，含以抵扣方式收回的部分）
const receivedOf = (row) => Number(row.actual || 0) + Number(row.offsetAmount || 0);

// ⭐ 看账单不跳详情页，就地展开预览（订单明细 + 费用构成）
const isExpanded = (row) => expandKeys.value.includes(row.id);
const onExpandChange = (row, expandedRows) => {
  expandKeys.value = (expandedRows || []).map(r => r.id);
};
const previewRow = (row) => {
  tableRef.value?.toggleRowExpansion(row);
};

// 明细快照（历史回填的记录也有）
const detailsOf = (row) => {
  if (!row.detailsJson) return [];
  try {
    const arr = typeof row.detailsJson === 'string' ? JSON.parse(row.detailsJson) : row.detailsJson;
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
};

// 费用构成：金料 / 主石 / 副石 / 工费 / 其他
const feeText = (d) => {
  const parts = [];
  if (Number(d.goldMaterialFee)) parts.push('金料 ' + money(d.goldMaterialFee));
  const main = Number(d.mainStoneAmount || 0) + Number(d.mainStoneSettingFee || 0);
  if (main) parts.push('主石 ' + money(main));
  const sub = Number(d.subStoneAmount || 0) + Number(d.subStoneSettingFee || 0);
  if (sub) parts.push('副石 ' + money(sub));
  if (Number(d.laborFee)) parts.push('工费 ' + money(d.laborFee));
  if (Number(d.otherFee)) parts.push('其它 ' + money(d.otherFee));
  return parts.length ? parts.join(' · ') : '—';
};

const applyRange = () => {
  const now = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  if (dateType.value === 'all') range.value = [];
  else if (dateType.value === 'today') range.value = [fmt(now), fmt(now)];
  else range.value = [fmt(new Date(now.getFullYear(), now.getMonth(), 1)), fmt(now)];
};

const onDateTypeChange = () => { page.value = 1; applyRange(); loadData(); };

const loadData = async () => {
  loading.value = true;
  try {
    const params = { page: page.value, pageSize };
    if (range.value.length === 2) {
      params.startDate = range.value[0];
      params.endDate = range.value[1];
    }
    if (keyword.value.trim()) params.keyword = keyword.value.trim();

    const res = await getReceiptRecords(params);
    records.value = res?.data || [];
    total.value = res?.total || 0;
    unread.value = res?.unread || 0;
    newCount.value = res?.unread || 0;
    lastReadId.value = res?.lastReadId || 0;
    monthActual.value = res?.monthActual || 0;
    monthOffset.value = res?.monthOffset || 0;
    monthCount.value = res?.monthCount || 0;

    // ⭐ 列表已经渲染（新标记靠上面的位点），随后清未读：铃铛与工作台卡片同步归零
    if (unread.value > 0) {
      try {
        await markReceiptRead();
        unread.value = 0;
        window.dispatchEvent(new Event('receipt-read'));
      } catch { /* 清未读失败不影响查看 */ }
    }
  } catch (e) {
    console.error('加载收款记录失败:', e);
    ElMessage.error('加载收款记录失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => { applyRange(); loadData(); });
</script>

<style scoped>
.page-container { padding: 16px; }
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px; flex-wrap: wrap; gap: 10px;
}
.header-left { display: flex; align-items: baseline; gap: 12px; }
.header-left h2 { margin: 0; font-size: 18px; }
.sub-tip { font-size: 12px; color: #909399; }
.header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.summary-bar {
  display: flex; align-items: center; gap: 28px; flex-wrap: wrap;
  background: linear-gradient(90deg, #f0f9ff 0%, #ffffff 70%);
  border: 1px solid #d9ecff; border-radius: 8px;
  padding: 12px 18px; margin-bottom: 14px;
}
.sum-item { display: flex; flex-direction: column; gap: 2px; }
.sum-label { font-size: 12px; color: #909399; }
.sum-value { font-size: 18px; font-weight: 700; color: #303133; }
.sum-value.actual { color: #1f8a4c; }
.sum-value.offset { color: #b26a00; }
.sum-value.unread { color: #f56c6c; }

.record-table { width: 100%; }
.time-cell { display: flex; flex-direction: column; line-height: 1.3; }
.time-main { font-size: 13px; color: #303133; }
.time-sub { font-size: 12px; color: #909399; }
.bill-cell { display: flex; align-items: center; gap: 6px; }
.bill-no { font-weight: 600; color: #303133; }
.new-tag { transform: scale(.9); }
/* 已收：加粗绿色，含抵扣时下面补一行小字 */
.received-cell { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.25; }
.money-received {
  color: #1f8a4c;
  font-weight: 800;
  font-size: 15px;
  letter-spacing: .2px;
}
.received-sub { font-size: 11px; color: #b26a00; font-weight: 600; }
.money-diff { color: #e6a23c; }
.muted { color: #c0c4cc; }
.tag-received { color: #1f8a4c; }
.tag-offset { color: #b26a00; }
.fee-line { font-size: 12px; color: #606266; }

/* 未读行：左侧红条 + 淡黄底，最新最显眼 */
:deep(.row-new) > td { background: #fffaf0 !important; }
:deep(.row-new) > td:first-child { box-shadow: inset 3px 0 0 #f56c6c; }

.detail-wrap { padding: 8px 14px 12px 14px; background: #fafcff; }
.detail-head {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; color: #303133; margin-bottom: 8px;
}
.detail-sub { font-size: 12px; color: #909399; }
.detail-table { width: 100%; }
.detail-foot { margin-top: 8px; font-size: 12px; color: #606266; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
