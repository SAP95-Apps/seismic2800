/* سازنده سبک فایل xlsx (بدون کتابخانه): چند برگه، قالب‌بندی، راست‌به‌چپ و نمودار پراکنش */
(function (root) {
  'use strict';
  const enc = new TextEncoder();
  const xe = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

  // ---------- ZIP (روش store) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function zip(files) {
    const parts = [], central = []; let off = 0;
    for (const [name, data] of files) {
      const nb = enc.encode(name), db = typeof data === 'string' ? enc.encode(data) : data, crc = crc32(db);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true); h.setUint32(18, db.length, true);
      h.setUint32(22, db.length, true); h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), nb, db);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
      c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true);
      c.setUint32(20, db.length, true); c.setUint32(24, db.length, true); c.setUint16(28, nb.length, true);
      c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), nb);
      off += 30 + nb.length + db.length;
    }
    const cs = central.reduce((s, a) => s + a.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, cs, true); e.setUint32(16, off, true);
    const all = [...parts, ...central, new Uint8Array(e.buffer)];
    const out = new Uint8Array(all.reduce((s, a) => s + a.length, 0)); let p = 0;
    for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }

  // ---------- سبک‌ها ----------
  // s: t=title, h=header, x=text, b=bold label, n=number 4dp, n3=3dp, n2=2dp, hl=highlighted 4dp, w=wrap, sub=subtitle, hx/hy=colored header
  const STY = { d: 0, t: 1, h: 2, x: 3, b: 4, n: 5, n3: 6, n2: 7, hl: 8, w: 9, sub: 10, hx: 11, hy: 12, warn: 13, info: 14, xc: 15 };
  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="0.0000"/><numFmt numFmtId="165" formatCode="0.000"/><numFmt numFmtId="166" formatCode="0.00"/></numFmts>
<fonts count="7">
<font><sz val="11"/><name val="Tahoma"/><family val="2"/></font>
<font><b/><sz val="15"/><color rgb="FF0B2545"/><name val="Tahoma"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF0B2545"/><name val="Tahoma"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="Tahoma"/><family val="2"/></font>
<font><sz val="10"/><color rgb="FF64748B"/><name val="Tahoma"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Tahoma"/><family val="2"/></font>
<font><sz val="10"/><color rgb="FF7F1D1D"/><name val="Tahoma"/><family val="2"/></font>
</fonts>
<fills count="7">
<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF6"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF3CC"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1D4ED8"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFC2410C"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFEF2F2"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD5DBE4"/></left><right style="thin"><color rgb="FFD5DBE4"/></right><top style="thin"><color rgb="FFD5DBE4"/></top><bottom style="thin"><color rgb="FFD5DBE4"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="16">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="164" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="5" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="6" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const colName = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };

  /* sheet: { name, cols:[widths], rows:[[cell...]], merges:['A1:D1'], chart?, freeze? }
     cell: null | value | { v, s, f } */
  function sheetXml(sh) {
    let rows = '';
    sh.rows.forEach((row, ri) => {
      if (!row) return;
      let cells = '';
      row.forEach((c, ci) => {
        if (c === null || c === undefined) return;
        const o = typeof c === 'object' ? c : { v: c };
        const ref = colName(ci) + (ri + 1);
        const s = STY[o.s || (typeof o.v === 'number' ? 'n' : 'x')];
        if (o.v === '' || o.v === null || o.v === undefined) { cells += `<c r="${ref}" s="${s}"/>`; return; }
        if (typeof o.v === 'number' && isFinite(o.v)) cells += `<c r="${ref}" s="${s}"><v>${o.v}</v></c>`;
        else cells += `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xe(o.v)}</t></is></c>`;
      });
      const ht = sh.heights && sh.heights[ri] ? ` ht="${sh.heights[ri]}" customHeight="1"` : '';
      rows += `<row r="${ri + 1}"${ht}>${cells}</row>`;
    });
    const cols = sh.cols ? `<cols>${sh.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const merges = sh.merges && sh.merges.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
    const pane = sh.freeze ? `<pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze + 1}" activePane="bottomLeft" state="frozen"/>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView rightToLeft="1" workbookViewId="0" zoomScale="100">${pane}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${rows}</sheetData>${merges}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
${sh.chart ? '<drawing r:id="rId1"/>' : ''}</worksheet>`;
  }

  // نمودار پراکنش با خطوط صاف — chart: { title, sheet, x:'A', xFrom, xTo, series:[{name, col, color}], xTitle, yTitle, anchor:{c1,r1,c2,r2} }
  function chartXml(ch) {
    const ref = (col) => `'${ch.sheet.replace(/'/g, "''")}'!$${col}$${ch.from}:$${col}$${ch.to}`;
    const ser = ch.series.map((s, i) => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${xe(s.name)}</c:v></c:tx>
<c:spPr><a:ln w="${s.w || 28575}" cap="rnd"><a:solidFill><a:srgbClr val="${s.color}"/></a:solidFill>${s.dash ? '<a:prstDash val="dash"/>' : ''}<a:round/></a:ln></c:spPr>
<c:marker><c:symbol val="none"/></c:marker><c:xVal><c:numRef><c:f>${ref(ch.x)}</c:f></c:numRef></c:xVal><c:yVal><c:numRef><c:f>${ref(s.col)}</c:f></c:numRef></c:yVal><c:smooth val="0"/></c:ser>`).join('');
    const ax = (id, cross, pos, title, del) => `<c:valAx><c:axId val="${id}"/><c:scaling><c:orientation val="minMax"/>${pos === 'b' && ch.xmax ? `<c:max val="${ch.xmax}"/>` : ''}<c:min val="0"/></c:scaling><c:delete val="${del ? 1 : 0}"/><c:axPos val="${pos}"/>
<c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E5E7EB"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>
<c:title><c:tx><c:rich><a:bodyPr/><a:p><a:pPr><a:defRPr sz="1000" b="0"/></a:pPr><a:r><a:rPr lang="en-US" sz="1000" b="0"/><a:t>${xe(title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
<c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${cross}"/><c:crosses val="autoZero"/><c:crossBetween val="midCat"/></c:valAx>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<c:roundedCorners val="0"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="en-US" sz="1200" b="1"/><a:t>${xe(ch.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/><c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>${ser}<c:axId val="500001"/><c:axId val="500002"/></c:scatterChart>
${ax(500001, 500002, 'b', ch.xTitle)}${ax(500002, 500001, 'l', ch.yTitle)}</c:plotArea>
<c:legend><c:legendPos val="t"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/></c:chart>
<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="D5DBE4"/></a:solidFill></a:ln></c:spPr></c:chartSpace>`;
  }
  function drawingXml(charts) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${charts.map((ch, i) => `<xdr:twoCellAnchor><xdr:from><xdr:col>${ch.anchor.c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${ch.anchor.r1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
<xdr:to><xdr:col>${ch.anchor.c2}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${ch.anchor.r2}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="Chart ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="rId${i + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`).join('')}
</xdr:wsDr>`;
  }

  function build(sheets) {
    const files = [];
    let chartN = 0, drawN = 0;
    const ct = ['<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>', '<Default Extension="xml" ContentType="application/xml"/>',
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'];
    sheets.forEach((sh, i) => {
      files.push([`xl/worksheets/sheet${i + 1}.xml`, sheetXml(Object.assign({}, sh, { chart: sh.charts && sh.charts.length }))]);
      ct.push(`<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
      if (sh.charts && sh.charts.length) {
        drawN++;
        files.push([`xl/worksheets/_rels/sheet${i + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawN}.xml"/></Relationships>`]);
        files.push([`xl/drawings/drawing${drawN}.xml`, drawingXml(sh.charts)]);
        ct.push(`<Override PartName="/xl/drawings/drawing${drawN}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
        const rels = sh.charts.map((ch, k) => {
          chartN++;
          files.push([`xl/charts/chart${chartN}.xml`, chartXml(Object.assign({ sheet: sh.name }, ch))]);
          ct.push(`<Override PartName="/xl/charts/chart${chartN}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
          return `<Relationship Id="rId${k + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${chartN}.xml"/>`;
        }).join('');
        files.push([`xl/drawings/_rels/drawing${drawN}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`]);
      }
    });
    files.unshift(['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${ct.join('')}</Types>`]);
    files.push(['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`]);
    files.push(['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${xe(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`]);
    files.push(['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`]);
    files.push(['xl/styles.xml', STYLES]);
    return zip(files);
  }

  // ---------- محتوای کارپوشه ضریب زلزله ----------
  function workbook(res, S) {
    const e5 = res.edition === 5, X = res.dirs.X, Y = res.dirs.Y, p = S.project;
    const T = (v, s) => ({ v, s });
    const N = (v, s = 'n') => ({ v: (typeof v === 'number' && isFinite(v)) ? +v.toFixed(6) : (v ?? '—'), s: (typeof v === 'number' && isFinite(v)) ? s : 'x' });

    // برگه ۱: خلاصه
    const r1 = [];
    r1.push([T('محاسبه ضریب زلزله — استاندارد ۲۸۰۰ ، ویرایش ' + (e5 ? 'پنجم' : 'چهارم'), 't')]);
    r1.push([T(`تاریخ: ${new Date().toLocaleDateString('fa-IR')}   —   تهیه‌شده با برنامه Seismic 2800`, 'sub')]);
    r1.push([]);
    r1.push([T('مشخصات پروژه', 'h'), T('', 'h')]);
    r1.push([T('نام پروژه', 'b'), T(p.name || '—', 'xc')]);
    r1.push([T('محل احداث', 'b'), T(p.location || '—', 'xc')]);
    r1.push([T('طراح', 'b'), T(p.engineer || '—', 'xc')]);
    r1.push([]);
    r1.push([T('ورودی‌ها و پارامترهای ساختگاه', 'h'), T('', 'h')]);
    if (e5) {
      if (S.v5.loc && S.v5.loc.lat !== '') r1.push([T('مختصات (عرض ، طول)', 'b'), T(`${S.v5.loc.lat} ، ${S.v5.loc.lon}`, 'xc')]);
      [['Ss (g)', res.Ss, 'n3'], ['S1 (g)', res.S1, 'n3'], ['نوع زمین', res.site + (res.special ? ' (طیف ویژه)' : '')], ['Fs', res.Fs, 'n3'], ['F1', res.F1, 'n3'],
       ['SMS (g)', res.SMS], ['SM1 (g)', res.SM1], ['SDS (g)', res.SDS, 'hl'], ['SD1 (g)', res.SD1, 'hl'], ['T0 (s)', res.T0], ['Ts (s)', res.Ts], ['TL (s)', res.TL, 'n2'],
       ['PGA / PGAS (g)', res.PGAS], ['Cv (طیف قائم)', res.Cv, 'n3'], ['گروه اهمیت', res.impLabel], ['ضریب اهمیت Ie', res.Ie, 'n2'], ['گروه طراحی لرزه‌ای', 'SDC-' + res.SDC],
       ['ارتفاع ساختمان H (m)', res.H, 'n2'], ['نیروی قائم Fvut (×WD)', res.Fvut]].concat(res.needFvuc ? [['نیروی قائم Fvuc (×WD)', res.Fvuc]] : [])
        .forEach(([k, v, s]) => r1.push([T(k, 'b'), typeof v === 'number' ? N(v, s || 'n') : T(v ?? '—', 'xc')]));
    } else {
      [['پهنه خطر', res.zoneLabel], ['A', res.A, 'n2'], ['نوع زمین', res.site], ['T0 / Ts (s)', `${res.sp.T0} / ${res.sp.Ts}`], ['S0 / S', `${res.sp.S0} / ${res.sp.S}`],
       ['گروه اهمیت', res.impLabel], ['ضریب اهمیت I', res.I, 'n2'], ['ارتفاع ساختمان H (m)', res.H, 'n2'], ['Cmin = 0.12·A·I', res.Cmin, 'hl'], ['نیروی قائم Fv (×Wp)', res.Fv]]
        .forEach(([k, v, s]) => r1.push([T(k, 'b'), typeof v === 'number' ? N(v, s || 'n') : T(v ?? '—', 'xc')]));
    }
    r1.push([]);
    r1.push([T('نتایج', 'h'), T('امتداد X', 'hx'), T('امتداد Y', 'hy')]);
    const R = (k, a, b, s) => r1.push([T(k, 'b'), typeof a === 'number' ? N(a, s) : T(a, 'xc'), typeof b === 'number' ? N(b, s) : T(b, 'xc')]);
    R('سیستم مقاوم لرزه‌ای', X.sys.label, Y.sys.label);
    R(e5 ? 'Ru' : 'R', X.Ru, Y.Ru, 'n2'); R('Ω0', X.Om, Y.Om, 'n2'); R('Cd', X.Cd, Y.Cd, 'n2');
    R('Hm (m)', X.Hm ?? (e5 ? 'غیرمجاز' : '**'), Y.Hm ?? (e5 ? 'غیرمجاز' : '**'), 'n2');
    R('کنترل ارتفاع', X.hmOK ? 'مجاز ✓' : 'غیرمجاز ✗', Y.hmOK ? 'مجاز ✓' : 'غیرمجاز ✗');
    R('رابطه تجربی T', X.ttype.label, Y.ttype.label);
    R('T تجربی (s)', X.Temp, Y.Temp, 'n3'); R('T تحلیلی (s)', X.Tan ?? '—', Y.Tan ?? '—', 'n3'); R('T طراحی (s)', X.T, Y.T, 'n3');
    if (e5) R('Sa (g)', X.Sa, Y.Sa); else { R('B1', X.B1, Y.B1); R('N', X.N, Y.N); R('B', X.B, Y.B); }
    R('C محاسباتی', X.Cc, Y.Cc); R('Cmin', X.Cmin, Y.Cmin);
    if (e5) R('ضریب نامعینی ρ', X.rho, Y.rho, 'n2');
    R('ضریب زلزله طراحی C', X.Ceff, Y.Ceff, 'hl'); R('توان k', X.k, Y.k, 'n3');
    R('T کنترل تغییرمکان (s)', X.Td, Y.Td, 'n3'); R('ضریب زلزله کنترل تغییرمکان', X.Cdrift, Y.Cdrift, 'hl'); R('k تغییرمکان', X.kd, Y.kd, 'n3');
    if (e5) R('Δa مجاز طبقه (×h)', X.driftLimit, Y.driftLimit);
    R('Scale Factor طیف در ETABS (m/s²)', 9.81 * (e5 ? res.Ie : res.I) / X.Ru, 9.81 * (e5 ? res.Ie : res.I) / Y.Ru);
    const sh1 = { name: 'خلاصه نتایج', cols: [34, 44, 44], rows: r1, merges: ['A1:C1', 'A2:C2', 'B4:C4', 'B5:C5', 'B6:C6', 'B7:C7'] };
    r1.forEach((row, i) => { if (row.length === 2 && i > 7) sh1.merges.push(`B${i + 1}:C${i + 1}`); });

    // برگه ۲: مراحل
    const r2 = [[T('شرح گام‌به‌گام محاسبات', 't')], [], [T('#', 'h'), T('بخش', 'h'), T('شرح', 'h'), T('بند آیین‌نامه', 'h'), T('رابطه و جایگذاری', 'h'), T('نتیجه', 'h')]];
    const add = (sec, arr) => arr.forEach((s, i) => r2.push([{ v: i + 1, s: 'x' }, T(sec, 'x'), T(s.title, 'b'), T(s.ref, 'w'), T(s.expr, 'w'), T(s.val, 'w')]));
    add('ساختگاه و طیف', res.steps); add('امتداد X', X.steps); add('امتداد Y', Y.steps);
    const sh2 = { name: 'مراحل محاسبات', cols: [5, 14, 34, 24, 60, 30], rows: r2, merges: ['A1:F1'], freeze: 3 };

    // برگه ۳: جدول طیف + نمودار
    const t = res.table;
    const head = e5 ? (res.special ? ['T (s)', 'Sa (g)', 'SaM (g)'] : ['T (s)', 'Sa (g)', 'SaM (g)', 'Fmd', 'Sav (g)']) : ['T (s)', 'B1', 'N', 'B', 'A·B'];
    const r3 = [[T(e5 ? 'جدول طیف طرح استاندارد' : 'جدول ضریب بازتاب', 't')], [], head.map(h => T(h, 'h'))];
    t.forEach(r => r3.push((e5 ? [r.T, r.Sa, r.SaM].concat(res.special ? [] : [r.Fmd, r.Sav]) : [r.T, r.B1, r.N, r.B, r.AB]).map((v, j) => N(v, j === 0 ? 'n2' : 'n'))));
    const from = 4, to = 3 + t.length, nc = head.length;
    const charts = e5 ? [
      { title: 'Design spectrum Sa (g)', x: 'A', from, to, xmax: S.spec.tmax, xTitle: 'T (s)', yTitle: 'Sa (g)', anchor: { c1: nc + 1, r1: 2, c2: nc + 11, r2: 24 },
        series: [{ name: 'Sa', col: 'B', color: '0B2545' }, { name: 'SaM = 1.5Sa', col: 'C', color: '94A3B8', dash: true, w: 19050 }] },
    ].concat(res.special ? [] : [{ title: 'Vertical spectrum Sav (g)', x: 'A', from, to, xmax: S.spec.tmax, xTitle: 'Tv (s)', yTitle: 'Sav (g)', anchor: { c1: nc + 1, r1: 26, c2: nc + 11, r2: 46 },
      series: [{ name: 'Sav', col: 'E', color: '0F766E' }] }]) : [
      { title: 'B and A·B', x: 'A', from, to, xmax: S.spec.tmax, xTitle: 'T (s)', yTitle: 'B , A·B', anchor: { c1: nc + 1, r1: 2, c2: nc + 11, r2: 24 },
        series: [{ name: 'B', col: 'D', color: '0B2545' }, { name: 'A·B', col: 'E', color: '0F766E' }] }];
    const sh3 = { name: 'جدول طیف', cols: head.map(() => 12), rows: r3, merges: [`A1:${colName(nc - 1)}1`], freeze: 3, charts };

    // برگه ۴: هشدارها
    const r4 = [[T('هشدارها و نکات', 't')], []];
    if (!res.warn.length) r4.push([T('هیچ مغایرتی با محدودیت‌های جدول سیستم‌ها و ارتفاع مجاز یافت نشد.', 'info')]);
    res.warn.forEach(w => r4.push([T('⚠ ' + w, 'warn')]));
    res.info.forEach(w => r4.push([T('ℹ ' + w, 'info')]));
    r4.push([T('ℹ کنترل نامنظمی‌ها، روش تحلیل مجاز (بند ۳-۸)، اثر P-Δ و پیچش اتفاقی خارج از محدوده این محاسبات است.', 'info')]);
    const sh4 = { name: 'هشدارها', cols: [120], rows: r4, merges: [], heights: r4.map((r, i) => i > 1 ? 34 : null) };

    return build([sh1, sh2, sh3, sh4]);
  }

  root.XLSX = { build, workbook };
})(typeof window !== 'undefined' ? window : globalThis);
