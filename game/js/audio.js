// סאונד WebAudio: אפקטים + מנגינת "סירטקי" מקורית שכתבנו (סולם חיג'אז על רה)
let ac = null, master = null, sfxG = null, musG = null, noiseBuf = null;
let muted = false;

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.connect(master);
    sfxG = ac.createGain(); sfxG.gain.value = 0.8; sfxG.connect(comp);
    musG = ac.createGain(); musG.gain.value = 0.32 * mus.vol; musG.connect(comp);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ac = null; }
  if (ac && mus.want) musicStart();
}
export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.02);
}
export const isMuted = () => muted;

const now = () => ac.currentTime;
function env(g, t, a, peak, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function osc(type, f, t, dur, vol, dest, f2) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  env(g, t, 0.004, vol, dur);
  o.connect(g); g.connect(dest || sfxG);
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function noise(t, dur, vol, type, freq, q, dest) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = freq || 1000; f.Q.value = q || 0.7;
  const g = ac.createGain(); env(g, t, 0.002, vol, dur);
  s.connect(f); f.connect(g); g.connect(dest || sfxG);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  return f;
}

export const sfx = {
  break() { // שבירת צלחת
    if (!ac) return; const t = now();
    noise(t, 0.22, 0.7, 'highpass', 2200, 0.8);
    noise(t, 0.08, 0.5, 'bandpass', 900, 1.5);
    for (let i = 0; i < 5; i++) osc('sine', 2200 + Math.random() * 3200, t + Math.random() * 0.09, 0.09 + Math.random() * 0.1, 0.12);
  },
  cash() { // קופה
    if (!ac) return; const t = now();
    noise(t, 0.04, 0.4, 'bandpass', 3000, 2);
    osc('square', 1318, t + 0.03, 0.12, 0.12);
    osc('square', 1760, t + 0.09, 0.35, 0.12);
    osc('sine', 2637, t + 0.09, 0.4, 0.1);
  },
  bad() {
    if (!ac) return; const t = now();
    osc('square', 330, t, 0.14, 0.12); osc('square', 220, t + 0.13, 0.28, 0.12);
  },
  throw() {
    if (!ac) return; const t = now();
    const f = noise(t, 0.16, 0.25, 'bandpass', 600, 2);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.15);
  },
  thud() { if (!ac) return; const t = now(); osc('sine', 180, t, 0.18, 0.5, null, 60); noise(t, 0.05, 0.3, 'lowpass', 800); },
  punch() { if (!ac) return; const t = now(); osc('sine', 120, t, 0.25, 0.7, null, 40); noise(t, 0.12, 0.6, 'lowpass', 1500); },
  clang() { // מכסה סיר
    if (!ac) return; const t = now();
    [523, 1307, 2093, 2960].forEach((f, i) => osc('sine', f, t, 0.5 - i * 0.08, 0.16));
    noise(t, 0.03, 0.4, 'highpass', 4000);
  },
  boom() {
    if (!ac) return; const t = now();
    noise(t, 0.7, 0.9, 'lowpass', 700); osc('sine', 140, t, 0.6, 0.8, null, 35);
  },
  pop() { if (!ac) return; const t = now(); osc('sine', 400, t, 0.15, 0.3, null, 1400); osc('triangle', 1600, t + 0.08, 0.3, 0.12); },
  click() { if (!ac) return; osc('square', 880, now(), 0.04, 0.08); },
  paint() { if (!ac) return; osc('triangle', 1200 + Math.random() * 400, now(), 0.04, 0.06); },
  stars() { if (!ac) return; const t = now(); [1568, 1976, 2349].forEach((f, i) => osc('triangle', f, t + i * 0.06, 0.12, 0.08)); },
  siren(dur = 3) { // אזעקה עולה-יורדת
    if (!ac) return; const t = now();
    const o = ac.createOscillator(), g = ac.createGain(), lf = ac.createOscillator(), lg = ac.createGain();
    o.type = 'sawtooth'; o.frequency.value = 880;
    lf.frequency.value = 0.55; lg.gain.value = 260; lf.connect(lg); lg.connect(o.frequency);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.3);
    g.gain.setValueAtTime(0.22, t + dur - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(sfxG);
    o.start(t); lf.start(t); o.stop(t + dur + 0.1); lf.stop(t + dur + 0.1);
  },
  whistle() { if (!ac) return; const t = now(); osc('sine', 2400, t, 0.5, 0.06, null, 900); },
};

// ---------- מוזיקה ----------
// מנגינה מקורית: שמיניות, null = המשך תו (טרמולו בוזוקי)
const N = null;
const MEL = [
  69, 69, 70, 69, 67, 66, 67, 69, 70, 72, 70, 69, 67, N, 66, N,
  63, 66, 67, 69, 70, 69, 67, 66, 67, 66, 63, 66, 62, N, N, N,
  74, N, 72, 70, 72, N, 70, 69, 70, 69, 67, 69, 70, 72, 74, N,
  75, 74, 72, 70, 69, 70, 69, 67, 66, 67, 63, 66, 62, N, 62, N,
];
// אקורד לכל תיבה (4 שמיניות): שורש + טריאדה
const CH = {
  D: [38, [62, 66, 69]], Gm: [43, [62, 67, 70]], Cm: [36, [63, 67, 72]], A: [45, [61, 64, 69]],
};
const BARS = ['D', 'D', 'Gm', 'D', 'Cm', 'D', 'Gm', 'D', 'Gm', 'Cm', 'D', 'Gm', 'Cm', 'D', 'Gm', 'D'];
const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);

const mus = { on: false, tempo: 96, step: 0, next: 0, timer: 0, vol: 1 };

function bouzouki(m, t, dur, vol) {
  const f = mf(m);
  const g = ac.createGain(), lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 4;
  lp.frequency.setValueAtTime(3400, t); lp.frequency.exponentialRampToValueAtTime(900, t + dur);
  env(g, t, 0.003, vol, dur);
  for (const [type, det] of [['sawtooth', -6], ['square', 5]]) {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
    o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
  }
  lp.connect(g); g.connect(musG);
}
function schedStep(i, t, e) {
  const n = MEL.length;
  const m = MEL[i % n];
  if (m != null) {
    // כמה שמיניות התו מחזיק?
    let len = 1; while (len < 4 && MEL[(i + len) % n] == null) len++;
    if (len === 1) bouzouki(m, t, e * 0.95, 0.16);
    else { // טרמולו
      const k = len * 2;
      for (let j = 0; j < k; j++) bouzouki(m, t + j * e / 2, e * 0.5, j === 0 ? 0.16 : 0.1);
    }
  }
  const bar = Math.floor(i / 4) % BARS.length, pos = i % 4;
  const [root, tri] = CH[BARS[bar]];
  if (pos === 0 || pos === 2) { // בס: שורש / קווינטה
    const b = pos === 0 ? root : root + 7;
    osc('triangle', mf(b), t, e * 1.6, 0.34, musG);
  } else { // "אום-פה"
    tri.forEach((c) => osc('square', mf(c - 12), t, e * 0.35, 0.035, musG));
    noise(t, 0.04, 0.07, 'highpass', 7000, 1, musG);
  }
}
function tick() {
  if (!mus.on || !ac) return;
  const e = 60 / mus.tempo / 2;
  while (mus.next < ac.currentTime + 0.15) {
    schedStep(mus.step, mus.next, e);
    mus.step++; mus.next += e;
  }
}
export function musicStart(tempo) {
  if (tempo) mus.tempo = tempo;
  mus.want = true;
  if (!ac) return;
  if (mus.on) return;
  mus.on = true; mus.step = 0; mus.next = ac.currentTime + 0.1;
  clearInterval(mus.timer); mus.timer = setInterval(tick, 40);
}
export function musicStop() { mus.on = false; mus.want = false; clearInterval(mus.timer); }
export function musicTempo(bpm) { mus.tempo = Math.max(60, Math.min(220, bpm)); }
export function musicVolume(v) { mus.vol = v; if (musG && ac) musG.gain.setTargetAtTime(0.32 * v, ac.currentTime, 0.1); }
export const musicOn = () => mus.on;

// השהיה כשהאפליקציה ברקע
export function audioPause(p) {
  if (!ac) return;
  try { if (p) ac.suspend(); else ac.resume(); } catch (e) { /* ignore */ }
}
