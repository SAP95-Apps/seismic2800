/* رابط کاربری برنامه ضریب زلزله ۲۸۰۰ */
(function () {
  'use strict';
  const { V5, V4 } = window.CODE;
  const f = window.CALC.fmt;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const native = window.native || null;

  // ---------------- وضعیت ----------------
  const DEFAULT = () => ({
    app: 'seismic2800', ver: 1, edition: 5,
    project: { name: '', location: '', engineer: '', date: new Date().toLocaleDateString('fa-IR') },
    spec: { tmax: 6, dt: 0.02 },
    v5: { loc: { prov: '', city: '', lat: '', lon: '', fromMap: false }, site: 'II', Ss: 1.0, S1: 0.4, vsMeasured: false, sSDS: 0.8, sSD1: 0.5, importance: 3, H: 15,
      dir: { X: { system: 'C1', ttype: 'mf_rc', Tan: '', rho: 'yes', cRu: 5, cOm: 2.5, cCd: 5, cHm: 50 },
             Y: { system: 'C1', ttype: 'mf_rc', Tan: '', rho: 'yes', cRu: 5, cOm: 2.5, cCd: 5, cHm: 50 } } },
    v4: { loc: { prov: '', city: '' }, zone: 'VH', site: 'II', importance: 3, H: 15,
      dir: { X: { system: 'C2', ttype: 'mf_rc', Tan: '', cRu: 5, cOm: 2.5, cCd: 5, cHm: 50 },
             Y: { system: 'C2', ttype: 'mf_rc', Tan: '', cRu: 5, cOm: 2.5, cCd: 5, cHm: 50 } } },
  });
  let S = DEFAULT();
  let tab = 'summary';
  let res = null;
  let filePath = null;

  // برنامه هر بار با ورودی‌های پیش‌فرض شروع می‌شود (اطلاعات جلسه قبل بارگذاری نمی‌شود)
  try { localStorage.removeItem('s2800.last'); } catch (e) { /* ignore */ }
  const snap = () => JSON.stringify(Object.assign({}, S, { edition: 0 }));
  let clean = null;
  const markClean = () => { clean = snap(); };
  const isDirty = () => clean !== null && snap() !== clean;

  function merge(a, b) {
    if (typeof b !== 'object' || b === null) return a;
    for (const k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') a[k] = merge(a[k], b[k]);
      else if (k in a) a[k] = b[k];
    }
    return a;
  }
  function persist() { /* ذخیره خودکار جلسه غیرفعال است */ }

  // پنجره تأیید راست‌به‌چپ (به‌جای confirm سیستم که چپ‌به‌راست است)
  function ask(msg, okText = 'بله', cancelText = 'خیر') {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'dlg-ov';
      ov.innerHTML = `<div class="dlg" role="dialog"><div class="dlg-msg">${esc(msg)}</div><div class="dlg-btns"><button class="dlg-ok">${esc(okText)}</button><button class="dlg-no">${esc(cancelText)}</button></div></div>`;
      document.body.appendChild(ov);
      const done = v => { ov.remove(); document.removeEventListener('keydown', key); resolve(v); };
      const key = e => { if (e.key === 'Escape') done(false); if (e.key === 'Enter') done(true); };
      document.addEventListener('keydown', key);
      ov.querySelector('.dlg-ok').addEventListener('click', () => done(true));
      ov.querySelector('.dlg-no').addEventListener('click', () => done(false));
      ov.querySelector('.dlg-ok').focus();
    });
  }

  // پنجره چندگزینه‌ای: شماره دکمه انتخاب‌شده یا ‎-1 (Esc)
  function choose(msg, buttons) {
    return new Promise(resolve => {
      const ov = document.createElement('div');
      ov.className = 'dlg-ov';
      ov.innerHTML = `<div class="dlg" role="dialog"><div class="dlg-msg">${esc(msg)}</div><div class="dlg-btns">${buttons.map((b, i) => `<button class="dlg-no" data-i="${i}">${esc(b)}</button>`).join('')}</div></div>`;
      document.body.appendChild(ov);
      const done = v => { ov.remove(); document.removeEventListener('keydown', key); resolve(v); };
      const key = e => { if (e.key === 'Escape') done(-1); };
      document.addEventListener('keydown', key);
      ov.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => done(+b.dataset.i)));
    });
  }

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // ---------------- سازنده‌های فرم ----------------
  const opt = (v, label, sel) => `<option value="${esc(v)}"${String(v) === String(sel) ? ' selected' : ''}>${esc(label)}</option>`;
  function sysOptions(list, groups, sel) {
    return groups.map(g => `<optgroup label="${esc(g.label)}">` +
      list.filter(s => s.g === g.id).map(s => opt(s.id, s.label, sel)).join('') + '</optgroup>').join('');
  }
  const num = (path, val, attrs = '') => `<input type="number" data-k="${path}" value="${esc(val)}" step="any" ${attrs}>`;

  function buildInputs() {
    const ed = S.edition;
    const p = S.project;
    let h = `
    <div class="fs"><div class="fs-h"><span class="dot"></span>مشخصات پروژه</div>
      <label class="f"><span>نام پروژه</span><input data-k="project.name" value="${esc(p.name)}" placeholder="مثلاً: ساختمان مسکونی ۷ طبقه"></label>
      <div class="row">
        <label class="f"><span>محل احداث</span><input data-k="project.location" value="${esc(p.location)}"></label>
        <label class="f"><span>طراح</span><input data-k="project.engineer" value="${esc(p.engineer)}"></label>
      </div>
    </div>`;
    if (ed === 5) h += buildV5(); else h += buildV4();
    h += `
    <div class="fs"><div class="fs-h"><span class="dot"></span>تنظیمات جدول طیف</div>
      <div class="row">
        <label class="f"><span>حداکثر زمان تناوب <em>(s)</em></span>${num('spec.tmax', S.spec.tmax, 'min="1" max="10"')}</label>
        <label class="f"><span>گام زمان تناوب <em>(s)</em></span>${num('spec.dt', S.spec.dt, 'min="0.005" max="0.5"')}</label>
      </div>
    </div>`;
    $('#inputs').innerHTML = h;
    bindInputs();
  }

  function buildV5() {
    const v = S.v5;
    const special = v.site === 'VI';
    let h = `
    <div class="fs"><div class="fs-h"><span class="dot"></span>ساختگاه و خطر لرزه‌ای</div>
      <div class="row">
        <label class="f"><span>استان</span><select data-loc="prov"><option value="">— انتخاب استان —</option>${HZ.provinces.map(p => opt(p, p, curProv())).join('')}</select></label>
        <label class="f"><span>شهر</span><select data-loc="city" ${curProv() ? '' : 'disabled'}><option value="">${curProv() ? '— انتخاب شهر —' : 'اول استان را انتخاب کنید'}</option>${HZ.cities.filter(c => c.p === curProv()).sort((a, b) => a.n.localeCompare(b.n, 'fa')).map(c => opt(HZ.cityLabel(c), c.n, v.loc.city)).join('')}</select></label>
      </div>
      <div class="row3">
        <label class="f"><span>عرض جغرافیایی <em>(°N)</em></span><input type="number" data-loc="lat" value="${esc(v.loc.lat)}" step="any" placeholder="35.689"></label>
        <label class="f"><span>طول جغرافیایی <em>(°E)</em></span><input type="number" data-loc="lon" value="${esc(v.loc.lon)}" step="any" placeholder="51.389"></label>
        <button class="mapbtn" id="btnMap" title="انتخاب محل روی نقشه">📍 نقشه</button>
      </div>
      <div class="row">
        <label class="f"><span>Ss <em>(g) — زمان تناوب ۰٫۲ ثانیه</em></span>${num('v5.Ss', v.Ss, 'min="0" max="4"')}</label>
        <label class="f"><span>S1 <em>(g) — زمان تناوب ۱ ثانیه</em></span>${num('v5.S1', v.S1, 'min="0" max="3"')}</label>
      </div>
      <div class="f hint locnote" id="locNote" style="margin-top:-6px">${v.loc.fromMap ? 'Ss و S1 به‌صورت خودکار از نقشه‌های پیوست ۱ (رقومی‌شده) خوانده شد؛ قابل ویرایش است. مقدار دقیق را با نقشه رسمی کنترل کنید.' : 'استان و شهر را انتخاب کنید، مختصات را وارد کنید یا روی نقشه کلیک کنید تا Ss و S1 خوانده شوند؛ یا مقادیر را دستی وارد کنید.'}</div>
      <label class="f"><span>نوع زمین <em>(جدول ۲-۵)</em></span><select data-k="v5.site">${V5.sites.map(s => opt(s.id, s.label, v.site)).join('')}</select></label>
      ${v.site === 'I' ? `<label class="chk"><input type="checkbox" data-k="v5.vsMeasured" ${v.vsMeasured ? 'checked' : ''}> سرعت موج برشی با حداقل ۳ آزمایش درون‌چاهی اندازه‌گیری شده (ضرایب ۰٫۹)</label>` : ''}
      ${special ? `<div class="row">
        <label class="f"><span>SDS <em>طیف ویژه (g)</em></span>${num('v5.sSDS', v.sSDS)}</label>
        <label class="f"><span>SD1 <em>طیف ویژه (g)</em></span>${num('v5.sSD1', v.sSD1)}</label></div>` : ''}
    </div>
    <div class="fs"><div class="fs-h"><span class="dot"></span>مشخصات ساختمان</div>
      <label class="f"><span>گروه اهمیت <em>(جدول ۱-۱)</em></span><select data-k="v5.importance">${V5.importance.map(x => opt(x.id, `${x.label}  (Ie = ${x.Ie})`, v.importance)).join('')}</select></label>
      <label class="f"><span>ارتفاع ساختمان از تراز پایه، H <em>(متر)</em></span>${num('v5.H', v.H, 'min="1" max="300"')}
        <span class="hint">اگر وزن خرپشته کمتر از ۲۵٪ وزن بام باشد، ارتفاع آن منظور نمی‌شود (تعاریف).</span></label>
    </div>`;
    for (const d of ['X', 'Y']) h += buildDir5(d);
    return h;
  }

  function buildDir5(d) {
    const di = S.v5.dir[d];
    const sys = V5.systems.find(s => s.id === di.system);
    const lc = d.toLowerCase();
    return `
    <div class="dirbox ${lc}">
      <div class="fs-h"><span class="dot ${lc}"></span>امتداد ${d}${d === 'Y' ? '<button class="tool" data-copy="v5">مثل امتداد X</button>' : ''}</div>
      <label class="f"><span>سیستم مقاوم لرزه‌ای <em>(جدول ۳-۱)</em></span><select data-k="v5.dir.${d}.system" data-sys="v5">${sysOptions(V5.systems, V5.groups, di.system)}</select></label>
      <div class="sysparams" id="sp5${d}"></div>
      ${sys.custom ? `<div class="row">
        <label class="f"><span>Ru</span>${num(`v5.dir.${d}.cRu`, di.cRu)}</label>
        <label class="f"><span>Ω0</span>${num(`v5.dir.${d}.cOm`, di.cOm)}</label>
        <label class="f"><span>Cd</span>${num(`v5.dir.${d}.cCd`, di.cCd)}</label>
        <label class="f"><span>Hm <em>(m)</em></span>${num(`v5.dir.${d}.cHm`, di.cHm)}</label></div>` : ''}
      <label class="f"><span>رابطه تجربی زمان تناوب <em>(بند ۳-۹-۲-۱)</em></span><select data-k="v5.dir.${d}.ttype">${V5.ttypes.map(t => opt(t.id, `${t.label} — ${t.a}H^${t.b}`, di.ttype)).join('')}</select></label>
      <div class="row">
        <label class="f"><span>T تحلیلی <em>(s) — اختیاری</em></span>${num(`v5.dir.${d}.Tan`, di.Tan, 'min="0" placeholder="از ETABS"')}</label>
        <label class="f"><span>نامعینی سازه <em>(بند ۳-۵)</em></span><select data-k="v5.dir.${d}.rho">
          ${opt('yes', 'کافی است — ρ = 1.0', di.rho)}${opt('no', 'کافی نیست — ρ = 1.2 / 1.3', di.rho)}</select></label>
      </div>
      <div class="f hint" style="margin-top:-6px">T تحلیلی خالی ⇒ T تجربی به‌کار می‌رود. با ورود آن: T طراحی = min(T تحلیلی ، 1.4·T تجربی) (بند ۳-۹-۲)؛ T بزرگ‌تر معمولاً ضریب زلزله را کمتر می‌کند.</div>
    </div>`;
  }

  // انتخاب استان و شهر از پیوست ۱ ویرایش چهارم ⇒ پهنه خطر نسبی
  const V4C = (window.V4CITIES || []);
  const V4PROV = [...new Set(V4C.map(c => c[1]))].sort((a, b) => a.localeCompare(b, 'fa'));
  const v4Key = c => `${c[1]}|${c[0]}`;
  const v4City = key => V4C.find(c => v4Key(c) === key) || null;
  function v4LocHTML(v) {
    const L = v.loc || (v.loc = { prov: '', city: '' });
    const c = v4City(L.city);
    const prov = L.prov || (c ? c[1] : '');
    const cities = V4C.filter(x => x[1] === prov).sort((a, b) => a[0].localeCompare(b[0], 'fa'));
    const zl = z => (V4.zones.find(q => q.id === z) || {}).label || z;
    let note = '';
    if (c) note = c[2] === v.zone
      ? `<div class="f hint" style="margin-top:-6px">پهنه «${esc(zl(c[2]))}» طبق پیوست ۱ آیین‌نامه برای ${esc(c[0])}${c[3] ? ` (در متن آیین‌نامه: استان ${esc(c[3])})` : ''}.</div>`
      : `<div class="f hint" style="margin-top:-6px;color:#b45309">طبق پیوست ۱، پهنه ${esc(c[0])} «${esc(zl(c[2]))}» است؛ پهنه به‌صورت دستی تغییر کرده است.</div>`;
    return `<div class="row">
        <label class="f"><span>استان <em>(پیوست ۱)</em></span><select data-loc4="prov"><option value="">— انتخاب استان —</option>${V4PROV.map(p => opt(p, p, prov)).join('')}</select></label>
        <label class="f"><span>شهر</span><select data-loc4="city" ${prov ? '' : 'disabled'}><option value="">${prov ? '— انتخاب شهر —' : 'اول استان را انتخاب کنید'}</option>${cities.map(x => opt(v4Key(x), x[0], L.city)).join('')}</select></label>
      </div>${note}`;
  }
  function bindLocation4() {
    const pv = document.querySelector('[data-loc4="prov"]'); if (!pv) return;
    pv.addEventListener('change', () => { S.v4.loc = { prov: pv.value, city: '' }; buildInputs(); persist(); });
    const zs = document.querySelector('[data-k="v4.zone"]');
    if (zs && S.v4.loc.city) zs.addEventListener('change', () => setTimeout(buildInputs, 0));
    document.querySelector('[data-loc4="city"]').addEventListener('change', e => {
      const c = v4City(e.target.value); if (!c) return;
      const prev = S.v4.loc.city ? S.v4.loc.city.split('|').reverse().join(' — ') : '';
      S.v4.loc = { prov: c[1], city: v4Key(c) };
      S.v4.zone = c[2];
      const label = `${c[1]} — ${c[0]}`;
      if (!S.project.location || S.project.location === prev || S.project.location === autoLoc) { S.project.location = label; autoLoc = label; }
      const z = V4.zones.find(q => q.id === c[2]);
      toast(`پیوست ۱: ${c[0]} ⇐ ${z.label} (A = ${z.A})`);
      buildInputs(); recompute();
    });
  }

  function buildV4() {
    const v = S.v4;
    let h = `
    <div class="fs"><div class="fs-h"><span class="dot"></span>ساختگاه و خطر لرزه‌ای</div>
      ${v4LocHTML(v)}
      <label class="f"><span>پهنه خطر نسبی <em>(جدول ۲-۱ و پیوست ۱)</em></span><select data-k="v4.zone">${V4.zones.map(z => opt(z.id, `${z.label}  (A = ${z.A})`, v.zone)).join('')}</select></label>
      <label class="f"><span>نوع زمین <em>(جدول ۲-۳)</em></span><select data-k="v4.site">${V4.sites.map(s => opt(s.id, s.label, v.site)).join('')}</select></label>
    </div>
    <div class="fs"><div class="fs-h"><span class="dot"></span>مشخصات ساختمان</div>
      <label class="f"><span>گروه اهمیت <em>(بند ۱-۶ و جدول ۳-۳)</em></span><select data-k="v4.importance">${V4.importance.map(x => opt(x.id, `${x.label}  (I = ${x.I})`, v.importance)).join('')}</select></label>
      <label class="f"><span>ارتفاع ساختمان از تراز پایه، H <em>(متر)</em></span>${num('v4.H', v.H, 'min="1" max="300"')}</label>
    </div>`;
    for (const d of ['X', 'Y']) {
      const di = v.dir[d];
      const sys = V4.systems.find(s => s.id === di.system);
      const lc = d.toLowerCase();
      h += `
      <div class="dirbox ${lc}">
        <div class="fs-h"><span class="dot ${lc}"></span>امتداد ${d}${d === 'Y' ? '<button class="tool" data-copy="v4">مثل امتداد X</button>' : ''}</div>
        <label class="f"><span>سیستم مقاوم لرزه‌ای <em>(جدول ۳-۴)</em></span><select data-k="v4.dir.${d}.system" data-sys="v4">${sysOptions(V4.systems, V4.groups, di.system)}</select></label>
        <div class="sysparams" id="sp4${d}"></div>
        ${sys.custom ? `<div class="row">
          <label class="f"><span>R</span>${num(`v4.dir.${d}.cRu`, di.cRu)}</label>
          <label class="f"><span>Ω0</span>${num(`v4.dir.${d}.cOm`, di.cOm)}</label>
          <label class="f"><span>Cd</span>${num(`v4.dir.${d}.cCd`, di.cCd)}</label>
          <label class="f"><span>Hm <em>(m)</em></span>${num(`v4.dir.${d}.cHm`, di.cHm)}</label></div>` : ''}
        <label class="f"><span>رابطه تجربی زمان تناوب <em>(بند ۳-۳-۳-۱)</em></span><select data-k="v4.dir.${d}.ttype">${V4.ttypes.map(t => opt(t.id, t.label, di.ttype)).join('')}</select></label>
        <label class="f"><span>T تحلیلی <em>(s) — اختیاری</em></span>${num(`v4.dir.${d}.Tan`, di.Tan, 'min="0" placeholder="از ETABS"')}</label>
        <div class="f hint" style="margin-top:-6px">T تحلیلی خالی ⇒ T تجربی به‌کار می‌رود. با ورود آن، T طراحی حداکثر 1.25·T تجربی است (تبصره بند ۳-۳-۳-۱)؛ T بزرگ‌تر معمولاً ضریب زلزله را کمتر می‌کند.</div>
      </div>`;
    }
    return h;
  }

  function getPath(path) { return path.split('.').reduce((o, k) => o[k], S); }
  function setPath(path, val) {
    const ks = path.split('.'); const last = ks.pop();
    ks.reduce((o, k) => o[k], S)[last] = val;
  }

  let autoLoc = '';
  function curProv() {
    const L = S.v5.loc; if (L.prov) return L.prov;
    const c = HZ.findCity(L.city || ''); return c ? c.p : '';
  }
  function applyLocation(lat, lon, label) {
    const L = S.v5.loc;
    L.lat = lat; L.lon = lon;
    if (label !== undefined) L.city = label;
    if (label && (!S.project.location || S.project.location === autoLoc)) { S.project.location = label; autoLoc = label; }
    const v = HZ.lookup(lat, lon);
    if (v) {
      S.v5.Ss = +v.ss.toFixed(3); S.v5.S1 = +v.s1.toFixed(3); L.fromMap = true;
      toast(`از نقشه: Ss = ${S.v5.Ss} ، S1 = ${S.v5.S1}`);
    } else { L.fromMap = false; toast('این نقطه خارج از محدوده نقشه ایران است'); }
    buildInputs(); recompute();
  }
  function bindLocation() {
    const pv = document.querySelector('[data-loc="prov"]'); if (!pv) return;
    pv.addEventListener('change', () => { S.v5.loc.prov = pv.value; S.v5.loc.city = ''; buildInputs(); persist(); });
    const c = document.querySelector('[data-loc="city"]');
    c.addEventListener('change', () => {
      const city = HZ.findCity(c.value);
      if (city) { S.v5.loc.prov = city.p; applyLocation(city.lat, city.lon, HZ.cityLabel(city)); }
    });
    for (const k of ['lat', 'lon']) {
      document.querySelector(`[data-loc="${k}"]`).addEventListener('change', e => {
        const L = S.v5.loc; L[k] = e.target.value === '' ? '' : Number(e.target.value); L.city = '';
        if (L.lat !== '' && L.lon !== '') applyLocation(Number(L.lat), Number(L.lon), '');
        else { buildInputs(); persist(); }
      });
    }
    $('#btnMap').addEventListener('click', () => {
      const L = S.v5.loc;
      HZ.openPicker({ lat: L.lat === '' ? NaN : Number(L.lat), lon: L.lon === '' ? NaN : Number(L.lon) }, (lat, lon) => applyLocation(lat, lon, ''));
    });
  }

  function bindInputs() {
    if (S.edition === 5) bindLocation(); else bindLocation4();
    document.querySelectorAll('#inputs [data-k]').forEach(elm => {
      const ev = (elm.tagName === 'SELECT' || elm.type === 'checkbox') ? 'change' : 'input';
      elm.addEventListener(ev, () => {
        const k = elm.dataset.k;
        let val;
        if (elm.type === 'checkbox') val = elm.checked;
        else if (elm.type === 'number') val = elm.value === '' ? '' : Number(elm.value);
        else if (k.endsWith('importance')) val = Number(elm.value);
        else val = elm.value;
        setPath(k, val);
        let rebuild = false;
        if ((k === 'v5.Ss' || k === 'v5.S1') && S.v5.loc.fromMap) { S.v5.loc.fromMap = false; const n = $('#locNote'); if (n) n.textContent = 'مقدار دستی وارد شد.'; }
        if (elm.dataset.sys) {
          const list = elm.dataset.sys === 'v5' ? V5.systems : V4.systems;
          const sys = list.find(s => s.id === val);
          const dpath = k.replace(/\.system$/, '');
          getPath(dpath).ttype = sys.t;
          rebuild = true;
        }
        if (k === 'v5.site') rebuild = true;
        if (rebuild) { buildInputs(); }
        recompute();
      });
    });
    document.querySelectorAll('#inputs [data-copy]').forEach(b => b.addEventListener('click', () => {
      const ed = b.dataset.copy;
      S[ed].dir.Y = JSON.parse(JSON.stringify(S[ed].dir.X));
      buildInputs(); recompute(); toast('تنظیمات امتداد X به امتداد Y کپی شد');
    }));
  }

  // ---------------- اعتبارسنجی و محاسبه ----------------
  function validate() {
    const errs = [];
    const mark = (k, bad) => { const e = document.querySelector(`[data-k="${k}"]`); if (e) e.classList.toggle('bad', !!bad); };
    const chk = (k, ok, msg) => { mark(k, !ok); if (!ok) errs.push(msg); };
    const n = x => typeof x === 'number' && isFinite(x);
    if (S.edition === 5) {
      const v = S.v5;
      chk('v5.H', n(v.H) && v.H > 0, 'ارتفاع ساختمان را وارد کنید.');
      if (v.site !== 'VI') {
        chk('v5.Ss', n(v.Ss) && v.Ss > 0 && v.Ss <= 4, 'مقدار Ss باید بین ۰ و ۴ باشد.');
        chk('v5.S1', n(v.S1) && v.S1 > 0 && v.S1 <= 3, 'مقدار S1 باید بین ۰ و ۳ باشد.');
      } else {
        chk('v5.sSDS', n(v.sSDS) && v.sSDS > 0, 'SDS طیف ویژه را وارد کنید.');
        chk('v5.sSD1', n(v.sSD1) && v.sSD1 > 0, 'SD1 طیف ویژه را وارد کنید.');
        chk('v5.S1', n(v.S1) && v.S1 > 0, 'S1 (برای گروه طراحی و Cmin) را وارد کنید.');
      }
      for (const d of ['X', 'Y']) {
        const di = v.dir[d];
        chk(`v5.dir.${d}.Tan`, di.Tan === '' || (n(di.Tan) && di.Tan > 0), `T تحلیلی امتداد ${d} نامعتبر است.`);
        if (di.system === 'X1') for (const c of ['cRu', 'cOm', 'cCd', 'cHm']) chk(`v5.dir.${d}.${c}`, n(di[c]) && di[c] > 0, `پارامترهای سیستم دستی امتداد ${d} را کامل کنید.`);
      }
    } else {
      const v = S.v4;
      chk('v4.H', n(v.H) && v.H > 0, 'ارتفاع ساختمان را وارد کنید.');
      for (const d of ['X', 'Y']) {
        const di = v.dir[d];
        chk(`v4.dir.${d}.Tan`, di.Tan === '' || (n(di.Tan) && di.Tan > 0), `T تحلیلی امتداد ${d} نامعتبر است.`);
        if (di.system === 'X1') for (const c of ['cRu', 'cOm', 'cCd', 'cHm']) chk(`v4.dir.${d}.${c}`, n(di[c]) && di[c] > 0, `پارامترهای سیستم دستی امتداد ${d} را کامل کنید.`);
      }
    }
    chk('spec.tmax', n(S.spec.tmax) && S.spec.tmax >= 1 && S.spec.tmax <= 10, 'حداکثر زمان تناوب جدول باید بین ۱ و ۱۰ ثانیه باشد.');
    chk('spec.dt', n(S.spec.dt) && S.spec.dt >= 0.005 && S.spec.dt <= 0.5, 'گام جدول باید بین ۰٫۰۰۵ و ۰٫۵ ثانیه باشد.');
    return [...new Set(errs)];
  }

  function inputForCalc() {
    const src = S.edition === 5 ? S.v5 : S.v4;
    const c = JSON.parse(JSON.stringify(src));
    for (const d of ['X', 'Y']) c.dir[d].Tan = c.dir[d].Tan === '' ? null : Number(c.dir[d].Tan);
    c.tmax = S.spec.tmax; c.dt = S.spec.dt;
    return c;
  }

  function recompute() {
    persist();
    const errs = validate();
    if (errs.length) {
      res = null;
      $('#kpis').innerHTML = '';
      $('#panel').innerHTML = `<div class="card">${errs.map(e => `<div class="note w"><b>⚠</b><span>${esc(e)}</span></div>`).join('')}</div>`;
      $('#noteBadge').textContent = '';
      return;
    }
    try {
      res = S.edition === 5 ? CALC.calcV5(inputForCalc()) : CALC.calcV4(inputForCalc());
    } catch (e) {
      res = null; $('#panel').innerHTML = `<div class="note w"><b>خطا</b><span>${esc(e.message)}</span></div>`; return;
    }
    updateSysChips();
    renderKpis();
    const nb = $('#noteBadge');
    nb.textContent = res.warn.length || (res.info.length ? res.info.length : '');
    nb.classList.toggle('info', !res.warn.length);
    renderPanel();
  }

  function updateSysChips() {
    const ed = S.edition;
    for (const d of ['X', 'Y']) {
      const box = $(`#sp${ed}${d}`); if (!box) continue;
      const R = res.dirs[d];
      const hmTxt = R.Hm === null ? (ed === 5 ? 'غیرمجاز' : '**') : `${R.Hm} m`;
      box.innerHTML = `<span class="chip">${ed === 5 ? 'Ru' : 'R'} = ${R.Ru}</span><span class="chip">Ω0 = ${R.Om}</span><span class="chip">Cd = ${R.Cd}</span>` +
        `<span class="chip ${R.hmOK ? '' : 'bad'}">Hm${ed === 5 ? ` (SDC-${res.SDC})` : ''} = ${hmTxt}</span>`;
    }
  }

  // ---------------- خروجی‌ها ----------------
  function kpi(cls, k, v, s) { return `<div class="kpi ${cls}"><div class="k">${k}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`; }
  function renderKpis() {
    const X = res.dirs.X, Y = res.dirs.Y;
    let h = '';
    if (res.edition === 5) {
      h += kpi('n', 'شتاب طیفی طرح', `${f(res.SDS)}`, `SDS (g) · SD1 = ${f(res.SD1)}`);
      h += kpi('n', 'گروه طراحی لرزه‌ای', `SDC-${res.SDC}`, `Ie = ${res.Ie}`);
    } else {
      h += kpi('n', 'شتاب مبنای طرح', `${res.A}`, `A · I = ${res.I}`);
      h += kpi('n', 'ضریب زلزله حداقل', `${f(res.Cmin, 4)}`, 'Cmin = 0.12·A·I');
    }
    h += kpi('x', 'ضریب زلزله طراحی — X', f(X.Ceff, 4), `T = ${f(X.T)} s · k = ${f(X.k)}`);
    h += kpi('y', 'ضریب زلزله طراحی — Y', f(Y.Ceff, 4), `T = ${f(Y.T)} s · k = ${f(Y.k)}`);
    h += kpi('x', 'ضریب کنترل تغییرمکان — X', f(X.Cdrift, 4), `T = ${f(X.Td)} s · k = ${f(X.kd)}`);
    h += kpi('y', 'ضریب کنترل تغییرمکان — Y', f(Y.Cdrift, 4), `T = ${f(Y.Td)} s · k = ${f(Y.kd)}`);
    $('#kpis').innerHTML = h;
    const mr = $('#mres'); if (mr) mr.textContent = `C = ${f(X.Ceff, 3)}`;
  }

  let refSel = null;
  function openRef(ref) { const id = REFS.match(ref, res ? res.edition : S.edition); if (!id) return; refSel = id; tab = 'refs'; renderPanel(); }
  function renderPanel() {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const P = $('#panel');
    if (tab === 'refs') { REFS.render(P, S.edition, refSel); refSel = null; return; }
    if (!res) return;
    if (tab === 'summary') P.innerHTML = summaryHTML();
    else if (tab === 'steps') P.innerHTML = stepsHTML(res);
    else if (tab === 'chart') { P.innerHTML = chartShell(); drawCharts(P); }
    else if (tab === 'table') P.innerHTML = tableHTML();
    else if (tab === 'notes') P.innerHTML = notesHTML();
  }

  function rowsTable(rows) {
    return `<table class="t"><thead><tr><th>پارامتر</th><th class="n">X</th><th class="n">Y</th></tr></thead><tbody>` +
      rows.map(r => `<tr class="${r[3] || ''}"><td>${r[0]}</td><td class="n ${r[3] ? 'x' : ''}">${r[1]}</td><td class="n ${r[3] ? 'y' : ''}">${r[2]}</td></tr>`).join('') + '</tbody></table>';
  }

  function summaryHTML() {
    const X = res.dirs.X, Y = res.dirs.Y;
    const allOK = X.hmOK && Y.hmOK;
    let site = '';
    if (res.edition === 5) {
      site = `<table class="t"><tbody>
        <tr><td>نوع زمین</td><td class="n">${res.site}${res.special ? ' (طیف ویژه)' : ''}</td></tr>
        <tr><td>Ss / S1</td><td class="n">${f(res.Ss, 2)} / ${f(res.S1, 2)}</td></tr>
        ${res.special ? '' : `<tr><td>Fs / F1</td><td class="n">${f(res.Fs)} / ${f(res.F1)}</td></tr>`}
        <tr><td>SMS / SM1</td><td class="n">${f(res.SMS)} / ${f(res.SM1)}</td></tr>
        <tr class="hl"><td>SDS / SD1</td><td class="n">${f(res.SDS)} / ${f(res.SD1)}</td></tr>
        <tr><td>T0 / Ts / TL (s)</td><td class="n">${f(res.T0)} / ${f(res.Ts)} / ${f(res.TL, 1)}</td></tr>
        ${res.special ? '' : `<tr><td>PGA / PGAS</td><td class="n">${f(res.PGA)} / ${f(res.PGAS)}</td></tr><tr><td>Cv (طیف قائم)</td><td class="n">${f(res.Cv)}</td></tr>`}
        <tr><td>ضریب اهمیت Ie</td><td class="n">${res.Ie}</td></tr>
        <tr class="hl"><td>گروه طراحی لرزه‌ای</td><td class="n">SDC-${res.SDC}</td></tr>
        <tr><td>نیروی قائم کل سازه Fvut</td><td class="n">${f(res.Fvut)}·WD</td></tr>
        ${res.needFvuc ? `<tr><td>نیروی قائم اعضای حساس Fvuc</td><td class="n">${f(res.Fvuc)}·WD</td></tr>` : ''}
      </tbody></table>`;
    } else {
      site = `<table class="t"><tbody>
        <tr><td>پهنه خطر</td><td>${esc(res.zoneLabel)}</td></tr>
        <tr class="hl"><td>A</td><td class="n">${res.A}</td></tr>
        <tr><td>نوع زمین</td><td class="n">${res.site}</td></tr>
        <tr><td>T0 / Ts (s)</td><td class="n">${res.sp.T0} / ${res.sp.Ts}</td></tr>
        <tr><td>S0 / S</td><td class="n">${res.sp.S0} / ${res.sp.S}</td></tr>
        <tr><td>ضریب اهمیت I</td><td class="n">${res.I}</td></tr>
        <tr class="hl"><td>Cmin = 0.12·A·I</td><td class="n">${f(res.Cmin, 4)}</td></tr>
        <tr><td>نیروی قائم Fv${res.needFv ? '' : ' (اعضای خاص)'}</td><td class="n">${f(res.Fv)}·Wp</td></tr>
      </tbody></table>`;
    }
    const e5 = res.edition === 5;
    const rows = [
      ['سیستم', `<span dir="rtl" style="font-size:12px">${esc(X.sys.label)}</span>`, `<span dir="rtl" style="font-size:12px">${esc(Y.sys.label)}</span>`],
      [e5 ? 'Ru / Ω0 / Cd' : 'R / Ω0 / Cd', `${X.Ru} / ${X.Om} / ${X.Cd}`, `${Y.Ru} / ${Y.Om} / ${Y.Cd}`],
      ['H / Hm (m)', `${res.H} / ${X.Hm ?? (e5 ? '—' : '**')} ${X.hmOK ? '✓' : '✗'}`, `${res.H} / ${Y.Hm ?? (e5 ? '—' : '**')} ${Y.hmOK ? '✓' : '✗'}`],
      ['T تجربی (s)', f(X.Temp), f(Y.Temp)],
      ['T تحلیلی (s)', X.Tan ? f(X.Tan) : '—', Y.Tan ? f(Y.Tan) : '—'],
      ['T طراحی (s)', f(X.T), f(Y.T)],
    ];
    if (e5) rows.push(['Sa (g)', f(X.Sa, 4), f(Y.Sa, 4)]);
    else rows.push(['B1 / N / B', `${f(X.B1)} / ${f(X.N)} / ${f(X.B)}`, `${f(Y.B1)} / ${f(Y.N)} / ${f(Y.B)}`]);
    rows.push(['C محاسباتی', f(X.Cc, 4), f(Y.Cc, 4)]);
    rows.push(['Cmin', f(X.Cmin, 4), f(Y.Cmin, 4)]);
    if (e5) rows.push(['ρ', `${X.rho}`, `${Y.rho}`]);
    rows.push(['ضریب زلزله طراحی', f(X.Ceff, 4), f(Y.Ceff, 4), 'hl']);
    rows.push(['توان k', f(X.k), f(Y.k)]);
    rows.push(['T کنترل تغییرمکان (s)', f(X.Td), f(Y.Td)]);
    rows.push(['ضریب کنترل تغییرمکان', f(X.Cdrift, 4), f(Y.Cdrift, 4), 'hl']);
    rows.push(['k تغییرمکان', f(X.kd), f(Y.kd)]);
    if (e5) rows.push(['Δa مجاز طبقه', `${f(X.driftLimit, 4)}·h`, `${f(Y.driftLimit, 4)}·h`]);

    let etabs = '';
    if (e5) {
      etabs = `<div class="card"><h3>مقادیر برای ETABS</h3><table class="t"><thead><tr><th>مورد</th><th class="n">X</th><th class="n">Y</th></tr></thead><tbody>
        <tr><td>Base Shear Coefficient, C (طراحی)</td><td class="n x">${f(X.Ceff, 4)}</td><td class="n y">${f(Y.Ceff, 4)}</td></tr>
        <tr><td>Building Height Exp., K (طراحی)</td><td class="n">${f(X.k)}</td><td class="n">${f(Y.k)}</td></tr>
        <tr><td>C برای Drift</td><td class="n x">${f(X.Cdrift, 4)}</td><td class="n y">${f(Y.Cdrift, 4)}</td></tr>
        <tr><td>K برای Drift</td><td class="n">${f(X.kd)}</td><td class="n">${f(Y.kd)}</td></tr>
        <tr><td>Scale Factor طیف (g·Ie/Ru) — m/s²</td><td class="n">${f(9.81 * res.Ie / X.Ru, 4)}</td><td class="n">${f(9.81 * res.Ie / Y.Ru, 4)}</td></tr>
      </tbody></table><div class="small muted" style="margin-top:6px">ضریب ρ در صورت نیاز در ترکیب بارها اعمال شود؛ مقدار C طراحی بالا اثر ρ و Cmin را دارد. فایل طیف (T، Sa) با دکمه «خروجی ETABS» ذخیره می‌شود.</div></div>`;
    } else {
      etabs = `<div class="card"><h3>مقادیر برای ETABS</h3><table class="t"><thead><tr><th>مورد</th><th class="n">X</th><th class="n">Y</th></tr></thead><tbody>
        <tr><td>Base Shear Coefficient, C (طراحی)</td><td class="n x">${f(X.Ceff, 4)}</td><td class="n y">${f(Y.Ceff, 4)}</td></tr>
        <tr><td>Building Height Exp., K</td><td class="n">${f(X.k)}</td><td class="n">${f(Y.k)}</td></tr>
        <tr><td>C برای Drift</td><td class="n x">${f(X.Cdrift, 4)}</td><td class="n y">${f(Y.Cdrift, 4)}</td></tr>
        <tr><td>K برای Drift</td><td class="n">${f(X.kd)}</td><td class="n">${f(Y.kd)}</td></tr>
        <tr><td>Scale Factor طیف A·B (g·I/R) — m/s²</td><td class="n">${f(9.81 * res.I / X.Ru, 4)}</td><td class="n">${f(9.81 * res.I / Y.Ru, 4)}</td></tr>
      </tbody></table></div>`;
    }

    return `
      ${allOK && !res.warn.length ? '' : `<div class="note ${res.warn.length ? 'w' : 'i'}"><b>⚠</b><span>${res.warn.length} هشدار آیین‌نامه‌ای وجود دارد — زبانه «هشدارها و نکات» را ببینید.</span></div>`}
      <div class="grid2">
        <div class="card"><h3>پارامترهای ساختگاه و طیف</h3>${site}</div>
        <div class="card"><h3>ضرایب زلزله در دو امتداد <span class="pill ${allOK ? 'ok' : 'bad'}">${allOK ? 'ارتفاع مجاز ✓' : 'کنترل ارتفاع ✗'}</span></h3>${rowsTable(rows)}</div>
      </div>
      ${etabs}`;
  }

  function refLink(ref) {
    if (!ref) return '';
    const id = res ? REFS.match(ref, res.edition) : null;
    return id ? `<button class="ref link" data-ref="${esc(ref)}" title="نمایش متن آیین‌نامه">${esc(ref)} ↗</button>` : `<span class="ref">${esc(ref)}</span>`;
  }
  function stepsHTML(r) {
    const blk = (title, cls, arr) => `<div class="card"><div class="secttl ${cls}"><span class="bar"></span>${title}</div><div class="steps">` +
      arr.map(s => `<div class="step"><div class="body"><div class="tt"><span class="ttl">${esc(s.title)}</span>${refLink(s.ref)}</div><div class="ex">${CALC.mixed(s.expr)}</div></div>${s.val ? `<div class="vv">${CALC.mixed(s.val)}</div>` : '<div></div>'}</div>`).join('') + '</div></div>';
    return blk(r.edition === 5 ? 'پارامترهای ساختگاه، طیف طرح و گروه طراحی' : 'پارامترهای ساختگاه و طیف طرح', '', r.steps) +
      blk('امتداد X', 'x', r.dirs.X.steps) + blk('امتداد Y', 'y', r.dirs.Y.steps);
  }

  function chartShell() {
    if (res.edition === 5) return `<div class="chart-wrap"><h4>طیف طرح استاندارد افقی (Sa) و طیف زلزله بیشینه (SaM = 1.5·Sa)</h4><div id="ch1"></div></div>` +
      (res.special ? '' : `<div class="chart-wrap"><h4>طیف طرح قائم استاندارد (Sav) — بند ۲-۵-۲ <span class="muted small">(محور افقی: Tv)</span></h4><div id="ch2"></div></div>`);
    return `<div class="chart-wrap"><h4>ضریب بازتاب B و طیف A·B</h4><div id="ch1"></div></div>`;
  }
  function chartOpts(which, width) {
    const t = res.table, X = res.dirs.X, Y = res.dirs.Y;
    if (res.edition === 5) {
      if (which === 1) return { width, height: 380, xlabel: 'زمان تناوب T (ثانیه)', ylabel: 'شتاب طیفی (g)',
        series: [{ name: 'Sa طرح', color: '#0b2545', points: t.map(r => [r.T, r.Sa]) }, { name: 'SaM', color: '#94a3b8', dash: '6 4', width: 1.6, points: t.map(r => [r.T, r.SaM]) }],
        markers: [{ x: X.T, label: `Tx = ${f(X.T)}`, color: '#1d4ed8' }, { x: Y.T, label: `Ty = ${f(Y.T)}`, color: '#c2410c' }],
        dots: [{ x: X.T, y: X.Sa, color: '#1d4ed8' }, { x: Y.T, y: Y.Sa, color: '#c2410c' }] };
      return { width, height: 320, xlabel: 'زمان تناوب قائم Tv (ثانیه)', ylabel: 'شتاب طیفی قائم (g)',
        series: [{ name: 'Sav', color: '#0f766e', points: t.map(r => [r.T, r.Sav]) }] };
    }
    return { width, height: 380, xlabel: 'زمان تناوب T (ثانیه)', ylabel: 'B ، A·B',
      series: [{ name: 'B', color: '#0b2545', points: t.map(r => [r.T, r.B]) }, { name: 'A·B', color: '#0f766e', points: t.map(r => [r.T, r.AB]) }],
      markers: [{ x: X.T, label: `Tx = ${f(X.T)}`, color: '#1d4ed8' }, { x: Y.T, label: `Ty = ${f(Y.T)}`, color: '#c2410c' }],
      dots: [{ x: X.T, y: X.B, color: '#1d4ed8' }, { x: Y.T, y: Y.B, color: '#c2410c' }] };
  }
  function drawCharts(P) {
    const w = Math.max(300, P.clientWidth - 24);
    const fit = o => { if (w < 600) o.height = Math.round(Math.max(260, Math.min(o.height || 380, w * 0.8))); return o; };
    CHART.render($('#ch1'), fit(chartOpts(1, w)));
    const c2 = $('#ch2'); if (c2) CHART.render(c2, fit(chartOpts(2, w)));
  }

  function tableHTML() {
    const t = res.table;
    let head, body;
    if (res.edition === 5) {
      head = `<th class="n">T (s)</th><th class="n">Sa (g)</th><th class="n">SaM (g)</th>${res.special ? '' : '<th class="n">Fmd</th><th class="n">Sav (g)</th>'}`;
      body = t.map(r => `<tr><td class="n">${f(r.T, 2)}</td><td class="n">${f(r.Sa, 5)}</td><td class="n">${f(r.SaM, 5)}</td>${res.special ? '' : `<td class="n">${f(r.Fmd)}</td><td class="n">${f(r.Sav, 5)}</td>`}</tr>`).join('');
    } else {
      head = '<th class="n">T (s)</th><th class="n">B1</th><th class="n">N</th><th class="n">B</th><th class="n">A·B</th>';
      body = t.map(r => `<tr><td class="n">${f(r.T, 2)}</td><td class="n">${f(r.B1, 5)}</td><td class="n">${f(r.N, 5)}</td><td class="n">${f(r.B, 5)}</td><td class="n">${f(r.AB, 5)}</td></tr>`).join('');
    }
    return `<div class="small muted" style="margin-bottom:8px">${t.length} سطر — برای ذخیره، از دکمه‌های «خروجی ETABS» یا «خروجی Excel» استفاده کنید (فایل Excel شامل خلاصه نتایج، مراحل محاسبات، جدول و نمودار طیف است).</div>
      <div class="tablewrap"><table class="t"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  // ادغام پیام‌های یکسان دو امتداد
  function mergeDirs(list) {
    const out = [], used = new Set();
    list.forEach((m, i) => {
      if (used.has(i)) return;
      if (m.startsWith('امتداد X')) {
        const j = list.findIndex((n, k) => !used.has(k) && k !== i && n === m.replace('امتداد X', 'امتداد Y'));
        if (j >= 0) { used.add(j); out.push(m.replace('امتداد X', 'امتدادهای X و Y')); return; }
      }
      out.push(m);
    });
    return out;
  }
  function notesHTML() {
    let h = '';
    if (!res.warn.length) h += `<div class="note ok"><b>✓</b><span>هیچ مغایرتی با محدودیت‌های جدول سیستم‌ها و ارتفاع مجاز یافت نشد.</span></div>`;
    h += mergeDirs(res.warn).map(w => `<div class="note w"><b>⚠</b><span>${esc(w)}</span></div>`).join('');
    h += mergeDirs(res.info).map(w => `<div class="note i"><b>ℹ</b><span>${esc(w)}</span></div>`).join('');
    h += `<div class="note i"><b>ℹ</b><span>این برنامه کنترل‌های نامنظمی، روش تحلیل مجاز (بند ۳-۸)، اثر P-Δ و پیچش اتفاقی را انجام نمی‌دهد؛ این موارد باید جداگانه کنترل شوند. بررسی نهایی نکات آیین‌نامه بر عهده طراح است.</span></div>`;
    return h;
  }

  // ---------------- فایل‌ها ----------------
  function baseName() { return (S.project.name || 'project').replace(/[\\/:*?"<>|]/g, '_'); }
  async function saveText(name, content, filters) {
    if (native) return native.saveFile({ name, content, filters });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return name;
  }

  async function exportEtabs() {
    if (!res) return toast('ابتدا ورودی‌ها را کامل کنید');
    let lines;
    if (res.edition === 5) lines = res.table.map(r => `${r.T.toFixed(3)}\t${r.Sa.toFixed(6)}`);
    else lines = res.table.map(r => `${r.T.toFixed(3)}\t${r.AB.toFixed(6)}`);
    const p = await saveText(`${baseName()}-ETABS-spectrum-v${res.edition}.txt`, lines.join('\r\n'), [{ name: 'Text', extensions: ['txt'] }]);
    if (p) toast('فایل طیف ETABS ذخیره شد');
    if (res.edition === 5 && !res.special && p) {
      const lv = res.table.map(r => `${r.T.toFixed(3)}\t${r.Sav.toFixed(6)}`);
      if (native) { if (await ask('فایل طیف قائم (Sav) هم برای ETABS ذخیره شود؟', 'بله، ذخیره شود', 'خیر')) await saveText(`${baseName()}-ETABS-vertical-v5.txt`, lv.join('\r\n'), [{ name: 'Text', extensions: ['txt'] }]); }
    }
  }
  function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  async function exportXlsx() {
    if (!res) return toast('ابتدا ورودی‌ها را کامل کنید');
    const data = XLSX.workbook(res, S);
    const name = `${baseName()}-ضریب-زلزله-v${res.edition}.xlsx`;
    let p;
    if (native) p = await native.saveFile({ name, base64: b64(data), filters: [{ name: 'Excel', extensions: ['xlsx'] }] });
    else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); p = name;
    }
    if (p) toast('فایل Excel ذخیره شد');
  }
  async function saveProject() {
    const content = JSON.stringify(S, null, 2);
    if (native) {
      const p = await native.saveFile({ name: `${baseName()}.s2800`, content, filters: [{ name: 'پروژه ضریب زلزله', extensions: ['s2800'] }], path: filePath });
      if (p) { filePath = p; markClean(); toast('پروژه ذخیره شد'); return true; }
      return false;
    } else { await saveText(`${baseName()}.s2800`, content); markClean(); toast('پروژه ذخیره شد'); return true; }
  }
  function loadProject(text, path) {
    try {
      const obj = JSON.parse(text);
      if (obj.app !== 'seismic2800') throw new Error('فایل پروژه معتبر نیست');
      S = merge(DEFAULT(), obj); filePath = path || null;
      applyEdition(); markClean(); toast('پروژه باز شد');
    } catch (e) { toast('خطا در باز کردن فایل: ' + e.message); }
  }
  async function openProject() {
    if (native) { const r = await native.openFile({ filters: [{ name: 'پروژه ضریب زلزله', extensions: ['s2800', 'json'] }] }); if (r) loadProject(r.content, r.path); }
    else $('#fileIn').click();
  }
  $('#fileIn').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const rd = new FileReader(); rd.onload = () => loadProject(rd.result); rd.readAsText(file); e.target.value = '';
  });

  async function makeReport() {
    if (!res) return toast('ابتدا ورودی‌ها را کامل کنید');
    const charts = [];
    const tmp = document.createElement('div'); tmp.style.cssText = 'position:absolute;left:-9999px;top:0;width:700px';
    document.body.appendChild(tmp);
    for (const w of res.edition === 5 && !res.special ? [1, 2] : [1]) {
      const o = chartOpts(w, 680); o.interactive = false; o.height = w === 1 ? 300 : 240;
      const svg = CHART.render(tmp, o);
      charts.push(svg.outerHTML.replace(/var\(--[a-z0-9]+, ?([^)]+)\)/g, '$1'));
    }
    tmp.remove();
    const html = REPORT.build(res, S, charts);
    if (native) {
      const p = await native.savePDF({ html, name: `${baseName()}-گزارش-ضریب-زلزله-v${res.edition}.pdf` });
      if (p) toast('گزارش PDF ذخیره شد');
    } else {
      const w = window.open('', '_blank');
      if (!w) return toast('اجازه باز شدن پنجره جدید (pop-up) را در مرورگر بدهید');
      w.document.write(html.replace('<head>', `<head><base href="${location.href.replace(/[^/]*$/, '')}">`)); w.document.close();
      setTimeout(() => w.print(), 600);
    }
  }

  // ---------------- رویدادهای کلی ----------------
  function applyEdition() {
    document.querySelectorAll('#edSeg button').forEach(b => b.classList.toggle('on', Number(b.dataset.ed) === S.edition));
    const bn = $('#edBanner');
    if (S.edition === 4) { bn.textContent = 'توجه: طبق ابلاغیه وزارت راه و شهرسازی (۱۴۰۴/۱۲/۲۷)، اعتبار ویرایش چهارم در ۱۴۰۵/۰۶/۲۱ به پایان رسیده است. این بخش برای کنترل و مقایسه پروژه‌های پیشین است.'; bn.classList.add('show'); }
    else bn.classList.remove('show');
    buildInputs(); recompute();
  }
  document.querySelectorAll('#edSeg button').forEach(b => b.addEventListener('click', () => { S.edition = Number(b.dataset.ed); applyEdition(); }));
  document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; renderPanel(); }));
  // ناوبری پایین در موبایل: ورودی‌ها / نتایج
  document.querySelectorAll('#mnav button').forEach(b => b.addEventListener('click', () => {
    const out = b.dataset.m === 'out';
    document.body.classList.toggle('m-out', out);
    document.querySelectorAll('#mnav button').forEach(x => x.classList.toggle('on', x === b));
    if (out && tab === 'chart') renderPanel();
    (out ? $('.results') : $('.inputs')).scrollTop = 0;
  }));
  $('#panel').addEventListener('click', e => { const b = e.target.closest('[data-ref]'); if (b) openRef(b.dataset.ref); });
  $('#btnNew').addEventListener('click', async () => { if (await ask('همه ورودی‌ها به مقادیر پیش‌فرض برگردند؟', 'بله، پروژه جدید', 'انصراف')) { const ed = S.edition; S = DEFAULT(); S.edition = ed; filePath = null; applyEdition(); markClean(); } });
  // هنگام بستن برنامه: اگر تغییر ذخیره‌نشده وجود دارد، بپرس
  if (native && native.onCloseRequest) native.onCloseRequest(async () => {
    if (document.querySelector('.dlg-ov')) return;
    if (!isDirty()) return native.confirmClose();
    const c = await choose('تغییرات این پروژه ذخیره نشده است. قبل از خروج ذخیره شود؟', ['ذخیره و خروج', 'خروج بدون ذخیره', 'انصراف']);
    if (c === 0) { if (await saveProject()) native.confirmClose(); }
    else if (c === 1) native.confirmClose();
  });
  window.addEventListener('beforeunload', e => { if (!native && isDirty()) { e.preventDefault(); e.returnValue = ''; } });
  $('#btnSave').addEventListener('click', saveProject);
  $('#btnOpen').addEventListener('click', openProject);
  $('#btnEtabs').addEventListener('click', exportEtabs);
  $('#btnCsv').addEventListener('click', exportXlsx);
  $('#btnReport').addEventListener('click', makeReport);
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); openProject(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'p') { e.preventDefault(); makeReport(); }
  });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (tab === 'chart') renderPanel(); }, 150); });
  if (native && native.onOpenPath) native.onOpenPath((content, path) => loadProject(content, path));

  // نسخه وب: کش آفلاین (Service Worker)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  HZ.init().then(() => { applyEdition(); markClean(); }, () => { toast('خطا در بارگذاری نقشه‌ها'); applyEdition(); markClean(); });
})();
