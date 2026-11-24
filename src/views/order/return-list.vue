<!-- src/views/order/return-list.vue
     ⭐ 一个组件三个入口（靠 route.meta.mode 区分）：
        - /order/return          退货记录（全部角色的只读台账）
        - /order/return-process  退货处理（工厂操作员：客户申请退回后定退回方式）
        - /order/return-audit    退货审核（工厂审核员：审核工厂定的退回方式，通过才落账）
-->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>{{ pageTitle }}</h2>
      <div class="header-actions">
        <el-tag v-if="isTodo && todoCount" type="danger" effect="dark" round>
          待{{ isAudit ? '审核' : '处理' }} {{ todoCount }} 行 / {{ todoBillCount }} 张账单
        </el-tag>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="isProcess"
      class="process-tip"
      type="info"
      :closable="false"
      show-icon
    >
      客户申请退回后，需要工厂确认退回方式（全退 / 留工费 / 留工费+损耗），提交后由工厂审核员审核，<b>审核通过才改账单金额</b>。
    </el-alert>

    <el-alert
      v-else-if="isAudit"
      class="process-tip"
      type="warning"
      :closable="false"
      show-icon
    >
      工厂已提交退回方式，请核对后审核。<b>通过</b>才会按退回方式重算账单金额并回到客户确认；<b>驳回</b>则退回工厂重新选择方式（金额不动）。
    </el-alert>

    <!-- ===== 统计 ===== -->
    <div class="stat-grid">
      <div v-for="(s, i) in stats" :key="i" class="stat-card" :style="{ borderLeftColor: s.color }">
        <div class="stat-number" :class="{ 'is-money': s.money }">{{ s.n }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <!-- ===== 搜索（仅退货记录模式） ===== -->
    <div v-if="!isTodo" class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="状态">
          <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width:170px;" @change="loadData">
            <el-option label="待工厂处理" value="requested" />
            <el-option label="待审核" value="pending" />
            <el-option label="修理中" value="repairing" />
            <el-option label="已修好（待出账）" value="repaired" />
            <el-option label="修理过（已重新出账）" value="billed" />
            <el-option label="已驳回" value="rejected" />
            <el-option label="已归档（旧数据）" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户">
          <el-input v-model="keyword" placeholder="客户名称" clearable style="width:160px;" @clear="loadData" @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- ===== 退货处理：按账单聚合的待处理列表 ===== -->
    <template v-if="isProcess">
      <el-table
        v-if="todoBills.length"
        :data="todoBills"
        border
        stripe
        v-loading="loading"
        row-key="billId"
        @row-click="openHandleDialog"
      >
        <el-table-column label="账单号" width="150">
          <template #default="{ row }">
            <el-link type="primary" @click.stop="goBill(row)">{{ row.billNo }}</el-link>
            <el-tag v-if="isNewBill(row)" class="new-dot" type="danger" size="small" effect="dark">新</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户" width="130" show-overflow-tooltip />
        <el-table-column prop="operatorName" label="业务员" width="100" show-overflow-tooltip />
        <el-table-column label="退回明细" width="90" align="center">
          <template #default="{ row }">{{ row.itemCount }} 行</template>
        </el-table-column>
        <el-table-column label="涉及金额" width="130" align="right">
          <template #default="{ row }">¥{{ fmt2(row.amountSum) }}</template>
        </el-table-column>
        <el-table-column prop="returnReason" label="退回原因" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.returnReason || '—' }}</template>
        </el-table-column>
        <el-table-column label="申请时间" width="160">
          <template #default="{ row }">{{ formatDate(row.appliedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click.stop="openHandleDialog(row)">处理</el-button>
            <el-button size="small" plain @click.stop="goBill(row)">看账单</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else-if="!loading" description="暂无待处理的退货，处理完的会进入「退货记录」" />
    </template>

    <!-- ===== 退货审核：按账单聚合的待审核列表 ===== -->
    <template v-else-if="isAudit">
      <el-table
        v-if="todoBills.length"
        :data="todoBills"
        border
        stripe
        v-loading="loading"
        row-key="billId"
        @row-click="openAuditDialog"
      >
        <el-table-column label="账单号" width="150">
          <template #default="{ row }">
            <el-link type="primary" @click.stop="goBill(row)">{{ row.billNo }}</el-link>
            <el-tag v-if="isNewBill(row)" class="new-dot" type="danger" size="small" effect="dark">新</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户" width="110" show-overflow-tooltip />
        <el-table-column prop="operatorName" label="业务员" width="100" show-overflow-tooltip />
        <el-table-column label="退回明细" width="84" align="center">
          <template #default="{ row }">{{ row.itemCount }} 行</template>
        </el-table-column>
        <el-table-column label="退回金额" width="120" align="right">
          <template #default="{ row }">
            <b style="color:#d64545;">¥{{ fmt2(row.returnSum) }}</b>
          </template>
        </el-table-column>
        <el-table-column label="处理后应收" width="120" align="right">
          <template #default="{ row }"><b>¥{{ fmt2(row.keepSum) }}</b></template>
        </el-table-column>
        <el-table-column prop="processRemark" label="工厂处理备注" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.processRemark || '—' }}</template>
        </el-table-column>
        <el-table-column label="提交时间" width="110">
          <template #default="{ row }">
            <span :title="formatDate(row.processedAt)">{{ formatShort(row.processedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click.stop="openAuditDialog(row)">审核</el-button>
            <el-button size="small" plain @click.stop="goBill(row)">看账单</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else-if="!loading" description="暂无待审核的退货，审核完的会进入「退货记录」" />
    </template>

    <!-- ===== 退货记录：原始台账 ===== -->
    <template v-else>
      <el-alert
        class="arrive-tip"
        type="info"
        :closable="false"
        show-icon
      >
        货到厂后在每行最前面勾选<b>「确认到货」</b>，然后去<b>退货处理</b>定退回方式、提交审核；
        <b>审核通过后这单转为「修理中」</b>，货回到订单继续修，修好（制作完成）变<b>已修好</b>，
        重新出的账单确认后变<b>修理过</b>——按状态筛选就能查到这件货修没修、修到哪一步。
      </el-alert>

      <el-table
        :data="tableData"
        border
        stripe
        v-loading="loading"
        :row-class-name="arrivalRowClass"
        @row-click="viewDetail"
      >
        <el-table-column label="到货确认" width="136" align="center" fixed="left">
          <template #default="{ row }">
            <!-- ⭐ 已进修理流程的：不再显示勾选框，直接标「已转修理」 -->
            <span v-if="isRepairRow(row)" class="cell-sub">已转修理</span>
            <el-checkbox
              v-else
              :model-value="!!row.receivedAt"
              :disabled="!canConfirmArrival(row) || row._arriving"
              size="large"
              class="arrive-check"
              :class="row.receivedAt ? 'is-on' : 'is-off'"
              @click.stop
              @change="(v) => onArrivalChange(row, v)"
            >
              <span class="arrive-text">{{ row.receivedAt ? '已到货' : '确认到货' }}</span>
            </el-checkbox>
            <div
              v-if="row.receivedAt"
              class="cell-sub arrive-sub"
              :title="`${row.receivedByName || ''} ${formatDate(row.receivedAt)}`"
            >
              {{ formatShort(row.receivedAt) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="returnNo" label="退货编号" width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" @click.stop="viewDetail(row.id)">{{ row.returnNo }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="rowStatus(row).type" size="small">
              {{ rowStatus(row).text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="billNo" label="原账单号" width="140" />
        <el-table-column prop="detailId" label="明细ID" width="80" />
        <el-table-column prop="orderNo" label="订单号" width="150" />
        <el-table-column prop="productName" label="品名" width="120" />
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column prop="operatorName" label="业务员" width="100" />
        <el-table-column prop="returnAmount" label="退回金额" width="120" align="right">
          <template #default="{ row }">¥{{ (row.returnAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="lossAmount" label="保留损耗" width="110" align="right">
          <template #default="{ row }">{{ row.lossAmount != null ? '¥' + Number(row.lossAmount).toFixed(2) : '—' }}</template>
        </el-table-column>
        <el-table-column prop="returnType" label="退回方式" width="130" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.returnType" :type="row.returnType === 'full' ? 'danger' : 'warning'" size="small">
              {{ returnTypeText(row.returnType) }}
            </el-tag>
            <span v-else style="color:#c0c4cc;">待工厂定</span>
          </template>
        </el-table-column>
        <el-table-column prop="customerNote" label="客户说明" min-width="140" show-overflow-tooltip />
        <el-table-column prop="returnReason" label="退回原因" min-width="120" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="退货时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click.stop="viewDetail(row.id)">查看</el-button>
            <!-- ⭐ 修理中 / 已修好 / 修理过：直接去看订单修到哪了 -->
            <el-button
              v-if="isRepairRow(row) && row.orderId"
              size="small"
              type="warning"
              plain
              @click.stop="goOrder(row)"
            >看订单</el-button>
            <el-button
              v-else-if="canGoHandle(row)"
              size="small"
              type="success"
              plain
              @click.stop="goReturnProcess(row)"
            >去处理</el-button>
            <el-button
              v-else
              size="small"
              type="success"
              plain
              @click.stop="goBill(row)"
            >去账单处理</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && tableData.length === 0" description="暂无退货记录" />

      <div style="margin-top:16px;display:flex;justify-content:flex-end;">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          layout="total, prev, pager, next"
          @current-change="loadData"
        />
      </div>
    </template>

    <!-- ===== 退货详情弹窗（退货记录模式） ===== -->
    <el-dialog v-model="detailVisible" :title="`退货详情 - ${detailData?.returnNo}`" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="退货编号">{{ detailData?.returnNo }}</el-descriptions-item>
        <el-descriptions-item label="原账单号">{{ detailData?.billNo }}</el-descriptions-item>
        <el-descriptions-item label="明细ID">{{ detailData?.detailId }}</el-descriptions-item>
        <el-descriptions-item label="订单号">{{ detailData?.orderNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="品名">{{ detailData?.productName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ detailData?.quantity || 0 }}</el-descriptions-item>
        <el-descriptions-item label="客户">{{ detailData?.customerName }}</el-descriptions-item>
        <el-descriptions-item label="业务员">{{ detailData?.operatorName }}</el-descriptions-item>
        <el-descriptions-item label="退回金额">
          <span style="color:#E6A23C;font-weight:bold;">¥{{ (detailData?.returnAmount || 0).toFixed(2) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="保留损耗">
          {{ detailData?.lossAmount != null ? '¥' + Number(detailData.lossAmount).toFixed(2) : '—' }}
          <span v-if="detailData?.lossWeight" style="color:#909399;font-size:12px;">
            （{{ Number(detailData.lossWeight).toFixed(3) }}g 足金）
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="退回方式">
          <el-tag v-if="detailData?.returnType" :type="detailData.returnType === 'full' ? 'danger' : 'warning'" size="small">
            {{ returnTypeText(detailData.returnType) }}
          </el-tag>
          <span v-else style="color:#c0c4cc;">待工厂定</span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(detailData?.status)">{{ getStatusText(detailData?.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="到货确认">
          <template v-if="detailData?.receivedAt">
            <el-tag type="success" size="small">已确认到货</el-tag>
            <span style="margin-left:6px;font-size:12px;color:#909399;">
              {{ formatDate(detailData.receivedAt) }} · {{ detailData.receivedByName || '-' }}
            </span>
          </template>
          <span v-else-if="detailData?.status === 'processed'" style="color:#909399;">未记录（审核已通过）</span>
          <span v-else style="color:#E6A23C;font-weight:600;">未确认到货</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="detailData?.receiveRemark" label="到货备注" :span="2">
          {{ detailData.receiveRemark }}
        </el-descriptions-item>
        <el-descriptions-item label="客户说明" :span="2">{{ detailData?.customerNote || '-' }}</el-descriptions-item>
        <el-descriptions-item label="退货原因" :span="2">{{ detailData?.returnReason }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData?.returnRemark || '-' }}</el-descriptions-item>
        <el-descriptions-item label="处理备注" :span="2">{{ detailData?.processRemark || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="isRepairRow(detailData)" label="修理进度" :span="2">
          <el-tag :type="rowStatus(detailData).type" size="small">{{ rowStatus(detailData).text }}</el-tag>
          <span style="margin-left:8px;color:#909399;font-size:12px;">{{ repairStepText(detailData) }}</span>
        </el-descriptions-item>
        <el-descriptions-item v-if="detailData?.repairedAt" label="修好时间">
          {{ formatDate(detailData.repairedAt) }}
        </el-descriptions-item>
        <el-descriptions-item v-if="detailData?.billedAt" label="重新出账确认">
          {{ formatDate(detailData.billedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="退货时间" :span="2">{{ formatDate(detailData?.createdAt) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="success" plain @click="goBill(detailData)">去账单处理</el-button>
      </template>
    </el-dialog>

    <!-- ===== 退货处理弹窗（退货处理模式） ===== -->
    <el-dialog
      v-model="handleVisible"
      :title="`处理退货 · ${handleBill?.billNo || ''}`"
      width="1220px"
      destroy-on-close
      top="6vh"
    >
      <div class="handle-head">
        <span>客户 <b>{{ handleBill?.customerName }}</b></span>
        <span>退回 <b>{{ handleRows.length }}</b> 行</span>
        <span>涉及金额 <b>¥{{ fmt2(handleBill?.amountSum) }}</b></span>
        <span v-if="handleBill?.returnReason" class="reason">退回原因：{{ handleBill.returnReason }}</span>
      </div>

      <div class="batch-bar">
        <span class="batch-label">批量设为</span>
        <el-button size="small" type="danger" plain @click="applyHandleType('full')">全退</el-button>
        <el-button size="small" type="warning" plain @click="applyHandleType('labor')">留工费</el-button>
        <el-button size="small" type="success" plain @click="applyHandleType('labor_loss')">留工费+损耗</el-button>
      </div>

      <el-table :data="handleRows" border stripe size="small" max-height="360">
        <el-table-column prop="seqNo" label="#" width="42" align="center" />
        <el-table-column prop="productName" label="品名" min-width="96" show-overflow-tooltip />
        <el-table-column prop="orderNo" label="订单号" width="110" show-overflow-tooltip />
        <el-table-column label="数量" width="48" align="center">
          <template #default="{ row }">{{ row.quantity || 0 }}</template>
        </el-table-column>
        <el-table-column label="应收" width="86" align="right">
          <template #default="{ row }">¥{{ fmt2(row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column label="工费合计(可留)" width="106" align="right">
          <template #default="{ row }">
            <div>¥{{ fmt2(row.keptAmount || 0) }}</div>
            <div v-if="row.settingFee > 0" class="cell-sub">含镶石 {{ fmt2(row.settingFee) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="损耗(金料)" width="96" align="right">
          <template #default="{ row }">
            <div>¥{{ fmt2(row.goldMaterialFee) }}</div>
            <div class="cell-sub">{{ fmt2(row.goldMaterialWeight) }}g 足金</div>
          </template>
        </el-table-column>
        <el-table-column label="退回方式" width="214">
          <template #default="{ row }">
            <el-radio-group v-model="row.returnType" size="small">
              <el-radio-button value="full">全退</el-radio-button>
              <el-radio-button value="labor">留工费</el-radio-button>
              <el-radio-button value="labor_loss">工费+损耗</el-radio-button>
            </el-radio-group>
          </template>
        </el-table-column>
        <el-table-column label="保留损耗" width="102" align="right">
          <template #default="{ row }">
            <el-input-number
              v-if="row.returnType === 'labor_loss'"
              v-model="row.lossAmount"
              :min="0"
              :precision="2"
              :controls="false"
              size="small"
              style="width:100%"
            />
            <span v-else class="cell-sub">—</span>
          </template>
        </el-table-column>
        <el-table-column label="本次退回" width="92" align="right">
          <template #default="{ row }">
            <b style="color:#d64545;">¥{{ fmt2(returnAmountOf(row)) }}</b>
          </template>
        </el-table-column>
        <el-table-column label="处理后应收" width="98" align="right">
          <template #default="{ row }"><b>¥{{ fmt2(keepAmountOf(row)) }}</b></template>
        </el-table-column>
        <el-table-column label="客户说明" min-width="80" show-overflow-tooltip>
          <template #default="{ row }">{{ row.customerNote || '—' }}</template>
        </el-table-column>
      </el-table>

      <el-form style="margin-top:14px;">
        <el-form-item label="处理备注" required>
          <el-input v-model="handleRemark" type="textarea" :rows="2"
            placeholder="必填：例如已与客户电话确认，客户同意按此方式退回" />
        </el-form-item>
      </el-form>

      <div class="handle-sum">
        合计退回 <b style="color:#d64545;">¥{{ fmt2(handleTotals.returned) }}</b>
        <span class="dot">·</span>
        处理后本单应收 <b>¥{{ fmt2(handleTotals.keep) }}</b>
      </div>

      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" :loading="handling" :disabled="!handleRemark.trim()" @click="submitHandle">
          提交审核
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 退货审核弹窗（退货审核模式） ===== -->
    <el-dialog
      v-model="auditVisible"
      :title="`审核退货 · ${auditBill?.billNo || ''}`"
      width="1220px"
      destroy-on-close
      top="6vh"
    >
      <div class="handle-head">
        <span>客户 <b>{{ auditBill?.customerName }}</b></span>
        <span>业务员 <b>{{ auditBill?.operatorName }}</b></span>
        <span>退回 <b>{{ auditRows.length }}</b> 行</span>
        <span>退回合计 <b style="color:#d64545;">¥{{ fmt2(auditTotals.returned) }}</b></span>
        <span>处理后应收 <b>¥{{ fmt2(auditTotals.keep) }}</b></span>
        <span v-if="auditBill?.returnReason" class="reason">退回原因：{{ auditBill.returnReason }}</span>
      </div>

      <el-table :data="auditRows" border stripe size="small" max-height="360">
        <el-table-column prop="seqNo" label="#" width="42" align="center" />
        <el-table-column prop="productName" label="品名" min-width="96" show-overflow-tooltip />
        <el-table-column prop="orderNo" label="订单号" width="110" show-overflow-tooltip />
        <el-table-column label="数量" width="48" align="center">
          <template #default="{ row }">{{ row.quantity || 0 }}</template>
        </el-table-column>
        <el-table-column label="应收" width="86" align="right">
          <template #default="{ row }">¥{{ fmt2(row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column label="工费" width="76" align="right">
          <template #default="{ row }">¥{{ fmt2(row.laborFee) }}</template>
        </el-table-column>
        <el-table-column label="损耗(金料)" width="96" align="right">
          <template #default="{ row }">
            <div>¥{{ fmt2(row.goldMaterialFee) }}</div>
            <div class="cell-sub">{{ fmt2(row.goldMaterialWeight) }}g 足金</div>
          </template>
        </el-table-column>
        <el-table-column label="退回方式" width="126" align="center">
          <template #default="{ row }">
            <el-tag :type="row.returnType === 'full' ? 'danger' : (row.returnType === 'labor' ? 'warning' : 'success')" size="small">
              {{ shortReturnType(row.returnType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="保留损耗" width="92" align="right">
          <template #default="{ row }">
            <span v-if="row.returnType === 'labor_loss'">¥{{ fmt2(row.lossAmount) }}</span>
            <span v-else class="cell-sub">—</span>
          </template>
        </el-table-column>
        <el-table-column label="本次退回" width="92" align="right">
          <template #default="{ row }">
            <b style="color:#d64545;">¥{{ fmt2(row.returnAmount) }}</b>
          </template>
        </el-table-column>
        <el-table-column label="处理后应收" width="98" align="right">
          <template #default="{ row }"><b>¥{{ fmt2(row.totalAmount - row.returnAmount) }}</b></template>
        </el-table-column>
        <el-table-column label="客户说明" min-width="80" show-overflow-tooltip>
          <template #default="{ row }">{{ row.customerNote || '—' }}</template>
        </el-table-column>
      </el-table>

      <div class="audit-note">
        <span class="audit-note-label">工厂处理备注</span>
        <span class="audit-note-body">{{ auditBill?.processRemark || '—' }}</span>
      </div>

      <el-form style="margin-top:12px;">
        <el-form-item label="审核备注">
          <el-input v-model="auditRemark" type="textarea" :rows="2"
            placeholder="驳回时必填：填写驳回原因，便于工厂重新处理；通过可不填" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="danger" plain :loading="auditing" @click="submitAudit(false)">驳回</el-button>
        <el-button type="success" :loading="auditing" @click="submitAudit(true)">通过</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { getReturns, getReturnDetail, getReturnTodo, handleBillReturn,
         getReturnAuditTodo, auditBillReturn, confirmReturnArrival } from '@/api/return';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

// ⭐ 同一组件三个模式：记录 / 处理（工厂操作员） / 审核（工厂审核员）
const isProcess = computed(() => route.meta?.mode === 'process');
const isAudit = computed(() => route.meta?.mode === 'audit');
const isTodo = computed(() => isProcess.value || isAudit.value);
const pageTitle = computed(() => (
  isAudit.value ? '🔍 退货审核' : isProcess.value ? '🛠️ 退货处理' : '↩️ 退货记录'
));

const loading = ref(false);
const tableData = ref([]);
const filterStatus = ref('');
const keyword = ref('');
const detailVisible = ref(false);
const detailData = ref(null);

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const statusCount = reactive({ requested: 0, arrived: 0, pending: 0, rejected: 0, archived: 0, repairing: 0, repaired: 0, billed: 0 });

// ===== 退货处理 =====
const todoBills = ref([]);
const todoCount = ref(0);
const todoBillCount = ref(0);
const todayProcessed = ref(0);
const newThreshold = ref(0);   // 进页面时「上次看到」的退货记录 id 位点
const firstTodoLoad = ref(true);

const handled = ref([]);       // 用于「已提交待审核 / 今日已处理」统计

const handleVisible = ref(false);
const handleBill = ref(null);
const handleRows = ref([]);
const handleRemark = ref('');
const handling = ref(false);

// ===== 退货审核（工厂审核员） =====
const auditVisible = ref(false);
const auditBill = ref(null);
const auditRows = ref([]);
const auditRemark = ref('');
const auditing = ref(false);
const auditReturnSum = ref(0);   // 待审核退回金额合计
const todayAudited = ref(0);     // 今日已审核行数

const fmt2 = (v) => (Number(v) || 0).toFixed(2);

// 四个统计卡：按模式切换口径
const stats = computed(() => {
  if (isAudit.value) {
    return [
      { n: todoCount.value, label: '待我审核（明细行）', color: '#F56C6C' },
      { n: todoBillCount.value, label: '涉及账单', color: '#E6A23C' },
      { n: '¥' + fmt2(auditReturnSum.value), label: '待审退回金额', color: '#409EFF', money: true },
      { n: todayAudited.value, label: '今日已审核', color: '#67C23A' },
    ];
  }
  if (isProcess.value) {
    return [
      { n: todoCount.value, label: '待我处理（明细行）', color: '#F56C6C' },
      { n: todoBillCount.value, label: '涉及账单', color: '#E6A23C' },
      { n: statusCount.pending || 0, label: '已提交待审核', color: '#409EFF' },
      { n: todayProcessed.value, label: '今日已处理', color: '#67C23A' },
    ];
  }
  return [
    // 待处理拆两段：还没到货 / 已到货可处理，避免和「已到货」重复计数
    {
      n: Math.max(0, (statusCount.requested || 0) - (statusCount.arrived || 0)),
      label: '待处理（未到货）', color: '#F56C6C'
    },
    { n: statusCount.arrived || 0, label: '已到货待处理', color: '#E6A23C' },
    { n: statusCount.pending || 0, label: '待审核', color: '#409EFF' },
    // ⭐ 修理三态：一眼看出有多少货在修、多少修好等出账、多少已重新出账
    { n: statusCount.repairing || 0, label: '修理中', color: '#B37FEB' },
    { n: statusCount.repaired || 0, label: '已修好（待出账）', color: '#7C3AED' },
    { n: statusCount.billed || 0, label: '修理过（已出账）', color: '#52C41A' },
    { n: statusCount.rejected || 0, label: '已驳回', color: '#909399' },
  ];
});

const statusMap = {
  requested: { text: '待处理', type: 'danger' },
  pending: { text: '待审核', type: 'warning' },
  processed: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  // ⭐ 退货返修三态（2026-11-24）：审核通过不再归档，而是进「修理中」→「已修好」→「修理过」
  repairing: { text: '修理中', type: 'warning' },
  repaired: { text: '已修好', type: 'primary' },
  billed: { text: '修理过', type: 'success' },
};
const getStatusText = (s) => statusMap[s]?.text || s;
const getStatusType = (s) => statusMap[s]?.type || 'info';

// 列表状态：待处理里再分「已到货 / 未到货」，一眼看出卡在哪一步
const rowStatus = (row) => {
  if (row?.status === 'processed') return { text: '已通过', type: 'success' };
  if (row?.status === 'requested' && !row?.receivedAt) return { text: '待处理', type: 'danger' };
  if (row?.status === 'requested' && row?.receivedAt) return { text: '已到货待处理', type: 'warning' };
  return { text: getStatusText(row?.status), type: getStatusType(row?.status) };
};

// 修理进度：修理中 / 已修好 / 修理过（列表和详情共用）
const REPAIR_STEPS = { repairing: 1, repaired: 2, billed: 3 };
const isRepairRow = (row) => !!REPAIR_STEPS[row?.status];
const repairStepText = (row) => ({
  repairing: '修理中 · 货在工厂修',
  repaired: '已修好 · 等重新出账',
  billed: '修理过 · 已重新出账',
}[row?.status] || '');

// 到货确认：工厂操作员 / 管理员，且还没确认过
const canConfirmArrival = (row) => {
  if (!row || row.receivedAt) return false;
  if (row.status === 'processed') return false;
  if (isRepairRow(row)) return false;   // 已经进修理流程的，不再确认到货
  const t = userStore.userType;
  return t === 'factoryOrder' || t === 'admin';
};

// 已到货、还没提交审核的，给「去处理」；其余给「去账单处理」
const canGoHandle = (row) => {
  if (!row) return false;
  const t = userStore.userType;
  return (t === 'factoryOrder' || t === 'admin')
    && row.status === 'requested'
    && !!row.receivedAt;
};

// 记录表格的行底色：未到货淡橙、已到货淡绿，扫一眼就知道哪几行还压着
const arrivalRowClass = ({ row }) => {
  if (!row) return '';
  if (row.receivedAt) return 'row-arrived';
  if (row.status === 'requested') return 'row-unarrived';
  return '';
};

const returnTypeText = (t) => ({
  full: '全部退回',
  labor: '退料留工费',
  labor_loss: '退料留工费+损耗',
}[t] || '—');

// 去「退货处理」定退回方式（该页按账单聚合，进去自动打开这张账单）
const goReturnProcess = (row) => {
  detailVisible.value = false;
  if (row?.billNo) sessionStorage.setItem('returnOpenBillNo', row.billNo);
  router.push({ path: '/order/return-process' });
};

// 去看订单（修理中 / 已修好 / 修理过：核对这件货修到哪一步）
const goOrder = (row) => {
  detailVisible.value = false;
  if (!row?.orderId) { ElMessage.warning('这条退货没有关联订单'); return; }
  router.push({ name: 'OrderDetail', params: { id: row.orderId } });
};

const goBill = (row) => {
  const billId = row?.billId || row?.billData?.billId;
  if (!billId) { ElMessage.warning('找不到对应账单'); return; }
  detailVisible.value = false;
  handleVisible.value = false;
  router.push({ name: 'BillDetail', params: { id: billId } });
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', { hour12: false });
};

// 列表里用短时间（MM-DD HH:mm），完整时间放 title
const formatShort = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const isToday = (v) => {  if (!v) return false;
  const d = new Date(v);
  const t = new Date();
  return d.getFullYear() === t.getFullYear()
    && d.getMonth() === t.getMonth()
    && d.getDate() === t.getDate();
};

// ============================================================
// 退货记录（台账）
// ============================================================
const loadData = async () => {
  if (isProcess.value) return loadTodo();
  if (isAudit.value) return loadAuditTodo();
  loading.value = true;
  try {
    const res = await getReturns({
      status: filterStatus.value || undefined,
      customerName: keyword.value || undefined,
    });
    const data = res?.data || [];
    tableData.value = data;
    pagination.total = data.length;
    // 统计卡以后端 counts 为准（已收货的默认不在列表里，前端算不出来）
    const c = res?.counts;
    if (c) {
      Object.keys(statusCount).forEach(k => statusCount[k] = Number(c[k] || 0));
    } else {
      Object.keys(statusCount).forEach(k => statusCount[k] = 0);
      data.forEach(item => { if (statusCount[item.status] !== undefined) statusCount[item.status]++; });
    }
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const viewDetail = async (id) => {
  try {
    const res = await getReturnDetail(id);
    detailData.value = res?.data;
    detailVisible.value = true;
  } catch {
    ElMessage.error('加载详情失败');
  }
};

// ============================================================
// 逐行确认到货（退货记录模式）
// ============================================================
const onArrivalChange = async (row, checked) => {
  if (!checked || !row || row.receivedAt) return;
  row._arriving = true;
  try {
    const res = await confirmReturnArrival(row.id);
    row.receivedAt = new Date().toISOString();
    row.receivedByName = userStore.realName || userStore.userName || '';
    ElMessage.success(res?.message || '已确认到货，接着去「退货处理」定退回方式并提交审核');
    await loadData();
    // 顶栏铃铛 / 工作台卡片同步刷新
    window.dispatchEvent(new Event('return-todo-refresh'));
    window.dispatchEvent(new Event('return-audit-refresh'));
  } catch (e) {
    ElMessage.error(e?.message || '确认到货失败');
    await loadData();
  } finally {
    row._arriving = false;
  }
};

// ============================================================
// 退货处理（工厂操作员）
// ============================================================
const seenKey = computed(() => `returnTodoSeenMaxId:${userStore.userId || 0}`);

const isNewBill = (bill) => (bill?.items || []).some(x => Number(x.recordId) > newThreshold.value);

const loadTodo = async () => {
  loading.value = true;
  try {
    if (firstTodoLoad.value) {
      newThreshold.value = Number(localStorage.getItem(seenKey.value) || 0);
      firstTodoLoad.value = false;
    }
    const res = await getReturnTodo();
    const data = res?.data || {};
    todoBills.value = data.bills || [];
    todoCount.value = data.count || 0;
    todoBillCount.value = data.billCount || 0;

    // 进页面就算「看过」，下次再来才知道哪些是新的
    if (data.maxId) localStorage.setItem(seenKey.value, String(data.maxId));

    // 已提交待审核 / 今日已处理：用全量退货记录统计
    const all = await getReturns({ includeArchived: true });  // 今日已处理/已审核要把已归档的算进来
    handled.value = all?.data || [];
    Object.keys(statusCount).forEach(k => statusCount[k] = 0);
    handled.value.forEach(item => {
      if (statusCount[item.status] !== undefined) statusCount[item.status]++;
    });
    todayProcessed.value = handled.value.filter(x =>
      x.status === 'processed' && isToday(x.processedAt || x.auditedAt)
    ).length;

    // 从「退货记录」点「去处理」带过来的账单，自动打开处理弹窗
    const wantBillNo = sessionStorage.getItem('returnOpenBillNo');
    if (wantBillNo) {
      sessionStorage.removeItem('returnOpenBillNo');
      const target = todoBills.value.find(b => b.billNo === wantBillNo);
      if (target) openHandleDialog(target);
      else ElMessage.info('这张账单已不在待处理列表里（可能已提交审核）');
    }
  } catch {
    ElMessage.error('加载待处理退货失败');
  } finally {
    loading.value = false;
  }
};

// ============================================================
// 退货审核（工厂审核员）
// ============================================================
const auditSeenKey = computed(() => `returnAuditSeenMaxId:${userStore.userId || 0}`);
const firstAuditLoad = ref(true);

const loadAuditTodo = async () => {
  loading.value = true;
  try {
    if (firstAuditLoad.value) {
      newThreshold.value = Number(localStorage.getItem(auditSeenKey.value) || 0);
      firstAuditLoad.value = false;
    }
    const res = await getReturnAuditTodo();
    const data = res?.data || {};
    todoBills.value = data.bills || [];
    todoCount.value = data.count || 0;
    todoBillCount.value = data.billCount || 0;
    auditReturnSum.value = Number(data.returnSum || 0);

    if (data.maxId) localStorage.setItem(auditSeenKey.value, String(data.maxId));

    // 已审核 / 今日已审核：用全量退货记录统计
    const all = await getReturns({ includeArchived: true });  // 今日已处理/已审核要把已归档的算进来
    handled.value = all?.data || [];
    Object.keys(statusCount).forEach(k => statusCount[k] = 0);
    handled.value.forEach(item => {
      if (statusCount[item.status] !== undefined) statusCount[item.status]++;
    });
    todayAudited.value = handled.value.filter(x =>
      (x.status === 'processed' || x.status === 'rejected') && isToday(x.auditedAt)
    ).length;
  } catch {
    ElMessage.error('加载待审核退货失败');
  } finally {
    loading.value = false;
  }
};

const shortReturnType = (t) => ({
  full: '全退',
  labor: '留工费',
  labor_loss: '工费+损耗',
}[t] || '—');

const openAuditDialog = (bill) => {
  if (!bill?.billId) return;
  auditBill.value = bill;
  const items = (bill.items || []).slice().sort((a, b) => Number(a.detailId || 0) - Number(b.detailId || 0));
  auditRows.value = items.map((it, idx) => ({
    seqNo: idx + 1,
    recordId: it.recordId,
    detailId: it.detailId,
    productName: it.productName || '',
    orderNo: it.orderNo || '',
    quantity: it.quantity || 0,
    totalAmount: Number(it.totalAmount || 0),
    laborFee: Number(it.laborFee || 0),
    goldMaterialFee: Number(it.goldMaterialFee || 0),
    goldMaterialWeight: Number(it.goldMaterialWeight || 0),
    returnType: it.returnType || 'full',
    lossAmount: Number(it.lossAmount || 0),
    returnAmount: Number(it.returnAmount || 0),
    customerNote: it.customerNote || '',
  }));
  if (auditRows.value.length === 0) {
    ElMessage.warning('该账单没有待审核的退回明细');
    return;
  }
  auditRemark.value = '';
  auditVisible.value = true;
};

const auditTotals = computed(() => ({
  returned: auditRows.value.reduce((s, r) => s + Number(r.returnAmount || 0), 0),
  keep: auditRows.value.reduce((s, r) => s + Math.max(0, Number(r.totalAmount || 0) - Number(r.returnAmount || 0)), 0),
}));

const submitAudit = async (approved) => {
  if (!approved && !auditRemark.value.trim()) {
    ElMessage.warning('驳回时请填写驳回原因，便于工厂重新处理');
    return;
  }
  auditing.value = true;
  try {
    const res = await auditBillReturn(auditBill.value.billId, {
      approved,
      remark: auditRemark.value.trim(),
    });
    ElMessage.success(res?.message || (approved ? '已通过退回' : '已驳回，退回工厂重新处理'));
    auditVisible.value = false;
    await loadAuditTodo();
    // 顶栏铃铛 / 审核工作台卡片同步刷新
    window.dispatchEvent(new Event('return-audit-refresh'));
  } catch (e) {
    ElMessage.error(e?.message || '审核失败');
  } finally {
    auditing.value = false;
  }
};

const openHandleDialog = (bill) => {
  if (!bill?.billId) return;
  handleBill.value = bill;
  // 按账单明细顺序展示（退回记录本身是最新在前）
  const items = (bill.items || []).slice().sort((a, b) => Number(a.detailId || 0) - Number(b.detailId || 0));
  handleRows.value = items
    .map((it, idx) => ({
      recordId: it.recordId,
      detailId: it.detailId,
      seqNo: idx + 1,
      productName: it.productName || '',
      orderNo: it.orderNo || '',
      quantity: it.quantity || 0,
      totalAmount: Number(it.totalAmount || 0),
      laborFee: Number(it.laborFee || 0),
      goldMaterialFee: Number(it.goldMaterialFee || 0),
      goldMaterialWeight: Number(it.goldMaterialWeight || 0),
      goldPrice: Number(it.goldPrice || 0),
      keptAmount: Number(it.keptAmount || 0),
      settingFee: Number(it.settingFee || 0),
      customerNote: it.customerNote || '',
      // 默认「留工费」：不让误操作把整单全退（与账单详情里的默认一致）
      returnType: 'labor',
      lossAmount: Number(it.goldMaterialFee || 0),
    }));
  if (handleRows.value.length === 0) {
    ElMessage.warning('该账单没有待处理的退回明细');
    return;
  }
  handleRemark.value = '';
  handleVisible.value = true;
};

const applyHandleType = (type) => {
  handleRows.value.forEach(r => {
    r.returnType = type;
    if (type === 'labor_loss' && (r.lossAmount === null || r.lossAmount === undefined)) {
      r.lossAmount = r.goldMaterialFee;
    }
  });
};

const returnAmountOf = (row) => {
  const total = Number(row.totalAmount || 0);
  if (row.returnType === 'full') return total;
  // 留工费 / 留工费+损耗：保留 工费+版费+包装证书邮费+镶石工费(粒数×单价)，损耗另收
  // 保留额由后端 keptAmount 给出，与账单应收口径一致
  const kept = Number(row.keptAmount || 0);
  const loss = row.returnType === 'labor_loss' ? Number(row.lossAmount || 0) : 0;
  return Math.max(0, total - kept - loss);
};

const keepAmountOf = (row) => Math.max(0, Number(row.totalAmount || 0) - returnAmountOf(row));

const handleTotals = computed(() => {
  const returned = handleRows.value.reduce((s, r) => s + returnAmountOf(r), 0);
  const keep = handleRows.value.reduce((s, r) => s + keepAmountOf(r), 0);
  return { returned, keep };
});

const submitHandle = async () => {
  if (!handleRemark.value.trim()) {
    ElMessage.warning('请填写处理备注（与客户确认的退回情况）');
    return;
  }
  handling.value = true;
  try {
    const res = await handleBillReturn(handleBill.value.billId, {
      remark: handleRemark.value.trim(),
      items: handleRows.value.map(r => ({
        detailId: r.detailId,
        returnType: r.returnType,
        lossAmount: r.returnType === 'labor_loss' ? Number(r.lossAmount || 0) : null,
      })),
    });
    ElMessage.success(res?.message || '退回方式已提交，等待审核');
    handleVisible.value = false;
    await loadTodo();
    // 顶栏铃铛 / 工作台卡片同步刷新
    window.dispatchEvent(new Event('return-todo-refresh'));
  } catch (e) {
    ElMessage.error(e?.message || '提交失败');
  } finally {
    handling.value = false;
  }
};

onMounted(() => {
  if (isProcess.value) loadTodo();
  else if (isAudit.value) loadAuditTodo();
  else loadData();
});
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.process-tip { margin-bottom: 14px; }
.search-bar { background: #f5f7fa; padding: 16px 20px; border-radius: 6px; margin-bottom: 16px; }
.search-bar :deep(.el-form-item) { margin-bottom: 0; }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat-card { background: #fafafa; padding: 12px 16px; border-radius: 6px; border-left: 4px solid #ddd; }
.stat-card .stat-number { font-size: 22px; font-weight: bold; color: #303133; }
.stat-card .stat-number.is-money { font-size: 20px; }
.stat-card .stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
:deep(.el-table .el-table__row) { cursor: pointer; }
.new-dot { margin-left: 6px; }

.handle-head {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  background: #f8f9fb; border-radius: 6px; padding: 10px 14px; margin-bottom: 10px;
  font-size: 13px; color: #606266;
}
.handle-head b { color: #303133; }
.handle-head .reason { color: #909399; }
.batch-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.batch-label { font-size: 13px; color: #909399; }
.cell-sub { font-size: 11px; color: #909399; }
.handle-sum {
  margin-top: 12px; padding: 10px 14px; background: #fdf6ec; border-radius: 6px;
  font-size: 14px; color: #606266;
}
.handle-sum b { font-size: 16px; }
.handle-sum .dot { margin: 0 8px; color: #c0c4cc; }

.audit-note {
  display: flex; gap: 10px; align-items: flex-start;
  margin-top: 12px; padding: 10px 14px; background: #f8f9fb; border-radius: 6px;
  font-size: 13px; color: #303133;
}
.audit-note-label { color: #909399; white-space: nowrap; }
.audit-note-body { flex: 1; line-height: 1.6; }

/* ===== 到货确认（行首勾选，要显眼） ===== */
.arrive-tip { margin-bottom: 12px; }
.arrive-tip b { color: #b8860b; }

:deep(.arrive-check) {
  height: auto;
  margin-right: 0;
}
/* 勾选框本体：未勾时橙色粗框，勾上后绿色实心 */
:deep(.arrive-check .el-checkbox__inner) {
  width: 20px;
  height: 20px;
  border-width: 2px;
  border-radius: 5px;
}
:deep(.arrive-check .el-checkbox__inner::after) {
  left: 6px;
  top: 2px;
  width: 5px;
  height: 10px;
  border-width: 2px;
}
:deep(.arrive-check .el-checkbox__label) {
  padding-left: 8px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}
:deep(.arrive-check.is-off .el-checkbox__inner) {
  border-color: #e6a23c;
  background: #fffaf0;
}
:deep(.arrive-check.is-off .arrive-text) { color: #d48806; }
:deep(.arrive-check.is-off:hover .el-checkbox__inner) {
  border-color: #f0a020;
  box-shadow: 0 0 0 3px rgba(230, 162, 60, .18);
}
:deep(.arrive-check.is-on .el-checkbox__inner) {
  border-color: #52a552;
  background: #52a552;
}
:deep(.arrive-check.is-on .arrive-text) { color: #3d8b3d; }
:deep(.arrive-check.is-on .el-checkbox__inner::after) { border-color: #fff; }
.arrive-sub { margin-top: 3px; line-height: 1.2; }

/* 行底色：未到货淡橙压着、已到货淡绿（固定列也要同色，否则右侧像贴了白块） */
:deep(.el-table__body tr.row-unarrived > td.el-table__cell) { background: #fffbf2 !important; }
:deep(.el-table__body tr.row-arrived > td.el-table__cell) { background: #f6fcf6 !important; }
:deep(.el-table__body tr.row-unarrived:hover > td.el-table__cell) { background: #fdf3e0 !important; }
:deep(.el-table__body tr.row-arrived:hover > td.el-table__cell) { background: #eef9ee !important; }
:deep(.el-table__body tr.row-unarrived > td.el-table-fixed-column--left),
:deep(.el-table__body tr.row-unarrived > td.el-table-fixed-column--right) { background: #fffbf2 !important; }
:deep(.el-table__body tr.row-arrived > td.el-table-fixed-column--left),
:deep(.el-table__body tr.row-arrived > td.el-table-fixed-column--right) { background: #f6fcf6 !important; }

.receive-box { font-size: 13px; color: #606266; }
.receive-head { background: #f8f9fb; border-radius: 6px; padding: 10px 14px; font-size: 14px; }
.receive-head b { color: #303133; }
.receive-head .dot { margin: 0 8px; color: #c0c4cc; }
.receive-tip {
  margin: 12px 0; padding: 10px 12px; background: #fdf6ec; border-radius: 6px;
  line-height: 1.7; color: #8a6d3b;
}
.receive-tip b { color: #b8860b; }
</style>
