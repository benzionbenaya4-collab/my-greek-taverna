// רחוב הטברנה – העולם הפתוח
import { G, sprite, shadow, txt, key, clamp, rnd, pick, dist, burst, floater, ring, updateFx, drawFx } from '../engine.js';
import { drawStreet, benchFront, HUB, plateCanvas, drawPlate, drawStars } from '../art.js';
import { S, save } from '../save.js';
import { sfx, musicStart, musicTempo, musicVolume } from '../audio.js';
import { go, hud, earn, canPay, Talk, actionBar, banner, drawBanners } from '../game.js';
import { BENCH_TALK, ARS, SAVTA, HUB_HINT, SEAT_LINES, OUCH } from '../lines.js';

const SPEED = 230;
const FINE = typeof matchMedia !== 'undefined' && matchMedia('(pointer:fine)').matches;
let bg = null, GY = 0;
const st = {};

function rebuild() {
  const r = drawStreet(HUB.W / 2, G.H / 2);
  bg = r.c; GY = r.gy * 2;
}

function arsHome() { return { x: HUB.bench - 34, y: GY + 2 }; }
function savtaBench() { return { x: HUB.bench + 36, y: GY + 2 }; }
function savtaSeat() { return { x: HUB.seat + 20, y: GY + 6 }; }

export const hub = {
  enter(d) {
    rebuild();
    st.px = d.from === 'shop' ? HUB.shop : d.from === 'tavern' ? HUB.tavern : HUB.tavern + 140;
    st.py = GY + 70;
    st.face = 1; st.walk = 0; st.moving = false;
    st.joy = null;
    st.talk = new Talk();
    st.benchIdx = Math.floor(Math.random() * BENCH_TALK.length);
    st.benchGap = 0.5;
    st.savtaAtSeat = Math.random() < 0.4;
    st.ars = { ...arsHome(), mode: 'sit', t: 0, throwT: 1.5, flash: 0 };
    st.plates = []; st.enemy = [];
    st.dodge = null;
    st.hitFlash = 0;
    st.gulls = Array.from({ length: 4 }, () => ({ x: rnd(0, HUB.W), y: rnd(30, GY - 260), v: rnd(30, 60), p: rnd(0, 6) }));
    st.seatT = 0;
    st.camX = clamp(st.px - G.W / 2, 0, Math.max(0, HUB.W - G.W));
    musicStart(84); musicTempo(84); musicVolume(0.55);
  },
  resize() { rebuild(); st.py = clamp(st.py, GY + 34, G.H - 8); },

  down(p) { st.joy = { id: p.id, bx: p.x, by: p.y, x: p.x, y: p.y }; },
  move(p) { if (st.joy && st.joy.id === p.id) { st.joy.x = p.x; st.joy.y = p.y; } },
  up(p) { if (st.joy && st.joy.id === p.id) st.joy = null; },
  key(code) {
    if (code === 'KeyE' || code === 'Enter' || code === 'Space') { const a = actions()[0]; if (a && !a.disabled) a.fn(); }
  },

  update(dt) {
    // תנועה
    let mx = 0, my = 0;
    if (key('ArrowLeft', 'KeyA')) mx -= 1;
    if (key('ArrowRight', 'KeyD')) mx += 1;
    if (key('ArrowUp', 'KeyW')) my -= 1;
    if (key('ArrowDown', 'KeyS')) my += 1;
    if (st.joy) {
      const dx = st.joy.x - st.joy.bx, dy = st.joy.y - st.joy.by, l = Math.hypot(dx, dy);
      if (l > 8) { const k = Math.min(1, l / 50); mx = (dx / l) * k; my = (dy / l) * k; }
    }
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    st.px = clamp(st.px + mx * SPEED * dt, 40, HUB.W - 40);
    st.py = clamp(st.py + my * SPEED * 0.6 * dt, GY + 34, G.H - 8);
    st.moving = ml > 0.1;
    if (Math.abs(mx) > 0.1) st.face = mx < 0 ? -1 : 1;
    if (st.moving) st.walk += dt * 10; else st.walk = 0;
    const target = clamp(st.px - G.W / 2, 0, Math.max(0, HUB.W - G.W));
    st.camX += (target - st.camX) * Math.min(1, dt * 6);
    if (HUB.W < G.W) st.camX = (HUB.W - G.W) / 2;

    st.talk.update(dt);
    st.hitFlash = Math.max(0, st.hitFlash - dt);
    for (const g of st.gulls) { g.x += g.v * dt; g.p += dt * 6; if (g.x > HUB.W + 40) { g.x = -40; g.y = rnd(30, Math.max(60, GY - 260)); } }

    // שיחה על הספסל כשמתקרבים
    const nb = Math.abs(st.px - HUB.bench) < 300;
    if (nb && !st.talk.busy && st.ars.mode === 'sit' && !st.dodge) {
      st.benchGap -= dt;
      if (st.benchGap <= 0) {
        if (st.savtaAtSeat) st.talk.say('ars', pick(ARS.calm));
        else { for (const [w, l] of BENCH_TALK[st.benchIdx % BENCH_TALK.length]) st.talk.say(w, l); st.benchIdx++; }
        st.benchGap = 1.6;
      }
    }

    updateArs(dt);
    updatePlates(dt);
    updateDodge(dt);
    updateFx(dt);
  },

  draw(ctx, dt) {
    const cam = Math.round(st.camX);
    ctx.drawImage(bg, cam / 2, 0, G.W / 2, G.H / 2, 0, 0, G.W, G.H);
    ctx.save(); ctx.translate(-cam, 0);
    // שחפים
    for (const g of st.gulls) {
      const f = Math.sin(g.p) > 0 ? 2 : 0;
      ctx.fillStyle = '#1a1020';
      ctx.fillRect(g.x - 8, g.y - f, 6, 2); ctx.fillRect(g.x + 2, g.y - f, 6, 2); ctx.fillRect(g.x - 2, g.y + 1, 4, 2);
    }
    // רשימת ציור לפי עומק
    const list = [];
    const a = st.ars;
    list.push({ y: a.y, f: () => drawArs(ctx) });
    if (!st.savtaAtSeat) { const s = savtaBench(); list.push({ y: s.y, f: () => sprite(ctx, 'savta', s.x, s.y + Math.sin(G.t * 1.3) * 0.6) }); }
    else { const s = savtaSeat(); list.push({ y: s.y, f: () => { shadow(ctx, s.x, s.y, 20); sprite(ctx, 'savta', s.x, s.y, { flip: true }); } }); }
    list.push({ y: GY + 8, f: () => benchFront(ctx, HUB.bench, GY + 8) });
    list.push({ y: st.py, f: () => drawHost(ctx) });
    list.sort((p, q) => p.y - q.y).forEach((o) => o.f());
    // צלחות באוויר
    for (const p of st.plates) drawPlate(ctx, p.img, p.x, p.y, p.spin);
    for (const p of st.enemy) drawPlate(ctx, p.img, p.x, p.y, p.spin);
    drawFx(ctx);
    // בועות דיבור
    st.talk.draw(ctx, (w) => w === 'ars' ? { x: a.x, y: a.y - 100 } : w === 'savta' ? (st.savtaAtSeat ? { x: savtaSeat().x, y: savtaSeat().y - 100 } : { x: savtaBench().x, y: savtaBench().y - 100 }) : { x: st.px, y: st.py - 102 });
    ctx.restore();

    // HUD
    if (st.hitFlash > 0) { ctx.fillStyle = `rgba(255,40,40,${st.hitFlash})`; ctx.fillRect(0, 0, G.W, G.H); }
    hud(ctx, dt);
    const n = nearest();
    if (st.dodge) {
      txt(ctx, `התחמק! ${Math.max(0, st.dodge.t).toFixed(1)}`, G.W / 2, 72, { size: 30, color: '#ff8a5a' });
      txt(ctx, `פגיעות: ${st.dodge.hits}/3`, G.W / 2, 104, { size: 18 });
    } else {
      const hy = G.portrait ? 74 : 30;
      if (n) txt(ctx, HUB_HINT[n], G.W / 2, hy, { size: 18, color: '#fffbea' });
      else txt(ctx, `ערב ${S.evening}  •  לך לטברנה לזרוק צלחות`, G.W / 2, hy, { size: 16, color: '#fffbea' });
    }
    actionBar(ctx, actions());
    // ג'ויסטיק
    if (st.joy) {
      const j = st.joy;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#1a1020'; ctx.beginPath(); ctx.arc(j.bx, j.by, 52, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fffbea'; ctx.beginPath(); ctx.arc(j.bx, j.by, 48, 0, Math.PI * 2); ctx.fill();
      const dx = j.x - j.bx, dy = j.y - j.by, l = Math.hypot(dx, dy), k = l > 48 ? 48 / l : 1;
      ctx.globalAlpha = 0.85; ctx.fillStyle = '#1d4fa3'; ctx.beginPath(); ctx.arc(j.bx + dx * k, j.by + dy * k, 22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (G.t < 6 && !st.moving) {
      txt(ctx, FINE ? 'WASD / חיצים כדי ללכת • E לפעולה' : 'גרור על המסך כדי ללכת', G.W / 2, G.H * 0.5, { size: 18, alpha: 0.8 });
    }
    drawBanners(ctx, dt);
  },
};

function drawHost(ctx) {
  const bob = st.moving ? Math.abs(Math.sin(st.walk)) * -4 : Math.sin(G.t * 2) * 0.5;
  shadow(ctx, st.px, st.py, 24);
  sprite(ctx, 'host', st.px, st.py + bob, { flip: st.face < 0, rot: st.moving ? Math.sin(st.walk) * 0.05 : 0, flash: st.hitFlash > 0 ? 0.7 : 0, flashColor: '#ff4040' });
}
function drawArs(ctx) {
  const a = st.ars;
  const angry = S.arsMood === 'angry' || a.mode === 'dodge';
  if (a.mode !== 'sit') shadow(ctx, a.x, a.y, 22);
  const bob = a.mode === 'run' ? Math.abs(Math.sin(a.t * 12)) * -4 : 0;
  sprite(ctx, 'ars', a.x, a.y + bob, { flip: a.x > st.px && a.mode !== 'sit', flash: a.flash > 0 ? a.flash : angry ? 0.18 + Math.sin(G.t * 8) * 0.08 : 0, flashColor: '#ff3030' });
  if (angry) { txt(ctx, '💢', a.x + 22, a.y - 98, { size: 22, outline: false }); }
}

// ---------- מצב הערס ----------
function updateArs(dt) {
  const a = st.ars;
  a.t += dt; a.flash = Math.max(0, a.flash - dt * 2);
  const home = arsHome();
  if (a.mode === 'run' || a.mode === 'dodge' || a.mode === 'return') {
    const tx = a.mode === 'return' ? home.x : clamp(st.px + (st.px > HUB.bench ? 260 : -260) * (a.side || 1), 60, HUB.W - 60);
    const ty = a.mode === 'return' ? home.y : clamp(st.py - 10, GY + 34, G.H - 8);
    const dx = tx - a.x, dy = ty - a.y, l = Math.hypot(dx, dy);
    const sp = a.mode === 'dodge' ? 160 : 380;
    if (l > 6) { a.x += (dx / l) * Math.min(l, sp * dt); a.y += (dy / l) * Math.min(l, sp * dt); }
    else if (a.mode === 'run') { a.mode = 'dodge'; }
    else if (a.mode === 'return') { a.mode = 'sit'; a.x = home.x; a.y = home.y; }
  }
  // זורק צלחות: בזמן התחמקות, או כשהוא כועס ואתה ליד הספסל
  const angryNear = S.arsMood === 'angry' && a.mode === 'sit' && Math.abs(st.px - HUB.bench) < 420;
  if ((a.mode === 'dodge' && st.dodge) || angryNear) {
    a.throwT -= dt;
    if (a.throwT <= 0) {
      a.throwT = a.mode === 'dodge' ? rnd(0.45, 0.75) : rnd(1.3, 1.9);
      enemyThrow(a.x, a.y - 70);
      if (Math.random() < 0.3) st.talk.now('ars', pick(ARS.angry), 1.4);
    }
  }
}
function enemyThrow(x, y) {
  // מכוון לשחקן עם חיזוי קל
  const tx = st.px + rnd(-30, 30), ty = st.py - 50 + rnd(-20, 20);
  const dx = tx - x, dy = ty - y, l = Math.hypot(dx, dy) || 1, sp = 430;
  st.enemy.push({ x, y, vx: (dx / l) * sp, vy: (dy / l) * sp, spin: 0, life: (l + 220) / sp, img: plateCanvas('white') });
  sfx.throw();
}

function updatePlates(dt) {
  for (const p of st.plates) {
    p.spin += dt * 18;
    const dx = p.tx - p.x, dy = p.ty - p.y, l = Math.hypot(dx, dy), step = 900 * dt;
    if (l <= step) { p.x = p.tx; p.y = p.ty; p.done = true; p.onHit && p.onHit(); }
    else { p.x += (dx / l) * step; p.y += (dy / l) * step; }
  }
  st.plates = st.plates.filter((p) => !p.done);
  for (const p of st.enemy) {
    p.spin += dt * 16; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (dist(p.x, p.y, st.px, st.py - 48) < 30) {
      p.dead = true; sfx.break(); burst(p.x, p.y, ['#ffffff', '#c8d2dc', '#9aa5b1'], 12, { floor: st.py });
      st.hitFlash = 0.45; sfx.thud(); G.shake = 0.25;
      if (st.dodge) st.dodge.hits++;
      const lose = Math.min(5, S.money);
      earn(-lose, st.px, st.py - 120, `${pick(OUCH)} -$${lose}`);
    } else if (p.life <= 0) {
      p.dead = true; sfx.break(); burst(p.x, p.y, ['#ffffff', '#c8d2dc'], 10, { floor: p.y + 10 });
    }
  }
  st.enemy = st.enemy.filter((p) => !p.dead);
}

function updateDodge(dt) {
  const d = st.dodge; if (!d) return;
  if (st.ars.mode !== 'dodge') return; // עדיין רץ אליך
  d.t -= dt;
  if (d.hits >= 3) endDodge(false);
  else if (d.t <= 0) endDodge(true);
}
function startDodge() {
  st.dodge = { t: 10, hits: 0 };
  const a = st.ars;
  a.mode = 'run'; a.side = 1; a.throwT = 0.8;
  st.talk.say('ars', ARS.savtaCall, 2);
  banner('התחמק מהצלחות!', 1.6, { color: '#ff8a5a', sub: 'שרוד 10 שניות' });
  sfx.whistle();
}
function endDodge(ok) {
  st.dodge = null; st.enemy = [];
  st.ars.mode = 'return';
  if (ok) {
    S.trick = 0; save();
    st.talk.now('savta', SAVTA.survived, 3);
    banner('שרדת! סחתיין!', 1.6);
    sfx.stars();
  } else {
    const lose = Math.min(30, S.money);
    earn(-lose, st.px, st.py - 130, `הערס לקח לך $${lose}`);
    st.talk.now('savta', SAVTA.failed, 3);
  }
}

// ---------- פעולות לפי מיקום ----------
function nearest() {
  const spots = [['tavern', HUB.tavern, 150], ['bench', HUB.bench, 220], ['shop', HUB.shop, 170], ['seat', HUB.seat, 260]];
  let best = null, bd = 1e9;
  for (const [n, x, r] of spots) { const d = Math.abs(st.px - x); if (d < r && d < bd) { bd = d; best = n; } }
  return best;
}

function throwAtArs() {
  const a = st.ars;
  sfx.throw();
  st.plates.push({ x: st.px, y: st.py - 60, tx: a.x, ty: a.y - 70, spin: 0, img: plateCanvas(S.plate, S.paint), onHit: () => {
    sfx.break(); burst(a.x, a.y - 70, ['#ffffff', '#c8d2dc', '#1d4fa3'], 14, { floor: a.y });
    a.flash = 1; sfx.thud();
    S.arsHits = (S.arsHits || 0) + 1;
    const i = Math.min(S.arsHits, 3) - 1;
    st.talk.now('ars', ARS.hit[i], i === 2 ? 6 : 2.6);
    if (S.arsHits >= 3) { S.arsMood = 'angry'; a.throwT = 6.2; }
    save();
  } });
}
function payArs() {
  if (!canPay(20)) { st.talk.now('ars', ARS.broke, 2.2); return; }
  earn(-20, st.px, st.py - 120);
  S.arsAlly = true; save();
  st.talk.now('ars', ARS.paid, 3);
  st.talk.say('ars', 'בערב הבא בטברנה אני איתך. יאללה!', 2.6);
}
function reconcile() {
  S.arsMood = 'calm'; S.arsHits = 0; save();
  st.enemy = [];
  st.talk.now('ars', ARS.sorry, 3.2);
  sfx.stars();
}
function savtaTalk(atSeat) {
  const now = Date.now();
  if (now - (S.savtaGift || 0) > 45000 && Math.random() < 0.5) {
    S.savtaGift = now; save();
    const n = pick([10, 15, 20]);
    st.talk.now('savta', SAVTA.gift, 2.4);
    const sp = atSeat ? savtaSeat() : savtaBench();
    earn(n, sp.x, sp.y - 120);
  } else st.talk.now('savta', pick(SAVTA.chat), 3);
}
function savtaGive(atSeat) {
  const sp = atSeat ? savtaSeat() : savtaBench();
  if (!canPay(10)) { st.talk.now('savta', 'אין לך כסף, חמוד. קח עוגייה.', 2.4); return; }
  S.trick = (S.trick || 0) + 1; save();
  if (S.trick <= 3) {
    earn(-10, st.px, st.py - 120);
    st.talk.now('savta', SAVTA.trick, 5);
    setTimeout(() => { if (G.sceneName === 'hub') earn(20, sp.x, sp.y - 120, '+$20 כפול!'); }, 1400);
    if (S.trick === 3) st.talk.say('savta', SAVTA.suspect, 3);
  } else {
    st.talk.now('savta', SAVTA.call, 2.4);
    if (atSeat) { st.ars.x = HUB.seat + 400; st.ars.y = GY + 60; }
    startDodge();
  }
}

function actions() {
  if (st.dodge) return [];
  const n = nearest();
  const out = [];
  if (n === 'tavern') out.push({ label: `🍽️ היכנס לטברנה – ערב ${S.evening}`, fn: () => go('tavern'), color: '#8a3a2a', light: '#b05a40' });
  if (n === 'shop') out.push({ label: '🛒 היכנס לחנות', fn: () => go('shop'), color: '#1f9e5a', light: '#3fc07a' });
  if (n === 'bench') {
    if (st.ars.mode === 'sit') {
      if (S.arsMood === 'angry') out.push({ label: '🤝 התפייס עם הערס', fn: reconcile, color: '#1f9e5a', light: '#3fc07a' });
      else {
        out.push({ label: '🍽️ זרוק צלחת על הערס', fn: throwAtArs, color: '#8a3a2a', light: '#b05a40' });
        out.push({ label: S.arsAlly ? '💪 הערס איתך בערב הבא' : '💵 תן לערס $20', fn: payArs, disabled: !!S.arsAlly });
      }
    }
    if (!st.savtaAtSeat) {
      out.push({ label: '👵 דבר עם סבתא', fn: () => savtaTalk(false), color: '#a01e6a', light: '#d04a98' });
      out.push({ label: '💵 תן לסבתא $10', fn: () => savtaGive(false), color: '#a01e6a', light: '#d04a98' });
    }
  }
  if (n === 'seat') {
    if (st.savtaAtSeat) {
      out.push({ label: '👵 דבר עם סבתא', fn: () => savtaTalk(true), color: '#a01e6a', light: '#d04a98' });
      out.push({ label: '💵 תן לסבתא $10', fn: () => savtaGive(true), color: '#a01e6a', light: '#d04a98' });
    }
    out.push({ label: '🪑 שב לנוח', fn: () => st.talk.now('host', pick(SEAT_LINES), 2.6) });
  }
  return out;
}
