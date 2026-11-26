// ציורי פיקסלים בקוד: רקעים, אביזרים, צלחות, טילים
import { mulberry } from './engine.js';

export const PAL16 = [null, '#1a1020', '#ffffff', '#9aa5b1', '#e8423f', '#ff9b2e', '#ffd83d', '#7bd23f', '#1f9e5a',
  '#2fc6d8', '#1d4fa3', '#7a4fd6', '#ff6fb5', '#8a5a2b', '#f4c79a', '#5a2e14', '#0b3d91'];

export const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
export function circ(c, cx, cy, r, col) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const w = Math.round(Math.sqrt(r * r - y * y));
    c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
function ell(c, cx, cy, rx, ry, col) {
  c.fillStyle = col;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
    c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
function speckle(c, x, y, w, h, cols, rng, dens = 0.08) {
  const n = Math.floor(w * h * dens);
  for (let i = 0; i < n; i++) { c.fillStyle = cols[Math.floor(rng() * cols.length)]; c.fillRect(Math.floor(x + rng() * w), Math.floor(y + rng() * h), 1, 1); }
}
function pixText(c, s, x, y, size, col, out) {
  c.save();
  c.font = `bold ${size}px "Arial Hebrew",Arial,sans-serif`;
  c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (out) { c.fillStyle = out; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.fillText(s, x + dx, y + dy); }
  c.fillStyle = col; c.fillText(s, x, y);
  c.restore();
}

// שמיים מדורגים עם דיתור
function sky(c, w, h, cols) {
  const band = Math.ceil(h / cols.length);
  cols.forEach((col, i) => {
    R(c, 0, i * band, w, band + 1, col);
    if (i > 0) { c.fillStyle = cols[i - 1]; for (let x = (i % 2); x < w; x += 2) c.fillRect(x, i * band, 1, 1); for (let x = 0; x < w; x += 4) c.fillRect(x, i * band + 1, 1, 1); }
  });
}
function cloud(c, x, y, s) {
  ell(c, x, y, 14 * s, 5 * s, '#ffffff'); ell(c, x - 9 * s, y + 1, 9 * s, 4 * s, '#ffffff'); ell(c, x + 10 * s, y + 1, 10 * s, 4 * s, '#ffffff');
  ell(c, x + 2, y - 4 * s, 8 * s, 5 * s, '#ffffff');
  R(c, x - 18 * s, y + 3 * s, 36 * s, 2, '#d6ecfa');
}

// קיר מטויח לבן
function wall(c, x, y, w, h, rng, base = '#f4f1ea', shade = '#ddd6c8') {
  R(c, x, y, w, h, base);
  speckle(c, x, y, w, h, [shade, '#ffffff', '#e9e3d6'], rng, 0.06);
  R(c, x, y + h - 3, w, 3, shade);
  R(c, x + w - 2, y, 2, h, shade);
}
function shutterWindow(c, x, y, w, h, blue = '#1d4fa3') {
  R(c, x - 1, y - 1, w + 2, h + 2, '#3a2a2a');
  R(c, x, y, w, h, '#2b3e5c');
  R(c, x + 1, y + 1, w / 2 - 1, h - 2, '#4d6d99'); R(c, x + w / 2 + 1, y + 1, w / 2 - 2, h - 2, '#4d6d99');
  R(c, x + w / 2, y, 1, h, '#3a2a2a');
  // תריסים
  const sw = Math.round(w / 2);
  for (const sx of [x - sw - 1, x + w + 1]) {
    R(c, sx, y - 1, sw, h + 2, blue);
    for (let yy = y + 1; yy < y + h; yy += 3) R(c, sx + 1, yy, sw - 2, 1, '#0f2f6e');
  }
  R(c, x - 2, y + h + 1, w + 4, 2, '#cfc8b8');
}
function bougainvillea(c, x, y, w, h, rng) {
  for (let i = 0; i < w * h * 0.35; i++) {
    const px = x + rng() * w, py = y + rng() * h;
    c.fillStyle = rng() < 0.25 ? '#2f7d32' : rng() < 0.5 ? '#e0368f' : rng() < 0.8 ? '#ff5fb0' : '#a01e6a';
    c.fillRect(Math.floor(px), Math.floor(py), 2, 2);
  }
}
function pot(c, x, y, rng) {
  R(c, x - 5, y - 8, 10, 8, '#c25a2c'); R(c, x - 6, y - 9, 12, 2, '#a0461f'); R(c, x - 5, y - 2, 10, 2, '#8a3a1a');
  for (let i = 0; i < 18; i++) { c.fillStyle = rng() < 0.6 ? '#3f9a3a' : '#2a6e2a'; c.fillRect(Math.floor(x - 7 + rng() * 14), Math.floor(y - 20 + rng() * 11), 2, 3); }
  if (rng() < 0.6) for (let i = 0; i < 4; i++) R(c, x - 5 + rng() * 10, y - 20 + rng() * 7, 2, 2, pickR(rng, ['#ff4f4f', '#ffd83d', '#ff8fd0']));
}
const pickR = (rng, a) => a[Math.floor(rng() * a.length)];
function stringLights(c, x1, x2, y, sag, t0 = 0) {
  for (let x = x1; x <= x2; x++) {
    const u = (x - x1) / (x2 - x1), yy = y + Math.sin(u * Math.PI) * sag;
    c.fillStyle = '#3a2a2a'; c.fillRect(x, Math.round(yy), 1, 1);
    if ((x - x1) % 8 === 4) { R(c, x - 1, Math.round(yy) + 1, 3, 3, ((x + t0) / 8) % 3 < 1 ? '#ffe680' : ((x + t0) / 8) % 3 < 2 ? '#ffb35c' : '#fff3c0'); }
  }
}
function cobble(c, x, y, w, h, rng) {
  R(c, x, y, w, h, '#c9b99a');
  for (let yy = y; yy < y + h; yy += 6) {
    const off = ((yy - y) / 6) % 2 ? 4 : 0;
    for (let xx = x - off; xx < x + w; xx += 9) {
      const col = pickR(rng, ['#d8c9a8', '#cbb894', '#e2d4b6', '#bfae8a']);
      R(c, xx + 1, yy + 1, 7, 4, col);
      R(c, xx + 1, yy + 4, 7, 1, '#a89878');
    }
  }
}

// ---------- רחוב הטברנה ----------
export const HUB = { W: 2400, tavern: 360, bench: 1000, shop: 1560, seat: 2080 };

export function drawStreet(w, h) {
  // w,h ביחידות lo (חצי)
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  const rng = mulberry(7);
  const gy = h - 78; // קו הקרקע
  sky(x, w, gy - 30, ['#2f6fd0', '#3f82dc', '#58a0e6', '#7bbcef', '#a4d4f5', '#c9e7f8']);
  // שמש
  circ(x, 940, Math.max(30, gy - 200), 16, '#fff3a8'); circ(x, 940, Math.max(30, gy - 200), 13, '#ffe25a');
  for (let i = 0; i < 9; i++) cloud(x, rng() * w, 20 + rng() * Math.max(20, gy - 210), 0.6 + rng() * 0.7);
  // ים ואיים
  const hz = gy - 112;
  R(x, 0, hz, w, gy - hz, '#2a7fc0');
  for (let i = 0; i < 6; i++) { const ix = rng() * w; ell(x, ix, hz, 30 + rng() * 40, 7 + rng() * 6, '#7d86b5'); }
  // אי רחוק עם כפר לבן (ממלא שמיים גבוהים במסך לאורך)
  if (hz > 110) {
    const ch = Math.min(hz - 60, 40 + (hz - 110) * 0.28);
    for (let xx = 0; xx < w; xx++) {
      const n = 0.55 + 0.25 * Math.sin(xx * 0.011) + 0.15 * Math.sin(xx * 0.037 + 1) + 0.05 * Math.sin(xx * 0.13);
      const top = Math.round(hz - ch * n);
      R(x, xx, top, 1, hz - top, xx % 3 ? '#a77d63' : '#9a7059');
      R(x, xx, top, 1, 2, '#c49a7c');
      if (xx % 9 === 0 && rng() < 0.75) {
        const hy = top + 2 + rng() * 10, hw = 5 + Math.floor(rng() * 4);
        R(x, xx, hy, hw, 5, '#f4f1ea'); R(x, xx + 1, hy + 2, 1, 2, '#3a4a6a');
        if (rng() < 0.18) circ(x, xx + hw / 2, hy, 2, '#1d55b8');
      }
    }
    R(x, 0, hz - 3, w, 3, '#8fb8d8');
  }
  R(x, 0, hz + 1, w, gy - hz, '#2a7fc0');
  for (let i = 0; i < 260; i++) R(x, rng() * w, hz + 3 + rng() * (gy - hz), 3 + rng() * 6, 1, rng() < 0.5 ? '#5aa7e0' : '#1f6aa8');
  R(x, 0, hz, w, 1, '#c9e7f8');
  // מעקה כחול לאורך הים
  R(x, 0, gy - 26, w, 3, '#1d4fa3');
  for (let xx = 0; xx < w; xx += 6) R(x, xx, gy - 24, 2, 22, '#2d62bd');
  R(x, 0, gy - 4, w, 4, '#e9e3d6');

  // --- הטברנה ---
  const T0 = 70, T1 = 290;
  wall(x, T0, gy - 132, T1 - T0, 132, rng);
  // כיפה כחולה
  const dcx = (T0 + T1) / 2;
  for (let r = 34; r >= 0; r--) { const ww = Math.round(Math.sqrt(34 * 34 - r * r) * 1.1); R(x, dcx - ww, gy - 132 - r, ww * 2, 1, r > 26 ? '#0f3f9a' : '#1d55b8'); }
  speckle(x, dcx - 34, gy - 166, 68, 34, ['#2d6ad0'], rng, 0.05);
  R(x, dcx - 1, gy - 176, 2, 10, '#e9e3d6'); R(x, dcx - 4, gy - 172, 8, 2, '#e9e3d6');
  R(x, T0 - 4, gy - 134, T1 - T0 + 8, 4, '#e2dccd');
  // שלט
  R(x, dcx - 46, gy - 124, 92, 22, '#5a2e14'); R(x, dcx - 44, gy - 122, 88, 18, '#8a4b22');
  for (let i = 0; i < 88; i += 4) R(x, dcx - 44 + i, gy - 122, 2, 2, '#1d4fa3');
  pixText(x, 'הטברנה', dcx, gy - 112, 12, '#ffe9a8', '#3a1a08');
  stringLights(x, T0, T1, gy - 98, 8);
  // דלת קשת
  R(x, dcx - 17, gy - 66, 34, 66, '#5a2e14');
  circ(x, dcx, gy - 66, 17, '#5a2e14');
  R(x, dcx - 15, gy - 64, 30, 64, '#1d4fa3'); circ(x, dcx, gy - 64, 15, '#1d4fa3');
  for (let i = -12; i <= 12; i += 6) R(x, dcx + i, gy - 70, 2, 70, '#163f87');
  R(x, dcx - 1, gy - 78, 2, 78, '#0f2f6e');
  R(x, dcx + 6, gy - 34, 3, 3, '#ffd83d');
  // חלונות
  shutterWindow(x, T0 + 30, gy - 86, 22, 26); shutterWindow(x, T1 - 52, gy - 86, 22, 26);
  bougainvillea(x, T0 - 6, gy - 140, 30, 70, rng);
  bougainvillea(x, T1 - 20, gy - 136, 26, 40, rng);
  pot(x, T0 + 10, gy, rng); pot(x, T1 - 10, gy, rng); pot(x, dcx - 26, gy, rng); pot(x, dcx + 26, gy, rng);
  // לוח תפריט
  R(x, T1 - 40, gy - 30, 20, 26, '#5a2e14'); R(x, T1 - 38, gy - 28, 16, 20, '#1e2a22');
  for (let i = 0; i < 4; i++) R(x, T1 - 36, gy - 25 + i * 4, 6 + (i * 3) % 7, 1, '#e8e8e8');
  // ערמת צלחות
  for (let i = 0; i < 6; i++) { R(x, T0 + 42, gy - 4 - i * 3, 16, 2, '#ffffff'); R(x, T0 + 42, gy - 2 - i * 3, 16, 1, '#9aa5b1'); }

  // --- ספסל: עץ זית + פנס + משענת ---
  const B = HUB.bench / 2;
  R(x, B - 96, gy - 60, 7, 60, '#6b4a2b'); R(x, B - 94, gy - 60, 2, 60, '#8a6440');
  R(x, B - 101, gy - 24, 4, 3, '#6b4a2b'); R(x, B - 89, gy - 40, 6, 3, '#6b4a2b');
  for (let i = 0; i < 160; i++) { const a = rng() * Math.PI * 2, r = rng(); R(x, B - 92 + Math.cos(a) * 34 * r, gy - 78 + Math.sin(a) * 20 * r, 3, 2, pickR(rng, ['#7f9a5a', '#9db477', '#5f7a42', '#b5c98f'])); }
  for (let i = 0; i < 14; i++) R(x, B - 120 + rng() * 56, gy - 90 + rng() * 26, 2, 2, '#3a2a40');
  // פנס רחוב
  R(x, B + 86, gy - 104, 3, 104, '#2a2a33'); R(x, B + 82, gy - 4, 11, 4, '#2a2a33');
  R(x, B + 80, gy - 116, 15, 12, '#2a2a33'); R(x, B + 82, gy - 114, 11, 8, '#ffe680'); R(x, B + 79, gy - 118, 17, 3, '#1a1a22');
  // משענת הספסל
  R(x, B - 50, gy - 34, 100, 4, '#2d62bd'); R(x, B - 50, gy - 27, 100, 4, '#2d62bd');
  R(x, B - 50, gy - 34, 100, 1, '#5d8fe0'); R(x, B - 50, gy - 27, 100, 1, '#5d8fe0');
  R(x, B - 46, gy - 36, 3, 36, '#1a1a22'); R(x, B + 43, gy - 36, 3, 36, '#1a1a22');

  // --- חנות הצלחות ---
  const S0 = HUB.shop / 2 - 110, S1 = HUB.shop / 2 + 110, scx = HUB.shop / 2;
  wall(x, S0, gy - 120, S1 - S0, 120, rng, '#f2d08a', '#d9b46a');
  R(x, S0 - 3, gy - 124, S1 - S0 + 6, 5, '#c49a52');
  // גגון פסים
  for (let i = 0; i < (S1 - S0 + 8); i += 10) {
    R(x, S0 - 4 + i, gy - 92, 5, 14, '#1d4fa3'); R(x, S0 + 1 + i, gy - 92, 5, 14, '#ffffff');
    R(x, S0 - 4 + i, gy - 78, 5, 3, '#1d4fa3'); R(x, S0 + 1 + i, gy - 78, 5, 3, '#ffffff');
  }
  R(x, S0 - 4, gy - 93, S1 - S0 + 8, 2, '#0f2f6e');
  // שלט
  R(x, scx - 52, gy - 116, 104, 20, '#1a1020'); R(x, scx - 50, gy - 114, 100, 16, '#fff6dc');
  pixText(x, 'חנות צלחות', scx, gy - 106, 11, '#1d4fa3');
  // חלון ראווה
  R(x, S0 + 12, gy - 70, 110, 52, '#5a2e14'); R(x, S0 + 14, gy - 68, 106, 48, '#9fd3e8');
  speckle(x, S0 + 14, gy - 68, 106, 48, ['#c6e8f4'], rng, 0.03);
  R(x, S0 + 14, gy - 44, 106, 2, '#8a5a2b'); R(x, S0 + 14, gy - 22, 106, 2, '#8a5a2b');
  const pc = ['#e8423f', '#1d4fa3', '#ffd83d', '#7bd23f', '#ff6fb5', '#ffffff', '#ff9b2e', '#7a4fd6'];
  for (let i = 0; i < 8; i++) { circ(x, S0 + 24 + i * 12.5, gy - 54, 5, '#1a1020'); circ(x, S0 + 24 + i * 12.5, gy - 54, 4, pc[i]); circ(x, S0 + 24 + i * 12.5, gy - 54, 2, '#fffbea'); }
  for (let i = 0; i < 6; i++) { circ(x, S0 + 26 + i * 17, gy - 32, 7, '#1a1020'); circ(x, S0 + 26 + i * 17, gy - 32, 6, pc[(i + 3) % 8]); circ(x, S0 + 26 + i * 17, gy - 32, 3, '#fffbea'); }
  // קופסת הפתעה בחלון
  R(x, S0 + 100, gy - 30, 12, 9, '#7a4fd6'); R(x, S0 + 105, gy - 30, 2, 9, '#ffd83d'); R(x, S0 + 100, gy - 27, 12, 2, '#ffd83d');
  // דלת
  R(x, S1 - 62, gy - 70, 36, 70, '#5a2e14'); R(x, S1 - 60, gy - 68, 32, 68, '#1f9e5a');
  R(x, S1 - 56, gy - 62, 24, 24, '#9fd3e8'); R(x, S1 - 34, gy - 32, 3, 3, '#ffd83d');
  pot(x, S0 + 4, gy, rng); pot(x, S1 - 8, gy, rng);

  // --- מקום ישיבה: פרגולה + שולחנות ---
  const P0 = HUB.seat / 2 - 150, P1 = HUB.seat / 2 + 150;
  wall(x, P0 + 10, gy - 58, P1 - P0 - 20, 30, rng, '#f4f1ea');
  for (let px2 = P0; px2 <= P1; px2 += 60) { R(x, px2, gy - 110, 6, 110, '#8a5a2b'); R(x, px2 + 4, gy - 110, 2, 110, '#6b4422'); }
  R(x, P0 - 8, gy - 116, P1 - P0 + 22, 6, '#8a5a2b'); R(x, P0 - 8, gy - 116, P1 - P0 + 22, 2, '#a87444');
  for (let i = 0; i < 360; i++) R(x, P0 - 8 + rng() * (P1 - P0 + 22), gy - 124 + rng() * 16 + (rng() < 0.2 ? rng() * 30 : 0), 3, 2, pickR(rng, ['#3f8a3a', '#5aa94a', '#2f6e2a', '#7bd23f']));
  for (let i = 0; i < 24; i++) R(x, P0 + rng() * (P1 - P0), gy - 112 + rng() * 14, 2, 3, '#6a2a7a');
  stringLights(x, P0, P1, gy - 104, 10, 3);
  // שולחנות ברקע
  for (const tx of [P0 + 40, P0 + 130, P0 + 220]) {
    R(x, tx - 18, gy - 22, 36, 4, '#1a1020');
    for (let i = 0; i < 36; i += 4) { R(x, tx - 18 + i, gy - 21, 2, 2, '#1d4fa3'); R(x, tx - 16 + i, gy - 21, 2, 2, '#ffffff'); R(x, tx - 18 + i, gy - 19, 2, 2, '#ffffff'); R(x, tx - 16 + i, gy - 19, 2, 2, '#1d4fa3'); }
    R(x, tx - 2, gy - 17, 4, 17, '#3a2a22');
    R(x, tx - 28, gy - 14, 8, 2, '#8a5a2b'); R(x, tx - 28, gy - 14, 2, 14, '#6b4422'); R(x, tx - 22, gy - 26, 2, 26, '#6b4422');
    R(x, tx + 20, gy - 14, 8, 2, '#8a5a2b'); R(x, tx + 26, gy - 14, 2, 14, '#6b4422'); R(x, tx + 20, gy - 26, 2, 26, '#6b4422');
    R(x, tx - 6, gy - 25, 4, 3, '#ffffff'); R(x, tx + 4, gy - 27, 2, 5, '#7bd23f');
  }
  pixText(x, 'פינת ישיבה', HUB.seat / 2, gy - 72, 10, '#5a2e14', '#fff6dc');

  // --- קרקע ---
  cobble(x, 0, gy, w, h - gy, rng);
  R(x, 0, gy, w, 2, '#a89878');
  // צללים רכים ליד הבניינים
  x.fillStyle = 'rgba(60,40,20,0.12)'; x.fillRect(0, gy + 2, w, 6);
  return { c, gy };
}

// ספסל קדמי (שכבה ראשית, יחידות מלאות) – מכסה את הרגליים של היושבים
export function benchFront(ctx, cx, y) {
  const P = (a, b, w, h, col) => R(ctx, cx + a * 2, y + b * 2, w * 2, h * 2, col);
  P(-52, -17, 104, 12, '#1a1020');
  P(-51, -16, 102, 4, '#2d62bd'); P(-51, -16, 102, 1, '#5d8fe0');
  P(-51, -11, 102, 4, '#2554a8'); P(-51, -11, 102, 1, '#4a7ad0');
  P(-48, -6, 3, 6, '#1a1a22'); P(45, -6, 3, 6, '#1a1a22');
}

// ---------- רקע החנות ----------
export function drawShopBg(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); const rng = mulberry(11);
  R(x, 0, 0, w, h, '#e8c98f');
  for (let yy = 0; yy < h; yy += 12) R(x, 0, yy, w, 1, '#d4b277');
  speckle(x, 0, 0, w, h, ['#f0d6a0', '#d9b980'], rng, 0.04);
  // מדפים
  const pc = ['#e8423f', '#1d4fa3', '#ffd83d', '#7bd23f', '#ff6fb5', '#ffffff', '#ff9b2e', '#7a4fd6', '#2fc6d8'];
  for (let sy = 40; sy < h - 60; sy += 46) {
    R(x, 6, sy, w - 12, 5, '#8a5a2b'); R(x, 6, sy + 5, w - 12, 2, '#5a3a1a');
    for (let sx = 16; sx < w - 16; sx += 18) { circ(x, sx, sy - 9, 8, '#1a1020'); circ(x, sx, sy - 9, 7, pickR(rng, pc)); circ(x, sx, sy - 9, 4, '#fffbea'); if (rng() < 0.3) circ(x, sx, sy - 9, 2, pickR(rng, pc)); }
  }
  R(x, 0, h - 40, w, 40, '#8a5a2b');
  for (let xx = 0; xx < w; xx += 20) R(x, xx, h - 40, 1, 40, '#6b4422');
  R(x, 0, h - 42, w, 3, '#5a3a1a');
  return c;
}

// ---------- פנים הטברנה ----------
export function drawTavernBg(w, h, wallBase) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); const rng = mulberry(23);
  const wb = wallBase; // קו הקיר האחורי (lo)
  // קיר אחורי
  wall(x, 0, 0, w, wb, rng, '#efe6d4', '#d8ccb2');
  // קורות תקרה
  for (let i = 0; i < 4; i++) R(x, 0, 6 + i * 3, w, 1, '#d8ccb2');
  R(x, 0, 0, w, 10, '#6b4422'); R(x, 0, 10, w, 2, '#4a2e16');
  for (let bx = 20; bx < w; bx += 70) R(x, bx, 0, 6, 14, '#4a2e16');
  // חלון עם נוף לים
  const wcx = Math.round(w / 2);
  const wwid = 70, wtop = Math.max(24, wb - 110);
  R(x, wcx - wwid / 2 - 3, wtop - 3, wwid + 6, 50, '#5a2e14');
  R(x, wcx - wwid / 2, wtop, wwid, 22, '#7bbcef'); R(x, wcx - wwid / 2, wtop + 22, wwid, 22, '#2a7fc0');
  ell(x, wcx - 14, wtop + 22, 18, 5, '#7d86b5'); R(x, wcx - wwid / 2, wtop + 22, wwid, 22, '#2a7fc0');
  for (let i = 0; i < 20; i++) R(x, wcx - wwid / 2 + rng() * wwid, wtop + 24 + rng() * 18, 4, 1, '#5aa7e0');
  circ(x, wcx + 20, wtop + 9, 5, '#fff3a8');
  R(x, wcx - 1, wtop, 2, 44, '#5a2e14'); R(x, wcx - wwid / 2, wtop + 21, wwid, 2, '#5a2e14');
  for (const sx of [wcx - wwid / 2 - 22, wcx + wwid / 2 + 3]) { R(x, sx, wtop - 3, 19, 50, '#1d4fa3'); for (let yy = wtop; yy < wtop + 46; yy += 3) R(x, sx + 1, yy, 17, 1, '#0f2f6e'); }
  // מדפים עם צלחות
  const shelf = (sx, sy, n) => {
    R(x, sx, sy, n * 14 + 6, 3, '#8a5a2b'); R(x, sx, sy + 3, n * 14 + 6, 1, '#4a2e16');
    for (let i = 0; i < n; i++) { const px = sx + 9 + i * 14; circ(x, px, sy - 6, 6, '#1a1020'); circ(x, px, sy - 6, 5, i % 3 === 0 ? '#1d4fa3' : '#ffffff'); circ(x, px, sy - 6, 3, '#f4f1ea'); }
  };
  shelf(14, wtop + 10, 5); shelf(w - 90, wtop + 10, 5);
  shelf(14, wtop + 40, 4); shelf(w - 76, wtop + 40, 4);
  // שום תלוי ופלפלים
  for (const gx of [wcx - 70, wcx + 66]) {
    R(x, gx, 12, 1, 20, '#6b4422');
    for (let i = 0; i < 5; i++) circ(x, gx + (i % 2 ? 2 : -2), 20 + i * 4, 3, '#f4efe0');
  }
  stringLights(x, 0, w, 16, 10, 0);
  // מדבקות קישוט: מאנדר יווני לאורך הקיר
  for (let mx = 0; mx < w; mx += 8) {
    R(x, mx, wb - 12, 6, 2, '#1d4fa3'); R(x, mx + 4, wb - 12, 2, 6, '#1d4fa3'); R(x, mx + 2, wb - 8, 4, 2, '#1d4fa3'); R(x, mx + 2, wb - 10, 2, 2, '#1d4fa3');
  }
  R(x, 0, wb - 3, w, 3, '#c9b99a');
  // דלתות צד
  for (const dx of [6, w - 34]) {
    R(x, dx, wb - 62, 28, 62, '#4a2e16'); R(x, dx + 2, wb - 60, 24, 60, '#1d4fa3');
    R(x, dx + 4, wb - 56, 9, 22, '#163f87'); R(x, dx + 15, wb - 56, 9, 22, '#163f87');
  }
  // רצפת עץ
  R(x, 0, wb, w, h - wb, '#a8743e');
  for (let yy = wb; yy < h; yy += 7) {
    R(x, 0, yy, w, 1, '#7d5229');
    const off = ((yy - wb) / 7) % 2 ? 0 : 23;
    for (let xx = off; xx < w; xx += 46) R(x, xx, yy, 1, 7, '#7d5229');
  }
  speckle(x, 0, wb, w, h - wb, ['#b8854b', '#94622f'], rng, 0.05);
  // צל מתחת לקיר
  x.fillStyle = 'rgba(40,20,0,0.18)'; x.fillRect(0, wb, w, 5);
  // חביות ועציצים בצדדים
  const barrel = (bx, by) => {
    R(x, bx - 10, by - 24, 20, 24, '#8a5a2b'); R(x, bx - 11, by - 20, 22, 2, '#3a3a44'); R(x, bx - 11, by - 7, 22, 2, '#3a3a44');
    R(x, bx - 10, by - 24, 20, 2, '#6b4422'); R(x, bx - 3, by - 24, 2, 24, '#a87444');
  };
  barrel(16, wb + 12); barrel(w - 16, wb + 12);
  pot(x, 44, wb + 6, rng); pot(x, w - 44, wb + 6, rng);
  return c;
}

// ---------- צלחות ----------
export const PLATES = {
  white: { name: 'צלחת לבנה', price: 0, rim: '#c8d2dc', face: '#ffffff', desc: 'הקלאסיקה.' },
  blue: { name: 'כחול יווני', price: 40, rim: '#1d4fa3', face: '#f2f6ff', pat: 'meander', bonus: 1, desc: '+$1 לכל פגיעה' },
  red: { name: 'אדום עגבנייה', price: 40, rim: '#d8322f', face: '#fff1e8', pat: 'dots', bonus: 1, desc: '+$1 לכל פגיעה' },
  olive: { name: 'ירוק זית', price: 40, rim: '#5f8a2e', face: '#f6f8e8', pat: 'leaf', bonus: 1, desc: '+$1 לכל פגיעה' },
  porcelain: { name: 'חרסינה משובחת', price: 120, rim: '#2fc6d8', face: '#ffffff', pat: 'flower', r: 19, bonus: 2, desc: 'גדולה יותר, קל לפגוע. +$2' },
  iron: { name: 'צלחת ברזל', price: 220, rim: '#5b6470', face: '#aab3bd', pat: 'bolts', dmg: 2, bonus: 2, desc: 'נזק כפול לבוס ולמגן. +$2' },
  // נדירות – רק מקופסת הפתעה
  gold: { name: 'צלחת זהב', rare: true, rim: '#c8961e', face: '#ffe27a', pat: 'shine', mult: 2, desc: 'כסף כפול על כל פגיעה!' },
  fire: { name: 'צלחת אש', rare: true, rim: '#e8423f', face: '#ffb35c', pat: 'fire', pierce: true, bonus: 2, desc: 'עוברת דרך כמה נבלים' },
  rainbow: { name: 'צלחת קשת', rare: true, rim: '#7a4fd6', face: '#ffffff', pat: 'rainbow', r: 21, bonus: 3, desc: 'ענקית וצבעונית. +$3' },
  star: { name: 'צלחת כוכב', rare: true, rim: '#0b3d91', face: '#16285e', pat: 'stars', homing: true, bonus: 2, desc: 'מתבייתת על המטרה' },
  painted: { name: 'הצלחת שלי', price: 0, rim: '#1d4fa3', face: '#ffffff', pat: 'paint', desc: 'הצלחת שציירת בעצמך' },
};
export const RARE = ['gold', 'fire', 'rainbow', 'star'];

const plateCache = new Map();
export function plateCanvas(type, paint, size = 32) {
  const pk = type === 'painted' ? 'painted:' + paint.join(',') : type;
  const k = pk + ':' + size;
  if (plateCache.has(k)) return plateCache.get(k);
  const P = PLATES[type] || PLATES.white;
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const x = c.getContext('2d');
  const cx = size / 2 - 0.5, r = size / 2 - 1;
  const s = size / 32;
  circ(x, cx, cx, r, '#1a1020');
  circ(x, cx, cx, r - 1, P.rim);
  circ(x, cx, cx, r - 4 * s, '#00000022');
  circ(x, cx, cx, r - 5 * s, P.face);
  const ir = r - 5 * s;
  if (P.pat === 'meander') for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2; R(x, cx + Math.cos(an) * (r - 2.5 * s) - 1, cx + Math.sin(an) * (r - 2.5 * s) - 1, 2, 2, '#ffffff'); }
  if (P.pat === 'dots') for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2; circ(x, cx + Math.cos(an) * ir * 0.6, cx + Math.sin(an) * ir * 0.6, 1.5 * s, '#e8423f'); }
  if (P.pat === 'leaf') for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2; R(x, cx + Math.cos(an) * ir * 0.6 - 2, cx + Math.sin(an) * ir * 0.6 - 1, 4 * s, 2 * s, '#5f8a2e'); }
  if (P.pat === 'flower') { for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2; circ(x, cx + Math.cos(an) * 4 * s, cx + Math.sin(an) * 4 * s, 2.5 * s, '#2fc6d8'); } circ(x, cx, cx, 2 * s, '#ffd83d'); }
  if (P.pat === 'bolts') for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2; R(x, cx + Math.cos(an) * (r - 2.5 * s) - 1, cx + Math.sin(an) * (r - 2.5 * s) - 1, 2, 2, '#2a2f36'); }
  if (P.pat === 'shine') { R(x, cx - ir * 0.5, cx - ir * 0.5, 3 * s, 3 * s, '#ffffff'); R(x, cx - ir * 0.3, cx - ir * 0.6, 2 * s, 2 * s, '#fff7c8'); circ(x, cx, cx, 3 * s, '#c8961e'); }
  if (P.pat === 'fire') { for (let i = 0; i < 7; i++) { const fx = cx - ir * 0.7 + i * ir * 0.23; R(x, fx, cx - 1, 2 * s, ir * 0.7, '#e8423f'); R(x, fx, cx - ir * 0.5 + (i % 2) * 3, 2 * s, ir * 0.5, '#ffd83d'); } }
  if (P.pat === 'rainbow') ['#e8423f', '#ff9b2e', '#ffd83d', '#7bd23f', '#2fc6d8', '#7a4fd6'].forEach((col, i) => { if (ir - i * 1.6 * s > 1) { circ(x, cx, cx, ir - i * 1.6 * s, col); } });
  if (P.pat === 'stars') for (let i = 0; i < 7; i++) { const an = i * 2.4; R(x, cx + Math.cos(an) * ir * 0.6 - 1, cx + Math.sin(an) * ir * 0.6 - 1, 2 * s, 2 * s, '#ffe14d'); }
  if (P.pat === 'paint' && paint) {
    // 16x16 בתוך העיגול הפנימי
    const cell = (ir * 2) / 16;
    for (let i = 0; i < 256; i++) {
      const v = paint[i]; if (!v) continue;
      const px = i % 16, py = (i / 16) | 0;
      const qx = cx - ir + px * cell, qy = cx - ir + py * cell;
      const dx = qx + cell / 2 - cx, dy = qy + cell / 2 - cx;
      if (dx * dx + dy * dy > (ir + 0.5) * (ir + 0.5)) continue;
      x.fillStyle = PAL16[v]; x.fillRect(Math.floor(qx), Math.floor(qy), Math.ceil(cell), Math.ceil(cell));
    }
  }
  // הברקה
  R(x, cx - r * 0.55, cx - r * 0.65, 3 * s, 2 * s, '#ffffffcc');
  plateCache.set(k, c);
  return c;
}
export function clearPlateCache() { for (const k of [...plateCache.keys()]) if (k.startsWith('painted')) plateCache.delete(k); }

// צלחת מסתובבת בתעופה
export function drawPlate(ctx, img, x, y, spin, scale = 1) {
  const w = img.width * scale, h = img.height * scale;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(spin * 0.25);
  ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.cos(spin)));
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// טיל מצויר (מצביע לכיוון התנועה)
export function drawMissile(ctx, x, y, ang, t) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(ang);
  const P = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(a * 2, b * 2, w * 2, h * 2); };
  // להבה
  const fl = (Math.floor(t * 20) % 2) * 2;
  P(-14 - fl, -2, 5 + fl, 4, '#ff9b2e'); P(-12 - fl, -1, 4 + fl, 2, '#ffe14d');
  // גוף
  P(-10, -3, 16, 6, '#1a1020'); P(-9, -2, 14, 4, '#d9dee6'); P(-9, -2, 14, 1, '#ffffff');
  P(5, -2, 3, 4, '#1a1020'); P(5, -1, 4, 2, '#e8423f'); P(8, -1, 2, 2, '#1a1020');
  // כנפיים
  P(-10, -6, 4, 3, '#e8423f'); P(-10, 3, 4, 3, '#e8423f'); P(-11, -6, 1, 12, '#1a1020');
  // פרצוף רשע מצחיק
  P(1, -2, 1, 1, '#1a1020'); P(3, -2, 1, 1, '#1a1020');
  ctx.restore();
}

// קופסת הפתעה
export function drawBox(ctx, x, y, t, chute) {
  const P = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x + a * 2), Math.round(y + b * 2), w * 2, h * 2); };
  if (chute) {
    const sw = Math.sin(t * 3) * 2;
    ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 22 + sw, y - 44); ctx.lineTo(x - 10, y - 12); ctx.moveTo(x + 22 + sw, y - 44); ctx.lineTo(x + 10, y - 12); ctx.stroke();
    P(-14 + sw / 2, -30, 28, 3, '#1a1020'); P(-13 + sw / 2, -33, 26, 4, '#e8423f');
    for (let i = 0; i < 26; i += 6) P(-13 + i + sw / 2, -33, 3, 4, '#ffffff');
    P(-10 + sw / 2, -35, 20, 2, '#e8423f');
  }
  P(-9, -12, 18, 13, '#1a1020'); P(-8, -11, 16, 11, '#7a4fd6'); P(-8, -11, 16, 2, '#9a74ef');
  P(-1, -11, 2, 11, '#ffd83d'); P(-8, -6, 16, 2, '#ffd83d');
  P(-4, -15, 3, 3, '#ffd83d'); P(1, -15, 3, 3, '#ffd83d');
  P(-1, -9, 2, 2, '#fff'); P(4, -4, 1, 1, '#fff');
}

// כוכבים סביב הראש
export function drawStars(ctx, x, y, t, n = 4) {
  for (let i = 0; i < n; i++) {
    const a = t * 4 + (i / n) * Math.PI * 2;
    const sx = Math.round(x + Math.cos(a) * 22), sy = Math.round(y + Math.sin(a) * 7);
    ctx.fillStyle = '#1a1020'; ctx.fillRect(sx - 4, sy - 2, 8, 4); ctx.fillRect(sx - 2, sy - 4, 4, 8);
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(sx - 3, sy - 1, 6, 2); ctx.fillRect(sx - 1, sy - 3, 2, 6);
  }
}
