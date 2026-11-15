// Page component for Privacy (design export logic, unchanged). Rendered by assets/page.js.
window.AIQ_PAGE = function (DCLogic) {
const ORBMODE = 0;
const WV = 1;
const HASORB = false;
const MODS = [];
class Component extends DCLogic {
  state = { mod: 0 };
  setRoot = (el) => { this.root = el; };
  componentDidMount() { this.tries = 0; this.boot(); }
  boot = () => {
    if (this.dead) return;
    if (!(window.anime && this.root)) { if (this.tries++ < 60) this.bootT = setTimeout(this.boot, 150); return; }
    const A = window.anime, reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!A.animate || reduce || !window.IntersectionObserver) return;
    const vh = window.innerHeight;
    const els = Array.prototype.slice.call(this.root.querySelectorAll('[data-rv]')).filter((el) => el.getBoundingClientRect().top > vh);
    els.forEach((el) => { el.style.opacity = 0; });
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (!en.isIntersecting) return; io.unobserve(en.target); A.animate(en.target, { opacity: [0, 1], translateY: [24, 0], duration: 700, ease: 'outExpo' }); }), { threshold: 0.15 });
    els.forEach((el) => io.observe(el)); this.io = io;
  };
  componentWillUnmount() { this.dead = true; clearTimeout(this.bootT); if (this.io) this.io.disconnect(); }
  spotMove = (e) => { const el = e.currentTarget, r = el.getBoundingClientRect(); el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px'); };
  lensMove = (e) => { const el = e.currentTarget, r = el.getBoundingClientRect(); el.style.setProperty('--lx', (((e.clientX - r.left) / r.width - 0.5) * -22).toFixed(1)); el.style.setProperty('--ly', (((e.clientY - r.top) / r.height - 0.5) * -16).toFixed(1)); };
  lensLeave = (e) => { e.currentTarget.style.setProperty('--lx', 0); e.currentTarget.style.setProperty('--ly', 0); };
  bp = { x: 0.5, y: 0.5, on: false, amt: 0 };
  setBandCanvas = (el) => { this.bandCv = el; };
  bandMove = (e) => { const el = e.currentTarget, r = el.getBoundingClientRect(); this.bp.x = (e.clientX - r.left) / r.width; this.bp.y = (e.clientY - r.top) / r.height; this.bp.on = true; el.style.setProperty('--bx', (this.bp.x * 100).toFixed(1) + '%'); el.style.setProperty('--by', (this.bp.y * 100).toFixed(1) + '%'); };
  bandLeave = () => { this.bp.on = false; };
  cp = { x: 0.7, y: 0.55, on: false, amt: 0 };
  setCtaCanvas = (el) => { this.ctaCv = el; };
  ctaMove = (e) => { const el = e.currentTarget, r = el.getBoundingClientRect(); this.cp.x = (e.clientX - r.left) / r.width; this.cp.y = (e.clientY - r.top) / r.height; this.cp.on = true; el.style.setProperty('--cx', (this.cp.x * 100).toFixed(1) + '%'); el.style.setProperty('--cy', (this.cp.y * 100).toFixed(1) + '%'); };
  ctaLeave = () => { this.cp.on = false; };
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
  ptr = { x: 0.7, y: 0.5, on: false, amt: 0 };
  op = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  setHeroCanvas = (el) => { this.heroCv = el; };
  setHeroImg = (el) => { this.heroImg = el; };
  setOrbCanvas = (el) => { this.orbCv = el; };
  componentDidMount() { this.tries = 0; this.t3 = 0; this.reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); this.boot(); this.boot3(); }
  boot3 = () => {
    if (this.dead) return;
    if (this.reduce && this.root && !this.smilOff) { this.smilOff = true; Array.prototype.slice.call(this.root.querySelectorAll('animateMotion')).forEach((n) => n.parentNode.removeChild(n)); }
    if (window.THREE && this.heroCv && !this.heroOn) { this.heroOn = true; try { this.initHero(); } catch (e) { console.error(e); } }
    if (!HASORB) this.orbOn = true;
    if (window.THREE && this.orbCv && !this.orbOn) { this.orbOn = true; try { this.initOrb(); } catch (e) { console.error(e); } }
    if (this.bandCv && !this.bandOn) { this.bandOn = true; try { this.initLines2(this.bandCv, this.bp, '200,200,210', 0.05); } catch (e) { console.error(e); } }
    if (this.ctaCv && !this.ctaOn) { this.ctaOn = true; try { this.initLines2(this.ctaCv, this.cp, '224,40,223', 1.3, true); } catch (e) { console.error(e); } }
    if (!(this.heroOn && this.orbOn && this.bandOn) && this.t3++ < 40) this.boot3T = setTimeout(this.boot3, 150);
  };
  componentWillUnmount() { this.dead = true; clearTimeout(this.bootT); clearTimeout(this.boot3T); cancelAnimationFrame(this.hraf); cancelAnimationFrame(this.oraf); cancelAnimationFrame(this.lraf); if (this.hren) this.hren.dispose(); if (this.oren) this.oren.dispose(); if (this.io) this.io.disconnect(); (this.obs || []).forEach((o) => o.disconnect()); }
  watch(cv, set) { if (!window.IntersectionObserver) return; const io = new IntersectionObserver((es) => { set(es[0].isIntersecting); }); io.observe(cv); this.obs = (this.obs || []).concat([io]); }
  initHero() {
    const T = window.THREE, cv = this.heroCv;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ren = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); ren.setPixelRatio(dpr); this.hren = ren;
    const scene = new T.Scene(); scene.fog = new T.Fog(0x0A0B0D, 16, 62);
    const cam = new T.PerspectiveCamera(46, 1, 0.1, 200);
    const NX = 170, NZ = 70, S = 0.44, N = NX * NZ;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    scene.add(new T.Points(geo, new T.PointsMaterial({ size: 0.1, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true })));
    if (this.heroImg) this.heroImg.style.display = 'none';
    let vis = true; this.watch(cv, (v) => { vis = v; });
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
        const rr = Math.sqrt((x - 10) * (x - 10) + z * z);
        const y = (WV === 0 ? Math.sin(rr * 0.42 - t * 1.6) * 1.5 * Math.exp(-rr * 0.035) + Math.cos(z * 0.24 + t * 0.7) * 0.8 + Math.sin(x * 0.16 + t) * 1.0 : WV === 1 ? Math.sin(x * 0.2 + t) * 1.5 + Math.cos(z * 0.28 + t * 0.8) * 1.0 + Math.sin((x + z) * 0.11 - t * 0.6) * 1.7 : WV === 2 ? Math.sin((x + z) * 0.3 - t * 1.4) * 1.3 + Math.sin(x * 0.1 + t) * 1.4 + Math.cos(z * 0.5 + t * 0.5) * 0.4 : Math.sin(x * 0.33 + t) * Math.cos(z * 0.33 - t * 0.8) * 1.9 + Math.sin((x - z) * 0.08 + t * 0.5) * 1.2) + bump * 3.4;
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
        const b = Math.min(1, Math.max(0, (y + 3.2) / 7.5)), g = 0.16 + 0.7 * b, m = Math.min(1, bump * 1.3);
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
  initOrb() {
    const T = window.THREE, cv = this.orbCv;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ren = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); ren.setPixelRatio(dpr); this.oren = ren;
    const scene = new T.Scene();
    const cam = new T.PerspectiveCamera(42, 1, 0.1, 100); cam.position.set(0, 0, 17);
    const group = new T.Group(); scene.add(group);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const cloud = (n, fn, size, op) => { const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); for (let i = 0; i < n; i++) fn(i, pos, col); const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); return new T.Points(g, new T.PointsMaterial({ size: size, vertexColors: true, transparent: true, opacity: op, sizeAttenuation: true })); };
    const set = (a, i, x, y, z) => { a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z; };
    let step = () => {};
    if (ORBMODE === 0) {
      const core = cloud(1400, (i, pos, col) => { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = 1.25 * Math.pow(rnd(), 0.5), s = Math.sqrt(1 - u * u); set(pos, i, r * s * Math.cos(a), r * u, r * s * Math.sin(a)); set(col, i, 0.75 + 0.2 * rnd(), 0.75, 0.82); }, 0.07, 0.95);
      group.add(core);
      const TINT = [[0.8, 0.8, 0.84], [0.62, 0.62, 0.66], [0.8, 0.8, 0.84], [0.6, 0.42, 0.95], [0.7, 0.7, 0.74]];
      const rings = [];
      for (let k = 0; k < 5; k++) {
        const R = 2.6 + k * 1.02, c = TINT[k];
        const ring = cloud(900 + k * 220, (i, pos, col) => { const a = rnd() * Math.PI * 2, j = (rnd() - 0.5) * 0.22, hot = rnd() < 0.04, d = 0.45 + 0.55 * rnd(); set(pos, i, (R + j) * Math.cos(a), (R + j) * Math.sin(a), (rnd() - 0.5) * 0.16); set(col, i, hot ? 1 : c[0] * d, hot ? 1 : c[1] * d, hot ? 1 : c[2] * d); }, 0.055, 0.9);
        const pivot = new T.Group(); pivot.rotation.set(1.15 + (k - 2) * 0.24, k * 0.5, 0); pivot.add(ring); group.add(pivot);
        rings.push([ring, (k % 2 ? -1 : 1) * (0.5 - k * 0.07)]);
      }
      step = (t) => { rings.forEach((r) => { r[0].rotation.z = t * r[1] * 2; }); core.rotation.y = -t; const s = 1 + Math.sin(t * 3) * 0.05; core.scale.set(s, s, s); };
    } else if (ORBMODE === 1) {
      const NN = 40, R = 5.4, nodes = [];
      for (let i = 0; i < NN; i++) { const y = 1 - (i + 0.5) * 2 / NN, r = Math.sqrt(1 - y * y), a = i * 2.39996; nodes.push([R * r * Math.cos(a), R * y, R * r * Math.sin(a)]); }
      group.add(cloud(2600, (i, pos, col) => { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = 0.22 + 0.3 * rnd(); set(pos, i, R * s * Math.cos(a), R * u, R * s * Math.sin(a)); set(col, i, d, d, d * 1.15); }, 0.04, 0.8));
      group.add(cloud(NN * 14, (i, pos, col) => { const n = nodes[Math.floor(i / 14)], j = 0.16; set(pos, i, n[0] + (rnd() - 0.5) * j, n[1] + (rnd() - 0.5) * j, n[2] + (rnd() - 0.5) * j); set(col, i, 0.95, 0.95, 1); }, 0.085, 1));
      const lp = new Float32Array(NN * 6); nodes.forEach((n, i) => { lp[i * 6 + 3] = n[0]; lp[i * 6 + 4] = n[1]; lp[i * 6 + 5] = n[2]; });
      const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(lp, 3));
      group.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0x8A8D98, transparent: true, opacity: 0.28 })));
      const core = cloud(900, (i, pos, col) => { const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = 0.9 * Math.pow(rnd(), 0.5), s = Math.sqrt(1 - u * u); set(pos, i, r * s * Math.cos(a), r * u, r * s * Math.sin(a)); set(col, i, 0.75 + 0.2 * rnd(), 0.75, 0.82); }, 0.07, 0.95);
      group.add(core);
      const PP = 3, pulses = cloud(NN * PP, (i, pos, col) => { set(col, i, 0.62, 0.42, 0.98); }, 0.11, 1), pa = pulses.geometry.attributes.position;
      group.add(pulses);
      step = (t) => { for (let i = 0; i < NN * PP; i++) { const n = nodes[Math.floor(i / PP)], f = 1 - ((t * 1.1 + (i % PP) / PP + Math.floor(i / PP) * 0.137) % 1); set(pa.array, i, n[0] * f, n[1] * f, n[2] * f); } pa.needsUpdate = true; const s = 1 + Math.sin(t * 3) * 0.06; core.scale.set(s, s, s); };
    } else if (ORBMODE === 2) {
      const H = 12, TURNS = 2.4, R = 2.7, NS = 1300;
      const pt = (f, o) => { const a = f * TURNS * Math.PI * 2 + o; return [R * Math.cos(a), (f - 0.5) * H, R * Math.sin(a)]; };
      [0, Math.PI].forEach((o, k) => { group.add(cloud(NS, (i, pos, col) => { const q = pt(rnd(), o), j = 0.24, d = 0.5 + 0.5 * rnd(); set(pos, i, q[0] + (rnd() - 0.5) * j, q[1] + (rnd() - 0.5) * j, q[2] + (rnd() - 0.5) * j); if (k) set(col, i, 0.58 * d, 0.58 * d, 0.64 * d); else set(col, i, 0.86 * d, 0.86 * d, 0.9 * d); }, 0.06, 0.95)); });
      const RG = 30, PR = 22;
      group.add(cloud(RG * PR, (i, pos, col) => { const f = (Math.floor(i / PR) + 0.5) / RG, a = pt(f, 0), b = pt(f, Math.PI), m = (i % PR) / (PR - 1); set(pos, i, a[0] + (b[0] - a[0]) * m, a[1], a[2] + (b[2] - a[2]) * m); set(col, i, 0.42, 0.42, 0.47); }, 0.045, 0.8));
      const sp = cloud(RG, (i, pos, col) => { set(col, i, 0.7, 0.5, 1); }, 0.14, 1), sa = sp.geometry.attributes.position; group.add(sp);
      group.rotation.z = 0.42;
      step = (t) => { for (let i = 0; i < RG; i++) { const f = (i + 0.5) / RG, a = pt(f, 0), b = pt(f, Math.PI), m = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.7); set(sa.array, i, a[0] + (b[0] - a[0]) * m, a[1], a[2] + (b[2] - a[2]) * m); } sa.needsUpdate = true; };
    } else {
      const N = 3375, A = new Float32Array(N * 3), B = new Float32Array(N * 3), C = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const gx = i % 15, gy = Math.floor(i / 15) % 15, gz = Math.floor(i / 225);
        set(A, i, (gx - 7) * 0.62, (gy - 7) * 0.62, (gz - 7) * 0.62);
        const y = 1 - (i + 0.5) * 2 / N, r = Math.sqrt(1 - y * y), a = i * 2.39996;
        set(B, i, 5 * r * Math.cos(a), 5 * y, 5 * r * Math.sin(a));
        const u = (i / N) * Math.PI * 2 * 41, v = (i / N) * Math.PI * 2;
        set(C, i, (4 + 1.5 * Math.cos(u)) * Math.cos(v), 1.5 * Math.sin(u), (4 + 1.5 * Math.cos(u)) * Math.sin(v));
      }
      const pts = cloud(N, (i, pos, col) => { const hot = rnd() < 0.0, vio = rnd() < 0.07, d = 0.45 + 0.55 * rnd(); if (hot) set(col, i, 0.9, 0.2, 0.88); else if (vio) set(col, i, 0.5 * d, 0.24 * d, 0.96 * d); else set(col, i, 0.8 * d, 0.8 * d, 0.85 * d); }, 0.08, 0.95), pa = pts.geometry.attributes.position;
      group.add(pts); group.rotation.x = 0.35;
      const SH = [A, B, C], ez = (x) => x * x * (3 - 2 * x);
      step = (t) => { const c = (t * 0.9) % 3, k = Math.floor(c), f = ez(Math.min(1, Math.max(0, ((c - k) - 0.25) / 0.5))), a = SH[k], b = SH[(k + 1) % 3], o = pa.array; for (let i = 0; i < N * 3; i++) o[i] = a[i] + (b[i] - a[i]) * f; pa.needsUpdate = true; };
    }
    let vis = true; this.watch(cv, (v) => { vis = v; });
    const draw = (t) => {
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      const o = this.op; o.x += (o.tx - o.x) * 0.06; o.y += (o.ty - o.y) * 0.06;
      group.rotation.y = t * 0.5 + (o.x - 0.5) * 1.6; group.rotation.x = (ORBMODE === 3 ? 0.35 : 0) + (o.y - 0.5) * 1.0;
      step(t);
      ren.render(scene, cam);
    };
    const tick = (ms) => { if (this.dead) return; if (vis) draw(this.reduce ? 1.2 : ms * 0.0004); if (!this.reduce) this.oraf = requestAnimationFrame(tick); };
    this.oraf = requestAnimationFrame(tick);
  }
  orbMove = (e) => { const r = e.currentTarget.getBoundingClientRect(); this.op.tx = (e.clientX - r.left) / r.width; this.op.ty = (e.clientY - r.top) / r.height; };
  orbLeave = () => { this.op.tx = 0.5; this.op.ty = 0.5; };
  mods() {
    const cur = this.state.mod;
    return MODS.map((m, i) => ({ no: (i < 9 ? '0' : '') + (i + 1), name: m[0], on: i === cur ? 'true' : 'false', pick: () => { if (this.state.mod !== i) this.setState({ mod: i }); }, style: i === cur ? 'color: #F4F5F7; border-left: 2px solid #7634EF' : 'color: #9A9CA5; border-left: 2px solid transparent' }));
  }
  modNow() { if (!MODS.length) return []; const m = MODS[this.state.mod] || MODS[0]; const sh = (v) => v ? '' : 'display: none'; return [{ src: 'assets/' + m[1] + '.jpg', alt: m[2], p: m[3], b1: m[4], b2: m[5], b3: m[6], s1: sh(m[4]), s2: sh(m[5]), s3: sh(m[6]), href: m[7] || 'Platform.dc.html', cta: m[8], sl: sh(m[7]) }]; }

  renderVals() {
    const s = this.state;
    return { setRoot: this.setRoot, spotMove: this.spotMove, setBandCanvas: this.setBandCanvas, bandMove: this.bandMove, bandLeave: this.bandLeave, setCtaCanvas: this.setCtaCanvas, ctaMove: this.ctaMove, ctaLeave: this.ctaLeave, setHeroCanvas: this.setHeroCanvas, setHeroImg: this.setHeroImg, setOrbCanvas: this.setOrbCanvas, heroMove: this.heroMove, heroLeave: this.heroLeave, orbMove: this.orbMove, orbLeave: this.orbLeave, mods: this.mods(), modNow: this.modNow(), lensMove: this.lensMove, lensLeave: this.lensLeave };
  }
}
return Component;
};
