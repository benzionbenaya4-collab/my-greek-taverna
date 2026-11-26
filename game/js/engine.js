// מנוע: קנבס, התאמת מסך, קלט, ספרייטים, טקסט, כפתורים, אפקטים
export const G = {
  cv: null, ctx: null, lo: null, lctx: null,
  W: 960, H: 540, scale: 1, portrait: false,
  t: 0, dt: 0, scene: null,
  keys: new Set(), mouse: null,
  imgs: {}, btns: [], pressed: null,
  shake: 0, fx: [], onFirstInput: null,
};

export const FONT = '"Rubik","Arial Hebrew","Noto Sans Hebrew",Arial,sans-serif';
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const rnd = (a, b) => a + Math.random() * (b - a);
export const rndi = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- מסך ----------
export function initCanvas(cv) {
  G.cv = cv;
  G.ctx = cv.getContext('2d');
  G.lo = document.createElement('canvas');
  G.lctx = G.lo.getContext('2d');
  resize();
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 200));
  initInput();
}

export function resize() {
  const vw = innerWidth, vh = innerHeight, a = vw / vh;
  let W, H;
  if (a >= 1) { H = 540; W = Math.round(clamp(540 * a, 720, 1200)); }
  else { W = 540; H = Math.round(clamp(540 / a, 720, 1170)); }
  W &= ~1; H &= ~1;
  G.W = W; G.H = H; G.portrait = a < 1;
  G.cv.width = W; G.cv.height = H;
  G.lo.width = W / 2; G.lo.height = H / 2;
  const s = Math.min(vw / W, vh / H);
  G.scale = s;
  G.cv.style.width = Math.floor(W * s) + 'px';
  G.cv.style.height = Math.floor(H * s) + 'px';
  G.ctx.imageSmoothingEnabled = false;
  G.lctx.imageSmoothingEnabled = false;
  if (G.scene && G.scene.resize) G.scene.resize();
}

// ---------- קלט ----------
function toLogical(e) {
  const r = G.cv.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * G.W, y: ((e.clientY - r.top) / r.height) * G.H, id: e.pointerId };
}
function hitBtn(p) {
  for (let i = G.btns.length - 1; i >= 0; i--) {
    const b = G.btns[i];
    if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h && !b.disabled) return b;
  }
  return null;
}
function firstInput() {
  if (G.onFirstInput) { const f = G.onFirstInput; G.onFirstInput = null; f(); }
}
function initInput() {
  const cv = G.cv;
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    firstInput();
    try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    const p = toLogical(e);
    const b = hitBtn(p);
    if (b) { G.pressed = { key: b.key, id: e.pointerId }; return; }
    G.scene && G.scene.down && G.scene.down(p);
  });
  cv.addEventListener('pointermove', (e) => {
    const p = toLogical(e);
    if (e.pointerType === 'mouse') G.mouse = p;
    if (G.pressed && G.pressed.id === e.pointerId) return;
    G.scene && G.scene.move && G.scene.move(p);
  });
  const up = (e) => {
    const p = toLogical(e);
    if (G.pressed && G.pressed.id === e.pointerId) {
      const b = hitBtn(p);
      const key = G.pressed.key;
      G.pressed = null;
      if (b && b.key === key && b.fn) b.fn();
      return;
    }
    G.scene && G.scene.up && G.scene.up(p);
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') G.mouse = null; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', (e) => {
    firstInput();
    if (!G.keys.has(e.code) && G.scene && G.scene.key) G.scene.key(e.code);
    G.keys.add(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => G.keys.delete(e.code));
  addEventListener('blur', () => G.keys.clear());
}
export const key = (...codes) => codes.some((c) => G.keys.has(c));

// ---------- תמונות ----------
export function loadImages(map) {
  return Promise.all(Object.entries(map).map(([k, src]) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { G.imgs[k] = im; res(); };
    im.onerror = () => { console.warn('missing image', src); res(); };
    im.src = src;
  })));
}

// ציור ספרייט כשהעוגן הוא אמצע הרגליים
export function sprite(ctx, name, x, y, o = {}) {
  const im = typeof name === 'string' ? G.imgs[name] : name;
  if (!im) return;
  const s = o.s || 1, w = im.width * s, h = im.height * s;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (o.rot) ctx.rotate(o.rot);
  if (o.flip) ctx.scale(-1, 1);
  if (o.sy) ctx.scale(1, o.sy);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.drawImage(im, Math.round(-w / 2), Math.round(-h), w, h);
  if (o.flash && typeof name === 'string') {
    const f = flashImg(name, o.flashColor || '#ffffff');
    ctx.globalAlpha = o.flash;
    if (f) ctx.drawImage(f, Math.round(-w / 2), Math.round(-h), w, h);
  }
  ctx.restore();
}
// גרסה מוכנה של ספרייט עם הבהוב (צביעה רק על הפיקסלים)
const flashCache = new Map();
export function flashImg(name, color) {
  const k = name + color;
  if (flashCache.has(k)) return flashCache.get(k);
  const im = G.imgs[name]; if (!im) return null;
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  flashCache.set(k, c); return c;
}
export function shadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), w, w * 0.28, 0, 0, Math.PI * 2); ctx.fill();
}

// ---------- טקסט ----------
export function txt(ctx, s, x, y, o = {}) {
  const size = o.size || 18;
  ctx.save();
  ctx.font = `${o.weight || 'bold'} ${size}px ${FONT}`;
  ctx.direction = 'rtl';
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.base || 'middle';
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.outline !== false) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = o.lw || Math.max(3, size / 4);
    ctx.strokeStyle = o.outline || '#1a1020';
    ctx.strokeText(s, Math.round(x), Math.round(y));
  }
  ctx.fillStyle = o.color || '#fff';
  ctx.fillText(s, Math.round(x), Math.round(y));
  ctx.restore();
}
export function wrap(ctx, s, maxW, size) {
  ctx.font = `bold ${size}px ${FONT}`;
  const out = [];
  for (const para of String(s).split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}

// בועת דיבור: (x,y) = קצה הזנב
export function bubble(ctx, s, x, y, o = {}) {
  const size = o.size || 16, pad = 9, lh = size * 1.25;
  const maxW = Math.min(o.maxW || 260, G.W - 40);
  const lines = wrap(ctx, s, maxW, size);
  ctx.font = `bold ${size}px ${FONT}`;
  const w = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width))) + pad * 2;
  const h = lines.length * lh + pad * 2 - 4;
  let bx = clamp(x - w / 2, 8, G.W - w - 8), by = y - h - 12;
  if (by < 4) by = 4;
  bx = Math.round(bx); by = Math.round(by);
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  // מסגרת פיקסלית
  ctx.fillStyle = '#1a1020';
  ctx.fillRect(bx - 2, by, w + 4, h); ctx.fillRect(bx, by - 2, w, h + 4);
  ctx.fillStyle = o.bg || '#fffbea';
  ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = o.shade || '#e8dcb8';
  ctx.fillRect(bx, by + h - 4, w, 4);
  // זנב
  const tx = clamp(x, bx + 10, bx + w - 10);
  ctx.fillStyle = '#1a1020';
  ctx.beginPath(); ctx.moveTo(tx - 9, by + h); ctx.lineTo(tx + 9, by + h); ctx.lineTo(x, y); ctx.fill();
  ctx.fillStyle = o.bg || '#fffbea';
  ctx.beginPath(); ctx.moveTo(tx - 6, by + h - 1); ctx.lineTo(tx + 6, by + h - 1); ctx.lineTo(x + (tx - x) * 0.3, y - 4); ctx.fill();
  ctx.fillStyle = o.color || '#2a1a10';
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + pad + lh * i + lh / 2 - 2));
  if (o.name) {
    ctx.font = `bold 12px ${FONT}`;
    const nw = ctx.measureText(o.name).width + 10;
    ctx.fillStyle = o.nameBg || '#1d4fa3';
    ctx.fillRect(bx + w - nw - 4, by - 12, nw, 16);
    ctx.fillStyle = '#fff'; ctx.fillText(o.name, bx + w - nw / 2 - 4, by - 4);
  }
  ctx.restore();
}

// ---------- כפתורים (immediate mode) ----------
export function beginUI() { G.btns = []; }
export function btn(ctx, x, y, w, h, label, fn, o = {}) {
  x = Math.round(x); y = Math.round(y);
  const key = o.key || label;
  G.btns.push({ x, y, w, h, fn, key, disabled: o.disabled });
  const down = G.pressed && G.pressed.key === key;
  const hover = G.mouse && G.mouse.x >= x && G.mouse.x <= x + w && G.mouse.y >= y && G.mouse.y <= y + h;
  const col = o.disabled ? '#6b6470' : o.color || '#1d4fa3';
  const light = o.disabled ? '#857d8a' : o.light || '#3d74d1';
  const dark = '#1a1020';
  const dy = down ? 2 : 0;
  ctx.fillStyle = dark;
  ctx.fillRect(x - 2, y + 2, w + 4, h); ctx.fillRect(x, y, w, h + 4);
  ctx.fillStyle = col; ctx.fillRect(x, y + dy, w, h);
  ctx.fillStyle = hover && !o.disabled ? '#ffffff33' : light;
  ctx.fillRect(x, y + dy, w, 4);
  ctx.fillStyle = '#00000033'; ctx.fillRect(x, y + dy + h - 4, w, 4);
  txt(ctx, label, x + w / 2, y + h / 2 + dy, { size: o.size || 17, color: o.disabled ? '#ccc' : '#fff', lw: 3 });
}

// ---------- אפקטים ----------
export function floater(s, x, y, o = {}) {
  G.fx.push({ k: 'text', s, x, y, vy: -60, life: o.life || 1.3, t: 0, color: o.color || '#ffe14d', size: o.size || 22 });
}
export function burst(x, y, colors, n = 14, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = rnd(o.min || 80, o.max || 320);
    G.fx.push({ k: 'bit', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.up || 120), g: o.g ?? 700,
      life: rnd(0.4, o.life || 0.9), t: 0, c: pick(colors), sz: rndi(o.smin || 3, o.smax || 6), floor: o.floor });
  }
}
export function ring(x, y, color, r = 40) { G.fx.push({ k: 'ring', x, y, r, life: 0.35, t: 0, c: color }); }
export function updateFx(dt) {
  for (const f of G.fx) {
    f.t += dt;
    if (f.k === 'text') { f.y += f.vy * dt; f.vy *= 0.96; }
    else if (f.k === 'bit') {
      f.vy += f.g * dt; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.floor && f.y > f.floor) { f.y = f.floor; f.vy *= -0.3; f.vx *= 0.6; }
    }
  }
  G.fx = G.fx.filter((f) => f.t < f.life);
}
export function drawFx(ctx) {
  for (const f of G.fx) {
    const a = 1 - f.t / f.life;
    if (f.k === 'text') txt(ctx, f.s, f.x, f.y, { size: f.size, color: f.color, alpha: Math.min(1, a * 2) });
    else if (f.k === 'bit') { ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = f.c; ctx.fillRect(Math.round(f.x), Math.round(f.y), f.sz, f.sz); ctx.globalAlpha = 1; }
    else if (f.k === 'ring') {
      ctx.strokeStyle = f.c; ctx.globalAlpha = a; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.3 + f.t / f.life), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
}
