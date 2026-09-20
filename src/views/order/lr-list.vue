<!-- src/views/order/lr-list.vue -->
<template>
  <div class="page-container">
  
    <!-- ===== 搜索栏 ===== -->
    <div class="search-bar">
      <el-form :inline="true" :model="search" size="default">
        <el-form-item label="客户">
          <el-select
            v-model="search.customerId"
            placeholder="全部客户"
            clearable
            filterable
            style="width: 180px;"
            @change="loadData"
          >aa
            <el-option
              v-for="item in customerList"
              :key="item.customerId"
              :label="item.customerName"
              :value="item.customerId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="成色">
          <el-select v-model="search.color" placeholder="全部成色" clearable style="width: 120px;" @change="loadData">
            <el-option label="18K" value="18K" />
            <el-option label="14K" value="14K" />
            <el-option label="9K" value="9K" />
            <el-option label="PT" value="PT" />
            <el-option label="银" value="银" />
            <el-option label="铜" value="铜" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="search.status" placeholder="全部状态" clearable style="width: 120px;" @change="loadData">
            <el-option label="起草" value="draft" />
            <el-option label="已提交" value="submitted" />
            <el-option label="已确认" value="confirmed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><RefreshRight /></el-icon> 重置
          </el-button>
        </el-form-item>
         <el-form-item>
      
        <el-button type="primary" @click="openGenerateDialog">
          <el-icon><Plus /></el-icon> 从账单生成LR表
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
          </el-form-item>
      </el-form>
    </div>

    <!-- ===== 汇总卡片 ===== -->
    <div class="summary-cards">
      <div class="summary-row">
        <div class="summary-card">
          <span class="card-label">总利润</span>
          <span class="card-value" style="color:#F56C6C;">¥{{ summary.totalProfit.toFixed(2) }}</span>
        </div>
        <div class="summary-card">
          <span class="card-label">钻石利润</span>
          <span class="card-value">¥{{ summary.diamondProfit.toFixed(2) }}</span>
        </div>
        <div class="summary-card">
          <span class="card-label">镶石利润</span>
          <span class="card-value">¥{{ summary.settingProfit.toFixed(2) }}</span>
        </div>
        <div class="summary-card">
          <span class="card-label">工费利润</span>
          <span class="card-value">¥{{ summary.laborProfit.toFixed(2) }}</span>
        </div>
      </div>
      <div class="summary-row">
        <div class="summary-card" style="flex:1.4;">
          <span class="card-label">累计净重出货</span>
          <div class="color-group">
            <span v-for="(val, key) in summary.netWeightByColor" :key="key" class="color-tag">
              {{ key }}: {{ val.toFixed(3) }}g
            </span>
            <span v-if="Object.keys(summary.netWeightByColor).length === 0" style="color:#bbb;">暂无数据</span>
          </div>
        </div>
        <div class="summary-card" style="flex:1.4;">
          <span class="card-label">累计加耗重出货</span>
          <div class="color-group">
            <span v-for="(val, key) in summary.addLossByColor" :key="key" class="color-tag">
              {{ key }}: {{ val.toFixed(3) }}g
            </span>
            <span v-if="Object.keys(summary.addLossByColor).length === 0" style="color:#bbb;">暂无数据</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 表格 ===== -->
    <el-table
      :data="tableData"
      v-loading="loading"
      border
      stripe
      style="width:100%;"
      @row-click="viewDetail"
      row-key="id"
    >
      <el-table-column prop="billNo" label="账单编号" width="160">
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row)">
            {{ row.billNo }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="color" label="成色" width="70" align="center" />
      <el-table-column prop="totalSale" label="销售额" width="110" align="right">
        <template #default="{ row }">¥{{ (row.totalSale || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="totalCost" label="成本" width="110" align="right">
        <template #default="{ row }">¥{{ (row.totalCost || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="profit" label="利润" width="110" align="right">
        <template #default="{ row }">
          <span :style="{ color: (row.profit || 0) >= 0 ? '#F56C6C' : '#909399', fontWeight: 'bold' }">
            ¥{{ (row.profit || 0).toFixed(2) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="diamondProfit" label="钻石利润" width="110" align="right">
        <template #default="{ row }">¥{{ (row.diamondProfit || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="settingProfit" label="镶石利润" width="110" align="right">
        <template #default="{ row }">¥{{ (row.settingProfit || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="laborProfit" label="工费利润" width="110" align="right">
        <template #default="{ row }">¥{{ (row.laborProfit || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="netWeight" label="净重" width="90" align="right">
        <template #default="{ row }">{{ (row.netWeight || 0).toFixed(3) }}g</template>
      </el-table-column>
      <el-table-column prop="addLossWeight" label="加耗重" width="90" align="right">
        <template #default="{ row }">{{ (row.addLossWeight || 0).toFixed(3) }}g</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="rowStatus(row) === 'confirmed' ? 'success' : rowStatus(row) === 'submitted' ? 'warning' : 'info'" size="small">
            {{ rowStatus(row) === 'confirmed' ? '已确认' : rowStatus(row) === 'submitted' ? '已提交' : '起草' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="300" align="center" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="handlePreview(row)">预览</el-button>
          <el-button v-if="canEditRow(row)" size="small" type="primary" @click.stop="editLr(row)">编辑</el-button>
          <el-button v-if="canSubmitRow(row)" size="small" type="warning" :loading="actionId === row.id" @click.stop="submitLr(row)">提交</el-button>
          <el-button v-if="canConfirmRow(row)" size="small" type="success" :loading="actionId === row.id" @click.stop="confirmLr(row)">确认</el-button>
          <el-button v-if="canRejectRow(row)" size="small" type="danger" :loading="actionId === row.id" @click.stop="rejectLr(row)">退回</el-button>
          <el-button v-if="canDeleteRow(row)" size="small" type="danger" link @click.stop="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无LR表" />

    <!-- 分页 -->
    <div style="margin-top:16px;display:flex;justify-content:flex-end;">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadData"
        @current-change="loadData"
      />
    </div>

    <!-- ===== 生成LR表弹窗 ===== -->
    <el-dialog
      v-model="showGenerateDialog"
      title="从账单生成LR表"
      width="700px"
      destroy-on-close
      @open="loadAvailableBills"
    >
      <el-alert
        title="选择需要生成LR表的账单（已确认且未生成LR表的账单）"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:16px;"
      />
      <el-table
        :data="availableBills"
        v-loading="billLoading"
        border
        stripe
        @selection-change="handleBillSelection"
        max-height="400"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="billNo" label="账单编号" width="160" />
        <el-table-column prop="customerName" label="客户" width="120" />
        <el-table-column prop="color" label="成色" width="80" />
        <el-table-column prop="totalAmount" label="总金额" width="120" align="right">
          <template #default="{ row }">¥{{ (row.totalAmount || 0).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <div style="margin-top:12px;color:#999;font-size:13px;">
        已选 <b style="color:#409EFF;">{{ selectedBills.length }}</b> 个账单
      </div>
      <template #footer>
        <el-button @click="showGenerateDialog = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleGenerateLr"
          :loading="generating"
          :disabled="selectedBills.length === 0"
        >
          生成LR表
        </el-button>
      </template>
    </el-dialog>
    <!-- Excel格式预览弹窗 -->
<el-dialog v-model="previewVisible" title="支出收入LR表预览" width="1300px" top="5vh" :close-on-click-modal="false">
  <div class="excel-preview">
    <!-- 主表格：明细部分 -->
    <table class="excel-table main-table">
      <thead>
        <!-- 标题行 -->
        <tr>
          <th colspan="29" class="excel-title">支出收入LR表</th>
        </tr>
        <!-- 信息行 -->
        <tr class="info-row">
          <th colspan="3"></th>
          <th class="info-label">客户：</th>
          <th colspan="2" class="info-value">{{ previewInfo.customerName || '-' }}</th>
          <th class="info-label">成色：</th>
          <th colspan="2" class="info-value">{{ previewInfo.color || 'Au755' }}</th>
          <th class="info-label">币种：</th>
          <th colspan="2" class="info-value">RMB</th>
          <th class="info-label">出货日期：</th>
          <th colspan="16" class="info-value">{{ previewInfo.deliveryDate || '-' }}</th>
        </tr>
        <!-- 第一层表头 -->
        <tr class="excel-header">
          <th rowspan="2">流水单号</th>
          <th rowspan="2">序号</th>
          <th rowspan="2">品名</th>
          <th rowspan="2"></th>
          <th rowspan="2">客户</th>
          <th rowspan="2">钻石级别</th>
          <th rowspan="2">颜色</th>
          <th rowspan="2">件数</th>
          <th rowspan="2">手寸/长度</th>
          <th rowspan="2">总重</th>
          <th rowspan="2">净重</th>
          <th rowspan="2">损耗</th>
          <th rowspan="2">加耗重</th>
          <th rowspan="2">金价</th>
          <th rowspan="2">足金料</th>
          <th colspan="5">钻石费用</th>
          <th colspan="5">镶石工费</th>
          <th rowspan="2">包装证书</th>
          <th rowspan="2">版费</th>
          <th rowspan="2">工费</th>
          <th rowspan="2">应收金额</th>
        </tr>
        <!-- 第二层表头 -->
        <tr class="excel-header">
          <th>粒数</th>
          <th>石重(ct)</th>
          <th>单价(元)</th>
          <th>金额(元)</th>
          <th>镶石工费</th>
          <th>粒数</th>
          <th>石重</th>
          <th>单价(元)</th>
          <th>金额(元)</th>
          <th>镶石工费</th>
        </tr>
      </thead>
      <tbody>
        <!-- 明细行：先销售行 后成本行 与Excel顺序一致 -->
        <tr v-for="(row, idx) in previewRows" :key="idx" :class="row.rowType === 'sale' ? 'sale-row' : 'cost-row'">
          <td class="text-center">{{ row.serialNo || '' }}</td>
          <td class="text-center">{{ row.seqDisplay || '' }}</td>
          <td class="text-left">{{ row.productName || '' }}</td>
          <td></td>
          <td class="text-center">{{ row.customerName || '' }}</td>
          <td class="text-center">{{ row.diamondLevel || '' }}</td>
          <td class="text-center">{{ row.color || '' }}</td>
          <td class="text-right">{{ row.quantity || '' }}</td>
          <td class="text-center">{{ row.size || '' }}</td>
          <td class="text-right">{{ row.totalWeight || '' }}</td>
          <td class="text-right">{{ row.netWeight || '' }}</td>
          <td class="text-right">{{ row.lossRate || '' }}</td>
          <td class="text-right red-text">{{ row.addLossWeight || '' }}</td>
          <td class="text-right">{{ row.goldPrice || '' }}</td>
          <td class="text-right">{{ row.goldMaterialFee || '' }}</td>
          <!-- 钻石费用（主石） -->
          <td class="text-right">{{ row.stoneQty || '' }}</td>
          <td class="text-right">{{ row.stoneWeight || '' }}</td>
          <td class="text-right">{{ row.stonePrice || '' }}</td>
          <td class="text-right red-text">{{ row.stoneAmount || '' }}</td>
          <td class="text-right">{{ row.stoneSettingFee || '' }}</td>
          <!-- 镶石工费（副石） -->
          <td class="text-right">{{ row.subStoneQty || '' }}</td>
          <td class="text-right">{{ row.subStoneWeight || '' }}</td>
          <td class="text-right">{{ row.subStonePrice || '' }}</td>
          <td class="text-right red-text">{{ row.subStoneAmount || '' }}</td>
          <td class="text-right">{{ row.subStoneSettingFee || '' }}</td>
          <!-- 其他 -->
          <td class="text-right">{{ row.packingFee || '' }}</td>
          <td class="text-right">{{ row.moldFee || '' }}</td>
          <td class="text-right">{{ row.laborFee || '' }}</td>
          <td class="text-right red-text bold">{{ row.totalAmount ? row.totalAmount.toFixed(2) : '' }}</td>
        </tr>
        <!-- 合计行 -->
        <tr class="total-row">
          <td colspan="7" class="text-left">合计：</td>
          <td class="text-right bold">{{ previewTotal.qty }}</td>
          <td></td>
          <td class="text-right">{{ previewTotal.totalWeight }}</td>
          <td class="text-right">{{ previewTotal.netWeight }}</td>
          <td></td>
          <td class="text-right red-text">{{ previewTotal.addLossWeight }}</td>
          <td></td>
          <td class="text-right">{{ previewTotal.goldMaterialFee }}</td>
          <td class="text-right">{{ previewTotal.stoneQty }}</td>
          <td class="text-right">{{ previewTotal.stoneWeight }}</td>
          <td></td>
          <td class="text-right red-text">{{ previewTotal.stoneAmount }}</td>
          <td class="text-right">{{ previewTotal.stoneSettingFee }}</td>
          <td class="text-right">{{ previewTotal.subStoneQty }}</td>
          <td class="text-right">{{ previewTotal.subStoneWeight }}</td>
          <td></td>
          <td class="text-right red-text">{{ previewTotal.subStoneAmount }}</td>
          <td class="text-right">{{ previewTotal.subStoneSettingFee }}</td>
          <td class="text-right">{{ previewTotal.packingFee }}</td>
          <td class="text-right">{{ previewTotal.moldFee }}</td>
          <td class="text-right">{{ previewTotal.laborFee }}</td>
          <td class="text-right red-text bold">{{ previewTotal.totalAmount }}</td>
        </tr>
      </tbody>
    </table>

    <!-- 空行分隔 -->
    <div class="empty-gap"></div>

    <!-- 底部汇总表：和Excel完全对齐 -->
    <table class="excel-table summary-table">
      <tbody>
        <!-- 第1行：表头 + 上单利润 -->
        <tr>
          <td class="header-cell">成色</td>
          <td class="header-cell">上单净重出货</td>
          <td class="header-cell">本单净重出货</td>
          <td class="header-cell">累计净重出货</td>
          <td></td>
          <td class="header-cell">上单加耗重出货</td>
          <td></td>
          <td></td>
          <td class="header-cell">本单加耗重出货</td>
          <td></td>
          <td class="header-cell">累计加耗重出货</td>
          <td></td>
          <td></td>
          <td class="label-cell">上单钻石利润：</td>
          <td colspan="3" class="value-cell">{{ prevSummary.diamondProfit }}</td>
          <td class="label-cell">上单镶石利润：</td>
          <td colspan="3" class="value-cell">{{ prevSummary.settingProfit }}</td>
          <td class="label-cell">上单工费利润：</td>
          <td colspan="3" class="value-cell">{{ prevSummary.laborProfit }}</td>
          <td class="label-cell">上单应收金额总利润：</td>
          <td colspan="3" class="value-cell">{{ prevSummary.totalProfit }}</td>
        </tr>
        <!-- 第2行：18K + 本单利润 -->
        <tr>
          <td class="color-cell">18K</td>
          <td class="value-cell">{{ getWeightByColor('18K').prevNet }}</td>
          <td class="value-cell">{{ getWeightByColor('18K').currNet }}</td>
          <td class="value-cell">{{ getWeightByColor('18K').totalNet }}</td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('18K').prevLoss }}</td>
          <td></td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('18K').currLoss }}</td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('18K').totalLoss }}</td>
          <td></td>
          <td></td>
          <td class="label-cell">本单钻石利润：</td>
          <td colspan="3" class="value-cell profit-val">{{ currSummary.diamondProfit.toFixed(2) }}</td>
          <td class="label-cell">本单镶石利润：</td>
          <td colspan="3" class="value-cell profit-val">{{ currSummary.settingProfit.toFixed(2) }}</td>
          <td class="label-cell">本单工费利润：</td>
          <td colspan="3" class="value-cell profit-val">{{ currSummary.laborProfit.toFixed(2) }}</td>
          <td class="label-cell">本单应收金额总利润：</td>
          <td colspan="3" class="value-cell profit-val">{{ currSummary.totalProfit.toFixed(2) }}</td>
        </tr>
        <!-- 第3行：14K + 累计利润 -->
        <tr>
          <td class="color-cell">14K</td>
          <td class="value-cell">{{ getWeightByColor('14K').prevNet }}</td>
          <td class="value-cell">{{ getWeightByColor('14K').currNet }}</td>
          <td class="value-cell">{{ getWeightByColor('14K').totalNet }}</td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('14K').prevLoss }}</td>
          <td></td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('14K').currLoss }}</td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('14K').totalLoss }}</td>
          <td></td>
          <td></td>
          <td class="label-cell blue-text">累计钻石利润：</td>
          <td colspan="3" class="value-cell blue-text profit-val">{{ totalSummary.diamondProfit.toFixed(2) }}</td>
          <td class="label-cell blue-text">累计镶石利润：</td>
          <td colspan="3" class="value-cell blue-text profit-val">{{ totalSummary.settingProfit.toFixed(2) }}</td>
          <td class="label-cell blue-text">累计工费利润：</td>
          <td colspan="3" class="value-cell blue-text profit-val">{{ totalSummary.laborProfit.toFixed(2) }}</td>
          <td class="label-cell blue-text">累计应收金额利润：</td>
          <td colspan="3" class="value-cell blue-text profit-val">{{ totalSummary.totalProfit.toFixed(2) }}</td>
        </tr>
        <!-- 第4行：9K + 上单每日收支 -->
        <tr>
          <td class="color-cell">9K</td>
          <td class="value-cell">{{ getWeightByColor('9K').prevNet }}</td>
          <td class="value-cell">{{ getWeightByColor('9K').currNet }}</td>
          <td class="value-cell">{{ getWeightByColor('9K').totalNet }}</td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('9K').prevLoss }}</td>
          <td></td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('9K').currLoss }}</td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('9K').totalLoss }}</td>
          <td></td>
          <td></td>
          <td class="label-cell">上单每日收入：</td>
          <td colspan="3" class="value-cell">{{ prevSummary.dailyIncome }}</td>
          <td class="label-cell">上单每日开支：</td>
          <td colspan="3" class="value-cell">-</td>
          <td class="label-cell">上单出货件数：</td>
          <td colspan="3" class="value-cell">-</td>
          <td class="label-cell red-text bold" rowspan="2">应收总金额：</td>
          <td colspan="3" class="value-cell red-text bold" rowspan="2">¥{{ currSummary.totalAmount.toFixed(2) }}</td>
        </tr>
        <!-- 第5行：PT + 本单每日收支 -->
        <tr>
          <td class="color-cell">PT</td>
          <td class="value-cell">{{ getWeightByColor('PT').prevNet }}</td>
          <td class="value-cell">{{ getWeightByColor('PT').currNet }}</td>
          <td class="value-cell">{{ getWeightByColor('PT').totalNet }}</td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('PT').prevLoss }}</td>
          <td></td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('PT').currLoss }}</td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('PT').totalLoss }}</td>
          <td></td>
          <td></td>
          <td class="label-cell">本单每日收入：</td>
          <td colspan="3" class="value-cell">{{ currSummary.totalAmount.toFixed(2) }}</td>
          <td class="label-cell">本单每日开支：</td>
          <td colspan="3" class="value-cell">{{ currSummary.dailyExpense }}</td>
          <td class="label-cell">本单出货件数：</td>
          <td colspan="3" class="value-cell">{{ currSummary.qty }}</td>
        </tr>
        <!-- 第6行：银 + 累计收支 -->
        <tr>
          <td class="color-cell">银</td>
          <td class="value-cell">{{ getWeightByColor('银').prevNet }}</td>
          <td class="value-cell">{{ getWeightByColor('银').currNet }}</td>
          <td class="value-cell">{{ getWeightByColor('银').totalNet }}</td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('银').prevLoss }}</td>
          <td></td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('银').currLoss }}</td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('银').totalLoss }}</td>
          <td></td>
          <td></td>
          <td class="label-cell blue-text">累计收入：</td>
          <td colspan="3" class="value-cell blue-text">¥{{ totalSummary.dailyIncome.toFixed(2) }}</td>
          <td class="label-cell blue-text">累计开支：</td>
          <td colspan="3" class="value-cell blue-text">¥{{ totalSummary.dailyExpense.toFixed(2) }}</td>
          <td class="label-cell blue-text">累计出货件数：</td>
          <td colspan="3" class="value-cell blue-text">{{ totalSummary.qty }}</td>
          <td class="label-cell red-text bold">支出平衡总金额：</td>
          <td colspan="3" class="value-cell red-text bold">¥{{ totalSummary.balance.toFixed(2) }}</td>
        </tr>
        <!-- 第7行：铜 -->
        <tr>
          <td class="color-cell">铜</td>
          <td class="value-cell">{{ getWeightByColor('铜').prevNet }}</td>
          <td class="value-cell">{{ getWeightByColor('铜').currNet }}</td>
          <td class="value-cell">{{ getWeightByColor('铜').totalNet }}</td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('铜').prevLoss }}</td>
          <td></td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('铜').currLoss }}</td>
          <td></td>
          <td class="value-cell">{{ getWeightByColor('铜').totalLoss }}</td>
          <td></td>
          <td></td>
          <td colspan="16"></td>
        </tr>
      </tbody>
    </table>
  </div>
  <template #footer>
    <el-button @click="previewVisible = false">关闭</el-button>
    <el-button type="primary" @click="handleExportPreview">导出Excel</el-button>
  </template>
</el-dialog>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, Search, RefreshRight, Plus } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getLrList, deleteLr, generateLr, getAvailableBillsForLr, getLrCustomers, getLrCurrentNode, getLrNodeActions, executeLrAction } from '@/api/lr';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const billLoading = ref(false);
const generating = ref(false);
const tableData = ref([]);
const customerList = ref([]);
const showGenerateDialog = ref(false);
const availableBills = ref([]);
const selectedBills = ref([]);
const actionId = ref(0);

const normalizedUserType = computed(() => String(userStore.userType || '').trim().replace(/[_-]/g, '').toLowerCase());
const isAuditUser = computed(() => ['factoryaudit', '工厂审核员'].includes(normalizedUserType.value));
const isFactoryOperator = computed(() => normalizedUserType.value === 'factoryorder');

const rowStatus = (row) => {
  const status = String(row.status || row.Status || 'draft').trim();
  const normalized = status.replace(/[_-]/g, '').toLowerCase();
  if (['submitted', 'pending', 'pendingaudit', 'auditpending'].includes(normalized)) return 'submitted';
  if (['confirmed', 'completed', 'finished'].includes(normalized)) return 'confirmed';
  return 'draft';
};
const canEditRow = (row) => (isFactoryOperator.value && rowStatus(row) === 'draft')
  || (isAuditUser.value && rowStatus(row) !== 'confirmed');
const canSubmitRow = (row) => isFactoryOperator.value && rowStatus(row) === 'draft';
const canConfirmRow = (row) => isAuditUser.value && rowStatus(row) === 'submitted';
const canRejectRow = (row) => isAuditUser.value && rowStatus(row) === 'submitted';
const canDeleteRow = (row) => isFactoryOperator.value && rowStatus(row) === 'draft';
// ========== 预览相关 ==========
const previewVisible = ref(false)
const previewInfo = ref({})
const previewRows = ref([])
const prevData = ref({
  summary: {
    totalSale: 0, totalCost: 0, totalProfit: 0,
    totalDiamondProfit: 0, totalSettingProfit: 0, totalLaborProfit: 0,
    totalNetWeight: 0, totalAddLossWeight: 0
  },
  details: []
})

// 打开预览
const handlePreview = async (row) => {
  previewVisible.value = true
  try {
    const res = await getLrTable(row.id)
    if (res?.data) {
      previewInfo.value = res.data
      const rows = res.data.rows || []
      // 按Excel顺序：先所有销售行，后所有成本行
      const saleRows = rows.filter(r => r.rowType === 'sale')
      const costRows = rows.filter(r => r.rowType === 'cost')
      previewRows.value = [...saleRows, ...costRows]
      
      // 加载上单汇总数据（和editor逻辑一致）
      if (res.data.customerId) {
        const customerRes = await getCustomerSummary(res.data.customerId)
        if (customerRes?.success && customerRes?.data) {
          prevData.value.summary = customerRes.data.summary || prevData.value.summary
          prevData.value.details = customerRes.data.details || []
        }
      }
    }
  } catch (e) {
    console.error('加载预览失败:', e)
    ElMessage.error('加载预览数据失败')
  }
}

// 合计计算
const previewTotal = computed(() => {
  const saleList = previewRows.value.filter(r => r.rowType === 'sale')
  const sum = (prop) => saleList.reduce((s, r) => s + (Number(r[prop]) || 0), 0)
  return {
    qty: sum('quantity'),
    totalWeight: sum('totalWeight').toFixed(2),
    netWeight: sum('netWeight').toFixed(3),
    addLossWeight: sum('addLossWeight').toFixed(3),
    goldMaterialFee: sum('goldMaterialFee').toFixed(2),
    stoneQty: sum('stoneQty'),
    stoneWeight: sum('stoneWeight').toFixed(2),
    stoneAmount: sum('stoneAmount').toFixed(2),
    stoneSettingFee: sum('stoneSettingFee').toFixed(2),
    subStoneQty: sum('subStoneQty'),
    subStoneWeight: sum('subStoneWeight').toFixed(2),
    subStoneAmount: sum('subStoneAmount').toFixed(2),
    subStoneSettingFee: sum('subStoneSettingFee').toFixed(2),
    packingFee: sum('packingFee').toFixed(2),
    moldFee: sum('moldFee').toFixed(2),
    laborFee: sum('laborFee').toFixed(2),
    totalAmount: sum('totalAmount').toFixed(2)
  }
})

// 按成色取重量数据
const getWeightByColor = (color) => {
  const saleList = previewRows.value.filter(r => r.rowType === 'sale' && r.color === color)
  const currNet = saleList.reduce((s, r) => s + (Number(r.netWeight) || 0), 0)
  const currLoss = saleList.reduce((s, r) => s + (Number(r.addLossWeight) || 0), 0)
  const prevDetail = prevData.value.details.find(d => d.color === color)
  const prevNet = prevDetail?.netWeight ?? 0
  const prevLoss = prevDetail?.addLossWeight ?? 0
  return {
    prevNet: prevNet > 0 ? prevNet.toFixed(3) : '',
    currNet: currNet > 0 ? currNet.toFixed(3) : '',
    totalNet: (prevNet + currNet).toFixed(3),
    prevLoss: prevLoss > 0 ? prevLoss.toFixed(3) : '',
    currLoss: currLoss > 0 ? currLoss.toFixed(3) : '',
    totalLoss: (prevLoss + currLoss).toFixed(3)
  }
}

// 利润汇总（和editor逻辑完全一致）
const currSummary = computed(() => {
  const saleList = previewRows.value.filter(r => r.rowType === 'sale')
  const costList = previewRows.value.filter(r => r.rowType === 'cost')
  const sum = (list, prop) => list.reduce((s, r) => s + (Number(r[prop]) || 0), 0)
  
  const saleStoneAmount = sum(saleList, 'stoneAmount') + sum(saleList, 'subStoneAmount')
  const costStoneAmount = sum(costList, 'stoneAmount') + sum(costList, 'subStoneAmount')
  const saleStoneSetting = sum(saleList, 'stoneSettingFee') + sum(saleList, 'subStoneSettingFee')
  const costStoneSetting = sum(costList, 'stoneSettingFee') + sum(costList, 'subStoneSettingFee')
  const saleLaborFee = sum(saleList, 'laborFee')
  const costLaborFee = sum(costList, 'laborFee')
  const saleTotal = sum(saleList, 'totalAmount')
  const costTotal = sum(costList, 'totalAmount')
  const saleQty = saleList.reduce((s, r) => s + (Number(r.quantity) || 1), 0)

  return {
    diamondProfit: saleStoneAmount - costStoneAmount,
    settingProfit: saleStoneSetting - costStoneSetting,
    laborProfit: saleLaborFee - costLaborFee,
    totalProfit: saleTotal - costTotal,
    totalAmount: saleTotal,
    qty: saleQty,
    dailyExpense: costTotal.toFixed(2)
  }
})

const prevSummary = computed(() => {
  const data = prevData.value.summary
  return {
    diamondProfit: data.totalDiamondProfit > 0 ? data.totalDiamondProfit.toFixed(2) : '-',
    settingProfit: data.totalSettingProfit > 0 ? data.totalSettingProfit.toFixed(2) : '-',
    laborProfit: data.totalLaborProfit > 0 ? data.totalLaborProfit.toFixed(2) : '-',
    totalProfit: data.totalProfit > 0 ? data.totalProfit.toFixed(2) : '-',
    dailyIncome: data.totalSale > 0 ? data.totalSale.toFixed(2) : '-'
  }
})

const totalSummary = computed(() => {
  const prev = prevData.value.summary
  const curr = currSummary.value
  const prevDiamond = Number(prev.totalDiamondProfit) || 0
  const prevSetting = Number(prev.totalSettingProfit) || 0
  const prevLabor = Number(prev.totalLaborProfit) || 0
  const prevProfit = Number(prev.totalProfit) || 0
  const prevSale = Number(prev.totalSale) || 0
  const prevCost = Number(prev.totalCost) || 0

  return {
    diamondProfit: prevDiamond + curr.diamondProfit,
    settingProfit: prevSetting + curr.settingProfit,
    laborProfit: prevLabor + curr.laborProfit,
    totalProfit: prevProfit + curr.totalProfit,
    dailyIncome: prevSale + curr.totalAmount,
    dailyExpense: prevCost + curr.totalAmount,
    qty: (prevSale > 0 ? 1 : 0) + curr.qty,
    balance: prevProfit + curr.totalProfit
  }
})

// 导出Excel
const handleExportPreview = () => {
  if (!previewInfo.value.id) return
  handleExport(previewInfo.value) // 复用你列表原有的导出方法即可
}
const search = reactive({
  customerId: '',
  color: '',
  status: '',
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

// ===== 汇总计算 =====
const summary = computed(() => {
  const list = tableData.value;
  if (!list.length) {
    return {
      totalProfit: 0,
      diamondProfit: 0,
      settingProfit: 0,
      laborProfit: 0,
      netWeightByColor: {},
      addLossByColor: {},
    };
  }

  const netWeightByColor = {};
  const addLossByColor = {};

  list.forEach(item => {
    const color = item.color || '其他';
    netWeightByColor[color] = (netWeightByColor[color] || 0) + (item.netWeight || 0);
    addLossByColor[color] = (addLossByColor[color] || 0) + (item.addLossWeight || 0);
  });

  const colorOrder = ['18K', '14K', '9K', 'PT', '银', '铜'];
  const sortColors = (obj) => {
    const sorted = {};
    colorOrder.forEach(c => {
      if (obj[c] !== undefined) sorted[c] = obj[c];
    });
    Object.keys(obj).forEach(c => {
      if (!sorted[c]) sorted[c] = obj[c];
    });
    return sorted;
  };

  return {
    totalProfit: list.reduce((s, r) => s + (r.profit || 0), 0),
    diamondProfit: list.reduce((s, r) => s + (r.diamondProfit || 0), 0),
    settingProfit: list.reduce((s, r) => s + (r.settingProfit || 0), 0),
    laborProfit: list.reduce((s, r) => s + (r.laborProfit || 0), 0),
    netWeightByColor: sortColors(netWeightByColor),
    addLossByColor: sortColors(addLossByColor),
  };
});

// ===== 加载客户列表 =====
const loadCustomers = async () => {
  try {
    const res = await getLrCustomers();
    customerList.value = res?.data || [];
  } catch {
    customerList.value = [];
  }
};

// ===== 加载数据 =====
const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      customerId: search.customerId || undefined,
      color: search.color || undefined,
      status: search.status || undefined,
    };
    const res = await getLrList(params);
    const data = res?.data || [];
    tableData.value = data;
    pagination.total = data.length;
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

const resetSearch = () => {
  search.customerId = '';
  search.color = '';
  search.status = '';
  pagination.current = 1;
  loadData();
};

// ===== 查看详情 =====
const viewDetail = (row) => {
  router.push(`/order/lr/edit/${row.billId}`);
};

const editLr = (row) => {
  router.push(`/order/lr/edit/${row.billId}`);
};

const executeRowAction = async (row, actionKey, message) => {
  actionId.value = row.id;
  try {
    await executeLrAction({ businessId: String(row.id), actionKey });
    ElMessage.success(`${message}成功`);
    await loadData();
  } catch (error) {
    ElMessage.error(error?.message || `${message}失败`);
  } finally {
    actionId.value = 0;
  }
};

const submitLr = async (row) => {
  await ElMessageBox.confirm(`确认提交 LR 表 ${row.billNo} 吗？提交后将不能编辑。`, '提交确认', { type: 'warning' });
  await executeRowAction(row, 'submit', '提交');
};

const confirmLr = async (row) => {
  await ElMessageBox.confirm(`确认通过 LR 表 ${row.billNo} 吗？确认后流程结束。`, '审核确认', { type: 'warning' });
  await executeRowAction(row, 'confirm', '确认');
};

const rejectLr = async (row) => {
  const result = await ElMessageBox.prompt('请输入退回原因', '退回起草', {
    inputPlaceholder: '请输入原因',
    inputValidator: value => value?.trim() ? true : '请输入退回原因'
  });
  actionId.value = row.id;
  try {
    const nodeRes = await getLrCurrentNode(row.id);
    const node = nodeRes?.data || {};
    const nodeKey = node.nodeKey || node.node_key || 'submitted';
    await executeLrAction({ businessId: String(row.id), actionKey: 'reject', remark: result.value.trim() });
    ElMessage.success('已退回起草');
    await loadData();
  } catch (error) {
    ElMessage.error(error?.message || '退回失败');
  } finally {
    actionId.value = 0;
  }
};

// ===== 删除 =====
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除LR表 ${row.billNo} 吗？`, '提示', { type: 'warning' });
    await deleteLr(row.id);
    ElMessage.success('删除成功');
    loadData();
    loadCustomers();
  } catch {}
};

// ===== 生成LR表弹窗 =====
const openGenerateDialog = () => {
  showGenerateDialog.value = true;
  selectedBills.value = [];
};

const loadAvailableBills = async () => {
  billLoading.value = true;
  try {
    const res = await getAvailableBillsForLr();
    availableBills.value = res?.data || [];
    if (availableBills.value.length === 0) {
      ElMessage.info('没有可生成LR表的账单');
    }
  } catch {
    ElMessage.error('加载账单失败');
  } finally {
    billLoading.value = false;
  }
};

const handleBillSelection = (selection) => {
  selectedBills.value = selection;
};

const handleGenerateLr = async () => {
  if (selectedBills.value.length === 0) {
    ElMessage.warning('请至少选择一个账单');
    return;
  }

  generating.value = true;
  try {
    let successCount = 0;
    let failCount = 0;

    for (const bill of selectedBills.value) {
      try {
        const res = await generateLr({ billId: bill.billId });
        if (res.success) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0 && failCount === 0) {
      ElMessage.success(`成功生成 ${successCount} 个LR表`);
      showGenerateDialog.value = false;
      loadData();
      loadCustomers();
    } else if (successCount > 0 && failCount > 0) {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`);
      loadData();
      loadCustomers();
    } else {
      ElMessage.error('所有账单生成失败');
    }
  } catch {
    ElMessage.error('生成失败');
  } finally {
    generating.value = false;
  }
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

// ===== 初始化 =====
onMounted(() => {
  loadCustomers();
  loadData();
});
</script>

<style scoped>
.page-container {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

/* ===== 搜索栏 ===== */
.search-bar {
  background: #f5f7fa;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 12px;
}
.search-bar :deep(.el-form-item) {
  margin-bottom: 0;
}

/* ===== 汇总卡片 ===== */
.summary-cards {
  background: #f5f7fa;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.summary-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.summary-row + .summary-row {
  margin-top: 8px;
}
.summary-card {
  flex: 1;
  min-width: 100px;
  background: #fff;
  border-radius: 4px;
  padding: 8px 12px;
  border: 1px solid #e8ecf1;
}
.summary-card .card-label {
  display: block;
  font-size: 12px;
  color: #8a9aaa;
}
.summary-card .card-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
  margin-top: 2px;
}
.color-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 2px;
}
.color-tag {
  font-size: 12px;
  color: #303133;
  background: #f5f7fa;
  padding: 0 6px;
  border-radius: 3px;
}

/* ===== 表格 ===== */
:deep(.el-table .el-table__row) {
  cursor: pointer;
}
:deep(.el-table .cell) {
  padding: 4px 6px;
}

/* ========== Excel预览样式 ========== */
.excel-preview {
  font-family: '宋体', SimSun, sans-serif;
  font-size: 12px;
  color: #000;
  overflow-x: auto;
}
.excel-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #000;
  min-width: 1200px;
}
.excel-table th,
.excel-table td {
  border: 1px solid #000;
  padding: 3px 5px;
  vertical-align: middle;
  font-weight: normal;
}
.excel-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  padding: 10px 0;
  letter-spacing: 4px;
}
.info-row th {
  border: none;
  padding: 5px;
  font-weight: normal;
}
.info-label {
  text-align: right;
  font-weight: 500;
}
.info-value {
  text-align: left;
}
.excel-header {
  background: #f0f0f0;
  text-align: center;
  font-weight: 500;
}
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.red-text { color: #f56c6c; }
.blue-text { color: #409eff; }
.bold { font-weight: bold; }

.sale-row {
  background: #fff;
}
.cost-row {
  background: #f8f8f8;
}
.total-row {
  background: #f5f5f5;
  font-weight: 500;
}

.empty-gap {
  height: 15px;
}

/* 汇总表样式 */
.summary-table {
  margin-top: 5px;
}
.summary-table .header-cell {
  background: #f0f0f0;
  text-align: center;
  font-weight: 500;
}
.summary-table .color-cell {
  font-weight: 600;
  color: #409eff;
  text-align: center;
}
.summary-table .label-cell {
  text-align: right;
  font-weight: 500;
  white-space: nowrap;
}
.summary-table .value-cell {
  text-align: right;
  min-width: 80px;
  font-family: 'Consolas', monospace;
}
.summary-table .profit-val {
  color: #f56c6c;
}

</style>