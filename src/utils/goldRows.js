// src/utils/goldRows.js
// 一件货多成色：把一条明细展开成 N 行显示（每种成色一行）。
//
// 用法：
//   const displayRows = computed(() => expandGoldDetails(details.value));
//   el-table 上加 :span-method="goldSpanMethod"
//   金料相关列加 class-name="gi-col"，单元格取 row.__gi（当前成色那一段）
//
// 非金料列（序号/品名/件数/钻石/工费/应收…）自动纵向合并，不会重复显示。

/**
 * @param {Array} list 原始明细
 * @param {Object} opts { itemsKey, minRows }
 * @returns {Array} 展开后的显示行，带 __gi / __gspan / __gfirst / __gidx
 */
export function expandGoldDetails(list, opts = {}) {
  const itemsKey = opts.itemsKey || 'goldItems';
  const rows = [];
  (list || []).forEach((d, i) => {
    const items = (d[itemsKey] || []).filter(x => Number(x.netWeight) > 0);
    if (items.length <= 1) {
      rows.push({
        ...d,
        __gid: i,
        __gi: items[0] || null,
        __gspan: 1,
        __gfirst: true,
        __gidx: 0
      });
      return;
    }
    items.forEach((it, j) => {
      rows.push({
        ...d,
        __gid: i,
        __gi: it,
        __gspan: items.length,
        __gfirst: j === 0,
        __gidx: j
      });
    });
  });
  return rows;
}

/** 非金料列纵向合并；金料列（class 含 gi-col）各自一行 */
export function goldSpanMethod({ row, column }) {
  const cls = column?.className || '';
  if (typeof cls === 'string' && cls.split(/\s+/).includes('gi-col')) {
    return { rowspan: 1, colspan: 1 };
  }
  if (row && row.__gspan > 1) {
    if (row.__gfirst) return { rowspan: row.__gspan, colspan: 1 };
    return { rowspan: 0, colspan: 0 };
  }
  return { rowspan: 1, colspan: 1 };
}

/** 多成色标签：'18K金+9K金'，单色为空 */
export function goldLabelOf(row) {
  if (!row) return '';
  if (row.purityLabel) return row.purityLabel;
  const items = (row.goldItems || []).filter(x => Number(x.netWeight) > 0);
  if (items.length > 1) {
    return [...new Set(items.map(x => x.purityName).filter(Boolean))].join('+');
  }
  return '';
}

/** 是否多成色 */
export function isMultiGold(row) {
  return (row?.goldItems || []).filter(x => Number(x.netWeight) > 0).length > 1;
}
