<!-- src/views/order/receipt-in.vue
     ⭐ 账单收款 —— 客户来款台账（工厂操作员登记，工厂审核员审核）
     - 来款登记：客户有钱就打过来，按「收款账号（银行简称+尾号）」记一笔
     - 审核通过后才计入该客户的可用余额
     - 客户台账：来款 / 退款 / 已抵扣 / 余额 ←→ 账单应收 / 已收 / 未收，一眼看出谁还欠多少
     - 账单收款页勾「抵扣」时，审核通过就从这里的余额按 FIFO 扣
-->
<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="left">
            <span class="title">💰 账单收款</span>
            <el-tag size="small" type="warning" effect="plain" v-if="summary.pendingCount">
              待审核 {{ summary.pendingCount }}
            </el-tag>
          </div>
          <div class="right">
            <el-radio-group v-model="activeTab" size="small">
              <el-radio-button value="list">来款登记</el-radio-button>
              <el-radio-button value="ledger">客户台账</el-radio-button>
            </el-radio-group>
            <el-button v-if="activeTab === 'list'" type="primary" size="small" @click="openCreate">
              新增来款
            </el-button>
            <el-button size="small" @click="refreshAll">刷新</el-button>
          </div>
        </div>
      </template>

      <!-- ===== 顶部汇总 ===== -->
      <div class="kpi-bar">
        <div class="kpi">
          <span class="kpi-label">来款合计</span>
          <b class="kpi-value in">¥{{ money(summary.inAmount) }}</b>
        </div>
        <div class="kpi">
          <span class="kpi-label">退款合计</span>
          <b class="kpi-value out">¥{{ money(summary.outAmount) }}</b>
        </div>
        <div class="kpi">
          <span class="kpi-label">已抵扣</span>
          <b class="kpi-value offset">¥{{ money(summary.usedAmount) }}</b>
        </div>
        <div class="kpi">
          <span class="kpi-label">可用来款余额</span>
          <b class="kpi-value" :class="summary.balance < 0 ? 'warn' : 'balance'">
            ¥{{ money(summary.balance) }}
          </b>
        </div>
        <div class="kpi-tip">
          余额 = 已审来款 − 已审退款 − 账单抵扣；账单收款页勾「抵扣」时从这里扣。
          上方合计按当前筛选条件统计（可按账号 / 客户 / 日期单独看某一项）
        </div>
      </div>

      <!-- ================= 来款登记 ================= -->
      <template v-if="activeTab === 'list'">
        <div class="toolbar">
          <el-radio-group v-model="statusFilter" size="small" @change="reload">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="pending">待审核</el-radio-button>
            <el-radio-button value="approved">已通过</el-radio-button>
            <el-radio-button value="rejected">已驳回</el-radio-button>
          </el-radio-group>
          <el-select v-model="directionFilter" size="small" style="width:104px;" @change="reload">
            <el-option label="全部类型" value="all" />
            <el-option label="来款" value="in" />
            <el-option label="退款" value="out" />
          </el-select>
          <el-select v-model="customerFilter" size="small" clearable filterable
            placeholder="全部客户" style="width:180px;" @change="reload">
            <el-option v-for="c in customers" :key="c.customerId"
              :label="c.customerName" :value="c.customerId" />
          </el-select>
          <el-select v-model="accountFilter" size="small" clearable filterable
            placeholder="全部账号" style="width:150px;" @change="reload">
            <el-option v-for="a in accounts" :key="a" :label="a" :value="a" />
          </el-select>
          <el-date-picker v-model="range" type="daterange" size="small" unlink-panels
            value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期"
            style="width:240px;" @change="reload" />
          <el-input v-model="keyword" size="small" clearable placeholder="单号 / 客户 / 账号 / 打款人 / 流水号"
            style="width:240px;" @keyup.enter="reload" @clear="reload" />
          <el-button size="small" @click="reload">查询</el-button>
        </div>

        <el-table :data="rows" border size="small" v-loading="loading"
          empty-text="暂无来款记录" :scrollbar-always-on="true"
          show-summary :summary-method="listSummary" class="ledger-table">
          <el-table-column prop="receiptNo" label="单号" width="140" fixed align="center">
            <template #default="{ row }">
              <span class="mono">{{ row.receiptNo }}</span>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="70" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.direction === 'out' ? 'warning' : 'success'" effect="plain">
                {{ row.direction === 'out' ? '退款' : '来款' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="customerName" label="客户" min-width="130" show-overflow-tooltip align="center" />
          <el-table-column prop="accountLabel" label="收款账号" width="130" show-overflow-tooltip align="center">
            <template #default="{ row }">
              <span class="acct">{{ row.accountLabel }}</span>
            </template>
          </el-table-column>
          <el-table-column label="金额" width="120" align="center">
            <template #default="{ row }">
              <b :class="row.direction === 'out' ? 'out' : 'in'">¥{{ num(row.amount).toFixed(2) }}</b>
            </template>
          </el-table-column>
          <!-- ⭐ 账单抵扣：这笔来款被账单抵扣掉的金额，点数字穿透看抵扣了哪些账单 -->
          <el-table-column label="账单抵扣" width="120" align="center">
            <template #default="{ row }">
              <el-button v-if="num(row.usedAmount) > 0.005" type="primary" link size="small"
                title="点击查看这笔来款抵扣过的账单" @click="openOffsetsByReceipt(row)">
                ¥{{ money(row.usedAmount) }}
              </el-button>
              <span v-else class="muted">¥0.00</span>
            </template>
          </el-table-column>
          <el-table-column label="本单剩余" width="110" align="center">
            <template #default="{ row }">
              <span :class="num(row.amount) - num(row.usedAmount) > 0.005 ? 'balance' : 'muted'">
                ¥{{ money(num(row.amount) - num(row.usedAmount)) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="可用余额" width="115" align="center">
            <template #default="{ row }">
              <span class="bal" :class="{ warn: balanceOf(row.customerId) < 0 }">
                ¥{{ money(balanceOf(row.customerId)) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="来款日期" width="105" align="center">
            <template #default="{ row }">{{ fmtDate(row.receiptDate) }}</template>
          </el-table-column>
          <el-table-column prop="payerName" label="打款人" width="110" show-overflow-tooltip align="center" />
          <el-table-column prop="payMethod" label="方式" width="95" align="center" />
          <el-table-column prop="bankSerial" label="流水号/回单" width="130" show-overflow-tooltip align="center" />
          <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip align="center" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="statusTag(row.status)">{{ statusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="提交" width="110" align="center">
            <template #default="{ row }">{{ row.submittedByName || '-' }}</template>
          </el-table-column>
          <el-table-column label="提交时间" width="130" align="center">
            <template #default="{ row }">{{ fmtTime(row.submittedAt) }}</template>
          </el-table-column>
          <el-table-column label="审核人" width="100" align="center">
            <template #default="{ row }">{{ row.auditedByName || '-' }}</template>
          </el-table-column>
          <el-table-column label="审核意见" min-width="120" show-overflow-tooltip align="center">
            <template #default="{ row }">
              <span :class="{ warn: row.status === 'rejected' }">{{ row.auditRemark || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="170" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="openDetail(row)">查看</el-button>
              <template v-if="row.status !== 'approved'">
                <el-button type="warning" link size="small" @click="openEdit(row)">修改</el-button>
                <el-button type="danger" link size="small" @click="removeRow(row)">删除</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager">
          <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total"
            layout="prev, pager, next, total" background @current-change="loadList" />
        </div>
      </template>

      <!-- ================= 客户台账 ================= -->
      <template v-else>
        <div class="toolbar">
          <el-date-picker v-model="ledgerRange" type="daterange" size="small" unlink-panels
            value-format="YYYY-MM-DD" start-placeholder="来款开始" end-placeholder="来款结束"
            style="width:240px;" @change="loadLedger" />
          <el-input v-model="ledgerKeyword" size="small" clearable placeholder="客户名称 / 编号"
            style="width:200px;" @keyup.enter="loadLedger" @clear="loadLedger" />
          <el-button size="small" @click="loadLedger">查询</el-button>
          <el-checkbox v-model="ledgerShowAll" size="small" @change="loadLedger">显示无往来客户</el-checkbox>
          <span class="toolbar-tip">
            「未收」= 账单应收 − 已收 − 抵扣；「差额」= 未收 − 可用余额（正数=客户还欠，负数=客户多付）。点客户前面的箭头看这家的每笔来款 / 抵扣
          </span>
        </div>

        <el-table :data="ledger" border size="small" v-loading="ledgerLoading"
          empty-text="暂无数据" :scrollbar-always-on="true" show-summary
          :summary-method="ledgerSummary" class="ledger-table"
          row-key="rowKey" :tree-props="{ children: 'items' }" default-expand-all>
          <el-table-column prop="customerName" label="客户 / 流水" min-width="190" show-overflow-tooltip fixed align="center">
            <template #default="{ row }">
              <template v-if="row.type">
                <span class="flow-type" :class="row.type">{{ row.typeText }}</span>
                <span class="flow-no">{{ row.no || '—' }}</span>
                <span class="flow-sub">{{ row.date }} · {{ row.accountLabel || '—' }}</span>
              </template>
              <template v-else>
                <span class="cust">{{ row.customerName }}</span>
                <span class="cust-no">{{ row.customerNo }}</span>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="来款合计" width="115" align="center">
            <template #default="{ row }">
              <span v-if="row.type" class="in">{{ row.type === 'in' ? '¥' + money(row.amount) : '' }}</span>
              <span v-else class="in">¥{{ money(row.inAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="退款" width="100" align="center">
            <template #default="{ row }">
              <span v-if="row.type" class="out">{{ row.type === 'out' ? '¥' + money(row.amount) : '' }}</span>
              <span v-else class="out">¥{{ money(row.outAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="待审核" width="112" align="center">
            <template #default="{ row }">
              <span v-if="row.type">
                <el-tag v-if="row.status === 'pending'" size="small" type="warning" effect="plain">待审</el-tag>
                <span v-else class="muted">{{ row.statusText }}</span>
              </span>
              <span v-else class="muted">¥{{ money(row.pendingAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="账单已抵扣" width="112" align="center">
            <template #default="{ row }">
              <span v-if="row.type">
                <span v-if="row.type === 'offset'" class="offset">¥{{ money(row.amount) }}</span>
              </span>
              <template v-else>
                <el-button v-if="num(row.usedAmount) > 0.005" type="primary" link size="small"
                  title="点击查看这个客户被账单抵扣的明细" @click="openOffsetsByCustomer(row)">
                  ¥{{ money(row.usedAmount) }}
                </el-button>
                <span v-else class="muted">¥0.00</span>
              </template>
            </template>
          </el-table-column>
          <el-table-column label="可用余额" width="120" align="center">
            <template #default="{ row }">
              <span v-if="row.type">
                <span v-if="row.type === 'in'" class="muted">剩 ¥{{ money(row.remainAmount) }}</span>
              </span>
              <b v-else :class="row.balance < 0 ? 'warn' : 'balance'">¥{{ money(row.balance) }}</b>
            </template>
          </el-table-column>
          <el-table-column label="账单应收" width="115" align="center">
            <template #default="{ row }">
              <span v-if="!row.type">¥{{ money(row.receivable) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="已收" width="105" align="center">
            <template #default="{ row }">
              <span v-if="!row.type" class="actual">¥{{ money(row.paid) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="抵扣" width="100" align="center">
            <template #default="{ row }">
              <span v-if="row.type" />
              <el-button v-else-if="num(row.billOffset) > 0.005" type="primary" link size="small"
                title="点击查看这个客户被账单抵扣的明细" @click="openOffsetsByCustomer(row)">
                ¥{{ money(row.billOffset) }}
              </el-button>
              <span v-else class="muted">¥0.00</span>
            </template>
          </el-table-column>
          <el-table-column label="未收" width="110" align="center">
            <template #default="{ row }">
              <b v-if="!row.type" :class="{ warn: row.unpaid > 0.005 }">¥{{ money(row.unpaid) }}</b>
            </template>
          </el-table-column>
          <el-table-column label="差额（未收−余额）" width="145" align="center">
            <template #default="{ row }">
              <b v-if="!row.type" :class="row.gap > 0.005 ? 'warn' : 'balance'">¥{{ money(row.gap) }}</b>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="center" fixed="right">
            <template #default="{ row }">
              <el-button v-if="!row.type" type="primary" link size="small" @click="quickCreate(row)">登记来款</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-card>

    <!-- ===== 新增 / 修改 ===== -->
    <el-dialog v-model="formVisible" :title="form.id ? '修改来款' : '登记来款'" width="560px"
      :close-on-click-modal="false">
      <el-form :model="form" label-width="104px" size="small">
        <el-form-item label="类型">
          <el-radio-group v-model="form.direction" :disabled="!!form.id">
            <el-radio-button value="in">来款（客户打钱给我）</el-radio-button>
            <el-radio-button value="out">退款（我退给客户）</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="客户" required>
          <el-select v-model="form.customerId" filterable placeholder="选择客户" style="width:100%;"
            :disabled="!!form.id">
            <el-option v-for="c in customers" :key="c.customerId"
              :label="`${c.customerName}（${c.customerNo}）`" :value="c.customerId" />
          </el-select>
        </el-form-item>
        <el-form-item label="收款账号" required>
          <el-select v-model="form.accountLabel" filterable allow-create default-first-option
            placeholder="银行简称（尾号），如 邮储(3362)" style="width:100%;">
            <el-option v-for="a in accounts" :key="a" :label="a" :value="a" />
          </el-select>
          <div class="form-tip">
            账号在「数据字典 → 收款账号」维护；新填的账号保存后自动加进字典
          </div>
        </el-form-item>
        <el-form-item :label="form.direction === 'out' ? '退款金额' : '来款金额'" required>
          <el-input-number v-model="form.amount" :min="0" :precision="2" :step="100"
            controls-position="right" style="width:180px;" />
          <span class="form-tip inline" v-if="form.customerId && form.direction === 'in'">
            当前可用余额 ¥{{ money(balanceOf(form.customerId)) }}
          </span>
        </el-form-item>
        <el-form-item label="日期" required>
          <el-date-picker v-model="form.receiptDate" type="date" value-format="YYYY-MM-DD"
            placeholder="来款日期" style="width:180px;" />
        </el-form-item>
        <el-form-item label="打款人">
          <el-input v-model="form.payerName" maxlength="50" placeholder="打款人 / 付款方名称" />
        </el-form-item>
        <el-form-item label="方式">
          <el-select v-model="form.payMethod" clearable placeholder="选择方式" style="width:180px;">
            <el-option v-for="m in PAY_METHODS" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="流水号/回单">
          <el-input v-model="form.bankSerial" maxlength="60" placeholder="银行流水号 / 回单号（选填）" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500"
            show-word-limit placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveForm">提交审核</el-button>
      </template>
    </el-dialog>

    <!-- ===== 明细抽屉 ===== -->
    <el-drawer v-model="detailVisible" title="来款明细" size="520px" destroy-on-close>
      <div v-loading="detailLoading" class="drawer-body">
        <template v-if="detail">
          <div class="detail-grid">
            <div><span>单号</span><b class="mono">{{ detail.receiptNo }}</b></div>
            <div><span>客户</span><b>{{ detail.customerName }}</b></div>
            <div><span>收款账号</span><b>{{ detail.accountLabel }}</b></div>
            <div>
              <span>{{ detail.direction === 'out' ? '退款金额' : '来款金额' }}</span>
              <b class="in">¥{{ num(detail.amount).toFixed(2) }}</b>
            </div>
            <div><span>日期</span><b>{{ fmtDate(detail.receiptDate) }}</b></div>
            <div><span>打款人</span><b>{{ detail.payerName || '-' }}</b></div>
            <div><span>方式</span><b>{{ detail.payMethod || '-' }}</b></div>
            <div><span>流水号</span><b>{{ detail.bankSerial || '-' }}</b></div>
            <div><span>已抵扣</span><b class="offset">¥{{ money(detail.usedAmount) }}</b></div>
            <div>
              <span>本单剩余</span>
              <b class="balance">¥{{ money(num(detail.amount) - num(detail.usedAmount)) }}</b>
            </div>
            <div><span>状态</span>
              <el-tag size="small" :type="statusTag(detail.status)">{{ statusText(detail.status) }}</el-tag>
            </div>
            <div><span>提交</span><b>{{ detail.submittedByName || '-' }} {{ fmtTime(detail.submittedAt) }}</b></div>
            <div><span>审核</span><b>{{ detail.auditedByName || '-' }} {{ fmtTime(detail.auditedAt) }}</b></div>
            <div class="full"><span>备注</span><b>{{ detail.remark || '-' }}</b></div>
            <div class="full" v-if="detail.auditRemark"><span>审核意见</span><b class="warn">{{ detail.auditRemark }}</b></div>
          </div>

          <div class="offset-title">抵扣去向（{{ offsets.length }} 笔）</div>
          <el-table :data="offsets" border size="small" empty-text="还没有被账单抵扣">
            <el-table-column prop="billNo" label="账单号" min-width="140" align="center">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="goBill(row)">{{ row.billNo }}</el-button>
              </template>
            </el-table-column>
            <el-table-column label="抵扣金额" width="110" align="center">
              <template #default="{ row }"><b class="offset">¥{{ num(row.amount).toFixed(2) }}</b></template>
            </el-table-column>
            <el-table-column label="时间" width="130" align="center">
              <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </template>
      </div>
    </el-drawer>

    <!-- ===== 抵扣穿透：这笔来款 / 这个客户 抵扣过的账单 ===== -->
    <el-dialog v-model="offsetsVisible" :title="offsetsTitle" width="900px" destroy-on-close>
      <div class="offset-bar">
        <span>共 <b>{{ offsetsList.length }}</b> 笔</span>
        <span>抵扣合计 <b class="offset">¥{{ money(offsetsTotal) }}</b></span>
        <span v-if="offsetsReceipt">
          来款金额 <b class="in">¥{{ money(offsetsReceipt.amount) }}</b>
          · 已抵扣 <b class="offset">¥{{ money(offsetsReceipt.usedAmount) }}</b>
          · 剩余 <b class="balance">¥{{ money(num(offsetsReceipt.amount) - num(offsetsReceipt.usedAmount)) }}</b>
        </span>
        <span v-else-if="offsetsCustomer">客户：<b>{{ offsetsCustomer.customerName }}</b></span>
      </div>
      <el-table :data="offsetsList" border size="small" v-loading="offsetsLoading"
        empty-text="还没有被账单抵扣" max-height="440">
        <el-table-column prop="billNo" label="账单号" min-width="140" fixed align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goBill(row)">{{ row.billNo }}</el-button>
          </template>
        </el-table-column>
        <el-table-column label="账单日期" width="100" align="center">
          <template #default="{ row }">{{ fmtDate(row.billDate) }}</template>
        </el-table-column>
        <el-table-column label="账单金额" width="118" align="center">
          <template #default="{ row }">¥{{ money(row.billAmount) }}</template>
        </el-table-column>
        <el-table-column label="抵扣金额" width="118" align="center">
          <template #default="{ row }"><b class="offset">¥{{ money(row.amount) }}</b></template>
        </el-table-column>
        <el-table-column label="来款单号" width="140" align="center">
          <template #default="{ row }">
            <span class="mono">{{ row.receiptNo || offsetsReceipt?.receiptNo || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="抵扣时间" width="125" align="center">
          <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goBill(row)">看账单</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="offset-foot">
        抵扣来自「账单收款」页勾选抵扣、审核通过后生成；点账单号可直接跳到账单详情核对。
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  getReceiptInList, getReceiptInLedger, getReceiptInOptions,
  getReceiptInDetail, createReceiptIn, updateReceiptIn, deleteReceiptIn,
  getReceiptInOffsetsByCustomer,
} from '@/api/customerReceipt';

const router = useRouter();

const PAY_METHODS = ['银行转账', '现金', '支付宝', '微信', '支票', '承兑', '其他'];

const activeTab = ref('list');

// ===== 汇总 =====
const summary = ref({ inAmount: 0, outAmount: 0, usedAmount: 0, balance: 0, pendingCount: 0 });

// ===== 列表 =====
const rows = ref([]);
const loading = ref(false);
const statusFilter = ref('all');
const directionFilter = ref('all');
const customerFilter = ref(null);
const accountFilter = ref(null);
const keyword = ref('');
const range = ref([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const balances = ref({});

const customers = ref([]);
const accounts = ref([]);

const num = (v) => Number(v || 0);
const money = (v) => num(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (v) => (v ? String(v).slice(0, 10) : '-');
const fmtTime = (v) => (v ? String(v).replace('T', ' ').slice(0, 16) : '-');
const statusText = (s) => ({ pending: '待审核', approved: '已通过', rejected: '已驳回' }[s] || s || '-');
const statusTag = (s) => ({ pending: 'warning', approved: 'success', rejected: 'danger' }[s] || 'info');
const balanceOf = (customerId) => num(balances.value?.[customerId]);

const loadOptions = async () => {
  try {
    const res = await getReceiptInOptions();
    customers.value = res?.data?.customers || [];
    accounts.value = res?.data?.accounts || [];
  } catch (e) {
    ElMessage.error('加载客户/账号选项失败');
  }
};

const loadList = async () => {
  loading.value = true;
  try {
    const params = {
      status: statusFilter.value,
      direction: directionFilter.value,
      customerId: customerFilter.value || undefined,
      account: accountFilter.value || undefined,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    };
    if (range.value?.length === 2) {
      params.startDate = range.value[0];
      params.endDate = range.value[1];
    }
    const res = await getReceiptInList(params);
    rows.value = res?.data || [];
    total.value = res?.total || 0;
    balances.value = res?.balances || {};
    if (res?.summary) summary.value = res.summary;
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '加载来款列表失败');
  } finally {
    loading.value = false;
  }
};

const reload = () => { page.value = 1; loadList(); };

// 列表合计行
const listSummary = ({ columns, data }) => {
  return columns.map((col, i) => {
    if (i === 0) return '合计';
    if (col.label === '金额') {
      const s = data.reduce((acc, r) => acc + num(r.amount), 0);
      return `¥${s.toFixed(2)}`;
    }
    if (col.label === '账单抵扣') {
      const s = data.reduce((acc, r) => acc + num(r.usedAmount), 0);
      return `¥${s.toFixed(2)}`;
    }
    if (col.label === '本单剩余') {
      const s = data.reduce((acc, r) => acc + num(r.amount) - num(r.usedAmount), 0);
      return `¥${s.toFixed(2)}`;
    }
    return '';
  });
};

// ===== 台账 =====
const ledger = ref([]);
const ledgerLoading = ref(false);
const ledgerRange = ref([]);
const ledgerKeyword = ref('');
const ledgerShowAll = ref(false);
const ledgerSum = ref({});

const loadLedger = async () => {
  ledgerLoading.value = true;
  try {
    const params = { keyword: ledgerKeyword.value || undefined };
    if (ledgerShowAll.value) params.showAll = true;
    if (ledgerRange.value?.length === 2) {
      params.startDate = ledgerRange.value[0];
      params.endDate = ledgerRange.value[1];
    }
    const res = await getReceiptInLedger(params);
    // ⭐ 树形：每个客户一行汇总，展开是这家的来款/退款/抵扣流水
    ledger.value = (res?.data || []).map((r) => ({ ...r, rowKey: 'C' + r.customerId }));
    ledgerSum.value = res?.summary || {};
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '加载客户台账失败');
  } finally {
    ledgerLoading.value = false;
  }
};

const ledgerSummary = ({ columns }) => {
  const s = ledgerSum.value || {};
  return columns.map((col) => {
    switch (col.label) {
      case '客户 / 流水': return '合计';
      case '来款合计': return `¥${money(s.inAmount)}`;
      case '退款': return `¥${money(s.outAmount)}`;
      case '待审核': return `¥${money(s.pendingAmount)}`;
      case '账单已抵扣': return `¥${money(s.usedAmount)}`;
      case '可用余额': return `¥${money(s.balance)}`;
      case '账单应收': return `¥${money(s.receivable)}`;
      case '已收': return `¥${money(s.paid)}`;
      case '抵扣': return `¥${money(s.billOffset)}`;
      case '未收': return `¥${money(s.unpaid)}`;
      case '差额（未收−余额）': return `¥${money(s.gap)}`;
      default: return '';
    }
  });
};

const refreshAll = () => {
  if (activeTab.value === 'list') loadList();
  else loadLedger();
  loadOptions();
};

// ===== 新增 / 修改 =====
const formVisible = ref(false);
const saving = ref(false);
const form = reactive({
  id: null, direction: 'in', customerId: null, accountLabel: '',
  amount: 0, receiptDate: '', payerName: '', payMethod: '', bankSerial: '', remark: '',
});

const resetForm = () => {
  Object.assign(form, {
    id: null, direction: 'in', customerId: null, accountLabel: '',
    amount: 0, receiptDate: new Date().toISOString().slice(0, 10),
    payerName: '', payMethod: '', bankSerial: '', remark: '',
  });
};

const openCreate = () => { resetForm(); formVisible.value = true; };

const quickCreate = (customerRow) => {
  resetForm();
  form.customerId = customerRow.customerId;
  formVisible.value = true;
};

const openEdit = (row) => {
  Object.assign(form, {
    id: row.id,
    direction: row.direction || 'in',
    customerId: row.customerId,
    accountLabel: row.accountLabel || '',
    amount: num(row.amount),
    receiptDate: fmtDate(row.receiptDate),
    payerName: row.payerName || '',
    payMethod: row.payMethod || '',
    bankSerial: row.bankSerial || '',
    remark: row.remark || '',
  });
  formVisible.value = true;
};

const saveForm = async () => {
  if (!form.customerId) return ElMessage.warning('请选择客户');
  if (!String(form.accountLabel || '').trim()) return ElMessage.warning('请填写收款账号');
  if (num(form.amount) <= 0) return ElMessage.warning('金额必须大于 0');
  if (!form.receiptDate) return ElMessage.warning('请选择日期');

  const payload = {
    direction: form.direction,
    customerId: form.customerId,
    accountLabel: String(form.accountLabel).trim(),
    amount: num(form.amount),
    receiptDate: form.receiptDate,
    payerName: form.payerName || null,
    payMethod: form.payMethod || null,
    bankSerial: form.bankSerial || null,
    remark: form.remark || null,
  };

  saving.value = true;
  try {
    const res = form.id
      ? await updateReceiptIn(form.id, payload)
      : await createReceiptIn(payload);
    if (res?.success) {
      ElMessage.success(res.message || '已提交审核');
      formVisible.value = false;
      // ⭐ 手填的新账号会同步进「数据字典 → 收款账号」，重拉一次选项让下拉立刻能选到
      await loadOptions();
      await loadList();
    } else {
      ElMessage.error(res?.message || '保存失败');
    }
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const removeRow = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确认删除 ${row.receiptNo}（¥${money(row.amount)}）？删除后不可恢复。`,
      '删除来款', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' });
  } catch { return; }
  try {
    const res = await deleteReceiptIn(row.id);
    if (res?.success) { ElMessage.success('已删除'); await loadList(); }
    else ElMessage.error(res?.message || '删除失败');
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '删除失败');
  }
};

// ===== 明细 =====
const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref(null);
const offsets = ref([]);

const openDetail = async (row) => {
  detailVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  offsets.value = [];
  try {
    const res = await getReceiptInDetail(row.id);
    detail.value = res?.data || null;
    offsets.value = res?.offsets || [];
  } catch (e) {
    ElMessage.error('加载明细失败');
  } finally {
    detailLoading.value = false;
  }
};

// ===== 抵扣穿透（这笔来款 / 这个客户 抵扣过哪些账单）=====
const offsetsVisible = ref(false);
const offsetsLoading = ref(false);
const offsetsList = ref([]);
const offsetsTitle = ref('抵扣过的账单');
const offsetsReceipt = ref(null);
const offsetsCustomer = ref(null);
const offsetsTotal = computed(() => offsetsList.value.reduce((s, r) => s + num(r.amount), 0));

// 来款登记里点「账单抵扣」：这笔钱抵扣了哪几张账单
const openOffsetsByReceipt = async (row) => {
  offsetsVisible.value = true;
  offsetsLoading.value = true;
  offsetsList.value = [];
  offsetsReceipt.value = row;
  offsetsCustomer.value = null;
  offsetsTitle.value = `抵扣过的账单 · ${row.receiptNo}`;
  try {
    const res = await getReceiptInDetail(row.id);
    if (res?.data) offsetsReceipt.value = res.data;
    offsetsList.value = (res?.offsets || []).map(o => ({ ...o, receiptNo: o.receiptNo || row.receiptNo }));
  } catch (e) {
    ElMessage.error('加载抵扣明细失败');
  } finally {
    offsetsLoading.value = false;
  }
};

// 客户台账里点「账单已抵扣 / 抵扣」：这个客户整体被抵扣的明细
const openOffsetsByCustomer = async (row) => {
  offsetsVisible.value = true;
  offsetsLoading.value = true;
  offsetsList.value = [];
  offsetsReceipt.value = null;
  offsetsCustomer.value = row;
  offsetsTitle.value = `抵扣过的账单 · ${row.customerName}`;
  try {
    const res = await getReceiptInOffsetsByCustomer(row.customerId);
    offsetsList.value = res?.data || [];
  } catch (e) {
    ElMessage.error('加载抵扣明细失败');
  } finally {
    offsetsLoading.value = false;
  }
};

// 穿透到账单详情
const goBill = (row) => {
  if (!row?.billId) return ElMessage.warning('找不到关联账单');
  offsetsVisible.value = false;
  detailVisible.value = false;
  router.push(`/order/bill/detail/${row.billId}`);
};

// 切标签页自动加载（原来切到「客户台账」是空白，要先点查询）
watch(activeTab, (v) => {
  if (v === 'ledger') loadLedger();
  else loadList();
});

onMounted(async () => {
  await loadOptions();
  await loadList();
});</script>

<style scoped>
.page-container { padding: 4px; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.card-header .left { display: flex; align-items: center; gap: 10px; }
.card-header .right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.title { font-size: 15px; font-weight: 600; color: #303133; }

.kpi-bar {
  display: flex; align-items: center; gap: 26px; flex-wrap: wrap;
  background: #f7f9fc; border: 1px solid #ebeef5; border-radius: 8px;
  padding: 10px 16px; margin-bottom: 12px;
}
.kpi { display: flex; flex-direction: column; gap: 2px; }
.kpi-label { font-size: 12px; color: #909399; }
.kpi-value { font-size: 16px; font-weight: 600; }
.kpi-value.in { color: #1f9254; }
.kpi-value.out { color: #e6a23c; }
.kpi-value.offset { color: #1d63c9; }
.kpi-value.balance { color: #6b3fb5; }
.kpi-value.warn { color: #d64545; }
.kpi-tip { font-size: 12px; color: #a0a4ab; flex: 1; min-width: 220px; }

.toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.toolbar-tip { font-size: 12px; color: #a0a4ab; }
.pager { display: flex; justify-content: flex-end; margin-top: 12px; }

.mono { font-family: Consolas, Monaco, monospace; }
.acct { color: #303133; }
.cust { color: #303133; font-weight: 500; }
.cust-no { color: #a0a4ab; font-size: 11px; margin-left: 6px; }
/* 台账树形子行：来款 / 退款 / 抵扣 一笔一行 */
.flow-type {
  display: inline-block; min-width: 34px; padding: 0 5px; margin-right: 6px;
  border-radius: 3px; font-size: 11px; line-height: 16px; text-align: center;
  background: #eef7f1; color: #1f9254;
}
.flow-type.out { background: #fdf3e6; color: #b7791f; }
.flow-type.offset { background: #eaf1fb; color: #1d63c9; }
.flow-no { font-family: Consolas, Monaco, monospace; font-size: 12px; color: #303133; }
.flow-sub { display: block; margin-left: 40px; color: #a0a4ab; font-size: 11px; line-height: 15px; }
:deep(.el-table__row--level-1) td { background: #fbfcfe; }
.in { color: #1f9254; }
.out { color: #e6a23c; }
.offset { color: #1d63c9; }
.actual { color: #1f9254; }
.balance { color: #6b3fb5; font-weight: 600; }
.bal { color: #6b3fb5; }
.muted { color: #a0a4ab; }
.warn { color: #d64545; font-weight: 600; }

.form-tip { font-size: 11px; color: #a0a4ab; line-height: 1.6; }
.form-tip.inline { margin-left: 10px; }

.drawer-body { padding: 0 6px; }
.detail-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 14px;
  background: #f7f9fc; border: 1px solid #ebeef5; border-radius: 8px; padding: 12px;
  font-size: 13px;
}
.detail-grid > div { display: flex; gap: 8px; }
.detail-grid span { color: #909399; min-width: 62px; }
.detail-grid b { color: #303133; font-weight: 500; }
.detail-grid .full { grid-column: span 2; }
.offset-title { font-size: 13px; font-weight: 600; color: #303133; margin: 14px 0 6px; }

/* 抵扣穿透弹窗 */
.offset-bar {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  background: #f7f9fc; border: 1px solid #ebeef5; border-radius: 8px;
  padding: 9px 14px; margin-bottom: 10px; font-size: 13px; color: #606266;
}
.offset-bar b { font-weight: 600; }
.offset-foot { margin-top: 10px; font-size: 12px; color: #a0a4ab; }
</style>
