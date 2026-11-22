
<!-- src/views/order/factory-edit.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>{{ isView ? '📄 订单详情（只读）' : '✏️ 编辑订单' }}</h2>
        <el-tag type="primary" size="large">{{ orderData?.orderNo || '' }}</el-tag>
        <el-tag v-if="orderData?.flowStatus" :type="getStatusType(orderData.flowStatus)" size="large">
          {{ getStatusText(orderData.flowStatus) }}
        </el-tag>
        <!-- ⭐ 只读模式标记：内容与编辑页完全一致，只是不能改 -->
        <el-tag v-if="isView" type="info" size="large">只读查看</el-tag>
      </div>
    </div>

    <!-- ===== 整体内容区域 ===== -->
    <div class="content-body">
      <!-- ===== 订单信息 ===== -->
      <div class="info-section">
        <el-table :data="orderTableData" border size="small" class="detail-table">
          <el-table-column prop="orderNo" label="订单号" min-width="140" />
          <el-table-column prop="customerName" label="客户" min-width="120" />
          <el-table-column prop="productName" label="品名" min-width="140" />
          <el-table-column label="成色" min-width="140">
            <template #default="{ row }">
              <span class="color-dot" :style="{ background: currentPurityColor }"></span>
              {{ row.purityLabel || row.color || '-' }}
              <span v-if="!row.purityLabel" class="purity-rate">（折算率 {{ formatRate(currentPurityRate) }}）</span>
              <span v-else class="purity-rate">（多成色，折算率见下方金料明细）</span>
            </template>
          </el-table-column>
          <el-table-column label="颜色" width="90" align="center">
            <template #default="{ row }">{{ resolveGemColor(row) || '-' }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="80" align="center" />
          <el-table-column prop="size" label="手寸" width="90" align="center" />
          <el-table-column prop="weightRequirement" label="克重要求" min-width="110" align="center">
            <template #default="{ row }">{{ row.weightRequirement || '-' }}</template>
          </el-table-column>
          <el-table-column label="下单日期" width="120" align="center">
            <template #default="{ row }">{{ formatDate(row.orderDate) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.flowStatus)" size="small">{{ getStatusText(row.flowStatus) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="160">
            <template #default="{ row }">{{ row.remark || '-' }}</template>
          </el-table-column>
        </el-table>
      </div>

      <!-- ===== 工厂数据 ===== -->
      <div class="form-section">
        <div class="section-title">📊 工厂数据</div>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="4">
            <el-form-item label="总重(g)">
              <el-input-number v-model="orderData.totalWeight" :precision="2" :min="0" :disabled="isView" style="width:100%;" @change="calcFactory" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="净重(g)">
              <!-- ⭐ 单成色：净重就在这里填（与多成色上线前一致）；多成色时由明细汇总，只读 -->
              <el-input-number v-model="orderData.netWeight" :precision="2" :min="0" :disabled="isView || goldMulti" style="width:100%;" @change="calcFactory" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="损耗率">
              <!-- ⭐ 单成色：损耗率可选（旧版样式）；多成色时综合损耗由明细反算，只读 -->
              <el-select
                v-if="!goldMulti"
                v-model="orderData.lossRate"
                :class="{ 'loss-warning': !isStandardLoss }"
                :disabled="isView"
                style="width:100%;"
                @change="calcFactory"
              >
                <el-option v-for="item in lossRateOptions" :key="item.value" :value="item.value" :label="item.label" />
              </el-select>
              <el-input v-else v-model="lossText" disabled style="width:100%;" />
              <div
                v-if="!goldMulti && customerDefaultLoss > 0"
                class="loss-cust-tip"
                :title="`在「客户管理」里给该客户设置的默认损耗率，下单自动带出`"
              >
                客户默认 {{ Number(customerDefaultLoss).toFixed(2) }}
                <a
                  v-if="!isView && Number(orderData.lossRate) !== Number(customerDefaultLoss)"
                  @click="applyCustomerLoss"
                >用客户默认</a>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="加耗重">
              <el-input-number v-model="orderData.addLossWeight" :precision="2" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="金价(元/克)">
              <el-input-number v-model="orderData.goldPrice" :precision="2" :min="0" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="足金料克重(g)">
              <el-input-number v-model="orderData.goldMaterialWeight" :precision="2" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="4">
            <el-form-item label="足金料金额">
              <el-input-number v-model="orderData.goldMaterialFee" :precision="2" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ⭐ 金料明细：默认按单成色（净重/损耗在上方直接填，跟以前一样）；
             一件货有多种成色时才手动点「添加成色」展开明细表，成色逐段填 -->
        <GoldItemsEditor
          v-if="goldMulti"
          ref="goldEditor"
          v-model="goldItems"
          :purity-options="purityOptionList"
          :loss-rate-options="lossRateOptions"
          :default-gold-price="orderData.goldPrice || 0"
          :editable="!isView"
          :price-readonly="true"
          title="销售金料明细（多成色）"
          @change="onGoldChange"
        />
        <div v-else class="gold-mode-bar">
          <span class="gold-mode-tip">
            单成色：净重 / 损耗率 / 金价 → 加耗重 {{ fmtW(orderData.addLossWeight) }}g × 折算率
            {{ formatRate(currentPurityRate) }} → 足金料 {{ fmtW(orderData.goldMaterialWeight) }}g
          </span>
          <el-button v-if="!isView" type="primary" link size="small" @click="expandGoldMulti">+ 添加成色（展开明细）</el-button>
        </div>
        <!-- 展开后又删到只剩一种成色：给个收起的口子，回到单成色填写 -->
        <div v-if="goldMulti && goldItems.length <= 1 && !isView" class="gold-mode-bar is-collapse">
          <span class="gold-mode-tip">现在只有一种成色，可以收起明细，回到上方单成色填写</span>
          <el-button type="primary" link size="small" @click="collapseGoldMulti">收起为单成色</el-button>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- ===== 主石信息 ===== -->
      <div class="form-section">
        <div class="section-title stone-title">
          <span>💎 主石信息</span>
          <span class="stone-bring">
            <span class="stone-level">
              钻石级别：<b>{{ orderData?.diamondLevel || '未填' }}</b>
            </span>
            <el-button
              v-if="!isView"
              size="small"
              type="primary"
              plain
              :loading="diamondBringLoading"
              @click="handleBringDiamond"
            >
              带入历史钻石
            </el-button>
            <span v-if="!isView" class="stone-bring-hint" :class="{ 'is-ok': diamondBringOk }">{{ diamondBringHint }}</span>
          </span>
        </div>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="5">
            <el-form-item label="石重(ct)">
              <el-input-number v-model="orderData.mainStoneWeight" :precision="2" :min="0" :disabled="isView" style="width:100%;" @change="calcMainStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="单价(元)">
              <el-input-number v-model="orderData.mainStonePrice" :precision="2" :min="0" :disabled="isView" style="width:100%;" @change="calcMainStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="粒数">
              <el-input-number v-model="orderData.mainStoneQty" :min="0" :disabled="isView" style="width:100%;" @change="calcMainStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="镶石工费">
              <el-input-number v-model="orderData.mainStoneSettingFee" :precision="2" :min="0" :disabled="isView" style="width:100%;" @change="calcMainStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="金额(元)">
              <el-input-number v-model="orderData.mainStoneAmount" :precision="2" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <div class="section-divider"></div>

      <!-- ===== 副石信息 ===== -->
      <div class="form-section">
        <div class="section-title">💎 副石信息</div>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="5">
            <el-form-item label="石重(ct)">
              <el-input-number v-model="orderData.subStoneWeight" :precision="2" :min="0" :disabled="isView" style="width:100%;" @change="calcSubStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="单价(元)">
              <el-input-number v-model="orderData.subStonePrice" :precision="2" :min="0" :disabled="isView" style="width:100%;" @change="calcSubStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="粒数">
              <el-input-number v-model="orderData.subStoneQty" :min="0" :disabled="isView" style="width:100%;" @change="calcSubStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="镶石工费">
              <el-input-number v-model="orderData.subStoneSettingFee" :precision="2" :min="0" :disabled="isView" style="width:100%;" @change="calcSubStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="金额(元)">
              <el-input-number v-model="orderData.subStoneAmount" :precision="2" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <div class="section-divider"></div>

      <!-- ===== 其他费用 + 合计 ===== -->
      <div class="form-section">
        <div class="section-title">📦 其他费用</div>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="5">
            <el-form-item label="包装费">
              <el-input-number v-model="orderData.packingFee" :precision="2" :min="0" :disabled="isView" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="证书费">
              <el-input-number v-model="orderData.certificateFee" :precision="2" :min="0" :disabled="isView" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="邮费">
              <el-input-number v-model="orderData.postageFee" :precision="2" :min="0" :disabled="isView" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="版费">
              <el-input-number v-model="orderData.moldFee" :precision="2" :min="0" :disabled="isView" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="工费">
              <el-input-number v-model="orderData.laborFee" :precision="2" :min="0" :disabled="isView" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 合计金额：单独一行，与上面 5 列区分开 -->
        <el-row :gutter="16">
          <el-col :xs="24" :sm="5" :offset="19">
            <el-form-item label="合计金额">
              <el-tooltip placement="top" effect="dark">
                <template #content>
                  <div style="font-size:13px;line-height:1.8;">
                    合计 = 足金料金额 + 主石金额 + 副石金额 + 包装费 + 证书费 + 邮费 + 版费 + 工费<br>
                    合计金额四舍五入取整（不保留小数），其余金额保留两位<br><br>
                    <b>加耗重</b> = 净重 × 损耗<br>
                    <b>足金料克重</b> = 加耗重 × 成色折算率<br>
                    <b>足金料金额</b> = 足金料克重 × 金价<br>
                    <b>主石金额</b> = 石重 × 单价 + 粒数 × 镶石工费<br>
                    <b>副石金额</b> = 石重 × 单价 + 粒数 × 镶石工费
                  </div>
                </template>
                <el-input-number v-model="orderData.totalAmount" :precision="0" disabled style="width:100%;" />
              </el-tooltip>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <div class="section-divider"></div>

      <!-- ===== 成本数据（LR 成本行）：上面一行销售、下面一行成本 ===== -->
      <div class="form-section">
        <div class="section-title">
          <span>📊 成本数据（LR 成本行）</span>
          <span class="cost-subtitle">{{ isView ? '销售行（白底）与成本行（红底）全部只读' : '销售行（白底）只读 ｜ 成本行（红线下方、红底）可填；总重 / 金价由订单带出、不可修改' }}</span>
          <!-- ⭐ 复制单：成本要不要沿用复刻订单，由工厂在这里选（下单时不再选） -->
          <span v-if="copyInfo.isCopyOrder && !costHasData && !isView" class="copy-bring">
            <span class="copy-bring-label">从复刻订单带出</span>
            <el-switch v-model="copyInfo.bring" :loading="copyInfo.loading" @change="onCopyBringChange" />
            <span class="copy-bring-hint">
              来源单 {{ copyInfo.sourceOrderNo || '—' }}；{{ copyInfo.bring ? '只带钻石与工费，金重/损耗/金价按本单' : '成本默认与销售行一致' }}
            </span>
          </span>
          <el-tag v-if="costWarn" type="danger" effect="dark" size="small" style="margin-left:8px;">
            ❗ 成本高于销售
          </el-tag>
          <el-tag v-else-if="!costHasData" type="info" size="small" style="margin-left:8px;">
            {{ copyInfo.isCopyOrder && copyInfo.bring ? '成本未录入（已从复刻订单带入钻石与工费，保存后生效）' : '成本未录入（默认与销售一致）' }}
          </el-tag>
          <el-tag v-else type="success" size="small" style="margin-left:8px;">成本已录入</el-tag>
          <el-tag v-if="!orderEditable && !isView" type="warning" effect="plain" size="small" style="margin-left:8px;">
            订单当前状态不可改，保存仅更新成本
          </el-tag>
        </div>

        <el-table
          :data="costTableData"
          border
          size="small"
          class="cost-table"
          :row-class-name="costRowClassName"
          :span-method="costTableSpanMethod"
        >
          <el-table-column label="类型" width="96" fixed align="center">
            <template #default="{ row }">
              <el-tag v-if="row.__type === 'sale'" size="small" type="info">销售</el-tag>
              <span v-else class="cost-type-cell">
                <el-tooltip v-if="costWarn" :content="costWarnReason" placement="top">
                  <span class="cost-warn-icon">❗</span>
                </el-tooltip>
                <el-tag size="small" type="danger" effect="dark">成本</el-tag>
              </span>
            </template>
          </el-table-column>

          <el-table-column prop="quantity" label="件数" width="70" align="center">
            <template #default="{ row }">
              <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.quantity" size="small" :class="['cell-input', { 'cell-over': isOver('quantity') }]" @change="calcCost" />
              <span v-else>{{ row.quantity ?? '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="totalWeight" label="总重" width="85" align="center">
            <template #default="{ row }">
              <span :title="row.__type === 'cost' ? '由订单总重带出，不可修改' : ''">{{ fmtW(row.totalWeight) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="netWeight" label="净重" width="85" align="center">
            <template #default="{ row }">
              <!-- 多成色时净重由明细汇总，这里只读，避免两处打架 -->
              <el-input v-if="row.__type === 'cost' && !isView && !goldMulti" v-model.number="row.netWeight" size="small" :class="['cell-input', { 'cell-over': isOver('netWeight') }]" @change="calcCost" />
              <span v-else>{{ fmtW(row.netWeight) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="lossRate" label="损耗" width="80" align="center">
            <template #default="{ row }">
              <el-input v-if="row.__type === 'cost' && !isView && !goldMulti" v-model.number="row.lossRate" size="small" :class="['cell-input', { 'cell-over': isOver('lossRate') }]" @change="calcCost" />
              <span v-else>{{ row.lossRate ?? '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="addLossWeight" label="加耗重" width="90" align="center">
            <template #default="{ row }">
              <span class="auto-cell">{{ fmtW(row.addLossWeight) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="goldPrice" label="金价" width="85" align="center">
            <template #default="{ row }">
              <span v-if="row.__type === 'cost'" title="由上方金价带出，不可修改">{{ fmtM(row.goldPrice) }}</span>
              <span v-else>{{ fmtM(row.goldPrice) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="goldMaterialWeight" label="足金料(g)" width="95" align="center">
            <template #default="{ row }">
              <span class="auto-cell">{{ fmtW(row.goldMaterialWeight) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="goldMaterialFee" label="足金料金额" width="105" align="center">
            <template #default="{ row }">
              <span class="auto-cell">{{ fmtM(row.goldMaterialFee) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="主石" align="center">
            <el-table-column prop="stoneWeight" label="石重(ct)" width="92" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.stoneWeight" size="small" :class="['cell-input', { 'cell-over': isOver('stoneWeight') }]" @change="calcCost" />
                <span v-else>{{ fmtW(row.stoneWeight) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="stonePrice" label="单价" width="85" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.stonePrice" size="small" :class="['cell-input', { 'cell-over': isOver('stonePrice') }]" @change="calcCost" />
                <span v-else>{{ fmtM(row.stonePrice) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="stoneQty" label="粒数" width="70" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.stoneQty" size="small" :class="['cell-input', { 'cell-over': isOver('stoneQty') }]" @change="calcCost" />
                <span v-else>{{ row.stoneQty ?? '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="stoneSettingFee" label="镶石工费" width="90" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.stoneSettingFee" size="small" :class="['cell-input', { 'cell-over': isOver('stoneSettingFee') }]" @change="calcCost" />
                <span v-else>{{ fmtM(row.stoneSettingFee) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="stoneAmount" label="金额" width="95" align="center">
              <template #default="{ row }">
                <span class="auto-cell">{{ fmtM(row.stoneAmount) }}</span>
              </template>
            </el-table-column>
          </el-table-column>

          <el-table-column label="副石" align="center">
            <el-table-column prop="subStoneWeight" label="石重(ct)" width="88" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.subStoneWeight" size="small" :class="['cell-input', { 'cell-over': isOver('subStoneWeight') }]" @change="calcCost" />
                <span v-else>{{ fmtW(row.subStoneWeight) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="subStonePrice" label="单价" width="80" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.subStonePrice" size="small" :class="['cell-input', { 'cell-over': isOver('subStonePrice') }]" @change="calcCost" />
                <span v-else>{{ fmtM(row.subStonePrice) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="subStoneQty" label="粒数" width="65" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.subStoneQty" size="small" :class="['cell-input', { 'cell-over': isOver('subStoneQty') }]" @change="calcCost" />
                <span v-else>{{ row.subStoneQty ?? '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="subStoneSettingFee" label="镶石工费" width="85" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.subStoneSettingFee" size="small" :class="['cell-input', { 'cell-over': isOver('subStoneSettingFee') }]" @change="calcCost" />
                <span v-else>{{ fmtM(row.subStoneSettingFee) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="subStoneAmount" label="金额" width="90" align="center">
              <template #default="{ row }">
                <span class="auto-cell">{{ fmtM(row.subStoneAmount) }}</span>
              </template>
            </el-table-column>
          </el-table-column>

          <el-table-column label="包装费" width="82" align="center">
            <template #default="{ row }">
              <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.packingFee" size="small"
                :class="['cell-input', { 'cell-over': isOver('packingFee') }]" @change="calcCost" />
              <span v-else>{{ fmtM(row.packingFee) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="证书费" width="82" align="center">
            <template #default="{ row }">
              <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.certificateFee" size="small"
                :class="['cell-input', { 'cell-over': isOver('certificateFee') }]" @change="calcCost" />
              <span v-else>{{ fmtM(row.certificateFee) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="邮费" width="80" align="center">
            <template #default="{ row }">
              <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.postageFee" size="small"
                :class="['cell-input', { 'cell-over': isOver('postageFee') }]" @change="calcCost" />
              <span v-else>{{ fmtM(row.postageFee) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="moldFee" label="版费" width="80" align="center">
            <template #default="{ row }">
              <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.moldFee" size="small"
                :class="['cell-input', { 'cell-over': isOver('moldFee') }]" @change="calcCost" />
              <span v-else>{{ fmtM(row.moldFee) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="laborFee" label="工费" width="80" align="center">
            <template #default="{ row }">
              <el-input v-if="row.__type === 'cost' && !isView" v-model.number="row.laborFee" size="small"
                :class="['cell-input', { 'cell-over': isOver('laborFee') }]" @change="calcCost" />
              <span v-else>{{ fmtM(row.laborFee) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="totalAmount" label="应收金额 / 成本合计" width="145" align="center">
            <template #default="{ row }">
              <span class="auto-cell" :class="{ 'cost-total-text': row.__type === 'cost' }">{{ fmtM(row.totalAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="利润" width="100" align="center" class-name="profit-column">
            <template #default="{ row }">
              <span v-if="row.__type === 'sale'" class="profit-cell">{{ fmtM(costProfit) }}</span>
            </template>
          </el-table-column>
        </el-table>

        <!-- ⭐ 成本行金料明细（工厂实际用料）—— 单成色时直接在上表填净重/损耗；
             多成色时与销售分色一一对应，展开明细改写数值 -->
        <GoldItemsEditor
          v-if="goldMulti"
          v-model="costGoldItems"
          :purity-options="purityOptionList"
          :loss-rate-options="lossRateOptions"
          :default-gold-price="costRow.goldPrice || 0"
          :editable="!isView"
          :price-readonly="true"
          title="成本金料明细（多成色）"
          cost-mode
          @change="onCostGoldChange"
        />
        <div v-else class="gold-mode-bar">
          <span class="gold-mode-tip">单成色：成本净重 / 损耗 / 金额直接在上表填写（金价跟销售）</span>
          <el-button v-if="!isView" type="primary" link size="small" @click="expandGoldMulti">+ 添加成色（展开明细）</el-button>
        </div>

        <div v-if="costWarn" class="cost-warn-tip">
          <span class="cost-warn-icon">❗</span>
          <div>
            <div class="cost-warn-title">成本高于销售，请复核：</div>
            <div v-for="(w, i) in costWarnList" :key="i" class="cost-warn-item">{{ w.text }}</div>
          </div>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- ===== 图片与数据包 ===== -->
      <div class="form-section">
        <div class="section-title">🖼️ 图片与数据包</div>

        <!-- 成品图片上传（工厂做完后可上传） -->
        <div class="image-block">
          <div class="image-block-title">📸 成品图片 <span class="tip-text">（工厂制作完成后上传）</span></div>
          <MultiImageUpload v-model="finishedImages" :max-count="10" type="finished" :disabled="isView" />
        </div>

        <!-- 数据包上传（3D 模型 / 订单数据包） -->
        <div class="image-block" style="margin-top:14px;">
          <div class="image-block-title">📦 数据包 <span class="tip-text">（3D 模型 / 订单数据包，可上传多个）</span></div>
          <MultiFileUpload v-model="dataPackages" :max-count="10" :max-size-m-b="200" :disabled="isView" />
        </div>

        <!-- 已有图片展示（产品图/数据图/字印图） -->
        <el-row :gutter="16" v-if="hasImages">
          <el-col :xs="24" :sm="8" v-if="productImages.length">
            <div class="image-block">
              <div class="image-block-title">产品图片</div>
              <ImageGroup :urls="productImages.map(x => x.imageUrl)" empty-text="暂无产品图片" />
            </div>
          </el-col>
          <el-col :xs="24" :sm="8" v-if="dataImages.length">
            <div class="image-block">
              <div class="image-block-title">数据图片</div>
              <ImageGroup :urls="dataImages.map(x => x.imageUrl)" empty-text="暂无数据图片" />
            </div>
          </el-col>
          <el-col :xs="24" :sm="8" v-if="letterImages.length || letterRefImages.length">
            <div class="image-block">
              <div class="image-block-title">字印图</div>
              <ImageGroup :urls="[...letterImages, ...letterRefImages].map(x => x.imageUrl)" empty-text="暂无字印图" />
            </div>
          </el-col>
        </el-row>
        <el-empty v-if="!hasImages && finishedImages.length === 0 && dataPackages.length === 0" description="暂无图片与数据包" :image-size="60" />
      </div>

      <div class="section-divider"></div>

      <!-- ===== 制作状态（仅工厂阶段可改，与后端来源守卫一致；只读模式恒显示进度）===== -->
      <div class="form-section" v-if="canChangeProductionStatus || isView">
        <div class="section-title">🔄 制作状态</div>
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          <span style="color:#666;">当前状态：</span>
          <el-tag :type="getStatusType(orderData?.flowStatus)" size="large">
            {{ getStatusText(orderData?.flowStatus) }}
          </el-tag>

          <!-- ⭐ 只读模式：只显示当前状态与进度，不给改 -->
          <template v-if="!isView">
            <span style="color:#666; margin-left:16px;">更新为：</span>
            <el-select v-model="selectedStatus" placeholder="选择目标状态" style="width:220px;">
              <el-option
                v-for="item in availableStatuses"
                :key="item.key"
                :label="statusOptionLabel(item)"
                :value="item.key"
              />
            </el-select>
            <el-button type="primary" @click="updateStatus" :loading="statusLoading" :disabled="!selectedStatus">
              更新状态
            </el-button>
          </template>
        </div>

        <!-- ⭐ 大号暂停 / 恢复（暂停 = 临时停下，进度不动，随时可恢复） -->
        <div class="pause-row" v-if="!isView">
          <el-button
            v-if="orderData?.flowStatus !== 'paused'"
            type="warning"
            class="pause-big-btn"
            :loading="statusLoading"
            :disabled="!canPause"
            @click="handlePauseOrder"
          >
            ⏸ 暂停
          </el-button>
          <template v-else>
            <!-- ⭐ 客户申请的暂停：工厂不能自行恢复 -->
            <el-button
              v-if="orderData?.pauseOwner === 'customer'"
              type="info"
              class="pause-big-btn"
              disabled
            >
              ⏸ 客户申请暂停，等客户方恢复
            </el-button>
            <el-button
              v-else
              type="success"
              class="pause-big-btn"
              :loading="statusLoading"
              @click="handleResumeOrder"
            >
              ▶ 恢复生产
            </el-button>
            <span class="pause-info">
              暂停前工序：<b>{{ orderData?.pauseOriginStatusText || getStatusText(orderData?.pauseOriginStatus) }}</b>
              　暂停时间：<b>{{ formatDateTime(orderData?.pausedAt) }}</b>
              <span v-if="orderData?.pauseReason">　原因：{{ orderData.pauseReason }}</span>
              <span v-if="orderData?.pauseOwner === 'customer'">　客户暂停：{{ orderData?.pauseReqReason || '—' }}</span>
            </span>
          </template>
        </div>

        <div style="margin-top:12px;">
          <el-steps :active="currentStep" finish-status="success" align-center>
            <el-step v-for="s in productionSteps" :key="s.key" :title="s.label" />
          </el-steps>
        </div>
      </div>

      <!-- 状态锁定提示：已完成 / 账单阶段 / 客户阶段 -->
      <div class="form-section" v-else>
        <div class="section-title">🔄 制作状态</div>
        <div class="status-locked-tip">
          当前状态「<b>{{ getStatusText(orderData?.flowStatus) }}</b>」不可更新制作状态
          （已完成 / 账单阶段 / 客户阶段都不能改；账单已出的单改回去会让账单、库存、LR 全部对不上）
        </div>
      </div>
    </div>

    <!-- ===== 底部操作栏：保存放页面下方（滚动时贴底，不用往上找） ===== -->
    <div v-if="!isView" class="bottom-actions">
      <span class="bottom-tip">成本行随订单一起保存</span>
      <el-button size="large" @click="goBack">取消</el-button>
      <el-button type="primary" size="large" @click="handleSave" :loading="saving">
        <el-icon><Check /></el-icon> 保存
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Check } from '@element-plus/icons-vue';
import { getOrderDetail, updateOrder, updateProduction, getOrderCost, saveOrderCost, setCopyBringRepair, getDiamondBring } from '@/api/order';
import { dictApi } from '@/api/dict';
import { useUserStore } from '@/stores/user';
import MultiImageUpload from '@/components/MultiImageUpload.vue';
import MultiFileUpload from '@/components/MultiFileUpload.vue';
import ImageGroup from '@/components/ImageGroup.vue';
import GoldItemsEditor from '@/components/GoldItemsEditor.vue';
import { resolveGemColor } from '@/utils/color';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const orderId = computed(() => Number(route.params.id));

// ⭐ 只读查看模式：/order/factory-edit/:id?mode=view
//    内容与编辑页完全一致（工厂数据 / 多成色金料 / 成本行 / 图片数据包 / 制作进度），只是全部不可改
const isView = computed(() => String(route.query.mode || '') === 'view');

// ⭐ 保存后回跳的列表地址：按来源视图原路返回
//    mode=edit（订单编辑列表）/ mode=audit（待审核列表）/ mode=view（历史订单只读查看）→ 各自列表
const backListPath = computed(() => {
  const m = String(route.query.mode || '');
  if (m === 'view') return '/order/factory-history';
  if (m === 'edit') return '/order/factory-edit-list';
  if (m === 'audit') return '/order/factory-audit-list';
  return '/order/factory-list';
});

const orderData = ref({});
// ⭐ 订单信息表格数据（缓存为 computed，避免每次渲染创建新数组导致 el-table 递归更新）
const orderTableData = computed(() => (orderData.value?.orderId ? [orderData.value] : []));
const loading = ref(false);
const saving = ref(false);
const statusLoading = ref(false);

// ⭐ 历史钻石带入：同客户 + 同钻石级别，带主石/副石 石重、单价、粒数、镶石工费 + 工费
const diamondBringLoading = ref(false);
const diamondBringOk = ref(false);
const DIAMOND_BRING_TIP = '按同客户 + 同钻石级别匹配历史订单，带入钻石部分 + 工费';
const diamondBringHint = ref(DIAMOND_BRING_TIP);

// ⭐ 成品图片上传
const finishedImages = ref([]);
// ⭐ 数据包上传（3D 模型 / 订单数据包）
const dataPackages = ref([]);
const selectedStatus = ref('');
const lossRateOptions = ref([]);
// ⭐ 该客户在「客户管理」里设置的默认损耗率（订单未设损耗时自动带出）
const customerDefaultLoss = ref(0);
const productionStatuses = ref([]);

// ⭐ 步骤条只画主工序；「报废 / 暂停」属于旁支状态，不进流程链
const SIDE_STATUSES = ['scrapped', 'paused'];
const productionSteps = computed(() =>
  productionStatuses.value.filter(s => !SIDE_STATUSES.includes(s.key))
);
const purityDict = ref([]);

// ===== 金料明细（默认单成色，可展开成多成色） =====
const goldItems = ref([]);
const goldEditor = ref(null);
// ⭐ goldMulti=false：单成色，净重/损耗/金价在上方「工厂数据」里填，不显示成色列，跟多成色上线前完全一样
//    goldMulti=true ：多成色，展开明细表，每种成色一行
//    销售与成本共用这一个开关（成本本就按销售成色自动跟随，分成两个开关会互相打架）
const goldMulti = ref(false);

// 成色下拉（id / 名称 / 折算率 / 颜色）
const purityOptionList = computed(() =>
  purityDict.value.map(x => {
    let color = '';
    try {
      const extra = x.extraData ? JSON.parse(x.extraData) : {};
      color = extra.color || '';
    } catch {}
    return {
      id: x.id,
      label: x.itemLabel,
      rate: Number(x.itemValue) || 1,
      color: color || '#909399'
    };
  })
);

const purityNameOf = (id) => {
  const p = purityDict.value.find(x => Number(x.id) === Number(id));
  return p?.itemLabel || '';
};

// 综合损耗（只读展示）
const lossText = computed(() => {
  const lr = Number(orderData.value.lossRate || 0);
  if (!lr) return '—';
  return lr.toFixed(2);
});

// ⭐ 一键用回客户默认损耗（本单手改过后想还原）
const applyCustomerLoss = () => {
  const v = Number(customerDefaultLoss.value || 0);
  if (!v) return;
  orderData.value.lossRate = v;
  calcFactory();
  ElMessage.success(`已使用客户默认损耗 ${v.toFixed(2)}`);
};

// 明细变化 → 回写订单汇总字段（后端保存时会再用明细重算一次，双保险）
const onGoldChange = (s) => {
  if (!s) return;
  orderData.value.netWeight = s.netWeight;
  orderData.value.addLossWeight = s.addLossWeight;
  orderData.value.goldMaterialWeight = s.foldWeight;
  orderData.value.goldMaterialFee = s.amount;
  orderData.value.lossRate = s.lossRate;
  orderData.value.goldPrice = s.goldPrice;
  if (s.purityId) orderData.value.purityId = s.purityId;
  // 多成色标签（'18K金+9K金'），单色时清空
  orderData.value.purityLabel = s.purityLabel || '';
  calcTotal();
};

// ⭐ 单成色 → 生成一条明细（保存后仍是真实子表行，口径与多成色一致）
const syncSingleGoldRow = (rate) => {
  const o = orderData.value || {};
  goldItems.value = [{
    seq: 1,
    purityId: o.purityId || null,
    purityName: purityNameOf(o.purityId),
    netWeight: Number(o.netWeight || 0),
    lossRate: Number(o.lossRate || customerDefaultLoss.value || 1.01),
    addLossWeight: Number(o.addLossWeight || 0),
    foldRate: Number(rate) || 0,
    foldWeight: Number(o.goldMaterialWeight || 0),
    goldPrice: Number(o.goldPrice || 0),
    amount: Number(o.goldMaterialFee || 0),
    remark: ''
  }];
};

// 手动展开成多成色：把当前单成色的数值带进去，成色取订单成色
const expandGoldMulti = () => {
  if (!goldItems.value.length) syncSingleGoldRow(currentPurityRate.value);
  goldMulti.value = true;
};

// 收起成单成色：只有一种成色时才给收，值回填到上方单值，再按单成色重算
const collapseGoldMulti = () => {
  if (goldItems.value.length > 1) return;
  const r = goldItems.value[0] || {};
  orderData.value.netWeight = Number(r.netWeight || 0);
  if (Number(r.lossRate) > 0) orderData.value.lossRate = Number(r.lossRate);
  if (Number(r.goldPrice) > 0) orderData.value.goldPrice = Number(r.goldPrice);
  if (r.purityId) orderData.value.purityId = r.purityId;
  orderData.value.purityLabel = '';
  goldMulti.value = false;
  calcFactory();
  calcCost();
};

// 保存用的明细：单成色且净重还没填时不传（后端有「净重合计必须大于 0」校验，交给它也按单值处理）
const goldItemsPayload = computed(() => {
  if (!goldMulti.value && !(Number(orderData.value.netWeight) > 0)) return [];
  return goldItems.value;
});


// ==================== ⭐ 成本数据（LR 成本行） ====================
// 成本行：一行一订单，与 LR 的成本行同口径
const costRow = ref({ __type: 'cost' });
const costHasData = ref(false);     // 后端是否已录入过成本
const costSaving = ref(false);
// 成本行金料明细（多成色）
const costGoldItems = ref([]);

// ==================== ⭐ 成本分色自动跟随销售 ====================
// 规则：销售有的成色，成本里没有就复制一行（成色/净重/损耗/金价照抄，供工厂改写）；
//      只要工厂没动过这一行（仍在 costAuto 里），就继续跟着销售变，改过之后不再覆盖；
//      销售删掉的成色，成本那行如果还是复制品（没被改写）就一并删掉。
const costAuto = new Set();          // 仍处于「销售复制品」状态的成色 id
const costGoldLoaded = ref(false);   // 成本加载完成前不自动补，避免和 loadCost 打架

const gid = (x) => Number(x && x.purityId) || 0;
const gsame = (c, s) =>
  Math.abs(Number(c.netWeight || 0) - Number(s.netWeight || 0)) < 0.005 &&
  Math.abs(Number(c.lossRate || 0) - Number(s.lossRate || 0)) < 0.00005 &&
  Math.abs(Number(c.goldPrice || 0) - Number(s.goldPrice || 0)) < 0.005;

const copyGoldRow = (s, seq) => ({
  seq,
  purityId: s.purityId,
  purityName: s.purityName || '',
  netWeight: Number(s.netWeight || 0),
  lossRate: Number(s.lossRate || 1.01),
  addLossWeight: Number(s.addLossWeight || 0),
  foldRate: Number(s.foldRate || 0),
  foldWeight: Number(s.foldWeight || 0),
  goldPrice: Number(s.goldPrice || 0),
  amount: Number(s.amount || 0),
  remark: ''
});

// 成本分色汇总回写成本行（外部改了 costGoldItems 时组件不会再 emit，得自己算一遍）
const applyCostGoldSummary = () => {
  const v = (costGoldItems.value || []).filter(x => Number(x.netWeight) > 0);
  const net = rnd2(v.reduce((s, r) => s + Number(r.netWeight || 0), 0));
  const add = rnd2(v.reduce((s, r) => s + Number(r.addLossWeight || 0), 0));
  const fold = rnd2(v.reduce((s, r) => s + Number(r.foldWeight || 0), 0));
  const amount = rnd2(v.reduce((s, r) => s + Number(r.amount || 0), 0));
  costRow.value.netWeight = net;
  costRow.value.addLossWeight = add;
  costRow.value.goldMaterialWeight = fold;
  costRow.value.goldMaterialFee = amount;
  costRow.value.lossRate = net > 0 ? Math.round((add / net) * 10000) / 10000 : costRow.value.lossRate;
  costRow.value.goldPrice = fold > 0 ? Math.round((amount / fold) * 100) / 100 : costRow.value.goldPrice;
};

// ⭐ 单成色：由成本行（上表）生成一条成本明细，保存时一起提交
const buildCostGoldRow = () => {
  const c = costRow.value || {};
  const pid = c.purityId || orderData.value.purityId || null;
  return {
    seq: 1,
    purityId: pid,
    purityName: purityNameOf(pid),
    netWeight: Number(c.netWeight || 0),
    lossRate: Number(c.lossRate || 1.01),
    addLossWeight: Number(c.addLossWeight || 0),
    foldRate: currentPurityRate.value || 0,
    foldWeight: Number(c.goldMaterialWeight || 0),
    goldPrice: Number(c.goldPrice || 0),
    amount: Number(c.goldMaterialFee || 0),
    remark: ''
  };
};

const syncCostGoldFromSale = () => {
  if (!costGoldLoaded.value) return;
  // ⭐ 单成色不走分色跟随：成本直接在上表填，金价跟销售，跟多成色上线前一致
  if (!goldMulti.value) return;
  const sale = (goldItems.value || []).filter(x => gid(x));
  const cost = (costGoldItems.value || []).slice();
  if (!sale.length) return;

  const saleIds = new Set(sale.map(gid));

  // 1. 销售里已经没有的成色：还是复制品的成本行一起删掉，被工厂改写过的保留
  let dirty = false;
  const next = [];
  for (const c of cost) {
    const id = gid(c);
    if (id && !saleIds.has(id) && costAuto.has(id)) {
      costAuto.delete(id);       // 纯复制品，跟着销售一起消失
      dirty = true;
      continue;
    }
    next.push({ ...c });
  }

  // 2. 销售有的成色：成本缺 → 复制一行；仍在自动跟随 → 跟着销售更新
  const added = [];
  for (const s of sale) {
    const c = next.find(x => gid(x) === gid(s));
    if (!c) {
      next.push(copyGoldRow(s, next.length + 1));
      costAuto.add(gid(s));
      added.push(s);
      dirty = true;
    } else if (costAuto.has(gid(s)) && !gsame(c, s)) {
      Object.assign(c, copyGoldRow(s, c.seq));
      dirty = true;
    }
  }
  next.forEach((x, i) => (x.seq = i + 1));

  if (!dirty) return;
  costGoldItems.value = next;
  if (added.length && !isView.value) {
    const names = added.map(s => s.purityName || '新成色').join('、');
    ElMessage.info(`成本金料明细已从销售复制 ${added.length} 行（${names}），数值可直接改写`);
  }
  applyCostGoldSummary();
  calcCost();
};

// 打开订单时：未录成本的（后端返回的就是销售克隆）或与销售数值完全一致的，登记为「复制品」
const markCostAutoFromSale = () => {
  const sale = (goldItems.value || []).filter(x => gid(x));
  for (const s of sale) {
    const c = (costGoldItems.value || []).find(x => gid(x) === gid(s));
    if (c && (!costHasData.value || gsame(c, s))) costAuto.add(gid(s));
  }
};

// 成本行金料明细（多成色）—— 与销售分色一一对应，工厂改数值即可
const onCostGoldChange = (s) => {
  if (!s) return;
  costRow.value.netWeight = s.netWeight;
  costRow.value.addLossWeight = s.addLossWeight;
  costRow.value.goldMaterialWeight = s.foldWeight;
  costRow.value.goldMaterialFee = s.amount;
  costRow.value.lossRate = s.lossRate;
  costRow.value.goldPrice = s.goldPrice;
  // ⭐ 工厂改写过的成色不再跟着销售同步（没改的继续跟随）
  for (const id of [...costAuto]) {
    const c = (costGoldItems.value || []).find(x => gid(x) === id);
    const sale = (goldItems.value || []).find(x => gid(x) === id);
    if (!c || !sale || !gsame(c, sale)) costAuto.delete(id);
  }
  calcCost();
};

watch(goldItems, syncCostGoldFromSale);

// 手动展开成多成色：成本明细若还是空的，先用成本行的单值补一条（工厂已填的成本不丢）
watch(goldMulti, (v) => {
  if (!v) return;
  costGoldLoaded.value = true;   // 已由页面初始化过，允许分色跟随
  if (!(costGoldItems.value || []).some(x => Number(x.netWeight) > 0 || gid(x))) {
    costGoldItems.value = [buildCostGoldRow()];
    costAuto.clear();
  }
  markCostAutoFromSale();
  syncCostGoldFromSale();
  calcCost();
});

// ⭐ 复制单：是否从复刻订单带出成本（工厂决定，下单时不再选）
const copyInfo = reactive({ isCopyOrder: false, sourceOrderNo: '', bring: true, loading: false });

const onCopyBringChange = async (val) => {
  if (!orderId.value) return;
  copyInfo.loading = true;
  try {
    await setCopyBringRepair(orderId.value, val);
    await loadCost();
    ElMessage.success(val ? '已带入钻石与工费（金重/损耗/金价按本单）' : '已改为不带出，成本按销售行初始化');
  } catch (e) {
    copyInfo.bring = !val;
    ElMessage.error('切换失败：' + (e?.message || '请重试'));
  } finally {
    copyInfo.loading = false;
  }
};

// 销售行：直接取当前页面正在编辑的订单数据（实时，未保存也算）
const saleRow = computed(() => {
  const o = orderData.value || {};
  return {
    quantity: o.quantity,
    totalWeight: o.totalWeight,
    netWeight: o.netWeight,
    lossRate: o.lossRate,
    addLossWeight: o.addLossWeight,
    goldPrice: o.goldPrice,
    goldMaterialWeight: o.goldMaterialWeight,
    goldMaterialFee: o.goldMaterialFee,
    stoneQty: o.mainStoneQty,
    stoneWeight: o.mainStoneWeight,
    stonePrice: o.mainStonePrice,
    stoneAmount: o.mainStoneAmount,
    stoneSettingFee: o.mainStoneSettingFee,
    subStoneQty: o.subStoneQty,
    subStoneWeight: o.subStoneWeight,
    subStonePrice: o.subStonePrice,
    subStoneAmount: o.subStoneAmount,
    subStoneSettingFee: o.subStoneSettingFee,
    packingFee: o.packingFee,
    certificateFee: o.certificateFee,
    postageFee: o.postageFee,
    moldFee: o.moldFee,
    laborFee: o.laborFee,
    totalAmount: o.totalAmount,
  };
});

// 表格三行：销售行（只读）+ 黄色间隔行 + 成本行（红色可编辑）
const costTableData = computed(() => [
  { ...saleRow.value, __type: 'sale' },
  { __type: 'gap' },
  costRow.value,
]);

// 预警规则：成本高于销售（净重/损耗/加耗重/金价/主石单价/副石单价/成本合计）
// 与后端 OrderCostController.BuildWarns 保持一致；后端保存时会重算并把结果落库
const COST_WARN_FIELDS = [
  { key: 'quantity', label: '件数', digits: 0 },
  { key: 'totalWeight', label: '总重', digits: 2 },
  { key: 'netWeight', label: '净重', digits: 2 },
  { key: 'lossRate', label: '损耗率', digits: 2 },
  { key: 'addLossWeight', label: '加耗重', digits: 2 },
  { key: 'goldPrice', label: '金价', digits: 2 },
  { key: 'goldMaterialWeight', label: '足金料克重', digits: 2 },
  { key: 'goldMaterialFee', label: '足金料金额', digits: 2 },
  { key: 'stoneWeight', label: '主石石重(ct)', digits: 2 },
  { key: 'stonePrice', label: '主石单价', digits: 2 },
  { key: 'stoneQty', label: '主石粒数', digits: 0 },
  { key: 'stoneSettingFee', label: '主石镶石工费', digits: 2 },
  { key: 'stoneAmount', label: '主石金额', digits: 2 },
  { key: 'subStoneWeight', label: '副石石重(ct)', digits: 2 },
  { key: 'subStonePrice', label: '副石单价', digits: 2 },
  { key: 'subStoneQty', label: '副石粒数', digits: 0 },
  { key: 'subStoneSettingFee', label: '副石镶石工费', digits: 2 },
  { key: 'subStoneAmount', label: '副石金额', digits: 2 },
  { key: 'packingFee', label: '包装费', digits: 2 },
  { key: 'certificateFee', label: '证书费', digits: 2 },
  { key: 'postageFee', label: '邮费', digits: 2 },
  { key: 'moldFee', label: '版费', digits: 2 },
  { key: 'laborFee', label: '工费', digits: 2 },
  // ⭐ 成本合计：销售合计取整（Math.round），成本为精确两位，故留 1 元容差不误报
  { key: 'totalAmount', label: '成本合计', digits: 2, tolerance: 1 },
];

const costWarnList = computed(() => {
  const list = [];
  // ⭐ 多成色时「金价」是反算的综合价（Σ金额÷Σ折足），随各成色克重配比变化，
  //    跟销售的综合价比大小没意义（改个净重就报「成本高于销售」），跳过该项，与后端一致
  const multiGold = (goldItems.value || []).filter(x => Number(x.purityId)).length > 1
    || (costGoldItems.value || []).filter(x => Number(x.purityId)).length > 1;
  COST_WARN_FIELDS.forEach(f => {
    if (multiGold && f.key === 'goldPrice') return;
    const c = Number(costRow.value?.[f.key]) || 0;
    const s = Number(saleRow.value?.[f.key]) || 0;
    if (c > s + (f.tolerance || 0)) {
      list.push({
        ...f,
        text: `${f.label} 成本 ${c.toFixed(f.digits)} > 销售 ${s.toFixed(f.digits)}`,
      });
    }
  });
  return list;
});
const costWarn = computed(() => costWarnList.value.length > 0);
// ⭐ 单项高亮：成本行里超出的那个输入框标红
const overSet = computed(() => new Set(costWarnList.value.map(x => x.key)));
const isOver = (key) => overSet.value.has(key);
const costWarnReason = computed(() => costWarnList.value.map(x => x.text).join('；'));
const costProfit = computed(() => parseFloat(
  ((Number(saleRow.value.totalAmount) || 0) - (Number(costRow.value.totalAmount) || 0)).toFixed(2)
));

const fmtW = (v) => (v === null || v === undefined || v === '' ? '-' : rnd2(v).toFixed(2));
const fmtM = (v) => (v === null || v === undefined || v === '' ? '-' : Number(v).toFixed(2));
const costRowClassName = ({ row }) => {
  if (row.__type === 'gap') return 'cost-gap-row';
  return row.__type === 'cost' ? 'cost-row-red' : 'sale-row-white';
};
const costTableSpanMethod = ({ rowIndex, column }) => {
  if (column.label !== '利润') return;
  if (rowIndex === 0) return { rowspan: 3, colspan: 1 };
  return { rowspan: 0, colspan: 0 };
};

// ⭐ 成本行自动计算：加耗重 = 净重 × 损耗；足金料克重 = 加耗重 × 折算率；金额 = 克重 × 金价
// 总重 / 足金料（金重）由订单带出不可编辑；净重可编辑
const calcCost = () => {
  const c = costRow.value;
  if (!c || c.__type !== 'cost') return;
  c.totalWeight = saleRow.value.totalWeight ?? null;
  // 重量/损耗/石重统一最多两位小数
  if (c.netWeight != null) c.netWeight = rnd2(c.netWeight);
  if (c.lossRate != null) c.lossRate = rnd2(c.lossRate);
  if (c.stoneWeight != null) c.stoneWeight = rnd2(c.stoneWeight);
  if (c.subStoneWeight != null) c.subStoneWeight = rnd2(c.subStoneWeight);

  // ⭐ 多成色：金料部分以明细汇总为准（onCostGoldChange 已回写），这里不再按单值重算
  //    单成色：照旧按上表的净重/损耗/金价算，算完同步一条明细用于保存
  const useItems = goldMulti.value && costGoldItems.value.some(x => Number(x.netWeight) > 0);
  if (!useItems) {
    c.goldPrice = rnd2(saleRow.value.goldPrice ?? 0) ?? null;
    const rate = currentPurityRate.value || 1;
    // 加耗重 = 净重 × 损耗 → 四舍五入两位
    c.addLossWeight = rnd2((Number(c.netWeight) || 0) * (Number(c.lossRate) || 0));
    // 足金料克重 = 加耗重（已四舍五入）× 折算率 → 四舍五入两位
    c.goldMaterialWeight = rnd2((Number(c.addLossWeight) || 0) * rate);
    // 足金料金额 = 足金料克重（已四舍五入）× 金价 → 四舍五入两位
    c.goldMaterialFee = rnd2((Number(c.goldMaterialWeight) || 0) * (Number(c.goldPrice) || 0));
    if (!goldMulti.value) costGoldItems.value = [buildCostGoldRow()];
  }
  c.stoneAmount = rnd2(
    (Number(c.stoneWeight) || 0) * (Number(c.stonePrice) || 0)
      + (Number(c.stoneQty) || 0) * (Number(c.stoneSettingFee) || 0)
  );
  c.subStoneAmount = rnd2(
    (Number(c.subStoneWeight) || 0) * (Number(c.subStonePrice) || 0)
      + (Number(c.subStoneQty) || 0) * (Number(c.subStoneSettingFee) || 0)
  );
  c.totalAmount = rnd2(
    (Number(c.goldMaterialFee) || 0) + (Number(c.stoneAmount) || 0) + (Number(c.subStoneAmount) || 0)
      + (Number(c.packingFee) || 0) + (Number(c.certificateFee) || 0) + (Number(c.postageFee) || 0)
      + (Number(c.moldFee) || 0) + (Number(c.laborFee) || 0)
  );
};

// 订单侧修改总重或金价时，成本行立即跟随（净重仍可在成本行单独调整）
watch(
  () => [saleRow.value.totalWeight, saleRow.value.goldPrice],
  () => calcCost()
);

// 加载订单成本（未录入时后端会返回“与销售一致”的默认值）
const loadCost = async () => {
  if (!orderId.value) return;
  try {
    const res = await getOrderCost(orderId.value);
    const d = res?.data;
    if (d) {
      costHasData.value = !!d.hasCost;
      costRow.value = { ...(d.cost || {}), __type: 'cost' };
      // 成本行金料明细（未录成本时后端返回与销售一致的一份）
      const ci = d.cost?.goldItems || d.sale?.goldItems || [];
      costAuto.clear();                 // 重新载入后按新数据重新判定「哪些是复制品」
      costGoldItems.value = ci.map((x, i) => ({ ...x, seq: i + 1 }));
      // ⭐ 复制单开关状态（已录入成本后开关不再生效，模板里会隐藏）
      copyInfo.isCopyOrder = !!d.isCopyOrder;
      copyInfo.sourceOrderNo = d.sourceOrderNo || '';
      copyInfo.bring = d.copyBringRepair !== false;
      // ⭐ 成本分色跟随销售：载入后把「与销售一致」的行登记为复制品，
      //    销售后面加/改成色，成本会自动补齐并跟着变；工厂改过的行不再覆盖
      costGoldLoaded.value = true;
      // ⭐ 成本那边本来就分了多成色（销售单色但成本多色）→ 也要展开明细，否则成本明细会被单值覆盖
      if (ci.length > 1) goldMulti.value = true;
      markCostAutoFromSale();
      syncCostGoldFromSale();
    }
  } catch (e) {
    console.warn('加载订单成本失败:', e);
    costRow.value = { __type: 'cost' };
  }
};

// 保存订单成本（订单保存时一并提交）
const saveCostData = async () => {
  if (!orderId.value) return true;
  costSaving.value = true;
  try {
    const { __type, warnFlag, warnReason, goldItems: _ignore, ...payload } = costRow.value;
    // 单成色没填成本净重时不传明细（否则后端「净重合计必须大于 0」直接报错）
    payload.goldItems = (goldMulti.value || Number(costRow.value.netWeight) > 0) ? costGoldItems.value : [];
    const res = await saveOrderCost(orderId.value, payload);
    const d = res?.data;
    if (d) {
      costHasData.value = true;
      costRow.value = { ...(d.cost || {}), __type: 'cost' };
    }
    return true;
  } catch (e) {
    ElMessage.warning('订单已保存，但成本数据保存失败：' + (e?.message || '请重试'));
    return false;
  } finally {
    costSaving.value = false;
  }
};

// ==================== 状态映射 ====================
const statusMap = {
  customerAudited: { text: '待接单', type: 'success' },
  accepted: { text: '已接单', type: 'primary' },
  factory_edit: { text: '工厂编辑中', type: 'primary' },
  waxing: { text: '出蜡', type: 'primary' },
  molded: { text: '倒模', type: 'primary' },
  setting: { text: '执模', type: 'primary' },
  cnc: { text: 'CNC', type: 'primary' },
  sweeping: { text: '扫镶口', type: 'primary' },
  stoneCutting: { text: '车石', type: 'primary' },
  microInlay: { text: '微镶', type: 'primary' },
  handInlay: { text: '手镶', type: 'primary' },
  polishing: { text: '制作完成', type: 'success' },
  billPending: { text: '账单待审核', type: 'warning' },
  billConfirmed: { text: '待确认', type: 'success' },
  completed: { text: '已完成', type: 'success' },
};

const getStatusText = (status) => {
  if (status === 'paused') return '已暂停';
  return productionStatuses.value.find(item => item.key === status)?.label
    || statusMap[status]?.text
    || status
    || '-';
};
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ==================== 进度 ====================
// ⭐ 账单/客户阶段（已过「制作完成」）：只读查看时进度条全绿，否则看起来像一步没做
const AFTER_PRODUCTION_STATUSES = ['billPending', 'billConfirmed', 'customerApproved', 'confirmed', 'completed'];

const currentStep = computed(() => {
  let s = orderData.value?.flowStatus;
  // ⭐ 暂停中：进度条停在暂停前的工序
  if (s === 'paused' && orderData.value?.pauseOriginStatus) s = orderData.value.pauseOriginStatus;
  if (isView.value && AFTER_PRODUCTION_STATUSES.includes(s)) return productionSteps.value.length;
  const index = productionStatuses.value.findIndex(item => item.key === s);
  return index >= 0 ? index : 0;
});

// ⭐ 是否可暂停：处于制作工序上（不含暂停中 / 报废 / 终态）
const canPause = computed(() => {
  const s = orderData.value?.flowStatus;
  if (!s || s === 'paused') return false;
  if (s === 'factory_edit') return true;
  return productionStatuses.value.some(x => x.key === s && x.key !== 'scrapped');
});

// ⭐ 制作状态不做顺序控制：任意工序都能改，可前进也可回退（2026-11-08）
//    「暂停」不在下拉里——暂停/恢复走下面的独立按钮，避免绕过暂停原因
const availableStatuses = computed(() => {
  const current = orderData.value?.flowStatus;
  return productionStatuses.value.filter(s => s.key !== current && s.key !== 'paused');
});

// 回退判断用「暂停前的工序」作基准：暂停中点任意工序是恢复，不是回退
const statusCompareBase = computed(() => {
  const s = orderData.value?.flowStatus;
  return s === 'paused' ? (orderData.value?.pauseOriginStatus || s) : s;
});
const isStatusBackward = (key) => {
  const baseIndex = productionStatuses.value.findIndex(item => item.key === statusCompareBase.value);
  const targetIndex = productionStatuses.value.findIndex(item => item.key === key);
  return baseIndex >= 0 && targetIndex >= 0 && targetIndex < baseIndex;
};
// 下拉里给回退项加后缀，选之前就能看出是往回走
const statusOptionLabel = (item) => (isStatusBackward(item.key) ? `${item.label}（回退）` : item.label);

// ==================== 标准损耗 ====================
const isStandardLoss = computed(() => {
  const lr = Number(orderData.value.lossRate);
  return lr === 1.10 || lr === 1.09 || lr === 1.08;
});

// ==================== ⭐ 成色颜色 ====================
const currentPurityColor = computed(() => {
  if (orderData.value?.purityId) {
    const item = purityDict.value.find(x => x.id === orderData.value.purityId);
    if (item) {
      try {
        const extra = item.extraData ? JSON.parse(item.extraData) : {};
        if (extra.color) return extra.color;
      } catch {}
    }
  }
  const label = (orderData.value?.color || '').trim();
  if (label) {
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

// ==================== ⭐ 成色折算率 ====================
const currentPurityRate = computed(() => {
  if (orderData.value?.purityId) {
    const item = purityDict.value.find(x => x.id === orderData.value.purityId);
    if (item) return Number(item.itemValue);
  }
  const label = (orderData.value?.color || '').trim();
  if (label) {
    const item = purityDict.value.find(x => x.itemLabel === label);
    if (item) return Number(item.itemValue);
  }
  return 1;
});
const productImages = computed(() =>
  (orderData.value?.images || []).filter(x => x.imageType === 'product')
);
const dataImages = computed(() =>
  (orderData.value?.images || []).filter(x => x.imageType === 'data')
);
const letterImages = computed(() =>
  (orderData.value?.images || []).filter(x => x.imageType === 'letter')
);
const letterRefImages = computed(() =>
  (orderData.value?.images || []).filter(x => x.imageType === 'letter_ref')
);
const finishedImagesExisting = computed(() =>
  (orderData.value?.images || []).filter(x => x.imageType === 'finished')
);

const hasImages = computed(() => {
  return productImages.value.length > 0
    || dataImages.value.length > 0
    || letterImages.value.length > 0
    || letterRefImages.value.length > 0
    || finishedImagesExisting.value.length > 0
    || !!(orderData.value?.imageUrl || orderData.value?.dataImageUrl || orderData.value?.letterImageUrl);
});

// ==================== 计算函数 ====================
// ⭐ 四舍五入工具（避免 toFixed 的浮点误差，如 1.005 被舍成 1.00）
const rnd = (v, d = 2) => {
  const n = Number(v) || 0;
  const f = Math.pow(10, d);
  const sign = n < 0 ? -1 : 1;
  return sign * (Math.round((Math.abs(n) + 1e-9) * f) / f);
};
// 重量/数量统一保留两位
const rnd2 = (v) => rnd(v, 2);

const calcFactory = () => {
  // 总重最多两位小数
  if (orderData.value.totalWeight != null) orderData.value.totalWeight = rnd2(orderData.value.totalWeight);

  if (!goldMulti.value) {
    // ⭐ 单成色：口径与多成色上线前完全一致
    //    加耗重 = 净重 × 损耗 → 足金料克重 = 加耗重 × 成色折算率 → 金额 = 克重 × 金价
    if (orderData.value.netWeight != null) orderData.value.netWeight = rnd2(orderData.value.netWeight);
    const net = Number(orderData.value.netWeight) || 0;
    const loss = Number(orderData.value.lossRate) || customerDefaultLoss.value || 1.10;
    const rate = Number(currentPurityRate.value) || 1;
    orderData.value.addLossWeight = rnd2(net * loss);
    orderData.value.goldMaterialWeight = rnd2(orderData.value.addLossWeight * rate);
    orderData.value.goldMaterialFee = rnd2(orderData.value.goldMaterialWeight * (Number(orderData.value.goldPrice) || 0));
    // 同步成一条明细（保存时与多成色同一条链路）
    syncSingleGoldRow(rate);
  }
  // ⭐ 多成色：金料相关（净重/损耗/加耗/折足/金料费）统一由「金料明细」汇总，
  //    onGoldChange 已回写到 orderData，这里不再按单值重算，避免两处口径打架
  calcTotal();
};

// ⭐ 主石金额 = 石重 × 单价 + 粒数 × 镶石工费
const calcMainStone = () => {
  if (orderData.value.mainStoneWeight != null) orderData.value.mainStoneWeight = rnd2(orderData.value.mainStoneWeight);
  const qty = orderData.value.mainStoneQty || 0;
  const weight = orderData.value.mainStoneWeight || 0;
  const price = rnd2(orderData.value.mainStonePrice || 0);
  const settingFee = rnd2(orderData.value.mainStoneSettingFee || 0);
  orderData.value.mainStoneAmount = rnd2(weight * price + qty * settingFee);
  calcTotal();
};

// ⭐ 副石金额 = 石重 × 单价 + 粒数 × 镶石工费
const calcSubStone = () => {
  if (orderData.value.subStoneWeight != null) orderData.value.subStoneWeight = rnd2(orderData.value.subStoneWeight);
  const qty = orderData.value.subStoneQty || 0;
  const weight = orderData.value.subStoneWeight || 0;
  const price = rnd2(orderData.value.subStonePrice || 0);
  const settingFee = rnd2(orderData.value.subStoneSettingFee || 0);
  orderData.value.subStoneAmount = rnd2(weight * price + qty * settingFee);
  calcTotal();
};

const calcTotal = () => {
  // ⭐ 足金料金额统一计入合计
  const goldMaterial = orderData.value.goldMaterialFee || 0;
  const mainStone = orderData.value.mainStoneAmount || 0;
  const subStone = orderData.value.subStoneAmount || 0;
  const packing = orderData.value.packingFee || 0;
  const certificate = orderData.value.certificateFee || 0;
  const postage = orderData.value.postageFee || 0;
  const mold = orderData.value.moldFee || 0;
  const labor = orderData.value.laborFee || 0;

  // ⭐ 合计金额四舍五入取整（不保留小数）；其余金额字段仍保留两位
  orderData.value.totalAmount = Math.round(
    goldMaterial + mainStone + subStone +
    packing + certificate + postage + mold + labor
  );
};

// ==================== ⭐ 带入历史钻石数据 ====================
// 规则：同客户 + 钻石级别相同才允许带入；写钻石部分（主石/副石 石重、单价、粒数、镶石工费）+ 工费，
//       金重/净重/损耗等其他费用一律不动；账单按订单字段生成、成本行未录入时默认与销售一致，故三处自然一致
const handleBringDiamond = async () => {
  const level = String(orderData.value?.diamondLevel || '').trim();
  const customerId = Number(orderData.value?.customerId || 0);

  if (!level) {
    ElMessage.warning('该订单没有钻石级别：只有级别相同才允许带入');
    return;
  }
  if (!customerId) {
    ElMessage.warning('订单缺少客户信息，无法匹配历史订单');
    return;
  }

  // 已填过钻石数据或工费 → 覆盖前确认（只覆盖钻石部分 + 工费）
  const hasData = [
    'mainStoneWeight', 'mainStoneQty', 'mainStonePrice', 'mainStoneSettingFee',
    'subStoneWeight', 'subStoneQty', 'subStonePrice', 'subStoneSettingFee', 'laborFee',
  ].some(k => Number(orderData.value?.[k] || 0) > 0);
  if (hasData) {
    try {
      await ElMessageBox.confirm(
        '当前订单已填主石/副石或工费，带入会覆盖钻石字段和工费（金重、损耗等其他字段不变），继续吗？',
        '带入历史钻石数据',
        { type: 'warning', confirmButtonText: '覆盖带入', cancelButtonText: '取消' }
      );
    } catch {
      return;
    }
  }

  diamondBringLoading.value = true;
  diamondBringOk.value = false;
  try {
    const res = await getDiamondBring({
      customerId,
      diamondLevel: level,
      excludeOrderId: orderId.value,
    });
    const d = res?.data || res || {};
    if (!d.found) {
      diamondBringHint.value = d.message || '没有找到级别相同且填过钻石数据的历史订单';
      ElMessage.info(diamondBringHint.value);
      return;
    }

    // ⭐ 工费：历史单有工费才带（历史为 0 / 空时不动当前已填的工费）
    //    必须在 calcMainStone() 之前赋，calcMainStone 里会连带重算总额
    const histLabor = Number(d.laborFee || 0);
    if (histLabor > 0) orderData.value.laborFee = histLabor;

    // ⭐ 只写钻石部分
    const apply = (key, val) => { orderData.value[key] = val == null ? null : Number(val); };
    apply('mainStoneWeight', d.mainStoneWeight);
    apply('mainStonePrice', d.mainStonePrice);
    apply('mainStoneQty', d.mainStoneQty);
    apply('mainStoneSettingFee', d.mainStoneSettingFee);
    apply('subStoneWeight', d.subStoneWeight);
    apply('subStonePrice', d.subStonePrice);
    apply('subStoneQty', d.subStoneQty);
    apply('subStoneSettingFee', d.subStoneSettingFee);
    calcMainStone(); // 内含 calcTotal
    calcSubStone();

    // 成本未录入时成本行默认与销售行一致 → 同步钻石部分（含工费）；已录入则不改
    if (!costHasData.value && costRow.value) {
      costRow.value.laborFee = orderData.value.laborFee;
      costRow.value.stoneWeight = orderData.value.mainStoneWeight;
      costRow.value.stonePrice = orderData.value.mainStonePrice;
      costRow.value.stoneQty = orderData.value.mainStoneQty;
      costRow.value.stoneSettingFee = orderData.value.mainStoneSettingFee;
      costRow.value.subStoneWeight = orderData.value.subStoneWeight;
      costRow.value.subStonePrice = orderData.value.subStonePrice;
      costRow.value.subStoneQty = orderData.value.subStoneQty;
      costRow.value.subStoneSettingFee = orderData.value.subStoneSettingFee;
      costRow.value.stoneAmount = orderData.value.mainStoneAmount;
      costRow.value.subStoneAmount = orderData.value.subStoneAmount;
      calcCost();
    }

    diamondBringOk.value = true;
    const src = `来源 ${d.sourceOrderNo || d.sourceOrderId}${d.sourceOrderDate ? '（' + formatDate(d.sourceOrderDate) + '）' : ''}`;
    const laborTxt = histLabor > 0 ? ` + 工费 ${histLabor}` : '（历史单无工费，工费未动）';
    diamondBringHint.value = costHasData.value
      ? `已带入 ${src} 钻石数据${laborTxt}；成本行已录入，未改动`
      : `已带入 ${src} 钻石数据${laborTxt}；成本行已随销售行同步，保存后生效`;
    ElMessage.success(histLabor > 0 ? '已带入历史钻石数据 + 工费' : '已带入历史钻石数据');
  } catch (e) {
    diamondBringHint.value = e?.message || '带入失败，请重试';
    ElMessage.error(diamondBringHint.value);
  } finally {
    diamondBringLoading.value = false;
  }
};

// ==================== 加载数据 ====================
const loadData = async () => {
  if (!orderId.value) {
    ElMessage.error('订单ID不存在');
    router.back();
    return;
  }

  loading.value = true;
  try {
    const res = await getOrderDetail(orderId.value);
    if (res?.data) {
      orderData.value = res.data;

      // ⭐ 客户默认损耗率：订单还没设损耗时，自动带出该客户设置的默认值
      //    （在「客户管理」里给客户设一次，之后每单进来就是这个值，仍可本单手改）
      const custLoss = Number(res.data.customerDefaultLossRate || 0);
      customerDefaultLoss.value = custLoss > 0 ? custLoss : 0;
      if (!Number(res.data.lossRate) && custLoss > 0) {
        orderData.value.lossRate = custLoss;
      }

      // ⭐ 金料明细：有子表直接回填；老单按现有单值合成一条（保存后转成真实子表行）
      const loadedItems = Array.isArray(res.data.goldItems) ? res.data.goldItems : [];
      if (loadedItems.length) {
        goldItems.value = loadedItems.map((x, i) => ({ ...x, seq: i + 1 }));
      } else if ((res.data.netWeight || 0) > 0) {
        goldItems.value = [{
          seq: 1,
          purityId: res.data.purityId,
          purityName: '',
          netWeight: Number(res.data.netWeight || 0),
          lossRate: Number(res.data.lossRate || (custLoss > 0 ? custLoss : 1.01)),
          addLossWeight: Number(res.data.addLossWeight || 0),
          foldRate: 0,                       // 等成色字典到齐后自动补
          foldWeight: Number(res.data.goldMaterialWeight || 0),
          goldPrice: Number(res.data.goldPrice || 0),
          amount: Number(res.data.goldMaterialFee || 0),
          remark: ''
        }];
      } else {
        goldItems.value = [];
      }
      // ⭐ 只有一种成色就回到「单成色」的老界面（不显示成色列/明细表），多种才展开明细
      goldMulti.value = goldItems.value.length > 1;
      // 初始化成品图片（已有成品图回填）
      const fin = (res.data.images || []).filter(x => x.imageType === 'finished');
      finishedImages.value = fin.map((x, i) => ({
        id: x.id || null,
        imageType: 'finished',
        imageUrl: x.imageUrl,
        imageName: x.imageName || '',
        sortOrder: i,
        remark: x.remark || '',
      }));
      // ⭐ 回填数据包（3D 模型 / 订单数据包）
      dataPackages.value = (res.data.dataPackages || []).map((x, i) => ({
        fileName: x.fileName || (x.fileUrl || '').split('/').pop() || ('数据包' + (i + 1)),
        fileUrl: x.fileUrl || '',
        fileSize: x.fileSize || 0,
        fileType: x.fileType || '',
        sortOrder: i,
      }));
      calcFactory();
      calcMainStone();
      calcSubStone();
      calcTotal();
      // ⭐ 加载订单成本（LR 成本行）
      await loadCost();
      calcCost();
    } else {
      ElMessage.error('订单不存在');
      router.back();
    }
  } catch {
    ElMessage.error('加载数据失败');
    router.back();
  } finally {
    loading.value = false;
  }
};

// ==================== 保存 ====================
// ⭐ 订单主体是否处于工厂可编辑状态（与后端 FlowStatus.IsFactoryOrderEditable 一致）
//    非可编辑状态（如已完成/已取消）时，只保存成本，不再提交订单主体
//    ⭐ productionCompleted（制作完成 / 待审核）也放开：审核通过前允许改，改动全量留痕
const ORDER_EDITABLE_STATUSES = [
  'factory_edit', 'dataConfirm', 'waxing', 'molded', 'cnc', 'partsMissing',
  'sweeping', 'stoneCutting', 'microInlay', 'handInlay', 'assembly', 'polishing', 'paused', 'stoneReady', 'glue', 'inlay', 'billRejected',
  'productionCompleted',
];
const orderEditable = computed(() => {
  // 只有工厂操作员受该状态限制；管理员不受限
  if (!userStore.isFactoryOrder) return true;
  return ORDER_EDITABLE_STATUSES.includes(orderData.value?.flowStatus);
});

// ⭐ 制作状态能否修改（与后端 UpdateProductionAsync 的来源守卫一致）
//    已完成 / 账单阶段 / 客户阶段都不给改，否则账单、库存、LR 会对不上
const canChangeProductionStatus = computed(() =>
  ORDER_EDITABLE_STATUSES.includes(orderData.value?.flowStatus)
  || orderData.value?.flowStatus === 'scrapped');

const handleSave = async () => {
  // ⭐ 只读模式不允许保存（按钮已隐藏，这里兜底防误触）
  if (isView.value) return;
  if (!orderData.value.totalWeight && !orderData.value.netWeight) {
    try {
      await ElMessageBox.confirm('总重和净重都为空，确定要保存吗？', '提示', { type: 'warning' });
    } catch {
      return;
    }
  }

  saving.value = true;
  // 订单主体是否保存成功；订单状态不可编辑（如已完成/已取消）时仍允许单独保存成本
  let orderSaved = false;
  let orderError = null;
  try {
    // ⭐ 提交时带上成品图片（imageType=finished）与数据包
    //    ⚠️ replaceImageTypes 必须显式声明，否则后端会把该订单整单图片全量替换 → 上传成品图后产品图/数据图/字印图全丢
    const payload = {
      ...orderData.value,
      // ⭐ 金料明细：多成色以明细为准；单成色也是同一份明细（净重为 0 时传空，交给后端按单值处理）
      goldItems: goldItemsPayload.value,
      replaceImageTypes: ['finished'],
      finishedImages: finishedImages.value.map((x, i) => ({
        imageType: 'finished',
        imageUrl: x.imageUrl,
        imageName: x.imageName || '',
        sortOrder: i,
        remark: x.remark || '',
      })),
      dataPackages: dataPackages.value.map((x, i) => ({
        fileName: x.fileName || (x.fileUrl || '').split('/').pop() || ('数据包' + (i + 1)),
        fileUrl: x.fileUrl,
        fileSize: x.fileSize || 0,
        fileType: x.fileType || '',
        sortOrder: i,
      })).filter(x => x.fileUrl),
    };
    try {
      if (orderEditable.value) {
        await updateOrder(payload);
        orderSaved = true;
      } else {
        orderError = new Error(`当前状态(${getStatusText(orderData.value.flowStatus)})不可修改订单，仅保存成本数据`);
      }
    } catch (e) {
      orderError = e;
    }

    // ⭐ 一并保存订单成本（LR 成本行）——独立于订单流转状态
    const costOk = await saveCostData();
    if (!orderSaved && !costOk) {
      throw orderError || new Error('保存失败');
    }

    if (!orderSaved) {
      // 订单本身不允许改（状态限制），但成本已保存
      ElMessage.warning(orderError?.message || '订单当前状态不可修改，已保存成本数据');
      router.push(backListPath.value);
      return;
    }

    ElMessage.success('保存成功');
    router.push(backListPath.value);
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

// ==================== 更新状态 ====================
const updateStatus = async () => {
  if (isView.value) return;
  if (!selectedStatus.value) {
    ElMessage.warning('请选择状态');
    return;
  }

  const label = getStatusText(selectedStatus.value);
  const targetIndex = productionStatuses.value.findIndex(item => item.key === selectedStatus.value);

  // ⭐ 回退二次确认：状态往回走会把工序进度拉回前面的节点（已填的重量/成本等数据不动）
  if (isStatusBackward(selectedStatus.value)) {
    try {
      await ElMessageBox.confirm(
        `将制作状态从「${getStatusText(statusCompareBase.value)}」回退到「${label}」？回退只改状态与工序进度，不会清空已填数据。`,
        '回退工序',
        { type: 'warning', confirmButtonText: '确认回退', cancelButtonText: '取消' }
      );
    } catch {
      return;
    }
  }

  // ⭐ 报废单独确认：报废后订单不再出现在「制作中」，账单也出不了（可再改回工序救回）
  if (selectedStatus.value === 'scrapped') {
    try {
      await ElMessageBox.confirm(
        '确认把这单标记为「报废」？报废后订单不在制作中列表，也出不了账单；如果误操作，把制作状态改回任意工序即可恢复。',
        '报废确认',
        { type: 'warning', confirmButtonText: '确认报废', cancelButtonText: '取消' }
      );
    } catch {
      return;
    }
  }

  statusLoading.value = true;
  try {
    await updateProduction(orderId.value, {
      status: selectedStatus.value,
      // ⭐ step 跟目标工序走；回退时不能沿用旧进度
      step: targetIndex >= 0 ? targetIndex + 1 : currentStep.value + 1,
      remark: isStatusBackward(selectedStatus.value)
        ? `状态回退：${getStatusText(statusCompareBase.value)} → ${label}`
        : '',
    });
    ElMessage.success(`状态已更新为：${label}`);
    selectedStatus.value = '';
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '更新失败');
  } finally {
    statusLoading.value = false;
  }
};

// ==================== ⭐ 暂停 / 恢复 ====================
// 暂停 = 临时停下，工序进度与已填数据都不动；恢复时按暂停前的工序继续
const handlePauseOrder = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      '暂停后订单会停在当前工序（数据不改），可以随时恢复生产。可填写暂停原因。',
      '暂停订单',
      {
        confirmButtonText: '确认暂停',
        cancelButtonText: '再想想',
        inputType: 'textarea',
        inputPlaceholder: '可选：暂停原因',
        inputValidator: () => true
      }
    );
    await updateProduction(orderId.value, {
      status: 'paused',
      step: 0,
      remark: (value || '').trim() || '工厂暂停'
    });
    ElMessage.success(`订单已暂停（暂停前：${getStatusText(orderData.value?.flowStatus)}）`);
    loadData();
  } catch (e) {
    if (e !== 'cancel' && e?.name !== 'cancel') ElMessage.error(e.message || '暂停失败');
  }
};

const handleResumeOrder = async () => {
  const origin = orderData.value?.pauseOriginStatus;
  if (!origin) {
    ElMessage.warning('没有记录到暂停前的工序，请在「更新为」里手动选择要恢复的工序');
    return;
  }
  try {
    await updateProduction(orderId.value, { status: origin, step: 0, remark: '恢复生产' });
    ElMessage.success(`已恢复生产：${getStatusText(origin)}`);
    loadData();
  } catch (e) {
    ElMessage.error(e.message || '恢复失败');
  }
};

// ==================== 返回 ====================
const goBack = () => router.push(backListPath.value);

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// 折算率格式化（如 1 → 1.000，0.755 → 0.755）
const formatRate = (rate) => {
  const n = Number(rate);
  if (rate === null || rate === undefined || isNaN(n)) return '-';
  return n.toFixed(3);
};

// ==================== 初始化 ====================
onMounted(async () => {
  try {
    const [lossRateRes, productionStatusRes, purityRes] = await Promise.all([
      dictApi.getItemsByKey('lossrate'),
      dictApi.getItemsByKey('production_status'),
      dictApi.getItemsByKey('purity'),
    ]);

    lossRateOptions.value = (lossRateRes?.data || []).map(item => ({
      label: item.itemLabel || item.itemValue,
      value: Number(item.itemValue),
    }));

    productionStatuses.value = (productionStatusRes?.data || []).map(item => ({
      key: item.itemValue,
      title: item.itemLabel || item.itemValue,
      label: item.itemLabel || item.itemValue,
    }));

    purityDict.value = purityRes?.data || [];
  } catch {
    ElMessage.error('加载字典失败');
  }
  loadData();
});
</script>

<style scoped>
.page-container {
  background: #f5f7fa;
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
  border-radius: 8px 8px 0 0;
  flex-wrap: wrap;
  gap: 12px;
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
}
/* ⭐ 制作完成的提示已挪到「订单编辑」列表页，编辑页不再重复提示 */

/* ===== 底部操作栏（保存按钮放下面，滚动时贴底） ===== */
.bottom-actions {
  position: sticky;
  bottom: 0;
  z-index: 20;
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: #fff;
  border-top: 1px solid #e8ecf1;
  border-radius: 8px;
  box-shadow: 0 -4px 14px rgba(0, 0, 0, 0.06);
}
.bottom-actions .bottom-tip {
  margin-right: auto;
  font-size: 12px;
  color: #909399;
}

/* ===== 内容区域 ===== */
.content-body {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 20px 24px;
}

.section-divider {
  height: 1px;
  background: #e8ecf1;
  margin: 18px 0;
}

/* ⭐ 单成色的提示条：说明现在按单成色算，要多种成色才展开明细 */
.gold-mode-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  padding: 6px 10px;
  background: #f7f9fc;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
  color: #909399;
}
.gold-mode-bar.is-collapse { background: #fdf6ec; border-color: #f5dab1; }
.gold-mode-tip { flex: 1; min-width: 0; line-height: 1.5; }

.section-title {
  font-weight: 600;
  font-size: 15px;
  color: #1d2129;
  margin-bottom: 14px;
}

/* ⭐ 主石信息标题行：钻石级别 + 带入历史钻石 */
.stone-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.stone-bring {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-weight: 400;
}
.stone-level {
  font-size: 13px;
  color: #606266;
}
.stone-level b {
  color: #1d2129;
  font-weight: 600;
}
.stone-bring-hint {
  font-size: 12px;
  color: #909399;
  max-width: 460px;
}
.stone-bring-hint.is-ok {
  color: #67c23a;
}

/* ===== 信息区域 ===== */
.info-section .info-item {
  padding: 4px 0;
  font-size: 14px;
}
.info-section .info-item .label {
  color: #909399;
}
.info-section .info-item .value {
  color: #303133;
  font-weight: 500;
}

/* ===== 表单区域 ===== */
.form-section :deep(.el-form-item) {
  margin-bottom: 8px;
}
.form-section :deep(.el-form-item__label) {
  font-size: 13px;
  color: #666;
  padding-right: 4px;
}
.form-section :deep(.el-input-number) {
  width: 100%;
}
.form-section :deep(.el-select) {
  width: 100%;
}

/* 合计金额高亮 */
.form-section :deep(.el-form-item:last-child .el-input-number input) {
  color: #E6A23C;
  font-weight: bold;
}

/* ⭐ 损耗非标准值时红色标注 */
.loss-warning :deep(.el-input__wrapper) {
  border: 1px solid #F56C6C !important;
  box-shadow: 0 0 0 1px #F56C6C inset !important;
}
.loss-warning :deep(.el-input__inner) {
  color: #F56C6C !important;
  font-weight: 600;
}

/* ⭐ 客户默认损耗提示（下单自动带出，可一键还原） */
.loss-cust-tip {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.4;
  color: #909399;
  white-space: nowrap;
}
.loss-cust-tip a {
  color: #409EFF;
  cursor: pointer;
  margin-left: 4px;
}
.loss-cust-tip a:hover { text-decoration: underline; }

/* ⭐ 成色颜色点 */
.color-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #dcdfe6;
  vertical-align: middle;
  margin-right: 4px;
}
.purity-rate {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

/* ⭐ 图片区域 */
.image-group {
  margin-bottom: 18px;
}
.image-group:last-child {
  margin-bottom: 0;
}
.image-group-label {
  font-size: 13px;
  font-weight: 500;
  color: #4e5969;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.image-group-label .badge {
  background: #f0f2f5;
  color: #606266;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: normal;
}
.image-group-label .badge-blue {
  background: #ecf5ff;
  color: #409EFF;
}
.image-group-label .badge-orange {
  background: #fdf6ec;
  color: #E6A23C;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.detail-image {
  width: 100px;
  height: 100px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #e8ecf1;
  transition: transform 0.2s;
  object-fit: cover;
  background: #fafafa;
}
.detail-image:hover {
  transform: scale(1.04);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* ⭐ 字印要求图：蓝色实线框 */
.letter-img {
  border: 2px solid #409EFF;
}
/* ⭐ 字印参考图：橙色虚线框 */
.letter-ref-img {
  border: 2px dashed #E6A23C;
}

/* ===== 图片管理 ===== */
.image-block { margin-bottom: 20px; }
.image-block-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}
.tip-text { font-size: 12px; color: #909399; font-weight: 400; }

/* ===== 成本数据（LR 成本行）：销售行白底 / 成本行红底 ===== */
.cost-subtitle {
  font-size: 12px;
  color: #909399;
  font-weight: 400;
  margin-left: 10px;
}

/* ⭐ 复制单「从复刻订单带出」开关 */
.copy-bring {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
  padding: 2px 10px;
  background: #f0f7ff;
  border: 1px solid #c6e2ff;
  border-radius: 4px;
  font-weight: 400;
}
.copy-bring-label { font-size: 12px; color: #303133; font-weight: 600; }
.copy-bring-hint { font-size: 12px; color: #909399; }
.cost-table :deep(.cost-row-red) {
  background: #fdecec !important;
}
.cost-table :deep(.cost-row-red td.el-table__cell) {
  background: #fdecec !important;
  color: #c0392b;
}
.cost-table :deep(.sale-row-white td.el-table__cell) {
  background: #ffffff;
}
/* ⭐ 销售行与成本行之间的黄色填充间隔行 */
.cost-table :deep(tr.cost-gap-row > td.el-table__cell) {
  background: #ffe58f !important;
  border-top: 0 !important;
  border-bottom: 0 !important;
  padding: 0 !important;
  height: 14px !important;
}
.cost-table :deep(tr.cost-gap-row > td.el-table__cell .cell) {
  display: none;
}
/* 由订单带出、不可编辑的字段 */
.locked-cell {
  color: #a8abb2;
  cursor: not-allowed;
}
.cost-table :deep(.cell) {
  padding: 3px 4px;
}
.cost-table :deep(.el-input__wrapper) {
  padding: 0 6px;
}
.cell-input :deep(input),
.cost-table :deep(.el-input__inner) {
  text-align: center;
  color: #c0392b;
  font-weight: 500;
}
.auto-cell {
  color: #606266;
  font-family: Consolas, Monaco, monospace;
}
.cost-total-text {
  color: #c0392b !important;
  font-weight: 600;
}
.profit-cell {
  color: #303133;
  font-weight: 600;
}
.cost-table :deep(.profit-column) {
  vertical-align: middle;
  text-align: center;
}
.cost-type-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
/* 大号预警图标 */
.cell-over :deep(.el-input__wrapper) {
  background: #fef0f0;
  box-shadow: 0 0 0 1px #f56c6c inset;
}
.cell-over :deep(.el-input__inner) {
  color: #f56c6c;
  font-weight: 600;
}

.cost-warn-icon {
  color: #f56c6c;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  cursor: help;
}
.cost-warn-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 6px;
}
.cost-warn-title {
  font-size: 13px;
  font-weight: 600;
  color: #c0392b;
}
.cost-warn-item {
  font-size: 12px;
  color: #c0392b;
  line-height: 1.8;
}

/* ⭐ 暂停 / 恢复：大号按钮 */
.pause-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 14px;
  padding: 10px 14px;
  background: #fffaf1;
  border: 1px dashed #f0c78a;
  border-radius: 8px;
}
.pause-big-btn {
  height: 54px;
  min-width: 180px;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  border-radius: 8px;
}
.pause-info {
  font-size: 13px;
  color: #a06a00;
}
.status-locked-tip {
  font-size: 13px;
  line-height: 1.7;
  color: #909399;
  background: #f7f8fa;
  border-left: 3px solid #dcdfe6;
  border-radius: 4px;
  padding: 8px 12px;
}
.status-locked-tip b { color: #606266; }
</style>