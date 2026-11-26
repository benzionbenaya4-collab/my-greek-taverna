// ניהול סצנות, HUD, דיבור, באנרים
import { G, txt, btn, bubble, clamp, floater, FONT } from './engine.js';
import { S, save, addMoney } from './save.js';
import { sfx, setMuted } from './audio.js';
import { NAMES } from './lines.js';

const scenes = {};
let fadeT = 0;
export function register(name, sc) { scenes[name] = sc; }
export function go(name, data) {
  if (G.scene && G.scene.exit) G.scene.exit();
  G.scene = scenes[name];
  G.sceneName = name;
  G.fx = [];
  fadeT = 0.35;
  if (G.scene.enter) G.scene.enter(data || {});
}
export function drawFade(ctx, dt) {
  if (fadeT <= 0) return;
  fadeT -= dt;
  ctx.fillStyle = `rgba(26,16,32,${clamp(fadeT / 0.35, 0, 1)})`;
  ctx.fillRect(0, 0, G.W, G.H);
}

// ---------- כסף ----------
let shown = null, bump = 0;
export function earn(n, x, y, label, color) {
  addMoney(n);
  if (n > 0) sfx.cash(); else if (n < 0) sfx.bad();
  const s = label || (n >= 0 ? `+$${n}` : `-$${-n}`);
  if (x != null) floater(s, x, y, { color: color || (n >= 0 ? '#ffe14d' : '#ff5a5a'), size: label ? 24 : 22 });
  bump = 0.25;
}
export function canPay(n) { return S.money >= n; }

export function hud(ctx, dt, o = {}) {
  if (shown == null) shown = S.money;
  shown += (S.money - shown) * Math.min(1, dt * 10);
  if (Math.abs(S.money - shown) < 0.5) shown = S.money;
  bump = Math.max(0, bump - dt);
  const s = '$' + Math.round(shown);
  ctx.font = `bold 22px ${FONT}`;
  const w = ctx.measureText(s).width + 46;
  const x = G.W - w - 10, y = 10, h = 36;
  ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 2, y, w + 4, h); ctx.fillRect(x, y - 2, w, h + 4);
  ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x, y, w, h);
  // מטבע
  const cx = x + 18, cy = y + h / 2;
  ctx.fillStyle = '#1a1020'; ctx.fillRect(cx - 9, cy - 7, 18, 14); ctx.fillRect(cx - 7, cy - 9, 14, 18);
  ctx.fillStyle = '#ffd83d'; ctx.fillRect(cx - 7, cy - 7, 14, 14);
  ctx.fillStyle = '#c8961e'; ctx.fillRect(cx - 2, cy - 5, 4, 10);
  txt(ctx, s, x + w - 8, y + h / 2 + 1, { size: 22 + bump * 16, align: 'right', color: '#ffe14d' });
  // השתקה
  const mx = 10, my = 10;
  btn(ctx, mx, my, 40, 36, S.muted ? '🔇' : '🔊', () => { S.muted = !S.muted; setMuted(S.muted); save(); }, { key: 'mute', size: 18, color: '#2a1a3a', light: '#4a3a5a' });
  if (o.back) btn(ctx, mx + 50, my, 46, 36, '🚪', o.back, { key: 'back', size: 18, color: '#8a3a2a', light: '#b05a40' });
}

// ---------- באנר ----------
let banners = [];
export function banner(text, dur = 1.8, o = {}) { banners.push({ text, dur, t: 0, color: o.color || '#ffe14d', size: o.size || 42, sub: o.sub }); }
export function clearBanners() { banners = []; }
export function drawBanners(ctx, dt) {
  const b = banners[0]; if (!b) return;
  b.t += dt;
  const a = b.t < 0.2 ? b.t / 0.2 : b.t > b.dur - 0.3 ? (b.dur - b.t) / 0.3 : 1;
  const y = G.H * 0.3;
  ctx.fillStyle = `rgba(26,16,32,${0.55 * a})`; ctx.fillRect(0, y - b.size, G.W, b.size * (b.sub ? 2.6 : 2));
  txt(ctx, b.text, G.W / 2, y, { size: b.size * (0.8 + 0.2 * Math.min(1, b.t * 5)), color: b.color, alpha: a, lw: 7 });
  if (b.sub) txt(ctx, b.sub, G.W / 2, y + b.size * 0.95, { size: 20, alpha: a });
  if (b.t >= b.dur) banners.shift();
}

// ---------- דיבור ----------
export class Talk {
  constructor() { this.q = []; this.cur = null; }
  say(who, text, dur) { this.q.push({ who, text, dur: dur || clamp(1.4 + text.length * 0.06, 2.2, 6.5), t: 0 }); }
  now(who, text, dur) { this.q = []; this.cur = null; this.say(who, text, dur); this.update(0); }
  clear() { this.q = []; this.cur = null; }
  get busy() { return !!this.cur || this.q.length > 0; }
  update(dt) {
    if (!this.cur && this.q.length) this.cur = this.q.shift();
    if (this.cur) { this.cur.t += dt; if (this.cur.t >= this.cur.dur) this.cur = null; }
  }
  draw(ctx, posOf) {
    const c = this.cur; if (!c) return;
    const p = posOf(c.who); if (!p) return;
    const a = Math.min(1, c.t * 6, (c.dur - c.t) * 4);
    bubble(ctx, c.text, p.x, p.y, { name: NAMES[c.who], alpha: a, nameBg: c.who === 'ars' ? '#8a3a2a' : c.who === 'savta' ? '#a01e6a' : '#1d4fa3' });
  }
}

// פריסת שורת כפתורי פעולה בתחתית המסך
export function actionBar(ctx, items) {
  if (!items.length) return;
  ctx.font = `bold 17px ${FONT}`;
  const ws = items.map((it) => Math.max(120, ctx.measureText(it.label).width + 30));
  const rows = []; let row = [], rw = 0;
  ws.forEach((w, i) => {
    if (row.length && rw + w + 10 > G.W - 24) { rows.push(row); row = []; rw = 0; }
    row.push(i); rw += w + 10;
  });
  rows.push(row);
  const h = 42;
  rows.forEach((r, ri) => {
    const tot = r.reduce((s, i) => s + ws[i] + 10, -10);
    let x = (G.W - tot) / 2;
    const y = G.H - 14 - (rows.length - ri) * (h + 12);
    for (const i of r) {
      const it = items[i];
      btn(ctx, x, y, ws[i], h, it.label, it.fn, { color: it.color, light: it.light, disabled: it.disabled, key: it.key || it.label });
      x += ws[i] + 10;
    }
  });
}
