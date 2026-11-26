// הטברנה – שוברים צלחות, כדים ובקבוקים על מדפים תלויים. בסוף הערב: המדף הגדול
import { G, sprite, shadow, txt, btn, key, clamp, rnd, pick, dist, burst, floater, ring, updateFx, drawFx } from '../engine.js';
import { drawTavernBg, PLATES, plateCanvas, drawPlate, R, ITEM, ITEM_TYPES, itemCanvas, itemColors, sparkle } from '../art.js';
import { S, save } from '../save.js';
import { sfx, musicStart, musicTempo, musicVolume } from '../audio.js';
import { go, hud, earn, banner, drawBanners, clearBanners, Talk } from '../game.js';
import { SLANG, OUCH, WAITER } from '../lines.js';

const PLATE_SPEED = 1250;
let bg = null;
let WB = 200, FY0 = 260, FY1 = 410;
const st = {};
export const tav = st;

function rebuild() {
  WB = Math.round(G.H * (G.portrait ? 0.3 : 0.36)) & ~1;
  bg = drawTavernBg(G.W / 2, G.H / 2, WB / 2);
  FY0 = WB + 70; FY1 = G.H - 128;
}
export const floor = () => ({ y0: FY0, y1: FY1, wb: WB });

// מודולים נוספים (ערס / כיפת ברזל / קופסאות / סבתא)
const hooks = [];
export function addHook(h) { hooks.push(h); }
export const targets = [];

// ---------- ערב ----------
function startEvening() {
  const n = S.evening;
  Object.assign(st, {
    n, phase: 'intro', t: 0, dur: 60, breaks: 0, heads: 0, combo: 0, comboT: 0, headStreak: 0,
    v: [], pl: [], ep: [], waiterT: rnd(4, 7), shelves: [], cab: null, specialT: 0, special: null,
    cool: 0, aim: null, px: G.W / 2, hostFlash: 0, hostBob: 0, talk: new Talk(), over: null,
  });
  st.base = 100 + (n - 1) * 10;
  st.k = clamp(1 - 0.08 * (n - 1), 0.6, 1); // פריטים קטנים יותר בכל ערב
  buildShelves();
  hooks.forEach((h) => h.start && h.start(st));
  clearBanners();
  banner(`ערב ${n}`, 1.8, { sub: n === 1 ? 'שבור את מה שעל המדפים! הנוצץ = $10' : 'יאללה! יותר מדפים, והם זזים…' });
  st.talk.say('host', n === 1 ? 'יאללה, מתחילים לשבור!' : pick(['יאללה, עוד ערב!', 'הקצב עולה, תחזיקו חזק!', 'וואלה, הם תלו עוד מדפים!']), 2.2);
  musicStart(st.base); musicTempo(st.base); musicVolume(1);
}

// ---------- מדפים ----------
function buildShelves() {
  const n = st.n;
  const count = Math.min(2 + n, 6);
  const rows = G.portrait ? Math.min(count, count > 4 ? 4 : 3) : count > 3 ? 3 : 2;
  const top = G.portrait ? 160 : 134;
  const bottom = G.portrait ? FY1 - 170 : FY0 + 40;
  const gap = rows > 1 ? (bottom - top) / (rows - 1) : 0;
  const perRow = Math.ceil(count / rows);
  let made = 0;
  for (let r = 0; r < rows && made < count; r++) {
    const inRow = Math.min(perRow, count - made);
    for (let c = 0; c < inRow; c++, made++) {
      const w = Math.min(G.W / inRow - 30, (220 - n * 8) * (G.portrait ? 1.05 : 1));
      const ax = (G.W * (c + 1)) / (inRow + 1) + (r % 2 ? 20 : -20);
      const L = top + r * gap + rnd(-10, 10);
      const moving = n >= 2 && Math.random() < 0.35 + n * 0.08;
      const swing = n >= 3 && Math.random() < 0.25 + n * 0.07;
      const sh = {
        ax, baseX: ax, L, w: Math.max(110, w), a: 0, ang: 0, x: ax, y: L,
        amp: moving ? Math.max(20, Math.min(G.W / inRow / 2 - w / 2 + 40, 60 + n * 12)) : 0, sp: rnd(0.5, 0.9) + n * 0.08, ph: rnd(0, 6),
        swing: swing ? Math.min(0.42, 0.18 + n * 0.03) : 0, swSp: rnd(1.1, 1.6) + n * 0.06, swPh: rnd(0, 6),
        items: [], restockT: 0,
      };
      stock(sh);
      st.shelves.push(sh);
    }
  }
  pickSpecial();
}
function stock(sh) {
  sh.items = [];
  const k = st.k, step = 36 * k;
  const nItems = clamp(Math.floor((sh.w - 16) / step), 2, 7);
  const span = (nItems - 1) * step;
  for (let i = 0; i < nItems; i++) {
    const type = pick(ITEM_TYPES);
    sh.items.push({ type, lx: -span / 2 + i * step, alive: true, pop: 0, w: ITEM[type].w * 2.6 * k, h: ITEM[type].h * 2.6 * k, sh });
  }
}
function placeShelf(sh) {
  sh.ax = sh.baseX + Math.sin(st.t * sh.sp + sh.ph) * sh.amp;
  sh.a = sh.swing ? Math.sin(st.t * sh.swSp + sh.swPh) * sh.swing : 0;
  sh.x = sh.ax + Math.sin(sh.a) * sh.L;
  sh.y = Math.cos(sh.a) * sh.L;
  sh.ang = -sh.a;
}
// מיקום עולמי של מרכז פריט
export function itemPos(it) {
  if (it.cab) {
    const c = st.cab;
    return { x: c.x + it.lx, y: c.y + it.ly - it.h / 2, ang: 0 };
  }
  const sh = it.sh, c = Math.cos(sh.ang), s = Math.sin(sh.ang);
  const lx = it.lx, ly = -3 - it.h / 2;
  return { x: sh.x + lx * c - ly * s, y: sh.y + lx * s + ly * c, ang: sh.ang };
}
export function allItems() {
  const out = [];
  for (const sh of st.shelves) for (const it of sh.items) if (it.alive) out.push(it);
  if (st.cab && st.cab.state === 'fight') for (const it of st.cab.items) if (it.alive) out.push(it);
  return out;
}
function pickSpecial() {
  const all = allItems();
  const others = all.filter((it) => it !== st.special);
  st.special = others.length ? pick(others) : all[0] || null;
  st.specialT = clamp(4.5 - st.n * 0.3, 2.2, 4.5);
}
// בדיקת פגיעה של נקודה בפריט (במערכת הצירים של המדף)
function itemHit(it, px, py, r) {
  if (it.cab) {
    const c = st.cab, x0 = c.x + it.lx - it.w / 2, y1 = c.y + it.ly;
    return px > x0 - r * 0.5 && px < x0 + it.w + r * 0.5 && py > y1 - it.h - r * 0.4 && py < y1 + r * 0.3;
  }
  const sh = it.sh, dx = px - sh.x, dy = py - sh.y, c = Math.cos(sh.ang), s = Math.sin(sh.ang);
  const u = dx * c + dy * s, v = -dx * s + dy * c;
  return u > it.lx - it.w / 2 - r * 0.5 && u < it.lx + it.w / 2 + r * 0.5 && v > -3 - it.h - r * 0.4 && v < -3 + r * 0.3;
}

const reward = (base, P) => { let n = base + (P.bonus || 0); if (P.mult) n *= P.mult; return n; };
export function comboUp(x, y) {
  st.combo++; st.comboT = 2.2;
  if (st.combo >= 3 && st.combo % 2 === 1) floater(pick(SLANG), x, y - 40, { size: 26, color: '#7bd23f' });
}
export function breakItem(it, P) {
  if (!it.alive) return;
  const p = itemPos(it);
  it.alive = false;
  sfx.break();
  burst(p.x, p.y, itemColors(it.type).concat(it === st.special ? ['#ffe14d'] : []), 16, { floor: FY0 + rnd(0, FY1 - FY0), up: 60, max: 240 });
  st.breaks++; S.stats.hits++;
  P = P || PLATES.white;
  if (it === st.special) {
    st.heads++; S.stats.heads++;
    st.headStreak++;
    const n = reward(10, P);
    earn(n, p.x, p.y - 30, `בול במטרה! $${n}`, '#ffe14d');
    ring(p.x, p.y, '#ffe14d', 46);
    if (st.headStreak >= 2) floater(st.headStreak >= 4 ? 'סחתיין!' : 'וואלה בול!', p.x, p.y - 64, { size: 24, color: '#ff9b2e' });
    pickSpecial();
  } else {
    const n = reward(3, P);
    earn(n, p.x, p.y - 26, `+$${n}`, '#fffbea');
  }
  comboUp(p.x, p.y - 30);
}

// ---------- המדף הגדול ----------
function spawnCabinet() {
  const n = st.n;
  const w = Math.min(330, G.W - 90), h = 224;
  const c = { x: G.W / 2, baseX: G.W / 2, y: -h - 20, ty: G.portrait ? 150 : 96, w, h, state: 'enter', t: 0, door: 0, cyc: 0, open: false,
    openDur: clamp(2.4 - n * 0.15, 1.2, 2.4), closeDur: clamp(1.6 + n * 0.1, 1.6, 2.6), amp: n >= 2 ? Math.max(0, Math.min(G.W / 2 - w / 2 - 20, 40 + n * 15)) : 0, items: [] };
  const rows = 3, cols = 4, iw = (w - 30) / cols;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const type = pick(ITEM_TYPES);
    c.items.push({ type, cab: true, lx: -w / 2 + 15 + iw * (q + 0.5), ly: 18 + (r + 1) * ((h - 30) / rows) - 4, alive: true, pop: 1, w: ITEM[type].w * 2.4, h: ITEM[type].h * 2.4 });
  }
  st.cab = c;
  banner('המדף הגדול!', 2, { color: '#ff8a5a', sub: 'אפשר לפגוע רק כשהדלתות פתוחות' });
  st.talk.now('host', 'וואו… ארון עם דלתות זכוכית?!', 2.2);
  sfx.clang();
}
function updateCabinet(dt) {
  const c = st.cab; if (!c) return;
  c.t += dt;
  if (c.state === 'enter') { c.y += 260 * dt; if (c.y >= c.ty) { c.y = c.ty; c.state = 'fight'; c.t = 0; pickSpecial(); } return; }
  if (c.state === 'dead') { c.y += 420 * dt; c.rot = (c.rot || 0) + dt * 0.8; if (c.t > 1.4) { st.cab = null; endEvening(true); } return; }
  c.x = c.baseX + Math.sin(c.t * 0.7) * c.amp;
  c.cyc += dt;
  const want = c.open ? c.cyc <= c.openDur : c.cyc > c.closeDur;
  if (want !== c.open) { c.open = want; c.cyc = 0; sfx.click(); }
  c.door = clamp(c.door + (c.open ? 1 : -1) * dt * 4, 0, 1);
  if (!c.items.some((it) => it.alive)) {
    c.state = 'dead'; c.t = 0; S.stats.bosses++;
    G.shake = 0.6; sfx.boom();
    burst(c.x, c.y + c.h / 2, ['#5a2e14', '#8a5a2b', '#bfe3f0', '#ffffff', '#ffe14d'], 60, { up: 300, max: 520, smin: 4, smax: 9 });
    const bonus = 60 + st.n * 20;
    earn(bonus, c.x, c.y + c.h / 2, `המדף הגדול נשבר! +$${bonus}`);
  }
}
function cabinetHit(p) {
  const c = st.cab;
  if (!c || c.state !== 'fight') return false;
  if (p.x < c.x - c.w / 2 || p.x > c.x + c.w / 2 || p.y < c.y || p.y > c.y + c.h) return false;
  if (c.door < 0.85 && !p.P.dmg) {
    p.dead = true;
    sfx.clang(); burst(p.x, p.y, ['#ffffff', '#c8d2dc', '#bfe3f0'], 10);
    floater('קלינג! סגור!', p.x, p.y - 16, { size: 18, color: '#bfe3f0', life: 0.8 });
    return true;
  }
  for (const it of c.items) {
    if (it.alive && itemHit(it, p.x, p.y, p.r)) { breakItem(it, p.P); if (!p.P.pierce) { p.dead = true; return true; } }
  }
  return false;
}

// ---------- מלצר ----------
function spawnWaiter() {
  const side = Math.random() < 0.5 ? -1 : 1;
  st.v.push({ type: 'waiter', x: side < 0 ? -50 : G.W + 50, y: rnd(FY0 + 20, FY1 - 10), vx: -side * rnd(300, 360) * (st.base / 100), t: 0, flash: 0, rot: 0, stumble: 0, face: -side });
}
function updateWaiters(dt) {
  for (const v of st.v) {
    v.t += dt; v.flash = Math.max(0, v.flash - dt * 3);
    v.x += v.vx * (v.stumble > 0 ? 0.4 : 1) * dt; v.face = v.vx < 0 ? -1 : 1;
    if (v.stumble > 0) { v.stumble -= dt; v.rot = Math.sin(v.stumble * 30) * 0.2; } else v.rot = 0;
    if (v.x < -70 || v.x > G.W + 70) v.gone = true;
  }
  st.v = st.v.filter((v) => !v.gone);
}
function waiterHit(p) {
  for (const v of st.v) {
    if (v.stumble > 0) continue;
    if (p.x > v.x - 26 - p.r * 0.5 && p.x < v.x + 26 + p.r * 0.5 && p.y > v.y - 98 && p.y < v.y - 6) {
      p.dead = true;
      v.flash = 1; v.stumble = 0.7;
      sfx.break(); sfx.thud(); burst(p.x, p.y, ['#ffffff', '#c8d2dc'], 12, { floor: v.y });
      const n = Math.min(10, S.money);
      earn(-n, v.x, v.y - 130, `${pick(OUCH)} -$${n}`);
      st.talk.now('waiter', pick(WAITER.hit), 2, v);
      st.combo = 0; st.headStreak = 0;
      return true;
    }
  }
  return false;
}

export const tavern = {
  enter() { rebuild(); startEvening(); },
  resize() { rebuild(); st.px = clamp(st.px, 60, G.W - 60); for (const v of st.v) v.y = clamp(v.y, FY0, FY1); },
  exit() { save(true); },
  key(code) {
    if (code === 'Escape') leave();
    if (code === 'Space' && st.phase !== 'end') {
      const m = G.mouse || { x: G.W / 2, y: G.H * 0.35 };
      throwAt(m.x, m.y);
    }
  },
  down(p) { if (st.phase === 'end') return; st.aim = { id: p.id, sx: p.x, sy: p.y, x: p.x, y: p.y, sling: false }; },
  move(p) {
    const a = st.aim; if (!a || a.id !== p.id) return;
    a.x = p.x; a.y = p.y;
    if (dist(a.sx, a.sy, a.x, a.y) > 22) a.sling = true;
  },
  up(p) {
    const a = st.aim; if (!a || a.id !== p.id) return;
    st.aim = null;
    if (st.phase === 'end') return;
    if (a.sling) {
      const dx = a.sx - a.x, dy = a.sy - a.y, l = Math.hypot(dx, dy);
      if (l < 22) return;
      throwDir(dx / l, dy / l, clamp(260 + l * 3.2, 300, 1400));
    } else throwAt(p.x, p.y);
  },
  update,
  draw,
};

function leave() { go('hub', { from: 'tavern' }); }
const origin = () => ({ x: st.px - 22, y: G.H - 46 });

// ---------- זריקה ----------
function throwAt(tx, ty) {
  const o = origin();
  const dx = tx - o.x, dy = ty - o.y, l = Math.hypot(dx, dy) || 1;
  throwDir(dx / l, dy / l, l);
}
function throwDir(ux, uy, reach) {
  if (st.cool > 0) return;
  if (uy > -0.05) { uy = -0.05; const l = Math.hypot(ux, uy); ux /= l; uy /= l; }
  st.cool = 0.2;
  const o = origin();
  const P = PLATES[S.plate] || PLATES.white;
  const img = plateCanvas(S.plate, S.paint, 32), r = P.r || 14;
  const n = S.multi || 1;
  const spread = n === 1 ? [0] : n === 2 ? [-0.07, 0.07] : [-0.13, 0, 0.13];
  for (const s of spread) {
    const c = Math.cos(s), sn = Math.sin(s);
    const vx = ux * c - uy * sn, vy = ux * sn + uy * c;
    st.pl.push({ x: o.x, y: o.y, vx: vx * PLATE_SPEED, vy: vy * PLATE_SPEED, left: reach, spin: rnd(0, 6), img, r, P });
  }
  st.hostBob = 0.15;
  sfx.throw();
}

// ---------- צלחות של הערס כשהוא כועס ----------
export function enemyThrow(x, y, kind = 'plate', speed = 400) {
  const tx = st.px + rnd(-40, 40), ty = G.H - 50;
  const dx = tx - x, dy = ty - y, l = Math.hypot(dx, dy) || 1;
  st.ep.push({ x, y, vx: (dx / l) * speed, vy: (dy / l) * speed, spin: 0, kind, img: plateCanvas('white') });
  sfx.throw();
}
function updateEnemyPlates(dt) {
  for (const e of st.ep) {
    e.spin += dt * 14; e.x += e.vx * dt; e.y += e.vy * dt;
    if (dist(e.x, e.y, st.px, G.H - 52) < 32) {
      e.dead = true; sfx.break(); sfx.thud(); G.shake = 0.25; st.hostFlash = 0.5;
      burst(e.x, e.y, ['#ffffff', '#c8d2dc'], 12);
      const n = Math.min(5, S.money);
      earn(-n, st.px, G.H - 140, `${pick(OUCH)} -$${n}`);
      st.combo = 0;
    } else if (e.y > G.H + 30 || e.x < -40 || e.x > G.W + 40) e.dead = true;
  }
  st.ep = st.ep.filter((e) => !e.dead);
}

// ---------- צלחות של השחקן ----------
function shatter(p) {
  sfx.break();
  burst(p.x, p.y, ['#ffffff', '#c8d2dc', p.P.rim || '#9aa5b1'], 12, { floor: Math.max(p.y + 6, FY0 + rnd(0, 80)) });
}
function updatePlates(dt) {
  for (const p of st.pl) {
    p.spin += dt * 20;
    if (p.P.homing) {
      let best = null, bd = 240;
      for (const it of allItems()) { const q = itemPos(it); const d = dist(p.x, p.y, q.x, q.y) - (it === st.special ? 80 : 0); if (d < bd) { bd = d; best = q; } }
      if (best) {
        const dx = best.x - p.x, dy = best.y - p.y, l = Math.hypot(dx, dy) || 1;
        p.vx += (dx / l) * 2400 * dt; p.vy += (dy / l) * 2400 * dt;
        const sp = Math.hypot(p.vx, p.vy); p.vx = (p.vx / sp) * PLATE_SPEED; p.vy = (p.vy / sp) * PLATE_SPEED;
      }
    }
    const steps = 4, sx = (p.vx * dt) / steps, sy = (p.vy * dt) / steps, sl = Math.hypot(sx, sy);
    for (let i = 0; i < steps && !p.dead; i++) {
      p.x += sx; p.y += sy; p.left -= sl;
      if (collide(p)) break;
      if (p.left <= 0) { p.dead = true; shatter(p); }
    }
    if (p.y < -40 || p.x < -40 || p.x > G.W + 40) p.dead = true;
  }
  st.pl = st.pl.filter((p) => !p.dead);
}
function collide(p) {
  for (const e of st.ep) {
    if (!e.dead && dist(p.x, p.y, e.x, e.y) < p.r + 14) {
      e.dead = true; p.dead = true; shatter(p);
      burst(e.x, e.y, ['#ffffff', '#c8d2dc'], 10);
      earn(2, e.x, e.y - 20, 'יירוט צלחת! +$2', '#9fe0ff');
      return true;
    }
  }
  if (waiterHit(p)) return true; // המלצר עובר לפני המדפים
  for (const t of targets) if (t.test && t.test(p)) return true;
  if (cabinetHit(p)) return true;
  for (const sh of st.shelves) {
    for (const it of sh.items) {
      if (it.alive && it.pop >= 1 && itemHit(it, p.x, p.y, p.r)) {
        breakItem(it, p.P);
        if (!p.P.pierce) { p.dead = true; return true; }
      }
    }
  }
  return false;
}

// ---------- לולאה ----------
function update(dt) {
  st.t += dt;
  st.cool -= dt; st.hostFlash = Math.max(0, st.hostFlash - dt); st.hostBob = Math.max(0, st.hostBob - dt);
  st.comboT -= dt; if (st.comboT <= 0) st.combo = 0;
  st.talk.update(dt);
  let mx = 0;
  if (key('ArrowLeft', 'KeyA')) mx -= 1;
  if (key('ArrowRight', 'KeyD')) mx += 1;
  if (st.moveDir) mx = st.moveDir;
  st.px = clamp(st.px + mx * 320 * dt, 60, G.W - 60);

  if (st.phase === 'intro' && st.t > 1.6) { st.phase = 'play'; st.t = 0; }
  const blocked = hooks.some((h) => h.blocking && h.blocking(st));
  if (st.phase === 'play') {
    if (blocked) st.t -= dt; // הזמן עוצר בזמן אזעקה
    musicTempo(st.base + 40 * clamp(st.t / st.dur, 0, 1));
    if (st.t >= st.dur && !blocked) {
      st.phase = 'boss'; st.t = 0;
      st.special = null;
      spawnCabinet();
      musicTempo(st.base + 50);
    }
  }
  // מדפים: תנועה, מלאי חדש, הפריט הנוצץ
  for (const sh of st.shelves) {
    placeShelf(sh);
    for (const it of sh.items) it.pop = Math.min(1, it.pop + dt * 4);
    if (st.phase === 'boss' || st.phase === 'end') { sh.L -= 380 * dt; continue; }
    if (!sh.items.some((it) => it.alive)) {
      sh.restockT += dt;
      if (sh.restockT > 1.4) { sh.restockT = 0; stock(sh); sfx.pop(); }
    }
  }
  st.shelves = st.shelves.filter((sh) => sh.L > -60);
  if (st.phase === 'play' || (st.phase === 'boss' && st.cab && st.cab.state === 'fight')) {
    st.specialT -= dt;
    if (st.specialT <= 0 || !st.special || !st.special.alive) pickSpecial();
  }
  if (st.phase !== 'intro' && st.phase !== 'end') {
    st.waiterT -= dt;
    if (st.waiterT <= 0) { st.waiterT = rnd(5, 9) / (st.base / 100); spawnWaiter(); }
  }
  hooks.forEach((h) => h.update && h.update(dt, st));
  updateWaiters(dt);
  updateCabinet(dt);
  updatePlates(dt);
  updateEnemyPlates(dt);
  updateFx(dt);
}

function endEvening(win) {
  st.phase = 'end';
  st.over = { win };
  if (win) { S.evening = st.n + 1; S.best = Math.max(S.best, st.n); }
  save(true);
  st.ep = [];
  musicTempo(90);
}

// ---------- ציור ----------
function drawItem(ctx, it, x, y, ang) {
  const gold = it === st.special;
  const im = itemCanvas(it.type, gold);
  const s = it.pop < 1 ? 0.3 + 0.7 * it.pop : 1;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (ang) ctx.rotate(ang); ctx.scale(s, s);
  ctx.drawImage(im, Math.round(-it.w / 2), Math.round(-it.h / 2), it.w, it.h);
  ctx.restore();
  if (gold) sparkle(ctx, x, y, Math.max(it.w, it.h) * 0.75, G.t);
}
function drawShelf(ctx, sh) {
  const c = Math.cos(sh.ang), s = Math.sin(sh.ang);
  const W2 = sh.w / 2;
  const toW = (lx, ly) => [sh.x + lx * c - ly * s, sh.y + lx * s + ly * c];
  const hook = toW(0, -34), e1 = toW(-W2 + 8, -2), e2 = toW(W2 - 8, -2);
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sh.ax, 0); ctx.lineTo(hook[0], hook[1]); ctx.moveTo(e1[0], e1[1]); ctx.lineTo(hook[0], hook[1]); ctx.lineTo(e2[0], e2[1]); ctx.stroke();
  ctx.fillStyle = '#c8961e'; ctx.fillRect(Math.round(hook[0]) - 2, Math.round(hook[1]) - 2, 4, 4);
  ctx.save(); ctx.translate(Math.round(sh.x), Math.round(sh.y)); ctx.rotate(sh.ang);
  R(ctx, -W2 - 2, -5, sh.w + 4, 10, '#1a1020');
  R(ctx, -W2, -3, sh.w, 6, '#8a5a2b'); R(ctx, -W2, -3, sh.w, 2, '#a87444'); R(ctx, -W2, 2, sh.w, 1, '#5a3a1a');
  for (let i = -W2 + 14; i < W2 - 6; i += 34) R(ctx, i, -1, 6, 1, '#6b4422');
  R(ctx, -W2 + 6, 5, 4, 6, '#3a2a1a'); R(ctx, W2 - 10, 5, 4, 6, '#3a2a1a');
  ctx.restore();
  for (const it of sh.items) if (it.alive) { const q = itemPos(it); drawItem(ctx, it, q.x, q.y, q.ang); }
}
function drawCabinet(ctx, c) {
  ctx.save();
  ctx.translate(Math.round(c.x), Math.round(c.y));
  if (c.rot) ctx.rotate(c.rot);
  const w = c.w, h = c.h, x0 = -w / 2;
  ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x0 + 20, 0); ctx.lineTo(x0 + 20, -c.y - 10); ctx.moveTo(-x0 - 20, 0); ctx.lineTo(-x0 - 20, -c.y - 10); ctx.stroke();
  R(ctx, x0 - 4, -4, w + 8, h + 8, '#1a1020');
  R(ctx, x0, 0, w, h, '#5a2e14'); R(ctx, x0 + 8, 14, w - 16, h - 22, '#3a2416');
  R(ctx, x0 - 8, -10, w + 16, 14, '#1a1020'); R(ctx, x0 - 6, -8, w + 12, 10, '#8a4b22');
  for (let i = 0; i < w; i += 12) R(ctx, x0 + i, -6, 6, 3, '#1d4fa3');
  const rows = 3;
  for (let r = 1; r <= rows; r++) { const y = 18 + r * ((h - 30) / rows) - 4; R(ctx, x0 + 8, y, w - 16, 5, '#8a5a2b'); R(ctx, x0 + 8, y, w - 16, 1, '#a87444'); }
  ctx.restore();
  if (c.state !== 'dead') for (const it of c.items) if (it.alive) { const q = itemPos(it); drawItem(ctx, it, q.x, q.y, 0); }
  // דלתות זכוכית – כל דלת נפתחת על הציר החיצוני
  ctx.save(); ctx.translate(Math.round(c.x), Math.round(c.y));
  if (c.rot) ctx.rotate(c.rot);
  const dw = (w - 16) / 2, open = c.door;
  for (const side of [-1, 1]) {
    const hingeX = side * (w / 2 - 8);
    const ww = Math.max(4, dw * (1 - open * 0.88));
    const x = side < 0 ? hingeX : hingeX - ww;
    R(ctx, x, 12, ww, h - 18, '#4a2a12');
    ctx.fillStyle = `rgba(190,227,240,${0.55 - open * 0.25})`; ctx.fillRect(Math.round(x + 4), 16, Math.round(Math.max(0, ww - 8)), h - 26);
    if (ww > 20) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; for (let k = 0; k < 2; k++) ctx.fillRect(Math.round(x + 8 + k * 10), 24 + k * 6, 3, 40); }
    R(ctx, side < 0 ? x + ww - 6 : x + 3, h / 2, 3, 10, '#ffd83d');
  }
  ctx.restore();
  if (c.state === 'fight') txt(ctx, c.door > 0.85 ? 'פתוח! עכשיו!' : 'סגור…', c.x, c.y + c.h + 20, { size: 16, color: c.door > 0.85 ? '#7bd23f' : '#bfe3f0' });
}
function drawWaiter(ctx, v) {
  shadow(ctx, v.x, v.y, 24);
  const bob = -Math.abs(Math.sin(v.t * 16)) * 4;
  sprite(ctx, 'waiter', v.x, v.y + bob, { flip: v.face < 0, rot: v.rot, flash: v.flash, flashColor: '#ff4040' });
}

function draw(ctx, dt) {
  ctx.drawImage(bg, 0, 0, G.W, G.H);
  hooks.forEach((h) => h.drawBack && h.drawBack(ctx, st));
  for (const sh of st.shelves) drawShelf(ctx, sh);
  if (st.cab) drawCabinet(ctx, st.cab);
  const list = st.v.map((v) => ({ y: v.y, f: () => drawWaiter(ctx, v) }));
  hooks.forEach((h) => h.drawList && h.drawList(ctx, st, list));
  list.sort((a, b) => a.y - b.y).forEach((o) => o.f());
  const bob = st.hostBob > 0 ? -6 : Math.sin(G.t * 3) * 1;
  shadow(ctx, st.px, G.H - 4, 26);
  sprite(ctx, 'host', st.px, G.H - 2 + bob, { flash: st.hostFlash > 0 ? 0.7 : 0, flashColor: '#ff4040' });
  for (const p of st.pl) drawPlate(ctx, p.img, p.x, p.y, p.spin, p.r / 14);
  for (const e of st.ep) drawPlate(ctx, e.img, e.x, e.y, e.spin);
  hooks.forEach((h) => h.drawFront && h.drawFront(ctx, st));
  drawFx(ctx);
  drawAim(ctx);
  st.talk.draw(ctx, (w, ref) => {
    if (ref) return { x: clamp(ref.x, 40, G.W - 40), y: ref.y - 104 };
    if (w === 'host') return { x: st.px, y: G.H - 104 };
    return hooks.reduce((r, h) => r || (h.talkPos && h.talkPos(w, st)), null);
  });
  hud(ctx, dt, { back: leave });
  drawTimer(ctx);
  hooks.forEach((h) => h.drawUI && h.drawUI(ctx, st));
  if (st.ep.length || st.dodgeHint) {
    const s = 64, y = G.H - s - 12;
    btn(ctx, 12, y, s, s, '◀', () => {}, { key: 'mvL', size: 26 });
    btn(ctx, G.W - s - 12, y, s, s, '▶', () => {}, { key: 'mvR', size: 26 });
    st.moveDir = G.pressed ? (G.pressed.key === 'mvL' ? -1 : G.pressed.key === 'mvR' ? 1 : 0) : 0;
  } else st.moveDir = 0;
  if (st.phase === 'end') drawEnd(ctx);
  drawBanners(ctx, dt);
}

function drawAim(ctx) {
  const a = st.aim, o = origin();
  if (a && a.sling) {
    const dx = a.sx - a.x, dy = a.sy - a.y, l = Math.hypot(dx, dy) || 1;
    let ux = dx / l, uy = Math.min(-0.05, dy / l); const ul = Math.hypot(ux, uy); ux /= ul; uy /= ul;
    const reach = clamp(260 + l * 3.2, 300, 1400);
    for (let d = 30; d < Math.min(reach, 900); d += 28) {
      const x = o.x + ux * d, y = o.y + uy * d; if (y < 0) break;
      R(ctx, x - 3, y - 3, 6, 6, '#1a1020'); R(ctx, x - 2, y - 2, 4, 4, '#ffe14d');
    }
    ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(a.x, a.y); ctx.stroke();
  }
  const m = G.mouse;
  if (m && !a && st.phase !== 'end' && m.y < G.H - 90) {
    ctx.fillStyle = '#1a1020'; ctx.fillRect(m.x - 12, m.y - 2, 24, 4); ctx.fillRect(m.x - 2, m.y - 12, 4, 24);
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(m.x - 10, m.y - 1, 8, 2); ctx.fillRect(m.x + 2, m.y - 1, 8, 2); ctx.fillRect(m.x - 1, m.y - 10, 2, 8); ctx.fillRect(m.x - 1, m.y + 2, 2, 8);
  }
}
function drawTimer(ctx) {
  const w = Math.min(320, G.W - 260), x = (G.W - w) / 2, y = 14;
  R(ctx, x - 2, y - 2, w + 4, 18, '#1a1020'); R(ctx, x, y, w, 14, '#2a1a3a');
  let k = 0, col = '#ffd83d', label = `ערב ${st.n}`;
  if (st.phase === 'play') k = clamp(st.t / st.dur, 0, 1);
  else if (st.phase === 'boss' || st.phase === 'end') { k = 1; col = '#e8423f'; label = `ערב ${st.n} – המדף הגדול`; }
  R(ctx, x, y, w * k, 14, col);
  txt(ctx, label, G.W / 2, y + 30, { size: 16 });
  if (st.combo >= 2) txt(ctx, `קומבו x${st.combo}`, G.W / 2, y + 52, { size: 15, color: '#7bd23f' });
}
function drawEnd(ctx) {
  ctx.fillStyle = 'rgba(26,16,32,0.7)'; ctx.fillRect(0, 0, G.W, G.H);
  const w = Math.min(420, G.W - 40), h = 260, x = (G.W - w) / 2, y = (G.H - h) / 2;
  R(ctx, x - 4, y - 4, w + 8, h + 8, '#1a1020'); R(ctx, x, y, w, h, '#fff6dc');
  for (let i = 0; i < w; i += 12) { R(ctx, x + i, y, 6, 6, '#1d4fa3'); R(ctx, x + i, y + h - 6, 6, 6, '#1d4fa3'); }
  txt(ctx, st.over.win ? 'סחתיין! הערב נגמר' : 'הערב נגמר', G.W / 2, y + 40, { size: 28, color: '#1d4fa3', outline: '#fff6dc' });
  txt(ctx, `שבירות: ${st.breaks}   •   בול במטרה: ${st.heads}`, G.W / 2, y + 90, { size: 18, color: '#2a1a10', outline: false });
  txt(ctx, `בקופה: $${S.money}`, G.W / 2, y + 122, { size: 20, color: '#8a5a2b', outline: false });
  const bw = (w - 50) / 2;
  btn(ctx, x + w - bw - 20, y + h - 70, bw, 46, `ערב ${S.evening} ▶`, () => startEvening(), { color: '#1f9e5a', light: '#3fc07a' });
  btn(ctx, x + 20, y + h - 70, bw, 46, 'לרחוב 🚶', leave, { color: '#8a3a2a', light: '#b05a40' });
}

export function initTavernArt() {}
export { startEvening };
