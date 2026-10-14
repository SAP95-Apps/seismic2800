/* پل اندروید: اگر برنامه داخل اپ اندروید اجرا شود، همان رابط window.native نسخه ویندوزی را فراهم می‌کند */
(function () {
  'use strict';
  const A = window.AndroidNative;
  if (!A) return;
  document.documentElement.classList.add('android');
  const cbs = {}; let seq = 0;
  window.__androidCb = (id, val) => { const f = cbs[id]; delete cbs[id]; if (f) f(val); };
  const call = (fn, ...args) => new Promise(res => { const id = ++seq; cbs[id] = res; A[fn](id, ...args); });
  const b64utf8 = s => { const b = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(bin); };
  const mimeOf = n => /\.xlsx$/i.test(n) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : /\.txt$/i.test(n) ? 'text/plain' : /\.pdf$/i.test(n) ? 'application/pdf' : 'application/octet-stream';

  window.native = {
    saveFile: async o => (await call('saveFile', o.name, o.base64 || b64utf8(o.content || ''), mimeOf(o.name), o.path || '')) || null,
    openFile: async () => { const r = await call('openFile'); return r ? JSON.parse(r) : null; },
    savePDF: async o => { A.printHtml(o.html, String(o.name || 'report').replace(/\.pdf$/i, '')); return o.name; },
    onOpenPath: cb => { window.__androidOpen = cb; },
    onCloseRequest: cb => { window.__androidClose = cb; },
    confirmClose: () => A.exit(),
  };

  // دکمه «برگشت» گوشی
  window.__androidBackPress = () => {
    if (document.querySelector('.dlg-ov')) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return; }
    const mp = document.querySelector('.mp-ov'); if (mp) { const x = mp.querySelector('.mp-x'); if (x) x.click(); else mp.remove(); return; }
    if (document.body.classList.contains('m-out')) { const b = document.querySelector('#mnav [data-m="in"]'); if (b) b.click(); return; }
    if (window.__androidClose) window.__androidClose(); else A.exit();
  };
})();
