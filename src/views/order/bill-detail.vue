<!-- src/views/order/bill-detail.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack">
          <el-icon><ArrowLeft /></el-icon> 返回
        </el-button>
        <h2>📄 出货单详情</h2>
        <el-tag :type="getStatusType(billData?.status)" size="large">
          {{ getStatusText(billData?.status) }}
        </el-tag>
        <el-tag type="primary" size="large">{{ billData?.billNo }}</el-tag>
      </div>
      <div class="header-right">
        <template v-if="userStore.isFactoryAudit && billData?.status === 'pending'">
          <el-button type="success" @click="handleAudit(true)" :loading="auditing">
            <el-icon><Select /></el-icon> 审核通过
          </el-button>
          <el-button type="danger" @click="handleAudit(false)" :loading="auditing">
            <el-icon><Close /></el-icon> 驳回
          </el-button>
        </template>
        <template v-if="userStore.isCustomer && billData?.status === 'approved'">
          <el-button type="success" @click="handleConfirm" :loading="confirming">
            <el-icon><Check /></el-icon> 确认账单
          </el-button>
          <el-button type="danger" @click="openReturnDialog">
            <el-icon><RefreshLeft /></el-icon> 退回
          </el-button>
        </template>
       <el-button type="primary" plain @click="handleExport">
        <el-icon><Download /></el-icon> 导出
      </el-button>
      </div>
    </div>

    <!-- ===== 整体内容区域 ===== -->
    <div class="content-body">
      <!-- ===== 账单信息 ===== -->
      <div class="info-section">
        <el-row :gutter="16">
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">账单编号：</span><span class="value">{{ billData?.billNo || '-' }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">客户：</span><span class="value">{{ billData?.customerName || '-' }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">成色：</span><span class="value">{{ billData?.color || 'Au755' }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">币种：</span><span class="value">RMB</span></div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">出货日期：</span><span class="value">{{ formatDate(billData?.billDate) }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">总金额：</span>
              <el-tooltip placement="top" effect="dark">
                <template #content>
                  <div style="font-size:13px;line-height:1.8;">
                    计算公式：足金料 + 主石金额 + 副石金额 + 工费 + 包装费 + 证书费 + 邮费 + 版费<br>
                    足金料 = 净重 × 损耗 × 金价
                  </div>
                </template>
                <span class="value" style="color:#E6A23C;font-weight:bold;font-size:18px;cursor:help;border-bottom:1px dashed #E6A23C;">
                  ¥{{ (billData?.totalAmount || 0).toFixed(2) }}
                </span>
              </el-tooltip>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">总件数：</span><span class="value">{{ billData?.totalQuantity || 0 }}</span></div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="info-item"><span class="label">状态：</span>
              <el-tag :type="getStatusType(billData?.status)" size="small">
                {{ getStatusText(billData?.status) }}
              </el-tag>
            </div>
          </el-col>
        </el-row>
        <el-row v-if="billData?.remark" style="margin-top:8px;">
          <el-col :span="24">
            <div class="info-item"><span class="label">备注：</span><span class="value">{{ billData?.remark }}</span></div>
          </el-col>
        </el-row>
      </div>

      <!-- ===== 分割线 ===== -->
      <div class="section-divider"></div>

      <!-- ===== 出货明细表格 ===== -->
      <div class="table-section">
        <div class="section-title">
          <span>📋 出货明细表</span>
          <span class="section-subtitle">共 {{ billData?.details?.length || 0 }} 行 ｜ 合计件数：{{ billData?.totalQuantity || 0 }}</span>
        </div>

        <div class="table-wrapper">
          <el-table 
            :data="billData?.details || []" 
            border 
            stripe 
            size="small"
            style="width:100%;"
            max-height="600"
          >
            <el-table-column prop="seqNo" label="序号" width="55" align="center" />
            <el-table-column prop="orderNo" label="订单号" width="120" fixed>
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
            <el-table-column prop="color" label="颜色" width="70" align="center" />
            <el-table-column prop="quantity" label="件数" width="60" align="center" />
            <el-table-column prop="size" label="手寸/长度" width="90" align="center">
              <template #default="{ row }">{{ row.size || '-' }}</template>
            </el-table-column>
            <el-table-column prop="totalWeight" label="总重" width="80" align="right">
              <template #default="{ row }">{{ row.totalWeight || '-' }}</template>
            </el-table-column>
            <el-table-column prop="netWeight" label="净重" width="80" align="right">
              <template #default="{ row }">{{ row.netWeight || '-' }}</template>
            </el-table-column>
            <el-table-column prop="lossRate" label="损耗" width="70" align="right">
              <template #default="{ row }">{{ row.lossRate || '-' }}</template>
            </el-table-column>
            <el-table-column prop="addLossWeight" label="加耗重" width="85" align="right">
              <template #default="{ row }">{{ row.addLossWeight || '-' }}</template>
            </el-table-column>
            <el-table-column prop="goldPrice" label="金价" width="80" align="right">
              <template #default="{ row }">{{ row.goldPrice || '-' }}</template>
            </el-table-column>
            <el-table-column prop="goldMaterialFee" label="足金料" width="90" align="right">
              <template #default="{ row }">{{ row.goldMaterialFee || '-' }}</template>
            </el-table-column>

            <!-- 主石 -->
            <el-table-column label="主石" align="center">
              <el-table-column prop="mainStoneQty" label="粒数" width="55" align="center">
                <template #default="{ row }">{{ row.mainStoneQty || 0 }}</template>
              </el-table-column>
              <el-table-column prop="mainStoneWeight" label="石重(ct)" width="85" align="right">
                <template #default="{ row }">{{ row.mainStoneWeight || '-' }}</template>
              </el-table-column>
              <el-table-column prop="mainStonePrice" label="单价(元)" width="85" align="right">
                <template #default="{ row }">{{ row.mainStonePrice || '-' }}</template>
              </el-table-column>
              <el-table-column prop="mainStoneAmount" label="金额(元)" width="95" align="right">
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
              <el-table-column prop="subStonePrice" label="单价(元)" width="85" align="right">
                <template #default="{ row }">{{ row.subStonePrice || '-' }}</template>
              </el-table-column>
              <el-table-column prop="subStoneAmount" label="金额(元)" width="95" align="right">
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
            <el-table-column label="退回" width="55" align="center" fixed="right">
              <template #default="{ row }">
                <el-tag v-if="row.isReturned" type="danger" size="small">已退</el-tag>
                <span v-else style="color:#ccc;">-</span>
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
          <span style="color:#E6A23C;font-size:16px;">
            应收合计：<b>¥{{ (billData?.totalAmount || 0).toFixed(2) }}</b>
          </span>
        </div>
      </div>

      <!-- ===== 分隔线 ===== -->
      <div class="section-divider"></div>

      <!-- ===== 汇总区（来料/来款）- 两行四列 ===== -->
      <div class="summary-section">
        <div class="section-title"><span>📊 汇总</span></div>

        <!-- 第一行 -->
        <el-row :gutter="16">
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">上单欠足料：</span>
              <span class="value">{{ (billData?.lastDebtMaterial || 0).toFixed(3) }}g</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">本单应收足料：</span>
              <span class="value" style="color:#E6A23C;font-weight:bold;">
                {{ (billData?.currentMaterial || 0).toFixed(3) }}g
              </span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">来足料重：</span>
              <span v-if="canEditPayment" class="value">
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
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">累欠足金料：</span>
              <span class="value" :style="{ 
                color: (billData?.totalDebtMaterial || 0) > 0 ? '#F56C6C' : '#67C23A', 
                fontWeight: 'bold' 
              }">
                {{ (billData?.totalDebtMaterial || 0).toFixed(3) }}g
              </span>
            </div>
          </el-col>
        </el-row>

        <!-- 第二行 -->
        <el-row :gutter="16" style="margin-top:8px;">
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">上单欠款：</span>
              <span class="value">¥{{ (billData?.lastDebtMoney || 0).toFixed(2) }}</span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">本单应收款：</span>
              <span class="value" style="color:#E6A23C;font-weight:bold;">
                ¥{{ (billData?.currentMoney || 0).toFixed(2) }}
              </span>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="summary-item">
              <span class="label">来款金额：</span>
              <span v-if="canEditPayment" class="value">
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
              <span class="label">累计欠款：</span>
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

      <!-- ===== 分隔线 ===== -->
      <div class="section-divider"></div>

      <!-- ===== 底部固定内容 ===== -->
      <div class="footer-section">
        <div class="footer-notice">
          <p>注：为了保证您的利益，请将以上产品送当地部门检测，如发现成色不足等问题，请立即与我司联系，未经质检部门检测而进行销售，发生一切纠纷后果与我司无关，谢谢合作!</p>
        </div>
        
        <div class="footer-signature">
          <span>制单：____________________</span>
          <span>复核：____________________</span>
          <span>客户签名：____________________</span>
        </div>
        
        <div class="footer-remark">
          <p><b>备注：</b>请自觉按照拿货量，及时安排货款。谢谢!</p>
        </div>
      </div>

      <!-- ===== 分隔线 ===== -->
      <div class="section-divider"></div>

      <!-- ===== 流程日志 ===== -->
      <div class="log-section">
        <div class="section-title"><span>📜 流程日志</span></div>
        <FlowLog :bill-id="billId" />
      </div>
    </div>

    <!-- ===== 退回弹窗（客户退回整个账单） ===== -->
    <el-dialog v-model="returnDialogVisible" title="退回账单" width="600px" destroy-on-close>
      <el-alert title="选择要退回的明细，并填写退回原因" type="warning" :closable="false" show-icon style="margin-bottom:16px;" />
      <el-table
        :data="billData?.details || []"
        border
        stripe
        @selection-change="handleReturnSelection"
        max-height="300"
        size="small"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="seqNo" label="序号" width="55" align="center" />
        <el-table-column prop="productName" label="品名" min-width="120" />
        <el-table-column prop="totalAmount" label="金额" width="110" align="right">
          <template #default="{ row }">¥{{ (row.totalAmount || 0).toFixed(2) }}</template>
        </el-table-column>
      </el-table>
      <el-form style="margin-top:16px;">
        <el-form-item label="退回原因" required>
          <el-input v-model="returnForm.reason" type="textarea" :rows="3" placeholder="请填写退回原因" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="returnForm.remark" type="textarea" :rows="2" placeholder="可选备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="returnDialogVisible = false">取消</el-button>
        <el-button
          type="danger"
          @click="confirmReturn"
          :loading="returning"
          :disabled="returnSelected.length === 0 || !returnForm.reason"
        >
          确认退回 ({{ returnSelected.length }})
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Check, Close, Select, RefreshLeft, Printer } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getBillDetail, auditBill, confirmBill, returnBill, updatePayment ,exportBill} from '@/api/bill';
import FlowLog from '@/components/FlowLog.vue';
import { Download } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const billId = computed(() => Number(route.params.id));

const loading = ref(false);
const auditing = ref(false);
const confirming = ref(false);
const returning = ref(false);
const billData = ref(null);
const returnDialogVisible = ref(false);
const returnSelected = ref([]);
const returnForm = ref({ reason: '', remark: '' });

// ===== 汇总计算 =====
const totalWeightSum = computed(() => {
  return (billData.value?.details || []).reduce((sum, d) => sum + (d.totalWeight || 0), 0);
});

const netWeightSum = computed(() => {
  return (billData.value?.details || []).reduce((sum, d) => sum + (d.netWeight || 0), 0);
});

const goldMaterialSum = computed(() => {
  return (billData.value?.details || []).reduce((sum, d) => sum + (d.goldMaterialFee || 0), 0);
});

const laborFeeSum = computed(() => {
  return (billData.value?.details || []).reduce((sum, d) => sum + (d.laborFee || 0), 0);
});

// ===== 权限判断 =====
const canEditPayment = computed(() => {
  const userType = userStore.userType;
  return (userType === 'factoryOrder' || userType === 'admin') && billData.value?.status === 'pending';
});

// ===== 状态映射 =====
const statusMap = {
  pending: { text: '待审核', type: 'warning' },
  approved: { text: '已通过', type: 'success' },
  rejected: { text: '已驳回', type: 'danger' },
  returned: { text: '已退回', type: 'danger' },
  confirmed: { text: '已确认', type: 'success' },
};
const getStatusText = (s) => statusMap[s]?.text || s || '-';
const getStatusType = (s) => statusMap[s]?.type || 'info';

// ============================================================
// 加载数据
// ============================================================
const loadData = async () => {
  if (!billId.value) return;
  loading.value = true;
  try {
    const res = await getBillDetail(billId.value);
    billData.value = res?.data;
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
// 审核
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
// 客户确认
// ============================================================
const handleConfirm = async () => {
  try {
    await ElMessageBox.confirm('确认账单无误吗？确认后订单将完成。', '确认账单', { type: 'info' });
  } catch { return; }

  confirming.value = true;
  try {
    await confirmBill(billId.value);
    ElMessage.success('账单已确认');
    loadData();
  } catch {
    ElMessage.error('确认失败');
  } finally {
    confirming.value = false;
  }
};

// ============================================================
// 退回
// ============================================================
const openReturnDialog = () => {
  returnSelected.value = [];
  returnForm.value = { reason: '', remark: '' };
  returnDialogVisible.value = true;
};

const handleReturnSelection = (selection) => {
  returnSelected.value = selection;
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
    await returnBill(billId.value, {
      reason: returnForm.value.reason,
      remark: returnForm.value.remark,
      detailIds: returnSelected.value.map(d => d.id),
    });
    ElMessage.success('账单已退回');
    returnDialogVisible.value = false;
    loadData();
  } catch {
    ElMessage.error('退回失败');
  } finally {
    returning.value = false;
  }
};

// ============================================================
// 查看订单
// ============================================================
const viewOrder = (id) => {
  router.push(`/order/detail/${id}`);
};

// ============================================================
// 打印
// ============================================================
const handleExport = async () => {
  try {
    const res = await exportBill(billId.value);
    // 创建下载链接
    const blob = new Blob([res.data], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `出货明细_${billData.value?.billNo || billId.value}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (el)  {
    ElMessage.error(el);
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

/* ===== 汇总区域 ===== */
.summary-item {
  padding: 4px 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
.summary-item .label {
  color: #909399;
  font-size: 14px;
  min-width: 95px;
}
.summary-item .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}
.summary-item :deep(.el-input-number) {
  width: 100px;
}

/* ===== 底部固定内容 ===== */
.footer-section {
  margin-top: 4px;
}

.footer-notice {
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
  padding: 10px 14px;
  background: #fafafa;
  border-radius: 4px;
}
.footer-notice p {
  margin: 0;
}

.footer-signature {
  display: flex;
  justify-content: space-between;
  padding: 14px 0 10px 0;
  font-size: 14px;
  color: #303133;
}
.footer-signature span {
  flex: 1;
}

.footer-remark {
  font-size: 13px;
  color: #606266;
  padding-top: 8px;
  border-top: 1px dashed #e8ecf1;
}
.footer-remark p {
  margin: 0;
}
.footer-remark b {
  color: #E6A23C;
}

/* ===== 日志区域 ===== */
.log-section :deep(.el-timeline) {
  padding-left: 8px;
}

/* ===== 打印样式 ===== */
@media print {
  .page-header .header-right,
  .page-header .el-button {
    display: none !important;
  }
  .page-container {
    background: #fff !important;
    padding: 0 !important;
  }
  .content-body {
    padding: 12px !important;
  }
  .section-divider {
    margin: 12px 0 !important;
  }
}
</style>