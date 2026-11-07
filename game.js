/* =========================================================================
   SQUARE & CUBE QUEST — Josh Allen's Gridiron Math Adventure
   A 16-bit style quiz adventure for learning perfect squares & cubes (1-25).
   Vanilla JS, no dependencies. Sprites are cut from the supplied sprite sheet.
   ========================================================================= */
(() => {
'use strict';

/* ------------------------------------------------------------------ helpers */
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const fmt = n => n.toLocaleString('en-US');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isSq = v => { const r = Math.round(Math.sqrt(v)); return r * r === v; };
const isCu = v => { const r = Math.round(Math.cbrt(v)); return r * r * r === v; };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const px = (g, x, y, c, w = 1, h = 1) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const tween = (ms, fn) => new Promise(res => { const t0 = performance.now(); (function f() { const k = Math.min(1, (performance.now() - t0) / ms); fn(k); k < 1 ? requestAnimationFrame(f) : res(); })(); });
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const starSvg = on => `<svg class="star" viewBox="0 0 10 10" width="16" height="16"><path fill="${on ? '#ffd23f' : '#262a62'}" stroke="#070722" stroke-width=".8" d="M5 .6l1.3 2.9 3.1.3-2.3 2.1.7 3.1L5 7.4 2.2 9l.7-3.1L.6 3.8l3.1-.3z"/></svg>`;
const stars = n => [0, 1, 2].map(i => starSvg(i < n)).join('');
const rad = s => `<span class="sym">√</span>${s}`;      // square root
const crad = s => `³<span class="sym">√</span>${s}`;     // cube root

/* --------------------------------------------------------------------- save */
const SAVE_KEY = 'josh-quest-v1';
const save = { stars: [], best: [], sound: 'all', crt: true, at: null, run: null };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { /* private mode */ }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
const unlocked = i => i === 0 || (save.stars[i - 1] || 0) > 0;
const totalStars = () => STAGES.reduce((s, _, i) => s + (save.stars[i] || 0), 0);
const hasProgress = () => save.stars.some(s => s > 0);

/* -------------------------------------------------------------------- audio */
const Sound = (() => {
  let ctx = null, master, mus, timer = null, step = 0, tempo = 170;
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = .55; master.connect(ctx.destination);
      mus = ctx.createGain(); mus.gain.value = .13; mus.connect(master);
    } catch (e) { ctx = null; }
  }
  function tone(f, dur, o = {}) {
    if (!ctx) return;
    const { type = 'square', vol = .12, when = 0, slide = 0, dest } = o;
    const t = ctx.currentTime + when, os = ctx.createOscillator(), g = ctx.createGain();
    os.type = type; os.frequency.setValueAtTime(f, t);
    if (slide) os.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    os.connect(g); g.connect(dest || master); os.start(t); os.stop(t + dur + .03);
  }
  const sfxOn = () => save.sound !== 'off';
  const seq = (notes, gap, o) => notes.forEach((n, i) => tone(midi(n), gap * 1.6, { ...o, when: i * gap }));
  const CH = [[48, [60, 64, 67, 72]], [45, [57, 60, 64, 69]], [41, [53, 57, 60, 65]], [43, [55, 59, 62, 67]]];
  const MEL = [76, 0, 79, 0, 81, 0, 79, 76, 74, 0, 72, 0, 74, 0, 76, 0, 77, 0, 81, 0, 84, 0, 81, 77, 79, 0, 74, 0, 71, 0, 74, 0];
  function tick() {
    if (!ctx || save.sound !== 'all') return;
    const s = step % 32, c = CH[Math.floor(s / 8)];
    if (s % 4 === 0) tone(midi(c[0]), .3, { type: 'triangle', vol: .9, dest: mus });
    tone(midi(c[1][s % 4] + (s % 8 > 3 ? 0 : 0)), .1, { type: 'square', vol: .28, dest: mus });
    if (MEL[s]) tone(midi(MEL[s]), .22, { type: 'square', vol: .38, dest: mus });
    step++;
  }
  return {
    init,
    play(name) {
      if (!ctx || !sfxOn()) return;
      switch (name) {
        case 'blip': tone(880 + rnd(5) * 40, .035, { vol: .05 }); break;
        case 'select': tone(660, .06, { vol: .08 }); tone(990, .06, { vol: .08, when: .05 }); break;
        case 'move': tone(440, .04, { vol: .06 }); break;
        case 'good': seq([72, 76, 79, 84], .07, { vol: .11 }); break;
        case 'bad': tone(220, .3, { type: 'sawtooth', vol: .12, slide: -140 }); tone(150, .3, { type: 'square', vol: .08, when: .1, slide: -80 }); break;
        case 'throw': tone(260, .22, { type: 'triangle', vol: .14, slide: 700 }); break;
        case 'hit': tone(160, .16, { type: 'square', vol: .16, slide: -100 }); tone(80, .2, { type: 'sawtooth', vol: .12, when: .04 }); break;
        case 'win': seq([72, 72, 72, 76, 79, 76, 79, 84], .11, { vol: .12 }); break;
        case 'lose': seq([67, 64, 60, 55], .2, { type: 'triangle', vol: .16 }); break;
        case 'lock': tone(120, .15, { type: 'square', vol: .1 }); break;
        case 'star': seq([84, 88, 91], .09, { type: 'triangle', vol: .12 }); break;
      }
    },
    start(ms) {
      init(); tempo = ms || tempo;
      clearInterval(timer);
      if (ctx && save.sound === 'all') timer = setInterval(tick, tempo);
    },
    tempo(ms) { tempo = ms; if (timer) this.start(ms); },
    refresh() { clearInterval(timer); timer = null; if (save.sound === 'all') this.start(); }
  };
})();

/* ------------------------------------------------------------ typewriter UI */
let activeTyper = null, advanceFn = null, waiters = [];
const ABORT = Symbol('abort');
function waitFor(setup) {
  return new Promise(res => { const w = { res }; waiters.push(w); setup(v => { waiters = waiters.filter(x => x !== w); res(v); }); });
}
const abortWaiters = () => { const w = waiters; waiters = []; advanceFn = null; activeTyper = null; w.forEach(x => x.res(ABORT)); };
function onAdvance() {
  if (activeTyper && !activeTyper.finished) activeTyper.skip();
  else if (advanceFn) advanceFn();
}
function typeInto(target, html, speed = 20) {
  const toks = html.split(/(<[^>]+>)/).filter(x => x !== '');
  let total = 0; toks.forEach(t => { if (t[0] !== '<') total += t.length; });
  let n = 0, timer = null, resolve; const done = new Promise(r => resolve = r);
  const render = k => {
    let out = '', c = 0; const stack = [];
    for (const t of toks) {
      if (t[0] === '<') { if (t[1] === '/') stack.pop(); else if (!/\/>$/.test(t) && !/^<br/i.test(t)) stack.push(t); out += t; continue; }
      if (c + t.length <= k) { out += t; c += t.length; } else { out += t.slice(0, k - c); c = k; break; }
    }
    while (stack.length) out += '</' + stack.pop().match(/^<(\w+)/)[1] + '>';
    target.innerHTML = out;
  };
  const h = {
    finished: false,
    skip() { if (h.finished) return; clearInterval(timer); n = total; render(total); h.finished = true; resolve(); },
  };
  if (speed <= 0 || reduceMotion) { render(total); h.finished = true; resolve(); return { ...h, done }; }
  timer = setInterval(() => {
    n += 1; if (n % 3 === 0) Sound.play('blip');
    render(n);
    if (n >= total) { clearInterval(timer); h.finished = true; resolve(); }
  }, speed);
  return Object.assign(h, { done });
}
/* say(): type text into a box, show a ▼ prompt, wait for the player */
async function say(box, html, { speed = 20, wait = true, face } = {}) {
  if (face) face.classList.add('talk');
  const t = typeInto(box, html, speed); activeTyper = t;
  await t.done; activeTyper = null;
  if (face) face.classList.remove('talk');
  if (!wait) return;
  const arrow = el('span', 'arrow', ' ▼'); arrow.style.fontFamily = 'Arial,sans-serif'; box.appendChild(arrow);
  const v = await waitFor(done => { advanceFn = () => { advanceFn = null; done(true); }; });
  return v;
}

/* ------------------------------------------------------------ sprites/actors */
const SPR = {
  idle: { src: 'sprites/idle.png', w: 72, h: 131, n: 3, fps: 3.5 },
  run: { src: 'sprites/run.png', w: 134, h: 130, n: 4, fps: 10 },
  throw: { src: 'sprites/throw.png', w: 146, h: 148, n: 6, fps: 12 },
  cele: { src: 'sprites/celebrate.png', w: 145, h: 176, n: 5, fps: 5 },
};
Object.values(SPR).forEach(d => { const i = new Image(); i.src = d.src; });
['sprites/ball.png', 'sprites/face.png', 'sprites/hero.png'].forEach(s => { const i = new Image(); i.src = s; });
const actors = new Set();
class Actor {
  constructor(layer, x, y, scale = 1, anim = 'idle') {
    this.root = el('div', 'actor'); this.spr = el('div', 'spr'); this.root.append(this.spr); layer.append(this.root);
    this.s = scale; this.fx = 1; this.f = 0; this.acc = 0; this.loop = true; this.cb = {};
    this.pos(x, y); this.play(anim); actors.add(this);
  }
  pos(x, y) { this.x = x; this.y = y; this.root.style.transform = `translate(${x}px,${y}px)`; }
  draw() {
    const d = SPR[this.name], s = this.s, st = this.spr.style;
    st.width = d.w * s + 'px'; st.height = d.h * s + 'px'; st.backgroundImage = `url(${d.src})`;
    st.backgroundSize = `${d.w * d.n * s}px ${d.h * s}px`; st.backgroundPosition = `${-this.f * d.w * s}px 0`;
    st.setProperty('--fx', this.fx);
  }
  play(name, { loop = true, fps, onFrame } = {}) {
    this.name = name; this.f = 0; this.acc = 0; this.loop = loop; this.fps = fps || SPR[name].fps; this.cb = onFrame || {};
    this.draw();
    return new Promise(r => { this.res = r; });
  }
  setFlip(left) { this.fx = left ? -1 : 1; this.spr.style.setProperty('--fx', this.fx); }
  update(dt) {
    const d = SPR[this.name]; this.acc += dt; const step = 1 / this.fps; let moved = false;
    while (this.acc >= step) {
      this.acc -= step;
      if (this.f >= d.n - 1) { if (this.loop) this.f = 0; else { if (this.res) { const r = this.res; this.res = null; r(); } this.acc = 0; break; } }
      else this.f++;
      moved = true; if (this.cb[this.f]) this.cb[this.f]();
    }
    if (moved) this.spr.style.backgroundPosition = `${-this.f * d.w * this.s}px 0`;
  }
  destroy() { actors.delete(this); this.root.remove(); }
}

/* ---------------------------------------------------------------- particles */
const fxc = $('#fx'), fxg = fxc.getContext('2d'); let parts = [];
function burst(x, y, n, colors, { spread = 220, up = 120, grav = 420, size = 4, life = 1.1 } = {}) {
  if (reduceMotion) n = Math.min(n, 8);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * spread;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, g: grav, c: pick(colors), sz: size + rnd(3), life: life * (.6 + Math.random() * .6), t: 0 });
  }
}
function confettiRain(n = 80) {
  if (reduceMotion) n = 12;
  const cols = ['#ffd23f', '#d9232d', '#1c3fb8', '#ffffff', '#7dff9a', '#7de9ff'];
  for (let i = 0; i < n; i++) parts.push({ x: Math.random() * 640, y: -10 - Math.random() * 120, vx: (Math.random() - .5) * 60, vy: 40 + Math.random() * 80, g: 30, c: pick(cols), sz: 4 + rnd(3), life: 3.2, t: 0 });
}
function updateFx(dt) {
  fxg.clearRect(0, 0, 640, 480);
  parts = parts.filter(p => (p.t += dt) < p.life);
  for (const p of parts) {
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    fxg.globalAlpha = Math.min(1, (p.life - p.t) * 2); fxg.fillStyle = p.c; fxg.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz);
  }
  fxg.globalAlpha = 1;
}
function popup(text, x, y, cls = '') { const p = el('div', 'pop ' + cls, text); p.style.left = x + 'px'; p.style.top = y + 'px'; $('#world').appendChild(p); setTimeout(() => p.remove(), 1050); }
function shake() { if (reduceMotion) return; const w = $('#world'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); setTimeout(() => w.classList.remove('shake'), 380); }
function flash(color = '#fff') { const f = $('#flash'); f.style.background = color; f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

/* =========================================================== PIXEL ART BUILDERS */
/* ---- stadium / cave backdrops (drawn at 160px wide and scaled up 4x) ---- */
const THEMES = {
  day: { sky: ['#3b8dff', '#63aeff', '#9ccfff', '#d6efff'], stand: '#56658f', crowd: ['#d9232d', '#1c3fb8', '#fff', '#ffd23f', '#dfe3f5'], grass: ['#2f9e44', '#3dba55'], clouds: true },
  dusk: { sky: ['#1d1b52', '#5e2a86', '#c24a6e', '#ff8f5a', '#ffd28a'], stand: '#3a3560', crowd: ['#d9232d', '#4a68ff', '#fff', '#ffd23f', '#c9c4e8'], grass: ['#257a3a', '#2f9448'], lights: true, clouds: true },
  night: { sky: ['#03041a', '#0a1042', '#142a7a'], stand: '#262a5c', crowd: ['#d9232d', '#4a68ff', '#fff', '#ffd23f', '#a9b4ff'], grass: ['#1f7a36', '#27903f'], lights: true },
  boss: { sky: ['#14040a', '#3a0a18', '#701428'], stand: '#2c1020', crowd: ['#ff3b3b', '#ffd23f', '#fff', '#7a1020', '#ffa0a0'], grass: ['#1b5c2a', '#23723a'], lights: true, lightning: true },
  cave: { cave: true, sky: ['#0a0614', '#170d2c', '#241646'], grass: ['#4a4560', '#585272'] },
};
const staticCache = {};
function buildStatic(name, W, H) {
  const key = name + W + 'x' + H; if (staticCache[key]) return staticCache[key];
  const T = THEMES[name], c = mk(W, H), g = c.getContext('2d'), hz = Math.round(H * (T.cave ? .66 : .6));
  const n = T.sky.length, bh = hz / n;
  for (let y = 0; y < hz; y++) for (let x = 0; x < W; x++) {
    const bi = Math.min(n - 1, Math.floor(y / bh)), fr = y / bh - bi;
    let col = T.sky[bi]; if (bi < n - 1 && fr > .62 && ((x + y) & 1) === 0) col = T.sky[bi + 1];
    px(g, x, y, col);
  }
  if (T.cave) {
    for (let y = 0; y < hz; y++) for (let x = 0; x < W; x++) { const h = hash(x, y); if (h > .93) px(g, x, y, '#2e2050'); else if (h < .03) px(g, x, y, '#0a0614'); }
    for (let x = 0; x < W; x += 5 + rnd(5)) { const len = 4 + rnd(14); for (let i = 0; i < len; i++) px(g, x + (i < 2 ? 0 : 1), i, i % 3 ? '#3a2a66' : '#2a1d4c', Math.max(1, 4 - Math.floor(i / 3)), 1); }
    for (let x = 6; x < W; x += 22 + rnd(12)) { const col = pick(['#5ee8ff', '#ff6fd8', '#9dff7a']); const hh = 5 + rnd(6); for (let i = 0; i < hh; i++) px(g, x, hz - i, col, 3 - (i > hh - 3 ? 1 : 0) - (i > hh - 2 ? 1 : 0) || 1, 1); px(g, x, hz - hh + 1, '#fff'); }
  } else {
    const stTop = hz - Math.round(H * (H > 90 ? .3 : .3));
    for (let y = stTop; y < hz; y++) {
      for (let x = 0; x < W; x++) {
        const h = hash(x, y * 3);
        if ((y - stTop) % 8 === 7) px(g, x, y, '#10102a');
        else if (x % 2 === 0 && y % 2 === 0 && h > .2) px(g, x, y, T.crowd[Math.floor(hash(x + 9, y) * T.crowd.length)]);
        else px(g, x, y, (x + y) % 5 === 0 ? '#00000033' : T.stand);
      }
    }
    px(g, 0, stTop - 1, '#9aa4c8', W, 1); px(g, 0, stTop, '#10102a', W, 1);
    if (T.lights) for (const lx of [10, W - 11]) {
      px(g, lx, stTop - Math.round(H * .24), '#2a2f55', 1, Math.round(H * .24));
      px(g, lx - 5, stTop - Math.round(H * .24) - 3, '#2a2f55', 11, 4);
      for (let i = 0; i < 5; i++) px(g, lx - 4 + i * 2, stTop - Math.round(H * .24) - 2, '#fffbd0', 1, 2);
      px(g, lx - 8, stTop - Math.round(H * .24) - 5, 'rgba(255,255,200,.18)', 17, 8);
    }
  }
  // field / floor with perspective stripes
  const cave = !!T.cave;
  for (let y = hz; y < H; y++) {
    const r = y - hz, band = Math.floor(Math.sqrt(r) * 1.15);
    for (let x = 0; x < W; x++) {
      let col = T.grass[band % 2];
      if (cave && hash(x, y) > .9) col = '#3c3752';
      px(g, x, y, col);
    }
    if (!cave && band % 3 === 0 && Math.floor(Math.sqrt(r - 1) * 1.15) !== band) px(g, 0, y, '#ffffffcc', W, 1);
  }
  if (!cave) { px(g, 0, hz, '#0e2a12', W, 1); for (let x = 8; x < W; x += 20) px(g, x, hz + Math.round((H - hz) * .55), '#ffffff88', 1, 2); }
  return (staticCache[key] = c);
}
function drawBG(g, name, W, H, t) {
  const T = THEMES[name], s = buildStatic(name, W, H); g.drawImage(s, 0, 0);
  if (T.clouds) for (let i = 0; i < 4; i++) {
    const x = ((i * 47 + t * 4) % (W + 40)) - 20, y = 3 + i * 5 % 14;
    px(g, x, y, 'rgba(255,255,255,.7)', 14, 2); px(g, x + 3, y - 1, 'rgba(255,255,255,.7)', 8, 1); px(g, x + 2, y + 2, 'rgba(255,255,255,.45)', 10, 1);
  }
  if (!T.cave) {
    const hz = Math.round(H * .6), stTop = hz - Math.round(H * .3), fr = Math.floor(t * 6);
    for (let i = 0; i < 6; i++) { const hx = Math.floor(hash(i, fr) * W), hy = stTop + 2 + Math.floor(hash(fr, i) * (hz - stTop - 4)); px(g, hx, hy, '#fff', 2, 1); px(g, hx, hy - 1, 'rgba(255,255,255,.5)', 1, 1); }
  } else {
    const fr = Math.floor(t * 3);
    for (let i = 0; i < 4; i++) px(g, Math.floor(hash(i, fr) * W), Math.floor(8 + hash(fr, i) * (H * .62)), pick(['#7df', '#f9f', '#bff']), 1, 1);
  }
  if (T.lightning && Math.floor(t * 2) % 7 === 0 && (t * 2) % 1 < .25) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, W, H); }
}

/* ---- overworld map ---- */
function segDist(px_, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1; let t = ((px_ - a[0]) * dx + (py - a[1]) * dy) / l; t = clamp(t, 0, 1);
  return Math.hypot(px_ - (a[0] + t * dx), py - (a[1] + t * dy));
}
function drawIcon(g, kind, cx, cy) {
  const R = (x, y, w, h, c) => px(g, cx + x, cy + y, c, w, h);
  switch (kind) {
    case 'camp': for (const [ox, col] of [[-9, '#d9232d'], [2, '#1c3fb8']]) for (let i = 0; i < 8; i++) R(ox + 4 - Math.floor(i / 2) - (i > 5 ? 0 : 0), -8 + i, 2 * Math.floor(i / 2) + 2, 1, i % 3 === 2 ? '#fff' : col); R(-3, 1, 2, 2, '#5a3a1c'); break;
    case 'field': R(-10, -7, 20, 12, '#1f7a36'); R(-10, -7, 20, 1, '#fff'); R(-10, 4, 20, 1, '#fff'); R(-10, -7, 1, 12, '#fff'); R(9, -7, 1, 12, '#fff'); R(0, -7, 1, 12, '#fff'); R(-12, -3, 1, 4, '#ffd23f'); R(11, -3, 1, 4, '#ffd23f'); break;
    case 'cave': for (let y = 0; y < 10; y++) { const w = 22 - Math.abs(y - 9) * 0; R(-11 + Math.floor((9 - y) * .7), -9 + y, 22 - Math.floor((9 - y) * 1.4), 1, y % 2 ? '#6e6a86' : '#807c9a'); } R(-4, -3, 8, 6, '#0a0614'); R(-3, -4, 6, 1, '#0a0614'); R(-2, -5, 4, 1, '#0a0614'); R(6, -3, 2, 3, '#5ee8ff'); R(-8, -2, 2, 2, '#ff6fd8'); break;
    case 'goal': R(-1, -2, 2, 10, '#ffd23f'); R(-8, -2, 16, 2, '#ffd23f'); R(-8, -10, 2, 8, '#ffd23f'); R(6, -10, 2, 8, '#ffd23f'); R(-3, 8, 6, 1, '#1f7a36'); break;
    case 'peak': for (let i = 0; i < 14; i++) { const w = Math.floor(i * 1.8) + 2; R(-Math.floor(w / 2), -12 + i, w, 1, i < 4 ? '#fff' : (i % 2 ? '#7d7a96' : '#8d8aa8')); } break;
    case 'stadium': for (let y = -9; y <= 9; y++) for (let x = -16; x <= 16; x++) { const d = (x / 16) ** 2 + (y / 9) ** 2; if (d <= 1) px(g, cx + x, cy + y, d > .62 ? (((x + y) & 1) ? '#c9cde2' : '#8b90b0') : (((x >> 1) + (y >> 1)) & 1 ? '#2f9e44' : '#3dba55')); } R(-16, -1, 3, 1, '#ffd23f'); R(13, -1, 3, 1, '#ffd23f'); R(-12, -13, 1, 5, '#8b90b0'); R(11, -13, 1, 5, '#8b90b0'); R(-13, -14, 3, 1, '#fff7a0'); R(10, -14, 3, 1, '#fff7a0'); break;
  }
}
function buildMap(stages) {
  const W = 160, H = 120, c = mk(W, H), g = c.getContext('2d');
  const P = stages.map(s => [s.pos[0] / 4, s.pos[1] / 4]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const h = hash(x, y); let col = ((x + y) & 1) ? '#3aa84a' : '#36a046'; if (h > .965) col = '#2b8a3c'; else if (h < .012) col = pick(['#fff', '#ffd23f', '#ff9bd0']); px(g, x, y, col); }
  const pond = (cx, cy, rx, ry) => { for (let y = -ry - 2; y <= ry + 2; y++) for (let x = -rx - 2; x <= rx + 2; x++) { const d = (x / rx) ** 2 + (y / ry) ** 2; if (d <= 1) px(g, cx + x, cy + y, ((x + y) & 1) && d < .6 ? '#5ea0ff' : '#3c7fe8'); else if (d <= 1.25) px(g, cx + x, cy + y, '#e8dca0'); } };
  pond(20, 22, 15, 8); pond(140, 100, 12, 7); pond(150, 62, 5, 9);
  for (const i of [3, 4, 6]) { const [cx, cy] = P[i]; for (let y = -16; y <= 16; y++) for (let x = -18; x <= 18; x++) { const d = (x / 18) ** 2 + (y / 16) ** 2; if (d < 1 && (d < .72 || hash(cx + x, cy + y) > .5)) px(g, cx + x, cy + y, hash(x, y) > .7 ? '#6a6682' : ((x + y) & 1 ? '#7d7a96' : '#716d8c')); } }
  const near = (x, y, r) => { for (let i = 0; i < P.length - 1; i++) if (segDist(x, y, P[i], P[i + 1]) < r) return true; return P.some(p => Math.hypot(x - p[0], y - p[1]) < r + 8); };
  for (let i = 0; i < P.length - 1; i++) { const [a, b] = [P[i], P[i + 1]]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (const [th, col] of [[5, '#7a5a2c'], [3, '#d2a860']]) for (let t = 0; t <= L; t += .5) px(g, Math.round(a[0] + (b[0] - a[0]) * t / L - th / 2), Math.round(a[1] + (b[1] - a[1]) * t / L - th / 2), col, th, th);
    for (let t = 0; t <= L; t += 4) px(g, Math.round(a[0] + (b[0] - a[0]) * t / L), Math.round(a[1] + (b[1] - a[1]) * t / L), '#f0d9a0', 1, 1); }
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 260; k++) {
    const x = Math.floor(r() * (W - 6)) + 3, y = Math.floor(r() * (H - 8)) + 5;
    if (near(x, y, 9) || [3, 4, 6].some(i => Math.hypot(x - P[i][0], y - P[i][1]) < 20)) continue;
    if (Math.hypot(x - 20, y - 22) < 19 || Math.hypot(x - 140, y - 100) < 16 || Math.hypot(x - 150, y - 62) < 12) continue;
    px(g, x, y, '#4a2c12', 1, 2); px(g, x - 1, y - 1, '#1f6a30', 3, 1); px(g, x - 2, y - 3, '#27883c', 5, 2); px(g, x - 1, y - 5, '#2f9e44', 3, 2); px(g, x, y - 6, '#52c25e', 1, 1);
  }
  stages.forEach((s, i) => drawIcon(g, s.icon, Math.round(P[i][0]), Math.round(P[i][1]) - 11));
  return c;
}

/* ---- enemies (procedural pixel monsters) ---- */
const PAL = {
  green: { o: '#12401c', hi: '#b6ff95', mid: '#47c94d', lo: '#28903a' }, orange: { o: '#5a2308', hi: '#ffe0a0', mid: '#ff9b3d', lo: '#c8601a' },
  purple: { o: '#2c1250', hi: '#dcb8ff', mid: '#9b5de5', lo: '#6a34ad' }, cyan: { o: '#06304a', hi: '#b8f6ff', mid: '#3cc8f0', lo: '#1f8ab8' },
  pink: { o: '#4a0a3a', hi: '#ffc0f0', mid: '#ff6fd8', lo: '#c03a9e' }, gold: { o: '#4a3000', hi: '#fff0a0', mid: '#ffd23f', lo: '#c8920a' },
  ice: { o: '#14305a', hi: '#ffffff', mid: '#9fd4ff', lo: '#5a9ae0' }, red: { o: '#2a0408', hi: '#ff8a8a', mid: '#e02a36', lo: '#8a121c' },
};
function rr(g, x0, y0, x1, y1, r, col) {
  g.fillStyle = col;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const cx = x < x0 + r ? x0 + r : (x > x1 - r ? x1 - r : x), cy = y < y0 + r ? y0 + r : (y > y1 - r ? y1 - r : y);
    if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + .5) g.fillRect(x, y, 1, 1);
  }
}
function enemyCanvas(type, palName, open) {
  const P = PAL[palName];
  if (type === 'slime') {
    const c = mk(32, 32), g = c.getContext('2d');
    rr(g, 2, 9, 29, 29, 5, P.o); rr(g, 3, 10, 28, 28, 4, P.lo); rr(g, 3, 10, 28, 26, 4, P.mid);
    px(g, 6, 12, P.hi, 7, 2); px(g, 5, 14, P.hi, 2, 3);
    px(g, 6, 29, P.o, 5, 2); px(g, 21, 29, P.o, 5, 2); px(g, 14, 7, P.o, 4, 2); px(g, 15, 5, P.o, 2, 2); px(g, 15, 6, P.mid, 2, 1);
    for (const ex of [8, 19]) { px(g, ex - 1, 15, P.o, 7, 9); px(g, ex, 16, '#fff', 5, 7); px(g, ex + 1, 18, '#111', 3, 4); px(g, ex + 1, 18, '#fff', 1, 1); }
    if (open) { px(g, 11, 24, P.o, 10, 5); px(g, 12, 25, '#7a0f18', 8, 3); px(g, 14, 27, '#ff6b81', 4, 1); } else { px(g, 12, 25, P.o, 8, 1); px(g, 11, 24, P.o, 1, 1); px(g, 20, 24, P.o, 1, 1); }
    return c;
  }
  const boss = type === 'boss', S = boss ? 48 : 32, c = mk(S, S), g = c.getContext('2d');
  const cx = S / 2, top = boss ? 9 : 3, w = boss ? 19 : 13, h = boss ? 10 : 7, H = boss ? 19 : 11;
  const face = (x, y) => {
    const dx = x + .5 - cx, yy = y + .5;
    if (Math.abs(dx) / w + Math.abs(yy - (top + h)) / h <= 1) return 1;
    if (dx < 0 && dx >= -w) { const yu = top + h + (dx + w) * (h / w); return yy > yu && yy <= yu + H ? 2 : 0; }
    if (dx >= 0 && dx <= w) { const yu = top + 2 * h - dx * (h / w); return yy > yu && yy <= yu + H ? 3 : 0; }
    return 0;
  };
  const F = []; for (let y = 0; y < S; y++) { F[y] = []; for (let x = 0; x < S; x++) F[y][x] = face(x, y); }
  const at = (x, y) => (F[y] && F[y][x]) || 0;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const f = F[y][x]; if (!f) continue;
    const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
    const seam = (f === 2 && at(x + 1, y) === 3) || (f === 3 && at(x - 1, y) === 2) || (f === 1 && (at(x, y + 1) === 2 || at(x, y + 1) === 3));
    px(g, x, y, edge || seam ? P.o : f === 1 ? P.hi : f === 2 ? P.mid : P.lo);
  }
  // face on the left side
  const ex = Math.round(cx - w * .72), ey = Math.round(top + h + H * .22 + (boss ? 3 : 1));
  for (const [dx, dy] of [[0, 0], [boss ? 8 : 5, boss ? 4 : 2]]) { px(g, ex + dx, ey + dy, '#fff', boss ? 5 : 4, boss ? 6 : 5); px(g, ex + dx + 1, ey + dy + 1, '#111', boss ? 3 : 2, boss ? 4 : 3); }
  if (boss) { px(g, ex - 1, ey - 3, '#2a0408', 7, 2); px(g, ex + 7, ey - 1, '#2a0408', 7, 2); }
  const my = ey + (boss ? 10 : 8), mx = ex + 1;
  if (open) { px(g, mx, my, P.o, boss ? 10 : 7, boss ? 5 : 4); px(g, mx + 1, my + 1, '#7a0f18', boss ? 8 : 5, boss ? 3 : 2); } else px(g, mx, my + 1, P.o, boss ? 10 : 7, 1);
  if (boss) { // crown
    const cy = top + 2; for (let x = -7; x <= 7; x++) px(g, cx + x, cy + 3, '#ffd23f'); for (const x of [-7, 0, 7]) { px(g, cx + x - 1, cy - 1, '#ffd23f', 3, 4); px(g, cx + x, cy - 3, '#fff0a0', 1, 3); }
    px(g, cx - 3, cy + 1, '#d9232d', 2, 2); px(g, cx + 2, cy + 1, '#3cc8f0', 2, 2);
  }
  return c;
}

/* =================================================================== QUESTIONS */
function wrongSet(correct, cands, fb) {
  const seen = new Set([correct]), out = [];
  for (const c of shuffle(cands)) if (Number.isFinite(c) && c > 0 && !seen.has(c)) { seen.add(c); out.push(c); if (out.length === 3) return out; }
  let k = 1; while (out.length < 3) { const c = fb(k++); if (c > 0 && !seen.has(c)) { seen.add(c); out.push(c); } }
  return out;
}
const oddNote = n => n <= 10 ? ` (Also: the first ${n} odd numbers add up to ${n * n}!)` : '';
const sqTrick = n => {
  const v = n * n;
  if (n >= 11 && n <= 19) { const a = n - 10; return ` Trick: 100 + ${20 * a} + ${a * a} = ${v}.`; }
  if (n >= 20 && n <= 25) { const a = n - 20; return a ? ` Trick: 400 + ${40 * a} + ${a * a} = ${v}.` : ` 2 × 2 = 4, then add two zeros.`; }
  return oddNote(n);
};
const cuTrick = n => {
  const l = ([0, 1, 8, 7, 4, 5, 6, 3, 2, 9])[n % 10];
  return ` Check: it must end in ${l}.`;
};
const CATS = { both: 'BOTH', sq: 'SQUARE', cu: 'CUBE', none: 'NEITHER' };
const CLASS_CHOICES = ['SQUARE', 'CUBE', 'BOTH', 'NEITHER'];
const classOf = v => isSq(v) && isCu(v) ? 'both' : isSq(v) ? 'sq' : isCu(v) ? 'cu' : 'none';
const POOL = {
  both: [1, 64, 729, 4096], neither: [2, 3, 10, 12, 20, 30, 50, 72, 90, 150, 200, 500, 1200],
  sq: n => range(2, n).map(x => x * x).filter(v => !isCu(v)),
  cu: n => range(2, n).map(x => x ** 3).filter(v => !isSq(v)),
};
function makeQ(s) {
  const n = s.n; let v, wrong, prompt, sub, exp, choices, answer;
  switch (s.t) {
    case 'sq': v = n * n; wrong = wrongSet(v, [2 * n, n * (n + 1), n * (n - 1), (n + 1) ** 2, (n - 1) ** 2, v + 10, v - 10, v + n, v - n, v + 2 * n], k => v + 2 * k);
      prompt = `${n}² = ?`; sub = `Squared means ${n} × ${n}`; exp = `${n}² = ${n} × ${n} = <y>${fmt(v)}</y>.${sqTrick(n)}`; break;
    case 'sqrt': v = n * n; wrong = wrongSet(n, [n + 1, n - 1, n + 2, n - 2, 2 * n, Math.floor(v / 2) > 30 ? 0 : Math.floor(v / 2)], k => n + k + 2);
      prompt = `${rad(fmt(v))} = ?`; sub = `What number times itself makes ${fmt(v)}?`; exp = `${n} × ${n} = ${fmt(v)}, so ${rad(fmt(v))} = <y>${n}</y>.`; v = n; break;
    case 'cu': v = n ** 3; wrong = wrongSet(v, [3 * n, n * n, (n + 1) ** 3, (n - 1) ** 3, v + n, v - n, n * n * (n + 1), n * (n + 1) * (n + 2), v + 100], k => v + k * 10);
      prompt = `${n}³ = ?`; sub = `Cubed means ${n} × ${n} × ${n}`; exp = `${n}³ = ${n} × ${n} × ${n}. First ${n} × ${n} = ${n * n}, then ${n * n} × ${n} = <y>${fmt(v)}</y>.${cuTrick(n)}`; break;
    case 'cbrt': v = n ** 3; wrong = wrongSet(n, [n + 1, n - 1, n + 2, n - 2, 3 * n > 40 ? 0 : 3 * n, n * n > 40 ? 0 : n * n], k => n + k + 2);
      prompt = `${crad(fmt(v))} = ?`; sub = `What number times itself 3 times makes ${fmt(v)}?`; exp = `${n} × ${n} × ${n} = ${fmt(v)}, so ${crad(fmt(v))} = <y>${n}</y>.`; v = n; break;
    case 'whichsq': {
      v = n * n; const lo = s.lo || 1, hi = s.hi || 10, c = [];
      for (let m = lo; m <= Math.max(hi, lo + 3); m++) c.push(m * m + 1, m * m - 1, m * m + m, m * m - m, m * m + 2);
      for (let m = 2; m <= 6; m++) c.push(m ** 3);
      wrong = wrongSet(v, c.filter(x => !isSq(x) && x > 1 && Math.abs(x - v) < Math.max(40, v)), k => v + 2 * k + 1).map(x => x);
      for (let i = 0; i < 3; i++) if (isSq(wrong[i])) wrong[i] = wrong[i] + 1;
      prompt = 'Which is a <y>PERFECT SQUARE</y>?'; sub = 'A whole number times itself'; exp = `${fmt(v)} = ${n} × ${n}, so it is a perfect square. The others are not a whole number times itself.`; break; }
    case 'whichcu': {
      v = n ** 3; const lo = s.lo || 1, hi = s.hi || 10, c = [];
      for (let m = lo; m <= hi; m++) c.push(m ** 3 + 1, m ** 3 - 1, m ** 3 + m, m ** 3 - m, m * m);
      wrong = wrongSet(v, c.filter(x => !isCu(x) && x > 1 && Math.abs(x - v) < Math.max(80, v)), k => v + 3 * k + 1);
      for (let i = 0; i < 3; i++) if (isCu(wrong[i])) wrong[i] += 1;
      prompt = 'Which is a <y>PERFECT CUBE</y>?'; sub = 'A whole number times itself 3 times'; exp = `${fmt(v)} = ${n} × ${n} × ${n}, so it is a perfect cube. Squares like 25 or 49 are not cubes!`; break; }
    case 'class': {
      v = s.v; const k = classOf(v); answer = ['sq', 'cu', 'both', 'none'].indexOf(k); choices = CLASS_CHOICES.slice();
      prompt = `Is <y>${fmt(v)}</y> a perfect square, cube, both or neither?`; sub = '';
      const r2 = Math.round(Math.sqrt(v)), r3 = Math.round(Math.cbrt(v));
      exp = k === 'both' ? `${fmt(v)} = ${r2}² AND ${fmt(v)} = ${r3}³. It's BOTH, a rare double threat!` :
        k === 'sq' ? `${fmt(v)} = ${r2} × ${r2}, so it's a SQUARE. But no whole number cubed makes it.` :
        k === 'cu' ? `${fmt(v)} = ${r3} × ${r3} × ${r3}, so it's a CUBE. But no whole number squared makes it.` :
        `No whole number squared or cubed makes ${fmt(v)}. It's NEITHER.`;
      return { spec: s, prompt, sub, choices, answer, exp, words: true, long: true };
    }
  }
  const all = shuffle([v, ...wrong]);
  return { spec: s, prompt, sub, choices: all.map(fmt), answer: all.indexOf(v), exp, words: false, long: s.t === 'whichsq' || s.t === 'whichcu' };
}
function buildQueue(stage) {
  const { kind, lo, hi, n } = stage; const specs = []; let deck = [];
  const base = (a = lo, b = hi) => { if (!deck.length || deck._k !== a + '-' + b) { deck = shuffle(range(a, b)); deck._k = a + '-' + b; } return deck.pop(); };
  const addMany = (t, cnt, a, b) => { for (let i = 0; i < cnt; i++) specs.push({ t, n: base(a, b), lo, hi }); };
  if (kind === 'sq') { const w = Math.round(n * .2); addMany('sq', Math.round(n * .5), lo, hi); addMany('sqrt', n - w - Math.round(n * .5), lo, hi); addMany('whichsq', w, lo, hi); }
  else if (kind === 'cu') { const w = Math.round(n * .2); addMany('cu', Math.round(n * .5), lo, hi); addMany('cbrt', n - w - Math.round(n * .5), lo, hi); addMany('whichcu', w, lo, hi); }
  else if (kind === 'mix') {
    addMany('sq', 2); addMany('cu', 2); addMany('sqrt', 2); addMany('cbrt', 2);
    const vals = shuffle([1, 64, 729, ...POOL.sq(10).slice(0, 5), ...POOL.cu(10), 50, 200]); ['both', 'sq', 'cu', 'none'].forEach((k, i) => { const cand = vals.filter(x => classOf(x) === k); if (cand.length) specs.push({ t: 'class', v: pick(cand) }); });
  } else { // boss: everything
    addMany('sq', 4, 12, 25); addMany('sqrt', 2, 11, 25); addMany('cu', 3, 3, 12); addMany('cbrt', 2, 3, 12);
    const nw = [...POOL.both, 1200, 50, ...POOL.sq(25).slice(-4), ...POOL.cu(12).slice(-3), 72, 500]; ['both', 'sq', 'cu'].forEach(k => specs.push({ t: 'class', v: pick(nw.filter(x => classOf(x) === k)) }));
    specs.push({ t: 'class', v: pick(POOL.neither) });
  }
  return shuffle(specs).map(makeQ);
}

/* =============================================================== STAGE DATA */
const STAGES = [
  { name: 'ROOKIE CAMP', sub: 'Squares 1-10', kind: 'sq', lo: 1, hi: 10, n: 8, enemy: { type: 'slime', name: 'SQUARE SLIME', pal: 'green' }, theme: 'day', pos: [70, 336], icon: 'camp' },
  { name: 'TURF TOWN', sub: 'Squares 11-15', kind: 'sq', lo: 11, hi: 15, n: 8, enemy: { type: 'slime', name: 'TURF BLOB', pal: 'orange' }, theme: 'day', pos: [168, 286], icon: 'field' },
  { name: 'BLITZ BAY', sub: 'Squares 16-25', kind: 'sq', lo: 16, hi: 25, n: 10, enemy: { type: 'slime', name: 'BLITZ BLOB', pal: 'purple' }, theme: 'dusk', pos: [262, 336], icon: 'field' },
  { name: 'CUBE CAVE', sub: 'Cubes 1-5', kind: 'cu', lo: 1, hi: 5, n: 8, enemy: { type: 'cube', name: 'CUBE GOLEM', pal: 'cyan' }, theme: 'cave', pos: [352, 280], icon: 'cave' },
  { name: 'CRYSTAL RIDGE', sub: 'Cubes 6-10', kind: 'cu', lo: 6, hi: 10, n: 8, enemy: { type: 'cube', name: 'CRYSTAL CUBE', pal: 'pink' }, theme: 'cave', pos: [250, 210], icon: 'cave' },
  { name: 'PLAYOFF PASS', sub: 'Squares + Cubes 1-10', kind: 'mix', lo: 1, hi: 10, n: 10, enemy: { type: 'cube', name: 'DOUBLE THREAT', pal: 'gold' }, theme: 'night', pos: [356, 156], icon: 'goal' },
  { name: 'CUBE SUMMIT', sub: 'Cubes 11-25', kind: 'cu', lo: 11, hi: 25, n: 10, enemy: { type: 'cube', name: 'SUMMIT TITAN', pal: 'ice' }, theme: 'dusk', pos: [470, 212], icon: 'peak' },
  { name: 'SUPER BOWL', sub: 'Everything 1-25', kind: 'boss', lo: 1, hi: 25, n: 14, enemy: { type: 'boss', name: 'THE CUBE KING', pal: 'red' }, theme: 'boss', pos: [566, 116], icon: 'stadium' },
];

/* ============================================================= LESSON CONTENT */
const listHTML = (kind, lo, hi, cols = 2) => `<div class="cells" style="grid-template-columns:repeat(${cols},1fr)">${range(lo, hi).map(n => kind === 'sq' ? `<div><y>${n}²</y> = ${n * n}</div>` : `<div><y>${n}³</y> = ${fmt(n ** 3)}</div>`).join('')}</div>`;
const LAST = [0, 1, 4, 9, 6, 5, 6, 9, 4, 1], LASTC = [0, 1, 8, 7, 4, 5, 6, 3, 2, 9];
const digitTable = cubes => `<table class="tbl"><tr><th>n ends in</th>${range(0, 9).map(d => `<td>${d}</td>`).join('')}</tr><tr><th>${cubes ? 'n³' : 'n²'} ends in</th>${range(0, 9).map(d => { const v = cubes ? LASTC[d] : LAST[d]; return `<td>${cubes && v !== d ? `<y>${v}</y>` : v}</td>`; }).join('')}</tr></table>
  <div style="margin-top:12px;line-height:1.7">${cubes ? 'Cubes of <y>2, 3, 7, 8</y> swap:<br>2→8, 8→2, 3→7, 7→3.<br>The rest end in themselves!' : 'Squares only end in<br><g>0, 1, 4, 5, 6, 9</g>.<br>Never <r>2, 3, 7 or 8</r>!'}</div>`;
const cmpTable = () => `<table class="tbl"><tr><th>n</th><th>n²</th><th>n³</th></tr>${range(1, 10).map(n => `<tr><td>${n}</td><td>${n * n}</td><td>${fmt(n ** 3)}</td></tr>`).join('')}</table>`;
const PAGES = [
  [ // 0 squares 1-10
    { t: 'SQUARES', x: `Yo, rookie! I'm Josh Allen, your coach. First play: <y>SQUARES</y>. Squaring a number means multiplying it by <y>itself</y>. Like 4² = 4 × 4 = 16.`, v: { k: 'grid', n: 4, min: 1, max: 10 } },
    { t: 'WHY "SQUARE"?', x: `Look! 4 rows of 4 blocks make a perfect <y>SQUARE</y>. That's why we call it squaring. Press UP / DOWN (or - / +) to try other numbers!`, v: { k: 'grid', n: 5, min: 1, max: 10 } },
    { t: 'THE L-SHAPE TRICK', x: `Cool trick: add up <y>odd numbers</y>! 1 + 3 + 5 + 7 = 16 = 4². Every new L-shaped layer adds the next odd number.`, v: { k: 'odd', n: 4, min: 1, max: 10 } },
    { t: 'MEMORIZE THESE', x: `Learn the first ten squares. And the <y>square root</y> is the undo button: ${rad('49')} = 7, because 7 × 7 = 49.`, v: { k: 'html', html: () => listHTML('sq', 1, 10, 2) } },
  ],
  [ // 1 squares 11-15
    { t: 'SPLIT IT UP', x: `Bigger squares need a trick! Use <y>(10 + a)² = 100 + 20a + a²</y>. Example: 13² = 100 + 60 + 9 = 169. Press UP / DOWN to try more!`, v: { k: 'html', n: 13, min: 11, max: 15, html: n => { const a = n - 10; return `<div class="big">${n}²</div><div class="steps"><div>= (10 + ${a})²</div><div>= 100 + 20×${a} + ${a}²</div><div>= 100 + ${20 * a} + ${a * a}</div><div>= <g>${n * n}</g></div></div>`; } } },
    { t: 'QUARTERBACK FAVORITES', x: `11² is easy: 110 + 11 = 121. And <y>12² = 144</y> and <y>15² = 225</y> show up everywhere. Burn these into your brain!`, v: { k: 'html', html: () => listHTML('sq', 11, 15, 2) } },
  ],
  [ // 2 squares 16-25
    { t: 'BREAK IT APART', x: `Go big! Split the second number: 17 × 17 = 17 × 10 + 17 × 7 = 170 + 119 = <y>289</y>. Press UP / DOWN to try others!`, v: { k: 'html', n: 17, min: 16, max: 25, html: n => { const t = Math.floor(n / 10) * 10, o = n % 10; return `<div class="big">${n}²</div><div class="steps"><div>= ${n} × ${n}</div>${o ? `<div>= ${n}×${t} + ${n}×${o}</div><div>= ${n * t} + ${n * o}</div>` : ''}<div>= <g>${n * n}</g></div></div>`; } } },
    { t: 'THE FIVE TRICK', x: `Ends in 5? Take the first digit d, do <y>d × (d + 1)</y>, then tack on <y>25</y>. For 25²: 2 × 3 = 6, then 25 → <y>625</y>!`, v: { k: 'html', n: 25, min: 15, max: 25, step: 10, html: n => { const d = Math.floor(n / 10); return `<div class="big">${n}²</div><div class="steps"><div>first digit d = ${d}</div><div>d × (d+1) = ${d} × ${d + 1} = ${d * (d + 1)}</div><div>tack on 25 → <g>${n * n}</g></div></div>`; } } },
    { t: 'LAST-DIGIT CHECK', x: `Smart QBs check the <y>last digit</y>! Perfect squares never end in 2, 3, 7 or 8. Use it to cross out wrong answers fast.`, v: { k: 'html', html: () => digitTable(false) } },
    { t: 'THE BIG SQUARES', x: `Here are the big ones, 16 to 25. You don't need to memorize them all, but 20² = 400 and 25² = 625 are great landmarks.`, v: { k: 'html', html: () => listHTML('sq', 16, 25, 2) } },
  ],
  [ // 3 cubes 1-5
    { t: 'CUBES', x: `New play: <y>CUBES</y>! Cubing means multiplying a number by itself <y>three</y> times. 3³ = 3 × 3 × 3 = 27.`, v: { k: 'cube', n: 3, min: 1, max: 10 } },
    { t: 'STACK THE LAYERS', x: `Picture a cube of blocks: 3 wide, 3 long, 3 tall. Each layer has 3 × 3 = 9 blocks, and there are 3 layers. 9 × 3 = <y>27</y>! Try UP / DOWN.`, v: { k: 'cube', n: 4, min: 1, max: 10 } },
    { t: 'MEMORIZE THESE', x: `Cubes grow FAST: 1, 8, 27, 64, 125. Tip: <y>n³ = n² × n</y>. The <y>cube root</y> is the undo button: ${crad('27')} = 3.`, v: { k: 'html', html: () => listHTML('cu', 1, 5, 1).replace('class="cells"', 'class="cells" style="font-size:13px;margin-top:6px"') } },
  ],
  [ // 4 cubes 6-10
    { t: 'KEEP STACKING', x: `Next five: 6³ = 216, 7³ = 343, 8³ = 512, 9³ = 729, 10³ = 1,000. Use <y>n² × n</y>: 7³ = 49 × 7 = 343.`, v: { k: 'html', html: () => listHTML('cu', 6, 10, 1).replace('class="cells"', 'class="cells" style="font-size:13px;margin-top:6px"') } },
    { t: 'LAST-DIGIT TRICK', x: `Check the last digit! Cubes of <y>2, 3, 7, 8</y> swap: 2→8, 3→7, 7→3, 8→2. The others end in themselves. So 7³ ends in 3!`, v: { k: 'html', html: () => digitTable(true) } },
    { t: 'SEE THE CUBE', x: `And 10³ is easy: a 1 followed by three zeros. Try the cube builder with UP / DOWN and watch the layers stack!`, v: { k: 'cube', n: 6, min: 1, max: 10 } },
  ],
  [ // 5 mix
    { t: 'SQUARE OR CUBE?', x: `Time to mix it up! ² means 2 copies multiplied, ³ means 3 copies. See how 2² = 4 but 2³ = 8. Cubes get big FAST.`, v: { k: 'html', html: cmpTable } },
    { t: 'DOUBLE THREATS', x: `Some numbers are BOTH a square and a cube! 1 (1² = 1³) and 64 (8² = 4³). Even 729 = 27² = 9³. Rare, so spot them!`, v: { k: 'html', html: () => `<div class="big">DOUBLE THREAT</div><div class="steps" style="text-align:center"><div><y>1</y> = 1² = 1³</div><div><y>64</y> = 8² = 4³</div><div><y>729</y> = 27² = 9³</div><div><y>4,096</y> = 64² = 16³</div></div>` } },
    { t: 'UNDO BUTTONS', x: `Roots undo powers: ${rad('49')} = 7 and ${crad('125')} = 5. Ask yourself: what number, multiplied by itself (2 or 3 times), gives this? Let's roll!`, v: { k: 'html', html: () => `<div class="steps" style="text-align:center;font-size:12px"><div><y>${rad('81')}</y> = 9</div><div>because 9 × 9 = 81</div><div style="margin-top:14px"><y>${crad('64')}</y> = 4</div><div>because 4 × 4 × 4 = 64</div></div>` } },
  ],
  [ // 6 cubes 11-25
    { t: 'BIG CUBES', x: `Summit time! Do it in two steps: <y>n³ = n² × n</y>. 12³ = 144 × 12 = <y>1,728</y>. Press UP / DOWN to build bigger cubes.`, v: { k: 'cube', n: 12, min: 11, max: 25 } },
    { t: 'CHECK THE END', x: `Rule out wrong choices with the last digit: 13³ ends in 7 (3³ = 27), 14³ ends in 4, 15³ ends in 5, 17³ ends in 3.`, v: { k: 'html', html: () => digitTable(true) } },
    { t: 'THE BIG CUBES', x: `Here they all are, 11 to 25. Landmarks: <y>20³ = 8,000</y> and <y>25³ = 15,625</y>. You've got this!`, v: { k: 'html', html: () => listHTML('cu', 11, 25, 3).replace('class="cells"', 'class="cells" style="font-size:11px;gap:2px 4px"') } },
  ],
  [ // 7 boss
    { t: 'CHAMPIONSHIP SUNDAY', x: `This is it. The <r>CUBE KING</r> stands between us and the trophy! Squares, cubes, roots, everything from 1 to 25. Three lives. Let's win this one together!`, v: { k: 'html', html: () => `<div class="big">CHEAT SHEET</div><div class="cells" style="grid-template-columns:1fr 1fr;font-size:11px"><div><y>12²</y> = 144</div><div><y>5³</y> = 125</div><div><y>15²</y> = 225</div><div><y>6³</y> = 216</div><div><y>20²</y> = 400</div><div><y>10³</y> = 1,000</div><div><y>25²</y> = 625</div><div><y>12³</y> = 1,728</div></div>` } },
  ],
];

/* ============================================================ VISUAL (canvas) */
const VW = 192, VH = 100;
function drawGrid(g, n, p) {
  g.clearRect(0, 0, VW, VH);
  const cell = Math.max(2, Math.min(Math.floor((VH - 8) / n), Math.floor((VW - 16) / n), 12)), size = cell * n, x0 = Math.floor((VW - size) / 2), y0 = Math.floor((VH - size) / 2);
  const filled = Math.min(n * n, Math.floor(p * n * n) + 1);
  for (let i = 0; i < filled; i++) {
    const r = Math.floor(i / n), c = i % n, x = x0 + c * cell, y = y0 + r * cell, w = cell - 1;
    px(g, x, y, i === filled - 1 && p < 1 ? '#fff' : '#2f55d9', w, w);
    if (cell >= 5 && !(i === filled - 1 && p < 1)) { px(g, x, y, '#7d9bff', w, 1); px(g, x, y, '#7d9bff', 1, w); px(g, x + w - 1, y, '#1a2f80', 1, w); px(g, x, y + w - 1, '#1a2f80', w, 1); }
  }
}
const ODDC = ['#2f55d9', '#d9232d', '#ffd23f', '#3fae4a', '#9b5de5', '#ff9b3d', '#3cc8f0', '#ff6fb5', '#8fd0ff', '#c8c8d8'];
function drawOdd(g, n, p) {
  g.clearRect(0, 0, VW, VH);
  const cell = Math.max(2, Math.min(Math.floor((VH - 8) / n), Math.floor((VW - 16) / n), 12)), size = cell * n, x0 = Math.floor((VW - size) / 2), y0 = Math.floor((VH - size) / 2);
  const layers = Math.min(n, Math.floor(p * n) + 1);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const L = Math.max(r, c); if (L >= layers) continue;
    px(g, x0 + c * cell, y0 + r * cell, ODDC[L % ODDC.length], cell - 1, cell - 1);
  }
}
function drawCube(g, n, p) {
  g.clearRect(0, 0, VW, VH);
  const u = Math.min((VW - 10) / (2 * n), (VH - 8) / (2 * n)), lh = u, ox = VW / 2, oy = VH / 2;
  const P = (i, j, k) => [ox + (i - j) * u, oy + (i + j) * u / 2 - k * lh];
  const poly = (pts, col) => { g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fillStyle = col; g.fill(); };
  const line = (a, b) => { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
  const L = Math.min(n, Math.floor(p * n) + 1);
  g.lineWidth = n > 12 ? .5 : .8; g.strokeStyle = 'rgba(0,10,70,.55)';
  for (let k = 0; k < L; k++) {
    const newest = k === L - 1 && p < 1;
    poly([P(0, n, k), P(n, n, k), P(n, n, k + 1), P(0, n, k + 1)], newest ? '#c9d7ff' : '#2a4fd0');
    poly([P(n, 0, k), P(n, n, k), P(n, n, k + 1), P(n, 0, k + 1)], newest ? '#9bb0ff' : '#16297a');
    for (let i = 1; i < n; i++) { line(P(i, n, k), P(i, n, k + 1)); line(P(n, i, k), P(n, i, k + 1)); }
    line(P(0, n, k + 1), P(n, n, k + 1)); line(P(n, 0, k + 1), P(n, n, k + 1));
  }
  poly([P(0, 0, L), P(n, 0, L), P(n, n, L), P(0, n, L)], '#8cabff');
  for (let i = 1; i < n; i++) { line(P(i, 0, L), P(i, n, L)); line(P(0, i, L), P(n, i, L)); }
}
class Visual {
  constructor(host, capEl) {
    this.host = host; this.cap = capEl; this.cv = mk(VW, VH); this.g = this.cv.getContext('2d'); this.html = el('div', 'vhtml');
    this.minus = el('button', 'btn nbtn', '-'); this.plus = el('button', 'btn nbtn', '+');
    this.minus.style.left = '6px'; this.plus.style.right = '6px';
    host.innerHTML = ''; host.append(this.cv, this.html, this.minus, this.plus);
    this.minus.onclick = () => this.step(-1); this.plus.onclick = () => this.step(1);
    this.spec = null; this.t = 0; this.dur = 1;
  }
  show(spec) {
    this.spec = { ...spec }; this.t = 0; const s = this.spec;
    const canvasKind = s.k !== 'html'; this.cv.style.display = canvasKind ? 'block' : 'none'; this.html.style.display = canvasKind ? 'none' : 'block';
    const inter = s.min != null && s.max != null && s.min !== s.max; this.minus.style.display = this.plus.style.display = inter ? 'block' : 'none';
    this.refresh();
  }
  step(d) {
    const s = this.spec; if (!s || s.min == null) return false;
    const st = s.step || 1, n = clamp(s.n + d * st, s.min, s.max); if (n === s.n) { Sound.play('lock'); return false; }
    s.n = n; this.t = 0; this.refresh(); Sound.play('move'); return true;
  }
  refresh() {
    const s = this.spec, n = s.n;
    if (s.k === 'html') { this.html.innerHTML = s.html(n); this.cap.innerHTML = s.cap ? s.cap(n) : (s.min != null ? `<span style="font-size:11px;color:#9fb0ff">UP / DOWN to change the number</span>` : ''); }
    else if (s.k === 'grid') { this.dur = Math.min(2, .3 + n * n * .02); this.cap.innerHTML = `<y>${n}²</y> = ${n} × ${n} = <g>${fmt(n * n)}</g><br><span style="font-size:11px;color:#9fb0ff">${n} rows of ${n} blocks</span>`; }
    else if (s.k === 'odd') { this.dur = Math.min(2.4, .4 + n * .2); const odds = range(1, n).map(i => 2 * i - 1); this.cap.innerHTML = `${n <= 7 ? odds.join(' + ') : `1 + 3 + 5 + … + ${2 * n - 1}`} = <g>${n * n}</g> = <y>${n}²</y>`; }
    else if (s.k === 'cube') { this.dur = Math.min(2.6, .5 + n * .12); this.cap.innerHTML = `<y>${n}³</y> = ${n} × ${n} × ${n} = <g>${fmt(n ** 3)}</g><br><span style="font-size:11px;color:#9fb0ff">${n}² = ${fmt(n * n)} blocks per layer × ${n} layers</span>`; }
  }
  update(dt) {
    const s = this.spec; if (!s || s.k === 'html') return; this.t += dt;
    const loop = this.dur + 2.2, p = Math.min(1, (this.t % loop) / this.dur);
    (s.k === 'grid' ? drawGrid : s.k === 'odd' ? drawOdd : drawCube)(this.g, s.n, p);
  }
}

/* ============================================================== SCENE MANAGER */
const scenes = {}; let cur = null, curName = '', inputHandler = null;
const stageEl = $('#stage'), fade = $('#fade');
async function go(name, arg) {
  fade.classList.add('on'); await sleep(300);
  if (cur) { cur.leave && cur.leave(); cur.el.classList.remove('on'); }
  abortWaiters(); parts = []; inputHandler = null;
  cur = scenes[name]; curName = name; cur.el.classList.add('on'); cur.enter(arg);
  await sleep(40); fade.classList.remove('on');
}
function fit() {
  const s = Math.min(innerWidth / 640, innerHeight / 480);
  stageEl.style.transform = `scale(${s})`;
  stageEl.style.left = Math.floor((innerWidth - 640 * s) / 2) + 'px'; stageEl.style.top = Math.floor((innerHeight - 480 * s) / 2) + 'px';
}
addEventListener('resize', fit); fit();
let last = performance.now(), clock = 0;
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now; clock += dt;
  actors.forEach(a => a.update(dt)); updateFx(dt);
  if (cur && cur.update) cur.update(dt, clock);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener('keydown', e => {
  Sound.init();
  if (e.key === ' ' || e.key.startsWith('Arrow') || e.key === 'Enter') e.preventDefault();
  if (e.key.toLowerCase() === 'm') { cycleSound(); return; }
  if (curName === 'battle' && e.key === 'Escape') { scenes.battle.quit(); return; }
  // dialogue first: one keypress must never advance text AND answer a question
  if ((e.key === 'Enter' || e.key === ' ') && (advanceFn || (activeTyper && !activeTyper.finished))) { onAdvance(); return; }
  if (inputHandler) inputHandler(e);
});
addEventListener('pointerdown', () => Sound.init(), { once: true });
function menu(host, items) {
  host.innerHTML = ''; let sel = 0;
  const btns = items.map((it, i) => { const b = el('button', 'btn' + (it.cls ? ' ' + it.cls : ''), it.label); b.onclick = () => { sel = i; paint(); choose(); }; b.onmouseenter = () => { sel = i; paint(); }; host.append(b); return b; });
  const paint = () => btns.forEach((b, i) => b.classList.toggle('sel', i === sel));
  const choose = () => { if (items[sel].off && items[sel].off()) { Sound.play('lock'); return; } Sound.play('select'); items[sel].run(); };
  paint();
  return { key(e) { if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { sel = (sel + 1) % items.length; paint(); Sound.play('move'); } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { sel = (sel + items.length - 1) % items.length; paint(); Sound.play('move'); } else if (e.key === 'Enter' || e.key === ' ') choose(); }, btns, paint };
}
function cycleSound() {
  save.sound = save.sound === 'all' ? 'sfx' : save.sound === 'sfx' ? 'off' : 'all'; persist(); Sound.refresh(); paintSnd(); Sound.play('select');
}
const sndBtn = $('#snd');
const paintSnd = () => { sndBtn.textContent = 'SND ' + ({ all: 'ALL', sfx: 'SFX', off: 'OFF' })[save.sound]; };
sndBtn.onclick = e => { Sound.init(); cycleSound(); e.stopPropagation(); };
const crtBtn = $('#crtbtn');
const paintCrt = () => { stageEl.classList.toggle('nocrt', !save.crt); crtBtn.textContent = 'CRT ' + (save.crt ? 'ON' : 'OFF'); };
crtBtn.onclick = () => { save.crt = !save.crt; persist(); paintCrt(); };
paintSnd(); paintCrt();

/* ============================================================== TITLE SCENE */
/* Level the CONTINUE button points at: the level in progress, otherwise the furthest unlocked level
   (the next one to play, or the last one if everything is cleared). null for a brand-new player. */
function resumeTarget() {
  if (save.run) return { i: save.run.i, run: true };
  if (!hasProgress()) return null;
  let i = 0; STAGES.forEach((_, k) => { if (unlocked(k)) i = k; });
  return { i, run: false };
}
scenes.title = (() => {
  const root = $('#sc-title'), bg = $('#title-bg').getContext('2d'); let m, runner, started = false, bgT = 0;
  const layer = $('#title-runner');
  function showMenu() {
    started = true; $('#title-press').style.display = 'none';
    m = menu($('#title-menu'), [
      ...(resumeTarget() ? [{ label: 'CONTINUE LEVEL ' + (resumeTarget().i + 1), cls: 'gold', run: () => { const t = resumeTarget(); t.run ? go('battle', { i: t.i, resume: true }) : go('map', t.i); } }] : []),
      { label: resumeTarget() ? 'WORLD MAP' : 'START ADVENTURE', run: () => go('map') },
      { label: 'PLAYBOOK (STUDY)', run: () => go('book') },
      { label: 'ERASE SAVE', run: () => { if (confirm('Erase all stars and progress?')) { save.stars = []; save.best = []; save.run = null; save.at = null; persist(); showMenu(); } }, off: () => !hasProgress() },
    ]);
    if (!hasProgress()) m.btns[m.btns.length - 1].style.display = 'none';
  }
  return {
    el: root,
    enter() {
      started = false; $('#title-menu').innerHTML = ''; $('#title-press').style.display = '';
      layer.innerHTML = ''; runner = new Actor(layer, -80, 462, 1.1, 'run'); runner.cross = true;
      Sound.tempo(180);
      inputHandler = e => { if (!started) { if (e.key === 'Enter' || e.key === ' ') { Sound.start(180); Sound.play('select'); showMenu(); } } else m.key(e); };
      root.onclick = e => { if (!started) { Sound.init(); Sound.start(180); Sound.play('select'); showMenu(); } };
    },
    leave() { root.onclick = null; runner && runner.destroy(); },
    update(dt, t) { bgT += dt; if ((bgT * 8 | 0) !== (this._b | 0)) { this._b = bgT * 8; drawBG(bg, 'dusk', 160, 120, t); } if (runner) { runner.pos(runner.x + 120 * dt, 462); if (runner.x > 760) runner.pos(-80, 462); } },
  };
})();

/* ================================================================ MAP SCENE */
scenes.map = (() => {
  const root = $('#sc-map'), nodesEl = $('#map-nodes'), actEl = $('#map-actors'), info = $('#map-info'); let josh, sel = 0, at = 0, busy = false, nodeEls = [], inited = false;
  const FEET = i => [STAGES[i].pos[0], STAGES[i].pos[1] + 5];
  function paintNodes() {
    nodeEls.forEach((n, i) => {
      const done = (save.stars[i] || 0) > 0, lock = !unlocked(i);
      n.className = 'node' + (lock ? ' locked' : '') + (done ? ' done' : '') + (i === sel ? ' sel' : '');
      n.querySelector('.stars').innerHTML = done ? stars(save.stars[i]).replace(/width="16" height="16"/g, 'width="11" height="11"') : '';
      n.querySelector('.lockicon').style.display = lock ? 'block' : 'none';
    });
    $('#map-total').innerHTML = `STARS <y>${totalStars()}</y>/${STAGES.length * 3}`;
  }
  function paintInfo() {
    const s = STAGES[sel], lock = !unlocked(sel), st = save.stars[sel] || 0;
    info.innerHTML = `<div class="grow"><div class="t">${sel + 1}. ${s.name}</div><div class="s">${lock ? '<r>LOCKED</r> - clear the previous stage first!' : s.sub + ' &nbsp; ' + stars(st)}</div><div class="s" style="font-size:11px;color:#9fb0ff">${lock ? '' : 'Boss: ' + s.enemy.name}</div></div><div class="row" id="map-btns"></div>`;
    const row = $('#map-btns', info);
    if (!lock) {
      const b1 = el('button', 'btn', 'LESSON [L]'), b2 = el('button', 'btn gold', 'PLAY [ENTER]');
      b1.onclick = () => startLesson(sel, false); b2.onclick = () => play();
      row.append(b1, b2);
    }
  }
  const play = () => { if (busy || !unlocked(sel)) return; Sound.play('select'); (save.stars[sel] == null) ? startLesson(sel, true) : go('battle', sel); };
  const startLesson = (i, thenBattle) => { if (busy) return; go('lesson', { i, thenBattle }); };
  async function moveTo(target) {
    if (busy) return; busy = true; info.style.visibility = 'hidden';
    const dir = target > at ? 1 : -1; josh.play('run');
    while (at !== target) {
      const nxt = at + dir, [x0, y0] = [josh.x, josh.y], [x1, y1] = FEET(nxt); josh.setFlip(x1 < x0);
      const dist = Math.hypot(x1 - x0, y1 - y0); await tween(dist * 5.5, k => josh.pos(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k)); at = nxt; Sound.play('move');
    }
    josh.setFlip(false); josh.play('idle'); busy = false; info.style.visibility = ''; save.at = at; persist(); paintInfo();
  }
  function select(i) {
    i = clamp(i, 0, STAGES.length - 1); if (i === sel && !busy) return;
    if (busy) return;
    if (!unlocked(i)) { sel = i; paintNodes(); paintInfo(); Sound.play('lock'); shake(); sel = at; setTimeout(() => { paintNodes(); paintInfo(); }, 900); return; }
    sel = i; paintNodes(); moveTo(i);
  }
  return {
    el: root,
    enter(arg) {
      if (!inited) { inited = true; let s = save.at == null ? STAGES.length - 1 : clamp(save.at, 0, STAGES.length - 1); while (s > 0 && !unlocked(s)) s--; sel = at = s; }
      if (typeof arg === 'number') { sel = at = arg; }
      save.at = at; persist();
      Sound.tempo(190);
      const bgc = $('#map-bg'); bgc.getContext('2d').drawImage(buildMap(STAGES), 0, 0);
      nodesEl.innerHTML = ''; actEl.innerHTML = ''; nodeEls = [];
      STAGES.forEach((s, i) => {
        const n = el('button', 'node', `<span class="pad"></span><span class="num">${i + 1}</span><span class="stars"></span><span class="lock lockicon"></span>`);
        n.style.left = s.pos[0] + 'px'; n.style.top = s.pos[1] + 'px'; n.title = s.name; n.onclick = () => select(i); nodesEl.append(n); nodeEls.push(n);
      });
      const [fx, fy] = FEET(at); josh = new Actor(actEl, fx, fy, .5, 'idle');
      const nav = $('#map-nav'); nav.innerHTML = ''; const b1 = el('button', 'btn', 'PLAYBOOK [P]'), b2 = el('button', 'btn', 'TITLE [ESC]'); b1.onclick = () => go('book'); b2.onclick = () => go('title'); nav.append(b1, b2);
      paintNodes(); paintInfo();
      inputHandler = e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') select(sel + 1); else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') select(sel - 1);
        else if (e.key === 'Enter' || e.key === ' ') play(); else if (e.key.toLowerCase() === 'l' && unlocked(sel)) startLesson(sel, false);
        else if (e.key.toLowerCase() === 'p') go('book'); else if (e.key === 'Escape') go('title');
      };
    },
    leave() { josh && josh.destroy(); busy = false; info.style.visibility = ''; },
    select, get at() { return at; }, set at(v) { at = v; sel = v; },
  };
})();

/* ============================================================== LESSON SCENE */
scenes.lesson = (() => {
  const root = $('#sc-lesson'), bg = $('#les-bg').getContext('2d'), txt = $('#les-text'), nav = $('#les-nav'), face = $('#les-face'); let josh, vis, vt, pages, page = 0, ctx_, tok = 0, bgT = 0;
  async function show(p) {
    page = clamp(p, 0, pages.length - 1); const pg = pages[page], my = ++tok;
    vt.textContent = pg.t; vis.show(pg.v);
    nav.innerHTML = '';
    const back = el('button', 'btn', 'BACK'), next = el('button', 'btn gold', page === pages.length - 1 ? (ctx_.thenBattle ? "LET'S PLAY!" : 'DONE') : 'NEXT');
    back.onclick = () => show(page - 1); back.disabled = page === 0; next.onclick = () => onAdvance2();
    const pg_ = el('span', '', `PAGE ${page + 1}/${pages.length}`); pg_.style.fontSize = '11px';
    nav.append(back, pg_, next);
    const t = typeInto(txt, pg.x, 18); activeTyper = t; face.classList.add('talk'); await t.done; if (my === tok) { face.classList.remove('talk'); activeTyper = null; }
  }
  function onAdvance2() {
    if (activeTyper && !activeTyper.finished) { activeTyper.skip(); return; }
    if (page < pages.length - 1) { Sound.play('select'); show(page + 1); } else finish();
  }
  function finish() { Sound.play('select'); ctx_.thenBattle ? go('battle', ctx_.i) : go('map', ctx_.i); }
  return {
    el: root,
    enter(arg) {
      ctx_ = arg; pages = PAGES[arg.i]; Sound.tempo(200);
      $('#les-actors').innerHTML = ''; josh = new Actor($('#les-actors'), 108, 298, 1.25, 'idle');
      vis = new Visual($('#les-vis'), $('#les-cap')); vt = el('div', 'vt'); $('#les-vis').append(vt);
      show(0);
      inputHandler = e => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') onAdvance2();
        else if (e.key === 'ArrowLeft') { if (page > 0) show(page - 1); }
        else if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') vis.step(1);
        else if (e.key === 'ArrowDown' || e.key === '-') vis.step(-1);
        else if (e.key === 'Escape') go('map', ctx_.i);
      };
      $('#les-dlg').onclick = e => { if (e.target.closest('button')) return; if (activeTyper && !activeTyper.finished) activeTyper.skip(); };
    },
    leave() { josh && josh.destroy(); activeTyper = null; tok++; },
    update(dt, t) { if ((t * 8 | 0) !== (this._b | 0)) { this._b = t * 8; drawBG(bg, STAGES[ctx_.i].theme, 160, 120, t); } vis && vis.update(dt); },
  };
})();

/* ================================================================ BATTLE SCENE */
const GOOD = ['TOUCHDOWN! That is the one!', 'Right on target, rookie!', 'Boom! Perfect pass!', 'You are on fire!', 'Money! Nailed it!', "That's what I'm talkin' about!", 'MVP math right there!', 'Complete pass! Keep it rolling!'];
const BAD = ['Incomplete. Shake it off!', 'Oof, picked off! Here is the play:', 'Close, but not quite. Watch this:', 'Every QB throws a pick sometimes. Learn from it:', 'Not this time, rookie. Check it out:'];
scenes.battle = (() => {
  const root = $('#sc-battle'), bg = $('#bat-bg').getContext('2d'), layer = $('#bat-layer'), textEl = $('#b-text'), ansEl = $('#b-ans'), face = $('#b-face');
  const B = { tok: 0 }; let josh, enemy, theme = 'day', stage, si;
  const JX = 120, JY = 240, EX = 510, EY = 238, JS = 1.1;
  const hearts = () => $('#b-lives').innerHTML = [0, 1, 2].map(i => `<img class="heart ${i < B.lives ? '' : 'lost'}" src="sprites/ball.png" alt="">`).join('');
  const hud = () => { $('#b-score').innerHTML = `PTS <y>${String(B.score).padStart(5, '0')}</y>`; $('#b-streak').innerHTML = B.streak >= 2 ? `<g>STREAK x${B.streak}</g>` : ''; hearts(); $('#b-hp').style.width = Math.max(0, B.queue.length / B.total * 100) + '%'; const a = $('#b-audible'); a.textContent = `HINT x${B.aud} [H]`; a.disabled = B.aud <= 0 || !B.asking; };
  function makeEnemy(def) {
    const e = el('div', 'enemy'); const a = enemyCanvas(def.type, def.pal, false), b = enemyCanvas(def.type, def.pal, true), sc = def.type === 'boss' ? 3.4 : 4;
    const mkImg = (c, cls) => { const i = new Image(); i.src = c.toDataURL(); i.className = 'e ' + cls; i.style.width = c.width * sc + 'px'; i.style.height = c.height * sc + 'px'; return i; };
    const w = a.width * sc, h = a.height * sc; e.style.width = w + 'px'; e.style.height = h + 'px'; e.style.left = (EX - w / 2) + 'px'; e.style.top = (EY - h) + 'px';
    const bob = el('div', 'bob'); bob.style.cssText = `position:absolute;inset:0`; bob.append(mkImg(a, 'a'), mkImg(b, 'b')); e.append(bob);
    const sh = el('div', 'shadow'); sh.style.left = EX + 'px'; sh.style.top = EY + 'px'; sh.style.width = w * .8 + 'px'; sh.style.marginLeft = -w * .4 + 'px'; layer.append(sh);
    layer.append(e); e.shadow = sh; e.cx = EX; e.cy = EY - h / 2; return e;
  }
  const A = async p => { const t0 = B.tok; const v = await p; if (v === ABORT || B.tok !== t0 || B.dead) throw ABORT; return v; };
  function setText(html, cls = '') { textEl.className = cls; textEl.innerHTML = html; }
  const sayJ = (html, opt) => A(say(textEl, html, { ...opt, face }));
  async function ask(q) {
    B.asking = true; B.eliminated = new Set(); hud();
    setText(`<div class="${q.long ? 'qlong' : 'q'}">${q.prompt}</div>${q.sub ? `<div class="qs">${q.sub}</div>` : ''}`);
    ansEl.style.display = 'grid'; ansEl.innerHTML = '';
    const btns = q.choices.map((c, i) => { const b = el('button', 'btn' + (q.words ? ' word' : ''), `<i class="k">${i + 1}</i><span>${c}</span>`); ansEl.append(b); return b; });
    let sel = 0; const paint = () => btns.forEach((b, i) => b.classList.toggle('sel', i === sel));
    paint();
    const idx = await A(waitFor(done => {
      const choose = i => { if (B.eliminated.has(i)) { Sound.play('lock'); return; } inputHandler = null; B.pickFn = null; done(i); };
      btns.forEach((b, i) => { b.onclick = () => choose(i); b.onmouseenter = () => { sel = i; paint(); }; });
      B.audFn = () => { if (B.aud <= 0) return; const wrongs = shuffle(q.choices.map((_, i) => i).filter(i => i !== q.answer)).slice(0, 2); wrongs.forEach(i => { B.eliminated.add(i); btns[i].classList.add('off'); btns[i].disabled = true; }); B.aud--; Sound.play('select'); popup('AUDIBLE!', 330, 270, 'big'); hud(); };
      inputHandler = e => {
        const k = e.key;
        if (k >= '1' && k <= String(q.choices.length)) choose(+k - 1);
        else if (k === 'ArrowRight' || k === 'ArrowDown') { do { sel = (sel + 1) % q.choices.length; } while (B.eliminated.has(sel)); paint(); Sound.play('move'); }
        else if (k === 'ArrowLeft' || k === 'ArrowUp') { do { sel = (sel + q.choices.length - 1) % q.choices.length; } while (B.eliminated.has(sel)); paint(); Sound.play('move'); }
        else if (k === 'Enter' || k === ' ') choose(sel);
        else if (k.toLowerCase() === 'h') B.audFn();
      };
    }));
    B.asking = false; B.audFn = null; hud();
    btns.forEach(b => { b.onclick = null; b.disabled = true; });
    return { idx, btns };
  }
  async function throwBall(toX, toY, miss) {
    const ball = new Image(); ball.src = 'sprites/ball.png'; ball.className = 'ball'; ball.style.width = '40px'; layer.append(ball);
    const x0 = JX + 92 * JS, y0 = JY - 128 * JS; Sound.play('throw');
    await tween(520, k => { const x = x0 + (toX - x0) * k, y = y0 + (toY - y0) * k - Math.sin(k * Math.PI) * 48; ball.style.transform = `translate(${x - 20}px,${y - 12}px) rotate(${k * 540}deg)`; });
    if (miss) { Sound.play('hit'); await tween(380, k => { const x = toX - 30 - k * 260, y = toY + k * 60 - Math.sin(k * Math.PI) * 50; ball.style.transform = `translate(${x}px,${y}px) rotate(${-k * 720}deg)`; }); }
    ball.remove();
  }
  async function run(i, resume) {
    const tok = ++B.tok; stage = STAGES[i]; si = i; B.dead = false; theme = stage.theme;
    Object.assign(B, { queue: buildQueue(stage), lives: 3, score: 0, streak: 0, aud: 2, mistakes: 0, firstTry: 0, asking: false });
    B.total = B.queue.length; B.seen = new Set();
    const R = resume && save.run && save.run.i === i ? save.run : null;
    if (R) { B.queue = R.specs.map(makeQ); Object.assign(B, { lives: R.lives, score: R.score, streak: R.streak || 0, aud: R.aud, mistakes: R.mistakes || 0, firstTry: R.firstTry || 0 }); B.total = R.total; }
    const keep = () => { save.run = { i, specs: B.queue.map(q => q.spec), lives: B.lives, score: B.score, streak: B.streak, aud: B.aud, mistakes: B.mistakes, firstTry: B.firstTry, total: B.total }; persist(); };
    save.at = i; keep();
    $('#bat-win .cmds').style.visibility = ''; layer.innerHTML = ''; $('#b-stage').textContent = stage.name; $('#b-ename').textContent = stage.enemy.name; hud();
    ansEl.innerHTML = ''; ansEl.style.display = 'none'; setText('', 'full'); $('#b-audible').onclick = () => B.audFn && B.audFn(); $('#b-quit').onclick = quit;
    josh = new Actor(layer, -70, JY, JS, 'run'); const shJ = el('div', 'shadow'); shJ.style.left = JX + 'px'; shJ.style.top = JY + 'px'; layer.insertBefore(shJ, josh.root);
    try {
      Sound.tempo(150);
      await A(tween(900, k => josh.pos(-70 + (JX + 70) * k, JY))); josh.play('idle');
      enemy = makeEnemy(stage.enemy); enemy.classList.add('spawn'); Sound.play('good'); await A(sleep(650)); enemy.classList.remove('spawn');
      await sayJ(R ? `Welcome back! Let's finish this drive. <y>${B.queue.length}</y> questions to go and <y>${B.lives}</y> ${B.lives === 1 ? 'life' : 'lives'} left. Ready?` : `A wild <y>${stage.enemy.name}</y> appears! Answer ${B.total} questions right to beat it. You have 3 lives. Ready?`);
      while (B.queue.length && B.lives > 0) {
        keep();
        const q = B.queue[0]; const firstTime = !B.seen.has(q.spec.t + ':' + (q.spec.n || q.spec.v)); B.seen.add(q.spec.t + ':' + (q.spec.n || q.spec.v));
        face.classList.remove('talk');
        const { idx, btns } = await ask(q);
        const good = idx === q.answer; btns[idx].classList.add(good ? 'good' : 'bad'); if (!good) btns[q.answer].classList.add('good');
        await A(josh.play('throw', { loop: false }));  // ends on the throw pose
        enemy.classList.add('open');
        if (good) {
          await throwBall(enemy.cx, enemy.cy, false);
          B.queue.shift(); B.streak++; keep(); if (firstTime) B.firstTry++;
          const pts = 100 + Math.min(B.streak - 1, 5) * 20; B.score += pts; hud(); Sound.play('good'); flash('#fff');
          enemy.classList.remove('hit'); void enemy.offsetWidth; enemy.classList.add('hit'); setTimeout(() => enemy.classList.remove('hit'), 650); burst(enemy.cx, enemy.cy, 26, ['#fff', '#ffd23f', PAL[stage.enemy.pal].mid]);
          popup(`+${pts}`, enemy.cx - 24, enemy.cy - 60); if (B.streak >= 3) popup(`STREAK x${B.streak}!`, JX - 40, JY - 190, 'big');
          josh.play('cele'); setTimeout(() => enemy.classList.remove('open'), 500);
          const line = B.streak === 3 ? 'Three in a row! Hot streak!' : B.streak === 5 ? 'FIVE straight! Unstoppable!' : pick(GOOD);
          if (B.queue.length) { setText(`<div class="qlong" style="margin-top:14px"><y>${line}</y></div><div class="qs" style="font-size:11px;line-height:1.7">${q.exp}</div>`); ansEl.style.display = 'none'; face.classList.add('talk'); await A(sleep(q.exp.length > 90 ? 2500 : 1900)); face.classList.remove('talk'); }
          josh.play('idle');
        } else {
          await throwBall(enemy.cx - 40, enemy.cy + 20, true);
          B.streak = 0; B.mistakes++; B.lives--; hud(); Sound.play('bad'); josh.play('idle');
          setTimeout(() => { josh.root.classList.add('hurt'); shake(); flash('#ff3030'); Sound.play('hit'); burst(JX, JY - 80, 18, ['#ff6b6b', '#fff']); popup('OUCH!', JX - 20, JY - 150, 'bad'); }, 170);
          await A(tween(420, k => { enemy.style.transform = `translateX(${-Math.sin(k * Math.PI) * 230}px)`; })); enemy.style.transform = '';
          setTimeout(() => josh.root.classList.remove('hurt'), 700); enemy.classList.remove('open');
          B.queue.shift(); if (B.lives > 0) B.queue.push(makeQ(q.spec)); // re-ask a fresh version later
          keep();
          ansEl.style.display = 'none'; setText('', 'full'); face.classList.add('talk');
          await sayJ(`<y>${B.lives > 0 ? pick(BAD) : 'That one got us sacked!'}</y><br><br>${q.exp}`, { speed: 16 });
          if (B.lives <= 0) break;
        }
      }
      if (B.lives <= 0) await defeat(); else await victory();
    } catch (e) { if (e !== ABORT) throw e; }
  }
  async function victory() {
    ansEl.style.display = 'none'; face.classList.remove('talk'); B.asking = false; hud();
    enemy.classList.add('die'); Sound.play('win'); burst(enemy.cx, enemy.cy, 60, ['#fff', '#ffd23f', PAL[stage.enemy.pal].mid, PAL[stage.enemy.pal].hi], { spread: 300, up: 160 });
    await A(sleep(1000)); enemy.remove(); enemy.shadow.remove(); confettiRain(); josh.play('cele'); popup('STAGE CLEAR!', 220, 120, 'big');
    save.run = null; persist();
    const st = B.lives; const newBest = st > (save.stars[si] || 0);
    const hadNext = si + 1 < STAGES.length && !unlocked(si + 1);
    save.stars[si] = Math.max(save.stars[si] || 0, st); save.best[si] = Math.max(save.best[si] || 0, B.score); persist();
    await A(sleep(900));
    const finalStage = si === STAGES.length - 1;
    const msg = finalStage ? `<r>CHAMPION!</r> You beat the Cube King and mastered squares and cubes 1-25!` : (st === 3 ? 'FLAWLESS! Not a single mistake. Perfect drive!' : st === 2 ? 'Great drive! Just one little mistake.' : 'Won it by the skin of our teeth. Study up and replay for more stars!');
    resultPanel({ title: finalStage ? 'CHAMPIONS!' : 'STAGE CLEAR!', msg, st, hadNext, win: true });
  }
  async function defeat() {
    save.run = null; persist(); ansEl.style.display = 'none'; B.asking = false; hud(); Sound.play('lose'); shake();
    josh.root.classList.remove('hurt'); josh.play('idle'); josh.spr.style.setProperty('--rot', '84deg'); josh.spr.style.filter = 'grayscale(.6)';
    popup('SACKED!', 250, 110, 'big bad');
    await A(sleep(1200));
    resultPanel({ title: 'SACKED!', msg: `Out of lives! Even the best QBs get sacked. Study the Playbook and come back stronger. Mistakes teach us!`, st: 0, win: false });
  }
  function resultPanel({ title, msg, st, hadNext, win }) {
    ansEl.style.display = 'none'; face.classList.add('talk'); setTimeout(() => face.classList.remove('talk'), 1400); $('#bat-win .cmds').style.visibility = 'hidden';
    setText(`<div class="res"><div class="big2">${title}</div><div class="starrow">${stars(st)}</div><div class="stat"><span>SCORE</span><y>${B.score}</y></div><div style="font-size:11px;line-height:1.6;text-align:left">${msg}</div><div class="btns" id="b-btns"></div></div>`, 'full');
    const row = $('#b-btns'), items = [];
    if (win && si + 1 < STAGES.length) items.push({ label: 'NEXT STAGE', cls: 'gold', run: () => go('lesson', { i: si + 1, thenBattle: true }) });
    items.push({ label: win ? 'REPLAY' : 'TRY AGAIN', cls: win ? '' : 'gold', run: () => go('battle', si) });
    if (!win) items.push({ label: 'STUDY', run: () => go('lesson', { i: si, thenBattle: false }) });
    items.push({ label: 'MAP', run: () => go('map', si) });
    const m = menu(row, items); row.style.pointerEvents = 'auto'; row.style.flexWrap = 'nowrap';
    inputHandler = e => m.key(e);
  }
  function quit() { if (B.dead) return; B.dead = true; B.tok++; abortWaiters(); go('map', si); }
  return {
    el: root, quit, B,
    enter(arg) { face.classList.remove('talk'); const o = typeof arg === 'object' ? arg : { i: arg }; run(o.i, o.resume); inputHandler = null; },
    leave() { B.dead = true; B.tok++; abortWaiters(); layer.innerHTML = ''; josh = null; actors.forEach(a => { if (a.root.parentNode === null || layer.contains(a.root)) a.destroy(); }); Sound.tempo(190); },
    update(dt, t) { if ((t * 8 | 0) !== (this._b | 0)) { this._b = t * 8; drawBG(bg, theme, 160, 63, t); } },
  };
})();

/* ================================================================ PLAYBOOK */
scenes.book = (() => {
  const root = $('#sc-book'), bg = $('#bk-bg').getContext('2d'); let vis, mode = 'sq', n = 7, m, josh;
  function paint() {
    $('#bk-tabs').innerHTML = ''; const t1 = el('button', 'btn' + (mode === 'sq' ? ' sel' : ''), 'SQUARES [S]'), t2 = el('button', 'btn' + (mode === 'cu' ? ' sel' : ''), 'CUBES [C]');
    t1.onclick = () => { mode = 'sq'; paint(); }; t2.onclick = () => { mode = 'cu'; paint(); }; $('#bk-tabs').append(t1, t2);
    const g = $('#bk-grid'); g.innerHTML = '';
    range(1, 25).forEach(k => { const b = el('button', 'btn' + (k === n ? ' sel' : ''), `${k}${mode === 'sq' ? '²' : '³'}<small>${fmt(mode === 'sq' ? k * k : k ** 3)}</small>`); b.onclick = () => { n = k; paint(); }; g.append(b); });
    vis.show({ k: mode === 'sq' ? 'grid' : 'cube', n: Math.min(n, mode === 'sq' ? 25 : 25) });
    const v = mode === 'sq' ? n * n : n ** 3, exp = mode === 'sq' ? `${n}² = ${n} × ${n} = <y>${fmt(v)}</y>.${sqTrick(n)}` : `${n}³ = ${n} × ${n} × ${n}: ${n} × ${n} = ${n * n}, then × ${n} = <y>${fmt(v)}</y>.${cuTrick(n)}`;
    const fact = isSq(v) && isCu(v) ? ' <g>Whoa, this one is BOTH a square and a cube!</g>' : '';
    $('#bk-text').innerHTML = `${exp}${fact}<br><br><span style="font-size:11px;color:#9fb0ff">Click a number, or use the arrow keys. Press S / C to switch.</span>`;
  }
  return {
    el: root,
    enter() {
      Sound.tempo(200); vis = new Visual($('#bk-vis'), $('#bk-cap')); vis.minus.style.display = vis.plus.style.display = 'none'; paint();
      $('#bk-back').onclick = () => go('map');
      inputHandler = e => {
        const k = e.key.toLowerCase();
        if (k === 'escape') go(hasProgress() || true ? 'map' : 'title'); else if (k === 's') { mode = 'sq'; paint(); } else if (k === 'c') { mode = 'cu'; paint(); }
        else if (k === 'arrowright') { n = n % 25 + 1; paint(); Sound.play('move'); } else if (k === 'arrowleft') { n = (n + 23) % 25 + 1; paint(); Sound.play('move'); }
        else if (k === 'arrowdown') { n = Math.min(25, n + 5); paint(); Sound.play('move'); } else if (k === 'arrowup') { n = Math.max(1, n - 5); paint(); Sound.play('move'); }
      };
    },
    leave() {},
    update(dt, t) { if ((t * 8 | 0) !== (this._b | 0)) { this._b = t * 8; drawBG(bg, 'night', 160, 120, t); } vis && vis.update(dt); },
  };
})();

/* ================================================================= BOOT */
if ('serviceWorker' in navigator && location.protocol !== 'file:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
$('#bat-win').addEventListener('click', e => { if (e.target.closest('button')) return; onAdvance(); });
cur = scenes.title; curName = 'title'; cur.el.classList.add('on'); cur.enter();
window.__quest = { go, save, STAGES, buildQueue, makeQ, scenes };
})();
