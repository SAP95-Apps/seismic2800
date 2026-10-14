/* خواندن Ss و S1 از نقشه‌های رقومی‌شده پیوست ۱ + انتخاب نقطه روی نقشه */
(function (root) {
  'use strict';
  const H = root.HAZARD;
  const grids = {};
  let ready = null;

  function loadGrid(name) {
    return new Promise((res, rej) => {
      const g = H.grids[name];
      const im = new Image();
      im.onload = () => {
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const cx = c.getContext('2d'); cx.drawImage(im, 0, 0);
        const d = cx.getImageData(0, 0, im.width, im.height).data;
        const a = new Uint8Array(im.width * im.height);
        for (let i = 0; i < a.length; i++) a[i] = d[i * 4];
        grids[name] = { a, w: im.width, h: im.height, base: g.base, step: g.step };
        res();
      };
      im.onerror = rej;
      im.src = 'data:image/png;base64,' + g.png;
    });
  }
  function init() { if (!ready) ready = Promise.all([loadGrid('ss'), loadGrid('s1')]); return ready; }

  // درون‌یابی دوخطی؛ اگر گوشه‌ای خارج از نقشه بود، میانگین گوشه‌های معتبر
  function sample(name, lat, lon) {
    const g = grids[name]; if (!g) return null;
    const m = H.meta;
    const fx = (lon - m.lon0) / m.d, fy = (m.lat1 - lat) / m.d;
    if (fx < 0 || fy < 0 || fx > g.w - 1 || fy > g.h - 1) return null;
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(x0 + 1, g.w - 1), y1 = Math.min(y0 + 1, g.h - 1);
    const tx = fx - x0, ty = fy - y0;
    const pts = [[x0, y0, (1 - tx) * (1 - ty)], [x1, y0, tx * (1 - ty)], [x0, y1, (1 - tx) * ty], [x1, y1, tx * ty]];
    let s = 0, w = 0;
    for (const [x, y, wt] of pts) { const c = g.a[y * g.w + x]; if (c !== 255) { s += (g.base + c * g.step) * wt; w += wt; } }
    if (w < 0.25) return null;
    return s / w;
  }
  function lookup(lat, lon) {
    const ss = sample('ss', lat, lon), s1 = sample('s1', lat, lon);
    if (ss === null || s1 === null) return null;
    return { ss: Math.min(ss, 1.4), s1: Math.min(s1, 0.6) };
  }

  const cityLabel = c => `${c.p} — ${c.n}`;
  function findCity(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    return H.cities.find(c => cityLabel(c) === t) || H.cities.find(c => `${c.n} — ${c.p}` === t) || H.cities.find(c => c.n === t) || null; // قالب قدیمی «شهر — استان» هم پذیرفته می‌شود
  }

  // ---------- پنجره انتخاب روی نقشه ----------
  function openPicker(cur, onPick) {
    const m = H.meta.img;
    let which = 'ss';
    const ov = document.createElement('div');
    ov.className = 'mp-ov';
    ov.innerHTML = `
      <div class="mp-box" role="dialog" aria-label="انتخاب محل روی نقشه">
        <div class="mp-head">
          <b>انتخاب محل پروژه روی نقشه</b>
          <div class="seg2"><button data-w="ss" class="on">نقشه Ss</button><button data-w="s1">نقشه S1</button></div>
          <span class="mp-read" id="mpRead">نشانگر را روی نقشه ببرید</span>
          <button class="mp-x" title="بستن">✕</button>
        </div>
        <div class="mp-scroll"><div class="mp-wrap"><img class="mp-img" alt="نقشه پهنه‌بندی"><div class="mp-pin"></div></div></div>
        <div class="mp-foot">روی محل پروژه کلیک کنید. نقشه‌ها: پیوست ۱ ویرایش پنجم (اسفند ۱۴۰۴). دقت مکانی حدود ۰٫۰۲ درجه.</div>
      </div>`;
    document.body.appendChild(ov);
    const img = ov.querySelector('.mp-img'), pin = ov.querySelector('.mp-pin'), rd = ov.querySelector('#mpRead');
    const setSrc = () => { img.src = `maps/map-${which}.jpg`; };
    setSrc();
    const toLL = (ev) => {
      const r = img.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width * m.w, py = (ev.clientY - r.top) / r.height * m.h;
      return { lon: 45 + (px - m.x0) / m.pxlon, lat: 39 - (py - m.y0) / m.pxlat };
    };
    const place = (lat, lon) => {
      if (!isFinite(lat) || !isFinite(lon)) { pin.style.display = 'none'; return; }
      pin.style.display = 'block';
      pin.style.left = ((m.x0 + (lon - 45) * m.pxlon) / m.w * 100) + '%';
      pin.style.top = ((m.y0 + (39 - lat) * m.pxlat) / m.h * 100) + '%';
    };
    img.onload = () => {
      place(cur.lat, cur.lon);
      if (isFinite(cur.lat)) { const sc = ov.querySelector('.mp-scroll'); sc.scrollTop = pin.offsetTop - sc.clientHeight / 2; sc.scrollLeft = pin.offsetLeft - sc.clientWidth / 2; }
    };
    img.addEventListener('mousemove', ev => {
      const { lat, lon } = toLL(ev); const v = lookup(lat, lon);
      rd.textContent = `عرض ${lat.toFixed(3)}° ، طول ${lon.toFixed(3)}°` + (v ? `  —  Ss = ${v.ss.toFixed(3)} ، S1 = ${v.s1.toFixed(3)}` : '  —  خارج از محدوده نقشه');
    });
    img.addEventListener('click', ev => {
      const { lat, lon } = toLL(ev);
      if (!lookup(lat, lon)) { rd.textContent = 'این نقطه خارج از محدوده نقشه ایران است'; return; }
      place(lat, lon); onPick(+lat.toFixed(4), +lon.toFixed(4)); setTimeout(close, 250);
    });
    ov.querySelectorAll('.seg2 button').forEach(b => b.addEventListener('click', () => {
      which = b.dataset.w; ov.querySelectorAll('.seg2 button').forEach(x => x.classList.toggle('on', x === b)); setSrc();
    }));
    const close = () => { ov.remove(); document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc);
    ov.querySelector('.mp-x').addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
  }

  const provinces = [...new Set(H.cities.map(c => c.p))].sort((a, b) => a.localeCompare(b, 'fa'));
  root.HZ = { init, lookup, findCity, cityLabel, cities: H.cities, provinces, openPicker };
})(window);
