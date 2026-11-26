// הסבתא קופצת לביקור בטברנה: לפעמים נותנת כסף
import { G, sprite, shadow, clamp, rnd, pick, burst } from '../engine.js';
import { S } from '../save.js';
import { sfx } from '../audio.js';
import { earn } from '../game.js';
import { SAVTA } from '../lines.js';
import { addHook, targets, floor } from './tavern.js';

const V = { on: false };
let st0 = null;

targets.push({
  test(p) {
    if (!V.on || V.x < 0 || V.x > G.W) return false;
    if (p.x > V.x - 20 && p.x < V.x + 20 && p.y > V.y - 96 && p.y < V.y - 6) {
      p.dead = true; V.flash = 1; sfx.break();
      burst(p.x, p.y, ['#ffffff', '#c8d2dc'], 10);
      st0.talk.now('savta', pick(['חוצפן! על סבתא אתה זורק?!', 'אוי! אני אספר לערס!', 'ככה מתנהגים לסבתא?']), 2.4);
      const n = Math.min(5, S.money); if (n) earn(-n, V.x, V.y - 120);
      V.gave = true; V.leaveT = 0.8;
      return true;
    }
    return false;
  },
});

addHook({
  start(st) { st0 = st; V.on = false; V.when = Math.random() < 0.45 ? rnd(15, 45) : -1; },
  blocking() { return false; },
  update(dt, st) {
    st0 = st;
    if (!V.on) {
      if (V.when > 0 && st.phase === 'play') {
        V.when -= dt;
        if (V.when <= 0) {
          const f = floor(), side = Math.random() < 0.5 ? -1 : 1;
          Object.assign(V, { on: true, side, x: side < 0 ? -40 : G.W + 40, y: f.y0 + 6, stopX: side < 0 ? G.W * 0.28 : G.W * 0.72, gave: false, leaveT: 3, t: 0, flash: 0 });
        }
      }
      return;
    }
    V.t += dt; V.flash = Math.max(0, V.flash - dt * 3);
    const leaving = V.gave && V.leaveT <= 0;
    const tx = leaving ? (V.side < 0 ? -60 : G.W + 60) : V.stopX;
    const dx = tx - V.x;
    V.moving = Math.abs(dx) > 3;
    if (V.moving) { V.x += Math.sign(dx) * Math.min(Math.abs(dx), 90 * dt); V.face = dx < 0 ? -1 : 1; }
    else if (!V.gave) {
      V.gave = true;
      st.talk.now('savta', SAVTA.gift, 2.4);
      const n = pick([10, 15, 20]);
      earn(n, V.x, V.y - 120);
      burst(V.x, V.y - 60, ['#ffd83d', '#c8961e'], 12, { up: 200 });
    }
    if (V.gave) V.leaveT -= dt;
    if (leaving && (V.x < -50 || V.x > G.W + 50)) V.on = false;
  },
  drawList(ctx, st, list) {
    if (!V.on) return;
    list.push({ y: V.y, f: () => {
      shadow(ctx, V.x, V.y, 20);
      sprite(ctx, 'savta', V.x, V.y + (V.moving ? -Math.abs(Math.sin(V.t * 8)) * 3 : 0), { flip: (V.face || 1) < 0, flash: V.flash });
    } });
  },
  talkPos(w) { return w === 'savta' && V.on ? { x: clamp(V.x, 40, G.W - 40), y: V.y - 100 } : null; },
});
