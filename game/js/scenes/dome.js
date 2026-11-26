// שלב "כיפת ברזל": אזעקה, טילים מצוירים, מיירטים בצלחות
import { G, txt, clamp, rnd, pick, dist, burst, floater, ring } from '../engine.js';
import { drawMissile } from '../art.js';
import { S, save } from '../save.js';
import { sfx, musicVolume } from '../audio.js';
import { earn, banner } from '../game.js';
import { SLANG } from '../lines.js';
import { addHook, targets, comboUp } from './tavern.js';

const D = { on: false, ms: [], scars: [] };
let st0 = null;

function startRaid(st) {
  const n = st.n;
  Object.assign(D, { on: true, t: 0, left: Math.min(5 + n, 12), spawnT: 1.6, ms: [], got: 0, missed: 0 });
  sfx.siren(3.6);
  musicVolume(0.35);
  banner('🚨 אזעקה! 🚨', 2, { color: '#ff5a5a', sub: 'יירטו את הטילים עם הצלחות!' });
  for (const v of st.v) if (v.state !== 'flee' && v.state !== 'hit') { v.state = 'flee'; v.t = 0; v.vx = (v.x < G.W / 2 ? -1 : 1) * 420; }
}
function endRaid(st) {
  D.on = false; D.done = true;
  musicVolume(1);
  if (D.missed === 0) { banner(`${pick(SLANG)} כל הטילים יורטו!`, 2, { color: '#7bd23f', sub: 'בונוס: +$30' }); earn(30, G.W / 2, G.H * 0.45); }
  else banner('הטברנה מוגנת!', 1.8, { color: '#7bd23f', sub: `יירוטים: ${D.got}  •  פספוסים: ${D.missed}` });
  st.spawnT = 1.5;
  save();
}

targets.push({
  test(p) {
    if (!D.on) return false;
    for (const m of D.ms) {
      if (!m.dead && dist(p.x, p.y, m.x, m.y) < p.r + 18) {
        m.dead = true; p.dead = true;
        sfx.boom(); G.shake = 0.15;
        burst(m.x, m.y, ['#ffe14d', '#ff9b2e', '#ffffff', '#e8423f'], 26, { up: 60, g: 200, max: 260 });
        ring(m.x, m.y, '#ffe14d', 60);
        D.got++; S.stats.intercepts++;
        earn(20, m.x, m.y - 20, 'יירוט! $20', '#9fe0ff');
        comboUp(m.x, m.y - 20);
        return true;
      }
    }
    return false;
  },
});

addHook({
  start(st) {
    st0 = st; D.on = false; D.done = false; D.ms = []; D.scars = [];
    const chance = st.n === 1 ? 0.4 : 0.8;
    D.when = Math.random() < chance ? rnd(18, 42) : -1;
  },
  blocking() { return D.on; },
  update(dt, st) {
    st0 = st;
    if (!D.on) {
      if (!D.done && D.when > 0 && st.phase === 'play') { D.when -= dt; if (D.when <= 0) startRaid(st); }
      return;
    }
    D.t += dt;
    if (D.t > 1.8 && D.left > 0) {
      D.spawnT -= dt;
      if (D.spawnT <= 0) {
        D.left--; D.spawnT = clamp(1.3 - st.n * 0.06, 0.55, 1.3) * rnd(0.7, 1.2);
        const sx = rnd(G.W * 0.05, G.W * 0.95), tx = clamp(sx + rnd(-G.W * 0.3, G.W * 0.3), 60, G.W - 60);
        const ty = G.H - rnd(40, 90), sy = -30;
        const sp = 150 + st.n * 14;
        const l = Math.hypot(tx - sx, ty - sy);
        D.ms.push({ x: sx, y: sy, sx, sy, tx, ty, vx: ((tx - sx) / l) * sp, vy: ((ty - sy) / l) * sp, t: 0, w: rnd(0, 6) });
        sfx.whistle();
      }
    }
    for (const m of D.ms) {
      m.t += dt;
      m.x += m.vx * dt + Math.sin(m.t * 3 + m.w) * 20 * dt; m.y += m.vy * dt;
      if (Math.random() < dt * 30) G.fx.push({ k: 'bit', x: m.x - m.vx * 0.06, y: m.y - m.vy * 0.06, vx: rnd(-15, 15), vy: rnd(-30, -10), g: 0, life: 0.7, t: 0, c: Math.random() < 0.5 ? '#c8c8d0' : '#9a9aa8', sz: 4 });
      if (m.y >= m.ty) {
        m.dead = true; D.missed++;
        sfx.boom(); G.shake = 0.5;
        burst(m.x, m.y, ['#ff9b2e', '#e8423f', '#5a4a4a', '#ffe14d'], 30, { up: 220, max: 380 });
        D.scars.push({ x: m.x, y: m.y });
        const n = Math.min(15, S.money);
        earn(-n, m.x, m.y - 50, `נזק לטברנה! -$${n}`);
        st.combo = 0;
      }
    }
    D.ms = D.ms.filter((m) => !m.dead);
    if (D.left <= 0 && D.ms.length === 0 && D.t > 2.5) endRaid(st);
  },
  drawBack(ctx) {
    for (const s of D.scars) {
      ctx.fillStyle = 'rgba(30,20,20,0.45)';
      ctx.beginPath(); ctx.ellipse(Math.round(s.x), Math.round(s.y), 26, 9, 0, 0, Math.PI * 2); ctx.fill();
    }
  },
  drawFront(ctx) {
    if (!D.on) return;
    for (const m of D.ms) drawMissile(ctx, m.x, m.y, Math.atan2(m.vy, m.vx), G.t);
  },
  drawUI(ctx) {
    if (!D.on) return;
    const a = 0.25 + Math.sin(G.t * 8) * 0.15;
    ctx.fillStyle = `rgba(90,0,20,${0.12 + a * 0.2})`; ctx.fillRect(0, 0, G.W, G.H);
    ctx.fillStyle = `rgba(232,40,40,${a})`;
    ctx.fillRect(0, 0, G.W, 8); ctx.fillRect(0, G.H - 8, G.W, 8); ctx.fillRect(0, 0, 8, G.H); ctx.fillRect(G.W - 8, 0, 8, G.H);
    txt(ctx, `🛡️ כיפת ברזל  •  יירוטים: ${D.got}`, G.W / 2, 92, { size: 18, color: '#ff8a8a' });
  },
});

export const domeState = D;
