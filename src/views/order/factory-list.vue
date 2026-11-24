<!-- src/views/order/factory-list.vue -->
<template>
  <div class="page-container" :class="{ 'is-fullscreen': isFullscreen }">
    <!-- ⭐ 全屏时常驻右上角的退出按钮（滚动到表格中段也能点，Esc 亦可） -->
    <FullscreenExit v-if="isFullscreen" @exit="toggleFullscreen" />
    <div class="page-header">
      <div class="header-left">
        <h2>{{ pageTitle }}</h2>
        <!-- ⭐ 待审核：审核完成后的去处说明（历史订单 + 自动生成账单） -->
        <span v-if="mode === 'audit'" class="audit-hint">
          订单审核完成之后请到历史订单中查看，同时会自动生成账单，您可去【生成账单】页面编辑或者提交账单审核
        </span>
        <!-- ⭐ 订单编辑：制作完成的入口与去向说明（原来放在编辑页，改到列表更好找） -->
        <span v-if="mode === 'edit'" class="edit-hint">
          订单制作完成后，点列表操作列的【制作完成】，状态更新为「制作完成」，订单自动进入【待审核】等待提交
        </span>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <!-- ⭐ 批量接单：只在"待接单"tab 显示 -->
        <el-button
          v-if="selectedOrders.length > 0 && activeTab === 'waitingFactory'"
          type="success"
          @click="handleBatchAccept"
        >
          批量接单 ({{ selectedOrders.length }})
        </el-button>

        <!-- ⭐ 审核模式：多选批量操作（提交审核 / 撤回 / 审核） -->
        <template v-if="mode === 'audit' && selectedOrders.length > 0">
          <el-button v-if="canSubmitAudit" type="primary" plain @click="handleBatchSubmitAudit">
            📤 批量提交审核 ({{ selectedOrders.length }})
          </el-button>
          <el-button v-if="canSubmitAudit" type="warning" plain @click="handleBatchWithdrawAudit">
            ↩️ 批量撤回 ({{ selectedOrders.length }})
          </el-button>
          <template v-if="canAuditProduction">
            <el-button type="success" @click="handleBatchAuditProduction(true)">
              ✅ 批量通过 ({{ selectedOrders.length }})
            </el-button>
            <el-button type="danger" plain @click="handleBatchAuditProduction(false)">
              ⛔ 批量驳回 ({{ selectedOrders.length }})
            </el-button>
          </template>
        </template>

        <!-- ⭐ 批量生成账单：只在"已完成"tab 显示 -->
        <el-button
          v-if="selectedOrders.length > 0 && activeTab === 'completed'"
          type="warning"
          @click="handleBatchGenerateBill"
        >
          批量生成账单 ({{ selectedOrders.length }})
        </el-button>

        <el-button type="primary" @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
        <!-- ⭐ 审核模式：一键展开/收起「销售行 / 成本行」对比 -->
        <el-checkbox
          v-if="mode === 'audit'"
          v-model="expandAll"
          style="margin-left: 4px;"
          @change="onExpandAllChange"
        >展开销售/成本对比</el-checkbox>
        <span v-if="mode === 'audit' && warnCount > 0" class="audit-warn-tip">
          ❗ 有 {{ warnCount }} 单成本高于销售
        </span>
        <el-button @click="toggleFullscreen">
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
      </div>
    </div>

    <!-- ⭐ 一级 Tab（按菜单拆分后不再显示） -->
    <div v-show="!isFullscreen && !modeConf" class="order-tabs-wrapper">
      <el-tabs v-model="activeTab" @tab-change="onTabChange" class="order-tabs">
        <el-tab-pane name="waitingFactory">
          <template #label>
            <span class="tab-label">
              待接单
              <el-badge v-if="tabCounts.waitingFactory > 0" :value="tabCounts.waitingFactory" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="factoryProcessing">
          <template #label>
            <span class="tab-label">
              制作中
              <el-badge v-if="tabCounts.factoryProcessing > 0" :value="tabCounts.factoryProcessing" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="productionAudit">
          <template #label>
            <span class="tab-label">
              制作完成待审核
              <el-badge v-if="tabCounts.productionAudit > 0" :value="tabCounts.productionAudit" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="completed">
          <template #label>
            <span class="tab-label">
              已完成
              <el-badge v-if="tabCounts.completed > 0" :value="tabCounts.completed" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="all">
          <template #label>
            <span class="tab-label">
              全部
              <el-badge v-if="tabCounts.total > 0" :value="tabCounts.total" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- ⭐ 二级子筛选（只在"制作中"显示） -->
    <div v-show="!isFullscreen && activeTab === 'factoryProcessing'" class="sub-tabs-wrapper">
      <el-radio-group v-model="subStatus" @change="onSubStatusChange">
        <el-radio-button value="">全部节点</el-radio-button>
        <!-- ⭐ 已报废：不混在正常工序里，单独一个筛选；点进去可一键继续生产 -->
        <el-radio-button value="scrapped">
          🚫 已报废
          <span v-if="getSubStatusCount('scrapped') > 0" class="sub-count scrap-count">
            {{ getSubStatusCount('scrapped') }}
          </span>
        </el-radio-button>
        <el-radio-button
          v-for="item in productionStatuses"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
          <span v-if="getSubStatusCount(item.value) > 0" class="sub-count">
            {{ getSubStatusCount(item.value) }}
          </span>
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 搜索栏 -->
    <div v-show="!isFullscreen" class="filter-bar">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width: 240px;"
        @change="handleSearch"
      />

      <el-input
        v-model="keyword"
        placeholder="搜索订单号/品名"
        style="width: 180px;"
        clearable
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      />

      <!-- ⭐ 维修单编号：编号是手工填的（不是系统流水），单独一个查询字段，
           输入纸质维修单上的编号即可联查回对应订单 -->
      <el-input
        v-model="filterRepairNo"
        placeholder="维修单编号"
        style="width: 150px;"
        clearable
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      />

      <el-select
        v-model="filterCustomerId"
        placeholder="全部客户"
        clearable
        filterable
        style="width: 180px;"
        @change="handleSearch"
      >
        <el-option
          v-for="item in customerList"
          :key="item.customerId"
          :label="item.customerName"
          :value="item.customerId"
        />
      </el-select>

      <el-button type="primary" @click="handleSearch">
        <el-icon><Search /></el-icon> 搜索
      </el-button>
      <el-button @click="resetSearch">
        <el-icon><RefreshRight /></el-icon> 重置
      </el-button>

      <!-- ⭐ 待审核视图：按提交状态筛选 -->
      <el-radio-group
        v-if="mode === 'audit' && canSubmitAudit"
        v-model="auditSubmitFilter"
        size="default"
        style="margin-left: auto;"
        @change="onAuditFilterChange"
      >
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="pending">
          待提交<span v-if="auditPendingCount > 0" class="sub-count">{{ auditPendingCount }}</span>
        </el-radio-button>
        <el-radio-button value="submitted">
          已提交<span v-if="auditSubmittedCount > 0" class="sub-count">{{ auditSubmittedCount }}</span>
        </el-radio-button>
      </el-radio-group>
    </div>

    <!-- 汇总 -->
    <div v-show="!isFullscreen" class="summary-bar" v-if="pagination.total > 0">
      <span>共 <b>{{ pagination.total }}</b> 个订单</span>
      <span v-if="!dateRange || dateRange.length !== 2" class="range-hint">不限日期</span>
      <span v-if="selectedOrders.length > 0" style="color:#409EFF;">
        已选 <b>{{ selectedOrders.length }}</b> 个
      </span>
      <span v-if="selectedOrders.length > 0" style="color:#E6A23C;">
        金额 ¥{{ selectedTotal.toFixed(2) }}
      </span>
    </div>

    <!-- 表格 -->
    <el-table
      ref="tableRef"
      :class="{ 'table-fullscreen': isFullscreen, 'is-audit-mode': mode === 'audit' }"
      :data="tableData"
      :empty-text="emptyText"
      border
      stripe
      v-loading="loading"
      @selection-change="handleSelectionChange"
      @row-click="handleRowClick"
      :row-class-name="rowClassName"
      row-key="orderId"
      :expand-row-keys="expandKeys"
      @expand-change="onExpandChange"
    >
      <el-table-column type="selection" width="45" align="center" @click.stop />

      <!-- ⭐ 审核模式：每条订单下方紧跟「销售行 / 黄色间隔 / 成本行」，与编辑订单页原样一致（只读） -->
      <el-table-column v-if="mode === 'audit'" type="expand" width="40">
        <template #default="{ row }">
          <div class="expand-cost-wrap">
            <CostCompareTable
              v-if="costMap[row.orderId]"
              :sale="costMap[row.orderId].sale"
              :cost="costMap[row.orderId].cost"
              :has-cost="costMap[row.orderId].hasCost"
              :warns="costMap[row.orderId].warns"
              :loading="costMap[row.orderId].loading"
              :large="isFullscreen"
            />
            <div v-else class="expand-loading">成本数据加载中…</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="标记" width="62" fixed align="center">
        <template #default="{ row }">
          <el-tooltip
            v-if="row.costWarnFlag"
            :content="'成本高于销售：' + (row.costWarnReason || '')"
            placement="top"
          >
            <span class="cost-warn-flag">❗</span>
          </el-tooltip>
          <el-tooltip
            v-if="row.warnFlag || row.alertReason || row.urgentFlag"
            :content="getFlagTooltip(row)"
            placement="top"
          >
            <span class="order-flags">
              <span v-if="row.warnFlag || row.alertReason" class="order-flag order-warning-flag">❗</span>
              <span v-if="row.urgentFlag" class="order-flag order-urgent-flag">🔥</span>
            </span>
          </el-tooltip>
          <span v-if="!row.costWarnFlag && !row.warnFlag && !row.alertReason && !row.urgentFlag" class="order-flag-placeholder">-</span>
        </template>
      </el-table-column>

      <el-table-column prop="orderNo" label="订单号" :width="mode === 'accept' && !isFullscreen ? 130 : 150" fixed>
        <template #default="{ row }">
          <el-link
            type="primary"
            :class="{ 'blink-modify': hasPendingModify(row) }"
            @click.stop="viewDetail(row.orderId)"
          >
            {{ row.orderNo }}
            <span v-if="hasPendingModify(row)" class="modify-badge"><ModifyTripodIcon /></span>
          </el-link>
          <!-- ⭐ 维修单编号（手工填的那个号）：红色显示，按维修单编号查完能直接核对 -->
          <div v-if="row.repairNo" class="repair-no-line" :title="`维修单编号：${row.repairNo}`">
            {{ row.repairNo }}
          </div>
        </template>
      </el-table-column>

      <!-- ⭐ 审核提交状态：制作完成后需手动提交，未提交的不进审核队列 -->
      <el-table-column v-if="mode === 'audit'" label="审核状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag v-if="isAuditSubmitted(row)" type="warning" effect="light">已提交待审核</el-tag>
          <el-tag v-else type="info" effect="plain">待提交</el-tag>
          <div v-if="isAuditSubmitted(row) && row.productionSubmittedAt" class="audit-submitted-at">
            {{ formatShortTime(row.productionSubmittedAt) }}
          </div>
        </template>
      </el-table-column>

      <!-- 状态列：点击可改状态（订单编辑视图 / 全部视图） -->
      <el-table-column v-if="mode !== 'audit'" prop="flowStatus" label="状态" :width="mode === 'accept' && !isFullscreen ? 100 : 120" align="center" fixed>
        <template #default="{ row }">
          <span
            v-if="normalizeStatus(row.flowStatus) === 'paused'"
            class="paused-status"
            :title="`暂停中 · 暂停前：${row.pauseOriginStatusText || row.pauseOriginStatus || '—'}（点击恢复）`"
            @click.stop="onStatusClick(row)"
          >
            <span class="paused-bars"><i></i><i></i></span>
            <span class="paused-text">已暂停</span>
          </span>
          <span
            v-else-if="normalizeStatus(row.flowStatus) === 'scrapped'"
            class="scrap-status"
            :title="`${row.scrappedAt ? '已于 ' + formatShortTime(row.scrappedAt) + ' 报废' : '已报废'}${row.scrapOriginStatusText ? `（报废前：${row.scrapOriginStatusText}）` : ''}，点击继续生产`"
            @click.stop="onStatusClick(row)"
          >
            <span class="scrap-text">已报废</span>
            <span class="scrap-tip">点击继续</span>
          </span>
          <el-tag
            v-else
            :type="getStatusType(row.flowStatus)"
            size="default"
            effect="light"
            :class="{ 'status-clickable': canChangeStatus(row) }"
            :title="canChangeStatus(row) ? '点击更新状态' : ''"
            @click.stop="onStatusClick(row)"
          >
            {{ getStatusText(row.flowStatus) }}
          </el-tag>
          <!-- ⭐ 修理货：退货返修的单，状态下面一直挂着标签 -->
          <div v-if="row.isRepair" class="repair-tag" title="客户退货返修的单，修好后重新出账">修理货</div>
        </template>
      </el-table-column>

      <!-- 账单列 -->
      <el-table-column v-if="mode !== 'edit' && mode !== 'accept' && mode !== 'audit'" label="账单" width="120" align="center">
        <template #default="{ row }">
          <el-link v-if="row.billId" type="primary" @click.stop="viewBill(row.billId)">
            {{ row.billNo || '账单' }}
          </el-link>
          <span v-else-if="normalizeStatus(row.flowStatus) === 'completed'" style="color:#999;font-size:12px">未生成</span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column label="客户/销售" :width="mode === 'accept' && !isFullscreen ? 140 : 160">
        <template #default="{ row }">
          {{ row.customerName || '-' }}<span v-if="row.salesman || row.operatorName" class="customer-salesman">/{{ row.salesman || row.operatorName }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="orderDate" label="订单日期" :width="mode === 'accept' && !isFullscreen ? 100 : 110" align="center">
        <template #default="{ row }">
          {{ formatDate(row.orderDate) }}
        </template>
      </el-table-column>
      <el-table-column prop="productName" label="品名" :min-width="mode === 'accept' && !isFullscreen ? 100 : 120" />
      <el-table-column label="图片" :width="mode === 'accept' && !isFullscreen ? 56 : 70" align="center">
        <template #default="{ row }">
          <el-image
            v-if="row.imageUrl"
            :src="row.imageUrl"
            fit="cover"
            :style="mode === 'accept' && !isFullscreen
              ? 'width: 36px; height: 36px; border-radius: 4px; cursor: pointer;'
              : 'width: 45px; height: 45px; border-radius: 4px; cursor: pointer;'"
            :preview-src-list="[row.imageUrl]"
            preview-teleported
            @click.stop
          />
          <span v-else style="color: #ccc; font-size: 12px;">无图</span>
        </template>
      </el-table-column>
      <el-table-column prop="size" label="手寸" :width="mode === 'accept' && !isFullscreen ? 65 : 80" align="center" />
      <el-table-column prop="quantity" label="数量" :width="mode === 'accept' && !isFullscreen ? 55 : 70" align="center" />
      <el-table-column label="成色" :width="mode === 'accept' && !isFullscreen ? 65 : 80" align="center">
        <template #default="{ row }">
          <PurityCell :label="row.purityLabel" :color="row.color" />
        </template>
      </el-table-column>
      <el-table-column label="颜色" :width="mode === 'accept' && !isFullscreen ? 62 : 80" align="center">
        <template #default="{ row }">{{ resolveGemColor(row) || '-' }}</template>
      </el-table-column>
      <el-table-column prop="goldPrice" label="金价" :width="mode === 'accept' && !isFullscreen ? 75 : 90" align="right">
        <template #default="{ row }">{{ row.goldPrice || '-' }}</template>
      </el-table-column>
      <el-table-column prop="diamondLevel" label="钻石级别" :width="mode === 'accept' && !isFullscreen ? 80 : 100" align="center" />
      <el-table-column prop="deliveryDays" label="工期" :width="mode === 'accept' && !isFullscreen ? 60 : 70" align="center" />
      <el-table-column v-if="mode !== 'accept' || isFullscreen" prop="totalWeight" label="总重" width="85" align="right">
        <template #default="{ row }">{{ row.totalWeight || '-' }}</template>
      </el-table-column>
      <el-table-column v-if="mode !== 'accept' || isFullscreen" prop="netWeight" label="净重" width="85" align="right">
        <template #default="{ row }">{{ row.netWeight || '-' }}</template>
      </el-table-column>
      <el-table-column v-if="mode !== 'accept' || isFullscreen" prop="lossRate" label="损耗" width="84" align="center">
        <template #default="{ row }">
          <span v-if="isAbnormalLoss(row.lossRate)" class="loss-abnormal" title="非标准损耗（1.08 / 1.09 / 1.10）">
            {{ row.lossRate }}
          </span>
          <span v-else>{{ row.lossRate || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column v-if="mode !== 'accept' || isFullscreen" prop="laborFee" label="工费" width="85" align="right">
        <template #default="{ row }">{{ row.laborFee || '-' }}</template>
      </el-table-column>
      <el-table-column v-if="mode !== 'accept' || isFullscreen" prop="totalAmount" label="金额" width="110" align="right">
        <template #default="{ row }">
          <span style="color: #E6A23C; font-weight: bold;">
            ¥{{ (row.totalAmount || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>

      <!-- ⭐ 审核模式：成本状态（已录 / 未录 / 高于销售），明细在下方展开行；固定在右侧常驻可见 -->
      <el-table-column v-if="mode === 'audit'" label="成本" width="124" align="center" fixed="right">
        <template #default="{ row }">
          <template v-if="costMap[row.orderId] && !costMap[row.orderId].loading">
            <div class="cost-state-cell">
              <el-tooltip v-if="costMap[row.orderId].warns?.length" :content="warnText(row)" placement="top">
                <el-tag type="danger" effect="dark" size="small">❗ 高于销售</el-tag>
              </el-tooltip>
              <el-tag v-else-if="costMap[row.orderId].hasCost" type="success" size="small">已录</el-tag>
              <el-tag v-else type="info" size="small">未录</el-tag>
              <span v-if="!costMap[row.orderId].warns?.length" class="cost-profit-line">
                利润 {{ costProfit(row) }}
              </span>
            </div>
          </template>
          <span v-else style="color:#c0c4cc;font-size:12px;">…</span>
        </template>
      </el-table-column>

      <!-- ⭐ 审核模式 + 全屏：把工厂录入的成本/石料明细铺开（口径同账单审核） -->
      <template v-if="mode === 'audit' && isFullscreen">
        <el-table-column prop="widthThick" label="宽/厚度" width="80" align="center" />
        <el-table-column prop="weightRequirement" label="克重要求" width="95" align="center" />
        <el-table-column prop="addLossWeight" label="加耗重" width="85" align="right">
          <template #default="{ row }">{{ row.addLossWeight ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="goldMaterialWeight" label="足金料(g)" width="95" align="right">
          <template #default="{ row }">{{ row.goldMaterialWeight ?? '-' }}</template>
        </el-table-column>
        <el-table-column prop="goldMaterialFee" label="足金料金额" width="105" align="right">
          <template #default="{ row }">{{ money(row.goldMaterialFee) }}</template>
        </el-table-column>
        <el-table-column label="主石" align="center">
          <el-table-column prop="mainStoneQty" label="粒数" width="55" align="center">
            <template #default="{ row }">{{ row.mainStoneQty || '-' }}</template>
          </el-table-column>
          <el-table-column prop="mainStoneWeight" label="石重(ct)" width="85" align="right">
            <template #default="{ row }">{{ row.mainStoneWeight || '-' }}</template>
          </el-table-column>
          <el-table-column prop="mainStonePrice" label="单价" width="85" align="right">
            <template #default="{ row }">{{ row.mainStonePrice || '-' }}</template>
          </el-table-column>
          <el-table-column prop="mainStoneAmount" label="金额" width="95" align="right">
            <template #default="{ row }">{{ money(row.mainStoneAmount) }}</template>
          </el-table-column>
          <el-table-column prop="mainStoneSettingFee" label="镶石工费" width="90" align="right">
            <template #default="{ row }">{{ money(row.mainStoneSettingFee) }}</template>
          </el-table-column>
        </el-table-column>
        <el-table-column label="副石" align="center">
          <el-table-column prop="subStoneQty" label="粒数" width="55" align="center">
            <template #default="{ row }">{{ row.subStoneQty || '-' }}</template>
          </el-table-column>
          <el-table-column prop="subStoneWeight" label="石重(ct)" width="85" align="right">
            <template #default="{ row }">{{ row.subStoneWeight || '-' }}</template>
          </el-table-column>
          <el-table-column prop="subStonePrice" label="单价" width="85" align="right">
            <template #default="{ row }">{{ row.subStonePrice || '-' }}</template>
          </el-table-column>
          <el-table-column prop="subStoneAmount" label="金额" width="95" align="right">
            <template #default="{ row }">{{ money(row.subStoneAmount) }}</template>
          </el-table-column>
          <el-table-column prop="subStoneSettingFee" label="镶石工费" width="90" align="right">
            <template #default="{ row }">{{ money(row.subStoneSettingFee) }}</template>
          </el-table-column>
        </el-table-column>
        <el-table-column label="包装/证书/邮费" width="120" align="right">
          <template #default="{ row }">
            {{ money(row.packingFee) }} / {{ money(row.certificateFee) }} / {{ money(row.postageFee) }}
          </template>
        </el-table-column>
        <el-table-column prop="moldFee" label="版费" width="80" align="right">
          <template #default="{ row }">{{ money(row.moldFee) }}</template>
        </el-table-column>
        <el-table-column prop="costPrice" label="成本" width="95" align="right">
          <template #default="{ row }">{{ money(row.costPrice) }}</template>
        </el-table-column>
        <el-table-column prop="profit" label="利润" width="95" align="right">
          <template #default="{ row }">
            <span :style="{ color: (row.profit || 0) < 0 ? '#f56c6c' : '#67c23a' }">{{ money(row.profit) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="factoryRemark" label="工厂备注" width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.factoryRemark || '-' }}</template>
        </el-table-column>
      </template>

      <!-- 操作列 -->
      <el-table-column v-if="showActionColumn && (!isFullscreen || mode === 'audit')" label="操作" :width="mode === 'edit' ? 252 : (mode === 'audit' ? 232 : 96)" fixed="right" align="center">
        <template #default="{ row }">
          <div v-if="mode === 'edit' || mode === 'audit'" class="edit-row-actions">
            <template v-if="mode === 'edit'">
              <el-button
                v-if="allow('edit') && canEditRow(row)"
                size="small"
                type="primary"
                plain
                @click.stop="goFactoryEdit(row.orderId)"
              >编辑</el-button>
              <!-- ⭐ 列表直接标「制作完成」：更新后订单进【待审核】等待提交 -->
              <el-button
                v-if="canMarkProductionCompleted(row)"
                size="small"
                type="success"
                plain
                :loading="completingOrderId === row.orderId"
                @click.stop="handleMarkProductionCompleted(row)"
              >制作完成</el-button>
              <el-button
                v-if="allow('repair')"
                size="small"
                type="warning"
                plain
                @click.stop="goRepair(row)"
              >维修单</el-button>
            </template>
            <!-- ⭐ 待审核视图：制作完成后不自动提交，这里手动提交 / 撤回 / 审核 -->
            <template v-else>
              <el-button
                v-if="isAuditSubmitPending(row) && canSubmitAudit"
                size="small"
                type="primary"
                plain
                @click.stop="handleSubmitAudit(row)"
              >提交审核</el-button>
              <el-button
                v-if="isAuditSubmitted(row) && canSubmitAudit"
                size="small"
                type="warning"
                plain
                @click.stop="handleWithdrawAudit(row)"
              >撤回</el-button>
              <el-button
                v-if="isAuditSubmitted(row) && canAuditProduction"
                size="small"
                type="success"
                plain
                @click.stop="openAuditPreview(row)"
              >审核</el-button>
              <!-- ⭐ 制作完成（含已提交待审核）：审核通过前工厂操作员仍可改 -->
              <el-button
                v-if="allow('edit') && canEditRow(row)"
                size="small"
                type="primary"
                plain
                @click.stop="goFactoryEdit(row.orderId)"
              >编辑</el-button>
              <span v-if="!canSubmitAudit && !(isAuditSubmitted(row) && canAuditProduction)" class="no-action">—</span>
            </template>
          </div>
          <el-dropdown
            v-else
            trigger="hover"
            placement="left-start"
            @command="(cmd) => handleRowAction(cmd, row)"
            @visible-change="(v) => { if (v) ensurePackage(row); }"
          >
            <el-button size="small" type="primary" plain @click.stop>
              操作<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-if="allow('accept') && normalizeStatus(row.flowStatus) === 'customerAudited'"
                  command="accept"
                >接单</el-dropdown-item>

                <el-dropdown-item
                  v-if="allow('status') && (isInProduction(row.flowStatus) || normalizeStatus(row.flowStatus) === 'factory_edit' || normalizeStatus(row.flowStatus) === 'scrapped')"
                  command="status"
                >{{ normalizeStatus(row.flowStatus) === 'scrapped' ? '继续生产' : '更新状态' }}</el-dropdown-item>

                <el-dropdown-item v-if="allow('repair')" command="repair">维修单</el-dropdown-item>

                <!-- ⭐ 已完成 且未生成账单 → 生成账单 -->
                <el-dropdown-item
                  v-if="allow('bill') && normalizeStatus(row.flowStatus) === 'completed' && !row.billId && (userStore.isFactoryOrder || userStore.isAdmin)"
                  command="bill"
                >生成账单</el-dropdown-item>

                <!-- ⭐ 制作完成待审核（已提交）→ 审核制作完成 -->
                <el-dropdown-item
                  v-if="allow('auditProduction') && isAuditSubmitted(row) && (userStore.isFactoryAudit || userStore.isAdmin)"
                  command="auditProduction"
                >审核制作完成</el-dropdown-item>

                <!-- ⭐ 待工厂确认取消 → 确认取消 -->
                <el-dropdown-item
                  v-if="allow('pause') && row.pauseStatus === 'pendingFactoryConfirm' && (userStore.isFactoryOrder || userStore.isAdmin)"
                  command="confirmCancel"
                >确认取消</el-dropdown-item>

                <el-dropdown-item
                  v-if="allow('edit') && canEditRow(row)"
                  command="edit"
                >编辑</el-dropdown-item>

                <el-dropdown-item v-if="allow('downloadPackage') && row._hasPackage" command="downloadPackage">数据包下载</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>

    <!-- 空态由表格的 empty-text 呈现（按菜单视图给不同文案） -->

    <!-- 分页 -->
    <div v-show="!isFullscreen" style="margin-top: 16px; display: flex; justify-content: flex-end;">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="onPageChange"
        @current-change="onPageChange"
      />
    </div>

    <!-- 更新制作状态弹窗 -->
    <el-dialog v-model="statusDialogVisible" title="更新制作状态" width="520px" destroy-on-close>
      <div style="margin-bottom: 16px;">
        <p><strong>订单号：</strong>{{ currentOrder?.orderNo }}</p>
        <p><strong>品名：</strong>{{ currentOrder?.productName }}</p>
        <p><strong>当前状态：</strong>
          <el-tag :type="getStatusType(currentOrder?.flowStatus)" size="small">
            {{ getStatusText(currentOrder?.flowStatus) }}
          </el-tag>
        </p>
      </div>

      <!-- ⭐ 大号快捷操作：暂停 / 恢复 / 报废 / 继续生产 -->
      <div class="pause-quick">
        <!-- ⭐ 报废单：与暂停同款，一键回到报废前的工序继续做 -->
        <template v-if="normalizeStatus(currentOrder?.flowStatus) === 'scrapped'">
          <el-button
            type="success"
            size="large"
            class="pause-big-btn"
            :loading="statusLoading"
            @click="handleQuickResumeScrap"
          >
            ▶ 继续生产（回到 {{ currentOrder?.scrapOriginStatusText || '报废前工序' }}）
          </el-button>
          <div class="pause-quick-hint">
            <div>
              报废前工序：{{ currentOrder?.scrapOriginStatusText || currentOrder?.scrapOriginStatus || '—' }}
              <span v-if="currentOrder?.scrappedAt">　报废时间：{{ formatShortTime(currentOrder.scrappedAt) }}</span>
            </div>
            <div class="hint-sub">继续后按原工序接着做，不用重新下单。</div>
          </div>
        </template>
        <template v-else>
          <el-button
            v-if="normalizeStatus(currentOrder?.flowStatus) !== 'paused'"
            type="warning"
            size="large"
            class="pause-big-btn"
            :loading="statusLoading"
            :disabled="currentOrder?.pauseReqStatus === 'pendingAudit'"
            @click="handleQuickPause"
          >
            ⏸ 暂停订单
          </el-button>
          <template v-else>
            <!-- ⭐ 客户申请的暂停：工厂不能自行恢复，必须等客户方申请恢复后由客户审核员批准 -->
            <el-button
              v-if="currentOrder?.pauseOwner === 'customer'"
              type="info"
              size="large"
              class="pause-big-btn"
              disabled
            >
              ⏸ 客户申请暂停，等客户方恢复
            </el-button>
            <el-button
              v-else
              type="success"
              size="large"
              class="pause-big-btn"
              :loading="statusLoading"
              @click="handleQuickResume"
            >
              ▶ 恢复生产（回到 {{ currentOrder?.pauseOriginStatusText || '暂停前工序' }}）
            </el-button>
            <div class="pause-quick-hint">
              暂停前工序：{{ currentOrder?.pauseOriginStatusText || currentOrder?.pauseOriginStatus || '—' }}
              <span v-if="currentOrder?.pauseReason">　原因：{{ currentOrder.pauseReason }}</span>
              <span v-if="currentOrder?.pauseOwner === 'customer'">
                　客户暂停申请：{{ currentOrder?.pauseReqName || '客户' }}<template v-if="currentOrder?.pauseReqReason">（{{ currentOrder.pauseReqReason }}）</template>
              </span>
            </div>
          </template>

          <!-- ⭐ 报废：做坏了 / 客户不要了。报废后同样可以一键继续，不用重新下单 -->
          <div class="scrap-line">
            <span class="scrap-line-tip">做坏了要作废？报废后还能继续生产，不丢进度</span>
            <el-button
              type="danger"
              plain
              size="small"
              :loading="statusLoading"
              @click="handleQuickScrap"
            >🚫 报废订单</el-button>
          </div>
        </template>
      </div>

      <el-form label-width="80px">
        <el-form-item label="更新为" required>
          <el-select v-model="selectedStatus" placeholder="请选择目标状态" style="width: 100%;">
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="statusRemark"
            type="textarea"
            :rows="2"
            placeholder="可选备注"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="confirmStatusUpdate"
          :loading="statusLoading"
          :disabled="!selectedStatus"
        >
          确认更新
        </el-button>
      </template>
    </el-dialog>

    <!-- 审核制作完成弹窗 -->
    <el-dialog v-model="auditProductionDialogVisible" title="审核制作完成" width="450px" destroy-on-close>
      <el-alert
        v-if="auditProductionRow"
        :type="auditProductionApproved ? 'success' : 'warning'"
        :title="auditProductionApproved ? AUDIT_PRODUCTION_TITLES.pass : AUDIT_PRODUCTION_TITLES.reject"
        style="margin-bottom: 16px"
      />
      <el-form label-width="80px">
        <el-form-item label="订单号">
          <el-input :model-value="auditProductionRow?.orderNo" disabled />
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input v-model="auditProductionRemark" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditProductionDialogVisible = false">取消</el-button>
        <el-button type="success" :loading="auditProductionLoading" @click="confirmAuditProduction(true)">通过</el-button>
        <el-button type="danger" :loading="auditProductionLoading" @click="confirmAuditProduction(false)">驳回</el-button>
      </template>
    </el-dialog>

    <!-- ⭐ 待审核：Excel 式详情（可直接审核，明细里带销售/成本对比） -->
    <OrderPreviewDialog
      v-model="previewVisible"
      :order-id="previewOrderId"
      audit-mode
      show-cost-compare
      :audit-loading="previewAuditLoading"
      @audit="onPreviewAudit"
    />

    <!-- 流程抽屉 -->
    <FlowDrawer
      v-model="flowDrawerVisible"
      :order-id="currentFlowOrderId"
      :order-no="currentFlowOrderNo"
      :current-status="currentFlowStatus"
      @refresh="loadData"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, RefreshRight, Tools, ArrowDown } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getOrderList, acceptOrder, updateProduction, getOrderDetail, auditProduction, getOrderCost, confirmCancel, submitProductionAudit, withdrawProductionAudit, batchProductionAudit } from '@/api/order';
import { autoCreateBill, generateMissingBills } from '@/api/bill';
import { getCustomerList } from '@/api/customer';
import { dictApi } from '@/api/dict';
import { createBill } from '@/api/bill';
import FlowDrawer from '@/components/FlowDrawer.vue';
import OrderPreviewDialog from '@/components/OrderPreviewDialog.vue';
import ModifyTripodIcon from '@/components/ModifyTripodIcon.vue';
import PurityCell from '@/components/PurityCell.vue';
import { resolveGemColor } from '@/utils/color';
import CostCompareTable from '@/components/CostCompareTable.vue';
import FullscreenExit from '@/components/FullscreenExit.vue';

const router = useRouter();
const userStore = useUserStore();
const tableRef = ref();

const loading = ref(false);
const isFullscreen = ref(false);

// ===== ⭐ 审核模式：销售 / 成本 对比（展开行，只读） =====
const costMap = reactive({});      // orderId -> { sale, cost, hasCost, warns, loading }
const expandKeys = ref([]);
const expandAll = ref(true);

const warnCount = computed(() =>
  (tableData.value || []).filter(r => costMap[r.orderId]?.warns?.length).length
);
const warnText = (row) => (costMap[row.orderId]?.warns || []).map(w => w.text).join('；');
const costProfit = (row) => {
  const d = costMap[row.orderId];
  if (!d) return '-';
  const s = Number(d.sale?.totalAmount) || 0;
  const c = Number(d.cost?.totalAmount) || 0;
  return (s - c).toFixed(2);
};

// 拉取单张订单的销售行 / 成本行（后端一次返回 sale + cost + hasCost + warns）
const loadCost = async (orderId) => {
  if (costMap[orderId] && !costMap[orderId].error) return;
  costMap[orderId] = { ...(costMap[orderId] || {}), loading: true };
  try {
    const res = await getOrderCost(orderId);
    const d = res?.data || {};
    costMap[orderId] = {
      sale: d.sale || {},
      cost: d.cost || {},
      hasCost: !!d.hasCost,
      warns: d.warns || [],
      loading: false,
    };
  } catch (e) {
    console.warn('加载销售/成本对比失败:', orderId, e);
    costMap[orderId] = { sale: {}, cost: {}, hasCost: false, warns: [], loading: false, error: true };
  }
};

// 审核模式下批量加载当前页的成本数据（并发 4 条，避免一次打满）
const loadCostsForAudit = async () => {
  if (mode.value !== 'audit') return;
  const ids = (tableData.value || []).map(r => r.orderId).filter(id => !costMap[id]);
  for (let i = 0; i < ids.length; i += 4) {
    await Promise.all(ids.slice(i, i + 4).map(loadCost));
  }
  // 默认全部展开，方便连续审核
  if (expandAll.value) expandKeys.value = (tableData.value || []).map(r => r.orderId);
};

const onExpandAllChange = (v) => {
  expandKeys.value = v ? (tableData.value || []).map(r => r.orderId) : [];
};

// 受控展开：用户点单行箭头时同步 keys
const onExpandChange = (row, expandedRows) => {
  if (Array.isArray(expandedRows)) {
    expandKeys.value = expandedRows.map(r => r.orderId);
    expandAll.value = expandedRows.length === tableData.value.length && expandedRows.length > 0;
  }
  if (!costMap[row.orderId]) loadCost(row.orderId);
};

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  // 全屏时每条订单下方直接展开两行（销售 + 成本），便于连续审核
  if (isFullscreen.value && mode.value === 'audit') {
    expandAll.value = true;
    loadCostsForAudit();
    expandKeys.value = (tableData.value || []).map(r => r.orderId);
  }
};
const handleEsc = (e) => { if (e.key === 'Escape' && isFullscreen.value) { isFullscreen.value = false; } };
const tableData = ref([]);
const batchCreating = ref(false);
const keyword = ref('');
const filterCustomerId = ref('');
// ⭐ 维修单编号（手工填的那个号）单独查询条件
const filterRepairNo = ref('');
const selectedOrders = ref([]);
const customerList = ref([]);
const productionStatuses = ref([]);

const dateRange = ref([]);

// ===== 一级 Tab =====
// ⭐ 菜单参数化：同一个页面由路由 meta.mode（或 ?mode=）决定只显示哪一段、只允许哪些操作
const MODE_MAP = {
  accept:    { tab: 'waitingFactory',    title: '🏭 待接单',     allow: ['accept'] },
  edit:      { tab: 'factoryProcessing', title: '✏️ 订单编辑',   allow: ['edit', 'repair', 'status', 'downloadPackage', 'pause'] },
  audit:     { tab: 'productionAudit',   title: '🔍 待审核',     allow: ['auditProduction', 'submitAudit', 'withdrawAudit', 'edit'] },
  completed: { tab: 'completed',         title: '✅ 已完成订单', allow: ['bill', 'downloadPackage', 'status'] },
};
const route = useRoute();
const mode = computed(() => String(route.meta?.mode || route.query.mode || ''));
const modeConf = computed(() => MODE_MAP[mode.value] || null);
const pageTitle = computed(() => modeConf.value?.title || '🏭 工厂订单');
// 没有 mode 时表示「全部」视图，不限制操作
const allow = (cmd) => !modeConf.value || modeConf.value.allow.includes(cmd);

// 操作列是否显示：待审核视图下工厂业务员可提交/撤回、审核员可审核，都要有操作列
const showActionColumn = computed(() => {
  if (!modeConf.value) return true;
  return modeConf.value.allow.length > 0;
});

// ============================================================
// ⭐ 制作完成 → 提交审核 / 撤回（不自动提交审核）
// ============================================================
// 提交/撤回：工厂业务员、管理员；审核：审核员、管理员
const canSubmitAudit = computed(() => userStore.isFactoryOrder || userStore.isAdmin);
const canAuditProduction = computed(() => userStore.isFactoryAudit || userStore.isAdmin);

// ⭐ 工作台卡片带参直达：?submit=pending|submitted 直接落到「待提交 / 已提交」
const readSubmitFilter = () => {
  const v = String(route.query.submit || '').toLowerCase();
  return (v === 'pending' || v === 'submitted') ? v : 'all';
};
// ⭐ ?range=all：不限日期（积压多天的待提交单不会被默认「最近 30 天」筛掉）
const isAllRange = () => String(route.query.range || '').toLowerCase() === 'all';
const auditSubmitFilter = ref(readSubmitFilter());
const auditPendingCount = ref(0);
const auditSubmittedCount = ref(0);

const isAuditSubmitted = (row) =>
  normalizeStatus(row.flowStatus) === 'productionCompleted' && !!row.productionSubmittedAt;

const isAuditSubmitPending = (row) =>
  normalizeStatus(row.flowStatus) === 'productionCompleted' && !row.productionSubmittedAt;

const formatShortTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const onAuditFilterChange = () => {
  pagination.current = 1;
  loadData();
};

// 空态文案：按视图区分
const emptyText = computed(() => {
  const map = { accept: '暂无待接单订单', edit: '暂无制作中的订单', audit: '暂无待审核订单', completed: '暂无已完成订单' };
  return map[mode.value] || '暂无工厂订单';
});

// 状态穿透：编辑视图（或全部视图）下、处于制作阶段的订单，点状态标签可直接改状态
const canChangeStatus = (row) => {
  const st = normalizeStatus(row.flowStatus);
  // ⭐ 报废单：与暂停同款，可点状态「继续生产」（已完成页也放开）
  if (st === 'scrapped') return allow('status');
  if (modeConf.value && mode.value !== 'edit') return false;
  return st === 'factory_edit' || isInProduction(row.flowStatus);
};
const onStatusClick = (row) => {
  if (!canChangeStatus(row)) return;
  openStatusDialog(row);
};

const activeTab = ref(modeConf.value ? modeConf.value.tab : 'waitingFactory');
const subStatus = ref('');

const tabCounts = reactive({
  waitingFactory: 0,
  factoryProcessing: 0,
  productionAudit: 0,
  completed: 0,
  total: 0,
});
const subStatusCounts = ref({});

// Tab 与状态映射
const TAB_STATUS_MAP = {
  waitingFactory: ['customerAudited'],
  factoryProcessing: [
    'accepted', 'factory_edit', 'dataConfirm', 'waxing', 'molded', 'partsMissing',
    'setting', 'cnc', 'sweeping', 'stoneCutting', 'microInlay', 'handInlay',
    'assembly', 'polishing', 'paused', 'stoneReady', 'glue', 'inlay'
  ],
  productionAudit: ['productionCompleted'],
  completed: ['completed', 'cancelled', 'scrapped', 'unqualifiedReturn'],
  all: null,
};

const matchTab = (order, tab) => {
  const statuses = TAB_STATUS_MAP[tab];
  if (!statuses) return true;
  return statuses.includes(normalizeStatus(order.flowStatus));
};

const updateTabCounts = (list) => {
  tabCounts.waitingFactory = list.filter(x => TAB_STATUS_MAP.waitingFactory.includes(normalizeStatus(x.flowStatus))).length;
  tabCounts.factoryProcessing = list.filter(x => TAB_STATUS_MAP.factoryProcessing.includes(normalizeStatus(x.flowStatus))).length;
  tabCounts.productionAudit = list.filter(x => TAB_STATUS_MAP.productionAudit.includes(normalizeStatus(x.flowStatus))).length;
  tabCounts.completed = list.filter(x => TAB_STATUS_MAP.completed.includes(normalizeStatus(x.flowStatus))).length;
  tabCounts.total = list.length;
};

const updateSubStatusCounts = (list) => {
  const counts = {};
  list.forEach(x => {
    const st = normalizeStatus(x.flowStatus);
    // ⭐ 报废单单独计数（制作中页的「已报废」筛选要用）
    if (TAB_STATUS_MAP.factoryProcessing.includes(st) || st === 'scrapped') {
      counts[st] = (counts[st] || 0) + 1;
    }
  });
  subStatusCounts.value = counts;
};

const getSubStatusCount = (status) => subStatusCounts.value[status] || 0;

const onTabChange = () => {
  subStatus.value = '';
  pagination.current = 1;
  loadData();
};

const onSubStatusChange = () => {
  pagination.current = 1;
  loadData();
};

// 状态更新弹窗
const statusDialogVisible = ref(false);
const auditProductionDialogVisible = ref(false);
const auditProductionRow = ref(null);
const auditProductionApproved = ref(true);
const auditProductionRemark = ref('');
const auditProductionLoading = ref(false);
const statusLoading = ref(false);
const currentOrder = ref(null);
const selectedStatus = ref('');
const statusRemark = ref('');

// 流程抽屉
const flowDrawerVisible = ref(false);
const currentFlowOrderId = ref(0);
const currentFlowOrderNo = ref('');
const currentFlowStatus = ref('');

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const selectedTotal = computed(() => {
  return selectedOrders.value.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
});

// ============================================================
// 状态映射
// ============================================================
const statusMap = {
  customerAudited: { text: '待接单', type: 'success' },
  accepted: { text: '已接单', type: 'primary' },
  factory_edit: { text: '编辑中', type: 'primary' },
  dataConfirm: { text: '数据确认', type: 'primary' },
  waxing: { text: '出蜡', type: 'primary' },
  molded: { text: '倒模', type: 'primary' },
  setting: { text: '执模', type: 'primary' },
  cnc: { text: 'CNC', type: 'primary' },
  partsMissing: { text: '配件缺失', type: 'warning' },
  stoneReady: { text: '配石完成', type: 'primary' },
  glue: { text: '滴胶/磨石', type: 'primary' },
  inlay: { text: '镶嵌', type: 'primary' },
  assembly: { text: '组装', type: 'primary' },
  sweeping: { text: '扫镶口', type: 'primary' },
  stoneCutting: { text: '车石', type: 'primary' },
  microInlay: { text: '微镶', type: 'primary' },
  handInlay: { text: '手镶', type: 'primary' },
  polishing: { text: '抛光', type: 'primary' },
  paused: { text: '已暂停', type: 'warning' },
  productionCompleted: { text: '制作完成', type: 'warning' },
  billPending: { text: '账单待审核', type: 'warning' },
  billConfirmed: { text: '待确认', type: 'success' },
  completed: { text: '已完成', type: 'success' },
  cancelled: { text: '已取消', type: 'info' },
  scrapped: { text: '已报废', type: 'danger' },
};

const normalizeStatus = (status) => {
  const value = String(status || '').trim();
  const normalized = value.replace(/[_-]/g, '').toLowerCase();
  const aliases = {
    customeraudited: 'customerAudited',
    factoryedit: 'factory_edit',
    billpending: 'billPending',
    billconfirmed: 'billConfirmed',
    stonecutting: 'stoneCutting',
    microinlay: 'microInlay',
    handinlay: 'handInlay'
  };
  return aliases[normalized] || value;
};

const getStatusText = (status) => {
  const normalized = normalizeStatus(status);
  return productionStatuses.value.find(item => item.value === normalized)?.label
    || statusMap[normalized]?.text
    || status
    || '-';
};
const getStatusType = (status) => statusMap[normalizeStatus(status)]?.type || 'info';

const getFlagTooltip = (row) => {
  const messages = [];
  if (row.warnFlag || row.alertReason) messages.push(`注意：${row.alertReason || '请关注该订单'}`);
  if (row.urgentFlag) messages.push('加急');
  return messages.join('；');
};

// ⭐ 成本高于销售的订单：整行标红
const rowClassName = ({ row }) => (row.costWarnFlag ? 'row-cost-warn' : '');

const hasPendingModify = (row) => {
  return row.modifyTracking === true;
};

const isInProduction = (status) => {
  return productionStatuses.value.some(item => item.value === normalizeStatus(status));
};

// ============================================================
// ⭐ 编辑按钮权限：终态一律不显示编辑
// ============================================================
const FINAL_STATUSES = ['completed', 'cancelled', 'scrapped', 'unqualifiedReturn'];
const BILL_STAGE_STATUSES = ['billPending', 'billRejected', 'billConfirmed', 'completed'];

const canEditRow = (row) => {
  const st = normalizeStatus(row.flowStatus);
  // 终态：谁都不能编辑
  if (FINAL_STATUSES.includes(st)) return false;
  if (userStore.isAdmin) return true;
  if (userStore.isFactoryAudit) return BILL_STAGE_STATUSES.includes(st);
  if (userStore.isFactoryOrder) return !BILL_STAGE_STATUSES.includes(st);
  return false;
};

const isAbnormalLoss = (lossRate) => {
  if (lossRate === null || lossRate === undefined || lossRate === '') return false;
  const n = Number(lossRate);
  if (isNaN(n)) return false;
  return Math.abs(n - 1.08) > 1e-9 && Math.abs(n - 1.09) > 1e-9 && Math.abs(n - 1.10) > 1e-9;
};

// ============================================================
// 操作列下拉分发
// ============================================================
const handleRowAction = (cmd, row) => {
  switch (cmd) {
    case 'accept': handleAccept(row); break;
    case 'status': openStatusDialog(row); break;
    case 'repair': goRepair(row); break;
    case 'bill': handleGenerateBill(row); break;
    case 'edit': goFactoryEdit(row.orderId); break;
    case 'downloadPackage': downloadOrderPackage(row); break;
    case 'auditProduction': openAuditProductionDialog(row); break;
    case 'confirmCancel': handleConfirmCancel(row); break;
    case 'view': viewDetail(row.orderId); break;
  }
};

// ============================================================
// 状态选项
// ============================================================
const statusOptions = computed(() => {
  const current = normalizeStatus(currentOrder.value?.flowStatus);
  // ⭐ 制作状态不做顺序控制：任意工序都能改，可前进也可回退（2026-11-08）
  //    「暂停」不在下拉里——暂停/恢复走上面的独立按钮
  //    基准取暂停前工序：暂停中点任意工序是恢复，不标「回退」
  const base = current === 'paused'
    ? normalizeStatus(currentOrder.value?.pauseOriginStatus)
    : current;
  const baseIndex = productionStatuses.value.findIndex(s => s.value === base);

  return productionStatuses.value
    .filter(s => s.value !== current && s.value !== 'paused')
    .map(s => {
      const idx = productionStatuses.value.findIndex(x => x.value === s.value);
      const backward = baseIndex >= 0 && idx >= 0 && idx < baseIndex;
      return { ...s, backward, label: backward ? `${s.label}（回退）` : s.label };
    });
});

// ============================================================
// 加载客户列表
// ============================================================
const loadCustomers = async () => {
  try {
    const res = await getCustomerList({ includeInactive: false });
    customerList.value = res?.data || [];
  } catch {
    customerList.value = [];
  }
};

// ============================================================
// 获取日期范围（最近一个月）
// ============================================================
// ⚠️ 必须用「本地日期」拼字符串：toISOString() 走的是 UTC，
//    北京时间 0:00~8:00 之间会算成前一天 → 默认 endDate 少一天，当天新单看不到
const fmtLocalDate = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const getDateRange = () => {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return [fmtLocalDate(startDate), fmtLocalDate(today)];
};

const viewBill = (billId) => {
  router.push(`/order/bill/detail/${billId}`);
};

// ============================================================
// 加载数据
// ============================================================
const loadData = async () => {
  loading.value = true;
  try {
    // ⭐ 一次拉全部，前端过滤 + 分页（第 1 步临时方案）
    const params = {
      keyword: keyword.value || undefined,
      customerId: filterCustomerId.value || undefined,
      repairNo: filterRepairNo.value ? filterRepairNo.value.trim() : undefined,
      page: 1,
      pageSize: 1000,
    };

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }

    const res = await getOrderList(params);
    const responseData = res?.data || res || {};

    let data = [];
    if (Array.isArray(responseData)) {
      data = responseData;
    } else if (Array.isArray(responseData.data)) {
      data = responseData.data;
    } else if (responseData.items && Array.isArray(responseData.items)) {
      data = responseData.items;
    } else {
      data = [];
    }

    // 规范化状态
    let list = data.map(item => ({ ...item, flowStatus: normalizeStatus(item.flowStatus) }));

    // ⭐ 更新 Tab 数量（从全量算）
    updateTabCounts(list);
    updateSubStatusCounts(list);

    // ⭐ 按 tab 过滤
    //    「已报废」是旁支状态，不在制作中主链里：只有子筛选切到它时才列出来，
    //    避免报废单混进正常工序、也避免从「制作中」彻底找不到（订单编辑页没有已完成 tab）
    let filtered;
    if (activeTab.value === 'factoryProcessing' && subStatus.value === 'scrapped') {
      filtered = list.filter(x => x.flowStatus === 'scrapped');
    } else {
      filtered = list.filter(x => matchTab(x, activeTab.value));
    }

    // ⭐ 待审核视图：按「待提交 / 已提交待审核」筛选（审核员后端只返回已提交，无需筛选）
    if (mode.value === 'audit') {
      const auditRows = list.filter(x => x.flowStatus === 'productionCompleted');
      auditPendingCount.value = auditRows.filter(x => !x.productionSubmittedAt).length;
      auditSubmittedCount.value = auditRows.filter(x => !!x.productionSubmittedAt).length;
      if (auditSubmitFilter.value === 'pending') filtered = filtered.filter(x => !x.productionSubmittedAt);
      else if (auditSubmitFilter.value === 'submitted') filtered = filtered.filter(x => !!x.productionSubmittedAt);
    }

    // ⭐ 按 subStatus 过滤
    if (activeTab.value === 'factoryProcessing' && subStatus.value) {
      filtered = filtered.filter(x => x.flowStatus === subStatus.value);
    }

    // ⭐ 前端分页
    pagination.total = filtered.length;
    const start = (pagination.current - 1) * pagination.pageSize;
    tableData.value = filtered.slice(start, start + pagination.pageSize);

    // ⭐ 审核模式：拉取本页订单的销售行 / 成本行（用于展开行对比）
    loadCostsForAudit();

  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error('加载数据失败');
    tableData.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.current = 1;
  loadData();
};

const resetSearch = () => {
  keyword.value = '';
  filterCustomerId.value = '';
  filterRepairNo.value = '';
  dateRange.value = getDateRange();
  pagination.current = 1;
  loadData();
};

const onPageChange = () => {
  loadData();
};

// ============================================================
// 多选
// ============================================================
const handleSelectionChange = (selection) => {
  selectedOrders.value = selection;
};

// ============================================================
// 行点击
// ============================================================
const handleRowClick = (row, column) => {
  if (column.type === 'selection') return;
  if (column.type === 'expand') return;
  if (column.label === '操作') return;
  currentFlowOrderId.value = row.orderId;
  currentFlowOrderNo.value = row.orderNo;
  currentFlowStatus.value = row.flowStatus;
  flowDrawerVisible.value = true;
};

// ============================================================
// 跳转维修单
// ============================================================
const goRepair = (row) => {
  router.push({
    name: 'RepairCreate',
    // ⭐ from：维修单保存/取消后回到当前这一页（订单编辑就回订单编辑列表）
    query: { orderId: row.orderId, from: route.fullPath }
  });
};

// 下拉展开时按需确认该订单是否含数据包
const ensurePackage = async (row) => {
  if (row._pkgChecked) return;
  try {
    const res = await getOrderDetail(row.orderId);
    const pkgs = (res && res.data && res.data.dataPackages) || [];
    row._hasPackage = pkgs.length > 0;
  } catch (e) {
    row._hasPackage = false;
  }
  row._pkgChecked = true;
};

// 数据包下载
const downloadOrderPackage = async (row) => {
  try {
    const res = await getOrderDetail(row.orderId);
    const pkgs = res?.data?.dataPackages || [];
    if (!pkgs.length) {
      ElMessage.info('该订单暂无数据包');
      return;
    }
    pkgs.forEach(pkg => {
      const url = pkg.fileUrl || pkg.url;
      const name = pkg.fileName || pkg.name || 'package';
      if (!url) return;
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  } catch {
    ElMessage.error('获取数据包失败');
  }
};

// ============================================================
// ⭐ 列表一键「制作完成」：更新为 productionCompleted 后进【待审核】
// ============================================================
const completingOrderId = ref(0);
const canMarkProductionCompleted = (row) => {
  if (mode.value !== 'edit' || !allow('status')) return false;
  const st = normalizeStatus(row.flowStatus);
  // 已制作完成 / 终态 / 报废单不给这个按钮（报废单要点状态「继续生产」）
  if (['productionCompleted', 'completed', 'cancelled', 'scrapped', 'unqualifiedReturn'].includes(st)) return false;
  return st === 'factory_edit' || isInProduction(row.flowStatus);
};

const handleMarkProductionCompleted = async (row) => {
  if (completingOrderId.value) return;
  try {
    await ElMessageBox.confirm(
      `确认订单 ${row.orderNo || ''} 已经制作完成？\n更新后状态变为「制作完成」，订单会进入【待审核】页面等待提交审核。`,
      '制作完成',
      { type: 'warning', confirmButtonText: '确认完成', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }
  completingOrderId.value = row.orderId;
  try {
    const targetIdx = productionStatuses.value.findIndex(s => s.value === 'productionCompleted');
    await updateProduction(row.orderId, {
      status: 'productionCompleted',
      step: targetIdx >= 0 ? targetIdx + 1 : 0,
      remark: '工厂在列表标记制作完成'
    });
    ElMessage.success('已更新为【制作完成】，订单已进入【待审核】等待提交审核');
    await loadData();
  } catch (error) {
    ElMessage.error(error.message || '更新失败');
  } finally {
    completingOrderId.value = 0;
  }
};

// ============================================================
// 打开状态更新弹窗
// ============================================================
const openStatusDialog = (row) => {
  currentOrder.value = row;
  selectedStatus.value = '';
  statusRemark.value = '';
  statusDialogVisible.value = true;
};

// ============================================================
// 确认状态更新
// ============================================================
const confirmStatusUpdate = async () => {
  if (!selectedStatus.value) {
    ElMessage.warning('请选择目标状态');
    return;
  }

  statusLoading.value = true;
  try {
    // 提示文案用不带「（回退）」后缀的原名
    const label = productionStatuses.value.find(s => s.value === selectedStatus.value)?.label
      || selectedStatus.value;
    // ⭐ 工序进度跟目标状态走（回退时不能留旧进度）
    const targetIdx = productionStatuses.value.findIndex(s => s.value === selectedStatus.value);

    await updateProduction(currentOrder.value.orderId, {
      status: selectedStatus.value,
      step: targetIdx >= 0 ? targetIdx + 1 : 0,
      remark: statusRemark.value || `制作状态更新为：${label}`,
    });

    ElMessage.success(`状态已更新为：${label}`);
    statusDialogVisible.value = false;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '更新失败');
  } finally {
    statusLoading.value = false;
  }
};

// ============================================================
// ⭐ 一键暂停 / 恢复（暂停 = 临时停下，工序进度不变）
// ============================================================
const handleQuickPause = async () => {
  if (!currentOrder.value) return;
  statusLoading.value = true;
  try {
    await updateProduction(currentOrder.value.orderId, {
      status: 'paused',
      step: 0,
      remark: statusRemark.value || '工厂暂停'
    });
    ElMessage.success(`已暂停，暂停前工序：${getStatusText(currentOrder.value.flowStatus)}`);
    statusDialogVisible.value = false;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '暂停失败');
  } finally {
    statusLoading.value = false;
  }
};

const handleQuickResume = async () => {
  if (!currentOrder.value) return;
  const origin = currentOrder.value.pauseOriginStatus;
  if (!origin) {
    ElMessage.warning('没有记录到暂停前的工序，请在下方「更新为」里手动选择要恢复的工序');
    return;
  }
  statusLoading.value = true;
  try {
    await updateProduction(currentOrder.value.orderId, {
      status: origin,
      step: 0,
      remark: statusRemark.value || '恢复生产'
    });
    ElMessage.success(`已恢复生产：${getStatusText(origin)}`);
    statusDialogVisible.value = false;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '恢复失败');
  } finally {
    statusLoading.value = false;
  }
};

// ============================================================
// ⭐ 报废 / 继续生产（与暂停同一套逻辑：报废时记住原工序，继续时回到原工序）
// ============================================================
const handleQuickScrap = async () => {
  if (!currentOrder.value) return;
  const cur = normalizeStatus(currentOrder.value.flowStatus);
  const originText = cur === 'paused'
    ? (currentOrder.value.pauseOriginStatusText || '暂停前工序')
    : getStatusText(currentOrder.value.flowStatus);
  try {
    await ElMessageBox.confirm(
      `确认把订单 ${currentOrder.value.orderNo} 标记为报废？\n\n`
      + `报废后这张单不在「制作中」列表，也出不了账单；`
      + `但随时可以在列表点「已报废」继续生产，直接回到「${originText}」，不用重新下单。`,
      '报废确认',
      { type: 'warning', confirmButtonText: '确认报废', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }
  statusLoading.value = true;
  try {
    await updateProduction(currentOrder.value.orderId, {
      status: 'scrapped',
      step: 0,
      remark: statusRemark.value || '工厂报废'
    });
    ElMessage.success(`已报废（报废前工序：${originText}），需要时点状态即可继续生产`);
    statusDialogVisible.value = false;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '报废失败');
  } finally {
    statusLoading.value = false;
  }
};

const handleQuickResumeScrap = async () => {
  if (!currentOrder.value) return;
  const origin = currentOrder.value.scrapOriginStatus;
  if (!origin) {
    ElMessage.warning('没有记录到报废前的工序，请在下方「更新为」里手动选择要继续的工序');
    return;
  }
  statusLoading.value = true;
  try {
    await updateProduction(currentOrder.value.orderId, {
      status: origin,
      step: 0,
      remark: statusRemark.value || '报废后继续生产'
    });
    ElMessage.success(`已继续生产：${getStatusText(origin)}`);
    statusDialogVisible.value = false;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '继续生产失败');
  } finally {
    statusLoading.value = false;
  }
};

// ============================================================
// ⭐ 制作完成 → 提交审核 / 撤回（单条）
// ============================================================
const handleSubmitAudit = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确认提交订单 ${row.orderNo} 的制作完成审核？提交后审核员即可看到。`,
      '提交审核',
      { confirmButtonText: '提交', cancelButtonText: '取消', type: 'info' }
    );
  } catch { return; }

  try {
    await submitProductionAudit(row.orderId);
    ElMessage.success('已提交审核');
    loadData();
  } catch (e) {
    ElMessage.error(e?.message || '提交失败');
  }
};

const handleWithdrawAudit = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确认撤回订单 ${row.orderNo} 的审核提交？撤回后审核员将看不到该单，可修改后重新提交。`,
      '撤回提交',
      { confirmButtonText: '撤回', cancelButtonText: '取消', type: 'warning' }
    );
  } catch { return; }

  try {
    await withdrawProductionAudit(row.orderId);
    ElMessage.success('已撤回');
    loadData();
  } catch (e) {
    ElMessage.error(e?.message || '撤回失败');
  }
};

// ⭐ 批量提交 / 撤回
const handleBatchSubmitAudit = async () => {
  const list = selectedOrders.value.filter(row => isAuditSubmitPending(row));
  if (list.length === 0) {
    ElMessage.warning('选中的订单里没有「待提交」的制作完成单');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确认提交 ${list.length} 个订单的制作完成审核？`,
      '批量提交审核',
      { confirmButtonText: '提交', cancelButtonText: '取消', type: 'info' }
    );
  } catch { return; }

  try {
    const res = await batchProductionAudit(list.map(r => r.orderId), true);
    const d = res?.data || {};
    if (d.failedCount > 0) {
      ElMessage.warning(`已提交 ${d.successCount || 0} 单，${d.failedCount} 单失败（${(d.errors || []).slice(0, 3).map(e => e.message).join('；')}）`);
    } else {
      ElMessage.success(`已提交 ${d.successCount ?? list.length} 单`);
    }
    tableRef.value?.clearSelection?.();
    selectedOrders.value = [];
    loadData();
  } catch (e) {
    ElMessage.error(e?.message || '批量提交失败');
  }
};

const handleBatchWithdrawAudit = async () => {
  const list = selectedOrders.value.filter(row => isAuditSubmitted(row));
  if (list.length === 0) {
    ElMessage.warning('选中的订单里没有「已提交待审核」的单');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确认撤回 ${list.length} 个订单的审核提交？撤回后审核员将看不到这些单。`,
      '批量撤回',
      { confirmButtonText: '撤回', cancelButtonText: '取消', type: 'warning' }
    );
  } catch { return; }

  try {
    const res = await batchProductionAudit(list.map(r => r.orderId), false);
    const d = res?.data || {};
    if (d.failedCount > 0) {
      ElMessage.warning(`已撤回 ${d.successCount || 0} 单，${d.failedCount} 单失败`);
    } else {
      ElMessage.success(`已撤回 ${d.successCount ?? list.length} 单`);
    }
    tableRef.value?.clearSelection?.();
    selectedOrders.value = [];
    loadData();
  } catch (e) {
    ElMessage.error(e?.message || '批量撤回失败');
  }
};

// ============================================================
// 接单
// ============================================================
// ⭐ 批量审核制作完成（通过 / 驳回）——只审已提交的
const handleBatchAuditProduction = async (approved) => {
  const list = selectedOrders.value.filter(row => isAuditSubmitted(row));
  if (list.length === 0) {
    ElMessage.warning('选中的订单里没有「已提交待审核」的单；未提交审核的订单不能审核');
    return;
  }
  try {
    const { value: remark } = await ElMessageBox.prompt(
      `将${approved ? '通过' : '驳回'} ${list.length} 个订单${approved ? '（完成后可继续生成账单）' : '（退回工厂编辑）'}，可填写备注：`,
      approved ? '批量通过' : '批量驳回',
      { inputPlaceholder: '备注（可选）', inputValue: '', confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    );
    auditProductionLoading.value = true;
    let ok = 0, fail = 0;
    const failMsg = [];
    for (const row of list) {
      try {
        const res = await auditProduction(row.orderId, { approved, remark: remark || '' });
        if (res?.success !== false) ok++; else { fail++; failMsg.push(`${row.orderNo}: ${res?.message || '失败'}`); }
      } catch (e) {
        fail++;
        failMsg.push(`${row.orderNo}: ${e?.message || '失败'}`);
      }
    }
    if (ok) ElMessage.success(`已${approved ? '通过' : '驳回'} ${ok} 个订单`);
    if (fail) ElMessage.warning(`${fail} 个失败：${failMsg.slice(0, 3).join('；')}`);
    tableRef.value?.clearSelection?.();
    selectedOrders.value = [];
    loadData();
    // ⭐ 批量通过后统一补齐账单 + LR（一次调用覆盖所有客户，幂等不会重复出账）
    if (approved && ok > 0) await afterBatchProductionApproved();
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(e?.message || '批量审核失败');
  } finally {
    auditProductionLoading.value = false;
  }
};

const handleBatchAccept = async () => {
  const acceptList = selectedOrders.value.filter(row => row.flowStatus === 'customerAudited');
  if (acceptList.length === 0) {
    ElMessage.warning('请选择待接单的订单');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定要接单 ${acceptList.length} 个订单吗？`, '批量接单', { type: 'info' });
    let successCount = 0, failCount = 0;

    for (const order of acceptList) {
      try {
        await acceptOrder(order.orderId);
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0 && failCount === 0) {
      ElMessage.success(`${successCount} 个订单接单成功`);
    } else {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
    }
    loadData();
  } catch {}
};

const handleAccept = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要接单 ${row.orderNo} 吗？`, '接单确认', { type: 'info' });
    await acceptOrder(row.orderId);
    ElMessage.success('接单成功');
    loadData();
  } catch {}
};

// ============================================================
// 审核制作完成
// ============================================================
const AUDIT_PRODUCTION_TITLES = {
  pass: '通过审核，订单将进入【已完成】状态',
  reject: '驳回审核，订单将回到【工厂编辑】状态',
};

// ⭐ 制作完成「审核通过」后统一处理：自动生成账单
//    所有审核入口（单条 / 批量 / 预览弹窗）都必须调用，否则订单会漏出账
//    ⭐ 2026-11-20 起：LR 不再在这里生成，改为「账单最终确认」时自动生成
const afterProductionApproved = async (orderId, silent = false) => {
  try {
    const r = await autoCreateBill(orderId);
    const d = r?.data || r;

    if (d?.skipped) {
      if (!silent) ElMessage.info('账单：' + (d.message || '没有待出账订单'));
    } else if (d?.billNo) {
      ElMessage.success('已自动生成账单 ' + d.billNo +
        (d.orderCount ? `（含 ${d.orderCount} 个订单）` : ''));
    }
    return d;
  } catch (e) {
    console.warn('自动生成账单失败:', e);
    ElMessage.warning('订单已审核，但自动生成账单失败，请到「生成账单」页点「补齐未出账订单」');
    return null;
  }
};

// ⭐ 批量通过后用「补齐」接口一次覆盖所有客户（LR 等账单确认后自动生成，这里不再处理）
const afterBatchProductionApproved = async () => {
  try {
    const r = await generateMissingBills();
    const d = r?.data || r || {};
    const created = d.created || [];
    if (!created.length) return;
    ElMessage.success(`已自动生成 ${created.length} 张账单：${created.map(x => x.billNo).join('、')}`);
  } catch (e) {
    console.warn('批量补齐账单失败:', e);
    ElMessage.warning('账单自动生成失败，请到「生成账单」页点「补齐未出账订单」');
  }
};

const openAuditProductionDialog = (row) => {
  auditProductionRow.value = row;
  auditProductionApproved.value = true;
  auditProductionRemark.value = '';
  auditProductionDialogVisible.value = true;
};

const confirmAuditProduction = async (approved) => {
  if (!auditProductionRow.value) return;
  const orderId = auditProductionRow.value.orderId;
  auditProductionLoading.value = true;
  try {
    const res = await auditProduction(orderId, {
      approved,
      remark: auditProductionRemark.value,
    });
    if (res.success) {
      ElMessage.success(res.data?.message || (approved ? '审核通过' : '已驳回'));
      auditProductionDialogVisible.value = false;
      loadData();

      // ⭐ 审核通过后自动生成账单（LR 改为账单最终确认时生成）
      if (approved) await afterProductionApproved(orderId);
    } else {
      ElMessage.error(res.message || '操作失败');
    }
  } catch (error) {
    ElMessage.error(error.message || '审核失败');
  } finally {
    auditProductionLoading.value = false;
  }
};

// ============================================================
// 生成账单
// ============================================================
const handleGenerateBill = (row) => {
  router.push(`/order/bill/create?orderIds=${row.orderId}`);
};

// ===== 工厂确认取消 =====
const handleConfirmCancel = async (row) => {
  try {
    const { value } = await ElMessageBox.prompt(
      '确认取消后订单将终止（不可恢复）。若已产生费用，请先在订单中完成结算后再确认。可填写确认备注。',
      '确认取消',
      {
        confirmButtonText: '确认取消',
        cancelButtonText: '再想想',
        inputType: 'textarea',
        inputPlaceholder: '可选：填写确认备注',
        inputValidator: () => true
      }
    );
    await confirmCancel(row.orderId, (value || '').trim());
    ElMessage.success('已确认取消，订单已终止');
    loadData();
  } catch (e) {
    if (e !== 'cancel' && e?.name !== 'cancel') ElMessage.error(e.message || '操作失败');
  }
};

const handleBatchGenerateBill = async () => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请先选择订单');
    return;
  }

  // ⭐ 只选 completed 且 billId 为空的
  const validOrders = selectedOrders.value.filter(
    o => normalizeStatus(o.flowStatus) === 'completed' && !o.billId
  );
  if (validOrders.length === 0) {
    ElMessage.warning('请选择【已完成】且未生成账单的订单');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定为 ${validOrders.length} 个订单生成账单吗？`, '生成账单', { type: 'info' });
  } catch {
    return;
  }

  batchCreating.value = true;
  try {
    const orderIds = validOrders.map(o => o.orderId);
    const res = await createBill({ orderIds });
    if (res.success) {
      ElMessage.success(`账单 ${res.billNo} 创建成功`);
      router.push(`/order/bill/edit/${res.billId}`);
    }
  } catch (error) {
    ElMessage.error(error.message || '生成账单失败');
  } finally {
    batchCreating.value = false;
  }
};

// ============================================================
// 跳转
// ============================================================
const goFactoryEdit = (orderId) => {
  // ⭐ 携带当前视图 mode，编辑页保存后按 mode 回跳（edit→factory-edit-list）
  const q = mode.value ? `?mode=${encodeURIComponent(mode.value)}` : '';
  router.push(`/order/factory-edit/${orderId}${q}`);
};

const viewDetail = (id) => {
  router.push(`/order/detail/${id}`);
};

// ============================================================
// 时间格式化
// ============================================================
// ⭐ 金额展示（空值显示 0.00）
const money = (v) => (v === null || v === undefined || v === '' ? '0.00' : Number(v).toFixed(2));

// ============================================================
// ⭐ 待审核：打开 Excel 式详情，看完再在详情里审核
// ============================================================
const previewVisible = ref(false);
const previewOrderId = ref(null);
const previewRow = ref(null);
const previewAuditLoading = ref(false);

const openAuditPreview = (row) => {
  // ⭐ 只审核已提交的制作完成单
  if (!isAuditSubmitted(row)) {
    ElMessage.warning('该订单尚未提交审核，不能审核');
    return;
  }
  previewRow.value = row;
  previewOrderId.value = row.orderId;
  previewVisible.value = true;
};

const onPreviewAudit = async ({ approved, remark }) => {
  if (!previewRow.value) return;
  const orderId = previewRow.value.orderId;
  previewAuditLoading.value = true;
  try {
    await auditProduction(orderId, { approved, remark });
    ElMessage.success(approved ? '审核通过，订单已完成' : '已驳回，订单退回工厂编辑');
    previewVisible.value = false;
    loadData();
    // ⭐ 审核通过后自动生成账单 + LR（此前这条路径漏了，导致审核通过后没有账单）
    if (approved) await afterProductionApproved(orderId);
  } catch (e) {
    ElMessage.error(e?.message || '审核失败');
  } finally {
    previewAuditLoading.value = false;
  }
};

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ============================================================
// 初始化
// ============================================================
onMounted(() => {
  // ⭐ ?range=all：不限日期
  dateRange.value = isAllRange() ? [] : getDateRange();
  loadCustomers();
  dictApi.getItemsByKey('production_status').then((res) => {
    productionStatuses.value = (res?.data || []).map(item => ({
      value: normalizeStatus(item.itemValue),
      label: item.itemLabel || item.itemValue,
    }))
    // ⭐ 报废不再放在「更新为」下拉里：用弹窗里的「报废订单」按钮，避免和「已报废」筛选重复
    .filter(item => item.value !== 'scrapped');
    loadData();
  }).catch(() => {
    ElMessage.error('加载制作状态字典失败');
    loadData();
  });
  window.addEventListener('keydown', handleEsc);
});

// ⭐ 同一页面内带参切换（工作台卡片再次点击 / 菜单互跳）时同步筛选条件
watch(() => [route.query.submit, route.query.range], () => {
  auditSubmitFilter.value = readSubmitFilter();
  dateRange.value = isAllRange() ? [] : getDateRange();
  pagination.current = 1;
  loadData();
});
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
/* 状态标签可点击（订单编辑视图） */
.status-clickable { cursor: pointer; }
.status-clickable:hover { text-decoration: underline; }
/* ⭐ 暂停状态：橙色暂停条（工厂临时停，可恢复） */
.paused-status { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.paused-bars {
  width: 16px; height: 16px; border-radius: 50%;
  background-color: #e6a23c;
  box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2);
  display: inline-flex; align-items: center; justify-content: center; gap: 2px;
  flex-shrink: 0;
}
.paused-bars i { display: block; width: 2px; height: 7px; background: #fff; border-radius: 1px; }
.paused-text { color: #e6a23c; font-weight: 700; font-size: 13px; }

/* ⭐ 已报废：可点「继续生产」，与暂停同款 */
.scrap-status {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  cursor: pointer;
  line-height: 1.2;
}
.scrap-text {
  color: #f56c6c;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 4px;
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 600;
}
.scrap-tip { font-size: 10px; color: #909399; }
.scrap-status:hover .scrap-tip { color: #f56c6c; text-decoration: underline; }

/* ⭐ 弹窗里的报废入口（次级动作，不抢暂停/恢复的主按钮） */
.scrap-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #f0c78a;
}
.scrap-line-tip { font-size: 12px; color: #909399; }

/* ⭐ 弹窗里的大号暂停/恢复按钮 */
.pause-quick {
  margin: 0 0 16px;
  padding: 12px;
  background: #fffaf1;
  border: 1px dashed #f0c78a;
  border-radius: 8px;
}
.pause-big-btn {
  width: 100%;
  height: 52px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
}
.pause-quick-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #a06a00;
}
.pause-quick-hint .hint-sub { margin-top: 3px; color: #909399; }
.edit-row-actions { display: flex; justify-content: center; gap: 4px; }
.no-action { color: #c0c4cc; }
.customer-salesman { color: #606266; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
/* ⭐ 标题 + 小字提示（提示换行到标题下方，不挤右侧按钮） */
.header-left { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.audit-hint {
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
  border-left: 3px solid #dcdfe6;
  padding-left: 6px;
  max-width: 760px;
}
/* ⭐ 订单编辑：制作完成的操作说明 */
.edit-hint {
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
  border-left: 3px solid #dcdfe6;
  padding-left: 6px;
  max-width: 760px;
}

/* ===== 一级 Tab ===== */
.order-tabs-wrapper {
  margin-bottom: 8px;
}
.order-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
.order-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  font-weight: 500;
  height: 48px;
  line-height: 48px;
}
.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tab-badge :deep(.el-badge__content) {
  transform: translateY(-2px) translateX(4px);
  font-size: 11px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
  border: none;
}

/* ===== 二级子筛选 ===== */
.sub-tabs-wrapper {
  margin-bottom: 12px;
  background: #fafbfc;
  padding: 10px 16px;
  border-radius: 6px;
  border: 1px solid #e8ecf1;
}
.sub-tabs-wrapper :deep(.el-radio-button__inner) {
  font-size: 13px;
}
.sub-count {
  display: inline-block;
  margin-left: 4px;
  color: #f56c6c;
  font-weight: 600;
}

/* ===== 筛选栏 ===== */
.filter-bar {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
  background: #f5f7fa;
  padding: 10px 16px;
  border-radius: 6px;
}

.summary-bar {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 16px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid #e8ecf1;
  font-size: 14px;
  color: #606266;
}
.summary-bar b { color: #303133; }
.summary-bar .range-hint { color: #909399; font-size: 12px; margin-left: -14px; }

:deep(.el-table .cell) { padding: 6px 8px; }
:deep(.el-table .el-table__row) { cursor: pointer; }
:deep(.el-button.is-link) { padding: 0 4px; }

:deep(.el-image) { transition: transform 0.3s; }
:deep(.el-image:hover) { transform: scale(2.5); z-index: 10; position: relative; }

/* ⭐ 待处理修改申请：订单号闪烁 */
.blink-modify {
  animation: blink 1s infinite;
  color: #f56c6c !important;
  font-weight: 700;
}
.modify-badge {
  margin-left: 4px;
  font-size: 18px;
}
/* ⭐ 维修单编号（联查 repair_orders 带出来的，手工填的号，红色标出便于核对） */
.repair-no-line {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.2;
  color: #f56c6c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ⭐ 非标准损耗 */
.loss-abnormal {
  display: inline-block;
  min-width: 50px;
  padding: 1px 6px;
  border: 1px solid #F56C6C;
  border-radius: 4px;
  background: #fef0f0;
  color: #606266;
  font-weight: 600;
  font-size: 12px;
}

.order-flag {
  font-weight: 600;
  white-space: nowrap;
  font-size: 26px;
  line-height: 1;
}
.order-flags {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.order-warning-flag,
.order-urgent-flag {
  color: #f56c6c;
}
.order-flag-placeholder {
  color: #c0c4cc;
  font-size: 18px;
}

/* ⭐ 成本高于销售的预警：大号红图标 + 整行淡红底 */
.cost-warn-flag {
  font-size: 32px;
  font-weight: 700;
  color: #f56c6c;
  line-height: 1;
  cursor: help;
  animation: costWarnBlink 1.4s ease-in-out infinite;
}
@keyframes costWarnBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
:deep(.el-table .row-cost-warn td.el-table__cell) {
  background: #fdecec !important;
}
:deep(.el-table .row-cost-warn:hover td.el-table__cell) {
  background: #fbdcdc !important;
}

/* ===== 全屏模式 ===== */
/* ===== ⭐ 审核模式：每个订单之间加红色分隔线（预示一个订单结束） ===== */
.is-audit-mode :deep(.el-table__body-wrapper .el-table__row) {
  border-bottom: 3px solid #f56c6c;
}
/* 展开行（成本/销售对比）内部不再被上面的红色线覆盖，本身底部也加一条更明显的红线收尾 */
.is-audit-mode :deep(.el-table__expanded-cell) {
  border-bottom: 3px solid #f56c6c;
}
.is-audit-mode :deep(.el-table__expanded-cell .expand-cost-wrap) {
  border-bottom: none;
}

/* ===== ⭐ 审核模式：销售 / 成本 对比展开行 ===== */
.expand-cost-wrap {
  padding: 8px 12px 10px 12px;
  background: #fbfcfe;
  border-top: 1px dashed #dcdfe6;
  border-bottom: 1px dashed #dcdfe6;
}
.expand-loading { padding: 14px; color: #909399; font-size: 13px; }
.cost-state-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; line-height: 1.2; }
.cost-profit-line { font-size: 11px; color: #909399; font-family: Consolas, Monaco, monospace; white-space: nowrap; }
.table-fullscreen :deep(.cost-profit-line) { font-size: 13px; }
.audit-warn-tip {
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  height: 32px;
  border-radius: 4px;
  background: #fef0f0;
  color: #d64545;
  font-size: 13px;
  font-weight: 600;
}

.page-container.is-fullscreen {
  position: fixed;
  inset: 0;
  /* ⚠️ 必须低于 Element Plus 弹层层级（初始 2000，首次弹出为 2001），
     否则全屏时 ElMessageBox / ElMessage 会被整个全屏容器盖住，退出全屏才"冒出来" */
  z-index: 1999;
  background: #fff;
  padding: 16px 20px;
  overflow: auto;
  border-radius: 0;
  min-height: 100vh;
}

.table-fullscreen {
  font-size: 16px;
}

.table-fullscreen :deep(.el-table__cell) {
  font-size: 16px !important;
  padding: 14px 10px !important;
}

/* 展开的对比表保持原尺寸（否则被全屏 16px 撑爆、数字换行） */
.table-fullscreen :deep(.expand-cost-wrap .el-table__cell) {
  font-size: 14px !important;
  padding: 4px 6px !important;
}
.table-fullscreen :deep(.expand-cost-wrap .el-table__header .el-table__cell) {
  font-size: 14px !important;
  padding: 8px 6px !important;
}
.table-fullscreen :deep(.expand-cost-wrap .el-tag) {
  font-size: 12px !important;
  padding: 0 6px !important;
  height: 20px !important;
}

.table-fullscreen :deep(.el-table__header .el-table__cell) {
  font-size: 17px !important;
  font-weight: 700 !important;
  padding: 16px 10px !important;
  background: #f5f7fa !important;
}

.table-fullscreen :deep(.el-table .cell) {
  line-height: 1.6;
}

.table-fullscreen :deep(.el-image) {
  width: 80px !important;
  height: 80px !important;
}

.table-fullscreen :deep(.el-tag) {
  font-size: 15px !important;
  padding: 6px 12px !important;
  height: auto !important;
}

.table-fullscreen :deep(.el-link) {
  font-size: 16px !important;
}

/* ⭐ 修理货标签：退货返修的单一直挂着，避免当成正常新单 */
.repair-tag {
  display: inline-block;
  margin-top: 2px;
  padding: 0 5px;
  border-radius: 3px;
  border: 1px solid #d8b4fe;
  background: #f5f3ff;
  color: #7c3aed;
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
}
</style>