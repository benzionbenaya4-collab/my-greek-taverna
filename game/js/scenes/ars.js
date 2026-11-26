// הערס השכונתי בתוך הטברנה: כועס / עוזר / מתפייס
import { G, sprite, shadow, txt, btn, clamp, rnd, pick, dist, burst, floater } from '../engine.js';
import { plateCanvas, drawPlate, PLATES } from '../art.js';
import { S, save } from '../save.js';
import { sfx } from '../audio.js';
import { earn, canPay } from '../game.js';
import { ARS } from '../lines.js';
import { addHook, targets, hittable, hitVillain, enemyThrow, floor } from './tavern.js';

const A = { on: false };

function arsBox() { return { x0: A.x - 22, x1: A.x + 22, y0: A.y - 98, y1: A.y }; }

function appear(mode) {
  const f = floor();
  const side = Math.random() < 0.5 ? -1 : 1;
  Object.assign(A, { on: true, mode, x: side < 0 ? -40 : G.W + 40, y: f.y0 + 20, homeX: side < 0 ? 70 : G.W - 70, side,
    t: 0, throwT: 1.5, flash: 0, allyT: 0, target: null, punch: null, plates: [], leaving: false });
}

function reconcile(st) {
  S.arsMood = 'calm'; S.arsHits = 0; save();
  A.mode = 'calm';
  st.ep = [];
  st.talk.now('ars', ARS.sorry, 3);
  sfx.stars();
}
function pay(st) {
  if (!canPay(20)) { st.talk.now('ars', ARS.broke, 2.2); return; }
  earn(-20, A.x, A.y - 120);
  startAlly(st);
}
function startAlly(st) {
  A.mode = 'ally'; A.allyT = 22; A.throwT = 0.6;
  st.talk.now('ars', ARS.paid, 2.8);
}

function onHit(st, p) {
  A.flash = 1; sfx.break(); sfx.thud();
  burst(p.x, p.y, ['#ffffff', '#c8d2dc'], 12, { floor: A.y });
  if (A.mode === 'angry') { st.talk.now('ars', pick(ARS.angry), 1.4); A.throwT = Math.min(A.throwT, 0.4); return; }
  if (A.mode === 'ally') { A.mode = 'calm'; A.allyT = 0; }
  S.arsHits = (S.arsHits || 0) + 1;
  const i = Math.min(S.arsHits, 3) - 1;
  st.talk.now('ars', ARS.hit[i], i === 2 ? 6 : 2.6);
  if (S.arsHits >= 3) { S.arsMood = 'angry'; A.mode = 'angry'; A.throwT = 5.5; }
  save();
}

targets.push({
  test(p) {
    if (!A.on || A.leaving || A.x < 0 || A.x > G.W) return false;
    const b = arsBox();
    if (p.x > b.x0 - p.r * 0.5 && p.x < b.x1 + p.r * 0.5 && p.y > b.y0 && p.y < b.y1 - 6) {
      p.dead = true; onHit(st0, p); return true;
    }
    return false;
  },
});
let st0 = null;

addHook({
  start(st) {
    st0 = st; A.on = false;
    A.when = S.arsMood === 'angry' ? 2.5 : S.arsAlly ? 2 : Math.random() < 0.55 ? rnd(8, 35) : -1;
  },
  update(dt, st) {
    st0 = st;
    if (!A.on) {
      if (A.when > 0 && st.phase === 'play') {
        A.when -= dt;
        if (A.when <= 0) {
          appear(S.arsMood === 'angry' ? 'angry' : 'calm');
          if (S.arsAlly) { S.arsAlly = false; save(); startAlly(st); }
          else if (A.mode === 'angry') st.talk.now('ars', 'אה, אתה פה? עוד לא סיימנו!', 2.4);
          else st.talk.now('ars', pick(ARS.calm), 2.4);
        }
      }
      return;
    }
    A.t += dt; A.flash = Math.max(0, A.flash - dt * 3);
    st.dodgeHint = A.mode === 'angry';
    // הליכה למקום / למטרה
    let tx = A.homeX, ty = A.y, sp = 220;
    if (A.leaving) tx = A.side < 0 ? -60 : G.W + 60;
    if (A.punch) { tx = A.punch.v.x - 46 * Math.sign(A.punch.v.x - A.x || 1); ty = A.punch.v.y; sp = 420; }
    const dx = tx - A.x, dy = ty - A.y, l = Math.hypot(dx, dy);
    A.moving = l > 4;
    if (l > 4) { A.x += (dx / l) * Math.min(l, sp * dt); A.y += (dy / l) * Math.min(l, sp * dt); A.face = dx < 0 ? -1 : 1; }
    if (A.leaving && (A.x < -50 || A.x > G.W + 50)) { A.on = false; st.dodgeHint = false; return; }
    if (st.phase === 'end') { A.leaving = true; return; }

    if (A.mode === 'angry') {
      A.throwT -= dt;
      if (A.throwT <= 0) {
        A.throwT = rnd(1.1, 1.6);
        enemyThrow(A.x, A.y - 70, 'plate', 420);
        if (Math.random() < 0.3) st.talk.now('ars', pick(ARS.angry), 1.4);
      }
    }
    if (A.mode === 'ally') {
      A.allyT -= dt;
      if (A.punch) {
        const v = A.punch.v;
        if (!hittable(v) || v.state === 'ko') A.punch = null;
        else if (Math.abs(A.x - (v.x - 46 * Math.sign(v.x - A.x || 1))) < 8 && Math.abs(A.y - v.y) < 10) {
          // בוקס!
          sfx.punch(); G.shake = 0.3;
          burst(v.x, v.y - 70, ['#ffe14d', '#ffffff'], 16);
          floater(pick(ARS.punch), v.x, v.y - 120, { size: 28, color: '#ff8a5a' });
          v.state = 'ko'; v.koT = 4.5; v.koSide = A.x < v.x ? 1 : -1; v.t = 0; v.flash = 1;
          sfx.stars();
          A.punch = null;
          earn(5, v.x, v.y - 150, 'בוקס! +$5');
        }
      } else {
        A.throwT -= dt;
        if (A.throwT <= 0) {
          A.throwT = rnd(0.9, 1.4);
          const vs = st.v.filter((v) => hittable(v) && v.state !== 'ko' && v.type !== 'waiter' && v.x > 20 && v.x < G.W - 20);
          const thief = vs.find((v) => v.type === 'thief');
          if (thief && Math.random() < 0.4) { A.punch = { v: thief }; st.talk.now('ars', 'אתה! בוא הנה!', 1.4); }
          else if (vs.length) {
            const v = pick(vs);
            A.plates.push({ x: A.x, y: A.y - 70, v, spin: 0, img: plateCanvas('white') });
            sfx.throw();
          }
        }
      }
      if (A.allyT <= 0) { A.mode = 'calm'; st.talk.now('ars', 'יאללה, עשיתי את שלי. אני הולך לשתות קפה.', 2.4); A.leaving = true; }
    }
    // צלחות של הערס (עוזר)
    for (const p of A.plates) {
      p.spin += dt * 18;
      const tx2 = p.v.x, ty2 = p.v.y - 80, ddx = tx2 - p.x, ddy = ty2 - p.y, ll = Math.hypot(ddx, ddy), step = 900 * dt;
      if (ll <= step) {
        p.dead = true;
        if (hittable(p.v)) hitVillain(p.v, { P: PLATES.white }, tx2, ty2 + 6, true);
        else { sfx.break(); burst(tx2, ty2, ['#ffffff', '#c8d2dc'], 10); }
      } else { p.x += (ddx / ll) * step; p.y += (ddy / ll) * step; }
    }
    A.plates = A.plates.filter((p) => !p.dead);
  },
  drawList(ctx, st, list) {
    if (!A.on) return;
    list.push({ y: A.y, f: () => {
      shadow(ctx, A.x, A.y, 22);
      const bob = A.moving ? -Math.abs(Math.sin(A.t * 12)) * 4 : 0;
      sprite(ctx, 'ars', A.x, A.y + bob, { flip: (A.face || 1) < 0, flash: A.flash > 0 ? A.flash : A.mode === 'angry' ? 0.2 + Math.sin(G.t * 8) * 0.08 : 0, flashColor: A.flash > 0 ? '#ffffff' : '#ff3030' });
      if (A.mode === 'angry') txt(ctx, '💢', A.x + 22, A.y - 98, { size: 22, outline: false });
      if (A.mode === 'ally') txt(ctx, '💪', A.x + 24, A.y - 98, { size: 20, outline: false });
    } });
  },
  drawFront(ctx) { if (A.on) for (const p of A.plates) drawPlate(ctx, p.img, p.x, p.y, p.spin); },
  talkPos(w) { return w === 'ars' && A.on ? { x: clamp(A.x, 40, G.W - 40), y: A.y - 102 } : null; },
  drawUI(ctx, st) {
    if (!A.on || A.leaving || st.phase === 'end') return;
    const w = 190, h = 40, x = G.W - w - 12, y = 58;
    if (A.mode === 'angry') btn(ctx, x, y, w, h, '🤝 התפייס עם הערס', () => reconcile(st), { color: '#1f9e5a', light: '#3fc07a', size: 15 });
    else if (A.mode === 'calm') btn(ctx, x, y, w, h, '💵 תן לערס $20', () => pay(st), { size: 15, disabled: !canPay(20) });
    else if (A.mode === 'ally') txt(ctx, `💪 הערס איתך: ${Math.ceil(A.allyT)}`, x + w / 2, y + h / 2, { size: 15, color: '#ffb35c' });
  },
});

export const arsState = A;
