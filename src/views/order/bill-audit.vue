<!-- src/views/order/bill-audit.vue -->
<template>
  <div class="page-container">
    <!-- ⭐ 账单审核只有工厂审核员 / 管理员可用（路由已挡，这里再兜一层） -->
    <el-result v-if="!canAudit" icon="warning" title="无权访问"
      sub-title="账单审核仅工厂审核员或管理员可操作" />

    <template v-else>
    <div class="page-header">
      <h2>🔍 账单审核</h2>
      <el-tag type="warning">待审核</el-tag>
    </div>

    <div class="stat-card" style="border-left:4px solid #E6A23C;margin-bottom:16px;padding:12px 16px;background:#fafafa;border-radius:6px;">
      <span style="font-size:22px;font-weight:bold;color:#303133;">{{ tableData.length }}</span>
      <span style="font-size:13px;color:#909399;margin-left:8px;">个待审核账单</span>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading" @row-click="onRowClick"
      :scrollbar-always-on="true"
    >
      <!-- ⭐ 展开行：审核前直接看到这张账单改过什么（标红） -->
      <el-table-column type="expand" width="46">
        <template #default="{ row }">
          <div class="expand-box">
            <BillModifyTrail
              v-if="modifyCounts[row.billId]"
              :bill-id="row.billId"
              compact
            />
            <span v-else class="no-modify">该账单提交审核前没有修改记录</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="billNo" label="账单编号" width="160">
        <template #default="{ row }">
          <el-link type="primary" @click.stop="viewDetail(row.billId)">{{ row.billNo }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="operatorName" label="业务员" width="100" />
      <el-table-column prop="totalAmount" label="总金额" width="120" align="right">
        <template #default="{ row }">¥{{ (row.totalAmount || 0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="totalQuantity" label="总件数" width="70" align="center" />
      <el-table-column prop="orderCount" label="订单数" width="70" align="center" />
      <el-table-column label="修改" width="92" align="center">
        <template #default="{ row }">
          <span v-if="modifyCounts[row.billId]" class="modify-flag">
            改 {{ modifyCounts[row.billId] }} 次
          </span>
          <span v-else class="no-flag">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="提交时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click.stop="viewDetail(row.billId)">查看</el-button>
          <el-button size="small" type="success" @click.stop="handleAudit(row, true)">通过</el-button>
          <el-button size="small" type="danger" @click.stop="handleAudit(row, false)">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && tableData.length === 0" description="暂无待审核账单" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getBillList, auditBill, getBillModifyCounts } from '@/api/bill';
import { useUserStore } from '@/stores/user';
import BillModifyTrail from '@/components/BillModifyTrail.vue';

const router = useRouter();
const userStore = useUserStore();
const canAudit = computed(() => userStore.userType === 'factoryAudit' || userStore.isAdmin);
const loading = ref(false);
const tableData = ref([]);
// billId → 修改次数（>0 时列表红字提示「改 N 次」，展开可看明细）
const modifyCounts = ref({});

const loadData = async () => {
  if (!canAudit.value) return;   // 非审核角色不请求接口
  loading.value = true;
  try {
    const res = await getBillList({ status: 'pending' });
    tableData.value = res?.data || [];
    await loadModifyCounts();
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const loadModifyCounts = async () => {
  const ids = (tableData.value || []).map(r => r.billId).filter(Boolean);
  if (ids.length === 0) { modifyCounts.value = {}; return; }
  try {
    const res = await getBillModifyCounts(ids);
    modifyCounts.value = res?.data || {};
  } catch {
    modifyCounts.value = {};
  }
};

// ⭐ 点行跳详情，但点展开箭头/展开内容时不要跳
const onRowClick = (row, column, event) => {
  const el = event?.target;
  if (el && (el.closest('.el-table__expand-icon') || el.closest('.el-table__expanded-cell'))) return;
  viewDetail(row.billId);
};

const handleAudit = async (row, approved) => {
  try {
    await ElMessageBox.confirm(approved ? '审核通过该账单？' : '驳回该账单？', '确认', { type: approved ? 'info' : 'warning' });
    await auditBill(row.billId, { approved });
    ElMessage.success(approved ? '审核通过' : '已驳回');
    loadData();
  } catch {}
};

const viewDetail = (id) => {
  router.push(`/order/bill/detail/${id}`);
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN', { hour12: false });
};

onMounted(loadData);
</script>

<style scoped>
.page-container { background: #fff; border-radius: 8px; padding: 20px; min-height: 100%; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; font-weight: 600; margin: 0; }
:deep(.el-table .el-table__row) { cursor: pointer; }

/* 修改提示：红字，审核员一眼看到这单被改过 */
.modify-flag {
  color: #F56C6C;
  font-weight: 700;
  font-size: 12px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 10px;
  padding: 1px 8px;
}
.no-flag { color: #c0c4cc; }
.expand-box { padding: 6px 16px 12px; background: #fff; }
.no-modify { color: #909399; font-size: 12px; padding: 8px 4px; display: inline-block; }
</style>