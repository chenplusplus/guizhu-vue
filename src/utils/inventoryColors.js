// 盘点/汇总类页面的物料配色（金按成色由深到浅，钻石水光，费用蓝绿）
// 用法：:row-class-name="materialRowClass"  + 本文件里的 .mat-* 样式

// ---------- 金：按成色由深到浅（足金最黄，成色越低越淡） ----------
const GOLD_TONE = [
  { cls: 'mat-gold-999', label: '足金(最浓黄)' },   // 足金999 / 足金990 / 黄色 / 足金
  { cls: 'mat-gold-18k', label: '18K金' },
  { cls: 'mat-gold-14k', label: '14K金' },
  { cls: 'mat-gold-9k', label: '9K金及以下' },
  { cls: 'mat-gold-other', label: '其他金(玫瑰金/白色等)' }
];

// 成色关键字 → 梯度序号（数字越小越黄）
export function goldToneIndex(color) {
  const c = String(color || '').trim();
  if (!c) return -1;
  if (/足金|999|990|黄金|^黄/.test(c)) return 0;      // 最黄
  if (/玫瑰金/.test(c)) return 1;
  if (/18\s*K/i.test(c)) return 1;
  if (/白色|白K/i.test(c)) return 2;
  if (/14\s*K/i.test(c)) return 2;
  if (/22\s*K/i.test(c)) return 3;
  if (/9\s*K/i.test(c)) return 3;
  if (/PT|铂/i.test(c)) return 4;
  if (/银/i.test(c)) return 5;
  if (/铜/i.test(c)) return 6;
  return 2;
}

// ---------- 材料表行 class ----------
export function materialRowClass({ row }) {
  const c = String(row?.color || '');
  // 钻石类（金刚石/莫桑等）走闪亮样式
  if (/钻|莫桑|ZR|锆石/i.test(c) && !/金/.test(c)) return 'mat-diamond';
  const i = goldToneIndex(c);
  if (i === -1) return '';
  if (i === 4) return 'mat-pt';
  if (i === 5) return 'mat-silver';
  if (i === 6) return 'mat-copper';
  return GOLD_TONE[i].cls;
}

// ---------- 利润表行 class（按项目类型） ----------
export function profitRowClass({ row }) {
  const label = String(row?.label || '');
  if (/钻石/.test(label)) return 'mat-diamond';
  if (/金利润/.test(label)) return 'mat-gold-999';
  if (/镶石/.test(label)) return 'mat-fee-blue';
  if (/工费|费用/.test(label)) return 'mat-fee-green';
  if (/总利润|应收/.test(label)) return 'mat-total';
  return '';
}

export { GOLD_TONE };
