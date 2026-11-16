<!-- src/views/order/bill-detail.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" plain>
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📄 出货单详情</h2>
        <el-tag :type="getStatusType(billData?.status)" size="large" effect="dark">
          {{ getStatusText(billData?.status) }}
        </el-tag>
        <el-tag type="primary" size="large" effect="plain">{{ billData?.billNo }}</el-tag>
      </div>
      <div class="header-right">
        <!-- 角色标签 -->
        <el-tag size="small" type="info" effect="plain" style="margin-right:4px;">
          {{ userStore.userTypeName }}
        </el-tag>

        <!-- ⭐ 工厂业务员：提交审核（pending 状态） -->
        <el-button 
          v-if="userStore.isFactoryOrder && billData?.status === 'pending'"
          type="warning" 
          @click="handleSubmitAudit" 
          :loading="submitting"
        >
          <el-icon><Upload /></el-icon> 提交审核
        </el-button>

        <!-- ⭐ 工厂审核员：审核通过/驳回（billPending 状态） -->
        <template v-if="userStore.isFactoryAudit && billData?.status === 'billPending'">
          <el-button type="success" @click="handleAudit(true)" :loading="auditing">
            <el-icon><Select /></el-icon> 通过
          </el-button>
          <el-button type="danger" @click="handleAudit(false)" :loading="auditing">
            <el-icon><Close /></el-icon> 驳回
          </el-button>
        </template>

        <!-- ⭐ 客户侧两级：客户审核员先审核（billConfirmed），业务员再确认（customerApproved） -->
        <template v-if="userStore.isCustomerType && billData?.status === 'billConfirmed'">
          <el-button v-if="userStore.isCustomerAudit || userStore.isAdmin" type="warning" @click="handleCustomerAudit" :loading="customerAuditing">
            <el-icon><Check /></el-icon> 审核通过
          </el-button>
          <el-button type="danger" @click="openReturnDialog">
            <el-icon><RefreshLeft /></el-icon> 退回
          </el-button>
          <el-tag v-if="userStore.isCustomer" type="info" effect="plain">
            等客户审核员审核通过后才会显示给你
          </el-tag>
        </template>

        <template v-if="userStore.isCustomerType && billData?.status === 'customerApproved'">
          <el-button v-if="userStore.isCustomer || userStore.isAdmin" type="success" @click="handleConfirm" :loading="confirming">
            <el-icon><Check /></el-icon> 确认账单
          </el-button>
          <el-button v-if="canCustomerReturn" type="danger" @click="openReturnDialog">
            <el-icon><RefreshLeft /></el-icon> 退回
          </el-button>
          <el-tag v-if="userStore.isCustomerAudit && !userStore.isAdmin" type="success" effect="plain">
            已审核通过{{ billData?.customerAuditedByName ? '（' + billData.customerAuditedByName + '）' : '' }}，等待业务员确认
          </el-tag>
        </template>

        <!-- ⭐ 工厂操作员：客户退回后，口头沟通完在这里定退回方式 -->
        <el-button
          v-if="(userStore.isFactoryOrder || userStore.isAdmin) && billData?.status === 'returnRequested'"
          type="primary"
          @click="openHandleDialog"
        >
          <el-icon><EditPen /></el-icon> 处理退回
        </el-button>

        <!-- ⭐ 工厂审核员：审核退回（通过才落账，回到客户确认） -->
        <template v-if="(userStore.isFactoryAudit || userStore.isAdmin) && billData?.status === 'returnPending'">
          <el-button type="success" @click="handleReturnAudit(true)" :loading="returnAuditing">
            <el-icon><Select /></el-icon> 通过退回
          </el-button>
          <el-button type="danger" @click="handleReturnAudit(false)" :loading="returnAuditing">
            <el-icon><Close /></el-icon> 驳回
          </el-button>
        </template>

        <el-button type="info" plain @click="previewVisible = true">
          <el-icon><View /></el-icon> 预览
        </el-button>
        <el-button type="primary" plain @click="handleExport">
          <el-icon><Download /></el-icon> 导出
        </el-button>
      </div>
    </div>

    <!-- ===== 内容主体 ===== -->
    <div class="content-body">

      <!-- ⭐ 退回处理中：审核通过前金额不动，先给个预估 -->
      <el-alert
        v-if="isReturnFlow"
        class="return-banner"
        :type="billData?.status === 'returnPending' ? 'warning' : 'info'"
        :closable="false"
        show-icon
      >
        <template #title>
          <span v-if="billData?.status === 'returnRequested'">客户已申请退回，等待工厂确认退回方式（账单金额暂不变）</span>
          <span v-else>退回方式已提交，等待工厂审核（通过后才改账单金额）</span>
        </template>
        <div class="return-banner-body">
          <span>申请明细 <b>{{ activeReturnRecords.length }}</b> 行</span>
          <span v-if="billData?.status === 'returnPending'">预计退回 <b style="color:#d64545;">¥{{ pendingReturnTotal.toFixed(2) }}</b></span>
          <span v-if="billData?.status === 'returnPending'">处理后应收 <b>¥{{ pendingReceivable.toFixed(2) }}</b></span>
          <span v-if="billData?.returnReason">退回原因：{{ billData.returnReason }}</span>
        </div>
      </el-alert>

      <!-- ===== 1. 账单概览卡片 ===== -->
      <div class="overview-cards">
        <div class="overview-card">
          <div class="card-icon" style="background:#ecf5ff;color:#409EFF;">
            <el-icon><Document /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-label">账单编号</div>
            <div class="card-value">{{ billData?.billNo || '-' }}</div>
          </div>
        </div>
        <div class="overview-card">
          <div class="card-icon" style="background:#f0f9ff;color:#67C23A;">
            <el-icon><User /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-label">客户名称</div>
            <div class="card-value">{{ billData?.customerName || '-' }}</div>
          </div>
        </div>
        <div class="overview-card">
          <div class="card-icon" style="background:#fdf6ec;color:#E6A23C;">
            <el-icon><Money /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-label">总金额</div>
            <div class="card-value" style="color:#E6A23C;font-size:22px;">
              ¥{{ (billData?.totalAmount || 0).toFixed(2) }}
            </div>
          </div>
        </div>
        <div class="overview-card">
          <div class="card-icon" style="background:#fef0f0;color:#F56C6C;">
            <el-icon><Goods /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-label">总件数</div>
            <div class="card-value">{{ billData?.totalQuantity || 0 }}</div>
          </div>
        </div>
      </div>

      <!-- ===== 2. 账单信息 ===== -->
      <div class="info-section">
        <div class="section-title">
          <span class="title-icon">📌</span> 账单信息
        </div>
        <el-row :gutter="20">
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">成色</span>
              <span class="value">{{ billData?.color || 'Au755' }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">账单日期</span>
              <span class="value">{{ formatDate(billData?.billDate) }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">币种</span>
              <span class="value">RMB</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">流程状态</span>
              <el-tag :type="getFlowStatusType(billData?.flowStatus)" size="small">
                {{ getFlowStatusText(billData?.flowStatus) }}
              </el-tag>
            </div>
          </el-col>
        </el-row>
        <el-row v-if="billData?.remark" style="margin-top:8px;">
          <el-col :span="24">
            <div class="info-item">
              <span class="label">备注</span>
              <span class="value">{{ billData?.remark }}</span>
            </div>
          </el-col>
        </el-row>
        <!-- ⭐ 收款情况：工厂一录入就同步显示，客户也能看到逐笔已收 / 未收 -->
        <el-row v-if="showReceiptInfo" :gutter="20" style="margin-top:8px;">
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">应收款</span>
              <span class="value">¥{{ receiptReceivable.toFixed(2) }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">已收款</span>
              <span class="value" style="color:#1f9254;">¥{{ receiptPaid.toFixed(2) }}</span>
            </div>
          </el-col>
          <el-col v-if="receiptOffset > 0" :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">抵扣</span>
              <span class="value" style="color:#1d63c9;">¥{{ receiptOffset.toFixed(2) }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :md="6">
            <div class="info-item">
              <span class="label">未收款</span>
              <span class="value" :style="{ color: receiptUnpaid > 0.001 ? '#d64545' : '#1f9254', fontWeight: 600 }">
                ¥{{ receiptUnpaid.toFixed(2) }}
                <el-tag size="small" :type="receiptUnpaid <= 0.001 ? 'success' : (receiptPaid > 0 ? 'warning' : 'info')" effect="plain" style="margin-left:6px;">
                  {{ receiptUnpaid <= 0.001 ? '已收齐' : (receiptPaid > 0 ? '部分收款' : '未收款') }}
                </el-tag>
              </span>
            </div>
          </el-col>
        </el-row>

        <!-- 退回原因 -->
        <el-row v-if="billData?.returnReason" style="margin-top:8px;">
          <el-col :span="24">
            <div class="info-item" style="background:#fef0f0;padding:10px 16px;border-radius:6px;">
              <span class="label" style="color:#F56C6C;">退回原因</span>
              <span class="value" style="color:#F56C6C;">{{ billData?.returnReason }}</span>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- ===== 3. 出货明细表格 ===== -->
      <div class="table-section">
        <div class="section-title">
          <span class="title-icon">📋</span> 出货明细表
          <span class="section-subtitle">共 {{ billData?.details?.length || 0 }} 行 ｜ 合计件数：{{ billData?.totalQuantity || 0 }}</span>
        </div>

        <div class="table-wrapper">
          <el-table 
            :data="displayDetails"
            border 
            stripe 
            size="small"
            :scrollbar-always-on="true"
            :span-method="goldSpanMethod"
            style="width:100%;"
            max-height="500"
          >
            <el-table-column prop="seqNo" label="#" width="50" align="center" />
            <el-table-column prop="orderNo" label="订单号" width="130" fixed>
              <template #default="{ row }">
                <el-link type="primary" @click="viewOrder(row.orderId)">{{ row.orderNo }}</el-link>
              </template>
            </el-table-column>
            <el-table-column prop="productName" label="品名" min-width="120" />
            <el-table-column prop="customerName" label="客户" width="100" />
            <el-table-column prop="diamondLevel" label="钻石级别" width="100" align="center">
              <template #default="{ row }">{{ row.diamondLevel || '-' }}</template>
            </el-table-column>
            <el-table-column prop="orderDate" label="订单日期" width="100" align="center">
              <template #default="{ row }">{{ formatDate(row.orderDate) }}</template>
            </el-table-column>
            <el-table-column label="成色" width="105" align="center" class-name="gi-col">
              <template #default="{ row }">
                <span v-if="row.__gi">{{ row.__gi.purityName || row.color || '-' }}</span>
                <!-- ⭐ 老账单没有分色子表：回退到明细 color -->
                <span v-else>{{ row.purityLabel || row.color || '-' }}</span>
              </template>
            </el-table-column>
            <!-- ⭐ 颜色（K黄/K白/K红）排在成色之后；取 gemColor，color 存的是成色名不能当颜色用 -->
            <el-table-column prop="gemColor" label="颜色" width="70" align="center">
              <template #default="{ row }">{{ resolveGemColor(row) || '-' }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="件数" width="60" align="center" />
            <el-table-column prop="size" label="手寸/长度" width="90" align="center">
              <template #default="{ row }">{{ row.size || '-' }}</template>
            </el-table-column>
            <el-table-column prop="totalWeight" label="总重" width="80" align="right">
              <template #default="{ row }">{{ row.totalWeight || '-' }}</template>
            </el-table-column>
            <el-table-column prop="netWeight" label="净重" width="80" align="right" class-name="gi-col">
              <template #default="{ row }">{{ fmtG(gv(row, 'netWeight')) }}</template>
            </el-table-column>
            <el-table-column prop="lossRate" label="损耗" width="70" align="right" class-name="gi-col">
              <template #default="{ row }">{{ numOrDash(gv(row, 'lossRate')) }}</template>
            </el-table-column>
            <el-table-column prop="addLossWeight" label="加耗重" width="80" align="right" class-name="gi-col">
              <template #default="{ row }">{{ fmtG(gv(row, 'addLossWeight')) }}</template>
            </el-table-column>
            <el-table-column prop="goldPrice" label="金价" width="80" align="right" class-name="gi-col">
              <template #default="{ row }">{{ numOrDash(gv(row, 'goldPrice')) }}</template>
            </el-table-column>
            <el-table-column prop="goldMaterialFee" label="足金料金额" width="100" align="right" class-name="gi-col">
              <template #default="{ row }">{{ fmtM(gv(row, 'goldMaterialFee')) }}</template>
            </el-table-column>
            <el-table-column prop="goldMaterialWeight" label="足金料" width="100" align="center" class-name="gi-col">
              <template #default="{ row }">
                <span style="color:#67C23A;font-size:12px;">{{ fmtG(gv(row, 'goldMaterialWeight')) }}g</span>
              </template>
            </el-table-column>

            <!-- 主石 -->
            <el-table-column label="主石" align="center">
              <el-table-column prop="mainStoneQty" label="粒数" width="55" align="center">
                <template #default="{ row }">{{ row.mainStoneQty || 0 }}</template>
              </el-table-column>
              <el-table-column prop="mainStoneWeight" label="石重(ct)" width="85" align="right">
                <template #default="{ row }">{{ row.mainStoneWeight || '-' }}</template>
              </el-table-column>
              <el-table-column prop="mainStonePrice" label="单价" width="85" align="right">
                <template #default="{ row }">{{ row.mainStonePrice || '-' }}</template>
              </el-table-column>
              <el-table-column prop="mainStoneAmount" label="金额" width="95" align="right">
                <template #default="{ row }">{{ row.mainStoneAmount || '-' }}</template>
              </el-table-column>
              <el-table-column prop="mainStoneSettingFee" label="镶石工费" width="90" align="right">
                <template #default="{ row }">{{ row.mainStoneSettingFee || '-' }}</template>
              </el-table-column>
            </el-table-column>

            <!-- 副石 -->
            <el-table-column label="副石" align="center">
              <el-table-column prop="subStoneQty" label="粒数" width="55" align="center">
                <template #default="{ row }">{{ row.subStoneQty || 0 }}</template>
              </el-table-column>
              <el-table-column prop="subStoneWeight" label="石重(ct)" width="85" align="right">
                <template #default="{ row }">{{ row.subStoneWeight || '-' }}</template>
              </el-table-column>
              <el-table-column prop="subStonePrice" label="单价" width="85" align="right">
                <template #default="{ row }">{{ row.subStonePrice || '-' }}</template>
              </el-table-column>
              <el-table-column prop="subStoneAmount" label="金额" width="95" align="right">
                <template #default="{ row }">{{ row.subStoneAmount || '-' }}</template>
              </el-table-column>
              <el-table-column prop="subStoneSettingFee" label="镶石工费" width="90" align="right">
                <template #default="{ row }">{{ row.subStoneSettingFee || '-' }}</template>
              </el-table-column>
            </el-table-column>

            <el-table-column label="包装证书邮费" width="110" align="right">
              <template #default="{ row }">
                {{ ((row.packingFee || 0) + (row.certificateFee || 0) + (row.postageFee || 0)).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="moldFee" label="版费" width="80" align="right">
              <template #default="{ row }">{{ row.moldFee || '-' }}</template>
            </el-table-column>
            <el-table-column prop="laborFee" label="工费" width="80" align="right">
              <template #default="{ row }">{{ row.laborFee || '-' }}</template>
            </el-table-column>
            <el-table-column label="应收金额" width="110" align="right" fixed="right">
              <template #default="{ row }">
                <span style="color:#E6A23C;font-weight:bold;font-size:14px;">
                  ¥{{ (row.totalAmount || 0).toFixed(2) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="退回" width="150" align="center" fixed="right">
              <template #default="{ row }">
                <el-tag v-if="row.isReturned" :type="row.returnType === 'full' ? 'danger' : 'warning'" size="small">
                  {{ returnTypeText(row.returnType) }}
                </el-tag>
                <el-tag v-else-if="pendingReturnOf(row)" type="info" size="small">退回中</el-tag>
                <span v-else style="color:#ccc;">-</span>
                <div v-if="row.returnNote || pendingReturnOf(row)?.customerNote" class="return-note">
                  {{ row.returnNote || pendingReturnOf(row)?.customerNote }}
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 底部合计 -->
        <div class="table-footer">
          <span>合计件数：<b>{{ billData?.totalQuantity || 0 }}</b></span>
          <span>总重：<b>{{ totalWeightSum.toFixed(3) }}</b></span>
          <span>净重：<b>{{ netWeightSum.toFixed(3) }}</b></span>
          <span>足金料合计：<b>¥{{ goldMaterialSum.toFixed(2) }}</b></span>
          <span>工费合计：<b>¥{{ laborFeeSum.toFixed(2) }}</b></span>
          <span style="color:#E6A23C;font-size:16px;font-weight:bold;">
            应收合计：¥{{ (billData?.totalAmount || 0).toFixed(2) }}
          </span>
        </div>

        <!-- ===== 修改记录（明细表下方，标红；工厂审核员重点核对） ===== -->
        <BillModifyTrail
          v-if="canSeeModifyTrail"
          :bill-id="billId"
          :details="billData?.details || []"
        />
      </div>

      <!-- ===== 4. 汇总区 ===== -->
      <div class="summary-section">
        <div class="section-title">
          <span class="title-icon">📊</span> 汇总
        </div>

        <el-row :gutter="20">
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">上单欠足料</span>
              <span class="value">{{ (billData?.lastDebtMaterial || 0).toFixed(3) }}g</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">本单应收足料</span>
              <span class="value" style="color:#E6A23C;font-weight:bold;">
                {{ (billData?.currentMaterialWeight || 0).toFixed(3) }}g
              </span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">来足料重</span>
              <span v-if="userStore.isFactoryOrder && billData?.status === 'pending'" class="value">
                <el-input-number
                  v-model="billData.receivedMaterial"
                  :precision="3"
                  :min="0"
                  size="small"
                  style="width:100px;"
                  @change="handleUpdatePayment"
                />
                <span style="margin-left:4px;color:#999;font-size:12px;">g</span>
              </span>
              <span v-else class="value">{{ (billData?.receivedMaterial || 0).toFixed(3) }}g</span>
              <!-- ⭐ 收款/抵扣勾选行 = 已用现金买下的金料，直接在来料里标「现金付款」 -->
              <span v-if="(billData?.settledMaterialWeight || 0) > 0" class="value-sub">
                其中现金付款 {{ (billData.settledMaterialWeight).toFixed(3) }}g
              </span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">累欠足金料</span>
              <span class="value" :style="{ 
                color: (billData?.totalDebtMaterial || 0) > 0 ? '#F56C6C' : '#67C23A', 
                fontWeight: 'bold' 
              }">
                {{ (billData?.totalDebtMaterial || 0).toFixed(3) }}g
              </span>
            </div>
          </el-col>
        </el-row>

        <el-row :gutter="20" style="margin-top:10px;">
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">上单欠款</span>
              <span class="value">¥{{ (billData?.lastDebtMoney || 0).toFixed(2) }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">本单应收款</span>
              <span class="value" style="color:#E6A23C;font-weight:bold;">
                ¥{{ (billData?.currentMoney || 0).toFixed(2) }}
              </span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">来款金额</span>
              <span v-if="userStore.isFactoryOrder && billData?.status === 'pending'" class="value">
                <el-input-number
                  v-model="billData.receivedMoney"
                  :precision="2"
                  :min="0"
                  size="small"
                  style="width:110px;"
                  @change="handleUpdatePayment"
                />
              </span>
              <span v-else class="value">¥{{ (billData?.receivedMoney || 0).toFixed(2) }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">累计欠款</span>
              <span class="value" :style="{ 
                color: (billData?.totalDebtMoney || 0) > 0 ? '#F56C6C' : '#67C23A', 
                fontWeight: 'bold' 
              }">
                ¥{{ (billData?.totalDebtMoney || 0).toFixed(2) }}
              </span>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- ===== 5. 底部说明 ===== -->
      <div class="footer-section">
        <div class="footer-notice">
          <p>📌 注：为了保证您的利益，请将以上产品送当地部门检测，如发现成色不足等问题，请立即与我司联系，未经质检部门检测而进行销售，发生一切纠纷后果与我司无关，谢谢合作！</p>
        </div>
      </div>

      <!-- ===== 6. 修改记录（账单确认后的字段级变更日志） ===== -->
      <ChangeLogTimeline
        :source-type="'bill'"
        :source-id="billId"
        :field-labels="BILL_FIELD_LABELS"
        :exclude-actions="['edit']"
      />
    </div>

    <!-- ===== 退回弹窗（客户：只标注要退哪些，方式由工厂定） ===== -->
    <el-dialog v-model="returnDialogVisible" title="申请退回" width="820px" destroy-on-close>
      <el-alert
        title="勾选要退回的明细，逐行写明原因。提交后由工厂确认退回方式并审核，审核通过才改账单金额。"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom:16px;"
      />

      <el-table
        :data="returnableDetails"
        border
        stripe
        @selection-change="handleReturnSelection"
        max-height="320"
        size="small"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="seqNo" label="#" width="46" align="center" />
        <el-table-column prop="productName" label="品名" min-width="120" />
        <el-table-column label="工费" width="90" align="right">
          <template #default="{ row }">¥{{ (row.laborFee || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="应收" width="110" align="right">
          <template #default="{ row }">¥{{ (row.totalAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="退回说明（哪个要退 / 为什么）" min-width="240">
          <template #default="{ row }">
            <el-input
              v-model="returnNotes[row.id]"
              size="small"
              :disabled="!isSelected(row)"
              placeholder="例如：这条链子焊点发黑，要退"
            />
          </template>
        </el-table-column>
      </el-table>

      <el-form style="margin-top:16px;">
        <el-form-item label="退回原因" required>
          <el-input v-model="returnForm.reason" type="textarea" :rows="3" placeholder="请填写退回原因（客户会看到）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="returnDialogVisible = false">取消</el-button>
        <el-button
          type="danger"
          @click="confirmReturn"
          :loading="returning"
          :disabled="returnSelected.length === 0 || !returnForm.reason.trim()"
        >
          提交退回 ({{ returnSelected.length }})
        </el-button>
      </template>
    </el-dialog>

    <!-- ===== 处理退回弹窗（工厂操作员：定方式 + 损耗） ===== -->
    <el-dialog v-model="handleDialogVisible" title="处理客户退回" width="980px" destroy-on-close>
      <el-alert
        title="与客户口头确认后选择退回方式。三种方式的区别：全退（材料+工费都不收）／退料留工费（只收工费，损耗也不收）／退料留工费+损耗（收工费，损耗照收）。提交后需工厂审核，审核通过才改账单金额。"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom:14px;"
      />

      <div class="handle-quick">
        <span class="hq-label">整单套用：</span>
        <el-button size="small" type="danger" plain @click="applyHandleType('full')">全部全退</el-button>
        <el-button size="small" type="warning" plain @click="applyHandleType('labor')">全部退料留工费</el-button>
        <el-button size="small" type="primary" plain @click="applyHandleType('labor_loss')">全部退料留工费+损耗</el-button>
      </div>

      <el-table :data="handleRows" border stripe size="small" max-height="380">
        <el-table-column prop="seqNo" label="#" width="46" align="center" />
        <el-table-column prop="productName" label="品名" min-width="110" />
        <el-table-column label="应收" width="100" align="right">
          <template #default="{ row }">¥{{ fmt2(row.totalAmount) }}</template>
        </el-table-column>
        <el-table-column label="工费" width="90" align="right">
          <template #default="{ row }">¥{{ fmt2(row.laborFee) }}</template>
        </el-table-column>
        <el-table-column label="损耗(金料)" width="120" align="right">
          <template #default="{ row }">
            <div>¥{{ fmt2(lossBaseOf(row)) }}</div>
            <div class="cell-sub">{{ fmt2(row.goldMaterialWeight) }}g 足金</div>
          </template>
        </el-table-column>
        <el-table-column label="退回方式" width="200">
          <template #default="{ row }">
            <el-radio-group v-model="row.returnType" size="small">
              <el-radio-button value="full">全退</el-radio-button>
              <el-radio-button value="labor">留工费</el-radio-button>
              <el-radio-button value="labor_loss">留工费+损耗</el-radio-button>
            </el-radio-group>
          </template>
        </el-table-column>
        <el-table-column label="保留损耗" width="130" align="right">
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
        <el-table-column label="本次退回" width="110" align="right">
          <template #default="{ row }">
            <b style="color:#d64545;">¥{{ fmt2(handleReturnAmount(row)) }}</b>
          </template>
        </el-table-column>
        <el-table-column label="处理后应收" width="110" align="right">
          <template #default="{ row }">
            <b>¥{{ fmt2(handleKeepAmount(row)) }}</b>
          </template>
        </el-table-column>
        <el-table-column label="客户说明" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.customerNote || '—' }}</template>
        </el-table-column>
      </el-table>

      <el-form style="margin-top:14px;">
        <el-form-item label="处理备注" required>
          <el-input v-model="handleRemark" type="textarea" :rows="2"
            placeholder="必填：例如已与客户电话确认，客户同意按此方式退回" />
          <div v-if="!handleRemark.trim()" class="handle-remark-tip">处理备注必须填写，提交后会显示在账单记录里</div>
        </el-form-item>
      </el-form>

      <div class="handle-sum">
        合计退回 <b style="color:#d64545;">¥{{ fmt2(handleTotals.returned) }}</b>
        <span class="dot">·</span>
        处理后本单应收 <b>¥{{ fmt2(handleTotals.keep) }}</b>
      </div>

      <template #footer>
        <el-button @click="handleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmHandle" :loading="handling"
          :disabled="!handleRemark.trim()">提交审核</el-button>
      </template>
    </el-dialog>

    <!-- ===== 出货明细预览（与主页明细样式一致） ===== -->
    <BillPreviewDialog
      v-model:visible="previewVisible"
      :bill-data="billData"
      :details="billData?.details || []"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox,ElLoading } from 'element-plus';
import { 
  ArrowLeft, Check, Close, Select, RefreshLeft, Upload, Download,
  Document, User, Money, Goods, View, EditPen
} from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { 
  getBillDetail, 
  auditBill, 
  confirmBill, 
  customerAuditBill,
  requestBillReturn,
  handleBillReturn,
  updatePayment, 
  exportBill,
  submitBillAudit,
  auditReturn
} from '@/api/bill';
import FlowLog from '@/components/FlowLog.vue';
import ChangeLogTimeline from '@/components/ChangeLogTimeline.vue';
import BillPreviewDialog from '@/components/BillPreviewDialog.vue';
import BillModifyTrail from '@/components/BillModifyTrail.vue';
import { resolveGemColor } from '@/utils/color';
import { expandGoldDetails, goldSpanMethod } from '@/utils/goldRows';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const billId = computed(() => Number(route.params.id));

// ⭐ 明细修改记录只给工厂侧看（客户侧不暴露内部改价痕迹）
const canSeeModifyTrail = computed(() =>
  userStore.isFactoryOrder || userStore.isFactoryAudit || userStore.isAdmin
);

// 字段标签：与后端 ChangeLogHelper.BillFieldLabels 对应
const BILL_FIELD_LABELS = {
  totalAmount: '总金额', totalQuantity: '总数量', currentMaterial: '应收足料',
  currentMoney: '应收款', receivedMaterial: '来料量', receivedMoney: '来款金额',
  totalDebtMaterial: '累欠足料', totalDebtMoney: '累欠款', totalWeight: '总重',
  netWeight: '净重', lossRate: '损耗率', addLossWeight: '加耗重',
  goldMaterialWeight: '足金料克重', goldMaterialFee: '足金料金额', goldPrice: '金价',
  mainStoneAmount: '主石金额', mainStoneSettingFee: '主石镶石工费',
  subStoneAmount: '副石金额', subStoneSettingFee: '副石镶石工费',
  packingFee: '包装费', certificateFee: '证书费', postageFee: '邮费',
  moldFee: '版费', laborFee: '工费',
};

const loading = ref(false);
const auditing = ref(false);
const confirming = ref(false);
const customerAuditing = ref(false);
const returning = ref(false);
const returnAuditing = ref(false);
const submitting = ref(false);
const billData = ref(null);

// ⭐ 收款情况（客户也能看到，工厂录入后同步）
const _r2 = (v) => Math.round(Number(v || 0) * 100) / 100;
const _receiptRows = computed(() => (billData.value?.details || []).filter(d => d.id != null));
const receiptReceivable = computed(() => Math.round(_receiptRows.value.reduce((s, d) => s + Number(d.totalAmount || 0), 0)));
const receiptPaid = computed(() => _r2(_receiptRows.value.reduce(
  (s, d) => s + (d.isOffset ? 0 : Number(d.actualReceipt || 0)), 0)));
const receiptOffset = computed(() => _r2(_receiptRows.value.reduce(
  (s, d) => s + (d.isOffset ? Number(d.offsetAmount || 0) : 0), 0)));
const receiptUnpaid = computed(() => Math.max(0, _r2(receiptReceivable.value - receiptPaid.value - receiptOffset.value)));
const showReceiptInfo = computed(() => userStore.isCustomerType
  || receiptPaid.value > 0 || receiptOffset.value > 0
  || (!!billData.value?.receiptStatus && billData.value.receiptStatus !== 'none'));
const previewVisible = ref(false);   // 出货明细预览弹窗
const returnDialogVisible = ref(false);
const returnSelected = ref([]);
const returnForm = ref({ reason: '' });
// 逐行退回说明：{ [detailId]: note }
const returnNotes = ref({});
// 可退回明细（必须用 computed 保持数组引用稳定，否则勾选会被表格重置）
const returnableDetails = computed(() =>
  (billData.value?.details || []).filter(d => !d.isReturned)
);

// ⭐ 工厂处理退回
const handleDialogVisible = ref(false);
const handleRows = ref([]);
const handleRemark = ref('');
const handling = ref(false);

// ===== 汇总计算 =====
const totalWeightSum = computed(() => {
  return (billData.value?.details || []).reduce((sum, d) => sum + (d.totalWeight || 0), 0);
});

const netWeightSum = computed(() => {
  return (billData.value?.details || []).reduce((sum, d) => sum + (d.netWeight || 0), 0);
});

const goldMaterialSum = computed(() => {
  // 已退回明细不参与合计（与"应收合计"口径一致）
  return (billData.value?.details || [])
    .filter(d => !d.isReturned)
    .reduce((sum, d) => sum + (d.goldMaterialFee || 0), 0);
});

const laborFeeSum = computed(() => {
  return (billData.value?.details || []).reduce((sum, d) => sum + (d.laborFee || 0), 0);
});

// ===== ⭐ 退回流程（审核通过前金额不变，只做预估展示） =====
const isReturnFlow = computed(() => ['returnRequested', 'returnPending'].includes(billData.value?.status));

const activeReturnRecords = computed(() =>
  (billData.value?.returnRecords || []).filter(r => ['requested', 'pending'].includes(r.status))
);

const pendingReturnTotal = computed(() =>
  activeReturnRecords.value.reduce((s, r) => s + Number(r.returnAmount || 0), 0)
);

const pendingReceivable = computed(() =>
  Math.max(0, Number(billData.value?.totalAmount || 0) - pendingReturnTotal.value)
);

// ===== 状态映射 =====
const statusMap = {
  pending: { text: '待提交审核', type: 'info' },
  billPending: { text: '审核中', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  returned: { text: '退回待审批', type: 'danger' },
  billConfirmed: { text: '待客户审核', type: 'warning' },
  customerApproved: { text: '待业务确认', type: 'primary' },
  returnRequested: { text: '客户退回待处理', type: 'danger' },
  returnPending: { text: '退回待审核', type: 'warning' },
  confirmed: { text: '已完成', type: 'success' },
};

// 流程状态映射
const flowStatusMap = {
  draft: { text: '草稿', type: 'info' },
  pending: { text: '待客户审核', type: 'warning' },
  customerAudited: { text: '客户已审核', type: 'success' },
  factory_edit: { text: '工厂编辑中', type: 'primary' },
  polishing: { text: '制作完成', type: 'primary' },
  billPending: { text: '账单待审核', type: 'warning' },
  billConfirmed: { text: '待客户审核', type: 'warning' },
  customerApproved: { text: '待业务确认', type: 'primary' },
  completed: { text: '已完成', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  cancelled: { text: '已取消', type: 'info' },
};

const getStatusText = (s) => statusMap[s]?.text || s || '-';
const getStatusType = (s) => statusMap[s]?.type || 'info';
const getFlowStatusText = (s) => flowStatusMap[s]?.text || s || '-';
const getFlowStatusType = (s) => flowStatusMap[s]?.type || 'info';

// ============================================================
// 加载数据
// ============================================================
const loadData = async () => {
  if (!billId.value) return;
  loading.value = true;
  try {
    const res = await getBillDetail(billId.value);
    billData.value = res?.data;
    
    // ⭐ 从订单获取 flowStatus（如果后端没有直接返回）
    if (billData.value?.orders && billData.value.orders.length > 0) {
      billData.value.flowStatus = billData.value.orders[0]?.flowStatus || billData.value.flowStatus;
    }
    
    if (!billData.value) {
      ElMessage.error('账单不存在');
      router.back();
    }
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// ============================================================
// 提交审核（工厂业务员）
// ============================================================
const handleSubmitAudit = async () => {
  try {
    await ElMessageBox.confirm(
      '确定提交账单审核吗？提交后不可再编辑。',
      '提交审核',
      { type: 'info' }
    );
  } catch { return; }

  submitting.value = true;
  try {
    await submitBillAudit(billId.value);
    ElMessage.success('提交审核成功');
    loadData();
  } catch {
    ElMessage.error('提交失败');
  } finally {
    submitting.value = false;
  }
};

// ============================================================
// 审核（工厂审核员）
// ============================================================
const handleAudit = async (approved) => {
  try {
    await ElMessageBox.confirm(
      approved ? '确定审核通过该账单吗？' : '确定驳回该账单吗？',
      '审核确认',
      { type: approved ? 'info' : 'warning' }
    );
  } catch { return; }

  auditing.value = true;
  try {
    await auditBill(billId.value, { approved });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    loadData();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    auditing.value = false;
  }
};

// ============================================================
// 客户审核员审核通过（billConfirmed → customerApproved）
// ============================================================
const handleCustomerAudit = async () => {
  try {
    await ElMessageBox.confirm(
      '审核通过后业务员才能看到这张账单并确认，确定通过吗？核对有问题请用「退回」。',
      '审核账单',
      { type: 'info', confirmButtonText: '审核通过', cancelButtonText: '再看看' }
    );
  } catch { return; }

  customerAuditing.value = true;
  try {
    const res = await customerAuditBill(billId.value);
    ElMessage.success(res?.message || '已审核通过，等待业务员确认');
    loadData();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '审核失败');
  } finally {
    customerAuditing.value = false;
  }
};

// 当前角色能否退回：审核员退 billConfirmed，业务员退 customerApproved
const canCustomerReturn = computed(() => {
  const s = billData.value?.status;
  if (userStore.isAdmin) return s === 'billConfirmed' || s === 'customerApproved';
  if (userStore.isCustomerAudit) return s === 'billConfirmed';
  if (userStore.isCustomer) return s === 'customerApproved';
  return false;
});

// ============================================================
// 客户确认（业务员最终确认）
// ============================================================
const handleConfirm = async () => {
  try {
    await ElMessageBox.confirm('确认账单无误吗？确认后订单将完成。', '确认账单', { type: 'info' });
  } catch { return; }

  confirming.value = true;
  try {
    await confirmBill(billId.value);
    ElMessage.success('账单已确认，订单已完成');
    loadData();
  } catch {
    ElMessage.error('确认失败');
  } finally {
    confirming.value = false;
  }
};

// ============================================================
// 客户退回（下单员 / 审核员）：只勾明细 + 写说明，方式由工厂定
// ============================================================
const openReturnDialog = () => {
  const availableItems = (billData.value?.details || []).filter(d => !d.isReturned);
  if (availableItems.length === 0) {
    ElMessage.warning('没有可退回的明细');
    return;
  }
  returnSelected.value = [];
  returnForm.value = { reason: '' };
  returnNotes.value = {};
  returnDialogVisible.value = true;
};

const handleReturnSelection = (selection) => {
  returnSelected.value = selection;
};

// 某明细是否被选中退回
const isSelected = (row) => {
  return returnSelected.value.some(s => s.id === row.id);
};

const confirmReturn = async () => {
  if (returnSelected.value.length === 0) {
    ElMessage.warning('请至少选择一个明细');
    return;
  }
  if (!returnForm.value.reason.trim()) {
    ElMessage.warning('请填写退回原因');
    return;
  }

  returning.value = true;
  try {
    await requestBillReturn(billId.value, {
      reason: returnForm.value.reason.trim(),
      items: returnSelected.value.map(d => ({
        detailId: d.id,
        note: (returnNotes.value[d.id] || '').trim(),
      })),
    });
    ElMessage.success('退回申请已提交，等待工厂处理');
    returnDialogVisible.value = false;
    loadData();
  } catch (e) {
    ElMessage.error(e?.message || '退回失败');
  } finally {
    returning.value = false;
  }
};

// ============================================================
// 工厂操作员：处理退回（三种方式 + 保留损耗）
// ============================================================
const fmt2 = (v) => (Number(v) || 0).toFixed(2);

// ===== 多成色：一条明细展开成 N 行（每种成色一行，其余列合并） =====
const displayDetails = computed(() => expandGoldDetails(billData.value?.details || []));

// 取当前成色段的值；单色（没有 __gi）回退到行上的汇总值
const gv = (row, key) => {
  const it = row.__gi;
  if (!it) return row[key];
  const map = {
    netWeight: 'netWeight',
    lossRate: 'lossRate',
    addLossWeight: 'addLossWeight',
    goldPrice: 'goldPrice',
    goldMaterialFee: 'amount',
    goldMaterialWeight: 'foldWeight'
  };
  return it[map[key]];
};
const fmtG = (v) => Number(v || 0).toFixed(2);
const fmtM = (v) => Number(v || 0).toFixed(2);
const numOrDash = (v) => (Number(v) > 0 ? Number(v) : '-');

const returnTypeText = (t) => ({
  full: '全部退回',
  labor: '退料留工费',
  labor_loss: '退料留工费+损耗',
}[t] || '已退回');

// 明细上的「退回中」记录（客户已申请 / 工厂已定方式待审核）
const pendingReturnOf = (row) => (billData.value?.returnRecords || [])
  .find(r => r.detailId === row.id && ['requested', 'pending'].includes(r.status));

// 损耗基数 = 该行金料金额（净重×损耗率×折算率×金价）
const lossBaseOf = (row) => Number(row.goldMaterialFee || 0);

const openHandleDialog = () => {
  const details = billData.value?.details || [];
  handleRows.value = (billData.value?.returnRecords || [])
    .filter(r => r.status === 'requested')
    .map(r => {
      const d = details.find(x => x.id === r.detailId) || {};
      return {
        detailId: r.detailId,
        recordId: r.id,
        seqNo: d.seqNo || '',
        productName: r.productName || d.productName || '',
        totalAmount: Number(d.totalAmount || 0),
        laborFee: Number(d.laborFee || 0),
        goldMaterialFee: Number(d.goldMaterialFee || 0),
        goldMaterialWeight: Number(d.goldMaterialWeight || 0),
        customerNote: r.customerNote || '',
        returnType: 'labor',
        lossAmount: Number(d.goldMaterialFee || 0),
      };
    })
    // 按明细顺序排（退回记录是倒序返回的）
    .sort((a, b) => Number(a.seqNo || 0) - Number(b.seqNo || 0));
  if (handleRows.value.length === 0) {
    ElMessage.warning('没有待处理的退回明细');
    return;
  }
  handleRemark.value = '';
  handleDialogVisible.value = true;
};

const applyHandleType = (type) => {
  handleRows.value.forEach(r => {
    r.returnType = type;
    if (type === 'labor_loss' && (r.lossAmount === null || r.lossAmount === undefined)) {
      r.lossAmount = lossBaseOf(r);
    }
  });
};

// 本次退回金额
const handleReturnAmount = (row) => {
  const total = Number(row.totalAmount || 0);
  const labor = Number(row.laborFee || 0);
  if (row.returnType === 'full') return total;
  if (row.returnType === 'labor') return Math.max(0, total - labor);
  return Math.max(0, total - labor - Number(row.lossAmount || 0));
};

// 处理后该行应收
const handleKeepAmount = (row) => Math.max(0, Number(row.totalAmount || 0) - handleReturnAmount(row));

const handleTotals = computed(() => {
  const returned = handleRows.value.reduce((s, r) => s + handleReturnAmount(r), 0);
  const keep = handleRows.value.reduce((s, r) => s + handleKeepAmount(r), 0);
  return { returned, keep };
});

const confirmHandle = async () => {
  if (handleRows.value.length === 0) return;
  // ⭐ 退回处理备注必填：写清与客户确认的情况，审核员据此判断
  if (!handleRemark.value.trim()) {
    ElMessage.warning('请填写处理备注');
    return;
  }
  handling.value = true;
  try {
    await handleBillReturn(billId.value, {
      remark: handleRemark.value.trim(),
      items: handleRows.value.map(r => ({
        detailId: r.detailId,
        returnType: r.returnType,
        lossAmount: r.returnType === 'labor_loss' ? Number(r.lossAmount || 0) : null,
      })),
    });
    ElMessage.success('退回方式已提交，等待审核');
    handleDialogVisible.value = false;
    loadData();
  } catch (e) {
    ElMessage.error(e?.message || '提交失败');
  } finally {
    handling.value = false;
  }
};

// ============================================================
// 审批退回（工厂审核员）
// ============================================================
const handleReturnAudit = async (approved) => {
  try {
    await ElMessageBox.confirm(
      approved
        ? '确定通过退回吗？通过后账单金额会按退回方式重算，并回到客户确认。'
        : '确定驳回退回吗？驳回后由工厂操作员重新选择退回方式。',
      '退回审批',
      { type: approved ? 'info' : 'warning' }
    );
  } catch { return; }

  returnAuditing.value = true;
  try {
    await auditReturn(billId.value, { approved });
    ElMessage.success(approved ? '已同意退回，订单完成' : '已拒绝退回');
    loadData();
  } catch {
    ElMessage.error('操作失败');
  } finally {
    returnAuditing.value = false;
  }
};

// ============================================================
// 查看订单
// ============================================================
const viewOrder = (id) => {
  router.push(`/order/detail/${id}`);
};

// ============================================================
// 导出（使用原生 fetch，绕过 axios）
// ============================================================
const handleExport = async () => {
  if (!billId.value) {
    ElMessage.warning('账单ID无效');
    return;
  }

  const loading = ElLoading.service({
    fullscreen: true,
    text: '正在导出...',
    background: 'rgba(0, 0, 0, 0.7)'
  });

  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/bill/export/${billId.value}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

    loading.close();

    // 检查响应状态
    if (!response.ok) {
      // 尝试读取错误信息
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        ElMessage.error(json.message || `导出失败：${response.status}`);
      } catch {
        ElMessage.error(`导出失败：${response.status}`);
      }
      return;
    }

    // 获取 Blob
    const blob = await response.blob();
    
    // 检查 Blob
    if (!blob || blob.size === 0) {
      ElMessage.error('导出失败：文件为空');
      return;
    }

    // 检查是否是 JSON 错误（后端可能返回了错误信息）
    if (blob.type === 'application/json') {
      const text = await blob.text();
      try {
        const json = JSON.parse(text);
        ElMessage.error(json.message || '导出失败');
        return;
      } catch {
        // 不是 JSON，继续下载
      }
    }

    // 获取文件名（从 Content-Disposition 头）
    const contentDisposition = response.headers.get('content-disposition');
    let fileName = `出货明细_${billData.value?.billNo || billId.value}.xlsx`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match) {
        fileName = decodeURIComponent(match[1].replace(/['"]/g, ''));
      }
    }

    // 下载
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 10000);
    
    ElMessage.success('导出成功');
  } catch (error) {
    loading.close();
    console.error('导出失败:', error);
    ElMessage.error(error.message || '导出失败，请重试');
  }
};
// ============================================================
// 更新来料/来款
// ============================================================
const handleUpdatePayment = async () => {
  if (!billData.value) return;
  try {
    await updatePayment(billId.value, {
      receivedMaterial: billData.value.receivedMaterial || 0,
      receivedMoney: billData.value.receivedMoney || 0,
    });
    ElMessage.success('更新成功');
  } catch {
    ElMessage.error('更新失败');
    loadData();
  }
};

// ============================================================
// 返回
// ============================================================
const goBack = () => {
  router.back();
};

// ============================================================
// 时间格式化
// ============================================================
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ============================================================
// 初始化
// ============================================================
onMounted(async () => {
  await loadData();
  // ⭐ 从「我的账单」点退回进来，直接打开退回弹窗
  if (route.query.return === '1' && userStore.isCustomerType
      && ['billConfirmed', 'customerApproved'].includes(billData.value?.status)) {
    openReturnDialog();
  }
});
</script>

<style scoped>
/* ===== 页面容器 ===== */
.page-container {
  background: #f0f4f9;
  padding: 16px;
  min-height: 100vh;
}

/* ===== 页面头部 ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 16px 24px;
  border-radius: 12px 12px 0 0;
  flex-wrap: wrap;
  gap: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.header-left h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #1d2129;
}
.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

/* ===== 内容主体 ===== */
.content-body {
  background: #fff;
  border-radius: 0 0 12px 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

/* ===== 概览卡片 ===== */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
@media (max-width: 768px) {
  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #f8faff;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid #e8f0fe;
  transition: all 0.2s;
}
.overview-card:hover {
  border-color: #c0d4f0;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.08);
}

.card-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.card-content {
  flex: 1;
  min-width: 0;
}
.card-label {
  font-size: 13px;
  color: #8a9aaa;
}
.card-value {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  margin-top: 2px;
  word-break: break-all;
}

/* ===== 区域标题 ===== */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  color: #1d2129;
  margin-bottom: 14px;
}
.title-icon {
  font-size: 16px;
}
.section-subtitle {
  font-weight: 400;
  font-size: 13px;
  color: #8a9aaa;
  margin-left: auto;
}

/* ===== 信息区域 ===== */
.info-section {
  margin-bottom: 4px;
}
.info-item {
  padding: 6px 0;
}
.info-item .label {
  display: block;
  font-size: 13px;
  color: #8a9aaa;
  margin-bottom: 2px;
}
.info-item .value {
  display: block;
  font-size: 14px;
  color: #1d2129;
  font-weight: 500;
  word-break: break-all;
}

/* ===== 表格区域 ===== */
.table-section {
  margin: 18px 0 4px;
}
.table-wrapper {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e8ecf1;
}
/* ⭐ 横向滚动条加高变蓝并常显，避免用户不知道能左右拉 */
.table-wrapper :deep(.el-scrollbar__bar.is-horizontal) {
  height: 14px;
  left: 0;
  right: 0;
  bottom: 0;
  background: #e8f1ff;
  border-top: 1px solid #c6dcff;
  border-radius: 0;
  opacity: 1;
}
.table-wrapper :deep(.el-scrollbar__bar.is-horizontal > div) {
  height: 100%;
  min-width: 60px;
  border-radius: 7px;
  background: #2f6fd0;
  opacity: 1;
  border: 2px solid #e8f1ff;
}
.table-wrapper :deep(.el-scrollbar__bar.is-horizontal > div:hover) {
  background: #1f5bb8;
  opacity: 1;
}
.table-wrapper :deep(.el-table__body-wrapper .el-scrollbar__view) {
  padding-bottom: 12px;
}
:deep(.el-table) {
  border-radius: 8px;
}
:deep(.el-table th) {
  background: #f5f8fc !important;
  color: #4a5a6a;
  font-weight: 600;
}
:deep(.el-table .cell) {
  padding: 4px 6px;
}
:deep(.el-table .table-row:hover) {
  background: #f5f9ff;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
  padding: 12px 18px;
  background: #f8faff;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 14px;
  flex-wrap: wrap;
  border: 1px solid #e8f0fe;
}
.table-footer b {
  color: #1d2129;
}

/* ===== 汇总区域 ===== */
.summary-section {
  margin: 18px 0 4px;
  padding: 16px 0;
  border-top: 1px solid #e8ecf1;
}
.summary-item {
  padding: 4px 0;
}
.summary-item .label {
  display: block;
  font-size: 13px;
  color: #8a9aaa;
  margin-bottom: 2px;
}
.summary-item .value {
  display: block;
  font-size: 15px;
  color: #1d2129;
  font-weight: 500;
}
/* ⭐ 已结算折足料说明（绿色＝已用现金结清，不再欠料） */
.summary-item .value-sub {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #1f9254;
}
.summary-item :deep(.el-input-number) {
  width: 100px;
}

/* ===== 底部说明 ===== */
.footer-section {
  margin: 18px 0 4px;
  padding-top: 16px;
  border-top: 1px solid #e8ecf1;
}
.footer-notice {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  padding: 12px 16px;
  background: #fafcff;
  border-radius: 8px;
  border: 1px solid #e8f0fe;
}
.footer-notice p {
  margin: 0;
}
.footer-signature {
  display: flex;
  justify-content: space-between;
  padding: 16px 0 10px 0;
  font-size: 14px;
  color: #303133;
}
.footer-signature span {
  flex: 1;
}
.footer-remark {
  font-size: 13px;
  color: #606266;
  padding-top: 10px;
  border-top: 1px dashed #e8ecf1;
}
.footer-remark p {
  margin: 0;
}
.footer-remark b {
  color: #E6A23C;
}

/* ===== 日志区域 ===== */
.log-section {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #e8ecf1;
}

/* ===== 退回流程 ===== */
.return-banner {
  margin-bottom: 14px;
}
.return-banner-body {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
}
.return-note {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
  line-height: 1.4;
  white-space: normal;
}

/* ===== 工厂处理退回 ===== */
.handle-quick {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.hq-label {
  font-size: 13px;
  color: #606266;
}
.cell-sub {
  font-size: 11px;
  color: #909399;
}
.handle-sum {
  margin-top: 12px;
  padding: 10px 14px;
  background: #f8faff;
  border: 1px solid #e8f0fe;
  border-radius: 8px;
  font-size: 14px;
  color: #303133;
}
.handle-sum .dot {
  margin: 0 10px;
  color: #c0c4cc;
}
.handle-remark-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #d64545;
}
.log-section :deep(.el-timeline) {
  padding-left: 8px;
}
.log-section :deep(.el-timeline-item) {
  padding-bottom: 12px;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .page-container {
    padding: 8px;
  }
  .content-body {
    padding: 12px 14px;
  }
  .page-header {
    padding: 12px 14px;
  }
  .footer-signature {
    flex-direction: column;
    gap: 8px;
  }
}
</style>