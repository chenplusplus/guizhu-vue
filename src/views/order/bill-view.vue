<template>
  <div class="today-out-bill-container">
    <!-- 筛选区域，样式完全对齐 bill-detail.vue -->
    <el-card shadow="never">
      <el-form :model="queryForm" inline>
        <el-form-item label="客户">
          <el-input v-model="queryForm.customerName" placeholder="客户名称" clearable />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="queryForm.billDate"
            type="date"
            placeholder="选择日期"
            value-format="yyyy-MM-dd"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="el-icon-search" @click="loadData">查询</el-button>
          <el-button icon="el-icon-refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="mt10">
      <div class="table-toolbar">
        <div class="title">今日出货汇总</div>
        <div>
          <el-button type="success" icon="el-icon-download" @click="handleExport">导出</el-button>
        </div>
      </div>

      <el-table
        :data="tableData"
        border
        stripe
        v-loading="loading"
        style="width:100%"
        :cell-style="{padding:'8px 4px'}"
      >
        <!-- 【重点】表头列顺序、字段全部对照图片，字段来源 bill‑detail.vue -->
        <el-table-column label="客户名称" prop="customerName" min-width="140" />
        <el-table-column label="单据编号" prop="billNo" min-width="130" />
        <el-table-column label="出货日期" prop="billDate" width="110" />
        <el-table-column label="货品汇总" prop="goodsSummary" min-width="180" />
        <el-table-column label="总数量" prop="totalQty" width="100" align="right" />
        <el-table-column label="总重量" prop="totalWeight" width="100" align="right" />
        <el-table-column label="总金额" prop="totalAmount" width="120" align="right" />
        <el-table-column label="操作" width="120" align="center">
          <template #default="scope">
            <el-button type="text" size="small" @click="goDetail(scope.row)">查看明细</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="mt10"
        :total="total"
        v-model:current-page="queryForm.pageIndex"
        v-model:page-size="queryForm.pageSize"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadData"
        @current-change="loadData"
      />
    </el-card>
  </div>
</template>

<script>
// ======================
// 注意：这里import、api请求方法，直接复制 bill‑detail.vue 的 import，不要自己写接口
// import { getBillDetailList } from '@/api/xxx'
export default {
  name: 'TodayOutBill',
  data() {
    return {
      loading: false,
      total: 0,
      queryForm: {
        pageIndex: 1,
        pageSize: 20,
        customerName: '',
        billDate: ''
      },
      tableData: []
    }
  },
  created() {
    // 默认查询今日，和业务保持一致
    const d = new Date()
    this.queryForm.billDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        // ========== 这里调用你 bill‑detail.vue 一模一样的接口，拿到原始明细列表 ==========
        // const res = await getBillDetailList(this.queryForm)
        // const rawList = res.records

        // ---------------- 模拟原始数据，实际项目删掉，使用接口返回rawList ----------------
        const rawList = []

        // ✅核心逻辑：按【客户+单据号】分组汇总（参考 bill‑detail 的字段）
        const groupMap = {}
        rawList.forEach(item => {
          const key = `${item.customerName}_${item.billNo}`
          if (!groupMap[key]) {
            groupMap[key] = {
              customerName: item.customerName,
              billNo: item.billNo,
              billDate: item.billDate,
              goodsList: [],
              totalQty: 0,
              totalWeight: 0,
              totalAmount: 0,
              originBill: item
            }
          }
          const g = groupMap[key]
          g.goodsList.push(item.goodsName)
          g.totalQty += Number(item.qty || 0)
          g.totalWeight += Number(item.weight || 0)
          g.totalAmount += Number(item.amount || 0)
        })

        // 转为表格数组，货品简单拼接展示
        this.tableData = Object.values(groupMap).map(r=>{
          return {
            ...r,
            goodsSummary: r.goodsList.join('；')
          }
        })
        this.total = this.tableData.length
      } catch (err) {
        console.error(err)
      } finally {
        this.loading = false
      }
    },
    resetQuery() {
      this.queryForm = {
        pageIndex:1,
        pageSize:20,
        customerName:'',
        billDate:''
      }
      this.loadData()
    },
    goDetail(row) {
      // 跳转到原 bill‑detail 页面，带上单据号查看原始明细
      this.$router.push({
        name:'BillDetail',
        query:{ billNo: row.billNo }
      })
    },
    handleExport() {
      
    }
  }
}
</script>

<style scoped>
.today-out-bill-container{
  padding:12px;
}
.mt10{
  margin-top:10px;
}
.table-toolbar{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:12px;
}
.title{
  font-size:16px;
  font-weight:500;
}
</style>
