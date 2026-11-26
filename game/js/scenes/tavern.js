// הטברנה – זריקת צלחות על הנבלים, בוס בסוף הערב
import { G, sprite, shadow, txt, btn, key, clamp, rnd, rndi, pick, dist, burst, floater, ring, updateFx, drawFx } from '../engine.js';
import { drawTavernBg, PLATES, plateCanvas, drawPlate, drawStars, bossVariants, R } from '../art.js';
import { S, save } from '../save.js';
import { sfx, musicStart, musicTempo, musicVolume } from '../audio.js';
import { go, hud, earn, banner, drawBanners, clearBanners, Talk } from '../game.js';
import { SLANG, OUCH } from '../lines.js';

const PLATE_SPEED = 1250;
const TYPES = {
  thief: { hw: 24, head: 0.3, speed: 110 },
  grease: { hw: 30, head: 0.48, speed: 0 },
  dine: { hw: 22, head: 0.3, speed: 300 },
  waiter: { hw: 24, head: 0.3, speed: 330 },
  boss: { hw: 32, head: 0.3, speed: 120 },
};

let bg = null, bossImg = null;
let WB = 200, FY0 = 260, FY1 = 410;
const st = {};
export const tav = st; // לשימוש מודולים נוספים (ערס, כיפת ברזל, קופסאות)

function rebuild() {
  WB = Math.round(G.H * (G.portrait ? 0.3 : 0.36)) & ~1;
  bg = drawTavernBg(G.W / 2, G.H / 2, WB / 2);
  FY0 = WB + 70; FY1 = G.H - 128;
}
export const floor = () => ({ y0: FY0, y1: FY1, wb: WB });

// ---------- ערב ----------
function startEvening() {
  const n = S.evening;
  Object.assign(st, {
    n, phase: 'intro', t: 0, dur: 60, earned: 0, heads: 0, hits: 0, combo: 0, comboT: 0,
    v: [], pl: [], ep: [], spawnT: 1.2, waiterT: rnd(5, 8),
    boss: null, cool: 0, aim: null, px: G.W / 2, hostFlash: 0, hostBob: 0,
    talk: new Talk(), events: [], over: null,
  });
  st.base = 100 + (n - 1) * 10;
  hooks.forEach((h) => h.start && h.start(st));
  clearBanners();
  banner(`ערב ${n}`, 1.8, { sub: n === 1 ? 'זרוק צלחות על הנבלים! פגיעה בראש = $10' : 'הקצב מאיץ… יאללה!' });
  musicStart(st.base); musicTempo(st.base); musicVolume(1);
}

// מודולים נוספים נרשמים כאן (ערס / כיפת ברזל / קופסאות)
const hooks = [];
export function addHook(h) { hooks.push(h); }

export const tavern = {
  enter() { rebuild(); startEvening(); },
  resize() { rebuild(); for (const v of st.v) v.y = clamp(v.y, FY0, FY1); st.px = clamp(st.px, 60, G.W - 60); },
  exit() { save(true); },
  key(code) {
    if (code === 'Escape') leave();
    if (code === 'Space' && st.phase !== 'end') {
      const m = G.mouse || { x: G.W / 2, y: (FY0 + FY1) / 2 - 40 };
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
      const reach = clamp(260 + l * 3.2, 300, 1400);
      throwDir(dx / l, dy / l, reach);
    } else throwAt(p.x, p.y);
  },
  update,
  draw,
};

function leave() { go('hub', { from: 'tavern' }); }
const origin = () => ({ x: st.px - 22, y: G.H - 46 });

// ---------- זריקה ----------
function plateInfo() {
  const P = PLATES[S.plate] || PLATES.white;
  return { img: plateCanvas(S.plate, S.paint, 32), r: P.r || 14, P };
}
function throwAt(tx, ty) {
  const o = origin();
  const dx = tx - o.x, dy = ty - o.y, l = Math.hypot(dx, dy) || 1;
  throwDir(dx / l, dy / l, l, true);
}
function throwDir(ux, uy, reach, tap) {
  if (st.cool > 0) return;
  if (uy > -0.05) { uy = -0.05; const l = Math.hypot(ux, uy); ux /= l; uy /= l; } // רק קדימה
  st.cool = 0.2;
  const o = origin(); const pi = plateInfo();
  const n = S.multi || 1;
  const spread = n === 1 ? [0] : n === 2 ? [-0.07, 0.07] : [-0.13, 0, 0.13];
  for (const s of spread) {
    const c = Math.cos(s), sn = Math.sin(s);
    const vx = ux * c - uy * sn, vy = ux * sn + uy * c;
    st.pl.push({ x: o.x, y: o.y, vx: vx * PLATE_SPEED, vy: vy * PLATE_SPEED, left: reach, spin: rnd(0, 6), img: pi.img, r: pi.r, P: pi.P, tap, hitSet: new Set() });
  }
  st.hostBob = 0.15;
  sfx.throw();
}

// ---------- נבלים ----------
function spawnVillain(type, o = {}) {
  const side = o.side ?? (Math.random() < 0.5 ? -1 : 1);
  const x = side < 0 ? -40 : G.W + 40;
  const y = o.y ?? rnd(FY0 + 10, FY1);
  const v = { type, img: type, x, y, vx: 0, vy: 0, side, t: 0, state: 'walk', flash: 0, dodgeCd: 0, face: -side, rot: 0, ...TYPES[type] };
  if (type === 'thief') { v.vx = -side * rnd(95, 135) * (st.base / 100); v.phase = rnd(0, 6); }
  if (type === 'grease') { v.vx = -side * rnd(120, 200); v.vy = rnd(-60, 60); v.life = rnd(9, 13); v.ax = 0; v.axT = 0; }
  if (type === 'dine') { v.tx = rnd(G.W * 0.2, G.W * 0.8); v.ty = y; v.vx = -side * 140; v.sitT = rnd(1.6, 3); }
  if (type === 'waiter') { v.y = rnd(FY0 + 30, FY1 - 20); v.vx = -side * rnd(300, 360); }
  st.v.push(v);
  return v;
}

function updateVillains(dt) {
  for (const v of st.v) {
    v.t += dt; v.flash = Math.max(0, v.flash - dt * 3); v.dodgeCd -= dt;
    if (v.state === 'hit') {
      v.rot = Math.sin(v.t * 30) * 0.15;
      if (v.t > 0.45) { v.state = 'flee'; v.t = 0; const s = v.x < G.W / 2 ? -1 : 1; v.vx = s * 380; v.vy = 0; v.face = s; }
      continue;
    }
    if (v.state === 'flee') { v.rot = Math.sin(v.t * 14) * 0.25; v.x += v.vx * dt; continue; }
    if (v.state === 'ko') { v.koT -= dt; if (v.koT <= 0) { v.state = 'flee'; v.t = 0; v.rot = 0; v.vx = (v.x < G.W / 2 ? -1 : 1) * 380; } continue; }
    if (v.type === 'thief') {
      v.y = clamp(v.y + Math.sin(v.t * 2.2 + v.phase) * 40 * dt, FY0, FY1);
      // חומק מצלחות שמתקרבות
      if (v.dodgeCd <= 0) {
        for (const p of st.pl) {
          const d = dist(p.x, p.y, v.x, v.y - 50);
          const toward = (v.x - p.x) * p.vx + (v.y - 50 - p.y) * p.vy > 0;
          if (d < 170 && toward && Math.random() < 0.5 + st.n * 0.04) {
            const s = p.vx > 0 ? -1 : 1;
            v.dash = 0.22; v.dashV = (Math.abs(p.vx) > 200 ? s : (Math.random() < 0.5 ? -1 : 1)) * 520;
            v.dodgeCd = clamp(1.4 - st.n * 0.08, 0.6, 1.4);
            floater('חומק!', v.x, v.y - 110, { size: 16, color: '#cfd8ff', life: 0.7 });
            break;
          }
          if (d < 170) { v.dodgeCd = 0.5; break; }
        }
      }
      if (v.dash > 0) { v.dash -= dt; v.x += v.dashV * dt; G.fx.push({ k: 'ghost', img: 'thief', x: v.x, y: v.y, t: 0, life: 0.25, flip: v.face < 0 }); }
      v.x += v.vx * dt; v.face = v.vx < 0 ? -1 : 1;
      if ((v.vx > 0 && v.x > G.W + 50) || (v.vx < 0 && v.x < -50)) {
        v.gone = true; const n = Math.min(3, S.money);
        if (n > 0) earn(-n, clamp(v.x, 60, G.W - 60), v.y - 110, `השודד גנב $${n}!`);
      }
    } else if (v.type === 'grease') {
      v.life -= dt; v.axT -= dt;
      if (v.axT <= 0) { v.axT = rnd(0.4, 0.9); v.ax = rnd(-420, 420); v.ay = rnd(-160, 160); }
      v.vx = clamp(v.vx + v.ax * dt, -280, 280); v.vy = clamp(v.vy + v.ay * dt, -120, 120);
      v.vx *= 0.995; v.x += v.vx * dt; v.y += v.vy * dt;
      v.rot = clamp(v.vx / 2000, -0.15, 0.15);
      if (v.life > 0) {
        if (v.x < 50) { v.x = 50; v.vx = Math.abs(v.vx); } if (v.x > G.W - 50) { v.x = G.W - 50; v.vx = -Math.abs(v.vx); }
      } else if (v.x < -60 || v.x > G.W + 60) v.gone = true;
      if (v.y < FY0) { v.y = FY0; v.vy = Math.abs(v.vy); } if (v.y > FY1) { v.y = FY1; v.vy = -Math.abs(v.vy); }
      v.face = v.vx < 0 ? -1 : 1;
      if (Math.random() < dt * 6) G.fx.push({ k: 'bit', x: v.x + rnd(-20, 20), y: v.y - 2, vx: 0, vy: 0, g: 0, life: 1.6, t: 0, c: Math.random() < 0.5 ? '#e8c43a' : '#c9a020', sz: 4 });
    } else if (v.type === 'dine') {
      if (v.state === 'walk') {
        const dx = v.tx - v.x; v.x += Math.sign(dx) * Math.min(Math.abs(dx), 140 * dt); v.face = dx < 0 ? -1 : 1;
        if (Math.abs(dx) < 2) { v.state = 'sit'; v.t = 0; }
      } else if (v.state === 'sit') {
        if (v.t > v.sitT) { v.state = 'run'; v.t = 0; const s = v.x < G.W / 2 ? -1 : 1; v.vx = s * TYPES.dine.speed * (st.base / 100); v.face = s; floater('!', v.x, v.y - 112, { size: 30, color: '#ff5a5a', life: 0.6 }); }
      } else if (v.state === 'run') {
        v.x += v.vx * dt;
        if (v.x < -50 || v.x > G.W + 50) { v.gone = true; const n = Math.min(5, S.money); if (n) earn(-n, clamp(v.x, 80, G.W - 80), v.y - 110, `ברח בלי לשלם! -$${n}`); }
      }
    } else if (v.type === 'waiter') {
      v.x += v.vx * dt; v.face = v.vx < 0 ? -1 : 1;
      if (v.stumble > 0) { v.stumble -= dt; v.rot = Math.sin(v.stumble * 30) * 0.2; } else v.rot = 0;
      if (v.x < -60 || v.x > G.W + 60) v.gone = true;
    }
  }
  for (const v of st.v) if (v.state === 'flee' && (v.x < -60 || v.x > G.W + 60)) v.gone = true;
  st.v = st.v.filter((v) => !v.gone);
}

function hitbox(v) {
  const h = 98;
  return { x0: v.x - v.hw, x1: v.x + v.hw, y0: v.y - h, y1: v.y, head: v.y - h + h * v.head };
}
export function hittable(v) { return v.state !== 'hit' && v.state !== 'flee'; }

// חישוב פרס לפגיעה
function reward(base, P) {
  let n = base + (P.bonus || 0);
  if (P.mult) n *= P.mult;
  return n;
}
export function comboUp(x, y) {
  st.combo++; st.comboT = 2.2;
  if (st.combo >= 3 && st.combo % 2 === 1) floater(pick(SLANG), x, y - 40, { size: 26, color: '#7bd23f' });
}

export function hitVillain(v, p, x, y, byAlly) {
  const hb = hitbox(v);
  const head = y < hb.head;
  const P = p ? p.P : PLATES.white;
  v.flash = 1;
  sfx.break(); sfx.thud();
  burst(x, y, ['#ffffff', '#c8d2dc', P.rim || '#9aa5b1'], 14, { floor: v.y + 4 });
  if (v.type === 'waiter') {
    v.stumble = 0.6;
    const n = Math.min(10, S.money);
    earn(-n, v.x, v.y - 120, `${pick(OUCH)} -$${n}`);
    st.combo = 0;
    return;
  }
  const wasKo = v.state === 'ko';
  v.state = 'hit'; v.t = 0; v.rot = 0;
  st.hits++; S.stats.hits++;
  if (head || wasKo) {
    st.heads++; S.stats.heads++;
    const n = reward(10, P);
    earn(n, v.x, v.y - 120, `בול במטרה! $${n}`, '#ffe14d');
    ring(x, y, '#ffe14d', 46);
  } else {
    const n = reward(v.type === 'dine' && v.state === 'run' ? 6 : 4, P);
    earn(n, v.x, v.y - 116, `פגיעה! $${n}`, '#fffbea');
  }
  comboUp(v.x, v.y - 120);
}

// ---------- בוס ----------
function spawnBoss() {
  const n = st.n;
  st.boss = { type: 'boss', img: 'boss', x: G.W / 2, y: FY0 - 40, vx: 110 + n * 10, vy: 0, t: 0, state: 'enter', flash: 0,
    shield: 4 + n, shieldMax: 4 + n, hp: 5 + n * 2, hpMax: 5 + n * 2, throwT: 2.5, face: 1, rot: 0, ...TYPES.boss, broken: false };
  banner('השף הרשע מגיע!', 2, { color: '#ff8a5a', sub: 'שבור לו את המגן!' });
  sfx.clang();
}
function updateBoss(dt) {
  const b = st.boss; if (!b) return;
  b.t += dt; b.flash = Math.max(0, b.flash - dt * 3);
  if (b.state === 'enter') { b.y += 90 * dt; if (b.y >= FY0 + 40) { b.state = 'fight'; } return; }
  if (b.state === 'dead') { b.rot += dt * 2; b.y += 40 * dt; if (b.t > 1.6) { st.boss = null; endEvening(true); } return; }
  b.x += b.vx * dt;
  if (b.x < 90) { b.x = 90; b.vx = Math.abs(b.vx); } if (b.x > G.W - 90) { b.x = G.W - 90; b.vx = -Math.abs(b.vx); }
  b.y = clamp(FY0 + 50 + Math.sin(b.t * 0.9) * (FY1 - FY0 - 60) * 0.45, FY0, FY1);
  b.face = b.vx < 0 ? -1 : 1;
  b.throwT -= dt;
  if (b.throwT <= 0) {
    b.throwT = clamp(2.4 - st.n * 0.15, 1.1, 2.4);
    enemyThrow(b.x, b.y - 70, 'pot', 360 + st.n * 15);
  }
}
function hitBoss(p, x, y) {
  const b = st.boss; const P = p.P;
  const dmg = P.dmg || 1;
  b.flash = 1;
  if (b.shield > 0) {
    b.shield = Math.max(0, b.shield - dmg);
    sfx.clang(); burst(x, y, ['#6ead97', '#3d5b51', '#ffffff'], 10);
    floater('קלאנג!', x, y - 20, { size: 20, color: '#9fe0c8', life: 0.8 });
    if (b.shield === 0) {
      b.broken = true; G.shake = 0.4; sfx.boom();
      burst(b.x + 10, b.y - 50, ['#6ead97', '#3d5b51', '#5d9b85', '#ffffff'], 40, { up: 260, max: 420, smin: 4, smax: 9 });
      banner('המגן נשבר!', 1.4, { color: '#7bd23f' });
      earn(15, b.x, b.y - 130, 'וואלה בול! +$15');
    }
    return;
  }
  const hb = hitbox(b); const head = y < hb.head;
  b.hp -= head ? dmg * 2 : dmg;
  sfx.break(); sfx.thud();
  burst(x, y, ['#ffffff', '#c8d2dc', '#e8423f'], 14);
  const n = reward(head ? 15 : 8, P);
  earn(n, b.x, b.y - 130, head ? `בול במטרה! $${n}` : `+$${n}`);
  comboUp(b.x, b.y - 130);
  if (b.hp <= 0) {
    b.state = 'dead'; b.t = 0; S.stats.bosses++;
    G.shake = 0.6; sfx.boom();
    burst(b.x, b.y - 50, ['#ffe14d', '#ff9b2e', '#ffffff', '#e8423f'], 50, { up: 300, max: 500 });
    const bonus = 60 + st.n * 20;
    earn(bonus, b.x, b.y - 150, `ניצחת את השף! +$${bonus}`);
  }
}

// ---------- צלחות של אויבים ----------
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
      burst(e.x, e.y, e.kind === 'pot' ? ['#5b6470', '#aab3bd', '#e8423f'] : ['#ffffff', '#c8d2dc'], 12);
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
  burst(p.x, p.y, ['#ffffff', '#c8d2dc', p.P.rim || '#9aa5b1'], 12, { floor: Math.max(p.y + 6, FY0) });
}
export const targets = []; // מטרות נוספות מהמודולים: {test(p)->bool}
function updatePlates(dt) {
  for (const p of st.pl) {
    p.spin += dt * 20;
    if (p.P.homing) {
      let best = null, bd = 260;
      for (const v of st.v) if (hittable(v) && v.type !== 'waiter') { const d = dist(p.x, p.y, v.x, v.y - 60); if (d < bd) { bd = d; best = v; } }
      if (best) {
        const dx = best.x - p.x, dy = best.y - 60 - p.y, l = Math.hypot(dx, dy) || 1;
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
  // יירוט צלחות אויב
  for (const e of st.ep) {
    if (!e.dead && dist(p.x, p.y, e.x, e.y) < p.r + 14) {
      e.dead = true; p.dead = true; shatter(p);
      burst(e.x, e.y, ['#ffffff', '#c8d2dc'], 10);
      earn(2, e.x, e.y - 20, 'יירוט צלחת! +$2', '#9fe0ff');
      return true;
    }
  }
  for (const t of targets) if (t.test && t.test(p)) return true;
  // בוס
  const b = st.boss;
  if (b && b.state === 'fight') {
    const hb = hitbox(b);
    if (p.x > hb.x0 - p.r && p.x < hb.x1 + p.r && p.y > hb.y0 && p.y < hb.y1) {
      hitBoss(p, p.x, p.y); p.dead = true; return true;
    }
  }
  // נבלים מלפנים לאחור
  const vs = st.v.filter((v) => hittable(v) && !p.hitSet.has(v)).sort((a, c) => c.y - a.y);
  for (const v of vs) {
    const hb = hitbox(v);
    if (p.x > hb.x0 - p.r * 0.6 && p.x < hb.x1 + p.r * 0.6 && p.y > hb.y0 - p.r * 0.3 && p.y < hb.y1 - 6) {
      if (v.onHit) v.onHit(p, p.x, p.y); else hitVillain(v, p, p.x, p.y);
      p.hitSet.add(v);
      if (!p.P.pierce) { p.dead = true; return true; }
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
  // תנועת השחקן
  let mx = 0;
  if (key('ArrowLeft', 'KeyA')) mx -= 1;
  if (key('ArrowRight', 'KeyD')) mx += 1;
  if (st.moveDir) mx = st.moveDir;
  st.px = clamp(st.px + mx * 320 * dt, 60, G.W - 60);

  if (st.phase === 'intro' && st.t > 1.6) { st.phase = 'play'; st.t = 0; }
  if (st.phase === 'play') {
    const tempo = st.base + 40 * clamp(st.t / st.dur, 0, 1);
    st.tempo = tempo; musicTempo(tempo);
    const k = tempo / 100;
    const blocked = hooks.some((h) => h.blocking && h.blocking(st));
    if (!blocked) {
      st.spawnT -= dt * k;
      const maxV = Math.min(3 + st.n, 8);
      if (st.spawnT <= 0 && st.v.filter((v) => v.type !== 'waiter').length < maxV) {
        st.spawnT = clamp(2.3 - st.n * 0.12, 0.8, 2.3) * rnd(0.7, 1.2);
        const r = Math.random();
        spawnVillain(r < 0.4 ? 'thief' : r < 0.72 ? 'grease' : 'dine');
      }
      st.waiterT -= dt;
      if (st.waiterT <= 0) { st.waiterT = rnd(5, 9) / k; spawnVillain('waiter'); }
    }
    if (st.t >= st.dur && !blocked) {
      st.phase = 'boss'; st.t = 0;
      for (const v of st.v) if (v.state !== 'flee' && v.type !== 'waiter') { v.state = 'flee'; v.t = 0; v.vx = (v.x < G.W / 2 ? -1 : 1) * 380; }
      spawnBoss();
      musicTempo(st.base + 50);
    }
  }
  hooks.forEach((h) => h.update && h.update(dt, st));
  updateVillains(dt);
  updateBoss(dt);
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
function drawVillain(ctx, v) {
  shadow(ctx, v.x, v.y, v.hw);
  let bob = 0;
  if (v.state === 'walk' || v.state === 'run' || v.type === 'waiter') bob = -Math.abs(Math.sin(v.t * (v.type === 'dine' || v.type === 'waiter' ? 16 : 9))) * 4;
  if (v.state === 'sit') bob = Math.sin(v.t * 6) * 1.5;
  if (v.state === 'ko') {
    sprite(ctx, v.img, v.x, v.y, { rot: -Math.PI / 2 * (v.koSide || 1), flash: v.flash });
    drawStars(ctx, v.x + 44 * (v.koSide || 1), v.y - 20, G.t);
    return;
  }
  sprite(ctx, v.img, v.x, v.y + bob, { flip: v.face < 0, rot: v.rot, flash: v.flash, flashColor: v.type === 'waiter' ? '#ff4040' : '#ffffff' });
  if (v.state === 'hit' || v.state === 'flee') drawStars(ctx, v.x, v.y - 100, G.t, 3);
  if (v.type === 'dine' && v.state === 'sit') { R(ctx, v.x - 18, v.y - 40, 36, 6, '#8a5a2b'); }
}
function drawBoss(ctx, b) {
  shadow(ctx, b.x, b.y, 36);
  const im = b.broken ? bossImg.broken : 'boss';
  sprite(ctx, im, b.x, b.y, { flip: b.face < 0, rot: b.rot, flash: b.broken ? 0 : b.flash });
  if (b.broken && b.flash > 0) sprite(ctx, im, b.x, b.y, { flip: b.face < 0, alpha: b.flash * 0.6 });
  // סדקים במגן
  if (!b.broken && b.shield < b.shieldMax) {
    const sh = bossImg.shield, img = G.imgs.boss;
    const sx = b.x + (sh.cx - img.width / 2) * (b.face < 0 ? -1 : 1), sy = b.y - img.height + sh.cy;
    const k = 1 - b.shield / b.shieldMax;
    ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 2;
    ctx.beginPath();
    const n = Math.ceil(k * 6);
    for (let i = 0; i < n; i++) {
      const a = i * 2.1 + 0.4;
      ctx.moveTo(Math.round(sx), Math.round(sy));
      ctx.lineTo(Math.round(sx + Math.cos(a) * sh.r * 0.55), Math.round(sy + Math.sin(a) * sh.r * 0.55));
      ctx.lineTo(Math.round(sx + Math.cos(a + 0.3) * sh.r * 0.95), Math.round(sy + Math.sin(a + 0.3) * sh.r * 0.95));
    }
    ctx.stroke();
  }
  // פסי מגן וחיים
  const w = 160, x = b.x - w / 2, y = b.y - 128;
  R(ctx, x - 2, y - 2, w + 4, 14, '#1a1020');
  if (!b.broken) { R(ctx, x, y, w * (b.shield / b.shieldMax), 10, '#6ead97'); txt(ctx, 'מגן', b.x, y - 12, { size: 13 }); }
  else { R(ctx, x, y, w * Math.max(0, b.hp / b.hpMax), 10, '#e8423f'); txt(ctx, 'השף הרשע', b.x, y - 12, { size: 13 }); }
}

function draw(ctx, dt) {
  ctx.drawImage(bg, 0, 0, G.W, G.H);
  hooks.forEach((h) => h.drawBack && h.drawBack(ctx, st));
  // לפי עומק
  const list = st.v.map((v) => ({ y: v.y, f: () => drawVillain(ctx, v) }));
  if (st.boss) list.push({ y: st.boss.y, f: () => drawBoss(ctx, st.boss) });
  hooks.forEach((h) => h.drawList && h.drawList(ctx, st, list));
  list.sort((a, b) => a.y - b.y).forEach((o) => o.f());
  // שחקן
  const bob = st.hostBob > 0 ? -6 : Math.sin(G.t * 3) * 1;
  shadow(ctx, st.px, G.H - 4, 26);
  sprite(ctx, 'host', st.px, G.H - 2 + bob, { flash: st.hostFlash > 0 ? 0.7 : 0, flashColor: '#ff4040' });
  // צלחות
  for (const p of st.pl) drawPlate(ctx, p.img, p.x, p.y, p.spin, p.r / 14);
  for (const e of st.ep) {
    if (e.kind === 'pot') {
      ctx.save(); ctx.translate(Math.round(e.x), Math.round(e.y)); ctx.rotate(e.spin * 0.5);
      R(ctx, -12, -8, 24, 16, '#1a1020'); R(ctx, -10, -6, 20, 12, '#5b6470'); R(ctx, -10, -6, 20, 3, '#8a95a3'); R(ctx, 10, -3, 8, 4, '#1a1020');
      ctx.restore();
    } else drawPlate(ctx, e.img, e.x, e.y, e.spin);
  }
  hooks.forEach((h) => h.drawFront && h.drawFront(ctx, st));
  drawFx(ctx);
  // כוונת
  drawAim(ctx);
  st.talk.draw(ctx, (w) => hooks.reduce((r, h) => r || (h.talkPos && h.talkPos(w, st)), null) || { x: st.px, y: G.H - 110 });
  // HUD
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
  else if (st.phase === 'boss' || st.phase === 'end') { k = 1; col = '#e8423f'; label = `ערב ${st.n} – בוס!`; }
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
  txt(ctx, `פגיעות: ${st.hits}   •   בול במטרה: ${st.heads}`, G.W / 2, y + 90, { size: 18, color: '#2a1a10', outline: false });
  txt(ctx, `בקופה: $${S.money}`, G.W / 2, y + 122, { size: 20, color: '#8a5a2b', outline: false });
  const bw = (w - 50) / 2;
  btn(ctx, x + w - bw - 20, y + h - 70, bw, 46, `ערב ${S.evening} ▶`, () => startEvening(), { color: '#1f9e5a', light: '#3fc07a' });
  btn(ctx, x + 20, y + h - 70, bw, 46, 'לרחוב 🚶', leave, { color: '#8a3a2a', light: '#b05a40' });
}

export function initTavernArt() { if (G.imgs.boss) bossImg = bossVariants(G.imgs.boss); }
export { spawnVillain, hitbox, startEvening };
