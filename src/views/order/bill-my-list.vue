<!-- src/views/order/bill-my-list.vue
     ⭐ 「生成账单 / 我的账单 / 账单收款」三合一页面（同一样式，按路由 mode 切换）
     - 生成账单（/order/bill/generate）：制作完成审核通过后自动生成的账单，
       状态为「待提交 / 待审核」，可编辑明细、可提交审核、可补齐未出账订单
     - 我的账单（/order/bill/my-list）：只显示【业务员已确认】的账单（status=confirmed 及之后），
       展示效果与出货明细预览完全一致，明细表末尾追加「实际收款 / 已收款」两列
       ⚠️ 工厂审完（billConfirmed）、客户审完待业务确认（customerApproved）都算在途，
          只在「账单状态」/「待确认账单」里出现，不进我的账单、也不进账单收款
     - 待确认账单（/order/bill/confirm）：只显示【当前角色待我处理】的账单
       （客户审核员 → billConfirmed；业务员 → customerApproved；管理员两种）
       ⭐ 默认不限日期（全部），从工作台「待确认账单」点进来立刻能看到待办，
          不会因为账单是前几天出的而筛空
     - 账单收款（?mode=receipt）：填写实际收款 → 自动勾选已收款 → 自动汇总 → 提交审核
     - 导出按天进行（当天 1 张导 xlsx，多张打包 zip）
-->
<template>
  <div class="page-container" :class="{ 'is-range-full': rangeFull }" v-loading="loading">
    <div class="page-header">
      <div class="header-left">
        <h2>{{ isGenerateMode ? '🧾 生成账单' : (isConfirmMode ? '✅ 待确认账单' : (isReceiptMode ? '💰 账单收款' : (isPaymentMode ? '💳 账单付款' : '📄 我的账单'))) }}</h2>
        <!-- ⭐ 我的账单只读：只用来对账，审核/确认/退回都在「待确认账单」里做 -->
        <span v-if="isMineMode" class="sub-tip">只读对账视图 · 不能编辑 / 审核 / 退回</span>
        <!-- ⭐ 账单付款：客户侧只读，已确认但还没付清的账单，付清后自动移出 -->
        <span v-else-if="isPaymentMode" class="sub-tip">只读 · 已确认但还没付清的账单，付清后自动移出，历史到「我的账单」查看</span>
      </div>
      <div class="header-right">
        <el-radio-group v-model="dateType" @change="onDateTypeChange">
          <el-radio-button value="today">今天</el-radio-button>
          <el-radio-button value="month">本月</el-radio-button>
          <el-radio-button value="custom">自定义</el-radio-button>
          <!-- ⭐ 全部：收款页默认用这个，跨天的未收款账单才不会漏 -->
          <el-radio-button value="all">全部</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-if="dateType === 'custom'"
          v-model="customRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width:260px;"
          @change="loadData"
        />
        <span class="range-text">{{ rangeText }}</span>
        <el-button v-if="isGenerateMode" type="warning" plain :loading="fixing" @click="handleFixMissing">
          <el-icon><MagicStick /></el-icon> 补齐未出账订单
        </el-button>
        <el-button v-if="!rangeFull" :disabled="!bills.length" @click="enterRangeFull">
          <el-icon><FullScreen /></el-icon> 全屏对账<span v-if="bills.length" class="fs-count">（{{ bills.length }} 张）</span>
        </el-button>
        <el-button v-else type="primary" plain @click="exitRangeFull">
          <el-icon><Close /></el-icon> 退出全屏（Esc）
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <el-button v-if="!isConfirmMode" type="primary" :loading="exporting" @click="handleExport">
          <el-icon><Download /></el-icon> 导出{{ selectedIds.length ? `（${selectedIds.length}）` : '' }}
        </el-button>
      </div>
    </div>

    <!-- ⭐ 搜索：订单号 / 账单号 / 产品名称 / 客户名称（后端一个 keyword 全兜） -->
    <div class="bill-search">
      <el-input
        v-model="keyword"
        placeholder="搜索订单号 / 账单号 / 产品名称 / 客户名称"
        clearable
        style="width: 340px;"
        @keyup.enter="onSearch"
        @clear="onSearch"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" plain @click="onSearch">搜索</el-button>
      <span v-if="appliedKeyword" class="search-tip">
        搜索「{{ appliedKeyword }}」<template v-if="dateType === 'all'"> · 不限日期</template>
      </span>
    </div>

    <!-- ⭐ 搜不到时给个明确交代，别让人以为是页面坏了 -->
    <div v-if="appliedKeyword && !loading && !bills.length" class="search-empty">
      没有找到匹配 <b>{{ appliedKeyword }}</b> 的账单（已按全部日期搜索，可试试更短的关键词，如单号后几位）
    </div>

    <!-- ⭐ 漏出账提醒：已完成但还没挂账单的订单 -->
    <el-alert
      v-if="isGenerateMode && missingGroups.length"
      type="warning"
      :closable="false"
      show-icon
      class="missing-alert"
    >
      <template #title>
        有 <b>{{ missingOrderCount }}</b> 个已完成订单还没生成账单（{{ missingGroups.length }} 个客户）
        <el-button type="warning" size="small" link :loading="fixing" @click="handleFixMissing" style="margin-left:8px;">
          立即补齐
        </el-button>
      </template>
    </el-alert>

    <!-- 顶部汇总 -->
    <div v-if="bills.length" class="page-summary">
      <template v-if="isGenerateMode">
        <span>共 <b>{{ bills.length }}</b> 张账单</span>
        <span>待提交 <b class="money warn">{{ statusCount('pending') }}</b> 张</span>
        <span>待审核 <b class="money info">{{ statusCount('billPending') }}</b> 张</span>
        <span v-if="statusCount('billRejected')">审核驳回 <b class="money warn">{{ statusCount('billRejected') }}</b> 张</span>
        <span>订单 <b>{{ totalOrderCount }}</b> 单</span>
        <span>金额合计 <b class="money">¥{{ totalBillAmount.toFixed(2) }}</b></span>
        <span class="summary-tip">制作完成审核通过后自动生成，编辑确认后点「提交审核」才会进入审核流程</span>
      </template>
      <!-- ⭐ 待确认账单：只统计待我处理的 -->
      <template v-else-if="isConfirmMode">
        <span v-if="userStore.isCustomerAudit || userStore.isAdmin">
          待我审核 <b class="money warn">{{ statusCount('billConfirmed') }}</b> 张
        </span>
        <span v-if="userStore.isCustomer || userStore.isAdmin">
          待我确认 <b class="money warn">{{ statusCount('customerApproved') }}</b> 张
        </span>
        <span v-if="userStore.isAdmin">合计 <b>{{ bills.length }}</b> 张</span>
        <span>应收合计 <b class="money">¥{{ totalReceivable.toFixed(2) }}</b></span>
        <span class="summary-tip">只列待你处理的账单，不受日期限制；已处理完的在「我的账单」查看</span>
      </template>
      <!-- ⭐ 账单付款：客户只看还欠多少（付款由工厂录入，这里只读） -->
      <template v-else-if="isPaymentMode">
        <span>待付款 <b class="money warn">{{ bills.length }}</b> 张账单</span>
        <span>应付合计 <b class="money">¥{{ totalReceivable.toFixed(2) }}</b></span>
        <span>已付合计 <b class="money actual">¥{{ totalPaid.toFixed(2) }}</b></span>
        <span>未付合计 <b class="money warn">¥{{ totalUnpaid.toFixed(2) }}</b></span>
        <span v-if="partialCount">部分付款 <b class="money info">{{ partialCount }}</b> 张</span>
        <span class="summary-tip">付清的账单自动移出本页；历史到「我的账单」查看</span>
      </template>
      <template v-else>
        <span>共 <b>{{ bills.length }}</b> 张账单</span>
        <!-- ⭐ 客户视角（下单员 / 审核员）：账单对他们就是「要付多少钱」，
             所以把 应付 / 已付 / 未付 提到最前面，未付做成红底标签突出 -->
        <template v-if="isCustomerView">
          <span>应付合计 <b class="money pay">¥{{ totalReceivable.toFixed(2) }}</b></span>
          <span>已付 <b class="money actual">¥{{ totalPaid.toFixed(2) }}</b></span>
          <span
            class="unpaid-pill"
            :class="{ clear: totalUnpaid <= 0.005 }"
            :title="'未付 = 应付 − 已付（已付含抵扣）；待审核 / 待确认的账单按当前金额一起算'"
          >
            未付 <b class="money unpaid">¥{{ totalUnpaid.toFixed(2) }}</b>
          </span>
          <template v-if="userStore.isCustomerAudit">
            <span>待我审核 <b class="money warn">{{ statusCount('billConfirmed') }}</b> 张</span>
            <span>待业务确认 <b class="money info">{{ statusCount('customerApproved') }}</b> 张</span>
          </template>
          <template v-else>
            <span>待我确认 <b class="money warn">{{ statusCount('customerApproved') }}</b> 张</span>
          </template>
          <span>已完成 <b class="money">{{ confirmedCount }}</b> 张</span>
          <span class="summary-tip">{{ userStore.isCustomerAudit ? '先由客户审核员审核，通过后业务员才能看到并确认' : '账单核对无误后点「确认账单」，收款由工厂录入并同步显示' }}</span>
        </template>
        <template v-else>
          <span>实收合计 <b class="money actual">¥{{ totalActual.toFixed(2) }}</b></span>
          <span>抵扣合计 <b class="money offset">¥{{ totalOffset.toFixed(2) }}</b></span>
          <span>差额 <b class="money" :class="{ warn: totalDiff !== 0 }">¥{{ totalDiff.toFixed(2) }}</b></span>
          <span>待审核收款 <b class="money">{{ pendingReceiptCount }}</b> 张</span>
        </template>
      </template>
    </div>

    <!-- ⭐ 搜索无结果时不用再叠一个空态插画（上面 .search-empty 已经说明原因） -->
    <el-empty v-if="!appliedKeyword && !loading && bills.length === 0" :image-size="90">
      <template #description>
        <div>
          {{ isGenerateMode ? '当前范围内没有待提交/待审核的账单'
            : (isConfirmMode ? '当前没有待你处理的账单，业务员确认后的账单请到「我的账单」查看'
            : (isReceiptMode ? '当前范围内没有待收款的账单（收款完成或还没确认的不在这里）'
            : (isPaymentMode ? '当前没有待付款的账单，已付清的请到「我的账单」查看'
            : '当前范围内没有业务已确认的账单'))) }}
        </div>
        <!-- ⭐ 提交审核后的账单会离开本页，这里直接指路，避免「账单不见了」的误解 -->
        <div v-if="isGenerateMode" class="empty-tip">
          已提交审核的账单会转入【账单状态】页，可在那里查看"待审核 / 待客户审核"进度
        </div>
      </template>
      <el-button v-if="isGenerateMode" type="primary" plain @click="router.push('/order/bill/list')">
        去【账单状态】查看
      </el-button>
    </el-empty>

    <!-- ⭐ 导出勾选条：默认全选当前查询结果，取消勾选的不会导出 -->
    <div v-if="bills.length && !isConfirmMode" class="export-bar">
      <el-checkbox
        :model-value="allChecked"
        :indeterminate="partChecked"
        @change="toggleAll"
      >全选</el-checkbox>
      <span class="export-count">
        已选 <b>{{ selectedIds.length }}</b> / {{ bills.length }} 张
      </span>
      <span class="export-tip">导出为一个 Excel：选中的账单从上往下排，一张接一张，中间空 3 行</span>
    </div>

    <!-- ⭐ 我的账单：按日期一天一天排下来，同一天内按客户排序（所有角色一致） -->
    <template v-for="g in dayGroups" :key="g.key">
      <div v-if="g.date" class="day-head">
        <span class="day-date">{{ g.date }}</span>
        <span class="day-week">{{ weekOf(g.date) }}</span>
        <span class="day-count">{{ g.list.length }} 张账单</span>
        <span class="day-amount">{{ isPaymentMode ? '待付' : (isCustomerView ? '应付' : '应收') }} ¥{{ dayTotal(g.list).toLocaleString() }}</span>
      </div>

      <div v-for="b in g.list" :key="b.billId" class="bill-block" :class="{ 'is-unchecked': !isChecked(b.billId) }">
      <div class="bill-caption">
        <el-checkbox
          v-if="!isConfirmMode"
          class="bill-check"
          :model-value="isChecked(b.billId)"
          @change="(v) => toggleCheck(b.billId, v)"
          @click.stop
        />
        <span class="cap-no">{{ b.billData.billNo }}</span>
        <span class="cap-item">客户：{{ b.billData.customerName || '—' }}</span>
        <span class="cap-item">销售：{{ b.billData.operatorName || '—' }}</span>
        <span class="cap-item">共 {{ (b.details || []).filter(d => d.rowType !== 'return').length }} 项</span>
        <span class="cap-spacer"></span>
        <el-tag v-if="isGenerateMode" :type="billStatusTagType(b.billData.status)" size="small" effect="light">
          {{ billStatusText(b.billData.status) }}
        </el-tag>
        <!-- ⭐ 账单付款：只显示收款进度，账单状态不在这一页出现（都是已审核通过的） -->
        <template v-if="isPaymentMode">
          <el-tag :type="settleTagType(b)" size="small" effect="dark">{{ settleText(b) }}</el-tag>
        </template>
        <template v-else-if="isCustomerView">
          <el-tag :type="billStatusTagType(b.billData.status)" size="small" effect="light">
            {{ billStatusText(b.billData.status) }}
          </el-tag>
          <!-- ⭐ 收款状态：工厂一录就同步，客户只看不改 -->
          <el-tag :type="settleTagType(b)" size="small" effect="plain">{{ settleText(b) }}</el-tag>
        </template>
        <el-tag v-else :type="receiptTagType(b)" size="small" effect="light">{{ receiptText(b) }}</el-tag>
      </div>

      <!-- ⭐ 审核驳回原因：让工厂知道为什么被驳回，改完直接重新提交 -->
      <el-alert
        v-if="isGenerateMode && b.billData.status === 'billRejected'"
        type="error"
        :closable="false"
        show-icon
        class="reject-alert"
      >
        <template #title>
          审核驳回：{{ b.billData.auditRemark || '未填写原因' }}
          <span v-if="b.billData.auditedAt" class="reject-time">
            （{{ String(b.billData.auditedAt).replace('T', ' ').slice(0, 16) }}）
          </span>
        </template>
      </el-alert>

      <BillPreviewSheet
        :ref="(el) => setSheetRef(b.billId, el)"
        :bill-data="b.billData"
        :details="b.details"
        hide-close
        :compact="rangeFull"
        :hide-full-btn="rangeFull"
        :receipt-mode="!isGenerateMode"
        :editable-receipt="isReceiptMode && !isCustomerView && canEditReceipt(b)"
        @receipt-change="(r) => onReceiptChange(b, r)"
      />

      <!-- ⭐ 生成账单：编辑 / 提交审核 -->
      <div v-if="isGenerateMode" class="receipt-bar">
        <div class="rb-left">
          <span>订单 <b>{{ b.details.length }}</b> 单</span>
          <span>件数 <b>{{ b.billData.totalQuantity || 0 }}</b></span>
          <span>金额 <b class="money">¥{{ yuan(b.billData.currentMoney || b.billData.totalAmount) }}</b></span>
          <span>足金料 <b>{{ Number(b.billData.currentMaterialWeight || 0).toFixed(2) }}g</b></span>
        </div>
        <div class="rb-right">
          <el-button size="small" @click="viewDetail(b)">查看</el-button>
          <el-button size="small" type="primary" plain
            :disabled="!canEditBill(b)"
            @click="editBill(b)">编辑</el-button>
          <el-button size="small" type="success" :loading="!!b._submitting"
            v-if="b.billData.status === 'pending'"
            @click="submitBill(b)">提交审核</el-button>
          <!-- ⭐ 审核驳回：改完可以直接重新提交，不必先进编辑页 -->
          <el-button size="small" type="danger" :loading="!!b._submitting"
            v-else-if="b.billData.status === 'billRejected'"
            @click="submitBill(b)">重新提交审核</el-button>
          <!-- ⭐ 客户申请修改退回的单（returned）：要先改再重提，不能直接提交 -->
          <el-button size="small" type="warning" plain
            v-else-if="b.billData.status === 'returned'"
            @click="editBill(b)">重新提交审核</el-button>
          <el-button size="small" type="success" disabled
            v-else-if="b.billData.status === 'billPending'">已提交审核</el-button>
        </div>
      </div>

      <!-- 我的账单：收款汇总与操作 -->
      <div v-else class="receipt-bar">
        <div class="rb-left">
          <!-- ⭐ 客户视角：应收 + 工厂同步过来的已收 / 未收 -->
          <template v-if="isCustomerView || isConfirmMode || isPaymentMode">
            <span>应收 <b>¥{{ yuan(b._receipt?.receivable) }}</b></span>
            <span>{{ isPaymentMode ? '已付' : '已收' }} <b class="actual">¥{{ (b._receipt?.actual || 0).toFixed(2) }}</b></span>
            <span>{{ isPaymentMode ? '未付' : '未收' }} <b :class="{ warn: unpaidOf(b) > 0.001 }">¥{{ unpaidOf(b).toFixed(2) }}</b></span>
            <span v-if="Number(b._receipt?.offset || 0) > 0">抵扣 <b class="offset">¥{{ (b._receipt?.offset || 0).toFixed(2) }}</b></span>
            <span>共 <b>{{ (b.details || []).filter(d => d.rowType !== 'return').length }}</b> 项</span>
          </template>
          <template v-else>
            <span>应收 <b>¥{{ yuan(b._receipt?.receivable) }}</b></span>
            <span>实收 <b class="actual">¥{{ (b._receipt?.actual || 0).toFixed(2) }}</b></span>
            <span>抵扣 <b class="offset">¥{{ (b._receipt?.offset || 0).toFixed(2) }}</b></span>
            <span>差额
              <b :class="{ warn: Math.abs(b._receipt?.diff || 0) > 0.001 }">
                ¥{{ (b._receipt?.diff || 0).toFixed(2) }}
              </b>
            </span>
            <span>已处理 <b>{{ b._receipt?.settledCount || 0 }}/{{ b._receipt?.totalCount || 0 }}</b> 行</span>
            <!-- ⭐ 客户来款余额：勾「抵扣」时就从这里扣，不够会标红提示 -->
            <span
              v-if="isReceiptMode"
              class="avail"
              :class="{ low: availableOf(b) + 0.004 < (b._receipt?.offset || 0) }"
              :title="'客户已审核通过的来款余额；本单抵扣 ¥' + (b._receipt?.offset || 0).toFixed(2) + ' 会从这里扣'"
            >
              可用来款 <b>¥{{ availableOf(b).toFixed(2) }}</b>
              <em v-if="availableOf(b) + 0.004 < (b._receipt?.offset || 0)">余额不足</em>
            </span>
          </template>
        </div>
        <div class="rb-right">
          <!-- ⭐ 只有「待确认账单」页才出现审核 / 确认 / 退回按钮；我的账单只读 -->
          <template v-if="isConfirmMode">
            <el-button v-if="canCustomerAudit(b)" size="small" type="warning"
              :loading="!!b._auditing" @click="auditOne(b)">审核通过</el-button>
            <el-button v-if="canConfirmBill(b)" size="small" type="success"
              :loading="!!b._confirming" @click="confirmOne(b)">确认账单</el-button>
            <el-button v-if="canReturnBill(b)" size="small" type="danger" plain
              @click="returnOne(b)">退回</el-button>
            <span v-if="!canCustomerAudit(b) && !canConfirmBill(b) && !canReturnBill(b)"
              class="rb-tip" :class="'tip-' + receiptStatusOf(b)">
              {{ customerTip(b) }}
            </span>
          </template>
          <!-- ⭐ 收款填写只在「账单收款」页；我的账单里不出现保存/提交 -->
          <template v-else-if="isReceiptMode && canEditReceipt(b)">
            <!-- 收款方式：客户在「收款记录」里能看到这笔是怎么收的 -->
            <el-select v-model="b._receipt.method" size="small" placeholder="收款方式" clearable
              style="width:112px;">
              <el-option v-for="m in RECEIPT_METHODS" :key="m" :label="m" :value="m" />
            </el-select>
            <el-button size="small" type="primary" :loading="!!b._saving" @click="saveOne(b)">保存收款</el-button>
            <el-button size="small" type="success" :loading="!!b._submitting" @click="submitOne(b)">提交审核</el-button>
          </template>
          <!-- ⭐ 其他情况一律只读：只显示状态提示，不提供任何操作 -->
          <template v-else>
            <span v-if="isPaymentMode" class="rb-tip" :class="'tip-' + receiptStatusOf(b)">
              {{ paymentTip(b) }}
            </span>
            <span v-else class="rb-tip" :class="'tip-' + receiptStatusOf(b)">
              {{ readonlyTip(b) }}
            </span>
            <el-button v-if="needsMyAction(b)" size="small" type="warning" plain
              @click="goConfirmPage">去处理</el-button>
          </template>
        </div>
      </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Download, MagicStick, FullScreen, Close, Search } from '@element-plus/icons-vue';
import {
  getBillList, getBillDetail,
  saveBillReceipt, submitBillReceipt,
  submitBillAudit, generateMissingBills,
  confirmBill, customerAuditBill,
  exportBills,
} from '@/api/bill';
import BillPreviewSheet from '@/components/BillPreviewSheet.vue';
import { getReceiptInBalances } from '@/api/customerReceipt';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const isReceiptMode = computed(() => route.query.mode === 'receipt' || route.name === 'BillReceipt');
// ⭐ 客户视角（下单员 / 审核员）：只能看账单 + 确认 / 申请修改，不能录收款、不能提交审核
const isCustomerView = computed(() => userStore.isCustomerType);
// ⭐ 生成账单：制作完成审核通过后自动生成、尚未审核通过的账单
const isGenerateMode = computed(() => route.name === 'BillGenerate' || route.path.endsWith('/bill/generate'));
// ⭐ 待确认账单：只显示「当前角色待我处理」的那一步，已处理的留在我的账单
const isConfirmMode = computed(() => route.name === 'BillConfirm' || route.path.endsWith('/bill/confirm'));
// ⭐ 账单付款（客户侧只读）：已确认但还没付清的账单，付清后自动移出
const isPaymentMode = computed(() => route.name === 'BillPayment' || route.path.endsWith('/bill/payment'));
// ⭐ 我的账单：纯对账视图（只读），不提供编辑 / 审核 / 确认 / 退回 / 录收款
const isMineMode = computed(() => !isGenerateMode.value && !isConfirmMode.value
  && !isReceiptMode.value && !isPaymentMode.value);

// ⭐ 「待确认账单」默认不限日期：账单可能是前几天出的，按天筛会让人以为没有待办
// ⭐ 带 range=all 进来（工作台「账单待提交」卡片）一律不限日期，保证卡片数字与页面一致
const dateType = ref(route.query.range === 'all' ? 'all'
  : isGenerateMode.value ? 'month'
  : (isConfirmMode.value || isReceiptMode.value || isPaymentMode.value) ? 'all' : 'today');
const customRange = ref([]);
const range = ref([]);           // [start, end]  YYYY-MM-DD
// ⭐ 搜索：订单号 / 账单号 / 产品名称 / 客户名称
//    - keyword 是输入框里的值，appliedKeyword 是「点过搜索」才生效的值（避免边打字边请求）
//    - 搜账单号/订单号多半是历史账，所以一搜索就自动切到「全部」，否则默认「今天」会筛空
const keyword = ref('');
const appliedKeyword = ref('');
const bills = ref([]);
// ⭐ 导出勾选：默认全选当前查询结果（改日期/搜索后会重新全选）
const selectedIds = ref([]);
const isChecked = (id) => selectedIds.value.includes(id);
const toggleCheck = (id, checked) => {
  if (checked) {
    if (!selectedIds.value.includes(id)) selectedIds.value = [...selectedIds.value, id];
  } else {
    selectedIds.value = selectedIds.value.filter(x => x !== id);
  }
};
const allChecked = computed(() =>
  bills.value.length > 0 && selectedIds.value.length === bills.value.length);
const partChecked = computed(() =>
  selectedIds.value.length > 0 && selectedIds.value.length < bills.value.length);
const toggleAll = (val) => {
  selectedIds.value = val ? bills.value.map(b => b.billId) : [];
};
const loading = ref(false);
const exporting = ref(false);
const fixing = ref(false);
// ⭐ 已完成但还没出账的订单分组（只有生成账单页用）
const missingGroups = ref([]);
const missingOrderCount = computed(() => missingGroups.value.reduce((n, g) => n + (g.orderCount || 0), 0));

// 应收金额取整（四舍五入到元），与 bill_details.totalAmount 口径一致
const yuan = (v) => String(Math.round(Number(v) || 0));

const sheetRefs = {};
const setSheetRef = (id, el) => { if (el) sheetRefs[id] = el; };

// ============================================================
// ⭐ 范围全屏对账：把「当前查询范围内的全部账单」铺满整屏排下来
//    - 不是单张全屏，而是这一范围内 N 张单一起看，只上下滚动（今天 7 张就 7 张都排下来）
//    - 表格切紧凑列宽（BillPreviewSheet compact）：品名收窄，金额列放宽保证显示完整
// ============================================================
const rangeFull = ref(false);

const relayoutSheets = () => {
  const run = () => Object.values(sheetRefs).forEach((el) => el?.doLayout?.());
  nextTick(() => {
    run();
    requestAnimationFrame(run);
  });
};

const onRangeFullKey = (e) => {
  if (e.key !== 'Escape' || !rangeFull.value) return;
  // 捕获阶段拦下：别让 Esc 顺带关掉可能的弹窗
  e.preventDefault();
  e.stopPropagation();
  exitRangeFull();
};

const onRangeResize = () => { if (rangeFull.value) relayoutSheets(); };

const enterRangeFull = () => {
  if (!bills.value.length) return;
  rangeFull.value = true;
  document.body.style.overflow = 'hidden';
  window.addEventListener('keydown', onRangeFullKey, true);
  relayoutSheets();
};

const exitRangeFull = () => {
  if (!rangeFull.value) return;
  rangeFull.value = false;
  document.body.style.overflow = '';
  window.removeEventListener('keydown', onRangeFullKey, true);
  relayoutSheets();
};

const round2 = (v) => Math.round(Number(v || 0) * 100) / 100;

const fmt = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const rangeText = computed(() => {
  if (dateType.value === 'all') return '全部账单';
  return range.value.length === 2 ? `${range.value[0]} ~ ${range.value[1]}` : '';
});

// ===== 账单状态（生成账单页用）=====
const BILL_STATUS_TEXT = {
  pending: '待提交',
  billPending: '待审核',
  billRejected: '审核驳回',
  billConfirmed: '待客户审核',
  customerApproved: '待业务确认',
  confirmed: '已确认',
  completed: '已完成',
  returned: '已退回',
  returnRequested: '退回中·待工厂处理',
  returnPending: '退回中·待审核',
};
const BILL_STATUS_TAG = {
  pending: 'warning',
  billPending: 'primary',
  billRejected: 'danger',
  billConfirmed: 'warning',
  customerApproved: 'primary',
  confirmed: 'success',
  completed: 'success',
  returned: 'danger',
  returnRequested: 'danger',
  returnPending: 'warning',
};
const billStatusText = (s) => BILL_STATUS_TEXT[s] || s || '—';
const billStatusTagType = (s) => BILL_STATUS_TAG[s] || 'info';

// ⭐ 生成账单页：pending（待提交）/ billRejected（审核驳回）可编辑；returned + modifyStatus=applied（客户申请修改）可编辑重提
const canEditBill = (b) => {
  const s = b?.billData?.status;
  if (s === 'pending' || s === 'billRejected') return true;
  if (s === 'returned' && b?.billData?.modifyStatus === 'applied') return true;
  return false;
};

const statusCount = (s) => bills.value.filter(b => b.billData?.status === s).length;
const totalOrderCount = computed(() => bills.value.reduce((n, b) => n + (b.details?.length || 0), 0));
const totalBillAmount = computed(() => round2(bills.value.reduce(
  (s, b) => s + Number(b.billData?.currentMoney || b.billData?.totalAmount || 0), 0)));

// ===== 收款状态 =====
const receiptStatusOf = (b) => (b?.billData?.receiptStatus || 'none');

// ⭐ 是否已全部收齐：收款审核已通过，且所有明细都已收款或抵扣
const isFullySettled = (b) => {
  if (receiptStatusOf(b) !== 'approved') return false;
  const rows = (b.details || []).filter(d => d.id != null && Number(d.totalAmount || 0) > 0);
  return rows.length > 0 && rows.every(d => d.isReceived || d.isOffset);
};

// 只有账单本身已审核通过才允许收款（客户审核阶段工厂已经在录，客户随时能看到）
const PAYABLE_STATUS = ['billConfirmed', 'customerApproved', 'confirmed', 'completed'];
const isBillPayable = (b) => PAYABLE_STATUS.includes(b?.billData?.status);

const RECEIPT_TEXT = {
  none: '未填写收款',
  pending: '收款待审核',
  approved: '收款已通过',
  rejected: '收款已驳回',
};
const receiptText = (b) => {
  if (!isBillPayable(b)) return '账单待审核';
  if (isFullySettled(b)) return '已全部收齐';
  return RECEIPT_TEXT[receiptStatusOf(b)] || '未填写收款';
};
const receiptTagType = (b) => {
  if (!isBillPayable(b)) return 'info';
  if (isFullySettled(b)) return 'success';
  return {
    none: 'info', pending: 'warning', approved: 'success', rejected: 'danger',
  }[receiptStatusOf(b)] || 'info';
};

// ⭐ 只有工厂方（操作员/管理员）能录收款、提交收款审核；客户只能看
const canOperateReceipt = computed(() => userStore.isFactoryOrder || userStore.isAdmin);
const canEditReceipt = (b) => canOperateReceipt.value
  && isBillPayable(b) && ['none', 'rejected'].includes(receiptStatusOf(b));

// ===== 客户视角：审核 / 确认 / 退回 =====
// ⭐ 客户侧两级：客户审核员先审（billConfirmed），业务员再确认（customerApproved）
const canCustomerAudit = (b) => (userStore.isCustomerAudit || userStore.isAdmin)
  && b?.billData?.status === 'billConfirmed'
  && b?.billData?.modifyStatus !== 'applied';
// 业务员（客户下单员）做最终确认
const canConfirmBill = (b) => (userStore.isCustomer || userStore.isAdmin)
  && b?.billData?.status === 'customerApproved';
// 退回：客户审核员退「待审核」的，业务员退「待确认」的
const canReturnBill = (b) => {
  // ⭐ 只有「待确认账单」页能退回；我的账单只读
  if (!isConfirmMode.value) return false;
  const s = b?.billData?.status;
  if (userStore.isAdmin) return s === 'billConfirmed' || s === 'customerApproved';
  if (userStore.isCustomerAudit) return s === 'billConfirmed';
  if (userStore.isCustomer) return s === 'customerApproved';
  return false;
};

// ===== 收款（客户侧只读展示）=====
// 收款方式（客户「收款记录」里展示这笔怎么收的）
const RECEIPT_METHODS = ['银行卡', '支付宝', '微信', '现金', '抵扣', '其他'];

// ⭐ 客户可用「来款余额」：账单收款勾「抵扣」时的钱就从这里扣
//    （来自款登记页登记的来款，审核通过后生效）
const customerBalances = ref({});
const loadCustomerBalances = async () => {
  if (isCustomerView.value) return;      // 客户侧不需要看工厂的来款池
  try {
    const res = await getReceiptInBalances();
    customerBalances.value = res?.data || {};
  } catch {
    customerBalances.value = {};
  }
};
const availableOf = (b) => Number(customerBalances.value?.[b?.billData?.customerId]?.balance || 0);

const unpaidOf = (b) => {
  const r = b?._receipt || {};
  return Math.max(0, round2((r.receivable || 0) - (r.actual || 0) - (r.offset || 0)));
};
const settleText = (b) => {
  const r = b?._receipt || {};
  if (Number(r.receivable || 0) <= 0.001) return '未收款';
  if (unpaidOf(b) <= 0.001) return '已收齐';
  return round2((r.actual || 0) + (r.offset || 0)) > 0.001 ? '部分收款' : '未收款';
};
const settleTagType = (b) => {
  const t = settleText(b);
  if (t === '已收齐') return 'success';
  if (t === '部分收款') return 'warning';
  return 'info';
};

// ⭐ 账单付款（客户侧只读）：只告诉客户还差多少，不提供任何操作入口
const paymentTip = (b) => {
  const s = receiptStatusOf(b);
  const r = b?._receipt || {};
  const paid = round2((r.actual || 0) + (r.offset || 0));
  const left = unpaidOf(b);
  if (s === 'pending') return '收款已提交，等待工厂审核';
  if (s === 'rejected') return '收款被驳回，等工厂重新录入';
  if (paid > 0.001) return `已付 ¥${paid.toFixed(2)}，还差 ¥${left.toFixed(2)}`;
  if (b?.billData?.status === 'customerApproved') return '账单待业务确认，工厂录入收款后会同步显示';
  return '还没付款，工厂录入收款后会同步显示';
};

const customerTip = (b) => {
  const s = b?.billData?.status;
  const ms = b?.billData?.modifyStatus;
  if (ms === 'applied') return '已申请修改，等待工厂重新核对后回传';
  if (s === 'returnRequested') return '退回中，等待工厂确认退回方式';
  if (s === 'returnPending') return '退回中，等待工厂审核';
  if (s === 'billConfirmed') {
    return userStore.isCustomerAudit ? '' : '等客户审核员审核通过后才会显示';
  }
  if (s === 'customerApproved') {
    if (userStore.isCustomerAudit) {
      const t = b?.billData?.customerAuditedAt;
      return `已审核通过${t ? '：' + String(t).replace('T', ' ').slice(0, 16) : ''}，等待业务员确认`;
    }
    return '';
  }
  if (s === 'confirmed' || s === 'completed') {
    return `已确认${b?.billData?.confirmedAt ? '：' + String(b.billData.confirmedAt).replace('T', ' ').slice(0, 16) : ''}`;
  }
  if (s === 'returned') return '账单已退回工厂';
  return '';
};

const receiptTip = (b) => {
  const s = receiptStatusOf(b);
  const d = b.billData || {};
  if (!isBillPayable(b)) return '账单待审核，暂不可收款';
  if (s === 'pending') return `已于 ${String(d.receiptSubmittedAt || '').replace('T', ' ').slice(0, 16) || '—'} 提交，等待审核`;
  if (s === 'approved') return `审核人：${d.receiptAuditedByName || '—'}　实收 ¥${Number(d.receiptActual || 0).toFixed(2)}`;
  if (s === 'rejected') return `驳回原因：${d.receiptRemark || '—'}`;
  return '';
};

// ===== 我的账单：只读提示 / 按天分组 =====
// ⭐ 我的账单里不出现任何操作；确实待我处理的，给一个跳转「待确认账单」的入口
const needsMyAction = (b) => {
  if (!isMineMode.value) return false;
  const s = b?.billData?.status;
  if (userStore.isAdmin) return s === 'billConfirmed' || s === 'customerApproved';
  if (userStore.isCustomerAudit) return s === 'billConfirmed';
  if (userStore.isCustomer) return s === 'customerApproved';
  return false;
};
const readonlyTip = (b) => {
  const s = b?.billData?.status;
  if (isCustomerView.value) {
    if (s === 'billConfirmed' && userStore.isCustomerAudit) return '待你审核，请到「待确认账单」处理';
    if (s === 'customerApproved' && userStore.isCustomer) return '待你确认，请到「待确认账单」处理';
    return customerTip(b) || '仅供对账查看，不能操作';
  }
  return receiptTip(b) || '仅供查看';
};
const goConfirmPage = () => router.push('/order/bill/confirm');

// ===== 排序与按天分组（我的账单：日期倒序 → 同一天按客户；所有角色一致） =====
const dayOf = (b) => String(b?.billData?.billDate || '').slice(0, 10);
const sortedBills = computed(() => {
  const arr = [...bills.value];
  arr.sort((x, y) => {
    const dx = dayOf(x); const dy = dayOf(y);
    if (dx !== dy) return dy.localeCompare(dx);          // 日期新的在前
    const cx = String(x.billData?.customerName || '');
    const cy = String(y.billData?.customerName || '');
    if (cx !== cy) return cx.localeCompare(cy, 'zh-Hans-CN');   // 同一天按客户
    return Number(y.billId) - Number(x.billId);
  });
  return arr;
});
const dayGroups = computed(() => {
  // ⭐ 我的账单 / 账单付款都按天分组；收款页、生成页、待确认页直接一条流水
  if (!isMineMode.value && !isPaymentMode.value) return [{ key: 'all', date: '', list: sortedBills.value }];
  const map = new Map();
  for (const b of sortedBills.value) {
    const d = dayOf(b) || '未填日期';
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(b);
  }
  return [...map.entries()].map(([date, list]) => ({ key: date, date, list }));
});
const weekOf = (d) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return '';
  const w = new Date(d + 'T00:00:00').getDay();
  return '周' + '日一二三四五六'[w];
};
const dayTotal = (list) => Math.round((list || []).reduce(
  (s, b) => s + Number(b._receipt?.receivable ?? b.billData?.currentMoney ?? b.billData?.totalAmount ?? 0), 0));

// ===== 页面汇总 =====
const totalReceivable = computed(() => Math.round(bills.value.reduce((s, b) => s + Number(b._receipt?.receivable || 0), 0)));
const totalActual = computed(() => round2(bills.value.reduce((s, b) => s + Number(b._receipt?.actual || 0), 0)));
const totalOffset = computed(() => round2(bills.value.reduce((s, b) => s + Number(b._receipt?.offset || 0), 0)));
const totalDiff = computed(() => round2(totalReceivable.value - totalActual.value - totalOffset.value));
// ⭐ 账单付款页：已付 = 实收 + 抵扣；未付 = 应付 − 已付（付清的不在本页，所以不会为负）
const totalPaid = computed(() => round2(totalActual.value + totalOffset.value));
const totalUnpaid = computed(() => Math.max(0, round2(totalReceivable.value - totalPaid.value)));
const partialCount = computed(() => bills.value.filter(b => settleText(b) === '部分收款').length);
const pendingReceiptCount = computed(() => bills.value.filter(b => receiptStatusOf(b) === 'pending').length);
// ⭐ 客户视角：已确认的账单张数
const confirmedCount = computed(() => bills.value.filter(
  b => ['confirmed', 'completed'].includes(b?.billData?.status)).length);

// ===== 区间 =====
const applyRange = () => {
  const now = new Date();
  if (dateType.value === 'all') {
    range.value = [];
  } else if (dateType.value === 'today') {
    const t = fmt(now);
    range.value = [t, t];
  } else if (dateType.value === 'month') {
    range.value = [fmt(new Date(now.getFullYear(), now.getMonth(), 1)), fmt(now)];
  } else if (customRange.value && customRange.value.length === 2) {
    range.value = [...customRange.value];
  }
};

const onDateTypeChange = () => {
  if (dateType.value === 'custom') {
    range.value = customRange.value && customRange.value.length === 2 ? [...customRange.value] : [];
    const t = fmt(new Date());
    if (!range.value.length) { customRange.value = [t, t]; range.value = [t, t]; }
  } else {
    applyRange();
  }
  loadData();
};

// ⭐ 搜索：订单号 / 账单号 / 产品名称 / 客户名称
//    - 关键词一进来就切「全部」：查账单号/订单号基本是查历史，默认「今天」会什么都查不到
//    - 清空（点 × 或删光再按回车）就回到当前日期范围的普通列表
const onSearch = () => {
  appliedKeyword.value = String(keyword.value || '').trim();
  if (appliedKeyword.value && dateType.value !== 'all') {
    dateType.value = 'all';        // radio 会同步变化，用户看得见范围被放大
    onDateTypeChange();            // 内部会 loadData
    return;
  }
  loadData();
};

// ===== 初始化收款汇总（未改动时也要有数）=====
// ⭐ 逐行「实际应收」：退回过的行不能再按原价收（整行退回 = 0；扣损退回只收工费类 + 损耗）
//    口径与 BillPreviewSheet#detailDue、后端 RowReceivableSql 一致，
//    否则整行退回的账单还会被算进「应付」，汇总就虚高了
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

const initReceiptState = (b) => {
  const details = b.details || [];
  const items = details.filter(d => d.id != null).map(d => ({
    id: d.id,
    amount: Number(d.totalAmount || 0),
    actualReceipt: d.actualReceipt === null || d.actualReceipt === undefined ? null : Number(d.actualReceipt),
    isReceived: !!d.isReceived,
    isOffset: !!d.isOffset,
    offsetAmount: d.offsetAmount === null || d.offsetAmount === undefined ? null : Number(d.offsetAmount),
  }));
  const actual = round2(items.reduce((s, x) => s + (x.isOffset ? 0 : (x.actualReceipt || 0)), 0));
  const offset = round2(items.reduce((s, x) => s + (x.isOffset ? (x.offsetAmount ?? 0) : 0), 0));
  // 应收金额取整（四舍五入到元）；退回过的行按实际应收算
  const receivable = Math.round(details.reduce((s, d) => s + detailDue(d), 0));
  const payable = items.filter(x => x.amount > 0);
  b._receipt = {
    items,
    method: b.billData?.receiptMethod || '',
    actual,
    offset,
    receivable,
    diff: round2(receivable - actual - offset),
    receivedCount: payable.filter(x => x.isReceived).length,
    offsetCount: payable.filter(x => x.isOffset).length,
    settledCount: payable.filter(x => x.isReceived || x.isOffset).length,
    totalCount: payable.length,
  };
};

const onReceiptChange = (b, r) => {
  b._receipt = { ...r, method: b._receipt?.method || '', diff: round2((r.receivable || 0) - (r.actual || 0) - (r.offset || 0)) };
};

// ⭐ 请求序号：快速切日期（今天 → 全部 …）时旧请求可能后到，
//    若无条件写回会把新结果覆盖成空列表 —— 页面看起来就"一片空白"
let loadSeq = 0;
const loadData = async () => {
  // 「全部」不传日期；其余模式必须选好区间（搜索时也一律不限日期，见 onSearch）
  const searching = !!appliedKeyword.value;
  const seq = ++loadSeq;                 // 每次发起都占一个号，旧请求回来时对不上号就作废
  if (!searching && dateType.value !== 'all' && range.value.length !== 2) {
    bills.value = []; loading.value = false; return;   // 区间没选全：清空并收掉上一个请求的转圈
  }
  loading.value = true;
  try {
    const params = {
      // ⭐ 生成账单 = 未审核通过；待确认账单 = 当前角色待我处理；账单付款 = 已确认未付清；其余 = 已审核通过
      stage: isGenerateMode.value ? 'generate'
        : (isConfirmMode.value ? 'confirm'
        : (isPaymentMode.value ? 'payable' : 'mine')),
      // ⭐ 收款页 / 账单付款只看「还没全部收齐」的账单；已付清的移到「我的账单」
      onlyUnsettled: (isReceiptMode.value || isPaymentMode.value) ? true : undefined,
      page: 1,
      pageSize: 100,
    };
    // ⭐ 关键词：账单号 / 订单号 / 产品名称 / 客户名称（后端 OR 匹配）
    if (searching) params.keyword = appliedKeyword.value;
    // ⭐ 搜索时不叠加日期，否则搜历史的单号会被默认「今天」筛空
    if (!searching && dateType.value !== 'all') {
      params.startDate = range.value[0];
      params.endDate = range.value[1];
    }
    const res = await getBillList(params);
    if (seq !== loadSeq) return;          // 已有更新的请求，丢弃这次结果
    const list = res?.data || [];
    let detailFailed = 0;
    const detailed = await Promise.all(list.map(async (b) => {
      try {
        const d = await getBillDetail(b.billId);
        const billData = { ...b, ...(d?.data || {}) };
        if (!billData.operatorName) billData.operatorName = b.operatorName;
        return { billId: b.billId, billData, details: billData.details || [] };
      } catch {
        detailFailed += 1;
        return { billId: b.billId, billData: b, details: [] };
      }
    }));
    if (seq !== loadSeq) return;          // 明细取回来时用户已经切了范围，别覆盖
    bills.value = detailed.filter(x => x.billData);
    if (!isGenerateMode.value) bills.value.forEach(initReceiptState);
    // ⭐ 收款页 / 账单付款：已全部收款/抵扣、以及 0 元账单都不显示（后端已过滤，这里再兜一层）
    if (isPaymentMode.value) {
      bills.value = bills.value.filter(b => !isFullySettled(b) && Number(b._receipt?.receivable || 0) > 0);
    } else if (isReceiptMode.value) {
      bills.value = bills.value.filter(b => !isFullySettled(b));
    }
    // ⭐ 明细没取到就别装成"空账单"，明确告诉用户可以刷新重试
    if (detailFailed > 0) {
      ElMessage.warning(`${detailFailed} 张账单明细加载失败，请点「刷新」重试`);
    }
    // ⭐ 导出默认全选本次查询结果
    selectedIds.value = bills.value.map(b => b.billId);
  } catch (e) {
    if (seq !== loadSeq) return;
    console.error('加载账单失败:', e);
    ElMessage.error('加载账单失败');
  } finally {
    if (seq === loadSeq) loading.value = false;
  }
  if (seq !== loadSeq) return;
  if (isGenerateMode.value) checkMissing();
};

// ⭐ 检查漏出账订单（只查不建，用户点「立即补齐」才真正建单）
const checkMissing = async () => {
  try {
    const r = await generateMissingBills({ dryRun: true });
    const d = r?.data || r || {};
    missingGroups.value = d.pending || [];
  } catch {
    missingGroups.value = [];
  }
};

// ===== 生成账单页：编辑 / 提交审核 / 补齐未出账订单 =====
const viewDetail = (b) => router.push(`/order/bill/detail/${b.billId}`);

const editBill = (b) => {
  // ⭐ 带上 from=generate，编辑页保存/提交后回到生成账单列表
  router.push(`/order/bill/edit/${b.billId}?from=generate`);
};

const submitBill = async (b) => {
  try {
    await ElMessageBox.confirm(
      `确认提交账单 ${b.billData.billNo} 审核？提交后不可再编辑，需工厂审核员审核。`,
      '提交账单审核',
      { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '取消' }
    );
  } catch { return; }

  b._submitting = true;
  try {
    const res = await submitBillAudit(b.billId);
    if (res?.success === false) {
      ElMessage.error(res.message || '提交失败');
    } else {
      ElMessage.success('已提交审核');
      await loadData();
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e?.message || '提交失败');
  } finally {
    b._submitting = false;
  }
};

const handleFixMissing = async () => {
  fixing.value = true;
  try {
    const pre = await generateMissingBills({ dryRun: true });
    const pending = pre?.data?.pending || pre?.pending || [];
    if (!pending.length) {
      ElMessage.success('没有漏出账的订单，全部已完成订单都已生成账单');
      return;
    }
    const line = pending
      .map(p => `${p.customerName || ('客户#' + p.customerId)}：${p.orderCount} 单`)
      .join('\n');
    try {
      await ElMessageBox.confirm(
        `以下已完成订单还没有生成账单：\n\n${line}\n\n将按客户各生成一张账单（状态=待提交）。确定补齐？`,
        '补齐未出账订单',
        { type: 'warning', confirmButtonText: '确定补齐', cancelButtonText: '取消' }
      );
    } catch { return; }

    const r = await generateMissingBills();
    const data = r?.data || r || {};
    const created = data.created || [];
    if (created.length) {
      ElMessage.success(`已补齐 ${created.length} 张账单：${created.map(x => x.billNo).join('、')}`);
    } else {
      ElMessage.warning(data.message || '没有生成新账单');
    }
    await loadData();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e?.message || '补齐失败');
  } finally {
    fixing.value = false;
  }
};

// ===== 收款操作（表格上方的工具条负责填写，这里只负责落库/提交）=====
const doSave = async (b, silent = false) => {
  if (!b._receipt) return false;
  b._saving = true;
  try {
    const res = await saveBillReceipt(b.billId, { items: b._receipt.items, method: b._receipt.method || null });
    if (!res.success) { ElMessage.error(res.message || '保存失败'); return false; }
    const d = res.data || {};
    b.billData.receiptStatus = d.receiptStatus || b.billData.receiptStatus;
    b.billData.receiptReceivable = d.receivable;
    b.billData.receiptActual = d.actual;
    b.billData.receiptOffset = d.offset;
    b.billData.receiptMethod = b._receipt.method || b.billData.receiptMethod;
    if (!silent) ElMessage.success('收款已保存');
    return true;
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e.message || '保存失败');
    return false;
  } finally {
    b._saving = false;
  }
};

const saveOne = async (b) => {
  await doSave(b);
  await loadData();
};

const submitOne = async (b) => {
  const r = b._receipt || {};
  if ((!r.actual || r.actual <= 0) && (!r.offset || r.offset <= 0)) {
    ElMessage.warning('请先填写实际收款金额，或勾选抵扣');
    return;
  }
  if ((r.settledCount || 0) < (r.totalCount || 0)) {
    ElMessage.warning(`还有 ${r.totalCount - r.settledCount} 行未收款也未抵扣，请先处理`);
    return;
  }
  try {
    await ElMessageBox.confirm(
      `本单应收 ¥${(r.receivable || 0).toFixed(2)}，实收 ¥${(r.actual || 0).toFixed(2)}，抵扣 ¥${(r.offset || 0).toFixed(2)}，提交后需审核员审核，期间不可修改。确认提交？`,
      '提交收款审核',
      { type: 'warning', confirmButtonText: '确认提交', cancelButtonText: '取消' }
    );
  } catch { return; }

  const saved = await doSave(b, true);
  if (!saved) return;

  b._submitting = true;
  try {
    const res = await submitBillReceipt(b.billId);
    if (res.success) {
      ElMessage.success('收款已提交审核');
      await loadData();
    } else {
      ElMessage.error(res.message || '提交失败');
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e.message || '提交失败');
    await loadData();
  } finally {
    b._submitting = false;
  }
};

// ===== 客户视角：审核 / 确认 / 退回 =====
// ⭐ 客户审核员：审核通过 → customerApproved，此时业务员才能看到
const auditOne = async (b) => {
  const d = b.billData || {};
  try {
    await ElMessageBox.confirm(
      `账单 ${d.billNo || ''}　客户：${d.customerName || '—'}　应收 ¥${Number(d.currentMoney || d.totalAmount || 0).toFixed(2)}\n审核通过后业务员才能看到账单并确认；核对有问题请点「退回」。`,
      '审核账单',
      { type: 'info', confirmButtonText: '审核通过', cancelButtonText: '再看看' }
    );
  } catch { return; }

  b._auditing = true;
  try {
    const res = await customerAuditBill(b.billId);
    if (res?.success === false) {
      ElMessage.error(res.message || '审核失败');
    } else {
      ElMessage.success(res?.message || '已审核通过，等待业务员确认');
      await loadData();
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e?.message || '审核失败');
  } finally {
    b._auditing = false;
  }
};

const confirmOne = async (b) => {
  const d = b.billData || {};
  try {
    await ElMessageBox.confirm(
      `账单 ${d.billNo || ''}　客户：${d.customerName || '—'}　应收 ¥${Number(d.currentMoney || d.totalAmount || 0).toFixed(2)}\n确认后这笔账单流程结束，不可撤销。`,
      '确认账单',
      { type: 'info', confirmButtonText: '确认无误', cancelButtonText: '再看看' }
    );
  } catch { return; }

  b._confirming = true;
  try {
    const res = await confirmBill(b.billId);
    if (res.success) {
      // ⭐ LR 在账单最终确认时由后端自动生成，这里明确告知，避免业务员以为还要手动生成
      ElMessage.success((res.message || '账单已确认') + '，LR 表已自动生成');
      await loadData();
    } else {
      ElMessage.error(res.message || '确认失败');
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || e?.message || '确认失败');
  } finally {
    b._confirming = false;
  }
};

// ⭐ 退回：进账单详情里勾明细、写说明（退回方式由工厂定）
const returnOne = (b) => {
  router.push({ name: 'BillDetail', params: { id: b.billId }, query: { return: '1' } });
};

// ===== 导出：选中的账单合并成一个 Excel，一张接一张往下排 =====
const handleExport = async () => {
  // 默认全选；用户取消勾选后只导勾上的
  const ids = selectedIds.value.length
    ? selectedIds.value
    : bills.value.map(b => b.billId);

  if (!ids.length) { ElMessage.warning('当前范围内没有可导出的账单'); return; }
  if (ids.length > 200) { ElMessage.warning('一次最多导出 200 张，请缩小日期范围或取消部分勾选'); return; }

  exporting.value = true;
  try {
    const blob = await exportBills(ids);
    // 后端报错时返回的是 JSON 而不是文件
    if (blob?.type && blob.type.includes('application/json')) {
      const text = await blob.text();
      let msg = '导出失败';
      try { msg = JSON.parse(text)?.message || msg; } catch { /* 忽略 */ }
      ElMessage.error(msg);
      return;
    }
    if (blob?.success === false) { ElMessage.error(blob.message || '导出失败'); return; }

    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    const name = ids.length === 1
      ? `账单_${bills.value.find(b => b.billId === ids[0])?.billData?.billNo || ids[0]}.xlsx`
      : `账单汇总_${stamp}_${ids.length}张.xlsx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);

    ElMessage.success(`已导出 ${ids.length} 张账单（同一个 Excel，从上往下排）`);
  } catch (e) {
    // 请求层（utils/request）已统一弹过中文错误提示，这里只记日志，避免重复弹窗
    console.error('导出账单失败:', e);
  } finally {
    exporting.value = false;
  }
};

onMounted(() => {
  applyRange();
  loadData();
  loadCustomerBalances();
  window.addEventListener('resize', onRangeResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onRangeResize);
  window.removeEventListener('keydown', onRangeFullKey, true);
  if (rangeFull.value) document.body.style.overflow = '';
});
</script>

<style scoped>
.page-container { padding: 16px; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}
.page-header h2 { margin: 0; font-size: 18px; color: #303133; }
.header-left { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.sub-tip { font-size: 12px; color: #909399; }

/* ⭐ 我的账单：按天分组的日期条 */
.day-head {
  display: flex; align-items: center; gap: 12px;
  margin: 14px 0 8px; padding: 7px 12px;
  background: linear-gradient(90deg, #eaf2ff 0%, #f7faff 70%, #fff 100%);
  border-left: 4px solid #409eff; border-radius: 4px;
  font-size: 13px; color: #606266;
}
.day-head .day-date {
  font-size: 15px; font-weight: 700; color: #1f2d3d;
  font-family: Consolas, Monaco, monospace;
}
.day-head .day-week { font-size: 12px; color: #7a8ba3; }
.day-head .day-count { font-size: 12px; color: #606266; }
.day-head .day-amount {
  margin-left: auto; font-size: 13px; font-weight: 600; color: #c0392b;
  font-family: Consolas, Monaco, monospace;
}
.header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.range-text { font-size: 12px; color: #909399; }
.missing-alert { margin-bottom: 12px; }

/* ⭐ 搜索条：订单号 / 账单号 / 产品名称 / 客户名称 */
.bill-search { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.bill-search .search-tip { font-size: 12px; color: #909399; }
.bill-search .search-tip b { color: #303133; }
.search-empty {
  font-size: 13px; color: #909399; background: #fafafa;
  border: 1px dashed #e4e7ed; border-radius: 8px;
  padding: 14px 16px; margin-bottom: 12px; text-align: center;
}
.search-empty b { color: #303133; }

.page-summary {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  background: #f7f9fc; border: 1px solid #ebeef5; border-radius: 8px;
  padding: 10px 14px; margin-bottom: 12px; font-size: 13px; color: #606266;
}
.page-summary b { color: #303133; }
.page-summary .money { color: #c0392b; font-family: Consolas, Monaco, monospace; }
.page-summary .money.actual { color: #1f9254; }
.page-summary .money.offset { color: #1d63c9; }
.page-summary .money.warn { color: #d64545; }
.page-summary .money.info { color: #1a6fd4; }
/* ⭐ 客户视角：应付 / 已付 / 未付，未付最突出 */
.page-summary .money.pay { color: #a83232; }
.page-summary .unpaid-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 10px; background: #fff2f0;
  border: 1px solid #f5c2be; border-radius: 999px;
  font-size: 12px; color: #b23a35;
}
.page-summary .money.unpaid { color: #d64545; font-size: 16px; }
/* 已经付清：标签转绿，不要再用红色吓人 */
.page-summary .unpaid-pill.clear { background: #f0f9eb; border-color: #c2e7b0; color: #5a7d34; }
.page-summary .unpaid-pill.clear .money.unpaid { color: #1f9254; }
.summary-tip { margin-left: auto; font-size: 12px; color: #909399; }

/* 审核驳回原因 */
.reject-alert { margin: 0 0 8px; }
.reject-alert .reject-time { color: #909399; font-weight: 400; }

.bill-block {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 10px 12px 14px;
  margin-bottom: 14px;
}
.bill-caption {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 4px 6px 10px;
  border-bottom: 1px dashed #ebeef5;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}
.cap-no { font-weight: 600; color: #303133; font-family: Consolas, Monaco, monospace; }
.cap-item { color: #909399; }
.cap-spacer { flex: 1; }

/* ⭐ 导出勾选 */
.export-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin: 0 0 12px;
  padding: 8px 12px;
  background: #f7f9fc;
  border: 1px solid #e4e9f2;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
}
.export-count b { color: #303133; font-family: Consolas, Monaco, monospace; }
.export-tip { color: #a0a6b0; font-size: 12px; }
.bill-check { margin-right: -4px; }
/* 未勾选的账单淡一点，一眼看出不导出 */
.bill-block.is-unchecked { opacity: .55; }
.bill-block.is-unchecked:hover { opacity: .8; }

/* ===== 收款操作条 ===== */
.receipt-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap;
  margin-top: 10px; padding: 9px 12px;
  background: #fafbfd; border: 1px solid #ebeef5; border-radius: 6px;
  font-size: 13px; color: #606266;
}
.rb-left { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.rb-left b { color: #303133; font-family: Consolas, Monaco, monospace; }
.rb-left b.actual { color: #1f9254; }
.rb-left b.offset { color: #1d63c9; }
.rb-left b.warn { color: #d64545; }
/* ⭐ 可用来款余额：抵扣的钱从这里扣 */
.rb-left .avail { color: #6b3fb5; }
.rb-left .avail b { color: #6b3fb5; }
.rb-left .avail.low { color: #d64545; }
.rb-left .avail.low b { color: #d64545; }
.rb-left .avail em {
  font-style: normal; font-size: 11px; margin-left: 4px;
  background: #fdecec; border: 1px solid #f5c2c2; border-radius: 3px; padding: 0 3px;
}
.rb-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rb-tip { font-size: 12px; }
.rb-tip.tip-pending { color: #d98600; }
.rb-tip.tip-approved { color: #1f9254; }
.rb-tip.tip-rejected { color: #d64545; }

/* ==================== ⭐ 范围全屏对账 ====================
   整页铺满视口、只上下滚动；表头/汇总条收紧，账单一张接一张排下来 */
.page-container.is-range-full {
  position: fixed;
  inset: 0;
  z-index: 2600;
  margin: 0;
  padding: 0 10px 0;
  background: #fff;
  overflow-y: auto;
  overflow-x: hidden;
}
.is-range-full .page-header {
  position: sticky;
  top: 0;
  z-index: 6;
  background: #fff;
  margin: 0;
  padding: 6px 0 6px;
  border-bottom: 1px solid #e8ecf1;
  gap: 6px;
}
.is-range-full .page-header h2 { font-size: 15px; }
.is-range-full .sub-tip { display: none; }
.is-range-full .range-text { font-size: 11px; }
.is-range-full .page-summary {
  gap: 12px;
  padding: 5px 10px;
  margin: 4px 0 2px;
  font-size: 12px;
  border-radius: 6px;
}
.is-range-full .page-summary .money.unpaid { font-size: 14px; }
.is-range-full .page-summary .unpaid-pill { padding: 1px 8px; }
.is-range-full .summary-tip { display: none; }
/* ⭐ 全屏对账时把搜索条收掉：整屏留给账单，退出全屏再搜 */
.is-range-full .bill-search,
.is-range-full .search-empty { display: none; }
.is-range-full .day-head {
  margin: 6px 0 3px;
  padding: 3px 8px;
  font-size: 12px;
  border-radius: 3px;
}
.is-range-full .day-head .day-date { font-size: 13px; }
.is-range-full .bill-block {
  border: 0;
  /* ⭐ 账单之间一条 2px 红色分割线，一眼看清每张单的边界 */
  border-bottom: 2px solid #e5484d;
  border-radius: 0;
  padding: 2px 0 8px;
  margin: 0 0 10px;
}
/* 每组最后一张后面不用再划线（下面就是新的日期头） */
.is-range-full .bill-block:last-child {
  border-bottom: 0;
  margin-bottom: 2px;
  padding-bottom: 2px;
}
.is-range-full .bill-caption {
  gap: 10px;
  padding: 2px 2px 3px;
  margin-bottom: 3px;
  font-size: 11.5px;
  border-bottom: 0;
}
.is-range-full .receipt-bar {
  margin-top: 4px;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
}
.is-range-full .rb-left { gap: 12px; }
.is-range-full .reject-alert { margin: 0 0 4px; }
.fs-count { font-size: 12px; opacity: 0.85; }
.empty-tip {
  margin-top: 6px;
  font-size: 12.5px;
  color: #909399;
}
</style>
