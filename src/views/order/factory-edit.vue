
<!-- src/views/order/factory-edit.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>✏️ 编辑订单</h2>
        <el-tag type="primary" size="large">{{ orderData?.orderNo || '' }}</el-tag>
        <el-tag v-if="orderData?.flowStatus" :type="getStatusType(orderData.flowStatus)" size="large">
          {{ getStatusText(orderData.flowStatus) }}
        </el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon> 保存
        </el-button>
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
              {{ row.color || '-' }}
              <span class="purity-rate">（折算率 {{ formatRate(currentPurityRate) }}）</span>
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="80" align="center" />
          <el-table-column prop="size" label="手寸" width="90" align="center" />
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
              <el-input-number v-model="orderData.totalWeight" :precision="3" :min="0" style="width:100%;" @change="calcFactory" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="净重(g)">
              <el-input-number v-model="orderData.netWeight" :precision="3" :min="0" style="width:100%;" @change="calcFactory" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="损耗率">
              <el-select
                v-model="orderData.lossRate"
                :class="{ 'loss-warning': !isStandardLoss }"
                style="width:100%;"
                @change="calcFactory"
              >
                <el-option v-for="item in lossRateOptions" :key="item.value" :value="item.value" :label="item.label" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="加耗重">
              <el-input-number v-model="orderData.addLossWeight" :precision="3" disabled style="width:100%;" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="金价(元/克)">
              <el-input-number v-model="orderData.goldPrice" :precision="2" :min="0" style="width:100%;" @change="calcFactory" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="足金料克重(g)">
              <el-input-number v-model="orderData.goldMaterialWeight" :precision="3" disabled style="width:100%;" />
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
      </div>

      <div class="section-divider"></div>

      <!-- ===== 主石信息 ===== -->
      <div class="form-section">
        <div class="section-title">💎 主石信息</div>
        <el-row :gutter="16">
          <el-col :xs="12" :sm="5">
            <el-form-item label="石重(ct)">
              <el-input-number v-model="orderData.mainStoneWeight" :precision="3" :min="0" style="width:100%;" @change="calcMainStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="单价(元)">
              <el-input-number v-model="orderData.mainStonePrice" :precision="2" :min="0" style="width:100%;" @change="calcMainStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="粒数">
              <el-input-number v-model="orderData.mainStoneQty" :min="0" style="width:100%;" @change="calcMainStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="镶石工费">
              <el-input-number v-model="orderData.mainStoneSettingFee" :precision="2" :min="0" style="width:100%;" @change="calcMainStone" />
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
              <el-input-number v-model="orderData.subStoneWeight" :precision="3" :min="0" style="width:100%;" @change="calcSubStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="单价(元)">
              <el-input-number v-model="orderData.subStonePrice" :precision="2" :min="0" style="width:100%;" @change="calcSubStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="粒数">
              <el-input-number v-model="orderData.subStoneQty" :min="0" style="width:100%;" @change="calcSubStone" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="5">
            <el-form-item label="镶石工费">
              <el-input-number v-model="orderData.subStoneSettingFee" :precision="2" :min="0" style="width:100%;" @change="calcSubStone" />
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
          <el-col :xs="12" :sm="4">
            <el-form-item label="包装费">
              <el-input-number v-model="orderData.packingFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="证书费">
              <el-input-number v-model="orderData.certificateFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="邮费">
              <el-input-number v-model="orderData.postageFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="版费">
              <el-input-number v-model="orderData.moldFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
            <el-form-item label="工费">
              <el-input-number v-model="orderData.laborFee" :precision="2" :min="0" style="width:100%;" @change="calcTotal" />
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="4">
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
          <span class="cost-subtitle">销售行（白底）只读 ｜ 成本行（红线下方、红底）可填；总重 / 金价由订单带出、不可修改</span>
          <el-tag v-if="costWarn" type="danger" effect="dark" size="small" style="margin-left:8px;">
            ❗ 成本高于销售
          </el-tag>
          <el-tag v-else-if="!costHasData" type="info" size="small" style="margin-left:8px;">
            成本未录入（默认与销售一致）
          </el-tag>
          <el-tag v-else type="success" size="small" style="margin-left:8px;">成本已录入</el-tag>
          <el-tag v-if="!orderEditable" type="warning" effect="plain" size="small" style="margin-left:8px;">
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
              <el-input v-if="row.__type === 'cost'" v-model.number="row.quantity" size="small" class="cell-input" @change="calcCost" />
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
              <el-input v-if="row.__type === 'cost'" v-model.number="row.netWeight" size="small" class="cell-input" @change="calcCost" />
              <span v-else>{{ fmtW(row.netWeight) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="lossRate" label="损耗" width="80" align="center">
            <template #default="{ row }">
              <el-input v-if="row.__type === 'cost'" v-model.number="row.lossRate" size="small" class="cell-input" @change="calcCost" />
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
            <el-table-column prop="stoneWeight" label="卡重" width="85" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost'" v-model.number="row.stoneWeight" size="small" class="cell-input" @change="calcCost" />
                <span v-else>{{ fmtW(row.stoneWeight) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="stonePrice" label="单价" width="85" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost'" v-model.number="row.stonePrice" size="small" class="cell-input" @change="calcCost" />
                <span v-else>{{ fmtM(row.stonePrice) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="stoneQty" label="粒数" width="70" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost'" v-model.number="row.stoneQty" size="small" class="cell-input" @change="calcCost" />
                <span v-else>{{ row.stoneQty ?? '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="stoneSettingFee" label="镶石工费" width="90" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost'" v-model.number="row.stoneSettingFee" size="small" class="cell-input" @change="calcCost" />
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
            <el-table-column prop="subStoneWeight" label="卡重" width="80" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost'" v-model.number="row.subStoneWeight" size="small" class="cell-input" @change="calcCost" />
                <span v-else>{{ fmtW(row.subStoneWeight) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="subStonePrice" label="单价" width="80" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost'" v-model.number="row.subStonePrice" size="small" class="cell-input" @change="calcCost" />
                <span v-else>{{ fmtM(row.subStonePrice) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="subStoneQty" label="粒数" width="65" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost'" v-model.number="row.subStoneQty" size="small" class="cell-input" @change="calcCost" />
                <span v-else>{{ row.subStoneQty ?? '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="subStoneSettingFee" label="镶石工费" width="85" align="center">
              <template #default="{ row }">
                <el-input v-if="row.__type === 'cost'" v-model.number="row.subStoneSettingFee" size="small" class="cell-input" @change="calcCost" />
                <span v-else>{{ fmtM(row.subStoneSettingFee) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="subStoneAmount" label="金额" width="90" align="center">
              <template #default="{ row }">
                <span class="auto-cell">{{ fmtM(row.subStoneAmount) }}</span>
              </template>
            </el-table-column>
          </el-table-column>

          <el-table-column prop="packingFee" label="包装证书" width="90" align="center">
            <template #default="{ row }">
              <el-input v-if="row.__type === 'cost'" v-model.number="row.packingFee" size="small" class="cell-input" @change="calcCost" />
              <span v-else>{{ fmtM(row.packingFee) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="moldFee" label="版费" width="80" align="center">
            <template #default="{ row }">
              <el-input v-if="row.__type === 'cost'" v-model.number="row.moldFee" size="small" class="cell-input" @change="calcCost" />
              <span v-else>{{ fmtM(row.moldFee) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="laborFee" label="工费" width="80" align="center">
            <template #default="{ row }">
              <el-input v-if="row.__type === 'cost'" v-model.number="row.laborFee" size="small" class="cell-input" @change="calcCost" />
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
          <MultiImageUpload v-model="finishedImages" :max-count="10" type="finished" />
        </div>

        <!-- 数据包上传（3D 模型 / 订单数据包） -->
        <div class="image-block" style="margin-top:14px;">
          <div class="image-block-title">📦 数据包 <span class="tip-text">（3D 模型 / 订单数据包，可上传多个）</span></div>
          <MultiFileUpload v-model="dataPackages" :max-count="10" :max-size-m-b="200" />
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

      <!-- ===== 制作状态 ===== -->
      <div class="form-section">
        <div class="section-title">🔄 制作状态</div>
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          <span style="color:#666;">当前状态：</span>
          <el-tag :type="getStatusType(orderData?.flowStatus)" size="large">
            {{ getStatusText(orderData?.flowStatus) }}
          </el-tag>

          <span style="color:#666; margin-left:16px;">更新为：</span>
          <el-select v-model="selectedStatus" placeholder="选择下一个状态" style="width:200px;">
            <el-option
              v-for="item in availableStatuses"
              :key="item.key"
              :label="item.label"
              :value="item.key"
            />
          </el-select>
          <el-button type="primary" @click="updateStatus" :loading="statusLoading" :disabled="!selectedStatus">
            更新状态
          </el-button>
        </div>
        <div style="margin-top:12px;">
          <el-steps :active="currentStep" finish-status="success" align-center>
            <el-step v-for="s in productionSteps" :key="s.key" :title="s.label" />
          </el-steps>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Check } from '@element-plus/icons-vue';
import { getOrderDetail, updateOrder, updateProduction, getOrderCost, saveOrderCost } from '@/api/order';
import { dictApi } from '@/api/dict';
import { useUserStore } from '@/stores/user';
import MultiImageUpload from '@/components/MultiImageUpload.vue';
import MultiFileUpload from '@/components/MultiFileUpload.vue';
import ImageGroup from '@/components/ImageGroup.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const orderId = computed(() => Number(route.params.id));

const orderData = ref({});
// ⭐ 订单信息表格数据（缓存为 computed，避免每次渲染创建新数组导致 el-table 递归更新）
const orderTableData = computed(() => (orderData.value?.orderId ? [orderData.value] : []));
const loading = ref(false);
const saving = ref(false);
const statusLoading = ref(false);

// ⭐ 成品图片上传
const finishedImages = ref([]);
// ⭐ 数据包上传（3D 模型 / 订单数据包）
const dataPackages = ref([]);
const selectedStatus = ref('');
const lossRateOptions = ref([]);
const productionStatuses = ref([]);

// ⭐ 步骤条只画主工序；「报废 / 暂停」属于旁支状态，不进流程链
const SIDE_STATUSES = ['scrapped', 'paused'];
const productionSteps = computed(() =>
  productionStatuses.value.filter(s => !SIDE_STATUSES.includes(s.key))
);
const purityDict = ref([]);

// ==================== ⭐ 成本数据（LR 成本行） ====================
// 成本行：一行一订单，与 LR 的成本行同口径
const costRow = ref({ __type: 'cost' });
const costHasData = ref(false);     // 后端是否已录入过成本
const costSaving = ref(false);

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
  { key: 'netWeight', label: '净重', digits: 3, tolerance: 0 },
  { key: 'lossRate', label: '损耗率', digits: 3, tolerance: 0 },
  { key: 'addLossWeight', label: '加耗重', digits: 3, tolerance: 0 },
  { key: 'goldPrice', label: '金价', digits: 2, tolerance: 0 },
  { key: 'stonePrice', label: '主石单价', digits: 2, tolerance: 0 },
  { key: 'subStonePrice', label: '副石单价', digits: 2, tolerance: 0 },
  // ⭐ 成本合计：销售合计取整（Math.round），成本为精确两位，故留 1 元容差不误报
  { key: 'totalAmount', label: '成本合计', digits: 2, tolerance: 1 },
];

const costWarnList = computed(() => {
  const list = [];
  COST_WARN_FIELDS.forEach(f => {
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
const costWarnReason = computed(() => costWarnList.value.map(x => x.text).join('；'));
const costProfit = computed(() => parseFloat(
  ((Number(saleRow.value.totalAmount) || 0) - (Number(costRow.value.totalAmount) || 0)).toFixed(2)
));

const fmtW = (v) => (v === null || v === undefined || v === '' ? '-' : Number(v).toFixed(3));
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
  c.goldPrice = saleRow.value.goldPrice ?? null;
  const rate = currentPurityRate.value || 1;
  c.addLossWeight = parseFloat(((Number(c.netWeight) || 0) * (Number(c.lossRate) || 0)).toFixed(3));
  c.goldMaterialWeight = parseFloat(((Number(c.addLossWeight) || 0) * rate).toFixed(3));
  c.goldMaterialFee = parseFloat(((Number(c.goldMaterialWeight) || 0) * (Number(c.goldPrice) || 0)).toFixed(2));
  c.stoneAmount = parseFloat(
    ((Number(c.stoneWeight) || 0) * (Number(c.stonePrice) || 0)
      + (Number(c.stoneQty) || 0) * (Number(c.stoneSettingFee) || 0)).toFixed(2)
  );
  c.subStoneAmount = parseFloat(
    ((Number(c.subStoneWeight) || 0) * (Number(c.subStonePrice) || 0)
      + (Number(c.subStoneQty) || 0) * (Number(c.subStoneSettingFee) || 0)).toFixed(2)
  );
  c.totalAmount = parseFloat(
    ((Number(c.goldMaterialFee) || 0) + (Number(c.stoneAmount) || 0) + (Number(c.subStoneAmount) || 0)
      + (Number(c.packingFee) || 0) + (Number(c.moldFee) || 0) + (Number(c.laborFee) || 0)).toFixed(2)
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
    const { __type, warnFlag, warnReason, ...payload } = costRow.value;
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
  return productionStatuses.value.find(item => item.key === status)?.label
    || statusMap[status]?.text
    || status
    || '-';
};
const getStatusType = (status) => statusMap[status]?.type || 'info';

// ==================== 进度 ====================
const currentStep = computed(() => {
  const s = orderData.value?.flowStatus;
  const index = productionStatuses.value.findIndex(item => item.key === s);
  return index >= 0 ? index : 0;
});

const availableStatuses = computed(() => {
  const current = orderData.value?.flowStatus;
  // ⭐ 暂停 / 配件缺失属于旁支：处理完可以回到任意工序
  if (SIDE_STATUSES.includes(current) || current === 'partsMissing') {
    return productionStatuses.value.filter(s => s.key !== current);
  }
  const currentIndex = productionStatuses.value.findIndex(item => item.key === current);
  return currentIndex >= 0 ? productionStatuses.value.slice(currentIndex + 1) : productionStatuses.value;
});

// ==================== 标准损耗 ====================
const isStandardLoss = computed(() => {
  const lr = Number(orderData.value.lossRate);
  return lr === 1.10 || lr === 1.08;
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
const calcFactory = () => {
  const netWeight = orderData.value.netWeight || 0;
  const loss = orderData.value.lossRate || 1.10;
  const gold = orderData.value.goldPrice || 0;

  // 加耗重 = 净重 × 损耗
  const addLossWeight = netWeight * loss;
  orderData.value.addLossWeight = parseFloat(addLossWeight.toFixed(3));

  // ⭐ 足金料克重 = 加耗重 × 成色折算率
  const rate = currentPurityRate.value || 1;
  orderData.value.goldMaterialWeight = parseFloat((addLossWeight * rate).toFixed(3));

  // ⭐ 足金料金额 = 足金料克重 × 金价
  orderData.value.goldMaterialFee = parseFloat((orderData.value.goldMaterialWeight * gold).toFixed(2));

  // 统一不计折现金
  orderData.value.goldConvertCash = false;

  calcTotal();
};

// ⭐ 主石金额 = 石重 × 单价 + 粒数 × 镶石工费
const calcMainStone = () => {
  const qty = orderData.value.mainStoneQty || 0;
  const weight = orderData.value.mainStoneWeight || 0;
  const price = orderData.value.mainStonePrice || 0;
  const settingFee = orderData.value.mainStoneSettingFee || 0;
  orderData.value.mainStoneAmount = parseFloat((weight * price + qty * settingFee).toFixed(2));
  calcTotal();
};

// ⭐ 副石金额 = 石重 × 单价 + 粒数 × 镶石工费
const calcSubStone = () => {
  const qty = orderData.value.subStoneQty || 0;
  const weight = orderData.value.subStoneWeight || 0;
  const price = orderData.value.subStonePrice || 0;
  const settingFee = orderData.value.subStoneSettingFee || 0;
  orderData.value.subStoneAmount = parseFloat((weight * price + qty * settingFee).toFixed(2));
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
// ⭐ 订单主体是否处于工厂可编辑状态（与后端 FlowStatus.FactoryEditableStatuses 一致）
//    非可编辑状态（如已完成/已取消）时，只保存成本，不再提交订单主体
const ORDER_EDITABLE_STATUSES = [
  'factory_edit', 'dataConfirm', 'waxing', 'molded', 'cnc', 'partsMissing',
  'sweeping', 'stoneCutting', 'microInlay', 'handInlay', 'assembly', 'polishing', 'paused', 'stoneReady', 'glue', 'inlay', 'billRejected',
];
const orderEditable = computed(() => {
  // 只有工厂操作员受该状态限制；管理员不受限
  if (!userStore.isFactoryOrder) return true;
  return ORDER_EDITABLE_STATUSES.includes(orderData.value?.flowStatus);
});

const handleSave = async () => {
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
    const payload = {
      ...orderData.value,
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
      router.push('/order/factory-list');
      return;
    }

    ElMessage.success('保存成功');
    router.push('/order/factory-list');
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

// ==================== 更新状态 ====================
const updateStatus = async () => {
  if (!selectedStatus.value) {
    ElMessage.warning('请选择状态');
    return;
  }

  const label = getStatusText(selectedStatus.value);
  statusLoading.value = true;
  try {
    await updateProduction(orderId.value, {
      status: selectedStatus.value,
      step: currentStep.value + 1,
      remark: '',
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

// ==================== 返回 ====================
const goBack = () => router.push('/order/factory-list');

const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.section-title {
  font-weight: 600;
  font-size: 15px;
  color: #1d2129;
  margin-bottom: 14px;
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
</style>