// src/utils/date.js
// ⭐ 统一「今天」的取法：必须用本地时区，不能用 toISOString()
//    原因：toISOString 是 UTC，凌晨 0:00–8:00（东八区）会退到前一天，
//    导致金价单日期、订单日期被记成「昨天」（2026-11-06 凌晨 2 点填的金价单跑到 11-05）
export const todayStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** 本地时区的「某个 Date → YYYY-MM-DD」 */
export const toDateStr = (d) => (d ? todayStr(new Date(d)) : '');

/**
 * 列表页快捷日期区间
 *   today → [今天, 今天]
 *   month → [本月 1 号, 今天]（默认口径，用户要求列表默认本月而不是全部）
 *   all   → []（不限日期）
 */
export const shortcutRange = (key) => {
  const now = new Date();
  if (key === 'today') {
    const t = todayStr(now);
    return [t, t];
  }
  if (key === 'month') {
    return [todayStr(new Date(now.getFullYear(), now.getMonth(), 1)), todayStr(now)];
  }
  return [];
};

/** 两个区间是否相同（用于手动改日期后自动取消快捷选中） */
export const sameRange = (a = [], b = []) => {
  const x = (a || []).filter(Boolean);
  const y = (b || []).filter(Boolean);
  return x.length === y.length && x.every((v, i) => v === y[i]);
};

