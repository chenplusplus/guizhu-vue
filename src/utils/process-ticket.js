// src/utils/process-ticket.js
// 工序结算小票（A5 横向 210×148mm）打印
//   - 一张小票 = 一个师傅 + 一段期间 + 若干单据明细
//   - 单页最多 12 行明细，超出自动续页并重复表头
//   - 不依赖 Element Plus，新开窗口 document.write 后直接打印

export const TICKET_COMPANY = '贵族珠宝';
export const TICKET_FOOTER = '电话 0755-8883088　地址：深圳市罗湖区布心工业区 7 栋 1 楼（微信同号）';

/** 单页明细行数（A5 横向 148mm 高，去掉抬头/结算/签名后约 12 行） */
export const TICKET_PAGE_ROWS = 9;

const TITLE = { ZM: '执模结算单', PG: '抛光结算单', XS: '镶石结算单' };
const RATE_TEXT = { ZM: '2.5%', PG: '1%', XS: '2%' };

// 列宽合计 198mm（A5 横向 210 - 左右各 6mm 页边距）
const COLUMNS = {
  ZM: [
    { key: 'date', label: '日期', w: 16, align: 'c' },
    { key: 'product', label: '品名', w: 26, align: 'c' },
    { key: 'content', label: '内容', w: 18, align: 'c' },
    { key: 'material', label: '成色', w: 14, align: 'c' },
    { key: 'send', label: '发出g', w: 18, align: 'r', digits: 3 },
    { key: 'recycle', label: '回收g', w: 18, align: 'r', digits: 3 },
    { key: 'water', label: '水口g', w: 16, align: 'r', digits: 3 },
    { key: 'loss', label: '损耗g', w: 16, align: 'r', digits: 3 },
    { key: 'std', label: '标准95%', w: 18, align: 'r', digits: 3 },
    { key: 'over', label: '超耗g', w: 16, align: 'r', digits: 3 },
    { key: 'fee', label: '工费', w: 22, align: 'r', digits: 2 }
  ],
  PG: [
    { key: 'date', label: '日期', w: 16, align: 'c' },
    { key: 'product', label: '品名', w: 24, align: 'c' },
    { key: 'content', label: '内容', w: 18, align: 'c' },
    { key: 'material', label: '成色', w: 14, align: 'c' },
    { key: 'send', label: '发出g', w: 18, align: 'r', digits: 3 },
    { key: 'water', label: '水口g', w: 18, align: 'r', digits: 3 },
    { key: 'recycle', label: '回收g', w: 18, align: 'r', digits: 3 },
    { key: 'loss', label: '损耗g', w: 16, align: 'r', digits: 3 },
    { key: 'std', label: '标准95%', w: 18, align: 'r', digits: 3 },
    { key: 'over', label: '超耗g', w: 16, align: 'r', digits: 3 },
    { key: 'fee', label: '工费', w: 22, align: 'r', digits: 2 }
  ],
  XS: [
    { key: 'date', label: '日期', w: 16, align: 'c' },
    { key: 'product', label: '品名', w: 26, align: 'c' },
    { key: 'content', label: '类型', w: 16, align: 'c' },
    { key: 'material', label: '成色', w: 14, align: 'c' },
    { key: 'send', label: '发出g', w: 18, align: 'r', digits: 3 },
    { key: 'recycle', label: '回收g', w: 18, align: 'r', digits: 3 },
    { key: 'stone', label: '石数ct', w: 16, align: 'r', digits: 2 },
    { key: 'loss', label: '损耗g', w: 16, align: 'r', digits: 3 },
    { key: 'std', label: '标准95%', w: 18, align: 'r', digits: 3 },
    { key: 'over', label: '超耗g', w: 16, align: 'r', digits: 3 },
    { key: 'fee', label: '工费', w: 24, align: 'r', digits: 2 }
  ]
};

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n3 = (v) => Number(v || 0).toFixed(3);
const n2 = (v) => Number(v || 0).toFixed(2);
const md = (d) => (d ? String(d).slice(5, 10) : '—');

/** 单据号取后 8 位，够师傅对单又不占宽度 */
const shortNo = (no) => (no ? String(no).slice(-8) : '');

function cellText(col, row) {
  switch (col.key) {
    case 'product': return row.productName || row.content || '—';
    case 'content': return row.content || row.subProcess || '—';
    case 'material': return row.materialName || '—';
    case 'send': return n3(row.sendWeightG);
    case 'recycle': return n3(row.recycleWeightG);
    case 'water': return n3(row.residueWaterG);
    case 'loss': return n3(row.actualLossG);
    case 'std': return n3(row.standardLossG);
    case 'over': return Number(row.overLossG) > 0 ? '+' + n3(row.overLossG) : '—';
    case 'fee': return n2(row.laborFee);
    case 'stone': return n2(row.stoneCt);
    default: return '';
  }
}

function sumRows(rows) {
  const s = {
    send: 0, recycle: 0, water: 0, loss: 0, std: 0, over: 0, fee: 0,
    should: 0, actual: 0
  };
  rows.forEach((r) => {
    s.send += Number(r.sendWeightG || 0);
    s.recycle += Number(r.recycleWeightG || 0);
    s.water += Number(r.residueWaterG || 0);
    s.loss += Number(r.actualLossG || 0);
    s.std += Number(r.standardLossG || 0);
    s.over += Number(r.overLossG || 0);
    s.fee += Number(r.laborFee || 0);
    s.should += Number(r.shouldRecycleG || 0);
    s.actual += Number(r.actualRecycleG || 0);
  });
  return s;
}

function renderTable(mainProcess, rows, sum, multiPage) {
  const cols = COLUMNS[mainProcess] || COLUMNS.ZM;
  const head = cols.map((c) => `<th style="width:${c.w}mm">${esc(c.label)}</th>`).join('');
  const body = rows.map((r) => {
    const tds = cols.map((c) => {
      const isDate = c.key === 'date';
      const over = c.key === 'over' && Number(r.overLossG) > 0;
      const cls = [c.align === 'r' ? 'r' : 'c', over ? 'over' : ''].join(' ').trim();
      const text = isDate ? md(r.businessDate) : cellText(c, r);
      const sub = isDate && r.receiptNo ? `<i>${esc(shortNo(r.receiptNo))}</i>` : '';
      return `<td class="${cls}">${esc(text)}${sub}</td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');

  const sumCells = cols.map((c) => {
    if (c.key === 'date') return `<td class="c">${multiPage ? '本页合计' : '合计'}</td>`;
    if (c.key === 'product') return `<td class="c">${rows.length} 行</td>`;
    if (c.key === 'content' || c.key === 'material') return `<td class="c">—</td>`;
    if (c.key === 'over') return `<td class="r ${sum.over > 0 ? 'over' : ''}">${sum.over > 0 ? '+' + n3(sum.over) : '—'}</td>`;
    const v = sum[c.key] ?? 0;
    return `<td class="r">${c.digits === 2 ? n2(v) : n3(v)}</td>`;
  }).join('');

  return `<table>
    <colgroup>${cols.map((c) => `<col style="width:${c.w}mm">`).join('')}</colgroup>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}
      <tr class="sum">${sumCells}</tr>
    </tbody>
  </table>`;
}

function renderSettle(mainProcess, sum, prevUnreturnedG, isLast, multiPage) {
  const debt = Number(prevUnreturnedG || 0) + sum.should - sum.actual;
  // 负数 = 师傅多交的金，标出来免得被误读成欠款
  const g = (v) => {
    const n = Number(v || 0);
    if (Math.abs(n) < 0.0005) return `<b>0.000 g</b>`;
    return n < 0
      ? `<b>${n3(Math.abs(n))} g<em class="credit">多交</em></b>`
      : `<b>${n3(n)} g</b>`;
  };
  return `<div class="settle">
    <div class="cells">
      <div class="cell"><span>发出 / 回收</span><b>${n3(sum.send)} / ${n3(sum.recycle)} g</b></div>
      <div class="cell"><span>水口 / 损耗</span><b>${n3(sum.water)} / ${n3(sum.loss)} g</b></div>
      <div class="cell"><span>标准95% / 超耗</span><b>${n3(sum.std)} / <em class="${sum.over > 0 ? 'over' : ''}">${sum.over > 0 ? n3(sum.over) : '0.000'}</em> g</b></div>
      <div class="cell"><span>上单累计欠料</span>${g(prevUnreturnedG)}</div>
      <div class="cell"><span>累计欠料（含本单）</span>${g(debt)}</div>
      <div class="cell"><span>应回 / 已回</span><b>${n3(sum.should)} / ${n3(sum.actual)} g</b></div>
    </div>
    <div class="pay">
      ${isLast
        ? `<span>${multiPage ? '全单应付' : '本单应付'}</span>
           <b>¥ ${n2(sum.fee)}</b>
           <i>工费合计 ${n2(sum.fee)}${sum.over > 0 ? `　超耗 ${n3(sum.over)}g 另核` : ''}</i>`
        : `<span>接下页</span><b class="cont">↓</b><i>金额合计见末页</i>`}
    </div>
  </div>`;
}

function renderTicket(ctx) {
  const { mainProcess, masterName, rows, allRows, sum, totalSum, prevUnreturnedG, pageIdx, pageCount, printedBy, printedAt } = ctx;
  const begin = rows[0]?.businessDate || '';
  const end = rows[rows.length - 1]?.businessDate || '';
  const period = begin === end ? md(begin) : `${md(begin)} ~ ${md(end)}`;
  const rate = RATE_TEXT[mainProcess] || '';
  const nos = allRows.map((r) => r.receiptNo).filter(Boolean);
  const noText = nos.length === 1 ? nos[0] : `${nos[0] || ''} 等 ${nos.length} 单`;
  const materials = [...new Set(allRows.map((r) => r.materialName).filter(Boolean))].join(' / ') || '—';
  const title = (TITLE[mainProcess] || '工序结算单') + (pageCount > 1 && pageIdx > 0 ? '（续页）' : '');

  return `<div class="tk">
    <div class="hd">
      <span>${esc(TICKET_COMPANY)}</span>
      <span>No. ${esc(noText)}</span>
    </div>
    <div class="title">${esc(title)}</div>
    <div class="info">
      <span>师傅：<b>${esc(masterName)}</b></span>
      <span>期间：${esc(period)}</span>
      <span>成色：${esc(materials)}</span>
      <span class="grow"></span>
      <span>打印：${esc(printedAt)}　制单：${esc(printedBy)}</span>
    </div>
    ${renderTable(mainProcess, rows, sum, pageCount > 1)}
    ${renderSettle(mainProcess, totalSum || sum, prevUnreturnedG, pageIdx === pageCount - 1, pageCount > 1)}
    <div class="note">标准损耗按 ${esc(rate)} 计（表中为 95% 折算值），超出部分按当日金价从工费扣除；水口、余料须随货交回，未交回按损耗计。签收后 3 日内提出异议有效。</div>
    <div class="sign">
      <span>发货人：____________</span>
      <span>师傅签收：____________</span>
      <span class="grow"></span>
      <span>第 ${pageIdx + 1} 页 / 共 ${pageCount} 页</span>
    </div>
    <div class="foot">${esc(TICKET_FOOTER)}</div>
  </div>`;
}

/**
 * 生成打印用 HTML
 * @param {object} opt
 * @param {'ZM'|'PG'|'XS'} opt.mainProcess
 * @param {Array<{masterName:string, rows:Array, prevUnreturnedG:number}>} opt.groups 按师傅分组
 * @param {string} [opt.printedBy]
 */
export function buildProcessTicketHtml({ mainProcess, groups, printedBy = '' }) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const printedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // 先把所有页排出来，才能写「第 X 页 / 共 Y 页」
  const pages = [];
  (groups || []).forEach((g) => {
    const rows = [...(g.rows || [])].sort((a, b) => String(a.businessDate).localeCompare(String(b.businessDate)));
    if (!rows.length) return;
    const chunks = [];
    for (let i = 0; i < rows.length; i += TICKET_PAGE_ROWS) {
      chunks.push(rows.slice(i, i + TICKET_PAGE_ROWS));
    }
    const totalSum = sumRows(rows);
    chunks.forEach((chunk, ci) => {
      pages.push({
        mainProcess,
        masterName: g.masterName || '未填师傅',
        rows: chunk,
        allRows: rows,
        sum: sumRows(chunk),
        totalSum,
        prevUnreturnedG: Number(g.prevUnreturnedG || 0),
        pageIdx: ci,
        pageCount: chunks.length
      });
    });
  });

  const body = pages.map((p) => renderTicket({ ...p, printedBy, printedAt })).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${esc(TITLE[mainProcess] || '工序结算单')}</title>
<style>
  @page { size: A5 landscape; margin: 6mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: "Microsoft YaHei", "SimHei", "PingFang SC", sans-serif;
    font-size: 8.5pt; color: #000;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .tk { width: 198mm; padding: 0; page-break-after: always; }
  .tk:last-child { page-break-after: auto; }
  .hd { display: flex; justify-content: space-between; font-size: 8pt; color: #333; }
  .title { text-align: center; font-size: 13pt; font-weight: 700; letter-spacing: 1.5mm; margin: 0.3mm 0 1.2mm; }
  .info { display: flex; align-items: baseline; gap: 6mm; font-size: 8.5pt; margin-bottom: 1mm; }
  .info .grow { flex: 1; }
  .info b { font-weight: 700; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 0.35mm solid #000; padding: 0.45mm 1mm; font-size: 8.5pt; line-height: 1.18; overflow: hidden; }
  th { background: #ececec; font-weight: 700; text-align: center; }
  td.c { text-align: center; }
  td.r { text-align: right; }
  td i { display: block; font-style: normal; font-size: 7pt; color: #666; }
  tr.sum td { background: #f2f2f2; font-weight: 700; }
  .over { color: #c00; font-weight: 700; }
  .credit { font-style: normal; font-size: 7pt; color: #0a7d3a; margin-left: 1mm; }
  .settle .pay b.cont { font-size: 14pt; color: #999; }
  .settle { display: flex; margin-top: 1.5mm; border: 0.35mm solid #000; }
  .settle .cells { flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; }
  .settle .cell { padding: 0.8mm 2mm; border-right: 0.2mm solid #999; border-bottom: 0.2mm solid #999; }
  .settle .cell:nth-child(3n) { border-right: none; }
  .settle .cell:nth-child(n+4) { border-bottom: none; }
  .settle .cell span { display: block; font-size: 7.5pt; color: #555; }
  .settle .cell b { font-size: 9pt; font-weight: 700; }
  .settle .cell em { font-style: normal; }
  .settle .pay { width: 50mm; border-left: 0.35mm solid #000; padding: 1mm 2mm; text-align: center; }
  .settle .pay span { display: block; font-size: 7.5pt; color: #555; }
  .settle .pay b { display: block; font-size: 15pt; font-weight: 700; line-height: 1.2; margin: 0.5mm 0; }
  .settle .pay i { font-style: normal; font-size: 7pt; color: #555; }
  .note { margin-top: 1.2mm; font-size: 7.5pt; color: #444; }
  .sign { display: flex; align-items: baseline; gap: 10mm; margin-top: 2mm; padding-top: 1.2mm; border-top: 0.2mm solid #999; font-size: 8.5pt; }
  .sign .grow { flex: 1; }
  .foot { margin-top: 1mm; text-align: center; font-size: 7pt; color: #777; }
  @media screen {
    body { background: #f0f0f0; padding: 10mm; }
    .tk { width: 210mm; background: #fff; margin: 0 auto 8mm; padding: 6mm; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

/** 新开窗口打印 */
export function printHtml(html, title = '工序结算单') {
  const w = window.open('', '_blank', 'width=1100,height=800');
  if (!w) {
    return false;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    try { w.print(); } catch (e) { /* 用户已关闭窗口 */ }
  }, 350);
  return true;
}

/** 日期减一天，返回 YYYY-MM-DD */
export function shiftDate(dateStr, days) {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
