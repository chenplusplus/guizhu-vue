<template>
  <div class="page-container">
    <div class="page-header">
      <h2>基础资料</h2>
    </div>

    <el-tabs v-model="activeTab">
      <!-- 金价 -->
      <el-tab-pane label="金价管理" name="gold">
        <el-table :data="goldData" border stripe>
          <el-table-column prop="purity" label="成色" width="150" />
          <el-table-column prop="price" label="单价" width="200">
            <template #default="{ row }">
              ¥{{ row.price.toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top:12px;color:#909399;font-size:13px;">
          💡 金价数据从后端读取
        </div>
      </el-tab-pane>

      <!-- 产品库 -->
      <el-tab-pane label="产品库" name="product">
        <el-table :data="productData" border stripe>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="productName" label="产品名称" />
        </el-table>
      </el-tab-pane>

      <!-- 颜色 -->
      <el-tab-pane label="颜色管理" name="color">
        <div style="padding:12px 0;">
          <el-tag v-for="c in colorData" :key="c" size="large" style="margin:4px;">
            {{ c }}
          </el-tag>
        </div>
      </el-tab-pane>

      <!-- 损耗率 -->
      <el-tab-pane label="损耗率" name="loss">
        <div style="padding:12px 0;">
          <el-tag v-for="r in lossData" :key="r" type="warning" size="large" style="margin:4px;">
            {{ r }}
          </el-tag>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { dictApi } from '@/api/dict'

const activeTab = ref('gold')
const goldData = ref([])
const productData = ref([])
const colorData = ref([])
const lossData = ref([])

const loadData = async () => {
  try {
    const [gold, product, color, loss] = await Promise.all([
      dictApi.goldPrice(),
      dictApi.products(),
      dictApi.colors(),
      dictApi.lossRates()
    ])
    goldData.value = gold
    productData.value = product
    colorData.value = color
    lossData.value = loss
  } catch (error) {
    console.error('加载基础资料失败', error)
  }
}

onMounted(loadData)
</script>