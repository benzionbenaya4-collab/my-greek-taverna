// חנות הצלחות + עורך ציור 16x16
import { G, txt, btn, clamp, floater, burst, updateFx, drawFx, FONT, pick, wrap } from '../engine.js';
import { drawShopBg, PLATES, RARE, PAL16, plateCanvas, clearPlateCache, R } from '../art.js';
import { S, save } from '../save.js';
import { sfx } from '../audio.js';
import { go, hud, earn, canPay, banner, drawBanners } from '../game.js';
import { SLANG } from '../lines.js';

let bg = null;
const st = { tab: 0, mode: 'shop', color: 4, painting: false, spent: 0, lastCell: -1, msg: '', msgT: 0 };

const MULTI_PRICE = { 2: 150, 3: 350 };
const BOX_PRICE = 60;

function rebuild() { bg = drawShopBg(G.W / 2, G.H / 2); }
function msg(s) { st.msg = s; st.msgT = 2.2; }

export function openBox(x, y) {
  // קופסת הפתעה: צלחת נדירה שעוד אין לך, או כסף
  const missing = RARE.filter((r) => !S.owned.includes(r));
  S.stats.boxes++;
  sfx.pop();
  burst(x, y, ['#ffd83d', '#7a4fd6', '#ff6fb5', '#2fc6d8', '#ffffff'], 30, { up: 220 });
  if (missing.length && Math.random() < 0.6) {
    const r = pick(missing);
    S.owned.push(r); S.plate = r; save();
    banner(`${pick(SLANG)} ${PLATES[r].name}!`, 2.4, { sub: PLATES[r].desc, color: '#ffd83d' });
    return r;
  }
  const n = pick([15, 25, 40]);
  earn(n, x, y - 30, `קופסת הפתעה: +$${n}`);
  return null;
}

export const shop = {
  enter() { rebuild(); st.mode = 'shop'; st.tab = 0; st.msg = ''; },
  resize() { rebuild(); },
  key(code) {
    if (code === 'Escape') { if (st.mode === 'paint') st.mode = 'shop'; else go('hub', { from: 'shop' }); }
  },
  down(p) { if (st.mode === 'paint') { st.painting = true; st.lastCell = -1; paintAt(p); } },
  move(p) { if (st.mode === 'paint' && st.painting) paintAt(p); },
  up() { st.painting = false; st.lastCell = -1; },
  update(dt) { updateFx(dt); st.msgT = Math.max(0, st.msgT - dt); },
  draw(ctx, dt) {
    ctx.drawImage(bg, 0, 0, G.W, G.H);
    ctx.fillStyle = 'rgba(26,16,32,0.35)'; ctx.fillRect(0, 0, G.W, G.H);
    if (st.mode === 'paint') drawPainter(ctx); else drawShop(ctx);
    drawFx(ctx);
    hud(ctx, dt, { back: () => (st.mode === 'paint' ? (st.mode = 'shop') : go('hub', { from: 'shop' })) });
    if (st.msgT > 0) txt(ctx, st.msg, G.W / 2, G.H - 24, { size: 20, color: '#ffe14d', alpha: Math.min(1, st.msgT * 2) });
    drawBanners(ctx, dt);
  },
};

// ---------- רשימת מוצרים ----------
function items() {
  if (st.tab === 0) return ['white', 'blue', 'red', 'olive', 'porcelain', 'iron', 'painted'].map((k) => ({ kind: 'plate', k }));
  return [...RARE.map((k) => ({ kind: 'plate', k })), { kind: 'multi' }, { kind: 'box' }];
}

function drawShop(ctx) {
  txt(ctx, 'חנות הצלחות', G.W / 2, 30, { size: 28, color: '#ffe14d' });
  const tabs = ['צלחות', 'נדירות ושדרוגים'];
  tabs.forEach((t, i) => btn(ctx, G.W / 2 + (i === 0 ? 6 : -176), 56, 170, 34, t, () => { st.tab = i; sfx.click(); },
    { key: 'tab' + i, color: st.tab === i ? '#c8961e' : '#2a1a3a', light: st.tab === i ? '#ffd83d' : '#4a3a5a', size: 16 }));
  const list = items();
  const cw = 214, ch = 104, gap = 10;
  const cols = Math.max(1, Math.min(4, Math.floor((G.W - 20) / (cw + gap))));
  const rows = Math.ceil(list.length / cols);
  const top = 102;
  const avail = G.H - top - 70;
  const chh = Math.min(ch, Math.floor((avail - (rows - 1) * gap) / rows));
  const totalW = cols * cw + (cols - 1) * gap;
  const x0 = (G.W - totalW) / 2;
  list.forEach((it, i) => {
    // RTL: עמודה ראשונה מימין
    const col = i % cols, row = Math.floor(i / cols);
    const x = x0 + (cols - 1 - col) * (cw + gap), y = top + row * (chh + gap);
    card(ctx, it, x, y, cw, chh);
  });
  btn(ctx, G.W / 2 - 130, G.H - 62, 260, 44, '🎨 צייר צלחת ($1 לפיקסל)', () => { st.mode = 'paint'; st.spent = 0; sfx.click(); }, { color: '#7a4fd6', light: '#9a74ef' });
}

function card(ctx, it, x, y, w, h) {
  R(ctx, x - 2, y, w + 4, h, '#1a1020'); R(ctx, x, y - 2, w, h + 4, '#1a1020');
  R(ctx, x, y, w, h, '#fff6dc'); R(ctx, x, y + h - 4, w, 4, '#e8dcb8');
  const ps = Math.min(64, h - 20);
  const ix = x + w - ps - 10, iy = y + (h - ps) / 2 - 6;
  let name, desc, label, fn, dis = false, active = false;
  if (it.kind === 'plate') {
    const P = PLATES[it.k], owned = S.owned.includes(it.k) || (it.k === 'painted' && S.paint.some((v) => v));
    const hidden = P.rare && !owned;
    if (hidden) { R(ctx, ix, iy, ps, ps, '#2a1a3a'); txt(ctx, '?', ix + ps / 2, iy + ps / 2, { size: 36, color: '#ffd83d' }); }
    else ctx.drawImage(plateCanvas(it.k, S.paint, 32), ix, iy, ps, ps);
    name = hidden ? 'צלחת נדירה' : P.name;
    desc = hidden ? 'רק בקופסת הפתעה' : P.desc;
    active = S.plate === it.k;
    if (active) { label = 'בשימוש ✓'; dis = true; }
    else if (owned) { label = 'בחר'; fn = () => { S.plate = it.k; save(); sfx.click(); msg(`בחרת: ${P.name}`); }; }
    else if (it.k === 'painted') { label = 'צייר קודם'; fn = () => { st.mode = 'paint'; st.spent = 0; }; }
    else if (P.rare) { label = 'נעול'; dis = true; }
    else { label = `קנה $${P.price}`; dis = !canPay(P.price); fn = () => buyPlate(it.k, x + w / 2, y); }
  } else if (it.kind === 'multi') {
    const next = S.multi + 1;
    txt(ctx, S.multi >= 2 ? '🍽️🍽️' + (S.multi >= 3 ? '🍽️' : '') : '🍽️', ix + ps / 2, iy + ps / 2, { size: 26, outline: false });
    name = 'זריקה מרובה'; desc = `עכשיו: ${S.multi} צלחות בזריקה`;
    if (S.multi >= 3) { label = 'מקסימום ✓'; dis = true; }
    else { label = `שדרג ל-${next} – $${MULTI_PRICE[next]}`; dis = !canPay(MULTI_PRICE[next]); fn = () => buyMulti(next, x + w / 2, y); }
  } else {
    ctx.save(); ctx.translate(ix + ps / 2, iy + ps * 0.8); ctx.scale(1.4, 1.4);
    ctx.fillStyle = '#1a1020'; ctx.fillRect(-19, -26, 38, 28); ctx.fillStyle = '#7a4fd6'; ctx.fillRect(-17, -24, 34, 24);
    ctx.fillStyle = '#ffd83d'; ctx.fillRect(-2, -24, 4, 24); ctx.fillRect(-17, -14, 34, 4); ctx.fillRect(-8, -31, 6, 6); ctx.fillRect(2, -31, 6, 6);
    ctx.restore();
    name = 'קופסת הפתעה'; desc = 'צלחת נדירה או כסף!';
    label = `קנה $${BOX_PRICE}`; dis = !canPay(BOX_PRICE);
    fn = () => { earn(-BOX_PRICE, x + w / 2, y); openBox(x + w / 2, y + h / 2); };
  }
  const tx = ix - 8;
  txt(ctx, name, tx, y + 18, { size: 16, align: 'right', color: '#2a1a10', outline: false });
  const dl = wrap(ctx, desc, w - ps - 30, 12);
  dl.slice(0, 2).forEach((l, i) => txt(ctx, l, tx, y + 38 + i * 15, { size: 12, align: 'right', color: '#5a4a3a', outline: false, weight: 'normal' }));
  btn(ctx, x + 8, y + h - 36, w - ps - 26, 28, label, fn || (() => {}), { key: 'c' + (it.k || it.kind), disabled: dis, size: 14, color: active ? '#1f9e5a' : undefined });
}

function buyPlate(k, x, y) {
  const P = PLATES[k];
  if (!canPay(P.price)) { msg('אין מספיק כסף!'); return; }
  earn(-P.price, x, y);
  S.owned.push(k); S.plate = k; save();
  msg(`${pick(SLANG)} קנית ${P.name}`);
}
function buyMulti(n, x, y) {
  const p = MULTI_PRICE[n];
  if (!canPay(p)) { msg('אין מספיק כסף!'); return; }
  earn(-p, x, y); S.multi = n; save();
  msg(`${pick(SLANG)} עכשיו ${n} צלחות בזריקה!`);
}

// ---------- עורך פיקסלים ----------
function layout() {
  const land = !G.portrait;
  const cell = land ? Math.floor(Math.min((G.H - 120) / 16, (G.W - 360) / 16)) : Math.floor(Math.min((G.W - 40) / 16, (G.H - 420) / 16));
  const size = cell * 16;
  const gx = land ? Math.round(G.W / 2 - size / 2 + 40) : Math.round((G.W - size) / 2);
  const gy = land ? 80 : 120;
  return { cell, size, gx, gy, land };
}
function paintAt(p) {
  const L = layout();
  const cx = Math.floor((p.x - L.gx) / L.cell), cy = Math.floor((p.y - L.gy) / L.cell);
  if (cx < 0 || cy < 0 || cx > 15 || cy > 15) return;
  const i = cy * 16 + cx;
  if (i === st.lastCell) return;
  st.lastCell = i;
  const c = st.color;
  if (S.paint[i] === c) return;
  if (c !== 0) {
    if (!canPay(1)) { msg('אין מספיק כסף! $1 לכל פיקסל'); st.painting = false; return; }
    S.money -= 1; st.spent++;
  }
  S.paint[i] = c; save();
  clearPlateCache();
  sfx.paint();
}
function drawPainter(ctx) {
  const L = layout();
  txt(ctx, '🎨 ציור על צלחת', G.W / 2, L.land ? 30 : 34, { size: 26, color: '#ffe14d' });
  txt(ctx, `$1 לכל פיקסל שמציירים  •  צויר עכשיו: ${st.spent} ($${st.spent})`, G.W / 2, L.land ? 58 : 66, { size: 14 });
  // רשת
  R(ctx, L.gx - 4, L.gy - 4, L.size + 8, L.size + 8, '#1a1020');
  for (let i = 0; i < 256; i++) {
    const x = L.gx + (i % 16) * L.cell, y = L.gy + Math.floor(i / 16) * L.cell;
    const v = S.paint[i];
    R(ctx, x, y, L.cell, L.cell, v ? PAL16[v] : ((i % 16) + Math.floor(i / 16)) % 2 ? '#ffffff' : '#ece6d8');
  }
  // עיגול הצלחת
  ctx.strokeStyle = '#1d4fa388'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(L.gx + L.size / 2, L.gy + L.size / 2, L.size / 2, 0, Math.PI * 2); ctx.stroke();
  // פלטה
  const sw = 34;
  const pal = [0, ...Array.from({ length: 16 }, (_, i) => i + 1)];
  pal.forEach((v, i) => {
    let x, y;
    if (L.land) { x = L.gx - 100 + (i % 2) * (sw + 6); y = L.gy + Math.floor(i / 2) * (sw + 4); }
    else { x = (G.W - 9 * (sw + 4)) / 2 + (i % 9) * (sw + 4); y = L.gy + L.size + 16 + Math.floor(i / 9) * (sw + 4); }
    const sel = st.color === v;
    R(ctx, x - 2, y - 2, sw + 4, sw + 4, sel ? '#ffe14d' : '#1a1020');
    R(ctx, x, y, sw, sw, v ? PAL16[v] : '#ffffff');
    if (!v) { txt(ctx, '⌫', x + sw / 2, y + sw / 2, { size: 16, outline: false, color: '#e8423f' }); }
    G.btns.push({ x, y, w: sw, h: sw, key: 'pal' + v, fn: () => { st.color = v; sfx.click(); } });
  });
  // תצוגה מקדימה + כפתורים
  const pv = L.land ? 128 : 84;
  const px = L.land ? L.gx + L.size + 30 : G.W / 2 - pv / 2;
  const py = L.land ? L.gy + 10 : L.gy + L.size + 16 + 2 * (sw + 4) + 10;
  ctx.drawImage(plateCanvas('painted', S.paint, 32), px, py, pv, pv);
  const bw = L.land ? Math.min(180, G.W - px - 16) : 160;
  const bx = L.land ? px : G.W / 2 - bw - 6, by = L.land ? py + pv + 20 : G.H - 70;
  btn(ctx, bx, by, bw, 40, '✓ סיום ובחירה', () => {
    if (!S.paint.some((v) => v)) { msg('צייר משהו קודם!'); return; }
    if (!S.owned.includes('painted')) S.owned.push('painted');
    S.plate = 'painted'; save(); st.mode = 'shop'; st.tab = 0;
    msg(st.spent ? `${pick(SLANG)} הצלחת שלך מוכנה!` : 'הצלחת שלך נבחרה');
    sfx.cash();
  }, { color: '#1f9e5a', light: '#3fc07a', size: 16 });
  btn(ctx, L.land ? bx : G.W / 2 + 6, L.land ? by + 54 : by, bw, 40, '🧽 נקה הכל', () => { S.paint.fill(0); clearPlateCache(); save(); sfx.break(); }, { color: '#8a3a2a', light: '#b05a40', size: 16 });
}
