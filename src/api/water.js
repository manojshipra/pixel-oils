// Water: still lakes with reflections, ocean waves, waterfalls.
import { W, H, state, lerp, clamp, mix } from '../engine.js';

export default function water(k) {
  const { Q, R, stroke, rand } = k;

  // reflects whatever is already painted above yH, so call it after the sky, mountains and tree line
  const lake = (yH, o = {}) => {
    const color = o.color ?? '#2b557f', hz = k.scene.horizon;
    const wpat = k.patternOf(g => {
      const lg = g.createLinearGradient(0, yH, 0, H);
      lg.addColorStop(0, mix(hz, color, 0.4)); lg.addColorStop(0.35, color); lg.addColorStop(1, mix(color, '#000000', 0.45));
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
    });
    const base = { width: 30, bristles: 21, lw: 1.6, decay: 1, dry: 0, alpha: 0.9, color: wpat };
    for (let y = yH - 4; y < H + 10; y += 14) for (let x = -100 - R() * 100; x < W; x += 240) k.raw([[x, y], [x + 320, y + R() * 4 - 2]], base);
    let refl = null;
    Q(() => {
      const rc = document.createElement('canvas'); rc.width = W; rc.height = H;
      const rx = rc.getContext('2d');
      rx.fillStyle = color; rx.fillRect(0, yH, W, H - yH);
      if ('filter' in rx) rx.filter = 'blur(1.2px)';
      for (let y = yH; y < H; y += 2) {
        const sy = 2 * yH - y - 2; if (sy < 0) break;
        const t = (y - yH) / (H - yH);
        rx.drawImage(k.canvas, 0, sy, W, 2, Math.sin(y * 0.37) * (0.8 + t * 4) + Math.sin(y * 0.11) * t * 3, y, W, 2);
      }
      rx.filter = 'none'; rx.globalAlpha = 0.24; rx.fillStyle = color; rx.fillRect(0, yH, W, H - yH);
      refl = state.ctx.createPattern(rc, 'no-repeat');
    });
    const steps = (H - yH) / 3;
    for (let x = -10; x < W + 20; x += 9) {
      const pts = [[x + R() * 4, yH - 2], [x + R() * 4, H + 30]];
      // the reflection pattern only exists once playback reaches it, so look it up lazily
      Q(() => k.rawNow(pts, { width: 24, bristles: 44, lw: 2.4, decay: Math.pow(0.12, 1 / steps), dry: 0.15, alpha: 0.95, color: refl, step: 3 }));
    }
    for (let y = yH + 4; y < H; y += 10) { const pts = k.wave(-40, y, W + 40, y, 2); Q(() => k.rawNow(pts, { width: 16, bristles: 12, lw: 2, decay: 1, dry: 0, alpha: 0.3, color: refl })); }
    const lc = mix(hz, '#ffffff', 0.4);
    for (let x = -20; x < W;) { const len = 40 + R() * 220, y = yH + 1 + R() * 2; stroke([[x, y], [x + len, y + R() - 0.5]], { brush: 'liner', size: 3, color: lc, alpha: 0.85, decay: 0.98, dry: 0.6 }); x += len + R() * 50; }
    for (let i = 0; i < 46; i++) {
      const t = Math.pow(R(), 0.8), y = yH + 14 + t * (H - yH - 30), x = R() * W, len = 30 + (60 + R() * 260) * t;
      stroke([[x, y], [x + len, y + R() - 0.5]], { brush: 'knife', size: 2 + 4 * t, bristles: 5, color: lc, alpha: 0.4, decay: 0.97, dry: 0.8 });
    }
  };

  // open sea from the horizon down: rows of crests that get bigger as they come closer, each with foam
  const waves = (yH, o = {}) => {
    const color = o.color ?? '#1f5a6e', hz = k.scene.horizon, foam = o.foam ?? '#eef3f0', rows = o.rows ?? 26;
    const pat = k.patternOf(g => {
      const lg = g.createLinearGradient(0, yH, 0, H);
      lg.addColorStop(0, mix(hz, color, 0.55)); lg.addColorStop(0.4, color); lg.addColorStop(1, mix(color, '#02141c', 0.5));
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
    });
    for (let y = yH - 2; y < H + 10; y += 12) k.raw(k.wave(-40, y, W + 40, y, 3), { width: 26, bristles: 26, lw: 1.8, decay: 1, dry: 0, alpha: 0.95, color: pat });
    for (let i = 0; i < rows; i++) {
      const t = Math.pow((i + 1) / rows, 1.7), y = yH + 6 + t * (H - yH), amp = 2 + 30 * t;
      for (let x = -80 - R() * 200; x < W + 40;) {
        const len = (90 + R() * 260) * (0.3 + t), pts = [], trough = [];
        for (let j = 0; j <= 16; j++) {
          const u = j / 16, xx = x + u * len, hump = Math.pow(Math.sin(Math.PI * u), 1.4);
          pts.push([xx, y - amp * hump]); trough.push([xx, y - amp * hump + amp * 0.6]);
        }
        stroke(trough, { brush: 'flat', size: amp * 0.9 + 3, color: mix(color, '#000000', 0.35), alpha: 0.55, tints: false });
        stroke(pts, { brush: 'flat', size: amp * 0.6 + 2, color: mix(color, foam, 0.25), alpha: 0.6 });
        if (R() < 0.35 + t * 0.4) {
          const a = Math.floor(rand(3, 7)), b = Math.floor(rand(9, 14));
          stroke(pts.slice(a, b), { brush: 'knife', size: amp * 0.35 + 2, color: foam, alpha: 0.85, decay: 0.95, dry: 0.9 });
          if (t > 0.4) for (let s = 0; s < 4; s++) { const p = pts[Math.floor(rand(a, b))]; k.dab(p[0] + rand(-8, 8), p[1] - rand(0, amp * 0.4), { size: rand(3, 8), color: foam, alpha: 0.6 }); }
        }
        x += len * (0.6 + R() * 0.6);
      }
    }
    for (let x = -20; x < W;) { const len = 60 + R() * 200; stroke([[x, yH + 1], [x + len, yH + 1]], { brush: 'liner', size: 2.5, color: mix(hz, '#ffffff', 0.4), alpha: 0.7 }); x += len + R() * 60; }
  };

  // a falling sheet of water from (x, top) to bottom, with a misty splash
  const waterfall = (x, top, bottom, width = 80, o = {}) => {
    const color = o.color ?? '#cfe3ea', deep = mix(color, '#2b557f', 0.55);
    for (let i = 0; i < width / 3; i++) {
      const xx = x + rand(-width / 2, width / 2), lip = rand(6, 20);
      const pts = [[xx - lip * 0.6, top - 4], [xx, top + lip], [xx + rand(-4, 4), bottom]];
      stroke(k.curve(pts), { brush: 'round', size: rand(6, 14), color: R() < 0.4 ? deep : color, alpha: rand(0.5, 0.9), decay: 0.996 });
    }
    for (let i = 0; i < width / 4; i++) {
      const xx = x + rand(-width / 2, width / 2), y0 = rand(top, bottom - 20);
      stroke([[xx, y0], [xx + rand(-2, 2), y0 + rand(40, 160)]], { brush: 'liner', size: 2, color: '#ffffff', alpha: 0.7, decay: 0.97, dry: 0.7 });
    }
    for (let i = 0; i < 40; i++) {
      const px = x + rand(-width, width), py = bottom + rand(-20, 15), r = rand(6, 18), loop = [];
      for (let j = 0; j <= 10; j++) loop.push([px + Math.cos(j / 8 * 6.28) * r, py + Math.sin(j / 8 * 6.28) * r * 0.6]);
      stroke(loop, { brush: 'flat', size: r, color: '#ffffff', alpha: 0.25, tints: false });
    }
    for (let i = 0; i < 10; i++) { const y = bottom - rand(0, 50); stroke(k.wave(x - width * 1.6, y, x + width * 1.6, y, 8), { brush: 'soft', size: 40, color: '#ffffff', alpha: 0.12, tints: false }); }
  };

  // a flat band of sea between two heights, laid in with long horizontal strokes
  const sea = (y0, y1, o = {}) => {
    const colors = o.colors ?? ['#33495a', '#2a3d4c', '#3d5566'], lines = o.lines ?? colors.map(c => mix(c, '#ffffff', 0.12)).concat(mix(colors[1], '#000000', 0.2));
    k.shape([[-20, y0], [W + 20, y0], [W + 20, y1], [-20, y1]], { color: colors, angle: 0 });
    for (let y = y0 + 4; y < y1; y += 7) stroke(k.wave(rand(-100, W * 0.4), y, rand(W * 0.6, W + 100), y, 3), { brush: 'flat', size: 6, color: k.pick(lines), alpha: 0.5 });
  };

  // one wave curling over between x0 and x1, its crest at \`top\`, its foot at \`base\`, with foam thrown off the crest
  const breaker = (x0, x1, top, base, o = {}) => {
    const color = o.color ?? '#22343f', foam = o.foam ?? ['#ffffff', '#f4f1ea', '#dfe6ea'];
    const crest = k.curve([[x0, base], [lerp(x0, x1, 0.4), top + 20], [lerp(x0, x1, 0.7), top], [x1, base - 10]]);
    k.shape([...crest, [x1, base + 30], [x0, base + 30]], { color: [color, mix(color, '#ffffff', 0.1), mix(color, '#000000', 0.2)] });
    for (let i = 0; i < 18; i++) stroke(k.along(crest, i * 3.5), { brush: 'liner', size: 2, color: mix(color, '#ffffff', 0.35), alpha: 0.45 });
    for (let i = 0; i < (x1 - x0) * (o.spray ?? 1); i++) {
      const [cx, cy] = crest[Math.floor(rand(crest.length * 0.25, crest.length * 0.85))];
      k.dab(cx + rand(-30, 30), cy - Math.abs(rand(-1, 1) * rand(0, 70)) + 10, { size: rand(3, 11), color: k.pick(foam), alpha: 0.9 });
    }
    for (let i = 0; i < 40; i++) { const x = rand(x0 - 60, x1 + 40), y = base + rand(10, 30); k.line(x, y, x + rand(40, 120), y, { brush: 'round', size: rand(3, 7), color: foam[1], alpha: 0.8 }); }
  };

  return { lake, waves, waterfall, sea, breaker };
}
