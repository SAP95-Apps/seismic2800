/* موتور محاسبات ضریب زلزله — آیین‌نامه ۲۸۰۰ ویرایش‌های پنجم و چهارم */
(function (root) {
  'use strict';
  const CODE = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.CODE;
  const { V5, V4 } = CODE;

  const r = (x, d = 3) => (x === null || x === undefined || isNaN(x)) ? '—' : Number(x).toFixed(d);
  const isNum = (x) => typeof x === 'number' && isFinite(x);

  // درون‌یابی خطی روی ستون‌های جدول، با ثابت ماندن مقدار در دو انتها
  function interp(cols, vals, x) {
    if (x <= cols[0]) return vals[0];
    if (x >= cols[cols.length - 1]) return vals[vals.length - 1];
    for (let i = 0; i < cols.length - 1; i++) {
      if (x >= cols[i] && x <= cols[i + 1]) {
        return vals[i] + (vals[i + 1] - vals[i]) * (x - cols[i]) / (cols[i + 1] - cols[i]);
      }
    }
    return vals[vals.length - 1];
  }

  function kExp(T) { return T <= 0.5 ? 1 : (T >= 2.5 ? 2 : 0.5 * T + 0.75); }

  // ============================= ویرایش پنجم =============================
  function v5Spectrum(T, p) {
    const { SDS, SD1, T0, Ts, TL } = p;
    if (T < T0) return SDS * (0.4 + 0.6 * T / T0);
    if (T <= Ts) return SDS;
    if (T <= TL) return SD1 / T;
    return SD1 * TL / (T * T);
  }
  function fmd(Tv) {
    if (Tv <= 0.2) return 1.0;
    if (Tv <= 1.0) return 1.0 + 0.375 * (Tv - 0.2);
    return 1.3;
  }
  // طیف قائم — بند ۲-۵-۲ ، روابط (۲-۴) تا (۲-۸)
  function v5Vertical(Tv, p) {
    const g = v5Spectrum(Tv, p) / fmd(Tv); // Sa/Fmd
    const Cv = p.Cv;
    if (Tv <= 0.025) return 0.65 * Cv * g;
    if (Tv <= 0.05) return 16 * Cv * g * (Tv - 0.025) + 0.65 * Cv * g;
    if (Tv <= 0.1) return 1.05 * Cv * g;
    if (Tv <= 2.0) return Math.max(1.05 * Cv * g * Math.sqrt(0.1 / Tv), 0.5 * g);
    return 0.5 * g;
  }

  function calcV5(inp) {
    const steps = [], warn = [], info = [];
    const out = { edition: 5, steps, warn, info };
    const imp = V5.importance.find(x => x.id === Number(inp.importance));
    const Ie = imp.Ie;
    out.Ie = Ie; out.impLabel = imp.label;
    const H = Number(inp.H);
    out.H = H;

    // ---- پارامترهای طیف ----
    let SDS, SD1, SMS, SM1, Fs = null, F1 = null;
    const Ss = Number(inp.Ss), S1 = Number(inp.S1);
    out.Ss = Ss; out.S1 = S1; out.site = inp.site;
    const special = inp.site === 'VI' || inp.useSpecial;
    if (special) {
      SDS = Number(inp.sSDS); SD1 = Number(inp.sSD1);
      SMS = 1.5 * SDS; SM1 = 1.5 * SD1;
      steps.push({ sec: 'spec', title: 'پارامترهای طیف ویژه ساختگاه', ref: 'بند ۲-۸-۳',
        expr: `SDS = ${r(SDS)} ، SD1 = ${r(SD1)} (ورود دستی از مطالعات ساختگاه)`, val: '' });
      if (inp.site === 'VI') warn.push('زمین نوع VI: استفاده از طیف ویژه ساختگاه الزامی است (بند ۲-۶-۴). مقادیر SDS و SD1 از گزارش مطالعات ساختگاه وارد شده است.');
    } else {
      Fs = interp(V5.FsCols, V5.Fs[inp.site], Ss);
      F1 = interp(V5.F1Cols, V5.F1[inp.site], S1);
      if (inp.site === 'I' && inp.vsMeasured) { Fs = 0.9; F1 = 0.9; }
      SMS = Fs * Ss; SM1 = F1 * S1;
      SDS = 2 / 3 * SMS; SD1 = 2 / 3 * SM1;
      steps.push({ sec: 'spec', title: 'شتاب طیفی زلزله بیشینه مورد نظر روی سنگ بستر', ref: 'بند ۲-۲ و پیوست ۱',
        expr: `Ss = ${r(Ss, 2)} g ، S1 = ${r(S1, 2)} g`, val: '' });
      steps.push({ sec: 'spec', title: 'ضریب تأثیر ساختگاه در بازه زمان تناوب کوتاه', ref: 'جدول ۲-۱',
        expr: inp.site === 'I' && inp.vsMeasured ? 'زمین نوع I با Vs اندازه‌گیری‌شده ⇒ Fs = 0.9' : `زمین نوع ${inp.site} ، Ss = ${r(Ss, 2)} ⇒ Fs (درون‌یابی خطی)`, val: `Fs = ${r(Fs)}` });
      steps.push({ sec: 'spec', title: 'ضریب تأثیر ساختگاه در زمان تناوب یک ثانیه', ref: 'جدول ۲-۲',
        expr: inp.site === 'I' && inp.vsMeasured ? 'زمین نوع I با Vs اندازه‌گیری‌شده ⇒ F1 = 0.9' : `زمین نوع ${inp.site} ، S1 = ${r(S1, 2)} ⇒ F1 (درون‌یابی خطی)`, val: `F1 = ${r(F1)}` });
      steps.push({ sec: 'spec', title: 'شتاب طیفی زلزله بیشینه در سطح زمین', ref: 'بند ۲-۳ ، رابطه (۲-۱)',
        expr: `SMS = Fs·Ss = ${r(Fs)} × ${r(Ss, 2)} ، SM1 = F1·S1 = ${r(F1)} × ${r(S1, 2)}`, val: `SMS = ${r(SMS)} ، SM1 = ${r(SM1)}` });
      steps.push({ sec: 'spec', title: 'شتاب طیفی زلزله طرح', ref: 'بند ۲-۴ ، رابطه (۲-۲)',
        expr: `SDS = ⅔·SMS = ⅔ × ${r(SMS)} ، SD1 = ⅔·SM1 = ⅔ × ${r(SM1)}`, val: `SDS = ${r(SDS)} ، SD1 = ${r(SD1)}` });
    }
    if (!special && (Ss > 1.4 || S1 > 0.6)) warn.push(`طبق بندهای پ۱-۲ و پ۱-۳ پیوست ۱، در صورت استفاده از نقشه‌های شتاب طیفی، Ss نباید بیشتر از 1.4 و S1 نباید بیشتر از 0.6 در نظر گرفته شود (مقادیر وارد شده: Ss = ${r(Ss, 2)} ، S1 = ${r(S1, 2)}). اگر این مقادیر از مطالعات ویژه ساختگاه است این هشدار را نادیده بگیرید.`);
    const T0 = 0.2 * SD1 / SDS, Ts = SD1 / SDS, TL = 6.0;
    const sp = { SDS, SD1, T0, Ts, TL };
    Object.assign(out, { Fs, F1, SMS, SM1, SDS, SD1, T0, Ts, TL, special });
    steps.push({ sec: 'spec', title: 'زمان‌های تناوب گوشه طیف', ref: 'بند ۲-۵',
      expr: `T0 = 0.2·SD1/SDS = 0.2 × ${r(SD1)} / ${r(SDS)} ، Ts = SD1/SDS ، TL = 6.0`, val: `T0 = ${r(T0)} s ، Ts = ${r(Ts)} s` });

    // ---- شتاب بیشینه زمین و طیف قائم ----
    const PGA = 0.4 * Ss;
    const Fpga = special ? null : (inp.site === 'I' && inp.vsMeasured ? 0.9 : interp(V5.FpgaCols, V5.Fpga[inp.site], PGA));
    out.PGA = PGA; out.Fpga = Fpga; out.PGAS = Fpga ? PGA * Fpga : null;
    if (!special) {
      steps.push({ sec: 'spec', title: 'شتاب بیشینه زمین', ref: 'بند ۲-۳-۱ و جدول ۲-۳',
        expr: `PGA = 0.4·Ss = ${r(PGA)} ، FPGA = ${r(Fpga)} ⇒ PGAS = PGA·FPGA`, val: `PGAS = ${r(out.PGAS)} g` });
      const Cv = interp(V5.CvCols, V5.Cv[inp.site], SMS);
      out.Cv = Cv; sp.Cv = Cv;
      steps.push({ sec: 'spec', title: 'ضریب اثرات ساختگاه برای طیف قائم', ref: 'بند ۲-۵-۲ و جدول ۲-۴',
        expr: `زمین نوع ${inp.site} ، SMS = ${r(SMS)} ⇒ Cv (درون‌یابی خطی)`, val: `Cv = ${r(Cv)}` });
    } else {
      out.Cv = null;
      info.push('در حالت طیف ویژه ساختگاه، طیف قائم باید از مطالعات ساختگاه تعیین شود و در این برنامه رسم نمی‌شود.');
    }
    out.sp = sp;

    // ---- گروه طراحی لرزه‌ای ----
    let SDC;
    const a = Ie * SDS, b = Ie * SD1, c = Ie * S1;
    const low = (a <= 0.75 && b <= 0.40);
    if (c > 0.6) SDC = 3;
    else if (low) SDC = imp.id === 1 ? 3 : (imp.id === 2 ? 2 : 1);
    else SDC = imp.id === 1 ? 3 : 2;
    out.SDC = SDC;
    steps.push({ sec: 'spec', title: 'گروه طراحی لرزه‌ای', ref: 'بند ۲-۷ و جدول ۲-۶',
      expr: `اهمیت ${imp.short} ؛ Ie·SDS = ${r(a)} ، Ie·SD1 = ${r(b)} ، Ie·S1 = ${r(c)}`, val: `SDC-${SDC}` });

    // ---- نیروی قائم زلزله ----
    out.Fvut = 0.2 * SDS;
    out.needFvuc = (Ss > 1.15 || S1 > 0.5);
    out.Fvuc = 0.65 * SDS;
    steps.push({ sec: 'spec', title: 'نیروی قائم ناشی از زلزله بر کل سازه', ref: 'بند ۳-۹-۵-۱ ، رابطه (۳-۱۵)',
      expr: `Fvut = 0.2·SDS·WD = 0.2 × ${r(SDS)} × WD`, val: `Fvut = ${r(out.Fvut)}·WD` });
    if (out.needFvuc) {
      steps.push({ sec: 'spec', title: 'نیروی قائم زلزله برای اعضای حساس', ref: 'بند ۳-۹-۵-۲ ، رابطه (۳-۱۶)',
        expr: `Ss > 1.15 یا S1 > 0.5 ⇒ Fvuc = 0.65·SDS·WD`, val: `Fvuc = ${r(out.Fvuc)}·WD` });
      info.push('چون Ss > 1.15 یا S1 > 0.5 است، برای تیرهای با دهانه بیش از ۱۵ متر، تیرهای تکیه‌گاه ستون، طره‌های بلندتر از ۲ متر و دال‌های تخت با دهانه بیش از ۱۰ متر، نیروی Fvuc = 0.65·SDS·WD نیز جداگانه کنترل شود (بند ۳-۹-۵-۲).');
    }
    info.push('همه تیرهای طره‌ای باید یک‌بار جداگانه برای نیروی قائم رو به بالای 0.2·WD بدون بارهای مرده، زنده و برف طراحی شوند (بند ۳-۹-۵-۳).');

    // ---- کنترل‌های طیف ویژه ----
    if (!special && (inp.site === 'IV' || inp.site === 'V')) {
      if (imp.id <= 2) info.push('ساختمان با اهمیت زیاد یا خیلی زیاد روی زمین نوع IV یا V: اگر مشمول تحلیل دینامیکی (بند ۳-۸) باشد، تهیه طیف ویژه ساختگاه الزامی است (بند ۲-۸-۱-۳-ب).');
      if (H > 50) info.push('ساختمان بلندتر از ۵۰ متر روی زمین نوع IV یا V: اگر مشمول تحلیل دینامیکی باشد، طیف ویژه ساختگاه الزامی است (بند ۲-۸-۱-۳-پ).');
    }
    if (H > 150) info.push('ارتفاع بیش از ۱۵۰ متر: در صورت تحلیل دینامیکی، طیف ویژه ساختگاه الزامی است (بند ۲-۸-۱-۳-الف).');
    if (H > 50 && (inp.site === 'II' || inp.site === 'III')) info.push('ساختمان بلندتر از ۵۰ متر روی زمین نوع II یا III: اگر ضخامت لایه خاک بیش از ۶۰ متر باشد و ساختمان مشمول تحلیل دینامیکی شود، طیف ویژه ساختگاه الزامی است (بند ۲-۸-۱-۳-ت).');

    // ---- محاسبات هر امتداد ----
    out.dirs = {};
    for (const d of ['X', 'Y']) {
      const di = inp.dir[d];
      const R = calcV5Dir(d, di, { Ie, H, SDS, SD1, S1, SDC, sp, imp, warn, info });
      out.dirs[d] = R;
    }

    // جدول طیف
    out.table = [];
    const tmax = Number(inp.tmax) || 6, dt = Number(inp.dt) || 0.02;
    for (let i = 0; ; i++) {
      const T = +(i * dt).toFixed(4);
      if (T > tmax + 1e-9) break;
      const row = { T, Sa: v5Spectrum(T, sp) };
      if (!special) { row.Sav = v5Vertical(T, sp); row.Fmd = fmd(T); }
      row.SaM = 1.5 * row.Sa;
      out.table.push(row);
    }
    return out;
  }

  function calcV5Dir(d, di, ctx) {
    const { Ie, H, SDS, SD1, S1, SDC, sp, imp, warn, info } = ctx;
    const steps = [];
    const sys0 = V5.systems.find(s => s.id === di.system);
    let sys = sys0;
    let [Ru, Om, Cd, ...hm] = sys.p;
    if (sys.custom) {
      Ru = Number(di.cRu); Om = Number(di.cOm); Cd = Number(di.cCd);
      hm = [Number(di.cHm), Number(di.cHm), Number(di.cHm)];
    }
    let coupledNote = false;
    if (sys.coupled && H < 18) {
      const alt = V5.systems.find(s => s.id === sys.coupled);
      [Ru, Om, Cd] = alt.p;
      coupledNote = true;
    }
    const Hm = hm[SDC - 1];
    const R = { d, sys: sys0, Ru, Om, Cd, Hm, steps };

    steps.push({ title: 'سیستم مقاوم لرزه‌ای و پارامترهای آن', ref: 'جدول ۳-۱',
      expr: `${sys0.label} — گروه SDC-${SDC}`, val: `Ru = ${Ru} ، Ω0 = ${Om} ، Cd = ${Cd} ، Hm = ${Hm === null ? 'غیرمجاز' : Hm + ' m'}` });
    if (coupledNote) {
      steps.push({ title: 'یادداشت [۱] جدول ۳-۱', ref: 'یادداشت ۱',
        expr: 'ارتفاع کمتر از ۱۸ متر ⇒ پارامترهای دیوار همبند مشابه دیوار برشی بتن‌آرمه ویژه', val: `Ru = ${Ru} ، Cd = ${Cd}` });
    }
    // کنترل ارتفاع
    R.hmOK = true;
    if (Hm === null) {
      R.hmOK = false;
      let msg = `امتداد ${d}: سیستم «${sys0.label}» در گروه طراحی لرزه‌ای ${SDC} مجاز نیست (جدول ۳-۱).`;
      if (sys0.note6 && SDC === 3) msg += ' استثنا: طبق یادداشت [۶] قاب خمشی فولادی متوسط در SDC-3 برای سازه یک‌طبقه تا ارتفاع ۱۵ متر با بام و دیوار سبک مجاز است.';
      if (sys0.note7) msg += ' استثنا: طبق یادداشت [۷] قاب خمشی فولادی معمولی در SDC-1 و 2 برای سازه یک‌طبقه تا ارتفاع ۲۰ متر با بام و دیوار سبک مجاز است.';
      warn.push(msg);
    } else if (isNum(Hm) && H > Hm) {
      R.hmOK = false;
      let msg = `امتداد ${d}: ارتفاع ساختمان (${H} m) از حداکثر ارتفاع مجاز سیستم (${Hm} m) بیشتر است (بند ۳-۴-۲-۴).`;
      if (sys0.n3 && SDC < 3 && H <= 70) msg += ' طبق یادداشت [۳] جدول ۳-۱، Hm می‌تواند به ۷۰ متر افزایش یابد مشروط بر نبود نامنظمی پیچشی شدید و سهم برش هر قاب حداکثر ۶۰٪.';
      warn.push(msg);
    }
    if (sys0.note2 && SDC === 2) info.push(`امتداد ${d}: یادداشت [۲] — دیوار برشی بتن‌آرمه معمولی در SDC-2 باید بدون بازشو، با طول نه کمتر از ارتفاع طبقه و تنش قائم حداکثر 0.15f'c باشد.`);
    if (sys0.note45) info.push(`امتداد ${d}: یادداشت‌های [۴] و [۵] — در قاب خمشی بتن‌آرمه متوسط حداقل بعد ستون ۳۰۰ mm و فاصله تنگ‌ها در نواحی بحرانی کمتر از min(6db، 150mm) (نه کمتر از 125mm)؛ در SDC-2 کنترل ستون قوی-تیر ضعیف الزامی است.`);

    // زمان تناوب
    const tt = V5.ttypes.find(x => x.id === di.ttype);
    const Temp = tt.a * Math.pow(H, tt.b);
    const Tan = isNum(di.Tan) && di.Tan > 0 ? di.Tan : null;
    let T;
    if (Tan !== null) T = Math.min(Tan, 1.4 * Temp);
    else T = Temp;
    Object.assign(R, { Temp, Tan, T, ttype: tt });
    steps.push({ title: 'زمان تناوب تجربی', ref: `بند ۳-۹-۲-۱ ، رابطه (${tt.eq})`,
      expr: `T = ${tt.a}·H^${tt.b} = ${tt.a} × ${r(H, 2)}^${tt.b}`, val: `T تجربی = ${r(Temp)} s` });
    if (Tan !== null) {
      steps.push({ title: 'زمان تناوب طراحی', ref: 'بند ۳-۹-۲ و تبصره ۲ بند ۳-۹-۲-۱',
        expr: `T = min( T تحلیلی ، 1.4·T تجربی ) = min( ${r(Tan)} ، ${r(1.4 * Temp)} )`, val: `T = ${r(T)} s` });
    } else {
      steps.push({ title: 'زمان تناوب طراحی', ref: 'بند ۳-۹-۲',
        expr: 'زمان تناوب تحلیلی وارد نشده ⇒ استفاده از رابطه تجربی', val: `T = ${r(T)} s` });
    }

    // ضریب زلزله
    const Sa = v5Spectrum(T, sp);
    const Cc = Sa / (Ru / Ie);
    let Cmin = Math.max(0.044 * SDS * Ie, 0.01);
    const cmin1 = Cmin;
    let cmin2 = null;
    if (S1 >= 0.6) { cmin2 = 0.5 * S1 / (Ru / Ie); Cmin = Math.max(Cmin, cmin2); }
    const C = Math.max(Cc, Cmin);
    let branch = T < sp.T0 ? 'T < T0' : (T <= sp.Ts ? 'T0 ≤ T ≤ Ts' : (T <= sp.TL ? 'Ts < T ≤ TL' : 'T > TL'));
    let saExpr = T < sp.T0 ? `Sa = SDS·(0.4 + 0.6·T/T0)` : (T <= sp.Ts ? 'Sa = SDS' : (T <= sp.TL ? `Sa = SD1/T = ${r(SD1)} / ${r(T)}` : `Sa = SD1·TL/T² `));
    steps.push({ title: 'شتاب طیفی طرح', ref: 'بند ۲-۵ ، رابطه (۲-۳)', expr: `${branch} ⇒ ${saExpr}`, val: `Sa = ${r(Sa, 4)} g` });
    steps.push({ title: 'ضریب زلزله', ref: 'بند ۳-۹-۱-۱ ، رابطه (۳-۲)',
      expr: `C = Sa / (Ru/Ie) = ${r(Sa, 4)} / (${Ru} / ${Ie})`, val: `C = ${r(Cc, 4)}` });
    steps.push({ title: 'ضریب زلزله حداقل', ref: 'بند ۳-۹-۱-۲ ، روابط (۳-۴) و (۳-۵)',
      expr: `Cmin = max(0.044·SDS·Ie ، 0.01) = ${r(cmin1, 4)}` + (cmin2 !== null ? ` ؛ S1 ≥ 0.6 ⇒ 0.5·S1/(Ru/Ie) = ${r(cmin2, 4)}` : ''), val: `Cmin = ${r(Cmin, 4)}` });

    // ضریب نامعینی
    let rho = 1.0;
    if (di.rho === 'no') rho = SDC === 3 ? 1.3 : 1.2;
    let Ceff, rhoUsed = rho, rhoNote;
    if (Cc >= Cmin) { Ceff = rho * Cc; rhoNote = 'C ≥ Cmin ⇒ ρ·C'; }
    else if (rho * Cc >= Cmin) { Ceff = rho * Cc; rhoNote = 'C < Cmin ولی ρ·C ≥ Cmin ⇒ کنترل برش پایه حداقل لازم نیست'; }
    else { Ceff = Cmin; rhoUsed = 1.0; rhoNote = rho > 1 ? 'ρ·C < Cmin ⇒ Cmin حاکم است و اعمال ρ ضرورت ندارد (تبصره بند ۳-۹-۱-۲)' : 'C < Cmin ⇒ Cmin حاکم است'; }
    Object.assign(R, { Sa, Cc, Cmin, cmin1, cmin2, C, rho, rhoUsed, Ceff, k: kExp(T) });
    steps.push({ title: 'ضریب نامعینی سازه ρ', ref: 'بند ۳-۵ و جدول ۳-۲',
      expr: di.rho === 'no' ? `نامعینی کافی نیست ⇒ SDC-${SDC} ⇒ ρ = ${rho}` : 'شرایط بند ۳-۵-۲ برقرار است ⇒ ρ = 1.0', val: `ρ = ${rho}` });
    steps.push({ title: 'ضریب زلزله طراحی (نیروی Eh)', ref: 'بند ۳-۹-۱-۲ و تبصره آن',
      expr: rhoNote, val: `C طراحی = ${r(Ceff, 4)}` });
    steps.push({ title: 'توان توزیع نیرو در ارتفاع', ref: 'بند ۳-۹-۳ ، رابطه (۳-۱۲)',
      expr: T <= 0.5 ? 'T ≤ 0.5 ⇒ k = 1' : (T >= 2.5 ? 'T ≥ 2.5 ⇒ k = 2' : `k = 0.5·T + 0.75 = 0.5 × ${r(T)} + 0.75`), val: `k = ${r(R.k)}` });

    // تغییر مکان
    const Td = Tan !== null ? Tan : T;
    const Sad = v5Spectrum(Td, sp);
    const Cdc = Sad / (Ru / Ie);
    const Cdrift = Math.max(Cdc, Cmin);
    Object.assign(R, { Td, Sad, Cdrift, kd: kExp(Td) });
    steps.push({ title: 'ضریب زلزله برای محاسبه تغییر مکان جانبی', ref: 'بندهای ۳-۱۲-۴ و ۳-۱۲-۵',
      expr: (Tan !== null ? `T تحلیلی بدون محدودیت 1.4 ⇒ T = ${r(Td)} ، Sa = ${r(Sad, 4)}` : `T = ${r(Td)} ، Sa = ${r(Sad, 4)}`) + ` ؛ C = max(Sa·Ie/Ru ، Cmin)`, val: `C تغییرمکان = ${r(Cdrift, 4)} ، k = ${r(R.kd)}` });

    // تغییر مکان مجاز
    let dr = (sys0.imf ? V5.driftIMF : V5.drift)[imp.id];
    let drExpr = `گروه اهمیت ${imp.id}` + (sys0.imf ? ' با قاب خمشی متوسط/معمولی (تبصره ۳)' : '');
    if (sys0.mf && rho > 1) { dr = dr / rho; drExpr += ` ؛ قاب خمشی مشمول ρ ⇒ Δa/ρ`; }
    R.driftLimit = dr;
    steps.push({ title: 'تغییر مکان جانبی نسبی مجاز طبقه', ref: 'بند ۳-۱۲-۳ و جدول ۳-۵',
      expr: drExpr + ` ؛ ΔM = Cd·Δeu/Ie = ${Cd}/${Ie}·Δeu`, val: `Δa = ${r(dr, 4)}·h` });
    if (sys0.masonry) info.push(`امتداد ${d}: برای دیوار برشی بنایی مسلح، تغییر مکان نسبی مجاز طبق مبحث هشتم تعیین شود (تبصره ۲ بند ۳-۱۲-۳).`);
    return R;
  }

  // ============================= ویرایش چهارم =============================
  function v4B1(T, p) {
    if (T < p.T0) return p.S0 + (p.S - p.S0 + 1) * (T / p.T0);
    if (T <= p.Ts) return 1 + p.S;
    return (1 + p.S) * (p.Ts / T);
  }
  function v4N(T, p, A) {
    const high = A >= 0.3;
    if (T < p.Ts) return 1;
    if (T > 4) return high ? 1.7 : 1.4;
    return (high ? 0.7 : 0.4) / (4 - p.Ts) * (T - p.Ts) + 1;
  }
  function v4B(T, p, A) { return v4B1(T, p) * v4N(T, p, A); }

  function calcV4(inp) {
    const steps = [], warn = [], info = [];
    const out = { edition: 4, steps, warn, info };
    const zone = V4.zones.find(z => z.id === inp.zone);
    const imp = V4.importance.find(x => x.id === Number(inp.importance));
    const A = zone.A, I = imp.I, H = Number(inp.H);
    const p = V4.siteParams(inp.site, A);
    Object.assign(out, { A, I, H, site: inp.site, zoneLabel: zone.label, impLabel: imp.label, sp: Object.assign({ A }, p) });
    steps.push({ sec: 'spec', title: 'نسبت شتاب مبنای طرح', ref: 'بند ۲-۲ و جدول ۲-۱', expr: zone.label, val: `A = ${A}` });
    steps.push({ sec: 'spec', title: 'ضریب اهمیت ساختمان', ref: 'بند ۳-۳-۴ و جدول ۳-۳', expr: imp.label, val: `I = ${I}` });
    steps.push({ sec: 'spec', title: 'پارامترهای طیف بازتاب', ref: 'جدول ۲-۲',
      expr: `زمین نوع ${inp.site}` + (inp.site === 'IV' ? (A >= 0.3 ? ' (پهنه زیاد/خیلی زیاد)' : ' (پهنه متوسط/کم)') : ''),
      val: `T0 = ${p.T0} ، Ts = ${p.Ts} ، S0 = ${p.S0} ، S = ${p.S}` });
    out.Fv = 0.6 * A * I; out.needFv = zone.id === 'VH';
    steps.push({ sec: 'spec', title: 'نیروی قائم ناشی از زلزله', ref: 'بند ۳-۳-۹ ، رابطه (۳-۱۰)',
      expr: `Fv = 0.6·A·I·Wp = 0.6 × ${A} × ${I} ⇒ ` + (out.needFv ? 'در پهنه خیلی زیاد برای کل سازه الزامی است' : 'فقط برای تیرهای با دهانه بیش از ۱۵ متر، بارهای متمرکز قابل توجه و بالکن‌ها و پیش‌آمدگی‌ها'),
      val: `Fv = ${r(out.Fv, 3)}·Wp` });
    const Cmin = 0.12 * A * I;
    out.Cmin = Cmin;
    out.dirs = {};
    for (const d of ['X', 'Y']) out.dirs[d] = calcV4Dir(d, inp.dir[d], { A, I, H, p, Cmin, imp, zone, warn, info });

    out.table = [];
    const tmax = Number(inp.tmax) || 6, dt = Number(inp.dt) || 0.02;
    for (let i = 0; ; i++) {
      const T = +(i * dt).toFixed(4);
      if (T > tmax + 1e-9) break;
      const B1 = v4B1(T, p), N = v4N(T, p, A);
      out.table.push({ T, B1, N, B: B1 * N, AB: A * B1 * N });
    }
    return out;
  }

  function calcV4Dir(d, di, ctx) {
    const { A, I, H, p, Cmin, imp, zone, warn } = ctx;
    const steps = [];
    const sys = V4.systems.find(s => s.id === di.system);
    let [Rr, Om, Cd, Hm] = sys.p;
    if (sys.custom) { Rr = Number(di.cRu); Om = Number(di.cOm); Cd = Number(di.cCd); Hm = Number(di.cHm); }
    const R = { d, sys, Ru: Rr, Om, Cd, Hm, steps };
    steps.push({ title: 'سیستم مقاوم لرزه‌ای و پارامترهای آن', ref: 'جدول ۳-۴',
      expr: sys.label, val: `R = ${Rr} ، Ω0 = ${Om} ، Cd = ${Cd} ، Hm = ${Hm === null ? '** (مشمول تبصره)' : Hm + ' m'}` });
    R.hmOK = true;
    const highZone = zone.id === 'VH' || zone.id === 'H';
    if (Hm === null && !sys.custom) {
      // یادداشت [۱] جدول ۳-۴
      if (imp.id <= 2) { R.hmOK = false; warn.push(`امتداد ${d}: استفاده از سیستم «${sys.label}» برای ساختمان‌های با اهمیت خیلی زیاد و زیاد مجاز نیست (یادداشت [۱] جدول ۳-۴).`); }
      else if (imp.id === 3 && highZone) { R.hmOK = false; warn.push(`امتداد ${d}: استفاده از سیستم «${sys.label}» برای ساختمان با اهمیت متوسط در پهنه‌های با خطر نسبی خیلی زیاد و زیاد مجاز نیست (یادداشت [۱] جدول ۳-۴).`); }
      else if (imp.id === 3 && H > 15) { R.hmOK = false; warn.push(`امتداد ${d}: ارتفاع سیستم «${sys.label}» برای اهمیت متوسط در این پهنه به ۱۵ متر محدود است (یادداشت [۱] جدول ۳-۴).`); }
    } else if (Hm !== null && H > Hm) { R.hmOK = false; warn.push(`امتداد ${d}: ارتفاع ساختمان (${H} m) از حداکثر ارتفاع مجاز سیستم (${Hm} m) بیشتر است (بند ۳-۳-۵-۲).`); }
    if (!sys.custom && zone.id === 'VH' && imp.id === 1 && !/ویژه/.test(sys.label))
      warn.push(`امتداد ${d}: در پهنه با خطر نسبی خیلی زیاد، ساختمان‌های با اهمیت خیلی زیاد فقط باید از سیستم‌های «ویژه» استفاده کنند (بند ۳-۳-۵-۳).`);
    if (!sys.custom && H > 50 && !(sys.id === 'C1' || sys.id === 'C4' || sys.g === 'D'))
      warn.push(`امتداد ${d}: در ساختمان‌های بلندتر از ۵۰ متر (یا بیش از ۱۵ طبقه) استفاده از قاب خمشی ویژه یا سیستم دوگانه الزامی است (بند ۳-۳-۵-۴).`);

    const tt = V4.ttypes.find(x => x.id === di.ttype);
    const Temp = tt.a * Math.pow(H, tt.b);
    const Tan = isNum(di.Tan) && di.Tan > 0 ? di.Tan : null;
    const T = Tan !== null ? Math.max(Math.min(1.25 * Temp, Tan), Temp) : Temp;
    Object.assign(R, { Temp, Tan, T, ttype: tt });
    const aShow = tt.id.endsWith('_inf') ? `0.8 × ${(tt.a / 0.8).toFixed(2)}` : `${tt.a}`;
    steps.push({ title: 'زمان تناوب تجربی', ref: 'بند ۳-۳-۳-۱', expr: `T = ${aShow}·H^${tt.b} = ${aShow} × ${r(H, 2)}^${tt.b}`, val: `T تجربی = ${r(Temp)} s` });
    steps.push({ title: 'زمان تناوب طراحی', ref: 'تبصره بند ۳-۳-۳-۱',
      expr: Tan !== null ? `T = max( T تجربی ، min( 1.25·T تجربی ، T تحلیلی ) ) = max( ${r(Temp)} ، min( ${r(1.25 * Temp)} ، ${r(Tan)} ) )` : 'زمان تناوب تحلیلی وارد نشده ⇒ T = T تجربی', val: `T = ${r(T)} s` });

    const B1 = v4B1(T, p), N = v4N(T, p, A), B = B1 * N;
    const Cc = A * B * I / Rr;
    const C = Math.max(Cc, Cmin);
    Object.assign(R, { B1, N, B, Cc, Cmin, C, Ceff: C, k: kExp(T) });
    steps.push({ title: 'ضریب شکل طیف B1', ref: 'بند ۲-۳-۱ ، رابطه (۲-۲)',
      expr: T < p.T0 ? `T < T0 ⇒ B1 = S0 + (S − S0 + 1)·T/T0` : (T <= p.Ts ? 'T0 ≤ T ≤ Ts ⇒ B1 = S + 1' : `T > Ts ⇒ B1 = (S + 1)·(Ts/T) = ${p.S + 1} × ${p.Ts}/${r(T)}`), val: `B1 = ${r(B1, 4)}` });
    steps.push({ title: 'ضریب اصلاح طیف N', ref: 'بند ۲-۳-۲',
      expr: T < p.Ts ? 'T < Ts ⇒ N = 1' : (T > 4 ? `T > 4 ⇒ N = ${A >= 0.3 ? 1.7 : 1.4}` : `N = ${A >= 0.3 ? 0.7 : 0.4}/(4 − Ts)·(T − Ts) + 1`), val: `N = ${r(N, 4)}` });
    steps.push({ title: 'ضریب بازتاب ساختمان', ref: 'بند ۲-۳ ، رابطه (۲-۱)', expr: `B = B1·N = ${r(B1, 4)} × ${r(N, 4)}`, val: `B = ${r(B, 4)}` });
    steps.push({ title: 'ضریب زلزله', ref: 'بند ۳-۳-۱ ، رابطه (۳-۲)',
      expr: `C = A·B·I/R = ${A} × ${r(B, 4)} × ${I} / ${Rr}`, val: `C = ${r(Cc, 4)}` });
    steps.push({ title: 'ضریب زلزله حداقل', ref: 'بند ۳-۳-۱ ، رابطه (۳-۳)',
      expr: `Cmin = 0.12·A·I = 0.12 × ${A} × ${I}`, val: `Cmin = ${r(Cmin, 4)}` });
    steps.push({ title: 'ضریب زلزله طراحی', ref: 'بند ۳-۳-۱', expr: Cc >= Cmin ? 'C ≥ Cmin' : 'C < Cmin ⇒ Cmin حاکم است', val: `C طراحی = ${r(C, 4)}` });
    steps.push({ title: 'توان توزیع نیرو در ارتفاع', ref: 'بند ۳-۳-۶ ، رابطه (۳-۷)',
      expr: T <= 0.5 ? 'T ≤ 0.5 ⇒ k = 1' : (T >= 2.5 ? 'T ≥ 2.5 ⇒ k = 2' : `k = 0.5·T + 0.75`), val: `k = ${r(R.k)}` });

    // کنترل تغییر مکان — بند ۳-۵-۳
    let Td = T, Bd = B, note;
    if (Tan !== null && I < 1.4) {
      Td = Tan;
      Bd = Math.min(v4B(Tan, p, A), B);
      note = `I < 1.4 ⇒ T تحلیلی بدون محدودیت 1.25 ⇒ T = ${r(Tan)} ، B = min(B(T تحلیلی) ، B طراحی) = ${r(Bd, 4)}`;
    } else if (Tan !== null) {
      note = 'ساختمان با اهمیت خیلی زیاد: استفاده از زمان تناوب تحلیلی بدون محدودیت مجاز نیست ⇒ همان ضریب طراحی';
      warn.push(`امتداد ${d}: برای ساختمان با اهمیت خیلی زیاد، کنترل تغییر مکان با همان زمان تناوب طراحی انجام می‌شود (بند ۳-۵-۳).`);
    } else note = 'زمان تناوب تحلیلی وارد نشده ⇒ همان ضریب طراحی';
    const Cdrift = Math.max(A * Bd * I / Rr, Cmin);
    Object.assign(R, { Td, Bd, Cdrift, kd: kExp(Td) });
    steps.push({ title: 'ضریب زلزله برای کنترل تغییر مکان', ref: 'بند ۳-۵-۳', expr: note, val: `C تغییرمکان = ${r(Cdrift, 4)} ، k = ${r(R.kd)}` });
    return R;
  }

  // متن ترکیبی فارسی/لاتین: جهت پاراگراف از اولین حرف قوی تعیین می‌شود؛
  // در سطرهای چپ‌به‌راست، هر عبارت فارسی جدا (isolate) می‌شود تا اعداد کنار آن جابه‌جا نشوند.
  function mixed(text) {
    const s = String(text ?? '');
    const e = s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const m = s.match(/[A-Za-z\u0600-\u06FF]/);
    const rtl = m && /[\u0600-\u06FF]/.test(m[0]);
    if (rtl) return `<span dir="rtl">${e}</span>`;
    return `<span dir="ltr">${e.replace(/[\u0600-\u06FF][\u0600-\u06FF\u200c\u00a0 ]*[\u0600-\u06FF]|[\u0600-\u06FF]/g, x => `<bdi dir="rtl">${x}</bdi>`)}</span>`;
  }

  const api = { mixed, calcV5, calcV4, v5Spectrum, v5Vertical, fmd, v4B1, v4N, v4B, interp, kExp, fmt: r };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CALC = api;
})(typeof window !== 'undefined' ? window : globalThis);
