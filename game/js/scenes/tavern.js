// זריקת צלחות – בבנייה (שלב 2)
import { G, txt } from '../engine.js';
import { go, hud } from '../game.js';
export const tavern = {
  enter() {},
  down() { go('hub', { from: 'tavern' }); },
  update() {},
  draw(ctx, dt) { ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, 0, G.W, G.H); txt(ctx, 'הטברנה נפתחת בקרוב…', G.W / 2, G.H / 2, { size: 28 }); hud(ctx, dt); },
};
