/* ساخت گزارش چاپی (A4) محاسبات ضریب زلزله */
(function (root) {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function build(res, S, charts) {
    const f = root.CALC.fmt;
    const X = res.dirs.X, Y = res.dirs.Y;
    const e5 = res.edition === 5;
    const p = S.project;
    const now = new Date().toLocaleDateString('fa-IR');

    const stepRows = arr => arr.map((s, i) => `<tr><td class="c">${i + 1}</td><td><b>${esc(s.title)}</b><div class="ref">${esc(s.ref)}</div></td><td class="ex">${root.CALC.mixed(s.expr)}</td><td class="vv">${root.CALC.mixed(s.val)}</td></tr>`).join('');
    const stepTable = (title, arr, cls) => `<h3 class="${cls || ''}">${title}</h3><table class="st"><thead><tr><th>#</th><th>شرح</th><th>رابطه و جایگذاری</th><th>نتیجه</th></tr></thead><tbody>${stepRows(arr)}</tbody></table>`;

    const inputs = e5 ? `
      <tr><td>Ss / S1</td><td class="n">${f(res.Ss, 2)} g / ${f(res.S1, 2)} g</td><td>نوع زمین</td><td class="n">${res.site}${res.special ? ' (طیف ویژه)' : ''}</td></tr>
      <tr><td>گروه اهمیت</td><td>${esc(res.impLabel)}</td><td>ارتفاع H</td><td class="n">${res.H} m</td></tr>` : `
      <tr><td>پهنه خطر</td><td>${esc(res.zoneLabel)} (A = ${res.A})</td><td>نوع زمین</td><td class="n">${res.site}</td></tr>
      <tr><td>گروه اهمیت</td><td>${esc(res.impLabel)}</td><td>ارتفاع H</td><td class="n">${res.H} m</td></tr>`;
    const dirIn = d => {
      const R = res.dirs[d];
      return `<tr><td>امتداد ${d}</td><td colspan="3">${esc(R.sys.label)} — ${esc(R.ttype.label)}${R.Tan ? ` — T تحلیلی = ${f(R.Tan)} s` : ''}${e5 ? ` — ρ = ${R.rho}` : ''}</td></tr>`;
    };

    const sum = [
      ['T طراحی (s)', f(X.T), f(Y.T)],
      e5 ? ['Sa (g)', f(X.Sa, 4), f(Y.Sa, 4)] : ['B', f(X.B, 4), f(Y.B, 4)],
      ['C محاسباتی', f(X.Cc, 4), f(Y.Cc, 4)],
      ['Cmin', f(X.Cmin, 4), f(Y.Cmin, 4)],
      ['ضریب زلزله طراحی', f(X.Ceff, 4), f(Y.Ceff, 4), 1],
      ['توان k', f(X.k), f(Y.k)],
      ['ضریب کنترل تغییرمکان', f(X.Cdrift, 4), f(Y.Cdrift, 4), 1],
      ['k تغییرمکان', f(X.kd), f(Y.kd)],
    ];
    if (e5) sum.push(['Δa مجاز طبقه', f(X.driftLimit, 4) + '·h', f(Y.driftLimit, 4) + '·h']);
    const sumRows = sum.map(r => `<tr class="${r[3] ? 'hl' : ''}"><td>${r[0]}</td><td class="n">${r[1]}</td><td class="n">${r[2]}</td></tr>`).join('');

    const spec = e5 ? `
      <tr><td>SDS</td><td class="n">${f(res.SDS)}</td><td>SD1</td><td class="n">${f(res.SD1)}</td></tr>
      <tr><td>T0 / Ts</td><td class="n">${f(res.T0)} / ${f(res.Ts)} s</td><td>گروه طراحی لرزه‌ای</td><td class="n">SDC-${res.SDC}</td></tr>
      <tr><td>Fvut</td><td class="n">${f(res.Fvut)}·WD</td><td>Ie</td><td class="n">${res.Ie}</td></tr>` : `
      <tr><td>T0 / Ts</td><td class="n">${res.sp.T0} / ${res.sp.Ts} s</td><td>S0 / S</td><td class="n">${res.sp.S0} / ${res.sp.S}</td></tr>
      <tr><td>I</td><td class="n">${res.I}</td><td>Cmin</td><td class="n">${f(res.Cmin, 4)}</td></tr>
      <tr><td>Fv</td><td class="n">${f(res.Fv)}·Wp</td><td></td><td></td></tr>`;

    const notes = res.warn.map(w => `<li class="w">${esc(w)}</li>`).join('') + res.info.map(w => `<li>${esc(w)}</li>`).join('');

    // جدول طیف فشرده (گام 0.1)
    const tbl = res.table.filter(r => Math.abs(r.T * 10 - Math.round(r.T * 10)) < 1e-6);
    const half = Math.ceil(tbl.length / 2);
    const specCols = e5 ? (res.special ? ['T', 'Sa'] : ['T', 'Sa', 'Sav']) : ['T', 'B', 'A·B'];
    const val = r => e5 ? (res.special ? [r.T, r.Sa] : [r.T, r.Sa, r.Sav]) : [r.T, r.B, r.AB];
    const specRows = Array.from({ length: half }, (_, i) => {
      const a = tbl[i], b = tbl[i + half];
      const cells = rr => rr ? val(rr).map((v, j) => `<td class="n">${j ? (+v).toFixed(4) : (+v).toFixed(2)}</td>`).join('') : specCols.map(() => '<td></td>').join('');
      return `<tr>${cells(a)}<td class="gap"></td>${cells(b)}</tr>`;
    }).join('');
    const sh = specCols.map(c => `<th class="n">${c}</th>`).join('');

    return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>گزارش ضریب زلزله</title>
<style>
@font-face { font-family: 'Vazirmatn'; src: url('fonts/Vazirmatn.woff2') format('woff2'); font-weight: 100 900; }
@page { size: A4; margin: 14mm 13mm 16mm; }
* { box-sizing: border-box; }
body { font-family: 'Vazirmatn', Tahoma, sans-serif; color: #111827; font-size: 10.5pt; line-height: 1.55; margin: 0; }
.hdr { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #0b2545; padding-bottom: 8px; margin-bottom: 12px; }
.hdr h1 { font-size: 17pt; margin: 0; color: #0b2545; }
.hdr .sub { color: #475569; font-size: 9.5pt; }
.hdr .meta { text-align: left; font-size: 9pt; color: #475569; }
h2, h3 { page-break-after: avoid; break-after: avoid; }
h2 { font-size: 12.5pt; color: #0b2545; margin: 16px 0 6px; border-right: 4px solid #f59e0b; padding-right: 8px; }
h3 { font-size: 11pt; margin: 12px 0 4px; color: #13315c; }
h3.x { color: #1d4ed8; } h3.y { color: #c2410c; }
table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
td, th { border: 1px solid #d5dbe4; padding: 4px 7px; text-align: right; vertical-align: top; }
th { background: #eef2f7; font-weight: 600; font-size: 9.5pt; }
td.n, th.n { direction: ltr; text-align: left; font-variant-numeric: tabular-nums; }
tr.hl td { background: #fff6dd; font-weight: 700; }
.st td.c { width: 22px; text-align: center; color: #64748b; }
.st .ref { color: #64748b; font-size: 8.5pt; }
.st td.ex { text-align: right; font-size: 9pt; }
.st td.vv { text-align: right; font-weight: 700; color: #0b2545; }
.st td.ex span, .st td.vv span { unicode-bidi: isolate; }
.st tr { page-break-inside: avoid; }
.chart { border: 1px solid #d5dbe4; border-radius: 6px; padding: 6px; margin: 6px 0 10px; text-align: center; page-break-inside: avoid; }
.chart svg { max-width: 100%; height: auto; }
ul.notes { margin: 4px 0; padding-right: 18px; font-size: 9.5pt; } ul.notes li { margin-bottom: 3px; } ul.notes li.w { color: #991b1b; font-weight: 600; }
td.gap { border: 0; width: 14px; }
.foot { margin-top: 14px; font-size: 8.5pt; color: #64748b; border-top: 1px solid #d5dbe4; padding-top: 6px; }
.pb { page-break-before: always; }
.kv td:nth-child(odd) { background: #f8fafc; width: 18%; font-weight: 500; }
</style></head><body>
<div class="hdr"><div><h1>گزارش محاسبه ضریب زلزله</h1>
<div class="sub">بر اساس آیین‌نامه طراحی ساختمان‌ها در برابر زلزله — استاندارد ۲۸۰۰ ، ویرایش ${e5 ? 'پنجم' : 'چهارم'}</div></div>
<div class="meta">${p.name ? `پروژه: <b>${esc(p.name)}</b><br>` : ''}${p.location ? `محل: ${esc(p.location)}<br>` : ''}${p.engineer ? `طراح: ${esc(p.engineer)}<br>` : ''}تاریخ: ${now}</div></div>

<h2>۱. اطلاعات ورودی</h2>
<table class="kv"><tbody>${inputs}${dirIn('X')}${dirIn('Y')}</tbody></table>

<h2>۲. پارامترهای طیف و ساختگاه</h2>
<table class="kv"><tbody>${spec}</tbody></table>

<h2>۳. خلاصه نتایج</h2>
<table><thead><tr><th>پارامتر</th><th class="n">امتداد X</th><th class="n">امتداد Y</th></tr></thead><tbody>${sumRows}</tbody></table>

<div class="pb"></div>
<h2>۴. نمودار طیف</h2>
${charts.map(c => `<div class="chart">${c}</div>`).join('')}

<div class="pb"></div>
<h2>۵. شرح گام‌به‌گام محاسبات</h2>
${stepTable(e5 ? 'پارامترهای ساختگاه، طیف و گروه طراحی' : 'پارامترهای ساختگاه و طیف', res.steps)}
${stepTable('امتداد X', X.steps, 'x')}
${stepTable('امتداد Y', Y.steps, 'y')}

<h2>۶. هشدارها و نکات</h2>
<ul class="notes">${notes || '<li>موردی وجود ندارد.</li>'}
<li>کنترل نامنظمی‌ها، روش تحلیل مجاز (بند ۳-۸)، اثر P-Δ و پیچش اتفاقی خارج از محدوده این گزارش است.</li></ul>

<h2>۷. جدول طیف (گام ۰٫۱ ثانیه)</h2>
<table><thead><tr>${sh}<th class="gap"></th>${sh}</tr></thead><tbody>${specRows}</tbody></table>

<div class="foot">این گزارش با برنامه Seismic 2800 تهیه شده است. بررسی نکات آیین‌نامه و صحت ورودی‌ها بر عهده طراح است.</div>
</body></html>`;
  }

  root.REPORT = { build };
})(window);
