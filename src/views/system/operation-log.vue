<!-- src/views/system/operation-log.vue -->
<template>
  <div class="page-container">
    <div class="page-header">
      <h2>📜 操作日志</h2>
      <el-button @click="loadData">
        <el-icon><Refresh /></el-icon> 刷新
      </el-button>
    </div>

    <!-- 搜索 -->
    <div class="search-bar">
      <el-form :inline="true" size="default">
        <el-form-item label="模块">
          <el-select v-model="filter.module" placeholder="全部" clearable style="width:120px;" @change="loadData">
            <el-option label="订单" value="order" />
            <el-option label="账单" value="bill" />
            <el-option label="总进出" value="inout" />
            <el-option label="基础数据" value="basedata" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="filter.operation" placeholder="全部" clearable style="width:120px;" @change="loadData">
            <el-option label="创建" value="create" />
            <el-option label="更新" value="update" />
            <el-option label="删除" value="delete" />
            <el-option label="审核" value="audit" />
            <el-option label="提交" value="submit" />
            <el-option label="确认" value="confirm" />
            <el-option label="退回" value="return" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="filter.operator" placeholder="姓名" clearable style="width:140px;" @clear="loadData" @keyup.enter="loadData" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 时间线展示 -->
    <el-timeline v-if="tableData.length > 0">
      <el-timeline-item
        v-for="item in tableData"
        :key="item.id"
        :timestamp="formatDateTime(item.createdAt)"
        placement="top"
        :type="getTimelineType(item.operationType)"
      >
        <el-card shadow="hover">
          <div class="log-item">
            <div class="log-header">
              <span class="log-operator">{{ item.operatorName || '系统' }}</span>
              <span class="log-action">{{ getOperationText(item.operationType) }}</span>
              <span class="log-module" v-if="item.module">
                <el-tag size="small" type="info">{{ item.module }}</el-tag>
              </span>
              <span class="log-id" v-if="item.recordId">ID: {{ item.recordId }}</span>
            </div>
            <div class="log-body">
              <span class="log-desc">{{ item.description || item.remark }}</span>
            </div>
            <div v-if="item.fieldName" class="log-detail">
              <span class="log-field">字段: {{ item.fieldName }}</span>
              <span class="log-old">原值: {{ item.oldValue || '-' }}</span>
              <span class="log-new">新值: {{ item.newValue || '-' }}</span>
            </div>
            <div v-if="item.remark && item.remark !== item.description" class="log-remark">
              备注: {{ item.remark }}
            </div>
          </div>
        </el-card>
      </el-timeline-item>
    </el-timeline>

    <el-empty v-else description="暂无操作日志" />

    <!-- 分页 -->
    <div style="margin-top:16px;display:flex;justify-content:flex-end;">
      <el-pagination
        v-model:current-page="pagination.current"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="loadData"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import { getOperationLogs } from '@/api/log';

const loading = ref(false);
const tableData = ref([]);

const filter = reactive({
  module: '',
  operation: '',
  operator: '',
});

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const operationTextMap = {
  create: '创建',
  update: '更新',
  delete: '删除',
  audit: '审核',
  submit: '提交',
  confirm: '确认',
  return: '退回',
  upload: '上传',
  download: '下载',
};

const getOperationText = (type) => operationTextMap[type] || type;

const getTimelineType = (type) => {
  const map = {
    create: 'success',
    update: 'primary',
    delete: 'danger',
    audit: 'warning',
    submit: 'primary',
    confirm: 'success',
    return: 'danger',
  };
  return map[type] || 'info';
};

const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      module: filter.module || undefined,
      operationType: filter.operation || undefined,
      operator: filter.operator || undefined,
      page: pagination.current,
      pageSize: pagination.pageSize,
    };
    const res = await getOperationLogs(params);
    tableData.value = res?.data?.items || res?.data || [];
    pagination.total = res?.data?.total || tableData.value.length;
  } catch {
    ElMessage.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const resetFilter = () => {
  filter.module = '';
  filter.operation = '';
  filter.operator = '';
  pagination.current = 1;
  loadData();
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
.search-bar { background: #f5f7fa; padding: 16px 20px; border-radius: 6px; margin-bottom: 16px; }
.search-bar :deep(.el-form-item) { margin-bottom: 0; }

.log-item { padding: 4px 0; }
.log-header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.log-operator { font-weight: 600; color: #303133; }
.log-action { color: #409EFF; font-weight: 500; }
.log-module { margin-left: auto; }
.log-id { font-size: 12px; color: #909399; }
.log-body { margin-top: 4px; }
.log-desc { color: #606266; }
.log-detail { margin-top: 4px; font-size: 13px; color: #909399; display: flex; gap: 16px; flex-wrap: wrap; }
.log-remark { margin-top: 4px; font-size: 13px; color: #E6A23C; }
</style>