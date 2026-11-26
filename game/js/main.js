// נקודת כניסה: טעינה, לולאה, סצנות
import { G, initCanvas, loadImages, beginUI, updateFx, clamp } from './engine.js';
import { load, S, save } from './save.js';
import { initAudio, setMuted } from './audio.js';
import { register, go, drawFade } from './game.js';
import { arsState } from './scenes/ars.js';
import './scenes/savta.js';
import { hub, hubState } from './scenes/hub.js';
import { shop } from './scenes/shop.js';
import { tavern, initTavernArt, tav } from './scenes/tavern.js';

const CHARS = ['host', 'ars', 'savta', 'thief', 'grease', 'dine', 'boss', 'waiter'];

async function boot() {
  load();
  setMuted(S.muted);
  initCanvas(document.getElementById('game'));
  await loadImages(Object.fromEntries(CHARS.map((c) => [c, `assets/chars/${c}.png`])));
  initTavernArt();
  register('hub', hub); register('shop', shop); register('tavern', tavern);
  G.onFirstInput = () => initAudio();
  addEventListener('pointerdown', () => initAudio(), { once: false });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });
  addEventListener('pagehide', () => save(true));
  const ld = document.getElementById('loading'); if (ld) ld.remove();
  if (location.hash.includes('dev')) window.__T = { G, S: () => S, go, tav, ars: arsState, hub: hubState };
  go('hub');
  let last = performance.now();
  const frame = (now) => {
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    G.t += dt; G.dt = dt;
    const ctx = G.ctx;
    try {
      if (G.scene.update) G.scene.update(dt);
      beginUI();
      ctx.save();
      if (G.shake > 0) { G.shake = Math.max(0, G.shake - dt); const m = G.shake * 18; ctx.translate(Math.round((Math.random() - 0.5) * m), Math.round((Math.random() - 0.5) * m)); }
      G.scene.draw(ctx, dt);
      ctx.restore();
      drawFade(ctx, dt);
    } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
boot();
