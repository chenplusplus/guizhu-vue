// 进销存（金 / 钻石 / 资金）原始下拉选项
// 录入页用固定清单（可输入新值），列表搜索用 固定清单 + 历史值

// 金：进出内容
export const GOLD_CONTENT_OPTIONS = [
  '倒模货',
  '扣头片',
  'CNC 半成品',
  '链子',
  '回收货',
  '成品货'
]

// 钻石：进出内容（自由文本为主，历史值多为「X月采购 / X月领用」）
export const DIAMOND_CONTENT_OPTIONS = ['VVS', 'VS', 'i1', 'i2', 'i3']

// 钻石：级别（净度等级）—— 2026-11-13 起「钻石类型」改名「钻石级别」，存的就是这套
export const DIAMOND_GRADE_OPTIONS = ['VVS', 'VS', 'SI1', 'SI2', 'I1', 'I2', 'I3']

// 钻石：材质（与「钻石级别」并存，材质是独立字段）
export const DIAMOND_MATERIAL_OPTIONS = [
  '天然钻',
  '培育钻',
  '彩宝',
  '异形钻',
  '培育彩宝',
  '合成彩宝'
]

// 资金：支付方式
export const PAYMENT_METHOD_OPTIONS = ['银行卡', '支付宝', '微信', '现货', 'USD']

// 资金：资金分类（费用入 / 费用出 共用）
export const EXPENSE_CATEGORY_OPTIONS = [
  { value: '倒模费用', label: '倒模费用' },
  { value: '配件费用', label: '配件费用' },
  { value: '房租水电', label: '房租/水电' },
  { value: '工资', label: '工资' },
  { value: '工具费用', label: '工具费用' },
  { value: '滴胶电金', label: '滴胶/电金' },
  { value: '彩宝费用', label: '彩宝费用' },
  { value: '伙食费', label: '伙食费' },
  { value: '其他开支', label: '其他开支' },
  { value: '蜡费', label: '蜡费' },
  { value: '磨石费', label: '磨石费' },
  { value: '维修', label: '维修' },
  { value: '回收', label: '回收' },
  { value: '货款', label: '货款' },
  { value: '抵扣款项', label: '抵扣款项' }
]

/** 固定选项在前，历史值补充在后（去重、去空） */
export const mergeOptions = (presets = [], history = []) => {
  const out = [...presets]
  const seen = new Set(presets.map(x => String(x).trim().toLowerCase()))
  for (const h of history || []) {
    const v = String(h ?? '').trim()
    if (!v) continue
    if (seen.has(v.toLowerCase())) continue
    seen.add(v.toLowerCase())
    out.push(v)
  }
  return out
}
