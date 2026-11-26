// קופסאות הפתעה שנוחתות במצנח בטברנה
import { G, clamp, rnd, dist } from '../engine.js';
import { drawBox } from '../art.js';
import { sfx } from '../audio.js';
import { addHook, targets, floor } from './tavern.js';
import { openBox } from './shop.js';

const B = { list: [], plan: [] };

targets.push({
  test(p) {
    for (const b of B.list) {
      if (!b.dead && dist(p.x, p.y, b.x, b.y - 12) < p.r + 22) {
        b.dead = true; p.dead = true;
        openBox(b.x, b.y - 12);
        return true;
      }
    }
    return false;
  },
});

addHook({
  start(st) {
    B.list = [];
    B.plan = [];
    if (Math.random() < 0.85) B.plan.push(rnd(10, 30));
    if (Math.random() < 0.4 + st.n * 0.05) B.plan.push(rnd(32, 55));
  },
  update(dt, st) {
    if (st.phase === 'play') {
      for (let i = 0; i < B.plan.length; i++) {
        if (st.t >= B.plan[i]) {
          B.plan.splice(i--, 1);
          const f = floor();
          B.list.push({ x: rnd(G.W * 0.15, G.W * 0.85), y: -50, gy: rnd(f.y0 + 20, f.y1 - 20), t: 0, land: 0 });
          sfx.whistle();
        }
      }
    }
    for (const b of B.list) {
      b.t += dt;
      if (b.y < b.gy) { b.y += 55 * dt; b.x = clamp(b.x + Math.sin(b.t * 1.6) * 30 * dt, 40, G.W - 40); }
      else { b.land += dt; if (b.land > 5) b.dead = true; }
    }
    B.list = B.list.filter((b) => !b.dead);
  },
  drawList(ctx, st, list) {
    for (const b of B.list) {
      list.push({ y: b.y, f: () => {
        if (b.land > 3.5 && Math.floor(b.land * 8) % 2) return;
        drawBox(ctx, b.x, b.y, b.t, b.y < b.gy);
      } });
    }
  },
});
export const boxState = B;
