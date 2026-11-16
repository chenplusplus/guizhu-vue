// src/utils/color.js
// 成色归一：订单/LR 里的成色写法不统一（18K / 18K金 / Au755 / 足金 / 银 / 银950 / 银930），
// 汇总表统一归并到成色字典的 7 种 + 铜，避免「成色对不上」导致数据看起来没有。

export const COLOR_BASE = ['足金999', '足金990', '18K金', '14K金', '9K金', 'PT', '银950', '铜'];

const COLOR_ALIAS = {
  // 足金
  足金: '足金999', 千足金: '足金999', AU999: '足金999', 999: '足金999', 9999: '足金999',
  '24K': '足金999', '24K金': '足金999',
  足金990: '足金990', 990: '足金990',
  // K 金
  '18K': '18K金', AU750: '18K金', AU755: '18K金', 750: '18K金',
  '14K': '14K金', AU585: '14K金', 585: '14K金',
  '9K': '9K金', AU375: '9K金', 375: '9K金',
  // 铂金
  PT950: 'PT', PT900: 'PT', 铂金: 'PT', 白金: 'PT',
  // 银（老数据里的「银930」统一归到 银950）
  银: '银950', 白银: '银950', S925: '银950', AG925: '银950', 925: '银950', 银930: '银950',
  // 铜
  铜: '铜', 黄铜: '铜',
  // 历史数据把「颜色」写进了成色列，统一归到 K 金颜色，避免成色表多出「白色/黄色/玫瑰金」
  白色: 'K白', 白: 'K白',
  黄色: 'K黄', 黄: 'K黄',
  玫瑰金: 'K红', 红色: 'K红', 红: 'K红'
};

// 是否足金成色（足金999 / 千足金 / 黄金 / 24K …）
// 进销存金料用：足金入库一般是给钱；非足金才是配件，要走「付足料」
export const isPureGold = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s) return false;
  return /足金|千足金|万足金|足赤|黄金/i.test(s) || /^24K/i.test(s) || /^AU999/i.test(s) || /^999/.test(s);
};

export const normalizeColor = (raw) => {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const up = s.toUpperCase().replace(/\s+/g, '');
  const hit = COLOR_BASE.find((c) => c.toUpperCase() === up);
  if (hit) return hit;
  return COLOR_ALIAS[up] || COLOR_ALIAS[s] || s;
};

// ============================================================
// 成色 → 颜色 联动（下单页与各订单列表共用）
// 规则：
//   K金类（足金 / 18K / 14K / 9K …）→ 颜色可选 K黄 / K红 / K白
//   银类（银950 / 银930 / S925 …）   → 颜色固定为 银950
//   PT（铂金）                        → 颜色固定为 PT
// ============================================================

/** 成色是否属于 K 金（可选 K黄/K红/K白） */
export const isKGoldPurity = (label) => {
  const s = String(label ?? '').trim().toUpperCase();
  if (!s) return true;              // 未选成色时不禁用颜色
  if (s.includes('银') || s.includes('S925') || s.includes('AG')) return false;
  if (s.includes('PT') || s.includes('铂')) return false;
  return s.includes('K') || s.includes('足金') || s.includes('金');
};

/** 非 K 金成色对应的固定颜色；K金返回 ''（保持用户选择） */
export const autoColorByPurity = (label) => {
  const s = String(label ?? '').trim();
  if (!s) return '';
  if (!isKGoldPurity(s)) {
    const n = normalizeColor(s);
    return n;                       // 银 → 银950，PT → PT
  }
  return '';
};

/**
 * 列表展示颜色：优先 gemColor，历史单据 gemColor 为空时按成色兜底
 * @param {{gemColor?:string, color?:string, purity?:string}} row
 */
export const resolveGemColor = (row) => {
  if (!row) return '';
  const direct = String(row.gemColor ?? '').trim();
  // 历史数据里有裸写的「红 / 黄 / 白」，统一显示为 K红 / K黄 / K白
  // 也有写成小写「k黄」的，一并归一成大写的 K黄
  if (direct) {
    const d = ['红', '黄', '白'].includes(direct) ? 'K' + direct : direct;
    return /^k[黄白红]$/.test(d) ? 'K' + d.slice(1) : d;
  }
  const purity = String(row.color ?? row.purity ?? '').trim();
  return autoColorByPurity(purity) || '';
};
