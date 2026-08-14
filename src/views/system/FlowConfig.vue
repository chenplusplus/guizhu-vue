<!-- src/views/system/FlowConfig.vue -->
<template>
  <div class="page-container" v-loading="loading">
    <!-- ===== 页面头部 ===== -->
    <div class="page-header">
      <div class="header-left">
        <h2>⚙️ 流程配置</h2>
        <el-select v-model="currentFlow" @change="loadData" style="width:180px;margin-left:12px;">
          <el-option 
            v-for="item in flowList" 
            :key="item.code" 
            :label="item.name" 
            :value="item.code" 
          />
        </el-select>
        <el-tag :type="flowTagType" size="large">{{ currentFlowLabel }}</el-tag>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="openAddNode">
          <el-icon><Plus /></el-icon> 新增节点
        </el-button>
        <el-button @click="loadData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- ===== 整体内容 ===== -->
    <div class="content-body">
      <!-- 流程概览步骤条 -->
      <div class="flow-overview">
        <div class="flow-steps-bar">
          <div 
            v-for="(node, index) in nodes" 
            :key="node.id"
            class="flow-step-item"
          >
            <div class="step-dot" :style="{ background: index === 0 ? '#409EFF' : '#e8ecf1' }">
              <span class="step-number">{{ index + 1 }}</span>
            </div>
            <div class="step-label">{{ node.node_name }}</div>
            <div class="step-key">{{ node.node_key }}</div>
            <div v-if="index < nodes.length - 1" class="step-line"></div>
          </div>
        </div>
      </div>

      <div class="section-divider"></div>

      <!-- 节点列表 -->
      <div class="table-section">
        <div class="section-title">
          <span>📋 节点列表</span>
          <span class="section-subtitle">共 {{ nodes.length }} 个节点</span>
        </div>

        <el-table :data="nodes" border stripe style="width:100%;">
          <el-table-column prop="sort_order" label="排序" width="60" align="center" />
          <el-table-column prop="node_key" label="节点标识" width="140" />
          <el-table-column prop="node_name" label="节点名称" width="140" />
          <el-table-column prop="node_type" label="类型" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.node_type === 'start' ? 'success' : row.node_type === 'end' ? 'danger' : 'primary'" size="small">
                {{ row.node_type === 'start' ? '开始' : row.node_type === 'end' ? '结束' : '审批' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="流转规则" min-width="200">
            <template #default="{ row }">
              <div class="transitions-tag">
                <el-tag 
                  v-for="(t, idx) in getNodeTransitions(row.node_key)" 
                  :key="idx"
                  :type="t.action_type || 'primary'"
                  size="small"
                  style="margin:2px;"
                >
                  {{ t.action_name }} → {{ t.to_node }}
                </el-tag>
                <span v-if="!getNodeTransitions(row.node_key).length" style="color:#ccc;">无流转</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="角色权限" width="120" align="center">
            <template #default="{ row }">
              <el-button size="small" type="success" @click="openRoleConfig(row)">配置</el-button>
            </template>
          </el-table-column>
          <el-table-column label="字段权限" width="120" align="center">
            <template #default="{ row }">
              <el-button size="small" type="primary" @click="openFieldConfig(row)">配置</el-button>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-button size="small" link type="primary" @click="editNode(row)">编辑</el-button>
              <el-button size="small" link type="danger" @click="deleteNode(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- ===== 新增/编辑节点弹窗 ===== -->
    <el-dialog v-model="nodeDialogVisible" :title="editNodeData.id ? '编辑节点' : '新增节点'" width="500px" destroy-on-close>
      <el-form :model="editNodeData" label-width="80px" ref="nodeFormRef">
        <el-form-item label="节点标识" required>
          <el-input v-model="editNodeData.node_key" placeholder="如: pending" :disabled="!!editNodeData.id" />
        </el-form-item>
        <el-form-item label="节点名称" required>
          <el-input v-model="editNodeData.node_name" placeholder="如: 待客户审核" />
        </el-form-item>
        <el-form-item label="节点类型">
          <el-select v-model="editNodeData.node_type" style="width:100%;">
            <el-option label="开始" value="start" />
            <el-option label="审批" value="approve" />
            <el-option label="结束" value="end" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="editNodeData.sort_order" :min="0" style="width:100%;" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="nodeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveNode" :loading="nodeSaving">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===== 字段权限配置弹窗 ===== -->
    <el-dialog v-model="fieldDialogVisible" :title="'字段权限 - ' + currentNode?.node_name" width="800px" destroy-on-close>
      <div class="field-toolbar">
        <el-button size="small" @click="selectAllFields(true)">全选</el-button>
        <el-button size="small" @click="selectAllFields(false)">取消全选</el-button>
        <span style="margin-left:12px;color:#909399;font-size:13px;">控制每个节点显示哪些字段、是否可编辑</span>
      </div>
      <el-table :data="fieldData" border size="small" style="width:100%;margin-top:10px;">
        <el-table-column prop="field_label" label="字段名" width="110" />
        <el-table-column prop="field_key" label="字段标识" width="140" />
        <el-table-column prop="field_group" label="分组" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.field_group || 'base' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="显示" width="80" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.is_visible" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="可编辑" width="80" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.is_editable" size="small" :disabled="!row.is_visible" />
          </template>
        </el-table-column>
        <el-table-column label="排序" width="80" align="center">
          <el-input-number v-model="row.sort_order" :min="0" size="small" style="width:70px;" />
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="fieldDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveFields" :loading="fieldSaving">保存</el-button>
      </template>
    </el-dialog>

    <!-- ===== 角色权限配置弹窗 ===== -->
    <el-dialog v-model="roleDialogVisible" :title="'角色权限 - ' + currentNode?.node_name" width="550px" destroy-on-close>
      <el-alert title="配置哪些角色可以查看/编辑/审核该节点" type="info" :closable="false" show-icon style="margin-bottom:16px;" />
      <el-table :data="roleData" border size="small" style="width:100%;">
        <el-table-column prop="role_label" label="角色" width="140" />
        <el-table-column label="查看" width="80" align="center">
          <template #default="{ row }">
            <el-checkbox v-model="row.permissions.view" />
          </template>
        </el-table-column>
        <el-table-column label="编辑" width="80" align="center">
          <template #default="{ row }">
            <el-checkbox v-model="row.permissions.edit" />
          </template>
        </el-table-column>
        <el-table-column label="审核" width="80" align="center">
          <template #default="{ row }">
            <el-checkbox v-model="row.permissions.approve" />
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveRoles" :loading="roleSaving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh } from '@element-plus/icons-vue';
import * as flowApi from '@/api/flow';

// ==================== 状态 ====================
const loading = ref(false);
const nodes = ref([]);
const transitions = ref({});
const flowList = ref([]);
const currentFlow = ref('order_flow');

// 节点编辑
const nodeDialogVisible = ref(false);
const nodeSaving = ref(false);
const editNodeData = ref({ id: 0, node_key: '', node_name: '', node_type: 'approve', sort_order: 0 });
const nodeFormRef = ref(null);

// 字段配置
const fieldDialogVisible = ref(false);
const fieldSaving = ref(false);
const fieldData = ref([]);
const currentNode = ref(null);

// 角色配置
const roleDialogVisible = ref(false);
const roleSaving = ref(false);
const roleData = ref([]);

// ==================== 计算属性 ====================
const currentFlowLabel = computed(() => {
  const found = flowList.value.find(f => f.code === currentFlow.value);
  return found?.name || currentFlow.value;
});

const flowTagType = computed(() => {
  const map = { 'order_flow': 'primary', 'bill_flow': 'success', 'lr_flow': 'warning', 'inout_flow': 'info' };
  return map[currentFlow.value] || 'info';
});

// ==================== 方法 ====================
const getNodeTransitions = (nodeKey) => {
  return transitions.value[nodeKey] || [];
};

// ==================== 加载数据 ====================
const loadFlowList = async () => {
  try {
    const res = await flowApi.getFlowDefinitions();
    flowList.value = res.data || [];
    if (flowList.value.length > 0 && !currentFlow.value) {
      currentFlow.value = flowList.value[0].code;
    }
  } catch (error) {
    console.error('加载流程列表失败', error);
    flowList.value = [
      { code: 'order_flow', name: '订单流程' },
      { code: 'bill_flow', name: '账单流程' },
      { code: 'lr_flow', name: 'LR表流程' },
      { code: 'inout_flow', name: '总进总出流程' }
    ];
  }
};

const loadData = async () => {
  if (!currentFlow.value) return;
  loading.value = true;
  try {
    const res = await flowApi.getFlowNodes(currentFlow.value);
    nodes.value = res.data || [];
    
    for (const node of nodes.value) {
      const transRes = await flowApi.getTransitions(currentFlow.value, node.node_key);
      transitions.value[node.node_key] = transRes.data || [];
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

// ==================== 节点操作 ====================
const openAddNode = () => {
  editNodeData.value = { id: 0, node_key: '', node_name: '', node_type: 'approve', sort_order: nodes.value.length * 10 };
  nodeDialogVisible.value = true;
};

const editNode = (row) => {
  editNodeData.value = { ...row };
  nodeDialogVisible.value = true;
};

const handleSaveNode = async () => {
  if (!editNodeData.value.node_key || !editNodeData.value.node_name) {
    ElMessage.warning('请填写完整信息');
    return;
  }
  nodeSaving.value = true;
  try {
    await flowApi.saveNode({ flow_code: currentFlow.value, ...editNodeData.value });
    ElMessage.success('保存成功');
    nodeDialogVisible.value = false;
    loadData();
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    nodeSaving.value = false;
  }
};

const deleteNode = (row) => {
  ElMessageBox.confirm(`确定删除节点「${row.node_name}」吗？`, '提示', { type: 'warning' })
    .then(async () => {
      await flowApi.deleteNode(row.id);
      ElMessage.success('删除成功');
      loadData();
    })
    .catch(() => {});
};

// ==================== 字段权限 ====================
const openFieldConfig = async (row) => {
  currentNode.value = row;
  try {
    const res = await flowApi.getNodeFields(currentFlow.value, row.node_key);
    fieldData.value = res.data || [];
    fieldDialogVisible.value = true;
  } catch (error) {
    ElMessage.error('加载字段配置失败');
  }
};

const selectAllFields = (visible) => {
  fieldData.value.forEach(f => {
    f.is_visible = visible;
    if (!visible) f.is_editable = false;
  });
};

const handleSaveFields = async () => {
  fieldSaving.value = true;
  try {
    await flowApi.updateNodeFields({
      flow_code: currentFlow.value,
      node_key: currentNode.value.node_key,
      fields: fieldData.value
    });
    ElMessage.success('保存成功');
    fieldDialogVisible.value = false;
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    fieldSaving.value = false;
  }
};

// ==================== 角色权限 ====================
const openRoleConfig = async (row) => {
  currentNode.value = row;
  try {
    const res = await flowApi.getNodeRoles(currentFlow.value, row.node_key);
    const allRoles = ['customer', 'customerAudit', 'factoryOrder', 'factoryAudit', 'admin'];
    const existing = res.data || [];
    roleData.value = allRoles.map(role => {
      const found = existing.find(r => r.role_type === role);
      return {
        role_type: role,
        role_label: { 
          customer: '客户', 
          customerAudit: '客户审核', 
          factoryOrder: '工厂业务', 
          factoryAudit: '工厂审核', 
          admin: '管理员' 
        }[role] || role,
        permissions: {
          view: found?.permission_type === 'view' || found?.permission_type === 'edit' || found?.permission_type === 'approve',
          edit: found?.permission_type === 'edit',
          approve: found?.permission_type === 'approve'
        }
      };
    });
    roleDialogVisible.value = true;
  } catch (error) {
    ElMessage.error('加载角色配置失败');
  }
};

const handleSaveRoles = async () => {
  roleSaving.value = true;
  try {
    const permissions = [];
    roleData.value.forEach(r => {
      if (r.permissions.view) permissions.push({ role_type: r.role_type, permission_type: 'view' });
      if (r.permissions.edit) permissions.push({ role_type: r.role_type, permission_type: 'edit' });
      if (r.permissions.approve) permissions.push({ role_type: r.role_type, permission_type: 'approve' });
    });
    await flowApi.updateNodeRoles({
      flow_code: currentFlow.value,
      node_key: currentNode.value.node_key,
      permissions
    });
    ElMessage.success('保存成功');
    roleDialogVisible.value = false;
  } catch (error) {
    ElMessage.error('保存失败');
  } finally {
    roleSaving.value = false;
  }
};

// ==================== 初始化 ====================
onMounted(async () => {
  await loadFlowList();
  await loadData();
});
</script>

<style scoped>
.page-container {
  background: #f5f7fa;
  padding: 16px;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 14px 20px;
  border-radius: 8px 8px 0 0;
  flex-wrap: wrap;
  gap: 10px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.header-left h2 {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
}
.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

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

.flow-overview {
  padding: 10px 0;
}
.flow-steps-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  position: relative;
  padding: 10px 0;
}
.flow-step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
}
.flow-step-item .step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e8ecf1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
  color: #999;
  position: relative;
  z-index: 2;
}
.flow-step-item .step-label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  margin-top: 6px;
  text-align: center;
}
.flow-step-item .step-key {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}
.flow-step-item .step-line {
  position: absolute;
  top: 16px;
  left: calc(50% + 20px);
  right: calc(-50% + 20px);
  height: 2px;
  background: #e8ecf1;
  z-index: 1;
}

.transitions-tag {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

:deep(.el-table .cell) {
  padding: 4px 6px;
}

.field-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 768px) {
  .page-container {
    padding: 8px;
  }
  .content-body {
    padding: 12px 16px;
  }
  .flow-steps-bar {
    overflow-x: auto;
    gap: 20px;
    justify-content: flex-start;
  }
  .flow-step-item {
    flex: 0 0 auto;
    min-width: 80px;
  }
  .flow-step-item .step-line {
    display: none;
  }
}
</style>