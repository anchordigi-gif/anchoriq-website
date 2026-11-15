// Page component for index (design export logic, unchanged). Rendered by assets/page.js.
window.AIQ_PAGE = function (DCLogic) {
const TOUR = [["Business data is everywhere", "", "", "Ad platforms, a CRM, portals and spreadsheets each tell part of the story."], ["Meet AnchorIQ", "assets/demo/home.jpg", "AnchorIQ Home screen, sample data", "One home screen for each role, starting with business results."], ["One connected view", "assets/demo/overview.jpg", "AnchorIQ Overview screen, sample data", "Total leads, the qualified share and a tile for every stage."], ["Understand every lead", "assets/demo/all-leads.jpg", "AnchorIQ All leads screen, sample data", "Search any lead and see the stage it came from and the stage it is in."], ["Measure what matters", "assets/demo/campaigns.jpg", "AnchorIQ Campaigns screen, sample data", "Campaigns judged by qualified leads and wins, not by clicks."], ["Manage teams and operations", "assets/demo/my-day.jpg", "AnchorIQ My day screen, sample data", "A daily queue where every lead has a score and a reason."], ["Make better decisions", "assets/demo/executive-summary.jpg", "AnchorIQ Executive summary screen, sample data", "Headline KPIs and the key changes, written as sentences."], ["Demos open soon", "", "", "See it on a call, with your own questions, once requests open."]];
// Same-origin form handler (server/forms.mjs): POST /api/forms/demo or /api/forms/waitlist. Success is shown only after a 2xx, which the handler sends once the enquiry is stored.
// Enquiries are open only when assets/site-config.js says so (tools/enquiries-mode.py); the server has its own switch (FORMS_OPEN).
const OPEN = window.AIQ_ENQUIRIES_OPEN === true;
const FORM_ENDPOINT = '/api/forms/demo';
class Component extends DCLogic {
  state = { series: 'leads', hovRow: -1, queue: 0, open: -1, tour: 0, tourPlay: true, q: '', ai: 0, shot: 0, step: 0, hov: -1, metric: 'cpl', cat: 'all', f: { website: '', name: '', email: '', company: '', industry: '', size: '', challenge: '', message: '' }, err: {}, sent: false, sending: false, fail: '' };
  setRoot = (el) => { this.root = el; };
  setVideoCanvas = (el) => { this.vidCv = el; };
  setHeroCanvas = (el) => { this.heroCv = el; };
  setHeroImg = (el) => { this.heroImg = el; };
  setTour = (el) => { this.tourEl = el; };
  tourStart = () => { clearInterval(this.tourT); this.tourT = setInterval(() => { if (this.dead || !this.tourVis || !this.state.tourPlay) return; this.setState({ tour: (this.state.tour + 1) % TOUR.length }); }, 5000); };
  tourPick = (i) => { this.setState({ tour: i }); this.tourStart(); };
  tourToggle = () => { this.setState({ tourPlay: !this.state.tourPlay }); this.tourStart(); };
  ptr = { x: 0.7, y: 0.5, on: false, amt: 0 };
  tries = 0;

  componentDidMount() {
    this.reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.boot();
  }
  boot = () => {
    if (this.dead) return;
    if (this.root && !this.stepsOn && window.IntersectionObserver) { this.stepsOn = true; try { this.initSteps(); } catch (e) { console.error(e); } }
    if (window.THREE && this.heroCv && !this.heroOn) { this.heroOn = true; try { this.initHero(); } catch (e) { console.error(e); } }
    if (this.ctaCv && !this.ctaOn) { this.ctaOn = true; try { this.initLines2(this.ctaCv, this.bp, '224,40,223', 1.3, true); } catch (e) { console.error(e); } }
    if (this.tourEl && !this.tourOn) { this.tourOn = true; this.tourVis = true; if (this.reduce) this.setState({ tourPlay: false }); if (window.IntersectionObserver) { this.tourVis = false; const io = new IntersectionObserver((es) => { this.tourVis = es[0].isIntersecting; }, { threshold: 0.4 }); io.observe(this.tourEl); this.obs = (this.obs || []).concat([io]); } this.tourStart(); }
    if (this.vidCv && !this.loopOn) { this.loopOn = true; try { this.initLines(); } catch (e) { console.error(e); } }
    if (window.anime && this.root && !this.animeOn) { this.animeOn = true; try { this.initAnime(); } catch (e) { console.error(e); } }
    if (this.root && !this.copyOn) { this.copyOn = true; try { this.initCopySync(); } catch (e) { console.error(e); } }
    if (!(this.stepsOn && this.heroOn && this.loopOn && this.animeOn) && this.tries++ < 60) this.bootT = setTimeout(this.boot, 150);
  };
  componentWillUnmount() { this.dead = true; clearInterval(this.tourT); clearTimeout(this.bootT); cancelAnimationFrame(this.raf); cancelAnimationFrame(this.hraf); cancelAnimationFrame(this.lraf); if (this.hren) this.hren.dispose(); (this.obs || []).forEach((o) => o.disconnect()); if (this.copyOff) this.copyOff(); }

  initSteps() {
    const els = Array.prototype.slice.call(this.root.querySelectorAll('[data-step]'));
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      const i = parseInt(en.target.getAttribute('data-step'), 10);
      if (i !== this.state.step) this.setState({ step: i });
    }), { rootMargin: '-45% 0px -45% 0px' });
    els.forEach((el) => io.observe(el));
    this.obs = (this.obs || []).concat([io]);
  }

  initHero() {
    const T = window.THREE, cv = this.heroCv;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ren = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); ren.setPixelRatio(dpr); this.hren = ren;
    const scene = new T.Scene(); scene.fog = new T.Fog(0x0A0B0D, 16, 62);
    const cam = new T.PerspectiveCamera(46, 1, 0.1, 200);
    const NX = 190, NZ = 74, S = 0.42, N = NX * NZ;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const pts = new T.Points(geo, new T.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true }));
    scene.add(pts);
    if (this.heroImg) this.heroImg.style.display = 'none';
    let vis = true;
    if (window.IntersectionObserver) { const io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; }); io.observe(cv); this.obs = (this.obs || []).concat([io]); }
    const draw = (t) => {
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      const p = this.ptr; p.amt += ((p.on ? 1 : 0) - p.amt) * 0.06;
      const px = (p.x - 0.5) * NX * S * 0.9 + 6, pz = (p.y - 0.5) * NZ * S * 1.1;
      let k = 0;
      for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
        const x = (i - NX / 2) * S + 6, z = (j - NZ / 2) * S;
        const d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
        const bump = Math.exp(-d2 / 22) * p.amt;
        const y = Math.sin(x * 0.2 + t) * 1.5 + Math.cos(z * 0.28 + t * 0.8) * 1.0 + Math.sin((x + z) * 0.11 - t * 0.6) * 1.7 + bump * 3.4;
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
        const b = Math.min(1, Math.max(0, (y + 3.6) / 8.5)), g = 0.16 + 0.7 * b, m = Math.min(1, bump * 1.3);
        col[k] = g + (0.88 - g) * m; col[k + 1] = g + (0.2 - g) * m; col[k + 2] = g + (0.9 - g) * m;
        k += 3;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
      cam.position.set(4 + (p.x - 0.5) * 3, 9.5 - (p.y - 0.5) * 2, 27); cam.lookAt(8, 0.5, 0);
      ren.render(scene, cam);
    };
    const tick = (ms) => { if (this.dead) return; if (vis) draw(this.reduce ? 1.2 : ms * 0.0004); if (!this.reduce) this.hraf = requestAnimationFrame(tick); };
    this.hraf = requestAnimationFrame(tick);
  }

  heroMove = (e) => { const r = e.currentTarget.getBoundingClientRect(); this.ptr.x = (e.clientX - r.left) / r.width; this.ptr.y = Math.min(1, (e.clientY - r.top) / 900); this.ptr.on = true; };
  heroLeave = () => { this.ptr.on = false; };
  bp = { x: 0.5, y: 0.5, on: false, amt: 0 };
  setCtaCanvas = (el) => { this.ctaCv = el; };
  ctaMove = (e) => { const el = e.currentTarget, r = el.getBoundingClientRect(); this.bp.x = (e.clientX - r.left) / r.width; this.bp.y = (e.clientY - r.top) / r.height; this.bp.on = true; el.style.setProperty('--cx', (this.bp.x * 100).toFixed(1) + '%'); el.style.setProperty('--cy', (this.bp.y * 100).toFixed(1) + '%'); };
  ctaLeave = () => { this.bp.on = false; };
  initLines2(cv, p, tint, base, ribbon) {
    const ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let vis = true, ph = 0.6, last = 0;
    if (window.IntersectionObserver) { const io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; }); io.observe(cv); this.obs = (this.obs || []).concat([io]); }
    const RB = [[0.34, 3.1, 0.9, 0.0, 0.2, 4.4], [0.56, 2.3, -0.7, 1.7, 0.24, 3.1], [0.76, 3.8, 0.6, 3.4, 0.16, 5.2]];
    const draw = (ms) => {
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      p.amt += ((p.on ? 1 : 0) - p.amt) * 0.07;
      const dt = Math.min(50, Math.max(0, ms - last)); last = ms; ph += dt * 0.00035 * (1 + p.amt * 1.8);
      const px = p.x * w, py = p.y * h, R = Math.max(160, w * 0.16);
      const push = (x, y) => { const dx = x - px, dy = y - py; const g = Math.exp(-(dx * dx) / (R * R)) * Math.exp(-(dy * dy) / (R * R * 0.6)) * p.amt; return y + (dy / (Math.abs(dy) + 26)) * g * R * 0.36; };
      if (ribbon) {
        ctx.globalCompositeOperation = 'lighter';
        const gr = ctx.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, 'rgb(150,152,162)'); gr.addColorStop(0.5, 'rgb(190,192,202)'); gr.addColorStop(0.82, 'rgb(150,120,230)'); gr.addColorStop(1, 'rgb(130,132,142)');
        ctx.strokeStyle = gr; ctx.lineWidth = 1;
        const K = 30;
        for (let r = 0; r < RB.length; r++) {
          const b = RB[r];
          for (let k = 0; k < K; k++) {
            const q = (k / (K - 1)) * 2 - 1;
            ctx.beginPath();
            for (let x = -20; x <= w + 20; x += 12) {
              const u = x / w;
              const yc = h * b[0] + Math.sin(u * b[1] + ph * b[2] * 2 + b[3]) * h * b[4] * (0.5 + u * 0.7);
              const th = Math.sin(u * b[5] - ph * 1.4 + b[3]) * h * 0.11 * (0.45 + u * 0.75);
              const y = push(x, yc + q * th);
              if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.globalAlpha = (0.1 + 0.3 * (1 - Math.abs(q))) * (0.75 + 0.25 * p.amt) * base;
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        return;
      }
      const N = 30;
      for (let i = 0; i < N; i++) {
        const f = i / (N - 1), y0 = h * (0.06 + 0.88 * f), hot = i % 6 === 3;
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += 14) {
          const u = x / w;
          const y = push(x, y0 + Math.sin(u * 5.2 + ph * 2 + f * 3.1) * h * 0.1 * (0.35 + u) + Math.sin(u * 11 - ph * 3 + i) * h * 0.018);
          if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = hot ? 'rgba(' + tint + ',' + (0.3 + 0.5 * p.amt).toFixed(2) + ')' : 'rgba(255,255,255,' + (base + base * 1.6 * f + 0.05 * p.amt).toFixed(3) + ')';
        ctx.lineWidth = hot ? 1.5 : 1; ctx.stroke();
      }
    };
    const tick = (ms) => { if (this.dead) return; if (vis) draw(ms); if (!reduce) this.lraf = requestAnimationFrame(tick); };
    this.lraf = requestAnimationFrame(tick);
  }

  initLines() {
    const cv = this.vidCv, ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let vis = true;
    if (window.IntersectionObserver) { const io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; }); io.observe(cv); this.obs = (this.obs || []).concat([io]); }
    const LAY = [[1, 0.22, 0.6, 0.7], [1.2, 0.36, 0.3, 0.85], [1.6, 0.6, 0, 1]];
    const draw = (t) => {
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#3A3D47'); g.addColorStop(0.5, '#9A9CA5'); g.addColorStop(1, '#F4F5F7');
      ctx.strokeStyle = g;
      LAY.forEach((L) => {
        ctx.lineWidth = L[0]; ctx.globalAlpha = L[1];
        for (let k = 0; k < 11; k++) {
          const y0 = h * (0.5 + (k / 10 - 0.5) * 0.75);
          ctx.beginPath();
          for (let sx = 0; sx <= 72; sx++) {
            const x = w * (sx / 72 * 1.1 - 0.05);
            const y = y0 + Math.sin(sx * 0.1 + t * L[3] + L[2] * 6 + k * 0.22) * h * 0.13 + Math.sin(sx * 0.045 - t * 0.6 + k * 0.1) * h * 0.07;
            if (sx) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
    };
    const tick = (ms) => { if (this.dead) return; if (vis) draw(this.reduce ? 2 : ms * 0.0005); if (!this.reduce) this.raf = requestAnimationFrame(tick); };
    this.raf = requestAnimationFrame(tick);
  }

  initAnime() {
    const A = window.anime;
    if (!A.animate || this.reduce || !window.IntersectionObserver) return;
    const R = this.root;
    const all = (s, el) => Array.prototype.slice.call((el || R).querySelectorAll(s));
    A.animate(all('.w'), { opacity: [0, 1], translateY: ['0.5em', '0em'], filter: ['blur(8px)', 'blur(0px)'], duration: 800, delay: A.stagger(60), ease: 'outExpo' });
    const count = (el) => all('[data-count]', el).forEach((n) => {
      const end = parseFloat(n.getAttribute('data-count')), fin = n.textContent, o = { v: 0 };
      A.animate(o, { v: end, duration: 1400, ease: 'outExpo', onUpdate: () => { n.textContent = Math.round(o.v).toLocaleString('en-US'); }, onComplete: () => { n.textContent = fin; } });
    });
    const runs = {
      figs: (el) => {
        all('[data-gauge]', el).forEach((p) => { const d = parseFloat(p.getAttribute('stroke-dasharray')); A.animate(p, { strokeDashoffset: [d, 0], duration: 1400, ease: 'outExpo' }); });
        A.animate(all('[data-bar]', el), { scaleX: [0, 1], duration: 1000, delay: A.stagger(90), ease: 'outExpo' });
        count(el);
      },
      area: (el) => {
        all('[data-line]', el).forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; A.animate(p, { strokeDashoffset: [L, 0], duration: 1600, ease: 'inOutQuad', onComplete: () => { p.style.strokeDasharray = 'none'; p.style.strokeDashoffset = 0; } }); });
        A.animate(all('[data-area]', el), { opacity: [0, 1], duration: 1000, delay: 800, ease: 'outQuad' });
        count(el);
      }
    };
    const vh = window.innerHeight;
    const rv = all('[data-rv]').filter((el) => el.getBoundingClientRect().top > vh);
    rv.forEach((el) => { el.style.opacity = 0; });
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const key = en.target.getAttribute('data-anim');
      if (key && runs[key]) runs[key](en.target);
      else A.animate(en.target, { opacity: [0, 1], translateY: [24, 0], duration: 700, ease: 'outExpo' });
    }), { threshold: 0.15 });
    rv.concat(all('[data-anim]')).forEach((el) => io.observe(el));
    this.obs = (this.obs || []).concat([io]);
  }

  // Section #ai, the copy beside the panel ("This is the panel in the dashboard."). Same entrance as [data-rv]
  // (fade and 24px rise, once, at the same point: 15% of the block in view), but driven by the scroll position, so it
  // keeps pace with the scroll-linked panel on fast scrolls; a jump past it shows it at once. While the page scrolls,
  // the rows' hover highlight is held off so rows passing under a resting pointer do not flicker.
  initCopySync() {
    const els = Array.prototype.slice.call(this.root.querySelectorAll('[data-rv-sync]'));
    if (!els.length) return;
    const A = window.anime, motion = !!(A && A.animate) && !this.reduce;
    const pending = motion ? els.filter((el) => el.getBoundingClientRect().top > window.innerHeight) : [];
    pending.forEach((el) => { el.style.opacity = 0; });
    let t = 0, raf = 0;
    const check = () => {
      raf = 0;
      for (let i = pending.length - 1; i >= 0; i--) {
        const el = pending[i], r = el.getBoundingClientRect();
        if (r.top >= window.innerHeight - r.height * 0.15) continue;
        pending.splice(i, 1);
        if (r.bottom > 0) A.animate(el, { opacity: [0, 1], translateY: [24, 0], duration: 700, ease: 'outExpo' });
        else el.style.opacity = 1;
      }
    };
    const onScroll = () => {
      els.forEach((el) => el.setAttribute('data-scrolling', ''));
      clearTimeout(t); t = setTimeout(() => els.forEach((el) => el.removeAttribute('data-scrolling')), 160);
      if (pending.length && !raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    this.copyOff = () => { window.removeEventListener('scroll', onScroll); clearTimeout(t); cancelAnimationFrame(raf); };
    check();
  }

  spotMove = (e) => {
    const el = e.currentTarget, r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  };
  chartMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(9, Math.round((((e.clientX - r.left) / r.width) * 600 - 30) / 60)));
    if (i !== this.state.hov) this.setState({ hov: i });
  };
  chartLeave = () => { if (this.state.hov !== -1) this.setState({ hov: -1 }); };
  rowLeave = () => { if (this.state.hovRow !== -1) this.setState({ hovRow: -1 }); };

  renderVals() {
    const s = this.state;
    const nf = (x) => Math.round(x).toLocaleString('en-US');
    const aed = (x) => 'AED ' + nf(x);
    const CH = [['Ad platform A', 9.2, 182, 0.11], ['Ad platform B', 5.6, 141, 0.16], ['Ad platform C', 2.1, 118, 0.06], ['Ad platform D', 0.5, 436, 0.19], ['Ad platform E', 1.2, 129, 0.05]];
    const crow = CH.map((c) => { const leads = Math.round(c[1] * 30), qual = Math.round(leads * c[3]), spend = leads * c[2]; return { name: c[0], leads: leads, qual: qual, spend: spend, cpl: spend / leads, cpql: spend / qual }; });
    const TL = crow.reduce((a, r) => a + r.leads, 0), TQ = crow.reduce((a, r) => a + r.qual, 0), TS = crow.reduce((a, r) => a + r.spend, 0);
    const qr = TQ / TL;
    const vals = crow.map((r) => r[s.metric]);
    const vmax = Math.max.apply(null, vals);
    const idx = (k) => crow.map((r, i) => i).sort((a, b) => crow[a][k] - crow[b][k])[0];
    const bestI = idx(s.metric), bestCpl = idx('cpl'), bestQ = idx('cpql');
    const chartNote = s.metric === 'cpl'
      ? crow[bestCpl].name + ' looks like the winner at ' + aed(crow[bestCpl].cpl) + ' per lead. Now switch to cost per qualified lead.'
      : crow[bestQ].name + ' delivers a qualified lead for ' + aed(crow[bestQ].cpql) + '. ' + crow[bestCpl].name + ', the cheapest per lead, costs ' + aed(crow[bestCpl].cpql) + '.';
    const fit = (arr, total) => { const sum = arr.reduce((a, v) => a + v, 0), sc = arr.map((v) => v * total / sum), fl = sc.map(Math.floor); let rest = total - fl.reduce((a, v) => a + v, 0); sc.map((v, i) => [v - fl[i], i]).sort((x, y) => y[0] - x[0]).forEach((e) => { if (rest > 0) { fl[e[1]] += 1; rest -= 1; } }); return fl; };
    const rawL = fit(Array.from({ length: 10 }, (_, i) => 1 + 0.24 * Math.sin(i * 1.7 + 10) + 0.02 * i), TL);
    const rawQ = fit(rawL.map((v, i) => v * (1 + 0.35 * Math.sin(i * 2.3 + 1))), TQ);
    const isQ = s.series === 'qual', raw = isQ ? rawQ : rawL, unit = isQ ? ' qualified leads' : ' leads';
    const mx = Math.max.apply(null, raw);
    const pts = raw.map((v, i) => [30 + i * 60, 200 - (v / mx) * 160]);
    let lineD = 'M ' + pts[0][0] + ' ' + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++) lineD += ' C ' + (pts[i - 1][0] + 30) + ' ' + pts[i - 1][1].toFixed(1) + ', ' + (pts[i][0] - 30) + ' ' + pts[i][1].toFixed(1) + ', ' + pts[i][0] + ' ' + pts[i][1].toFixed(1);
    const hv = s.hov;
    const dotsD = pts.map((q) => 'M ' + (q[0] - 3.5) + ' ' + q[1].toFixed(1) + ' a 3.5 3.5 0 1 0 7 0 a 3.5 3.5 0 1 0 -7 0').join(' ');
    const hd = hv > 0 ? Math.round(raw[hv]) - Math.round(raw[hv - 1]) : 0;
    const rankOf = (k) => { const o = crow.map((r, i) => i).sort((x, y) => crow[x][k] - crow[y][k]); const m = {}; o.forEach((ix, pos) => { m[ix] = pos; }); return m; };
    const rkNow = rankOf(s.metric), rkCpl = rankOf('cpl');
    const hr = s.hovRow;
    const QUEUES = [
      ['Overdue', 'Leads waiting past the 30 minute first contact target. Select a lead to see its score.', 96, 31.25, [
        ['Apartment enquiry, 2 bed', 'Daniel Okafor, Team North. Source: social ads', '41 min waiting', 'Slow', '#F59E0B', 41, 78, 'New enquiry, budget stated, asked for a viewing.'],
        ['Villa enquiry, 4 bed', 'Mariam Saleh, Team North. Source: property portal', '1h 36m waiting', 'Escalated to team leader', '#FCA5A5', 96, 84, 'Portal lead, cash buyer, wants to move this quarter.'],
        ['Studio enquiry', 'Noor Rahman, Team North. Source: search ads', '33 min waiting', 'Slow', '#F59E0B', 33, 61, 'Search lead, no budget given yet.']]],
      ['New leads to contact', 'New enquiries still inside the 30 minute target.', 96, 31.25, [
        ['Townhouse enquiry, 3 bed', 'Noor Rahman, Team North. Source: social ads', '4 min waiting', 'Within target', '#34D399', 4, 72, 'Form lead, preferred community given.'],
        ['Apartment enquiry, 1 bed', 'Daniel Okafor, Team North. Source: property portal', '11 min waiting', 'Within target', '#34D399', 11, 66, 'Portal lead on a live listing.'],
        ['Off-plan enquiry', 'Mariam Saleh, Team North. Source: search ads', '22 min waiting', 'Within target', '#34D399', 22, 58, 'Asked for a payment plan.']]],
      ['Follow-ups due today', 'Leads with a follow-up task dated today.', 100, -1, [
        ['Viewing follow-up', 'Noor Rahman, Team North. Stage: Viewing booked', 'Due 11:30', 'Due now', '#F59E0B', 92, 88, 'Viewed on Tuesday, comparing two units.'],
        ['Offer follow-up', 'Mariam Saleh, Team North. Stage: Offer made', 'Due 14:00', 'Due today', '#C9CBD2', 55, 91, 'Offer sent, waiting on the buyer.'],
        ['Call back requested', 'Daniel Okafor, Team North. Stage: Contacted', 'Due 17:00', 'Due today', '#C9CBD2', 25, 64, 'Asked to be called after work.']]],
      ['Retry no answer', 'Leads that did not pick up, with the attempts made so far.', 100, -1, [
        ['Apartment enquiry, 2 bed', 'Daniel Okafor, Team North. Source: video ads', '2 attempts', 'Retry today', '#C9CBD2', 40, 47, 'No answer twice, message delivered.'],
        ['Villa enquiry, 5 bed', 'Noor Rahman, Team North. Source: social ads', '4 attempts', 'Last attempt next', '#F59E0B', 80, 52, 'No answer on four calls across three days.']]]
    ];
    const QC = QUEUES[s.queue];
    const fr = [1, 0.62, qr, qr * 0.42, qr * 0.13, qr * 0.07];
    const fn = ['New', 'Contacted', 'Qualified', 'Viewing booked', 'Offer made', 'Closed won'];
    const INTS = [["Advertising accounts", "ads"], ["Lead forms", "ads"], ["Search advertising", "ads"], ["Social advertising", "ads"], ["Video advertising", "ads"], ["Web analytics", "analytics"], ["Search performance", "analytics"], ["Tag management", "analytics"], ["CRM systems", "crm"], ["Real estate CRMs", "crm"], ["Sales pipelines", "crm"], ["Property portals", "portal"], ["Listing feeds", "portal"], ["Spreadsheets", "data"], ["CSV import", "data"], ["REST API", "data"], ["Webhooks", "data"], ["Email alerts", "msg"], ["Team chat", "msg"], ["Messaging apps", "msg"]];
    const CATS = { all: 'All', ads: 'Advertising', analytics: 'Analytics', crm: 'CRM', portal: 'Property portals', data: 'Data and files', msg: 'Messaging and alerts' };
    const ST = { 1: ['First release', 'background: #F4F5F7; color: #0A0B0D'], 2: ['Next release', 'background: #26282E; color: #F4F5F7'], 3: ['Planned', 'background: transparent; color: #9A9CA5; border: 1px dashed #4A4D57'] };
    const pc = (x) => (x * 100).toFixed(1) + '%';
    const M = crow[0], Gg = crow[1], Tk = crow[2], Li = crow[3];
    const AI = [
      { title: 'Explain a KPI', help: 'Ask why a figure is where it is.', q: 'Why is cost per qualified lead ' + aed(TS / TQ) + '?',
        lines: [M.name + ' takes ' + pc(M.spend / TS) + ' of spend and qualifies ' + pc(M.qual / M.leads) + ' of its leads.', Gg.name + ' qualifies ' + pc(Gg.qual / Gg.leads) + ' and delivers a qualified lead for ' + aed(Gg.cpql) + '.', 'The blended figure sits high because most of the budget is on the channel with the lower qualification rate.'],
        metrics: ['Spend', 'Qualified leads', 'Cost per qualified lead'], action: 'Open Campaigns' },
      { title: 'Find neglected leads', help: 'Surface the enquiries nobody has contacted.', q: 'Which leads have had no contact yet?',
        lines: [nf(TL - Math.round(TL * 0.62)) + ' of ' + nf(TL) + ' leads are still at New with no contact attempt recorded.', 'They are listed oldest first, with the owner and the campaign each one came from.', 'Leads past the 30 minute first contact target are marked as escalated.'],
        metrics: ['Leads at New', 'First response time'], action: 'Open the queue' },
      { title: 'Summarise campaign quality', help: 'Get the channel story in three lines.', q: 'Summarise campaign quality this month.',
        lines: [Gg.name + ' gives the lowest cost per qualified lead at ' + aed(Gg.cpql) + '.', Tk.name + ' has the cheapest leads at ' + aed(Tk.cpl) + ', but each qualified lead costs ' + aed(Tk.cpql) + '.', Li.name + ' has only ' + nf(Li.leads) + ' leads, too few to rank on rate.'],
        metrics: ['Cost per lead', 'Cost per qualified lead', 'Lead volume'], action: 'See the leads' }
    ];
const SHOTS = [["Home", "assets/demo/home.jpg", "Daily priorities for each role: business results, guided journeys and what needs attention today."], ["Overview", "assets/demo/overview.jpg", "Operational pipeline: total leads, new leads waiting for contact and ten stage tiles."], ["All leads", "assets/demo/all-leads.jpg", "Every lead with its previous and current stage, source, agent and first response time."], ["Conversion funnel", "assets/demo/funnel.jpg", "Stage by stage conversion and drop-off, with source effectiveness underneath."], ["My day", "assets/demo/my-day.jpg", "The agent work queue: overdue, new, follow-ups and retries, each with a score and a next action."], ["Agents", "assets/demo/agents.jpg", "Agent scorecards: leads by stage, average response time and listings on each portal."], ["Campaigns", "assets/demo/campaigns.jpg", "Campaign lead quality: qualified leads, cost per qualified lead, no-answer rate and share matched to CRM."], ["Marketing analytics", "assets/demo/marketing-analytics.jpg", "Paid media across every platform, side by side and matched to CRM leads."], ["Executive summary", "assets/demo/executive-summary.jpg", "Revenue, opportunities, leads, win rate, spend and cost per lead, with a 12 month trend and key changes."], ["Goals", "assets/demo/goals.jpg", "Targets by workspace, team, agent and campaign, with progress, variance and pace."], ["Listings", "assets/demo/listings.jpg", "Live inventory with portal status, verification share and top communities."]];
    const mkList = INTS.filter((i) => (s.cat === 'all' || i[1] === s.cat) && i[0].toLowerCase().indexOf(s.q.trim().toLowerCase()) !== -1);
    const sel = (on) => on ? 'background: #F4F5F7; color: #0A0B0D; border: 1px solid #F4F5F7' : 'background: transparent; color: #9A9CA5; border: 1px solid #26282E';
    const need = { name: 'Enter your full name.', email: 'Enter a work email, for example name@company.com.', company: 'Enter your company name.', industry: 'Select an industry.' };
    const tu = TOUR[s.tour], tImg = !!tu[1];
    return {
      setTour: this.setTour, tourToggle: this.tourToggle, tourLabel: s.tourPlay ? 'Pause tour' : 'Play tour', tourPaused: s.tourPlay ? 'false' : 'true',
      tourNow: [{ src: tu[1] || TOUR[1][1], alt: tu[2], title: tu[0], text: tu[3], no: '0' + (s.tour + 1) + ' / 0' + TOUR.length, imgStyle: tImg ? '' : 'display: none', bigStyle: tImg ? 'display: none' : 'display: flex', capStyle: tImg ? '' : 'display: none', ctaStyle: s.tour === TOUR.length - 1 ? 'display: inline-flex' : 'display: none' }],
      tourSteps: TOUR.map((x, i) => ({ label: x[0], on: i === s.tour ? 'true' : 'false', pick: () => this.tourPick(i), style: i === s.tour ? 'color: #F4F5F7' : 'color: #9A9CA5', fill: i === s.tour ? (s.tourPlay ? '' : 'animation: none') : 'display: none' })),
      setCtaCanvas: this.setCtaCanvas, ctaMove: this.ctaMove, ctaLeave: this.ctaLeave,
      aiJobs: AI.map((j, i) => ({ title: j.title, help: j.help, on: i === s.ai, color: i === s.ai ? '#F4F5F7' : '#9A9CA5', style: 'border-top: 1px solid ' + (i === s.ai ? '#E028DF' : '#26282E'), pick: () => this.setState({ ai: i }) })),
      aiNow: { q: AI[s.ai].q, lines: AI[s.ai].lines.map((x) => ({ text: x })), metrics: AI[s.ai].metrics.map((x) => ({ name: x })), action: AI[s.ai].action },
      shots: SHOTS.map((h, i) => ({ label: h[0], on: i === s.shot, style: i === s.shot ? 'color: #F4F5F7; border-bottom: 2px solid #E028DF' : 'color: #9A9CA5; border-bottom: 2px solid transparent', pick: () => this.setState({ shot: i }) })),
      shotNow: [{ src: SHOTS[s.shot][1], alt: 'AnchorIQ ' + SHOTS[s.shot][0] + ' screen with sample data' }],
      shot: { caption: SHOTS[s.shot][2] },
      setRoot: this.setRoot, setVideoCanvas: this.setVideoCanvas, setHeroCanvas: this.setHeroCanvas, setHeroImg: this.setHeroImg, heroMove: this.heroMove, heroLeave: this.heroLeave,
      st: { no: s.step + 1, name: ['Enquiry', 'Contacted', 'Qualified', 'Viewing booked', 'Offer made', 'Closed won'][s.step], count: nf(TL * fr[s.step]), share: s.step === 0 ? 'leads enter the pipeline' : (fr[s.step] * 100).toFixed(1) + '% of all leads reach this stage' },
      segs: fn.map((l, i) => ({ bg: i < s.step ? '#9A9CA5' : (i === s.step ? '#E028DF' : '#26282E') })), spotMove: this.spotMove, chartMove: this.chartMove, chartLeave: this.chartLeave,
      totalLeads: TL, totalLeadsText: nf(TL), qualText: nf(TQ), cplText: nf(TS / TL), cpql: Math.round(TS / TQ), cpqlText: nf(TS / TQ),
      qRateText: (qr * 100).toFixed(1), gaugeDash: (Math.PI * 90 * qr).toFixed(1) + ' 400', gaugeAria: 'Gauge: ' + (qr * 100).toFixed(1) + '% of leads qualified',
      funnel: fn.map((label, i) => ({ w: Math.max(2, fr[i] * 100).toFixed(1), bg: i === 2 ? '#E028DF' : (i < 2 ? '#4A4D57' : '#7634EF') })),
      funnelAria: 'Funnel: ' + fn.map((l, i) => l + ' ' + nf(TL * fr[i])).join(', '),
      lineD: lineD, areaD: lineD + ' L 570 200 L 30 200 Z',
      areaAria: 'Area chart of leads across ten three-day periods, ' + nf(TL) + ' leads in total',
      hovX: hv >= 0 ? pts[hv][0] : 570, hovY: hv >= 0 ? pts[hv][1].toFixed(1) : pts[9][1].toFixed(1), hovO: hv >= 0 ? 1 : 0,
      bandX: (hv >= 0 ? pts[hv][0] : 570) - 30, bandO: hv >= 0 ? 0.14 : 0, dotsD: dotsD, lastY: pts[9][1].toFixed(1), yMax: nf(mx), yMid: nf(mx / 2),
      tipStyle: 'left: ' + Math.max(16, Math.min(84, ((hv >= 0 ? pts[hv][0] : 570) / 600) * 100)).toFixed(1) + '%; top: ' + (((hv >= 0 ? pts[hv][1] : pts[9][1]) / 240) * 100).toFixed(1) + '%; transform: translate(-50%, ' + ((hv >= 0 ? pts[hv][1] : 200) < 110 ? '22px' : 'calc(-100% - 18px)') + '); opacity: ' + (hv >= 0 ? 1 : 0),
      tipPeriod: hv >= 0 ? 'Days ' + (hv * 3 + 1) + ' to ' + (hv * 3 + 3) : '', tipValue: hv >= 0 ? nf(raw[hv]) + unit : '',
      tipDelta: hv > 0 ? (hd === 0 ? 'Same as the period before' : (hd > 0 ? 'Up ' + hd : 'Down ' + (-hd)) + ' on the period before') : (hv === 0 ? 'First period' : ''), tipColor: hd > 0 ? '#34D399' : (hd < 0 ? '#FCA5A5' : '#9A9CA5'),
      seriesTabs: [['leads', 'Leads', TL], ['qual', 'Qualified leads', TQ]].map((x) => ({ label: x[1], n: x[2], value: nf(x[2]), on: x[0] === s.series ? 'true' : 'false', style: x[0] === s.series ? 'background: #1A1B20; border: 1px solid #7634EF' : 'background: transparent; border: 1px solid #26282E', pick: () => { if (s.series !== x[0]) this.setState({ series: x[0] }); } })),
      periods: raw.map((v, i) => ({ label: String(i * 3 + 1), aria: 'Days ' + (i * 3 + 1) + ' to ' + (i * 3 + 3) + ': ' + nf(v) + unit, on: i === hv ? 'true' : 'false', style: i === hv ? 'color: #F4F5F7; border-top-color: #E028DF' : 'color: #9A9CA5', pick: () => { if (this.state.hov !== i) this.setState({ hov: i }); } })),
      rowLeave: this.rowLeave,
      queues: QUEUES.map((q, i) => ({ label: q[0], n: q[4].length, on: i === s.queue ? 'true' : 'false', style: i === s.queue ? 'background: #F4F5F7; color: #0A0B0D; border: 1px solid #F4F5F7' : 'background: transparent; color: #9A9CA5; border: 1px solid #26282E', badge: i === s.queue ? 'background: #0A0B0D; color: #F4F5F7' : 'background: #26282E; color: #C9CBD2', pick: () => { if (s.queue !== i) this.setState({ queue: i, open: -1 }); } })),
      queueRows: QC[4].map((r, i) => ({ name: r[0], sub: r[1], right: r[2], status: r[3], color: r[4], pct: Math.min(100, (r[5] / QC[2]) * 100).toFixed(1), mark: QC[3], markStyle: QC[3] < 0 ? 'display: none' : '', dot: r[4] === '#FCA5A5' ? 'blink' : '', score: r[6], reason: r[7], open: s.open === i ? 'true' : 'false', moreStyle: s.open === i ? '' : 'display: none', anim: 'animation: rowin' + s.queue + ' .5s cubic-bezier(.2,.7,.2,1) ' + (i * 0.08).toFixed(2) + 's both', toggle: () => this.setState({ open: s.open === i ? -1 : i }) })),
      queueNote: 'Demo data. ' + QC[1] + (QC[3] < 0 ? '' : ' The white marker is the 30 minute target.'),
      hovText: hv >= 0 ? 'Days ' + (hv * 3 + 1) + ' to ' + (hv * 3 + 3) + ': ' + nf(raw[hv]) + unit + '.' : 'Move across the chart, or pick a day below, to read a period. Switch between leads and qualified leads above.',
      metrics: [['cpl', 'Cost per lead'], ['cpql', 'Cost per qualified lead']].map((m) => ({ label: m[1], on: m[0] === s.metric, style: sel(m[0] === s.metric), pick: () => this.setState({ metric: m[0] }) })),
      chartNote: hr >= 0 ? crow[hr].name + ': ' + nf(crow[hr].leads) + ' leads, ' + nf(crow[hr].qual) + ' qualified (' + ((crow[hr].qual / crow[hr].leads) * 100).toFixed(1) + '%), spend ' + aed(crow[hr].spend) + '.' + (crow[hr].leads < 30 ? ' Low volume, so treat the rate with care.' : '') : chartNote,
      chartRows: crow.map((r, i) => { const mv = rkCpl[i] - rkNow[i]; return { name: r.name, value: aed(vals[i]), w: ((vals[i] / vmax) * 100).toFixed(1), bg: i === bestI ? 'linear-gradient(90deg, #7634EF, #E028DF)' : (i === hr ? '#4A4D57' : '#3A3D47'), color: i === bestI ? '#E028DF' : '#F4F5F7', rank: '0' + (rkNow[i] + 1), y: rkNow[i] * 54, rowStyle: i === hr ? 'background-color: #1A1B20' : '', move: s.metric === 'cpl' ? '' : (mv === 0 ? 'Same rank' : (mv > 0 ? 'Up ' + mv : 'Down ' + (-mv))), moveColor: mv > 0 ? '#34D399' : (mv < 0 ? '#FCA5A5' : '#9A9CA5'), enter: () => { if (this.state.hovRow !== i) this.setState({ hovRow: i }); } }; }),
      cats: Object.keys(CATS).map((id) => ({ label: CATS[id], n: id === 'all' ? INTS.length : INTS.filter((i) => i[1] === id).length, on: id === s.cat, style: sel(id === s.cat), pick: () => this.setState({ cat: id }) })),
      integrations: mkList.map((i) => ({ name: i[0], cat: CATS[i[1]] + ' · Planned', mono: i[0].split(/[ .]/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() })),
      mkQ: s.q, setMkQ: (e) => this.setState({ q: e.target.value }),
      mkCount: mkList.length ? mkList.length + (mkList.length === 1 ? ' connection' : ' connections') : 'No connection matches that search. Tell us what you use and we will look at it.',
      f: s.f, err: s.err, sent: OPEN && s.sent, notSent: OPEN && !s.sent, closed: !OPEN, closedTitle: 'Demo requests open soon.',
      firstName: (s.f.name.trim().split(' ')[0]) || 'there',
      formError: Object.keys(s.err).length ? 'Check the highlighted fields and try again.' : (s.fail || ''), sendLabel: s.sending ? 'Sending your request' : 'Book a demo', busy: s.sending ? 'true' : 'false', sendStyle: s.sending ? 'opacity: 0.6; cursor: progress' : 'opacity: 1',
      onField: (e) => {
        const k = e.target.name, v = e.target.value;
        const err = Object.assign({}, s.err); delete err[k];
        this.setState({ f: Object.assign({}, s.f, { [k]: v }), err: err });
      },
      submit: (e) => {
        e.preventDefault();
        if (!OPEN) return;
        const err = {};
        Object.keys(need).forEach((k) => { if (!String(s.f[k]).trim()) err[k] = need[k]; });
        if (s.f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.f.email.trim())) err.email = need.email;
        if (s.sending) return;
        if (Object.keys(err).length) { this.setState({ err: err, fail: '' }); const k = Object.keys(need).find((x) => err[x]); const el = document.getElementById('f-' + k); if (el) el.focus(); return; }
        this.setState({ sending: true, err: {}, fail: '' });
        const done = (ok) => this.setState(ok ? { sending: false, sent: true } : { sending: false, fail: 'We could not send your request. Your details are still in the form. Try again, email hello@anchordigi.com or call +971\u00a050\u00a0907\u00a08947.' });
        if (!FORM_ENDPOINT) { setTimeout(() => done(false), 400); return; }
        const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 15000);
        fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ intent: 'demo', page: location.pathname, sentAt: new Date().toISOString() }, s.f)), signal: ctl.signal }).then((r) => { clearTimeout(tm); done(r.ok); }).catch(() => { clearTimeout(tm); done(false); });
      },
      again: () => this.setState({ sent: false, fail: '', f: { website: '', name: '', email: '', company: '', industry: '', size: '', challenge: '', message: '' } })
    };
  }
}
return Component;
};
