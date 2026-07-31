<template>
  <div class="page-container">
    <h2 style="margin-bottom:16px;">工作台</h2>

    <el-row :gutter="16" class="stat-row">
      <el-col :span="6" v-for="item in stats" :key="item.label">
        <el-card shadow="hover" class="stat-card" :body-style="{ padding: '16px' }">
          <div class="stat-icon" :style="{ background: item.color }">
            <el-icon :size="28"><component :is="item.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ item.value }}</div>
            <div class="stat-label">{{ item.label }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="16">
        <el-card>
          <template #header>
            <span>近7天订单趋势</span>
          </template>
          <div ref="chartRef" style="height:280px;"></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header><span>待办事项</span></template>
          <div v-if="todos.length === 0" style="text-align:center;padding:20px 0;color:#909399;">🎉 暂无待办</div>
          <div v-for="item in todos" :key="item.title" class="todo-item" @click="$router.push(item.path)">
            <el-tag :type="item.type" size="small">{{ item.badge }}</el-tag>
            <span class="todo-title">{{ item.title }}</span>
            <el-icon class="todo-arrow"><ArrowRight /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'

const chartRef = ref(null)
let chartInstance = null

const stats = ref([
  { label: '今日订单', value: 12, icon: 'Document', color: '#409EFF' },
  { label: '待审核', value: 3, icon: 'Clock', color: '#E6A23C' },
  { label: '制作中', value: 5, icon: 'Setting', color: '#67C23A' },
  { label: '本月金额', value: '¥45,678', icon: 'Money', color: '#F56C6C' }
])

const todos = ref([
  { title: '3个订单待审核', path: '/order', badge: '3', type: 'warning' },
  { title: '2个订单制作中', path: '/production', badge: '2', type: 'primary' }
])

onMounted(() => {
  nextTick(() => {
    if (chartRef.value) {
      chartInstance = echarts.init(chartRef.value)
      chartInstance.setOption({
        xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] },
        yAxis: { type: 'value' },
        series: [{ type: 'line', data: [8, 12, 10, 18, 22, 15, 20], smooth: true }]
      })
    }
  })
})
</script>

<style scoped>
.stat-row { margin-bottom: 16px; }
.stat-card { display: flex; align-items: center; }
.stat-card .stat-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; margin-right: 16px; flex-shrink: 0; }
.stat-card .stat-info { flex: 1; }
.stat-card .stat-value { font-size: 24px; font-weight: bold; }
.stat-card .stat-label { color: #909399; font-size: 14px; }
.todo-item { display: flex; align-items: center; padding: 10px 12px; border-radius: 6px; cursor: pointer; gap: 8px; }
.todo-item:hover { background: #f5f7fa; }
.todo-item .todo-title { flex: 1; color: #303133; }
.todo-item .todo-arrow { color: #909399; }
</style>