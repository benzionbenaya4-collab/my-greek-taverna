// שמירה ב-localStorage (עטוף ב-try/catch, המשחק עובד גם בלי)
const KEY = 'taverna_save_v1';

const DEFAULT = () => ({
  money: 50,
  evening: 1,
  best: 0,
  owned: ['white'],
  plate: 'white',
  multi: 1,
  paint: new Array(256).fill(0), // 0 = ריק, אחרת אינדקס בפלטה
  trick: 0,        // כמה פעמים עבד הטריק על סבתא
  arsMood: 'calm', // calm | angry
  arsHits: 0,      // כמה צלחות זרקו עליו
  savtaGift: 0,    // זמן אחרון שסבתא נתנה כסף (ms)
  muted: false,
  stats: { heads: 0, hits: 0, intercepts: 0, bosses: 0, boxes: 0 },
});

export let S = DEFAULT();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const def = DEFAULT();
      S = Object.assign(def, d);
      S.stats = Object.assign(def.stats, d.stats || {});
      if (!Array.isArray(S.paint) || S.paint.length !== 256) S.paint = def.paint;
      if (!Array.isArray(S.owned) || !S.owned.includes('white')) S.owned = ['white', ...(S.owned || [])];
    }
  } catch (e) { S = DEFAULT(); }
  return S;
}

let timer = 0;
export function save(now) {
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* מצב פרטי / חסום */ } };
  if (now) { clearTimeout(timer); write(); return; }
  clearTimeout(timer);
  timer = setTimeout(write, 300);
}

export function addMoney(n) {
  S.money = Math.max(0, Math.round(S.money + n));
  save();
}

export function reset() { S = DEFAULT(); save(true); }
