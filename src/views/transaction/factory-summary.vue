<template>
  <div class="factory-summary">
    <el-card>
      <template #header>
        <el-space wrap>
          <span>耗材分析</span>
          <el-tag size="small" type="info" effect="plain">材料按克重/卡数 · 费用按金额</el-tag>
          <el-tag size="small" type="success" effect="plain">卖出＝账单出货（仅看）</el-tag>
          <el-tag size="small" type="warning" effect="plain">结余只算克重/卡数，不折钱</el-tag>
          <el-date-picker
            v-model="yearMonth"
            type="month"
            value-format="YYYY-M"
            placeholder="选择月份"
            style="width:130px"
            @change="loadMonthData"
          />
          <el-button :type="isToday ? 'success' : 'default'" @click="loadToday">今天</el-button>
          <el-button type="primary" :loading="loading" @click="loadData">刷新</el-button>
          <el-button type="success" :disabled="!rows.length" @click="exportExcel">下载 Excel</el-button>
        </el-space>
      </template>

      <div v-loading="loading" class="table-wrapper">
        <!-- ⭐ 口径提示：这张表是「金料收发存」，不是利润表 —— 先把最容易混的两件事说清楚 -->
        <el-alert
          class="scope-alert"
          type="info"
          :closable="false"
          show-icon
        >
          <template #title>
            这张表是<b>金料收发存</b>：<b>本期结余</b> = 本期买进折足 − LR出（成本） − 师傅损耗 − 台账出库折足；<b>累计结余</b> = 期初 + 本期结余，<b>只算克重/卡数，不折钱</b>。
            <b>卖出是观察行</b>：账单出货按成色记<b>加耗克重</b>（这件货实际出去多少克 18K / 14K），<b>不参与结余计算</b>；
            <b>LR出是这批货耗掉的料成本，不是卖价</b>，所以「卖出」和「LR出」金额不是一维、不能相减。
            某成色<b>累计结余</b>出现负数并标「缺入库」，说明这一色只有耗料/出库、没有对应的入库记录（多为换料时没录金料入库单）。
          </template>
        </el-alert>

        <table class="matrix-table">
          <thead>
            <tr class="group-row">
              <th rowspan="2" class="dim-col">分类</th>
              <th
                v-for="(g, gi) in groups"
                :key="'g' + gi"
                :colspan="g.count"
                :class="'group-' + g.type"
              >{{ g.label }}</th>
              <th rowspan="2" class="total-col">
                <div class="cat-name">金额合计</div>
                <div class="cat-unit">元</div>
              </th>
            </tr>
            <tr>
              <th v-for="cat in categories" :key="cat" class="cat-col" :class="categoryColorClass(cat)">
                <div class="cat-name">{{ categoryLabel(cat) }}</div>
                <div class="cat-unit">{{ unitOf(cat) ? unitOf(cat) : '元' }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.key" :class="'row-' + row.key">
              <td class="dim-col">
                <div class="dim-label">{{ row.label }}</div>
                <div class="dim-sub">{{ row.sub }}</div>
              </td>
              <td
                v-for="cat in categories"
                :key="cat"
                class="num-col"
                :title="cellTitle(row, cat)"
              >
                <template v-if="hasValue(row.cells && row.cells[cat])">
                  <div
                    v-if="showQty(cat) && row.cells[cat].qty"
                    class="qty"
                    :class="{ neg: row.cells[cat].qty < 0 }"
                  >{{ fmtQty(row.cells[cat].qty, cat) }}</div>
                  <!-- ⭐ 累计结余负数＝这一色只有耗料/出库、没有对应入库（换料单没录）；本期结余为负只是本期只出不进，不标 -->
                  <div
                    v-if="row.key === 'balance' && Number(row.cells[cat].qty) < -0.005"
                    class="lack-tip"
                  >缺入库</div>
                  <div
                    v-if="showFoldQty(row.cells[cat])"
                    class="fold-qty"
                  >折足 {{ fmtQty(row.cells[cat].foldQty, cat) }}</div>
                  <div
                    v-if="row.cells[cat].amount"
                    class="amt"
                    :class="{ neg: row.cells[cat].amount < 0 }"
                  >{{ fmtMoney(row.cells[cat].amount) }}</div>
                </template>
              </td>
              <td class="total-col num-col" :title="totalTitle(row)">
                <div
                  v-if="row.totalAmount"
                  class="amt total-amt"
                  :class="{ neg: row.totalAmount < 0 }"
                >{{ fmtMoney(row.totalAmount) }}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="rows.length && !hasFlow" class="empty-tip">
          本期没有出入库、费用收支、LR 成本行和师傅损耗记录{{ hasBalanceQty ? '，上面的累计结余是当前库存' : '' }}
        </div>

        <div class="legend">
          <div class="legend-title">一、这张表怎么算</div>
          <div class="legend-item"><b>本期结余</b>（本期净变动）= 本期<b>买进折足</b> − <b>LR出</b>（成本） − <b>师傅损耗</b> − <b>台账出库折足</b>，<b>不含期初</b>，只看这一期进出后金少了多少。</div>
          <div class="legend-item"><b>累计结余</b>（期末库存）= <b>期初 + 本期结余</b>，就是这一色现在还剩多少。两条结余都<b>只算克重/卡数，不折成钱</b>（库存金价随行就市，估价只会给出假数）。<b>买进来的才算库存</b>，卖出行只是看数，不进公式。</div>
          <div class="legend-item"><b>买进</b>：来自「进销存 → 金料 / 钻石 / 费用」的台账入库（费用则是支出），金料按<b>实物克重</b>显示，下面小字是折足金。</div>
          <div class="legend-item"><b>卖出（仅看）</b>= <b>账单出货</b> + <b>台账出库</b>。账单出货取账单里每件货的<b>订单金料明细</b>，按<b>成色</b>记<b>加耗克重</b>，小字是折足重；例：bill2611200000 两件 18K 加耗 99 + 80.8 = <b>179.8g</b>、一件 14K 加耗 <b>101g</b>。台账出库＝进销存出库单。费用类的卖出＝费用收入。<b>这一行只用来看「今天出去多少克」，不参与结余</b>——库存扣减已经由「LR出」按折足统一扣了，再扣一遍会重复。</div>

          <div class="legend-title">二、每行数据分别是什么</div>
          <div class="legend-item"><b>卖出</b>：账单出货按成色（取订单金料明细的<b>加耗重</b>）+ 台账出库，归期＝<b>账单最终确认那天</b>（和 LR 同一时点）。<b>金料列只显示数量，不显示金额</b>：账单金额里含钻石、工费、利润，拆不到成色上，硬拆出来只会是假数；费用列的钱来自费用台账。</div>
          <div class="legend-item"><b>LR出</b>：订单成本行（LR 表）里<b>做货耗掉</b>的金料，按成本行的成色扣对应成色库存（18K 出 18K、14K 出 14K）。金额取成本行的<b>金料成本 + 石料成本</b>，是「做这批货用掉多少料、这些料值多少钱」，<b>不是卖给客户的售价</b>，因此和「卖出」行的金额不是同一维度、不能直接相减。成本行的损耗率与订单填的损耗率略有差异时，这一行的折足重和卖出行小字会有零点几克的差，属正常。<br><b>什么时候才算「LR出」</b>：LR 表在<b>账单最终确认</b>时才生成（一张确认的账单一份 LR），所以还在待审核 / 待客户确认的账单，做货耗料不会提前扣库存 —— 这样「LR出」和「卖出」是同一时点、口径同步，不会出现只出没进、成本虚高的假象。</div>
          <div class="legend-item"><b>师傅损耗</b>：工序单（执模 / 镶石 / 抛光）<b>已审核</b>的实际损耗，按工序材质归成色；工序单按实物克重记录，下面小字是折足金，结余按折足扣。</div>
          <div class="legend-item"><b>本期结余 / 累计结余</b>：本期结余＝这一期「买进 − 成本 − 损耗 − 出库」的净变动（看今天/本月金少了多少）；累计结余＝期初再把本期加上（看现在还剩多少）。格子悬停会给出期初和加减过程。</div>
          <div class="legend-item"><b>费用拆分</b>：金料单上的工费记进「工费」列，补口金额 + 补钯金费记进「配件费用」列，料款留在本成色列，金额合计不变。费用类没有库存结余，所以两条结余的费用格留空；钻石成本行暂不区分天然 / 培育，统一计入「天然钻石」。</div>

          <div class="legend-title">三、买黄金换 18K / 14K 要怎么记（换料）</div>
          <div class="legend-item">换料要录一张<b>金料入库单</b>：收到的 18K 记本成色列（正数）、付出去的足金记「黄金」列（负数）、付的工费记「工费」列。例：换 100g 18K，付 75g 足金 + 工费 1200 元 → 18K <b>+100g</b>、黄金 <b>−75g</b>、工费 <b>+¥1200</b>。</div>
          <div class="legend-item"><b>记了这张单，18K 才有「进」</b>：LR 出扣料时扣的是这笔进料，结余才是真实剩余库存；不记就只有出、没有进，结余必然负数。</div>

          <div class="legend-title">四、结余负数 / 成本看着比卖出大，是什么情况</div>
          <div class="legend-item"><b>结余负数</b>（<b>累计结余</b>格里标红「缺入库」）：该成色<b>只有耗料或出库、没有对应入库</b>，库存真的不够了。常见原因是换料没录金料入库单，或 LR 成本行用了这一色但料是从别的成色 / 渠道来的。这是<b>台账不完备的提示，不是系统算错</b>，补录入库单后结余会回正。<br><b>本期结余为负但累计结余为正</b>（不标红）是正常的：这一期只出没进，用的是以前囤的库存，比如今天付了 160.5g 足金换 18K，黄金一栏本期 −160.5，但库存里本来还有存货。</div>
          <div class="legend-item"><b>成本看着比卖出大是正常的</b>：LR出是「本期出货这批货的用料成本」（含陆续下单、分批交付的货），卖出金料列<b>只记克重不记金额</b>（账单金额含钻、工费、利润，拆不到成色上）。想看「卖了多少、成本多少、赚多少」，请看 <b>经营报表 → 月度利润</b>，那张表才是毛利口径。</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { factorySummary } from '@/api/transaction'

const yearMonth = ref(`${new Date().getFullYear()}-${new Date().getMonth() + 1}`)
const rows = ref([])
const categories = ref([])
const selectedDate = ref('')
const loading = ref(false)
const isToday = computed(() => selectedDate.value === formatDate(new Date()))

// 买进 / 卖出 / LR出 / 师傅损耗 都没数，说明这一期没有流水（本期结余、累计结余是算出来的，不参与判断）
const hasFlow = computed(() =>
  rows.value.filter(r => r.key !== 'balance' && r.key !== 'period').some(r => {
    if (Number(r.totalAmount) !== 0) return true
    return Object.values(r.cells || {}).some(c => Number(c.qty) !== 0 || Number(c.amount) !== 0)
  })
)

// 结余有数量 = 当前有库存，空期间提示里要说清楚
const hasBalanceQty = computed(() => {
  const row = rows.value.find(r => r.key === 'balance')
  return !!row && Object.values(row.cells || {}).some(c => Number(c.qty) !== 0)
})

const categoriesMeta = [
  { key: '18k', label: '18K' },
  { key: '14k', label: '14K' },
  { key: '9k', label: '9K' },
  { key: 'PT', label: 'PT' },
  { key: '银', label: '银' },
  { key: '铜', label: '铜' },
  { key: '黄金', label: '黄金' },
  { key: '钢片', label: '钢片' },
  { key: '贝母', label: '贝母' },
  { key: '天然钻石费用', label: '天然钻石' },
  { key: '培育钻石费用', label: '培育钻石' },
  { key: '彩宝费用', label: '彩宝' },
  { key: '倒模费用', label: '倒模费用' },
  { key: '配件费用', label: '配件费用' },
  { key: '房租/水电', label: '房租/水电' },
  { key: '工资', label: '工资' },
  { key: '工具费用', label: '工具费用' },
  { key: '滴胶/电金', label: '滴胶/电金' },
  { key: '伙食费', label: '伙食费' },
  { key: '其他开支', label: '其他开支' },
  { key: '蜡费', label: '蜡费' },
  { key: '工费', label: '工费' },
  { key: '磨石费', label: '磨石费' },
  { key: '维修', label: '维修' },
  { key: '回收', label: '回收' },
  { key: '货款', label: '货款' }
]

// 有数量口径的分类：金 = 克重(g)，钻石 = 卡数(ct)，其他都是费用只有金额
const goldCats = new Set(['18k', '14k', '9k', 'PT', '银', '铜', '黄金', '钢片', '贝母'])
const diamondCats = new Set(['天然钻石费用', '培育钻石费用', '彩宝费用'])

const categoryLabel = (key) => categoriesMeta.find(c => c.key === key)?.label || key
const unitOf = (key) => (goldCats.has(key) ? 'g' : diamondCats.has(key) ? 'ct' : '')
const showQty = (key) => goldCats.has(key) || diamondCats.has(key)

// 表头分组：金料 / 钻石 / 费用 三段，按实际返回顺序动态切分
const groups = computed(() => {
  const out = []
  let cur = null
  for (const c of categories.value) {
    const type = goldCats.has(c) ? 'gold' : diamondCats.has(c) ? 'diamond' : 'fee'
    if (!cur || cur.type !== type) {
      cur = {
        type,
        count: 0,
        label: type === 'gold' ? '金料（克重 g）' : type === 'diamond' ? '钻石（卡数 ct）' : '费用（金额）'
      }
      out.push(cur)
    }
    cur.count += 1
  }
  return out
})

const categoryColorClass = (key) => ({
  '18k': 'material-18k',
  '14k': 'material-14k',
  '9k': 'material-9k',
  PT: 'material-pt',
  银: 'material-silver',
  铜: 'material-copper',
  天然钻石费用: 'material-diamond',
  培育钻石费用: 'material-lab-diamond',
  黄金: 'material-gold',
  钢片: 'material-steel',
  贝母: 'material-shell',
  彩宝费用: 'material-gem'
}[key] || '')

function hasValue(cell) {
  return !!cell && (Number(cell.qty) !== 0 || Number(cell.amount) !== 0)
}

// 买进的金料按实物克重显示；折算率 < 100% 时另给一行折足克重（结余按折足累计）
function showFoldQty(cell) {
  if (!cell || cell.foldQty === null || cell.foldQty === undefined) return false
  return Math.abs(Number(cell.foldQty) - Number(cell.qty)) >= 0.005
}

function fmtMoney(v) {
  const n = Number(v) || 0
  const s = Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (n < 0 ? '−¥' : '¥') + s
}

function fmtQty(v, cat) {
  const n = Number(v) || 0
  const s = Math.abs(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (n < 0 ? '−' : '') + s + ' ' + unitOf(cat)
}

function cellTitle(row, cat) {
  const cell = row.cells && row.cells[cat]
  if (!cell) return ''
  if (row.key === 'balance') {
    const base = `累计结余（期末库存）＝期初 ${fmtQty(cell.openingQty || 0, cat)} + 本期结余；只算数量，不含金额`
    if (Number(cell.qty) < -0.005) {
      return `${base}\n负数＝这一色累计只有耗料/出库、没有对应入库：多为换料没录金料入库单（金料入库单里填本成色克重 + 付出去的足金 + 工费），补录后结余会回正。`
    }
    return base
  }
  if (row.key === 'period') {
    const base = `本期结余＝本期买进折足 − 台账出库 − LR出 − 师傅损耗 = ${fmtQty(cell.qty, cat)}（只算本期变动，不含期初）`
    if (Number(cell.qty) < -0.005) {
      return `${base}\n本期负数＝这一色本期只有耗料/出库、没有对应入库（换料入库单没录）。`
    }
    return base
  }
  if ((row.key === 'in' || row.key === 'loss') && showFoldQty(cell)) {
    return `实物克重 ${fmtQty(cell.qty, cat)}；折足金 ${fmtQty(cell.foldQty, cat)}（结余按折足金累计）`
  }
  if (row.key === 'out') {
    return `卖出＝账单出货（订单金料明细按成色的加耗重）＋台账出库：本格 ${fmtQty(cell.qty, cat)}。仅看，不进结余；库存扣减看「LR出」的折足重。`
      + (showFoldQty(cell) ? `\n折足 ${fmtQty(cell.foldQty, cat)}` : '')
  }
  if (row.key === 'lr') {
    return `LR 成本行做货耗料 ${fmtQty(cell.qty, cat)}，按成色扣库存；金额 ¥${Number(cell.amount || 0).toFixed(2)} 是订单成本价（金料成本），不是卖价，不能和「卖出」比金额。`
  }
  return ''
}

// 合计列鼠标悬停说明：结余的金额口径要讲清楚
function totalTitle(row) {
  if (row.key === 'balance') return '累计结余只算克重/卡数，不折金额'
  if (row.key === 'period') return '本期结余只算本期净变动的克重/卡数，不折金额'
  if (row.key === 'lr') return 'LR 成本行金额合计（金料成本 + 石料成本）'
  return ''
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function loadMonthData() {
  selectedDate.value = ''
  loadData()
}

function loadToday() {
  selectedDate.value = formatDate(new Date())
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    const parts = (yearMonth.value || '').split('-')
    const params = selectedDate.value
      ? { date: selectedDate.value }
      : { year: parseInt(parts[0]), month: parseInt(parts[1]) }
    const res = await factorySummary(params)
    rows.value = res.rows || []
    categories.value = res.categories || categoriesMeta.map(c => c.key)
  } catch (error) {
    console.error('加载全工厂汇总失败:', error)
    ElMessage.error('加载全工厂汇总失败')
  } finally {
    loading.value = false
  }
}

function exportExcel() {
  const header = ['分类', ...categories.value.map(categoryLabel), '金额合计']
  const lines = []
  rows.value.forEach(row => {
    // 数量行
    const qtyLine = [row.label + ' 数量']
    const amtLine = [row.label + ' 金额']
    categories.value.forEach(cat => {
      const cell = (row.cells && row.cells[cat]) || {}
      qtyLine.push(showQty(cat) && cell.qty ? Number(cell.qty) : '')
      amtLine.push(cell.amount ? Number(cell.amount) : '')
    })
    qtyLine.push('')
    amtLine.push(Number(row.totalAmount) || '')
    lines.push(qtyLine)
    // 买进 / 师傅损耗按实物克重，另起一行折足金（结余按折足累计）
    if (row.key === 'in' || row.key === 'loss' || row.key === 'out') {
      const foldLine = [row.label + ' 折足']
      categories.value.forEach(cat => {
        const cell = (row.cells && row.cells[cat]) || {}
        foldLine.push(showQty(cat) && cell.foldQty !== null && cell.foldQty !== undefined ? Number(cell.foldQty) : '')
      })
      foldLine.push('')
      lines.push(foldLine)
    }
    lines.push(amtLine)
  })
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...lines])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '全工厂汇总')
  const period = selectedDate.value || yearMonth.value
  XLSX.writeFile(workbook, `全工厂汇总_${period}.xlsx`)
}

onMounted(loadData)
</script>

<style scoped>
.factory-summary { padding: 16px; }
.table-wrapper { overflow-x: auto; }
.matrix-table { border-collapse: collapse; width: 100%; font-size: 13px; min-width: 2480px; }
.matrix-table th, .matrix-table td { padding: 6px 8px; border: 1px solid #d0d0d0; }

.group-row th { font-size: 12px; font-weight: 600; text-align: center; padding: 4px 8px; }
.group-gold { background: #fdf4d8; color: #8a6a10; }
.group-diamond { background: #eaf1fb; color: #1d5fa8; }
.group-fee { background: #f3f3f5; color: #606266; }

.dim-col { background: #f0f0f0; width: 120px; min-width: 120px; white-space: nowrap; }
.dim-label { font-weight: 600; font-size: 13px; color: #303133; }
.dim-sub { font-size: 11px; color: #909399; margin-top: 2px; }

.cat-col { min-width: 82px; text-align: center; }
.cat-name { font-size: 12px; color: #303133; }
.cat-unit { font-size: 11px; color: #909399; margin-top: 2px; }

.num-col { text-align: right; white-space: nowrap; padding: 5px 8px; }
.num-col .qty { font-size: 11px; color: #909399; line-height: 1.5; }
.num-col .fold-qty { font-size: 10px; color: #b1b3b8; line-height: 1.4; }
.num-col .amt { font-size: 12px; color: #303133; line-height: 1.6; }
.num-col .neg { color: #d64545; font-weight: 600; }

.row-period td { background: #f2f9f5; }
.row-period .dim-label { color: #2f6b4f; }
.row-balance td { background: #f4f9ff; }
.row-balance .dim-label { color: #1d5fa8; }
.row-in td { background: #f7fbf1; }
.row-in .dim-label { color: #4e7a1c; }
.row-out td { background: #fffaf0; }
.row-out .dim-label { color: #9a6516; }
.row-lr td { background: #f8f7ff; }
.row-lr .dim-label { color: #5a4fbf; }
.row-loss td { background: #fdf3f3; }
.row-loss .dim-label { color: #a33b3b; }

.total-col { background: #fffbe6; min-width: 96px; }
.total-amt { font-weight: 600; }

.material-18k { background: #fff1bd; }
.material-14k { background: #fff6d8; }
.material-9k { background: #fffbea; }
.material-pt { background: #eee7f8; }
.material-silver { background: #e9eef2; }
.material-copper { background: #f7e7dc; }
.material-diamond { background: #e6f0ff; }
.material-lab-diamond { background: #e6f7f7; }
.material-gold { background: #ffe69a; }
.material-steel { background: #e5e9ed; }
.material-shell { background: #f5e8f2; }
.material-gem { background: #fbe4ee; }

.empty-tip {
  margin-top: 10px;
  padding: 8px 12px;
  background: #fafafa;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
  color: #909399;
}
.legend { margin-top: 10px; font-size: 12px; color: #606266; line-height: 1.9; }.legend-item b { color: #303133; }
/* ⭐ 口径说明分组标题 + 负数「缺入库」标记 */
.legend-title {
  margin: 10px 0 2px;
  font-size: 12px;
  font-weight: 700;
  color: #303133;
  border-left: 3px solid #409eff;
  padding-left: 6px;
}
.legend-title:first-child { margin-top: 0; }
.scope-alert { margin-bottom: 10px; }
.scope-alert :deep(.el-alert__title) { line-height: 1.7; font-size: 12px; }
.lack-tip {
  margin-top: 1px;
  font-size: 10px;
  line-height: 1.3;
  color: #d64545;
  font-weight: 600;
}
</style>
