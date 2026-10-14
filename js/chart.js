/* نمودار خطی SVG سبک و بدون وابستگی */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  function niceStep(range, target) {
    const raw = range / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const s = n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10;
    return s * mag;
  }
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* opts: { width, height, series:[{name,color,points,dash,width}], markers:[{x,label,color}],
            xlabel, ylabel, interactive, ymin } */
  function render(container, opts) {
    container.innerHTML = '';
    const W = opts.width || container.clientWidth || 760;
    const H = opts.height || 360;
    const m = { l: 58, r: 18, t: 18, b: 46 };
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'chart-svg', direction: 'ltr' });
    svg.style.fontFamily = 'Vazirmatn, Tahoma, sans-serif';
    container.appendChild(svg);

    const all = opts.series.flatMap(s => s.points);
    const xmax = Math.max(...all.map(p => p[0]));
    let ymax = Math.max(...all.map(p => p[1])) * 1.1;
    if (!(ymax > 0)) ymax = 1;
    const xs = niceStep(xmax, 8), ys = niceStep(ymax, 6);
    const X1 = Math.ceil(xmax / xs) * xs, Y1 = Math.ceil(ymax / ys) * ys;
    const px = x => m.l + (x / X1) * (W - m.l - m.r);
    const py = y => H - m.b - (y / Y1) * (H - m.t - m.b);

    // شبکه
    const grid = el('g', { class: 'grid' }, svg);
    for (let x = 0; x <= X1 + 1e-9; x += xs) {
      el('line', { x1: px(x), x2: px(x), y1: m.t, y2: H - m.b, stroke: 'var(--grid, #e5e7eb)', 'stroke-width': 1 }, grid);
      const t = el('text', { x: px(x), y: H - m.b + 18, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--muted, #6b7280)' }, grid);
      t.textContent = +x.toFixed(2);
    }
    for (let y = 0; y <= Y1 + 1e-9; y += ys) {
      el('line', { x1: m.l, x2: W - m.r, y1: py(y), y2: py(y), stroke: 'var(--grid, #e5e7eb)', 'stroke-width': 1 }, grid);
      const t = el('text', { x: m.l - 8, y: py(y) + 4, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--muted, #6b7280)' }, grid);
      t.textContent = +y.toFixed(3);
    }
    el('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: 'var(--axis, #9ca3af)' }, svg);
    el('line', { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b, stroke: 'var(--axis, #9ca3af)' }, svg);
    if (opts.xlabel) { const t = el('text', { x: (m.l + W - m.r) / 2, y: H - 8, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink2, #374151)' }, svg); t.textContent = opts.xlabel; }
    if (opts.ylabel) { const t = el('text', { x: 14, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--ink2, #374151)', transform: `rotate(-90 14 ${(m.t + H - m.b) / 2})` }, svg); t.textContent = opts.ylabel; }

    // نشانگرهای زمان تناوب
    (opts.markers || []).forEach((mk, i) => {
      if (!(mk.x > 0) || mk.x > X1) return;
      el('line', { x1: px(mk.x), x2: px(mk.x), y1: m.t, y2: H - m.b, stroke: mk.color, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }, svg);
      const ty = m.t + 12 + i * 16;
      const t = el('text', { x: px(mk.x) + 5, y: ty, 'font-size': 11, fill: mk.color, 'font-weight': 600 }, svg);
      t.textContent = mk.label;
    });

    // سری‌ها
    opts.series.forEach(s => {
      const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join('');
      el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': s.width || 2.2, 'stroke-dasharray': s.dash || '', 'stroke-linejoin': 'round' }, svg);
    });
    // نقاط روی منحنی (مقادیر طراحی)
    (opts.dots || []).forEach(dt => {
      el('circle', { cx: px(dt.x), cy: py(dt.y), r: 4.5, fill: '#fff', stroke: dt.color, 'stroke-width': 2.2 }, svg);
    });

    // راهنما
    const lg = el('g', {}, svg);
    let lx = W - m.r - 8;
    opts.series.slice().reverse().forEach(s => {
      const t = el('text', { x: lx, y: m.t + 14, 'text-anchor': 'end', 'font-size': 12, fill: 'var(--ink2, #374151)' }, lg);
      t.textContent = s.name;
      const w = s.name.length * 6.6 + 8;
      el('line', { x1: lx - w - 22, x2: lx - w - 4, y1: m.t + 10, y2: m.t + 10, stroke: s.color, 'stroke-width': 2.5, 'stroke-dasharray': s.dash || '' }, lg);
      lx -= w + 36;
    });

    if (opts.interactive !== false) {
      const cross = el('line', { y1: m.t, y2: H - m.b, stroke: 'var(--ink2, #374151)', 'stroke-width': 1, opacity: 0 }, svg);
      const tipG = el('g', { opacity: 0 }, svg);
      const tipR = el('rect', { rx: 6, fill: 'var(--tip, #111827)', opacity: 0.92 }, tipG);
      const tipT = el('text', { 'font-size': 12, fill: '#fff' }, tipG);
      const hit = el('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent' }, svg);
      hit.addEventListener('mousemove', ev => {
        const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
        const xv = (loc.x - m.l) / (W - m.l - m.r) * X1;
        const lines = [`T = ${xv.toFixed(2)} s`];
        opts.series.forEach(s => {
          let best = s.points[0];
          for (const p of s.points) if (Math.abs(p[0] - xv) < Math.abs(best[0] - xv)) best = p;
          lines.push(`${s.name}: ${best[1].toFixed(4)}`);
        });
        cross.setAttribute('x1', loc.x); cross.setAttribute('x2', loc.x); cross.setAttribute('opacity', 0.5);
        tipT.innerHTML = '';
        lines.forEach((ln, i) => { const ts = el('tspan', { x: 0, dy: i ? 16 : 0 }, tipT); ts.textContent = ln; });
        const bb = tipT.getBBox();
        let tx = loc.x + 12; if (tx + bb.width + 16 > W) tx = loc.x - bb.width - 28;
        tipT.setAttribute('transform', `translate(${tx + 8},${m.t + 22})`);
        tipR.setAttribute('x', tx); tipR.setAttribute('y', m.t + 6);
        tipR.setAttribute('width', bb.width + 16); tipR.setAttribute('height', bb.height + 12);
        tipG.setAttribute('opacity', 1);
      });
      hit.addEventListener('mouseleave', () => { cross.setAttribute('opacity', 0); tipG.setAttribute('opacity', 0); });
    }
    return svg;
  }

  root.CHART = { render };
})(window);
