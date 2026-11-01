// Things people built: a little cabin and a fence.
import { P, mix } from '../engine.js';

export default function buildings(k) {
  const { R, stroke, rand } = k;

  // a cabin standing on the ground at y, seen from a front corner; x is its left edge
  const cabin = (x, y, w = 220, o = {}) => {
    const wood = o.color ?? '#5a3e28', roofC = o.roof ?? '#2b2420', L = k.scene.light;
    const h = w * 0.42, fw = w * 0.42, roofH = w * 0.28, x1 = x + fw, x2 = x + w;
    const front = [[x, y], [x, y - h], [x + fw / 2, y - h - roofH], [x1, y - h], [x1, y]];
    const side = [[x1, y], [x1, y - h], [x2, y - h - w * 0.03], [x2, y - w * 0.02]];
    const roof = [[x + fw / 2, y - h - roofH], [x2 + w * 0.03, y - h - roofH - w * 0.04], [x2 + w * 0.05, y - h - w * 0.02], [x1 + w * 0.04, y - h + 6]];
    const lit = mix(wood, '#d9b98a', 0.35), shade = mix(wood, '#000000', 0.45);
    k.shape(front, { color: L < 0 ? [lit, wood] : [shade, wood], brush: 'knife', size: 10, angle: Math.PI / 2 });
    k.shape(side, { color: L < 0 ? [shade, wood] : [lit, wood], brush: 'knife', size: 10, angle: Math.PI / 2 });
    k.shape(roof, { color: [roofC, mix(roofC, '#000000', 0.3)], brush: 'flat', size: 16, angle: -0.08 });
    stroke([[x + fw / 2, y - h - roofH], [x - w * 0.04, y - h + 8]], { brush: 'round', size: 8, color: roofC });
    if (o.snow) for (let i = 0; i < 30; i++) {
      const t = R(), px = x + fw / 2 + t * (x2 - x - fw / 2), py = y - h - roofH - w * 0.04 * t + rand(0, 10);
      stroke([[px, py], [px + rand(10, 30), py + rand(4, 16)]], { brush: 'knife', size: 8, color: '#f6f6f2', alpha: 0.9 });
    }
    const dw = fw * 0.28, dh = h * 0.62;
    k.shape([[x + fw / 2 - dw / 2, y], [x + fw / 2 - dw / 2, y - dh], [x + fw / 2 + dw / 2, y - dh], [x + fw / 2 + dw / 2, y]], { color: '#1a1410', size: 6, brush: 'round', angle: Math.PI / 2 });
    const wx = x1 + (x2 - x1) * 0.35, ww = (x2 - x1) * 0.28, wy = y - h * 0.68;
    k.shape([[wx, wy], [wx + ww, wy - 3], [wx + ww, wy + h * 0.3 - 3], [wx, wy + h * 0.3]], { color: o.lit ? ['#f6c85a', '#ffde85'] : ['#1a1410'], size: 5, brush: 'round' });
    if (o.lit) k.glow(wx + ww / 2, wy + h * 0.15, w * 0.5, '#ffcf6a', 0.35);
    for (let i = 0; i < 6; i++) { const yy = y + rand(0, 10); stroke([[x - 20, yy], [x2 + 40, yy + rand(-3, 3)]], { brush: 'flat', size: 12, color: '#1e1914', alpha: 0.6 }); }
  };

  const fence = (x0, y0, x1, y1, o = {}) => {
    const color = o.color ?? '#4a3826', posts = o.posts ?? 6, h = o.height ?? 50;
    for (let i = 0; i <= posts; i++) {
      const t = i / posts, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, hh = h * (0.9 + R() * 0.2);
      stroke([[x, y + 4], [x + rand(-3, 3), y - hh]], { brush: 'round', size: 7, color });
    }
    for (const f of [0.35, 0.75]) stroke([[x0, y0 - h * f], [x1, y1 - h * f]], { brush: 'round', size: 4, color, alpha: 0.9 });
    stroke([[x0, y0 - h * 0.8], [x1, y1 - h * 0.8]], { brush: 'liner', size: 1.5, color: mix(color, '#e0d0b0', 0.5), alpha: 0.6 });
  };

  return { cabin, fence };
}
