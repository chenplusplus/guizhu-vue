<!-- src/views/order/bill-edit.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>{{ isNew ? '📝 创建出货单' : '✏️ 编辑出货明细' }}</h2>
        <el-tag v-if="isNew" type="warning" size="large">新建</el-tag>
        <el-tag v-else :type="statusType" size="large">{{ statusText }}</el-tag>
        <el-tag v-if="!isNew" type="primary" size="large">{{ billNo }}</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon> 保存
        </el-button>
        <el-button type="success" @click="handleGenerateLr" :loading="lrGenerating" v-if="!isNew">
          <el-icon><Document /></el-icon> 生成LR表
        </el-button>
        <el-button type="warning" @click="handleSubmitAudit" v-if="!isNew && billStatus === 'pending'">
          <el-icon><Select /></el-icon> 提交审核
        </el-button>
      </div>
    </div>

    <!-- ===== 整体内容区域 ===== -->
    <div class="content-body">
      <!-- ===== 账单信息 ===== -->
      <div class="info-section">
        <el-row :gutter="16">
          <el-col :xs="12" :sm="4">
            <div class="info-item"><span class="label">账单号：</span><span class="value">{{ billNo || '-' }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="4">
            <div class="info-item"><span class="label">客户：</span><span class="value">{{ customerName || '-' }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="4">
            <div class="info-item"><span class="label">状态：</span>
              <el-tag :type="statusType" size="small">{{ statusText }}</el-tag>
            </div>
          </el-col>
          <el-col :xs="12" :sm="4">
            <div class="info-item"><span class="label">明细数：</span><span class="value">{{ details.length }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="4">
            <div class="info-item"><span class="label">合计件数：</span><span class="value">{{ totalQuantity }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="4">
            <div class="info-item"><span class="label">应收合计：</span>
              <el-tooltip placement="top" effect="dark">
                <template #content>
                  <div style="font-size:13px;line-height:1.8;">
                    计算公式：足金料 + 主石金额 + 副石金额 + 工费 + 包装费 + 证书费 + 邮费 + 版费<br>
                    足金料 = 净重 × 损耗 × 金价
                  </div>
                </template>
                <span class="value" style="color:#E6A23C;font-weight:bold;font-size:18px;cursor:help;border-bottom:1px dashed #E6A23C;">
                  ¥{{ totalAmount.toFixed(2) }}
                </span>
              </el-tooltip>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- ===== 分割线 ===== -->
      <div class="section-divider"></div>

      <!-- ===== 出货明细表格 ===== -->
      <div class="table-section">
        <div class="section-title">
          <span>📋 出货明细</span>
          <span class="section-subtitle">共 {{ details.length }} 条明细</span>
        </div>

        <div class="table-wrapper">
          <el-table 
            :data="details" 
            border 
            stripe 
            size="small"
            style="width:100%;"
            max-height="600"
          >
            <!-- 序号 -->
            <el-table-column label="序号" width="55" align="center" fixed>
              <template #default="{ $index }">{{ $index + 1 }}</template>
            </el-table-column>

            <!-- 订单号 -->
            <el-table-column label="订单号" width="120" fixed>
              <template #default="{ row }">
                <el-tooltip placement="top" effect="dark" :disabled="!row.orderNo">
                  <template #content>
                    <div style="font-size:13px;line-height:1.8;max-width:400px;">
                      <div><b>订单号：</b>{{ row.orderNo || '-' }}</div>
                      <div><b>品名：</b>{{ row.productName || '-' }}</div>
                      <div><b>客户：</b>{{ row.customerName || '-' }}</div>
                      <div><b>钻石级别：</b>{{ row.diamondLevel || '-' }}</div>
                      <div><b>颜色：</b>{{ row.color || '-' }}</div>
                      <div><b>手寸：</b>{{ row.size || '-' }}</div>
                      <div><b>金价：</b>{{ row.goldPrice || '-' }}</div>
                    </div>
                  </template>
                  <span style="color:#409EFF;cursor:pointer;">{{ row.orderNo }}</span>
                </el-tooltip>
              </template>
            </el-table-column>

            <!-- 品名 - 只读显示 -->
            <el-table-column label="品名" min-width="120">
              <template #default="{ row }">{{ row.productName || '-' }}</template>
            </el-table-column>

            <!-- 客户 - 只读显示 -->
            <el-table-column label="客户" width="100">
              <template #default="{ row }">{{ row.customerName || '-' }}</template>
            </el-table-column>

            <!-- 钻石级别 - 只读显示 -->
            <el-table-column label="钻石级别" width="100" align="center">
              <template #default="{ row }">{{ row.diamondLevel || '-' }}</template>
            </el-table-column>

            <!-- 订单日期 - 只读显示 -->
            <el-table-column label="订单日期" width="110" align="center">
              <template #default="{ row }">{{ formatDate(row.orderDate) }}</template>
            </el-table-column>

            <!-- 颜色 - 只读显示 -->
            <el-table-column label="颜色" width="70" align="center">
              <template #default="{ row }">{{ row.color || '-' }}</template>
            </el-table-column>

            <!-- 件数 - 只读显示 -->
            <el-table-column label="件数" width="60" align="center">
              <template #default="{ row }">{{ row.quantity || 1 }}</template>
            </el-table-column>

            <!-- 手寸/长度 - 只读显示 -->
            <el-table-column label="手寸/长度" width="90" align="center">
              <template #default="{ row }">{{ row.size || '-' }}</template>
            </el-table-column>

            <!-- ===== 可编辑字段 ===== -->
            <el-table-column label="总重" width="85">
              <template #default="{ row }">
                <el-input-number v-model="row.totalWeight" :precision="3" :step="0.01" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>

            <el-table-column label="净重" width="85">
              <template #default="{ row }">
                <el-input-number v-model="row.netWeight" :precision="3" :step="0.01" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>

            <el-table-column label="损耗" width="70">
              <template #default="{ row }">
                <el-input-number v-model="row.lossRate" :precision="3" :step="0.01" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>

            <el-table-column label="加耗重" width="85">
              <template #default="{ row }">
                <el-input-number v-model="row.addLossWeight" :precision="3" :step="0.01" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>

            <el-table-column label="金价" width="85">
              <template #default="{ row }">
                <el-input-number v-model="row.goldPrice" :precision="2" :step="1" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>

            <el-table-column label="足金料" width="95">
              <template #default="{ row }">
                <el-input-number v-model="row.goldMaterialFee" :precision="2" :step="1" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>

            <!-- 主石 -->
            <el-table-column label="主石粒数" width="75">
              <template #default="{ row }">
                <el-input-number v-model="row.mainStoneQty" :min="0" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="主石石重" width="90">
              <template #default="{ row }">
                <el-input-number v-model="row.mainStoneWeight" :precision="3" :step="0.01" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="主石单价" width="85">
              <template #default="{ row }">
                <el-input-number v-model="row.mainStonePrice" :precision="2" :step="10" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="主石金额" width="95">
              <template #default="{ row }">
                <el-input-number v-model="row.mainStoneAmount" :precision="2" :step="10" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="主石镶石工费" width="100">
              <template #default="{ row }">
                <el-input-number v-model="row.mainStoneSettingFee" :precision="2" :step="1" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>

            <!-- 副石 -->
            <el-table-column label="副石粒数" width="75">
              <template #default="{ row }">
                <el-input-number v-model="row.subStoneQty" :min="0" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="副石石重" width="90">
              <template #default="{ row }">
                <el-input-number v-model="row.subStoneWeight" :precision="3" :step="0.01" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="副石单价" width="85">
              <template #default="{ row }">
                <el-input-number v-model="row.subStonePrice" :precision="2" :step="10" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="副石金额" width="95">
              <template #default="{ row }">
                <el-input-number v-model="row.subStoneAmount" :precision="2" :step="10" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="副石镶石工费" width="100">
              <template #default="{ row }">
                <el-input-number v-model="row.subStoneSettingFee" :precision="2" :step="1" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>

            <el-table-column label="包装费" width="80">
              <template #default="{ row }">
                <el-input-number v-model="row.packingFee" :precision="2" :step="1" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="证书费" width="80">
              <template #default="{ row }">
                <el-input-number v-model="row.certificateFee" :precision="2" :step="1" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>
            <el-table-column label="邮费" width="80">
              <template #default="{ row }">
                <el-input-number v-model="row.postageFee" :precision="2" :step="1" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>

            <el-table-column label="版费" width="80">
              <template #default="{ row }">
                <el-input-number v-model="row.moldFee" :precision="2" :step="1" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>

            <el-table-column label="工费" width="80">
              <template #default="{ row }">
                <el-input-number v-model="row.laborFee" :precision="2" :step="1" size="small" style="width:100%;" @change="calcRow(row)" />
              </template>
            </el-table-column>

            <!-- 应收金额 -->
            <el-table-column label="应收金额" width="110" align="right" fixed="right">
              <template #default="{ row }">
                <span style="color:#E6A23C;font-weight:bold;font-size:14px;">
                  ¥{{ (row.totalAmount || 0).toFixed(2) }}
                </span>
              </template>
            </el-table-column>

            <!-- ⭐ 退回按钮 -->
            <el-table-column label="退回" width="65" align="center" fixed="right">
              <template #default="{ row }">
                <el-button 
                  v-if="!row.isReturned" 
                  type="danger" 
                  size="small" 
                  link 
                  @click="handleReturnRow(row)"
                >
                  退回
                </el-button>
                <el-tag v-else type="danger" size="small">已退</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 底部汇总 -->
        <div class="table-footer">
          <span>合计件数：<b>{{ totalQuantity }}</b></span>
          <span>总重：<b>{{ totalWeightSum.toFixed(3) }}</b></span>
          <span>净重：<b>{{ totalNetWeightSum.toFixed(3) }}</b></span>
          <span>足金料合计：<b>¥{{ totalGoldFee.toFixed(2) }}</b></span>
          <span>工费合计：<b>¥{{ totalLaborFee.toFixed(2) }}</b></span>
          <span style="color:#E6A23C;font-size:16px;">
            应收合计：<b>¥{{ totalAmount.toFixed(2) }}</b>
          </span>
        </div>
      </div>

      <!-- ===== LR表 ===== -->
      <div v-if="lrData" class="lr-section">
        <div class="section-divider"></div>
        <div class="section-title">
          <span>📊 支出收入LR表</span>
          <el-tag type="success" size="small" style="margin-left:12px;">已生成</el-tag>
        </div>
        <div class="lr-table-wrapper">
          <table class="lr-table">
            <thead>
              <tr>
                <th>序</th>
                <th>品名</th>
                <th>客户</th>
                <th>颜色</th>
                <th>净重</th>
                <th>金价</th>
                <th>足金料</th>
                <th>主石</th>
                <th>副石</th>
                <th>工费</th>
                <th>应收</th>
                <th>类型</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in lrRows" :key="row.seq" :class="row.rowType">
                <td>{{ row.seq }}</td>
                <td>{{ row.productName }}</td>
                <td>{{ row.customerName }}</td>
                <td>{{ row.color }}</td>
                <td>{{ row.netWeight }}</td>
                <td>{{ row.goldPrice }}</td>
                <td>{{ row.goldMaterialFee }}</td>
                <td>{{ row.mainStoneAmount }}</td>
                <td>{{ row.subStoneAmount }}</td>
                <td>{{ row.laborFee }}</td>
                <td>{{ row.totalAmount }}</td>
                <td>
                  <el-tag :type="row.rowType === 'sale' ? 'primary' : 'info'" size="small">
                    {{ row.rowType === 'sale' ? '销售' : '成本' }}
                  </el-tag>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="10" style="text-align:right;font-weight:600;">销售总额：</td>
                <td style="font-weight:600;color:#67C23A;">¥{{ (lrSummary.totalSale || 0).toFixed(2) }}</td>
                <td></td>
              </tr>
              <tr>
                <td colspan="10" style="text-align:right;font-weight:600;">成本总额：</td>
                <td style="font-weight:600;color:#E6A23C;">¥{{ (lrSummary.totalCost || 0).toFixed(2) }}</td>
                <td></td>
              </tr>
              <tr style="background:#fff7e6;">
                <td colspan="10" style="text-align:right;font-weight:600;font-size:16px;">利润：</td>
                <td style="font-weight:600;font-size:16px;color:#F56C6C;">¥{{ (lrSummary.profit || 0).toFixed(2) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <!-- ===== 退回弹窗 ===== -->
    <el-dialog v-model="returnDialogVisible" title="退回明细" width="500px" destroy-on-close>
      <el-alert title="确定要退回该明细吗？" type="warning" :closable="false" show-icon style="margin-bottom:16px;" />
      <el-form>
        <el-form-item label="退回原因" required>
          <el-input v-model="returnForm.reason" type="textarea" :rows="3" placeholder="请填写退回原因" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="returnForm.remark" type="textarea" :rows="2" placeholder="可选备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="returnDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmReturnRow" :loading="returnLoading">
          确认退回
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Check, Document, Select } from '@element-plus/icons-vue';
import { getBillDetail, updateBillDetails, submitBillAudit, generateLr, returnBillItem } from '@/api/bill';

const route = useRoute();
const router = useRouter();
const billId = computed(() => Number(route.params.id));

const loading = ref(false);
const saving = ref(false);
const lrGenerating = ref(false);
const returnLoading = ref(false);
const isNew = ref(false);
const billNo = ref('');
const customerName = ref('');
const billStatus = ref('');
const details = ref([]);
const lrData = ref(null);

// 退回相关
const returnDialogVisible = ref(false);
const returnForm = ref({ reason: '', remark: '' });
const returnTargetRow = ref(null);

// ===== 状态映射 =====
const statusMap = {
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  confirmed: { text: '已确认', type: 'success' },
};

const statusText = computed(() => statusMap[billStatus.value]?.text || billStatus.value || '-');
const statusType = computed(() => statusMap[billStatus.value]?.type || 'info');

// ===== 汇总计算 =====
const totalAmount = computed(() => {
  return details.value.reduce((sum, row) => sum + (row.totalAmount || 0), 0);
});

const totalQuantity = computed(() => {
  return details.value.reduce((sum, row) => sum + (row.quantity || 1), 0);
});

const totalWeightSum = computed(() => {
  return details.value.reduce((sum, row) => sum + (row.totalWeight || 0), 0);
});

const totalNetWeightSum = computed(() => {
  return details.value.reduce((sum, row) => sum + (row.netWeight || 0), 0);
});

const totalGoldFee = computed(() => {
  return details.value.reduce((sum, row) => sum + (row.goldMaterialFee || 0), 0);
});

const totalLaborFee = computed(() => {
  return details.value.reduce((sum, row) => sum + (row.laborFee || 0), 0);
});

// ===== 计算单行 =====
const calcRow = (row) => {
  const netWeight = row.netWeight || 0;
  const goldPrice = row.goldPrice || 0;
  const lossRate = row.lossRate || 1.0;

  row.addLossWeight = parseFloat((netWeight * lossRate).toFixed(3));
  row.goldMaterialFee = parseFloat((row.addLossWeight * goldPrice).toFixed(2));

  const mainStone = row.mainStoneAmount || 0;
  const subStone = row.subStoneAmount || 0;
  const labor = row.laborFee || 0;
  const packing = row.packingFee || 0;
  const certificate = row.certificateFee || 0;
  const postage = row.postageFee || 0;
  const mold = row.moldFee || 0;

  row.totalAmount = parseFloat((
    row.goldMaterialFee + mainStone + subStone + labor + packing + certificate + postage + mold
  ).toFixed(2));
};

const calcTotal = () => {
  details.value.forEach(row => calcRow(row));
};

// ===== LR表行 =====
const lrRows = computed(() => {
  if (!lrData.value) return [];
  return lrData.value.rows || [];
});

const lrSummary = computed(() => {
  if (!lrData.value) return {};
  return lrData.value.summary || {};
});

// ===== 加载数据 =====
const loadData = async () => {
  if (!route.params.id) {
    isNew.value = true;
    const orderIds = route.query.orderIds?.split(',').map(Number) || [];
    if (orderIds.length === 0) {
      ElMessage.warning('请选择订单');
      router.back();
      return;
    }
    try {
      const ordersData = route.query.ordersData ? JSON.parse(decodeURIComponent(route.query.ordersData)) : [];
      if (ordersData.length > 0) {
        details.value = ordersData.map(o => ({
          orderId: o.orderId,
          orderNo: o.orderNo || '',
          customerName: o.customerName || '',
          productName: o.productName || '',
          color: o.color || 'K黄',
          diamondLevel: o.diamondLevel || '',
          orderDate: o.orderDate || new Date().toISOString().split('T')[0],
          quantity: o.quantity || 1,
          size: o.size || '',
          totalWeight: o.totalWeight || 0,
          netWeight: o.netWeight || 0,
          lossRate: o.lossRate || 1.0,
          addLossWeight: o.addLossWeight || 0,
          goldPrice: o.goldPrice || 0,
          goldMaterialFee: o.goldMaterialFee || 0,
          mainStoneQty: o.mainStoneQty || 0,
          mainStoneWeight: o.mainStoneWeight || 0,
          mainStonePrice: o.mainStonePrice || 0,
          mainStoneAmount: o.mainStoneAmount || 0,
          mainStoneSettingFee: o.mainStoneSettingFee || 0,
          subStoneQty: o.subStoneQty || 0,
          subStoneWeight: o.subStoneWeight || 0,
          subStonePrice: o.subStonePrice || 0,
          subStoneAmount: o.subStoneAmount || 0,
          subStoneSettingFee: o.subStoneSettingFee || 0,
          packingFee: o.packingFee || 0,
          certificateFee: o.certificateFee || 0,
          postageFee: o.postageFee || 0,
          moldFee: o.moldFee || 0,
          laborFee: o.laborFee || 0,
          totalAmount: o.totalAmount || 0,
          isReturned: false,
        }));
        customerName.value = ordersData[0]?.customerName || '';
        calcTotal();
      }
    } catch (e) {
      console.warn('解析订单数据失败:', e);
    }
    return;
  }

  loading.value = true;
  try {
    const res = await getBillDetail(billId.value);
    const data = res?.data;
    if (!data) {
      ElMessage.error('账单不存在');
      router.back();
      return;
    }

    billNo.value = data.billNo || '';
    customerName.value = data.customerName || '';
    billStatus.value = data.status || '';

    if (data.details) {
      details.value = data.details;
      details.value.forEach(row => calcRow(row));
    }

    if (data.lrData) {
      try {
        lrData.value = typeof data.lrData === 'string' ? JSON.parse(data.lrData) : data.lrData;
      } catch {
        lrData.value = null;
      }
    }
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

// ===== 保存 =====
const handleSave = async () => {
  saving.value = true;
  try {
    await updateBillDetails({
      billId: billId.value,
      details: details.value,
    });
    ElMessage.success('保存成功');
  } catch (error) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

// ===== 生成LR表 =====
const handleGenerateLr = async () => {
  lrGenerating.value = true;
  try {
    const res = await generateLr(billId.value);
    if (res.success) {
      lrData.value = res.data;
      ElMessage.success('LR表生成成功');
    }
  } catch {
    ElMessage.error('生成LR表失败');
  } finally {
    lrGenerating.value = false;
  }
};

// ===== 提交审核 =====
const handleSubmitAudit = async () => {
  try {
    await ElMessageBox.confirm('确认提交审核吗？提交后工厂审核员将进行审核。', '提交审核', { type: 'info' });
    await submitBillAudit(billId.value);
    ElMessage.success('提交审核成功');
    router.push('/order/bill/my-list');
  } catch {}
};

// ===== ⭐ 退回单行 =====
const handleReturnRow = (row) => {
  if (row.isReturned) {
    ElMessage.warning('该明细已退回');
    return;
  }
  returnTargetRow.value = row;
  returnForm.value = { reason: '', remark: '' };
  returnDialogVisible.value = true;
};

const confirmReturnRow = async () => {
  if (!returnForm.value.reason.trim()) {
    ElMessage.warning('请填写退回原因');
    return;
  }

  returnLoading.value = true;
  try {
    await returnBillItem({
      billId: billId.value,
      detailId: returnTargetRow.value.id,
      reason: returnForm.value.reason,
      remark: returnForm.value.remark,
    });
    ElMessage.success('退回成功');
    returnDialogVisible.value = false;
    returnTargetRow.value.isReturned = true;
    loadData();
  } catch (error) {
    ElMessage.error(error.message || '退回失败');
  } finally {
    returnLoading.value = false;
  }
};

// ===== 时间格式化 =====
const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ===== 返回 =====
const goBack = () => {
  router.back();
};

onMounted(loadData);
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

/* ===== 整体内容区域 ===== */
.content-body {
  background: #fff;
  border-radius: 0 0 8px 8px;
  padding: 20px 24px;
}

/* ===== 分割线 ===== */
.section-divider {
  height: 1px;
  background: #e8ecf1;
  margin: 18px 0;
}

/* ===== 区域标题 ===== */
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 15px;
  color: #1d2129;
  margin-bottom: 14px;
}
.section-subtitle {
  font-weight: 400;
  font-size: 13px;
  color: #909399;
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

/* ===== 表格区域 ===== */
.table-wrapper {
  overflow-x: auto;
}
:deep(.el-table .cell) {
  padding: 2px 4px;
}
:deep(.el-table th) {
  background: #f5f7fa !important;
}
:deep(.el-input-number) {
  width: 100%;
}
:deep(.el-input) {
  width: 100%;
}
:deep(.el-select) {
  width: 100%;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
  padding: 12px 16px;
  background: #fafafa;
  border-radius: 6px;
  margin-top: 12px;
  font-size: 14px;
  flex-wrap: wrap;
}
.table-footer b {
  color: #303133;
}

/* ===== LR表 ===== */
.lr-table-wrapper {
  overflow-x: auto;
}
.lr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.lr-table th {
  background: #f5f7fa;
  padding: 6px 10px;
  border: 1px solid #e8ecf1;
  text-align: center;
  font-weight: 600;
}
.lr-table td {
  padding: 6px 10px;
  border: 1px solid #e8ecf1;
  text-align: center;
}
.lr-table tfoot td {
  background: #fafafa;
  font-weight: 600;
}
.lr-table .sale {
  background: #ffffff;
}
.lr-table .cost {
  background: #f5f7fa;
}
</style>